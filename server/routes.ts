import { Express } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import {
  ObjectStorageService,
  objectStorageClient,
} from "./replit_integrations/object_storage";

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Logo must be a PNG, JPG, WebP, or GIF image"));
    }
  },
});

const objectStorage = new ObjectStorageService();

import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerAudioRoutes } from "./replit_integrations/audio";
import { openai } from "./replit_integrations/chat/routes";
import { enqueueJob, getJob, listRecentJobs } from "./jobs";
import {
  checkQuota as checkAiQuota,
  recordUsage as recordAiUsage,
  quotaErrorMessage,
  hashTutorQuestion,
  getCachedExplanation,
  setCachedExplanation,
  getOrgUsageToday,
  getOrgQuotaSettings,
  updateOrgQuotaSettings,
} from "./aiUsage";
import { streamPrivateObjectToResponse } from "./jobHandlers";
import { isVeryfiConfigured, parseWithVeryfi } from "./veryfi";
import {
  supabase,
  initSupabaseTables,
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  getOrgEnvironments,
  createOrgEnvironment,
  getLeaderboard,
  upsertLeaderboardSnapshot,
  trackEvent,
  getLessonsByOrg,
  getPublishedLessons,
  getLessonWithQuestions,
  createLessonPlan,
  createLessonQuizQuestion,
  toggleLessonPublish,
  getStudentOrgIds,
  seedFinancialAcademyLesson,
  getOrgEnvironmentByJoinCode,
  getOrgEnvironmentById,
  enrollStudentInOrg,
  getPublishedLessonsByEnv,
  type Organization,
} from "./supabase";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.pdf', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, PDF, and Excel files are supported'));
    }
  }
});

const examUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are supported'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // Serve public assets stored in object storage (logos, etc.)
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    try {
      const filePath = req.params.filePath;
      const file = await objectStorage.searchPublicObject(filePath);
      if (!file) return res.status(404).json({ error: "Object not found" });
      await objectStorage.downloadObject(file, res, 60 * 60 * 24 * 30);
    } catch (err) {
      console.error("Error serving public object:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to serve object" });
      }
    }
  });

  // OpenAI integration routes
  registerChatRoutes(app);
  registerImageRoutes(app);
  registerAudioRoutes(app);

  // Protected API routes

  // Currency exchange rates (Caribbean pegged rates to USD)
  const EXCHANGE_RATES_TO_USD: Record<string, number> = {
    USD: 1,
    BSD: 1,        // Bahamian Dollar pegged 1:1 to USD
    BBD: 0.50,     // Barbadian Dollar pegged 2:1 to USD
    JMD: 0.0064,   // Jamaican Dollar ~156 JMD = 1 USD
    TTD: 0.147,    // Trinidad & Tobago Dollar ~6.8 TTD = 1 USD
    XCD: 0.37,     // East Caribbean Dollar pegged 2.70 XCD = 1 USD
    GYD: 0.0048,   // Guyanese Dollar ~209 GYD = 1 USD
    HTG: 0.0075,   // Haitian Gourde ~133 HTG = 1 USD
  };

  app.get("/api/currency/rates", isAuthenticated, (_req, res) => {
    res.json({ rates: EXCHANGE_RATES_TO_USD });
  });

  app.get("/api/stats/converted", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const baseCurrency = (req.query.baseCurrency as string) || "BSD";
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        period: req.query.period as 'monthly' | 'yearly',
      };

      const transactions = await storage.getTransactions(userId);
      const baseRate = EXCHANGE_RATES_TO_USD[baseCurrency] || 1;

      let totalIncome = 0;
      let totalExpenses = 0;
      const currencyBreakdown: Record<string, { income: number; expenses: number; count: number }> = {};

      for (const tx of transactions) {
        if (filters.startDate && new Date(tx.date) < new Date(filters.startDate)) continue;
        if (filters.endDate && new Date(tx.date) > new Date(filters.endDate)) continue;

        const txCurrency = tx.currency || "BSD";
        const txRate = EXCHANGE_RATES_TO_USD[txCurrency] || 1;
        const convertedAmount = (parseFloat(tx.amount) * txRate) / baseRate;

        if (!currencyBreakdown[txCurrency]) {
          currencyBreakdown[txCurrency] = { income: 0, expenses: 0, count: 0 };
        }
        currencyBreakdown[txCurrency].count++;

        if (tx.type === "income") {
          totalIncome += convertedAmount;
          currencyBreakdown[txCurrency].income += parseFloat(tx.amount);
        } else {
          totalExpenses += Math.abs(convertedAmount);
          currencyBreakdown[txCurrency].expenses += Math.abs(parseFloat(tx.amount));
        }
      }

      res.json({
        baseCurrency,
        balance: totalIncome - totalExpenses,
        totalIncome,
        totalExpenses,
        currencyBreakdown,
        rates: EXCHANGE_RATES_TO_USD,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Spending Trends - monthly comparison
  app.get("/api/trends", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const transactions = await storage.getTransactions(userId);
      const budgets = await storage.getBudgets(userId);
      const months = parseInt(req.query.months as string) || 6;

      const now = new Date();
      const monthlyData: Record<string, { income: number; expenses: number; categories: Record<string, number> }> = {};

      for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = { income: 0, expenses: 0, categories: {} };
      }

      for (const tx of transactions) {
        const txDate = new Date(tx.date);
        const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key]) continue;

        const amount = Math.abs(parseFloat(tx.amount));
        if (tx.type === "income") {
          monthlyData[key].income += amount;
        } else {
          monthlyData[key].expenses += amount;
          const catName = tx.category?.name || "Uncategorized";
          monthlyData[key].categories[catName] = (monthlyData[key].categories[catName] || 0) + amount;
        }
      }

      const sortedMonths = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data }));

      const currentMonth = sortedMonths[sortedMonths.length - 1];
      const previousMonth = sortedMonths[sortedMonths.length - 2];

      const alerts: { category: string; change: number; current: number; previous: number; overBudget?: boolean }[] = [];

      if (currentMonth && previousMonth) {
        const allCategories = new Set([
          ...Object.keys(currentMonth.categories),
          ...Object.keys(previousMonth.categories),
        ]);

        for (const cat of allCategories) {
          const current = currentMonth.categories[cat] || 0;
          const previous = previousMonth.categories[cat] || 0;
          if (previous > 0 && current > previous * 1.2) {
            const change = ((current - previous) / previous) * 100;
            const budget = budgets.find(b => b.category?.name === cat);
            alerts.push({
              category: cat,
              change: Math.round(change),
              current,
              previous,
              overBudget: budget ? current > parseFloat(budget.amount) : undefined,
            });
          }
        }
      }

      const budgetComparison = budgets.map(b => {
        const catName = b.category?.name || "Unknown";
        const spent = currentMonth?.categories[catName] || 0;
        const limit = parseFloat(b.amount);
        return {
          category: catName,
          budgeted: limit,
          spent,
          remaining: limit - spent,
          percentUsed: limit > 0 ? Math.round((spent / limit) * 100) : 0,
        };
      });

      res.json({ months: sortedMonths, alerts, budgetComparison });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });



  // AI Insights
  app.get("/api/ai/insights", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;

      const orgIds = await getStudentOrgIds(userId).catch(() => [] as string[]);
      const orgId = orgIds[0] ?? null;

      const quota = await checkAiQuota({ userId, orgId, kind: "ai_insights" });
      if (!quota.ok) {
        return res.status(429).json({ message: quotaErrorMessage(quota), quota });
      }

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

      const model = "gpt-4o-mini";
      const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "system", content: "You are a senior financial advisor specializing in Caribbean economies and personal finance." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      await recordAiUsage({
        userId, orgId, kind: "ai_insights", model,
        tokensIn: response.usage?.prompt_tokens ?? 0,
        tokensOut: response.usage?.completion_tokens ?? 0,
      });

      const content = response.choices[0].message.content || "{}";
      res.json(JSON.parse(content));
    } catch (err: any) {
      console.error("AI Insight error:", err?.message || "Unknown error");
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // Transactions
  app.get(api.transactions.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    // Defensive limit/offset parsing — invalid input falls back to safe default.
    // Cap list size at 200 per page; clients can page with offset to load older entries.
    const rawLimit = Number(req.query.limit);
    const rawOffset = Number(req.query.offset);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 50;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      limit,
      offset,
    };
    const transactions = await storage.getTransactions(userId, filters);
    res.json(transactions);
  });

  app.post(api.transactions.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      // Coerce numeric fields and date for robustness
      const bodySchema = api.transactions.create.input.extend({
        amount: z.coerce.string(),
        categoryId: z.coerce.number().optional(),
        date: z.coerce.date(), // Handle date strings from frontend
      });
      const input = bodySchema.parse(req.body);
      const transaction = await storage.createTransaction({ ...input, userId });
      res.status(201).json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.transactions.update.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const id = Number(req.params.id);
      
      const bodySchema = api.transactions.update.input.partial().extend({
        amount: z.coerce.string().optional(),
        categoryId: z.coerce.number().optional(),
        date: z.coerce.date().optional(),
      });
      
      const input = bodySchema.parse(req.body);
      const transaction = await storage.updateTransaction(id, userId, input);
      res.json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  app.delete(api.transactions.delete.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const id = Number(req.params.id);
    await storage.deleteTransaction(id, userId);
    res.status(204).end();
  });

  // Categories
  app.get(api.categories.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const categories = await storage.getCategories(userId);
    res.json(categories);
  });

  app.post(api.categories.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const input = api.categories.create.input.parse(req.body);
      const category = await storage.createCategory({ ...input, userId });
      res.status(201).json(category);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Budgets
  app.get(api.budgets.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const budgets = await storage.getBudgets(userId);
    res.json(budgets);
  });

  app.post(api.budgets.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const bodySchema = api.budgets.create.input.extend({
        amount: z.coerce.string(),
        categoryId: z.coerce.number(),
      });
      const input = bodySchema.parse(req.body);
      const budget = await storage.createBudget({ ...input, userId });
      res.status(201).json(budget);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.budgets.delete.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const id = Number(req.params.id);
    await storage.deleteBudget(id, userId);
    res.status(204).end();
  });

  // Cards
  app.get(api.cards.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const cards = await storage.getLinkedCards(userId);
    res.json(cards);
  });

  app.post(api.cards.link.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { cardNumber, bankName } = api.cards.link.input.parse(req.body);
    const lastFour = cardNumber.slice(-4);
    
    const card = await storage.linkCard({ userId, lastFour, bankName });

    res.status(201).json(card);
  });

  // Savings Goals
  app.get("/api/savings-goals", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const goals = await storage.getSavingsGoals(userId);
    res.json(goals);
  });

  app.post("/api/savings-goals", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { name, targetAmount, currency, deadline, icon, color } = req.body;
    const goal = await storage.createSavingsGoal({
      userId,
      name,
      targetAmount: String(targetAmount),
      currentAmount: "0",
      currency: currency || "BSD",
      deadline: deadline ? new Date(deadline) : null,
      icon: icon || null,
      color: color || null,
    });
    res.status(201).json(goal);
  });

  app.patch("/api/savings-goals/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const id = Number(req.params.id);
    const data: any = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.targetAmount !== undefined) data.targetAmount = String(req.body.targetAmount);
    if (req.body.currentAmount !== undefined) data.currentAmount = String(req.body.currentAmount);
    if (req.body.deadline !== undefined) data.deadline = req.body.deadline ? new Date(req.body.deadline) : null;
    const goal = await storage.updateSavingsGoal(id, userId, data);
    res.json(goal);
  });

  app.delete("/api/savings-goals/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const id = Number(req.params.id);
    await storage.deleteSavingsGoal(id, userId);
    res.status(204).end();
  });

  // Bill Reminders
  app.get("/api/bill-reminders", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const reminders = await storage.getBillReminders(userId);
    res.json(reminders);
  });

  app.post("/api/bill-reminders", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { name, amount, currency, frequency, nextDueDate, categoryId } = req.body;
    const reminder = await storage.createBillReminder({
      userId,
      name,
      amount: String(amount),
      currency: currency || "BSD",
      frequency: frequency || "monthly",
      nextDueDate: new Date(nextDueDate),
      categoryId: categoryId || null,
      isAutoDetected: false,
    });
    res.status(201).json(reminder);
  });

  app.delete("/api/bill-reminders/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const id = Number(req.params.id);
    await storage.deleteBillReminder(id, userId);
    res.status(204).end();
  });

  // Auto-detect recurring bills from transaction history
  app.post("/api/bill-reminders/auto-detect", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const transactions = await storage.getTransactions(userId);
      
      const descriptionMap: Record<string, { dates: Date[]; amounts: number[]; categoryId: number | null }> = {};
      for (const tx of transactions) {
        if (tx.type !== "expense") continue;
        const key = tx.description?.trim().toLowerCase() || "";
        if (!key) continue;
        if (!descriptionMap[key]) {
          descriptionMap[key] = { dates: [], amounts: [], categoryId: tx.categoryId };
        }
        descriptionMap[key].dates.push(new Date(tx.date));
        descriptionMap[key].amounts.push(Math.abs(parseFloat(tx.amount)));
      }

      const detected: { name: string; amount: number; frequency: string; nextDueDate: string; categoryId: number | null }[] = [];

      for (const [desc, data] of Object.entries(descriptionMap)) {
        if (data.dates.length < 2) continue;
        
        data.dates.sort((a, b) => a.getTime() - b.getTime());
        const gaps: number[] = [];
        for (let i = 1; i < data.dates.length; i++) {
          gaps.push((data.dates[i].getTime() - data.dates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
        }
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        
        let frequency = "";
        if (avgGap >= 5 && avgGap <= 10) frequency = "weekly";
        else if (avgGap >= 25 && avgGap <= 35) frequency = "monthly";
        else if (avgGap >= 80 && avgGap <= 100) frequency = "quarterly";
        else if (avgGap >= 340 && avgGap <= 380) frequency = "yearly";
        else continue;

        const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
        const lastDate = data.dates[data.dates.length - 1];
        const nextDate = new Date(lastDate);
        if (frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
        else if (frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
        else if (frequency === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
        else if (frequency === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);

        detected.push({
          name: desc.charAt(0).toUpperCase() + desc.slice(1),
          amount: Math.round(avgAmount * 100) / 100,
          frequency,
          nextDueDate: nextDate.toISOString(),
          categoryId: data.categoryId,
        });
      }

      res.json({ detected });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Dashboard Stats
  app.get(api.stats.get.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      period: req.query.period as 'monthly' | 'yearly',
    };
    const stats = await storage.getDashboardStats(userId, filters);
    res.json(stats);
  });

  // Document Uploads
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const uploads = await storage.getDocumentUploads(userId);
    res.json(uploads);
  });

  app.delete("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }
      await storage.deleteDocumentUpload(id, userId);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Document delete error:", err?.message || "Unknown error");
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  app.post("/api/documents/upload", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const allowedCurrencies = ["BSD", "JMD", "TTD", "BBD", "XCD", "GYD", "HTG", "USD"];
      const currency = allowedCurrencies.includes(req.body.currency) ? req.body.currency : "BSD";
      const ext = path.extname(file.originalname).toLowerCase();

      const docUpload = await storage.createDocumentUpload({
        userId,
        fileName: file.originalname,
        fileType: ext.replace('.', ''),
        status: "processing",
        transactionsCreated: 0,
      });

      const userCategories = await storage.getCategories(userId);

      let parsedTransactions: Array<{ date: string; description: string; amount: number; type: string; categoryId?: number }> = [];
      let parsingMethod = "openai";

      if (isVeryfiConfigured()) {
        console.log("Attempting Veryfi parsing for:", file.originalname);
        const veryfiResult = await parseWithVeryfi(file.buffer, file.originalname);
        if (veryfiResult.transactions.length > 0) {
          parsedTransactions = veryfiResult.transactions.map(tx => {
            const desc = tx.description.toLowerCase();
            let categoryId: number | undefined;
            const matchCategory = (keywords: string[], categoryName: string) => {
              if (categoryId) return;
              if (keywords.some(k => desc.includes(k))) {
                const cat = userCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
                if (cat) categoryId = cat.id;
              }
            };
            matchCategory(["uber", "taxi", "gas", "fuel", "transit", "mta", "lyft", "bus", "train"], "Transportation");
            matchCategory(["mcdonald", "restaurant", "food", "grocery", "pizza", "cafe", "coffee", "dining", "eat", "burger", "kfc", "wendy"], "Food & Dining");
            matchCategory(["amazon", "retail", "store", "cvs", "walmart", "target", "shop", "purchase", "buy"], "Shopping");
            matchCategory(["netflix", "movie", "concert", "spotify", "hulu", "disney", "entertainment", "gaming"], "Entertainment");
            matchCategory(["electric", "water", "phone", "internet", "bill", "utility", "cable", "telecom", "mobile"], "Bills & Utilities");
            matchCategory(["rent", "mortgage", "housing", "lease", "apartment"], "Housing");
            matchCategory(["pharmacy", "doctor", "hospital", "medical", "health", "clinic", "dental"], "Health");
            matchCategory(["salon", "spa", "barber", "beauty", "hair", "nail", "grooming", "skincare"], "Personal Care");
            matchCategory(["tuition", "school", "university", "college", "course", "training", "books", "education", "student"], "Education");
            matchCategory(["insurance", "premium", "policy", "coverage", "life insurance", "auto insurance"], "Insurance");
            matchCategory(["flight", "hotel", "airbnb", "vacation", "travel", "trip", "booking", "resort", "airline"], "Travel");
            matchCategory(["gift", "donation", "charity", "tithe", "offering", "church", "nonprofit"], "Gifts & Donations");
            matchCategory(["salary", "wage", "payroll", "deposit", "paycheck", "income"], "Salary");
            matchCategory(["freelance", "contract", "gig", "consulting", "commission", "client payment"], "Freelance");
            matchCategory(["dividend", "interest", "investment", "stock", "bond", "capital gain", "return"], "Investments");
            if (!categoryId) {
              const other = userCategories.find(c => c.name === "Other");
              if (other) categoryId = other.id;
              else {
                const fallback = userCategories.find(c => c.type === tx.type);
                if (fallback) categoryId = fallback.id;
              }
            }
            return { ...tx, categoryId };
          });
          parsingMethod = "veryfi";
          console.log(`Veryfi parsed ${parsedTransactions.length} transactions`);
        } else {
          console.log("Veryfi returned no transactions, falling back to OpenAI:", veryfiResult.error);
        }
      }

      if (parsedTransactions.length === 0) {
        let fileContent = "";
        try {
          if (ext === ".csv") {
            fileContent = file.buffer.toString("utf-8");
          } else if (ext === ".pdf") {
            const { PDFParse } = await import("pdf-parse");
            const uint8 = new Uint8Array(file.buffer);
            const parser = new PDFParse(uint8) as any;
            await parser.load();
            const result = await parser.getText();
            fileContent = result.text || "";
          } else if (ext === ".xlsx" || ext === ".xls") {
            const workbook = XLSX.read(file.buffer, { type: "buffer" });
            const sheetNames = workbook.SheetNames;
            for (const sheetName of sheetNames) {
              const sheet = workbook.Sheets[sheetName];
              fileContent += XLSX.utils.sheet_to_csv(sheet) + "\n";
            }
          }
        } catch (parseErr: any) {
          console.error("File parsing error:", parseErr?.message || "Unknown error");
          await storage.updateDocumentUpload(docUpload.id, {
            status: "failed",
            errorMessage: `Could not read the file: ${parseErr?.message || "Unknown error"}. Please ensure it is a valid bank statement.`,
          });
          return res.status(200).json({
            upload: await storage.getDocumentUploads(userId).then(u => u.find(d => d.id === docUpload.id)),
            transactions: [],
            error: "Could not read the file contents"
          });
        }

        if (!fileContent.trim()) {
          await storage.updateDocumentUpload(docUpload.id, {
            status: "failed",
            errorMessage: "The file appears to be empty or could not be read.",
          });
          return res.status(200).json({
            upload: await storage.getDocumentUploads(userId).then(u => u.find(d => d.id === docUpload.id)),
            transactions: [],
            error: "The file appears to be empty"
          });
        }

        const truncatedContent = fileContent.substring(0, 20000);
        const categoryList = userCategories.map(c => `- "${c.name}" (type: ${c.type}, id: ${c.id})`).join("\n");

        const parsePrompt = `You are a bank statement parser. Parse the following bank statement content and extract all transactions.
      
The file is named "${file.originalname}" (originally ${ext} format, converted to text).
The user's preferred currency is ${currency}.

AVAILABLE CATEGORIES:
${categoryList}

FILE CONTENT:
${truncatedContent}

Extract each transaction and return a JSON object with:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Description of the transaction",
      "amount": number (positive for income/deposits, negative for expenses/withdrawals),
      "type": "income" or "expense",
      "categoryId": number (the id of the best matching category from the list above)
    }
  ]
}

Rules:
- Parse dates into YYYY-MM-DD format
- For debits/withdrawals/payments/purchases, make amount negative and type "expense"
- Any "POS purchase", "POS", "point of sale", "debit card purchase", or similar purchase transactions are ALWAYS expenses with negative amounts
- For credits/deposits/income, make amount positive and type "income"
- CATEGORIZATION: Match each transaction to the most appropriate category based on the merchant/description:
  * Uber, taxi, gas stations, MTA, transit → Transportation
  * McDonald's, restaurants, food delivery, grocery → Food & Dining
  * Amazon, retail stores, CVS → Shopping
  * Netflix, movies, concerts, gaming → Entertainment
  * Electric, water, phone, internet bills → Bills & Utilities
  * Rent, mortgage → Housing
  * Pharmacy, doctor, hospital → Health
  * Salon, spa, barber, beauty → Personal Care
  * Tuition, school, university, courses, books → Education
  * Insurance premiums, policies → Insurance
  * Flights, hotels, vacation, airbnb → Travel
  * Gifts, donations, charity, tithe → Gifts & Donations
  * Salary, wages, direct deposit, payroll → Salary (income)
  * Freelance, consulting, contract, gig work → Freelance (income)
  * Dividends, interest, investment returns → Investments (income)
  * If no category fits well, use Other
- Use the description column for the transaction description
- If the file appears to be in an unsupported format or is not a bank statement, return {"transactions": [], "error": "Could not parse this file as a bank statement"}
- Return ONLY valid JSON, no other text`;

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: parsePrompt }],
          response_format: { type: "json_object" }
        });

        const parsed = JSON.parse(aiResponse.choices[0].message.content || "{}");

        if (parsed.error || !parsed.transactions || parsed.transactions.length === 0) {
          await storage.updateDocumentUpload(docUpload.id, {
            status: "failed",
            errorMessage: parsed.error || "No transactions could be extracted from the file",
          });
          return res.status(200).json({
            upload: await storage.getDocumentUploads(userId).then(u => u.find(d => d.id === docUpload.id)),
            transactions: [],
            error: parsed.error || "No transactions found in this file"
          });
        }

        parsedTransactions = parsed.transactions;
        parsingMethod = "openai";
      }

      const existingTransactions = await storage.getTransactions(userId);
      let createdCount = 0;
      let skippedCount = 0;

      for (const tx of parsedTransactions) {
        try {
          const txDate = new Date(tx.date);
          const txAmount = Math.abs(tx.amount).toFixed(2);
          const txDesc = (tx.description || "Imported transaction").trim();

          const isDuplicate = existingTransactions.some(existing => {
            const existingDate = new Date(existing.date);
            return (
              existing.amount === txAmount &&
              existingDate.toISOString().slice(0, 10) === txDate.toISOString().slice(0, 10) &&
              existing.description?.trim() === txDesc
            );
          });

          if (isDuplicate) {
            skippedCount++;
            continue;
          }

          const txType = tx.type === "income" ? "income" : "expense";
          const aiCategoryId = tx.categoryId ? Number(tx.categoryId) : null;
          const validCategory = aiCategoryId && userCategories.find(c => c.id === aiCategoryId);
          const fallbackCategory = userCategories.find(c => c.type === txType);
          
          await storage.createTransaction({
            userId,
            amount: txAmount,
            type: txType,
            currency,
            categoryId: validCategory ? aiCategoryId : (fallbackCategory?.id || null),
            date: txDate,
            description: txDesc,
            isAutoSynced: true,
            documentUploadId: docUpload.id,
          });
          createdCount++;
        } catch (txErr) {
          console.error("Error creating transaction from upload:", (txErr as any)?.message || "Unknown error");
        }
      }

      await storage.updateDocumentUpload(docUpload.id, {
        status: "completed",
        transactionsCreated: createdCount,
      });

      if (file.buffer) {
        file.buffer = Buffer.alloc(0);
      }

      const updatedUpload = await storage.getDocumentUploads(userId).then(u => u.find(d => d.id === docUpload.id));
      res.json({ upload: updatedUpload, transactionsCreated: createdCount, duplicatesSkipped: skippedCount, parsingMethod });
    } catch (err: any) {
      if (req.file?.buffer) {
        req.file.buffer = Buffer.alloc(0);
      }
      console.error("Document upload error:", err?.message || "Unknown error");
      res.status(500).json({ message: "Failed to process document" });
    }
  });

  // Export transactions as CSV
  app.get("/api/export/transactions", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { startDate, endDate, format } = req.query as { startDate?: string; endDate?: string; format?: string };

      const transactions = await storage.getTransactions(userId);
      const categories = await storage.getCategories(userId);
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      const toDateStr = (d: Date | string) => {
        if (d instanceof Date) return d.toISOString().split("T")[0];
        return String(d).split("T")[0];
      };

      let filtered = transactions;
      if (startDate) {
        const start = new Date(startDate);
        filtered = filtered.filter(t => new Date(t.date) >= start);
      }
      if (endDate) {
        const end = new Date(endDate + "T23:59:59");
        filtered = filtered.filter(t => new Date(t.date) <= end);
      }

      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (format === "json") {
        const data = filtered.map(t => ({
          date: toDateStr(t.date),
          description: t.description,
          amount: t.amount,
          type: t.type,
          currency: t.currency,
          category: categoryMap.get(t.categoryId!) || "Uncategorized",
        }));
        res.json(data);
        return;
      }

      const header = "Date,Description,Amount,Type,Currency,Category\n";
      const rows = filtered.map(t => {
        const desc = (t.description || "").replace(/"/g, '""');
        const cat = categoryMap.get(t.categoryId!) || "Uncategorized";
        return `${toDateStr(t.date)},"${desc}",${t.amount},${t.type},${t.currency},"${cat}"`;
      }).join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="finsight360-transactions-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(header + rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Export failed" });
    }
  });

  // Export financial summary report
  app.get("/api/export/summary", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { startDate, endDate, currency: baseCurrency } = req.query as { startDate?: string; endDate?: string; currency?: string };
      const base = baseCurrency || "BSD";

      const transactions = await storage.getTransactions(userId);
      const categories = await storage.getCategories(userId);
      const budgets = await storage.getBudgets(userId);
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      let filtered = transactions;
      if (startDate) {
        const start = new Date(startDate);
        filtered = filtered.filter(t => new Date(t.date) >= start);
      }
      if (endDate) {
        const end = new Date(endDate + "T23:59:59");
        filtered = filtered.filter(t => new Date(t.date) <= end);
      }

      const toUSD = (amount: number, curr: string) => amount * (EXCHANGE_RATES_TO_USD[curr] || 1);
      const fromUSD = (usdAmount: number, toCurr: string) => usdAmount / (EXCHANGE_RATES_TO_USD[toCurr] || 1);
      const convert = (amount: number, from: string) => fromUSD(toUSD(amount, from), base);

      let totalIncome = 0;
      let totalExpenses = 0;
      const categoryTotals: Record<string, number> = {};

      for (const t of filtered) {
        const converted = convert(Number(t.amount), t.currency);
        if (t.type === "income") {
          totalIncome += converted;
        } else {
          totalExpenses += converted;
          const catName = categoryMap.get(t.categoryId!) || "Uncategorized";
          categoryTotals[catName] = (categoryTotals[catName] || 0) + converted;
        }
      }

      const summary = {
        period: { startDate: startDate || "All time", endDate: endDate || "Present" },
        currency: base,
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netSavings: Math.round((totalIncome - totalExpenses) * 100) / 100,
        savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0,
        transactionCount: filtered.length,
        topCategories: Object.entries(categoryTotals)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, total]) => ({
            category: name,
            amount: Math.round(total * 100) / 100,
            percentage: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0,
          })),
        budgetStatus: budgets.map(b => ({
          category: categoryMap.get(b.categoryId!) || "Unknown",
          limit: Number(b.amount),
          spent: Math.round((categoryTotals[categoryMap.get(b.categoryId!) || ""] || 0) * 100) / 100,
          currency: b.currency,
        })),
      };

      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Summary export failed" });
    }
  });

  // === INVESTMENT SIMULATION ROUTES ===

  // Seed market data on startup
  await storage.seedMarketData();
  await storage.seedLearningModules();

  app.get("/api/investments/market", isAuthenticated, async (req, res) => {
    try {
      const currency = req.query.currency as string | undefined;
      const stocks = await storage.getMarketStocks(currency);
      res.json(stocks);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/investments/portfolio", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const holdings = await storage.getPortfolioHoldings(userId);
      const balance = await storage.getVirtualBalance(userId);
      res.json({ holdings, virtualBalance: balance });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/investments/buy", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { stockId, quantity } = z.object({
        stockId: z.coerce.number(),
        quantity: z.coerce.number().int().positive(),
      }).parse(req.body);

      const stock = await storage.getStockById(stockId);
      if (!stock) return res.status(404).json({ message: "Stock not found" });

      const totalCost = parseFloat(stock.currentPrice) * quantity;
      const balance = await storage.getVirtualBalance(userId);
      const currentBalance = parseFloat(balance.balance);

      if (totalCost > currentBalance) {
        return res.status(400).json({ message: "Not enough virtual cash for this purchase" });
      }

      const existingHolding = await storage.getPortfolioHolding(userId, stockId);
      let newAvgPrice = parseFloat(stock.currentPrice);
      let newQuantity = quantity;

      if (existingHolding) {
        const oldTotal = existingHolding.quantity * parseFloat(existingHolding.avgPurchasePrice);
        const newTotal = quantity * parseFloat(stock.currentPrice);
        newQuantity = existingHolding.quantity + quantity;
        newAvgPrice = (oldTotal + newTotal) / newQuantity;
      }

      await storage.upsertPortfolioHolding(userId, stockId, newQuantity, newAvgPrice);
      await storage.updateVirtualBalance(userId, currentBalance - totalCost);
      await storage.createPortfolioTransaction({
        userId,
        stockId,
        type: "buy",
        quantity,
        pricePerUnit: stock.currentPrice,
        currency: stock.currency,
      });

      res.json({ message: "Purchase successful", spent: totalCost });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/investments/sell", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { stockId, quantity } = z.object({
        stockId: z.coerce.number(),
        quantity: z.coerce.number().int().positive(),
      }).parse(req.body);

      const stock = await storage.getStockById(stockId);
      if (!stock) return res.status(404).json({ message: "Stock not found" });

      const holding = await storage.getPortfolioHolding(userId, stockId);
      if (!holding || holding.quantity < quantity) {
        return res.status(400).json({ message: "You don't own enough shares to sell that many" });
      }

      const saleAmount = parseFloat(stock.currentPrice) * quantity;
      const newQuantity = holding.quantity - quantity;
      const balance = await storage.getVirtualBalance(userId);

      if (newQuantity > 0) {
        await storage.upsertPortfolioHolding(userId, stockId, newQuantity, parseFloat(holding.avgPurchasePrice));
      } else {
        await storage.deletePortfolioHolding(holding.id, userId);
      }

      await storage.updateVirtualBalance(userId, parseFloat(balance.balance) + saleAmount);
      await storage.createPortfolioTransaction({
        userId,
        stockId,
        type: "sell",
        quantity,
        pricePerUnit: stock.currentPrice,
        currency: stock.currency,
      });

      res.json({ message: "Sale successful", earned: saleAmount });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/investments/history", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const history = await storage.getPortfolioTransactions(userId);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === LEARNING MODULES ROUTES ===

  app.get("/api/learn/modules", isAuthenticated, async (_req, res) => {
    try {
      const { cached } = await import("./cache");
      // Static, rarely-changing content — cache for 5 minutes
      const modules = await cached("learn:modules", 5 * 60_000, () => storage.getLearningModules());
      res.json(modules);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/learn/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const progress = await storage.getUserLearningProgress(userId);
      res.json(progress);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/learn/complete/:moduleId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const moduleId = Number(req.params.moduleId);
      const progress = await storage.completeModule(userId, moduleId);
      res.json(progress);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === MONEYLAB ROUTES ===

  // Upload exam paper and extract questions with AI
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

      // Enqueue durable extraction job (survives server restarts, retries on failure)
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

  // List uploaded papers
  app.get("/api/moneylab/papers", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const papers = await storage.getExamPapers(userId);
      res.json(papers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get all papers (for game selection — completed papers from all users)
  app.get("/api/moneylab/papers/all", isAuthenticated, async (req, res) => {
    try {
      const { examPapers } = await import("@shared/schema");
      const { db } = await import("./db");
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

  // Get paper details with questions
  app.get("/api/moneylab/papers/:id", isAuthenticated, async (req, res) => {
    try {
      const paper = await storage.getExamPaper(parseInt(req.params.id));
      if (!paper) return res.status(404).json({ message: "Paper not found" });
      const questions = await storage.getQuestionsByPaper(paper.id);
      res.json({ paper, questions });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Delete paper
  app.delete("/api/moneylab/papers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.deleteExamPaper(parseInt(req.params.id), userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Submit game results
  app.post("/api/moneylab/games/submit", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { paperId, mode, score, totalQuestions, correctAnswers, timeSpent } = req.body;

      if (!mode || score === undefined || !totalQuestions || correctAnswers === undefined) {
        return res.status(400).json({ message: "Missing required game data" });
      }

      // XP calculation
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

      // Update XP
      const currentXp = await storage.getUserXp(userId);
      const newTotalXp = currentXp.totalXp + xpEarned;
      const newLevel = Math.floor(newTotalXp / 100) + 1;

      // Streak: check if last played was yesterday (not same day)
      const now = new Date();
      const lastPlayed = currentXp.lastPlayedAt ? new Date(currentXp.lastPlayedAt) : null;
      let newStreak = currentXp.currentStreak;
      if (lastPlayed) {
        const todayStr = now.toISOString().slice(0, 10);
        const lastStr = lastPlayed.toISOString().slice(0, 10);
        if (todayStr === lastStr) {
          // Same day — keep streak unchanged
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

      // New score affects leaderboards — invalidate cached results
      const { cacheInvalidate } = await import("./cache");
      cacheInvalidate("moneylab:leaderboard:");

      // Check badges
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

  // Get user XP and stats
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

  // Leaderboard
  app.get("/api/moneylab/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const period = (req.query.period as string) || "all";
      const rawLimit = Number(req.query.limit);
      const rawOffset = Number(req.query.offset);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 20;
      const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
      const { cached } = await import("./cache");
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

  // AI Tutor — explain a question
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

      const model = "gpt-4o-mini";
      const modelVersion = `${model}-v1`;
      const questionHash = hashTutorQuestion({ questionText, options, correctAnswer, subject });

      // Try cache first — cache hits don't count against quota.
      const cached = await getCachedExplanation(questionHash, modelVersion);
      if (cached) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        // Substitute the placeholder with this student's name on serve
        const personalized = cached.split("[STUDENT_NAME]").join(userName);
        // Stream cached content in chunks for a smooth UX
        const chunkSize = 64;
        for (let i = 0; i < personalized.length; i += chunkSize) {
          res.write(`data: ${JSON.stringify({ content: personalized.slice(i, i + chunkSize) })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true, cached: true })}\n\n`);
        res.end();
        await recordAiUsage({ userId, orgId, kind: "tutor_explain", model, cached: true });
        return;
      }

      const quota = await checkAiQuota({ userId, orgId, kind: "tutor_explain" });
      if (!quota.ok) {
        return res.status(429).json({ message: quotaErrorMessage(quota), quota });
      }

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
1. Start with "Hey ${NAME_PLACEHOLDER}!" as the greeting (use the literal string ${NAME_PLACEHOLDER} — do NOT substitute a name yourself).
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

      // Buffer until we can safely substitute [STUDENT_NAME] across chunk boundaries
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
        // Emit everything except the trailing HOLDBACK chars (in case a placeholder is split)
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

      // Cache the raw model output (with [STUDENT_NAME] placeholder) so future
      // students can have it personalized to them on serve.
      await setCachedExplanation(questionHash, modelVersion, fullContent.trim());
      await recordAiUsage({
        userId, orgId, kind: "tutor_explain", model,
        tokensIn: promptTokens, tokensOut: completionTokens,
      });
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

  // Game history
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

      const quota = await checkAiQuota({ userId, orgId, kind: "guide_chat" });
      if (!quota.ok) {
        return res.status(429).json({ message: quotaErrorMessage(quota), quota });
      }

      const systemPrompt = `You are "Money Guide" — FinSight Lite's AI-powered financial mentor for kids and teens aged 10–17 in The Bahamas and the Caribbean.

PERSONALITY:
- You're like a fun, knowledgeable older cousin or mentor
- Friendly, encouraging, lightly humorous, Caribbean-infused tone
- Use Caribbean expressions naturally (e.g., "dat's smart!", "you on the right track!")
- Empowering, non-judgmental, positive — never guilt-based
- Treat the teen as capable and curious, not naive
- Keep responses SHORT (2-4 paragraphs max), fun, and interactive
- Use emojis naturally but don't overdo it (1-3 per response)

The user's name is "${userName}".

WHAT YOU DO:
1. Help teens learn about saving, budgeting, goal-setting, and money decisions
2. Explain financial concepts in plain language using relatable examples (allowance, birthday money, school fundraisers, snacks, games, gadgets)
3. Encourage short-term and long-term savings goals
4. Suggest fun "what-if" scenarios and comparisons
5. Celebrate small wins and encourage good habits
6. Reference Caribbean context: BSD currency, Bahamian/Caribbean prices, local stores and activities

CONCEPTS YOU TEACH (in kid-friendly language):
- Saving vs spending
- Needs vs wants
- Budgeting basics
- Compound interest ("your money making money!")
- Stocks (ownership in companies)
- Bonds (lending money to governments)
- Fixed deposits / CDs ("treasure chests that grow")
- Risk vs reward
- Goal-based saving
- The power of starting early

RESPONSE STYLE:
- Start with something encouraging or relatable
- Give the core advice/explanation clearly
- End with a question, suggestion, or mini-challenge to keep them engaged
- Use simple numbers and examples they can relate to
- When comparing options, use clear A vs B format
- For calculations, show the math simply

EXAMPLES OF GOOD RESPONSES:
- "Hey ${userName}! If you save just $5 a week, you'd have $260 in a year — that's enough for those sneakers you want! 🎯"
- "A bond is like lending your money to the government. They promise to give it back with a little extra on top. Think of it as your money going on a trip and bringing back souvenirs! 🏝️"
- "Want a mini challenge? Try the 'Skip a Snack' challenge — skip one $3 snack this week and put that money aside. By month end, you could have $12 saved! 💪"

THINGS TO AVOID:
- Financial jargon without explanation
- Long, boring lectures
- Guilt-based messaging ("you shouldn't have bought that")
- Overly complex calculations
- Talking down to the user
- Recommending real investments (this is educational only)

If the user asks about FinSight Lite features, you can mention:
- Money Games: fun financial games to practice skills
- Investment Simulator: practice buying/selling stocks and bonds with virtual money
- Savings Goals: track what they're saving for
- Budgets: plan their spending
- Learning Modules: lessons about money topics`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const chatMessages = [
        { role: "system" as const, content: systemPrompt },
        ...sanitizedMessages,
      ];

      // Tier model: short single-turn replies use the cheaper model; longer
      // conversations stay on gpt-4o for quality.
      const totalChars = sanitizedMessages.reduce((sum: number, m: any) => sum + m.content.length, 0);
      const useMini = sanitizedMessages.length <= 2 && totalChars < 1500;
      const model = useMini ? "gpt-4o-mini" : "gpt-4o";

      const stream = await openai.chat.completions.create({
        model,
        messages: chatMessages,
        stream: true,
        stream_options: { include_usage: true },
        max_completion_tokens: 1024,
        temperature: 0.8,
      });

      let promptTokens = 0;
      let completionTokens = 0;
      for await (const chunk of stream) {
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens ?? 0;
          completionTokens = chunk.usage.completion_tokens ?? 0;
        }
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      await recordAiUsage({
        userId, orgId, kind: "guide_chat", model,
        tokensIn: promptTokens, tokensOut: completionTokens,
      });
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

  // === TEACHER AUTH ROUTES ===
  const isTeacher = (req: any, res: any, next: any) => {
    if (!req.session?.teacherId) return res.status(401).json({ message: "Teacher not authenticated" });
    next();
  };

  app.post("/api/teacher/auth/register", async (req, res) => {
    try {
      const { firstName, lastName, email, password, schoolName } = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        schoolName: z.string().min(1),
      }).parse(req.body);

      const existing = await storage.getTeacherByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already in use" });

      const passwordHash = await bcrypt.hash(password, 12);
      const teacher = await storage.createTeacher({ firstName, lastName, email: email.toLowerCase(), passwordHash, schoolName });
      req.session.teacherId = teacher.id;
      const { passwordHash: _, ...safe } = teacher;
      return res.json(safe);
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/teacher/auth/login", async (req, res) => {
    try {
      const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
      const teacher = await storage.getTeacherByEmail(email);
      if (!teacher) return res.status(401).json({ message: "Invalid email or password" });
      const valid = await bcrypt.compare(password, teacher.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });
      req.session.teacherId = teacher.id;
      const { passwordHash: _, ...safe } = teacher;
      return res.json(safe);
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/teacher/auth/logout", (req, res) => {
    delete req.session.teacherId;
    res.json({ ok: true });
  });

  app.get("/api/teacher/auth/me", isTeacher, async (req: any, res) => {
    const teacher = await storage.getTeacherById(req.session.teacherId);
    if (!teacher) return res.status(401).json({ message: "Not found" });
    const { passwordHash: _, ...safe } = teacher;
    res.json(safe);
  });

  // === TEACHER CLASS ROUTES ===
  app.get("/api/teacher/classes", isTeacher, async (req: any, res) => {
    const classes = await storage.getClassesByTeacher(req.session.teacherId);
    res.json(classes);
  });

  app.post("/api/teacher/classes", isTeacher, async (req: any, res) => {
    try {
      const { name, subject, sponsorName } = z.object({
        name: z.string().min(1),
        subject: z.string().default("Financial Literacy"),
        sponsorName: z.string().optional(),
      }).parse(req.body);
      const cls = await storage.createClass({ teacherId: req.session.teacherId, name, subject, sponsorName });
      res.json(cls);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/teacher/classes/:id", isTeacher, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const cls = await storage.getClassById(id);
    if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
    res.json(cls);
  });

  app.patch("/api/teacher/classes/:id", isTeacher, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = z.object({ name: z.string().optional(), subject: z.string().optional(), sponsorName: z.string().optional() }).parse(req.body);
      const cls = await storage.updateClass(id, req.session.teacherId, data);
      res.json(cls);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/teacher/classes/:id", isTeacher, async (req: any, res) => {
    await storage.deleteClass(parseInt(req.params.id), req.session.teacherId);
    res.json({ ok: true });
  });

  app.get("/api/teacher/classes/:id/students", isTeacher, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const cls = await storage.getClassById(id);
    if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
    // Defensive pagination — default 50, hard cap 200.
    const rawLimit = Number(req.query.limit);
    const rawOffset = Number(req.query.offset);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 50;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
    const summary = await storage.getClassProgressSummary(id, { limit, offset });
    res.json(summary);
  });

  app.delete("/api/teacher/classes/:classId/students/:studentId", isTeacher, async (req: any, res) => {
    const classId = parseInt(req.params.classId);
    const cls = await storage.getClassById(classId);
    if (!cls || cls.teacherId !== req.session.teacherId) return res.status(403).json({ message: "Forbidden" });
    await storage.removeEnrollment(classId, req.params.studentId);
    res.json({ ok: true });
  });

  app.get("/api/teacher/classes/:id/leaderboard", isTeacher, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const cls = await storage.getClassById(id);
    if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
    const leaderboard = await storage.getClassLeaderboard(id);
    res.json(leaderboard);
  });

  app.get("/api/teacher/classes/:id/analytics", isTeacher, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const cls = await storage.getClassById(id);
    if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
    const analytics = await storage.getClassAnalytics(id);
    res.json(analytics);
  });

  // Lessons for a linked org environment (read-only, teacher view — env-scoped)
  app.get("/api/teacher/classes/:id/lessons", isTeacher, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const cls = await storage.getClassById(id);
    if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
    if (!cls.envId) return res.json([]);
    const lessons = await getPublishedLessonsByEnv(cls.envId);
    res.json(lessons);
  });

  // CSV Report download
  app.get("/api/teacher/classes/:id/report.csv", isTeacher, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const cls = await storage.getClassById(id);
    if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
    const summary = await storage.getClassProgressSummary(id);
    const rows = [
      ["Name", "Username", "XP", "Level", "Streak", "Lessons Completed", "Games Played", "Avg Score (%)", "Badges"],
      ...summary.students.map((s: any) => [s.name, s.username, s.xp, s.level, s.streak, s.lessonsCompleted, s.gamesPlayed, s.avgScore, s.badges]),
    ];
    const csv = rows.map(r => r.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${cls.name.replace(/[^a-z0-9]/gi, '_')}_report.csv"`);
    res.send(csv);
  });

  // === TEACHER CHALLENGE ROUTES ===
  app.get("/api/teacher/classes/:id/challenges", isTeacher, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const cls = await storage.getClassById(id);
    if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
    const data = await storage.getChallengesByClass(id);
    res.json(data);
  });

  app.post("/api/teacher/classes/:id/challenges", isTeacher, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const cls = await storage.getClassById(id);
      if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
      const body = z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        type: z.enum(["savings", "quiz", "investment", "budget"]).default("quiz"),
        startDate: z.string(),
        endDate: z.string(),
        targetValue: z.string().optional(),
      }).parse(req.body);
      const challenge = await storage.createChallenge({
        classId: id,
        teacherId: req.session.teacherId,
        title: body.title,
        description: body.description,
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        targetValue: body.targetValue,
      });
      res.json(challenge);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/teacher/challenges/:id", isTeacher, async (req: any, res) => {
    await storage.deleteChallenge(parseInt(req.params.id), req.session.teacherId);
    res.json({ ok: true });
  });

  // === TEACHER NOTIFICATION ROUTES ===
  app.get("/api/teacher/classes/:id/notifications", isTeacher, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const cls = await storage.getClassById(id);
    if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
    const data = await storage.getNotificationsByClass(id);
    res.json(data);
  });

  app.post("/api/teacher/classes/:id/notifications", isTeacher, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const cls = await storage.getClassById(id);
      if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
      const body = z.object({
        title: z.string().min(1),
        message: z.string().min(1),
        type: z.enum(["announcement", "reminder", "congratulations"]).default("announcement"),
      }).parse(req.body);
      const notification = await storage.createNotification({ classId: id, teacherId: req.session.teacherId, ...body });
      res.json(notification);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/teacher/notifications/:id", isTeacher, async (req: any, res) => {
    await storage.deleteNotification(parseInt(req.params.id), req.session.teacherId);
    res.json({ ok: true });
  });

  // === DEMO ACCESS ===

  app.post("/api/demo/setup", async (_req, res) => {
    try {
      const result = await storage.setupDemoData();
      res.json({ ok: true, message: "Demo data ready", ...result });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/demo/credentials", async (_req, res) => {
    try {
      let creds = await storage.getDemoCredentials();
      if (!creds) {
        await storage.setupDemoData();
        creds = await storage.getDemoCredentials();
      }
      res.json(creds);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/demo/login/teacher", async (req: any, res) => {
    try {
      const creds = await storage.getDemoCredentials();
      if (!creds?.teacher) return res.status(404).json({ message: "Demo data not set up yet" });
      const teacher = await storage.getTeacherByEmail("demo@finsightlite.com");
      if (!teacher) return res.status(404).json({ message: "Demo teacher not found" });
      req.session.teacherId = teacher.id;
      res.json({ ok: true, redirect: "/teacher/dashboard" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/demo/login/student/:studentId", async (req: any, res) => {
    try {
      const student = await storage.getUser(req.params.studentId);
      if (!student) return res.status(404).json({ message: "Demo student not found" });
      req.session.userId = student.id;
      res.json({ ok: true, redirect: "/" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === ADMIN DASHBOARD ===

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@finsightlite.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.session?.isAdmin) return next();
    return res.status(401).json({ message: "Admin access required" });
  };

  app.post("/api/admin/auth/login", async (req: any, res) => {
    try {
      const { email, password } = z.object({ email: z.string(), password: z.string() }).parse(req.body);
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.isAdmin = true;
      res.json({ ok: true, email: ADMIN_EMAIL });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/admin/auth/logout", (req: any, res) => {
    req.session.isAdmin = false;
    res.json({ ok: true });
  });

  app.get("/api/admin/auth/me", (req: any, res) => {
    if (req.session?.isAdmin) return res.json({ email: ADMIN_EMAIL, isAdmin: true });
    res.status(401).json({ message: "Not authenticated" });
  });

  app.get("/api/admin/overview", isAdmin, async (_req, res) => {
    const data = await storage.getAdminOverview();
    res.json(data);
  });

  app.get("/api/admin/students", isAdmin, async (_req, res) => {
    const data = await storage.getAdminStudents();
    res.json(data);
  });

  app.get("/api/admin/teachers", isAdmin, async (_req, res) => {
    const data = await storage.getAdminTeachers();
    res.json(data);
  });

  app.patch("/api/admin/teachers/:id/org-link", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { env_id } = z.object({ env_id: z.string().nullable() }).parse(req.body);
      // Derive org_id server-side from the env to prevent inconsistent client-sent pairs
      let org_id: string | null = null;
      if (env_id) {
        const env = await getOrgEnvironmentById(env_id);
        if (!env) return res.status(404).json({ message: "Org environment not found" });
        org_id = env.org_id;
      }
      const updated = await storage.updateTeacherOrgLink(id, org_id, env_id);
      const { passwordHash: _, ...safe } = updated;
      res.json(safe);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/classes", isAdmin, async (_req, res) => {
    const data = await storage.getAdminClasses();
    res.json(data);
  });

  app.patch("/api/admin/classes/:id/org-link", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { env_id } = z.object({ env_id: z.string().nullable() }).parse(req.body);
      // Validate env exists when linking (parity with teacher org-link route)
      if (env_id) {
        const env = await getOrgEnvironmentById(env_id);
        if (!env) return res.status(404).json({ message: "Org environment not found" });
      }
      const updated = await storage.updateClassEnvLink(id, env_id);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/challenges", isAdmin, async (_req, res) => {
    const data = await storage.getAdminChallenges();
    res.json(data);
  });

  app.get("/api/admin/search", isAdmin, async (req, res) => {
    const q = String(req.query.q || "");
    const data = await storage.adminSearch(q);
    res.json(data);
  });

  app.get("/api/admin/charts/growth", isAdmin, async (_req, res) => {
    const growth = await storage.getStudentGrowth();
    res.json(growth);
  });

  app.get("/api/admin/charts/lessons", isAdmin, async (_req, res) => {
    const lessons = await storage.getLessonsCompletedPerWeek();
    res.json(lessons);
  });

  app.get("/api/admin/charts/schools", isAdmin, async (_req, res) => {
    const schools = await storage.getMostActiveSchools();
    res.json(schools);
  });

  // Schools CRUD
  app.get("/api/admin/schools", isAdmin, async (_req, res) => {
    const data = await storage.getSchools();
    res.json(data);
  });
  app.post("/api/admin/schools", isAdmin, async (req, res) => {
    try {
      const school = await storage.createSchool(req.body);
      res.json(school);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.patch("/api/admin/schools/:id", isAdmin, async (req, res) => {
    try {
      const school = await storage.updateSchool(parseInt(req.params.id), req.body);
      res.json(school);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete("/api/admin/schools/:id", isAdmin, async (req, res) => {
    await storage.deleteSchool(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // Sponsors CRUD
  app.get("/api/admin/sponsors", isAdmin, async (_req, res) => {
    const data = await storage.getSponsors();
    res.json(data);
  });
  app.post("/api/admin/sponsors", isAdmin, async (req, res) => {
    try {
      const sponsor = await storage.createSponsor(req.body);
      res.json(sponsor);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.patch("/api/admin/sponsors/:id", isAdmin, async (req, res) => {
    try {
      const sponsor = await storage.updateSponsor(parseInt(req.params.id), req.body);
      res.json(sponsor);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete("/api/admin/sponsors/:id", isAdmin, async (req, res) => {
    await storage.deleteSponsor(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // DB Viewer
  app.get("/api/admin/db/:table", isAdmin, async (req, res) => {
    const rows = await storage.getAdminDbTable(req.params.table);
    res.json(rows);
  });

  // === BACKGROUND JOBS ===
  // Owner can poll their own job; admins can read any
  // Job status — accessible to either authenticated users (their own jobs) or
  // admin sessions. Admin sessions don't carry req.user, so isAuthenticated
  // alone would lock them out of polling export jobs.
  app.get("/api/jobs/:id", async (req: any, res) => {
    const isAdminUser = !!req.session?.isAdmin;
    const userId = req.user?.id ? String(req.user.id) : null;
    if (!isAdminUser && !userId) return res.status(401).json({ message: "Unauthorized" });
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Bad id" });
    const job = await getJob(id);
    if (!job) return res.status(404).json({ message: "Not found" });
    if (job.ownerId && job.ownerId !== userId && !isAdminUser) {
      return res.status(403).json({ message: "Forbidden" });
    }
    // Don't ship giant payloads back to the browser
    const { payload, result, ...safe } = job as any;
    res.json({ ...safe, hasResult: !!result });
  });

  app.get("/api/admin/jobs", isAdmin, async (req, res) => {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50")) || 50, 200);
    const kindParam = req.query.kind ? String(req.query.kind) : undefined;
    const kind = (kindParam === "extract-paper" || kindParam === "admin-csv-export") ? kindParam : undefined;
    const rows = await listRecentJobs({ limit, kind });
    res.json(rows.map(({ payload, result, ...rest }: any) => ({ ...rest, hasResult: !!result })));
  });

  // Enqueue an admin CSV export job (large datasets)
  app.post("/api/admin/exports/:type", isAdmin, async (req: any, res) => {
    const type = req.params.type;
    if (!["students", "teachers", "classes", "schools", "sponsors"].includes(type)) {
      return res.status(400).json({ message: "Unknown export type" });
    }
    const job = await enqueueJob({
      kind: "admin-csv-export",
      ownerId: String(req.user?.id ?? "admin"),
      payload: { type },
    });
    res.json({ jobId: job.id });
  });

  // Download the generated CSV from a finished export job (streamed from object storage)
  app.get("/api/admin/exports/:jobId/download", isAdmin, async (req, res) => {
    const id = parseInt(req.params.jobId);
    const job = await getJob(id);
    if (!job) return res.status(404).json({ message: "Not found" });
    if (job.kind !== "admin-csv-export") return res.status(400).json({ message: "Not an export job" });
    if (job.status !== "completed") return res.status(409).json({ message: `Job not ready (status: ${job.status})` });
    const result = job.result as { objectPath?: string; fileName?: string } | null;
    const objectPath = result?.objectPath;
    const payload = job.payload as { type?: string };
    const fileName = result?.fileName ?? `${payload?.type ?? "export"}.csv`;
    if (!objectPath) return res.status(500).json({ message: "Job result missing objectPath" });
    await streamPrivateObjectToResponse(objectPath, res, fileName, "text/csv");
  });

  // Legacy synchronous CSV export — kept for backward compatibility but
  // marked deprecated. New callers should POST /api/admin/exports/:type and
  // poll /api/jobs/:id, then GET /api/admin/exports/:jobId/download.
  app.get("/api/admin/reports/:type.csv", isAdmin, async (req, res) => {
    res.setHeader("Deprecation", "true");
    res.setHeader("Link", `</api/admin/exports/${req.params.type}>; rel="successor-version"`);
    let data: any[] = [];
    if (req.params.type === "students") data = await storage.getAdminStudents();
    else if (req.params.type === "teachers") data = await storage.getAdminTeachers();
    else if (req.params.type === "classes") data = await storage.getAdminClasses();
    else if (req.params.type === "schools") data = await storage.getSchools();
    else if (req.params.type === "sponsors") data = await storage.getSponsors();
    if (!data.length) return res.status(404).json({ message: "No data" });
    const cols = Object.keys(data[0]);
    const rows = data.map(row => cols.map(c => {
      const v = row[c];
      if (v instanceof Date) return v.toISOString().split("T")[0];
      return String(v ?? "");
    }).join(","));
    const csv = [cols.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.type}-report.csv"`);
    res.send(csv);
  });

  // === STUDENT SIDE - JOIN CLASS ===
  // Public endpoint: validate a code before a student registers.
  // Checks both teacher class codes (PostgreSQL) and org environment join codes (Supabase).
  app.get("/api/classes/check-code/:code", async (req, res) => {
    try {
      const code = req.params.code.toUpperCase().trim();

      // 1. Try teacher class code first
      const cls = await storage.getClassByCode(code);
      if (cls) {
        return res.json({ type: "class", id: cls.id, name: cls.name, subject: cls.subject });
      }

      // 2. Try org environment join code (Supabase)
      const env = await getOrgEnvironmentByJoinCode(code);
      if (env) {
        const org = await getOrganization(env.org_id);
        if (org && org.is_active) {
          return res.json({ type: "org", orgId: org.id, envId: env.id, name: org.name, envName: env.display_name });
        }
      }

      return res.status(404).json({ message: "Code not found. Double-check and try again." });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/student/join-class", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = z.object({ code: z.string().min(1) }).parse(req.body);
      const cls = await storage.getClassByCode(code);
      if (!cls) return res.status(404).json({ message: "Class not found. Check the code and try again." });
      const studentId = (req.user as any).id;
      const enrollment = await storage.enrollStudent(cls.id, studentId);

      // Auto-enroll in org if the class is linked to an org environment
      if (cls.envId) {
        const env = await getOrgEnvironmentById(cls.envId);
        if (env) {
          enrollStudentInOrg(env.org_id, env.id, studentId).catch(err =>
            console.warn("[join-class] org auto-enroll failed (non-blocking):", err?.message)
          );
        }
      }

      res.json({ enrollment, class: cls });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/student/classes", isAuthenticated, async (req: any, res) => {
    const studentId = (req.user as any).id;
    const data = await storage.getStudentClasses(studentId);
    res.json(data);
  });

  app.get("/api/student/classes/:classId/notifications", isAuthenticated, async (req: any, res) => {
    const classId = parseInt(req.params.classId);
    const studentId = (req.user as any).id;
    const enrolled = await storage.getStudentClasses(studentId);
    if (!enrolled.find(e => e.classId === classId)) return res.status(403).json({ message: "Not enrolled" });
    const notifications = await storage.getNotificationsByClass(classId);
    res.json(notifications);
  });

  // === STUDENT SIDE - JOIN ORGANIZATION VIA JOIN CODE ===

  // Preview: look up org+env info by join code (no side effects — used to show confirmation before enrolling)
  app.get("/api/org/join/preview", isAuthenticated, async (req: any, res) => {
    try {
      const raw = (req.query.code as string | undefined)?.toUpperCase().trim() ?? "";
      const codeResult = z.string().length(6).regex(/^[A-Z0-9]+$/).safeParse(raw);
      if (!codeResult.success) return res.status(400).json({ message: "Join code must be exactly 6 uppercase letters or digits." });
      const code = codeResult.data;

      const env = await getOrgEnvironmentByJoinCode(code);
      if (!env) return res.status(404).json({ message: "Invalid join code. Please check and try again." });

      const org = await getOrganization(env.org_id);
      if (!org) return res.status(404).json({ message: "Organization not found." });
      if (!org.is_active) return res.status(403).json({ message: "This organization is not currently active." });

      res.json({
        org: { id: org.id, name: org.name, type: org.type },
        env: { id: env.id, display_name: env.display_name },
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Enroll: actually add the student to the org environment
  app.post("/api/org/join", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = z.object({
        code: z.string().min(6).max(6).regex(/^[A-Z0-9]+$/, "Join code must be 6 uppercase letters or digits."),
      }).parse(req.body);
      const env = await getOrgEnvironmentByJoinCode(code);
      if (!env) return res.status(404).json({ message: "Invalid join code. Please check and try again." });

      const org = await getOrganization(env.org_id);
      if (!org) return res.status(404).json({ message: "Organization not found." });
      if (!org.is_active) return res.status(403).json({ message: "This organization is not currently active." });

      const studentUserId = String((req.user as any).id);
      const result = await enrollStudentInOrg(org.id, env.id, studentUserId);

      if (!result.success) {
        return res.status(500).json({ message: "Failed to enroll. Please try again." });
      }

      res.json({
        alreadyEnrolled: result.alreadyEnrolled,
        org: { name: org.name, type: org.type },
        env: { display_name: env.display_name },
      });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      res.status(500).json({ message: e.message });
    }
  });

  // === SUPABASE ORGANIZATIONS & ENVIRONMENTS ===
  initSupabaseTables()
    .then(() => seedFinancialAcademyLesson())
    .catch(e => console.error("[Supabase] Init error:", e));

  app.get("/api/supabase/status", async (_req, res) => {
    if (!supabase) return res.json({ connected: false, reason: "Missing credentials" });
    const { error } = await supabase.from("organizations").select("id").limit(1);
    res.json({ connected: !error, error: error?.message });
  });

  app.get("/api/admin/organizations", isAdmin, async (_req, res) => {
    const orgs = await getOrganizations();
    res.json(orgs);
  });

  app.get("/api/admin/organizations/:id", isAdmin, async (req, res) => {
    const org = await getOrganization(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    res.json(org);
  });

  app.post("/api/admin/organizations", isAdmin, async (req, res) => {
    try {
      const body = z.object({
        name: z.string().min(1),
        type: z.enum(["school", "credit_union", "government", "ngo", "other"]).default("school"),
        country: z.string().default("Bahamas"),
        city: z.string().optional(),
        website: z.string().optional(),
        contact_name: z.string().optional(),
        contact_email: z.string().optional(),
        subscription_tier: z.enum(["free", "standard", "premium"]).default("free"),
        max_students: z.number().default(100),
      }).parse(req.body);
      const org = await createOrganization({ ...body, is_active: true, logo_url: undefined });
      if (!org) return res.status(500).json({ message: "Failed to create organization" });
      res.json(org);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/organizations/:id", isAdmin, async (req, res) => {
    const org = await updateOrganization(req.params.id, req.body);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    const { invalidateOrganizationCache } = await import("./supabase");
    await invalidateOrganizationCache(req.params.id);
    res.json(org);
  });

  // Flat list of all org environments (used in admin link dropdowns)
  app.get("/api/admin/org-envs", isAdmin, async (_req, res) => {
    const orgs = await getOrganizations();
    const envRows: any[] = [];
    await Promise.all(orgs.map(async (org) => {
      const envs = await getOrgEnvironments(org.id);
      for (const env of envs) {
        envRows.push({ ...env, org_name: org.name });
      }
    }));
    res.json(envRows);
  });

  app.get("/api/admin/organizations/:id/environments", isAdmin, async (req, res) => {
    const envs = await getOrgEnvironments(req.params.id);
    res.json(envs);
  });

  app.post("/api/admin/organizations/:id/environments", isAdmin, async (req, res) => {
    try {
      const body = z.object({
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
        display_name: z.string().min(1),
        theme_color: z.string().optional(),
        features_enabled: z.array(z.string()).default(["money_games","investment_sim","money_guide","moneylab"]),
      }).parse(req.body);
      const env = await createOrgEnvironment({ org_id: req.params.id, ...body, custom_logo_url: undefined });
      if (!env) return res.status(500).json({ message: "Failed to create environment" });
      res.json(env);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/leaderboard", isAdmin, async (req, res) => {
    const envId = req.query.env_id as string | undefined;
    const data = await getLeaderboard(envId, 100);
    res.json(data);
  });

  app.post("/api/leaderboard/snapshot", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const body = z.object({
        total_xp: z.number().default(0),
        exams_passed: z.number().default(0),
        games_won: z.number().default(0),
        org_id: z.string().optional(),
        env_id: z.string().optional(),
      }).parse(req.body);
      await upsertLeaderboardSnapshot({
        student_user_id: user.id,
        display_name: user.firstName || user.username || "Student",
        avatar: user.avatar,
        ...body,
      });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/analytics/event", isAuthenticated, async (req: any, res) => {
    try {
      const body = z.object({
        event_type: z.string().min(1),
        event_data: z.record(z.any()).optional(),
        org_id: z.string().optional(),
        env_id: z.string().optional(),
      }).parse(req.body);
      await trackEvent({ student_user_id: req.user?.id, ...body });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // === LESSON PLANS (admin) ===

  app.get("/api/admin/organizations/:id/lessons", isAdmin, async (req, res) => {
    const lessons = await getLessonsByOrg(req.params.id);
    res.json(lessons);
  });

  app.post("/api/admin/organizations/:id/lessons", isAdmin, async (req, res) => {
    try {
      const body = z.object({
        title: z.string().min(1),
        instructor: z.string().optional(),
        subject: z.string().optional(),
        grade_level: z.string().optional(),
        topic: z.string().optional(),
        duration: z.string().optional(),
        video_url: z.string().optional(),
        env_id: z.string().uuid().optional().nullable(),
        objectives: z.array(z.string()).default([]),
        content_sections: z.array(z.object({
          heading: z.string(),
          body: z.string(),
          examples: z.array(z.string()).optional(),
        })).default([]),
        questions: z.array(z.object({
          question: z.string().min(1),
          option_a: z.string().min(1),
          option_b: z.string().min(1),
          option_c: z.string().min(1),
          option_d: z.string().min(1),
          correct_answer: z.enum(["A", "B", "C", "D"]),
        })).default([]),
      }).parse(req.body);

      const { questions, ...planData } = body;
      const lesson = await createLessonPlan({ ...planData, org_id: req.params.id, is_published: false });
      if (!lesson) return res.status(500).json({ message: "Failed to create lesson" });

      for (let i = 0; i < questions.length; i++) {
        await createLessonQuizQuestion({ ...questions[i], lesson_id: lesson.id, order_index: i });
      }

      const full = await getLessonWithQuestions(lesson.id);
      res.json(full);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/lessons/:id/publish", isAdmin, async (req, res) => {
    try {
      const { is_published } = z.object({ is_published: z.boolean() }).parse(req.body);
      const lesson = await toggleLessonPublish(req.params.id, is_published);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      res.json(lesson);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // === LESSON PLANS (student) ===

  // Helper: collect all lessons accessible to a student with correct env scoping.
  // - Direct org enrollment → all published lessons for that org (org-scoped; env_id may be null or any)
  // - Class-linked enrollment → only published lessons for that specific env_id
  async function getStudentAccessibleLessons(userId: string): Promise<import("./supabase").LessonPlan[]> {
    const [directOrgIds, studentClasses] = await Promise.all([
      getStudentOrgIds(userId),
      storage.getStudentClasses(userId),
    ]);

    const linkedEnvIds = studentClasses
      .map(e => e.class.envId)
      .filter((envId): envId is string => !!envId);

    const lessonFetches: Promise<import("./supabase").LessonPlan[]>[] = [
      ...directOrgIds.map(id => getPublishedLessons(id)),
      ...linkedEnvIds.map(envId => getPublishedLessonsByEnv(envId)),
    ];

    const results = await Promise.all(lessonFetches);

    // Deduplicate by lesson id
    const seen = new Set<string>();
    return results.flat().filter(l => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
  }

  // Helper: check if a student has access to a specific lesson (for access control on /lessons/:id)
  async function studentHasLessonAccess(userId: string, lesson: import("./supabase").LessonPlan): Promise<boolean> {
    const directOrgIds = await getStudentOrgIds(userId);
    if (directOrgIds.includes(lesson.org_id)) return true;

    // Check class-linked env access (lesson must be env-scoped to that env_id)
    if (lesson.env_id) {
      const studentClasses = await storage.getStudentClasses(userId);
      const linkedEnvIds = studentClasses
        .map(e => e.class.envId)
        .filter((envId): envId is string => !!envId);
      if (linkedEnvIds.includes(lesson.env_id)) return true;
    }

    return false;
  }

  app.get("/api/lessons", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.id;
    if (!userId) return res.json([]);
    const lessons = await getStudentAccessibleLessons(userId);
    res.json(lessons);
  });

  app.get("/api/lessons/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.id;
    const lesson = await getLessonWithQuestions(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    if (!lesson.is_published) return res.status(403).json({ message: "Lesson not published" });
    const hasAccess = userId ? await studentHasLessonAccess(userId, lesson) : false;
    if (!hasAccess) return res.status(403).json({ message: "Access denied" });
    const org = lesson.org_id ? await getOrganization(lesson.org_id) : null;
    res.json({
      ...lesson,
      org_name: org?.name ?? null,
      org_logo_url: org?.logo_url ?? null,
      org_signature_left_name: org?.signature_left_name ?? null,
      org_signature_left_role: org?.signature_left_role ?? null,
      org_signature_right_name: org?.signature_right_name ?? null,
      org_signature_right_role: org?.signature_right_role ?? null,
    });
  });

  // === ORG ADMIN AUTH ROUTES ===
  const isOrgAdmin = (req: any, res: any, next: any) => {
    if (!req.session?.orgAdminId) return res.status(401).json({ message: "Org admin not authenticated" });
    next();
  };

  app.post("/api/org/auth/register", async (req, res) => {
    try {
      const { firstName, lastName, email, password, joinCode } = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        joinCode: z.string().min(1),
      }).parse(req.body);

      // Verify join code resolves to a real org environment
      const env = await getOrgEnvironmentByJoinCode(joinCode);
      if (!env) return res.status(400).json({ message: "Invalid organization join code" });

      const org = await getOrganization(env.org_id);
      if (!org) return res.status(400).json({ message: "Organization not found" });

      const existing = await storage.getOrgAdminByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already in use" });

      const passwordHash = await bcrypt.hash(password, 12);
      const admin = await storage.createOrgAdmin({
        firstName, lastName, email: email.toLowerCase(), passwordHash,
        orgId: env.org_id, envId: env.id, role: "admin",
      });
      (req as any).session.orgAdminId = admin.id;
      const { passwordHash: _, ...safe } = admin;
      return res.json({ ...safe, orgName: org.name, envName: env.display_name });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/org/auth/login", async (req, res) => {
    try {
      const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
      const admin = await storage.getOrgAdminByEmail(email);
      if (!admin) return res.status(401).json({ message: "Invalid email or password" });
      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });
      (req as any).session.orgAdminId = admin.id;
      const { passwordHash: _, ...safe } = admin;
      // Fetch org and env names
      const org = await getOrganization(admin.orgId);
      const envs = await getOrgEnvironments(admin.orgId);
      const env = envs.find(e => e.id === admin.envId);
      return res.json({ ...safe, orgName: org?.name ?? "", envName: env?.display_name ?? "" });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/org/auth/logout", (req, res) => {
    delete (req as any).session.orgAdminId;
    res.json({ ok: true });
  });

  app.get("/api/org/auth/me", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    const { passwordHash: _, ...safe } = admin;
    const org = await getOrganization(admin.orgId);
    const envs = await getOrgEnvironments(admin.orgId);
    const env = envs.find(e => e.id === admin.envId);
    res.json({ ...safe, orgName: org?.name ?? "", envName: env?.display_name ?? "" });
  });

  // === ORG ADMIN DATA ROUTES ===

  app.get("/api/org-admin/overview", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });

    const org = await getOrganization(admin.orgId);
    const envs = await getOrgEnvironments(admin.orgId);
    const currentEnv = envs.find(e => e.id === admin.envId);

    // Count students across ALL environments in this org
    let orgStudentCount = 0;
    let envStudentCount = 0;
    if (supabase) {
      const { data: allStudents } = await supabase.from("org_students").select("id,env_id").eq("org_id", admin.orgId);
      orgStudentCount = allStudents?.length ?? 0;
      envStudentCount = allStudents?.filter((s: any) => s.env_id === admin.envId).length ?? 0;
    }

    // Count lessons for this org
    const lessons = await getLessonsByOrg(admin.orgId);
    const envLessons = lessons.filter((l: any) => l.env_id === admin.envId || !l.env_id);
    const publishedLessons = envLessons.filter((l: any) => l.is_published).length;

    // Per-environment summary
    const envSummaries = await Promise.all(envs.map(async (env) => {
      let count = 0;
      if (supabase) {
        const { data } = await supabase.from("org_students").select("id").eq("env_id", env.id);
        count = data?.length ?? 0;
      }
      return { id: env.id, slug: env.slug, displayName: env.display_name, joinCode: env.join_code, studentCount: count };
    }));

    res.json({
      org: { id: org?.id, name: org?.name, type: org?.type, country: org?.country },
      env: { id: currentEnv?.id, slug: currentEnv?.slug, displayName: currentEnv?.display_name, joinCode: currentEnv?.join_code, featuresEnabled: currentEnv?.features_enabled },
      stats: {
        studentCount: envStudentCount,
        orgStudentCount,
        environmentCount: envs.length,
        totalLessons: envLessons.length,
        publishedLessons,
      },
      environments: envSummaries,
    });
  });

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
      const allowed = [
        "guide_chat_per_user", "tutor_explain_per_user", "ai_insights_per_user",
        "guide_chat_per_org", "tutor_explain_per_org", "ai_insights_per_org",
      ];
      const updates: any = {};
      for (const key of allowed) {
        if (key in req.body) updates[key] = req.body[key];
      }
      await updateOrgQuotaSettings(admin.orgId, updates);
      const settings = await getOrgQuotaSettings(admin.orgId);
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/org-admin/students", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });

    if (!supabase) return res.json([]);
    const { data, error } = await supabase
      .from("org_students")
      .select("*")
      .eq("org_id", admin.orgId)
      .order("joined_at", { ascending: false });
    if (error) return res.status(500).json({ message: error.message });

    const orgStudents = data ?? [];

    // Fetch all environments for this org to resolve display names
    const envs = await getOrgEnvironments(admin.orgId);
    const envMap: Record<string, string> = {};
    for (const env of envs) {
      envMap[env.id] = env.display_name ?? env.slug ?? env.id;
    }

    // Enrich with local user profile data (name, avatar, XP, level) from PostgreSQL
    const enriched = await Promise.all(orgStudents.map(async (s: any) => {
      const user = await storage.getUser(s.student_user_id).catch(() => null);
      const xpData = await storage.getUserXp(s.student_user_id).catch(() => null);
      return {
        ...s,
        displayName: user?.firstName ?? s.student_user_id,
        username: (user as any)?.username ?? null,
        avatar: (user as any)?.avatar ?? null,
        xp: xpData?.totalXp ?? 0,
        level: xpData?.level ?? 1,
        streak: xpData?.currentStreak ?? 0,
        envName: envMap[s.env_id] ?? s.env_id,
      };
    }));

    res.json(enriched);
  });

  app.delete("/api/org-admin/students/:studentUserId", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    if (!supabase) return res.status(503).json({ message: "Supabase not available" });

    // Scope deletion to this org only (not just env) so admin can remove from all environments
    const { error } = await supabase
      .from("org_students")
      .delete()
      .eq("org_id", admin.orgId)
      .eq("student_user_id", req.params.studentUserId);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ ok: true });
  });

  // Certificate branding (logo + signatures) — Task #16
  app.get("/api/org-admin/branding", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    const org = await getOrganization(admin.orgId);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    res.json({
      logoUrl: org.logo_url ?? null,
      signatureLeftName: org.signature_left_name ?? null,
      signatureLeftRole: org.signature_left_role ?? null,
      signatureRightName: org.signature_right_name ?? null,
      signatureRightRole: org.signature_right_role ?? null,
    });
  });

  app.patch("/api/org-admin/branding", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      const body = z.object({
        // New uploads return short /public-objects/... URLs; legacy base64 logos are not
        // resubmitted from the client (OrgBranding only sends logoUrl when changed)
        logoUrl: z.string().max(2048).nullable().optional(),
        signatureLeftName: z.string().max(80).nullable().optional(),
        signatureLeftRole: z.string().max(80).nullable().optional(),
        signatureRightName: z.string().max(80).nullable().optional(),
        signatureRightRole: z.string().max(80).nullable().optional(),
      }).parse(req.body);

      // Accept object-storage public URLs, http(s) URLs, or legacy data URLs
      if (
        body.logoUrl &&
        !/^(\/public-objects\/|data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,|https?:\/\/)/i.test(body.logoUrl)
      ) {
        return res.status(400).json({ message: "Logo must be an uploaded file URL or http(s) URL" });
      }

      const updates: Partial<Organization> = {};
      if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl;
      if (body.signatureLeftName !== undefined) updates.signature_left_name = body.signatureLeftName;
      if (body.signatureLeftRole !== undefined) updates.signature_left_role = body.signatureLeftRole;
      if (body.signatureRightName !== undefined) updates.signature_right_name = body.signatureRightName;
      if (body.signatureRightRole !== undefined) updates.signature_right_role = body.signatureRightRole;

      const org = await updateOrganization(admin.orgId, updates);
      if (!org) return res.status(500).json({ message: "Failed to update organization branding" });
      const { invalidateOrganizationCache } = await import("./supabase");
      await invalidateOrganizationCache(admin.orgId);
      res.json({
        logoUrl: org.logo_url ?? null,
        signatureLeftName: org.signature_left_name ?? null,
        signatureLeftRole: org.signature_left_role ?? null,
        signatureRightName: org.signature_right_name ?? null,
        signatureRightRole: org.signature_right_role ?? null,
      });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Upload a logo file to object storage — returns a public URL the client saves via PATCH /branding
  const handleLogoUpload = (req: any, res: any, next: any) => {
    logoUpload.single("logo")(req, res, (err: any) => {
      if (err) {
        const status = err?.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ message: err.message || "Logo upload failed" });
      }
      next();
    });
  };
  app.post(
    "/api/org-admin/branding/logo",
    isOrgAdmin,
    handleLogoUpload,
    async (req: any, res) => {
      try {
        const admin = await storage.getOrgAdminById(req.session.orgAdminId);
        if (!admin) return res.status(401).json({ message: "Not found" });
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const mimeToExt: Record<string, string> = {
          "image/png": "png",
          "image/jpeg": "jpg",
          "image/jpg": "jpg",
          "image/webp": "webp",
          "image/gif": "gif",
        };
        const ext = mimeToExt[req.file.mimetype.toLowerCase()] || "png";
        const filename = `${admin.orgId}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

        // Store in the first configured public search path so it's served by /public-objects/<key>
        const publicPaths = objectStorage.getPublicObjectSearchPaths();
        const targetDir = publicPaths[0]; // e.g. "/<bucket>/public"
        const objectKey = `logos/${filename}`;
        const fullPath = `${targetDir.replace(/\/$/, "")}/${objectKey}`;
        const [, bucketName, ...rest] = fullPath.split("/");
        const objectName = rest.join("/");

        await objectStorageClient
          .bucket(bucketName)
          .file(objectName)
          .save(req.file.buffer, {
            contentType: req.file.mimetype,
            resumable: false,
            metadata: {
              cacheControl: "public, max-age=2592000",
            },
          });

        const url = `/public-objects/${objectKey}`;
        res.status(201).json({ url });
      } catch (e: any) {
        console.error("Logo upload failed:", e);
        res.status(500).json({ message: e.message || "Logo upload failed" });
      }
    },
  );

  app.get("/api/org-admin/lessons", isOrgAdmin, async (req: any, res) => {
    const admin = await storage.getOrgAdminById(req.session.orgAdminId);
    if (!admin) return res.status(401).json({ message: "Not found" });
    const lessons = await getLessonsByOrg(admin.orgId);
    res.json(lessons);
  });

  app.post("/api/org-admin/lessons", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      const body = z.object({
        title: z.string().min(1),
        instructor: z.string().optional(),
        subject: z.string().optional(),
        gradeLevel: z.string().optional(),
        topic: z.string().optional(),
        duration: z.string().optional(),
        videoUrl: z.string().optional(),
        objectives: z.array(z.string()).default([]),
        contentSections: z.array(z.object({ heading: z.string(), body: z.string(), examples: z.array(z.string()).optional() })).default([]),
      }).parse(req.body);

      const lesson = await createLessonPlan({
        org_id: admin.orgId,
        env_id: admin.envId,
        title: body.title,
        instructor: body.instructor ?? null,
        subject: body.subject ?? null,
        grade_level: body.gradeLevel ?? null,
        topic: body.topic ?? null,
        duration: body.duration ?? null,
        video_url: body.videoUrl || null,
        objectives: body.objectives,
        content_sections: body.contentSections,
        is_published: false,
      });
      if (!lesson) return res.status(500).json({ message: "Failed to create lesson" });
      res.json(lesson);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/org-admin/lessons/:id/publish", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      // Verify lesson belongs to this admin's org before mutating
      const existing = await getLessonWithQuestions(req.params.id);
      if (!existing || existing.org_id !== admin.orgId) {
        return res.status(403).json({ message: "Access denied — lesson does not belong to your organization" });
      }
      const { isPublished } = z.object({ isPublished: z.boolean() }).parse(req.body);
      const lesson = await toggleLessonPublish(req.params.id, isPublished);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      res.json(lesson);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/org-admin/lessons/:id/questions", isOrgAdmin, async (req: any, res) => {
    try {
      const admin = await storage.getOrgAdminById(req.session.orgAdminId);
      if (!admin) return res.status(401).json({ message: "Not found" });
      // Verify lesson belongs to this admin's org before adding questions
      const existing = await getLessonWithQuestions(req.params.id);
      if (!existing || existing.org_id !== admin.orgId) {
        return res.status(403).json({ message: "Access denied — lesson does not belong to your organization" });
      }
      const body = z.object({
        question: z.string().min(1),
        optionA: z.string().min(1),
        optionB: z.string().min(1),
        optionC: z.string().min(1),
        optionD: z.string().min(1),
        correctAnswer: z.enum(["A", "B", "C", "D"]),
        orderIndex: z.number().default(0),
      }).parse(req.body);

      const q = await createLessonQuizQuestion({
        lesson_id: req.params.id,
        question: body.question,
        option_a: body.optionA,
        option_b: body.optionB,
        option_c: body.optionC,
        option_d: body.optionD,
        correct_answer: body.correctAnswer,
        order_index: body.orderIndex,
      });
      if (!q) return res.status(500).json({ message: "Failed to create question" });
      res.json(q);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/lessons/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      // Accept submitted answers as array of letters (A/B/C/D) for server-side scoring
      const { answers } = z.object({
        answers: z.array(z.enum(["A", "B", "C", "D"])).min(1),
      }).parse(req.body);

      // Validate lesson existence, publication, and user's org access
      const lesson = await getLessonWithQuestions(req.params.id);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      if (!lesson.is_published) return res.status(403).json({ message: "Lesson not published" });

      const hasAccess = await studentHasLessonAccess(userId, lesson);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Server-side scoring — compare submitted answers to stored correct answers
      const questions = lesson.questions.sort((a, b) => a.order_index - b.order_index);
      const total = questions.length;
      const scored = Math.min(answers.length, total);
      const correctAnswers = answers
        .slice(0, scored)
        .reduce((acc, ans, i) => acc + (ans === questions[i].correct_answer ? 1 : 0), 0);

      const xpEarned = total > 0
        ? Math.round(correctAnswers * 10 + (correctAnswers / total) * 20)
        : 0;

      const currentXp = await storage.getUserXp(userId);
      const newTotalXp = currentXp.totalXp + xpEarned;
      const newLevel = Math.floor(newTotalXp / 100) + 1;
      await storage.updateUserXp(userId, {
        totalXp: newTotalXp,
        level: newLevel,
        currentStreak: currentXp.currentStreak,
        longestStreak: currentXp.longestStreak,
        lastPlayedAt: new Date(),
      });

      res.json({ xpEarned, totalXp: newTotalXp, level: newLevel, correctAnswers, total });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  return httpServer;
}
