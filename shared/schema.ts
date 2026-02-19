import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Export auth models
export * from "./models/auth";
import { users } from "./models/auth";

// === TABLE DEFINITIONS ===

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  icon: text("icon"), // Lucide icon name
  color: text("color"), // Hex color
  isDefault: boolean("is_default").default(false),
  userId: varchar("user_id").references(() => users.id), // Optional, if null it's a system category
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("BSD").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  date: timestamp("date").notNull(),
  description: text("description"),
  isAutoSynced: boolean("is_auto_synced").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  period: text("period").default("monthly").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const linkedCards = pgTable("linked_cards", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  lastFour: text("last_four").notNull(),
  bankName: text("bank_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentUploads = pgTable("document_uploads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  status: text("status", { enum: ["processing", "completed", "failed"] }).default("processing").notNull(),
  transactionsCreated: integer("transactions_created").default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const linkedCardsRelations = relations(linkedCards, ({ one }) => ({
  user: one(users, {
    fields: [linkedCards.userId],
    references: [users.id],
  }),
}));

export const documentUploadsRelations = relations(documentUploads, ({ one }) => ({
  user: one(users, {
    fields: [documentUploads.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  budgets: many(budgets),
  customCategories: many(categories),
  linkedCards: many(linkedCards),
  documentUploads: many(documentUploads),
}));

export * from "./models/chat";

// === BASE SCHEMAS ===

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertBudgetSchema = createInsertSchema(budgets).omit({ id: true, createdAt: true });
export const insertLinkedCardSchema = createInsertSchema(linkedCards).omit({ id: true, createdAt: true });
export const insertDocumentUploadSchema = createInsertSchema(documentUploads).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type LinkedCard = typeof linkedCards.$inferSelect;
export type DocumentUpload = typeof documentUploads.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type InsertLinkedCard = z.infer<typeof insertLinkedCardSchema>;
export type InsertDocumentUpload = z.infer<typeof insertDocumentUploadSchema>;

// API Responses
export type TransactionResponse = Transaction & { category?: Category };
export type BudgetResponse = Budget & { 
  category?: Category | null;
  spent?: number;
};

export type DashboardStats = {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  recentTransactions: TransactionResponse[];
  expensesByCategory: { category: string; amount: number; color?: string }[];
  isCardLinked: boolean;
};
