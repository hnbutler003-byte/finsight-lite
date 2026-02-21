# FinSight 360

## Overview

FinSight 360 is a personal finance management application developed by FinSight Ltd. for users in The Bahamas and the wider Caribbean. It enables tracking of income and expenses, budget management, and financial insights through a modern web interface. The application supports BSD (Bahamian Dollar), USD, and other regional currencies, with features for categorizing transactions, setting budgets, and visualizing spending patterns.

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
- **document_uploads**: Bank statement upload tracking (fileName, fileType, status, transactionsCreated)

### Document Upload Feature
- Users can upload bank statements (CSV, PDF, Excel) via drag-and-drop on the Dashboard
- Backend uses multer for file handling and OpenAI (gpt-4o) to parse statement content
- Parsed transactions are automatically created with `isAutoSynced: true`
- Upload history shows status (processing/completed/failed) with transaction count
- Supports all 8 regional currencies for imported transactions
- AI auto-categorization matches transactions to appropriate categories with fallback logic
- Duplicate detection skips transactions matching existing date, amount, and description

### Multi-Currency Support
- Dashboard converts all currencies to user-selected base currency using hardcoded pegged exchange rates to USD
- Exchange rates stored in EXCHANGE_RATES_TO_USD constant (BSD 1:1, BBD 0.5, JMD 0.0064, TTD 0.147, XCD 0.37, GYD 0.0048, HTG 0.0076)
- Currency breakdown panel shows per-currency totals when multiple currencies are in use

### Spending Trends (client/src/pages/Trends.tsx)
- Month-over-month spending comparison charts using Recharts
- Spending alerts highlighting categories with 20%+ spending increases
- Budget comparison with progress bars showing actual vs budgeted amounts
- API endpoint: GET /api/spending-trends

### Savings Goals (client/src/pages/SavingsGoals.tsx)
- Users create savings targets with name, target amount, deadline, and currency
- Add savings incrementally via deposit button
- Visual progress bars and percentage tracking
- Database table: savingsGoals (id, userId, name, targetAmount, currentAmount, currency, deadline, createdAt)
- API endpoints: GET/POST /api/savings-goals, PATCH /api/savings-goals/:id/deposit, DELETE /api/savings-goals/:id

### Bill Reminders (client/src/pages/BillReminders.tsx)
- Manual bill entry with name, amount, due date, frequency, currency
- Auto-detection of recurring bills from transaction patterns (weekly/monthly/quarterly/yearly)
- Frequency detection analyzes transaction gaps: weekly (5-10 days), monthly (25-35), quarterly (80-100), yearly (340-380)
- Database table: billReminders (id, userId, name, amount, currency, dueDate, frequency, isAutoDetected, isActive, createdAt)
- API endpoints: GET/POST /api/bill-reminders, PATCH /api/bill-reminders/:id, DELETE /api/bill-reminders/:id, POST /api/bill-reminders/auto-detect

### Export & Reports (client/src/pages/Reports.tsx)
- Financial summary with income, expenses, net savings, savings rate, top categories, budget status
- CSV export of all transactions (date, description, amount, type, currency, category)
- JSON export for developer/integration use
- AI-powered spending insights, currency insights, and regional news
- Period filtering: This Month, Last 3 Months, This Year, All Time
- API endpoints: GET /api/export/transactions (CSV/JSON), GET /api/export/summary, GET /api/ai/insights

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