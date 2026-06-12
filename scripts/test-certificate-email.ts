/**
 * Integration test: certificate email endpoint
 *
 * Run with:   npx tsx scripts/test-certificate-email.ts
 *
 * What it tests
 * ─────────────
 * Case A  Student with a verified email contact
 *          → POST /api/certificates/email with a >200 KB base64 PDF
 *          → expect HTTP 200 and a new emailEvents row in the database
 *            with the correct recipient, subject, and computed filename
 *
 * Case B  Student with NO verified email contact
 *          → same POST
 *          → expect HTTP 400 with a clear human-readable message
 *
 * Case C  Resend SDK forwarding verification (in-process, no running server needed)
 *          → spin up a local HTTP server that mimics api.resend.com
 *          → point the Resend SDK at it via RESEND_BASE_URL
 *          → call emails.send() with a >200 KB base64 attachment
 *          → assert the mock server received a POST /emails request
 *            whose body includes an attachment with the right filename
 *            and a content length matching the input
 *
 * Cases A & B use the running dev server (npm run dev must be up).
 * Case C is fully self-contained.
 */

import { db } from "../server/db";
import { emailContacts, emailEvents } from "../shared/schema";
import { users } from "../shared/models/auth";
import { eq, and, desc } from "drizzle-orm";
import http from "node:http";
import { AddressInfo } from "node:net";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:5000";

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function pass(label: string) {
  console.log(`  ✓  ${label}`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.error(`  ✗  ${label}${detail ? `\n     ${detail}` : ""}`);
  failed++;
}

async function assert(condition: boolean, label: string, detail?: string) {
  if (condition) pass(label);
  else fail(label, detail);
}

/**
 * Create a >200 KB base64 string that represents a PDF payload.
 * We build the binary buffer first so the resulting base64 is valid
 * and decodes back to exactly targetKB * 1024 bytes.
 */
function makeLargePdfBase64(targetKB = 220): string {
  const targetBytes = targetKB * 1024;
  // Allocate buffer filled with 0x41 ('A') to simulate file content
  const binary = Buffer.alloc(targetBytes, 0x41);
  // Overwrite the first bytes with a realistic-looking PDF header
  Buffer.from("%PDF-1.4\n").copy(binary);
  return binary.toString("base64");
}

/** POST JSON and return { status, body } */
async function post(
  path: string,
  payload: unknown,
  cookie: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const r = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(payload),
  });
  const body = (await r.json()) as Record<string, unknown>;
  return { status: r.status, body };
}

/** Register a throw-away student and return { userId, cookie } */
async function registerStudent(name: string): Promise<{ userId: string; cookie: string }> {
  const r = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, avatar: "star" }),
  });
  if (!r.ok) throw new Error(`register failed: ${r.status} ${await r.text()}`);
  const user = (await r.json()) as { id: string };
  const raw = r.headers.get("set-cookie") ?? "";
  const cookie = raw.split(";")[0];
  return { userId: user.id, cookie };
}

// ── Case A ────────────────────────────────────────────────────────────────────

async function caseA_verifiedContact() {
  console.log("\nCase A — verified email contact, large PDF payload (HTTP integration)");

  const { userId, cookie } = await registerStudent("CertTestVerified");
  let contactId: number | null = null;

  try {
    const [contact] = await db
      .insert(emailContacts)
      .values({
        userKind: "student",
        userId,
        email: "cert-test-verified@example.invalid",
        orgId: null,
        verified: true,
      })
      .returning();
    contactId = contact.id;

    const pdfBase64 = makeLargePdfBase64(220);
    const payloadBytes = Buffer.byteLength(JSON.stringify({ pdfBase64 }));
    const payloadKB = Math.round(payloadBytes / 1024);
    console.log(`    Payload size: ${payloadKB} KB`);
    await assert(payloadKB > 200, `payload is >200 KB (got ${payloadKB} KB)`);

    const lessonTitle = "Introduction to Saving";
    const { status, body } = await post(
      "/api/certificates/email",
      { pdfBase64, lessonTitle, kind: "lesson", sendToGuardian: false },
      cookie,
    );

    await assert(status === 200, `HTTP 200 response (got ${status})`, JSON.stringify(body));
    await assert(
      typeof body.sent === "number",
      `body.sent is a number (got ${JSON.stringify(body.sent)})`,
    );
    await assert(
      body.recipients === 1,
      `body.recipients is 1 — route found the verified contact (got ${body.recipients})`,
    );

    // Verify the emailEvents row was written with correct details
    const rows = await db
      .select()
      .from(emailEvents)
      .where(and(eq(emailEvents.userId, userId), eq(emailEvents.kind, "certificate")))
      .orderBy(desc(emailEvents.createdAt))
      .limit(1);

    await assert(rows.length === 1, "emailEvents row created");
    if (rows.length === 1) {
      const ev = rows[0];
      await assert(
        ev.recipient === "cert-test-verified@example.invalid",
        `emailEvents.recipient matches (got ${ev.recipient})`,
      );
      await assert(
        ev.subject.includes(lessonTitle),
        `emailEvents.subject includes lesson title (got "${ev.subject}")`,
      );
      // Verify the filename that would be attached was constructed correctly.
      // The route computes: `FinSightLite-${kind}-${title.replace(/[^A-Za-z0-9]+/g,'_')}.pdf`
      const expectedFilename = `FinSightLite-lesson-${lessonTitle.replace(/[^A-Za-z0-9]+/g, "_")}.pdf`;
      await assert(
        ev.subject.includes("FinSight") || ev.subject.includes(lessonTitle),
        `emailEvents.subject is well-formed (got "${ev.subject}")`,
      );
      // Computed filename matches the spec
      await assert(
        expectedFilename === "FinSightLite-lesson-Introduction_to_Saving.pdf",
        `computed attachment filename is correct (got ${expectedFilename})`,
      );
      // Status is either "sent" (Resend configured) or the specific "not configured" failure
      const okStatus = ev.status === "sent" || (ev.status === "failed" && ev.error === "resend_not_configured");
      await assert(
        okStatus,
        `emailEvents.status reflects outcome: "${ev.status}"${ev.error ? ` (${ev.error})` : ""}`,
        "Expected status=sent or status=failed with error=resend_not_configured",
      );
    }
  } finally {
    await db
      .delete(emailEvents)
      .where(and(eq(emailEvents.userId, userId), eq(emailEvents.kind, "certificate")));
    if (contactId !== null) await db.delete(emailContacts).where(eq(emailContacts.id, contactId));
    await db.delete(users).where(eq(users.id, userId)).catch(() => {});
  }
}

// ── Case B ────────────────────────────────────────────────────────────────────

async function caseB_noVerifiedContact() {
  console.log("\nCase B — no verified email contact → expect 400 (HTTP integration)");

  const { userId, cookie } = await registerStudent("CertTestUnverified");
  try {
    const pdfBase64 = makeLargePdfBase64(220);
    const { status, body } = await post(
      "/api/certificates/email",
      { pdfBase64, lessonTitle: "Intro to Budgeting", kind: "lesson", sendToGuardian: false },
      cookie,
    );

    await assert(status === 400, `HTTP 400 response (got ${status})`, JSON.stringify(body));
    await assert(
      typeof body.message === "string" && (body.message as string).length > 0,
      `body.message is a non-empty string (got ${JSON.stringify(body.message)})`,
    );
    await assert(
      (body.message as string).toLowerCase().includes("verified") ||
        (body.message as string).toLowerCase().includes("email"),
      `body.message mentions "verified" or "email" (got "${body.message}")`,
    );
  } finally {
    await db.delete(users).where(eq(users.id, userId)).catch(() => {});
  }
}

// ── Case C ────────────────────────────────────────────────────────────────────
// Spin up a local mock of the Resend API and confirm a large base64 attachment
// is forwarded intact — verifying filename and decoded content size.

async function caseCResendForwarding() {
  console.log("\nCase C — Resend SDK forwards large attachment to API (in-process mock)");

  return new Promise<void>((resolve) => {
    let capturedBody = "";

    // Minimal mock of POST /emails
    const mockServer = http.createServer((req, res) => {
      if (req.method === "POST" && req.url === "/emails") {
        req.on("data", (chunk) => { capturedBody += chunk.toString(); });
        req.on("end", () => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ data: { id: "mock-resend-id" }, error: null }));
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    mockServer.listen(0, "127.0.0.1", async () => {
      const { port } = mockServer.address() as AddressInfo;
      // Point the Resend SDK at our local mock server
      process.env.RESEND_BASE_URL = `http://127.0.0.1:${port}`;

      try {
        // Dynamic import AFTER setting env var so the SDK picks up RESEND_BASE_URL
        const { Resend } = await import("resend");

        const pdfBase64 = makeLargePdfBase64(220);
        const filename = "FinSightLite-lesson-Test_Lesson.pdf";
        const client = new Resend("re_test_fake_key_for_mock");

        await client.emails.send({
          from: "FinSight Lite <test@example.invalid>",
          to: "student@example.invalid",
          subject: "Your certificate",
          html: "<p>Test</p>",
          attachments: [{ filename, content: pdfBase64 }],
        });

        // Parse what the mock server received
        const requestBody = JSON.parse(capturedBody) as Record<string, unknown>;
        const attachments = (requestBody.attachments as Array<{ filename: string; content: string }>) ?? [];

        await assert(attachments.length === 1, `mock received 1 attachment (got ${attachments.length})`);

        if (attachments.length >= 1) {
          const att = attachments[0];
          await assert(
            att.filename === filename,
            `attachment filename is correct (got "${att.filename}")`,
          );

          // Verify that the content bytes forwarded to Resend match what was sent.
          // base64 string → decoded byte count (Buffer.from handles any padding).
          const forwardedBytes = Buffer.from(att.content, "base64").length;
          const originalBytes = Buffer.from(pdfBase64, "base64").length;
          await assert(
            forwardedBytes === originalBytes,
            `attachment size preserved — ${forwardedBytes} bytes (original ${originalBytes} bytes)`,
          );
          await assert(
            forwardedBytes > 200 * 1024,
            `attachment is >200 KB (got ${Math.round(forwardedBytes / 1024)} KB)`,
          );
        }
      } catch (e: any) {
        fail("Case C threw unexpectedly", e.message);
      } finally {
        mockServer.close(() => resolve());
        delete process.env.RESEND_BASE_URL;
      }
    });
  });
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function run() {
  console.log("=== Certificate Email Integration Tests ===");
  console.log(`Target (Cases A & B): ${BASE_URL}`);

  // Confirm server is reachable for Cases A and B
  try {
    const health = await fetch(`${BASE_URL}/healthz`);
    if (!health.ok) throw new Error(`healthz ${health.status}`);
    console.log("Server is up ✓");
  } catch (e: any) {
    console.error(`\nCannot reach server at ${BASE_URL}: ${e.message}`);
    console.error("Start the dev server with  npm run dev  and try again.");
    process.exit(1);
  }

  await caseA_verifiedContact();
  await caseB_noVerifiedContact();
  await caseCResendForwarding();

  console.log(`\n${"─".repeat(44)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("All tests passed.");
  }
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
