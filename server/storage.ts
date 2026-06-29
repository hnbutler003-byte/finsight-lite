import { 
  users, categories, transactions, budgets, linkedCards, documentUploads, savingsGoals, billReminders,
  simulatedStocks, portfolioHoldings, portfolioTransactions, learningModules, userLearningProgress, userVirtualBalance,
  examPapers, extractedQuestions, gameSessions, userXp, userBadges,
  schools, sponsors,
  teachers, classes, classEnrollments, challenges, classNotifications, studentFeedback,
  deletionLog, emailContacts,
  orgAdmins,
  type School, type InsertSchool,
  type Sponsor, type InsertSponsor,
  type Teacher, type InsertTeacher,
  type Class, type InsertClass,
  type ClassEnrollment, type InsertClassEnrollment,
  type Challenge, type InsertChallenge,
  type ClassNotification, type InsertClassNotification,
  type StudentFeedback, type InsertStudentFeedback,
  type DeletionLog, type InsertDeletionLog,
  type OrgAdmin, type InsertOrgAdmin,
  type User, type UpsertUser,
  type Category, type InsertCategory,
  type Transaction, type InsertTransaction,
  type Budget, type InsertBudget,
  type LinkedCard, type InsertLinkedCard,
  type DocumentUpload, type InsertDocumentUpload,
  type SavingsGoal, type InsertSavingsGoal,
  type BillReminder, type InsertBillReminder,
  type SimulatedStock, type InsertSimulatedStock,
  type PortfolioHolding, type InsertPortfolioHolding,
  type PortfolioTransaction, type InsertPortfolioTransaction,
  type LearningModule,
  type UserLearningProgress,
  type UserVirtualBalance,
  type DashboardStats,
  type Conversation, type Message,
  type ExamPaper, type InsertExamPaper,
  type ExtractedQuestion, type InsertExtractedQuestion,
  type GameSession, type InsertGameSession,
  type UserXp,
  type UserBadge, type InsertUserBadge,
} from "@shared/schema";
import { type BudgetResponse, type TransactionResponse } from "@shared/routes";
import { db } from "./db";
import { eq, and, desc, asc, sql, gte, lte, inArray, isNull } from "drizzle-orm";
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
  }): Promise<TransactionResponse[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, userId: string, data: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: number, userId: string): Promise<void>;
  
  getBudgets(userId: string): Promise<(Budget & { category?: Category; spent: number })[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  deleteBudget(id: number, userId: string): Promise<void>;

  getLinkedCards(userId: string): Promise<LinkedCard[]>;
  linkCard(card: InsertLinkedCard): Promise<LinkedCard>;

  getDocumentUploads(userId: string): Promise<DocumentUpload[]>;
  createDocumentUpload(upload: InsertDocumentUpload): Promise<DocumentUpload>;
  updateDocumentUpload(id: number, data: Partial<InsertDocumentUpload>): Promise<DocumentUpload>;

  getDashboardStats(userId: string, filters?: { startDate?: string, endDate?: string }): Promise<DashboardStats>;

  getSavingsGoals(userId: string): Promise<SavingsGoal[]>;
  createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal>;
  updateSavingsGoal(id: number, userId: string, data: Partial<InsertSavingsGoal>): Promise<SavingsGoal>;
  deleteSavingsGoal(id: number, userId: string): Promise<void>;

  getBillReminders(userId: string): Promise<(BillReminder & { category?: Category | null })[]>;
  createBillReminder(reminder: InsertBillReminder): Promise<BillReminder>;
  updateBillReminder(id: number, userId: string, data: Partial<InsertBillReminder>): Promise<BillReminder>;
  deleteBillReminder(id: number, userId: string): Promise<void>;

  // Chat integration
  getConversation(id: number): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<Message>;

  // Investment simulation
  getMarketStocks(currency?: string): Promise<SimulatedStock[]>;
  getStockById(id: number): Promise<SimulatedStock | undefined>;
  getPortfolioHoldings(userId: string): Promise<(PortfolioHolding & { stock: SimulatedStock })[]>;
  getPortfolioHolding(userId: string, stockId: number): Promise<PortfolioHolding | undefined>;
  upsertPortfolioHolding(userId: string, stockId: number, quantity: number, avgPrice: number): Promise<PortfolioHolding>;
  deletePortfolioHolding(id: number, userId: string): Promise<void>;
  createPortfolioTransaction(tx: InsertPortfolioTransaction): Promise<PortfolioTransaction>;
  getPortfolioTransactions(userId: string): Promise<(PortfolioTransaction & { stock: SimulatedStock })[]>;
  getVirtualBalance(userId: string): Promise<UserVirtualBalance>;
  updateVirtualBalance(userId: string, newBalance: number): Promise<UserVirtualBalance>;

  // Learning modules
  getLearningModules(): Promise<LearningModule[]>;
  getUserLearningProgress(userId: string): Promise<UserLearningProgress[]>;
  completeModule(userId: string, moduleId: number): Promise<UserLearningProgress>;
  seedMarketData(): Promise<void>;
  seedLearningModules(): Promise<void>;

  // MoneyLab
  createExamPaper(paper: InsertExamPaper): Promise<ExamPaper>;
  updateExamPaper(id: number, data: Partial<ExamPaper>): Promise<ExamPaper>;
  getExamPapers(userId: string): Promise<ExamPaper[]>;
  getExamPaper(id: number): Promise<ExamPaper | undefined>;
  deleteExamPaper(id: number, userId: string): Promise<void>;
  createExtractedQuestion(question: InsertExtractedQuestion): Promise<ExtractedQuestion>;
  getQuestionsByPaper(paperId: number): Promise<ExtractedQuestion[]>;
  getAllQuestions(filters?: { subject?: string }): Promise<(ExtractedQuestion & { paper?: ExamPaper })[]>;
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getGameSessions(userId: string): Promise<GameSession[]>;
  getLeaderboard(filters?: { subject?: string; period?: string; limit?: number }): Promise<{ userId: string; userName: string; avatar: string; totalScore: number; gamesPlayed: number }[]>;
  getUserXp(userId: string): Promise<UserXp>;
  updateUserXp(userId: string, data: Partial<UserXp>): Promise<UserXp>;
  getUserBadges(userId: string): Promise<UserBadge[]>;
  addUserBadge(badge: InsertUserBadge): Promise<UserBadge>;

  // Teacher Dashboard
  createTeacher(data: InsertTeacher & { passwordHash?: string | null }): Promise<Teacher>;
  getTeacherByEmail(email: string): Promise<Teacher | undefined>;
  getTeacherById(id: number): Promise<Teacher | undefined>;
  getClassesByTeacher(teacherId: number): Promise<(Class & { enrollmentCount: number })[]>;
  createClass(data: { teacherId: number; name: string; subject: string; sponsorName?: string }): Promise<Class>;
  getClassById(id: number): Promise<Class | undefined>;
  getClassByCode(code: string): Promise<Class | undefined>;
  updateClass(id: number, teacherId: number, data: Partial<Pick<Class, 'name' | 'subject' | 'sponsorName'>>): Promise<Class>;
  updateTeacherOrgLink(teacherId: number, orgId: string | null, envId: string | null): Promise<Teacher>;
  resetTeacherPassword(teacherId: number, passwordHash: string): Promise<Teacher>;
  updateClassEnvLink(classId: number, envId: string | null): Promise<Class>;
  deleteClass(id: number, teacherId: number): Promise<void>;
  getEnrollmentsByClass(classId: number): Promise<(ClassEnrollment & { student: User })[]>;
  enrollStudent(classId: number, studentId: string): Promise<ClassEnrollment>;
  getStudentClasses(studentId: string): Promise<(ClassEnrollment & { class: Class })[]>;
  removeEnrollment(classId: number, studentId: string): Promise<void>;
  getClassProgressSummary(classId: number, opts?: { limit?: number; offset?: number }): Promise<any>;
  getChallengesByClass(classId: number): Promise<Challenge[]>;
  createChallenge(data: InsertChallenge): Promise<Challenge>;
  deleteChallenge(id: number, teacherId: number): Promise<void>;
  getNotificationsByClass(classId: number): Promise<ClassNotification[]>;
  createNotification(data: InsertClassNotification): Promise<ClassNotification>;
  deleteNotification(id: number, teacherId: number): Promise<void>;
  createStudentFeedback(data: InsertStudentFeedback): Promise<StudentFeedback>;
  getStudentFeedbackByStudent(studentId: string): Promise<Array<StudentFeedback & { teacherName: string }>>;
  getStudentFeedbackByTeacherAndStudent(teacherId: number, studentId: string): Promise<Array<StudentFeedback & { teacherName: string }>>;
  deleteUserAllData(userId: string): Promise<void>;
  logDeletion(data: InsertDeletionLog): Promise<void>;
  getClassLeaderboard(classId: number): Promise<any[]>;
  getClassAnalytics(classId: number): Promise<any>;

  // Org Admin
  createOrgAdmin(data: InsertOrgAdmin & { passwordHash?: string | null }): Promise<OrgAdmin>;
  getOrgAdminByEmail(email: string): Promise<OrgAdmin | undefined>;
  getOrgAdminById(id: number): Promise<OrgAdmin | undefined>;
  getStudentsByOrgId(orgId: string): Promise<User[]>;
  getTeachersByOrgId(orgId: string): Promise<Teacher[]>;
  getOrgAdminsByOrgId(orgId: string): Promise<OrgAdmin[]>;
  getClassesByOrgId(orgId: string): Promise<(Class & { enrollmentCount: number; teacherName: string })[]>;
  reassignClassTeacher(classId: number, newTeacherId: number): Promise<Class>;
}

export class DatabaseStorage implements IStorage {
  getUser(id: string): Promise<User | undefined> {
    return authStorage.getUser(id);
  }
  upsertUser(user: UpsertUser): Promise<User> {
    return authStorage.upsertUser(user);
  }
  getUserByUsername(username: string): Promise<User | undefined> {
    return authStorage.getUserByUsername(username);
  }
  updateProfile(
    id: string,
    data: { firstName?: string | null; lastName?: string | null }
  ): Promise<User | undefined> {
    return authStorage.updateProfile(id, data);
  }
  getUserByEmail(email: string): Promise<User | undefined> {
    return authStorage.getUserByEmail(email);
  }
  linkEmail(id: string, email: string, profileImageUrl?: string): Promise<User | undefined> {
    return authStorage.linkEmail(id, email, profileImageUrl);
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
      .where(sql`${categories.userId} = ${userId} OR ${categories.userId} IS NULL OR ${categories.isDefault} = true`);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async getTransactions(userId: string, filters?: {
    startDate?: string,
    endDate?: string,
    categoryId?: number,
    limit?: number,
    offset?: number,
  }): Promise<TransactionResponse[]> {
    let conditions = [eq(transactions.userId, userId)];
    if (filters?.startDate) conditions.push(gte(transactions.date, new Date(filters.startDate)));
    if (filters?.endDate) conditions.push(lte(transactions.date, new Date(filters.endDate)));
    if (filters?.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));

    let query = db.select({
      transaction: transactions,
      category: categories,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date))
    .$dynamic();

    if (filters?.limit) query = query.limit(filters.limit);
    if (filters?.offset) query = query.offset(filters.offset);

    const results = await query;
    return results.map(r => ({ ...r.transaction, category: r.category ?? undefined })) as TransactionResponse[];
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async updateTransaction(id: number, userId: string, data: Partial<InsertTransaction>): Promise<Transaction> {
    const [updatedTransaction] = await db.update(transactions)
      .set(data)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    
    if (!updatedTransaction) {
      throw new Error("Transaction not found or unauthorized");
    }
    
    return updatedTransaction;
  }

  async deleteTransaction(id: number, userId: string): Promise<void> {
    await db.delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  }

  async getBudgets(userId: string): Promise<(Budget & { category?: Category; spent: number })[]> {
    // Single round trip: join budgets + category + a per-category spent-this-month subquery.
    const spentSub = db.$with("spent_this_month").as(
      db.select({
        categoryId: transactions.categoryId,
        total: sql<number>`sum(${transactions.amount})`.as("total"),
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        sql`extract(month from ${transactions.date}) = extract(month from now())`,
        sql`extract(year from ${transactions.date}) = extract(year from now())`
      ))
      .groupBy(transactions.categoryId)
    );

    const rows = await db.with(spentSub).select({
      budget: budgets,
      category: categories,
      spent: spentSub.total,
    })
    .from(budgets)
    .leftJoin(categories, eq(budgets.categoryId, categories.id))
    .leftJoin(spentSub, eq(spentSub.categoryId, budgets.categoryId))
    .where(eq(budgets.userId, userId));

    return rows.map(r => ({
      ...r.budget,
      category: r.category ?? undefined,
      spent: Number(r.spent || 0),
    }));
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

  async getDocumentUploads(userId: string): Promise<DocumentUpload[]> {
    return await db.select().from(documentUploads)
      .where(eq(documentUploads.userId, userId))
      .orderBy(desc(documentUploads.createdAt));
  }

  async createDocumentUpload(upload: InsertDocumentUpload): Promise<DocumentUpload> {
    const [newUpload] = await db.insert(documentUploads).values(upload).returning();
    return newUpload;
  }

  async updateDocumentUpload(id: number, data: Partial<InsertDocumentUpload>): Promise<DocumentUpload> {
    const [updated] = await db.update(documentUploads)
      .set(data)
      .where(eq(documentUploads.id, id))
      .returning();
    return updated;
  }

  async deleteDocumentUpload(id: number, userId: string): Promise<void> {
    await db.delete(transactions)
      .where(and(eq(transactions.documentUploadId, id), eq(transactions.userId, userId)));
    await db.delete(documentUploads)
      .where(and(eq(documentUploads.id, id), eq(documentUploads.userId, userId)));
  }

  async getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
    return await db.select().from(savingsGoals)
      .where(eq(savingsGoals.userId, userId))
      .orderBy(desc(savingsGoals.createdAt));
  }

  async createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal> {
    const [newGoal] = await db.insert(savingsGoals).values(goal).returning();
    return newGoal;
  }

  async updateSavingsGoal(id: number, userId: string, data: Partial<InsertSavingsGoal>): Promise<SavingsGoal> {
    const [updated] = await db.update(savingsGoals)
      .set(data)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
      .returning();
    if (!updated) throw new Error("Savings goal not found");
    return updated;
  }

  async deleteSavingsGoal(id: number, userId: string): Promise<void> {
    await db.delete(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)));
  }

  async getBillReminders(userId: string): Promise<(BillReminder & { category?: Category | null })[]> {
    const results = await db.select({
      reminder: billReminders,
      category: categories,
    })
    .from(billReminders)
    .leftJoin(categories, eq(billReminders.categoryId, categories.id))
    .where(eq(billReminders.userId, userId))
    .orderBy(billReminders.nextDueDate);
    return results.map(r => ({ ...r.reminder, category: r.category }));
  }

  async createBillReminder(reminder: InsertBillReminder): Promise<BillReminder> {
    const [newReminder] = await db.insert(billReminders).values(reminder).returning();
    return newReminder;
  }

  async updateBillReminder(id: number, userId: string, data: Partial<InsertBillReminder>): Promise<BillReminder> {
    const [updated] = await db.update(billReminders)
      .set(data)
      .where(and(eq(billReminders.id, id), eq(billReminders.userId, userId)))
      .returning();
    if (!updated) throw new Error("Bill reminder not found");
    return updated;
  }

  async deleteBillReminder(id: number, userId: string): Promise<void> {
    await db.delete(billReminders)
      .where(and(eq(billReminders.id, id), eq(billReminders.userId, userId)));
  }

  // === INVESTMENT SIMULATION ===

  async getMarketStocks(currency?: string): Promise<SimulatedStock[]> {
    if (currency) {
      return await db.select().from(simulatedStocks).where(eq(simulatedStocks.currency, currency));
    }
    return await db.select().from(simulatedStocks);
  }

  async getStockById(id: number): Promise<SimulatedStock | undefined> {
    const [stock] = await db.select().from(simulatedStocks).where(eq(simulatedStocks.id, id));
    return stock;
  }

  async getPortfolioHoldings(userId: string): Promise<(PortfolioHolding & { stock: SimulatedStock })[]> {
    const results = await db.select({
      holding: portfolioHoldings,
      stock: simulatedStocks,
    })
    .from(portfolioHoldings)
    .innerJoin(simulatedStocks, eq(portfolioHoldings.stockId, simulatedStocks.id))
    .where(eq(portfolioHoldings.userId, userId));
    return results.map(r => ({ ...r.holding, stock: r.stock }));
  }

  async getPortfolioHolding(userId: string, stockId: number): Promise<PortfolioHolding | undefined> {
    const [holding] = await db.select().from(portfolioHoldings)
      .where(and(eq(portfolioHoldings.userId, userId), eq(portfolioHoldings.stockId, stockId)));
    return holding;
  }

  async upsertPortfolioHolding(userId: string, stockId: number, quantity: number, avgPrice: number): Promise<PortfolioHolding> {
    const existing = await this.getPortfolioHolding(userId, stockId);
    if (existing) {
      if (quantity <= 0) {
        await db.delete(portfolioHoldings).where(eq(portfolioHoldings.id, existing.id));
        return { ...existing, quantity: 0 };
      }
      const [updated] = await db.update(portfolioHoldings)
        .set({ quantity, avgPurchasePrice: avgPrice.toFixed(2) })
        .where(eq(portfolioHoldings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(portfolioHoldings)
      .values({ userId, stockId, quantity, avgPurchasePrice: avgPrice.toFixed(2) })
      .returning();
    return created;
  }

  async deletePortfolioHolding(id: number, userId: string): Promise<void> {
    await db.delete(portfolioHoldings)
      .where(and(eq(portfolioHoldings.id, id), eq(portfolioHoldings.userId, userId)));
  }

  async createPortfolioTransaction(tx: InsertPortfolioTransaction): Promise<PortfolioTransaction> {
    const [created] = await db.insert(portfolioTransactions).values(tx).returning();
    return created;
  }

  async getPortfolioTransactions(userId: string): Promise<(PortfolioTransaction & { stock: SimulatedStock })[]> {
    const results = await db.select({
      tx: portfolioTransactions,
      stock: simulatedStocks,
    })
    .from(portfolioTransactions)
    .innerJoin(simulatedStocks, eq(portfolioTransactions.stockId, simulatedStocks.id))
    .where(eq(portfolioTransactions.userId, userId))
    .orderBy(desc(portfolioTransactions.executedAt));
    return results.map(r => ({ ...r.tx, stock: r.stock }));
  }

  async getVirtualBalance(userId: string): Promise<UserVirtualBalance> {
    const [existing] = await db.select().from(userVirtualBalance)
      .where(eq(userVirtualBalance.userId, userId));
    if (existing) return existing;
    const [created] = await db.insert(userVirtualBalance)
      .values({ userId, balance: "10000", currency: "BSD" })
      .returning();
    return created;
  }

  async updateVirtualBalance(userId: string, newBalance: number): Promise<UserVirtualBalance> {
    const existing = await this.getVirtualBalance(userId);
    const [updated] = await db.update(userVirtualBalance)
      .set({ balance: newBalance.toFixed(2) })
      .where(eq(userVirtualBalance.userId, userId))
      .returning();
    return updated;
  }

  // === LEARNING MODULES ===

  async getLearningModules(): Promise<LearningModule[]> {
    return await db.select().from(learningModules).orderBy(asc(learningModules.order));
  }

  async getUserLearningProgress(userId: string): Promise<UserLearningProgress[]> {
    return await db.select().from(userLearningProgress)
      .where(eq(userLearningProgress.userId, userId));
  }

  async completeModule(userId: string, moduleId: number): Promise<UserLearningProgress> {
    const [existing] = await db.select().from(userLearningProgress)
      .where(and(eq(userLearningProgress.userId, userId), eq(userLearningProgress.moduleId, moduleId)));
    if (existing) {
      const [updated] = await db.update(userLearningProgress)
        .set({ completed: true, completedAt: new Date() })
        .where(eq(userLearningProgress.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userLearningProgress)
      .values({ userId, moduleId, completed: true, completedAt: new Date() })
      .returning();
    return created;
  }

  async seedMarketData(): Promise<void> {
    const existing = await db.select().from(simulatedStocks).limit(1);
    if (existing.length > 0) return;

    await db.insert(simulatedStocks).values([
      { name: "Bahamas Telecommunications Company", ticker: "BTC-BS", type: "stock", description: "The national telecom provider of The Bahamas. Owning this stock means you own a small piece of the company that keeps Bahamians connected.", currentPrice: "5.50", currency: "BSD", issuer: "BTC Ltd.", region: "Bahamas", riskLevel: "medium", annualReturnPct: "4.20" },
      { name: "Commonwealth Bank", ticker: "CBL-BS", type: "stock", description: "One of the largest banks in The Bahamas. Banks make money by lending and investing, and shareholders benefit when the bank does well.", currentPrice: "8.25", currency: "BSD", issuer: "Commonwealth Bank Ltd.", region: "Bahamas", riskLevel: "medium", annualReturnPct: "5.10" },
      { name: "Focol Holdings", ticker: "FCL-BS", type: "stock", description: "A Bahamian energy company that distributes fuel. Energy companies tend to be stable because people always need electricity and gas.", currentPrice: "3.80", currency: "BSD", issuer: "Focol Holdings Ltd.", region: "Bahamas", riskLevel: "medium", annualReturnPct: "3.50" },
      { name: "Cable Bahamas", ticker: "CAB-BS", type: "stock", description: "Provides cable TV, internet, and phone services across The Bahamas. Tech and media companies can grow fast but also face competition.", currentPrice: "4.10", currency: "BSD", issuer: "Cable Bahamas Ltd.", region: "Bahamas", riskLevel: "medium", annualReturnPct: "3.80" },
      { name: "Bahamas Government Registered Stock (5-Year)", ticker: "BGRS-5Y", type: "bond", description: "A bond issued by the Central Bank of The Bahamas. When you buy this, you are lending money to the government, and they pay you back with interest. Government bonds are considered very safe.", currentPrice: "100.00", currency: "BSD", issuer: "Central Bank of The Bahamas", region: "Bahamas", riskLevel: "low", annualReturnPct: "4.50" },
      { name: "Bahamas Treasury Bill (91-Day)", ticker: "BTB-91", type: "bond", description: "A short-term bond from the Bahamas government lasting about 3 months. T-Bills are one of the safest investments because the government backs them.", currentPrice: "99.00", currency: "BSD", issuer: "Central Bank of The Bahamas", region: "Bahamas", riskLevel: "low", annualReturnPct: "3.25" },
      { name: "Jamaica National Building Society", ticker: "JNBS-JM", type: "stock", description: "A major financial institution in Jamaica that helps people save money and buy homes through mortgages.", currentPrice: "125.00", currency: "JMD", issuer: "JN Group", region: "Jamaica", riskLevel: "medium", annualReturnPct: "6.00" },
      { name: "GraceKennedy Limited", ticker: "GK-JM", type: "stock", description: "A large Jamaican company that makes and sells food products across the Caribbean. You might recognize their brands in your local supermarket!", currentPrice: "95.50", currency: "JMD", issuer: "GraceKennedy Ltd.", region: "Jamaica", riskLevel: "medium", annualReturnPct: "5.50" },
      { name: "Bank of Jamaica Investment Note", ticker: "BOJ-IN", type: "bond", description: "An investment note issued by the Bank of Jamaica. Similar to a savings bond: you lend money to Jamaica's central bank and earn interest.", currentPrice: "100.00", currency: "JMD", issuer: "Bank of Jamaica", region: "Jamaica", riskLevel: "low", annualReturnPct: "7.00" },
      { name: "NCB Financial Group", ticker: "NCBFG-JM", type: "stock", description: "NCB Financial Group is Jamaica's largest financial conglomerate, operating banking, insurance, and wealth management services across the Caribbean. One of the most traded stocks on the Jamaica Stock Exchange.", currentPrice: "80.00", currency: "JMD", issuer: "NCB Financial Group Ltd.", region: "Jamaica", riskLevel: "medium", annualReturnPct: "6.50" },
      { name: "Scotia Group Jamaica", ticker: "SEP-JM", type: "stock", description: "Scotia Group Jamaica is a major banking and financial services group, part of the Scotiabank global network. It provides retail banking, corporate banking, and insurance services across Jamaica.", currentPrice: "45.00", currency: "JMD", issuer: "Scotia Group Jamaica Ltd.", region: "Jamaica", riskLevel: "medium", annualReturnPct: "5.20" },
      { name: "Proven Investments Limited", ticker: "PROVEN-JM", type: "stock", description: "Proven Investments is a diversified investment company listed on the Jamaica Stock Exchange, focused on real estate, financial services, and high-growth sectors across the Caribbean.", currentPrice: "35.00", currency: "JMD", issuer: "Proven Group Holdings", region: "Jamaica", riskLevel: "high", annualReturnPct: "8.00" },
      { name: "Republic Financial Holdings", ticker: "RFHL-TT", type: "stock", description: "One of the biggest banking groups in Trinidad & Tobago. They operate banks across the Caribbean.", currentPrice: "145.00", currency: "TTD", issuer: "Republic Financial Holdings", region: "Trinidad & Tobago", riskLevel: "medium", annualReturnPct: "5.80" },
      { name: "Trinidad Cement Limited", ticker: "TCL-TT", type: "stock", description: "A company that makes building materials. When new buildings go up in the Caribbean, companies like this do well.", currentPrice: "12.50", currency: "TTD", issuer: "TCL Group", region: "Trinidad & Tobago", riskLevel: "high", annualReturnPct: "4.00" },
      { name: "Government of T&T Bond (10-Year)", ticker: "GOTT-10Y", type: "bond", description: "A 10-year bond from the Trinidad & Tobago government. Longer bonds usually pay more interest because your money is locked up for longer.", currentPrice: "100.00", currency: "TTD", issuer: "Central Bank of Trinidad and Tobago", region: "Trinidad & Tobago", riskLevel: "low", annualReturnPct: "5.25" },
      { name: "Sagicor Financial", ticker: "SFC-BB", type: "stock", description: "A major insurance and investment company based in Barbados. Insurance companies collect premiums and invest them to grow.", currentPrice: "4.50", currency: "BBD", issuer: "Sagicor Financial Corporation", region: "Barbados", riskLevel: "medium", annualReturnPct: "4.80" },
      { name: "Barbados Government Debenture", ticker: "BGD-BB", type: "bond", description: "A bond issued by the Government of Barbados. Debentures are unsecured bonds backed by the government's reputation and ability to collect taxes.", currentPrice: "100.00", currency: "BBD", issuer: "Central Bank of Barbados", region: "Barbados", riskLevel: "low", annualReturnPct: "5.00" },
      { name: "East Caribbean Home Mortgage Bank", ticker: "ECHMB-XC", type: "bond", description: "A bond from the EC Home Mortgage Bank that helps people in Eastern Caribbean countries buy homes. Your investment helps fund housing!", currentPrice: "100.00", currency: "XCD", issuer: "ECHMB", region: "Eastern Caribbean", riskLevel: "low", annualReturnPct: "4.75" },
      { name: "Demerara Bank", ticker: "DBL-GY", type: "stock", description: "A leading commercial bank in Guyana. With Guyana's growing oil economy, banks there are handling more business than ever.", currentPrice: "250.00", currency: "GYD", issuer: "Demerara Bank Ltd.", region: "Guyana", riskLevel: "high", annualReturnPct: "7.50" },
    ]);
  }

  async seedLearningModules(): Promise<void> {
    const existing = await db.select().from(learningModules).limit(1);
    if (existing.length > 0) return;

    await db.insert(learningModules).values([
      {
        title: "What is Money?",
        slug: "what-is-money",
        description: "Learn why different countries have different currencies and how money works.",
        content: `Money is anything that people agree to use to buy and sell things. In The Bahamas, we use the Bahamian Dollar (BSD), which is worth the same as one US Dollar. Jamaica uses the Jamaican Dollar (JMD), Trinidad uses the Trinidad & Tobago Dollar (TTD), and many Eastern Caribbean islands share the East Caribbean Dollar (XCD).\n\nWhy do different countries have different currencies? Each country's government prints its own money and controls how much exists. This helps them manage their economy. Some currencies are "pegged" (locked) to the US Dollar, like the Bahamian Dollar, which means the exchange rate stays the same. Others, like the Jamaican Dollar, "float" freely and change value based on supply and demand.\n\nKey takeaway: Money is a tool. Understanding how it works in your country is the first step to using it wisely!`,
        order: 1,
        icon: "Coins",
      },
      {
        title: "Saving vs. Spending",
        slug: "saving-vs-spending",
        description: "Discover the power of saving and how to make smart spending choices.",
        content: `Every time you get money (whether it's an allowance, a gift, or pay from a part-time job) you have a choice: spend it now or save it for later.\n\nSpending gives you something right away (a snack, a game, new clothes). Saving means you wait, but your money can grow. If you put money in a savings account at a bank like Commonwealth Bank in The Bahamas, they'll pay you interest, a small reward for letting them use your money.\n\nThe 50/30/20 Rule is a simple guide:\n• 50% for needs (school supplies, lunch)\n• 30% for wants (entertainment, treats)\n• 20% for savings (your future self will thank you!)\n\nBudgeting is just making a plan for your money before you spend it. Even small amounts saved regularly can add up to something big over time!`,
        order: 2,
        icon: "PiggyBank",
      },
      {
        title: "What is a Stock?",
        slug: "what-is-a-stock",
        description: "Learn what it means to own a piece of a company.",
        content: `A stock (also called a "share") is a tiny piece of ownership in a company. When a company wants to raise money to grow, it can sell shares to the public. If you buy one share of Commonwealth Bank (CBL) on the Bahamas International Securities Exchange (BISX), you literally own a small piece of that bank!\n\nWhy would you buy a stock?\n1. Growth: If the company does well, its stock price goes up. You could sell your share for more than you paid.\n2. Dividends: Some companies share their profits with stockholders by paying dividends, regular cash payments just for owning the stock.\n\nBut there's risk: if the company does poorly, the stock price can go down, and you could lose money. That's why stocks are considered riskier than savings accounts.\n\nReal example: Focol Holdings (FCL) in The Bahamas distributes fuel. If more people buy gas, Focol earns more money, and its stock might go up. But if a hurricane disrupts operations, the stock might drop temporarily.\n\nKey takeaway: Stocks let you share in a company's success (and risk). They're best for money you won't need for a long time.`,
        order: 3,
        icon: "TrendingUp",
      },
      {
        title: "What is a Bond?",
        slug: "what-is-a-bond",
        description: "Understand how bonds work and why governments issue them.",
        content: `A bond is like an IOU. When you buy a bond, you're lending money to a government or company. They promise to pay you back the full amount (called the "face value") on a set date, plus regular interest payments along the way.\n\nThe Central Bank of The Bahamas issues bonds called "Government Registered Stock." For example, a 5-year Government Registered Stock might pay 4.5% interest per year. If you invest B$1,000, you'd earn about B$45 every year for 5 years, then get your B$1,000 back.\n\nWhy are bonds considered safer than stocks?\n• You know exactly how much interest you'll earn\n• The government is very unlikely to fail to pay you back\n• Your original investment is returned at the end\n\nBut there's a trade-off: bonds usually earn less than stocks over time. A stock might gain 8-10% in a great year, but a bond gives you a steady, predictable 4-5%.\n\nOther Caribbean bonds:\n• Bank of Jamaica Investment Notes: Jamaica's central bank bonds\n• Trinidad & Tobago Government Bonds: longer-term bonds from T&T\n• EC Home Mortgage Bank bonds: help fund housing in the Eastern Caribbean\n\nKey takeaway: Bonds are a safer way to earn steady returns. They're great for money you want to protect while still earning more than a savings account.`,
        order: 4,
        icon: "Shield",
      },
      {
        title: "Risk and Reward",
        slug: "risk-and-reward",
        description: "Learn why higher returns come with higher risk.",
        content: `In investing, risk and reward go hand in hand. The more risk you take, the more you might earn, but you also might lose more.\n\nThink of it like this:\n🏦 Savings Account (Low Risk, Low Reward): Your money is safe, but earns maybe 1-2% per year.\n📄 Government Bonds (Low-Medium Risk, Medium Reward): Very safe, earns 3-5% per year. Example: Bahamas Government Registered Stock pays about 4.5%.\n📈 Stocks (Medium-High Risk, Higher Reward): Can earn 5-10%+ per year on average, but prices go up AND down. Example: GraceKennedy (GK) stock in Jamaica has seen good years and tough years.\n🎲 Speculative Investments (High Risk, Highest Potential Reward): New companies or volatile markets. You could double your money, or lose most of it.\n\nThe key concept is "diversification": don't put all your eggs in one basket! If you spread your money across different types of investments (some stocks, some bonds, some savings), a loss in one area won't wipe out everything.\n\nYour age matters too! As a teenager, you have decades ahead of you. That means you can afford to take more risk because you have time to recover from losses. An adult nearing retirement would want to play it safer.\n\nKey takeaway: There's no such thing as a guaranteed high return. Always understand the risk before you invest!`,
        order: 5,
        icon: "Scale",
      },
      {
        title: "Building a Portfolio",
        slug: "building-a-portfolio",
        description: "Learn how to combine different investments for a balanced approach.",
        content: `A portfolio is simply the collection of all your investments put together. Building a good portfolio means mixing different types of investments so that your money is balanced and protected.\n\nA simple starter portfolio for a young investor might look like:\n• 50% Stocks: for growth (e.g., Commonwealth Bank, GraceKennedy)\n• 30% Bonds: for stability (e.g., Bahamas Government Registered Stock)\n• 20% Savings: for emergencies and short-term needs\n\nThis is called "asset allocation." The idea is:\n• Stocks grow your money over time\n• Bonds provide steady income and protect against stock market drops\n• Savings give you quick access to cash when you need it\n\nRebalancing: Over time, if your stocks do really well, they might become 70% of your portfolio. That means more risk than you planned! Rebalancing means selling some stocks and buying more bonds to get back to your target mix.\n\nDollar-Cost Averaging: Instead of investing all your money at once, invest a small amount regularly (like B$50 every month). This way, you buy more shares when prices are low and fewer when prices are high, which averages out your cost over time.\n\nReal-world tip: In The Bahamas, you can invest through BISX (Bahamas International Securities Exchange). In Jamaica, the Jamaica Stock Exchange (JSE) is one of the best-performing stock markets in the world. The Trinidad & Tobago Stock Exchange offers access to energy and finance companies.\n\nKey takeaway: A good portfolio is diversified. Start small, stay consistent, and let time work in your favor!`,
        order: 6,
        icon: "Briefcase",
      },
    ]);
  }

  // === MONEYLAB ===

  async createExamPaper(paper: InsertExamPaper): Promise<ExamPaper> {
    const [created] = await db.insert(examPapers).values(paper).returning();
    return created;
  }

  async updateExamPaper(id: number, data: Partial<ExamPaper>): Promise<ExamPaper> {
    const [updated] = await db.update(examPapers).set(data).where(eq(examPapers.id, id)).returning();
    return updated;
  }

  async getExamPapers(userId: string): Promise<ExamPaper[]> {
    return await db.select().from(examPapers).where(eq(examPapers.userId, userId)).orderBy(desc(examPapers.createdAt));
  }

  async getExamPaper(id: number): Promise<ExamPaper | undefined> {
    const [paper] = await db.select().from(examPapers).where(eq(examPapers.id, id));
    return paper;
  }

  async deleteExamPaper(id: number, userId: string): Promise<void> {
    await db.delete(examPapers).where(and(eq(examPapers.id, id), eq(examPapers.userId, userId)));
  }

  async createExtractedQuestion(question: InsertExtractedQuestion): Promise<ExtractedQuestion> {
    const [created] = await db.insert(extractedQuestions).values(question).returning();
    return created;
  }

  async getQuestionsByPaper(paperId: number): Promise<ExtractedQuestion[]> {
    return await db.select().from(extractedQuestions).where(eq(extractedQuestions.paperId, paperId)).orderBy(extractedQuestions.order);
  }

  async getAllQuestions(filters?: { subject?: string }): Promise<(ExtractedQuestion & { paper?: ExamPaper })[]> {
    let conditions = [];
    if (filters?.subject) {
      conditions.push(eq(extractedQuestions.subject, filters.subject));
    }
    const results = await db.select({ question: extractedQuestions, paper: examPapers })
      .from(extractedQuestions)
      .innerJoin(examPapers, eq(extractedQuestions.paperId, examPapers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return results.map(r => ({ ...r.question, paper: r.paper }));
  }

  async createGameSession(session: InsertGameSession): Promise<GameSession> {
    const [created] = await db.insert(gameSessions).values(session).returning();
    return created;
  }

  async getGameSessions(userId: string): Promise<GameSession[]> {
    return await db.select().from(gameSessions).where(eq(gameSessions.userId, userId)).orderBy(desc(gameSessions.completedAt));
  }

  async getLeaderboard(filters?: { subject?: string; period?: string; limit?: number; offset?: number }): Promise<{ userId: string; userName: string; avatar: string; totalScore: number; gamesPlayed: number }[]> {
    let conditions: any[] = [];

    if (filters?.period === "weekly") {
      conditions.push(sql`${gameSessions.completedAt} >= now() - interval '7 days'`);
    }

    const results = await db.select({
      userId: gameSessions.userId,
      userName: users.firstName,
      avatar: users.avatar,
      totalScore: sql<number>`sum(${gameSessions.score})`,
      gamesPlayed: sql<number>`count(*)`,
    })
    .from(gameSessions)
    .innerJoin(users, eq(gameSessions.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(gameSessions.userId, users.firstName, users.avatar)
    // Deterministic tie-break by userId so offset paging is stable across requests.
    .orderBy(sql`sum(${gameSessions.score}) desc`, gameSessions.userId)
    .limit(filters?.limit || 20)
    .offset(filters?.offset || 0);

    return results.map(r => ({
      userId: r.userId,
      userName: r.userName || "Unknown",
      avatar: r.avatar,
      totalScore: Number(r.totalScore),
      gamesPlayed: Number(r.gamesPlayed),
    }));
  }

  async getUserXp(userId: string): Promise<UserXp> {
    const [existing] = await db.select().from(userXp).where(eq(userXp.userId, userId));
    if (existing) return existing;
    const [created] = await db.insert(userXp).values({ userId, totalXp: 0, level: 1, currentStreak: 0, longestStreak: 0 }).returning();
    return created;
  }

  async updateUserXp(userId: string, data: Partial<UserXp>): Promise<UserXp> {
    await this.getUserXp(userId);
    const [updated] = await db.update(userXp).set(data).where(eq(userXp.userId, userId)).returning();
    return updated;
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return await db.select().from(userBadges).where(eq(userBadges.userId, userId)).orderBy(desc(userBadges.earnedAt));
  }

  async addUserBadge(badge: InsertUserBadge): Promise<UserBadge> {
    const existing = await db.select().from(userBadges).where(and(eq(userBadges.userId, badge.userId), eq(userBadges.badgeId, badge.badgeId)));
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(userBadges).values(badge).returning();
    return created;
  }

  async getDashboardStats(userId: string, filters?: { startDate?: string, endDate?: string, period?: 'monthly' | 'yearly' }): Promise<DashboardStats> {
    let dateCondition = sql`TRUE`;
    let periodCondition = sql`TRUE`;

    if (filters?.period === 'monthly') {
      periodCondition = and(
        sql`extract(month from ${transactions.date}) = extract(month from now())`,
        sql`extract(year from ${transactions.date}) = extract(year from now())`
      )!;
    } else if (filters?.period === 'yearly') {
      periodCondition = sql`extract(year from ${transactions.date}) = extract(year from now())`;
    } else if (filters?.startDate && filters?.endDate) {
      dateCondition = and(
        gte(transactions.date, new Date(filters.startDate)),
        lte(transactions.date, new Date(filters.endDate))
      )!;
    }

    const totals = await db.select({
      type: transactions.type,
      total: sql<number>`sum(${transactions.amount})`
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), dateCondition, periodCondition))
    .groupBy(transactions.type);

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
    .where(and(eq(transactions.userId, userId), eq(categories.type, 'expense'), dateCondition, periodCondition))
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

  // === TEACHER DASHBOARD ===

  async createTeacher(data: InsertTeacher & { passwordHash?: string | null }): Promise<Teacher> {
    const [teacher] = await db.insert(teachers).values(data).returning();
    return teacher;
  }

  async getTeacherByEmail(email: string): Promise<Teacher | undefined> {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.email, email.toLowerCase()));
    return teacher;
  }

  async getTeacherById(id: number): Promise<Teacher | undefined> {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, id));
    return teacher;
  }

  async getClassesByTeacher(teacherId: number): Promise<(Class & { enrollmentCount: number })[]> {
    const classList = await db.select().from(classes).where(eq(classes.teacherId, teacherId)).orderBy(desc(classes.createdAt));
    if (classList.length === 0) return [];
    // Single grouped count query (avoids N+1)
    const counts = await db.select({
      classId: classEnrollments.classId,
      count: sql<number>`count(*)`,
    })
    .from(classEnrollments)
    .where(inArray(classEnrollments.classId, classList.map(c => c.id)))
    .groupBy(classEnrollments.classId);
    const countByClass = new Map<number, number>();
    for (const c of counts) countByClass.set(c.classId, Number(c.count));
    return classList.map(cls => ({ ...cls, enrollmentCount: countByClass.get(cls.id) || 0 }));
  }

  async createClass(data: { teacherId: number; name: string; subject: string; sponsorName?: string }): Promise<Class> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [cls] = await db.insert(classes).values({ ...data, code }).returning();
    return cls;
  }

  async getClassById(id: number): Promise<Class | undefined> {
    const [cls] = await db.select().from(classes).where(eq(classes.id, id));
    return cls;
  }

  async getClassByCode(code: string): Promise<Class | undefined> {
    const [cls] = await db.select().from(classes).where(eq(classes.code, code.toUpperCase()));
    return cls;
  }

  async updateClass(id: number, teacherId: number, data: Partial<Pick<Class, 'name' | 'subject' | 'sponsorName'>>): Promise<Class> {
    const [updated] = await db.update(classes).set(data).where(and(eq(classes.id, id), eq(classes.teacherId, teacherId))).returning();
    if (!updated) throw new Error("Class not found");
    return updated;
  }

  async updateTeacherOrgLink(teacherId: number, orgId: string | null, envId: string | null): Promise<Teacher> {
    const [updated] = await db.update(teachers).set({ orgId, envId }).where(eq(teachers.id, teacherId)).returning();
    if (!updated) throw new Error("Teacher not found");
    return updated;
  }

  async resetTeacherPassword(teacherId: number, passwordHash: string): Promise<Teacher> {
    const [updated] = await db.update(teachers).set({ passwordHash }).where(eq(teachers.id, teacherId)).returning();
    if (!updated) throw new Error("Teacher not found");
    return updated;
  }

  async updateClassEnvLink(classId: number, envId: string | null): Promise<Class> {
    const [updated] = await db.update(classes).set({ envId }).where(eq(classes.id, classId)).returning();
    if (!updated) throw new Error("Class not found");
    return updated;
  }

  async getClassesByOrgId(orgId: string): Promise<(Class & { enrollmentCount: number; teacherName: string })[]> {
    const orgTeachers = await db.select().from(teachers).where(eq(teachers.orgId, orgId));
    if (orgTeachers.length === 0) return [];
    const teacherIds = orgTeachers.map(t => t.id);
    const classList = await db
      .select({ class: classes, teacher: teachers })
      .from(classes)
      .innerJoin(teachers, eq(classes.teacherId, teachers.id))
      .where(inArray(classes.teacherId, teacherIds))
      .orderBy(desc(classes.createdAt));
    if (classList.length === 0) return [];
    const classIds = classList.map(r => r.class.id);
    const counts = await db
      .select({ classId: classEnrollments.classId, count: sql<number>`count(*)` })
      .from(classEnrollments)
      .where(inArray(classEnrollments.classId, classIds))
      .groupBy(classEnrollments.classId);
    const countMap = new Map(counts.map(c => [c.classId, Number(c.count)]));
    return classList.map(r => ({
      ...r.class,
      enrollmentCount: countMap.get(r.class.id) ?? 0,
      teacherName: `${r.teacher.firstName} ${r.teacher.lastName ?? ""}`.trim(),
    }));
  }

  async reassignClassTeacher(classId: number, newTeacherId: number): Promise<Class> {
    const [updated] = await db
      .update(classes)
      .set({ teacherId: newTeacherId })
      .where(eq(classes.id, classId))
      .returning();
    if (!updated) throw new Error("Class not found or reassignment failed");
    return updated;
  }

  async deleteClass(id: number, teacherId: number): Promise<void> {
    const deleted = await db.delete(classes)
      .where(and(eq(classes.id, id), eq(classes.teacherId, teacherId)))
      .returning();
    if (deleted.length === 0) {
      throw new Error("Class not found or you do not have permission to delete it.");
    }
  }

  async getEnrollmentsByClass(classId: number): Promise<(ClassEnrollment & { student: User })[]> {
    const results = await db.select({ enrollment: classEnrollments, student: users })
      .from(classEnrollments)
      .innerJoin(users, eq(classEnrollments.studentId, users.id))
      .where(eq(classEnrollments.classId, classId))
      .orderBy(classEnrollments.joinedAt);
    return results.map(r => ({ ...r.enrollment, student: r.student }));
  }

  async enrollStudent(classId: number, studentId: string): Promise<ClassEnrollment> {
    const [existing] = await db.select().from(classEnrollments).where(and(eq(classEnrollments.classId, classId), eq(classEnrollments.studentId, studentId)));
    if (existing) return existing;
    const [enrollment] = await db.insert(classEnrollments).values({ classId, studentId }).returning();
    return enrollment;
  }

  async getStudentClasses(studentId: string): Promise<(ClassEnrollment & { class: Class })[]> {
    const results = await db.select({ enrollment: classEnrollments, class: classes })
      .from(classEnrollments)
      .innerJoin(classes, eq(classEnrollments.classId, classes.id))
      .where(eq(classEnrollments.studentId, studentId));
    return results.map(r => ({ ...r.enrollment, class: r.class }));
  }

  async removeEnrollment(classId: number, studentId: string): Promise<void> {
    const deleted = await db.delete(classEnrollments)
      .where(and(eq(classEnrollments.classId, classId), eq(classEnrollments.studentId, studentId)))
      .returning();
    if (deleted.length === 0) {
      throw new Error("Student is not enrolled in this class.");
    }
  }

  async getClassProgressSummary(classId: number, opts?: { limit?: number; offset?: number }): Promise<any> {
    // Count total enrollments for pagination metadata, then fetch only the requested page.
    // Both queries hit the (classId) index added in shared/schema.ts.
    const offset = Math.max(0, opts?.offset ?? 0);
    const paginated = opts?.limit !== undefined || opts?.offset !== undefined;
    const limit = opts?.limit;

    const [{ count: totalStudents }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classEnrollments)
      .where(eq(classEnrollments.classId, classId));
    if (totalStudents === 0) return { students: [], avgXp: 0, avgLessons: 0, totalGames: 0, totalStudents: 0 };

    let enrollmentsQ = db
      .select({ enrollment: classEnrollments, student: users })
      .from(classEnrollments)
      .innerJoin(users, eq(classEnrollments.studentId, users.id))
      .where(eq(classEnrollments.classId, classId))
      .orderBy(classEnrollments.joinedAt)
      .$dynamic();
    if (paginated) {
      if (limit !== undefined) enrollmentsQ = enrollmentsQ.limit(limit);
      if (offset > 0) enrollmentsQ = enrollmentsQ.offset(offset);
    }
    const rows = await enrollmentsQ;
    const enrollments = rows.map(r => ({ ...r.enrollment, student: r.student }));
    const studentIds = enrollments.map(e => e.studentId);
    if (studentIds.length === 0) return { students: [], avgXp: 0, avgLessons: 0, totalGames: 0, totalStudents };

    // Batch all per-student data into 5 queries (instead of 5 * N).
    // avgScore mirrors the prior mean-of-session-percentages semantics via SQL avg().
    const [allXp, allProgress, sessionAggs, badgeCounts, allGoals] = await Promise.all([
      db.select().from(userXp).where(inArray(userXp.userId, studentIds)),
      db.select().from(userLearningProgress).where(inArray(userLearningProgress.userId, studentIds)),
      db.select({
        userId: gameSessions.userId,
        gamesPlayed: sql<number>`count(*)`,
        avgScorePct: sql<number>`avg(${gameSessions.correctAnswers}::float / nullif(${gameSessions.totalQuestions}, 0)) * 100`,
      }).from(gameSessions).where(inArray(gameSessions.userId, studentIds)).groupBy(gameSessions.userId),
      db.select({
        userId: userBadges.userId,
        count: sql<number>`count(*)`,
      }).from(userBadges).where(inArray(userBadges.userId, studentIds)).groupBy(userBadges.userId),
      db.select({
        userId: savingsGoals.userId,
        name: savingsGoals.name,
        targetAmount: savingsGoals.targetAmount,
        currentAmount: savingsGoals.currentAmount,
      }).from(savingsGoals).where(inArray(savingsGoals.userId, studentIds)),
    ]);

    const xpByUser = new Map(allXp.map(x => [x.userId, x]));
    const lessonsByUser = new Map<string, number>();
    for (const p of allProgress) {
      if (p.completed) lessonsByUser.set(p.userId, (lessonsByUser.get(p.userId) || 0) + 1);
    }
    const sessionsByUser = new Map(sessionAggs.map(s => [s.userId, s]));
    const badgesByUser = new Map(badgeCounts.map(b => [b.userId, Number(b.count)]));

    // A goal counts as complete when its current amount has reached its target.
    // The "top" goal is the most-progressed goal that is not yet complete.
    const goalsByUser = new Map<string, { count: number; complete: number; topName: string | null; topPct: number }>();
    for (const g of allGoals) {
      const target = Number(g.targetAmount) || 0;
      const current = Number(g.currentAmount) || 0;
      const isComplete = target > 0 && current >= target;
      const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : 0;
      const entry = goalsByUser.get(g.userId) || { count: 0, complete: 0, topName: null, topPct: -1 };
      entry.count += 1;
      if (isComplete) {
        entry.complete += 1;
      } else if (pct > entry.topPct) {
        entry.topPct = pct;
        entry.topName = g.name;
      }
      goalsByUser.set(g.userId, entry);
    }

    const studentData = studentIds.map(sid => {
      const xp = xpByUser.get(sid);
      const sess = sessionsByUser.get(sid);
      const student = enrollments.find(e => e.studentId === sid)?.student;
      const gamesPlayed = Number(sess?.gamesPlayed || 0);
      const avgScore = sess?.avgScorePct != null ? Math.round(Number(sess.avgScorePct)) : 0;
      const goals = goalsByUser.get(sid);
      const hasActiveGoal = goals != null && goals.topPct >= 0;
      return {
        id: sid,
        name: student?.firstName || student?.username || sid,
        avatar: student?.avatar || 'star',
        username: student?.username || sid,
        xp: xp?.totalXp || 0,
        level: xp?.level || 1,
        streak: xp?.currentStreak || 0,
        lessonsCompleted: lessonsByUser.get(sid) || 0,
        totalLessons: 6,
        gamesPlayed,
        avgScore,
        badges: badgesByUser.get(sid) || 0,
        savingsGoalCount: goals?.count || 0,
        savingsGoalsComplete: goals?.complete || 0,
        savingsTopGoalName: hasActiveGoal ? goals!.topName : null,
        savingsTopGoalPct: hasActiveGoal ? goals!.topPct : null,
      };
    });

    const avgXp = studentData.length > 0 ? Math.round(studentData.reduce((s, d) => s + d.xp, 0) / studentData.length) : 0;
    const avgLessons = studentData.length > 0 ? Math.round(studentData.reduce((s, d) => s + d.lessonsCompleted, 0) / studentData.length) : 0;
    const totalGames = studentData.reduce((s, d) => s + d.gamesPlayed, 0);
    return { students: studentData, avgXp, avgLessons, totalGames, totalStudents };
  }

  async getChallengesByClass(classId: number): Promise<Challenge[]> {
    return await db.select().from(challenges).where(eq(challenges.classId, classId)).orderBy(desc(challenges.createdAt));
  }

  async createChallenge(data: InsertChallenge): Promise<Challenge> {
    const [challenge] = await db.insert(challenges).values(data).returning();
    return challenge;
  }

  async deleteChallenge(id: number, teacherId: number): Promise<void> {
    await db.delete(challenges).where(and(eq(challenges.id, id), eq(challenges.teacherId, teacherId)));
  }

  async getNotificationsByClass(classId: number): Promise<ClassNotification[]> {
    return await db.select().from(classNotifications).where(eq(classNotifications.classId, classId)).orderBy(desc(classNotifications.createdAt));
  }

  async createNotification(data: InsertClassNotification): Promise<ClassNotification> {
    const [notification] = await db.insert(classNotifications).values(data).returning();
    return notification;
  }

  async deleteNotification(id: number, teacherId: number): Promise<void> {
    await db.delete(classNotifications).where(and(eq(classNotifications.id, id), eq(classNotifications.teacherId, teacherId)));
  }

  async createStudentFeedback(data: InsertStudentFeedback): Promise<StudentFeedback> {
    const [feedback] = await db.insert(studentFeedback).values(data).returning();
    return feedback;
  }

  async getStudentFeedbackByStudent(studentId: string): Promise<Array<StudentFeedback & { teacherName: string }>> {
    const rows = await db
      .select({ sf: studentFeedback, firstName: teachers.firstName, lastName: teachers.lastName })
      .from(studentFeedback)
      .innerJoin(teachers, eq(studentFeedback.teacherId, teachers.id))
      .where(eq(studentFeedback.studentId, studentId))
      .orderBy(desc(studentFeedback.createdAt));
    return rows.map(r => ({ ...r.sf, teacherName: `${r.firstName} ${r.lastName}` }));
  }

  async getStudentFeedbackByTeacherAndStudent(teacherId: number, studentId: string): Promise<Array<StudentFeedback & { teacherName: string }>> {
    const rows = await db
      .select({ sf: studentFeedback, firstName: teachers.firstName, lastName: teachers.lastName })
      .from(studentFeedback)
      .innerJoin(teachers, eq(studentFeedback.teacherId, teachers.id))
      .where(and(eq(studentFeedback.teacherId, teacherId), eq(studentFeedback.studentId, studentId)))
      .orderBy(desc(studentFeedback.createdAt));
    return rows.map(r => ({ ...r.sf, teacherName: `${r.firstName} ${r.lastName}` }));
  }

  async deleteUserAllData(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(studentFeedback).where(eq(studentFeedback.studentId, userId));
      await tx.delete(classEnrollments).where(eq(classEnrollments.studentId, userId));
      await tx.delete(examPapers).where(eq(examPapers.userId, userId));
      await tx.delete(gameSessions).where(eq(gameSessions.userId, userId));
      await tx.delete(userXp).where(eq(userXp.userId, userId));
      await tx.delete(userBadges).where(eq(userBadges.userId, userId));
      await tx.delete(userLearningProgress).where(eq(userLearningProgress.userId, userId));
      await tx.delete(portfolioTransactions).where(eq(portfolioTransactions.userId, userId));
      await tx.delete(portfolioHoldings).where(eq(portfolioHoldings.userId, userId));
      await tx.delete(userVirtualBalance).where(eq(userVirtualBalance.userId, userId));
      await tx.delete(transactions).where(eq(transactions.userId, userId));
      await tx.delete(budgets).where(eq(budgets.userId, userId));
      await tx.delete(savingsGoals).where(eq(savingsGoals.userId, userId));
      await tx.delete(billReminders).where(eq(billReminders.userId, userId));
      await tx.delete(linkedCards).where(eq(linkedCards.userId, userId));
      await tx.delete(documentUploads).where(eq(documentUploads.userId, userId));
      await tx.delete(categories).where(eq(categories.userId, userId));
      await tx.delete(emailContacts).where(eq(emailContacts.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  async logDeletion(data: InsertDeletionLog): Promise<void> {
    await db.insert(deletionLog).values(data);
  }

  async getClassLeaderboard(classId: number): Promise<any[]> {
    const summary = await this.getClassProgressSummary(classId);
    return summary.students.sort((a: any, b: any) => b.xp - a.xp);
  }

  async getClassAnalytics(classId: number): Promise<any> {
    const summary = await this.getClassProgressSummary(classId);
    const students = summary.students;
    const avgScore = students.length > 0 ? Math.round(students.reduce((s: number, d: any) => s + d.avgScore, 0) / students.length) : 0;
    const avgLessons = summary.avgLessons;
    const topStudents = [...students].sort((a: any, b: any) => b.xp - a.xp).slice(0, 3);
    const engagementRate = students.length > 0 ? Math.round((students.filter((s: any) => s.gamesPlayed > 0).length / students.length) * 100) : 0;
    return { avgScore, avgLessons, totalStudents: students.length, topStudents, engagementRate, totalGames: summary.totalGames };
  }

  // === ADMIN METHODS ===

  async getAdminOverview(): Promise<any> {
    const [studentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [teacherCount] = await db.select({ count: sql<number>`count(*)::int` }).from(teachers);
    const [classCount] = await db.select({ count: sql<number>`count(*)::int` }).from(classes);
    const [challengeCount] = await db.select({ count: sql<number>`count(*)::int` }).from(challenges);
    const [sponsorCount] = await db.select({ count: sql<number>`count(*)::int` }).from(sponsors);
    const [schoolCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schools);
    const [enrollmentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(classEnrollments);
    const [gameCount] = await db.select({ count: sql<number>`count(*)::int` }).from(gameSessions);
    return {
      totalStudents: studentCount.count,
      totalTeachers: teacherCount.count,
      totalClasses: classCount.count,
      totalChallenges: challengeCount.count,
      totalSponsors: sponsorCount.count,
      totalSchools: schoolCount.count,
      totalEnrollments: enrollmentCount.count,
      totalGames: gameCount.count,
    };
  }

  async getAdminStudents(): Promise<any[]> {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const allXp = await db.select().from(userXp);
    const allEnrollments = await db.select().from(classEnrollments);
    const allClasses = await db.select().from(classes);
    const allTeachers = await db.select().from(teachers);
    const allSessions = await db.select().from(gameSessions);
    const allProgress = await db.select().from(userLearningProgress);

    return allUsers.map(u => {
      const xpRow = allXp.find(x => x.userId === u.id);
      const enrollment = allEnrollments.find(e => e.studentId === u.id);
      const cls = enrollment ? allClasses.find(c => c.id === enrollment.classId) : null;
      const teacher = cls ? allTeachers.find(t => t.id === cls.teacherId) : null;
      const sessions = allSessions.filter(s => s.userId === u.id);
      const lessons = allProgress.filter(p => p.userId === u.id && p.completed);
      const avgScore = sessions.length > 0 ? Math.round(sessions.reduce((s, gs) => s + (gs.correctAnswers / Math.max(gs.totalQuestions, 1)) * 100, 0) / sessions.length) : 0;
      return {
        id: u.id,
        studentName: u.firstName,
        username: u.username,
        className: cls?.name ?? '-',
        schoolName: teacher?.schoolName ?? '-',
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : '-',
        lessonsCompleted: lessons.length,
        quizScore: avgScore,
        simulatorScore: xpRow?.totalXp ?? 0,
        level: xpRow?.level ?? 1,
        gamesPlayed: sessions.length,
        joinedAt: u.createdAt,
      };
    });
  }

  async getAdminTeachers(): Promise<any[]> {
    const allTeachers = await db.select().from(teachers).orderBy(desc(teachers.createdAt));
    const allClasses = await db.select().from(classes);
    const allEnrollments = await db.select().from(classEnrollments);
    return allTeachers.map(t => {
      const teacherClasses = allClasses.filter(c => c.teacherId === t.id);
      const classIds = teacherClasses.map(c => c.id);
      const studentCount = allEnrollments.filter(e => classIds.includes(e.classId)).length;
      return {
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email,
        schoolName: t.schoolName,
        classCount: teacherClasses.length,
        studentCount,
        orgId: t.orgId,
        envId: t.envId,
        createdAt: t.createdAt,
      };
    });
  }

  async getAdminClasses(): Promise<any[]> {
    const allClasses = await db.select().from(classes).orderBy(desc(classes.createdAt));
    const allTeachers = await db.select().from(teachers);
    const allEnrollments = await db.select().from(classEnrollments);
    const allChallenges = await db.select().from(challenges);
    return allClasses.map(c => {
      const teacher = allTeachers.find(t => t.id === c.teacherId);
      const enrolled = allEnrollments.filter(e => e.classId === c.id).length;
      const challengeCount = allChallenges.filter(ch => ch.classId === c.id).length;
      return {
        id: c.id,
        name: c.name,
        subject: c.subject,
        code: c.code,
        sponsorName: c.sponsorName,
        envId: c.envId,
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : '-',
        schoolName: teacher?.schoolName ?? '-',
        studentCount: enrolled,
        challengeCount,
        createdAt: c.createdAt,
      };
    });
  }

  async getAdminChallenges(): Promise<any[]> {
    const allChallenges = await db.select().from(challenges).orderBy(desc(challenges.createdAt));
    const allClasses = await db.select().from(classes);
    const allTeachers = await db.select().from(teachers);
    return allChallenges.map(ch => {
      const cls = allClasses.find(c => c.id === ch.classId);
      const teacher = allTeachers.find(t => t.id === ch.teacherId);
      return {
        ...ch,
        className: cls?.name ?? '-',
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : '-',
      };
    });
  }

  async adminSearch(query: string): Promise<any> {
    const q = query.toLowerCase().trim();
    if (!q) return { students: [], teachers: [], classes: [], sponsors: [], schools: [] };

    const allUsers = await db.select().from(users);
    const allTeachers = await db.select().from(teachers);
    const allClasses = await db.select().from(classes);
    const allSponsors = await db.select().from(sponsors);
    const allSchools = await db.select().from(schools);

    const students = allUsers.filter(u =>
      (u.firstName ?? '').toLowerCase().includes(q) || (u.username ?? '').toLowerCase().includes(q)
    ).slice(0, 10).map(u => ({ id: u.id, name: u.firstName, username: u.username, type: 'student' }));

    const filteredTeachers = allTeachers.filter(t =>
      t.firstName.toLowerCase().includes(q) || t.lastName.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) || t.schoolName.toLowerCase().includes(q)
    ).slice(0, 10).map(t => ({ id: t.id, name: `${t.firstName} ${t.lastName}`, email: t.email, school: t.schoolName, type: 'teacher' }));

    const filteredClasses = allClasses.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    ).slice(0, 10).map(c => ({ id: c.id, name: c.name, code: c.code, type: 'class' }));

    const filteredSponsors = allSponsors.filter(s =>
      s.name.toLowerCase().includes(q)
    ).slice(0, 5).map(s => ({ id: s.id, name: s.name, type: 'sponsor' }));

    const filteredSchools = allSchools.filter(s =>
      s.name.toLowerCase().includes(q) || s.country.toLowerCase().includes(q)
    ).slice(0, 5).map(s => ({ id: s.id, name: s.name, country: s.country, type: 'school' }));

    return { students, teachers: filteredTeachers, classes: filteredClasses, sponsors: filteredSponsors, schools: filteredSchools };
  }

  async getStudentGrowth(): Promise<any[]> {
    const allUsers = await db.select({ createdAt: users.createdAt }).from(users).orderBy(users.createdAt);
    const byWeek: Record<string, number> = {};
    allUsers.forEach(u => {
      if (!u.createdAt) return;
      const d = new Date(u.createdAt);
      const weekKey = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)).padStart(2, '0')}`;
      byWeek[weekKey] = (byWeek[weekKey] || 0) + 1;
    });
    return Object.entries(byWeek).slice(-12).map(([week, count]) => ({ week, count }));
  }

  async getLessonsCompletedPerWeek(): Promise<any[]> {
    const sessions = await db.select({ completedAt: gameSessions.completedAt }).from(gameSessions).orderBy(gameSessions.completedAt);
    const byWeek: Record<string, number> = {};
    sessions.forEach(s => {
      if (!s.completedAt) return;
      const d = new Date(s.completedAt);
      const weekKey = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)).padStart(2, '0')}`;
      byWeek[weekKey] = (byWeek[weekKey] || 0) + 1;
    });
    return Object.entries(byWeek).slice(-12).map(([week, count]) => ({ week, count }));
  }

  async getMostActiveSchools(): Promise<any[]> {
    const teachers_ = await db.select().from(teachers);
    const classes_ = await db.select().from(classes);
    const enrollments_ = await db.select().from(classEnrollments);
    const sessions_ = await db.select().from(gameSessions);
    const xpAll = await db.select().from(userXp);
    const enrollmentMap: Record<string, string> = {};
    enrollments_.forEach(e => { enrollmentMap[e.studentId] = e.classId.toString(); });

    const schoolData: Record<string, { name: string; students: Set<string>; games: number }> = {};
    teachers_.forEach(t => {
      const teacherClasses = classes_.filter(c => c.teacherId === t.id);
      teacherClasses.forEach(c => {
        const students = enrollments_.filter(e => e.classId === c.id);
        const games = sessions_.filter(s => students.some(e => e.studentId === s.userId)).length;
        if (!schoolData[t.schoolName]) schoolData[t.schoolName] = { name: t.schoolName, students: new Set(), games: 0 };
        students.forEach(e => schoolData[t.schoolName].students.add(e.studentId));
        schoolData[t.schoolName].games += games;
      });
    });
    return Object.values(schoolData)
      .map(s => ({ name: s.name, students: s.students.size, games: s.games }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 10);
  }

  // Schools CRUD
  async getSchools(): Promise<School[]> {
    return await db.select().from(schools).orderBy(desc(schools.createdAt));
  }
  async createSchool(data: InsertSchool): Promise<School> {
    const [school] = await db.insert(schools).values(data).returning();
    return school;
  }
  async updateSchool(id: number, data: Partial<InsertSchool>): Promise<School> {
    const [school] = await db.update(schools).set(data).where(eq(schools.id, id)).returning();
    return school;
  }
  async deleteSchool(id: number): Promise<void> {
    await db.delete(schools).where(eq(schools.id, id));
  }

  // Sponsors CRUD
  async getSponsors(): Promise<Sponsor[]> {
    return await db.select().from(sponsors).orderBy(desc(sponsors.createdAt));
  }
  async createSponsor(data: InsertSponsor): Promise<Sponsor> {
    const [sponsor] = await db.insert(sponsors).values(data).returning();
    return sponsor;
  }
  async updateSponsor(id: number, data: Partial<InsertSponsor>): Promise<Sponsor> {
    const [sponsor] = await db.update(sponsors).set(data).where(eq(sponsors.id, id)).returning();
    return sponsor;
  }
  async deleteSponsor(id: number): Promise<void> {
    await db.delete(sponsors).where(eq(sponsors.id, id));
  }

  // === DEMO SYSTEM ===

  async setupDemoData(): Promise<{ teacher: any; students: any[]; classData: any }> {
    const bcrypt = await import("bcryptjs");

    // Check if demo already exists
    const existing = await db.select().from(teachers).where(eq(teachers.email, "demo@finsightlite.com"));
    let teacher = existing[0];

    if (!teacher) {
      const hash = await bcrypt.hash("demo1234", 10);
      [teacher] = await db.insert(teachers).values({
        firstName: "Alex", lastName: "Morgan",
        email: "demo@finsightlite.com", passwordHash: hash,
        schoolName: "Commonwealth Financial Academy",
      }).returning();
    }

    // Demo class
    const existingClass = await db.select().from(classes).where(eq(classes.code, "DEMO01"));
    let cls = existingClass[0];
    if (!cls) {
      [cls] = await db.insert(classes).values({
        teacherId: teacher.id, name: "Financial Literacy 101",
        subject: "Financial Literacy", code: "DEMO01",
        sponsorName: "Commonwealth Bank",
      }).returning();
    }

    // Demo students
    const demoStudents = [
      { id: "demo-student-001", firstName: "Jamie", username: "Jamie_Demo", avatar: "star" },
      { id: "demo-student-002", firstName: "Chris", username: "Chris_Demo", avatar: "dolphin" },
      { id: "demo-student-003", firstName: "Taylor", username: "Taylor_Demo", avatar: "rocket" },
      { id: "demo-student-004", firstName: "Jordan", username: "Jordan_Demo", avatar: "lion" },
    ];

    const studentProgress = [
      { xp: 480, level: 5, streak: 7, lessons: [1,2,3,4,5], correct: 8, total: 10 },
      { xp: 310, level: 4, streak: 3, lessons: [1,2,3,4], correct: 7, total: 10 },
      { xp: 150, level: 2, streak: 1, lessons: [1,2,3], correct: 5, total: 10 },
      { xp: 220, level: 3, streak: 5, lessons: [1,2,3,4], correct: 6, total: 10 },
    ];

    const createdStudents: any[] = [];
    for (let i = 0; i < demoStudents.length; i++) {
      const s = demoStudents[i];
      const prog = studentProgress[i];
      const already = await db.select().from(users).where(eq(users.id, s.id));
      let student = already[0];
      if (!student) {
        [student] = await db.insert(users).values(s as any).returning();
      }
      createdStudents.push(student);

      // Enroll in demo class
      const alreadyEnrolled = await db.select().from(classEnrollments)
        .where(and(eq(classEnrollments.classId, cls.id), eq(classEnrollments.studentId, s.id)));
      if (!alreadyEnrolled.length) {
        await db.insert(classEnrollments).values({ classId: cls.id, studentId: s.id });
      }

      // XP
      const alreadyXp = await db.select().from(userXp).where(eq(userXp.userId, s.id));
      if (!alreadyXp.length) {
        await db.insert(userXp).values({ userId: s.id, totalXp: prog.xp, level: prog.level, currentStreak: prog.streak, longestStreak: prog.streak });
      }

      // Lesson progress
      for (const moduleId of prog.lessons) {
        const alreadyLesson = await db.select().from(userLearningProgress)
          .where(and(eq(userLearningProgress.userId, s.id), eq(userLearningProgress.moduleId, moduleId)));
        if (!alreadyLesson.length) {
          await db.insert(userLearningProgress).values({ userId: s.id, moduleId, completed: true });
        }
      }

      // Game session
      const alreadySession = await db.select().from(gameSessions).where(eq(gameSessions.userId, s.id));
      if (!alreadySession.length) {
        await db.insert(gameSessions).values({ userId: s.id, mode: "quiz", score: prog.xp, correctAnswers: prog.correct, totalQuestions: prog.total });
      }
    }

    // Challenges
    const existingChallenges = await db.select().from(challenges).where(eq(challenges.classId, cls.id));
    if (!existingChallenges.length) {
      await db.insert(challenges).values([
        { classId: cls.id, teacherId: teacher.id, title: "Savings Sprint", description: "Save $50 by end of the month using the simulator", type: "savings", startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000), targetValue: "50" },
        { classId: cls.id, teacherId: teacher.id, title: "Quiz Bowl Round 1", description: "Complete all 6 learning modules and achieve 80%+ quiz accuracy", type: "quiz", startDate: new Date(), endDate: new Date(Date.now() + 14 * 86400000) },
      ]);
    }

    // Notification
    const existingNotifs = await db.select().from(classNotifications).where(eq(classNotifications.classId, cls.id));
    if (!existingNotifs.length) {
      await db.insert(classNotifications).values({
        classId: cls.id, teacherId: teacher.id, title: "Welcome to Financial Literacy 101!",
        message: "Hi everyone, welcome to this demo class. Explore the platform and try completing the learning modules. Your teacher can track your progress from the Teacher Dashboard.",
        type: "announcement",
      });
    }

    // === Demo financial data for featured student (Jamie, demo-student-001) ===
    const catRows = await db.select().from(categories).where(isNull(categories.userId));
    const catByName: Record<string, number> = Object.fromEntries(catRows.map((c: any) => [c.name, c.id]));

    const alreadyTx = await db.select().from(transactions).where(eq(transactions.userId, "demo-student-001"));
    if (!alreadyTx.length) {
      const now = new Date();
      const d = (daysAgo: number) => { const dt = new Date(now); dt.setDate(dt.getDate() - daysAgo); return dt; };
      await db.insert(transactions).values([
        { userId: "demo-student-001", amount: "35.00", type: "income", currency: "BSD", categoryId: catByName["Allowance"] ?? null, date: d(14), description: "Weekly allowance from mom" },
        { userId: "demo-student-001", amount: "2.50", type: "expense", currency: "BSD", categoryId: catByName["Transportation"] ?? null, date: d(13), description: "Bus fare to school" },
        { userId: "demo-student-001", amount: "12.75", type: "expense", currency: "BSD", categoryId: catByName["Food & Dining"] ?? null, date: d(12), description: "Lunch at Johnny Canoe's" },
        { userId: "demo-student-001", amount: "18.50", type: "expense", currency: "BSD", categoryId: catByName["Education"] ?? null, date: d(11), description: "School supplies from Family Guardian" },
        { userId: "demo-student-001", amount: "4.25", type: "expense", currency: "BSD", categoryId: catByName["Food & Dining"] ?? null, date: d(10), description: "Snacks at corner shop" },
        { userId: "demo-student-001", amount: "15.00", type: "expense", currency: "BSD", categoryId: catByName["Bills & Utilities"] ?? null, date: d(9), description: "BTC mobile top-up" },
        { userId: "demo-student-001", amount: "35.00", type: "income", currency: "BSD", categoryId: catByName["Allowance"] ?? null, date: d(7), description: "Weekly allowance from mom" },
        { userId: "demo-student-001", amount: "8.75", type: "expense", currency: "BSD", categoryId: catByName["Food & Dining"] ?? null, date: d(6), description: "Lunch at Bahamian Cookin'" },
        { userId: "demo-student-001", amount: "2.50", type: "expense", currency: "BSD", categoryId: catByName["Transportation"] ?? null, date: d(5), description: "Bus fare to school" },
        { userId: "demo-student-001", amount: "20.00", type: "expense", currency: "BSD", categoryId: catByName["Personal Care"] ?? null, date: d(3), description: "Haircut at local barber" },
        { userId: "demo-student-001", amount: "35.00", type: "income", currency: "BSD", categoryId: catByName["Allowance"] ?? null, date: d(0), description: "Weekly allowance from mom" },
        { userId: "demo-student-001", amount: "6.50", type: "expense", currency: "BSD", categoryId: catByName["Food & Dining"] ?? null, date: d(0), description: "Cold drinks and snacks" },
      ]);
    }

    const alreadyBudgets = await db.select().from(budgets).where(eq(budgets.userId, "demo-student-001"));
    if (!alreadyBudgets.length && catByName["Food & Dining"]) {
      await db.insert(budgets).values([
        { userId: "demo-student-001", categoryId: catByName["Food & Dining"], amount: "60.00", period: "monthly" },
        { userId: "demo-student-001", categoryId: catByName["Transportation"] ?? catByName["Food & Dining"], amount: "30.00", period: "monthly" },
        { userId: "demo-student-001", categoryId: catByName["Personal Care"] ?? catByName["Food & Dining"], amount: "25.00", period: "monthly" },
      ]);
    }

    const alreadyGoals = await db.select().from(savingsGoals).where(eq(savingsGoals.userId, "demo-student-001"));
    if (!alreadyGoals.length) {
      await db.insert(savingsGoals).values([
        { userId: "demo-student-001", name: "School Trip to Nassau", targetAmount: "150.00", currentAmount: "87.50", currency: "BSD", deadline: new Date(Date.now() + 60 * 86400000), icon: "✈️", color: "#8B5CF6" },
        { userId: "demo-student-001", name: "New School Bag", targetAmount: "45.00", currentAmount: "22.00", currency: "BSD", deadline: new Date(Date.now() + 30 * 86400000), icon: "🎒", color: "#F59E0B" },
      ]);
    }

    const alreadyHoldings = await db.select().from(portfolioHoldings).where(eq(portfolioHoldings.userId, "demo-student-001"));
    if (!alreadyHoldings.length) {
      const cblStock = await db.select().from(simulatedStocks).where(eq(simulatedStocks.ticker, "CBL-BS"));
      const btcStock = await db.select().from(simulatedStocks).where(eq(simulatedStocks.ticker, "BTC-BS"));
      if (cblStock.length) {
        await db.insert(portfolioHoldings).values({ userId: "demo-student-001", stockId: cblStock[0].id, quantity: 5, avgPurchasePrice: "7.90" });
        await db.insert(portfolioTransactions).values({ userId: "demo-student-001", stockId: cblStock[0].id, type: "buy", quantity: 5, pricePerUnit: "7.90", currency: "BSD" });
      }
      if (btcStock.length) {
        await db.insert(portfolioHoldings).values({ userId: "demo-student-001", stockId: btcStock[0].id, quantity: 10, avgPurchasePrice: "5.25" });
        await db.insert(portfolioTransactions).values({ userId: "demo-student-001", stockId: btcStock[0].id, type: "buy", quantity: 10, pricePerUnit: "5.25", currency: "BSD" });
      }
    }

    return { teacher, students: createdStudents, classData: cls };
  }

  async getDemoCredentials(): Promise<any> {
    const teacher = await db.select().from(teachers).where(eq(teachers.email, "demo@finsightlite.com"));
    if (!teacher.length) return null;
    const cls = await db.select().from(classes).where(eq(classes.code, "DEMO01"));
    const studentList = await Promise.all(
      ["demo-student-001", "demo-student-002", "demo-student-003", "demo-student-004"].map(id =>
        db.select().from(users).where(eq(users.id, id)).then(r => r[0])
      )
    );
    return {
      teacher: { id: teacher[0].id, name: `${teacher[0].firstName} ${teacher[0].lastName}`, email: teacher[0].email, school: teacher[0].schoolName },
      students: studentList.filter(Boolean).map(s => ({ id: s.id, name: s.firstName, username: s.username, avatar: s.avatar })),
      class: cls[0] ? { name: cls[0].name, code: cls[0].code } : null,
    };
  }

  async getAdminDbTable(tableName: string): Promise<any[]> {
    const tableMap: Record<string, any> = {
      users, teachers, classes, classEnrollments, challenges, classNotifications,
      schools, sponsors, gameSessions, userXp, userBadges, userLearningProgress,
    };
    const tbl = tableMap[tableName];
    if (!tbl) return [];
    return await db.select().from(tbl).limit(500);
  }

  // === ORG ADMIN ===

  async createOrgAdmin(data: InsertOrgAdmin & { passwordHash?: string | null }): Promise<OrgAdmin> {
    const [admin] = await db.insert(orgAdmins).values(data).returning();
    return admin;
  }

  async getOrgAdminByEmail(email: string): Promise<OrgAdmin | undefined> {
    const [admin] = await db.select().from(orgAdmins).where(eq(orgAdmins.email, email.toLowerCase()));
    return admin;
  }

  async getOrgAdminById(id: number): Promise<OrgAdmin | undefined> {
    const [admin] = await db.select().from(orgAdmins).where(eq(orgAdmins.id, id));
    return admin;
  }

  async getStudentsByOrgId(orgId: string): Promise<User[]> {
    const rows = await db
      .selectDistinct({ user: users })
      .from(classEnrollments)
      .innerJoin(users, eq(classEnrollments.studentId, users.id))
      .innerJoin(classes, eq(classEnrollments.classId, classes.id))
      .innerJoin(teachers, eq(classes.teacherId, teachers.id))
      .where(eq(teachers.orgId, orgId));
    return rows.map((r) => r.user);
  }

  async getTeachersByOrgId(orgId: string): Promise<Teacher[]> {
    return db.select().from(teachers).where(eq(teachers.orgId, orgId));
  }

  async getOrgAdminsByOrgId(orgId: string): Promise<OrgAdmin[]> {
    return db.select().from(orgAdmins).where(eq(orgAdmins.orgId, orgId));
  }
}

export const storage = new DatabaseStorage();
