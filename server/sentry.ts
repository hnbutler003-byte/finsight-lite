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
