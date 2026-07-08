import { Express, json as expressJson } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { z } from "zod";
import crypto from "crypto";
import {
  sendEmail,
  getOrCreateContact,
  createVerificationToken,
  consumeVerificationToken,
  escapeHtml,
  appBaseUrl,
} from "../email";
import { db as emailDb } from "../db";
import { emailContacts, emailEvents } from "@shared/schema";
import { eq as eqEmail, and as andEmail, gte as gteEmail, sql as sqlEmail } from "drizzle-orm";
import { enqueueJob } from "../jobs";
import { isOrgAdmin } from "./auth";

function emailIdentity(req: any): { kind: "student" | "teacher" | "org_admin"; userId: string } | null {
  if (req.session?.orgAdminId) return { kind: "org_admin", userId: String(req.session.orgAdminId) };
  if (req.session?.teacherId) return { kind: "teacher", userId: String(req.session.teacherId) };
  if (req.user?.id) return { kind: "student", userId: req.user.id };
  return null;
}

async function resolveOrgIdFor(kind: string, userId: string): Promise<string | null> {
  if (kind === "teacher") {
    const t = await storage.getTeacherById(parseInt(userId, 10));
    return t?.orgId ?? null;
  }
  if (kind === "org_admin") {
    const a = await storage.getOrgAdminById(parseInt(userId, 10));
    return a?.orgId ?? null;
  }
  if (kind === "student" || kind === "guardian") {
    const enrollments = await storage.getStudentClasses(userId).catch(() => []);
    for (const en of enrollments) {
      const teacher = await storage.getTeacherById(en.class.teacherId).catch(() => null);
      if (teacher?.orgId) return teacher.orgId;
    }
    return null;
  }
  return null;
}

async function backfillContactOrgId(contactId: number, kind: string, userId: string): Promise<void> {
  const orgId = await resolveOrgIdFor(kind, userId);
  if (!orgId) return;
  await emailDb.update(emailContacts).set({ orgId, updatedAt: new Date() })
    .where(eqEmail(emailContacts.id, contactId));
}

export async function registerEmailRoutes(app: Express): Promise<void> {

  app.get("/api/email/contact", async (req: any, res) => {
    const ident = emailIdentity(req);
    if (!ident) return res.status(401).json({ message: "Not authenticated" });
    const [contact] = await emailDb.select().from(emailContacts).where(
      andEmail(eqEmail(emailContacts.userKind, ident.kind), eqEmail(emailContacts.userId, ident.userId)),
    );
    if (contact && !contact.orgId) await backfillContactOrgId(contact.id, ident.kind, ident.userId);
    let guardian = null;
    if (ident.kind === "student") {
      const [g] = await emailDb.select().from(emailContacts).where(
        andEmail(eqEmail(emailContacts.userKind, "guardian"), eqEmail(emailContacts.userId, ident.userId)),
      );
      if (g && !g.orgId) await backfillContactOrgId(g.id, "guardian", ident.userId);
      guardian = g ?? null;
    }
    res.json({ contact: contact ?? null, guardian });
  });

  app.patch("/api/email/contact", async (req: any, res) => {
    try {
      const ident = emailIdentity(req);
      if (!ident) return res.status(401).json({ message: "Not authenticated" });
      if (req.session?.demoOrgReadOnly) {
        return res.status(403).json({ message: "This is a read-only demo. Changes are disabled.", code: "DEMO_READ_ONLY" });
      }
      const body = z.object({
        email: z.string().email().optional(),
        weeklyDigest: z.boolean().optional(),
        classNotifications: z.boolean().optional(),
      }).parse(req.body);
      const orgId = await resolveOrgIdFor(ident.kind, ident.userId);
      const existing = await getOrCreateContact({
        userKind: ident.kind,
        userId: ident.userId,
        email: body.email,
        orgId,
      });
      if (!existing) return res.status(400).json({ message: "Email required" });
      const updates: Partial<typeof emailContacts.$inferInsert> = { updatedAt: new Date() };
      if (typeof body.weeklyDigest === "boolean") updates.weeklyDigest = body.weeklyDigest;
      if (typeof body.classNotifications === "boolean") updates.classNotifications = body.classNotifications;
      if (body.email && body.email !== existing.email) {
        updates.email = body.email;
        updates.verified = false;
      }
      const [updated] = await emailDb.update(emailContacts).set(updates).where(eqEmail(emailContacts.id, existing.id)).returning();
      if (!updated.orgId) await backfillContactOrgId(updated.id, ident.kind, ident.userId);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/email/guardian", isAuthenticated, async (req: any, res) => {
    try {
      const body = z.object({
        email: z.string().email(),
        weeklyDigest: z.boolean().optional(),
      }).parse(req.body);
      const studentId = req.user.id;
      const orgId = await resolveOrgIdFor("guardian", studentId);
      const contact = await getOrCreateContact({ userKind: "guardian", userId: studentId, email: body.email, orgId });
      if (!contact) return res.status(400).json({ message: "Could not create guardian contact" });
      if (typeof body.weeklyDigest === "boolean") {
        await emailDb.update(emailContacts).set({ weeklyDigest: body.weeklyDigest, updatedAt: new Date() })
          .where(eqEmail(emailContacts.id, contact.id));
      }
      if (!contact.orgId && orgId) await backfillContactOrgId(contact.id, "guardian", studentId);
      res.json(contact);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/email/send-verification", async (req: any, res) => {
    try {
      const ident = emailIdentity(req);
      const role = req.body?.role as ("self" | "guardian") | undefined;
      if (!ident) return res.status(401).json({ message: "Not authenticated" });
      const userKind = role === "guardian" ? "guardian" : ident.kind;
      const userId = ident.userId;
      const [contact] = await emailDb.select().from(emailContacts).where(
        andEmail(eqEmail(emailContacts.userKind, userKind), eqEmail(emailContacts.userId, userId)),
      );
      if (!contact) return res.status(404).json({ message: "No email on file" });
      const token = await createVerificationToken(contact.id);
      const link = `${appBaseUrl()}/api/email/verify?token=${token}`;
      const html = `<!doctype html><html><body style="font-family:system-ui,Arial;background:#f6f7fb;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
          <h1 style="font-size:20px;margin:0 0 12px">Confirm your email</h1>
          <p>Click the button below to verify this email for FinSight Lite.</p>
          <p><a href="${escapeHtml(link)}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Verify email</a></p>
          <p style="font-size:12px;color:#6b7280">This link expires in 24 hours.</p>
        </div></body></html>`;
      const result = await sendEmail({
        to: contact.email,
        subject: "Verify your email for FinSight Lite",
        html,
        kind: "verification",
        orgId: contact.orgId,
        userKind,
        userId,
      });
      res.json({ ok: result.ok, error: result.error });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/email/webhooks/resend", expressJson({ limit: "1mb" }), async (req: any, res) => {
    try {
      const secret = process.env.RESEND_WEBHOOK_SECRET;
      if (!secret) {
        if (process.env.NODE_ENV === "production") {
          return res.status(503).json({ message: "Webhook secret not configured" });
        }
        console.warn("[email] RESEND_WEBHOOK_SECRET not set; accepting webhook in non-production only");
      } else {
        const svixId = req.headers["svix-id"] as string | undefined;
        const svixTs = req.headers["svix-timestamp"] as string | undefined;
        const svixSig = req.headers["svix-signature"] as string | undefined;
        if (!svixId || !svixTs || !svixSig) {
          return res.status(401).json({ message: "Missing Svix headers" });
        }
        const tsNum = Number(svixTs);
        if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
          return res.status(401).json({ message: "Stale or invalid timestamp" });
        }
        const rawBody = (req.rawBody as Buffer | undefined)?.toString("utf8") ?? JSON.stringify(req.body ?? {});
        const signedPayload = `${svixId}.${svixTs}.${rawBody}`;
        const keyB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
        let key: Buffer;
        try { key = Buffer.from(keyB64, "base64"); }
        catch { return res.status(500).json({ message: "Invalid webhook secret format" }); }
        const expected = crypto.createHmac("sha256", key).update(signedPayload).digest("base64");
        const expectedBuf = Buffer.from(expected);
        const ok = svixSig.split(" ").some((entry) => {
          const [version, sig] = entry.split(",");
          if (version !== "v1" || !sig) return false;
          const sigBuf = Buffer.from(sig);
          return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
        });
        if (!ok) return res.status(401).json({ message: "Invalid signature" });
      }
      const ev = req.body || {};
      const type: string = ev.type || ev.event || "";
      const data = ev.data || ev || {};
      const providerId: string | undefined = data.email_id || data.id || data.message_id;
      if (!providerId) return res.json({ ok: true, ignored: "no provider id" });
      const map: Record<string, "delivered" | "bounced" | "complained" | "opened" | "failed" | "sent"> = {
        "email.delivered": "delivered",
        "email.bounced": "bounced",
        "email.complained": "complained",
        "email.opened": "opened",
        "email.failed": "failed",
        "email.sent": "sent",
      };
      const status = map[type];
      if (!status) return res.json({ ok: true, ignored: type });
      await emailDb.update(emailEvents)
        .set({ status })
        .where(eqEmail(emailEvents.providerId, providerId));
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/email/verify", async (req, res) => {
    const token = String(req.query.token ?? "");
    if (!token) return res.status(400).send("Missing token");
    const updated = await consumeVerificationToken(token);
    if (!updated) return res.status(400).send("Invalid or expired verification link.");
    res.redirect(`${appBaseUrl()}/settings?verified=1`);
  });

  app.post("/api/certificates/email", expressJson({ limit: "10mb" }), isAuthenticated, async (req: any, res) => {
    try {
      const body = z.object({
        pdfBase64: z.string().min(20),
        lessonTitle: z.string().min(1),
        kind: z.enum(["module", "lesson"]).default("lesson"),
        sendToGuardian: z.boolean().optional(),
      }).parse(req.body);
      const studentId = req.user.id;
      const [contact] = await emailDb.select().from(emailContacts).where(
        andEmail(eqEmail(emailContacts.userKind, "student"), eqEmail(emailContacts.userId, studentId)),
      );
      const recipients: { email: string; userKind: string; orgId: string | null }[] = [];
      if (contact?.verified) recipients.push({ email: contact.email, userKind: "student", orgId: contact.orgId });
      if (body.sendToGuardian) {
        const [g] = await emailDb.select().from(emailContacts).where(
          andEmail(eqEmail(emailContacts.userKind, "guardian"), eqEmail(emailContacts.userId, studentId)),
        );
        if (g?.verified) recipients.push({ email: g.email, userKind: "guardian", orgId: g.orgId });
      }
      if (recipients.length === 0) {
        return res.status(400).json({ message: "No verified email available" });
      }
      const filename = `FinSightLite-${body.kind}-${body.lessonTitle.replace(/[^A-Za-z0-9]+/g, "_")}.pdf`;
      const html = `<!doctype html><html><body style="font-family:system-ui,Arial;background:#f6f7fb;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
          <h1 style="font-size:20px;margin:0 0 12px">Certificate of completion</h1>
          <p>Congratulations on completing <b>${escapeHtml(body.lessonTitle)}</b>. Your certificate is attached.</p>
        </div></body></html>`;
      let sent = 0;
      for (const r of recipients) {
        const result = await sendEmail({
          to: r.email,
          subject: `Your FinSight Lite certificate: ${body.lessonTitle}`,
          html,
          kind: "certificate",
          orgId: r.orgId,
          userKind: r.userKind,
          userId: studentId,
          attachments: [{ filename, content: body.pdfBase64 }],
        });
        if (result.ok) sent++;
      }
      res.json({ sent, recipients: recipients.length });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/org/admin/email-stats", isOrgAdmin, async (req: any, res) => {
    if (!req.session?.orgAdminId) return res.status(401).json({ message: "Org admin not authenticated" });
    const orgId = req.session.orgId as string | undefined;
    if (!orgId) return res.status(400).json({ message: "No org" });
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await emailDb
      .select({ status: emailEvents.status, count: sqlEmail<number>`count(*)::int` })
      .from(emailEvents)
      .where(andEmail(eqEmail(emailEvents.orgId, orgId), gteEmail(emailEvents.createdAt, since)))
      .groupBy(emailEvents.status);
    const totals: Record<string, number> = { sent: 0, delivered: 0, bounced: 0, opened: 0, failed: 0, complained: 0, queued: 0 };
    for (const r of rows) totals[r.status] = (totals[r.status] ?? 0) + Number(r.count);
    const recent = await emailDb
      .select()
      .from(emailEvents)
      .where(eqEmail(emailEvents.orgId, orgId))
      .orderBy(sqlEmail`${emailEvents.createdAt} desc`)
      .limit(20);
    res.json({ totals, recent });
  });

  app.post("/api/org/admin/weekly-digest/run-now", isOrgAdmin, async (req: any, res) => {
    if (!req.session?.orgAdminId) return res.status(401).json({ message: "Not authenticated" });
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin?.orgId) return res.status(403).json({ message: "Admin has no org" });
    const audience = (req.body?.audience as "student" | "teacher" | "guardian") || "student";
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const job = await enqueueJob({
      kind: "weekly-digest",
      payload: { weekStart, audience, orgId: admin.orgId },
    });
    res.json({ jobId: job.id });
  });
}
