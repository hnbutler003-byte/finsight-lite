// Resend integration: see blueprint:javascript_resend
import { Resend } from "resend";
import { db } from "./db";
import {
  emailContacts,
  emailEvents,
  emailVerificationTokens,
  type EmailContact,
} from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { log } from "./index";

const FROM_EMAIL_SANDBOX = "FinSight Lite <onboarding@resend.dev>";

// Startup warning: RESEND_FROM_EMAIL should be set to a verified custom domain address
// (e.g. "FinSight Lite <noreply@finsight-ltd.com>") so emails aren't blocked by school
// spam filters. In production this is a loud error; in development it's just a notice.
if (!process.env.RESEND_FROM_EMAIL) {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[email] RESEND_FROM_EMAIL is not set. Emails will send from the shared Resend " +
      "sandbox address (onboarding@resend.dev), which school and institutional spam " +
      "filters may block. Set RESEND_FROM_EMAIL in Replit Secrets to a verified custom " +
      "domain address (e.g. 'FinSight Lite <noreply@finsight-ltd.com>')."
    );
  } else {
    console.warn("[email] RESEND_FROM_EMAIL not set, using Resend sandbox address (fine for development).");
  }
}

// Priority: (1) RESEND_FROM_EMAIL env var [authoritative], (2) connector's own
// from_email setting, (3) sandbox fallback (development only).
// Returns null in production when no verified address is configured, which
// causes getResendCredentials to return null and email sending to be skipped
// gracefully (logged as resend_not_configured in email_events).
function resolveFromEmail(connectorFromEmail?: string): string | null {
  if (process.env.RESEND_FROM_EMAIL) return process.env.RESEND_FROM_EMAIL;
  if (connectorFromEmail) return connectorFromEmail;
  if (process.env.NODE_ENV !== "production") return FROM_EMAIL_SANDBOX;
  return null;
}

let cachedSettings: { apiKey: string; fromEmail: string } | null = null;
let cachedAt = 0;
const SETTINGS_TTL_MS = 5 * 60 * 1000;

async function getResendCredentials(): Promise<{ apiKey: string; fromEmail: string } | null> {
  if (cachedSettings && Date.now() - cachedAt < SETTINGS_TTL_MS) return cachedSettings;
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;
  if (!hostname || !xReplitToken) return null;
  try {
    const data = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`,
      { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } },
    ).then((r) => r.json());
    const conn = data?.items?.[0];
    if (!conn?.settings?.api_key) return null;
    const fromEmail = resolveFromEmail(conn.settings.from_email as string);
    if (!fromEmail) return null; // production with no verified FROM address; skip sending
    cachedSettings = {
      apiKey: conn.settings.api_key as string,
      fromEmail,
    };
    cachedAt = Date.now();
    return cachedSettings;
  } catch (e) {
    log(`resend credentials error: ${(e as Error).message}`, "email");
    return null;
  }
}

export async function getResendClient() {
  const creds = await getResendCredentials();
  if (!creds) return null;
  return { client: new Resend(creds.apiKey), fromEmail: creds.fromEmail };
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  kind: string;
  orgId?: string | null;
  userKind?: string | null;
  userId?: string | null;
  attachments?: { filename: string; content: string }[];
};

export type SendEmailResult = { ok: boolean; providerId?: string; error?: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const conn = await getResendClient();
  if (!conn) {
    await db.insert(emailEvents).values({
      orgId: input.orgId ?? null,
      userKind: input.userKind ?? null,
      userId: input.userId ?? null,
      kind: input.kind,
      recipient: input.to,
      subject: input.subject,
      status: "failed",
      error: "resend_not_configured",
    });
    return { ok: false, error: "resend_not_configured" };
  }
  try {
    const result = await conn.client.emails.send({
      from: conn.fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    });
    if (result.error) {
      await db.insert(emailEvents).values({
        orgId: input.orgId ?? null,
        userKind: input.userKind ?? null,
        userId: input.userId ?? null,
        kind: input.kind,
        recipient: input.to,
        subject: input.subject,
        status: "failed",
        error: result.error.message ?? "send_error",
      });
      return { ok: false, error: result.error.message ?? "send_error" };
    }
    const providerId = result.data?.id;
    await db.insert(emailEvents).values({
      orgId: input.orgId ?? null,
      userKind: input.userKind ?? null,
      userId: input.userId ?? null,
      kind: input.kind,
      recipient: input.to,
      subject: input.subject,
      status: "sent",
      providerId,
    });
    return { ok: true, providerId };
  } catch (e) {
    const msg = (e as Error).message;
    await db.insert(emailEvents).values({
      orgId: input.orgId ?? null,
      userKind: input.userKind ?? null,
      userId: input.userId ?? null,
      kind: input.kind,
      recipient: input.to,
      subject: input.subject,
      status: "failed",
      error: msg,
    });
    return { ok: false, error: msg };
  }
}

export async function getOrCreateContact(opts: {
  userKind: "student" | "teacher" | "org_admin" | "guardian";
  userId: string;
  email?: string | null;
  orgId?: string | null;
  verified?: boolean;
}): Promise<EmailContact | null> {
  const [existing] = await db.select().from(emailContacts).where(
    and(eq(emailContacts.userKind, opts.userKind), eq(emailContacts.userId, opts.userId)),
  );
  if (existing) {
    if (opts.email && existing.email !== opts.email) {
      const [updated] = await db.update(emailContacts).set({
        email: opts.email,
        verified: opts.verified ?? false,
        orgId: opts.orgId ?? existing.orgId,
        updatedAt: new Date(),
      }).where(eq(emailContacts.id, existing.id)).returning();
      return updated;
    }
    return existing;
  }
  if (!opts.email) return null;
  const [created] = await db.insert(emailContacts).values({
    userKind: opts.userKind,
    userId: opts.userId,
    email: opts.email,
    orgId: opts.orgId ?? null,
    verified: opts.verified ?? false,
  }).returning();
  return created;
}

export async function createVerificationToken(contactId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(emailVerificationTokens).values({ contactId, token, expiresAt });
  return token;
}

export async function consumeVerificationToken(token: string): Promise<EmailContact | null> {
  const [row] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
  if (!row) return null;
  if (row.usedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  await db.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, row.id));
  const [updated] = await db.update(emailContacts).set({ verified: true, updatedAt: new Date() })
    .where(eq(emailContacts.id, row.contactId)).returning();
  return updated ?? null;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function appBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const dev = process.env.REPLIT_DEV_DOMAIN;
  if (dev) return `https://${dev}`;
  return "http://localhost:5000";
}
