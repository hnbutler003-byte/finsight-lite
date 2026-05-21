import { Express } from "express";
import { storage } from "../storage";
import { audit } from "../audit";
import { verifyGoogleToken, googleEnabled } from "../googleAuth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  getOrganization,
  getOrgEnvironments,
  getOrgEnvironmentByJoinCode,
} from "../supabase";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@finsightlite.com";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export const isTeacher = (req: any, res: any, next: any) => {
  if (!req.session?.teacherId) return res.status(401).json({ message: "Teacher not authenticated" });
  next();
};

export const isOrgAdmin = (req: any, res: any, next: any) => {
  if (!req.session?.orgAdminId) return res.status(401).json({ message: "Org admin not authenticated" });
  next();
};

export const isAdmin = (req: any, res: any, next: any) => {
  if (req.session?.isAdmin) return next();
  return res.status(401).json({ message: "Admin access required" });
};

export async function registerAuthDomainRoutes(app: Express): Promise<void> {

  // ── Student Google sign-in ──────────────────────────────────────────────────
  app.post("/api/auth/google", async (req, res) => {
    try {
      if (!googleEnabled()) return res.status(503).json({ message: "Google sign-in is not configured." });
      const { idToken } = z.object({ idToken: z.string().min(1) }).parse(req.body);
      const profile = await verifyGoogleToken(idToken);

      const { authStorage } = await import("../replit_integrations/auth/storage");
      let user = await authStorage.getUserByUsername(profile.email);
      if (!user) {
        user = await authStorage.upsertUser({
          username: profile.email,
          firstName: profile.givenName || profile.name.split(" ")[0] || "Student",
          lastName: profile.familyName || profile.name.split(" ").slice(1).join(" ") || "",
          email: profile.email,
          avatar: "star",
        });
      }
      (req as any).session.userId = user.id;
      return res.json({ ok: true, user });
    } catch (e: any) {
      console.error("[Google Auth] Student:", e.message);
      return res.status(400).json({ message: e.message || "Google sign-in failed." });
    }
  });

  app.post("/api/auth/google-link", async (req, res) => {
    try {
      if (!googleEnabled()) return res.status(503).json({ message: "Google sign-in is not configured." });
      const { idToken, userId } = z.object({ idToken: z.string().min(1), userId: z.string().min(1) }).parse(req.body);
      const profile = await verifyGoogleToken(idToken);

      const { authStorage } = await import("../replit_integrations/auth/storage");
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const updated = await authStorage.upsertUser({
        ...user,
        email: profile.email,
      });
      return res.json({ ok: true, user: updated });
    } catch (e: any) {
      console.error("[Google Auth] Link:", e.message);
      return res.status(400).json({ message: e.message || "Google link failed." });
    }
  });

  // === TEACHER AUTH ROUTES ===
  app.post("/api/teacher/auth/register", async (req, res) => {
    try {
      const { firstName, lastName, email, password, schoolName } = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        schoolName: z.string().min(1),
      }).parse(req.body);

      const existing = await storage.getTeacherByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already in use" });

      const passwordHash = await bcrypt.hash(password, 12);
      const teacher = await storage.createTeacher({ firstName, lastName, email: email.toLowerCase(), passwordHash, schoolName });
      (req as any).session.teacherId = String(teacher.id);
      const { passwordHash: _, ...safe } = teacher;
      return res.json(safe);
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/teacher/auth/login", async (req, res) => {
    try {
      const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
      const teacher = await storage.getTeacherByEmail(email);
      if (!teacher) return res.status(401).json({ message: "Invalid email or password" });
      if (!teacher.passwordHash) return res.status(401).json({ message: "This account uses Google sign-in. Please use the 'Sign in with Google' button." });
      const valid = await bcrypt.compare(password, teacher.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });
      (req as any).session.teacherId = String(teacher.id);
      const { passwordHash: _, ...safe } = teacher;
      return res.json(safe);
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/teacher/auth/logout", (req, res) => {
    delete (req as any).session.teacherId;
    res.json({ ok: true });
  });

  app.post("/api/teacher/auth/google", async (req, res) => {
    try {
      if (!googleEnabled()) return res.status(503).json({ message: "Google sign-in is not configured." });
      const { idToken } = z.object({ idToken: z.string().min(1) }).parse(req.body);
      const profile = await verifyGoogleToken(idToken);

      let teacher = await storage.getTeacherByEmail(profile.email);
      if (!teacher) {
        const schoolName = profile.email.split("@")[1] ?? "Unknown School";
        teacher = await storage.createTeacher({
          firstName: profile.givenName || profile.name.split(" ")[0] || "Teacher",
          lastName: profile.familyName || profile.name.split(" ").slice(1).join(" ") || "",
          email: profile.email,
          schoolName,
          passwordHash: null,
        });
      }
      (req as any).session.teacherId = String(teacher.id);
      const { passwordHash: _, ...safe } = teacher;
      return res.json(safe);
    } catch (e: any) {
      console.error("[Google Auth] Teacher:", e.message);
      return res.status(400).json({ message: e.message || "Google sign-in failed." });
    }
  });

  app.get("/api/teacher/auth/me", isTeacher, async (req: any, res) => {
    const teacher = await storage.getTeacherById(req.session.teacherId);
    if (!teacher) return res.status(401).json({ message: "Not found" });
    const { passwordHash: _, ...safe } = teacher;
    res.json(safe);
  });

  // === ADMIN AUTH ROUTES ===
  app.post("/api/admin/auth/login", async (req: any, res) => {
    try {
      const { email, password } = z.object({ email: z.string(), password: z.string() }).parse(req.body);
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        await audit({ actorType: "admin", actorEmail: email, action: "admin.login.failure", req });
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.isAdmin = true;
      await audit({ actorType: "admin", actorEmail: ADMIN_EMAIL, action: "admin.login.success", req });
      res.json({ ok: true, email: ADMIN_EMAIL });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/admin/auth/logout", (req: any, res) => {
    req.session.isAdmin = false;
    res.json({ ok: true });
  });

  app.get("/api/admin/auth/me", (req: any, res) => {
    if (req.session?.isAdmin) return res.json({ email: ADMIN_EMAIL, isAdmin: true });
    res.status(401).json({ message: "Not authenticated" });
  });

  // === ORG ADMIN AUTH ROUTES ===
  app.post("/api/org/auth/register", async (req, res) => {
    try {
      const { firstName, lastName, email, password, joinCode } = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        joinCode: z.string().min(1),
      }).parse(req.body);

      const env = await getOrgEnvironmentByJoinCode(joinCode);
      if (!env) return res.status(400).json({ message: "Invalid organization join code" });

      const org = await getOrganization(env.org_id);
      if (!org) return res.status(400).json({ message: "Organization not found" });

      const existing = await storage.getOrgAdminByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already in use" });

      const passwordHash = await bcrypt.hash(password, 12);
      const admin = await storage.createOrgAdmin({
        firstName, lastName, email: email.toLowerCase(), passwordHash,
        orgId: env.org_id, envId: env.id, role: "admin",
      });
      (req as any).session.orgAdminId = admin.id; (req as any).session.orgId = admin.orgId;
      await audit({
        actorType: "org_admin", actorId: String(admin.id), actorEmail: admin.email,
        action: "org_admin.account.created",
        targetType: "org_admin", targetId: String(admin.id),
        orgId: env.org_id,
        meta: { via: "password+joinCode", role: "admin" },
        req,
      });
      const { passwordHash: _, ...safe } = admin;
      return res.json({ ...safe, orgName: org.name, envName: env.display_name });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/org/auth/login", async (req, res) => {
    try {
      const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
      const admin = await storage.getOrgAdminByEmail(email);
      if (!admin) return res.status(401).json({ message: "Invalid email or password" });
      if (!admin.passwordHash) return res.status(401).json({ message: "This account uses Google sign-in. Please use the 'Sign in with Google' button." });
      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });
      (req as any).session.orgAdminId = admin.id; (req as any).session.orgId = admin.orgId;
      const { passwordHash: _, ...safe } = admin;
      const org = await getOrganization(admin.orgId);
      const envs = await getOrgEnvironments(admin.orgId);
      const env = envs.find(e => e.id === admin.envId);
      return res.json({ ...safe, orgName: org?.name ?? "", envName: env?.display_name ?? "" });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/org/auth/logout", (req, res) => {
    delete (req as any).session.orgAdminId;
    res.json({ ok: true });
  });

  app.get("/api/org/auth/me", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    const { passwordHash: _, ...safe } = admin;
    const org = await getOrganization(admin.orgId);
    const envs = await getOrgEnvironments(admin.orgId);
    const env = envs.find(e => e.id === admin.envId);
    res.json({ ...safe, orgName: org?.name ?? "", envName: env?.display_name ?? "" });
  });

  app.post("/api/org/auth/google", async (req, res) => {
    try {
      if (!googleEnabled()) return res.status(503).json({ message: "Google sign-in is not configured." });
      const { idToken } = z.object({ idToken: z.string().min(1) }).parse(req.body);
      const profile = await verifyGoogleToken(idToken);

      const admin = await storage.getOrgAdminByEmail(profile.email);
      if (!admin) {
        return res.status(401).json({
          message: "No org admin account found for this Google account. Please register with your organization join code.",
          needsRegistration: true,
        });
      }

      const org = await getOrganization(admin.orgId);
      if (org?.allowed_email_domains && org.allowed_email_domains.length > 0) {
        const emailDomain = profile.email.split("@")[1]?.toLowerCase() ?? "";
        const allowed = org.allowed_email_domains.map((d: string) => d.toLowerCase());
        if (!allowed.includes(emailDomain)) {
          return res.status(403).json({
            message: `Your email domain (@${emailDomain}) is not permitted for this organization. Contact your administrator.`,
          });
        }
      }

      (req as any).session.orgAdminId = admin.id; (req as any).session.orgId = admin.orgId;
      const { passwordHash: _, ...safe } = admin;
      const envs = await getOrgEnvironments(admin.orgId);
      const env = envs.find(e => e.id === admin.envId);
      return res.json({ ...safe, orgName: org?.name ?? "", envName: env?.display_name ?? "" });
    } catch (e: any) {
      console.error("[Google Auth] OrgAdmin login:", e.message);
      return res.status(400).json({ message: e.message || "Google sign-in failed." });
    }
  });

  app.post("/api/org/auth/google-register", async (req, res) => {
    try {
      if (!googleEnabled()) return res.status(503).json({ message: "Google sign-in is not configured." });
      const { idToken, joinCode } = z.object({
        idToken: z.string().min(1),
        joinCode: z.string().min(1),
      }).parse(req.body);
      const profile = await verifyGoogleToken(idToken);

      const env = await getOrgEnvironmentByJoinCode(joinCode);
      if (!env) return res.status(400).json({ message: "Invalid organization join code." });

      const org = await getOrganization(env.org_id);
      if (!org) return res.status(400).json({ message: "Organization not found." });

      if (org.allowed_email_domains && org.allowed_email_domains.length > 0) {
        const emailDomain = profile.email.split("@")[1]?.toLowerCase() ?? "";
        const allowed = org.allowed_email_domains.map((d: string) => d.toLowerCase());
        if (!allowed.includes(emailDomain)) {
          return res.status(403).json({
            message: `Your email domain (@${emailDomain}) is not allowed for this organization. Permitted domains: ${org.allowed_email_domains.join(", ")}`,
          });
        }
      }

      const existing = await storage.getOrgAdminByEmail(profile.email);
      if (existing) {
        if (existing.orgId !== env.org_id) {
          return res.status(409).json({
            message: "This Google account is already registered with a different organization. Please sign in from that organization's portal instead.",
          });
        }
        (req as any).session.orgAdminId = existing.id; (req as any).session.orgId = existing.orgId;
        const { passwordHash: _, ...safe } = existing;
        return res.json({ ...safe, orgName: org.name, envName: env.display_name });
      }

      const admin = await storage.createOrgAdmin({
        firstName: profile.givenName || profile.name.split(" ")[0] || "",
        lastName: profile.familyName || profile.name.split(" ").slice(1).join(" ") || "",
        email: profile.email,
        passwordHash: null,
        orgId: env.org_id,
        envId: env.id,
        role: "admin",
      });
      (req as any).session.orgAdminId = admin.id; (req as any).session.orgId = admin.orgId;
      await audit({
        actorType: "org_admin", actorId: String(admin.id), actorEmail: admin.email,
        action: "org_admin.account.created",
        targetType: "org_admin", targetId: String(admin.id),
        orgId: env.org_id,
        meta: { via: "google+joinCode", role: "admin" },
        req,
      });
      const { passwordHash: _, ...safe } = admin;
      return res.json({ ...safe, orgName: org.name, envName: env.display_name });
    } catch (e: any) {
      console.error("[Google Auth] OrgAdmin register:", e.message);
      return res.status(400).json({ message: e.message || "Google registration failed." });
    }
  });

  // === DEMO LOGIN SHORTCUTS ===
  app.post("/api/demo/login/teacher", async (req: any, res) => {
    try {
      const creds = await storage.getDemoCredentials();
      if (!creds?.teacher) return res.status(404).json({ message: "Demo data not set up yet" });
      const teacher = await storage.getTeacherByEmail("demo@finsightlite.com");
      if (!teacher) return res.status(404).json({ message: "Demo teacher not found" });
      req.session.teacherId = String(teacher.id);
      res.json({ ok: true, redirect: "/teacher/dashboard" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/demo/login/student/:studentId", async (req: any, res) => {
    try {
      const student = await storage.getUser(req.params.studentId);
      if (!student) return res.status(404).json({ message: "Demo student not found" });
      req.session.userId = student.id;
      res.json({ ok: true, redirect: "/" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
}
