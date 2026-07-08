import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
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
  previousPrice: numeric("previous_price", { precision: 10, scale: 2 }),
  priceChangePct: numeric("price_change_pct", { precision: 5, scale: 2 }).default("0"),
  lastPriceUpdateDate: text("last_price_update_date"),
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

// Reusable lesson content block types, shared between learning_modules
// (Investment Simulator) and lesson_plans (org-admin lessons). "type"
// defaults to "text" when absent so existing plain-text rows keep working.
export type ContentDiagram =
  | { kind: "bars"; items: { label: string; value: number; display?: string }[]; note?: string }
  | { kind: "steps"; items: { label: string; detail?: string }[]; note?: string }
  | { kind: "compare"; left: { title: string; points: string[] }; right: { title: string; points: string[] }; note?: string };

export type ContentSection = {
  type?: "text" | "video" | "diagram";
  heading: string;
  body: string;
  examples?: string[];
  video_url?: string;
  diagram?: ContentDiagram;
};

export const learningModules = pgTable("learning_modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  // New structured format. Nullable/empty on old rows; renderer falls back
  // to the plain `content` field when this is absent, so nothing breaks
  // mid-migration.
  contentSections: jsonb("content_sections").$type<ContentSection[]>(),
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
  passwordHash: text("password_hash"),
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

// === DELETION AUDIT LOG ===

export const deletionLog = pgTable("deletion_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  orgId: text("org_id"),
  deletedBy: text("deleted_by", { enum: ["student_self", "org_admin"] }).notNull(),
  adminActorId: integer("admin_actor_id"),
  deletedAt: timestamp("deleted_at").defaultNow().notNull(),
});
export const insertDeletionLogSchema = createInsertSchema(deletionLog).omit({ id: true });
export type DeletionLog = typeof deletionLog.$inferSelect;
export type InsertDeletionLog = z.infer<typeof insertDeletionLogSchema>;

// === STUDENT FEEDBACK TABLE ===

export const studentFeedback = pgTable("student_feedback", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id").notNull().references(() => users.id),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id),
  classId: integer("class_id").notNull().references(() => classes.id),
  orgId: text("org_id"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertStudentFeedbackSchema = createInsertSchema(studentFeedback).omit({ id: true, createdAt: true });
export type StudentFeedback = typeof studentFeedback.$inferSelect;
export type InsertStudentFeedback = z.infer<typeof insertStudentFeedbackSchema>;

// === ORGANIZATION ADMIN TABLE ===

export const orgAdmins = pgTable("org_admins", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  orgId: text("org_id").notNull(),
  envId: text("env_id").notNull(),
  role: text("role").default("admin").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrgAdminSchema = createInsertSchema(orgAdmins).omit({ id: true, createdAt: true });
export type OrgAdmin = typeof orgAdmins.$inferSelect;
export type InsertOrgAdmin = z.infer<typeof insertOrgAdminSchema>;

// === SHARED GAME/QUIZ SCORING TABLE ===
// Used platform-wide: lesson quizzes, Money Games, and leaderboard rollups.
// Not exclusive to any one feature, do not remove or gate behind a single feature flag.

export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
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

// === BACKGROUND JOBS ===

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").$type<Record<string, any>>().default({}).notNull(),
  result: jsonb("result").$type<Record<string, any>>(),
  status: text("status", { enum: ["queued", "processing", "completed", "failed"] }).default("queued").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  lastError: text("last_error"),
  ownerId: varchar("owner_id"),
  scheduledAt: timestamp("scheduled_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  statusScheduledIdx: index("idx_jobs_status_scheduled").on(t.status, t.scheduledAt),
  ownerCreatedIdx: index("idx_jobs_owner_created").on(t.ownerId, t.createdAt),
}));

export type Job = typeof jobs.$inferSelect;

// === AI USAGE & TUTOR CACHE ===

export const aiUsageEvents = pgTable("ai_usage_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  orgId: text("org_id"),
  envId: text("env_id"),
  kind: text("kind", { enum: ["guide_chat", "tutor_explain", "ai_insights"] }).notNull(),
  model: text("model"),
  tokensIn: integer("tokens_in").default(0).notNull(),
  tokensOut: integer("tokens_out").default(0).notNull(),
  cached: boolean("cached").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userKindIdx: index("idx_ai_usage_user_kind_created").on(t.userId, t.kind, t.createdAt),
  orgKindIdx: index("idx_ai_usage_org_kind_created").on(t.orgId, t.kind, t.createdAt),
}));

export type AiUsageEvent = typeof aiUsageEvents.$inferSelect;

// Per-org overrides for daily AI quotas. One row per org; missing = use defaults.
export const orgAiQuotas = pgTable("org_ai_quotas", {
  orgId: text("org_id").primaryKey(),
  guideChatPerUserDaily: integer("guide_chat_per_user_daily"),
  tutorExplainPerUserDaily: integer("tutor_explain_per_user_daily"),
  aiInsightsPerUserDaily: integer("ai_insights_per_user_daily"),
  guideChatPerOrgDaily: integer("guide_chat_per_org_daily"),
  tutorExplainPerOrgDaily: integer("tutor_explain_per_org_daily"),
  aiInsightsPerOrgDaily: integer("ai_insights_per_org_daily"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OrgAiQuota = typeof orgAiQuotas.$inferSelect;

export const tutorExplanations = pgTable("tutor_explanations", {
  id: serial("id").primaryKey(),
  questionHash: varchar("question_hash", { length: 64 }).notNull(),
  modelVersion: text("model_version").notNull(),
  explanation: text("explanation").notNull(),
  hits: integer("hits").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
}, (t) => ({
  hashModelIdx: uniqueIndex("idx_tutor_explanations_hash_model").on(t.questionHash, t.modelVersion),
}));

export type TutorExplanation = typeof tutorExplanations.$inferSelect;

// === AUDIT LOG ===

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorType: text("actor_type", { enum: ["admin", "org_admin", "teacher", "student", "system"] }).notNull(),
  actorId: text("actor_id"),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  orgId: text("org_id"),
  meta: jsonb("meta").$type<Record<string, any>>().default({}),
  ip: text("ip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  actorIdx: index("idx_audit_log_actor").on(t.actorType, t.actorId, t.createdAt),
  actionIdx: index("idx_audit_log_action").on(t.action, t.createdAt),
  createdIdx: index("idx_audit_log_created").on(t.createdAt),
}));

export type AuditLogEntry = typeof auditLog.$inferSelect;
export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, createdAt: true });
export type InsertAuditLogEntry = z.infer<typeof insertAuditLogSchema>;

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

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  user: one(users, { fields: [gameSessions.userId], references: [users.id] }),
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
export type GameSession = typeof gameSessions.$inferSelect;
export type UserXp = typeof userXp.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
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

// === EMAIL DELIVERY TABLES ===

export const emailContacts = pgTable("email_contacts", {
  id: serial("id").primaryKey(),
  userKind: text("user_kind", { enum: ["student", "teacher", "org_admin", "guardian"] }).notNull(),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  verified: boolean("verified").default(false).notNull(),
  weeklyDigest: boolean("weekly_digest").default(true).notNull(),
  classNotifications: boolean("class_notifications").default(true).notNull(),
  orgId: text("org_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  userIdx: uniqueIndex("uniq_email_contacts_user").on(t.userKind, t.userId),
  orgIdx: index("idx_email_contacts_org").on(t.orgId),
}));

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => emailContacts.id, { onDelete: "cascade" }),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailEvents = pgTable("email_events", {
  id: serial("id").primaryKey(),
  orgId: text("org_id"),
  userKind: text("user_kind"),
  userId: text("user_id"),
  kind: text("kind").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  status: text("status", { enum: ["queued", "sent", "delivered", "bounced", "complained", "opened", "failed"] }).notNull(),
  providerId: text("provider_id"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  orgCreatedIdx: index("idx_email_events_org_created").on(t.orgId, t.createdAt),
  providerIdx: index("idx_email_events_provider").on(t.providerId),
}));

export const weeklyDigestRuns = pgTable("weekly_digest_runs", {
  id: serial("id").primaryKey(),
  weekStart: text("week_start").notNull(),
  audience: text("audience", { enum: ["student", "teacher", "guardian"] }).notNull(),
  ranAt: timestamp("ran_at").defaultNow(),
}, (t) => ({
  weekAudienceIdx: uniqueIndex("uniq_weekly_digest_week_audience").on(t.weekStart, t.audience),
}));

// One row per calendar month, prevents the auto-scheduler from
// enqueueing more than one purge-ai-usage job per month.
export const aiUsagePurgeRuns = pgTable("ai_usage_purge_runs", {
  id: serial("id").primaryKey(),
  monthKey: text("month_key").notNull(), // "YYYY-MM"
  ranAt: timestamp("ran_at").defaultNow(),
}, (t) => ({
  monthKeyIdx: uniqueIndex("uniq_ai_usage_purge_month").on(t.monthKey),
}));

export type EmailContact = typeof emailContacts.$inferSelect;
export type InsertEmailContact = typeof emailContacts.$inferInsert;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailEvent = typeof emailEvents.$inferInsert;

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
