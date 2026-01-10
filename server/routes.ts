import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { seedDatabase } from "./seed";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // Protected API routes
  
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
      const input = api.transactions.create.input.parse(req.body);
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
      const input = api.budgets.create.input.parse(req.body);
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

  // Seed default categories for new users
  await seedDatabase();

  return httpServer;
}
