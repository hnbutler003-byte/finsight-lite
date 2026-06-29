import { db } from "../server/db";
import {
  users, classEnrollments, userXp, userLearningProgress,
  gameSessions, savingsGoals, classes,
} from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { enrollStudentInOrg } from "../server/supabase";

const DEMO_ORG_ID = "e8401186-bb8e-4456-b030-a55de5a6960f";
const DEMO_ENV_ID = "c14140df-2f66-4cbe-b075-dbcc3e50bca4";
const CLASS_A_CODE = "DEMO-CLS-A";

const FIRST_NAMES = [
  "Brianna","Chevelle","Dontae","Erica","Fabion","Gizel","Hakeem","Isha",
  "Jabari","Kadesha","Lennox","Maia","Nolan","Omari","Portia","Quinton",
  "Renee","Steven","Tania","Ulric","Vashti","Winston","Xara","Yusuf",
  "Zinnia","Akeno","Bria","Cory","Dionne","Errol",
];

async function main() {
  const [cls] = await db.select().from(classes).where(eq(classes.code, CLASS_A_CODE));
  if (!cls) { console.error("Class A not found"); process.exit(1); }
  const classId = cls.id;
  console.log(`Class A id=${classId} teacher=${cls.teacherId}`);

  const existing = await db.select().from(classEnrollments).where(eq(classEnrollments.classId, classId));
  const existingIds = new Set(existing.map(e => e.studentId));
  console.log(`Already enrolled: ${existingIds.size}`);

  const needed = 30 - existingIds.size;
  if (needed <= 0) { console.log("Already have 30+ students, nothing to do."); process.exit(0); }
  console.log(`Adding ${needed} students...`);

  const xpVariants = [
    { xp: 520, level: 5, streak: 9,  lessons: [1,2,3,4,5,6], correct: 9, total: 10 },
    { xp: 380, level: 4, streak: 5,  lessons: [1,2,3,4,5],   correct: 8, total: 10 },
    { xp: 210, level: 3, streak: 2,  lessons: [1,2,3],       correct: 6, total: 10 },
    { xp: 460, level: 4, streak: 7,  lessons: [1,2,3,4,5],   correct: 8, total: 10 },
    { xp: 140, level: 2, streak: 1,  lessons: [1,2],         correct: 5, total: 10 },
    { xp: 310, level: 3, streak: 4,  lessons: [1,2,3,4],     correct: 7, total: 10 },
    { xp: 590, level: 5, streak: 12, lessons: [1,2,3,4,5,6], correct: 9, total: 10 },
    { xp: 270, level: 3, streak: 3,  lessons: [1,2,3,4],     correct: 6, total: 10 },
    { xp: 90,  level: 1, streak: 0,  lessons: [1],           correct: 4, total: 10 },
    { xp: 430, level: 4, streak: 6,  lessons: [1,2,3,4,5],   correct: 8, total: 10 },
  ];
  const avatars = ["star","dolphin","rocket","lion","owl","turtle","parrot","crab","penguin","tiger"];

  let added = 0;
  for (let i = 0; i < needed && i < FIRST_NAMES.length; i++) {
    const idx = i + 9;
    const id = `demo-test-s${String(idx).padStart(3, "0")}`;
    if (existingIds.has(id)) { console.log(`  skip ${id} (already enrolled)`); continue; }

    const firstName = FIRST_NAMES[i];
    const username = `${firstName}_Demo`;
    const prog = xpVariants[i % xpVariants.length];
    const avatar = avatars[i % avatars.length];

    const [existing] = await db.select().from(users).where(eq(users.id, id));
    if (!existing) {
      await db.insert(users).values({ id, firstName, username, avatar } as any);
    }

    const [alreadyEnrolled] = await db.select().from(classEnrollments)
      .where(and(eq(classEnrollments.classId, classId), eq(classEnrollments.studentId, id)));
    if (!alreadyEnrolled) {
      await db.insert(classEnrollments).values({ classId, studentId: id });
    }

    const orgRes = await enrollStudentInOrg(DEMO_ORG_ID, DEMO_ENV_ID, id);
    if (!orgRes.success) console.warn(`  org enroll warn for ${id}:`, orgRes);

    const [alreadyXp] = await db.select().from(userXp).where(eq(userXp.userId, id));
    if (!alreadyXp) {
      await db.insert(userXp).values({
        userId: id, totalXp: prog.xp, level: prog.level,
        currentStreak: prog.streak, longestStreak: prog.streak,
      });
    }

    for (const moduleId of prog.lessons) {
      const [alreadyLesson] = await db.select().from(userLearningProgress)
        .where(and(eq(userLearningProgress.userId, id), eq(userLearningProgress.moduleId, moduleId)));
      if (!alreadyLesson) {
        await db.insert(userLearningProgress).values({ userId: id, moduleId, completed: true });
      }
    }

    const [alreadySession] = await db.select().from(gameSessions).where(eq(gameSessions.userId, id));
    if (!alreadySession) {
      await db.insert(gameSessions).values({
        userId: id, mode: "quiz", score: prog.xp,
        correctAnswers: prog.correct, totalQuestions: prog.total,
      });
    }

    if (i < 5) {
      const [alreadyGoal] = await db.select().from(savingsGoals).where(eq(savingsGoals.userId, id));
      if (!alreadyGoal) {
        await db.insert(savingsGoals).values([
          { userId: id, name: "School Trip to Nassau", targetAmount: "150.00", currentAmount: String((prog.xp * 0.12).toFixed(2)), currency: "BSD", deadline: new Date(Date.now() + 60 * 86400000), icon: "✈️", color: "#8B5CF6" },
          { userId: id, name: "New Laptop Fund",       targetAmount: "500.00", currentAmount: String((prog.xp * 0.08).toFixed(2)), currency: "BSD", deadline: new Date(Date.now() + 180 * 86400000), icon: "💻", color: "#0EA5E9" },
        ]);
      }
    }

    console.log(`  + ${id} (${firstName}) xp=${prog.xp}`);
    added++;
  }

  const final = await db.select().from(classEnrollments).where(eq(classEnrollments.classId, classId));
  console.log(`Done. Class A now has ${final.length} enrolled students. Added ${added}.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
