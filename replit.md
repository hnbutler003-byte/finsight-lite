# FinSight 360 — Financial Literacy Learning Simulator

## Overview

FinSight 360 is a **financial literacy learning simulation** developed by FinSight Ltd. for school-aged users (12-17) in The Bahamas and the wider Caribbean. It combines practical money management tools (transactions, budgets, savings) with an **investment simulator** and structured **learning modules** to teach young people about money, saving, investing in stocks and bonds, and building a portfolio — all using virtual money with no real risk.

The app supports Caribbean currencies (BSD, JMD, TTD, BBD, XCD, GYD) with real-life regional examples such as Central Bank of The Bahamas Government Registered Stock, Bank of Jamaica Investment Notes, and Caribbean company stocks.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Charts**: Recharts for financial data visualization
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared/ for shared code)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ESM modules)
- **API Design**: RESTful endpoints defined in shared/routes.ts with Zod schemas for type-safe contracts
- **Authentication**: Replit Auth integration using OpenID Connect (OIDC) with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL via connect-pg-simple

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Location**: shared/schema.ts contains all table definitions
- **Migrations**: Drizzle Kit for database migrations (drizzle-kit push)

### Key Design Patterns
- **Shared Types**: The shared/ directory contains schema definitions and API route contracts used by both frontend and backend, ensuring type safety across the stack
- **Storage Pattern**: server/storage.ts implements IStorage interface abstracting all database operations
- **Protected Routes**: Frontend uses ProtectedRoute component; backend uses isAuthenticated middleware
- **Error Handling**: Standardized error schemas in shared/routes.ts for consistent API responses

### Database Schema
Core tables include:
- **users**: User accounts (managed by Replit Auth)
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

### Pages & Navigation
- `/` — Dashboard (Your Money Dashboard)
- `/transactions` — Transactions
- `/budgets` — Budgets
- `/trends` — Spending Trends
- `/savings` — Savings Goals
- `/invest` — Investment Simulator (Learn, Market, Portfolio)
- `/reports` — Money Insights

## External Dependencies

### Authentication
- **Replit Auth**: OpenID Connect-based authentication system (server/replit_integrations/auth/)
- Requires REPL_ID and SESSION_SECRET environment variables

### Database
- **PostgreSQL**: Primary data store
- Requires DATABASE_URL environment variable
- Uses connect-pg-simple for session storage

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
