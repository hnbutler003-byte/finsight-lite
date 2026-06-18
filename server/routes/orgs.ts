import { Express } from "express";
import { storage } from "../storage";
import { audit, listAuditLog } from "../audit";
import { z } from "zod";
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

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^video\/(mp4|webm|ogg|quicktime|x-msvideo|x-matroska)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Video must be MP4, WebM, OGG, MOV, AVI, or MKV"));
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
        subscription_tier: z.enum(["free", "standard", "premium"]).default("free"),
        max_students: z.number().default(100),
      }).parse(req.body);
      const org = await createOrganization({ ...body, is_active: true, logo_url: undefined });
      if (!org) return res.status(500).json({ message: "Failed to create organization" });
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.organization.create", targetType: "organization", targetId: org.id, orgId: org.id, meta: { name: body.name }, req });
      res.json(org);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/organizations/:id", isAdmin, async (req, res) => {
    const org = await updateOrganization(req.params.id, req.body);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    const { invalidateOrganizationCache } = await import("../supabase");
    await invalidateOrganizationCache(req.params.id);
    await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.organization.update", targetType: "organization", targetId: req.params.id, orgId: req.params.id, meta: req.body, req });
    res.json(org);
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
      res.status(400).json({ message: e.message });
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
      org: { id: org?.id, name: org?.name, type: org?.type, country: org?.country },
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
        res.json(result);
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

        const created: { rowNum: number; userId: string; username: string; firstName: string; emailSent: boolean; enrolled: boolean }[] = [];
        const skipped: { rowNum: number; reason: string }[] = [];

        for (const row of rows) {
          if (row.status !== "ok") {
            skipped.push({ rowNum: row.rowNum, reason: row.issues.join("; ") });
            continue;
          }

          const taken = await authStorage.getUserByUsername(row.username);
          if (taken) {
            skipped.push({ rowNum: row.rowNum, reason: `Username "${row.username}" was just taken — please re-import this row` });
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
                <p>Tap the button below to open FinSight Lite. Type your sign-in code if asked — that's all you need.</p>
                <p><a href="${escapeHtml(loginUrl)}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Sign in to FinSight Lite</a></p>
                <p style="font-size:12px;color:#6b7280">Keep this code private — it's how the app knows it's really you. If this wasn't expected, you can safely ignore this email.</p>
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

    res.json({ avgXp, lessonCompletionRate, totalStudents });
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

    // TODO: wire to real game_sessions query once game_name column is available on game_sessions table
    // For now return dummy data representative of Caribbean teen game preferences
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
      res.status(400).json({ message: e.message });
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

        const mimeToExt: Record<string, string> = {
          "video/mp4": "mp4",
          "video/webm": "webm",
          "video/ogg": "ogv",
          "video/quicktime": "mov",
          "video/x-msvideo": "avi",
          "video/x-matroska": "mkv",
        };
        const ext = mimeToExt[req.file.mimetype.toLowerCase()] || "mp4";
        const safeName = (req.file.originalname || "video")
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .replace(/\.[^.]+$/, "");
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
}
