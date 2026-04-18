import { db } from "./db";
import { jobs, type Job } from "@shared/schema";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { log } from "./index";

type JobHandler = (job: Job) => Promise<Record<string, any> | void>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(kind: string, handler: JobHandler) {
  handlers.set(kind, handler);
}

export async function enqueueJob(opts: {
  kind: string;
  payload?: Record<string, any>;
  ownerId?: string | null;
  maxAttempts?: number;
  delayMs?: number;
}): Promise<Job> {
  const scheduledAt = new Date(Date.now() + (opts.delayMs ?? 0));
  const [row] = await db.insert(jobs).values({
    kind: opts.kind,
    payload: opts.payload ?? {},
    ownerId: opts.ownerId ?? null,
    maxAttempts: opts.maxAttempts ?? 3,
    scheduledAt,
  }).returning();
  return row;
}

export async function getJob(id: number): Promise<Job | undefined> {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, id));
  return row;
}

export async function listRecentJobs(opts: { limit?: number; ownerId?: string; kind?: string } = {}): Promise<Job[]> {
  const conditions = [] as any[];
  if (opts.ownerId) conditions.push(eq(jobs.ownerId, opts.ownerId));
  if (opts.kind) conditions.push(eq(jobs.kind, opts.kind));
  let q = db.select().from(jobs).$dynamic();
  if (conditions.length) q = q.where(and(...conditions));
  return await q.orderBy(desc(jobs.createdAt)).limit(opts.limit ?? 50);
}

async function claimNextJob(): Promise<Job | undefined> {
  // Atomically claim a queued job that's due, marking it processing.
  const result = await db.execute<Job>(sql`
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
  const rows: any[] = (result as any).rows ?? (result as any);
  return rows?.[0];
}

async function finishJob(id: number, result: Record<string, any> | undefined) {
  await db.update(jobs).set({
    status: "completed",
    result: result ?? null,
    completedAt: new Date(),
    updatedAt: new Date(),
    lastError: null,
  }).where(eq(jobs.id, id));
}

async function failJob(job: Job, err: any) {
  const msg = String(err?.message ?? err).slice(0, 2000);
  if (job.attempts >= job.maxAttempts) {
    await db.update(jobs).set({
      status: "failed",
      lastError: msg,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(jobs.id, job.id));
    log(`job ${job.id} (${job.kind}) failed permanently: ${msg}`, "jobs");
  } else {
    // exponential backoff: 5s, 25s, 125s ...
    const delay = Math.min(5 * Math.pow(5, job.attempts - 1), 600) * 1000;
    await db.update(jobs).set({
      status: "queued",
      lastError: msg,
      scheduledAt: new Date(Date.now() + delay),
      updatedAt: new Date(),
    }).where(eq(jobs.id, job.id));
    log(`job ${job.id} (${job.kind}) errored, retry in ${Math.round(delay/1000)}s: ${msg}`, "jobs");
  }
}

let started = false;
let pollMs = 2000;

export function startJobWorker() {
  if (started) return;
  started = true;

  // Recover orphaned jobs that have been stuck in 'processing' for >30min
  // (multi-instance safe: never steals work from a healthy peer worker that
  // is actively updating its job's updated_at timestamp).
  const staleThreshold = new Date(Date.now() - 30 * 60 * 1000);
  db.update(jobs)
    .set({ status: "queued", updatedAt: new Date() })
    .where(and(eq(jobs.status, "processing"), lte(jobs.updatedAt, staleThreshold)))
    .then(() => log("scanned for stale jobs (>30m in processing)", "jobs"))
    .catch((e) => log(`recover failed: ${e?.message}`, "jobs"));

  const tick = async () => {
    try {
      const job = await claimNextJob();
      if (job) {
        const handler = handlers.get(job.kind);
        if (!handler) {
          await failJob(job, new Error(`No handler registered for kind '${job.kind}'`));
        } else {
          try {
            const out = await handler(job);
            await finishJob(job.id, out ?? undefined);
            log(`job ${job.id} (${job.kind}) completed`, "jobs");
          } catch (err: any) {
            await failJob(job, err);
          }
        }
        // try another immediately if queue is hot
        setImmediate(tick);
        return;
      }
    } catch (e: any) {
      log(`worker tick error: ${e?.message}`, "jobs");
    }
    setTimeout(tick, pollMs);
  };

  setTimeout(tick, pollMs);
  log("background job worker started", "jobs");
}
