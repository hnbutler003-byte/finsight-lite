// Removes all QA test data created by scripts/qa-seed.ts and scripts/qa-org-setup.ts.
// Leaves the pre-existing org/env, demo teacher account, and learning modules intact;
// only the QA-created students/class/feedback are removed and the org links are reverted.
import { db, pool } from "../server/db";
import {
  classes, classEnrollments, savingsGoals, userXp, userLearningProgress,
  studentFeedback, teachers,
} from "../shared/schema";
import { users } from "../shared/models/auth";
import { eq, like } from "drizzle-orm";

const QA_CLASS_CODE = "QALOAD";
const DEMO_TEACHER_EMAIL = "demo@finsightlite.com";
const QA_TEACHER2_EMAIL = "qa-teacher-2@finsight-qa.local";

async function main() {
  const ids = (await db.select({ id: users.id }).from(users).where(like(users.id, "qa-load-%"))).map((u) => u.id);

  // Child rows first to satisfy FK constraints, then the users themselves.
  for (const id of ids) {
    await db.delete(studentFeedback).where(eq(studentFeedback.studentId, id));
    await db.delete(savingsGoals).where(eq(savingsGoals.userId, id));
    await db.delete(userLearningProgress).where(eq(userLearningProgress.userId, id));
    await db.delete(userXp).where(eq(userXp.userId, id));
    await db.delete(classEnrollments).where(eq(classEnrollments.studentId, id));
  }

  const [cls] = await db.select().from(classes).where(eq(classes.code, QA_CLASS_CODE));
  if (cls) {
    await db.delete(studentFeedback).where(eq(studentFeedback.classId, cls.id));
    await db.delete(classEnrollments).where(eq(classEnrollments.classId, cls.id));
    await db.delete(classes).where(eq(classes.id, cls.id));
  }

  for (const id of ids) {
    await db.delete(users).where(eq(users.id, id));
  }

  // Revert scripts/qa-org-setup.ts: unlink the demo teacher from the QA org/env
  // and remove the QA-only second teacher. The org/env itself pre-existed and is kept.
  await db.update(teachers).set({ orgId: null, envId: null }).where(eq(teachers.email, DEMO_TEACHER_EMAIL));
  const removedTeacher2 = await db.delete(teachers).where(eq(teachers.email, QA_TEACHER2_EMAIL)).returning({ id: teachers.id });

  console.log(JSON.stringify({
    ok: true,
    removedStudents: ids.length,
    removedClass: cls?.code ?? null,
    demoTeacherUnlinked: true,
    removedTeacher2: removedTeacher2.length,
  }, null, 2));
  await pool.end();
}

main().catch((e) => { console.error("CLEANUP FAILED:", e); process.exit(1); });
