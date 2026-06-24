import { registerJobHandler, enqueueJob, type JobPayloads } from "./jobs";
import { storage } from "./storage";
import { openai } from "./replit_integrations/chat/routes";
import { objectStorageClient } from "./replit_integrations/object_storage";
import { db } from "./db";
import { aiUsageEvents, emailContacts, extractedQuestions, gameSessions, transactions, userXp, userLearningProgress, userBadges, learningModules, teachers, users } from "@shared/schema";
import { and, eq, gte, lt, sql, inArray, lte } from "drizzle-orm";
import { sendEmail, escapeHtml, appBaseUrl } from "./email";

function parsePrivatePath(relPath: string): { bucket: string; object: string } {
  const root = process.env.PRIVATE_OBJECT_DIR;
  if (!root) throw new Error("PRIVATE_OBJECT_DIR is not configured");
  const full = `${root.replace(/\/$/, "")}/${relPath.replace(/^\//, "")}`;
  const p = full.startsWith("/") ? full : `/${full}`;
  const parts = p.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error(`Invalid private object path: ${full}`);
  return { bucket: parts[0], object: parts.slice(1).join("/") };
}

async function uploadPrivateObject(
  relPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { bucket, object } = parsePrivatePath(relPath);
  await objectStorageClient
    .bucket(bucket)
    .file(object)
    .save(buffer, { contentType, resumable: false });
  return `/${bucket}/${object}`;
}

export async function streamPrivateObjectToResponse(
  objectPath: string,
  res: import("express").Response,
  fileName: string,
  contentType = "application/octet-stream",
) {
  const p = objectPath.startsWith("/") ? objectPath : `/${objectPath}`;
  const parts = p.split("/").filter(Boolean);
  const bucket = parts[0];
  const object = parts.slice(1).join("/");
  const file = objectStorageClient.bucket(bucket).file(object);
  const [exists] = await file.exists();
  if (!exists) {
    res.status(404).json({ message: "Export file not found" });
    return;
  }
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  file
    .createReadStream()
    .on("error", (err) => {
      if (!res.headersSent) res.status(500).json({ message: err.message });
    })
    .pipe(res);
}

export function registerJobHandlers() {
  // === Performance & reliability scan ===
  registerJobHandler("perf-scan", async (job) => {
    const { runPerfScan } = await import("./perfAgent");
    return runPerfScan(job.payload.triggeredBy ?? "job");
  });

  // === AI usage purge ===
  registerJobHandler("purge-ai-usage", async (job) => {
    const { olderThanDays } = job.payload;
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const result = await db.delete(aiUsageEvents).where(lt(aiUsageEvents.createdAt, cutoff));
    const deletedRows = (result as unknown as { rowCount?: number }).rowCount ?? 0;
    return { deletedRows, cutoffDate: cutoff.toISOString() };
  });

  // === Paper extraction (MoneyLab upload) ===
  registerJobHandler("extract-paper", async (job) => {
    const { paperId, fileB64, ext, subject } = job.payload;
    try {
      return await runExtractPaper(paperId, fileB64, ext, subject, job.attempts >= job.maxAttempts);
    } catch (err) {
      // On the *terminal* attempt, sync paper status so the UI doesn't show
      // it stuck at 'processing' forever.
      if (job.attempts >= job.maxAttempts) {
        try {
          await storage.updateExamPaper(paperId, { status: "failed" });
        } catch { /* ignore */ }
      }
      throw err;
    }
  });

  async function runExtractPaper(
    paperId: number,
    fileB64: string,
    ext: string,
    subject: string,
    _isFinalAttempt: boolean,
  ) {
    // Idempotency: if a previous attempt partially inserted questions and then
    // crashed before completion, wipe them so a retry doesn't double-insert.
    await db.delete(extractedQuestions).where(eq(extractedQuestions.paperId, paperId));

    const buffer = Buffer.from(fileB64, "base64");
    let extractedText = "";

    if (ext === ".pdf") {
      const pdfMod = (await import("pdf-parse")) as unknown as {
        default?: (b: Buffer) => Promise<{ text: string }>;
      } & ((b: Buffer) => Promise<{ text: string }>);
      const pdfParse = pdfMod.default ?? pdfMod;
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text.slice(0, 30000);
    } else {
      const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all the text from this exam paper image. Include all questions, answer choices, and any other relevant text exactly as written." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${buffer.toString("base64")}` } },
            ],
          },
        ],
        max_completion_tokens: 4096,
      });
      extractedText = visionResponse.choices[0]?.message?.content || "";
    }

    if (!extractedText.trim()) {
      // Throw so the worker records this as a failed job (not a successful
      // one with ok:false). The outer try/catch will sync exam_papers status.
      throw new Error("No text could be extracted from the uploaded file");
    }

    const extractionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an exam question extractor. Extract multiple choice questions from exam paper text.
Return ONLY valid JSON in this exact format:
{
  "subject": "detected subject name",
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "The correct answer text (must match one of the options exactly)",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}
Rules:
- Extract ALL questions found in the text
- Each question MUST have exactly 4 options
- If the correct answer is not obvious, use your best judgment based on the subject matter
- Detect the subject from context (Accounting, Commerce, Economics, Business Studies, etc.)
- If a question is not multiple choice, convert it into a reasonable MCQ format
- difficulty: easy = basic recall, medium = application, hard = analysis/evaluation`,
        },
        { role: "user", content: extractedText },
      ],
      max_completion_tokens: 4096,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(extractionResponse.choices[0]?.message?.content || "{}") as {
      subject?: string;
      questions?: Array<{
        question?: string;
        options?: string[];
        answer?: string;
        difficulty?: "easy" | "medium" | "hard";
      }>;
    };
    const questions = parsed.questions ?? [];
    const detectedSubject = parsed.subject ?? subject;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.question && Array.isArray(q.options) && q.options.length >= 2 && q.answer) {
        await storage.createExtractedQuestion({
          paperId,
          questionText: q.question,
          options: q.options.slice(0, 4),
          correctAnswer: q.answer,
          subject: detectedSubject,
          difficulty: q.difficulty ?? "medium",
          order: i + 1,
        });
      }
    }

    await storage.updateExamPaper(paperId, {
      status: "completed",
      subject: detectedSubject,
      questionCount: questions.length,
    });

    return { paperId, questionCount: questions.length, subject: detectedSubject };
  }

  // === Admin CSV export: writes to private object storage ===
  registerJobHandler("admin-csv-export", async (job) => {
    const { type } = job.payload;
    type AdminRow = Record<string, unknown>;
    let data: AdminRow[] = [];
    if (type === "students") data = (await storage.getAdminStudents()) as AdminRow[];
    else if (type === "teachers") data = (await storage.getAdminTeachers()) as AdminRow[];
    else if (type === "classes") data = (await storage.getAdminClasses()) as AdminRow[];
    else if (type === "schools") data = (await storage.getSchools()) as AdminRow[];
    else if (type === "sponsors") data = (await storage.getSponsors()) as AdminRow[];

    const fileName = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    let csv = "";
    if (data.length) {
      const cols = Object.keys(data[0]);
      const escape = (v: unknown): string => {
        if (v == null) return "";
        if (v instanceof Date) return v.toISOString();
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows = data.map((row) => cols.map((c) => escape(row[c])).join(","));
      csv = [cols.join(","), ...rows].join("\n");
    } else {
      csv = "(no rows)\n";
    }

    const objectPath = await uploadPrivateObject(
      `exports/job-${job.id}-${fileName}`,
      Buffer.from(csv, "utf8"),
      "text/csv",
    );

    return { type, rowCount: data.length, objectPath, fileName };
  });

  // === Generic email send ===
  registerJobHandler("send-email", async (job) => {
    const p = job.payload;
    const result = await sendEmail({
      to: p.to,
      subject: p.subject,
      html: p.html,
      text: p.text,
      kind: p.kind,
      orgId: p.orgId ?? null,
      userKind: p.userKind ?? null,
      userId: p.userId ?? null,
      attachments: p.attachments,
    });
    return { ok: result.ok, providerId: result.providerId, error: result.error };
  });

  // === Weekly digest fan-out ===
  registerJobHandler("weekly-digest", async (job) => {
    const { weekStart, audience, orgId } = job.payload;
    const periodEnd = new Date();
    const since = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    let enqueued = 0;
    const baseUrl = appBaseUrl();
    const orgFilter = orgId ? eq(emailContacts.orgId, orgId) : undefined;

    async function studentWeekStats(userId: string) {
      const xp = await storage.getUserXp(userId).catch(() => null);
      const [{ count: txCount = 0 } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), gte(transactions.createdAt, since), lte(transactions.createdAt, periodEnd)));
      const [{ count: gameCount = 0 } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(gameSessions)
        .where(and(eq(gameSessions.userId, userId), gte(gameSessions.completedAt, since), lte(gameSessions.completedAt, periodEnd)));
      const lessonRows = await db
        .select({ title: learningModules.title })
        .from(userLearningProgress)
        .leftJoin(learningModules, eq(userLearningProgress.moduleId, learningModules.id))
        .where(and(
          eq(userLearningProgress.userId, userId),
          eq(userLearningProgress.completed, true),
          gte(userLearningProgress.completedAt, since),
          lte(userLearningProgress.completedAt, periodEnd),
        ));
      const badgeRows = await db
        .select({ id: userBadges.id })
        .from(userBadges)
        .where(and(eq(userBadges.userId, userId), gte(userBadges.earnedAt, since), lte(userBadges.earnedAt, periodEnd)));
      return {
        totalXp: xp?.totalXp ?? 0,
        level: xp?.level ?? 1,
        streak: xp?.currentStreak ?? 0,
        txCount,
        gameCount,
        lessonsCompleted: lessonRows.length,
        lessonTitles: lessonRows.map((r) => r.title).filter(Boolean) as string[],
        badgesEarned: badgeRows.length,
      };
    }

    async function bootstrapStudentContacts() {
      const students = orgId
        ? await storage.getStudentsByOrgId(orgId).catch(() => [])
        : await db.select().from(users).catch(() => []);
      for (const s of students as Array<{ id: string; email?: string | null; username?: string | null }>) {
        const verifiedSource = !!s.email;
        const candidate = s.email || (s.username && s.username.includes("@") ? s.username : null);
        if (!candidate) continue;
        const email = candidate;
        const [existing] = await db.select().from(emailContacts).where(
          and(eq(emailContacts.userKind, "student"), eq(emailContacts.userId, s.id)),
        );
        if (existing) {
          if (!existing.orgId) await db.update(emailContacts).set({ orgId, updatedAt: new Date() }).where(eq(emailContacts.id, existing.id));
          continue;
        }
        await db.insert(emailContacts).values({
          userKind: "student", userId: s.id, email,
          verified: verifiedSource, classNotifications: true, weeklyDigest: true, orgId,
        });
      }
    }
    async function bootstrapTeacherContacts() {
      const teacherList = orgId
        ? await storage.getTeachersByOrgId(orgId).catch(() => [])
        : await db.select().from(teachers).catch(() => []);
      for (const t of teacherList as Array<{ id: number; email: string | null }>) {
        if (!t.email) continue;
        const teacherUserId = String(t.id);
        const [existing] = await db.select().from(emailContacts).where(
          and(eq(emailContacts.userKind, "teacher"), eq(emailContacts.userId, teacherUserId)),
        );
        if (existing) {
          if (!existing.orgId) await db.update(emailContacts).set({ orgId, updatedAt: new Date() }).where(eq(emailContacts.id, existing.id));
          continue;
        }
        await db.insert(emailContacts).values({
          userKind: "teacher", userId: teacherUserId, email: t.email,
          verified: true, classNotifications: true, weeklyDigest: true, orgId,
        });
      }
    }

    if (audience === "student") {
      await bootstrapStudentContacts();
      const conds = [
        eq(emailContacts.userKind, "student"),
        eq(emailContacts.weeklyDigest, true),
        eq(emailContacts.verified, true),
      ];
      if (orgFilter) conds.push(orgFilter);
      const contacts = await db.select().from(emailContacts).where(and(...conds));
      for (const c of contacts) {
        const stats = await studentWeekStats(c.userId);
        const html = renderStudentDigest({ ...stats, baseUrl });
        await enqueueJob({
          kind: "send-email",
          payload: {
            to: c.email,
            subject: "Your FinSight Lite weekly recap",
            html,
            kind: "weekly_digest",
            orgId: c.orgId,
            userKind: "student",
            userId: c.userId,
          },
        });
        enqueued++;
      }
    } else if (audience === "guardian") {
      const conds = [
        eq(emailContacts.userKind, "guardian"),
        eq(emailContacts.weeklyDigest, true),
        eq(emailContacts.verified, true),
      ];
      if (orgFilter) conds.push(orgFilter);
      const contacts = await db.select().from(emailContacts).where(and(...conds));
      for (const c of contacts) {
        const stats = await studentWeekStats(c.userId);
        const student = await storage.getUser(c.userId).catch(() => null);
        const studentName = student?.firstName || student?.email || "Your student";
        const html = renderGuardianDigest({ studentName, ...stats, baseUrl });
        await enqueueJob({
          kind: "send-email",
          payload: {
            to: c.email,
            subject: `Weekly progress for ${studentName}`,
            html,
            kind: "weekly_digest",
            orgId: c.orgId,
            userKind: "guardian",
            userId: c.userId,
          },
        });
        enqueued++;
      }
    } else if (audience === "teacher") {
      await bootstrapTeacherContacts();
      const conds = [
        eq(emailContacts.userKind, "teacher"),
        eq(emailContacts.weeklyDigest, true),
        eq(emailContacts.verified, true),
      ];
      if (orgFilter) conds.push(orgFilter);
      const contacts = await db.select().from(emailContacts).where(and(...conds));
      for (const c of contacts) {
        const teacherId = parseInt(c.userId, 10);
        const classes = isFinite(teacherId) ? await storage.getClassesByTeacher(teacherId) : [];
        const classSummaries: Array<{ name: string; total: number; active: number; lessons: number; flagged: string[] }> = [];
        for (const cls of classes) {
          const enrollments = await storage.getEnrollmentsByClass(cls.id);
          const studentIds = enrollments.map((e) => e.studentId);
          if (studentIds.length === 0) {
            classSummaries.push({ name: cls.name, total: 0, active: 0, lessons: 0, flagged: [] });
            continue;
          }
          const activeRows = await db
            .select({ userId: gameSessions.userId })
            .from(gameSessions)
            .where(and(inArray(gameSessions.userId, studentIds), gte(gameSessions.completedAt, since), lte(gameSessions.completedAt, periodEnd)))
            .groupBy(gameSessions.userId);
          const activeFromTx = await db
            .select({ userId: transactions.userId })
            .from(transactions)
            .where(and(inArray(transactions.userId, studentIds), gte(transactions.createdAt, since), lte(transactions.createdAt, periodEnd)))
            .groupBy(transactions.userId);
          const activeFromLessons = await db
            .select({ userId: userLearningProgress.userId })
            .from(userLearningProgress)
            .where(and(
              inArray(userLearningProgress.userId, studentIds),
              eq(userLearningProgress.completed, true),
              gte(userLearningProgress.completedAt, since),
              lte(userLearningProgress.completedAt, periodEnd),
            ))
            .groupBy(userLearningProgress.userId);
          const activeIds = new Set<string>([
            ...activeRows.map((r) => r.userId),
            ...activeFromTx.map((r) => r.userId),
            ...activeFromLessons.map((r) => r.userId),
          ]);
          const [{ count: lessons = 0 } = { count: 0 }] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(userLearningProgress)
            .where(and(
              inArray(userLearningProgress.userId, studentIds),
              eq(userLearningProgress.completed, true),
              gte(userLearningProgress.completedAt, since),
              lte(userLearningProgress.completedAt, periodEnd),
            ));
          const flagged = enrollments
            .filter((e) => !activeIds.has(e.studentId))
            .map((e) => e.student?.firstName || e.student?.email || e.studentId)
            .slice(0, 8);
          classSummaries.push({
            name: cls.name,
            total: enrollments.length,
            active: activeIds.size,
            lessons,
            flagged,
          });
        }
        const html = renderTeacherDigest({ classes: classSummaries, baseUrl });
        await enqueueJob({
          kind: "send-email",
          payload: {
            to: c.email,
            subject: "Your FinSight Lite class recap",
            html,
            kind: "weekly_digest",
            orgId: c.orgId,
            userKind: "teacher",
            userId: c.userId,
          },
        });
        enqueued++;
      }
    }

    return { audience, weekStart, enqueued };
  });
}

function shell(title: string, body: string, baseUrl: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,Segoe UI,Arial;background:#f6f7fb;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
    <div style="font-size:14px;color:#6b7280;margin-bottom:8px">FinSight Lite</div>
    <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
    ${body}
    <p style="margin-top:24px;font-size:12px;color:#6b7280">
      <a href="${escapeHtml(baseUrl)}/settings" style="color:#6b7280">Manage email preferences</a>
    </p>
  </div></body></html>`;
}

type StudentStats = {
  totalXp: number; level: number; streak: number;
  txCount: number; gameCount: number;
  lessonsCompleted: number; lessonTitles: string[]; badgesEarned: number;
};

function renderStudentDigest(d: StudentStats & { baseUrl: string }) {
  const lessonsList = d.lessonTitles.length
    ? `<p style="margin:8px 0 0;font-size:13px;color:#374151">Lessons: ${d.lessonTitles.map(escapeHtml).join(", ")}</p>`
    : "";
  return shell("Your weekly recap", `
    <p>Here's how your money learning went over the last 7 days.</p>
    <ul style="line-height:1.8;color:#111827">
      <li><b>${d.lessonsCompleted}</b> lesson${d.lessonsCompleted === 1 ? "" : "s"} completed this week</li>
      <li><b>${d.badgesEarned}</b> new badge${d.badgesEarned === 1 ? "" : "s"} earned</li>
      <li><b>${d.gameCount}</b> game${d.gameCount === 1 ? "" : "s"} played</li>
      <li><b>${d.txCount}</b> transaction${d.txCount === 1 ? "" : "s"} logged</li>
      <li><b>${d.totalXp}</b> total XP · Level <b>${d.level}</b> · ${d.streak}-day streak</li>
    </ul>
    ${lessonsList}
    <p style="margin-top:16px"><a href="${escapeHtml(d.baseUrl)}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Open dashboard</a></p>
  `, d.baseUrl);
}

function renderGuardianDigest(d: StudentStats & { studentName: string; baseUrl: string }) {
  const lessonsList = d.lessonTitles.length
    ? `<p style="margin:8px 0 0;font-size:13px;color:#374151">Lessons covered: ${d.lessonTitles.map(escapeHtml).join(", ")}</p>`
    : "";
  return shell(`Weekly progress for ${d.studentName}`, `
    <p>Here is what <b>${escapeHtml(d.studentName)}</b> did on FinSight Lite over the last 7 days:</p>
    <ul style="line-height:1.8;color:#111827">
      <li><b>${d.lessonsCompleted}</b> lesson${d.lessonsCompleted === 1 ? "" : "s"} completed</li>
      <li><b>${d.badgesEarned}</b> new badge${d.badgesEarned === 1 ? "" : "s"} earned</li>
      <li><b>${d.gameCount}</b> game${d.gameCount === 1 ? "" : "s"} played</li>
      <li><b>${d.txCount}</b> transaction${d.txCount === 1 ? "" : "s"} logged</li>
      <li>Now at <b>Level ${d.level}</b> with <b>${d.totalXp}</b> total XP (${d.streak}-day streak)</li>
    </ul>
    ${lessonsList}
  `, d.baseUrl);
}

function renderTeacherDigest(d: { classes: Array<{ name: string; total: number; active: number; lessons: number; flagged: string[] }>; baseUrl: string }) {
  const body = d.classes.length === 0
    ? `<p>You don't have any classes yet. Create one to start tracking student progress.</p>`
    : d.classes.map((c) => `
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin:10px 0">
        <div style="font-weight:600;margin-bottom:6px">${escapeHtml(c.name)}</div>
        <div style="font-size:13px;color:#374151;line-height:1.7">
          <b>${c.active}</b> of <b>${c.total}</b> students active this week ·
          <b>${c.lessons}</b> lesson${c.lessons === 1 ? "" : "s"} completed
        </div>
        ${c.flagged.length ? `<div style="font-size:12px;color:#b45309;margin-top:8px">No activity: ${c.flagged.map(escapeHtml).join(", ")}</div>` : ""}
      </div>
    `).join("");
  return shell("Your class recap", `
    <p>Here's how your classes did over the last 7 days.</p>
    ${body}
    <p style="margin-top:16px"><a href="${escapeHtml(d.baseUrl)}/teacher" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Open teacher dashboard</a></p>
  `, d.baseUrl);
}

// === ORG WEEKLY EMAIL =========================================================
registerJobHandler("org-weekly-email", async (job) => {
  const { weekStart } = job.payload as { weekStart: string };
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const baseUrl = appBaseUrl();
  let orgsProcessed = 0;
  let emailsSent = 0;

  const { supabase, getOrganizations } = await import("./supabase");
  if (!supabase) return { orgsProcessed: 0, emailsSent: 0 };

  const orgs = await getOrganizations();
  for (const org of orgs as Array<{ id: string; name: string }>) {
    const { data: orgStudents } = await supabase
      .from("org_students")
      .select("student_user_id")
      .eq("org_id", org.id);
    const studentIds: string[] = (orgStudents ?? []).map((s: any) => s.student_user_id);
    if (studentIds.length === 0) continue;

    const xpRows = await Promise.all(studentIds.map((id) => storage.getUserXp(id).catch(() => null)));
    const progressRows = await Promise.all(studentIds.map((id) => storage.getUserLearningProgress(id).catch(() => [])));

    const hasActivity = studentIds.some((_id, idx) => {
      const xp = xpRows[idx];
      if (xp?.lastPlayedAt && new Date(xp.lastPlayedAt) >= sevenDaysAgo) return true;
      const prog = progressRows[idx] ?? [];
      return prog.some((p: any) => p.completedAt && new Date(p.completedAt) >= sevenDaysAgo);
    });
    if (!hasActivity) continue;

    orgsProcessed++;

    const validXp = xpRows.filter((r): r is NonNullable<typeof r> => r != null);
    const avgXp = validXp.length > 0 ? Math.round(validXp.reduce((s, r) => s + r.totalXp, 0) / validXp.length) : 0;
    const CORE_LESSONS = 9;
    const totalCompleted = progressRows.reduce((sum, rows) => sum + rows.filter((r: any) => r.completed).length, 0);
    const lessonCompletionRate = studentIds.length > 0
      ? Math.round((totalCompleted / (studentIds.length * CORE_LESSONS)) * 100) : 0;
    const activeCount = studentIds.filter((_id, idx) => {
      const xp = xpRows[idx];
      if (xp?.lastPlayedAt && new Date(xp.lastPlayedAt) >= sevenDaysAgo) return true;
      const prog = progressRows[idx] ?? [];
      return prog.some((p: any) => p.completedAt && new Date(p.completedAt) >= sevenDaysAgo);
    }).length;

    const admins = await storage.getOrgAdminsByOrgId(org.id).catch(() => []);
    for (const admin of admins) {
      if (!admin.email) continue;
      const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
  <h2 style="color:#0d9488;margin-bottom:4px">Finsight Lite</h2>
  <h3 style="margin-top:0">Your weekly update &mdash; ${escapeHtml(org.name)}</h3>
  <p>Here is how your students are doing for the week of <strong>${escapeHtml(weekStart)}</strong>:</p>
  <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr style="background:#f1f5f9"><td style="padding:8px 12px;font-weight:600">Total students enrolled</td><td style="padding:8px 12px">${studentIds.length}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600">Active this week</td><td style="padding:8px 12px">${activeCount}</td></tr>
    <tr style="background:#f1f5f9"><td style="padding:8px 12px;font-weight:600">Average XP per student</td><td style="padding:8px 12px">${avgXp}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600">Lesson completion rate</td><td style="padding:8px 12px">${lessonCompletionRate}%</td></tr>
  </table>
  <p>Keep encouraging your students to log on and learn!</p>
  <p><a href="${escapeHtml(baseUrl)}/org/dashboard" style="background:#0d9488;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Open your dashboard</a></p>
  <p style="font-size:12px;color:#6b7280;margin-top:24px">Finsight Lite &middot; Finsight Limited</p>
</div>`;
      await sendEmail({
        to: admin.email,
        subject: `Your Finsight Lite weekly update: ${org.name}`,
        html,
        text: `Finsight Lite weekly update: ${org.name}\n\nWeek of: ${weekStart}\nTotal students: ${studentIds.length}\nActive this week: ${activeCount}\nAvg XP: ${avgXp}\nLesson completion: ${lessonCompletionRate}%\n\nDashboard: ${baseUrl}/org/dashboard`,
        kind: "org_weekly_email",
        orgId: org.id,
      });
      emailsSent++;
    }
  }

  return { orgsProcessed, emailsSent };
});

// Re-export so route handlers can stream the resulting CSV.
export { uploadPrivateObject };
