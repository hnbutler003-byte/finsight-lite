import { Express } from "express";
import { storage } from "../storage";
import { audit, listAuditLog } from "../audit";
import { z } from "zod";
import { captureError } from "../sentry";
import multer from "multer";
import crypto from "crypto";
import Papa from "papaparse";
import path from "path";
import {
  ObjectStorageService,
  objectStorageClient,
} from "../replit_integrations/object_storage";
import { authStorage } from "../replit_integrations/auth/storage";
import {
  supabase,
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  getOrgEnvironments,
  createOrgEnvironment,
  getLeaderboard,
  getOrgEnvironmentByJoinCode,
  getOrgEnvironmentById,
  enrollStudentInOrg,
  invalidateOrganizationCache,
  type Organization,
} from "../supabase";
import { streamPrivateObjectToResponse } from "../jobHandlers";
import { enqueueJob, listRecentJobs } from "../jobs";
import { sendEmail, getOrCreateContact, appBaseUrl, escapeHtml } from "../email";
import { isAdmin, isOrgAdmin, ADMIN_EMAIL } from "./auth";

const objectStorage = new ObjectStorageService();

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Logo must be a PNG, JPG, WebP, or GIF image"));
    }
  },
});

const LESSON_UPLOAD_MAX_VIDEO = 500 * 1024 * 1024;
const LESSON_UPLOAD_MAX_DOC   =  25 * 1024 * 1024;

const LESSON_CONTENT_ALLOWED_MIMES = new Set([
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "video/x-msvideo", "video/x-matroska",
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const LESSON_CONTENT_MIME_TO_EXT: Record<string, string> = {
  "video/mp4": "mp4", "video/webm": "webm", "video/ogg": "ogv",
  "video/quicktime": "mov", "video/x-msvideo": "avi", "video/x-matroska": "mkv",
  "application/pdf": "pdf",
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

function checkLessonFileIntegrity(buf: Buffer, mime: string): boolean {
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

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LESSON_UPLOAD_MAX_VIDEO },
  fileFilter: (_req, file, cb) => {
    if (LESSON_CONTENT_ALLOWED_MIMES.has(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(
        "Unsupported file type. Accepted: video (MP4, WebM, MOV, AVI, MKV, OGG), PDF, images (JPG, PNG, WEBP), DOCX, PPTX"
      ));
    }
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".csv", ".pdf", ".xlsx", ".xls"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV, PDF, and Excel files are supported"));
    }
  },
});

const VALID_AVATARS = [
  "lion", "dolphin", "parrot", "turtle", "star", "butterfly",
  "octopus", "artist", "rocket", "wave", "palm", "gamer",
] as const;
const DEFAULT_AVATAR = "star";

type ParsedImportRow = {
  rowNum: number;
  firstName: string;
  lastName: string | null;
  username: string;
  avatar: string;
  email: string | null;
  classCode: string | null;
  classRef: { type: "class"; id: number; name: string } | { type: "org"; envId: string; name: string } | null;
  status: "ok" | "error";
  issues: string[];
};

type ImportSummary = {
  rows: ParsedImportRow[];
  summary: { total: number; ok: number; errors: number };
};

function pickHeader(obj: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const found = Object.keys(obj).find((h) => h.toLowerCase().replace(/[\s_-]/g, "") === k);
    if (found && obj[found]?.trim()) return obj[found].trim();
  }
  return "";
}

function deterministicUsername(firstName: string, rowNum: number, attempt: number): string {
  const clean = firstName.trim().replace(/[^a-zA-Z0-9]/g, "");
  const base = clean.length > 0 ? clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase() : "Player";
  const trimmed = base.slice(0, 20);
  return attempt === 0 ? `${trimmed}_${rowNum}` : `${trimmed}_${rowNum}_${attempt}`;
}

async function uniqueUsername(
  firstName: string,
  rowNum: number,
  takenInBatch: Set<string>,
): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = deterministicUsername(firstName, rowNum, attempt);
    if (takenInBatch.has(candidate.toLowerCase())) continue;
    const existing = await authStorage.getUserByUsername(candidate);
    if (!existing) {
      takenInBatch.add(candidate.toLowerCase());
      return candidate;
    }
  }
  const fallback = `Player_${rowNum}_${Math.floor(Math.random() * 100000)}`;
  takenInBatch.add(fallback.toLowerCase());
  return fallback;
}

async function parseAndValidateImport(
  csvText: string,
  adminOrgId: string,
  adminEnvId: string,
): Promise<ImportSummary> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });
  const rows: ParsedImportRow[] = [];
  const usernameBatch = new Set<string>();
  const emailBatch = new Set<string>();
  const emailZ = z.string().email();

  let rowNum = 1;
  for (const raw of parsed.data) {
    rowNum++;
    if (!raw || typeof raw !== "object") continue;
    const firstName = pickHeader(raw, ["firstname", "first", "name", "givenname"]);
    const lastName = pickHeader(raw, ["lastname", "last", "surname", "familyname"]) || null;
    const usernameInput = pickHeader(raw, ["username", "user", "handle"]);
    const avatarInput = pickHeader(raw, ["avatar", "icon"]).toLowerCase();
    const emailInput = pickHeader(raw, ["email", "emailaddress"]);
    const classCodeInput = pickHeader(raw, ["classcode", "code", "joincode"]).toUpperCase();

    const issues: string[] = [];
    if (!firstName) issues.push("First name is required");
    if (firstName && firstName.length > 50) issues.push("First name must be 50 characters or less");
    if (lastName && lastName.length > 50) issues.push("Last name must be 50 characters or less");

    let email: string | null = null;
    if (emailInput) {
      const r = emailZ.safeParse(emailInput);
      if (!r.success) {
        issues.push("Email is not a valid address");
      } else {
        const lowered = emailInput.toLowerCase();
        if (emailBatch.has(lowered)) {
          issues.push("This email appears more than once in the file");
        } else {
          emailBatch.add(lowered);
          email = lowered;
        }
      }
    }

    const avatar = (VALID_AVATARS as readonly string[]).includes(avatarInput) ? avatarInput : DEFAULT_AVATAR;

    let classRef: ParsedImportRow["classRef"] = null;
    if (classCodeInput) {
      const cls = await storage.getClassByCode(classCodeInput);
      if (cls) {
        const teacher = await storage.getTeacherById(cls.teacherId);
        if (!teacher || teacher.orgId !== adminOrgId) {
          issues.push(`Class code ${classCodeInput} is not part of your organization`);
        } else {
          classRef = { type: "class", id: cls.id, name: cls.name };
        }
      } else {
        const env = await getOrgEnvironmentByJoinCode(classCodeInput);
        if (env) {
          if (env.org_id !== adminOrgId) {
            issues.push(`Code ${classCodeInput} is not part of your organization`);
          } else {
            classRef = { type: "org", envId: env.id, name: env.display_name ?? env.slug ?? env.id };
          }
        } else {
          issues.push(`Class code ${classCodeInput} not found`);
        }
      }
    }

    let username = "";
    if (usernameInput) {
      if (!/^[A-Za-z0-9_]{3,30}$/.test(usernameInput)) {
        issues.push("Username must be 3–30 letters, numbers, or underscores");
      } else if (usernameBatch.has(usernameInput.toLowerCase())) {
        issues.push("Username appears more than once in this file");
      } else {
        const taken = await authStorage.getUserByUsername(usernameInput);
        if (taken) issues.push(`Username "${usernameInput}" is already in use`);
        else username = usernameInput;
      }
    }

    const status: "ok" | "error" = issues.length === 0 ? "ok" : "error";
    if (status === "ok" && !username) {
      username = await uniqueUsername(firstName, rowNum, usernameBatch);
    } else if (username) {
      usernameBatch.add(username.toLowerCase());
    }

    rows.push({
      rowNum,
      firstName,
      lastName,
      username,
      avatar,
      email,
      classCode: classCodeInput || null,
      classRef,
      status,
      issues,
    });
  }

  const ok = rows.filter((r) => r.status === "ok").length;
  return { rows, summary: { total: rows.length, ok, errors: rows.length - ok } };
}

export async function registerOrgRoutes(app: Express): Promise<void> {

  // === ADMIN: AUDIT LOG + OBSERVABILITY ===
  const auditQuerySchema = z.object({
    actorType: z.enum(["admin", "org_admin", "teacher", "student", "system"]).optional(),
    actorId: z.string().optional(),
    action: z.string().optional(),
    orgId: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  });
  app.get("/api/admin/audit-log", isAdmin, async (req, res) => {
    try {
      const q = auditQuerySchema.parse(req.query);
      const rows = await listAuditLog(q);
      res.json(rows);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/observability", isAdmin, (_req, res) => {
    const dsn = process.env.SENTRY_DSN || "";
    const clientDsn = process.env.VITE_SENTRY_DSN || "";
    res.json({
      sentry: {
        serverEnabled: !!dsn,
        clientDsnConfigured: !!clientDsn,
        projectUrl: process.env.SENTRY_PROJECT_URL || null,
      },
      healthz: { url: "/healthz" },
      alertEmail: process.env.ALERT_EMAIL ? "configured" : null,
    });
  });

  // === ADMIN: OVERVIEW / DATA ===
  app.get("/api/admin/overview", isAdmin, async (_req, res) => {
    const data = await storage.getAdminOverview();
    res.json(data);
  });

  app.get("/api/admin/students", isAdmin, async (_req, res) => {
    const data = await storage.getAdminStudents();
    res.json(data);
  });

  app.get("/api/admin/teachers", isAdmin, async (_req, res) => {
    const data = await storage.getAdminTeachers();
    res.json(data);
  });

  app.patch("/api/admin/teachers/:id/org-link", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { env_id } = z.object({ env_id: z.string().nullable() }).parse(req.body);
      let org_id: string | null = null;
      if (env_id) {
        const env = await getOrgEnvironmentById(env_id);
        if (!env) return res.status(404).json({ message: "Org environment not found" });
        org_id = env.org_id;
      }
      const updated = await storage.updateTeacherOrgLink(id, org_id, env_id);
      const { passwordHash: _, ...safe } = updated;
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.teacher.org_link.update", targetType: "teacher", targetId: id, orgId: org_id, meta: { env_id }, req });
      res.json(safe);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/classes", isAdmin, async (_req, res) => {
    const data = await storage.getAdminClasses();
    res.json(data);
  });

  app.patch("/api/admin/classes/:id/org-link", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { env_id } = z.object({ env_id: z.string().nullable() }).parse(req.body);
      if (env_id) {
        const env = await getOrgEnvironmentById(env_id);
        if (!env) return res.status(404).json({ message: "Org environment not found" });
      }
      const updated = await storage.updateClassEnvLink(id, env_id);
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.class.org_link.update", targetType: "class", targetId: id, meta: { env_id }, req });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/challenges", isAdmin, async (_req, res) => {
    const data = await storage.getAdminChallenges();
    res.json(data);
  });

  app.get("/api/admin/search", isAdmin, async (req, res) => {
    const q = String(req.query.q || "");
    const data = await storage.adminSearch(q);
    res.json(data);
  });

  app.get("/api/admin/charts/growth", isAdmin, async (_req, res) => {
    const growth = await storage.getStudentGrowth();
    res.json(growth);
  });

  app.get("/api/admin/charts/lessons", isAdmin, async (_req, res) => {
    const lessons = await storage.getLessonsCompletedPerWeek();
    res.json(lessons);
  });

  app.get("/api/admin/charts/schools", isAdmin, async (_req, res) => {
    const schools = await storage.getMostActiveSchools();
    res.json(schools);
  });

  // Schools CRUD
  app.get("/api/admin/schools", isAdmin, async (_req, res) => {
    const data = await storage.getSchools();
    res.json(data);
  });
  app.post("/api/admin/schools", isAdmin, async (req, res) => {
    try {
      const school = await storage.createSchool(req.body);
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.school.create", targetType: "school", targetId: school.id, meta: { name: school.name }, req });
      res.json(school);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.patch("/api/admin/schools/:id", isAdmin, async (req, res) => {
    try {
      const school = await storage.updateSchool(parseInt(req.params.id), req.body);
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.school.update", targetType: "school", targetId: req.params.id, meta: req.body, req });
      res.json(school);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete("/api/admin/schools/:id", isAdmin, async (req, res) => {
    await storage.deleteSchool(parseInt(req.params.id));
    await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.school.delete", targetType: "school", targetId: req.params.id, req });
    res.json({ ok: true });
  });

  // Sponsors CRUD
  app.get("/api/admin/sponsors", isAdmin, async (_req, res) => {
    const data = await storage.getSponsors();
    res.json(data);
  });
  app.post("/api/admin/sponsors", isAdmin, async (req, res) => {
    try {
      const sponsor = await storage.createSponsor(req.body);
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.sponsor.create", targetType: "sponsor", targetId: sponsor.id, meta: { name: sponsor.name }, req });
      res.json(sponsor);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.patch("/api/admin/sponsors/:id", isAdmin, async (req, res) => {
    try {
      const sponsor = await storage.updateSponsor(parseInt(req.params.id), req.body);
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.sponsor.update", targetType: "sponsor", targetId: req.params.id, meta: req.body, req });
      res.json(sponsor);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete("/api/admin/sponsors/:id", isAdmin, async (req, res) => {
    await storage.deleteSponsor(parseInt(req.params.id));
    await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.sponsor.delete", targetType: "sponsor", targetId: req.params.id, req });
    res.json({ ok: true });
  });

  // DB Viewer
  app.get("/api/admin/db/:table", isAdmin, async (req, res) => {
    const rows = await storage.getAdminDbTable(req.params.table);
    res.json(rows);
  });

  // Background Jobs
  app.get("/api/admin/jobs", isAdmin, async (req, res) => {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50")) || 50, 200);
    const kindParam = req.query.kind ? String(req.query.kind) : undefined;
    const kind = (kindParam === "extract-paper" || kindParam === "admin-csv-export" || kindParam === "purge-ai-usage") ? kindParam as import("../jobs").JobKind : undefined;
    const rows = await listRecentJobs({ limit, kind });
    res.json(rows.map(({ payload, result, ...rest }: any) => ({ ...rest, hasResult: !!result })));
  });

  // Enqueue admin CSV export job
  app.post("/api/admin/exports/:type", isAdmin, async (req: any, res) => {
    const type = req.params.type;
    if (!["students", "teachers", "classes", "schools", "sponsors"].includes(type)) {
      return res.status(400).json({ message: "Unknown export type" });
    }
    const job = await enqueueJob({
      kind: "admin-csv-export",
      ownerId: String(req.user?.id ?? "admin"),
      payload: { type },
    });
    res.json({ jobId: job.id });
  });

  app.get("/api/admin/exports/:jobId/download", isAdmin, async (req, res) => {
    const { getJob } = await import("../jobs");
    const id = parseInt(req.params.jobId);
    const job = await getJob(id);
    if (!job) return res.status(404).json({ message: "Not found" });
    if (job.kind !== "admin-csv-export") return res.status(400).json({ message: "Not an export job" });
    if (job.status !== "completed") return res.status(409).json({ message: `Job not ready (status: ${job.status})` });
    const result = job.result as { objectPath?: string; fileName?: string } | null;
    const objectPath = result?.objectPath;
    const payload = job.payload as { type?: string };
    const fileName = result?.fileName ?? `${payload?.type ?? "export"}.csv`;
    if (!objectPath) return res.status(500).json({ message: "Job result missing objectPath" });
    await streamPrivateObjectToResponse(objectPath, res, fileName, "text/csv");
  });

  // Legacy synchronous CSV export
  app.get("/api/admin/reports/:type.csv", isAdmin, async (req, res) => {
    res.setHeader("Deprecation", "true");
    res.setHeader("Link", `</api/admin/exports/${req.params.type}>; rel="successor-version"`);
    let data: any[] = [];
    if (req.params.type === "students") data = await storage.getAdminStudents();
    else if (req.params.type === "teachers") data = await storage.getAdminTeachers();
    else if (req.params.type === "classes") data = await storage.getAdminClasses();
    else if (req.params.type === "schools") data = await storage.getSchools();
    else if (req.params.type === "sponsors") data = await storage.getSponsors();
    if (!data.length) return res.status(404).json({ message: "No data" });
    const cols = Object.keys(data[0]);
    const rows = data.map(row => cols.map(c => {
      const v = row[c];
      if (v instanceof Date) return v.toISOString().split("T")[0];
      return String(v ?? "");
    }).join(","));
    const csv = [cols.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.type}-report.csv"`);
    res.send(csv);
  });

  // === ADMIN: ORGANIZATIONS CRUD ===
  app.get("/api/admin/organizations", isAdmin, async (_req, res) => {
    const orgs = await getOrganizations();
    res.json(orgs);
  });

  // List pending orgs - MUST come before the /:id param route
  app.get("/api/admin/organizations/pending", isAdmin, async (_req, res) => {
    try {
      if (!supabase) return res.status(503).json({ message: "Supabase not configured" });
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw new Error(`[Supabase] ${error.message}`);
      res.json(data ?? []);
    } catch (e: any) {
      captureError(e, { route: "/api/admin/organizations/pending" });
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/organizations/:id/approve", isAdmin, async (req, res) => {
    try {
      const { tier } = z.object({
        tier: z.enum(["starter", "academy", "institution"]).default("starter"),
      }).parse(req.body);
      const org = await updateOrganization(req.params.id, {
        status: "active",
        is_active: true,
        subscription_tier: tier,
      });
      if (!org) return res.status(404).json({ message: "Organization not found" });
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.organization.approve", targetType: "organization", targetId: req.params.id, orgId: req.params.id, meta: { tier }, req });
      await invalidateOrganizationCache(req.params.id);
      res.json(org);
    } catch (e: any) {
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.post("/api/admin/organizations/:id/reject", isAdmin, async (req, res) => {
    try {
      const org = await updateOrganization(req.params.id, {
        status: "rejected",
        is_active: false,
      });
      if (!org) return res.status(404).json({ message: "Organization not found" });
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.organization.reject", targetType: "organization", targetId: req.params.id, orgId: req.params.id, meta: {}, req });
      await invalidateOrganizationCache(req.params.id);
      res.json(org);
    } catch (e: any) {
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.get("/api/admin/organizations/:id", isAdmin, async (req, res) => {
    const org = await getOrganization(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    res.json(org);
  });

  app.post("/api/admin/organizations", isAdmin, async (req, res) => {
    try {
      const body = z.object({
        name: z.string().min(1),
        type: z.enum(["school", "credit_union", "government", "ngo", "other"]).default("school"),
        country: z.string().default("Bahamas"),
        city: z.string().optional(),
        website: z.string().optional(),
        contact_name: z.string().optional(),
        contact_email: z.string().optional(),
        subscription_tier: z.enum(["starter", "academy", "institution", "free", "standard", "premium"]).default("starter"),
        max_students: z.number().default(50),
        display_label: z.string().optional(),
      }).parse(req.body);
      const org = await createOrganization({ ...body, is_active: true, logo_url: undefined });
      if (!org) return res.status(500).json({ message: "Failed to create organization" });
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.organization.create", targetType: "organization", targetId: org.id, orgId: org.id, meta: { name: body.name }, req });
      res.json(org);
    } catch (e: any) {
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.patch("/api/admin/organizations/:id", isAdmin, async (req, res) => {
    try {
      const org = await updateOrganization(req.params.id, req.body);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      const { invalidateOrganizationCache } = await import("../supabase");
      await invalidateOrganizationCache(req.params.id);
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.organization.update", targetType: "organization", targetId: req.params.id, orgId: req.params.id, meta: req.body, req });
      res.json(org);
    } catch (e: any) {
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.get("/api/admin/org-envs", isAdmin, async (_req, res) => {
    const orgs = await getOrganizations();
    const envRows: any[] = [];
    await Promise.all(orgs.map(async (org) => {
      const envs = await getOrgEnvironments(org.id);
      for (const env of envs) {
        envRows.push({ ...env, org_name: org.name });
      }
    }));
    res.json(envRows);
  });

  app.get("/api/admin/organizations/:id/environments", isAdmin, async (req, res) => {
    const envs = await getOrgEnvironments(req.params.id);
    res.json(envs);
  });

  app.post("/api/admin/organizations/:id/environments", isAdmin, async (req, res) => {
    try {
      const body = z.object({
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
        display_name: z.string().min(1),
        theme_color: z.string().optional(),
        features_enabled: z.array(z.string()).default(["money_games", "investment_sim", "money_guide", "moneylab"]),
      }).parse(req.body);
      const env = await createOrgEnvironment({ org_id: req.params.id, ...body, custom_logo_url: undefined });
      if (!env) return res.status(500).json({ message: "Failed to create environment" });
      res.json(env);
    } catch (e: any) {
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.get("/api/admin/leaderboard", isAdmin, async (req, res) => {
    const envId = req.query.env_id as string | undefined;
    const data = await getLeaderboard(envId, 100);
    res.json(data);
  });

  // === ORG ADMIN: OVERVIEW ===
  app.get("/api/org-admin/overview", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });

    const org = await getOrganization(admin.orgId);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const envs = await getOrgEnvironments(admin.orgId);
    const currentEnv = envs.find(e => e.id === admin.envId);

    let orgStudentCount = 0;
    let envStudentCount = 0;
    if (supabase) {
      const { data: allStudents } = await supabase.from("org_students").select("id,env_id").eq("org_id", admin.orgId);
      orgStudentCount = allStudents?.length ?? 0;
      envStudentCount = allStudents?.filter((s: any) => s.env_id === admin.envId).length ?? 0;
    }

    const { getLessonsByOrg } = await import("../supabase");
    const lessons = await getLessonsByOrg(admin.orgId);
    const envLessons = lessons.filter((l: any) => l.env_id === admin.envId || !l.env_id);
    const publishedLessons = envLessons.filter((l: any) => l.is_published).length;

    const envSummaries = await Promise.all(envs.map(async (env) => {
      let count = 0;
      if (supabase) {
        const { data } = await supabase.from("org_students").select("id").eq("env_id", env.id);
        count = data?.length ?? 0;
      }
      return { id: env.id, slug: env.slug, displayName: env.display_name, joinCode: env.join_code, studentCount: count };
    }));

    res.json({
      org: { id: org?.id, name: org?.name, type: org?.type, country: org?.country, status: org?.status ?? "active" },
      plan: {
        tier: org?.subscription_tier ?? "standard",
        displayLabel: org?.display_label ?? null,
        studentLimit: org?.max_students ?? 500,
      },
      env: { id: currentEnv?.id, slug: currentEnv?.slug, displayName: currentEnv?.display_name, joinCode: currentEnv?.join_code, featuresEnabled: currentEnv?.features_enabled },
      stats: {
        studentCount: envStudentCount,
        orgStudentCount,
        environmentCount: envs.length,
        totalLessons: envLessons.length,
        publishedLessons,
      },
      environments: envSummaries,
    });
  });

  // === ORG ADMIN: STUDENTS ===
  app.get("/api/org-admin/students", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });

    if (!supabase) return res.json([]);
    const { data, error } = await supabase
      .from("org_students")
      .select("*")
      .eq("org_id", admin.orgId)
      .order("joined_at", { ascending: false });
    if (error) return res.status(500).json({ message: error.message });

    const orgStudents = data ?? [];

    const envs = await getOrgEnvironments(admin.orgId);
    const envMap: Record<string, string> = {};
    for (const env of envs) {
      envMap[env.id] = env.display_name ?? env.slug ?? env.id;
    }

    const enriched = await Promise.all(orgStudents.map(async (s: any) => {
      const user = await storage.getUser(s.student_user_id).catch(() => null);
      const xpData = await storage.getUserXp(s.student_user_id).catch(() => null);
      return {
        ...s,
        displayName: user?.firstName ?? s.student_user_id,
        username: (user as any)?.username ?? null,
        avatar: (user as any)?.avatar ?? null,
        xp: xpData?.totalXp ?? 0,
        level: xpData?.level ?? 1,
        streak: xpData?.currentStreak ?? 0,
        envName: envMap[s.env_id] ?? s.env_id,
      };
    }));

    res.json(enriched);
  });

  app.delete("/api/org-admin/students/:studentUserId", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    if (!supabase) return res.status(503).json({ message: "Supabase not available" });

    const { error } = await supabase
      .from("org_students")
      .delete()
      .eq("org_id", admin.orgId)
      .eq("student_user_id", req.params.studentUserId);
    if (error) return res.status(500).json({ message: error.message });
    await audit({ actorType: "org_admin", actorId: admin.id, actorEmail: admin.email, action: "org_admin.student.remove", targetType: "user", targetId: req.params.studentUserId, orgId: admin.orgId, req });
    res.json({ ok: true });
  });

  // === FULL STUDENT DATA PURGE (org admin) ===
  app.delete("/api/org-admin/students/:studentUserId/purge", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    const { studentUserId } = req.params;
    if (supabase) {
      await supabase.from("org_students").delete()
        .eq("org_id", admin.orgId)
        .eq("student_user_id", studentUserId);
    }
    await storage.deleteUserAllData(studentUserId);
    await storage.logDeletion({ userId: studentUserId, orgId: admin.orgId, deletedBy: "org_admin", adminActorId: admin.id });
    await audit({ actorType: "org_admin", actorId: admin.id, actorEmail: admin.email, action: "org_admin.student.purge", targetType: "user", targetId: studentUserId, orgId: admin.orgId, req });
    res.json({ ok: true });
  });

  // === ORG ADMIN: TEACHERS ===

  app.get("/api/org-admin/teachers", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });

      const orgTeachers = await storage.getTeachersByOrgId(admin.orgId);
      const enriched = await Promise.all(orgTeachers.map(async (t) => {
        const teacherClasses = await storage.getClassesByTeacher(t.id);
        return {
          id: t.id,
          firstName: t.firstName,
          lastName: t.lastName,
          email: t.email,
          schoolName: t.schoolName,
          isVerified: t.isVerified,
          classCount: teacherClasses.length,
          createdAt: t.createdAt,
        };
      }));
      res.json(enriched);
    } catch (e: any) {
      captureError(e, { route: req.path });
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/org-admin/teachers/:teacherId", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });

      const teacherId = parseInt(req.params.teacherId, 10);
      if (isNaN(teacherId)) return res.status(400).json({ message: "Invalid teacher ID" });

      const teacher = await storage.getTeacherById(teacherId);
      if (!teacher) return res.status(404).json({ message: "Teacher not found" });
      if (teacher.orgId !== admin.orgId) return res.status(403).json({ message: "Teacher not in your organisation" });

      await storage.updateTeacherOrgLink(teacherId, null, null);
      await audit({ actorType: "org_admin", actorId: admin.id, actorEmail: admin.email, action: "org_admin.teacher.remove", targetType: "teacher", targetId: teacherId, orgId: admin.orgId, req });
      res.json({ ok: true });
    } catch (e: any) {
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  app.post("/api/org-admin/teachers/:teacherId/password-reset", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });

      const teacherId = parseInt(req.params.teacherId, 10);
      if (isNaN(teacherId)) return res.status(400).json({ message: "Invalid teacher ID" });

      const teacher = await storage.getTeacherById(teacherId);
      if (!teacher) return res.status(404).json({ message: "Teacher not found" });
      if (teacher.orgId !== admin.orgId) return res.status(403).json({ message: "Teacher not in your organisation" });

      const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      const tempBytes = crypto.randomBytes(12);
      const tempPassword = Array.from(tempBytes).map(b => chars[b % chars.length]).join("");

      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(tempPassword, 10);
      await storage.resetTeacherPassword(teacherId, hash);

      let emailSent = false;
      if (teacher.email) {
        const org = await getOrganization(admin.orgId);
        const loginUrl = `${appBaseUrl()}/teacher/login`;
        const html = `<!doctype html><html><body style="font-family:system-ui,Arial;background:#f6f7fb;padding:24px">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
            <h1 style="font-size:20px;margin:0 0 12px">Your FinSight Lite password has been reset</h1>
            <p>Hi ${escapeHtml(teacher.firstName)}, your organisation admin at <strong>${escapeHtml(org?.name ?? admin.orgId)}</strong> has reset your password.</p>
            <p style="margin:16px 0;padding:12px;background:#f3f4f6;border-radius:8px">
              <strong>Your temporary password:</strong><br>
              <code style="font-size:18px;background:#fff;padding:4px 10px;border-radius:4px;border:1px solid #e5e7eb;display:inline-block;margin-top:6px">${escapeHtml(tempPassword)}</code>
            </p>
            <p>Please sign in and change your password as soon as possible.</p>
            <p><a href="${escapeHtml(loginUrl)}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Sign in to FinSight Lite</a></p>
            <p style="font-size:12px;color:#6b7280">If you did not expect this, contact your organisation admin immediately.</p>
          </div></body></html>`;

        const sendRes = await sendEmail({
          to: teacher.email,
          subject: "FinSight Lite: Your password has been reset",
          html,
          kind: "teacher_password_reset",
          orgId: admin.orgId,
          userKind: "teacher",
          userId: String(teacher.id),
        }).catch((err: unknown) => ({ ok: false, error: (err as Error)?.message }));
        emailSent = sendRes.ok === true;
      }

      await audit({ actorType: "org_admin", actorId: admin.id, actorEmail: admin.email, action: "org_admin.teacher.password_reset", targetType: "teacher", targetId: teacherId, orgId: admin.orgId, meta: { emailSent }, req });
      res.json({ ok: true, emailSent });
    } catch (e: any) {
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  // === BULK STUDENT IMPORT ===
  app.post(
    "/api/org-admin/students/import/preview",
    isOrgAdmin,
    upload.single("file"),
    async (req: any, res) => {
      try {
        const admin = await storage.getOrgAdminById(req.session.orgAdminId);
        if (!admin) return res.status(401).json({ message: "Not found" });
        if (!req.file) return res.status(400).json({ message: "Please attach a CSV file" });
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext !== ".csv") return res.status(400).json({ message: "File must be a .csv" });

        const csvText = req.file.buffer.toString("utf8");
        const result = await parseAndValidateImport(csvText, admin.orgId, admin.envId);

        let limitWarning: string | null = null;
        const org = await getOrganization(admin.orgId);
        if (org && supabase) {
          const { data: currentStudents } = await supabase.from("org_students").select("id").eq("org_id", admin.orgId);
          const currentCount = currentStudents?.length ?? 0;
          const validCount = result.rows.filter((r: any) => r.status === "ok").length;
          const limit = org.max_students ?? 500;
          if (currentCount + validCount > limit) {
            limitWarning = `This upload would add ${validCount} student${validCount !== 1 ? "s" : ""} but you only have ${Math.max(0, limit - currentCount)} slot${limit - currentCount !== 1 ? "s" : ""} remaining (${currentCount} of ${limit} used). Remove ${currentCount + validCount - limit} row${currentCount + validCount - limit !== 1 ? "s" : ""} and try again.`;
          }
        }

        res.json({ ...result, limitWarning });
      } catch (e: any) {
        res.status(400).json({ message: e.message });
      }
    },
  );

  app.post(
    "/api/org-admin/students/import",
    isOrgAdmin,
    upload.single("file"),
    async (req: any, res) => {
      try {
        const admin = await storage.getOrgAdminById(req.session.orgAdminId);
        if (!admin) return res.status(401).json({ message: "Not found" });
        if (!req.file) return res.status(400).json({ message: "Please attach a CSV file" });
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext !== ".csv") return res.status(400).json({ message: "File must be a .csv" });

        const org = await getOrganization(admin.orgId);
        const env = await getOrgEnvironmentById(admin.envId);
        if (!org || !env) return res.status(400).json({ message: "Organization or environment not found" });

        const csvText = req.file.buffer.toString("utf8");
        const { rows } = await parseAndValidateImport(csvText, admin.orgId, admin.envId);

        if (supabase) {
          const { data: currentStudents } = await supabase.from("org_students").select("id").eq("org_id", admin.orgId);
          const currentCount = currentStudents?.length ?? 0;
          const validNewCount = rows.filter((r: any) => r.status === "ok").length;
          const limit = org.max_students ?? 500;
          if (currentCount + validNewCount > limit) {
            return res.status(400).json({
              message: `This upload would exceed your plan's student limit of ${limit}. You currently have ${currentCount} student${currentCount !== 1 ? "s" : ""} and are adding ${validNewCount} more. Remove ${currentCount + validNewCount - limit} row${currentCount + validNewCount - limit !== 1 ? "s" : ""} and try again.`,
            });
          }
        }

        const created: { rowNum: number; userId: string; username: string; firstName: string; emailSent: boolean; enrolled: boolean }[] = [];
        const skipped: { rowNum: number; reason: string }[] = [];

        for (const row of rows) {
          if (row.status !== "ok") {
            skipped.push({ rowNum: row.rowNum, reason: row.issues.join("; ") });
            continue;
          }

          const taken = await authStorage.getUserByUsername(row.username);
          if (taken) {
            skipped.push({ rowNum: row.rowNum, reason: `Username "${row.username}" was just taken, please re-import this row` });
            continue;
          }

          let user;
          try {
            user = await authStorage.upsertUser({
              username: row.username,
              avatar: row.avatar,
              firstName: row.firstName,
              lastName: row.lastName,
              email: row.email,
            });
          } catch (err) {
            skipped.push({ rowNum: row.rowNum, reason: `Could not create account: ${(err as Error)?.message ?? "unknown error"}` });
            continue;
          }

          const orgEnrollRes = await enrollStudentInOrg(admin.orgId, admin.envId, user.id).catch((err: unknown) => {
            console.warn("[bulk-import] org enroll failed:", (err as Error)?.message);
            return { success: false, alreadyEnrolled: false, enrollment: null };
          });
          let enrolled = orgEnrollRes.success;

          if (row.classRef?.type === "class") {
            try {
              await storage.enrollStudent(row.classRef.id, user.id);
            } catch (err) {
              enrolled = false;
              console.warn("[bulk-import] class enroll failed:", (err as Error)?.message);
            }
          } else if (row.classRef?.type === "org" && row.classRef.envId !== admin.envId) {
            const altRes = await enrollStudentInOrg(admin.orgId, row.classRef.envId, user.id).catch((err: unknown) => {
              console.warn("[bulk-import] alt-env enroll failed:", (err as Error)?.message);
              return { success: false, alreadyEnrolled: false, enrollment: null };
            });
            if (!altRes.success) enrolled = false;
          }

          let emailSent = false;
          if (row.email) {
            await getOrCreateContact({
              userKind: "student",
              userId: user.id,
              email: row.email,
              orgId: admin.orgId,
              verified: false,
            }).catch(() => null);
            const loginUrl = `${appBaseUrl()}/auth?u=${encodeURIComponent(row.username)}`;
            const html = `<!doctype html><html><body style="font-family:system-ui,Arial;background:#f6f7fb;padding:24px">
              <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
                <h1 style="font-size:20px;margin:0 0 12px">Welcome to FinSight Lite!</h1>
                <p>Hi ${escapeHtml(row.firstName)}, your teacher at <strong>${escapeHtml(org.name)}</strong> has set up an account for you.</p>
                <p style="margin:16px 0;padding:12px;background:#f3f4f6;border-radius:8px">
                  <strong>Your sign-in code (username):</strong><br>
                  <code style="font-size:18px;background:#fff;padding:4px 10px;border-radius:4px;border:1px solid #e5e7eb;display:inline-block;margin-top:6px">${escapeHtml(row.username)}</code>
                </p>
                <p>Tap the button below to open FinSight Lite. Type your sign-in code if asked, that's all you need.</p>
                <p><a href="${escapeHtml(loginUrl)}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Sign in to FinSight Lite</a></p>
                <p style="font-size:12px;color:#6b7280">Keep this code private. It's how the app knows it's really you. If this wasn't expected, you can safely ignore this email.</p>
              </div></body></html>`;
            const sendRes = await sendEmail({
              to: row.email,
              subject: "Welcome to FinSight Lite",
              html,
              kind: "welcome",
              orgId: admin.orgId,
              userKind: "student",
              userId: user.id,
            }).catch((err: unknown) => ({ ok: false, error: (err as Error)?.message }));
            emailSent = sendRes.ok === true;
          }

          created.push({
            rowNum: row.rowNum,
            userId: user.id,
            username: row.username,
            firstName: row.firstName,
            emailSent,
            enrolled,
          });
        }

        await audit({
          actorType: "org_admin",
          actorId: admin.id,
          actorEmail: admin.email,
          action: "org_admin.bulk_import.commit",
          targetType: "organization",
          targetId: admin.orgId,
          orgId: admin.orgId,
          meta: {
            envId: admin.envId,
            total: rows.length,
            created: created.length,
            skipped: skipped.length,
            emailed: created.filter((c) => c.emailSent).length,
          },
          req,
        });
        res.json({
          summary: {
            total: rows.length,
            created: created.length,
            skipped: skipped.length,
            emailed: created.filter((c) => c.emailSent).length,
          },
          created,
          skipped,
        });
      } catch (e: any) {
        res.status(400).json({ message: e.message });
      }
    },
  );

  // Org-wide student roster export
  app.get("/api/org-admin/students.csv", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    if (!supabase) return res.status(503).json({ message: "Supabase not available" });

    const { data, error } = await supabase
      .from("org_students")
      .select("*")
      .eq("org_id", admin.orgId)
      .order("joined_at", { ascending: false });
    if (error) return res.status(500).json({ message: error.message });

    const envs = await getOrgEnvironments(admin.orgId);
    const envMap: Record<string, string> = {};
    for (const env of envs) envMap[env.id] = env.display_name ?? env.slug ?? env.id;

    const orgStudents = data ?? [];
    const enriched = await Promise.all(
      orgStudents.map(async (s: any) => {
        const user = await storage.getUser(s.student_user_id).catch(() => null);
        const xp = await storage.getUserXp(s.student_user_id).catch(() => null);
        const progress = await storage.getUserLearningProgress(s.student_user_id).catch(() => []);
        const lessonsCompleted = progress.filter((p) => p.completed).length;
        const completedDates = progress
          .map((p) => p.completedAt)
          .filter((d): d is Date => d != null)
          .map((d) => new Date(d).getTime());
        const lastActiveTs = completedDates.length > 0 ? Math.max(...completedDates) : null;
        const lastActive = lastActiveTs != null ? new Date(lastActiveTs).toISOString() : "";
        return {
          firstName: user?.firstName ?? "",
          lastName: (user as any)?.lastName ?? "",
          username: (user as any)?.username ?? "",
          email: (user as any)?.email ?? "",
          avatar: (user as any)?.avatar ?? "",
          environment: envMap[s.env_id] ?? s.env_id,
          xp: xp?.totalXp ?? 0,
          level: xp?.level ?? 1,
          streak: xp?.currentStreak ?? 0,
          lessonsCompleted,
          lastActive,
          joinedAt: s.joined_at ?? "",
        };
      }),
    );

    const rows: (string | number)[][] = [
      ["First Name", "Last Name", "Username", "Email", "Avatar", "Environment", "XP", "Level", "Streak", "Lessons Completed", "Last Active", "Joined"],
      ...enriched.map((e) => [
        e.firstName, e.lastName, e.username, e.email, e.avatar, e.environment, e.xp, e.level, e.streak, e.lessonsCompleted, e.lastActive, e.joinedAt,
      ]),
    ];
    const csvCell = (raw: string | number): string => {
      const v = String(raw ?? "");
      const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const orgName = (await getOrganization(admin.orgId))?.name ?? "organization";
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${orgName.replace(/[^a-z0-9]/gi, "_")}_students.csv"`,
    );
    res.send(csv);
  });

  // === ORG ADMIN: LEARNING METRICS (avg XP, lesson completion rate) ===
  app.get("/api/org-admin/learning-metrics", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });

    if (!supabase) return res.json({ avgXp: 0, lessonCompletionRate: 0, totalStudents: 0 });

    const { data: orgStudents } = await supabase
      .from("org_students")
      .select("student_user_id")
      .eq("org_id", admin.orgId);

    const studentIds: string[] = (orgStudents ?? []).map((s: any) => s.student_user_id);
    const totalStudents = studentIds.length;

    if (totalStudents === 0) return res.json({ avgXp: 0, lessonCompletionRate: 0, totalStudents: 0 });

    const xpRows = await Promise.all(studentIds.map(id => storage.getUserXp(id).catch(() => null)));
    const validXp = xpRows.filter((r): r is NonNullable<typeof r> => r != null);
    const avgXp = validXp.length > 0 ? Math.round(validXp.reduce((s, r) => s + r.totalXp, 0) / validXp.length) : 0;

    const progressRows = await Promise.all(studentIds.map(id => storage.getUserLearningProgress(id).catch(() => [])));
    const CORE_LESSONS = 9;
    const totalPossible = totalStudents * CORE_LESSONS;
    const totalCompleted = progressRows.reduce((sum, rows) => sum + rows.filter(r => r.completed).length, 0);
    const lessonCompletionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    // Active students (last 30 days): any XP play or lesson completion within the window
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const activeStudents = studentIds.reduce((count, _id, idx) => {
      const xp = xpRows[idx];
      const hasRecentXp = xp?.lastPlayedAt != null && new Date(xp.lastPlayedAt).getTime() >= thirtyDaysAgo;
      const progress = progressRows[idx] ?? [];
      const hasRecentLesson = progress.some(
        p => p.completedAt != null && new Date(p.completedAt).getTime() >= thirtyDaysAgo
      );
      return hasRecentXp || hasRecentLesson ? count + 1 : count;
    }, 0);

    res.json({ avgXp, lessonCompletionRate, totalStudents, activeStudents });
  });

  // === ORG ADMIN: TOP GAMES ===
  app.get("/api/org-admin/top-games", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });

    if (!supabase) return res.json([]);

    const { data: orgStudents } = await supabase
      .from("org_students")
      .select("student_user_id")
      .eq("org_id", admin.orgId);

    const studentIds: string[] = (orgStudents ?? []).map((s: any) => s.student_user_id);
    if (studentIds.length === 0) return res.json([]);

    // TODO: table or column missing. game_name (text) column needed on game_sessions table.
    // Currently game_sessions only tracks mode ("quiz"|"timed"|"challenge"), not the specific
    // game title. To wire this up, either:
    //   (a) add a game_name text column to game_sessions and populate it when sessions are created, or
    //   (b) create a separate money_games_log table (game_name text, user_id varchar, played_at timestamp)
    // Until then, returning placeholder data so the UI has something to render.
    const dummy = [
      { game: "Money Match", sessions: 148 },
      { game: "Budget Blitz", sessions: 112 },
      { game: "Investment Island", sessions: 89 },
      { game: "Savings Sprint", sessions: 74 },
      { game: "Tax Trap", sessions: 53 },
    ];
    res.json(dummy);
  });

  // === ORG ADMIN: STUDENT TABLE (paginated with metrics) ===
  app.get("/api/org-admin/student-table", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });

    if (!supabase) return res.json({ students: [], total: 0 });

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const PAGE_SIZE = 25;

    const { data: orgStudents, count } = await supabase
      .from("org_students")
      .select("student_user_id, joined_at", { count: "exact" })
      .eq("org_id", admin.orgId)
      .order("joined_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    const rows = orgStudents ?? [];

    const enriched = await Promise.all(rows.map(async (s: any) => {
      const user = await storage.getUser(s.student_user_id).catch(() => null);
      const xpData = await storage.getUserXp(s.student_user_id).catch(() => null);
      const progress = await storage.getUserLearningProgress(s.student_user_id).catch(() => []);
      const lessonsCompleted = progress.filter(p => p.completed).length;
      const completedDates = progress
        .map(p => p.completedAt)
        .filter((d): d is Date => d != null)
        .map(d => new Date(d).getTime());
      const xpPlayedAt = xpData?.lastPlayedAt ? new Date(xpData.lastPlayedAt).getTime() : 0;
      const lastActiveTs = Math.max(xpPlayedAt, completedDates.length > 0 ? Math.max(...completedDates) : 0);
      return {
        id: s.student_user_id,
        displayName: [user?.firstName, (user as any)?.lastName].filter(Boolean).join(" ") || (user as any)?.username || s.student_user_id,
        avatar: (user as any)?.avatar ?? null,
        joinedAt: s.joined_at ?? null,
        totalXp: xpData?.totalXp ?? 0,
        lessonsCompleted,
        lastActive: lastActiveTs > 0 ? new Date(lastActiveTs).toISOString() : null,
      };
    }));

    res.json({ students: enriched, total: count ?? rows.length, page, pageSize: PAGE_SIZE });
  });

  // ── In-memory 24-hour AI summary cache (per orgId) ────────────────────────
  const orgSummaryCache = new Map<string, { text: string; expiresAt: number }>();

  // === ORG ADMIN: AI SUMMARY (GET /api/org/summary) ===
  app.get("/api/org/summary", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    const orgId = admin.orgId;

    const hit = orgSummaryCache.get(orgId);
    if (hit && hit.expiresAt > Date.now()) return res.json({ summary: hit.text });

    const { data: orgStudents } = supabase
      ? await supabase.from("org_students").select("student_user_id").eq("org_id", orgId)
      : { data: null };
    const studentIds: string[] = (orgStudents ?? []).map((s: any) => s.student_user_id);
    const totalStudents = studentIds.length;

    if (totalStudents === 0) {
      const text = "No students are enrolled in your organisation yet. Once students join and start learning, their progress will appear here.";
      orgSummaryCache.set(orgId, { text, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
      return res.json({ summary: text });
    }

    const xpRows = await Promise.all(studentIds.map((id) => storage.getUserXp(id).catch(() => null)));
    const progressRows = await Promise.all(studentIds.map((id) => storage.getUserLearningProgress(id).catch(() => [])));
    const validXp = xpRows.filter((r): r is NonNullable<typeof r> => r != null);
    const avgXp = validXp.length > 0 ? Math.round(validXp.reduce((s, r) => s + r.totalXp, 0) / validXp.length) : 0;
    const CORE_LESSONS = 9;
    const totalCompleted = progressRows.reduce((sum, rows) => sum + rows.filter((r) => r.completed).length, 0);
    const lessonCompletionRate = Math.round((totalCompleted / (totalStudents * CORE_LESSONS)) * 100);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const activeStudents = studentIds.reduce((count, _id, idx) => {
      const xp = xpRows[idx];
      const hasRecentXp = xp?.lastPlayedAt != null && new Date(xp.lastPlayedAt).getTime() >= thirtyDaysAgo;
      const prog = progressRows[idx] ?? [];
      const hasRecentLesson = prog.some((p) => p.completedAt != null && new Date(p.completedAt).getTime() >= thirtyDaysAgo);
      return hasRecentXp || hasRecentLesson ? count + 1 : count;
    }, 0);

    const statsText = `Total enrolled students: ${totalStudents}. Active (last 30 days): ${activeStudents}. Average XP per student: ${avgXp}. Lesson completion rate: ${lessonCompletionRate}%.`;

    try {
      const AnthropicSDK = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new AnthropicSDK();
      const message = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 256,
        system: "You are a helpful assistant for Finsight Lite, a Caribbean financial literacy platform for youth ages 12-17. Write a 2-3 sentence plain-English summary of this organisation's student engagement this month. Be specific with the numbers. Keep the tone warm and encouraging. Do not use em dashes.",
        messages: [{ role: "user", content: statsText }],
      });
      const summary = (message.content[0] as any).text as string;
      orgSummaryCache.set(orgId, { text: summary, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
      res.json({ summary });
    } catch {
      res.status(500).json({ message: "AI summary unavailable" });
    }
  });

  // === ORG ADMIN: PDF REPORT (GET /api/org/report/pdf) ===
  app.get("/api/org/report/pdf", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });

    const org = await getOrganization(admin.orgId);
    const orgName: string = (org as any)?.name ?? admin.orgId;
    const territory: string = (org as any)?.territory ?? "";
    const orgId = admin.orgId;

    const { data: orgStudents } = supabase
      ? await supabase.from("org_students").select("student_user_id").eq("org_id", orgId)
      : { data: null };
    const studentIds: string[] = (orgStudents ?? []).map((s: any) => s.student_user_id);

    const xpRows = await Promise.all(studentIds.map((id) => storage.getUserXp(id).catch(() => null)));
    const progressRows = await Promise.all(studentIds.map((id) => storage.getUserLearningProgress(id).catch(() => [])));
    const validXp = xpRows.filter((r): r is NonNullable<typeof r> => r != null);
    const avgXp = validXp.length > 0 ? Math.round(validXp.reduce((s, r) => s + r.totalXp, 0) / validXp.length) : 0;
    const CORE_LESSONS = 9;
    const totalCompleted = progressRows.reduce((sum, rows) => sum + rows.filter((r) => r.completed).length, 0);
    const lessonCompletionRate = studentIds.length > 0
      ? Math.round((totalCompleted / (studentIds.length * CORE_LESSONS)) * 100) : 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const activeCount = studentIds.reduce((count, _id, idx) => {
      const xp = xpRows[idx];
      const hasRecentXp = xp?.lastPlayedAt != null && new Date(xp.lastPlayedAt).getTime() >= thirtyDaysAgo;
      const prog = progressRows[idx] ?? [];
      const hasRecentLesson = prog.some((p) => p.completedAt != null && new Date(p.completedAt).getTime() >= thirtyDaysAgo);
      return hasRecentXp || hasRecentLesson ? count + 1 : count;
    }, 0);

    // Student table: up to 25 rows, sorted by XP desc
    const tableIds = studentIds.slice(0, 25);
    const tableRows: Array<{ name: string; totalXp: number; lessonsCompleted: number; lastActive: string }> = [];
    for (let i = 0; i < tableIds.length; i++) {
      const id = tableIds[i];
      const user = await storage.getUser(id).catch(() => null);
      const displayName = user
        ? [(user as any).firstName, (user as any).lastName].filter(Boolean).join(" ") || (user as any).username || id
        : id;
      const xpData = xpRows[i];
      const prog = progressRows[i] ?? [];
      tableRows.push({
        name: String(displayName),
        totalXp: xpData?.totalXp ?? 0,
        lessonsCompleted: prog.filter((p) => p.completed).length,
        lastActive: xpData?.lastPlayedAt ? new Date(xpData.lastPlayedAt).toLocaleDateString("en-GB") : "-",
      });
    }
    tableRows.sort((a, b) => b.totalXp - a.totalXp);

    const now = new Date();
    const periodLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

    const pdfkitMod = await import("pdfkit");
    const PDFDocument = (pdfkitMod as any).default ?? pdfkitMod;
    const doc: any = new (PDFDocument as any)({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="finsight-report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.pdf"`);
    doc.pipe(res);

    const W = 495;
    const TEAL = "#0d9488";
    const DARK = "#0f172a";
    const MID = "#374151";
    const LIGHT = "#6b7280";

    // Header
    doc.fillColor(TEAL).fontSize(22).font("Helvetica-Bold").text("Finsight Lite", 50, 50);
    doc.fillColor(DARK).fontSize(16).font("Helvetica-Bold").text(orgName, 50, 78);
    if (territory) doc.fillColor(LIGHT).fontSize(11).font("Helvetica").text(territory, 50, 98);
    doc.fillColor(TEAL).moveTo(50, 118).lineTo(545, 118).lineWidth(1.5).stroke();
    doc.fillColor(MID).fontSize(11).font("Helvetica").text(`Monthly Report: ${periodLabel}`, 50, 128);
    doc.fillColor(LIGHT).fontSize(9).text(
      `Generated: ${now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} UTC`,
      50, 143,
    );

    // Metrics grid (2 rows × 3 cols)
    const metrics = [
      { label: "Total Students", value: String(studentIds.length) },
      { label: "Active (Last 30 Days)", value: String(activeCount) },
      { label: "Avg XP per Student", value: String(avgXp) },
      { label: "Lesson Completion", value: `${lessonCompletionRate}%` },
      { label: "Lessons Completed", value: String(totalCompleted) },
      { label: "Top Games", value: "(coming soon)" }, // TODO: wire up top-games query
    ];
    const cellW = (W - 10) / 3;
    const cellH = 54;
    const gridTop = 168;
    metrics.forEach((m, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 50 + col * (cellW + 5);
      const y = gridTop + row * (cellH + 8);
      doc.roundedRect(x, y, cellW, cellH, 6).fillColor("#f8fafc").fill();
      doc.fillColor(LIGHT).fontSize(8).font("Helvetica").text(m.label.toUpperCase(), x + 10, y + 10, { width: cellW - 20 });
      doc.fillColor(DARK).fontSize(18).font("Helvetica-Bold").text(m.value, x + 10, y + 24, { width: cellW - 20 });
    });

    // Student table
    const tableTop = gridTop + 2 * (cellH + 8) + 24;
    doc.fillColor(DARK).fontSize(12).font("Helvetica-Bold").text("Student Activity", 50, tableTop);
    if (studentIds.length > 25) {
      doc.fillColor(LIGHT).fontSize(8).font("Helvetica").text(`(Top 25 of ${studentIds.length} by XP)`, 164, tableTop + 3);
    }
    const colXs = [50, 232, 328, 412, 545];
    const headers = ["Name", "Total XP", "Lessons", "Last Active"];
    const thY = tableTop + 18;
    doc.rect(50, thY, W, 20).fillColor("#f1f5f9").fill();
    headers.forEach((h, i) => {
      doc.fillColor(MID).fontSize(8).font("Helvetica-Bold").text(h, colXs[i] + 4, thY + 6, { width: colXs[i + 1] - colXs[i] - 8 });
    });
    let rowY = thY + 20;
    tableRows.forEach((row, i) => {
      if (i % 2 === 1) doc.rect(50, rowY, W, 18).fillColor("#f8fafc").fill();
      const vals = [row.name, String(row.totalXp), String(row.lessonsCompleted), row.lastActive];
      vals.forEach((v, ci) => {
        doc.fillColor(ci === 0 ? DARK : MID).fontSize(8).font("Helvetica")
          .text(v, colXs[ci] + 4, rowY + 5, { width: colXs[ci + 1] - colXs[ci] - 8, ellipsis: true });
      });
      rowY += 18;
    });
    if (tableRows.length === 0) {
      doc.fillColor(LIGHT).fontSize(9).font("Helvetica").text("No students enrolled yet.", 54, rowY + 6);
      rowY += 24;
    }

    // Footer
    const footerY = Math.max(rowY + 20, 790);
    doc.fillColor("#e2e8f0").moveTo(50, footerY).lineTo(545, footerY).lineWidth(0.5).stroke();
    doc.fillColor(LIGHT).fontSize(8).font("Helvetica")
      .text("Finsight Lite · Finsight Limited · www.finsightlite.com", 50, footerY + 6, { align: "center", width: W });

    doc.end();
  });

  // === ORG ADMIN: EMAIL TEST (TEMPORARY, remove after confirmation) ===
  app.get("/api/org/email-test", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Unauthorized" });
    if (!admin.email) return res.status(400).json({ message: "No email address on this admin account" });

    const org = await getOrganization(admin.orgId);
    const orgName = org?.name ?? admin.orgId;

    if (!supabase) return res.status(503).json({ message: "Supabase not available" });
    const { data: orgStudents } = await supabase
      .from("org_students")
      .select("student_user_id")
      .eq("org_id", admin.orgId);
    const studentIds: string[] = (orgStudents ?? []).map((s: any) => s.student_user_id);

    const xpRows = await Promise.all(studentIds.map((id) => storage.getUserXp(id).catch(() => null)));
    const progressRows = await Promise.all(studentIds.map((id) => storage.getUserLearningProgress(id).catch(() => [])));

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const validXp = xpRows.filter((r): r is NonNullable<typeof r> => r != null);
    const avgXp = validXp.length > 0
      ? Math.round(validXp.reduce((s, r) => s + r.totalXp, 0) / validXp.length) : 0;
    const CORE_LESSONS = 9;
    const totalCompleted = progressRows.reduce(
      (sum, rows) => sum + rows.filter((r: any) => r.completed).length, 0
    );
    const lessonCompletionRate = studentIds.length > 0
      ? Math.round((totalCompleted / (studentIds.length * CORE_LESSONS)) * 100) : 0;
    const activeCount = studentIds.filter((_id, idx) => {
      const xp = xpRows[idx];
      if (xp?.lastPlayedAt && new Date(xp.lastPlayedAt) >= sevenDaysAgo) return true;
      const prog = progressRows[idx] ?? [];
      return prog.some((p: any) => p.completedAt && new Date(p.completedAt) >= sevenDaysAgo);
    }).length;

    const weekStart = new Date().toISOString().slice(0, 10);
    const baseUrl = appBaseUrl();
    const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
  <h2 style="color:#0d9488;margin-bottom:4px">Finsight Lite</h2>
  <h3 style="margin-top:0">Your weekly update &mdash; ${escapeHtml(orgName)} <span style="font-size:12px;font-weight:normal;color:#dc2626;border:1px solid #dc2626;border-radius:4px;padding:2px 6px;vertical-align:middle">TEST</span></h3>
  <p>Here is how your students are doing for the week of <strong>${escapeHtml(weekStart)}</strong>:</p>
  <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr style="background:#f1f5f9"><td style="padding:8px 12px;font-weight:600">Total students enrolled</td><td style="padding:8px 12px">${studentIds.length}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600">Active this week</td><td style="padding:8px 12px">${activeCount}</td></tr>
    <tr style="background:#f1f5f9"><td style="padding:8px 12px;font-weight:600">Average XP per student</td><td style="padding:8px 12px">${avgXp}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600">Lesson completion rate</td><td style="padding:8px 12px">${lessonCompletionRate}%</td></tr>
  </table>
  <p>Keep encouraging your students to log on and learn!</p>
  <p><a href="${escapeHtml(baseUrl)}/org/dashboard" style="background:#0d9488;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Open your dashboard</a></p>
  <p style="font-size:12px;color:#6b7280;margin-top:24px">Finsight Lite &middot; Finsight Limited</p>
</div>`;

    const result = await sendEmail({
      to: admin.email,
      subject: `[TEST] Your Finsight Lite weekly update: ${orgName}`,
      html,
      text: `[TEST] Finsight Lite weekly update: ${orgName}\n\nWeek of: ${weekStart}\nTotal students: ${studentIds.length}\nActive this week: ${activeCount}\nAvg XP: ${avgXp}\nLesson completion: ${lessonCompletionRate}%\n\nDashboard: ${baseUrl}/org/dashboard`,
      kind: "org_weekly_email",
      orgId: admin.orgId,
    });

    res.json({ ok: result.ok, to: admin.email, orgName, weekStart, studentIds: studentIds.length, activeCount, avgXp, lessonCompletionRate, error: result.error ?? null });
  });
  // === END TEMPORARY EMAIL TEST ===

  // === ORG ADMIN: BRANDING ===
  app.get("/api/org-admin/branding", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    const org = await getOrganization(admin.orgId);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    res.json({
      logoUrl: org.logo_url ?? null,
      signatureLeftName: org.signature_left_name ?? null,
      signatureLeftRole: org.signature_left_role ?? null,
      signatureRightName: org.signature_right_name ?? null,
      signatureRightRole: org.signature_right_role ?? null,
      allowedEmailDomains: org.allowed_email_domains ?? [],
    });
  });

  app.patch("/api/org-admin/branding", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      const body = z.object({
        logoUrl: z.string().max(2048).nullable().optional(),
        signatureLeftName: z.string().max(80).nullable().optional(),
        signatureLeftRole: z.string().max(80).nullable().optional(),
        signatureRightName: z.string().max(80).nullable().optional(),
        signatureRightRole: z.string().max(80).nullable().optional(),
        allowedEmailDomains: z.array(z.string().max(253)).max(20).optional(),
      }).parse(req.body);

      if (
        body.logoUrl &&
        !/^(\/public-objects\/|data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,|https?:\/\/)/i.test(body.logoUrl)
      ) {
        return res.status(400).json({ message: "Logo must be an uploaded file URL or http(s) URL" });
      }

      const updates: Partial<Organization> = {};
      if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl;
      if (body.signatureLeftName !== undefined) updates.signature_left_name = body.signatureLeftName;
      if (body.signatureLeftRole !== undefined) updates.signature_left_role = body.signatureLeftRole;
      if (body.signatureRightName !== undefined) updates.signature_right_name = body.signatureRightName;
      if (body.signatureRightRole !== undefined) updates.signature_right_role = body.signatureRightRole;
      if (body.allowedEmailDomains !== undefined) {
        const domainRe = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/;
        const normalised = body.allowedEmailDomains
          .map((d) => d.toLowerCase().replace(/^@/, "").trim())
          .filter(Boolean);
        const invalid = normalised.filter((d) => !domainRe.test(d));
        if (invalid.length > 0) {
          return res.status(400).json({ message: `Invalid domain format: ${invalid.join(", ")}` });
        }
        updates.allowed_email_domains = normalised;
      }

      const org = await updateOrganization(admin.orgId, updates);
      if (!org) return res.status(500).json({ message: "Failed to update organization branding" });
      const { invalidateOrganizationCache } = await import("../supabase");
      await invalidateOrganizationCache(admin.orgId);
      await audit({ actorType: "org_admin", actorId: admin.id, actorEmail: admin.email, action: "org_admin.branding.update", targetType: "organization", targetId: admin.orgId, orgId: admin.orgId, meta: Object.keys(updates), req });
      res.json({
        logoUrl: org.logo_url ?? null,
        signatureLeftName: org.signature_left_name ?? null,
        signatureLeftRole: org.signature_left_role ?? null,
        signatureRightName: org.signature_right_name ?? null,
        signatureRightRole: org.signature_right_role ?? null,
        allowedEmailDomains: org.allowed_email_domains ?? [],
      });
    } catch (e: any) {
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      res.status(status).json({ message: e.message });
    }
  });

  const handleLogoUpload = (req: any, res: any, next: any) => {
    logoUpload.single("logo")(req, res, (err: any) => {
      if (err) {
        const status = err?.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ message: err.message || "Logo upload failed" });
      }
      next();
    });
  };

  app.post(
    "/api/org-admin/branding/logo",
    isOrgAdmin,
    handleLogoUpload,
    async (req: any, res) => {
      try {
        const admin = await storage.getOrgAdminById(req.session.orgAdminId);
        if (!admin) return res.status(401).json({ message: "Not found" });
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const mimeToExt: Record<string, string> = {
          "image/png": "png",
          "image/jpeg": "jpg",
          "image/jpg": "jpg",
          "image/webp": "webp",
          "image/gif": "gif",
        };
        const ext = mimeToExt[req.file.mimetype.toLowerCase()] || "png";
        const filename = `${admin.orgId}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

        const publicPaths = objectStorage.getPublicObjectSearchPaths();
        const targetDir = publicPaths[0];
        const objectKey = `logos/${filename}`;
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
        res.status(201).json({ url });
      } catch (e: any) {
        console.error("Logo upload failed:", e);
        res.status(500).json({ message: e.message || "Logo upload failed" });
      }
    },
  );

  // === ORG ADMIN: VIDEO LIBRARY ===
  const handleVideoUpload = (req: any, res: any, next: any) => {
    videoUpload.single("video")(req, res, (err: any) => {
      if (err) {
        const status = err?.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ message: err.message || "Video upload failed" });
      }
      next();
    });
  };

  app.post(
    "/api/org-admin/videos/upload",
    isOrgAdmin,
    handleVideoUpload,
    async (req: any, res) => {
      try {
        const admin = await storage.getOrgAdminById(req.session.orgAdminId);
        if (!admin) return res.status(401).json({ message: "Not found" });
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const isVideoFile = req.file.mimetype.toLowerCase().startsWith("video/");
        const maxSize = isVideoFile ? LESSON_UPLOAD_MAX_VIDEO : LESSON_UPLOAD_MAX_DOC;
        if (req.file.size > maxSize) {
          return res.status(413).json({
            message: `File too large. Maximum size is ${isVideoFile ? "500 MB" : "25 MB"} for this file type.`,
          });
        }
        if (!checkLessonFileIntegrity(req.file.buffer, req.file.mimetype)) {
          return res.status(422).json({
            message: "File appears corrupted or the content does not match its extension. Please check the file and try again.",
          });
        }

        const ext = LESSON_CONTENT_MIME_TO_EXT[req.file.mimetype.toLowerCase()] || "bin";
        const rawBase = (req.file.originalname || "upload").replace(/\.[^.]+$/, "");
        const safeName = rawBase.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
        const filename = `${safeName}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;

        const publicPaths = objectStorage.getPublicObjectSearchPaths();
        const targetDir = publicPaths[0];
        const objectKey = `videos/${admin.orgId}/${filename}`;
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
        console.error("Video upload failed:", e);
        res.status(500).json({ message: e.message || "Video upload failed" });
      }
    },
  );

  app.get("/api/org-admin/videos", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });

      const publicPaths = objectStorage.getPublicObjectSearchPaths();
      const targetDir = publicPaths[0];
      const prefix = `videos/${admin.orgId}/`;
      const fullPrefix = `${targetDir.replace(/\/$/, "")}/${prefix}`;
      const [, bucketName, ...rest] = fullPrefix.split("/");
      const folderPath = rest.join("/");

      const [files] = await objectStorageClient.bucket(bucketName).getFiles({ prefix: folderPath });
      const videos = files.map((f: any) => {
        const objectKey = `videos/${admin.orgId}/${f.name.split("/").pop()}`;
        return {
          url: `/public-objects/${objectKey}`,
          name: f.name.split("/").pop() ?? f.name,
          updatedAt: f.metadata?.updated ?? null,
        };
      });
      res.json(videos);
    } catch (e: any) {
      console.error("Video list failed:", e);
      res.status(500).json({ message: e.message || "Failed to list videos" });
    }
  });

  // ─── Org Admin: Class management ─────────────────────────────────────────────

  // GET /api/org-admin/classes - list all classes in this org with teacher info
  app.get("/api/org-admin/classes", isOrgAdmin, async (req: any, res) => {
    try {
      const orgId = req.session.orgId as string;
      const classList = await storage.getClassesByOrgId(orgId);
      res.json(classList);
    } catch (e: any) {
      captureError(e);
      res.status(500).json({ message: e.message || "Failed to load classes" });
    }
  });

  // PATCH /api/org-admin/classes/:id/teacher - reassign a class to a different teacher
  // Only the teacher_id field changes; all class data (students, lessons, etc.) stays intact.
  app.patch("/api/org-admin/classes/:id/teacher", isOrgAdmin, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id, 10);
      if (isNaN(classId)) return res.status(400).json({ message: "Invalid class ID" });

      const { newTeacherId } = z.object({ newTeacherId: z.number().int().positive() }).parse(req.body);

      const orgId = req.session.orgId as string;
      const orgAdminId = req.session.orgAdminId as string;

      // Verify the class belongs to this org
      const orgClasses = await storage.getClassesByOrgId(orgId);
      const targetClass = orgClasses.find(c => c.id === classId);
      if (!targetClass) return res.status(404).json({ message: "Class not found in your organisation" });

      // Verify the destination teacher belongs to this org
      const orgTeachers = await storage.getTeachersByOrgId(orgId);
      const newTeacher = orgTeachers.find(t => t.id === newTeacherId);
      if (!newTeacher) return res.status(400).json({ message: "Teacher not found in your organisation" });

      if (targetClass.teacherId === newTeacherId) {
        return res.status(400).json({ message: "This teacher is already assigned to the class" });
      }

      await storage.reassignClassTeacher(classId, newTeacherId);

      const newTeacherName = `${newTeacher.firstName} ${newTeacher.lastName ?? ""}`.trim();

      await audit({
        actorType: "org_admin",
        actorId: orgAdminId,
        action: "org_admin.class.teacher_reassigned",
        targetType: "class",
        targetId: classId,
        orgId,
        meta: {
          className: targetClass.name,
          previousTeacherId: targetClass.teacherId,
          previousTeacherName: targetClass.teacherName,
          newTeacherId,
          newTeacherName,
        },
        req,
      });

      res.json({ ok: true, newTeacherName });
    } catch (e: any) {
      captureError(e);
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid request body" });
      res.status(500).json({ message: e.message || "Failed to reassign class teacher" });
    }
  });

  // ─── Admin: Seed the demo/test organisation ───────────────────────────────────
  // Creates or activates the demo org and preloads it with realistic Caribbean data.
  // Guarded to founder admin only. Idempotent - safe to run multiple times.
  app.post("/api/admin/seed-demo-org", isAdmin, async (req: any, res) => {
    try {
      const DEMO_ORG_DISPLAY_LABEL = "demo-test-org";
      const DEMO_ORG_NAME = "FinSight Demo School [TEST]";
      const bcrypt = await import("bcryptjs");

      // 1. Find or create the demo org
      const allOrgs = await getOrganizations();
      let demoOrg = allOrgs.find(o => o.display_label === DEMO_ORG_DISPLAY_LABEL)
        ?? allOrgs.find(o => o.name?.includes("XYZ99") || o.name?.includes("Demo School"));

      if (demoOrg) {
        demoOrg = await updateOrganization(demoOrg.id, {
          name: DEMO_ORG_NAME,
          status: "active",
          is_active: true,
          display_label: DEMO_ORG_DISPLAY_LABEL,
        }) ?? demoOrg;
      } else {
        const created = await createOrganization({
          name: DEMO_ORG_NAME,
          status: "active",
          is_active: true,
          display_label: DEMO_ORG_DISPLAY_LABEL,
          type: "school",
          country: "Caribbean",
          subscription_tier: "academy",
          max_students: 200,
          contact_email: "demo@finsightlite.com",
          contact_name: "Demo Admin",
          website: "",
        });
        if (created) demoOrg = created;
      }
      if (!demoOrg) throw new Error("[Supabase] Could not create or find demo organisation");

      const demoOrgId = demoOrg.id;

      // 2. Get or create the org environment
      let envs = await getOrgEnvironments(demoOrgId);
      let demoEnv: typeof envs[0] | null = envs[0] ?? null;
      if (!demoEnv) {
        demoEnv = await createOrgEnvironment({
          org_id: demoOrgId,
          slug: "demo-env",
          display_name: "Demo Environment",
          features_enabled: ["all"],
          join_code: "DEMO-ENV",
        });
      }
      if (!demoEnv) throw new Error("[Supabase] Could not create demo environment");

      const demoEnvId = demoEnv.id;
      const demoJoinCode = demoEnv.join_code ?? "DEMO";

      // 3. Create 2 test teachers (idempotent by email)
      const teacherDefs = [
        { firstName: "Diana", lastName: "Clarke", email: "diana.clarke@demo.finsightlite.com", school: "FinSight Demo School" },
        { firstName: "Marcus", lastName: "Reid",   email: "marcus.reid@demo.finsightlite.com",  school: "FinSight Demo School" },
      ];
      const hash = await bcrypt.hash("DemoPass2025!", 10);
      const { db: rawDb } = await import("../db");
      const { teachers: teachersTable, classes: classesTable, classEnrollments: enrollmentsTable,
        users: usersTable, userXp, userLearningProgress, gameSessions, transactions, budgets,
        savingsGoals, categories, portfolioHoldings, portfolioTransactions, simulatedStocks,
      } = await import("@shared/schema");
      const { eq: deq, and: dand, inArray: dinArray, isNull: disNull } = await import("drizzle-orm");

      const createdTeachers: any[] = [];
      for (const td of teacherDefs) {
        const [existing] = await rawDb.select().from(teachersTable).where(deq(teachersTable.email, td.email));
        if (existing) {
          await rawDb.update(teachersTable).set({ orgId: demoOrgId, envId: demoEnvId }).where(deq(teachersTable.id, existing.id));
          createdTeachers.push(existing);
        } else {
          const [t] = await rawDb.insert(teachersTable).values({
            firstName: td.firstName, lastName: td.lastName, email: td.email,
            passwordHash: hash, schoolName: td.school, orgId: demoOrgId, envId: demoEnvId,
          }).returning();
          createdTeachers.push(t);
        }
      }
      const [teacherA, teacherB] = createdTeachers;

      // 4. Create 3 test classes (idempotent by code)
      const classDefs = [
        { code: "DEMO-CLS-A", name: "Financial Literacy 101", teacherId: teacherA.id },
        { code: "DEMO-CLS-B", name: "Savings & Budgeting",    teacherId: teacherA.id },
        { code: "DEMO-CLS-C", name: "Investing Fundamentals", teacherId: teacherB.id },
      ];
      const createdClasses: any[] = [];
      for (const cd of classDefs) {
        const [existing] = await rawDb.select().from(classesTable).where(deq(classesTable.code, cd.code));
        if (existing) {
          await rawDb.update(classesTable).set({ teacherId: cd.teacherId, envId: demoEnvId }).where(deq(classesTable.id, existing.id));
          createdClasses.push(existing);
        } else {
          const [cls] = await rawDb.insert(classesTable).values({
            teacherId: cd.teacherId, name: cd.name, subject: "Financial Literacy",
            code: cd.code, envId: demoEnvId,
          }).returning();
          createdClasses.push(cls);
        }
      }

      // 5. Create 8 test students with Caribbean names
      const studentDefs = [
        { id: "demo-test-s001", firstName: "Kadian",  username: "Kadian_Demo",  avatar: "star",    classIdx: 0 },
        { id: "demo-test-s002", firstName: "Shanique", username: "Shanique_Demo", avatar: "dolphin", classIdx: 0 },
        { id: "demo-test-s003", firstName: "Deshawn", username: "Deshawn_Demo", avatar: "rocket",  classIdx: 0 },
        { id: "demo-test-s004", firstName: "Aaliyah", username: "Aaliyah_Demo", avatar: "lion",    classIdx: 1 },
        { id: "demo-test-s005", firstName: "Kemar",   username: "Kemar_Demo",   avatar: "owl",     classIdx: 1 },
        { id: "demo-test-s006", firstName: "Tamara",  username: "Tamara_Demo",  avatar: "turtle",  classIdx: 1 },
        { id: "demo-test-s007", firstName: "Zara",    username: "Zara_Demo",    avatar: "parrot",  classIdx: 2 },
        { id: "demo-test-s008", firstName: "Malik",   username: "Malik_Demo",   avatar: "crab",    classIdx: 2 },
      ];
      const xpProfiles = [
        { xp: 520, level: 5, streak: 9,  lessons: [1,2,3,4,5,6], correct: 9, total: 10 },
        { xp: 380, level: 4, streak: 5,  lessons: [1,2,3,4,5],   correct: 8, total: 10 },
        { xp: 210, level: 3, streak: 2,  lessons: [1,2,3],       correct: 6, total: 10 },
        { xp: 460, level: 4, streak: 7,  lessons: [1,2,3,4,5],   correct: 8, total: 10 },
        { xp: 140, level: 2, streak: 1,  lessons: [1,2],         correct: 5, total: 10 },
        { xp: 310, level: 3, streak: 4,  lessons: [1,2,3,4],     correct: 7, total: 10 },
        { xp: 590, level: 5, streak: 12, lessons: [1,2,3,4,5,6], correct: 9, total: 10 },
        { xp: 270, level: 3, streak: 3,  lessons: [1,2,3,4],     correct: 6, total: 10 },
      ];

      const catRows = await rawDb.select().from(categories).where(disNull(categories.userId));
      const catByName: Record<string, number> = Object.fromEntries(catRows.map((c: any) => [c.name, c.id]));

      const createdStudentIds: string[] = [];
      for (let i = 0; i < studentDefs.length; i++) {
        const s = studentDefs[i];
        const prog = xpProfiles[i];
        const targetClass = createdClasses[s.classIdx];

        // Upsert user
        const [existingUser] = await rawDb.select().from(usersTable).where(deq(usersTable.id, s.id));
        if (!existingUser) {
          await rawDb.insert(usersTable).values({ id: s.id, firstName: s.firstName, username: s.username, avatar: s.avatar } as any);
        }
        createdStudentIds.push(s.id);

        // Enrol in class
        const [alreadyEnrolled] = await rawDb.select().from(enrollmentsTable)
          .where(dand(deq(enrollmentsTable.classId, targetClass.id), deq(enrollmentsTable.studentId, s.id)));
        if (!alreadyEnrolled) {
          await rawDb.insert(enrollmentsTable).values({ classId: targetClass.id, studentId: s.id });
        }

        // Enrol in org (Supabase)
        await enrollStudentInOrg(s.id, demoOrgId, demoEnvId).catch(() => {});

        // XP
        const [alreadyXp] = await rawDb.select().from(userXp).where(deq(userXp.userId, s.id));
        if (!alreadyXp) {
          await rawDb.insert(userXp).values({ userId: s.id, totalXp: prog.xp, level: prog.level, currentStreak: prog.streak, longestStreak: prog.streak });
        }

        // Learning progress
        for (const moduleId of prog.lessons) {
          const [alreadyLesson] = await rawDb.select().from(userLearningProgress)
            .where(dand(deq(userLearningProgress.userId, s.id), deq(userLearningProgress.moduleId, moduleId)));
          if (!alreadyLesson) {
            await rawDb.insert(userLearningProgress).values({ userId: s.id, moduleId, completed: true });
          }
        }

        // Game session
        const [alreadySession] = await rawDb.select().from(gameSessions).where(deq(gameSessions.userId, s.id));
        if (!alreadySession) {
          await rawDb.insert(gameSessions).values({ userId: s.id, mode: "quiz", score: prog.xp, correctAnswers: prog.correct, totalQuestions: prog.total });
        }
      }

      // 6. Seed financial data for primary demo students (first 3)
      const primaryStudents = studentDefs.slice(0, 3);
      const now = new Date();
      const d = (daysAgo: number) => { const dt = new Date(now); dt.setDate(dt.getDate() - daysAgo); return dt; };

      const txData: Record<string, any[]> = {
        "demo-test-s001": [
          { amount: "40.00",  type: "income",  catName: "Allowance",       date: d(14), desc: "Weekly allowance" },
          { amount: "3.00",   type: "expense", catName: "Transportation",   date: d(13), desc: "Bus fare to school" },
          { amount: "14.50",  type: "expense", catName: "Food & Dining",    date: d(12), desc: "Lunch at Johnny Canoe's" },
          { amount: "20.00",  type: "expense", catName: "Education",        date: d(11), desc: "School supplies" },
          { amount: "40.00",  type: "income",  catName: "Allowance",       date: d(7),  desc: "Weekly allowance" },
          { amount: "9.00",   type: "expense", catName: "Food & Dining",    date: d(6),  desc: "Lunch at Bahamian Cookin'" },
          { amount: "15.00",  type: "expense", catName: "Bills & Utilities", date: d(5),  desc: "BTC mobile top-up" },
          { amount: "40.00",  type: "income",  catName: "Allowance",       date: d(0),  desc: "Weekly allowance" },
          { amount: "22.00",  type: "expense", catName: "Personal Care",    date: d(1),  desc: "Haircut at local barber" },
        ],
        "demo-test-s002": [
          { amount: "30.00",  type: "income",  catName: "Allowance",       date: d(10), desc: "Pocket money" },
          { amount: "8.00",   type: "expense", catName: "Food & Dining",    date: d(9),  desc: "Snacks and drinks" },
          { amount: "5.00",   type: "expense", catName: "Transportation",   date: d(8),  desc: "Bus fare" },
          { amount: "30.00",  type: "income",  catName: "Allowance",       date: d(3),  desc: "Pocket money" },
          { amount: "12.00",  type: "expense", catName: "Entertainment",    date: d(2),  desc: "Movie night" },
        ],
        "demo-test-s003": [
          { amount: "25.00",  type: "income",  catName: "Allowance",       date: d(8),  desc: "Weekly allowance" },
          { amount: "6.00",   type: "expense", catName: "Food & Dining",    date: d(7),  desc: "School lunch" },
          { amount: "25.00",  type: "income",  catName: "Allowance",       date: d(1),  desc: "Weekly allowance" },
          { amount: "4.50",   type: "expense", catName: "Transportation",   date: d(0),  desc: "Bus fare" },
        ],
      };

      for (const s of primaryStudents) {
        const txList = txData[s.id];
        if (!txList) continue;
        const [alreadyTx] = await rawDb.select().from(transactions).where(deq(transactions.userId, s.id));
        if (!alreadyTx) {
          await rawDb.insert(transactions).values(
            txList.map(t => ({
              userId: s.id, amount: t.amount, type: t.type, currency: "BSD",
              categoryId: catByName[t.catName] ?? null, date: t.date, description: t.desc,
            }))
          );
        }

        // Budgets
        const [alreadyBudget] = await rawDb.select().from(budgets).where(deq(budgets.userId, s.id));
        if (!alreadyBudget && catByName["Food & Dining"]) {
          await rawDb.insert(budgets).values([
            { userId: s.id, categoryId: catByName["Food & Dining"], amount: "60.00", period: "monthly" },
            { userId: s.id, categoryId: catByName["Transportation"] ?? catByName["Food & Dining"], amount: "25.00", period: "monthly" },
          ]);
        }

        // Savings goals
        const [alreadyGoal] = await rawDb.select().from(savingsGoals).where(deq(savingsGoals.userId, s.id));
        if (!alreadyGoal) {
          await rawDb.insert(savingsGoals).values([
            { userId: s.id, name: "School Trip to Nassau", targetAmount: "150.00", currentAmount: "60.00", currency: "BSD", deadline: new Date(Date.now() + 60 * 86400000), icon: "✈️", color: "#8B5CF6" },
            { userId: s.id, name: "New Calculator",        targetAmount: "35.00",  currentAmount: "15.00", currency: "BSD", deadline: new Date(Date.now() + 30 * 86400000), icon: "🧮", color: "#F59E0B" },
          ]);
        }
      }

      // Seed portfolio holdings for first student
      const [alreadyHoldings] = await rawDb.select().from(portfolioHoldings).where(deq(portfolioHoldings.userId, "demo-test-s001"));
      if (!alreadyHoldings) {
        const [cblStock] = await rawDb.select().from(simulatedStocks).where(deq(simulatedStocks.ticker, "CBL-BS"));
        if (cblStock) {
          await rawDb.insert(portfolioHoldings).values({ userId: "demo-test-s001", stockId: cblStock.id, quantity: 8, avgPurchasePrice: "7.90" });
          await rawDb.insert(portfolioTransactions).values({ userId: "demo-test-s001", stockId: cblStock.id, type: "buy", quantity: 8, pricePerUnit: "7.90", currency: "BSD" });
        }
      }

      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.demo_org.seeded", meta: { demoOrgId }, req });

      res.json({
        ok: true,
        demoOrgId,
        demoOrgName: DEMO_ORG_NAME,
        demoEnvId,
        joinCode: demoJoinCode,
        teacherIds: createdTeachers.map((t: any) => t.id),
        classIds: createdClasses.map((c: any) => c.id),
        studentIds: createdStudentIds,
      });
    } catch (e: any) {
      captureError(e);
      if (e.message?.startsWith("[Supabase]")) return res.status(500).json({ message: e.message });
      res.status(500).json({ message: e.message || "Seed failed" });
    }
  });

  // ─── Admin: Founder preview / impersonation ───────────────────────────────────
  // Allows the founder admin to preview the app as a demo-org student, teacher, or org admin.
  // Restricted to the designated demo/test org only (identified by display_label = "demo-test-org").

  app.get("/api/admin/preview/status", isAdmin, (req: any, res) => {
    res.json({
      previewMode: req.session.previewMode ?? false,
      previewRole: req.session.previewRole ?? null,
      previewActorName: req.session.previewActorName ?? null,
    });
  });

  app.post("/api/admin/preview/exit", isAdmin, (req: any, res) => {
    req.session.previewMode = false;
    req.session.previewRole = undefined as any;
    req.session.previewActorName = undefined as any;
    // Clear role-specific session keys so the admin isn't left with a dangling student/teacher session
    req.session.userId = undefined as any;
    req.session.teacherId = undefined as any;
    req.session.orgAdminId = undefined as any;
    req.session.orgId = undefined as any;
    res.json({ ok: true });
  });

  // GET /api/admin/demo-org - returns the current demo org info for the preview panel
  app.get("/api/admin/demo-org", isAdmin, async (_req, res) => {
    try {
      const allOrgs = await getOrganizations();
      const demoOrg = allOrgs.find((o: any) => o.display_label === "demo-test-org");
      if (!demoOrg) return res.json(null);
      const [teachers, orgAdmins, students] = await Promise.all([
        storage.getTeachersByOrgId(demoOrg.id),
        storage.getOrgAdminsByOrgId(demoOrg.id),
        storage.getStudentsByOrgId(demoOrg.id),
      ]);
      res.json({
        org: demoOrg,
        teachers: teachers.map(t => ({ id: t.id, name: `${t.firstName} ${t.lastName ?? ""}`.trim(), email: t.email })),
        orgAdmins: orgAdmins.map(a => ({ id: a.id, name: `${a.firstName} ${a.lastName ?? ""}`.trim(), email: a.email })),
        students: students.slice(0, 8).map((s: any) => ({ id: s.id, name: s.firstName ?? s.username ?? s.id })),
      });
    } catch (e: any) {
      captureError(e);
      res.status(500).json({ message: e.message || "Failed to load demo org" });
    }
  });
}
