---
name: Org logo storage backend
description: Why org certificate logos use Supabase Storage and not Replit object storage.
---

Org certificate logos are uploaded to the public Supabase Storage bucket `org-logos`
(helper: `server/logoStorage.ts`) and stored as full Supabase public URLs.

**Why:** production runs on Railway (finsightlite.com), where the Replit object
storage credential sidecar (127.0.0.1:1106) does not exist, so any Replit-storage
write path fails there regardless of env vars ("PUBLIC_OBJECT_SEARCH_PATHS not set"
was only the first symptom). Supabase Storage works identically in both environments
with the already-present SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.

**How to apply:** any NEW user-facing upload feature that must work in production
should use Supabase Storage, not the Replit object storage integration. Existing
video/lesson uploads still use Replit storage and are a known prod gap. supabase-js
returns errors instead of throwing; `createBucket` yields "already exists" on
re-run (tolerate it) and buckets must be created with `{ public: true }` or
getPublicUrl serves 400s.
