# FinSight Lite

FinSight Lite is a financial literacy learning simulator that teaches school-aged users about money, saving, and investing using virtual money.

## Run & Operate

*   **Run Dev Server:** `npm run dev`
*   **Build Client:** `npm run build:client`
*   **Build Server:** `npm run build:server`
*   **Typecheck:** `npm run typecheck`
*   **Generate Drizzle Kit Migrations:** `drizzle-kit generate:pg`
*   **Push DB Schema:** `drizzle-kit push:pg`

**Required Environment Variables:**
*   `SESSION_SECRET` (for Express sessions)
*   `SUPABASE_DATABASE_URL` (primary PostgreSQL connection string — points to Supabase). `DATABASE_URL` is accepted as a fallback but should not be relied upon; Replit may point it at an internal host.
*   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (for Supabase integration)
*   `ADMIN_EMAIL`, `ADMIN_PASSWORD` (for Founder Admin Dashboard)
*   `AI_PURGE_OLDER_THAN_DAYS` (optional, default 180) — how far back the monthly auto-purge of `ai_usage_events` retains records
*   `RESEND_FROM_EMAIL` (required in production) — the verified custom-domain FROM address for all outgoing emails, e.g. `FinSight Lite <noreply@finsight-ltd.com>`. Without this, emails send from the shared Resend sandbox address which school spam filters may block. Must be a domain verified in your Resend account with SPF/DKIM/DMARC DNS records.

## Stack

*   **Frontend:** React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, shadcn/ui, Recharts, React Hook Form, Zod
*   **Backend:** Node.js, Express.js, TypeScript
*   **Database:** PostgreSQL, Drizzle ORM
*   **Build Tool:** Vite (client), esbuild (server)
*   **Runtime:** Node.js
*   **Deployment:** Replit Autoscale (min 0 replicas, max 5) — scales to zero when idle, spins up additional instances under load. Sessions are stored in PostgreSQL so they survive across instances.

## Where things live

*   `/client`: Frontend source code
*   `/server`: Backend source code
*   `/shared`: Shared types, schemas, and API contracts (source of truth for API)
*   `shared/schema.ts`: Database schema definition (source of truth for DB)
*   `shared/routes.ts`: API route definitions and Zod schemas (source of truth for API contracts)
*   `client/src/index.css`: Custom FinSight Lite design system (source of truth for theme)
*   `client/src/data/learning-content.ts`: Localized learning module content
*   `server/storage.ts`: Database operation abstraction
*   `server/replit_integrations/auth/`: Passwordless avatar-based authentication

## Architecture decisions

*   **Shared Type System:** `shared/` directory ensures type safety across frontend and backend with Drizzle ORM and Zod for API contracts.
*   **Multi-Auth Strategy:** Separate authentication flows for students (passwordless avatar-based), teachers (email/password with separate session key), and founder admins (hardcoded env vars).
*   **External Data Storage:** Replit Object Storage for public assets (logos), Supabase for organizational data, leaderboard snapshots, and analytics events to offload specific data types and leverage external capabilities.
*   **Gamification & Learning Modules:** All learning content and game logic are primarily frontend-driven (except for MoneyLab's AI features and progress tracking) to ensure responsiveness and minimize server load for interactive elements.
*   **Regional Localization:** Investment simulator and learning modules are deeply localized by currency, with real-life Caribbean examples dynamically loaded based on the user's selected region.

## Product

*   **Financial Literacy Simulation:** Users manage virtual money, track transactions, set budgets, and save.
*   **Investment Simulator:** Learn about stocks and bonds in a risk-free environment with Caribbean-specific examples.
*   **Learning Modules:** Structured educational content on money management and investing.
*   **Money Games:** Interactive games to reinforce financial concepts.
*   **MoneyLab:** Upload exam papers, play AI-generated quizzes, and get AI explanations.
*   **Money Guide AI:** Chatbot mentor providing financial advice.
*   **Teacher Dashboard:** Classroom management, student progress tracking, challenge creation.
*   **Founder Admin Dashboard:** Global oversight, school/sponsor management, reporting.

## User preferences

Preferred communication style: Simple, everyday language.

## Gotchas

*   Always run `drizzle-kit generate:pg` after schema changes and `drizzle-kit push:pg` to apply migrations.
*   `SESSION_SECRET` and `DATABASE_URL` are critical for core functionality.
*   Supabase integration requires correct `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` to be set.
*   Teacher login uses `bcryptjs` hashing; student login is passwordless.
*   Legacy logo URLs (`/uploads/logos/*`) are 308 redirected to `/public-objects/logos/*`.
*   **Contrast rule (light & dark mode):** `caribbean-bg` is always dark — use `text-white`. `glass-card`/`glass-card-teal`/`glass-card-coral` adapt between light and dark — always use `text-foreground` (semantic token) inside them. Never hardcode `text-gray-800`, `text-teal-900`, `text-blue-900`, etc. — they vanish in dark mode. Tinted labels must always pair a dark variant: `text-teal-800 dark:text-teal-200`. Coloured badges must include both `bg-X-100 text-X-700` and `dark:bg-X-900/40 dark:text-X-300`. Full rules are in the comment block at the top of `client/src/index.css`.

## Pointers

*   [React Query Documentation](https://tanstack.com/query/latest)
*   [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview/introduction)
*   [Tailwind CSS Documentation](https://tailwindcss.com/docs)
*   [shadcn/ui Documentation](https://ui.shadcn.com/)
*   [Recharts Documentation](https://recharts.org/en-US/)
*   [Wouter Documentation](https://docs.wouter.com/)
*   [Supabase Documentation](https://supabase.com/docs)
*   [Replit Object Storage](https://docs.replit.com/hosting/object-storage)