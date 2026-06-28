# FinSight Lite - Pre-Outreach QA Report

**Date:** June 28, 2026
**Scope:** Organization, Teacher, and Admin areas.
**Focus:** content upload (YouTube + file), class load at 25 to 35 students, org-admin
functions at realistic volume, no silent failures on database writes, and correct
rendering in both light and dark mode.

## Overall verdict

The three areas are functional and ready for outreach **after the fixes below**, which
have all been applied and re-verified. Five real defects were found; all five were
clear-cut and have been fixed. Two minor items are flagged for later (no blocker).

## Test environment

To test at realistic volume, an isolated class (code `QALOAD`) was seeded under the demo
teacher with **30 students**, varied savings goals, XP, and lesson progress. The demo
teacher was temporarily linked to a real organization and environment, and a second
teacher was added, so org-admin management could be exercised. **All of this QA data was
removed after testing** (verified zero residue). The schema and code fixes were retained.

## What was tested and the result

### 1. Teacher content upload

| Case | Result |
| --- | --- |
| YouTube link, valid URL | PASS (resolves and the lesson is created) |
| YouTube link, invalid URL | PASS (rejected HTTP 400, clear error, not silent) |
| File upload, oversize (30 MB) | PASS (rejected HTTP 413) |
| File upload, corrupted / unsupported | PASS (rejected HTTP 422) |
| File upload, no file attached | PASS (rejected HTTP 400) |
| Content appears in student view | PASS (published lessons surface to enrolled students by environment) |

Note: the upload form field name is `video`.

### 2. Class load at 30 students

| Case | Result |
| --- | --- |
| Teacher roster load | PASS (about 0.8 s for 30 students) |
| Roster pagination | PASS (page sizes verified, for example 20 then 10) |
| Savings goal aggregation | PASS |
| Class leaderboard with 30 students | PASS |
| Class analytics | PASS |
| UI: dashboard, class detail roster, savings progress bars, student detail dialog | PASS in BOTH light and dark mode, readable contrast, no broken layout or truncation |

### 3. Org-admin at realistic volume

| Case | Result |
| --- | --- |
| Organization overview | PASS |
| Teachers: list, edit, remove | PASS |
| Teacher password reset | PASS |
| Classes: list and reassign (valid and error paths) | PASS |
| Student table pagination | PASS |
| Report PDF export | PASS |
| Org engagement summary (AI) | FIXED (see Fix 2) |

### 4. No silent database-write failures

Writes in these flows now throw clear, catchable errors instead of failing silently.
The two silent-delete defects that violated this rule were found and corrected (Fix 1).

### 5. Light and dark mode

Teacher dashboard and the 30-student class detail page were driven in a real browser in
both themes. Roster, savings progress bars, badges, and the student detail dialog all
render with readable contrast and intact layout in dark mode (no invisible text, no
white-on-white). PASS.

## Bugs found and fixed (each re-verified after the fix)

1. **Silent deletes.** Deleting a non-existent class and removing a student who was not
   enrolled both returned `200 {ok:true}` while doing nothing. The storage layer now
   checks rows affected and throws; the two teacher delete routes return `404` with a
   clear message. Verified: both now return `404`, real deletes still succeed.

2. **Org engagement summary returned 500.** Two causes: the Anthropic SDK was built with
   no API key or base URL, and the model `claude-3-5-haiku-20241022` is no longer
   supported by the AI gateway (the gateway now returns `400 "not supported"`). Fixed by
   passing the gateway credentials and switching to `claude-sonnet-4-6`. Verified: now
   returns `200` with a real summary.

3. **Student feedback was completely broken (database schema drift).** The live
   `student_feedback` table was missing the `org_id` column that the committed schema
   already declares, so every feedback write failed with `column "org_id" does not
   exist`, and the read route hung because it had no error handling. Fixed by aligning
   the live database with the committed schema (`ALTER TABLE student_feedback ADD COLUMN
   IF NOT EXISTS org_id text`) and wrapping both feedback read routes in error handling.
   Verified: write returns `200`, read returns `200` in about 0.2 s.

4. **Admin assistant chat used the same dead model.** `/api/admin/help-chat` also used
   the unsupported `claude-3-5-haiku-20241022`. Switched to `claude-sonnet-4-6`.
   Verified: now returns `200` with a real reply.

5. **Org auto-enrol had no error capture.** The non-blocking org auto-enrol on
   join-class only logged a warning. Added error capture while keeping it non-blocking,
   so failures are observable.

## Items flagged and held (not blockers)

- **Org-admin browser screenshots were not captured.** Logging into the org dashboard in
  the browser test would require placing the founder admin credentials into a test
  subagent, which was avoided for security. The org endpoints were fully exercised via
  the API at volume, and the org pages use the same theme tokens that were visually
  verified in both light and dark mode on the teacher side.
- **Minor UI nit:** on the teacher sidebar, a nested link intercepts the click on the
  Dashboard button, so direct navigation was needed during testing. Low severity, no
  data impact.

## Database change applied to the live database

`ALTER TABLE student_feedback ADD COLUMN IF NOT EXISTS org_id text`. This is
non-destructive (a nullable column already declared in the committed schema) and aligns
the live database with the code. It applies to the shared Supabase instance, which is
also production.

## Cleanup

All QA test data was removed and verified: 0 QA students, 0 `QALOAD` class, 0 second
teacher, demo teacher org link reverted to null, 0 leftover feedback rows. Typecheck is
clean. The architect review of the fixes returned "safe to ship".
