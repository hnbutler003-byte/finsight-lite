import { Express } from "express";
import { Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerAudioRoutes } from "./replit_integrations/audio";
import { ObjectStorageService } from "./replit_integrations/object_storage";
import { authLimiter, strictAuthLimiter } from "./rateLimiter";
import {
  initSupabaseTables,
  trimOrgNamesInSupabase,
  seedFinancialAcademyLesson,
  initStaticContentTables,
  seedStaticModules,
  seedRegionalContent,
  seedGameContent,
} from "./supabase";

import { registerAuthDomainRoutes } from "./routes/auth";
import { registerStudentRoutes } from "./routes/students";
import { registerAiRoutes } from "./routes/ai";
import { registerOrgRoutes } from "./routes/orgs";
import { registerLessonRoutes } from "./routes/lessons";
import { registerEmailRoutes } from "./routes/emails";

const objectStorage = new ObjectStorageService();

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Global SEO headers
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/")) {
      res.setHeader("X-Robots-Tag", "index, follow");
    }
    next();
  });

  // Sitemap
  app.get("/sitemap.xml", (req, res) => {
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const base = `${proto}://${host}`;
    const urls = [
      { loc: "/", priority: "1.0", changefreq: "weekly" },
      { loc: "/auth", priority: "0.8", changefreq: "monthly" },
      { loc: "/org/login", priority: "0.6", changefreq: "monthly" },
      { loc: "/org/register", priority: "0.6", changefreq: "monthly" },
      { loc: "/teacher/login", priority: "0.6", changefreq: "monthly" },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${base}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.setHeader("Content-Type", "application/xml");
    res.send(xml);
  });

  // Health check
  app.get("/healthz", async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`select 1`);
      res.json({ ok: true, ts: Date.now() });
    } catch (e: any) {
      res.status(503).json({ ok: false, error: e?.message || "db unavailable" });
    }
  });

  // Auth rate limiting — must be applied before auth routes are registered
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/google", authLimiter);
  app.use("/api/teacher/auth/register", authLimiter);
  app.use("/api/teacher/auth/login", authLimiter);
  app.use("/api/teacher/auth/google", authLimiter);
  app.use("/api/org/auth/register", authLimiter);
  app.use("/api/org/auth/login", authLimiter);
  app.use("/api/org/auth/google", authLimiter);
  app.use("/api/org/auth/google-register", authLimiter);
  app.use("/api/auth/resume", strictAuthLimiter);

  // Auth setup (Replit passwordless session)
  await setupAuth(app);
  registerAuthRoutes(app);

  // Sentry request-scoped context — after setupAuth so session is populated
  const { sentryRequestContext } = await import("./sentry");
  app.use(sentryRequestContext);

  // Serve public assets from object storage (logos, videos, etc.)
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    try {
      const filePath = req.params.filePath;
      const file = await objectStorage.searchPublicObject(filePath);
      if (!file) return res.status(404).json({ error: "Object not found" });
      await objectStorage.downloadObject(file, res, 60 * 60 * 24 * 30);
    } catch (err) {
      console.error("Error serving public object:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to serve object" });
      }
    }
  });

  // Legacy redirect: old disk-based logo URLs → object-storage URLs
  app.get("/uploads/logos/:filePath(*)", (req, res) => {
    res.redirect(308, `/public-objects/logos/${req.params.filePath}`);
  });

  // OpenAI / image / audio integration routes
  registerChatRoutes(app);
  registerImageRoutes(app);
  registerAudioRoutes(app);

  // Supabase table initialisation (non-blocking)
  initSupabaseTables()
    .then(() => trimOrgNamesInSupabase())
    .then(() => seedFinancialAcademyLesson())
    .then(() => initStaticContentTables())
    .then(() => seedStaticModules())
    .then(() => seedRegionalContent())
    .then(() => seedGameContent())
    .catch(e => console.error("[Supabase] Init error:", e));

  // Domain routers
  await registerAuthDomainRoutes(app);
  await registerStudentRoutes(app);
  await registerAiRoutes(app);
  await registerOrgRoutes(app);
  await registerLessonRoutes(app);
  await registerEmailRoutes(app);

  return httpServer;
}
