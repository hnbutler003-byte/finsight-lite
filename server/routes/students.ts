import { Express } from "express";
import { storage } from "../storage";
import { audit } from "../audit";
import { isAuthenticated } from "../replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import * as XLSX from "xlsx";
import { isVeryfiConfigured, parseWithVeryfi } from "../veryfi";
import { openai } from "../replit_integrations/chat/routes";
import { enqueueJob } from "../jobs";
import { sendEmail } from "../email";
import { db as emailDb } from "../db";
import { emailContacts } from "@shared/schema";
import { eq as eqEmail, and as andEmail } from "drizzle-orm";
import { escapeHtml, appBaseUrl } from "../email";
import { captureError } from "../sentry";
import {
  getOrgEnvironmentByJoinCode,
  getOrgEnvironmentById,
  getOrganization,
  getStudentOrgIds,
  enrollStudentInOrg,
  upsertLeaderboardSnapshot,
  trackEvent,
  getPublishedLessonsByEnv,
  supabase,
} from "../supabase";
import { isTeacher } from "./auth";
import { getStockExplainer } from "./investmentExplainer";
import { classifyAiAccess, AI_BLOCKED_MSG } from "./ai";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".csv", ".pdf", ".xlsx", ".xls"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV, PDF, and Excel files are supported"));
    }
  },
});

const EXCHANGE_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  BSD: 1,
  BBD: 0.50,
  JMD: 0.0064,
  TTD: 0.147,
  XCD: 0.37,
  GYD: 0.0048,
  HTG: 0.0075,
};

export async function registerStudentRoutes(app: Express): Promise<void> {

  // ── YouTube oEmbed proxy ───────────────────────────────────────────────────
  const _oembedCache = new Map<string, { data: { embedUrl: string; thumbnailUrl: string; title: string }; expiry: number }>();

  app.get("/api/video/oembed", isAuthenticated, async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "Missing url parameter" });

    const now = Date.now();
    const cached = _oembedCache.get(url);
    if (cached && cached.expiry > now) return res.json(cached.data);

    try {
      const r = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!r.ok) return res.status(404).json({ error: "Video not found or not embeddable" });

      const json = await r.json() as any;
      const srcMatch = (json.html as string | undefined)?.match(/src="([^"]+)"/);
      if (!srcMatch) return res.status(404).json({ error: "Could not parse embed URL" });

      const data = {
        embedUrl: srcMatch[1],
        thumbnailUrl: (json.thumbnail_url as string) ?? "",
        title: (json.title as string) ?? "",
      };
      _oembedCache.set(url, { data, expiry: now + 60 * 60 * 1000 });
      return res.json(data);
    } catch {
      return res.status(404).json({ error: "Could not resolve video URL" });
    }
  });

  app.get("/api/currency/rates", isAuthenticated, (_req, res) => {
    res.json({ rates: EXCHANGE_RATES_TO_USD });
  });

  app.get("/api/student/last-activity", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const data = await storage.getStudentLastActivity(userId);
      res.json(data);
    } catch (err: any) {
      captureError(err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/stats/converted", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const baseCurrency = (req.query.baseCurrency as string) || "BSD";
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        period: req.query.period as "monthly" | "yearly",
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
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyData[key] = { income: 0, expenses: 0, categories: {} };
      }

      for (const tx of transactions) {
        const txDate = new Date(tx.date);
        const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
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

        for (const cat of Array.from(allCategories)) {
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

  // Transactions
  app.get(api.transactions.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
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
      const bodySchema = api.transactions.create.input.extend({
        amount: z.coerce.string(),
        categoryId: z.coerce.number().optional(),
        date: z.coerce.date(),
      });
      const input = bodySchema.parse(req.body);
      const transaction = await storage.createTransaction({ ...input, userId });
      res.status(201).json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
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
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
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
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
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
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
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
      period: req.query.period as "monthly" | "yearly",
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
        fileType: ext.replace(".", ""),
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
            matchCategory(["allowance", "pocket money", "stipend"], "Allowance");
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
            error: "Could not read the file contents",
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
            error: "The file appears to be empty",
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
          response_format: { type: "json_object" },
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
            error: parsed.error || "No transactions found in this file",
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
      res.setHeader("Content-Disposition", `attachment; filename="finsight360-transactions-${new Date().toISOString().split("T")[0]}.csv"`);
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
        })),
      };

      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Summary export failed" });
    }
  });

  // === INVESTMENT SIMULATION ROUTES ===
  await storage.seedMarketData();
  await storage.seedLearningModules();

  app.get("/api/investments/market", isAuthenticated, async (req, res) => {
    try {
      const currency = req.query.currency as string | undefined;
      await storage.simulateMarketPrices();
      const stocks = await storage.getMarketStocks(currency);
      res.json(stocks);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/investments/explainer/:stockId", isAuthenticated, async (req, res) => {
    try {
      const stockId = parseInt(req.params.stockId);
      if (isNaN(stockId)) return res.status(400).json({ message: "Invalid stockId" });

      const userId = (req.user as any).id;
      const orgIds = await getStudentOrgIds(userId).catch(() => [] as string[]);
      const accessTier = classifyAiAccess((req.user as any).username ?? "", orgIds);
      if (accessTier !== "enrolled") {
        return res.status(403).json({ message: AI_BLOCKED_MSG[accessTier], blocked: true });
      }

      const explanation = await getStockExplainer(stockId);
      res.json({ explanation });
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
      const { cached } = await import("../cache");
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
      await audit({ actorType: "teacher", actorId: req.session.teacherId, action: "teacher.class.create", targetType: "class", targetId: cls.id, meta: { name, subject }, req });
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
      await audit({ actorType: "teacher", actorId: req.session.teacherId, action: "teacher.class.update", targetType: "class", targetId: id, meta: data, req });
      res.json(cls);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/teacher/classes/:id", isTeacher, async (req: any, res) => {
    const id = parseInt(req.params.id);
    try {
      await storage.deleteClass(id, req.session.teacherId);
      await audit({ actorType: "teacher", actorId: req.session.teacherId, action: "teacher.class.delete", targetType: "class", targetId: id, req });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(404).json({ message: e.message });
    }
  });

  app.get("/api/teacher/classes/:id/students", isTeacher, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const cls = await storage.getClassById(id);
    if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
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
    try {
      await storage.removeEnrollment(classId, req.params.studentId);
      await audit({ actorType: "teacher", actorId: req.session.teacherId, action: "teacher.class.student.remove", targetType: "user", targetId: req.params.studentId, meta: { classId }, req });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(404).json({ message: e.message });
    }
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

  app.get("/api/teacher/classes/:id/investment-analytics", isTeacher, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const cls = await storage.getClassById(id);
      if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
      const data = await storage.getClassInvestmentAnalytics(id);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/teacher/classes/:id/insights", isTeacher, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const cls = await storage.getClassById(id);
      if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
      const data = await storage.getClassInsightCards(id);
      res.json(data);
    } catch (err: any) {
      captureError(err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/teacher/classes/:id/impact-summary", isTeacher, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const cls = await storage.getClassById(id);
      if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
      const data = await storage.getClassImpactSummary(id);
      res.json(data);
    } catch (err: any) {
      captureError(err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/teacher/classes/:id/lessons", isTeacher, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const cls = await storage.getClassById(id);
    if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
    if (!cls.envId) return res.json([]);
    const lessons = await getPublishedLessonsByEnv(cls.envId);
    res.json(lessons);
  });

  app.get("/api/teacher/classes/:id/report.csv", isTeacher, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const cls = await storage.getClassById(id);
    if (!cls || cls.teacherId !== req.session.teacherId) return res.status(404).json({ message: "Class not found" });
    const summary = await storage.getClassProgressSummary(id);
    const rows = [
      ["Name", "Username", "XP", "Level", "Streak", "Lessons Completed", "Games Played", "Avg Score (%)", "Badges"],
      ...summary.students.map((s: any) => [s.name, s.username, s.xp, s.level, s.streak, s.lessonsCompleted, s.gamesPlayed, s.avgScore, s.badges]),
    ];
    const csv = rows.map(r => r.map(String).map((v: string) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${cls.name.replace(/[^a-z0-9]/gi, "_")}_report.csv"`);
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

  app.get("/api/teacher/challenges", isTeacher, async (req: any, res) => {
    try {
      const teacherClasses = await storage.getClassesByTeacher(req.session.teacherId);
      if (!teacherClasses.length) return res.json([]);
      const byClass = await Promise.all(teacherClasses.map(c => storage.getChallengesByClass(c.id)));
      res.json(byClass.flat());
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
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

      try {
        const enrollments = await storage.getEnrollmentsByClass(id);
        const teacher = await storage.getTeacherById(req.session.teacherId);
        const baseUrl = appBaseUrl();
        for (const en of enrollments) {
          let [contact] = await emailDb.select().from(emailContacts).where(
            andEmail(eqEmail(emailContacts.userKind, "student"), eqEmail(emailContacts.userId, en.studentId)),
          );
          if (!contact) {
            const acctEmail = en.student?.email
              || (en.student?.username && en.student.username.includes("@") ? en.student.username : null);
            if (!acctEmail) continue;
            const [created] = await emailDb.insert(emailContacts).values({
              userKind: "student",
              userId: en.studentId,
              email: acctEmail,
              verified: true,
              classNotifications: true,
              weeklyDigest: true,
              orgId: teacher?.orgId ?? null,
            }).returning();
            contact = created;
          } else if (!contact.classNotifications || !contact.verified) {
            continue;
          }
          if (!contact.orgId && teacher?.orgId) {
            await emailDb.update(emailContacts).set({ orgId: teacher.orgId, updatedAt: new Date() })
              .where(eqEmail(emailContacts.id, contact.id));
            contact = { ...contact, orgId: teacher.orgId };
          }
          const html = `<!doctype html><html><body style="font-family:system-ui,Arial;background:#f6f7fb;padding:24px">
            <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
              <div style="font-size:14px;color:#6b7280">${escapeHtml(cls.name)} · ${escapeHtml(teacher?.firstName ?? "Your teacher")}</div>
              <h1 style="font-size:20px;margin:8px 0 12px">${escapeHtml(body.title)}</h1>
              <p style="line-height:1.6;color:#111827;white-space:pre-wrap">${escapeHtml(body.message)}</p>
              <p style="margin-top:24px"><a href="${escapeHtml(baseUrl)}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open FinSight Lite</a></p>
              <p style="font-size:12px;color:#6b7280;margin-top:16px"><a href="${escapeHtml(baseUrl)}/settings" style="color:#6b7280">Manage email preferences</a></p>
            </div></body></html>`;
          await enqueueJob({
            kind: "send-email",
            payload: {
              to: contact.email,
              subject: `[${cls.name}] ${body.title}`,
              html,
              kind: "class_notification",
              orgId: contact.orgId,
              userKind: "student",
              userId: en.studentId,
            },
          });
        }
      } catch (err) {
        console.error("class notification email fan-out failed", err);
      }

      res.json(notification);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/teacher/notifications/:id", isTeacher, async (req: any, res) => {
    await storage.deleteNotification(parseInt(req.params.id), req.session.teacherId);
    res.json({ ok: true });
  });

  // === STUDENT FEEDBACK ROUTES ===
  app.post("/api/teacher/feedback", isTeacher, async (req: any, res) => {
    try {
      const body = z.object({
        studentId: z.string().min(1),
        classId: z.number().int().positive(),
        message: z.string().min(1).max(2000),
      }).parse(req.body);
      const cls = await storage.getClassById(body.classId);
      if (!cls || cls.teacherId !== req.session.teacherId) return res.status(403).json({ message: "Forbidden" });
      const enrollments = await storage.getEnrollmentsByClass(body.classId);
      const enrolled = enrollments.some(e => e.studentId === body.studentId);
      if (!enrolled) return res.status(403).json({ message: "Student not in your class" });
      const teacher = await storage.getTeacherById(req.session.teacherId);
      const feedback = await storage.createStudentFeedback({
        studentId: body.studentId,
        teacherId: req.session.teacherId,
        classId: body.classId,
        orgId: teacher?.orgId ?? null,
        message: body.message,
      });
      res.json(feedback);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/teacher/feedback/:studentId", isTeacher, async (req: any, res) => {
    try {
      const data = await storage.getStudentFeedbackByTeacherAndStudent(
        req.session.teacherId as number,
        req.params.studentId,
      );
      res.json(data);
    } catch (e: any) {
      captureError(e, { route: req.path });
      res.status(500).json({ message: "Could not load feedback. Please try again." });
    }
  });

  app.get("/api/student/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const data = await storage.getStudentFeedbackByStudent(req.session.userId);
      res.json(data);
    } catch (e: any) {
      captureError(e, { route: req.path });
      res.status(500).json({ message: "Could not load feedback. Please try again." });
    }
  });

  // === DEMO ACCESS ===
  app.post("/api/demo/setup", async (_req, res) => {
    try {
      const result = await storage.setupDemoData();
      res.json({ ok: true, message: "Demo data ready", ...result });
    } catch (e: any) {
      captureError(e, { route: "/api/demo/setup" });
      res.status(500).json({ message: "Could not set up the demo environment. Please try again in a moment." });
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
      captureError(e, { route: "/api/demo/credentials" });
      res.status(500).json({ message: "Could not load the demo accounts. Please try again in a moment." });
    }
  });

  // === STUDENT SIDE - JOIN CLASS ===
  app.get("/api/classes/check-code/:code", async (req, res) => {
    try {
      const code = req.params.code.toUpperCase().trim();

      const cls = await storage.getClassByCode(code);
      if (cls) {
        return res.json({ type: "class", id: cls.id, name: cls.name, subject: cls.subject });
      }

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

      if (cls.envId) {
        const env = await getOrgEnvironmentById(cls.envId);
        if (env) {
          enrollStudentInOrg(env.org_id, env.id, studentId).catch(err => {
            console.warn("[join-class] org auto-enroll failed (non-blocking):", err?.message);
            captureError(err, { route: "/api/student/join-class", context: "org auto-enroll" });
          });
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

  app.get("/api/student/org-logo", isAuthenticated, async (req: any, res) => {
    try {
      const studentUserId = String((req.user as any).id);
      const orgIds = await getStudentOrgIds(studentUserId);
      if (!orgIds.length) return res.json({ logoUrl: null });
      const org = await getOrganization(orgIds[0]);
      res.json({ logoUrl: org?.logo_url ?? null });
    } catch {
      res.json({ logoUrl: null });
    }
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

  // === SUPABASE STATUS ===
  app.get("/api/supabase/status", async (_req, res) => {
    if (!supabase) return res.json({ connected: false, reason: "Missing credentials" });
    const { error } = await supabase.from("organizations").select("id").limit(1);
    res.json({ connected: !error, error: error?.message });
  });

  // === LEADERBOARD SNAPSHOT + ANALYTICS ===
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

  // === BACKGROUND JOB STATUS ===
  app.get("/api/jobs/:id", async (req: any, res) => {
    const { getJob } = await import("../jobs");
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
    const { payload, result, ...safe } = job as any;
    res.json({ ...safe, hasResult: !!result });
  });
}
