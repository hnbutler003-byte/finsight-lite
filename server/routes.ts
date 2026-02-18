import { Express } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";

import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerAudioRoutes } from "./replit_integrations/audio";
import { openai } from "./replit_integrations/chat/routes";

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
      - "currencyInsights": Array of { "title": string, "content": string, "impact": "positive" | "neutral" | "negative" }
      - "newsClippings": Array of { "source": string, "headline": string, "summary": string, "url": string }
      
      For "newsClippings", provide 2-3 current financial news items from reputable sources strictly relevant to ${selectedCurrency}'s country.
      Sources by Currency:
      - BSD: https://ewnews.com/category/business, https://www.tribune242.com/news/business/
      - JMD: https://jamaica-gleaner.com/business, https://www.jamaicaobserver.com/category/business/
      - TTD: https://newsday.co.tt/category/business/, https://trinidadexpress.com/business/
      - BBD: https://barbadostoday.bb/category/business/, https://www.nationnews.com/category/business/
      - XCD: https://oecsbusinessfocus.com/, https://caribbeannewsglobal.com/category/caribbean/
      - GYD: https://guyanachronicle.com/category/business/, https://www.stabroeknews.com/category/news/guyana/business/
      - HTG: https://lenouvelliste.com/section/economie, https://juno7.ht/category/economie/
      - USD: https://www.caribbeanjournal.com/category/business/, https://www.cnbc.com/world-business/
      
      IMPORTANT: Only use sources from the list above that match the ${selectedCurrency}. Ensure the "url" field is a valid, clickable link to a specific news article or the business section from the URLs provided. Do not invent URLs; ensure they point to real domains.
      
      Keep the tone helpful and Caribbean-focused.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: "You are a senior financial advisor specializing in Caribbean economies and personal finance." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content || "{}";
      res.json(JSON.parse(content));
    } catch (err) {
      console.error("AI Insight error:", err);
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

  return httpServer;
}
