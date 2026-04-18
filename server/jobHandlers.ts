import { registerJobHandler } from "./jobs";
import { storage } from "./storage";
import { openai } from "./replit_integrations/chat/routes";

export function registerJobHandlers() {
  // === Paper extraction (MoneyLab upload) ===
  registerJobHandler("extract-paper", async (job) => {
    const { paperId, fileB64, ext, subject } = job.payload as {
      paperId: number;
      fileB64: string;
      ext: string;
      subject: string;
    };

    const buffer = Buffer.from(fileB64, "base64");
    let extractedText = "";

    if (ext === ".pdf") {
      const pdfMod: any = await import("pdf-parse");
      const pdfParse = pdfMod.default ?? pdfMod;
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text.slice(0, 30000);
    } else {
      const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Extract all the text from this exam paper image. Include all questions, answer choices, and any other relevant text exactly as written." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${buffer.toString("base64")}` } },
          ],
        }],
        max_completion_tokens: 4096,
      });
      extractedText = visionResponse.choices[0]?.message?.content || "";
    }

    if (!extractedText.trim()) {
      await storage.updateExamPaper(paperId, { status: "failed" } as any);
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
- difficulty: easy = basic recall, medium = application, hard = analysis/evaluation`
        },
        { role: "user", content: extractedText }
      ],
      max_completion_tokens: 4096,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(extractionResponse.choices[0]?.message?.content || "{}");
    const questions = parsed.questions || [];
    const detectedSubject = parsed.subject || subject;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.question && Array.isArray(q.options) && q.options.length >= 2 && q.answer) {
        await storage.createExtractedQuestion({
          paperId,
          questionText: q.question,
          options: q.options.slice(0, 4),
          correctAnswer: q.answer,
          subject: detectedSubject,
          difficulty: q.difficulty || "medium",
          order: i + 1,
        });
      }
    }

    await storage.updateExamPaper(paperId, {
      status: "completed",
      subject: detectedSubject,
      questionCount: questions.length,
    } as any);

    return { paperId, questionCount: questions.length, subject: detectedSubject };
  });

  // === Admin CSV export ===
  registerJobHandler("admin-csv-export", async (job) => {
    const { type } = job.payload as { type: string };
    let data: any[] = [];
    if (type === "students") data = await storage.getAdminStudents();
    else if (type === "teachers") data = await storage.getAdminTeachers();
    else if (type === "classes") data = await storage.getAdminClasses();
    else if (type === "schools") data = await (storage as any).getSchools();
    else if (type === "sponsors") data = await (storage as any).getSponsors();
    else throw new Error(`Unknown export type: ${type}`);

    if (!data.length) {
      return { type, rowCount: 0, csv: "" };
    }
    const cols = Object.keys(data[0]);
    const escape = (v: any) => {
      if (v == null) return "";
      if (v instanceof Date) return v.toISOString();
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = data.map((row) => cols.map((c) => escape(row[c])).join(","));
    const csv = [cols.join(","), ...rows].join("\n");

    return { type, rowCount: data.length, csv, fileName: `${type}-report.csv` };
  });
}
