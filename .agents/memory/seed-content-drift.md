---
name: Seed content drift
description: Why seeded DB content goes stale after code edits and how to resync it
---

The rule: all seed functions in this project (static lessons in Supabase, learning modules, simulated stocks in Drizzle storage) are insert-only. They skip rows that already exist and never update them.

**Why:** Content cleanups in source (like the em dash scrub) never reached the live DB because rows were seeded before the edit, and items added later to seed arrays were silently missing from the DB.

**How to apply:** After any edit to seeded content in code, run `npx tsx scripts/sync-content-from-code.ts`. It updates rows in place keyed by stable identifiers (grade_level, slug, ticker), preserving IDs so student progress is untouched, never touches prices or user data, and fails loudly with a final em dash sweep. When checking whether content is fixed, always verify the DB (or API response), not just the source files.
