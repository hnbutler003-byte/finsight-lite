import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar, index } from "drizzle-orm/pg-core";
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
  type: text("type", { enum: ["income", "expense"] }).notNull().default("expense"),
  currency: text("currency").default("BSD").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  date: timestamp("date").notNull(),
  description: text("description"),
  isAutoSynced: boolean("is_auto_synced").default(false),
  documentUploadId: integer("document_upload_id").references(() => documentUploads.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  userDateIdx: index("idx_transactions_user_date").on(t.userId, t.date),
  userCategoryIdx: index("idx_transactions_user_category").on(t.userId, t.categoryId),
}));

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

export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  targetAmount: numeric("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: numeric("current_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  currency: text("currency").default("BSD").notNull(),
  deadline: timestamp("deadline"),
  icon: text("icon"),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const billReminders = pgTable("bill_reminders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("BSD").notNull(),
  frequency: text("frequency", { enum: ["weekly", "monthly", "quarterly", "yearly"] }).default("monthly").notNull(),
  nextDueDate: timestamp("next_due_date").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  isAutoDetected: boolean("is_auto_detected").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === INVESTMENT SIMULATION TABLES ===

export const simulatedStocks = pgTable("simulated_stocks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ticker: text("ticker").notNull(),
  type: text("type", { enum: ["stock", "bond"] }).notNull(),
  description: text("description").notNull(),
  currentPrice: numeric("current_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("BSD").notNull(),
  issuer: text("issuer"),
  region: text("region"),
  riskLevel: text("risk_level", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  annualReturnPct: numeric("annual_return_pct", { precision: 5, scale: 2 }),
});

export const portfolioHoldings = pgTable("portfolio_holdings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  stockId: integer("stock_id").notNull().references(() => simulatedStocks.id),
  quantity: integer("quantity").notNull(),
  avgPurchasePrice: numeric("avg_purchase_price", { precision: 10, scale: 2 }).notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

export const portfolioTransactions = pgTable("portfolio_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  stockId: integer("stock_id").notNull().references(() => simulatedStocks.id),
  type: text("type", { enum: ["buy", "sell"] }).notNull(),
  quantity: integer("quantity").notNull(),
  pricePerUnit: numeric("price_per_unit", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("BSD").notNull(),
  executedAt: timestamp("executed_at").defaultNow(),
});

export const learningModules = pgTable("learning_modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  order: integer("order").notNull(),
  icon: text("icon"),
});

export const userLearningProgress = pgTable("user_learning_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  moduleId: integer("module_id").notNull().references(() => learningModules.id),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
});

export const userVirtualBalance = pgTable("user_virtual_balance", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("10000").notNull(),
  currency: text("currency").default("BSD").notNull(),
});

// === SCHOOLS & SPONSORS TABLES ===

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").default("Bahamas").notNull(),
  city: text("city"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sponsors = pgTable("sponsors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["bank", "credit_union", "business", "government", "other"] }).default("business").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  website: text("website"),
  country: text("country").default("Bahamas"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === TEACHER DASHBOARD TABLES ===

export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  schoolName: text("school_name").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  orgId: text("org_id"),
  envId: text("env_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id),
  name: text("name").notNull(),
  subject: text("subject").default("Financial Literacy").notNull(),
  code: text("code").unique().notNull(),
  sponsorName: text("sponsor_name"),
  envId: text("env_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classEnrollments = pgTable("class_enrollments", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (t) => ({
  classIdx: index("idx_class_enrollments_class").on(t.classId),
  studentIdx: index("idx_class_enrollments_student").on(t.studentId),
}));

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type", { enum: ["savings", "quiz", "investment", "budget"] }).default("quiz").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  targetValue: numeric("target_value", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classNotifications = pgTable("class_notifications", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type", { enum: ["announcement", "reminder", "congratulations"] }).default("announcement").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === ORGANIZATION ADMIN TABLE ===

export const orgAdmins = pgTable("org_admins", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  orgId: text("org_id").notNull(),
  envId: text("env_id").notNull(),
  role: text("role").default("admin").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrgAdminSchema = createInsertSchema(orgAdmins).omit({ id: true, createdAt: true });
export type OrgAdmin = typeof orgAdmins.$inferSelect;
export type InsertOrgAdmin = z.infer<typeof insertOrgAdminSchema>;

// === MONEYLAB TABLES ===

export const examPapers = pgTable("exam_papers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  status: text("status", { enum: ["processing", "completed", "failed"] }).default("processing").notNull(),
  questionCount: integer("question_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  statusCreatedIdx: index("idx_exam_papers_status_created").on(t.status, t.createdAt),
  userIdx: index("idx_exam_papers_user").on(t.userId),
}));

export const extractedQuestions = pgTable("extracted_questions", {
  id: serial("id").primaryKey(),
  paperId: integer("paper_id").notNull().references(() => examPapers.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: text("options").array().notNull(),
  correctAnswer: text("correct_answer").notNull(),
  subject: text("subject"),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).default("medium"),
  order: integer("order").default(0),
});

export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  paperId: integer("paper_id").references(() => examPapers.id),
  mode: text("mode", { enum: ["quiz", "timed", "challenge"] }).notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  timeSpent: integer("time_spent"),
  xpEarned: integer("xp_earned").default(0),
  completedAt: timestamp("completed_at").defaultNow(),
}, (t) => ({
  userCompletedIdx: index("idx_game_sessions_user_completed").on(t.userId, t.completedAt),
  completedIdx: index("idx_game_sessions_completed").on(t.completedAt),
}));

export const userXp = pgTable("user_xp", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  totalXp: integer("total_xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastPlayedAt: timestamp("last_played_at"),
});

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  badgeId: text("badge_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
}, (t) => ({
  userIdx: index("idx_user_badges_user").on(t.userId),
}));

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

export const savingsGoalsRelations = relations(savingsGoals, ({ one }) => ({
  user: one(users, {
    fields: [savingsGoals.userId],
    references: [users.id],
  }),
}));

export const billRemindersRelations = relations(billReminders, ({ one }) => ({
  user: one(users, {
    fields: [billReminders.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [billReminders.categoryId],
    references: [categories.id],
  }),
}));

export const simulatedStocksRelations = relations(simulatedStocks, ({ many }) => ({
  holdings: many(portfolioHoldings),
  transactions: many(portfolioTransactions),
}));

export const portfolioHoldingsRelations = relations(portfolioHoldings, ({ one }) => ({
  user: one(users, { fields: [portfolioHoldings.userId], references: [users.id] }),
  stock: one(simulatedStocks, { fields: [portfolioHoldings.stockId], references: [simulatedStocks.id] }),
}));

export const portfolioTransactionsRelations = relations(portfolioTransactions, ({ one }) => ({
  user: one(users, { fields: [portfolioTransactions.userId], references: [users.id] }),
  stock: one(simulatedStocks, { fields: [portfolioTransactions.stockId], references: [simulatedStocks.id] }),
}));

export const learningModulesRelations = relations(learningModules, ({ many }) => ({
  progress: many(userLearningProgress),
}));

export const userLearningProgressRelations = relations(userLearningProgress, ({ one }) => ({
  user: one(users, { fields: [userLearningProgress.userId], references: [users.id] }),
  module: one(learningModules, { fields: [userLearningProgress.moduleId], references: [learningModules.id] }),
}));

export const userVirtualBalanceRelations = relations(userVirtualBalance, ({ one }) => ({
  user: one(users, { fields: [userVirtualBalance.userId], references: [users.id] }),
}));

export const examPapersRelations = relations(examPapers, ({ one, many }) => ({
  user: one(users, { fields: [examPapers.userId], references: [users.id] }),
  questions: many(extractedQuestions),
}));

export const extractedQuestionsRelations = relations(extractedQuestions, ({ one }) => ({
  paper: one(examPapers, { fields: [extractedQuestions.paperId], references: [examPapers.id] }),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  user: one(users, { fields: [gameSessions.userId], references: [users.id] }),
  paper: one(examPapers, { fields: [gameSessions.paperId], references: [examPapers.id] }),
}));

export const userXpRelations = relations(userXp, ({ one }) => ({
  user: one(users, { fields: [userXp.userId], references: [users.id] }),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, { fields: [userBadges.userId], references: [users.id] }),
}));

export const teachersRelations = relations(teachers, ({ many }) => ({
  classes: many(classes),
  challenges: many(challenges),
  notifications: many(classNotifications),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(teachers, { fields: [classes.teacherId], references: [teachers.id] }),
  enrollments: many(classEnrollments),
  challenges: many(challenges),
  notifications: many(classNotifications),
}));

export const classEnrollmentsRelations = relations(classEnrollments, ({ one }) => ({
  class: one(classes, { fields: [classEnrollments.classId], references: [classes.id] }),
  student: one(users, { fields: [classEnrollments.studentId], references: [users.id] }),
}));

export const challengesRelations = relations(challenges, ({ one }) => ({
  class: one(classes, { fields: [challenges.classId], references: [classes.id] }),
  teacher: one(teachers, { fields: [challenges.teacherId], references: [teachers.id] }),
}));

export const classNotificationsRelations = relations(classNotifications, ({ one }) => ({
  class: one(classes, { fields: [classNotifications.classId], references: [classes.id] }),
  teacher: one(teachers, { fields: [classNotifications.teacherId], references: [teachers.id] }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  transactions: many(transactions),
  budgets: many(budgets),
  customCategories: many(categories),
  linkedCards: many(linkedCards),
  documentUploads: many(documentUploads),
  savingsGoals: many(savingsGoals),
  billReminders: many(billReminders),
  portfolioHoldings: many(portfolioHoldings),
  portfolioTransactions: many(portfolioTransactions),
  learningProgress: many(userLearningProgress),
  virtualBalance: one(userVirtualBalance),
  examPapers: many(examPapers),
  gameSessions: many(gameSessions),
  xp: one(userXp),
  badges: many(userBadges),
}));

export * from "./models/chat";

// === BASE SCHEMAS ===

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertBudgetSchema = createInsertSchema(budgets).omit({ id: true, createdAt: true });
export const insertLinkedCardSchema = createInsertSchema(linkedCards).omit({ id: true, createdAt: true });
export const insertDocumentUploadSchema = createInsertSchema(documentUploads).omit({ id: true, createdAt: true });
export const insertSavingsGoalSchema = createInsertSchema(savingsGoals).omit({ id: true, createdAt: true });
export const insertBillReminderSchema = createInsertSchema(billReminders).omit({ id: true, createdAt: true });
export const insertSimulatedStockSchema = createInsertSchema(simulatedStocks).omit({ id: true });
export const insertPortfolioHoldingSchema = createInsertSchema(portfolioHoldings).omit({ id: true, purchasedAt: true });
export const insertPortfolioTransactionSchema = createInsertSchema(portfolioTransactions).omit({ id: true, executedAt: true });
export const insertLearningModuleSchema = createInsertSchema(learningModules).omit({ id: true });
export const insertUserLearningProgressSchema = createInsertSchema(userLearningProgress).omit({ id: true, completedAt: true });
export const insertSchoolSchema = createInsertSchema(schools).omit({ id: true, createdAt: true });
export const insertSponsorSchema = createInsertSchema(sponsors).omit({ id: true, createdAt: true });
export const insertTeacherSchema = createInsertSchema(teachers).omit({ id: true, createdAt: true, isVerified: true });
export const insertClassSchema = createInsertSchema(classes).omit({ id: true, createdAt: true, code: true });
export const insertClassEnrollmentSchema = createInsertSchema(classEnrollments).omit({ id: true, joinedAt: true });
export const insertChallengeSchema = createInsertSchema(challenges).omit({ id: true, createdAt: true });
export const insertClassNotificationSchema = createInsertSchema(classNotifications).omit({ id: true, createdAt: true });
export const insertExamPaperSchema = createInsertSchema(examPapers).omit({ id: true, createdAt: true, questionCount: true, status: true });
export const insertExtractedQuestionSchema = createInsertSchema(extractedQuestions).omit({ id: true });
export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({ id: true, completedAt: true });
export const insertUserXpSchema = createInsertSchema(userXp).omit({ id: true });
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, earnedAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type LinkedCard = typeof linkedCards.$inferSelect;
export type DocumentUpload = typeof documentUploads.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type BillReminder = typeof billReminders.$inferSelect;
export type SimulatedStock = typeof simulatedStocks.$inferSelect;
export type PortfolioHolding = typeof portfolioHoldings.$inferSelect;
export type PortfolioTransaction = typeof portfolioTransactions.$inferSelect;
export type LearningModule = typeof learningModules.$inferSelect;
export type UserLearningProgress = typeof userLearningProgress.$inferSelect;
export type UserVirtualBalance = typeof userVirtualBalance.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type InsertLinkedCard = z.infer<typeof insertLinkedCardSchema>;
export type InsertDocumentUpload = z.infer<typeof insertDocumentUploadSchema>;
export type InsertSavingsGoal = z.infer<typeof insertSavingsGoalSchema>;
export type InsertBillReminder = z.infer<typeof insertBillReminderSchema>;
export type InsertSimulatedStock = z.infer<typeof insertSimulatedStockSchema>;
export type InsertPortfolioHolding = z.infer<typeof insertPortfolioHoldingSchema>;
export type InsertPortfolioTransaction = z.infer<typeof insertPortfolioTransactionSchema>;
export type InsertLearningModule = z.infer<typeof insertLearningModuleSchema>;
export type ExamPaper = typeof examPapers.$inferSelect;
export type ExtractedQuestion = typeof extractedQuestions.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type UserXp = typeof userXp.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertExamPaper = z.infer<typeof insertExamPaperSchema>;
export type InsertExtractedQuestion = z.infer<typeof insertExtractedQuestionSchema>;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type Sponsor = typeof sponsors.$inferSelect;
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type Teacher = typeof teachers.$inferSelect;
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type ClassEnrollment = typeof classEnrollments.$inferSelect;
export type InsertClassEnrollment = z.infer<typeof insertClassEnrollmentSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type ClassNotification = typeof classNotifications.$inferSelect;
export type InsertClassNotification = z.infer<typeof insertClassNotificationSchema>;

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
