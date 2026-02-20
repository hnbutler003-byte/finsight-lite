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

  // Document Uploads
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const uploads = await storage.getDocumentUploads(userId);
    res.json(uploads);
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
        console.error("File parsing error:", parseErr?.message || parseErr);
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

      const parsePrompt = `You are a bank statement parser. Parse the following bank statement content and extract all transactions.
      
The file is named "${file.originalname}" (originally ${ext} format, converted to text).
The user's preferred currency is ${currency}.

FILE CONTENT:
${truncatedContent}

Extract each transaction and return a JSON object with:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Description of the transaction",
      "amount": number (positive for income/deposits, negative for expenses/withdrawals),
      "type": "income" or "expense"
    }
  ]
}

Rules:
- Parse dates into YYYY-MM-DD format
- For debits/withdrawals/payments/purchases, make amount negative and type "expense"
- Any "POS purchase", "POS", "point of sale", "debit card purchase", or similar purchase transactions are ALWAYS expenses with negative amounts
- For credits/deposits/income, make amount positive and type "income"
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

      const userCategories = await storage.getCategories(userId);
      let createdCount = 0;

      for (const tx of parsed.transactions) {
        try {
          const txType = tx.type === "income" ? "income" : "expense";
          const matchingCategory = userCategories.find(c => c.type === txType);
          
          await storage.createTransaction({
            userId,
            amount: Math.abs(tx.amount).toFixed(2),
            currency,
            categoryId: matchingCategory?.id || null,
            date: new Date(tx.date),
            description: tx.description || "Imported transaction",
            isAutoSynced: true,
          });
          createdCount++;
        } catch (txErr) {
          console.error("Error creating transaction from upload:", txErr);
        }
      }

      await storage.updateDocumentUpload(docUpload.id, {
        status: "completed",
        transactionsCreated: createdCount,
      });

      const updatedUpload = await storage.getDocumentUploads(userId).then(u => u.find(d => d.id === docUpload.id));
      res.json({ upload: updatedUpload, transactionsCreated: createdCount });
    } catch (err: any) {
      console.error("Document upload error:", err);
      res.status(500).json({ message: err.message || "Failed to process document" });
    }
  });

  return httpServer;
}
