import crypto from "crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { aiUsageEvents, tutorExplanations } from "@shared/schema";

export type AiKind = "guide_chat" | "tutor_explain" | "ai_insights";

export const PER_USER_MONTHLY_QUOTA: Record<AiKind, number> = {
  guide_chat: 100,
  tutor_explain: 200,
  ai_insights: 50,
};

export const PER_ORG_MONTHLY_QUOTA: Record<AiKind, number> = {
  guide_chat: 5000,
  tutor_explain: 10000,
  ai_insights: 2000,
};

function startOfMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export type QuotaCheck =
  | { ok: true }
  | { ok: false; scope: "user" | "org"; kind: AiKind; used: number; limit: number };

export async function checkQuota(args: {
  userId?: string | null;
  orgId?: string | null;
  kind: AiKind;
}): Promise<QuotaCheck> {
  const since = startOfMonth();

  if (args.userId) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiUsageEvents)
      .where(and(
        eq(aiUsageEvents.userId, args.userId),
        eq(aiUsageEvents.kind, args.kind),
        eq(aiUsageEvents.cached, false),
        gte(aiUsageEvents.createdAt, since),
      ));
    const used = row?.count ?? 0;
    const limit = PER_USER_MONTHLY_QUOTA[args.kind];
    if (used >= limit) return { ok: false, scope: "user", kind: args.kind, used, limit };
  }

  if (args.orgId) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiUsageEvents)
      .where(and(
        eq(aiUsageEvents.orgId, args.orgId),
        eq(aiUsageEvents.kind, args.kind),
        eq(aiUsageEvents.cached, false),
        gte(aiUsageEvents.createdAt, since),
      ));
    const used = row?.count ?? 0;
    const limit = PER_ORG_MONTHLY_QUOTA[args.kind];
    if (used >= limit) return { ok: false, scope: "org", kind: args.kind, used, limit };
  }

  return { ok: true };
}

export async function recordUsage(args: {
  userId?: string | null;
  orgId?: string | null;
  envId?: string | null;
  kind: AiKind;
  model?: string;
  cached?: boolean;
}): Promise<void> {
  try {
    await db.insert(aiUsageEvents).values({
      userId: args.userId ?? null,
      orgId: args.orgId ?? null,
      envId: args.envId ?? null,
      kind: args.kind,
      model: args.model ?? null,
      cached: args.cached ?? false,
    });
  } catch (e) {
    console.error("[aiUsage] recordUsage failed:", (e as Error).message);
  }
}

export function quotaErrorMessage(check: Extract<QuotaCheck, { ok: false }>): string {
  const friendly: Record<AiKind, string> = {
    guide_chat: "Money Guide chat",
    tutor_explain: "AI Tutor explanations",
    ai_insights: "AI Insights",
  };
  const scopeLabel = check.scope === "user" ? "your monthly" : "your organization's monthly";
  return `You've reached ${scopeLabel} limit for ${friendly[check.kind]} (${check.used}/${check.limit}). Try again next month or contact your administrator.`;
}

// ─── Tutor explanation cache ────────────────────────────────────────────────

export function hashTutorQuestion(args: {
  questionText: string;
  options?: string[] | null;
  correctAnswer?: string | null;
  subject?: string | null;
}): string {
  const normalized = JSON.stringify({
    q: args.questionText.trim().toLowerCase().replace(/\s+/g, " "),
    o: (args.options ?? []).map(o => o.trim().toLowerCase()),
    a: (args.correctAnswer ?? "").trim().toLowerCase(),
    s: (args.subject ?? "").trim().toLowerCase(),
  });
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export async function getCachedExplanation(hash: string, modelVersion: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(tutorExplanations)
    .where(and(
      eq(tutorExplanations.questionHash, hash),
      eq(tutorExplanations.modelVersion, modelVersion),
    ))
    .limit(1);
  const hit = rows[0];
  if (!hit) return null;
  // Bump hits / lastUsedAt asynchronously
  db.update(tutorExplanations)
    .set({ hits: sql`${tutorExplanations.hits} + 1`, lastUsedAt: new Date() })
    .where(eq(tutorExplanations.id, hit.id))
    .catch(() => {});
  return hit.explanation;
}

export async function setCachedExplanation(hash: string, modelVersion: string, explanation: string): Promise<void> {
  if (!explanation || explanation.length < 20) return;
  try {
    await db.insert(tutorExplanations).values({
      questionHash: hash,
      modelVersion,
      explanation,
      hits: 0,
    });
  } catch (e) {
    // Likely a race-condition duplicate insert; ignore.
  }
}

export async function getOrgUsageThisMonth(orgId: string): Promise<{
  guide_chat: { live: number; cached: number; limit: number };
  tutor_explain: { live: number; cached: number; limit: number };
  ai_insights: { live: number; cached: number; limit: number };
  totalLive: number;
  totalCached: number;
}> {
  const since = startOfMonth();
  const rows = await db
    .select({
      kind: aiUsageEvents.kind,
      cached: aiUsageEvents.cached,
      count: sql<number>`count(*)::int`,
    })
    .from(aiUsageEvents)
    .where(and(eq(aiUsageEvents.orgId, orgId), gte(aiUsageEvents.createdAt, since)))
    .groupBy(aiUsageEvents.kind, aiUsageEvents.cached);

  const out = {
    guide_chat: { live: 0, cached: 0, limit: PER_ORG_MONTHLY_QUOTA.guide_chat },
    tutor_explain: { live: 0, cached: 0, limit: PER_ORG_MONTHLY_QUOTA.tutor_explain },
    ai_insights: { live: 0, cached: 0, limit: PER_ORG_MONTHLY_QUOTA.ai_insights },
    totalLive: 0,
    totalCached: 0,
  };
  for (const r of rows) {
    const k = r.kind as AiKind;
    if (!out[k]) continue;
    if (r.cached) {
      out[k].cached += r.count;
      out.totalCached += r.count;
    } else {
      out[k].live += r.count;
      out.totalLive += r.count;
    }
  }
  return out;
}
