# FinSight Lite — Financial Literacy Learning Simulator

## Overview

FinSight Lite is a **financial literacy learning simulation** developed by FinSight Ltd. for school-aged users (12-17) in The Bahamas and the wider Caribbean. It combines practical money management tools (transactions, budgets, savings) with an **investment simulator** and structured **learning modules** to teach young people about money, saving, investing in stocks and bonds, and building a portfolio — all using virtual money with no real risk.

The app supports Caribbean currencies (BSD, JMD, TTD, BBD, XCD, GYD) with real-life regional examples such as Central Bank of The Bahamas Government Registered Stock, Bank of Jamaica Investment Notes, and Caribbean company stocks.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant), custom FinSight Lite design system
- **Design System**: Custom CSS classes in index.css — `.caribbean-bg` (animated gradient background), `.glass-card` / `.glass-card-heavy` / `.glass-card-coral` / `.glass-card-teal` (glassmorphism cards), `.glass-inset` / `.glass-inset-light` (inner panels), `.xp-pill` / `.badge-coral` / `.streak-badge` (gamification tokens), `.xp-bar-track` / `.xp-bar-fill` (XP progress bars), `.btn-coral` (accent button), `.rounded-glass` / `.rounded-inset` / `.rounded-badge` (Tailwind radius utilities), `animate-bounce-in` / `animate-pop-in` (entrance animations). Coral accent `hsl(15, 90%, 65%)` for gamification elements only. Student sidebar uses dark violet gradient. Teacher sidebar uses dark emerald gradient.
- **Charts**: Recharts for financial data visualization
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared/ for shared code)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ESM modules)
- **API Design**: RESTful endpoints defined in shared/routes.ts with Zod schemas for type-safe contracts
- **Authentication**: Dual auth system — Students use passwordless avatar-based auth; Teachers use email+password (bcryptjs hashing) with separate `req.session.teacherId` session key
- **Session Management**: Express sessions stored in PostgreSQL via connect-pg-simple

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Location**: shared/schema.ts contains all table definitions
- **Migrations**: Drizzle Kit for database migrations (drizzle-kit push)
- **File / Asset Storage**: Replit Object Storage (Google Cloud Storage under the hood). Org branding logos uploaded via POST `/api/org-admin/branding/logo` are written to the public bucket under `logos/<orgId>-<ts>-<rand>.<ext>` and served from `/public-objects/logos/<filename>`. The DB stores only the short public URL — no base64 blobs and no local-disk uploads. A 308 redirect from `/uploads/logos/*` → `/public-objects/logos/*` keeps any externally-bookmarked legacy URLs from a brief on-disk era working. A one-shot migration script `scripts/migrate-base64-logos.ts` rewrites any leftover `data:image/...` logos in the DB into object storage.

### Key Design Patterns
- **Shared Types**: The shared/ directory contains schema definitions and API route contracts used by both frontend and backend, ensuring type safety across the stack
- **Storage Pattern**: server/storage.ts implements IStorage interface abstracting all database operations
- **Protected Routes**: Frontend uses ProtectedRoute component; backend uses isAuthenticated middleware
- **Error Handling**: Standardized error schemas in shared/routes.ts for consistent API responses

### Database Schema
Core tables include:
- **users**: User accounts (username + avatar, no passwords)
- **sessions**: Session storage for authentication
- **categories**: Transaction categories (system-wide or user-specific)
- **transactions**: Financial transactions with amount, date, category, and currency
- **budgets**: User-defined spending limits per category
- **linked_cards**: Optional card linking for future bank integration
- **document_uploads**: Bank statement upload tracking
- **savings_goals**: Savings targets with progress tracking
- **simulated_stocks**: Pre-seeded stocks and bonds for the investment simulator (name, ticker, type, description, price, currency, issuer, region, risk level, annual return)
- **portfolio_holdings**: User's simulated investment holdings (stockId, quantity, avgPurchasePrice)
- **portfolio_transactions**: Buy/sell history for simulated trades
- **learning_modules**: Educational content modules (title, slug, description, content, order)
- **user_learning_progress**: Tracks which modules each user has completed
- **user_virtual_balance**: Virtual cash balance for investment simulation (starts at $10,000)

### Investment Simulator (client/src/pages/InvestmentSimulator.tsx)
- Three-tab layout: Learn, Market, My Portfolio
- **Learn tab**: 6 educational modules covering money basics, saving, stocks, bonds, risk/reward, and portfolio building
  - Each module has detailed, kid-friendly content with real Caribbean examples
  - Content is **localized per currency** — switching currency changes all examples (banks, exchanges, companies, bonds) to match that region (client/src/data/learning-content.ts)
  - Supported regions: BSD (Bahamas), BBD (Barbados), JMD (Jamaica), TTD (Trinidad & Tobago), XCD (Eastern Caribbean), GYD (Guyana)
  - Progress tracking with completion marking
- **Market tab**: Browse simulated stocks and bonds filtered by currency
  - Stocks: Caribbean companies (Commonwealth Bank, GraceKennedy, Focol Holdings, etc.)
  - Bonds: Government bonds (Central Bank of Bahamas Registered Stock, Bank of Jamaica Notes, T&T Government Bonds, etc.)
  - Buy dialog with quantity selector and balance check
  - Risk level badges (low/medium/high) and expected annual returns
- **My Portfolio tab**: View holdings with gain/loss tracking, sell functionality, trade history
- Virtual cash balance displayed prominently (starts at $10,000 in selected currency)
- API endpoints: GET /api/investments/market, GET /api/investments/portfolio, POST /api/investments/buy, POST /api/investments/sell, GET /api/investments/history
- Learning API: GET /api/learn/modules, GET /api/learn/progress, POST /api/learn/complete/:moduleId

### Multi-Currency Support
- Dashboard converts all currencies to user-selected base currency using hardcoded pegged exchange rates to USD
- Exchange rates stored in EXCHANGE_RATES_TO_USD constant (BSD 1:1, BBD 0.5, JMD 0.0064, TTD 0.147, XCD 0.37, GYD 0.0048, HTG 0.0076)
- Investment simulator shows market data filtered by selected currency

### Spending Trends (client/src/pages/Trends.tsx)
- Month-over-month spending comparison charts using Recharts
- Spending alerts highlighting categories with 20%+ spending increases
- Budget comparison with progress bars showing actual vs budgeted amounts

### Savings Goals (client/src/pages/SavingsGoals.tsx)
- Users create savings targets with name, target amount, deadline, and currency
- Add savings incrementally via deposit button
- Visual progress bars and percentage tracking

### Money Insights (client/src/pages/Reports.tsx)
- Financial summary with income, expenses, net savings, savings rate, top categories, budget status
- AI-powered spending insights, currency insights, and regional news
- Period filtering: This Month, Last 3 Months, This Year, All Time
- Simplified teen-friendly language throughout

### Money Games (client/src/pages/MoneyGames.tsx)
- Seven interactive financial literacy games for kids:
  1. **Budget Grocery Challenge** (Easy): Given a random budget, pick grocery items from a virtual Caribbean store. Score based on how efficiently you use your budget.
  2. **Speed Investor** (Hard): 10 rounds with 10-second countdown timer per round. A stock and news headline appear, decide to Buy/Hold/Sell before time runs out (auto-Hold on timeout). Visual timer bar, points for correct decisions.
  3. **Savings Goal Planner** (Medium): Pick a savings goal, set a timeframe, then take a trade-off quiz to see if your daily choices can get you there.
  4. **Beat the Budget** (Medium): $100 weekly allowance, 6 spending options (needs/wants), surprise expense after shopping. Future Self Score 0-100 with feedback.
  5. **Compound It** (Easy): Visual compound interest simulator with weekly savings and years sliders, animated growth chart, shows contributed vs earned.
  6. **Needs vs Wants Speed Round** (Easy): 20 items flash on screen, 3 seconds to categorize as Need or Want, accuracy score and reflection questions at end.
  7. **Future Me** (Medium): 5 rounds of "money now vs more money later" decisions, teaches delayed gratification with explanations after each choice.
- All games are frontend-only (no backend needed), use the selected currency symbol
- Currency selector shared across all games

### Pages & Navigation
- `/` — My Money (unified dashboard: balance stats, spending chart, transactions list, AI tips, learning CTA)
- `/budgets` — Budgets
- `/trends` — Spending Trends
- `/savings` — Savings Goals
- `/invest` — Investment Simulator (Learn, Market, Portfolio)
- `/games` — Money Games (7 games)
- `/guide` — Money Guide (AI-powered financial mentor chatbot)
- `/moneylab` — MoneyLab hub (exam game platform)
- `/moneylab/upload` — Upload past exam papers (PDF/JPG/PNG)
- `/moneylab/play` — Play exam games (Quiz, Timed, Challenge modes)
- `/moneylab/tutor` — AI Tutor (streaming explanations for questions)
- `/moneylab/leaderboard` — Player leaderboard (all-time & weekly)

### MoneyLab (client/src/pages/MoneyLab*.tsx)
- Exam paper upload → AI extracts MCQ questions using GPT-4o (PDF via pdf-parse, images via GPT-4o vision)
- 3 game modes: Quiz (untimed), Timed Exam (30s/question), Challenge (streak+speed scoring)
- AI Tutor explains any question in simple, kid-friendly language (SSE streaming)
- XP system: base 10 XP per correct answer, mode multipliers, accuracy bonus
- Levels: every 100 XP = 1 level
- Streaks: daily play tracking, longest streak
- 11 achievement badges (first_game, ten_games, perfect_score, streak_3, streak_7, level_5, level_10, xp_500, xp_1000, challenge_win, speed_demon)
- Leaderboard: aggregate scores across all games, filterable by period (all-time, weekly)
- DB tables: exam_papers, extracted_questions, game_sessions, user_xp, user_badges
- Backend routes: POST /api/moneylab/upload, GET /api/moneylab/papers, GET /api/moneylab/papers/all, GET /api/moneylab/papers/:id, DELETE /api/moneylab/papers/:id, POST /api/moneylab/games/submit, GET /api/moneylab/xp, GET /api/moneylab/leaderboard, POST /api/moneylab/tutor/explain, GET /api/moneylab/history

### Money Guide AI (client/src/pages/MoneyGuide.tsx)
- AI-powered chat interface acting as a fun, Caribbean-infused financial mentor for kids 10-17
- Streams responses via SSE from POST /api/guide/chat endpoint
- System prompt creates a "fun older cousin" personality that teaches saving, budgeting, investing concepts
- Quick prompt buttons for common questions (saving, stocks, compound interest, needs vs wants, challenges)
- Chat history maintained in-session (not persisted to DB)
- Uses gpt-4o model via the existing OpenAI integration
- Disclaimer footer: "educational info only — not real financial advice"

### Teacher Dashboard (client/src/pages/Teacher*.tsx)
- Separate portal for teachers at /teacher/* routes (accessible without student auth)
- Auth: email + bcryptjs-hashed password; stores teacherId in session (separate from student userId)
- Teacher pages: TeacherLogin (/teacher/login), TeacherRegister (/teacher/register), TeacherDashboard (/teacher/dashboard), TeacherClassDetail (/teacher/classes/:id)
- TeacherSidebar: emerald/teal gradient; links to Dashboard, My Classes; shows teacher name/school; logout
- Classroom management: create classes → auto-generated 6-char code (e.g. "AB12CD"); students join via code from student sidebar "Join a Class" button
- Student progress tracking: aggregates XP, lessons, games, badges, avg score per enrolled student
- Class detail tabs: Students | Leaderboard | Challenges | Notifications | Analytics
- Challenges: create quiz/savings/investment/budget challenges with start/end dates and optional target value
- Notifications: send announcements/reminders/congratulations to class
- Reports: CSV download of class progress (GET /api/teacher/classes/:id/report.csv)
- Analytics: avg score, lesson completion, engagement rate, top 3 students
- Sponsor banner: displays "Financial Literacy powered by [SponsorName]" when set
- Student side: "Join Class" button in sidebar → modal with code entry → POST /api/student/join-class
- DB tables: teachers, classes, class_enrollments, challenges, class_notifications
- Teacher routes: /api/teacher/auth/*, /api/teacher/classes/*, /api/teacher/challenges/*, /api/teacher/notifications/*
- Student routes: POST /api/student/join-class, GET /api/student/classes, GET /api/student/classes/:id/notifications
- isTeacher middleware: checks req.session.teacherId

### Founder Admin Dashboard (client/src/pages/Admin*.tsx)
- Separate portal at /admin and /admin/login (accessible without any user auth)
- Auth: checks email + password against ADMIN_EMAIL/ADMIN_PASSWORD env vars (defaults: admin@finsightlite.com / admin123); stores req.session.isAdmin = true
- isAdmin middleware: checks req.session.isAdmin
- New DB tables: schools (id, name, country, city, website), sponsors (id, name, type, contactName, contactEmail, website, country)
- 9-tab dashboard with global search bar (slate/indigo dark theme):
  - Overview: 8 metric cards + 3 recharts (student growth line, games/week bar, most active schools horizontal bar)
  - Schools: full CRUD table (add, edit, delete, CSV download)
  - Teachers: read-only table (name, email, school, class count, student count, CSV)
  - Students: read-only table (name, class, school, teacher, lessons, quiz score, XP, level, CSV)
  - Classes: read-only table (name, code, teacher, school, enrollment, challenges, CSV)
  - Sponsors: full CRUD table (add, edit, delete, CSV download)
  - Challenges: read-only table (all challenges across all classes)
  - Reports: 5 CSV download cards (students, teachers, classes, schools, sponsors)
  - DB Viewer: raw spreadsheet view of any DB table (12 tables, 500-row limit)
- Global search: queries /api/admin/search?q=... across students, teachers, classes, schools, sponsors — results shown in dropdown with color-coded type badges
- All data tables: client-side search, sort (any column), pagination (15 rows/page)
- Admin routes: /api/admin/auth/*, /api/admin/overview, /api/admin/students, /api/admin/teachers, /api/admin/classes, /api/admin/challenges, /api/admin/search, /api/admin/charts/*, /api/admin/schools/*, /api/admin/sponsors/*, /api/admin/db/:table, /api/admin/reports/:type.csv
- Org-Teacher bridge: PATCH /api/admin/teachers/:id/org-link, PATCH /api/admin/classes/:id/org-link, GET /api/admin/org-envs (flat list of all envs with org_name)
- Teacher org lessons route: GET /api/teacher/classes/:id/lessons (returns published org lessons for the class's linked env)

## External Dependencies

### Authentication
- **Passwordless Auth**: Avatar-based registration (server/replit_integrations/auth/)
  - Registration: POST /api/auth/register `{ name, avatar }` → auto-generates username like `Name_XXXX`
  - Resume session: POST /api/auth/resume `{ username }` → logs returning students back in by username
  - Current user: GET /api/auth/user
  - Logout: POST /api/auth/logout
  - 12 avatar options: lion, dolphin, parrot, turtle, star, butterfly, octopus, artist, rocket, wave, palm, gamer
- **Entry Flow (client/src/pages/Auth.tsx)**: Redesigned multi-step decision layer
  1. **Entry Screen**: 3 buttons — "I'm a Student" / "I'm a Teacher" / "Continue as Guest"
  2. **Student path**: → Student Access screen → Enter Class Code (validates via GET /api/classes/check-code/:code) → Name → Avatar → Welcome (auto-joins class after register)
  3. **Student resume path**: → Student Access screen → Continue Previous Session → Enter username → resume endpoint logs them in
  4. **Teacher path**: → redirects directly to /teacher/login
  5. **Guest path**: → Name → Avatar → Welcome (no class code needed)
- Requires SESSION_SECRET environment variable (optional, has fallback)

### Database
- **PostgreSQL (Replit)**: Primary data store for all student/teacher/transaction data
- Requires DATABASE_URL environment variable
- Uses connect-pg-simple for session storage
- **Supabase (secondary)**: Hosts organizations, environments, leaderboard snapshots, and analytics events
  - Connected via HTTPS using the Supabase JS client (direct Postgres TCP blocked by Replit network)
  - Requires SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY secrets
  - Server module: server/supabase.ts
  - Tables (create via Supabase SQL editor): organizations, org_environments (has join_code UNIQUE column — run `ALTER TABLE org_environments ADD COLUMN IF NOT EXISTS join_code text UNIQUE;` if upgrading), org_students, leaderboard_snapshots, analytics_events, lesson_plans, lesson_quiz_questions
  - Admin API routes: /api/admin/organizations/*, /api/admin/leaderboard, /api/supabase/status
  - Student org join API routes: GET /api/org/join/preview?code=, POST /api/org/join
  - Student API routes: /api/leaderboard/snapshot, /api/analytics/event
  - join_code: auto-generated 6-char alphanumeric (no ambiguous chars) per org_environment; shown in AdminDashboard env cards with copy button; students use "Join an Organization" modal in Sidebar

### Frontend Libraries
- **@radix-ui/***: Accessible UI primitives for shadcn/ui components
- **@tanstack/react-query**: Server state management
- **recharts**: Data visualization
- **date-fns**: Date formatting and manipulation
- **lucide-react**: Icon library

### Development Tools
- **Vite**: Frontend build and development server
- **esbuild**: Production server bundling (script/build.ts)
- **drizzle-kit**: Database schema management
