import { db } from "./db";
import { jobs, type Job } from "@shared/schema";
import { and, desc, eq, isNotNull, lt, lte, or, sql } from "drizzle-orm";
import { log } from "./index";

// Retention policy: how long to keep finished jobs before purging them.
// Defaults: completed=7 days, failed=30 days.
const _completedDays = Number(process.env.COMPLETED_JOB_RETENTION_DAYS ?? 7);
const _failedDays    = Number(process.env.FAILED_JOB_RETENTION_DAYS ?? 30);
const _intervalMs    = Number(process.env.JOB_CLEANUP_INTERVAL_MS ?? 24 * 60 * 60 * 1000);
const COMPLETED_JOB_RETENTION_DAYS = Number.isFinite(_completedDays) && _completedDays > 0 ? _completedDays : 7;
const FAILED_JOB_RETENTION_DAYS    = Number.isFinite(_failedDays) && _failedDays > 0 ? _failedDays : 30;
const CLEANUP_INTERVAL_MS          = Number.isFinite(_intervalMs) && _intervalMs > 0 ? _intervalMs : 24 * 60 * 60 * 1000;

// Typed payloads / results so handlers and call sites stay honest.
export interface JobPayloads {
  "extract-paper": {
    paperId: number;
    fileB64: string;
    ext: string;
    subject: string;
  };
  "admin-csv-export": {
    type: "students" | "teachers" | "classes" | "schools" | "sponsors";
  };
  "send-email": {
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
  "weekly-digest": {
    weekStart: string;
    audience: "student" | "teacher" | "guardian";
    orgId?: string | null;
  };
  "purge-ai-usage": {
    olderThanDays: number;
  };
  "perf-scan": {
    triggeredBy?: string;
  };
  "ai-health-check": {
    triggeredBy?: string;
  };
  "org-weekly-email": {
    weekStart: string;
  };
}

export interface JobResults {
  "extract-paper": {
    paperId: number;
    questionCount?: number;
    subject?: string;
    ok?: boolean;
    reason?: string;
  };
  "admin-csv-export": {
    type: string;
    rowCount: number;
    objectPath: string;
    fileName: string;
  };
  "send-email": {
    ok: boolean;
    providerId?: string;
    error?: string;
  };
  "weekly-digest": {
    audience: "student" | "teacher" | "guardian";
    weekStart: string;
    enqueued: number;
  };
  "purge-ai-usage": {
    deletedRows: number;
    cutoffDate: string;
  };
  "perf-scan": {
    reportFile: string;
    issueCount: number;
    criticalCount: number;
    warningCount: number;
    durationMs: number;
    filesScanned: number;
  };
  "ai-health-check": {
    anthropicOk: boolean;
    openaiOk: boolean;
    durationMs: number;
  };
  "org-weekly-email": {
    orgsProcessed: number;
    emailsSent: number;
  };
}

export type JobKind = keyof JobPayloads;

export type TypedJob<K extends JobKind> = Omit<Job, "kind" | "payload" | "result"> & {
  kind: K;
  payload: JobPayloads[K];
  result: JobResults[K] | null;
};

export type JobHandler<K extends JobKind> = (
  job: TypedJob<K>,
) => Promise<JobResults[K] | void>;

type AnyHandler = (job: Job) => Promise<Record<string, unknown> | void>;
const handlers = new Map<JobKind, AnyHandler>();

export function registerJobHandler<K extends JobKind>(
  kind: K,
  handler: JobHandler<K>,
) {
  handlers.set(kind, handler as unknown as AnyHandler);
}

export async function enqueueJob<K extends JobKind>(opts: {
  kind: K;
  payload: JobPayloads[K];
  ownerId?: string | null;
  maxAttempts?: number;
  delayMs?: number;
}): Promise<Job> {
  const scheduledAt = new Date(Date.now() + (opts.delayMs ?? 0));
  const [row] = await db
    .insert(jobs)
    .values({
      kind: opts.kind,
      payload: opts.payload,
      ownerId: opts.ownerId ?? null,
      maxAttempts: opts.maxAttempts ?? 3,
      scheduledAt,
    })
    .returning();
  return row;
}

export async function getJob(id: number): Promise<Job | undefined> {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, id));
  return row;
}

export async function listRecentJobs(
  opts: { limit?: number; ownerId?: string; kind?: JobKind } = {},
): Promise<Job[]> {
  const conditions = [];
  if (opts.ownerId) conditions.push(eq(jobs.ownerId, opts.ownerId));
  if (opts.kind) conditions.push(eq(jobs.kind, opts.kind));
  let q = db.select().from(jobs).$dynamic();
  if (conditions.length) q = q.where(and(...conditions));
  return await q.orderBy(desc(jobs.createdAt)).limit(opts.limit ?? 50);
}

async function claimNextJob(): Promise<Job | undefined> {
  // Atomically claim a queued job that's due, marking it processing.
  // FOR UPDATE SKIP LOCKED inside an UPDATE...WHERE id=(SELECT...) is the
  // standard high-concurrency Postgres queue pattern; safe with node-postgres.
  const result = await db.execute(sql`
    UPDATE jobs
    SET status = 'processing',
        started_at = now(),
        updated_at = now(),
        attempts = attempts + 1
    WHERE id = (
      SELECT id FROM jobs
      WHERE status = 'queued' AND scheduled_at <= now()
      ORDER BY scheduled_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *
  `);
  const rows = ((result as unknown as { rows?: Job[] }).rows ?? (result as unknown as Job[]));
  return rows?.[0];
}

async function finishJob(id: number, result: Record<string, unknown> | undefined) {
  await db
    .update(jobs)
    .set({
      status: "completed",
      result: (result ?? null) as JobResults[JobKind] | null,
      completedAt: new Date(),
      updatedAt: new Date(),
      lastError: null,
    })
    .where(eq(jobs.id, id));
}

async function failJob(job: Job, err: unknown) {
  const msg = String((err as Error)?.message ?? err).slice(0, 2000);
  if (job.attempts >= job.maxAttempts) {
    await db
      .update(jobs)
      .set({
        status: "failed",
        lastError: msg,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id));
    log(`job ${job.id} (${job.kind}) failed permanently: ${msg}`, "jobs");
  } else {
    // exponential backoff: 5s, 25s, 125s, capped 10m
    const delay = Math.min(5 * Math.pow(5, job.attempts - 1), 600) * 1000;
    await db
      .update(jobs)
      .set({
        status: "queued",
        lastError: msg,
        scheduledAt: new Date(Date.now() + delay),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id));
    log(`job ${job.id} (${job.kind}) errored, retry in ${Math.round(delay / 1000)}s: ${msg}`, "jobs");
  }
}

async function cleanOldJobs() {
  try {
    const completedCutoff = new Date(Date.now() - COMPLETED_JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const failedCutoff = new Date(Date.now() - FAILED_JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(jobs)
      .where(
        or(
          and(eq(jobs.status, "completed"), isNotNull(jobs.completedAt), lt(jobs.completedAt, completedCutoff)),
          and(eq(jobs.status, "failed"),    isNotNull(jobs.completedAt), lt(jobs.completedAt, failedCutoff)),
        ),
      );
    const count = (result as unknown as { rowCount?: number }).rowCount ?? 0;
    if (count > 0) {
      log(`cleanup removed ${count} old job(s)`, "jobs");
    }
  } catch (e) {
    log(`cleanup error: ${(e as Error).message}`, "jobs");
  }
}

let started = false;
const pollMs = 2000;

export function startJobWorker() {
  if (started) return;
  started = true;

  // Recover orphaned jobs that have been stuck in 'processing' for >30min
  // (multi-instance safe: never steals work from a healthy peer worker that
  // keeps its job's updated_at fresh).
  const staleThreshold = new Date(Date.now() - 30 * 60 * 1000);
  db.update(jobs)
    .set({ status: "queued", updatedAt: new Date() })
    .where(and(eq(jobs.status, "processing"), lte(jobs.updatedAt, staleThreshold)))
    .then(() => log("scanned for stale jobs (>30m in processing)", "jobs"))
    .catch((e) => log(`recover failed: ${(e as Error).message}`, "jobs"));

  const tick = async () => {
    try {
      const job = await claimNextJob();
      if (job) {
        const handler = handlers.get(job.kind as JobKind);
        if (!handler) {
          await failJob(job, new Error(`No handler registered for kind '${job.kind}'`));
        } else {
          try {
            const out = await handler(job);
            await finishJob(job.id, out ?? undefined);
            log(`job ${job.id} (${job.kind}) completed`, "jobs");
          } catch (err) {
            await failJob(job, err);
          }
        }
        setImmediate(tick);
        return;
      }
    } catch (e) {
      log(`worker tick error: ${(e as Error).message}`, "jobs");
    }
    setTimeout(tick, pollMs);
  };

  setTimeout(tick, pollMs);

  // Run cleanup once at startup, then on a fixed interval.
  cleanOldJobs();
  setInterval(cleanOldJobs, CLEANUP_INTERVAL_MS);

  log("background job worker started", "jobs");
}
