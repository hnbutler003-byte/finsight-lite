import { db } from "../server/db";
import { orgAdmins } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const DEMO_ORG_ID = "e8401186-bb8e-4456-b030-a55de5a6960f";
const DEMO_ENV_ID = "c14140df-2f66-4cbe-b075-dbcc3e50bca4";
const EMAIL = "qa.admin@demo.finsightlite.com";
const PASSWORD = "QaDemo2025!";

async function main() {
  const existing = await db.select().from(orgAdmins).where(eq(orgAdmins.email, EMAIL));
  if (existing.length > 0) {
    console.log(`Org-admin already exists: id=${existing[0].id} email=${existing[0].email}`);
    process.exit(0);
  }
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [admin] = await db.insert(orgAdmins).values({
    firstName: "QA",
    lastName: "Admin",
    email: EMAIL,
    passwordHash,
    orgId: DEMO_ORG_ID,
    envId: DEMO_ENV_ID,
    role: "admin",
  }).returning();
  console.log(`Created org-admin: id=${admin.id} email=${admin.email} orgId=${admin.orgId}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
