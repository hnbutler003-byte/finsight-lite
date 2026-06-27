---
name: executeSql vs app database split
description: The executeSql/code_execution SQL tool queries Replit's built-in Postgres, but the app reads/writes Supabase; data seeded via executeSql is invisible to the app.
---

# executeSql is NOT the app's database

The `executeSql` callback (and the Replit "database" tool) connects to Replit's
built-in PostgreSQL. The app connects to **Supabase** via `SUPABASE_DATABASE_URL`
(see replit.md). These are two separate stores.

**Why:** While verifying a teacher-dashboard feature, rows inserted into
`savings_goals` through executeSql never appeared in the app's teacher endpoint,
and the endpoint returned real goal data that executeSql could not see. The two
databases simply hold different data.

**How to apply:** To verify what the app actually reads or writes, exercise the
app's HTTP endpoints, not executeSql. The demo endpoints log you in without a
password: `POST /api/demo/login/teacher` and `POST /api/demo/login/student/:id`
(use a cookie jar). Reserve executeSql for the Replit built-in DB, which the app
does not use for domain data, so any test data seeded there must be cleaned up
separately and will not affect the running app.
