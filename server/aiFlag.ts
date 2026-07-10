/**
 * Central AI feature flag.
 *
 * Set AI_FEATURES_ENABLED=true in the environment to re-enable all AI
 * features. When the variable is absent or set to any other value, AI is
 * disabled and no Anthropic API calls are attempted.
 *
 * To restore full functionality: set AI_FEATURES_ENABLED=true. No code
 * changes are required.
 */
export function isAiEnabled(): boolean {
  return process.env.AI_FEATURES_ENABLED === "true";
}

export const AI_DISABLED_MESSAGE =
  "This feature is available for Finsight Lite organizations on a paid plan. Reach out to learn more.";
