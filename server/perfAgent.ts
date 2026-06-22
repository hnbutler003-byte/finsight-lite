import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const SCAN_TARGETS = [
  {
    label: "Database Layer",
    file: "server/storage.ts",
    maxChars: 8000,
    focus: "N+1 queries, missing transactions, sequential awaits that could be Promise.all, inefficient lookups, missing pagination guards",
  },
  {
    label: "API Routes",
    file: "server/routes.ts",
    maxChars: 8000,
    focus: "missing try/catch around async ops, unhandled promise rejections, blocking synchronous operations, missing rate limiting on AI/heavy endpoints, repeated DB calls that could be batched",
  },
  {
    label: "Job Handlers",
    file: "server/jobHandlers.ts",
    maxChars: 8000,
    focus: "sequential awaits that should be parallel, missing error boundaries, idempotency gaps, large payloads stored in job table",
  },
  {
    label: "Database Schema",
    file: "shared/schema.ts",
    maxChars: 6000,
    focus: "missing indexes on columns used in WHERE/ORDER BY, inefficient column types, columns that should have NOT NULL, missing foreign key constraints",
  },
  {
    label: "Server Startup",
    file: "server/index.ts",
    maxChars: 4000,
    focus: "blocking startup operations, unguarded async schedulers, missing graceful shutdown, memory leaks from intervals without cleanup",
  },
  {
    label: "Admin Frontend",
    file: "client/src/pages/AdminDashboard.tsx",
    maxChars: 6000,
    focus: "missing useMemo/useCallback on expensive computations, components that re-render on every parent render, missing loading/error states, redundant query calls, large inline functions in JSX",
  },
];

interface Finding {
  file: string;
  line?: string;
  issue: string;
  fix: string;
  severity: "critical" | "warning" | "info";
}

interface Opportunity {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
}

interface FileResult {
  label: string;
  file: string;
  summary: string;
  findings: Finding[];
  opportunities: Opportunity[];
}

async function analyzeFile(target: (typeof SCAN_TARGETS)[0]): Promise<FileResult> {
  let content = "";
  try {
    const fullPath = path.resolve(process.cwd(), target.file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    content = raw.slice(0, target.maxChars);
    if (raw.length > target.maxChars) {
      content += `\n\n... [truncated, ${(raw.length - target.maxChars).toLocaleString()} more chars not shown]`;
    }
  } catch {
    return { label: target.label, file: target.file, summary: `Could not read file.`, findings: [], opportunities: [] };
  }

  const prompt = `You are a senior TypeScript/Node.js performance and reliability engineer reviewing code for FinSight Lite, a Caribbean financial literacy app for school-aged users.

Focus specifically on: ${target.focus}

Also check for:
- Missing try/catch around async operations
- Hardcoded values that should be environment config
- Sequential awaits that could run in parallel with Promise.all
- Memory leaks (uncleaned intervals, event listeners)
- Security gaps (missing auth checks, SQL injection risk, exposed sensitive data in logs)
- Dead or duplicate code

File: ${target.file}
\`\`\`typescript
${content}
\`\`\`

Respond with ONLY valid JSON, no markdown, no preamble, no trailing text:
{
  "summary": "2-3 sentences describing overall code quality and key concerns",
  "findings": [
    {
      "file": "${target.file}",
      "line": "line number or function name where issue lives",
      "issue": "clear description of the problem",
      "fix": "specific actionable fix with enough detail to implement",
      "severity": "critical|warning|info"
    }
  ],
  "opportunities": [
    {
      "title": "short noun-phrase title",
      "description": "specific improvement with expected impact",
      "impact": "high|medium|low"
    }
  ]
}

Rules: max 5 findings, max 3 opportunities. Only report real, specific issues, no vague advice. Be direct and practical.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "{}";
    const parsed = JSON.parse(text);
    return {
      label: target.label,
      file: target.file,
      summary: parsed.summary ?? "",
      findings: (parsed.findings ?? []).slice(0, 5),
      opportunities: (parsed.opportunities ?? []).slice(0, 3),
    };
  } catch (e: any) {
    return {
      label: target.label,
      file: target.file,
      summary: `Analysis failed: ${e.message}`,
      findings: [],
      opportunities: [],
    };
  }
}

function buildReport(results: FileResult[], startTime: number): string {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const criticals = results.flatMap(r => r.findings.filter(f => f.severity === "critical"));
  const warnings  = results.flatMap(r => r.findings.filter(f => f.severity === "warning"));
  const infos     = results.flatMap(r => r.findings.filter(f => f.severity === "info"));
  const opps      = results.flatMap(r => r.opportunities);

  let md = `# FinSight Lite: Performance & Reliability Scan
**Scanned:** ${new Date().toUTCString()}
**Duration:** ${elapsed}s | **Files:** ${results.length} | **Issues:** ${criticals.length} critical · ${warnings.length} warnings · ${infos.length} info

---

`;

  if (criticals.length > 0) {
    md += `## 🔴 Critical (${criticals.length})\n\n`;
    for (const f of criticals) {
      md += `### \`${f.file}\`${f.line ? `: ${f.line}` : ""}\n`;
      md += `**Issue:** ${f.issue}\n\n**Fix:** ${f.fix}\n\n---\n\n`;
    }
  }

  if (warnings.length > 0) {
    md += `## 🟡 Warnings (${warnings.length})\n\n`;
    for (const f of warnings) {
      md += `- **\`${f.file}\`${f.line ? ` (${f.line})` : ""}:** ${f.issue}\n  → *${f.fix}*\n`;
    }
    md += "\n";
  }

  if (infos.length > 0) {
    md += `## 🔵 Info / Tech Debt (${infos.length})\n\n`;
    for (const f of infos) {
      md += `- **\`${f.file}\`${f.line ? ` (${f.line})` : ""}:** ${f.issue}\n`;
    }
    md += "\n";
  }

  if (opps.length > 0) {
    md += `## 💡 Opportunities\n\n`;
    for (const o of opps) {
      const badge = o.impact === "high" ? "🔥 High" : o.impact === "medium" ? "⚡ Medium" : "📌 Low";
      md += `### ${o.title}: ${badge} Impact\n${o.description}\n\n`;
    }
  }

  md += `---\n\n## Per-File Summaries\n\n`;
  for (const r of results) {
    md += `### ${r.label} (\`${r.file}\`)\n${r.summary}\n\n`;
  }

  return md;
}

export interface PerfScanResult {
  reportFile: string;
  issueCount: number;
  criticalCount: number;
  warningCount: number;
  durationMs: number;
  filesScanned: number;
}

export async function runPerfScan(triggeredBy = "scheduler"): Promise<PerfScanResult> {
  const startTime = Date.now();
  console.log(`[PerfAgent] Starting scan (triggeredBy=${triggeredBy})`);

  const reportsDir = path.resolve(process.cwd(), "agent-reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const results = await Promise.all(SCAN_TARGETS.map(analyzeFile));

  const durationMs = Date.now() - startTime;
  const md = buildReport(results, startTime);

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `${ts}-scan.md`;
  fs.writeFileSync(path.join(reportsDir, fileName), md, "utf-8");

  const criticalCount = results.flatMap(r => r.findings.filter(f => f.severity === "critical")).length;
  const warningCount  = results.flatMap(r => r.findings.filter(f => f.severity === "warning")).length;
  const issueCount    = results.flatMap(r => r.findings).length;

  console.log(`[PerfAgent] ✓ Done in ${(durationMs / 1000).toFixed(1)}s → ${fileName} (${criticalCount} critical, ${warningCount} warnings)`);

  return { reportFile: fileName, issueCount, criticalCount, warningCount, durationMs, filesScanned: results.length };
}
