import crypto from "crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { aiUsageEvents, tutorExplanations, orgAiQuotas } from "@shared/schema";

export type AiKind = "guide_chat" | "tutor_explain" | "ai_insights";

// Default DAILY quotas (per user and per org). Org admins can override
// these via the org_ai_quotas table on a per-org basis.
export const DEFAULT_PER_USER_DAILY_QUOTA: Record<AiKind, number> = {
  guide_chat: 20,
  tutor_explain: 30,
  ai_insights: 5,
};

export const DEFAULT_PER_ORG_DAILY_QUOTA: Record<AiKind, number> = {
  guide_chat: 500,
  tutor_explain: 1000,
  ai_insights: 200,
};

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const PER_USER_FIELD: Record<AiKind, keyof typeof orgAiQuotas.$inferSelect> = {
  guide_chat: "guideChatPerUserDaily",
  tutor_explain: "tutorExplainPerUserDaily",
  ai_insights: "aiInsightsPerUserDaily",
};

const PER_ORG_FIELD: Record<AiKind, keyof typeof orgAiQuotas.$inferSelect> = {
  guide_chat: "guideChatPerOrgDaily",
  tutor_explain: "tutorExplainPerOrgDaily",
  ai_insights: "aiInsightsPerOrgDaily",
};

async function getOrgLimits(orgId: string | null | undefined): Promise<{
  perUser: Record<AiKind, number>;
  perOrg: Record<AiKind, number>;
}> {
  const perUser = { ...DEFAULT_PER_USER_DAILY_QUOTA };
  const perOrg = { ...DEFAULT_PER_ORG_DAILY_QUOTA };
  if (!orgId) return { perUser, perOrg };

  const [row] = await db.select().from(orgAiQuotas).where(eq(orgAiQuotas.orgId, orgId)).limit(1);
  if (!row) return { perUser, perOrg };

  for (const k of ["guide_chat", "tutor_explain", "ai_insights"] as AiKind[]) {
    const u = row[PER_USER_FIELD[k]] as number | null;
    const o = row[PER_ORG_FIELD[k]] as number | null;
    if (typeof u === "number" && u > 0) perUser[k] = u;
    if (typeof o === "number" && o > 0) perOrg[k] = o;
  }
  return { perUser, perOrg };
}

export type QuotaCheck =
  | { ok: true }
  | { ok: false; scope: "user" | "org"; kind: AiKind; used: number; limit: number };

export async function checkQuota(args: {
  userId?: string | null;
  orgId?: string | null;
  kind: AiKind;
}): Promise<QuotaCheck> {
  const since = startOfUtcDay();
  const { perUser, perOrg } = await getOrgLimits(args.orgId);

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
    const limit = perUser[args.kind];
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
    const limit = perOrg[args.kind];
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
  tokensIn?: number;
  tokensOut?: number;
}): Promise<void> {
  try {
    await db.insert(aiUsageEvents).values({
      userId: args.userId ?? null,
      orgId: args.orgId ?? null,
      envId: args.envId ?? null,
      kind: args.kind,
      model: args.model ?? null,
      tokensIn: Math.max(0, Math.floor(args.tokensIn ?? 0)),
      tokensOut: Math.max(0, Math.floor(args.tokensOut ?? 0)),
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
  const scopeLabel = check.scope === "user" ? "your daily" : "your school's daily";
  return `You've reached ${scopeLabel} limit for ${friendly[check.kind]} (${check.used}/${check.limit}). Try again tomorrow!`;
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
    // Likely a duplicate insert race; ignore.
  }
}

// ─── Org admin reporting ────────────────────────────────────────────────────

export async function getOrgUsageToday(orgId: string): Promise<{
  guide_chat: { live: number; cached: number; tokens: number; limit: number };
  tutor_explain: { live: number; cached: number; tokens: number; limit: number };
  ai_insights: { live: number; cached: number; tokens: number; limit: number };
  totalLive: number;
  totalCached: number;
  totalTokens: number;
  windowStart: string;
  perUserLimits: Record<AiKind, number>;
}> {
  const since = startOfUtcDay();
  const { perUser, perOrg } = await getOrgLimits(orgId);

  const rows = await db
    .select({
      kind: aiUsageEvents.kind,
      cached: aiUsageEvents.cached,
      count: sql<number>`count(*)::int`,
      tokens: sql<number>`COALESCE(SUM(${aiUsageEvents.tokensIn} + ${aiUsageEvents.tokensOut}), 0)::int`,
    })
    .from(aiUsageEvents)
    .where(and(eq(aiUsageEvents.orgId, orgId), gte(aiUsageEvents.createdAt, since)))
    .groupBy(aiUsageEvents.kind, aiUsageEvents.cached);

  const out = {
    guide_chat: { live: 0, cached: 0, tokens: 0, limit: perOrg.guide_chat },
    tutor_explain: { live: 0, cached: 0, tokens: 0, limit: perOrg.tutor_explain },
    ai_insights: { live: 0, cached: 0, tokens: 0, limit: perOrg.ai_insights },
    totalLive: 0,
    totalCached: 0,
    totalTokens: 0,
    windowStart: since.toISOString(),
    perUserLimits: perUser,
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
    out[k].tokens += r.tokens;
    out.totalTokens += r.tokens;
  }
  return out;
}

export async function getOrgQuotaSettings(orgId: string): Promise<{
  perUser: Record<AiKind, number>;
  perOrg: Record<AiKind, number>;
  defaults: { perUser: Record<AiKind, number>; perOrg: Record<AiKind, number> };
}> {
  const limits = await getOrgLimits(orgId);
  return {
    ...limits,
    defaults: {
      perUser: { ...DEFAULT_PER_USER_DAILY_QUOTA },
      perOrg: { ...DEFAULT_PER_ORG_DAILY_QUOTA },
    },
  };
}

export async function updateOrgQuotaSettings(orgId: string, updates: Partial<{
  guide_chat_per_user: number | null;
  tutor_explain_per_user: number | null;
  ai_insights_per_user: number | null;
  guide_chat_per_org: number | null;
  tutor_explain_per_org: number | null;
  ai_insights_per_org: number | null;
}>): Promise<void> {
  const dbValues: any = {
    orgId,
    updatedAt: new Date(),
  };
  const map: Record<string, string> = {
    guide_chat_per_user: "guideChatPerUserDaily",
    tutor_explain_per_user: "tutorExplainPerUserDaily",
    ai_insights_per_user: "aiInsightsPerUserDaily",
    guide_chat_per_org: "guideChatPerOrgDaily",
    tutor_explain_per_org: "tutorExplainPerOrgDaily",
    ai_insights_per_org: "aiInsightsPerOrgDaily",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) {
      const v = (updates as any)[key];
      dbValues[col] = (v == null || v === "") ? null : Math.max(1, Math.floor(Number(v)));
    }
  }
  await db.insert(orgAiQuotas).values(dbValues).onConflictDoUpdate({
    target: orgAiQuotas.orgId,
    set: { ...dbValues, updatedAt: new Date() },
  });
}
