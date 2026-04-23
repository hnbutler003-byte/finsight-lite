# Uptime monitoring for FinSight Lite

This project ships with two complementary health-check mechanisms:

## 1. In-process child-worker (default)

When the server boots, `server/index.ts` forks
`scripts/uptime-worker.js` as an INDEPENDENT Node child process. The
worker pings `/healthz` once per minute and emails alerts via Resend
after three consecutive failures (with a 30-minute cooldown).

Required environment variables:

- `ALERT_EMAIL` — recipient for alert emails
- `RESEND_API_KEY` — Resend API key
- `RESEND_FROM` — verified Resend sender (defaults to the Resend
  onboarding sender)
- `HEALTHCHECK_URL` — full URL to ping; defaults to
  `http://127.0.0.1:$PORT/healthz` for in-container checks
- `HEALTHCHECK_INTERVAL_MS` — override the 60-second interval
- `DISABLE_UPTIME_WORKER=1` — disable the in-process worker (use
  this in production if you rely solely on an external scheduler)

The worker is auto-respawned 30 seconds after any exit so a transient
crash does not silently disable monitoring.

## 2. External scheduler (recommended for production)

Because an in-process worker cannot detect a full container outage,
production deployments should ALSO run the uptime check from outside
the deployment. The same script supports a `--oneshot` mode that
performs a single ping/alert cycle and exits, which is suitable for
cron-style runners (e.g. **Replit Scheduled Deployments**).

### Replit Scheduled Deployment setup

1. In the Replit workspace, open the Deployments pane and create a
   new **Scheduled Deployment**.
2. Set the schedule to `*/5 * * * *` (every 5 minutes, or as desired).
3. Run command: `node scripts/uptime-worker.js --oneshot`
4. Configure the same `ALERT_EMAIL`, `RESEND_API_KEY`,
   `RESEND_FROM`, and `HEALTHCHECK_URL` (point this at your public
   `https://<your-app>.replit.app/healthz`) as deployment secrets.
5. Set `DISABLE_UPTIME_WORKER=1` on the main app deployment so the
   in-process worker doesn't double up with the scheduled one.

### Generic cron / external monitor

Any external uptime monitor (UptimeRobot, BetterStack, k8s liveness
probes, GitHub Actions cron) can hit `/healthz` directly — it
returns `200 {"ok":true,"ts":...}` on healthy and a non-2xx response
when the database is unreachable.
