import { registerJobHandler, enqueueJob, type JobPayloads } from "./jobs";
import { storage } from "./storage";
import { openai } from "./replit_integrations/chat/routes";
import { objectStorageClient } from "./replit_integrations/object_storage";
import { db } from "./db";
import { emailContacts, extractedQuestions, gameSessions, transactions, userXp } from "@shared/schema";
import { and, eq, gte, sql } from "drizzle-orm";
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

  // === Admin CSV export — writes to private object storage ===
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
    const since = new Date(weekStart);
    let enqueued = 0;
    const baseUrl = appBaseUrl();
    const orgFilter = orgId ? eq(emailContacts.orgId, orgId) : undefined;

    if (audience === "student") {
      const conds = [
        eq(emailContacts.userKind, "student"),
        eq(emailContacts.weeklyDigest, true),
        eq(emailContacts.verified, true),
      ];
      if (orgFilter) conds.push(orgFilter);
      const contacts = await db.select().from(emailContacts).where(and(...conds));
      for (const c of contacts) {
        const xp = await storage.getUserXp(c.userId).catch(() => null);
        const [{ count: txCount = 0 } = { count: 0 }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(transactions)
          .where(and(eq(transactions.userId, c.userId), gte(transactions.createdAt, since)));
        const [{ count: gameCount = 0 } = { count: 0 }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(gameSessions)
          .where(and(eq(gameSessions.userId, c.userId), gte(gameSessions.completedAt, since)));
        const html = renderStudentDigest({ totalXp: xp?.totalXp ?? 0, level: xp?.level ?? 1, streak: xp?.currentStreak ?? 0, txCount, gameCount, baseUrl });
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
        const xp = await storage.getUserXp(c.userId).catch(() => null);
        const html = renderGuardianDigest({ studentName: c.userId, totalXp: xp?.totalXp ?? 0, level: xp?.level ?? 1, baseUrl });
        await enqueueJob({
          kind: "send-email",
          payload: {
            to: c.email,
            subject: "Weekly progress for your student",
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
        const html = renderTeacherDigest({ classCount: classes.length, baseUrl });
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

function renderStudentDigest(d: { totalXp: number; level: number; streak: number; txCount: number; gameCount: number; baseUrl: string }) {
  return shell("Your weekly recap", `
    <p>Here's how your money learning went this week.</p>
    <ul style="line-height:1.8;color:#111827">
      <li><b>${d.totalXp}</b> total XP (Level ${d.level})</li>
      <li><b>${d.streak}</b> day streak</li>
      <li><b>${d.txCount}</b> transactions logged</li>
      <li><b>${d.gameCount}</b> games played</li>
    </ul>
    <p><a href="${escapeHtml(d.baseUrl)}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Open dashboard</a></p>
  `, d.baseUrl);
}

function renderGuardianDigest(d: { studentName: string; totalXp: number; level: number; baseUrl: string }) {
  return shell("Weekly progress update", `
    <p>Your student reached <b>Level ${d.level}</b> with <b>${d.totalXp}</b> total XP this week on FinSight Lite.</p>
  `, d.baseUrl);
}

function renderTeacherDigest(d: { classCount: number; baseUrl: string }) {
  return shell("Your class recap", `
    <p>You have <b>${d.classCount}</b> active class${d.classCount === 1 ? "" : "es"} this week.</p>
    <p><a href="${escapeHtml(d.baseUrl)}/teacher" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Open teacher dashboard</a></p>
  `, d.baseUrl);
}

// Re-export so route handlers can stream the resulting CSV.
export { uploadPrivateObject };
