// QA load-test seed: creates an isolated class of 30 students under the demo
// teacher with varied savings goals, XP, and lesson progress. Idempotent.
// All rows are prefixed/coded for easy removal via scripts/qa-cleanup.ts.
import { db, pool } from "../server/db";
import {
  teachers, classes, classEnrollments, savingsGoals, userXp,
  userLearningProgress, learningModules,
} from "../shared/schema";
import { users } from "../shared/models/auth";
import { eq, and } from "drizzle-orm";

const QA_CLASS_CODE = "QALOAD";
const N = 30;
const avatars = ["star", "dolphin", "rocket", "lion", "turtle", "owl", "fox", "panda"];

async function main() {
  const [teacher] = await db.select().from(teachers).where(eq(teachers.email, "demo@finsightlite.com"));
  if (!teacher) throw new Error("Demo teacher missing. Call POST /api/demo/setup first.");

  let [cls] = await db.select().from(classes).where(eq(classes.code, QA_CLASS_CODE));
  if (!cls) {
    [cls] = await db.insert(classes).values({
      teacherId: teacher.id,
      name: "QA Load Test (30 students)",
      subject: "Financial Literacy",
      code: QA_CLASS_CODE,
      sponsorName: "QA Harness",
    }).returning();
  }

  const mods = await db.select({ id: learningModules.id }).from(learningModules);
  const moduleIds = mods.map((m) => m.id);

  for (let i = 1; i <= N; i++) {
    const idx = String(i).padStart(3, "0");
    const id = `qa-load-${idx}`;
    const username = `QAStudent${idx}`;

    const [existing] = await db.select().from(users).where(eq(users.id, id));
    if (!existing) {
      await db.insert(users).values({
        id,
        username,
        avatar: avatars[i % avatars.length],
        firstName: `QA${idx}`,
        lastName: "Student",
      });
    }

    const [enr] = await db.select().from(classEnrollments)
      .where(and(eq(classEnrollments.classId, cls.id), eq(classEnrollments.studentId, id)));
    if (!enr) await db.insert(classEnrollments).values({ classId: cls.id, studentId: id });

    const [xp] = await db.select().from(userXp).where(eq(userXp.userId, id));
    if (!xp) {
      await db.insert(userXp).values({
        userId: id,
        totalXp: (i * 37) % 600,
        level: 1 + (i % 6),
        currentStreak: i % 8,
        longestStreak: (i % 8) + 2,
      });
    }

    if (moduleIds.length) {
      const numDone = i % (moduleIds.length + 1);
      for (let m = 0; m < numDone; m++) {
        const moduleId = moduleIds[m];
        const [p] = await db.select().from(userLearningProgress)
          .where(and(eq(userLearningProgress.userId, id), eq(userLearningProgress.moduleId, moduleId)));
        if (!p) {
          await db.insert(userLearningProgress).values({ userId: id, moduleId, completed: true, completedAt: new Date() });
        }
      }
    }

    const existingGoals = await db.select().from(savingsGoals).where(eq(savingsGoals.userId, id));
    if (existingGoals.length === 0) {
      const target = 100 + i * 10;
      const pat = i % 5;
      const goals: any[] = [];
      if (pat === 0) {
        goals.push({ userId: id, name: "New Bicycle", targetAmount: String(target), currentAmount: String(target), currency: "BSD", icon: "bike", color: "teal" });
      } else if (pat === 1) {
        goals.push({ userId: id, name: "School Trip", targetAmount: String(target), currentAmount: String(Math.round(target * 0.75)), currency: "BSD", icon: "plane", color: "coral" });
      } else if (pat === 2) {
        goals.push({ userId: id, name: "New Phone", targetAmount: String(target), currentAmount: String(Math.round(target * 0.4)), currency: "BSD", icon: "phone", color: "blue" });
      } else if (pat === 3) {
        goals.push({ userId: id, name: "Sneakers", targetAmount: String(target), currentAmount: "0", currency: "BSD", icon: "shoe", color: "amber" });
      } else {
        goals.push({ userId: id, name: "Laptop", targetAmount: String(target), currentAmount: String(Math.round(target * 0.6)), currency: "BSD", icon: "laptop", color: "teal" });
        goals.push({ userId: id, name: "Books Fund", targetAmount: "50", currentAmount: "50", currency: "BSD", icon: "book", color: "coral" });
      }
      await db.insert(savingsGoals).values(goals);
    }
  }

  const enrolled = await db.select().from(classEnrollments).where(eq(classEnrollments.classId, cls.id));
  console.log(JSON.stringify({
    ok: true, classId: cls.id, code: cls.code, name: cls.name,
    teacherId: teacher.id, enrolled: enrolled.length, modulesAvailable: moduleIds.length,
  }, null, 2));
  await pool.end();
}

main().catch((e) => { console.error("SEED FAILED:", e); process.exit(1); });
