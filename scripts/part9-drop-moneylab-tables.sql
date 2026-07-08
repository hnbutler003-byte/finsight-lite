-- Part 9: Remove MoneyLab exam-paper feature (Claude-authored, for Replit Agent to review and run against live Supabase)
--
-- Scope check before running: game_sessions and its leaderboard/analytics usage are
-- NOT part of this removal and must keep working. This script only touches the
-- paper_id column (which becomes an orphaned foreign key once exam_papers is
-- dropped) and the two tables exclusive to the exam-paper-to-quiz feature.
--
-- Order matters: drop the dependent column first, then the child table, then the parent table.

ALTER TABLE game_sessions DROP COLUMN IF EXISTS paper_id;

DROP TABLE IF EXISTS extracted_questions;

DROP TABLE IF EXISTS exam_papers;

-- After running, regenerate the drizzle snapshot/journal (drizzle-kit generate)
-- so migrations/meta stays in sync with this hand-applied change, matching how
-- prior live schema changes (e.g. the org_id ALTER TABLE fix) were reconciled.

-- Also clean up the "moneylab" entry from any existing org's features_enabled
-- array (a per-org toggle shown on the platform admin dashboard). New orgs
-- won't get this default anymore, but existing rows need a direct update.
-- NOTE (corrected during review): features_enabled lives on org_environments,
-- not organizations. The organizations table has no such column in the live DB.
UPDATE org_environments
SET features_enabled = array_remove(features_enabled, 'moneylab')
WHERE 'moneylab' = ANY(features_enabled);

-- Align the live column default with the updated CREATE TABLE statement in
-- server/supabase.ts (CREATE TABLE IF NOT EXISTS does not change existing tables).
ALTER TABLE org_environments
ALTER COLUMN features_enabled
SET DEFAULT ARRAY['money_games','investment_sim','money_guide'];
