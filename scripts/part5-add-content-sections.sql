-- Part 5 (Investment Simulator): add structured content to learning_modules
--
-- Additive and non-destructive: adds a new nullable column. Nothing existing
-- is dropped or altered. The renderer falls back to the existing plain-text
-- `content` column when content_sections is empty, so this is safe to run
-- without downtime.
--
-- After running:
--   1. npx tsx scripts/sync-content-from-code.ts  (backfills the 6 static
--      BSD module rows; seeding alone never updates existing rows)
--   2. npx drizzle-kit generate  (keeps migrations/meta in sync)

ALTER TABLE learning_modules ADD COLUMN IF NOT EXISTS content_sections jsonb;
