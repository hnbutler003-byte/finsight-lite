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
      
      const prompt = `Analyze this user's spending data for the past 3 months. Identify unusual patterns, trends, or habits. For each insight, explain the behavior and suggest one actionable step. 
      Also compare habits against budgets. 
      Data: ${JSON.stringify({ transactions, budgets })}
      Format as a list of insights with 'title', 'behavior', and 'suggestion'.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: "You are a financial advisor for FinSight users across the Caribbean." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content || "{}";
      const parsed = JSON.parse(content);
      
      // Ensure the response has the 'insights' field even if AI returns a different root
      const result = parsed.insights ? parsed : { insights: Object.values(parsed).filter(v => Array.isArray(v))[0] || [] };
      
      res.json(result);
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

    // Mock sync: Create realistic Bahamian transactions
    const mockTransactions = [
      { amount: "12.50", description: "Super Value Food Store", category: "Food & Dining" },
      { amount: "45.00", description: "Rubis Gas Station", category: "Transportation" },
      { amount: "8.00", description: "Starbucks Nassau", category: "Food & Dining" },
      { amount: "120.00", description: "Bahamas Power & Light", category: "Bills & Utilities" },
      { amount: "25.00", description: "Quality Home Centre", category: "Housing" },
    ];

    const categoriesList = await storage.getCategories(userId);
    for (const mock of mockTransactions) {
      const category = categoriesList.find(c => c.name === mock.category);
      await storage.createTransaction({
        userId,
        amount: mock.amount,
        description: mock.description,
        categoryId: category?.id,
        date: new Date(),
        isAutoSynced: true,
        currency: "BSD"
      });
    }

    res.status(201).json(card);
  });

  // Dashboard Stats
  app.get(api.stats.get.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };
    const stats = await storage.getDashboardStats(userId, filters);
    res.json(stats);
  });

  return httpServer;
}
