# PART 14 — CONNECTIONS AND INTEGRATIONS VIVA DEFENSE GUIDE

> [!IMPORTANT]
> **HOW TO ACE THE "SHOW ME" QUESTIONS:**  
> Evaluators often skip theoretical questions and say: *"Show me your database connection,"* or *"Show me where security is implemented."*  
> When this happens, **do not hesitate**. Open the exact file specified below, point to the highlighted line, and speak the script provided.

---

## 14.1 The Top 16 "Show Me" Defense Blueprints

---

### 1. "Show me your database connection."
- **File to Open:** [`src/lib/serverAuthGuard.ts`](file:///d:/AttendX/src/lib/serverAuthGuard.ts) (Lines 68–75)
- **What to Point to:**
  ```ts
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  ```
- **What to Say:**  
  *"Here is our database client initialization in `serverAuthGuard.ts`. We import the Supabase client SDK and instantiate it using our cloud URL `NEXT_PUBLIC_SUPABASE_URL` and our server-side `SUPABASE_SERVICE_ROLE_KEY`. This runs inside our serverless edge environment and allows secure, authenticated queries to our PostgreSQL database."*

---

### 2. "How does your frontend connect to Supabase?"
- **File to Open:** [`src/lib/auth.ts`](file:///d:/AttendX/src/lib/auth.ts) (Lines 86–95)
- **What to Point to:**
  ```ts
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  ```
- **What to Say:**  
  *"Our frontend does not connect directly to Supabase using raw database credentials, as that would expose our database schema and security keys. Instead, the frontend calls our Next.js backend API `/api/auth/login` using `fetch`. The backend route validates the input, authenticates against Supabase Auth, and returns a sanitized session token to the client."*

---

### 3. "Show me your backend. Where are your APIs?"
- **File to Open:** Open the VS Code explorer tree on `src/app/api/`.
- **What to Point to:** Expand `src/app/api/` showing `auth/`, `admin/`, `polls/`, `cancellations/`, `cron/`, `notifications/`.
- **What to Say:**  
  *"Our backend is implemented as Next.js 16 Serverless Route Handlers inside `src/app/api/`. For example, in `src/app/api/polls/route.ts`, you can see the exported `GET`, `POST`, and `PATCH` methods that handle polling logic, role verification, and database persistence."*

---

### 4. "How does authentication connect to the database?"
- **File to Open:** [`src/lib/serverAuth.ts`](file:///d:/AttendX/src/lib/serverAuth.ts) (Lines 206–248)
- **What to Point to:**
  ```ts
  const { data } = await adminClient
    .from("student_profiles")
    .select("*, branches:branch_id (code, name, degree), sections:section_id (section_name, default_room)")
    .or(`roll_number.eq.${trimmed},enrollment_number.ilike.${trimmed}`)
    .maybeSingle();
  ```
- **What to Say:**  
  *"Here is the connection. When a user submits their roll number, `authenticateCredentials()` queries the `student_profiles` table, joins the `branches` and `sections` tables, retrieves the student's authoritative academic identity, maps it to an internal email alias, and executes `signInWithPassword()` against Supabase GoTrue Auth."*

---

### 5. "Show me your database relationships and foreign keys."
- **File to Open:** [`supabase/schema.sql`](file:///d:/AttendX/supabase/schema.sql) (Lines 80–120)
- **What to Point to:**
  ```sql
  CREATE TABLE IF NOT EXISTS student_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      university_id UUID REFERENCES universities(id),
      academic_session_id UUID REFERENCES academic_sessions(id),
      branch_id UUID REFERENCES branches(id),
      section_id UUID REFERENCES sections(id),
  ...
  ```
- **What to Say:**  
  *"Here is our central relational entity `student_profiles`. Notice the explicit foreign key relationships: `user_id` references Supabase Auth `auth.users(id)` with `ON DELETE CASCADE`; `branch_id` references `branches(id)`; and `section_id` references `sections(id)`. This guarantees 3NF referential integrity across the university schema."*

---

### 6. "Show me an active Row Level Security (RLS) policy."
- **File to Open:** [`supabase/migrations/20261108000400_class_polls_persistence.sql`](file:///d:/AttendX/supabase/migrations/20261108000400_class_polls_persistence.sql) (Lines 75–90)
- **What to Point to:**
  ```sql
  CREATE POLICY "class_poll_votes_insert_policy" ON class_poll_votes
  FOR INSERT WITH CHECK (
      student_id = (SELECT id FROM student_profiles WHERE user_id = auth.uid())
  );
  ```
- **What to Say:**  
  *"Here is our RLS policy on `class_poll_votes`. It forces PostgreSQL to verify that the `student_id` being inserted matches the authenticated user's `auth.uid()`. Even if an attacker intercepted our API, the database itself would abort the insert if they attempted to vote using someone else's student ID."*

---

### 7. "What are these environment variables?"
- **File to Open:** [`.env.local`](file:///d:/AttendX/.env.local) (or explain without revealing secret values)
- **What to Point to:** Point to the key names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`.
- **What to Say:**  
  *"Variables starting with `NEXT_PUBLIC_` are non-sensitive configuration values bundled to the browser client (such as our Supabase project URL and VAPID public key). In contrast, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, and `CRON_SECRET` have no public prefix; they exist strictly on the secure serverless edge to sign tokens and execute admin tasks."*

---

### 8. "Where is your Role-Based Access Control (RBAC) enforced?"
- **File to Open:** [`src/lib/serverAuthGuard.ts`](file:///d:/AttendX/src/lib/serverAuthGuard.ts) (Lines 360–395)
- **What to Point to:**
  ```ts
  export async function requireRole(req: NextRequest, allowedRoles: UserRole[]) { ... }
  export async function requireAdmin(req: NextRequest) { return requireRole(req, ["admin"]); }
  export async function requireClassAdmin(req: NextRequest) { return requireRole(req, ["admin", "class_admin"]); }
  ```
- **What to Say:**  
  *"Here is our central authorization guard. Every privileged endpoint invokes `requireRole()` or `requireAdmin()`. It verifies the caller's JWT, queries their authoritative role from the database, and blocks unauthorized users with an HTTP 403 Forbidden before any application logic can run."*

---

### 9. "What happens when I click 'Mark Present'?"
- **File to Open:** [`src/components/QuickAttendanceMarker.tsx`](file:///d:/AttendX/src/components/QuickAttendanceMarker.tsx) (Lines 55–85) and [`src/lib/storage.ts`](file:///d:/AttendX/src/lib/storage.ts) (Lines 320–350)
- **What to Point to:**
  ```ts
  const handleStatusChange = (slot, newStatus) => {
    const updated = updatePeriodAttendance(slot.id, newStatus);
    setRecords(updated);
  };
  ```
- **What to Say:**  
  *"When a student clicks 'Present', `updatePeriodAttendance()` constructs or updates an `AttendanceRecord` object, writes it immediately to `localStorage` under the student's namespaced key, and appends an entry to the audit log. The client state re-renders immediately, and `computeDashboardStats()` recalculates the percentage and safe absences in real time."*

---

### 10. "How does the timetable system know which room a student belongs in?"
- **File to Open:** [`src/data/extractedTimetables.ts`](file:///d:/AttendX/src/data/extractedTimetables.ts) (Lines 8192–8215)
- **What to Point to:**
  ```ts
  export function findTimetableForStudent(params: { branchCode?: string; section?: string; timetableId?: string }) {
    const matched = UNIVERSITY_DATABASE.timetables.find(
      (t) => t.branchCode.toUpperCase() === branchCode && t.section.toUpperCase() === normSec
    );
    if (matched) return matched;
  ...
  ```
- **What to Say:**  
  *"Here is the lookup engine. It takes the student's verified `branchCode` and `section` (e.g. `'ECE'` and `'SEC-B'`) and finds the official master timetable in `UNIVERSITY_DATABASE.timetables`. For ECE Section B, it matches timetable `mmmut-btech-ece-b-2025`, which explicitly defines lecture hall `TL-207`. If no timetable matches, it returns `null` rather than showing the wrong branch."*

---

### 11. "Where are your push notifications configured and sent?"
- **File to Open:** [`src/lib/webpush.ts`](file:///d:/AttendX/src/lib/webpush.ts) (Lines 15–35)
- **What to Point to:**
  ```ts
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@attendx.ac.in",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  ```
- **What to Say:**  
  *"Here is our Web Push service configuration. We configure the VAPID credentials using ECDSA keys. When `/api/cron/check-classes` triggers, it passes the subscriber endpoint and signs the JSON payload with `webpush.sendNotification()`, which Google FCM delivers to the student's device."*

---

### 12. "How does GitHub connect to Vercel for deployment?"
- **File to Open:** [`vercel.json`](file:///d:/AttendX/vercel.json)
- **What to Point to:**
  ```json
  {
    "crons": [
      { "path": "/api/cron/check-classes", "schedule": "0 9 * * 1-6" }
    ]
  }
  ```
- **What to Say:**  
  *"Our GitHub repository is connected to Vercel via automated webhooks. Whenever code is committed and pushed to the `main` branch, Vercel initiates an automated build using Next.js Turbopack, validates TypeScript compilation, and deploys the build to global edge servers. `vercel.json` also registers our background cron schedules."*

---

### 13. "Is your project frontend-only or full-stack?"
- **File to Open:** Show both `src/app/page.tsx` (frontend) and `src/app/api/auth/login/route.ts` (backend).
- **What to Say:**  
  *"AttendX is unequivocally a full-stack application. It contains an interactive React 19 frontend, Next.js serverless backend route handlers, cryptographic middleware guards, and a cloud-hosted PostgreSQL 15 database on Supabase with 25 relational tables and Row Level Security."*

---

### 14. "Show me where the mathematical formula for Safe Absences is implemented."
- **File to Open:** [`src/lib/attendanceCalculator.ts`](file:///d:/AttendX/src/lib/attendanceCalculator.ts) (Lines 35–45)
- **What to Point to:**
  ```ts
  const target75 = threshold / 100;
  let safeAbsences = 0;
  if (rawPercentage >= threshold) {
    safeAbsences = Math.floor((attended - target75 * conducted) / target75);
    if (safeAbsences < 0) safeAbsences = 0;
  }
  ```
- **What to Say:**  
  *"Here is the exact formula. We take the attended units $A$, subtract the target percentage times conducted units ($T \times C$), divide by $T$, and apply `Math.floor()` to obtain the discrete integer count of lectures the student can safely miss."*

---

### 15. "Show me where Recovery Classes Needed is implemented."
- **File to Open:** [`src/lib/attendanceCalculator.ts`](file:///d:/AttendX/src/lib/attendanceCalculator.ts) (Lines 45–55)
- **What to Point to:**
  ```ts
  let recoveryNeeded75 = 0;
  if (rawPercentage < threshold) {
    recoveryNeeded75 = Math.ceil((target75 * conducted - attended) / (1 - target75));
    if (recoveryNeeded75 < 0) recoveryNeeded75 = 0;
  }
  ```
- **What to Say:**  
  *"Here is the recovery formula. If the student has a shortage, we take the target deficit $(T \times C - A)$, divide by $(1 - T)$, and apply `Math.ceil()`. For a 75% threshold, the denominator is $0.25$, meaning each attended class recovers $0.25$ units against the deficit."*

---

### 16. "Show me where you prevent double-voting in polls."
- **File to Open:** [`src/lib/serverPolls.ts`](file:///d:/AttendX/src/lib/serverPolls.ts) (Lines 160–180)
- **What to Point to:**
  ```ts
  const { data: existingVote } = await supabase
    .from("class_poll_votes")
    .select("id")
    .eq("poll_id", pollId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (existingVote) throw new Error("You have already voted in this poll.");
  ```
- **What to Say:**  
  *"Double voting is prevented in two places: our server code in `serverPolls.ts` queries `class_poll_votes` to check if a vote from this student ID exists, and our PostgreSQL schema enforces `UNIQUE (poll_id, student_id)` as an unbreakable database constraint."*
