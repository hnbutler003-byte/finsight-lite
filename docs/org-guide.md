# FinSight Lite Org Admin Guide

This guide covers everything an Org Admin can do from the Org Admin portal. All details are drawn from the live application.

---

## 1. Getting Access

Your organisation must apply through the FinSight Lite application form. Once approved, you receive a portal invite by email. Use the link in that email to create your admin account at `/org/register`. You will need the organisation join code from the invite.

Fields required at registration: first name, last name, email address, password (minimum 6 characters), and the join code from your invite. No other information is collected at this stage.

After registration you land on the Org Admin dashboard at `/org/dashboard`.

---

## 2. Dashboard (`/org/dashboard`)

The dashboard is your home base. It shows:

**Stat cards** at the top: environment student count, org-wide student count, number of environments, and published lesson count.

**Join code panel**: the code students and teachers use to join your organisation. Copy it with the button and share it via email, WhatsApp, or your school LMS.

**Getting started checklist**: four steps that track your progress through the first-time setup. The checklist disappears once all steps are complete or you dismiss it.

**Monthly AI summary** (when available): a plain-language overview of this month's activity, generated automatically.

**AI usage today**: tokens consumed for Money Guide and AI Insights versus the daily org limit. Limits reset at midnight UTC.

**Email stats**: sent, opened, bounced, and failed counts for all platform emails.

**Environment breakdown**: per-environment student counts and join codes.

**Students table**: every student in the environment, searchable by name, with XP and lessons-completed columns.

---

## 3. Students (`/org/students`)

A full list of every student in your environment. Each row shows: avatar, display name, level badge, XP, streak, join date.

Use the search box to filter by name.

**Bulk import**: upload a CSV file to create multiple student accounts at once. The expected columns are: `first_name`, `last_name`, `email` (optional), `class_code` (optional). The platform previews the import so you can fix errors before committing. Students with errors are skipped; valid rows are created. Welcome emails are sent to any row that has an email address.

---

## 4. Teachers (`/org/teachers`)

Lists all teacher accounts in your organisation with their name, email, school name, and active class count.

**Invite a teacher**: click "Invite Teacher" and fill in: first name, last name, email, password, and school name. The teacher can then log in at `/teacher/login` with those credentials. You can also send teachers the org join code and they can self-register at `/teacher/register`.

---

## 5. Lessons (`/org/lessons`)

Create and manage lesson plans that appear in the Teacher Portal's Lessons tab and in student-facing learning content.

**Creating a lesson**: click "New Lesson". Fill in:
- Title (required)
- Description (required, shown on lesson cards)
- Video URL (optional, must be a YouTube embed URL)
- Content (rich text, supports multiple sections)
- Published or Draft status

A draft lesson is only visible to org admins. A published lesson is visible to teachers and students in your environment.

**Writing lesson body text**: separate distinct sub-topics with a blank line. The student lesson viewer renders each blank-line-separated paragraph as its own paragraph, so longer sections stay readable instead of appearing as one dense block.

**Previewing a lesson**: click the preview icon on any lesson card. The preview renders exactly as students will see it, using the student-facing design.

**Built-in lesson territory scoping**: lessons in the built-in Real Life Ready module are territory-specific. Students in a Bahamas environment see the Bahamas bank account, payslip and NIB, and investment accounts lessons; Jamaica environments see the Jamaica bank account and JAM-DEX lessons; Trinidad and Tobago environments see the T&T bank account and Know Your Money lessons. The avoiding scams lesson appears in every territory. This scoping applies only to built-in content; org lesson plans are always shown to your own environment.

**Built-in content localization**: the built-in Investing Fundamentals II module appears in every territory, but its wording adapts to your environment's currency. Stock exchange references (BISX, JSE, BSE, TTSE, ECSE) and the diversification examples match the territory; environments without a mapped exchange see generic phrasing instead.

**Built-in lesson diagrams**: some of FinSight's built-in core lessons (for example, in the Real Life Ready module) include embedded visual diagrams such as a payslip breakdown or an account opening flow. These diagrams are part of the built-in content only. They cannot be added to org lesson plans, and the lesson preview does not render them.

**Editing**: click the edit icon on any lesson card to update any field. Changes to published lessons are visible immediately.

**Deleting**: click the delete icon and confirm. Deletion is permanent.

---

## 6. Certificate Branding (`/org/branding`)

Upload your organisation's logo. This logo appears:
- In the student dashboard header
- On certificates of completion
- On the org admin portal

Supported formats: PNG and JPG. Recommended size: at least 200 x 200 pixels, square or near-square aspect ratio.

The logo is stored in cloud object storage. Old logo uploads are replaced automatically.

---

## 7. Common Questions

**A student cannot join the environment.**
Confirm you have shared the correct join code from the Dashboard page. Codes are case-sensitive. If a student says the code is not working, copy it fresh from the dashboard and share it again.

**A teacher cannot log in.**
Confirm the teacher's email and password were entered correctly when you invited them. Reset their password by removing their account from the Teachers page and re-inviting with a new password.

**AI features have stopped responding.**
Check the AI Usage Today cards on the dashboard. If the daily limit has been reached, features will resume at midnight UTC. Contact FinSight support if limits are consistently too low for your school's usage.

**A published lesson is not showing to students.**
Confirm the lesson status is "Published" (not "Draft") on the Lessons page. Confirm the student's environment matches the environment the lesson is assigned to.

**The branding logo is not updating.**
Try a hard refresh in the browser (Ctrl+Shift+R or Cmd+Shift+R). The logo is cached by the browser for performance; a hard refresh clears the cache.

**Students are not appearing in the bulk import.**
Open the preview step and check the error column. Common issues: missing first name, duplicate email, invalid class code. Fix the spreadsheet and re-upload.

---

## 8. Public Demo (`/demo`)

Anyone can try the Org Admin portal without an account. The public demo page at `/demo` has three views: Teacher, Student, and Org Admin. Clicking "Enter as Org Admin" opens the portal for a pre-loaded demonstration organisation with realistic students, AI usage, lessons, and certificate branding.

The demo session is strictly read-only: every page is browsable, but any attempt to change something (saving branding, creating a lesson, updating quotas) is blocked with a "read-only demo" message. A "Read-only demo" badge appears in the sidebar so you always know you are in the demo.

Use the Sign Out button in the sidebar to leave the demo.

---

## 9. Navigation Quick Reference

| Page | URL |
| --- | --- |
| Public demo (Teacher, Student, and Org Admin views) | `/demo` |
| Org admin registration | `/org/register` |
| Org admin login | `/org/login` |
| Dashboard | `/org/dashboard` |
| Students | `/org/students` |
| Teachers | `/org/teachers` |
| Lessons | `/org/lessons` |
| Certificate branding | `/org/branding` |
