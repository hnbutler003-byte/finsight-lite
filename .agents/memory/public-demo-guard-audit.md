---
name: Public demo read-only guard audit
description: Routes that check session fields directly bypass shared middleware guards
---

Rule: the demo read-only enforcement lives in the shared `isOrgAdmin` middleware (blocks non-GET when `session.demoOrgReadOnly`). Any route that authenticates by reading `req.session.orgAdminId` directly instead of using the middleware silently bypasses the guard. GET routes with side effects (test-email senders) also bypass it because the guard only blocks non-GET.

**Why:** after shipping the public no-signup Org Admin demo, an audit found a digest-email POST and a test-email GET reachable by anonymous demo visitors (real outbound email + job enqueue).

**How to apply:** when adding any org-admin route, use `isOrgAdmin`, never raw session checks; for GET routes that send email or write anything, add an explicit `session.demoOrgReadOnly` rejection. When adding new public demo entry points, grep for `session.orgAdminId` (and the equivalent session key for other roles) to find guard bypasses.
