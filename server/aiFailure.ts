import type { Response } from "express";
import { captureError } from "./sentry";

// Friendly, student-safe fallback copy for every AI-backed feature.
// These strings are shown directly in the UI, so they must never contain
// raw provider errors, request IDs, or internal terms.
export const AI_FRIENDLY_MESSAGES = {
  guide_chat: "Money Guide is taking a quick break. Please try again in a few minutes!",
  tutor_explain: "Your AI Tutor is taking a quick break. Please try again in a few minutes!",
  ai_insights: "Smart Insights are taking a quick break. Please check back in a few minutes.",
  admin_help_chat: "The assistant is temporarily unavailable. Please try again in a few minutes.",
} as const;

export type AiFeature = keyof typeof AI_FRIENDLY_MESSAGES;

// Report an AI provider failure to the server log and Sentry with a
// consistent tag set (ai_failure=true, ai_feature=<feature>) so a single
// Sentry alert rule can catch every Anthropic/OpenAI failure in the app.
export function reportAiFailure(feature: string, err: unknown, extra?: Record<string, unknown>): void {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[ai-failure] ${feature}:`, detail);
  captureError(
    err,
    { feature, alert: "ai_provider_failure", ...extra },
    { ai_failure: "true", ai_feature: feature },
  );
}

// Report the failure AND send a sanitized response to the client.
// Handles both plain JSON responses and SSE streams that already started.
export function respondAiFailure(res: Response, feature: AiFeature, err: unknown, extra?: Record<string, unknown>): void {
  reportAiFailure(feature, err, extra);
  // Tell the Sentry finish-hook this 5xx is already captured (avoids a
  // duplicate synthetic HTTP-5xx event for the same failure).
  res.locals.sentryCaptured = true;
  const friendly = AI_FRIENDLY_MESSAGES[feature];
  if (res.headersSent) {
    res.write(`data: ${JSON.stringify({ error: friendly })}\n\n`);
    res.end();
  } else {
    res.status(503).json({ message: friendly });
  }
}
