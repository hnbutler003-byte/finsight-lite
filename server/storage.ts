import { 
  users, categories, transactions, budgets, linkedCards,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Transaction, type InsertTransaction,
  type Budget, type InsertBudget,
  type LinkedCard, type InsertLinkedCard,
  type DashboardStats,
  type Conversation, type Message
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth/storage";
import { conversations, messages } from "@shared/models/chat";

export interface IStorage extends IAuthStorage {
  getCategories(userId: string): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  getTransactions(userId: string, filters?: { 
    startDate?: string, 
    endDate?: string, 
    categoryId?: number,
    limit?: number 
  }): Promise<(Transaction & { category: Category | null })[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  deleteTransaction(id: number, userId: string): Promise<void>;
  
  getBudgets(userId: string): Promise<(Budget & { category: Category | null })[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  deleteBudget(id: number, userId: string): Promise<void>;

  getLinkedCards(userId: string): Promise<LinkedCard[]>;
  linkCard(card: InsertLinkedCard): Promise<LinkedCard>;

  getDashboardStats(userId: string, filters?: { startDate?: string, endDate?: string }): Promise<DashboardStats>;

  // Chat integration
  getConversation(id: number): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  getUser(id: string): Promise<User | undefined> {
    return authStorage.getUser(id);
  }
  upsertUser(user: InsertUser): Promise<User> {
    return authStorage.upsertUser(user);
  }

  // Chat methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getAllConversations(): Promise<Conversation[]> {
    return await db.select().from(conversations).orderBy(desc(conversations.createdAt));
  }

  async createConversation(title: string): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values({ title }).returning();
    return conversation;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }

  async createMessage(conversationId: number, role: string, content: string): Promise<Message> {
    const [message] = await db.insert(messages).values({ conversationId, role, content }).returning();
    return message;
  }

  async getCategories(userId: string): Promise<Category[]> {
    return await db.select().from(categories)
      .where(sql`${categories.userId} = ${userId} OR ${categories.userId} IS NULL`);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async getTransactions(userId: string, filters?: { 
    startDate?: string, 
    endDate?: string, 
    categoryId?: number,
    limit?: number 
  }): Promise<(Transaction & { category: Category | null })[]> {
    let conditions = [eq(transactions.userId, userId)];
    if (filters?.startDate) conditions.push(gte(transactions.date, new Date(filters.startDate)));
    if (filters?.endDate) conditions.push(lte(transactions.date, new Date(filters.endDate)));
    if (filters?.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));

    const query = db.select({
      transaction: transactions,
      category: categories
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date));

    if (filters?.limit) query.limit(filters.limit);

    const results = await query;
    return results.map(r => ({ ...r.transaction, category: r.category }));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async deleteTransaction(id: number, userId: string): Promise<void> {
    await db.delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  }

  async getBudgets(userId: string): Promise<(Budget & { category: Category | null })[]> {
    const results = await db.select({
      budget: budgets,
      category: categories
    })
    .from(budgets)
    .leftJoin(categories, eq(budgets.categoryId, categories.id))
    .where(eq(budgets.userId, userId));
    return results.map(r => ({ ...r.budget, category: r.category }));
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [newBudget] = await db.insert(budgets).values(budget).returning();
    return newBudget;
  }

  async deleteBudget(id: number, userId: string): Promise<void> {
    await db.delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
  }

  async getLinkedCards(userId: string): Promise<LinkedCard[]> {
    return await db.select().from(linkedCards).where(eq(linkedCards.userId, userId));
  }

  async linkCard(card: InsertLinkedCard): Promise<LinkedCard> {
    const [newCard] = await db.insert(linkedCards).values(card).returning();
    return newCard;
  }

  async getDashboardStats(userId: string, filters?: { startDate?: string, endDate?: string }): Promise<DashboardStats> {
    let dateCondition = sql`TRUE`;
    if (filters?.startDate && filters?.endDate) {
      dateCondition = and(
        gte(transactions.date, new Date(filters.startDate)),
        lte(transactions.date, new Date(filters.endDate))
      )!;
    }

    const totals = await db.select({
      type: categories.type,
      total: sql<number>`sum(${transactions.amount})`
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), dateCondition))
    .groupBy(categories.type);

    let totalIncome = 0;
    let totalExpenses = 0;
    totals.forEach(t => {
      if (t.type === 'income') totalIncome += Number(t.total);
      if (t.type === 'expense') totalExpenses += Number(t.total);
    });

    const balance = totalIncome - totalExpenses;
    const recentTransactions = await this.getTransactions(userId, { limit: 5 });
    const cards = await this.getLinkedCards(userId);

    const expensesByCategoryResult = await db.select({
      category: categories.name,
      amount: sql<number>`sum(${transactions.amount})`,
      color: categories.color
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), eq(categories.type, 'expense'), dateCondition))
    .groupBy(categories.id, categories.name, categories.color);
    
    return {
      totalIncome,
      totalExpenses,
      balance,
      recentTransactions,
      expensesByCategory: expensesByCategoryResult.map(item => ({
        category: item.category || 'Uncategorized',
        amount: Number(item.amount),
        color: item.color || undefined
      })),
      isCardLinked: cards.length > 0
    };
  }
}

export const storage = new DatabaseStorage();
