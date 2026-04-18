import { registerJobHandler, type JobPayloads } from "./jobs";
import { storage } from "./storage";
import { openai } from "./replit_integrations/chat/routes";
import { objectStorageClient } from "./replit_integrations/object_storage";
import { db } from "./db";
import { extractedQuestions } from "@shared/schema";
import { eq } from "drizzle-orm";

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
      await storage.updateExamPaper(paperId, { status: "failed" });
      return { paperId, ok: false, reason: "no text extracted" };
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
  });

  // === Admin CSV export — writes to private object storage ===
  registerJobHandler("admin-csv-export", async (job) => {
    const { type } = job.payload;
    type AdminRow = Record<string, unknown>;
    let data: AdminRow[] = [];
    if (type === "students") data = (await storage.getAdminStudents()) as AdminRow[];
    else if (type === "teachers") data = (await storage.getAdminTeachers()) as AdminRow[];
    else if (type === "classes") data = (await storage.getAdminClasses()) as AdminRow[];
    else if (type === "schools") data = (await (storage as unknown as { getSchools: () => Promise<AdminRow[]> }).getSchools()) as AdminRow[];
    else if (type === "sponsors") data = (await (storage as unknown as { getSponsors: () => Promise<AdminRow[]> }).getSponsors()) as AdminRow[];

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
}

// Re-export so route handlers can stream the resulting CSV.
export { uploadPrivateObject };
