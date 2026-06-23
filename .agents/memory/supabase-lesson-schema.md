---
name: Supabase lesson_plans schema vs code
description: The lesson_plans table in Supabase can drift from server/supabase.ts; the ALTER TABLE in that file is documentation, not auto-run.
---

## Rule
Any new column added to `LessonPlan` type in `server/supabase.ts` MUST be manually applied to the live Supabase `lesson_plans` table via `psql $SUPABASE_DATABASE_URL`.

## Why
Supabase uses PostgREST which caches the schema. When code adds `video_url` to the insert call but the DB column doesn't exist, PostgREST returns a silent error and `createLessonPlan()` returns `null`, causing the route to respond 500 "Failed to create lesson". The ALTER TABLE comment inside `server/supabase.ts` is documentation only — it is never auto-executed.

## How to apply
After adding a new column to the `LessonPlan` type and using it in inserts:
1. `psql "$SUPABASE_DATABASE_URL" -c "ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS <col> <type>;"`
2. `psql "$SUPABASE_DATABASE_URL" -c "NOTIFY pgrst, 'reload schema';"`
3. Restart the dev server to pick up any cached schema in the Node process.

## Applied fix
`video_url text` column was missing; added 2026-06-23 via ALTER TABLE + NOTIFY pgrst.
