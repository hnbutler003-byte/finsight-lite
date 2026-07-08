---
name: AI error sanitation contract
description: How AI provider failures must be surfaced to users and Sentry
---

Rule: no raw Anthropic/OpenAI error text may ever reach a client response. All AI catch blocks go through the shared helper (reportAiFailure / respondAiFailure) which logs the raw detail server-side and returns friendly on-brand copy.

**Why:** a student once saw a raw provider "credit balance" error in the AI Tutor. School-facing product; raw provider errors leak billing/internal terms.

**How to apply:**
- Sentry alert rule keys off tags `ai_failure=true` + `ai_feature=<name>` — keep these tag names stable when touching the helper.
- `res.locals.sentryCaptured = true` suppresses the synthetic HTTP-5xx capture in the request-finish hook; set it whenever a handler already captured its own error, or events double.
- SSE contract: on mid-stream failure the server emits `data: {"error": "<friendly text>"}` and ends; SSE clients must branch on `data.error` and display it (silent-ignore means blank UI).
- Intentional pass-throughs that must keep flowing verbatim to users: 403 org-quota-blocked and 429 daily-limit messages (checked before streaming starts).
- Known non-AI residuals (deliberately out of scope): storage-stream and several students.ts DB catches still return err.message.
