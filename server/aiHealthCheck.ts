import Anthropic from "@anthropic-ai/sdk";
import { captureError } from "./sentry";

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
    max_tokens: 4,
    messages: [{ role: "user", content: "ping" }],
  });
  if (!resp.content || resp.content.length === 0) {
    throw new Error("Anthropic returned an empty response");
  }
}

async function pingOpenAI(): Promise<void> {
  const { openai } = await import("./replit_integrations/chat/routes");
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 4,
    messages: [{ role: "user", content: "ping" }],
  });
  if (!resp.choices || resp.choices.length === 0) {
    throw new Error("OpenAI returned an empty response");
  }
}

export interface AiHealthResult {
  anthropicOk: boolean;
  openaiOk: boolean;
  durationMs: number;
}

export async function runAiHealthCheck(triggeredBy = "scheduler"): Promise<AiHealthResult> {
  const start = Date.now();
  const failures: string[] = [];
  let anthropicOk = false;
  let openaiOk = false;

  // Anthropic covers: MoneyLab tutor explain, investment explainer,
  // org AI summary, and admin help chat.
  try {
    await pingAnthropic();
    anthropicOk = true;
  } catch (e) {
    const msg = `AI health check failed: Anthropic (MoneyLab, investment explainer, org AI) -- ${(e as Error).message}`;
    failures.push(msg);
    captureError(new Error(msg), { job: "ai-health-check", feature: "anthropic", triggeredBy });
  }

  // OpenAI covers: MoneyGuide chat mentor.
  try {
    await pingOpenAI();
    openaiOk = true;
  } catch (e) {
    const msg = `AI health check failed: MoneyGuide (OpenAI) -- ${(e as Error).message}`;
    failures.push(msg);
    captureError(new Error(msg), { job: "ai-health-check", feature: "openai-moneyguide", triggeredBy });
  }

  const durationMs = Date.now() - start;

  if (failures.length > 0) {
    throw new Error(
      `AI health check: ${failures.length} failure(s) in ${durationMs}ms:\n${failures.join("\n")}`,
    );
  }

  console.log(`[ai-health-check] All AI features healthy (anthropic + openai) in ${durationMs}ms (triggeredBy=${triggeredBy})`);
  return { anthropicOk, openaiOk, durationMs };
}
