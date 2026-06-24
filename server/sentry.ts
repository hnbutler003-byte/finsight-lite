import * as Sentry from "@sentry/node";

let initialized = false;

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || initialized) return;
  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
    initialized = true;
    console.log("[sentry] initialized");
  } catch (e) {
    console.warn("[sentry] init failed:", (e as Error).message);
  }
}

export function captureError(err: unknown, ctx?: Record<string, any>) {
  if (!initialized) return;
  try {
    Sentry.withScope((scope) => {
      if (ctx) {
        for (const [k, v] of Object.entries(ctx)) {
          scope.setExtra(k, v);
        }
      }
      Sentry.captureException(err);
    });
  } catch {
    // ignore
  }
}

// Request-scoped Sentry context middleware. Wraps each request in its own
// isolation scope so the user/org tags set during this request never leak
// to other concurrent requests. Reads identity from session after auth runs.
import type { Request, Response, NextFunction } from "express";
export function sentryRequestContext(req: Request, _res: Response, next: NextFunction) {
  if (!initialized) return next();
  try {
    Sentry.withIsolationScope((scope) => {
      const sess = (req as any).session ?? {};
      // Use OPAQUE non-PII identifiers only, never raw email.
      let id: string | undefined;
      if (sess.isAdmin) id = "admin";
      else if (sess.orgAdminId) id = `org_admin:${sess.orgAdminId}`;
      else if (sess.userId) id = `user:${sess.userId}`;
      else if (sess.passport?.user?.claims?.sub) id = `user:${sess.passport.user.claims.sub}`;
      if (id) scope.setUser({ id });
      // Org tag is non-PII (UUID).
      const orgId = sess.orgId || sess.passport?.user?.org_id;
      if (orgId) scope.setTag("org_id", String(orgId));

      // Catch handler-level 5xx responses that returned without throwing
      // (e.g. routes that locally try/catch and return res.status(500)).
      // We don't have the original Error, but the path/method/status are
      // enough to alert on and click through to logs.
      _res.on("finish", () => {
        try {
          if (_res.statusCode >= 500 && _res.statusCode <= 599) {
            const synthetic = new Error(
              `HTTP ${_res.statusCode} ${req.method} ${req.originalUrl || req.url}`,
            );
            Sentry.withScope((s) => {
              s.setLevel("error");
              s.setTag("http.status_code", String(_res.statusCode));
              s.setTag("http.method", req.method);
              s.setTag("http.route", req.originalUrl || req.url);
              if (orgId) s.setTag("org_id", String(orgId));
              if (id) s.setUser({ id });
              Sentry.captureException(synthetic);
            });
          }
        } catch { /* never throw from finish */ }
      });

      next();
    });
  } catch {
    next();
  }
}

// (legacy) globally-scoped helper kept for ad-hoc background contexts. Avoid
// using inside per-request handlers; use sentryRequestContext middleware.
export function setSentryUser(user: { id?: string | number; orgId?: string } | null) {
  if (!initialized) return;
  try {
    if (!user) return Sentry.setUser(null);
    Sentry.setUser({ id: user.id != null ? String(user.id) : undefined });
    if (user.orgId) Sentry.setTag("org_id", user.orgId);
  } catch {
    // ignore
  }
}

export { Sentry };
