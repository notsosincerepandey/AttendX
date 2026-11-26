# PART 13 — PROFESSOR VIVA QUESTIONS AND ANSWERS

---

> [!TIP]
> **VIVA PREPARATION STRATEGY:**  
> When answering viva questions:
> 1. Start with the **Spoken Answer** (clear, confident, direct response in 1–2 sentences).
> 2. Follow with the **Deep Technical Explanation** (demonstrating genuine architectural mastery).
> 3. Cite the **Relevant File / Code** to prove hands-on implementation.

---

## CATEGORY 1: BASIC & INTRODUCTORY QUESTIONS (Q1 – Q10)

### Q1. What is AttendX in one sentence?
- **Spoken Answer:** *"AttendX is a student-centric attendance intelligence and schedule tracking web application designed for university students to track classes in real time, forecast safe absences against mandatory 75% thresholds, and synchronize official branch timetables."*
- **Deep Technical Explanation:** AttendX is a full-stack Next.js 16 application combining a local-first client engine with cloud-hosted PostgreSQL (Supabase) persistence, Web Push background reminders (VAPID), and deterministic discrete mathematical calculation models.
- **Relevant File:** `src/app/page.tsx`, `README.md`.

### Q2. What problem does AttendX solve?
- **Spoken Answer:** *"It solves the problem of students unexpectedly getting debarred from exams due to attendance shortages caused by delayed university registers, unrecorded class cancellations, and timetable confusion."*
- **Deep Technical Explanation:** Traditional university ERPs are post-facto logging systems. AttendX eliminates information latency by equipping students with immediate period-by-period marking, predictive safe absence forecasting, and democratic cancellation consensus.
- **Relevant File:** `src/lib/attendanceCalculator.ts`.

### Q3. Why did you choose this project?
- **Spoken Answer:** *"Because attendance debarment is a massive real-world anxiety for university students. I wanted to build an engineering solution that converts an abstract university ordinance into actionable daily mathematical metrics."*
- **Deep Technical Explanation:** The project presents multi-tier software challenges: managing hierarchical academic taxonomies (University $\rightarrow$ Branch $\rightarrow$ Section $\rightarrow$ Batch), synchronizing 21 complex master timetables, handling dual-token authentication, and scheduling push notifications.

### Q4. What is the scope of your project?
- **Spoken Answer:** *"The live project covers the entire first-year B.Tech batch of MMMUT—1,189 genuine students across 7 branches, 17 sections, and 21 official academic timetables."*
- **Deep Technical Explanation:** The production database contains 1,189 genuine verified records from the 2026–27 academic intake with full branch, section, and practical batch mappings across CSE, ECE, IT, ME, CE, EE, and CHE.

### Q5. What are the key limitations of your project?
- **Spoken Answer:** *"Attendance marking relies on student self-logging and CR consensus rather than hardware biometric scanners, and individual daily attendance logs are currently stored in client-side LocalStorage rather than centralized cloud rows."*
- **Deep Technical Explanation:** While user identities, timetables, polls, announcements, cancellations, and push subscriptions are cloud-persisted, daily attendance marks reside in client LocalStorage to guarantee zero-latency offline marking.

### Q6. Who are the target users of AttendX?
- **Spoken Answer:** *"There are three distinct user roles: undergraduate students, Class Representatives (CRs), and university administrators."*
- **Deep Technical Explanation:** Roles are enforced through a strict Role-Based Access Control (RBAC) hierarchy stored in database claims (`app_metadata.role`), gating features between personal tracking (`student`), sectional governance (`class_admin`), and institution-wide management (`admin`).
- **Relevant File:** `src/types/index.ts`.

### Q7. How does AttendX differ from a traditional university ERP?
- **Spoken Answer:** *"University ERPs are administrative tools built for teachers to report absences after the fact; AttendX is built for students to proactively prevent shortages before they happen."*
- **Deep Technical Explanation:** ERPs provide static percentages with high latency. AttendX provides real-time tracking, discrete safe absence calculation, what-if simulators, background push notifications, and democratic mass bunk consensus.

### Q8. Why is student-maintained tracking useful if the college has an official register?
- **Spoken Answer:** *"Because when the official register tells a student they have 72% at the end of the term, it is too late to fix. AttendX alerts them at 72% in week four so they can attend the next classes and prevent debarment."*
- **Deep Technical Explanation:** Preventative decision support versus reactive notification. AttendX calculates the exact derivative of attendance trajectory over time.

### Q9. Can students fake their attendance on AttendX?
- **Spoken Answer:** *"AttendX is a personal academic cockpit and consensus engine. Faking personal attendance would only deceive the student themselves, defeating the purpose of preventing debarment."*
- **Deep Technical Explanation:** AttendX empowers personal tracking. Furthermore, shared collective events—like class cancellations and polls—require Class CR authorization or atomic peer confirmations to become official.

### Q10. What is the significance of the 75% attendance rule?
- **Spoken Answer:** *"Under university ordinances and AICTE regulations, students who fail to attain 75% aggregate attendance in any course are disqualified from appearing in end-semester theory and practical examinations."*
- **Deep Technical Explanation:** Section 4.2 of university academic regulations stipulates debarment below 75%. AttendX parameterizes this threshold as `profile.attendanceThreshold`, enabling configurable thresholds (e.g. 75% standard, 65% on certified medical grounds).

---

## CATEGORY 2: FRONTEND & CLIENT ARCHITECTURE (Q11 – Q20)

### Q11. What is Next.js and why did you use it?
- **Spoken Answer:** *"Next.js is a React framework that provides serverless API route handlers, optimized bundling with Turbopack, and hybrid rendering in a single unified full-stack codebase."*
- **Deep Technical Explanation:** AttendX uses Next.js 16.4.5 with App Router (`src/app`). It eliminates the need for a standalone Express/Node server by providing serverless Route Handlers (`route.ts`) co-located with client page routes (`page.tsx`).
- **Relevant File:** `next.config.ts`, `package.json`.

### Q12. What is the difference between Server Components and Client Components in Next.js?
- **Spoken Answer:** *"Server Components render on the server without sending JavaScript to the browser, while Client Components use the `'use client'` directive to enable browser interactivity, state, and event listeners."*
- **Deep Technical Explanation:** In AttendX, interactive screens (`page.tsx` with `useState`, `useEffect`, `localStorage`) declare `"use client"`. Layouts and serverless route handlers run strictly on the server to protect database credentials.

### Q13. What is React 19 and what features are used?
- **Spoken Answer:** *"React 19 is the underlying UI library providing declarative component rendering, modern hooks, and optimized reconciliation."*
- **Deep Technical Explanation:** React 19 handles all view layer reactivity. Hooks like `useState` manage reactive slot statuses, `useEffect` synchronizes storage on mount, and `useCallback` optimizes event dispatching.

### Q14. What is Tailwind CSS and what are its advantages?
- **Spoken Answer:** *"Tailwind CSS is a utility-first styling framework that allows building responsive, modern user interfaces directly inside JSX without writing separate CSS files."*
- **Deep Technical Explanation:** AttendX uses Tailwind CSS v4 paired with `@tailwindcss/turbopack`. It eliminates unused CSS bloat via Purge/JIT compilation, supports responsive breakpoints (`sm:`, `md:`, `lg:`), and renders color-coded alert states.

### Q15. How does client-side routing work in Next.js App Router?
- **Spoken Answer:** *"Routing is file-system based: folders inside `src/app` automatically become URL paths, and `page.tsx` defines the visible page."*
- **Deep Technical Explanation:** Next.js intercepts anchor clicks via its router, prefetching route code and performing client-side page transitions without full browser page reloads.

### Q16. How do you handle responsive design for mobile screens?
- **Spoken Answer:** *"Through Tailwind CSS utility classes using mobile-first breakpoints like `flex-col sm:flex-row` and responsive grid layouts."*
- **Deep Technical Explanation:** Timetable grids switch from an 8-period horizontal scroll view on mobile devices to a full structured grid on desktop viewports.

### Q17. What library do you use for icons and why?
- **Spoken Answer:** *"Lucide React, because it provides lightweight, tree-shakable SVG icons with clean typography and zero runtime performance overhead."*
- **Relevant File:** `package.json` (`lucide-react: ^1.70.0`).

### Q18. What library do you use for analytics charts?
- **Spoken Answer:** *"Recharts, which renders declarative, responsive SVG charts including attendance pie charts, bar charts, and trendlines."*
- **Relevant File:** `src/app/analytics/page.tsx`.

### Q19. How do you prevent layout shift or page flickering during loading?
- **Spoken Answer:** *"By using centralized Next.js `layout.tsx` templates and rendering animated spinner fallback states while client profiles hydrate from storage."*
- **Deep Technical Explanation:** The master layout in `src/app/layout.tsx` wraps the viewport with permanent font declarations (`GeistSans`), preventing layout shifts while child components mount.

### Q20. What is Canvas Confetti and where is it triggered?
- **Spoken Answer:** *"It is a micro-animation library that fires celebratory confetti particles when a student successfully recovers above the 75% attendance threshold."*
- **Relevant File:** `src/app/calculator/page.tsx`.

---

## CATEGORY 3: BACKEND & API ARCHITECTURE (Q21 – Q30)

### Q21. Where is the backend in AttendX?
- **Spoken Answer:** *"The backend is implemented inside `src/app/api/` as Next.js 16 Serverless Route Handlers, backed by server libraries in `src/lib/`."*
- **Deep Technical Explanation:** Instead of a legacy monolithic Express server, AttendX implements stateless serverless functions. Each `route.ts` file exports standard HTTP verb methods (`GET`, `POST`, `PATCH`, `DELETE`).
- **Relevant File:** `src/app/api/*`.

### Q22. What is an API Route Handler in Next.js?
- **Spoken Answer:** *"It is a server-side TypeScript function that receives a standard web `NextRequest` object and returns a `NextResponse` JSON object without rendering HTML."*
- **Deep Technical Explanation:** Defined using signatures such as `export async function POST(req: NextRequest)`. These run strictly server-side in a Node.js edge environment.

### Q23. How does the frontend talk to the backend?
- **Spoken Answer:** *"Via asynchronous `fetch` API calls sending JSON request bodies and receiving JSON responses, with bearer tokens in the `Authorization` header."*
- **Relevant File:** `src/lib/auth.ts`, `src/app/polls/page.tsx`.

### Q24. How do you protect backend routes from unauthorized access?
- **Spoken Answer:** *"Through our centralized security guard `verifyServerSession()` and `requireRole()` functions in `src/lib/serverAuthGuard.ts`."*
- **Deep Technical Explanation:** The guard extracts `req.headers.get("authorization")`, validates the cryptographic signature of the token, queries the user's authoritative role from the database, and aborts with HTTP 401 or 403 if unauthorized.

### Q25. What HTTP status codes does your API use?
- **Spoken Answer:** *"We use standard REST status codes: 200 for OK, 201 for Created, 400 for Bad Request, 401 for Unauthorized, 403 for Forbidden, 404 for Not Found, and 500 for Internal Error."*
- **Deep Technical Explanation:** For example, `/api/auth/login` returns `401` on invalid credentials, `/api/cancellations/confirm` returns `409` on duplicate confirmation attempts, and `/api/admin/cr` returns `403` if a non-admin calls it.

### Q26. How do you parse and validate JSON payloads in API routes?
- **Spoken Answer:** *"We parse incoming payloads using `await req.json()` inside a `try/catch` block and validate required fields before executing database operations."*
- **Deep Technical Explanation:** For example, in `/api/cancellations/route.ts`, the handler asserts that `date`, `reasonType`, and `description` are non-empty strings before proceeding.

### Q27. What is the difference between `GET` and `POST` in your API?
- **Spoken Answer:** *"GET requests retrieve data without modifying state (idempotent), while POST requests submit data to create or mutate records on the server."*
- **Deep Technical Explanation:** For instance, `GET /api/polls` retrieves active polls; `POST /api/polls` creates a new poll in PostgreSQL; and `PATCH /api/polls` casts a vote or closes an active poll.

### Q28. How does rate limiting work in your admin endpoints?
- **Spoken Answer:** *"We enforce rate limiting on sensitive routes like password resets using database tracking tables like `admin_reset_rate_limits` to prevent brute force attacks."*
- **Relevant File:** `supabase/migrations/20261108000200_bulk_student_onboarding.sql`.

### Q29. How are cron jobs triggered on your backend?
- **Spoken Answer:** *"Vercel Cron automatically sends periodic HTTP requests to `/api/cron/check-classes` and `/api/cron/auto-absence` using a secret authorization header."*
- **Deep Technical Explanation:** The Vercel scheduler reads schedules from `vercel.json` (`0 9 * * 1-6`) and invokes the endpoint sending `Authorization: Bearer <CRON_SECRET>`.
- **Relevant File:** `vercel.json`, `src/lib/actionSecurity.ts`.

### Q30. Is AttendX a monolithic or microservices architecture?
- **Spoken Answer:** *"It is a modern Serverless Monorepo: the presentation layer and micro-API handlers live in one repository but deploy as independent, auto-scaling serverless edge functions."*

---

## CATEGORY 4: DATABASE & POSTGRESQL (Q31 – Q40)

### Q31. What database does AttendX use?
- **Spoken Answer:** *"AttendX uses PostgreSQL 15, managed in the cloud via Supabase on project `iczjocbishkvkkkfvalz`."*
- **Deep Technical Explanation:** PostgreSQL was selected for its relational integrity, ACID transaction guarantees, native JSONB support, powerful constraints (`UNIQUE`, `CHECK`), and Row Level Security (RLS).

### Q32. What is Supabase?
- **Spoken Answer:** *"Supabase is an open-source Backend-as-a-Service providing a managed PostgreSQL database, authentication system, and instant PostgREST APIs."*
- **Deep Technical Explanation:** Supabase abstracts PostgreSQL cloud management while giving direct access to Postgres tables, SQL migrations, triggers, and GoTrue Auth.

### Q33. What is a Primary Key and give an example from your project?
- **Spoken Answer:** *"A Primary Key is a column or set of columns that uniquely identifies each row in a table. In `student_profiles`, `id` is a UUID primary key."*
- **Deep Technical Explanation:** `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` guarantees global uniqueness across distributed tables.

### Q34. What is a Foreign Key and give an example from your project?
- **Spoken Answer:** *"A Foreign Key links a column in one table to the primary key of another table, ensuring referential integrity. In `sections`, `branch_id` references `branches(id)`."*
- **Deep Technical Explanation:** Foreign keys prevent orphaned records. In AttendX, deleting a branch cascades to delete its child sections (`ON DELETE CASCADE`).

### Q35. What is Database Normalization and to what level is your schema normalized?
- **Spoken Answer:** *"Normalization is the process of organizing database tables to minimize redundancy and dependency. Our schema is normalized to Third Normal Form (3NF)."*
- **Deep Technical Explanation:** University metadata is split into `universities`, `branches`, `sections`, and `batches`. Student profiles reference these tables via foreign keys rather than duplicating branch names in every student row.

### Q36. What unique constraints exist in your database?
- **Spoken Answer:** *"We enforce unique constraints on `roll_number`, `enrollment_number`, `email`, and a composite unique constraint `(poll_id, student_id)` on poll votes."*
- **Deep Technical Explanation:** `UNIQUE (poll_id, student_id)` in `class_poll_votes` guarantees at the database engine level that a student cannot cast more than one vote in a poll.
- **Relevant File:** `supabase/migrations/20261108000400_class_polls_persistence.sql`.

### Q37. What is the difference between SQL and NoSQL, and why did you choose SQL?
- **Spoken Answer:** *"SQL databases are relational and structured with rigid schemas and ACID transactions, whereas NoSQL is document-based. We chose SQL because university academic structures are inherently relational."*
- **Deep Technical Explanation:** Academic entities (Students, Branches, Sections, Classes, Grades) have strict 1-to-many and many-to-many relationships. Non-relational databases risk data inconsistency when branches or schedules change.

### Q38. How do you execute database migrations in AttendX?
- **Spoken Answer:** *"We write timestamped SQL migration scripts inside `supabase/migrations/` and apply them sequentially using the Supabase CLI."*
- **Relevant Folder:** `supabase/migrations/`.

### Q39. What happens if a database query fails in an API route?
- **Spoken Answer:** *"The error is caught inside a `try/catch` block, logged safely to server logs without exposing database passwords, and an HTTP 500 JSON error is returned to the client."*
- **Relevant File:** `src/app/api/polls/route.ts`.

### Q40. How many genuine students are in the database?
- **Spoken Answer:** *"Exactly 1,189 verified genuine first-year B.Tech students imported from the official university session manifest."*
- **Relevant File:** `BTech_Student_Data_Session_2026-27.xlsx`, `scripts/import_students_iczjoc.ts`.

---

## CATEGORY 5: AUTHENTICATION & SESSIONS (Q41 – Q50)

### Q41. How does a student log in without an email address?
- **Spoken Answer:** *"The student enters their Roll Number or Enrollment Number. The server looks up their profile in `student_profiles` and converts it to an internal email alias `student.<roll>@attendx.mmmut.ac.in` for authentication."*
- **Relevant File:** `src/lib/serverAuth.ts` (`rollNumberToEmailAlias`).

### Q42. What is a JWT and how is it used in AttendX?
- **Spoken Answer:** *"A JSON Web Token is a cryptographically signed, compact credential containing header, payload claims, and signature, used as a bearer token to authenticate client requests."*
- **Deep Technical Explanation:** The 3-part Supabase JWT contains user identity, expiration timestamp, and `app_metadata.role`. The client transmits it in `Authorization: Bearer <token>`.

### Q43. What is the dual-token architecture in AttendX?
- **Spoken Answer:** *"AttendX supports genuine 3-part Supabase Auth JWTs for online cloud operation, and 2-part signed HMAC-SHA256 tokens for offline testing resilience."*
- **Deep Technical Explanation:** In `src/lib/serverAuthGuard.ts`, `verifyServerSession()` detects whether the token is a 3-part JWT or 2-part HMAC token, verifying both securely.

### Q44. Where are tokens stored on the client?
- **Spoken Answer:** *"In the browser's `localStorage` under the key `attendx_session_token`."*
- **Relevant File:** `src/lib/auth.ts`.

### Q45. How does password hashing work in Supabase Auth?
- **Spoken Answer:** *"Passwords are hashed using bcrypt with an automated cryptographic salt before being stored in `auth.users`, ensuring passwords can never be retrieved in plaintext."*

### Q46. What is the one-time mandatory password rotation?
- **Spoken Answer:** *"All newly imported accounts have `requires_password_change = true`. On first login, the user must update their password, after which the flag permanently locks."*
- **Relevant File:** `src/lib/serverAuth.ts` (`rotateUserPassword`).

### Q47. How do you distinguish between Student, CR, and Administrator?
- **Spoken Answer:** *"Through the authoritative `role` column in `student_profiles` and the `raw_app_meta_data.role` claim inside Supabase Auth."*
- **Deep Technical Explanation:** Roles are never read from client storage; the server guard reads the cryptographically verified JWT claim or queries the database directly.

### Q48. What is the difference between Authentication and Authorization?
- **Spoken Answer:** *"Authentication verifies WHO you are (proving your identity via password), whereas Authorization verifies WHAT you are allowed to do (checking your role permissions)."*

### Q49. What happens when a user logs out?
- **Spoken Answer:** *"The client removes `attendx_session_token` and `attendx_current_user` from `localStorage`, redirects to `/login`, and clears reactive state."*
- **Relevant File:** `src/lib/auth.ts` (`logoutUser`).

### Q50. Can a student view another student's attendance if they know their Roll Number?
- **Spoken Answer:** *"No, because accessing data requires the student's authenticated session token, and Row Level Security prevents reading records belonging to another UUID."*

---

## CATEGORY 6: SECURITY & ROW LEVEL SECURITY (Q51 – Q60)

### Q51. What is Row Level Security (RLS)?
- **Spoken Answer:** *"RLS is a PostgreSQL feature that allows defining SQL security policies directly on database tables so users can only access rows matching their credentials."*
- **Deep Technical Explanation:** RLS policies evaluate `auth.uid()` against row owner foreign keys on every query executed by the anonymous client.

### Q52. Why is RLS better than application-level security checks?
- **Spoken Answer:** *"Because RLS executes at the database kernel level; even if a bug exists in the application code, the database itself blocks unauthorized queries."*

### Q53. What is the difference between an Anon Key and a Service Role Key?
- **Spoken Answer:** *"The Anon Key is public and strictly obeys Row Level Security, whereas the Service Role Key is a private server secret that bypasses all RLS."*
- **Deep Technical Explanation:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` is bundled in the frontend. `SUPABASE_SERVICE_ROLE_KEY` is kept strictly server-side for administrative operations.

### Q54. How do you prevent SQL Injection in AttendX?
- **Spoken Answer:** *"By using parameterized queries through the Supabase PostgREST SDK and ORM query builders, which automatically sanitize inputs."*
- **Deep Technical Explanation:** Raw string concatenation is never used to build SQL statements. Queries like `.eq('roll_number', trimmed)` use parameterized placeholders.

### Q55. How do you protect against Cross-Site Scripting (XSS)?
- **Spoken Answer:** *"React automatically escapes all variables inside JSX markup, preventing injected `<script>` tags from executing in the browser."*

### Q56. What are timing attacks and how did you prevent them?
- **Spoken Answer:** *"Timing attacks guess secrets by measuring microsecond differences in string comparisons. We prevent them using Node's `crypto.timingSafeEqual()`."*
- **Relevant File:** `src/lib/serverAuth.ts` (lines 117–120).

### Q57. How is student Personally Identifiable Information (PII) protected?
- **Spoken Answer:** *"Student emails and guardian details are masked from client views, and internal aliases are hidden behind roll numbers."*

### Q58. How do you prevent Cross-Site Request Forgery (CSRF)?
- **Spoken Answer:** *"All mutating API routes require an `Authorization: Bearer <token>` header, which browsers never send automatically on cross-site requests."*

### Q59. What happens if a student modifies their role to 'admin' in LocalStorage?
- **Spoken Answer:** *"The UI might show admin buttons, but every admin API call will immediately fail with `403 Forbidden` because the server verifies the real role in the database."*

### Q60. How do you secure your scheduled cron routes?
- **Spoken Answer:** *"By validating the `Authorization: Bearer <CRON_SECRET>` header in `validateCronAuthorization()` before executing the cron task."*
- **Relevant File:** `src/lib/actionSecurity.ts`.

---

## CATEGORY 7: SYSTEM ARCHITECTURE & INTEGRATION (Q61 – Q70)

### Q61. Walk me through the high-level architecture of AttendX.
- **Spoken Answer:** *"AttendX consists of a React 19 frontend on Next.js 16, a serverless API tier with auth guards, a Supabase PostgreSQL database, and a Web Push notification subsystem."*
- **Deep Technical Explanation:** Refer to the Mermaid System Architecture diagram in Chapter 3.

### Q62. What is Vercel and what role does it play?
- **Spoken Answer:** *"Vercel is our cloud hosting and serverless execution platform. It serves the frontend via global CDN edge nodes and executes our API routes as serverless functions."*

### Q63. What is Web Push and how does it work without opening the app?
- **Spoken Answer:** *"It uses standard W3C Web Push protocols. The browser Service Worker registers a push subscription with Google FCM, and our backend sends VAPID-signed alerts."*
- **Relevant File:** `src/lib/webpush.ts`, `public/sw.js`.

### Q64. What is a Service Worker?
- **Spoken Answer:** *"A Service Worker is a background script that runs independently of web pages, enabling offline caching and background push notification listening."*
- **Relevant File:** `public/sw.js`.

### Q65. What is VAPID in Web Push?
- **Spoken Answer:** *"VAPID stands for Voluntary Application Server Identification. It uses public-key cryptography to prove to push services that our server sent the notification."*

### Q66. How does AttendX handle offline operation?
- **Spoken Answer:** *"The student's attendance records, cached profile, and active timetable are stored in browser LocalStorage, allowing full tracking even without internet."*

### Q67. What is Turbopack and why does Next.js 16 use it?
- **Spoken Answer:** *"Turbopack is an incremental bundler written in Rust that compiles TypeScript and JSX up to 10 times faster than Webpack."*

### Q68. How does AttendX prevent timetable cross-branch contamination?
- **Spoken Answer:** *"Through our centralized `findTimetableForStudent()` engine that strictly matches the student's verified `branchCode` and `section`, returning `null` if unmapped."*
- **Relevant File:** `src/data/extractedTimetables.ts`.

### Q69. What is Simpson's Paradox and how does your calculation avoid it?
- **Spoken Answer:** *"Simpson's Paradox occurs when averaging percentages from groups of different sizes distorts the truth. We avoid it by summing raw attended and conducted units."*
- **Relevant File:** `src/lib/attendanceCalculator.ts`.

### Q70. How does GitHub CI/CD connect to your Vercel deployment?
- **Spoken Answer:** *"Pushing code to the `main` branch on GitHub automatically triggers a Vercel webhook, compiling the project with Turbopack and deploying it to production."*

---

## CATEGORY 8: PROJECT-SPECIFIC & MMMUT DOMAIN (Q71 – Q80)

### Q71. How does AttendX know which classroom a student should be in?
- **Spoken Answer:** *"From the master university timetable database. For example, ECE Section-B maps to `mmmut-btech-ece-b-2025`, which assigns Lecture Theater `TL-207`."*

### Q72. Why did Nitin Kumar previously see Room TL-203 instead of TL-207?
- **Spoken Answer:** *"Because an early bug defaulted undefined profile branches to 'Information Technology' and fell back to IT Section-B (`TL-203`). We resolved this by querying the true branch code and mapping the ECE timetable (`TL-207`)."*

### Q73. What is the difference between Batch P1 and Batch P2?
- **Spoken Answer:** *"They are split laboratory batches. While both attend theory lectures together, Batch P1 attends labs at times when Batch P2 does not, requiring schedule filtering."*

### Q74. How does the 5-minute action token work in push notifications?
- **Spoken Answer:** *"When a class starts, the push notification payload includes an HMAC-signed token valid for exactly 5 minutes, allowing one-click attendance marking."*
- **Relevant File:** `src/lib/actionSecurity.ts` (`generateActionToken`).

### Q75. What happens when a class is marked as 'CANCELLED'?
- **Spoken Answer:** *"The period is stored as `CANCELLED` and completely excluded from both attended ($A$) and conducted ($C$) totals, ensuring students are not penalized."*

### Q76. Can an ordinary student create an official class announcement?
- **Spoken Answer:** *"No. Only authorized Class Representatives (`class_admin`) and Administrators (`admin`) can post announcements."*
- **Relevant File:** `src/app/api/announcements/route.ts`.

### Q77. Can an IT Class Representative modify an ECE timetable?
- **Spoken Answer:** *"No. `saveOfficialClassTimetable()` verifies that the CR's `managedBranchCode` matches the timetable's `branchCode`, throwing an Access Denied error otherwise."*
- **Relevant File:** `src/lib/storage.ts` (lines 496–502).

### Q78. How does the Self-Healing mechanism in `getStoredProfile()` work?
- **Spoken Answer:** *"On every app boot, `getStoredProfile()` checks if the cached profile has an invalid branch name or outdated timetable ID, and heals it using master lookup tables."*
- **Relevant File:** `src/lib/storage.ts` (lines 33–55).

### Q79. What happens if a student has an attendance shortage?
- **Spoken Answer:** *"The dashboard displays a Red Alert badge with the exact number of consecutive classes needed to recover compliance, and the recovery calculator provides a plan."*

### Q80. How many timetable schedules are extracted in your database?
- **Spoken Answer:** *"Exactly 21 master university timetables representing all departments and sections of MMMUT."*
- **Relevant File:** `src/data/extractedTimetables.ts`.

---

## CATEGORY 9: DIFFICULT & CHALLENGING CURVEBALL QUESTIONS (Q81 – Q90)

### Q81. "If attendance is stored in LocalStorage, can't a student open Developer Tools and edit their percentage?"
- **Spoken Answer:** *"A student could edit their client LocalStorage, but they would only be lying to themselves. AttendX is an intelligence and prediction tool for students to stay safe, not an official university grading ledger."*
- **Deep Technical Explanation:** Furthermore, collective events—like class cancellations and polls—are authenticated and stored in cloud PostgreSQL. Tampering with client numbers has zero effect on peer records or university audits.

### Q82. "What if the university timetable changes midway through the semester?"
- **Spoken Answer:** *"The authorized Class Representative updates the official class timetable via the Timetable Center, which broadcasts the change to the entire section."*
- **Deep Technical Explanation:** `saveOfficialClassTimetable()` writes the updated schedule to cloud storage and posts an announcement, dynamically updating peer dashboards.

### Q83. "Why didn't you use WebSockets for real-time attendance sync?"
- **Spoken Answer:** *"Because attendance is marked periodically at the end of lectures, not sub-second like a chat app. HTTP REST with LocalStorage caching provides superior battery efficiency and offline resilience."*

### Q84. "What happens if a student misses a laboratory class that lasts 4 periods?"
- **Spoken Answer:** *"AttendX marks 4 discrete absent units, correctly reflecting that the student missed 4 academic credit periods."*
- **Relevant File:** `src/lib/storage.ts` (`markLabSession`).

### Q85. "How does your code prevent a student from voting twice in a poll?"
- **Spoken Answer:** *"At two levels: the frontend disables the voting button once voted, and PostgreSQL enforces a `UNIQUE (poll_id, student_id)` composite constraint."*
- **Relevant File:** `supabase/migrations/20261108000400_class_polls_persistence.sql`.

### Q86. "What prevents a student from calling `/api/admin/reset-password` using Postman?"
- **Spoken Answer:** *"The endpoint passes through `requireRole(req, ['admin'])`, which extracts the JWT bearer token and verifies in the database that the caller has the `admin` role."*
- **Relevant File:** `src/lib/serverAuthGuard.ts`.

### Q87. "Why did you use Next.js 16 instead of a separate React frontend and Express backend?"
- **Spoken Answer:** *"Next.js 16 provides end-to-end TypeScript type sharing between frontend and backend, eliminates CORS configuration issues, builds faster with Turbopack, and deploys effortlessly as serverless edge functions."*

### Q88. "What happens when the semester ends and conducted classes are zero for the new term?"
- **Spoken Answer:** *"Our math engine checks `if (conducted === 0) return { percentage: 100.0, safeAbsences: 0, status: 'safe' }`, preventing any division-by-zero crashes."*
- **Relevant File:** `src/lib/attendanceCalculator.ts` (lines 20–30).

### Q89. "Could your Vercel Cron job be triggered by a malicious external hacker?"
- **Spoken Answer:** *"No, because `validateCronAuthorization()` requires the caller to provide our secret `CRON_SECRET` in the `Authorization: Bearer` header."*
- **Relevant File:** `src/lib/actionSecurity.ts`.

### Q90. "If you had 3 more months, what architectural feature would you add next?"
- **Spoken Answer:** *"I would implement biometric BLE beacon verification inside classrooms and integrate bidirectional sync with the university's official ERP database via automated webhooks."*
