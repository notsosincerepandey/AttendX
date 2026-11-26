# PART 2 — TECHNOLOGY STACK

---

## 2.1 Complete Architectural Stack Overview

AttendX is built using a modern, full-stack TypeScript architecture centered on the **Next.js 16 App Router** framework and **Supabase (PostgreSQL)** database-as-a-service. Every technology selected for the codebase directly serves a specific operational requirement: high-speed edge rendering, strict compile-time type safety, resilient offline caching, cryptographic authentication, and standards-compliant push notifications.

```
+-----------------------------------------------------------------------------------+
|                            ATTENDX TECHNOLOGY TOPOLOGY                           |
+-----------------------------------------------------------------------------------+
|   TIER                  |   TECHNOLOGIES APPLIED                                  |
|   Client UI / UX        |   React 19, Tailwind CSS v4, Recharts, Lucide, Confetti |
|   Application Framework |   Next.js 16 (Turbopack, Serverless Route Handlers)     |
|   Programming Language  |   TypeScript 5 (Strict Mode, Shared DTO Interfaces)     |
|   Database & Backend    |   Supabase Cloud, PostgreSQL 15, Gotrue Auth, RLS       |
|   Push & Automation     |   Web Push Protocol (RFC 8291/8292), Vercel Cron Jobs   |
|   DevOps & Hosting      |   Vercel Edge Platform, Git, GitHub CI/CD               |
+-----------------------------------------------------------------------------------+
```

---

## 2.2 Deep Dive into Every Technology Used

### 1. Next.js (Version: `16.4.5`)
- **What It Is:** An enterprise-grade React framework providing server-side rendering (SSR), static site generation (SSG), serverless API route handlers, and streaming compilation.
- **Why It Is Used:** AttendX leverages Next.js 16's modern **App Router** paradigm (`src/app`), which provides clean file-system based routing, nested layouts (`layout.tsx`), client/server component boundaries (`"use client"`), and serverless execution without requiring a persistent Node.js express daemon.
- **Where It Is Used:** The entire application scaffold (`src/app/page.tsx`, `src/app/admin/page.tsx`, `src/app/api/...`).
- **Role in Project:** Handles HTTP request dispatching, security guards, serverless execution of API endpoints, and dynamic route rendering.
- **Interactions:** Serves as the primary orchestrator connecting frontend React components to backend database clients and external services.

### 2. Turbopack (via `@tailwindcss/turbopack` & Next.js 16)
- **What It Is:** An ultra-fast, Rust-based incremental bundler and build system designed by Vercel as the successor to Webpack.
- **Why It Is Used:** Decreases development server cold-boot times, optimizes production build chunking, and speeds up hot-module replacement (HMR) across complex UI components.
- **Where It Is Used:** `next.config.ts`, `package.json` build scripts.
- **Role in Project:** Compiles TypeScript, JSX, and CSS assets into optimized production bundles in under 2 seconds.

### 3. React (Version: `19.3.0`) & React DOM
- **What It Is:** A declarative, component-based user interface library.
- **Why It Is Used:** Enables component reusability, modular layout construction, declarative state reactivity, and predictable UI re-renders.
- **Where It Is Used:** Every interactive screen in `src/app/` and component in `src/components/` (`AttendanceCalendar.tsx`, `QuickAttendanceMarker.tsx`, `StudentProfileModal.tsx`, etc.).
- **Role in Project:** Manages client-side component state, handles user interactions (e.g., clicking "Present", filtering subjects, modifying slots), and synchronizes UI with local/cloud state.
- **Interactions:** Renders dynamic JSX based on props and hooks (`useState`, `useEffect`, `useCallback`, `useMemo`).

### 4. TypeScript (Version: `5.x`)
- **What It Is:** A statically typed superset of JavaScript that compiles down to clean JavaScript.
- **Why It Is Used:** Prevents runtime `null` / `undefined` reference crashes, guarantees contract consistency between server API responses and client consumers, and accelerates development via IDE autocompletion.
- **Where It Is Used:** Across all source files in `src/`, type definition models in `src/types/index.ts`, and test scripts in `scripts/`.
- **Role in Project:** Defines core domain models: `UserAccount`, `StudentProfile`, `UniversityTimetable`, `AttendanceRecord`, `ClassPoll`, `CancellationReport`.
- **Interactions:** Enforces strict interface conformance across all API request/response cycles.

### 5. Tailwind CSS (Version: `4.x`)
- **What It Is:** A utility-first CSS framework for rapid and scalable UI development.
- **Why It Is Used:** Eliminates bulky custom CSS stylesheets, guarantees responsive mobile-first layouts, and supports effortless dynamic Dark/Light theme switching via CSS variables.
- **Where It Is Used:** Styled inline across all JSX markup (`className="flex items-center justify-between p-4 bg-zinc-900 border rounded-2xl..."`).
- **Role in Project:** Dictates visual presentation, typographic hierarchy, responsive breakpoints (sm, md, lg), and color-coded status badges (Green Safe, Yellow Warning, Red Danger).

### 6. Supabase & PostgreSQL (Version: `@supabase/supabase-js ^2.119.0`)
- **What It Is:** An open-source Backend-as-a-Service (BaaS) providing a managed, cloud-hosted **PostgreSQL 15** object-relational database.
- **Why It Is Used:** Delivers enterprise relational integrity, relational foreign key constraints, ACID transaction compliance, JSONB document querying, and built-in database functions and triggers.
- **Where It Is Used:** Active production project `iczjocbishkvkkkfvalz` (`AttendX-Test`). Initialized server-side in `src/lib/serverAuthGuard.ts`, `src/lib/serverAdmin.ts`, `src/lib/serverPolls.ts`, `src/lib/subscriptionStore.ts`.
- **Role in Project:** Authoritative persistent repository for all 1,189 student accounts, admin profiles, class polls, announcements, cancellations, and push subscriptions.
- **Interactions:** Queried using Supabase PostgREST client: `.from("student_profiles").select(...)`.

### 7. Supabase Authentication (GoTrue Engine)
- **What It Is:** A managed authentication service implementing OAuth 2.0, JSON Web Tokens (JWT), and secure cryptographic password hashing (bcrypt).
- **Why It Is Used:** Handles user credential storage, session token generation, token expiration, and secure password rotation without requiring custom cryptographic user tables.
- **Where It Is Used:** Gated at `src/app/api/auth/login/route.ts` and `src/app/api/admin/auth/login/route.ts`.
- **Role in Project:** Validates user credentials (`email` + `password`), mints signed 3-part JWT access tokens, and securely stores custom role claims inside `raw_app_meta_data`.

### 8. PostgreSQL Row Level Security (RLS)
- **What It Is:** A PostgreSQL security feature that restricts which rows in a database table a given database user can view, insert, update, or delete based on evaluated SQL expressions.
- **Why It Is Used:** Guarantees defense-in-depth: even if a client bypasses application code, the database itself rejects unauthorized reads or writes.
- **Where It Is Used:** Defined in SQL migration files in `supabase/migrations/` (e.g., `20261107000000_auth_security_remediation.sql`).
- **Role in Project:** Ensures students can only read or edit their own profile and records, Class CRs can only create polls for their branch, and only Administrators can alter university configuration.

### 9. Web Push Protocol & `web-push` (Version: `^4.0.0`)
- **What It Is:** An open W3C and IETF standard (RFC 8291, RFC 8292) allowing web applications to deliver notifications to mobile and desktop browsers even when the webpage is closed.
- **Why It Is Used:** Critical for class commencement reminders—delivers alerts directly to student notification trays 5 minutes before scheduled lectures.
- **Where It Is Used:** Client-side registration in `src/lib/pushClient.ts` + `public/sw.js`; server-side cryptographic signing in `src/lib/webpush.ts`.
- **Role in Project:** Signs push payloads with **VAPID** (Voluntary Application Server Identification) ECDSA P-256 keys and dispatches them to push endpoints (e.g., Google FCM or Mozilla autopush).

### 10. Recharts (Version: `^3.10.1`)
- **What It Is:** A composable, declarative charting library built with React and SVG.
- **Why It Is Used:** Provides smooth, responsive visual analytics—pie charts of attendance distribution, bar charts comparing subject attendance against the 75% baseline, and historical trendlines.
- **Where It Is Used:** `src/app/analytics/page.tsx`.
- **Role in Project:** Translates raw numerical attendance metrics into intuitive visual graphs.

### 11. Lucide React (Version: `^1.70.0`)
- **What It Is:** A clean, lightweight, highly customizable icon library.
- **Why It Is Used:** Provides crisp visual iconography for navigation tabs, action buttons, status alerts, category indicators (Theory vs Lab), and modal controls.
- **Where It Is Used:** Ubiquitously across all client components.

### 12. Canvas Confetti (Version: `^1.9.4`)
- **What It Is:** A performant HTML5 canvas confetti particle generator.
- **Why It Is Used:** Delivers positive gamification and psychological satisfaction when a student recovers from an attendance shortage or achieves $\ge 85\%$ across all subjects.
- **Where It Is Used:** Triggered dynamically in `src/app/calculator/page.tsx` and dashboard milestones.

### 13. Vercel Platform & Vercel Cron
- **What It Is:** A cloud hosting platform optimized for Next.js applications, offering edge routing, global CDN caching, automated build pipelines, and serverless scheduled cron jobs.
- **Why It Is Used:** Serves as AttendX's production deployment environment. Features zero-maintenance serverless scaling and native configuration of cron triggers (`vercel.json`).
- **Where It Is Used:** Production deployment host for domain `attend-x.vercel.app` (or associated custom domain).
- **Role in Project:** Executes scheduled jobs: `/api/cron/check-classes` and `/api/cron/auto-absence`.

### 14. Git & GitHub
- **What It Is:** Distributed version control system and cloud source repository host.
- **Why It Is Used:** Manages atomic commits, branches, pull requests, automated GitHub webhooks connecting directly to Vercel production deployments, and audit trails of all architectural changes.

---

## 2.3 Master Technology Stack Matrix

| Technology | Layer | Exact Version | Purpose in AttendX | Key Interacting Files |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js** | Framework | `16.4.5` | App Router, Serverless Routes, SSR | `next.config.ts`, `src/app/*` |
| **React** | UI Library | `19.3.0` | Reactive Components, Hooks, State | `src/app/*`, `src/components/*` |
| **TypeScript** | Language | `5.x` | Static typing, interface contracts | `tsconfig.json`, `src/types/*` |
| **Tailwind CSS** | Styling | `4.x` | Utility styling, Dark mode, Layouts | `src/app/globals.css` |
| **Supabase** | BaaS / Client | `^2.119.0` | PostgreSQL client & Auth SDK | `src/lib/serverAuthGuard.ts`, `serverAdmin.ts` |
| **PostgreSQL** | Database | `15.x` (Supabase) | Authoritative relational data store | `supabase/schema.sql`, `migrations/*` |
| **GoTrue Auth** | Auth Service | Managed | JWT issuing, password hashing | `src/app/api/auth/login/route.ts` |
| **Web Push** | Push Protocol | `^4.0.0` | VAPID push payload signing | `src/lib/webpush.ts`, `public/sw.js` |
| **Recharts** | Data Viz | `^3.10.1` | Analytics charts and graph render | `src/app/analytics/page.tsx` |
| **Lucide React** | Icons | `^1.70.0` | UI icons across all components | `src/components/*` |
| **Canvas Confetti**| Micro-UX | `^1.9.4` | Gamification on reaching safe 75% | `src/app/calculator/page.tsx` |
| **Vercel** | Cloud Host | Production | Hosting, Edge routing, Serverless | `vercel.json` |
| **Vercel Cron** | Automation | Scheduled | Periodic 9 AM & 6 PM automated cron | `src/app/api/cron/*` |
