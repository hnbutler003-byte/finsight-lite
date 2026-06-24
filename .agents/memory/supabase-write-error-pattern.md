---
name: Supabase write-function error handling pattern
description: How supabase.ts write functions surface errors — throw vs null, and how route catch blocks distinguish 400 vs 500.
---

## Rule
All **write** functions in `server/supabase.ts` (create/update/delete) must throw a descriptive `Error` on Supabase errors instead of returning `null`/`false` silently. The error message must start with `[Supabase]` so route catch blocks can detect it.

```typescript
// Pattern for create / delete (never "not found")
if (error) {
  const msg = `[Supabase] createFoo failed: ${error.message}`;
  console.error(msg);
  throw new Error(msg);
}

// Pattern for update / toggle (PGRST116 = legitimate "not found" → still return null)
if (error) {
  if (error.code === "PGRST116") return null;
  const msg = `[Supabase] updateFoo failed: ${error.message}`;
  console.error(msg);
  throw new Error(msg);
}
```

**Why:** Silent null returns were swallowing DB errors. Callers (route handlers) treated null as "not found" or "try again" rather than a real failure. Errors were invisible in Sentry.

## Route catch-block pattern
All catch blocks in **write** routes use:
```typescript
} catch (e: any) {
  const status = (e?.message as string)?.startsWith("[Supabase]") ? 500 : 400;
  if (status >= 500) captureError(e, { route: req.path });
  res.status(status).json({ message: e.message });
}
```
This sends Zod validation errors as 400 and DB errors as 500 with Sentry capture.

**Files changed:** `server/supabase.ts`, `server/routes/lessons.ts`, `server/routes/orgs.ts`

## Non-critical fire-and-forget (analytics/leaderboard)
`upsertLeaderboardSnapshot` and `trackEvent` keep their `void` return type but now call `captureError` on failure (no throw — callers don't await error handling).

## Sentry activation
`SENTRY_DSN` env var must be set to activate. Without it, `captureError` is a no-op. The `sentryRequestContext` middleware also captures all HTTP 5xx responses as synthetic errors (even without the richer `captureError` calls).
