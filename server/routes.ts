import { Express } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import * as XLSX from "xlsx";

import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerAudioRoutes } from "./replit_integrations/audio";
import { openai } from "./replit_integrations/chat/routes";
import { isVeryfiConfigured, parseWithVeryfi } from "./veryfi";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth setup
  await setupAuth(app);
  registerAuthRoutes(app);

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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
        model: "gpt-4o",
        messages: [{ role: "system", content: "You are a senior financial advisor specializing in Caribbean economies and personal finance." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" }
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
    const userId = (req.user as any).claims.sub;
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    const transactions = await storage.getTransactions(userId, filters);
    res.json(transactions);
  });

  app.post(api.transactions.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    const id = Number(req.params.id);
    await storage.deleteTransaction(id, userId);
    res.status(204).end();
  });

  // Categories
  app.get(api.categories.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const categories = await storage.getCategories(userId);
    res.json(categories);
  });

  app.post(api.categories.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    const budgets = await storage.getBudgets(userId);
    res.json(budgets);
  });

  app.post(api.budgets.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    const id = Number(req.params.id);
    await storage.deleteBudget(id, userId);
    res.status(204).end();
  });

  // Cards
  app.get(api.cards.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const cards = await storage.getLinkedCards(userId);
    res.json(cards);
  });

  app.post(api.cards.link.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const { cardNumber, bankName } = api.cards.link.input.parse(req.body);
    const lastFour = cardNumber.slice(-4);
    
    const card = await storage.linkCard({ userId, lastFour, bankName });

    res.status(201).json(card);
  });

  // Savings Goals
  app.get("/api/savings-goals", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const goals = await storage.getSavingsGoals(userId);
    res.json(goals);
  });

  app.post("/api/savings-goals", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    const id = Number(req.params.id);
    await storage.deleteSavingsGoal(id, userId);
    res.status(204).end();
  });

  // Bill Reminders
  app.get("/api/bill-reminders", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const reminders = await storage.getBillReminders(userId);
    res.json(reminders);
  });

  app.post("/api/bill-reminders", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    const id = Number(req.params.id);
    await storage.deleteBillReminder(id, userId);
    res.status(204).end();
  });

  // Auto-detect recurring bills from transaction history
  app.post("/api/bill-reminders/auto-detect", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    const uploads = await storage.getDocumentUploads(userId);
    res.json(uploads);
  });

  app.delete("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
      const holdings = await storage.getPortfolioHoldings(userId);
      const balance = await storage.getVirtualBalance(userId);
      res.json({ holdings, virtualBalance: balance });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/investments/buy", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
      const history = await storage.getPortfolioTransactions(userId);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === LEARNING MODULES ROUTES ===

  app.get("/api/learn/modules", isAuthenticated, async (_req, res) => {
    try {
      const modules = await storage.getLearningModules();
      res.json(modules);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/learn/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const progress = await storage.getUserLearningProgress(userId);
      res.json(progress);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/learn/complete/:moduleId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const moduleId = Number(req.params.moduleId);
      const progress = await storage.completeModule(userId, moduleId);
      res.json(progress);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
