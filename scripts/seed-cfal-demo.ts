// CFAL demo seed: creates one teacher, one class, six students with Caribbean
// teen names, realistic XP/levels/streaks, lesson progress, and Investment
// Simulator activity using real BISX tickers. Idempotent.
// Run: npx tsx scripts/seed-cfal-demo.ts
import { db, pool } from "../server/db";
import {
  teachers, classes, classEnrollments, userXp,
  userLearningProgress, learningModules,
  portfolioHoldings, portfolioTransactions, simulatedStocks,
} from "../shared/schema";
import { users } from "../shared/models/auth";
import { eq, and, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

const TEACHER_EMAIL = "ms.haynes.cfal@demo.finsightlite.com";
const TEACHER_PASSWORD = "CFALdemo2026!";
const CLASS_CODE = "CFAL01";

const STUDENTS = [
  { id: "cfal-demo-001", firstName: "Zara",    lastName: "Thompson",  username: "Zara_CFAL",    avatar: "star",      xp: 520, level: 5, streak: 9,  lessons: 5 },
  { id: "cfal-demo-002", firstName: "Malik",   lastName: "Josephs",   username: "Malik_CFAL",   avatar: "rocket",    xp: 390, level: 4, streak: 6,  lessons: 4 },
  { id: "cfal-demo-003", firstName: "Kezia",   lastName: "Alexander", username: "Kezia_CFAL",   avatar: "dolphin",   xp: 260, level: 3, streak: 4,  lessons: 3 },
  { id: "cfal-demo-004", firstName: "Jaylen",  lastName: "Charles",   username: "Jaylen_CFAL",  avatar: "lion",      xp: 175, level: 2, streak: 2,  lessons: 2 },
  { id: "cfal-demo-005", firstName: "Brianna", lastName: "Emmanuel",  username: "Brianna_CFAL", avatar: "butterfly", xp: 480, level: 5, streak: 11, lessons: 5 },
  { id: "cfal-demo-006", firstName: "Sasha",   lastName: "Husbands",  username: "Sasha_CFAL",   avatar: "turtle",    xp: 310, level: 3, streak: 3,  lessons: 3 },
];

// Real Caribbean investment simulator tickers (Bahamas + Barbados region):
// 0=CBL-BS (Commonwealth Bank, BSD 8.25)
// 1=FCL-BS (Focol Holdings, BSD 3.80)
// 2=BTC-BS (Bahamas Telecom, BSD 5.50)
// 3=CAB-BS (Cable Bahamas, BSD 4.10)
// 4=BGRS-5Y (Bahamas Gov Bond 5yr, BSD 100.00)
// 5=SFC-BB (Sagicor Financial Barbados, BBD 4.50)
const BISX_TICKERS = ["CBL-BS", "FCL-BS", "BTC-BS", "CAB-BS", "BGRS-5Y", "SFC-BB"];

// Investment allocations per student: [tickerIdx, qty, pricePerUnit]
const TRADES: [number, number, number][][] = [
  [[0, 15, 8.25], [1, 8, 3.80], [2, 5, 5.50]],      // Zara
  [[0, 10, 8.25], [3, 12, 4.10], [4, 2, 100.00]],    // Malik (2 gov bonds)
  [[1, 6, 3.80],  [5, 4, 4.50]],                      // Kezia
  [[0, 5, 8.25],  [2, 3, 5.50]],                      // Jaylen
  [[1, 20, 3.80], [2, 8, 5.50], [4, 1, 100.00]],     // Brianna (1 gov bond)
  [[3, 15, 4.10], [5, 7, 4.50], [0, 6, 8.25]],       // Sasha
];

async function main() {
  console.log("Seeding CFAL demo data...");

  // 1. Teacher
  let [teacher] = await db.select().from(teachers).where(eq(teachers.email, TEACHER_EMAIL));
  if (!teacher) {
    const hash = await bcrypt.hash(TEACHER_PASSWORD, 10);
    const [t] = await db.insert(teachers).values({
      firstName: "Denise",
      lastName: "Haynes",
      email: TEACHER_EMAIL,
      passwordHash: hash,
      schoolName: "CFAL Junior Investor Prep (Demo)",
    }).returning();
    if (!t) throw new Error("SEED FAILED: could not create teacher row");
    teacher = t;
  }
  console.log(`Teacher: ${teacher.firstName} ${teacher.lastName} (id=${teacher.id}, email=${teacher.email})`);

  // 2. Class
  let [cls] = await db.select().from(classes).where(eq(classes.code, CLASS_CODE));
  if (!cls) {
    const [c] = await db.insert(classes).values({
      teacherId: teacher.id,
      name: "Grade 10 Financial Literacy, Junior Investor Prep",
      subject: "Financial Literacy",
      code: CLASS_CODE,
    }).returning();
    if (!c) throw new Error("SEED FAILED: could not create class row");
    cls = c;
  }
  console.log(`Class: ${cls.name} (code=${cls.code}, id=${cls.id})`);

  // 3. Resolve stock IDs for BISX tickers
  const stocks = await db.select({ id: simulatedStocks.id, ticker: simulatedStocks.ticker })
    .from(simulatedStocks)
    .where(inArray(simulatedStocks.ticker, BISX_TICKERS));
  const stockMap = new Map(stocks.map(s => [s.ticker, s.id]));
  console.log(`Resolved ${stockMap.size} / ${BISX_TICKERS.length} BISX tickers`);

  // 4. Learning modules for progress
  const mods = await db.select({ id: learningModules.id }).from(learningModules);
  const moduleIds = mods.map(m => m.id);

  // 5. Students
  for (let i = 0; i < STUDENTS.length; i++) {
    const s = STUDENTS[i];

    // User row
    const [existing] = await db.select().from(users).where(eq(users.id, s.id));
    if (!existing) {
      const [u] = await db.insert(users).values({
        id: s.id, firstName: s.firstName, lastName: s.lastName,
        username: s.username, avatar: s.avatar,
      }).returning();
      if (!u) throw new Error(`SEED FAILED: could not create user row for ${s.username}`);
    }

    // Class enrollment
    const [enr] = await db.select().from(classEnrollments)
      .where(and(eq(classEnrollments.classId, cls.id), eq(classEnrollments.studentId, s.id)));
    if (!enr) {
      const [e] = await db.insert(classEnrollments).values({ classId: cls.id, studentId: s.id }).returning();
      if (!e) throw new Error(`SEED FAILED: could not enroll ${s.username}`);
    }

    // XP / level / streak
    const [xpRow] = await db.select().from(userXp).where(eq(userXp.userId, s.id));
    if (!xpRow) {
      const [x] = await db.insert(userXp).values({
        userId: s.id, totalXp: s.xp, level: s.level,
        currentStreak: s.streak, longestStreak: s.streak + 2,
      }).returning();
      if (!x) throw new Error(`SEED FAILED: could not insert XP for ${s.username}`);
    }

    // Lesson progress
    const lessonsToMark = moduleIds.slice(0, s.lessons);
    for (const moduleId of lessonsToMark) {
      const [p] = await db.select().from(userLearningProgress)
        .where(and(eq(userLearningProgress.userId, s.id), eq(userLearningProgress.moduleId, moduleId)));
      if (!p) {
        await db.insert(userLearningProgress).values({ userId: s.id, moduleId, completed: true, completedAt: new Date() });
      }
    }

    // Portfolio: holdings + transactions
    const trades = TRADES[i] ?? [];
    for (const [tickerIdx, qty, price] of trades) {
      const ticker = BISX_TICKERS[tickerIdx];
      const stockId = stockMap.get(ticker);
      if (!stockId) {
        console.warn(`  WARN: ticker ${ticker} not found in simulatedStocks, skipping`);
        continue;
      }
      const [holding] = await db.select().from(portfolioHoldings)
        .where(and(eq(portfolioHoldings.userId, s.id), eq(portfolioHoldings.stockId, stockId)));
      if (!holding) {
        const [h] = await db.insert(portfolioHoldings).values({
          userId: s.id, stockId, quantity: qty,
          avgPurchasePrice: String(price),
        }).returning();
        if (!h) throw new Error(`SEED FAILED: could not insert holding for ${s.username} / ${ticker}`);
        await db.insert(portfolioTransactions).values({
          userId: s.id, stockId, type: "buy",
          quantity: qty, pricePerUnit: String(price), currency: "BSD",
        });
      }
    }

    console.log(`  ${s.firstName} ${s.lastName}: xp=${s.xp} level=${s.level} streak=${s.streak} lessons=${s.lessons} trades=${trades.length}`);
  }

  const enrolled = await db.select().from(classEnrollments).where(eq(classEnrollments.classId, cls.id));
  console.log(JSON.stringify({
    ok: true,
    classId: cls.id,
    classCode: cls.code,
    className: cls.name,
    teacherId: teacher.id,
    teacherEmail: teacher.email,
    teacherPassword: TEACHER_PASSWORD,
    enrolled: enrolled.length,
    bisx_tickers_resolved: stockMap.size,
  }, null, 2));

  await pool.end();
}

main().catch(e => { console.error("SEED FAILED:", e); process.exit(1); });
