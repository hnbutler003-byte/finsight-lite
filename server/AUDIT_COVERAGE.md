# Audit log coverage

This document lists the privileged actions instrumented with `audit(...)`
(see `server/audit.ts`) and explicitly notes the actions called out in
task #30's "Done looks like" that do **not** apply to this codebase.

## Covered actions

### admin (super admin)
- `admin.login.success` / `admin.login.failure`
- `admin.school.create` / `admin.school.update` / `admin.school.delete`
- `admin.sponsor.create` / `admin.sponsor.update` / `admin.sponsor.delete`
- `admin.lesson.publish`
- `admin.teacher.org_link.update`
- `admin.class.org_link.update`
- `admin.organization.create` / `admin.organization.update`

### org_admin
- `org_admin.account.created` (password + Google sign-in flows; the
  closest equivalent to "promote user to admin"; see note below)
- `org_admin.ai_quota.update`
- `org_admin.branding.update`
- `org_admin.student.remove`
- `org_admin.lesson.publish`
- `org_admin.bulk_import.commit`

### teacher
- `teacher.class.create` / `teacher.class.update` / `teacher.class.delete`
- `teacher.class.student.remove`

## Actions in the task spec that do not exist in this codebase

The task description lists three example mutations that have no
corresponding route in this codebase as of task #30; they are noted
here so future contributors who add them know to wire `audit(...)`:

| Spec example                    | Status in repo              | Where to add audit when implemented |
|---------------------------------|-----------------------------|-------------------------------------|
| Promote / demote a staff user   | No such endpoint exists.    | Whatever `PATCH /api/admin/...role` route is added. |
| Reset a student's password      | No such endpoint exists.    | Whatever `POST /api/teacher/students/:id/reset-password` route is added. |
| Reset a staff user's password   | No such endpoint exists.    | Whatever password-change/reset route is added. |

The closest existing privileged role grant is org-admin self-signup
via a join code, which **is** audited as `org_admin.account.created`.

## Conventions

- Actor types: `admin` | `org_admin` | `teacher` (extend as needed).
- Action names: `<actor>.<resource>.<verb>` (lowercase, dot-separated).
- `meta` is JSONB; store only non-PII context useful for forensics
  (record ids, before/after diffs of non-sensitive fields, source
  flag like `via: "google+joinCode"`).
- Failures should be best-effort: `audit()` swallows its own errors so
  it never breaks the user-facing request.
