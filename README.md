# Neoliva Dental Clinic Dashboard 🦷

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-212936?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

A premium, comprehensive Dental Clinic Management System designed for modern dental practices. This dashboard provides a centralized hub for managing patients, appointments, billing, inventory, and clinical data with a focus on speed, security, and exceptional UI/UX.

---

## ✨ Key Features

- **📊 Comprehensive Dashboard**: Real-time analytics, KPIs, and overview of clinic performance.
- **👥 Patient Management**: Detailed electronic medical records, histories, document uploads, and profile management.
- **📅 Appointment Scheduling**: Seamless booking, scheduling, and live tracking of patient visits.
- **💰 Billing & Invoicing**: Automated invoice generation, payment tracking, and financial reporting.
- **🦷 Clinical Tools**: Advanced tooth charting, periodontograms, and oral examination modules.
- **📦 Inventory Tracking**: Real-time monitoring of clinic supplies and automated stock level alerts.
- **🧪 Lab Orders**: Integrated management of dental laboratory requests, costs, and statuses.
- **💸 Expense Management**: Track clinic overheads, salaries, and operational costs.
- **👨‍⚕️ Staff Management**: Roles, permissions, and staff scheduling.
- **📈 Advanced Reports**: Detailed financial, operational, and clinical insights.

## 🚀 Tech Stack

- **Frontend**: [Next.js 16.2](https://nextjs.org/) (App Router, Turbopack), [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/), [Base UI](https://base-ui.com/) (`@base-ui/react`), [shadcn/ui](https://ui.shadcn.com/)
- **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL), [Prisma ORM 7.8](https://www.prisma.io/)
- **Authentication**: [Supabase Auth](https://supabase.com/auth) & Database-backed session tracking
- **File Storage**: [Supabase Storage](https://supabase.com/storage)
- **Security**: PostgreSQL Row Level Security (RLS) driven by application-level connection pool instrumentation
- **Charts**: [Recharts](https://recharts.org/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation

---

## 🏗️ Architecture & Decoupled Design

The project has been fully refactored to follow a clean, decoupled layered architecture to ensure maintainability, scalability, and strict security:

```
[ Client Components / Pages / Layouts ]
                 │
                 ▼
          [ Server Actions ]  <─── RBAC & Schema Validation
                 │
                 ▼
          [ Service Layer ]   <─── Core Business Logic (DI Injected)
                 │
                 ▼
         [ Repository Layer ] <─── Tenant-scoped Database Access
                 │
                 ▼
          [ Prisma Client ]   <─── App-Level RLS Enforcement
                 │
                 ▼
        [ PostgreSQL Database ]
```

### 1. Dependency Injection (DI) Root Container (`src/config/di.ts`)
A centralized composition root manages the instantiation of all repositories and services. Dependencies are passed explicitly via constructors, resolving circular dependencies cleanly and providing singleton instances used across layouts, pages, and Server Actions.

### 2. Encapsulated Service Layer (`src/services/`)
Contains pure business logic, validation, and data transformations. Services depend exclusively on repository interfaces and are entirely decoupled from HTTP protocols, routing configurations, or raw database engines.

### 3. Abstracted Repository Layer (`src/repositories/`)
The data access layer that acts as the final line of defense for database interactions. It implements standard CRUD operations scoped strictly to the current tenant.

### 4. Authoritative App-Level RLS Guard (`src/lib/prisma.ts`)
To enforce strict multi-tenant isolation, the Prisma Client uses a custom extension that wraps all queries:
- **Context Extraction**: Automatically determines the `tenantId` from the current request session, background task trace context, or an `AsyncLocalStorage` store (`rlsStorage`).
- **SQL Variable Binding**: Single database operations are wrapped in transaction blocks, executing `SET LOCAL app.current_tenant_id = '${tenantId}'` on the PostgreSQL connection prior to query execution.
- **Fail-Closed Security**: Throws a `Security Exception` if a query is attempted on a tenant-bound table without an active tenant context.

### 5. Zero-Cost Serverless Job System (`src/services/job.service.ts`)
A database-driven "Lazy Execution" system that handles daily maintenance tasks (patient no-shows, overdue invoices, low-stock warnings) without requiring Redis, BullMQ, or always-on cron servers. It claims and processes pending jobs using atomic row-level locking (`FOR UPDATE SKIP LOCKED`) to ensure exactly-once execution safety in serverless environments.

---

## 🔒 Multi-Tenant Security & Isolation

We implement a **Strict Isolation Policy** to prevent cross-tenant data leakage:
- **Postgres Row-Level Security (RLS)**: PostgreSQL policies on tables ensure that no database row can be read or written unless the connection's session variable `app.current_tenant_id` matches the row's `tenant_id`.
- **Automatic RLS Context Setting**: The Prisma client extension handles session variable binding on every query.
- **Repository-Level Scoping**: All repositories explicitly accept and filter by `tenantId` for secondary defense-in-depth verification.

---

## 🛡️ RBAC & Authorization

Neoliva implements a **Dual-Layer RBAC (Role-Based Access Control)** system for defense-in-depth:

### System A — Permission Code Guard (`src/lib/rbac.ts`)
Used by UI layouts to determine visible navigation links, screens, and action triggers. It validates the user's tenant membership and maps their role to granular `PermissionCode` entries (e.g., `SETTINGS_CLINIC_EDIT`, `PATIENT_DELETE`), cached efficiently per-request.

### System B — Action Guard (`src/lib/rbac/guard.ts`)
Used by Server Actions via `withPermission(resource, action, callback)`. It resolves the user session independently and checks their role against a static permission matrix. It fails-closed, returning an `UnauthorizedError` if the check fails.

### Supported Roles
| Role | Dashboard | Patients | Appointments | Billing | Clinical | Inventory | Staff | Reports | Settings |
|------|-----------|----------|-------------|---------|----------|-----------|-------|---------|----------|
| **OWNER** | ✅ | Full CRUD | Full CRUD | Full CRUD | Full CRUD | Full CRUD | Full CRUD | ✅ | Read/Write |
| **ADMIN** | ✅ | CRU | Full CRUD | CRU | Read | CRU | CRU | ✅ | Read |
| **MANAGER** | ✅ | Full CRUD | Full CRUD | Full CRUD | Read | Full CRUD | CRU | ✅ | Read/Write |
| **DOCTOR** | ✅ | CRU | RU | Read | Full CRUD | Read | Read | ✅ | — |
| **ASSISTANT** | ✅ | RU | CRU | Read | RU | Read | Read | ✅ | — |
| **RECEPTIONIST** | ✅ | CRU | Full CRUD | CRU | — | Read | Read | — | — |
| **ACCOUNTANT** | ✅ | Read | Read | Full CRUD | — | RU | Read | ✅ | — |
| **NURSE** | ✅ | RU | RU | Read | RU | Read | Read | — | — |
| **STAFF** | ✅ | Read | Read | — | — | Read | Read | — | — |

---

## 🔐 Authentication & Session Flow

Neoliva supports two secure paths for authentication:
- **Password-Based Login (`staffLogin`)**: Validates credentials -> checks active tenant/membership status -> issues a DB-backed session -> sets HTTP-only `app_refresh_token` cookie (90-day TTL) -> redirects to `/dashboard`.
- **OAuth / Magic Link (`auth/callback`)**: Supabase callback exchanges authorization code -> validates membership -> sets the active tenant -> redirects.

### Proxy Layer Interceptor (`src/proxy.ts`)
Replacing Next.js legacy middleware, the proxy operates at the edge:
- Bypasses static assets and public routes (login, register, reset password) instantly.
- Intercepts dynamic requests and validates user sessions.
- Automatically handles **silent session refreshes** using DB-backed refresh tokens, protecting against expired Supabase client sessions.
- Enforces active tenant checkouts, immediately blocking users from `SUSPENDED`, `DISABLED`, or `REJECTED` clinics.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/             # Login, registration, tenant selection
│   ├── (dashboard)/        # Protected dashboard route group
│   │   ├── appointments/   # Appointment scheduling
│   │   ├── billing/        # Invoice & payment management
│   │   ├── dashboard/      # Clinic intelligence analytics panel
│   │   ├── expenses/       # Expense tracking
│   │   ├── inventory/      # Supply & inventory management
│   │   ├── lab-orders/     # Laboratory order tracking
│   │   ├── notifications/  # Notification center
│   │   ├── patients/       # Electronic health records & charting
│   │   ├── reports/        # Financial & operational reports
│   │   ├── rooms/          # Room scheduling
│   │   ├── services/       # Service pricing catalog
│   │   ├── settings/       # Clinic configuration
│   │   └── staff/          # Staff invitations & RBAC management
│   ├── actions/            # Thin Server Actions (auth, CRUD wrappers)
│   ├── admin/              # Super Admin dashboard
│   ├── api/                # API endpoints (cron, webhooks)
│   └── auth/               # OAuth callbacks
├── components/             # Reusable UI component libraries
├── config/
│   └── di.ts               # Dependency Injection root container
├── lib/
│   ├── auth/               # Session services and tenant resolvers
│   ├── rbac/               # RBAC matrices and guards
│   ├── validations/        # Shared Zod validation schemas
│   ├── prisma.ts           # Prisma RLS extension & Connection Pool
│   └── observability/      # Tracing & Action instrumentation wrappers
├── repositories/           # Isolated database access classes
├── services/               # Encapsulated business logic classes
├── types/                  # Shared TypeScript models and interfaces
└── proxy.ts                # Next.js 16+ request interception layer
```

---

## 📊 Observability & Auditing

- **Action Wrapper (`wrapAction`)**: Wraps Server Actions to log executions, catch unhandled errors, and measure processing latency.
- **Event Logging (`EventService.trackEvent`)**: Generates structured, immutable event logs for key business operations (e.g., patient creation, invoice status edits, stock updates).
- **Slow Query Warnings**: Automatically logs database queries taking more than `500ms` as warning events for performance monitoring.
- **Diagnostic Tracing**: Leverages `[AUTH_TRACE]`, `[RBAC]`, and `[PROXY_TRACE]` tags in console outputs for rapid environment debugging.

---

## ⚙️ Key Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase client public API key |
| `DATABASE_URL` | ✅ | Prisma Postgres connection pool URL |
| `DIRECT_URL` | ✅ | Prisma Postgres direct connection URL |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Base site URL for redirects |
| `DB_POOL_MAX` | — | Maximum size of the Prisma pooler (default: 15) |
| `AUTH_DEBUG` | — | Enable verbose diagnostic auth logs (`true`) |

---

## 📄 License

This project is software developed by Mohamed Ashmawy (Phone Number: +201066414120).