import { Express } from "express";
import { storage } from "../storage";
import { audit } from "../audit";
import { isAuthenticated } from "../replit_integrations/auth";
import { z } from "zod";
import { captureError } from "../sentry";
import multer from "multer";
import crypto from "crypto";
import { parseLessonDocument } from "../lessonImport";
import {
  ObjectStorageService,
  objectStorageClient,
} from "../replit_integrations/object_storage";
import {
  getOrganization,
  getOrgEnvironments,
  getLessonsByOrg,
  getLessonWithQuestions,
  createLessonPlan,
  createLessonQuizQuestion,
  toggleLessonPublish,
  updateLessonPlan,
  deleteLessonPlan,
  deleteQuizQuestionsForLesson,
  getStudentOrgIds,
  getStaticModulesWithLessons,
  getRegionalContent,
  getGameContent,
  getPublishedLessons,
  getPublishedLessonsByEnv,
  getPublishedLessonsByClass,
  type LessonPlan,
} from "../supabase";
import { isAdmin, isOrgAdmin, ADMIN_EMAIL } from "./auth";

const objectStorage = new ObjectStorageService();

const ADMIN_UPLOAD_MAX_VIDEO = 500 * 1024 * 1024;
const ADMIN_UPLOAD_MAX_DOC   =  25 * 1024 * 1024;

// YouTube URL validation - accept watch, shorts, embed, live, and youtu.be short links.
const YOUTUBE_URL_RE = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?|shorts\/|embed\/|live\/)|youtu\.be\/)/i;
const ytUrl = z.string().refine(u => YOUTUBE_URL_RE.test(u), { message: "Please enter a valid YouTube link." });
const ytUrlOpt  = ytUrl.optional();
const ytUrlNull = ytUrl.nullish();

const ADMIN_CONTENT_ALLOWED_MIMES = new Set([
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "video/x-msvideo", "video/x-matroska",
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const ADMIN_CONTENT_MIME_TO_EXT: Record<string, string> = {
  "video/mp4": "mp4", "video/webm": "webm", "video/ogg": "ogv",
  "video/quicktime": "mov", "video/x-msvideo": "avi", "video/x-matroska": "mkv",
  "application/pdf": "pdf",
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

function checkAdminFileIntegrity(buf: Buffer, mime: string): boolean {
  if (!buf || buf.length < 8) return false;
  const m = mime.toLowerCase();
  if (m === "application/pdf")
    return buf.slice(0, 4).toString("ascii") === "%PDF";
  if (m === "image/jpeg")
    return buf[0] === 0xff && buf[1] === 0xd8;
  if (m === "image/png")
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (m === "image/webp")
    return buf.length >= 12 &&
      buf.slice(0, 4).toString("ascii") === "RIFF" &&
      buf.slice(8, 12).toString("ascii") === "WEBP";
  if (m.includes("wordprocessingml") || m.includes("presentationml"))
    return buf[0] === 0x50 && buf[1] === 0x4b;
  return true;
}

const contentDiagramSchema = z.union([
  z.object({ kind: z.literal("bars"), items: z.array(z.object({ label: z.string(), value: z.number(), display: z.string().optional() })), note: z.string().optional() }),
  z.object({ kind: z.literal("steps"), items: z.array(z.object({ label: z.string(), detail: z.string().optional() })), note: z.string().optional() }),
  z.object({ kind: z.literal("compare"), left: z.object({ title: z.string(), points: z.array(z.string()) }), right: z.object({ title: z.string(), points: z.array(z.string()) }), note: z.string().optional() }),
]);
const contentSectionSchema = (videoUrlValidator: z.ZodTypeAny) => z.object({
  type: z.enum(["text", "video", "diagram"]).optional(),
  heading: z.string(),
  body: z.string(),
  examples: z.array(z.string()).optional(),
  video_url: videoUrlValidator,
  diagram: contentDiagramSchema.optional(),
});

const lessonImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".docx", ".pdf", ".txt"];
    const ext = "." + (file.originalname.split(".").pop() || "").toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .docx, .pdf, and .txt files are supported"));
    }
  },
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ADMIN_UPLOAD_MAX_VIDEO },
  fileFilter: (_req, file, cb) => {
    if (ADMIN_CONTENT_ALLOWED_MIMES.has(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(
        "Unsupported file type. Accepted: video (MP4, WebM, MOV, AVI, MKV, OGG), PDF, images (JPG, PNG, WEBP), DOCX, PPTX"
      ));
    }
  },
});

async function getStudentAccessibleLessons(userId: string): Promise<LessonPlan[]> {
  const [directOrgIds, studentClasses] = await Promise.all([
    getStudentOrgIds(userId),
    storage.getStudentClasses(userId),
  ]);

  const linkedEnvIds = studentClasses
    .map(e => e.class.envId)
    .filter((envId): envId is string => !!envId);

  const classIds = studentClasses.map(e => e.class.id);

  const lessonFetches: Promise<LessonPlan[]>[] = [
    ...directOrgIds.map(id => getPublishedLessons(id)),
    ...linkedEnvIds.map(envId => getPublishedLessonsByEnv(envId)),
    ...classIds.map(classId => getPublishedLessonsByClass(classId)),
  ];

  const results = await Promise.all(lessonFetches);

  const seen = new Set<string>();
  return results.flat().filter(l => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
}

async function studentHasLessonAccess(userId: string, lesson: LessonPlan): Promise<boolean> {
  // Class-scoped lessons (created by a teacher) are ONLY visible to students
  // enrolled in that exact class. Org or env membership never grants access.
  if (lesson.class_id != null) {
    const studentClasses = await storage.getStudentClasses(userId);
    return studentClasses.some(e => e.class.id === lesson.class_id);
  }

  const directOrgIds = await getStudentOrgIds(userId);
  if (directOrgIds.includes(lesson.org_id)) return true;

  if (lesson.env_id) {
    const studentClasses = await storage.getStudentClasses(userId);
    const linkedEnvIds = studentClasses
      .map(e => e.class.envId)
      .filter((envId): envId is string => !!envId);
    if (linkedEnvIds.includes(lesson.env_id)) return true;
  }

  return false;
}

export async function registerLessonRoutes(app: Express): Promise<void> {

  // === ADMIN VIDEO LIBRARY ===
  const handleAdminVideoUpload = (req: any, res: any, next: any) => {
    videoUpload.single("video")(req, res, (err: any) => {
      if (err) {
        const status = err?.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ message: err.message || "Video upload failed" });
      }
      next();
    });
  };

  app.post(
    "/api/admin/organizations/:id/videos/upload",
    isAdmin,
    handleAdminVideoUpload,
    async (req: any, res) => {
      try {
        const orgId = req.params.id;
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const isVideoFile = req.file.mimetype.toLowerCase().startsWith("video/");
        const maxSize = isVideoFile ? ADMIN_UPLOAD_MAX_VIDEO : ADMIN_UPLOAD_MAX_DOC;
        if (req.file.size > maxSize) {
          return res.status(413).json({
            message: `File too large. Maximum size is ${isVideoFile ? "500 MB" : "25 MB"} for this file type.`,
          });
        }
        if (!checkAdminFileIntegrity(req.file.buffer, req.file.mimetype)) {
          return res.status(422).json({
            message: "File appears corrupted or the content does not match its extension. Please check the file and try again.",
          });
        }

        const ext = ADMIN_CONTENT_MIME_TO_EXT[req.file.mimetype.toLowerCase()] || "bin";
        const rawBase = (req.file.originalname || "upload").replace(/\.[^.]+$/, "");
        const safeName = rawBase.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
        const filename = `${safeName}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;

        const publicPaths = objectStorage.getPublicObjectSearchPaths();
        const targetDir = publicPaths[0];
        const objectKey = `videos/${orgId}/${filename}`;
        const fullPath = `${targetDir.replace(/\/$/, "")}/${objectKey}`;
        const [, bucketName, ...rest] = fullPath.split("/");
        const objectName = rest.join("/");

        await objectStorageClient
          .bucket(bucketName)
          .file(objectName)
          .save(req.file.buffer, {
            contentType: req.file.mimetype,
            resumable: false,
            metadata: { cacheControl: "public, max-age=2592000" },
          });

        const url = `/public-objects/${objectKey}`;
        const name = req.file.originalname || filename;
        res.status(201).json({ url, name });
      } catch (e: any) {
        console.error("Admin video upload failed:", e);
        res.status(500).json({ message: e.message || "Video upload failed" });
      }
    },
  );

  app.get("/api/admin/organizations/:id/videos", isAdmin, async (req: any, res) => {
    try {
      const orgId = req.params.id;
      const publicPaths = objectStorage.getPublicObjectSearchPaths();
      const targetDir = publicPaths[0];
      const prefix = `videos/${orgId}/`;
      const fullPrefix = `${targetDir.replace(/\/$/, "")}/${prefix}`;
      const [, bucketName, ...rest] = fullPrefix.split("/");
      const folderPath = rest.join("/");

      const [files] = await objectStorageClient.bucket(bucketName).getFiles({ prefix: folderPath });
      const videos = files.map((f: any) => {
        const objectKey = `videos/${orgId}/${f.name.split("/").pop()}`;
        return {
          url: `/public-objects/${objectKey}`,
          name: f.name.split("/").pop() ?? f.name,
          updatedAt: f.metadata?.updated ?? null,
        };
      });
      res.json(videos);
    } catch (e: any) {
      console.error("Admin video list failed:", e);
      res.status(500).json({ message: e.message || "Failed to list videos" });
    }
  });

  // === ADMIN LESSON PLANS CRUD ===
  app.get("/api/admin/organizations/:id/lessons", isAdmin, async (req, res) => {
    const lessons = await getLessonsByOrg(req.params.id);
    res.json(lessons);
  });

  app.post("/api/admin/organizations/:id/lessons", isAdmin, async (req, res) => {
    try {
      const body = z.object({
        title: z.string().min(1),
        instructor: z.string().optional(),
        subject: z.string().optional(),
        grade_level: z.string().optional(),
        topic: z.string().optional(),
        duration: z.string().optional(),
        video_url: ytUrlOpt,
        env_id: z.string().uuid().optional().nullable(),
        objectives: z.array(z.string()).default([]),
        content_sections: z.array(z.object({
          heading: z.string(),
          body: z.string(),
          examples: z.array(z.string()).optional(),
        })).default([]),
        questions: z.array(z.object({
          question: z.string().min(1),
          option_a: z.string().min(1),
          option_b: z.string().min(1),
          option_c: z.string().min(1),
          option_d: z.string().min(1),
          correct_answer: z.enum(["A", "B", "C", "D"]),
        })).default([]),
      }).parse(req.body);

      const { questions, ...planData } = body;
      const lesson = await createLessonPlan({ ...planData, org_id: req.params.id, is_published: false });
      if (!lesson) return res.status(500).json({ message: "Failed to create lesson" });

      for (let i = 0; i < questions.length; i++) {
        await createLessonQuizQuestion({ ...questions[i], lesson_id: lesson.id, order_index: i });
      }

      const full = await getLessonWithQuestions(lesson.id);
      res.json(full);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0]?.message ?? "Validation error" });
      }
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.get("/api/admin/lessons/:id", isAdmin, async (req, res) => {
    try {
      const lesson = await getLessonWithQuestions(req.params.id);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      res.json(lesson);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/lessons/:id/publish", isAdmin, async (req, res) => {
    try {
      const { is_published } = z.object({ is_published: z.boolean() }).parse(req.body);
      const lesson = await toggleLessonPublish(req.params.id, is_published);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: is_published ? "admin.lesson.publish" : "admin.lesson.unpublish", targetType: "lesson", targetId: req.params.id, orgId: lesson.org_id, req });
      res.json(lesson);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0]?.message ?? "Validation error" });
      }
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.patch("/api/admin/lessons/:id", isAdmin, async (req, res) => {
    try {
      const existing = await getLessonWithQuestions(req.params.id);
      if (!existing) return res.status(404).json({ message: "Lesson not found" });
      const body = z.object({
        title: z.string().min(1),
        instructor: z.string().optional().nullable(),
        subject: z.string().optional().nullable(),
        grade_level: z.string().optional().nullable(),
        topic: z.string().optional().nullable(),
        duration: z.string().optional().nullable(),
        video_url: ytUrlNull,
        objectives: z.array(z.string()).default([]),
        content_sections: z.array(z.object({ heading: z.string(), body: z.string(), examples: z.array(z.string()).optional() })).default([]),
        questions: z.array(z.object({
          question: z.string().min(1),
          option_a: z.string().min(1),
          option_b: z.string().min(1),
          option_c: z.string().min(1),
          option_d: z.string().min(1),
          correct_answer: z.enum(["A", "B", "C", "D"]),
        })).optional(),
      }).parse(req.body);
      const { questions, ...planData } = body;
      const lesson = await updateLessonPlan(req.params.id, planData);
      if (!lesson) return res.status(500).json({ message: "Failed to update lesson" });
      if (questions !== undefined) {
        await deleteQuizQuestionsForLesson(req.params.id);
        for (let i = 0; i < questions.length; i++) {
          await createLessonQuizQuestion({ ...questions[i], lesson_id: req.params.id, order_index: i });
        }
      }
      const full = await getLessonWithQuestions(req.params.id);
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.lesson.update", targetType: "lesson", targetId: req.params.id, orgId: lesson.org_id, req });
      res.json(full);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0]?.message ?? "Validation error" });
      }
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.delete("/api/admin/lessons/:id", isAdmin, async (req, res) => {
    try {
      const existing = await getLessonWithQuestions(req.params.id);
      if (!existing) return res.status(404).json({ message: "Lesson not found" });
      const ok = await deleteLessonPlan(req.params.id);
      if (!ok) return res.status(500).json({ message: "Failed to delete lesson" });
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.lesson.delete", targetType: "lesson", targetId: req.params.id, orgId: existing.org_id, req });
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0]?.message ?? "Validation error" });
      }
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  // === STATIC CONTENT API ===
  app.get("/api/lessons/static", async (req, res) => {
    try {
      const currency = typeof req.query.currency === "string" ? req.query.currency : undefined;
      const modules = await getStaticModulesWithLessons(currency);
      res.json(modules);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/regional-content/:regionCode", async (req, res) => {
    try {
      const { regionCode } = req.params;
      const region = await getRegionalContent(regionCode.toUpperCase());
      if (!region) return res.status(404).json({ message: "Region not found" });
      res.json({
        country: region.country,
        currency: region.currency,
        currencyCode: region.currency_code,
        symbol: region.symbol,
        mainBank: region.main_bank,
        exchange: region.exchange_name,
        exchangeAbbr: region.exchange_abbr,
        exampleCompany1: region.example_company1,
        exampleCompany1Ticker: region.example_company1_ticker,
        exampleCompany1Desc: region.example_company1_desc,
        exampleCompany2: region.example_company2,
        exampleCompany2Ticker: region.example_company2_ticker,
        exampleCompany2Desc: region.example_company2_desc,
        centralBank: region.central_bank,
        bondName: region.bond_name,
        bondRate: region.bond_rate,
        pegged: region.pegged,
        pegNote: region.peg_note,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/game-content/:gameId", async (req, res) => {
    try {
      const { gameId } = req.params;
      const content = await getGameContent(gameId);
      res.json(content);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === STUDENT LESSON ACCESS ===
  app.get("/api/lessons", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.id;
    if (!userId) return res.json([]);
    const lessons = await getStudentAccessibleLessons(userId);
    res.json(lessons);
  });

  app.get("/api/lessons/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.id;
    const lesson = await getLessonWithQuestions(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    if (!lesson.is_published) return res.status(403).json({ message: "Lesson not published" });
    const hasAccess = userId ? await studentHasLessonAccess(userId, lesson) : false;
    if (!hasAccess) return res.status(403).json({ message: "Access denied" });
    const org = lesson.org_id ? await getOrganization(lesson.org_id) : null;
    res.json({
      ...lesson,
      org_name: org?.name ?? null,
      org_logo_url: org?.logo_url ?? null,
      org_signature_left_name: org?.signature_left_name ?? null,
      org_signature_left_role: org?.signature_left_role ?? null,
      org_signature_right_name: org?.signature_right_name ?? null,
      org_signature_right_role: org?.signature_right_role ?? null,
    });
  });

  // === ORG ADMIN LESSONS ===
  app.get("/api/org-admin/lessons", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    const lessons = await getLessonsByOrg(admin.orgId);
    res.json(lessons);
  });

  app.get("/api/org-admin/lessons/:id", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      const lesson = await getLessonWithQuestions(req.params.id);
      if (!lesson || lesson.org_id !== admin.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(lesson);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/org-admin/lessons/:id/preview", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      const lesson = await getLessonWithQuestions(req.params.id);
      if (!lesson || lesson.org_id !== admin.orgId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(lesson);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Free, non-AI lesson import: parses a .docx/.pdf/.txt into a draft the
  // admin reviews and edits before it's saved via the existing create-lesson
  // route below. This endpoint never writes to the database itself.
  const handleLessonImportUpload = (req: any, res: any, next: any) => {
    lessonImportUpload.single("file")(req, res, (err: any) => {
      if (err) {
        const status = err?.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ message: err.message || "File upload failed" });
      }
      next();
    });
  };
  app.post("/api/org-admin/lessons/import", isOrgAdmin, handleLessonImportUpload, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const parsed = await parseLessonDocument(file.buffer, file.originalname);
      res.json(parsed);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Couldn't read that file. Please check it's a valid .docx, .pdf, or .txt file." });
    }
  });

  app.post("/api/org-admin/lessons", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      const body = z.object({
        title: z.string().min(1),
        instructor: z.string().optional(),
        subject: z.string().optional(),
        gradeLevel: z.string().optional(),
        topic: z.string().optional(),
        duration: z.string().optional(),
        videoUrl: ytUrlOpt,
        objectives: z.array(z.string()).default([]),
        contentSections: z.array(contentSectionSchema(ytUrlOpt)).default([]),
      }).parse(req.body);

      const lesson = await createLessonPlan({
        org_id: admin.orgId,
        env_id: admin.envId,
        title: body.title,
        instructor: body.instructor ?? null,
        subject: body.subject ?? null,
        grade_level: body.gradeLevel ?? null,
        topic: body.topic ?? null,
        duration: body.duration ?? null,
        video_url: body.videoUrl || null,
        objectives: body.objectives,
        content_sections: body.contentSections,
        is_published: false,
      });
      if (!lesson) return res.status(500).json({ message: "Failed to create lesson" });
      res.json(lesson);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0]?.message ?? "Validation error" });
      }
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.patch("/api/org-admin/lessons/:id/publish", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      const existing = await getLessonWithQuestions(req.params.id);
      if (!existing || existing.org_id !== admin.orgId) {
        return res.status(403).json({ message: "Access denied: lesson does not belong to your organization" });
      }
      const { isPublished } = z.object({ isPublished: z.boolean() }).parse(req.body);
      const lesson = await toggleLessonPublish(req.params.id, isPublished);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      await audit({ actorType: "org_admin", actorId: admin.id, actorEmail: admin.email, action: isPublished ? "org_admin.lesson.publish" : "org_admin.lesson.unpublish", targetType: "lesson", targetId: req.params.id, orgId: admin.orgId, req });
      res.json(lesson);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0]?.message ?? "Validation error" });
      }
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.post("/api/org-admin/lessons/:id/questions", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      const existing = await getLessonWithQuestions(req.params.id);
      if (!existing || existing.org_id !== admin.orgId) {
        return res.status(403).json({ message: "Access denied: lesson does not belong to your organization" });
      }
      const body = z.object({
        question: z.string().min(1),
        optionA: z.string().min(1),
        optionB: z.string().min(1),
        optionC: z.string().min(1),
        optionD: z.string().min(1),
        correctAnswer: z.enum(["A", "B", "C", "D"]),
        orderIndex: z.number().default(0),
      }).parse(req.body);

      const q = await createLessonQuizQuestion({
        lesson_id: req.params.id,
        question: body.question,
        option_a: body.optionA,
        option_b: body.optionB,
        option_c: body.optionC,
        option_d: body.optionD,
        correct_answer: body.correctAnswer,
        order_index: body.orderIndex,
      });
      if (!q) return res.status(500).json({ message: "Failed to create question" });
      res.json(q);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0]?.message ?? "Validation error" });
      }
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.patch("/api/org-admin/lessons/:id", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      const existing = await getLessonWithQuestions(req.params.id);
      if (!existing || existing.org_id !== admin.orgId) {
        return res.status(403).json({ message: "Access denied: lesson does not belong to your organization" });
      }
      const body = z.object({
        title: z.string().min(1),
        instructor: z.string().optional().nullable(),
        subject: z.string().optional().nullable(),
        gradeLevel: z.string().optional().nullable(),
        topic: z.string().optional().nullable(),
        duration: z.string().optional().nullable(),
        videoUrl: ytUrlNull,
        objectives: z.array(z.string()).default([]),
        contentSections: z.array(contentSectionSchema(ytUrlNull)).default([]),
        questions: z.array(z.object({
          question: z.string().min(1),
          optionA: z.string().min(1),
          optionB: z.string().min(1),
          optionC: z.string().min(1),
          optionD: z.string().min(1),
          correctAnswer: z.enum(["A", "B", "C", "D"]),
        })).optional(),
      }).parse(req.body);
      const { questions, gradeLevel, videoUrl, contentSections, ...rest } = body;
      const lesson = await updateLessonPlan(req.params.id, {
        ...rest,
        grade_level: gradeLevel ?? null,
        video_url: videoUrl ?? null,
        content_sections: contentSections,
      });
      if (!lesson) return res.status(500).json({ message: "Failed to update lesson" });
      if (questions !== undefined) {
        await deleteQuizQuestionsForLesson(req.params.id);
        for (let i = 0; i < questions.length; i++) {
          await createLessonQuizQuestion({
            lesson_id: req.params.id,
            question: questions[i].question,
            option_a: questions[i].optionA,
            option_b: questions[i].optionB,
            option_c: questions[i].optionC,
            option_d: questions[i].optionD,
            correct_answer: questions[i].correctAnswer,
            order_index: i,
          });
        }
      }
      const full = await getLessonWithQuestions(req.params.id);
      await audit({ actorType: "org_admin", actorId: admin.id, actorEmail: admin.email, action: "org_admin.lesson.update", targetType: "lesson", targetId: req.params.id, orgId: admin.orgId, req });
      res.json(full);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0]?.message ?? "Validation error" });
      }
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.delete("/api/org-admin/lessons/:id", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      const existing = await getLessonWithQuestions(req.params.id);
      if (!existing || existing.org_id !== admin.orgId) {
        return res.status(403).json({ message: "Access denied: lesson does not belong to your organization" });
      }
      const ok = await deleteLessonPlan(req.params.id);
      if (!ok) return res.status(500).json({ message: "Failed to delete lesson" });
      await audit({ actorType: "org_admin", actorId: admin.id, actorEmail: admin.email, action: "org_admin.lesson.delete", targetType: "lesson", targetId: req.params.id, orgId: admin.orgId, req });
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0]?.message ?? "Validation error" });
      }
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  // === LESSON COMPLETE (student submits answers) ===
  app.post("/api/lessons/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { answers } = z.object({
        answers: z.array(z.enum(["A", "B", "C", "D"])).min(1),
      }).parse(req.body);

      const lesson = await getLessonWithQuestions(req.params.id);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      if (!lesson.is_published) return res.status(403).json({ message: "Lesson not published" });

      const hasAccess = await studentHasLessonAccess(userId, lesson);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const questions = lesson.questions.sort((a, b) => a.order_index - b.order_index);
      const total = questions.length;
      const scored = Math.min(answers.length, total);
      const correctAnswers = answers
        .slice(0, scored)
        .reduce((acc, ans, i) => acc + (ans === questions[i].correct_answer ? 1 : 0), 0);

      const xpEarned = total > 0
        ? Math.round(correctAnswers * 10 + (correctAnswers / total) * 20)
        : 0;

      const currentXp = await storage.getUserXp(userId);
      const newTotalXp = currentXp.totalXp + xpEarned;
      const newLevel = Math.floor(newTotalXp / 100) + 1;
      await storage.updateUserXp(userId, {
        totalXp: newTotalXp,
        level: newLevel,
        currentStreak: currentXp.currentStreak,
        longestStreak: currentXp.longestStreak,
        lastPlayedAt: new Date(),
      });

      // Record a quiz session so the platform-wide leaderboard stays live.
      // game_sessions is the leaderboard's only data source; without this,
      // no new rows would ever be written after the exam-paper feature removal.
      if (total > 0) {
        await storage.createGameSession({
          userId,
          mode: "quiz",
          score: xpEarned,
          totalQuestions: total,
          correctAnswers,
          timeSpent: null,
          xpEarned,
          moduleSlug: null,
        });
        const { cacheInvalidate } = await import("../cache");
        cacheInvalidate("moneylab:leaderboard:");
      }

      res.json({ xpEarned, totalXp: newTotalXp, level: newLevel, correctAnswers, total });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0]?.message ?? "Validation error" });
      }
      res.status(400).json({ message: e.message });
    }
  });

  // === QUIZ ATTEMPT RECORDING (static module lessons) ===
  // Static built-in lessons compute scores client-side and do not call the
  // /api/lessons/:id/complete endpoint. This lightweight route lets the frontend
  // record each attempt against a module slug so teachers can see
  // comprehension growth in the Analytics tab.
  app.post("/api/quiz-attempts/record", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const { moduleSlug, correctAnswers, totalQuestions } = z.object({
        moduleSlug: z.string().min(1).max(80),
        correctAnswers: z.number().int().min(0),
        totalQuestions: z.number().int().min(1),
      }).parse(req.body);
      const pct = Math.round((correctAnswers / totalQuestions) * 100);
      await storage.createGameSession({
        userId,
        mode: "quiz",
        score: pct,
        totalQuestions,
        correctAnswers,
        timeSpent: null,
        xpEarned: 0,
        moduleSlug,
      });
      res.json({ recorded: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: e.errors[0]?.message ?? "Validation error" });
      }
      res.status(400).json({ message: e.message });
    }
  });
}
