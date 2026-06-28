// QA arrange step: links the demo teacher (and its 30-student QALOAD class) to a
// real org+env so org-admin management can be tested at realistic volume, and
// creates a second QA teacher for class-reassignment testing. Reverted by qa-cleanup.ts.
import { db, pool } from "../server/db";
import { teachers } from "../shared/schema";
import { eq } from "drizzle-orm";

const ORG = "4306431e-9987-41d9-88f7-f366bb450ffc";
const ENV = "20cbde98-6bf1-4de9-b69d-eddea10cdb46";

async function main() {
  await db.update(teachers).set({ orgId: ORG, envId: ENV }).where(eq(teachers.email, "demo@finsightlite.com"));
  const [t1] = await db.select().from(teachers).where(eq(teachers.email, "demo@finsightlite.com"));

  let [t2] = await db.select().from(teachers).where(eq(teachers.email, "qa-teacher-2@finsight-qa.local"));
  if (!t2) {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("qa-temp-1234", 10);
    [t2] = await db.insert(teachers).values({
      firstName: "QA", lastName: "Teacher2", email: "qa-teacher-2@finsight-qa.local",
      passwordHash: hash, schoolName: "QA School", orgId: ORG, envId: ENV, isVerified: true,
    }).returning();
  } else {
    await db.update(teachers).set({ orgId: ORG, envId: ENV }).where(eq(teachers.id, t2.id));
  }

  console.log(JSON.stringify({ ok: true, org: ORG, env: ENV, teacher1Id: t1.id, teacher2Id: t2.id, qaClassCode: "QALOAD" }, null, 2));
  await pool.end();
}

main().catch((e) => { console.error("ORG SETUP FAILED:", e); process.exit(1); });
