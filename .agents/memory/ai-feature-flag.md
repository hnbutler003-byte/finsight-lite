---
name: AI feature flag
description: How the AI_FEATURES_ENABLED flag is structured and where each gate lives
---

# AI Feature Flag

## The rule
`server/aiFlag.ts` exports `isAiEnabled()` (returns `process.env.AI_FEATURES_ENABLED === "true"`) and `AI_DISABLED_MESSAGE`. All AI gating flows through these two exports -- nothing duplicated per feature.

**Why:** Anthropic account was out of credits; needed a single switch to disable all AI calls without touching AI logic. Single source makes re-enabling trivial.

**How to apply:**
- Server routes: add `if (!isAiEnabled()) return res.status(503).json({ message: AI_DISABLED_MESSAGE, disabled: true });` at the top of each AI handler, before any quota or Anthropic call.
- Non-route helpers (e.g. getStockExplainer): `if (!isAiEnabled()) return null;` as first line.
- Frontend: `useAiStatus()` hook (`client/src/hooks/use-ai-status.ts`) queries `GET /api/ai/status`; destructure as `const { enabled: aiEnabled } = useAiStatus()` and gate JSX/fetches accordingly.
- Default is false (flag off). Flip to true with no code changes needed.

## Gated surfaces (as of initial implementation)
- `GET /api/ai/status` -- new endpoint, returns `{ enabled: boolean }`
- `GET /api/ai/insights` -- spending tips (Dashboard Smart Money Tips)
- `POST /api/moneylab/tutor/explain` -- AI Tutor
- `POST /api/guide/chat` -- Money Guide chatbot
- `getStockExplainer()` in investmentExplainer.ts -- investment explainer
- UI: MoneyGuide disabled card, Dashboard tips disabled card, Lessons AI Tutor prompt hidden
