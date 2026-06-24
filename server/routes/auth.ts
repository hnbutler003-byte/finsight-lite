import { Express } from "express";
import { storage } from "../storage";
import { audit } from "../audit";
import { verifyGoogleToken, googleEnabled } from "../googleAuth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  getOrganization,
  getOrganizations,
  getOrgEnvironments,
  getOrgEnvironmentByJoinCode,
  getOrgEnvironmentById,
  getOrganizationByName,
  createOrganization,
  createOrgEnvironment,
  generateUniqueJoinCode,
  enrollStudentInOrg,
} from "../supabase";
import { captureError } from "../sentry";
import { isAuthenticated } from "../replit_integrations/auth";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@finsightlite.com";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
// SECURITY: warn loudly if admin credentials are using insecure defaults in production
if (process.env.NODE_ENV === "production") {
  if (!process.env.ADMIN_EMAIL) console.warn("[security] ADMIN_EMAIL env var not set, using insecure default");
  if (!process.env.ADMIN_PASSWORD) console.warn("[security] ADMIN_PASSWORD env var not set, using insecure default 'admin123'");
}

export const isTeacher = (req: any, res: any, next: any) => {
  if (!req.session?.teacherId) return res.status(401).json({ message: "Teacher not authenticated" });
  next();
};

// Paths that pending/rejected orgs may still reach (to show the holding page)
const ORG_PENDING_ALLOWED = ["/api/org/auth/me", "/api/org-admin/overview"];

export const isOrgAdmin = async (req: any, res: any, next: any) => {
  if (!req.session?.orgAdminId) return res.status(401).json({ message: "Org admin not authenticated" });

  // Server-side status gate: block pending/rejected orgs from all data endpoints
  const reqPath: string = req.path ?? "";
  if (!ORG_PENDING_ALLOWED.some(p => reqPath === p || reqPath.startsWith(p))) {
    const orgId = req.session.orgId as string | undefined;
    if (orgId) {
      const org = await getOrganization(orgId).catch(() => null);
      if (org && org.status && org.status !== "active") {
        return res.status(403).json({ message: "Your organization is not yet active.", code: "ORG_PENDING" });
      }
    }
  }

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
      const { idToken, classCode } = z.object({
        idToken: z.string().min(1),
        classCode: z.string().optional(),
      }).parse(req.body);
      const profile = await verifyGoogleToken(idToken);

      // Resolve class or org by join code first (before creating user) so we can
      // enforce allowed_email_domains before account creation.
      let resolvedClass: Awaited<ReturnType<typeof storage.getClassByCode>> | null = null;
      let resolvedOrgEnv: Awaited<ReturnType<typeof getOrgEnvironmentByJoinCode>> | null = null;
      if (classCode) {
        const code = classCode.toUpperCase().trim();
        // Try class code first
        resolvedClass = (await storage.getClassByCode(code)) ?? null;
        if (resolvedClass) {
          // If this class belongs to an org environment, enforce domain allowlist
          if (resolvedClass.envId) {
            const classEnv = await getOrgEnvironmentById(resolvedClass.envId);
            if (classEnv) {
              const classOrg = await getOrganization(classEnv.org_id);
              if (classOrg?.allowed_email_domains && classOrg.allowed_email_domains.length > 0) {
                const emailDomain = profile.email.split("@")[1]?.toLowerCase() ?? "";
                const allowed = classOrg.allowed_email_domains.map((d: string) => d.toLowerCase());
                if (!allowed.includes(emailDomain)) {
                  return res.status(403).json({
                    message: `Your email domain (@${emailDomain}) is not permitted for this school. Allowed: ${classOrg.allowed_email_domains.join(", ")}`,
                  });
                }
              }
            }
          }
        } else {
          // Try org environment join code
          resolvedOrgEnv = (await getOrgEnvironmentByJoinCode(code)) ?? null;
          if (!resolvedOrgEnv) {
            return res.status(400).json({ message: "Invalid class or organization code." });
          }
          // Enforce allowed_email_domains for org joins
          const org = await getOrganization(resolvedOrgEnv.org_id);
          if (org?.allowed_email_domains && org.allowed_email_domains.length > 0) {
            const emailDomain = profile.email.split("@")[1]?.toLowerCase() ?? "";
            const allowed = org.allowed_email_domains.map((d: string) => d.toLowerCase());
            if (!allowed.includes(emailDomain)) {
              return res.status(403).json({
                message: `Your email domain (@${emailDomain}) is not permitted for this organization. Allowed: ${org.allowed_email_domains.join(", ")}`,
              });
            }
          }
        }
      }

      const { authStorage } = await import("../replit_integrations/auth/storage");
      let user = await authStorage.getUserByEmail(profile.email);
      if (!user) {
        const base = (profile.givenName || "Student").replace(/[^a-zA-Z0-9]/g, "");
        const baseFormatted = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase() || "Student";
        let username = "";
        for (let i = 0; i < 10; i++) {
          const digits = Math.floor(1000 + Math.random() * 9000);
          username = `${baseFormatted}_${digits}`;
          if (!(await authStorage.getUserByUsername(username))) break;
        }
        user = await authStorage.upsertUser({
          username,
          avatar: "star",
          firstName: profile.givenName || profile.name.split(" ")[0] || "Student",
          lastName: profile.familyName || null,
          email: profile.email,
          profileImageUrl: profile.picture || null,
        });
      }

      // Enroll in class / org atomically
      if (resolvedClass) {
        await storage.enrollStudent(resolvedClass.id, user.id).catch((err) => {
          if (!/already|duplicate|unique/i.test(String(err))) console.warn("[Google Auth] enrollStudent:", err);
        });
        if (resolvedClass.envId) {
          const env = await getOrgEnvironmentById(resolvedClass.envId);
          if (env) {
            await enrollStudentInOrg(env.org_id, env.id, user.id).catch((err) => {
              console.warn("[Google Auth] enrollStudentInOrg (class):", err);
            });
          }
        }
      } else if (resolvedOrgEnv) {
        await enrollStudentInOrg(resolvedOrgEnv.org_id, resolvedOrgEnv.id, user.id).catch((err) => {
          console.warn("[Google Auth] enrollStudentInOrg (org):", err);
        });
      }

      await new Promise<void>((resolve, reject) => {
        req.session.userId = user!.id;
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
      return res.json(user);
    } catch (e: any) {
      console.error("[Google Auth] Student:", e.message);
      return res.status(400).json({ message: e.message || "Google sign-in failed." });
    }
  });

  // Link Google email to existing student account
  app.post("/api/auth/google-link", isAuthenticated, async (req: any, res) => {
    try {
      if (!googleEnabled()) return res.status(503).json({ message: "Google sign-in is not configured." });
      const { idToken } = z.object({ idToken: z.string().min(1) }).parse(req.body);
      const profile = await verifyGoogleToken(idToken);

      const { authStorage } = await import("../replit_integrations/auth/storage");
      const existing = await authStorage.getUserByEmail(profile.email);
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ message: "This Google account is already linked to another FinSight account." });
      }
      const updated = await authStorage.linkEmail(req.user.id, profile.email, profile.picture);
      return res.json(updated);
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
      const { email, password, orgId: selectedOrgId } = z.object({
        email: z.string().email(),
        password: z.string(),
        orgId: z.string().optional(),
      }).parse(req.body);

      const isFounderAdmin =
        email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
        password === ADMIN_PASSWORD;

      if (isFounderAdmin) {
        // Find or create a real org_admins record for the founder
        let admin = await storage.getOrgAdminByEmail(email.trim().toLowerCase());

        if (!admin) {
          const orgs = await getOrganizations();
          if (orgs.length === 0) {
            return res.status(400).json({
              message: "No organizations found. Create one first from the Admin Dashboard.",
            });
          }
          if (orgs.length > 1 && !selectedOrgId) {
            return res.status(200).json({
              needsOrgSelection: true,
              orgs: orgs.map((o: any) => ({ id: o.id, name: o.name })),
            });
          }
          const targetOrgId = selectedOrgId ?? orgs[0].id;
          const envs = await getOrgEnvironments(targetOrgId);
          if (envs.length === 0) {
            return res.status(400).json({ message: "Selected organization has no environments configured." });
          }
          admin = await storage.createOrgAdmin({
            firstName: "Founder",
            lastName: "Admin",
            email: email.trim().toLowerCase(),
            passwordHash: null,
            orgId: targetOrgId,
            envId: envs[0].id,
            role: "founder",
          });
        }

        (req as any).session.orgAdminId = admin.id;
        (req as any).session.orgId = admin.orgId;
        const { passwordHash: _p, ...safe } = admin;
        const org = await getOrganization(admin.orgId);
        const envs = await getOrgEnvironments(admin.orgId);
        const env = envs.find((e: any) => e.id === admin!.envId);
        return res.json({ ...safe, orgName: org?.name ?? "", envName: env?.display_name ?? "" });
      }

      // Normal org admin login
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

  // === SELF-SERVICE ORG APPLICATION ===
  // Creates a brand-new org in 'pending' state. Founder admin must approve
  // before the org admin gains access to the real dashboard.
  app.post("/api/org/apply", async (req, res) => {
    try {
      const body = z.object({
        orgName:      z.string().min(2).max(120),
        orgType:      z.enum(["school", "credit_union", "government", "ngo", "other"]).default("school"),
        country:      z.string().min(1),
        city:         z.string().optional(),
        contactName:  z.string().min(1),
        contactEmail: z.string().email(),
        firstName:    z.string().min(1),
        lastName:     z.string().min(1),
        email:        z.string().email(),
        password:     z.string().min(6),
      }).parse(req.body);

      const existingOrg = await getOrganizationByName(body.orgName);
      if (existingOrg) return res.status(409).json({ message: "An organization with this name already exists." });

      const existingAdmin = await storage.getOrgAdminByEmail(body.email.toLowerCase());
      if (existingAdmin) return res.status(409).json({ message: "Email already in use." });

      const org = await createOrganization({
        name:              body.orgName,
        type:              body.orgType,
        country:           body.country,
        city:              body.city,
        contact_name:      body.contactName,
        contact_email:     body.contactEmail,
        is_active:         false,
        status:            "pending",
        subscription_tier: "starter",
        max_students:      50,
        logo_url:          null,
      });
      if (!org) return res.status(500).json({ message: "Failed to create organization." });

      const slug = body.orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "default";
      const join_code = await generateUniqueJoinCode();
      const env = await createOrgEnvironment({
        org_id:           org.id,
        slug,
        display_name:     body.orgName,
        theme_color:      "#7c3aed",
        join_code,
        features_enabled: ["money_games", "investment_sim", "money_guide", "moneylab"],
      });
      if (!env) return res.status(500).json({ message: "Failed to create organization environment." });

      const passwordHash = await bcrypt.hash(body.password, 12);
      const admin = await storage.createOrgAdmin({
        firstName:    body.firstName,
        lastName:     body.lastName,
        email:        body.email.toLowerCase(),
        passwordHash,
        orgId:        org.id,
        envId:        env.id,
        role:         "admin",
      });

      (req as any).session.orgAdminId = admin.id;
      (req as any).session.orgId      = admin.orgId;

      await audit({
        actorType: "org_admin", actorId: String(admin.id), actorEmail: admin.email,
        action: "org.applied",
        targetType: "organization", targetId: org.id,
        orgId: org.id,
        meta: { orgName: org.name, via: "self-service-apply" },
        req,
      });

      const { passwordHash: _, ...safe } = admin;
      return res.json({ ...safe, orgName: org.name, orgStatus: org.status });
    } catch (e: any) {
      const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
      if (status >= 500) captureError(e, { route: req.path });
      return res.status(status).json({ message: e.message });
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

  // === STUDENT SELF-DELETE ===
  app.delete("/api/auth/account", isAuthenticated, async (req: any, res) => {
    try {
      const userId: string = req.user?.claims?.sub ?? req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const orgId: string | null = req.session?.orgId ?? null;
      await storage.deleteUserAllData(userId);
      await storage.logDeletion({ userId, orgId, deletedBy: "student_self" });
      req.session.destroy(() => {});
      res.json({ ok: true });
    } catch (e: any) {
      console.error("[delete-account]", e);
      res.status(500).json({ message: "Could not delete account. Please contact support." });
    }
  });

  // SECURITY: only allows login as a student whose ID is listed in the stored demo credentials,
  // preventing this endpoint from being used to impersonate arbitrary students.
  app.post("/api/demo/login/student/:studentId", async (req: any, res) => {
    try {
      const creds = await storage.getDemoCredentials();
      const demoStudentIds: string[] = (creds?.students ?? []).map((s: any) => String(s.id ?? s.userId ?? ""));
      const requestedId = String(req.params.studentId);
      if (!demoStudentIds.includes(requestedId)) {
        return res.status(403).json({ message: "Not a demo student" });
      }
      const student = await storage.getUser(requestedId);
      if (!student) return res.status(404).json({ message: "Demo student not found" });
      req.session.userId = student.id;
      res.json({ ok: true, redirect: "/" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Admin: Preview/impersonation start ──────────────────────────────────────
  // Allows the founder admin to preview the experience as a demo-org actor.
  // Only works for the designated test organisation (display_label = "demo-test-org").
  // The isAdmin check is enforced before any state change.
  app.post("/api/admin/preview/start", isAdmin, async (req: any, res) => {
    try {
      const { role, actorId, demoOrgId } = z.object({
        role: z.enum(["student", "teacher", "org-admin"]),
        actorId: z.union([z.string(), z.number()]),
        demoOrgId: z.string(),
      }).parse(req.body);

      // Hard guard: target org must be the designated demo org
      const { getOrganization: getOrg } = await import("../supabase");
      const org = await getOrg(demoOrgId);
      if (!org || org.display_label !== "demo-test-org") {
        return res.status(403).json({
          message: "Preview is only available for the designated demo/test organisation",
        });
      }

      let actorName = "";
      const FORBIDDEN = { message: "Actor does not belong to the demo organisation" };

      if (role === "student") {
        const student = await storage.getUser(String(actorId));
        if (!student) return res.status(404).json({ message: "Student not found" });
        // Verify the student is enrolled in a class belonging to the demo org
        const demoStudents = await storage.getStudentsByOrgId(demoOrgId);
        if (!demoStudents.some((s: any) => s.id === student.id)) {
          return res.status(403).json(FORBIDDEN);
        }
        actorName = `${student.firstName ?? ""} ${(student as any).lastName ?? ""}`.trim()
          || (student as any).username
          || "Demo Student";
        req.session.userId = student.id;
      } else if (role === "teacher") {
        const teacher = await storage.getTeacherById(Number(actorId));
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });
        // Verify teacher is assigned to the demo org
        if (teacher.orgId !== demoOrgId) return res.status(403).json(FORBIDDEN);
        actorName = `${teacher.firstName} ${teacher.lastName ?? ""}`.trim();
        req.session.teacherId = String(teacher.id);
      } else {
        // org-admin
        const admin = await storage.getOrgAdminById(Number(actorId));
        if (!admin) return res.status(404).json({ message: "Org admin not found" });
        // Verify org admin belongs to the demo org
        if (admin.orgId !== demoOrgId) return res.status(403).json(FORBIDDEN);
        actorName = `${admin.firstName} ${admin.lastName ?? ""}`.trim();
        req.session.orgAdminId = String(admin.id);
        req.session.orgId = admin.orgId;
      }

      req.session.previewMode = true;
      req.session.previewRole = role;
      req.session.previewActorName = actorName;
      req.session.isAdmin = true; // keep admin session active so the exit route is reachable

      await audit({
        actorType: "admin",
        actorEmail: ADMIN_EMAIL,
        action: "admin.preview.start",
        orgId: demoOrgId,
        meta: { role, actorId: String(actorId), actorName },
        req,
      });

      res.json({ ok: true, role, actorName });
    } catch (e: any) {
      captureError(e);
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid request" });
      res.status(500).json({ message: e.message || "Failed to start preview" });
    }
  });
}
