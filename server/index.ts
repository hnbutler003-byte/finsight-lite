import express, { type Request, Response, NextFunction } from "express";
import { initSentry, captureError, sentryRequestContext, Sentry } from "./sentry";
import { spawn } from "child_process";
import path from "path";
initSentry();
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { startJobWorker, enqueueJob } from "./jobs";
import { registerJobHandlers } from "./jobHandlers";
import { db, probeDatabase } from "./db";
import { weeklyDigestRuns, aiUsagePurgeRuns, jobs } from "@shared/schema";
import { and, eq, gte } from "drizzle-orm";

if (!process.env.SESSION_SECRET) {
  console.error("[startup] SESSION_SECRET env var is not set, refusing to start. Set it in your Replit Secrets.");
  process.exit(1);
}

// How many days back the auto-scheduled purge deletes (default 180).
const AUTO_PURGE_OLDER_THAN_DAYS = (() => {
  const v = parseInt(process.env.AI_PURGE_OLDER_THAN_DAYS ?? "180", 10);
  return Number.isFinite(v) && v > 0 ? v : 180;
})();

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
// NOTE: sentryRequestContext is registered INSIDE registerRoutes(),
// AFTER setupAuth() installs the session middleware, so req.session is
// available when this middleware runs.

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

function getMostRecentSundayAt7pm(now: Date): Date {
  const d = new Date(now);
  const dow = d.getDay();
  const daysSince = (dow + 0) % 7;
  d.setDate(d.getDate() - daysSince);
  d.setHours(19, 0, 0, 0);
  if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 7);
  return d;
}

async function maybeRunWeeklyDigest() {
  try {
    const target = getMostRecentSundayAt7pm(new Date());
    if (target.getTime() > Date.now()) return;
    const weekStart = target.toISOString().slice(0, 10);
    for (const audience of ["student", "teacher", "guardian"] as const) {
      // Atomic claim: only one process inserts the (weekStart, audience) row.
      const inserted = await db
        .insert(weeklyDigestRuns)
        .values({ weekStart, audience })
        .onConflictDoNothing()
        .returning();
      if (inserted.length === 0) continue;
      try {
        await enqueueJob({ kind: "weekly-digest", payload: { weekStart, audience, orgId: null } });
        log(`enqueued weekly-digest ${audience} for ${weekStart}`);
      } catch (e) {
        // Roll back the claim so it can retry next interval.
        await db
          .delete(weeklyDigestRuns)
          .where(and(eq(weeklyDigestRuns.weekStart, weekStart), eq(weeklyDigestRuns.audience, audience)));
        log(`weekly-digest ${audience} enqueue failed, claim rolled back: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    log(`weekly digest scheduler error: ${(e as Error).message}`);
  }
}

function startWeeklyDigestScheduler() {
  setTimeout(() => { void maybeRunWeeklyDigest(); }, 30_000);
  setInterval(() => { void maybeRunWeeklyDigest(); }, 15 * 60 * 1000);
}

// ── Monthly AI usage purge scheduler ─────────────────────────────────────────
// Enqueues one purge-ai-usage job per calendar month using an atomic
// INSERT ... ON CONFLICT DO NOTHING guard (same pattern as weeklyDigestRuns).
async function maybeRunAiUsagePurge() {
  try {
    const monthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const inserted = await db
      .insert(aiUsagePurgeRuns)
      .values({ monthKey })
      .onConflictDoNothing()
      .returning();
    if (inserted.length === 0) return; // already ran this month
    try {
      await enqueueJob({ kind: "purge-ai-usage", payload: { olderThanDays: AUTO_PURGE_OLDER_THAN_DAYS } });
      log(`enqueued auto purge-ai-usage for ${monthKey} (olderThanDays=${AUTO_PURGE_OLDER_THAN_DAYS})`, "purge");
    } catch (e) {
      // Roll back the claim so it retries on the next check interval.
      await db.delete(aiUsagePurgeRuns).where(eq(aiUsagePurgeRuns.monthKey, monthKey));
      log(`auto purge-ai-usage enqueue failed, claim rolled back: ${(e as Error).message}`, "purge");
    }
  } catch (e) {
    log(`auto purge-ai-usage scheduler error: ${(e as Error).message}`, "purge");
  }
}

function startAiUsagePurgeScheduler() {
  // First check 60 s after startup (give the DB time to settle).
  setTimeout(() => { void maybeRunAiUsagePurge(); }, 60_000);
  // Then re-check every 6 hours — ensures we catch the month boundary
  // even if the server restarts mid-month.
  setInterval(() => { void maybeRunAiUsagePurge(); }, 6 * 60 * 60 * 1000);
}

// ── Org weekly email scheduler ─────────────────────────────────────────────
// Sends a weekly summary email to all org admins on Monday at 08:00 UTC.
// Uses the jobs table for deduplication — checks for an existing job of
// kind "org-weekly-email" scheduled on or after this week's Monday trigger
// before enqueuing a new one.
async function maybeRunOrgWeeklyEmail() {
  try {
    const now = new Date();
    // Roll back to most recent Monday at 08:00 UTC.
    const trigger = new Date(now);
    trigger.setUTCHours(8, 0, 0, 0);
    const dow = trigger.getUTCDay(); // 0=Sun, 1=Mon, …
    trigger.setUTCDate(trigger.getUTCDate() - ((dow + 6) % 7));
    if (trigger.getTime() > now.getTime()) return; // Not yet reached this week's send time.
    const weekKey = trigger.toISOString().slice(0, 10); // "YYYY-MM-DD"
    // Deduplication: skip if we already enqueued this week's job.
    const [existing] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.kind, "org-weekly-email"), gte(jobs.scheduledAt, trigger)))
      .limit(1);
    if (existing) return;
    await enqueueJob({ kind: "org-weekly-email", payload: { weekStart: weekKey } });
    log(`enqueued org-weekly-email for ${weekKey}`);
  } catch (e) {
    log(`org weekly email scheduler error: ${(e as Error).message}`);
  }
}

function startOrgWeeklyEmailScheduler() {
  setTimeout(() => { void maybeRunOrgWeeklyEmail(); }, 45_000);
  setInterval(() => { void maybeRunOrgWeeklyEmail(); }, 15 * 60 * 1000);
}

// ── Performance scan scheduler ─────────────────────────────────────────────
// Enqueues a perf-scan job on a configurable interval (default: 1 hour).
// Set PERF_SCAN_INTERVAL_MS env var to override (e.g. "1800000" for 30 min).
// Set DISABLE_PERF_SCAN=1 to turn it off entirely.
function startPerfScanScheduler() {
  if (process.env.DISABLE_PERF_SCAN === "1") {
    log("perf-scan scheduler disabled (DISABLE_PERF_SCAN=1)", "perf");
    return;
  }
  const intervalMs = Math.max(5 * 60_000, parseInt(process.env.PERF_SCAN_INTERVAL_MS ?? "3600000", 10));
  // First scan 10 minutes after startup so it doesn't compete with cold-start.
  setTimeout(async () => {
    try { await enqueueJob({ kind: "perf-scan", payload: { triggeredBy: "scheduler" } }); log("perf-scan enqueued (first run)", "perf"); }
    catch (e) { log(`perf-scan first enqueue failed: ${(e as Error).message}`, "perf"); }
  }, 10 * 60_000);
  setInterval(async () => {
    try { await enqueueJob({ kind: "perf-scan", payload: { triggeredBy: "scheduler" } }); log(`perf-scan enqueued (interval=${intervalMs}ms)`, "perf"); }
    catch (e) { log(`perf-scan enqueue failed: ${(e as Error).message}`, "perf"); }
  }, intervalMs);
}

// Uptime guardrail: spawn an INDEPENDENT child process (scripts/uptime-worker.js)
// that pings /healthz on a schedule and emits email alerts via Resend on
// repeated failures. Running it as a separate process means a crash of the
// main server does NOT take the monitor down with it. The same script can
// also be wired up as an external Replit Scheduled Deployment using
// `node scripts/uptime-worker.js --oneshot` for fully out-of-process checks.
let uptimeChild: ReturnType<typeof spawn> | null = null;
function startUptimeWorker() {
  if (process.env.DISABLE_UPTIME_WORKER === "1") {
    log("uptime worker disabled by DISABLE_UPTIME_WORKER", "uptime");
    return;
  }
  const scriptPath = path.resolve(process.cwd(), "scripts/uptime-worker.js");
  try {
    uptimeChild = spawn(process.execPath, [scriptPath], {
      env: process.env,
      stdio: "inherit",
      detached: false,
    });
    uptimeChild.on("exit", (code, sig) => {
      log(`uptime worker exited (code=${code}, signal=${sig}); respawning in 30s`, "uptime");
      setTimeout(startUptimeWorker, 30_000);
    });
    uptimeChild.on("error", (err) => {
      log(`uptime worker error: ${err.message}`, "uptime");
    });
    log(`uptime worker spawned (pid=${uptimeChild.pid})`, "uptime");
  } catch (e) {
    log(`uptime worker failed to spawn: ${(e as Error).message}`, "uptime");
  }
}

function stopUptimeWorker() {
  if (uptimeChild && !uptimeChild.killed) {
    try { uptimeChild.kill("SIGTERM"); } catch { /* ignore */ }
  }
}
process.on("SIGTERM", stopUptimeWorker);
process.on("SIGINT", stopUptimeWorker);

(async () => {
  // Probe DB connectivity before anything else so a misconfigured
  // DATABASE_URL or network partition surfaces immediately on startup
  // rather than silently failing on the first real request.
  try {
    await probeDatabase();
    log("database connectivity verified", "startup");
  } catch (e: any) {
    console.error("[startup] Database unreachable, cannot continue:", e.message);
    process.exit(1);
  }

  await registerRoutes(httpServer, app);
  await seedDatabase();
  registerJobHandlers();
  startJobWorker();
  startWeeklyDigestScheduler();
  startAiUsagePurgeScheduler();
  startPerfScanScheduler();
  startOrgWeeklyEmailScheduler();


  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (status >= 500) {
      try {
        captureError(err, { path: req.path, method: req.method });
      } catch {
        // ignore
      }
      console.error("[unhandled]", req.method, req.path, err);
    }
    res.status(status).json({ message });
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
    captureError(reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err);
    captureError(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      startUptimeWorker();
    },
  );
})();
