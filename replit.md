# FinSight - Personal Finance Tracker

## Overview

FinSight is a personal finance management application designed for users in The Bahamas and the wider Caribbean. It enables tracking of income and expenses, budget management, and financial insights through a modern web interface. The application supports BSD (Bahamian Dollar), USD, and other regional currencies, with features for categorizing transactions, setting budgets, and visualizing spending patterns.

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