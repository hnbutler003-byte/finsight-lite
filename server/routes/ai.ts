import { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { openai } from "../replit_integrations/chat/routes";
import { enqueueJob, listRecentJobs } from "../jobs";
import {
  reserveQuota,
  finalizeUsage,
  releaseReservation,
  recordCachedUsage,
  quotaErrorMessage,
  hashTutorQuestion,
  getCachedExplanation,
  setCachedExplanation,
  getOrgUsageToday,
  getOrgUsageThisMonth,
  getOrgQuotaSettings,
  updateOrgQuotaSettings,
} from "../aiUsage";
import { audit } from "../audit";
import { db as emailDb } from "../db";
import { aiUsageEvents } from "@shared/schema";
import { lt as ltDrizzle, sql as sqlEmail } from "drizzle-orm";
import { getStudentOrgIds } from "../supabase";
import { isAdmin, isOrgAdmin, ADMIN_EMAIL } from "./auth";
import fs from "fs";
import * as nodePath from "path";
import Anthropic from "@anthropic-ai/sdk";

const examUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, and PNG files are supported"));
    }
  },
});

const GUIDE_MODEL = "claude-sonnet-4-6";
let _guideClient: Anthropic | null = null;
function getGuideClient(): Anthropic {
  if (!_guideClient) {
    _guideClient = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
  }
  return _guideClient;
}

export function classifyAiAccess(username: string, orgIds: string[]): "enrolled" | "guest" | "qa_test" {
  if (
    username.startsWith("qa_s") ||
    /^tester/i.test(username) ||
    username.startsWith("Td")
  ) {
    return "qa_test";
  }
  if (orgIds.length === 0) return "guest";
  return "enrolled";
}

export const AI_BLOCKED_MSG: Record<"guest" | "qa_test", string> = {
  guest:
    "AI features are available to students enrolled through their school. Ask your teacher for a join code to unlock them.",
  qa_test: "AI features are not available on test accounts.",
};

export async function registerAiRoutes(app: Express): Promise<void> {

  // AI Insights
  app.get("/api/ai/insights", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;

      const orgIds = await getStudentOrgIds(userId).catch(() => [] as string[]);
      const orgId = orgIds[0] ?? null;
      const accessTier = classifyAiAccess((req.user as any).username ?? "", orgIds);
      if (accessTier !== "enrolled") {
        return res.status(403).json({ message: AI_BLOCKED_MSG[accessTier], blocked: true });
      }

      const model = "gpt-4o-mini";
      const reservation = await reserveQuota({ userId, orgId, kind: "ai_insights", model });
      if (!reservation.ok) {
        return res.status(429).json({ message: quotaErrorMessage(reservation), quota: reservation });
      }
      let finalized = false;
      try {

      const transactions = await storage.getTransactions(userId, { limit: 100 });
      const budgets = await storage.getBudgets(userId);
      const selectedCurrency = req.query.currency as string || "BSD";
      
      const prompt = `Analyze this user's financial data.
      Current Currency Context: ${selectedCurrency}
      
      Transactions: ${JSON.stringify(transactions.map(t => ({ amount: t.amount, currency: t.currency, category: t.category?.name })))}
      Budgets: ${JSON.stringify(budgets.map(b => ({ amount: b.amount, category: b.category?.name })))}
      
      Please provide:
      1. Smart Insights: Analyze spending patterns and budget adherence.
      2. Currency Insights: 
         - Mention the current approximate exchange rate of ${selectedCurrency} to USD (use your internal knowledge of typical regional rates).
         - Provide specific advice for users holding ${selectedCurrency} (e.g., inflation concerns, regional travel tips, or import costs).
         - Suggest how to optimize spending based on the ${selectedCurrency} value.

      Format the response as a JSON object with three keys:
      - "spendingInsights": Array of { "title": string, "behavior": string, "suggestion": string }
      - "currencyInsights": Array of { "title": string, "content": string, "impact": "positive" | "neutral" | "negative", "rate": string }
      - "newsClippings": Array of { "source": string, "headline": string, "summary": string, "url": string }
      
      For "currencyInsights", the "rate" field should show the numerical exchange rate formatted like: "1 ${selectedCurrency} : X USD". Keep the "content" very brief.
      For "newsClippings", provide 2-3 current financial news items from reputable sources strictly relevant to ${selectedCurrency}'s country.
      Sources by Currency:
      - BSD: http://www.tribune242.com/, http://www.thenassauguardian.com/, http://ewnews.com/, http://znsbahamas.com/
      - JMD: http://jamaica-gleaner.com/, http://www.jamaicaobserver.com/
      - TTD: http://newsday.co.tt/, http://trinidadexpress.com/
      - BBD: http://barbadostoday.bb/, http://www.nationnews.com/
      - XCD: http://oecsbusinessfocus.com/, http://caribbeannewsglobal.com/
      - GYD: http://guyanachronicle.com/, http://www.stabroeknews.com/
      - HTG: http://lenouvelliste.com/, http://juno7.ht/
      - USD: http://www.caribbeanjournal.com/, http://www.cnbc.com/
      
      IMPORTANT: Only use sources from the list above that match the ${selectedCurrency}. Ensure the "url" field is the EXACT home page URL provided above. For the "source" field, use clean names like "The Tribune", "The Nassau Guardian", "Eyewitness News", or "ZNS Bahamas". Always link directly to the main home page to ensure the link works.
      
      Keep the tone helpful and Caribbean-focused.`;

      const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "system", content: "You are a senior financial advisor specializing in Caribbean economies and personal finance." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      await finalizeUsage(reservation.reservationId, {
        tokensIn: response.usage?.prompt_tokens ?? 0,
        tokensOut: response.usage?.completion_tokens ?? 0,
      });
      finalized = true;

      const content = response.choices[0].message.content || "{}";
      res.json(JSON.parse(content));
      } finally {
        if (!finalized) await releaseReservation(reservation.reservationId);
      }
    } catch (err: any) {
      console.error("AI Insight error:", err?.message || "Unknown error");
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // === MONEYLAB ROUTES ===
  app.post("/api/moneylab/upload", isAuthenticated, examUpload.single("file"), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const title = req.body.title || file.originalname.replace(/\.[^/.]+$/, "");
      const subject = req.body.subject || "General";
      const ext = path.extname(file.originalname).toLowerCase();

      const paper = await storage.createExamPaper({
        userId,
        title,
        subject,
        fileName: file.originalname,
        fileType: ext.replace(".", ""),
      });

      const job = await enqueueJob({
        kind: "extract-paper",
        ownerId: userId,
        payload: {
          paperId: paper.id,
          fileB64: file.buffer.toString("base64"),
          ext,
          subject,
        },
      });

      res.json({ paper, jobId: job.id, message: "Processing..." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/moneylab/papers", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const papers = await storage.getExamPapers(userId);
      res.json(papers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // SECURITY: admin-only. Exposes all students' papers; must not be accessible to students.
  app.get("/api/moneylab/papers/all", isAdmin, async (req, res) => {
    try {
      const { examPapers } = await import("@shared/schema");
      const { db } = await import("../db");
      const { eq, desc } = await import("drizzle-orm");
      const rawLimit = Number(req.query.limit);
      const rawOffset = Number(req.query.offset);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 50;
      const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
      const allPapers = await db.select().from(examPapers).where(eq(examPapers.status, "completed")).orderBy(desc(examPapers.createdAt)).limit(limit).offset(offset);
      res.json(allPapers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // SECURITY: ownership enforced. Students may only fetch their own paper.
  app.get("/api/moneylab/papers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const paper = await storage.getExamPaper(parseInt(req.params.id));
      if (!paper) return res.status(404).json({ message: "Paper not found" });
      if (paper.userId !== userId) return res.status(403).json({ message: "Forbidden" });
      const questions = await storage.getQuestionsByPaper(paper.id);
      res.json({ paper, questions });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/moneylab/papers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.deleteExamPaper(parseInt(req.params.id), userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/moneylab/games/submit", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { paperId, mode, score, totalQuestions, correctAnswers, timeSpent } = req.body;

      if (!mode || score === undefined || !totalQuestions || correctAnswers === undefined) {
        return res.status(400).json({ message: "Missing required game data" });
      }

      const baseXp = correctAnswers * 10;
      const modeBonus = mode === "challenge" ? 1.5 : mode === "timed" ? 1.25 : 1;
      const accuracyBonus = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 20) : 0;
      const xpEarned = Math.round(baseXp * modeBonus + accuracyBonus);

      const session = await storage.createGameSession({
        userId,
        paperId: paperId || null,
        mode,
        score,
        totalQuestions,
        correctAnswers,
        timeSpent: timeSpent || null,
        xpEarned,
      });

      const currentXp = await storage.getUserXp(userId);
      const newTotalXp = currentXp.totalXp + xpEarned;
      const newLevel = Math.floor(newTotalXp / 100) + 1;

      const now = new Date();
      const lastPlayed = currentXp.lastPlayedAt ? new Date(currentXp.lastPlayedAt) : null;
      let newStreak = currentXp.currentStreak;
      if (lastPlayed) {
        const todayStr = now.toISOString().slice(0, 10);
        const lastStr = lastPlayed.toISOString().slice(0, 10);
        if (todayStr === lastStr) {
          newStreak = currentXp.currentStreak;
        } else {
          const lastDate = new Date(lastStr);
          const todayDate = new Date(todayStr);
          const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            newStreak = currentXp.currentStreak + 1;
          } else {
            newStreak = 1;
          }
        }
      } else {
        newStreak = 1;
      }
      const longestStreak = Math.max(currentXp.longestStreak, newStreak);

      await storage.updateUserXp(userId, {
        totalXp: newTotalXp,
        level: newLevel,
        currentStreak: newStreak,
        longestStreak,
        lastPlayedAt: now,
      });

      const { cacheInvalidate } = await import("../cache");
      cacheInvalidate("moneylab:leaderboard:");

      const earnedBadges: string[] = [];
      const allSessions = await storage.getGameSessions(userId);
      const existingBadges = await storage.getUserBadges(userId);
      const hasBadge = (id: string) => existingBadges.some(b => b.badgeId === id);

      const badgeChecks = [
        { id: "first_game", condition: allSessions.length >= 1, label: "First Steps" },
        { id: "ten_games", condition: allSessions.length >= 10, label: "Game Veteran" },
        { id: "perfect_score", condition: correctAnswers === totalQuestions && totalQuestions >= 5, label: "Perfect Score" },
        { id: "streak_3", condition: newStreak >= 3, label: "On Fire" },
        { id: "streak_7", condition: newStreak >= 7, label: "Week Warrior" },
        { id: "level_5", condition: newLevel >= 5, label: "Rising Star" },
        { id: "level_10", condition: newLevel >= 10, label: "Money Master" },
        { id: "xp_500", condition: newTotalXp >= 500, label: "XP Hunter" },
        { id: "xp_1000", condition: newTotalXp >= 1000, label: "XP Legend" },
        { id: "challenge_win", condition: mode === "challenge" && correctAnswers >= totalQuestions * 0.8, label: "Challenge Champion" },
        { id: "speed_demon", condition: mode === "timed" && timeSpent && timeSpent < totalQuestions * 10, label: "Speed Demon" },
      ];

      for (const check of badgeChecks) {
        if (check.condition && !hasBadge(check.id)) {
          await storage.addUserBadge({ userId, badgeId: check.id });
          earnedBadges.push(check.id);
        }
      }

      res.json({
        session,
        xpEarned,
        totalXp: newTotalXp,
        level: newLevel,
        streak: newStreak,
        newBadges: earnedBadges,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/moneylab/xp", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const xp = await storage.getUserXp(userId);
      const badges = await storage.getUserBadges(userId);
      const sessions = await storage.getGameSessions(userId);
      res.json({ xp, badges, totalGames: sessions.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/moneylab/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const period = (req.query.period as string) || "all";
      const rawLimit = Number(req.query.limit);
      const rawOffset = Number(req.query.offset);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 20;
      const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
      const { cached } = await import("../cache");
      const leaderboard = await cached(
        `moneylab:leaderboard:${period}:${limit}:${offset}`,
        15_000,
        () => storage.getLeaderboard({ period, limit, offset }),
      );
      res.json(leaderboard);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/moneylab/tutor/explain", isAuthenticated, async (req, res) => {
    try {
      const { questionText, options, correctAnswer, subject } = req.body;
      const userId = (req.user as any).id;
      const userName = (req.user as any).firstName || "friend";

      if (!questionText) {
        return res.status(400).json({ message: "Question text is required" });
      }

      const orgIds = await getStudentOrgIds(userId).catch(() => [] as string[]);
      const orgId = orgIds[0] ?? null;
      const accessTier = classifyAiAccess((req.user as any).username ?? "", orgIds);
      if (accessTier !== "enrolled") {
        return res.status(403).json({ message: AI_BLOCKED_MSG[accessTier], blocked: true });
      }

      const model = "gpt-4o-mini";
      const modelVersion = `${model}-v1`;
      const questionHash = hashTutorQuestion({ questionText, options, correctAnswer, subject });

      const cached = await getCachedExplanation(questionHash, modelVersion);
      if (cached) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        const personalized = cached.split("[STUDENT_NAME]").join(userName);
        const chunkSize = 64;
        for (let i = 0; i < personalized.length; i += chunkSize) {
          res.write(`data: ${JSON.stringify({ content: personalized.slice(i, i + chunkSize) })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true, cached: true })}\n\n`);
        res.end();
        await recordCachedUsage({ userId, orgId, kind: "tutor_explain", model });
        return;
      }

      const reservation = await reserveQuota({ userId, orgId, kind: "tutor_explain", model });
      if (!reservation.ok) {
        return res.status(429).json({ message: quotaErrorMessage(reservation), quota: reservation });
      }
      let finalized = false;
      try {

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const NAME_PLACEHOLDER = "[STUDENT_NAME]";
      const systemPrompt = `You are an AI Tutor for Caribbean high school students (ages 14-18). 
You explain exam questions in simple, friendly language.

Your style:
- Warm, encouraging, like a helpful older sibling
- Use simple language, avoid jargon
- Give real-world Caribbean examples when possible
- Break complex concepts into digestible pieces
- Use analogies kids can relate to (food, sports, social media, gaming)
- Keep it concise (3-5 paragraphs max)
- End with a "Quick Tip" for remembering the concept

Format:
1. Start with "Hey ${NAME_PLACEHOLDER}!" as the greeting (use the literal string ${NAME_PLACEHOLDER}, do NOT substitute a name yourself).
2. Explain what the question is asking
3. Walk through why the correct answer is right
4. Briefly mention why other options are wrong
5. Give a real-world example
6. End with a memorable tip

IMPORTANT: Use the exact placeholder ${NAME_PLACEHOLDER} wherever you would address the student. Do not use any other names. Do not invent names.`;

      const questionContext = `Subject: ${subject || "General"}
Question: ${questionText}
${options ? `Options: ${options.join(", ")}` : ""}
${correctAnswer ? `Correct Answer: ${correctAnswer}` : ""}`;

      const stream = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please explain this exam question to me:\n\n${questionContext}` },
        ],
        stream: true,
        stream_options: { include_usage: true },
        max_completion_tokens: 1024,
        temperature: 0.7,
      });

      let fullContent = "";
      let pending = "";
      let promptTokens = 0;
      let completionTokens = 0;
      const PLACEHOLDER = "[STUDENT_NAME]";
      const HOLDBACK = PLACEHOLDER.length - 1;
      for await (const chunk of stream) {
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens ?? 0;
          completionTokens = chunk.usage.completion_tokens ?? 0;
        }
        const content = chunk.choices[0]?.delta?.content || "";
        if (!content) continue;
        fullContent += content;
        pending += content;
        if (pending.length > HOLDBACK) {
          const emit = pending.slice(0, pending.length - HOLDBACK).split(PLACEHOLDER).join(userName);
          pending = pending.slice(pending.length - HOLDBACK);
          if (emit) res.write(`data: ${JSON.stringify({ content: emit })}\n\n`);
        }
      }
      if (pending) {
        const emit = pending.split(PLACEHOLDER).join(userName);
        res.write(`data: ${JSON.stringify({ content: emit })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      await setCachedExplanation(questionHash, modelVersion, fullContent.trim());
      await finalizeUsage(reservation.reservationId, {
        tokensIn: promptTokens, tokensOut: completionTokens, model,
      });
      finalized = true;
      } finally {
        if (!finalized) await releaseReservation(reservation.reservationId);
      }
    } catch (err: any) {
      console.error("Tutor explain error:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Something went wrong" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: err.message });
      }
    }
  });

  app.get("/api/moneylab/history", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const sessions = await storage.getGameSessions(userId);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Money Guide AI Chat
  app.post("/api/guide/chat", isAuthenticated, async (req, res) => {
    try {
      const { messages: userMessages } = req.body;
      const userId = (req.user as any).id;
      const userName = (req.user as any).firstName || "friend";

      if (!Array.isArray(userMessages) || userMessages.length === 0) {
        return res.status(400).json({ message: "Messages are required." });
      }

      const validRoles = new Set(["user", "assistant"]);
      const sanitizedMessages = userMessages
        .filter((m: any) => m && typeof m.content === "string" && m.content.trim().length > 0 && validRoles.has(m.role))
        .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 4000) }));

      if (sanitizedMessages.length === 0) {
        return res.status(400).json({ message: "No valid messages provided." });
      }

      const orgIds = await getStudentOrgIds(userId).catch(() => [] as string[]);
      const orgId = orgIds[0] ?? null;
      const accessTier = classifyAiAccess((req.user as any).username ?? "", orgIds);
      if (accessTier !== "enrolled") {
        return res.status(403).json({ message: AI_BLOCKED_MSG[accessTier], blocked: true });
      }

      const model = GUIDE_MODEL;

      const reservation = await reserveQuota({ userId, orgId, kind: "guide_chat", model });
      if (!reservation.ok) {
        return res.status(429).json({ message: quotaErrorMessage(reservation), quota: reservation });
      }
      let finalized = false;
      try {

      const systemPrompt = `You are "Money Guide," FinSight Lite's financial mentor for students aged 12 to 17 in The Bahamas and the Caribbean.

TONE AND APPROACH:
- Think of yourself as a knowledgeable older sibling or cousin who has actually studied finance and wants to share what they know
- Warm and approachable, but treat the student as capable of understanding real concepts
- Skip the cheerleading: no "Great question!" openers, no strings of exclamation marks
- Lightly humorous when it fits naturally, but default to calm, clear, and direct
- Caribbean-grounded: BSD currency, local prices, regional jobs and activities feel natural in your examples

The user's name is "${userName}".

WHAT YOU DO:
1. Help students understand saving, budgeting, goal-setting, and money decisions
2. Use real financial vocabulary. Introduce each term in context, then explain it in plain language right after.
3. Draw on Caribbean context: BSD prices, local wages, regional banks, real savings products available in The Bahamas
4. Show the math when it helps, keeping calculations visible and simple
5. Encourage both short-term and long-term thinking about money

CONCEPTS YOU TEACH:
- Saving vs spending, and why the gap between them matters
- Needs vs wants
- Budgeting and budget surplus (when income exceeds expenses, the surplus is yours to allocate)
- Compound interest: interest that itself earns interest, which makes starting early worth far more than starting later with more money
- Liquidity: how quickly and easily you can access your money, and why that matters differently for a savings goal versus an emergency fund
- Diversification: spreading money across different asset types to reduce the risk that one bad outcome wipes out your progress
- Stocks (ownership stakes in companies that can rise or fall in value) and bonds (loans to governments or companies that pay regular interest back)
- Fixed deposits and certificates of deposit
- Risk vs reward tradeoffs
- Goal-based saving strategies

RESPONSE STYLE:
- Lead with the substance. Do not open with a compliment on the question.
- Introduce financial terms naturally in context, then define them in plain language. For example: "compound interest, where the interest you earn itself starts earning interest, turns a $100 deposit at 5% per year into $162.89 after ten years rather than $150."
- Vary sentence length. Short sentences land key points. Longer ones connect ideas, show how a principle plays out over time, or walk through a calculation step by step.
- Use numbers tied to Caribbean life: BSD prices, local wages, things a student in Nassau or elsewhere in the Caribbean would actually spend money on
- When comparing two options, lay them out side by side so the tradeoff is clear
- End each response with a follow-up question, a practical suggestion, or a mini challenge. Vary which one you choose.
- Keep responses to 2 to 4 paragraphs unless a calculation or comparison genuinely needs more space

THINGS TO AVOID:
- "Great question!" and similar openers
- Multiple sentences of identical length back to back
- Replacing real financial terms with cutesy substitutes when the real term is worth knowing
- Guilt-based messaging about past spending
- Recommending real investments (this is educational only)
- More than two exclamation marks per response

If the user asks about FinSight Lite features:
- Money Games: practice financial decisions in a game format
- Investment Simulator: buy and sell virtual stocks and bonds to see how markets work
- Savings Goals: set and track specific savings targets
- Budgets: plan and monitor spending categories
- Learning Modules: structured lessons on money topics`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = getGuideClient().messages.stream({
        model,
        max_tokens: 1024,
        temperature: 0.8,
        system: systemPrompt,
        messages: sanitizedMessages,
      });

      let inputTokens = 0;
      let outputTokens = 0;
      for await (const event of stream) {
        if (event.type === "message_start") {
          inputTokens = event.message.usage.input_tokens;
        } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
        } else if (event.type === "message_delta") {
          outputTokens = event.usage.output_tokens;
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      await finalizeUsage(reservation.reservationId, {
        tokensIn: inputTokens, tokensOut: outputTokens, model,
      });
      finalized = true;
      } finally {
        if (!finalized) await releaseReservation(reservation.reservationId);
      }
    } catch (error) {
      console.error("Guide chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Something went wrong" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "Failed to get response" });
      }
    }
  });

  // === ORG ADMIN AI USAGE ===
  app.get("/api/org-admin/ai-usage", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    try {
      const usage = await getOrgUsageToday(admin.orgId);
      res.json(usage);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/org-admin/ai-usage-monthly", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    try {
      const usage = await getOrgUsageThisMonth(admin.orgId);
      res.json(usage);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/org-admin/ai-quotas", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    try {
      const settings = await getOrgQuotaSettings(admin.orgId);
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/org-admin/ai-quotas", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    try {
      const limitField = z.union([z.number().int().min(1).max(100000), z.null()]).optional();
      const QuotaPatch = z.object({
        guide_chat_per_user: limitField,
        tutor_explain_per_user: limitField,
        ai_insights_per_user: limitField,
        guide_chat_per_org: limitField,
        tutor_explain_per_org: limitField,
        ai_insights_per_org: limitField,
      }).strict();
      const parsed = QuotaPatch.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid quota values", errors: parsed.error.flatten() });
      }
      await updateOrgQuotaSettings(admin.orgId, parsed.data);
      const settings = await getOrgQuotaSettings(admin.orgId);
      await audit({ actorType: "org_admin", actorId: admin.id, actorEmail: admin.email, action: "org_admin.ai_quota.update", orgId: admin.orgId, meta: parsed.data, req });
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === ADMIN AI USAGE MAINTENANCE ===
  app.get("/api/admin/maintenance/ai-usage-stats", isAdmin, async (req, res) => {
    try {
      const rawDays = parseInt(String(req.query.olderThanDays ?? 180)) || 180;
      const cutoffDays = Math.max(30, rawDays);
      const cutoff = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);
      const [totalRow] = await emailDb.select({ n: sqlEmail<number>`count(*)::int` }).from(aiUsageEvents);
      const [purgeableRow] = await emailDb.select({ n: sqlEmail<number>`count(*)::int` }).from(aiUsageEvents).where(ltDrizzle(aiUsageEvents.createdAt, cutoff));
      res.json({ total: totalRow.n, purgeable: purgeableRow.n, cutoffDays, cutoffDate: cutoff.toISOString() });
    } catch (e) {
      res.status(500).json({ message: (e as Error).message });
    }
  });

  app.post("/api/admin/maintenance/purge-ai-usage", isAdmin, async (req, res) => {
    const olderThanDays = Math.max(1, parseInt(String((req.body as any)?.olderThanDays ?? 180)) || 180);
    const job = await enqueueJob({ kind: "purge-ai-usage", payload: { olderThanDays } });
    res.json({ jobId: job.id });
  });

  // === AI FEATURE HEALTH CHECK ===
  app.post("/api/admin/ai-health-check", isAdmin, async (_req, res) => {
    try {
      const job = await enqueueJob({ kind: "ai-health-check", payload: { triggeredBy: "admin" } });
      res.json({ jobId: job.id });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === PERFORMANCE AGENT ===
  app.post("/api/admin/perf-scan", isAdmin, async (_req, res) => {
    try {
      const job = await enqueueJob({ kind: "perf-scan", payload: { triggeredBy: "admin" } });
      res.json({ jobId: job.id });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/perf-reports", isAdmin, (_req, res) => {
    try {
      const dir = nodePath.join(process.cwd(), "agent-reports");
      if (!fs.existsSync(dir)) return res.json([]);
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith(".md"))
        .sort()
        .reverse()
        .slice(0, 30)
        .map(f => {
          const stat = fs.statSync(nodePath.join(dir, f));
          return { name: f, sizeBytes: stat.size, createdMs: stat.mtimeMs };
        });
      res.json(files);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/perf-reports/:filename", isAdmin, (req, res) => {
    try {
      const safe = nodePath.basename(req.params.filename);
      if (!safe.endsWith(".md")) return res.status(400).json({ message: "Invalid filename" });
      const filePath = nodePath.join(process.cwd(), "agent-reports", safe);
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Report not found" });
      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ name: safe, content });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin Help Chat: powered by Anthropic Claude
  app.post("/api/admin/help-chat", isAdmin, async (req, res) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Messages are required." });
      }

      const validRoles = new Set(["user", "assistant"]);
      const sanitized = messages
        .filter((m: any) => m && typeof m.content === "string" && m.content.trim().length > 0 && validRoles.has(m.role))
        .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 4000) }));

      if (sanitized.length === 0) {
        return res.status(400).json({ message: "No valid messages provided." });
      }

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new Anthropic({
        apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
      });

      const systemPrompt = `You are the FinSight Lite Admin Assistant, a knowledgeable, concise helper for platform administrators.

FinSight Lite is a financial literacy learning simulator for Caribbean youth (ages 10–17), helping them learn about money, saving, budgeting, and investing using virtual currency and interactive tools.

YOUR ROLE:
Help administrators navigate and use the platform confidently. Be direct, practical, and friendly. Keep answers concise (2–4 short paragraphs max).

KEY ADMIN FEATURES YOU CAN HELP WITH:

1. ORGANIZATIONS & SCHOOLS
   - Organizations represent schools or institutions. Each org can have multiple schools, teachers, and student cohorts.
   - Admins can create, edit, and deactivate organizations and schools from the Organizations/Schools tabs.

2. STUDENT MANAGEMENT
   - View all students across all orgs, search by name or school, export data as CSV.
   - Students use passwordless avatar-based login, no email or password required.
   - Admins can reset student progress, view virtual balances, XP, and badges.

3. TEACHER ACCOUNTS
   - Teachers log in with email and password. Admins can create, edit, reset passwords, and deactivate teacher accounts.
   - Teachers manage their own classrooms, assign challenges, and track student progress.

4. CLASSES & CHALLENGES
   - Classes group students under a teacher. Challenges are financial tasks teachers assign to classes.
   - Admins have read access to all classes and can manage challenges globally.

5. LEARNING & LESSON MANAGEMENT
   - Lessons and modules are managed via Supabase-backed content tables. Static content seeds automatically on startup.
   - The MoneyLab feature lets students upload exam papers and get AI-generated quizzes and explanations.

6. ANALYTICS & REPORTS
   - The Reports tab provides exportable summaries of student activity, AI usage, and org-level engagement.
   - The Audit Log records all admin actions with timestamps and IP addresses.
   - The Perf Agent tab runs automated performance scans of the codebase.

7. STUDENT PROGRESS TRACKING
   - View XP earned, badges unlocked, learning module completion, and virtual portfolio performance per student.
   - Leaderboard snapshots are stored in Supabase for historical comparison.

8. BACKGROUND JOBS & DB VIEWER
   - The Jobs tab shows background task status (AI scans, digest emails, data purges).
   - The DB Viewer lets admins inspect raw database tables (up to 500 rows).

9. SPONSORS
   - Sponsors can be associated with organizations to support platform access.

Always answer based on these features. If an admin asks about something outside your knowledge, say so honestly and suggest they check the developer documentation or contact the platform team.`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: sanitized,
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      res.json({ reply: text });
    } catch (e: any) {
      console.error("Admin help chat error:", e.message);
      res.status(500).json({ message: "Failed to get a response. Please try again." });
    }
  });
}
