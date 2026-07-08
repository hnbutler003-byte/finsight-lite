// Syncs seeded lesson/learning content in the database from the source code
// definitions (the source of truth). Fixes drift such as stale em dashes that
// remained in DB rows after the code copy was cleaned, because seeding only
// inserts missing rows and never updates existing ones.
// Safe: updates rows in place (IDs preserved, student progress untouched).
// Never touches prices or user data.
// Run: npx tsx scripts/sync-content-from-code.ts
import { Pool } from "pg";
import { STATIC_LESSONS_DATA, STATIC_ORG_ID } from "../server/supabase";
import { DatabaseStorage } from "../server/storage";

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing SUPABASE_DATABASE_URL / DATABASE_URL");
  process.exit(1);
}
const pool = new Pool({ connectionString });

async function emDashCount(table: string): Promise<number> {
  const res = await pool.query(
    `SELECT count(*)::int AS c FROM ${table} WHERE ${table}::text LIKE '%' || chr(8212) || '%'`
  );
  return res.rows[0].c;
}

async function main() {
  let updatedLessons = 0;
  let updatedQuestions = 0;

  for (const lesson of STATIC_LESSONS_DATA) {
    const planRes = await pool.query(
      `UPDATE lesson_plans
         SET title = $1, duration = $2, objectives = $3, content_sections = $4::jsonb,
             instructor = $5, topic = $6, video_url = $7
       WHERE org_id = $8 AND subject = 'static' AND grade_level = $9
       RETURNING id`,
      [
        lesson.title,
        lesson.duration,
        lesson.objectives,
        JSON.stringify(lesson.content_sections),
        lesson.instructor,
        lesson.topic,
        lesson.video_url ?? null,
        STATIC_ORG_ID,
        lesson.grade_level,
      ]
    );
    if (planRes.rowCount !== 1) {
      throw new Error(
        `lesson_plans update for ${lesson.grade_level} matched ${planRes.rowCount} rows (expected 1). Aborting.`
      );
    }
    updatedLessons++;
    const lessonId = planRes.rows[0].id as string;

    for (const q of lesson.questions) {
      const qRes = await pool.query(
        `UPDATE lesson_quiz_questions
           SET question = $1, option_a = $2, option_b = $3, option_c = $4, option_d = $5, correct_answer = $6
         WHERE lesson_id = $7 AND order_index = $8`,
        [q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, lessonId, q.order_index]
      );
      if (qRes.rowCount !== 1) {
        throw new Error(
          `lesson_quiz_questions update for ${lesson.grade_level} q#${q.order_index} matched ${qRes.rowCount} rows (expected 1). Aborting.`
        );
      }
      updatedQuestions++;
    }
  }
  console.log(`Synced ${updatedLessons} static lessons and ${updatedQuestions} quiz questions from code.`);

  let updatedModules = 0;
  for (const mod of DatabaseStorage.LEARNING_MODULES_SEED) {
    const res = await pool.query(
      `UPDATE learning_modules
         SET title = $1, description = $2, content = $3, icon = $4, "order" = $5
       WHERE slug = $6`,
      [mod.title, mod.description, mod.content, mod.icon, mod.order, mod.slug]
    );
    if (res.rowCount !== 1) {
      throw new Error(`learning_modules update for slug ${mod.slug} matched ${res.rowCount} rows (expected 1). Aborting.`);
    }
    updatedModules++;
  }
  console.log(`Synced ${updatedModules} learning modules from code.`);

  let updatedStocks = 0;
  let insertedStocks = 0;
  for (const stock of DatabaseStorage.MARKET_DATA_SEED) {
    const res = await pool.query(
      `UPDATE simulated_stocks SET name = $1, description = $2 WHERE ticker = $3`,
      [stock.name, stock.description, stock.ticker]
    );
    if (res.rowCount === 1) {
      updatedStocks++;
    } else if (res.rowCount === 0) {
      const ins = await pool.query(
        `INSERT INTO simulated_stocks
           (name, ticker, type, description, current_price, currency, issuer, region, risk_level, annual_return_pct)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          stock.name, stock.ticker, stock.type, stock.description, stock.currentPrice,
          stock.currency, stock.issuer, stock.region, stock.riskLevel, stock.annualReturnPct,
        ]
      );
      if (ins.rowCount !== 1) {
        throw new Error(`simulated_stocks insert for ticker ${stock.ticker} failed. Aborting.`);
      }
      console.log(`Inserted missing stock ${stock.ticker} (${stock.name}).`);
      insertedStocks++;
    } else {
      throw new Error(`simulated_stocks update for ticker ${stock.ticker} matched ${res.rowCount} rows (expected 1). Aborting.`);
    }
  }
  console.log(`Synced ${updatedStocks} simulated stock names/descriptions and inserted ${insertedStocks} missing stocks from code (existing prices untouched).`);

  const tables = ["lesson_plans", "lesson_quiz_questions", "learning_modules", "simulated_stocks"];
  let remaining = 0;
  for (const t of tables) {
    const c = await emDashCount(t);
    console.log(`Em dash rows remaining in ${t}: ${c}`);
    remaining += c;
  }
  if (remaining > 0) {
    throw new Error(`${remaining} rows still contain em dashes after sync. Investigate.`);
  }
  console.log("All target tables are em dash free.");
}

main()
  .then(() => pool.end())
  .catch((e) => {
    console.error("[sync-content-from-code] FAILED:", e.message);
    pool.end();
    process.exit(1);
  });
