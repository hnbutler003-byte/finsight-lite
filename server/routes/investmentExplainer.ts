import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { getCachedExplanation, setCachedExplanation } from "../aiUsage";
import { db } from "../db";
import { simulatedStocks } from "@shared/schema";
import { eq } from "drizzle-orm";

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

function hashStockExplainer(ticker: string, price: string, changePct: string): string {
  const key = `invest-explainer:${ticker}:${price}:${changePct}`;
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function getStockExplainer(stockId: number): Promise<string | null> {
  const [stock] = await db.select().from(simulatedStocks).where(eq(simulatedStocks.id, stockId)).limit(1);
  if (!stock) return null;

  const changePct = parseFloat((stock.priceChangePct as string) ?? "0");
  if (changePct === 0 || stock.previousPrice === null || stock.previousPrice === undefined) return null;

  const hash = hashStockExplainer(
    stock.ticker,
    stock.currentPrice as string,
    (stock.priceChangePct as string) ?? "0",
  );

  const cached = await getCachedExplanation(hash, MODEL);
  if (cached) return cached;

  const direction = changePct > 0 ? "up" : "down";
  const absPct = Math.abs(changePct).toFixed(2);
  const sym = stock.currency;
  const prevFormatted = parseFloat(stock.previousPrice as string).toFixed(2);
  const currFormatted = parseFloat(stock.currentPrice as string).toFixed(2);

  const prompt = `You are a friendly financial literacy teacher helping Caribbean high school students understand investing.

The simulated ${stock.type} "${stock.name}" (${stock.ticker}) moved ${direction} by ${absPct}% today.
Previous price: ${sym} ${prevFormatted}. New price: ${sym} ${currFormatted}.
Risk level: ${stock.riskLevel}. Region: ${stock.region ?? "Caribbean"}.

In 2-3 short sentences, explain to a student WHY a ${stock.type} like this might move ${direction} by about ${absPct}% in a day. Be specific to this type of company or government instrument. Use simple, friendly language and mention one real-world Caribbean factor (for example: tourism, energy prices, interest rates, or weather). Do not use em dashes. Keep your answer under 60 words.`;

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text.trim() : null;
    if (!text || text.length < 20) return null;

    await setCachedExplanation(hash, MODEL, text);
    return text;
  } catch (err) {
    console.error("[investmentExplainer] Anthropic error:", (err as Error).message);
    return null;
  }
}
