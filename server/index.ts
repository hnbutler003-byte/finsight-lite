import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { startJobWorker, enqueueJob } from "./jobs";
import { registerJobHandlers } from "./jobHandlers";
import { db } from "./db";
import { weeklyDigestRuns } from "@shared/schema";
import { and, eq } from "drizzle-orm";

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

(async () => {
  await registerRoutes(httpServer, app);
  await seedDatabase();
  registerJobHandlers();
  startJobWorker();
  startWeeklyDigestScheduler();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
    },
  );
})();
