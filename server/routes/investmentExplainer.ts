import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { getCachedExplanation, setCachedExplanation } from "../aiUsage";
import { db } from "../db";
import { simulatedStocks } from "@shared/schema";
import { eq } from "drizzle-orm";

const MODEL = "claude-sonnet-4-6";

const TICKER_CONTEXT: Record<string, string> = {
  CBL: "Commonwealth Bank is the largest locally-owned commercial bank in the Bahamas, providing mortgages, personal loans, and business credit to thousands of Bahamian families. Its stock moves with interest rate changes set by the Central Bank of the Bahamas and consumer confidence in the housing market.",
  FCL: "FOCOL Holdings is the Bahamas' largest fuel distributor, supplying gasoline, diesel, and aviation fuel to resorts, marinas, and households across the islands. Its profits track directly with tourism volumes and global oil prices, so a busy cruise season or a spike in jet fuel costs both move this stock.",
  CAB: "Cable Bahamas was the first company to bring broadband internet and cable TV to the Bahamas. Its revenue depends on how many households and businesses subscribe each month. Competition from streaming services and rival internet providers can pressure its stock downward.",
  DHS: "Doctors Hospital Health System is the leading private healthcare provider in New Providence, the Bahamas. It earns revenue from patient visits, surgeries, and diagnostic services. Stock movements can reflect insurance payout rates, medical tourism demand, and changes in healthcare spending by Bahamians.",
  JSJ: "J.S. Johnson and Company is one of the oldest and largest insurance companies in the Bahamas, offering general and life insurance products. Its stock is directly affected by hurricane and tropical storm seasons, which drive up claim payouts and can reduce profits.",
  CHB: "Colina Holdings (Bahamas) is a financial services conglomerate offering life insurance, pension management, and investment products. As more Bahamians plan for retirement through pension funds, demand for Colina's services grows, which can lift its stock price.",
};

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

  const tickerContext = TICKER_CONTEXT[stock.ticker] ?? "";

  const prompt = `You are a friendly financial literacy teacher helping Caribbean high school students understand investing.

${tickerContext ? `About this company: ${tickerContext}` : ""}

The simulated ${stock.type} "${stock.name}" (${stock.ticker}) moved ${direction} by ${absPct}% today.
Previous price: ${sym} ${prevFormatted}. New price: ${sym} ${currFormatted}.
Risk level: ${stock.riskLevel}. Region: ${stock.region ?? "Caribbean"}.

In 2-3 short sentences, explain to a student WHY this specific company's stock might move ${direction} by about ${absPct}% in a day. Use the company context above to give a specific, real Caribbean reason. Use simple, friendly language. Do not use em dashes. Keep your answer under 65 words.`;

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
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
