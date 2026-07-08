---
name: Org read cache invalidation
description: getOrganization caches 5 min; writers outside the branding route must invalidate manually
---

Rule: any code that updates the `organizations` table via `updateOrganization` must call `invalidateOrganizationCache(orgId)` afterwards. `updateOrganization` itself does NOT invalidate the read cache.

**Why:** `getOrganization` caches rows in memory for 5 minutes. A seeding routine updated org signature fields but the branding GET kept returning stale nulls until restart, which looked like a failed write.

**How to apply:** whenever adding a new call site that writes org rows (seeders, admin tools, scripts running in-process), pair it with the cache invalidation. Out-of-process SQL edits need a server restart or TTL expiry to show up.
