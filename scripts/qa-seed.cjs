// T002 QA seed: creates 1 teacher, 1 class, 30 students with varied goals/XP/progress
// Run: node scripts/qa-seed.js
// Idempotent: safe to run again (uses ON CONFLICT or existence checks)

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const QA_TEACHER_EMAIL = "qa-teacher@test.finsightlite.com";
const QA_TEACHER_PASS  = "QApass123!";
const QA_CLASS_CODE    = "QALAB1";
const STUDENT_COUNT    = 30;

const AVATARS = [
  "bear","cat","dog","fox","bunny","panda","lion",
  "tiger","frog","penguin","monkey","koala","duck","owl",
  "elephant","giraffe","horse","whale","dolphin","turtle",
  "parrot","crab","octopus","shark","deer","hedgehog",
  "squirrel","flamingo","raccoon","wolf",
];

const GOAL_NAMES = [
  "New Laptop","College Fund","Gaming Setup","Emergency Fund",
  "Vacation","New Phone","Bicycle","School Supplies",
];

async function main() {
  const client = await pool.connect();
  try {
    // 1. QA Teacher
    const pwHash = await bcrypt.hash(QA_TEACHER_PASS, 10);
    const teacherRes = await client.query(
      `INSERT INTO teachers (first_name, last_name, email, school_name, password_hash, created_at)
       VALUES ('QA', 'Teacher', $1, 'QA Test School', $2, NOW())
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id, email`,
      [QA_TEACHER_EMAIL, pwHash]
    );
    const teacherId = teacherRes.rows[0].id;
    console.log(`Teacher id=${teacherId}  ${teacherRes.rows[0].email}`);

    // 2. QA Class
    const classRes = await client.query(
      `INSERT INTO classes (name, subject, code, teacher_id, created_at)
       VALUES ('QA Load Test - 30 Students', 'Financial Literacy', $1, $2, NOW())
       ON CONFLICT (code) DO UPDATE SET teacher_id = EXCLUDED.teacher_id
       RETURNING id, code`,
      [QA_CLASS_CODE, teacherId]
    );
    const classId = classRes.rows[0].id;
    console.log(`Class   id=${classId}  code=${classRes.rows[0].code}`);

    // 3. 30 students
    const studentIds = [];
    for (let i = 1; i <= STUDENT_COUNT; i++) {
      const uid     = `qa-student-${String(i).padStart(3, "0")}`;
      const uname   = `qa_s${String(i).padStart(3, "0")}`;
      const fname   = `QAStudent`;
      const lname   = `${i}`;
      const avatar  = AVATARS[(i - 1) % AVATARS.length];
      await client.query(
        `INSERT INTO users (id, username, first_name, last_name, avatar, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name`,
        [uid, uname, fname, lname, avatar]
      );
      studentIds.push(uid);
    }
    console.log(`Students: ${studentIds.length} upserted`);

    // 4. Enroll (check existence first - no unique constraint on (class_id, student_id))
    let enrolled = 0;
    for (const sid of studentIds) {
      const existing = await client.query(
        `SELECT id FROM class_enrollments WHERE class_id=$1 AND student_id=$2 LIMIT 1`,
        [classId, sid]
      );
      if (existing.rowCount === 0) {
        await client.query(
          `INSERT INTO class_enrollments (class_id, student_id, joined_at)
           VALUES ($1, $2, NOW())`,
          [classId, sid]
        );
        enrolled++;
      }
    }
    console.log(`Enrolled: ${enrolled} new (${STUDENT_COUNT - enrolled} already enrolled)`);

    // 5. Savings goals (varied: 0% -> 100% across students)
    let goalsCreated = 0;
    for (let i = 0; i < studentIds.length; i++) {
      const sid = studentIds[i];
      const existing = await client.query(
        `SELECT id FROM savings_goals WHERE user_id=$1 LIMIT 1`,
        [sid]
      );
      if (existing.rowCount > 0) continue;

      const pct    = i / (studentIds.length - 1); // 0.0 -> 1.0
      const target = 100 + i * 8;                  // 100 -> 332 TTD
      const current = Math.round(target * pct);
      const name   = GOAL_NAMES[i % GOAL_NAMES.length];

      await client.query(
        `INSERT INTO savings_goals
           (user_id, name, target_amount, current_amount, currency, created_at)
         VALUES ($1, $2, $3, $4, 'TTD', NOW())`,
        [sid, name, target, current]
      );
      goalsCreated++;
    }
    console.log(`Goals created: ${goalsCreated}`);

    // 6. XP (50 -> 485, spread across 5 levels)
    for (let i = 0; i < studentIds.length; i++) {
      const sid     = studentIds[i];
      const totalXp = 50 + i * 15;               // 50 -> 485
      const level   = Math.max(1, Math.ceil(totalXp / 100));
      await client.query(
        `INSERT INTO user_xp (user_id, total_xp, level, current_streak, longest_streak, last_played_at)
         VALUES ($1, $2, $3, 0, 0, NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET total_xp=$2, level=$3, last_played_at=NOW()`,
        [sid, totalXp, level]
      );
    }
    console.log(`XP records: ${STUDENT_COUNT} upserted`);

    // 7. Lesson progress: first 18 completed module 1, first 8 also completed module 2
    let progressRows = 0;
    for (let i = 0; i < studentIds.length; i++) {
      const sid = studentIds[i];
      const modules = i < 8 ? [1, 2] : i < 18 ? [1] : [];
      for (const mid of modules) {
        const exists = await client.query(
          `SELECT id FROM user_learning_progress WHERE user_id=$1 AND module_id=$2 LIMIT 1`,
          [sid, mid]
        );
        if (exists.rowCount === 0) {
          const score = 60 + ((i * 3 + mid * 7) % 40);
          await client.query(
            `INSERT INTO user_learning_progress
               (user_id, module_id, completed, completed_at)
             VALUES ($1, $2, true, NOW())`,
            [sid, mid]
          );
          progressRows++;
        }
      }
    }
    console.log(`Progress rows: ${progressRows} inserted`);

    // 8. Verify final counts
    const counts = await client.query(`
      SELECT 'enrollments' AS tbl, COUNT(*) FROM class_enrollments WHERE class_id=$1
      UNION ALL SELECT 'goals',       COUNT(*) FROM savings_goals WHERE user_id LIKE 'qa-student-%'
      UNION ALL SELECT 'xp',          COUNT(*) FROM user_xp       WHERE user_id LIKE 'qa-student-%'
      UNION ALL SELECT 'progress',    COUNT(*) FROM user_learning_progress WHERE user_id LIKE 'qa-student-%'
    `, [classId]);
    console.log("\n--- Verification ---");
    for (const r of counts.rows) console.log(`  ${r.tbl}: ${r.count}`);

    console.log("\n=== QA SEED COMPLETE ===");
    console.log(`Teacher login : ${QA_TEACHER_EMAIL} / ${QA_TEACHER_PASS}`);
    console.log(`Class code    : ${QA_CLASS_CODE}  (DB id=${classId})`);
    console.log(`Students      : qa-student-001 to qa-student-030`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("SEED FAILED:", e.message);
  process.exit(1);
});
