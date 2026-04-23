#!/usr/bin/env node
// External uptime worker — runs as an independent child process so a hard
// crash of the main server does not also kill the monitor. Pings /healthz
// every minute. After 3 consecutive failures, sends an email alert (gated
// by ALERT_EMAIL + RESEND_API_KEY). This script is also safe to run from
// an external scheduled deployment (e.g. Replit Scheduled Deployment).

import { setTimeout as sleep } from "node:timers/promises";

const URL = process.env.HEALTHCHECK_URL || `http://127.0.0.1:${process.env.PORT || "5000"}/healthz`;
const ALERT_EMAIL = process.env.ALERT_EMAIL || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.RESEND_FROM || "FinSight Lite <onboarding@resend.dev>";
const INTERVAL_MS = parseInt(process.env.HEALTHCHECK_INTERVAL_MS || "60000", 10);
const FAIL_THRESHOLD = 3;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

let consecutiveFailures = 0;
let lastAlertAt = 0;

async function sendAlert(reason) {
  if (!ALERT_EMAIL || !RESEND_API_KEY) {
    console.warn(`[uptime-worker] would alert (${reason}) but ALERT_EMAIL or RESEND_API_KEY not set`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [ALERT_EMAIL],
        subject: `[FinSight] Healthz failing — ${reason}`,
        html: `<p>FinSight Lite /healthz check failed: <strong>${reason}</strong>.</p><p>URL: ${URL}</p>`,
      }),
    });
    if (!res.ok) {
      console.warn(`[uptime-worker] alert email failed: ${res.status}`);
    } else {
      console.log(`[uptime-worker] alert email sent to ${ALERT_EMAIL}`);
    }
  } catch (e) {
    console.warn(`[uptime-worker] alert send error: ${e?.message}`);
  }
}

async function ping() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(URL, { signal: ctrl.signal });
    if (r.ok) {
      if (consecutiveFailures > 0) console.log(`[uptime-worker] recovered after ${consecutiveFailures} failures`);
      consecutiveFailures = 0;
      return;
    }
    consecutiveFailures++;
    console.warn(`[uptime-worker] healthz ${r.status} (consecutive=${consecutiveFailures})`);
  } catch (e) {
    consecutiveFailures++;
    console.warn(`[uptime-worker] healthz unreachable (consecutive=${consecutiveFailures}): ${e?.message}`);
  } finally {
    clearTimeout(t);
  }
  // In oneshot mode the in-memory counter cannot accumulate across runs (the
  // process exits after a single ping), so any failure should immediately
  // trigger an alert. The external scheduler is responsible for the
  // schedule/cooldown semantics (e.g. running every 5 minutes).
  const shouldAlert = ONESHOT
    ? consecutiveFailures > 0
    : consecutiveFailures >= FAIL_THRESHOLD && Date.now() - lastAlertAt > ALERT_COOLDOWN_MS;
  if (shouldAlert) {
    lastAlertAt = Date.now();
    await sendAlert(ONESHOT ? "oneshot ping failed" : `${consecutiveFailures} consecutive failures`);
  }
  return consecutiveFailures === 0;
}

const ONESHOT = process.argv.includes("--oneshot");

(async () => {
  if (ONESHOT) {
    const ok = await ping();
    process.exit(ok ? 0 : 1);
  }
  console.log(`[uptime-worker] starting; URL=${URL}, interval=${INTERVAL_MS}ms`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await ping();
    await sleep(INTERVAL_MS);
  }
})();
