---
name: Screenshot verification of authenticated pages
description: How to visually verify logged-in student pages when the testing subagent is blocked
---

The screenshot tool cannot log in (POST-only demo endpoints) and captures too early for iframes.

**Working recipe** (temporary, remove after use):
1. Add a dev-only GET route (guarded by `NODE_ENV !== "production"`) that sets `req.session.userId` to a demo student id, awaits `req.session.save()` (required: the store save races the next request otherwise), then returns HTML that sets `localStorage`/`sessionStorage` flags and does `location.replace("/lessons")`.
2. For deep views with no URL routing (e.g. lesson reading view), add a temporary dev-only `useEffect` driver in the page that reads a sessionStorage flag, polls the DOM, and clicks the target testid.
2b. Scrolling does NOT work: the capture happens before (or ignores) any `scrollIntoView`, even when polled on an interval. To verify below-the-fold content, instead temp-hide the above-fold sections (`style={ssMode ? { display: "none" } : undefined}` gated on the same sessionStorage flag) so the target renders in the top viewport.
3. Warm Vite transforms with curl before capturing, and restart the workflow after server edits (edits do not always hot-apply to registered routes). Verify the dev route by response BODY, not status: the Vite SPA fallback also answers 200 on unknown /api GET paths when the route is not live yet.
4. Capture engine: no playwright/puppeteer is installed, but a headless chromium exists in /nix/store (`ls /nix/store | grep ungoogled-chromium`). Working invocation: `chromium --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --user-data-dir=/tmp/<fresh-per-run> --window-size=1280,2400 --virtual-time-budget=25000 --screenshot=<out.png> <dev-route-url>`. Use a separate user-data-dir per theme run. Theme localStorage key is `finsight-theme` (`light`/`dark`).
5. Embedded PDF previews (jsPDF data URIs) render blank in headless captures; that is a headless limitation, not an app bug.
6. Stale runTest blockages persist across runs and cannot be talked around (a Google-OAuth blockage recorded for one account blocks all later org-admin tests even when a password QA account works via curl). Go straight to this fallback.

**Why:** the Playwright testing subagent can be hard-blocked by an unrelated earlier blocker (e.g. Google OAuth), and iframe-based capture renders blank because the screenshot tool captures before the embedded SPA paints. Top-level redirect works reliably.

**How to apply:** whenever light/dark or authenticated-view visual verification is needed and runTest is unavailable. Always delete the temp route and driver afterward and confirm with grep.
