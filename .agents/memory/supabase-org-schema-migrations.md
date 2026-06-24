---
name: Supabase organizations table — schema drift history and migration guard
description: Which columns were missing from the live organizations table and how the startup probe works.
---

## Missing columns (now applied)
The following columns were present in `server/supabase.ts` ALTER TABLE SQL but were **not** in the live Supabase `organizations` table:

| Column | Type | Used by |
|--------|------|---------|
| `allowed_email_domains` | `text[]` | 8 places in `auth.ts` — Google SSO domain enforcement |
| `display_label` | `text` | `orgs.ts` org settings |
| `territory` | `text` | `orgs.ts` PDF certificate generation (via `as any`) |
| `slug` | `text` | Planned, not yet in TypeScript `Organization` type |
| `plan` | `text NOT NULL DEFAULT 'standard'` | Planned |
| `student_limit` | `integer NOT NULL DEFAULT 500` | Planned |

Applied manually via psql `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` (idempotent).

## Startup migration probe
`initSupabaseTables()` probes for **`display_label`** (last added column). If it is missing (error code `42703`), it calls `applyBrandingColumnsViaPg()` which applies all ALTER TABLE migrations atomically.

**Why `display_label` and not `signature_left_name`:** `signature_left_name` was already present in the live DB, so the old probe never triggered for the newer columns. Always use the most-recently-added column as the sentinel.

## Root cause pattern
`applyBrandingColumnsViaPg()` runs all migrations in one batch. The probe only runs it when the sentinel column is missing. Once the sentinel is present, the function never runs again — so adding new columns to the batch requires updating the sentinel to the newest column.
