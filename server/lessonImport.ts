// Free, deterministic lesson import parser. No AI calls, no per-upload cost.
//
// Supports two input formats:
//   .docx — parsed via mammoth.js, which reads Word's actual Heading 1/2
//           styles, this is reliable because docx carries real semantic
//           structure.
//   .pdf  — parsed via pdf-parse (text extraction only). PDFs do not carry
//           semantic heading tags, so section detection here is heuristic
//           (short lines in isolation, title-case, no trailing punctuation)
//           and will be less reliable than docx. A PDF with no detectable
//           structure still imports successfully, just as a single text
//           section instead of several, it never fails outright.
//
// Expected document shape (by convention, documented for admins/teachers):
//   Heading 1: the lesson title (optional, falls back to filename)
//   Heading 2: one per content section
//   A line that is just a YouTube URL directly under a Heading 2 becomes
//     that section's video instead of a text block.
//   A Heading 2 literally named "Objectives" or "Learning Objectives":
//     each following line becomes one objective.
//   A Heading 2 literally named "Quiz" or "Quiz Questions": everything
//     after it is parsed as questions, not as a content section, using:
//       Q: question text
//       A) option one
//       B) option two
//       C) option three
//       D) option four
//       ANSWER: A
//     one blank line between questions.

import mammoth from "mammoth";

export type ParsedQuestion = {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
};

export type ParsedContentSection = {
  heading: string;
  body: string;
  video_url?: string;
};

export type ParsedLesson = {
  title: string;
  objectives: string[];
  contentSections: ParsedContentSection[];
  questions: ParsedQuestion[];
  warnings: string[];
};

const YOUTUBE_RE = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/i;
const OBJECTIVES_HEADING_RE = /^(learning )?objectives$/i;
const QUIZ_HEADING_RE = /^quiz( questions)?$/i;

// ─── Step 1: get a list of {level, text} blocks from either file type ─────────

type Block = { level: "h1" | "h2" | "p"; text: string };

// mammoth escapes & < > " ' in text content; decode them back after tag
// stripping so "Saving & Investing" doesn't import as "Saving &amp; Investing".
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

async function blocksFromDocx(buffer: Buffer): Promise<Block[]> {
  const result = await mammoth.convertToHtml(
    { buffer },
    { styleMap: ["p[style-name='Heading 1'] => h1:fresh", "p[style-name='Heading 2'] => h2:fresh"] }
  );
  const html = result.value;
  const blocks: Block[] = [];
  // <li> is included because mammoth converts Word bullet/numbered lists to
  // <ul>/<ol> list items; without it, all bulleted content (a very common way
  // to write objectives) would be silently dropped. List items are treated as
  // plain paragraphs, matching how the txt/pdf path handles bullet lines.
  const tagRe = /<(h1|h2|p|li)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const level = (tag === "li" ? "p" : tag) as "h1" | "h2" | "p";
    const text = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, "")).trim();
    if (text) blocks.push({ level, text });
  }
  return blocks;
}

// PDFs carry no semantic tags, so this is a heuristic: a short, standalone
// line (under ~70 chars, no ending punctuation, not a bullet) is treated as
// a heading. Everything else is a paragraph. This will misfire on unusually
// formatted documents; that's an accepted, documented limitation, not a bug.
const QUIZ_LINE_RE = /^(Q:|A\)|B\)|C\)|D\)|ANSWER:)/i;
const PDF_ARTIFACT_RE = /^--\s*\d+\s*of\s*\d+\s*--$|^page\s+\d+$/i;

function blocksFromPlainText(text: string): Block[] {
  // Keep blank lines at this stage: when the document has them (typical for
  // .txt), a heading must be a short line in isolation (blank line or
  // document edge on both sides). Without the isolation check, consecutive
  // short lines (like a list of objectives) all get misread as headings.
  // PDF text extraction usually yields no blank lines at all, in that case
  // isolation is unknowable, so the check is skipped and the original
  // short-line heuristic stands alone (accepted, documented limitation).
  // Drop pdf page-separator artifacts together with the blank lines that
  // surround them, so those synthetic blanks don't get mistaken for real
  // document structure (they'd otherwise force the isolation check onto
  // PDFs whose actual text has no blank lines at all).
  const allLines = text.split(/\r?\n/).map((l) => l.trim());
  const drop = new Array<boolean>(allLines.length).fill(false);
  for (let j = 0; j < allLines.length; j++) {
    if (!PDF_ARTIFACT_RE.test(allLines[j])) continue;
    drop[j] = true;
    for (let k = j - 1; k >= 0 && allLines[k].length === 0; k--) drop[k] = true;
    for (let k = j + 1; k < allLines.length && allLines[k].length === 0; k++) drop[k] = true;
  }
  const rawLines = allLines.filter((_, j) => !drop[j]);
  // Trim blank lines at the edges so only interior blank lines count as
  // document structure.
  while (rawLines.length > 0 && rawLines[0].length === 0) rawLines.shift();
  while (rawLines.length > 0 && rawLines[rawLines.length - 1].length === 0) rawLines.pop();
  const hasBlankLines = rawLines.some((l) => l.length === 0);
  const blocks: Block[] = [];
  let sawFirstHeading = false;
  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx];
    if (line.length === 0) continue;
    const prevBlank = idx === 0 || rawLines[idx - 1].length === 0;
    const nextBlank = idx === rawLines.length - 1 || rawLines[idx + 1].length === 0;
    // Quiz-format lines are never headings, regardless of length or punctuation,
    // this is checked before the generic heuristic below.
    const looksLikeHeading =
      (!hasBlankLines || (prevBlank && nextBlank)) &&
      !QUIZ_LINE_RE.test(line) &&
      line.length <= 70 &&
      !/[.,:;!]$/.test(line) &&
      !/^[-•*]/.test(line) &&
      !YOUTUBE_RE.test(line);
    if (looksLikeHeading) {
      blocks.push({ level: sawFirstHeading ? "h2" : "h1", text: line });
      sawFirstHeading = true;
    } else {
      blocks.push({ level: "p", text: line });
    }
  }
  return blocks;
}

async function blocksFromPdf(buffer: Buffer): Promise<Block[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return blocksFromPlainText(result.text);
  } finally {
    await parser.destroy();
  }
}

// ─── Step 2: parse the "Q: / A) / ANSWER:" quiz block ──────────────────────

function parseQuizText(text: string, warnings: string[]): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  // Split on each "Q:" line rather than blank lines: blank lines are
  // stripped when blocks are extracted (both docx and plain text), so
  // splitting on them would silently merge every question into one chunk
  // and drop all but the first.
  const chunks = text.split(/\n(?=Q:)/i).map((c) => c.trim()).filter(Boolean);
  for (const chunk of chunks) {
    const qMatch = chunk.match(/^Q:\s*(.+)$/im);
    const aMatch = chunk.match(/^A\)\s*(.+)$/im);
    const bMatch = chunk.match(/^B\)\s*(.+)$/im);
    const cMatch = chunk.match(/^C\)\s*(.+)$/im);
    const dMatch = chunk.match(/^D\)\s*(.+)$/im);
    const ansMatch = chunk.match(/^ANSWER:\s*([ABCD])/im);
    if (qMatch && aMatch && bMatch && cMatch && dMatch && ansMatch) {
      questions.push({
        question: qMatch[1].trim(),
        option_a: aMatch[1].trim(),
        option_b: bMatch[1].trim(),
        option_c: cMatch[1].trim(),
        option_d: dMatch[1].trim(),
        correct_answer: ansMatch[1].toUpperCase() as "A" | "B" | "C" | "D",
      });
    } else if (chunk.length > 0) {
      warnings.push(`Couldn't parse a quiz question, expected "Q:", "A)" through "D)", and "ANSWER:": "${chunk.slice(0, 60)}..."`);
    }
  }
  return questions;
}

// ─── Step 3: walk the blocks and assemble the lesson ───────────────────────

export function assembleLesson(blocks: Block[], fallbackTitle: string): ParsedLesson {
  const warnings: string[] = [];
  let title = fallbackTitle;
  const objectives: string[] = [];
  const contentSections: ParsedContentSection[] = [];
  let questions: ParsedQuestion[] = [];

  let i = 0;
  if (blocks[0]?.level === "h1") {
    title = blocks[0].text;
    i = 1;
  }

  let currentHeading: string | null = null;
  let currentMode: "content" | "objectives" | "quiz" = "content";
  let currentBodyLines: string[] = [];
  let currentVideoUrl: string | undefined;
  let quizTextLines: string[] = [];

  function flushSection() {
    if (currentHeading === null) return;
    if (currentMode === "objectives") {
      objectives.push(...currentBodyLines.filter(Boolean));
    } else if (currentMode === "quiz") {
      // Append rather than assign: a document with two "Quiz" headings
      // should keep questions from both, not just the last one.
      questions.push(...parseQuizText(quizTextLines.join("\n"), warnings));
    } else {
      const body = currentBodyLines.filter(Boolean).join("\n\n");
      if (body || currentVideoUrl) {
        contentSections.push({ heading: currentHeading, body, ...(currentVideoUrl ? { video_url: currentVideoUrl } : {}) });
      }
    }
    currentBodyLines = [];
    currentVideoUrl = undefined;
    quizTextLines = [];
  }

  for (; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.level === "h1" || block.level === "h2") {
      flushSection();
      currentHeading = block.text;
      currentMode = OBJECTIVES_HEADING_RE.test(block.text)
        ? "objectives"
        : QUIZ_HEADING_RE.test(block.text)
        ? "quiz"
        : "content";
    } else {
      if (currentHeading === null) {
        // Text before any heading: treat as an untitled intro section.
        currentHeading = "Introduction";
        currentMode = "content";
      }
      if (currentMode === "quiz") {
        quizTextLines.push(block.text);
      } else if (currentMode === "content" && YOUTUBE_RE.test(block.text) && !currentVideoUrl) {
        currentVideoUrl = block.text;
      } else {
        currentBodyLines.push(block.text);
      }
    }
  }
  flushSection();

  if (contentSections.length === 0) {
    warnings.push("No content sections were detected. The document may not use headings the parser could recognize; review and add sections manually.");
  }
  if (objectives.length === 0) {
    warnings.push('No "Objectives" section was found. Add learning objectives manually before publishing.');
  }

  return { title, objectives, contentSections, questions, warnings };
}

export async function parseLessonDocument(buffer: Buffer, filename: string): Promise<ParsedLesson> {
  const ext = filename.toLowerCase().split(".").pop();
  const fallbackTitle = filename.replace(/\.(docx|pdf|txt)$/i, "");
  let blocks: Block[];
  if (ext === "docx") {
    blocks = await blocksFromDocx(buffer);
  } else if (ext === "pdf") {
    blocks = await blocksFromPdf(buffer);
  } else if (ext === "txt") {
    blocks = blocksFromPlainText(buffer.toString("utf-8"));
  } else {
    throw new Error(`Unsupported file type: .${ext}. Please upload a .docx, .pdf, or .txt file.`);
  }
  return assembleLesson(blocks, fallbackTitle);
}
