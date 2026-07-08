// Idempotent seeding for the public demo Org Admin view (/demo).
// Ensures the demo-test-org always has realistic, non-empty data for the
// dashboard (AI usage, learning metrics, student table), branding, and
// lessons pages. Only inserts missing data / fills NULLs for demo-test-*
// students; it never overwrites real values.
import { and, count, eq, gte, isNull, like } from "drizzle-orm";
import { db } from "./db";
import { aiUsageEvents, learningModules, userLearningProgress, userXp } from "@shared/schema";
import {
  getLessonsByOrg,
  createLessonPlan,
  createLessonQuizQuestion,
  getOrganization,
  updateOrganization,
  invalidateOrganizationCache,
} from "./supabase";
import type { AiKind } from "./aiUsage";

const DAY_MS = 24 * 60 * 60 * 1000;

async function ensureDemoLessons(orgId: string, envId: string): Promise<void> {
  const existing = await getLessonsByOrg(orgId);
  const titles = new Set(existing.map(l => l.title));

  if (!titles.has("Budgeting Basics for Island Life")) {
    const lesson = await createLessonPlan({
      org_id: orgId,
      env_id: envId,
      title: "Budgeting Basics for Island Life",
      instructor: "Ms. Rolle",
      subject: "Financial Literacy",
      grade_level: "Grades 7-9",
      topic: "Budgeting",
      duration: "40 minutes",
      video_url: null,
      objectives: [
        "Understand what a budget is and why it matters",
        "Split income into needs, wants, and savings",
        "Build a simple weekly budget with Caribbean prices",
      ],
      content_sections: [
        {
          type: "text",
          heading: "What is a budget?",
          body: "A budget is a plan for your money. It helps you decide ahead of time how much to spend on needs, wants, and savings so you never run out before the week ends.",
          examples: ["Lunch money plan for the school week", "Saving for Junkanoo costume materials"],
        },
        {
          type: "text",
          heading: "Needs vs wants",
          body: "Needs are things you must have, like bus fare and lunch. Wants are nice extras, like snacks or game credits. A good starting split is 50% needs, 30% wants, and 20% savings.",
          examples: ["Bus fare to school is a need", "A patty from the corner shop after school is a want"],
        },
      ],
      is_published: true,
      created_by_teacher_id: null,
      class_id: null,
    });
    if (lesson) {
      await createLessonQuizQuestion({
        lesson_id: lesson.id,
        question: "Which of these is a NEED?",
        option_a: "Bus fare to school",
        option_b: "Game credits",
        option_c: "A new phone case",
        option_d: "Extra snacks",
        correct_answer: "A",
        order_index: 0,
      });
      await createLessonQuizQuestion({
        lesson_id: lesson.id,
        question: "In a 50/30/20 budget, the 20% is usually for what?",
        option_a: "Wants",
        option_b: "Savings",
        option_c: "Needs",
        option_d: "Gifts",
        correct_answer: "B",
        order_index: 1,
      });
    }
  }

  if (!titles.has("Understanding Bank Accounts in The Bahamas")) {
    await createLessonPlan({
      org_id: orgId,
      env_id: envId,
      title: "Understanding Bank Accounts in The Bahamas",
      instructor: "Mr. Ferguson",
      subject: "Financial Literacy",
      grade_level: "Grades 10-12",
      topic: "Banking",
      duration: "35 minutes",
      video_url: null,
      objectives: [
        "Know the difference between savings and chequing accounts",
        "Understand interest and how banks pay you to save",
        "Learn what you need to open a junior account",
      ],
      content_sections: [
        {
          type: "text",
          heading: "Types of accounts",
          body: "A savings account pays you interest to keep money in the bank. A chequing account is for everyday spending with a debit card. Most students start with a junior savings account.",
          examples: ["Junior savings accounts at local Bahamian banks", "Interest earned on birthday money saved for a year"],
        },
        {
          type: "text",
          heading: "How interest works",
          body: "Interest is money the bank pays you for saving. If your account pays 2% per year and you save $100, you earn $2 by the end of the year without doing anything.",
          examples: ["$100 saved at 2% becomes $102 in a year"],
        },
      ],
      is_published: true,
      created_by_teacher_id: null,
      class_id: null,
    });
  }
}

async function ensureDemoAiUsage(orgId: string, envId: string): Promise<void> {
  const [row] = await db
    .select({ n: count() })
    .from(aiUsageEvents)
    .where(eq(aiUsageEvents.orgId, orgId));
  const hasHistory = (row?.n ?? 0) > 0;

  // The "AI usage today" panel must never be empty: check today's rows separately,
  // so they get topped up on every demo login even after the first-day seed.
  const startOfToday = new Date(new Date().setUTCHours(0, 0, 0, 0));
  const [todayRow] = await db
    .select({ n: count() })
    .from(aiUsageEvents)
    .where(and(eq(aiUsageEvents.orgId, orgId), gte(aiUsageEvents.createdAt, startOfToday)));
  const hasToday = (todayRow?.n ?? 0) > 0;

  if (hasHistory && hasToday) return;

  const kinds: AiKind[] = ["guide_chat", "tutor_explain", "ai_insights"];
  const models: Record<AiKind, string> = {
    guide_chat: "claude-sonnet-4-6",
    tutor_explain: "claude-sonnet-4-6",
    ai_insights: "gpt-4o-mini",
  };
  const studentId = (i: number) => `demo-test-s${String((i % 10) + 1).padStart(3, "0")}`;

  const rows: (typeof aiUsageEvents.$inferInsert)[] = [];
  const now = Date.now();

  // Spread ~3 events per day over the past 27 days (guide_chat weighted heaviest)
  for (let day = 27; day >= 1 && !hasHistory; day--) {
    const perDay = 2 + (day % 3); // 2-4 events per day
    for (let j = 0; j < perDay; j++) {
      const kind = kinds[(day + j) % 2 === 0 ? 0 : (day + j) % 5 === 0 ? 2 : 1];
      rows.push({
        userId: studentId(day * 3 + j),
        orgId,
        envId,
        kind,
        model: models[kind],
        tokensIn: 350 + ((day * 37 + j * 91) % 500),
        tokensOut: 180 + ((day * 53 + j * 67) % 320),
        cached: (day + j) % 7 === 0,
        createdAt: new Date(now - day * DAY_MS + (j * 3 + 9) * 60 * 60 * 1000),
      });
    }
  }

  // Guaranteed activity for the "today" panel
  const todayPlan: { kind: AiKind; hoursAgo: number }[] = [
    { kind: "guide_chat", hoursAgo: 1 },
    { kind: "guide_chat", hoursAgo: 2 },
    { kind: "guide_chat", hoursAgo: 3 },
    { kind: "guide_chat", hoursAgo: 5 },
    { kind: "tutor_explain", hoursAgo: 2 },
    { kind: "tutor_explain", hoursAgo: 4 },
    { kind: "tutor_explain", hoursAgo: 6 },
    { kind: "ai_insights", hoursAgo: 3 },
  ];
  if (hasToday) todayPlan.length = 0;
  todayPlan.forEach((p, i) => {
    const createdAt = new Date(now - p.hoursAgo * 60 * 60 * 1000);
    // Clamp to today (UTC): if subtracting hours crossed midnight, pin to start of today + 1h
    rows.push({
      userId: studentId(i),
      orgId,
      envId,
      kind: p.kind,
      model: models[p.kind],
      tokensIn: 400 + i * 45,
      tokensOut: 210 + i * 30,
      cached: false,
      createdAt: createdAt < startOfToday ? new Date(startOfToday.getTime() + 60 * 60 * 1000) : createdAt,
    });
  });

  await db.insert(aiUsageEvents).values(rows);
}

async function ensureDemoStudentActivity(): Promise<void> {
  // Fill last_played_at ONLY where NULL, for demo-test students, so the
  // dashboard's "active students" metric and student-table "last active"
  // column are populated. Never overwrites a real timestamp.
  const stale = await db
    .select({ userId: userXp.userId })
    .from(userXp)
    .where(and(like(userXp.userId, "demo-test-s%"), isNull(userXp.lastPlayedAt)));

  const now = Date.now();
  for (let i = 0; i < stale.length; i++) {
    const daysAgo = (i % 12) + (i % 3); // spread 0-13 days back
    await db
      .update(userXp)
      .set({ lastPlayedAt: new Date(now - daysAgo * DAY_MS - (i % 9) * 60 * 60 * 1000) })
      .where(and(eq(userXp.userId, stale[i].userId), isNull(userXp.lastPlayedAt)));
  }
}

async function ensureDemoLearningProgress(): Promise<void> {
  // Give demo-test students some completed core lessons so the dashboard's
  // lesson completion rate and student-table "lessons completed" are non-zero.
  const [existing] = await db
    .select({ n: count() })
    .from(userLearningProgress)
    .where(and(like(userLearningProgress.userId, "demo-test-s%"), eq(userLearningProgress.completed, true)));
  if ((existing?.n ?? 0) > 0) return;

  const modules = await db
    .select({ id: learningModules.id })
    .from(learningModules)
    .orderBy(learningModules.order)
    .limit(6);
  if (modules.length === 0) return;

  const students = await db
    .select({ userId: userXp.userId })
    .from(userXp)
    .where(like(userXp.userId, "demo-test-s%"));

  const now = Date.now();
  const rows: (typeof userLearningProgress.$inferInsert)[] = [];
  students.forEach((s, i) => {
    const completedCount = (i % modules.length) + 1; // 1..6 modules each
    for (let m = 0; m < completedCount; m++) {
      rows.push({
        userId: s.userId,
        moduleId: modules[m].id,
        completed: true,
        completedAt: new Date(now - ((i * 2 + m * 3) % 25) * DAY_MS),
      });
    }
  });
  if (rows.length > 0) await db.insert(userLearningProgress).values(rows);
}

async function ensureDemoBranding(orgId: string): Promise<void> {
  const org = await getOrganization(orgId);
  if (!org) return;
  const o = org as any;
  const allEmpty =
    !o.signature_left_name && !o.signature_left_role &&
    !o.signature_right_name && !o.signature_right_role;
  if (!allEmpty) return;
  await updateOrganization(orgId, {
    signature_left_name: "Lakeisha Deveaux",
    signature_left_role: "PROGRAMME DIRECTOR",
    signature_right_name: "Marcus Rolle",
    signature_right_role: "HEAD OF FINANCIAL EDUCATION",
  } as any);
  await invalidateOrganizationCache(orgId);
}

/**
 * Ensure the demo org has realistic data for the public read-only demo.
 * Throws on any database failure so callers surface a real error instead of
 * silently presenting an empty demo.
 */
export async function ensureDemoOrgData(orgId: string, envId: string): Promise<void> {
  await ensureDemoLessons(orgId, envId);
  await ensureDemoAiUsage(orgId, envId);
  await ensureDemoStudentActivity();
  await ensureDemoLearningProgress();
  await ensureDemoBranding(orgId);
}
