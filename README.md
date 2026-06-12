# Neoliva Dental Clinic Dashboard 🦷

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

A premium, comprehensive Dental Clinic Management System designed for modern dental practices. This dashboard provides a centralized hub for managing patients, appointments, billing, inventory, and clinical data with a focus on speed, security, and exceptional UI/UX.

---

## ✨ Key Features

- **📊 Comprehensive Dashboard**: Real-time analytics and overview of clinic performance.
- **👥 Patient Management**: Detailed electronic medical records, history, and profile management.
- **📅 Appointment Scheduling**: Seamless booking and management of patient visits.
- **💰 Billing & Invoicing**: Automated invoice generation, payment tracking, and financial reporting.
- **🦷 Clinical Tools**: Advanced tooth charting, periodontograms, and oral examination modules.
- **📦 Inventory Tracking**: Real-time monitoring of clinic supplies and stock alerts.
- **🧪 Lab Orders**: Integrated management of dental laboratory requests and status.
- **💸 Expense Management**: Track clinic overheads and operational costs.
- **👨‍⚕️ Staff Management**: Roles, permissions, and staff scheduling.
- **📈 Advanced Reports**: Detailed financial and operational insights.

## 🚀 Tech Stack

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL), [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [Supabase Auth](https://supabase.com/auth)
- **File Storage**: [Supabase Storage](https://supabase.com/storage)
- **Database Access**: [Prisma Client](https://www.prisma.io/client) for secure, type-safe server-side operations
- **Security**: Row Level Security (RLS) enabled across all public tables with restricted API access
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation

## 🏗️ Architecture

The project follows a clean, decoupled architecture to ensure maintainability, scalability, and strict security:

- **Server Actions**: Handle client interactions and resolve security contexts (e.g., `resolveTenantContext`).
- **Service Layer**: Contains business logic, validation, and data transformation.
- **Repository Layer**: The final line of defense for data access. Implements strict tenant isolation by force-injecting `tenantId` into every query.
- **Prisma ORM**: Manages database interactions with a custom-generated client for enhanced type safety.
- **Zero-Cost Job System**: A database-driven "Lazy Execution" system that handles daily maintenance tasks (reminders, reports, supply alerts) without requiring Redis, BullMQ, or always-on cron infrastructure. It uses atomic row-level locking to ensure safety in serverless environments.

## 🔒 Multi-Tenant Security

Security is a primary focus of Neoliva. We implement a **Strict Isolation Policy**:

- **Repository Hardening**: Every database operation (CRUD) requires `tenantId` as its first mandatory argument.
- **Direct Injection**: `tenantId` is force-injected into Prisma queries at the repository level, preventing cross-tenant data leakage.
- **Ownership Verification**: Sensitive operations (like stock updates or financial records) verify record ownership within the tenant context before execution.
- **Row-Level Protection**: Database schema is designed with `tenant_id` fields on all shared tables to facilitate rigid partitioning.

## 🛠️ Getting Started

### Prerequisites

- Node.js 20+
- A Supabase account and project
- NPM / PNPM / Bun

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ashmawy57/neoliva-dashboard.git
   cd neoliva-dashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory and add your Supabase credentials (see `.env.example`).
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   DATABASE_URL=your_prisma_database_url
   DIRECT_URL=your_prisma_direct_url
   ```

4. **Initialize Database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to see the application.

---

## 🛡️ RBAC & Authorization

Neoliva implements a **Dual-Layer RBAC (Role-Based Access Control)** system for defense-in-depth:

### System A — Permission Code Guard (`src/lib/rbac.ts`)
- Used by the **Dashboard Layout** to compute UI-level permission sets.
- Resolves the user via `resolveTenantContext()` → validates tenant membership → maps role to granular `PermissionCode` entries (e.g., `PATIENT_VIEW`, `BILLING_INVOICE_CREATE`).
- Cached per-request via React `cache()` and across requests via `unstable_cache`.

### System B — Action Guard (`src/lib/rbac/guard.ts`)
- Used by **Server Actions** via `withPermission(resource, action, callback)`.
- Resolves the user independently via `getUserSession()` → checks `can(role, resource, action)` against a static permission matrix.
- Fail-closed: returns `UnauthorizedError` if session is null or permission denied.

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

## 🔐 Authentication Flow

Neoliva supports two primary authentication paths:

### Password Login (`staffLogin`)
```
User → signInWithPassword() → Validate Tenant Status → Create Persistent Session
     → Set app_refresh_token cookie → Set active_tenant_id cookie → Redirect to /dashboard
```

### OAuth / Magic Link (`auth/callback`)
```
Supabase → exchangeCodeForSession() → getUser() → resolvePostAuthRedirect()
         → Validate Membership → Set active_tenant_id cookie → Redirect based on role
```

### Persistent Sessions
- **DB-backed sessions** with revocation support via `SessionService`.
- `app_refresh_token` cookie (90-day TTL) enables silent session refresh in the proxy layer.
- Session mismatch detection prevents token reuse across users.

### Proxy Layer (`src/proxy.ts`)
- Replaces the deprecated `middleware.ts` convention for Next.js 16+.
- Handles: static asset bypass, public route definitions, Supabase auth context, silent session refresh, auth gate, and enterprise tenant lifecycle enforcement (SUSPENDED/DISABLED/REJECTED blocking).

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/             # Login, registration, tenant selection
│   ├── (dashboard)/        # Protected dashboard modules
│   │   ├── appointments/   # Appointment scheduling
│   │   ├── billing/        # Invoice & payment management
│   │   ├── dashboard/      # Main analytics dashboard
│   │   ├── expenses/       # Expense tracking
│   │   ├── inventory/      # Supply management
│   │   ├── lab-orders/     # Laboratory order tracking
│   │   ├── notifications/  # Alert center
│   │   ├── patients/       # Patient records & clinical tools
│   │   ├── reports/        # Financial & operational reports
│   │   ├── rooms/          # Room management & scheduling
│   │   ├── services/       # Dental service catalog
│   │   ├── settings/       # Clinic configuration
│   │   └── staff/          # Staff management & invitations
│   ├── actions/            # Server Actions (auth, CRUD, data fetching)
│   ├── admin/              # Super Admin portal
│   ├── api/                # API routes (tenant selection, cron)
│   └── auth/               # Auth callback handler
├── components/             # Reusable UI components
├── lib/
│   ├── auth/               # Auth orchestrator, tenant resolver, session service
│   ├── rbac/               # Permission matrix, session, guard
│   ├── supabase/           # Supabase client factory
│   ├── prisma.ts           # Prisma client singleton
│   └── observability/      # Action wrapper & tracing
├── repositories/           # Tenant-scoped data access layer
├── services/               # Business logic layer (25 services)
├── types/                  # TypeScript type definitions
└── proxy.ts                # Request interception & auth gate
```

---

## 📊 Observability & Audit

- **Action Wrapping**: Server Actions are wrapped via `wrapAction()` for automatic event tracking.
- **Event Service**: All significant operations emit structured events (`EventService.trackEvent()`).
- **Audit Logging**: Login, role changes, RBAC denials, and data mutations are logged with full metadata.
- **Diagnostic Logging**: Auth flow includes forensic-level `[AUTH_TRACE]`, `[RBAC]`, and `[PROXY_TRACE]` logs for production debugging.

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous API key |
| `DATABASE_URL` | ✅ | Prisma connection string (pooled) |
| `DIRECT_URL` | ✅ | Prisma direct connection string |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Public site URL (for OAuth redirects) |
| `ALLOWED_SUPER_ADMIN_EMAILS` | ⚠️ | Comma-separated admin email allowlist |
| `AUTH_DEBUG` | — | Set to `true` for verbose auth logging |

---

## 📄 License

This project is proprietary software developed for Neoliva dental clinics.
