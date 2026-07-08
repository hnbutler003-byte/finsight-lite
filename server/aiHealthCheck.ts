import Anthropic from "@anthropic-ai/sdk";
import { reportAiFailure } from "./aiFailure";

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
  }
  return _client;
}

async function pingAnthropic(): Promise<void> {
  const resp = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16,
    messages: [{ role: "user", content: "Reply with one word: ok" }],
  });
  if (!resp.content || resp.content.length === 0) {
    throw new Error("Anthropic returned an empty response");
  }
}

export interface AiHealthResult {
  anthropicOk: boolean;
  durationMs: number;
}

export async function runAiHealthCheck(triggeredBy = "scheduler"): Promise<AiHealthResult> {
  const start = Date.now();
  let anthropicOk = false;

  try {
    await pingAnthropic();
    anthropicOk = true;
  } catch (e) {
    const durationMs = Date.now() - start;
    const msg = `AI health check failed: Anthropic -- ${(e as Error).message}`;
    reportAiFailure("ai_health_check", e, { job: "ai-health-check", triggeredBy });
    throw new Error(`AI health check: 1 failure in ${durationMs}ms:\n${msg}`);
  }

  const durationMs = Date.now() - start;
  console.log(`[ai-health-check] All AI features healthy (anthropic) in ${durationMs}ms (triggeredBy=${triggeredBy})`);
  return { anthropicOk, durationMs };
}
