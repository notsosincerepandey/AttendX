# PART 5 — DATABASE DEEP DIVE

---

## 5.1 Relational Architecture & Schema Philosophy

AttendX's persistence layer is engineered on **PostgreSQL 15** (hosted on Supabase Cloud under project identifier `iczjocbishkvkkkfvalz`). The database schema is fully normalized up to Third Normal Form (3NF) to guarantee academic data integrity, prevent duplicate records, enforce strict referential actions (`ON DELETE CASCADE` / `ON DELETE RESTRICT`), and protect sensitive institutional records through native Row Level Security (RLS) policies.

```
+----------------------------------------------------------------------------------------------------+
|                                      POSTGRESQL SCHEMA TAXONOMY                                    |
+----------------------------------------------------------------------------------------------------+
|   DOMAIN GROUP         |   TABLES INCLUDED                                                         |
|   Academic Hierarchy   |   universities, academic_sessions, branches, sections, batches, subjects  |
|   Student Registry     |   student_profiles, auth.users (Supabase Auth internal)                   |
|   Timetable Systems    |   timetable_versions, timetable_slots, published_timetable_versions       |
|   Attendance Engine    |   attendance_records, attendance_audit_logs, class_sessions               |
|   Class Democracy      |   class_polls, class_poll_options, class_poll_votes, class_announcements    |
|   Class Cancellations  |   cancellation_reports, cancellation_report_confirmations                  |
|   Push Notifications   |   push_subscriptions, notifications                                       |
|   Security Governance  |   admin_password_resets, admin_reset_rate_limits                          |
+----------------------------------------------------------------------------------------------------+
```

---

## 5.2 Table-by-Table Schema Specification

### 1. `student_profiles` (Central Student & Role Directory)
- **Purpose:** Stores complete authoritative academic identities for all 1,189 genuine students and administrators.
- **Key Columns & Types:**
  - `id` (`UUID`, PK, default: `gen_random_uuid()`): Unique internal identifier.
  - `user_id` (`UUID`, FK, nullable): References `auth.users(id) ON DELETE CASCADE`. Connects profile to Supabase Auth credentials.
  - `roll_number` (`VARCHAR(32)`, Unique): Student university roll number (e.g. `2026041133`). Primary student login identifier.
  - `enrollment_number` (`VARCHAR(32)`, Unique): Student university enrollment number (e.g. `2026ECD1044`). Alternate login identifier.
  - `email` (`VARCHAR(255)`, Unique): Authoritative student internal email alias (`student.<roll>@attendx.mmmut.ac.in`).
  - `full_name` (`VARCHAR(255)`, NOT NULL): Official legal name of student (e.g. `NITIN KUMAR`).
  - `father_name` (`VARCHAR(255)`): Official guardian name for identity verification.
  - `role` (`VARCHAR(32)`, default: `'student'`): Authoritative system role: `'student'`, `'class_admin'` (CR), or `'admin'`.
  - `branch_code` (`VARCHAR(16)`, NOT NULL): Human-readable branch code (e.g. `'ECE'`, `'IT'`, `'CSE'`, `'ME'`).
  - `section` (`VARCHAR(16)`, NOT NULL): Assigned section (e.g. `'SEC-B'`).
  - `batch` (`VARCHAR(16)`, default: `'P1'`): Assigned practical lab batch (`'P1'` or `'P2'`).
  - `semester` (`VARCHAR(32)`, default: `'Semester I'`): Current academic semester.
  - `attendance_threshold` (`NUMERIC(5,2)`, default: `75.00`): Minimum percentage required by ordinance.
  - `requires_password_change` (`BOOLEAN`, default: `true`): Enforces mandatory one-time password rotation upon initial login.
  - `password_change_consumed` (`BOOLEAN`, default: `false`): Flips to `true` permanently once initial password has been rotated.
  - `branch_id` (`UUID`, FK): References `branches(id)`.
  - `section_id` (`UUID`, FK): References `sections(id)`.
  - `academic_session_id` (`UUID`, FK): References `academic_sessions(id)`.
  - `is_active` (`BOOLEAN`, default: `true`): Account active flag.

### 2. `branches` (Academic Departments)
- **Purpose:** Defines official university academic departments and degree programs.
- **Columns:**
  - `id` (`UUID`, PK): Internal unique identifier.
  - `university_id` (`UUID`, FK): References `universities(id)`.
  - `code` (`VARCHAR(16)`, NOT NULL, Unique): Branch code (`'CSE'`, `'ECE'`, `'IT'`, `'ME'`, `'CE'`, `'EE'`, `'CHE'`).
  - `name` (`VARCHAR(255)`, NOT NULL): Full formal name (e.g. `'Electronics & Communication Engineering'`).
  - `degree` (`VARCHAR(64)`, default: `'B.Tech'`): Degree qualification.

### 3. `sections` (Branch Sections & Classrooms)
- **Purpose:** Represents physical class divisions within a branch and defines designated default lecture theaters.
- **Columns:**
  - `id` (`UUID`, PK): Section identifier.
  - `branch_id` (`UUID`, FK): References `branches(id) ON DELETE CASCADE`.
  - `section_name` (`VARCHAR(32)`, NOT NULL): Section label (`'SEC-A'`, `'SEC-B'`, `'SEC-C'`).
  - `default_room` (`VARCHAR(64)`): Assigned lecture hall (e.g. `'TL-207'` for ECE SEC-B, `'TL-203'` for IT SEC-B).

### 4. `class_polls`, `class_poll_options`, `class_poll_votes` (Democratic Voting Engine)
- **Purpose:** Facilitates class consensus on mass bunks, tutorial rescheduling, and extra classes with cryptographic vote uniqueness.
- **Columns in `class_polls`:**
  - `id` (`UUID`, PK): Poll identifier.
  - `title` (`VARCHAR(255)`, NOT NULL): Poll question / topic.
  - `category` (`VARCHAR(32)`): `'MASS_BUNK'`, `'RESCHEDULE'`, `'EXTRA_CLASS'`, `'GENERAL'`.
  - `branch_code` (`VARCHAR(16)`, NOT NULL): Targeted department (`'IT'` or `'ALL'`).
  - `section` (`VARCHAR(16)`, NOT NULL): Targeted section (`'SEC-B'` or `'ALL'`).
  - `created_by` (`UUID`, FK): Student profile ID of the Class CR or Administrator who called the vote.
  - `status` (`VARCHAR(16)`, default: `'ACTIVE'`): `'ACTIVE'` or `'CLOSED'`.
  - `total_votes` (`INTEGER`, default: `0`): Aggregate votes cast.
- **Columns in `class_poll_options`:**
  - `id` (`UUID`, PK), `poll_id` (`UUID`, FK references `class_polls(id) ON DELETE CASCADE`), `option_text` (`TEXT`), `vote_count` (`INTEGER`).
- **Columns in `class_poll_votes`:**
  - `id` (`UUID`, PK), `poll_id` (`UUID`, FK), `option_id` (`UUID`, FK), `student_id` (`UUID`, FK references `student_profiles(id)`), `voted_at` (`TIMESTAMPTZ`).
  - **Constraint:** `UNIQUE (poll_id, student_id)` — Guarantees mathematically that one student cannot cast multiple votes.

### 5. `cancellation_reports` & `cancellation_report_confirmations` (Class Cancellation Consensus)
- **Purpose:** Tracks reported class cancellations (e.g. instructor absence, university holiday) and records peer and CR confirmations.
- **Columns in `cancellation_reports`:**
  - `id` (`UUID`, PK), `student_id` (`UUID`, FK), `student_name` (`VARCHAR(255)`), `report_date` (`DATE`), `period` (`INTEGER`), `subject_code` (`VARCHAR(32)`), `reason_type` (`VARCHAR(32)`: `'MASS_BUNK'`, `'TEACHER_ABSENT'`, `'COLLEGE_HOLIDAY'`, `'OTHER'`), `status` (`VARCHAR(16)`: `'PENDING'`, `'CONFIRMED'`, `'REJECTED'`), `confirmation_count` (`INTEGER`, default: `1`).
- **Columns in `cancellation_report_confirmations`:**
  - `id` (`UUID`, PK), `report_id` (`UUID`, FK), `student_id` (`UUID`, FK), `confirmed_at` (`TIMESTAMPTZ`).
  - **Constraint:** `UNIQUE (report_id, student_id)` — Prevents duplicate confirmations by the same user.

### 6. `push_subscriptions` (Web Push Registration Vault)
- **Purpose:** Stores browser push subscription endpoints and ECDSA P-256 cryptographic keys for automated class reminders.
- **Columns:**
  - `id` (`UUID`, PK), `student_id` (`UUID`, FK), `endpoint` (`TEXT`, Unique), `p256dh` (`TEXT`), `auth` (`TEXT`), `user_agent` (`TEXT`), `updated_at` (`TIMESTAMPTZ`).

---

## 5.3 PostgreSQL Row Level Security (RLS) Policies

Row Level Security policies execute directly inside the PostgreSQL kernel. Even if client-side code is tampered with, the database engine drops unauthorized operations.

### Key Active RLS Policies:

```sql
-- 1. Student Profiles: Students can only view their own profile; Admins view all
CREATE POLICY "student_profiles_read_policy" ON student_profiles
FOR SELECT USING (
    auth.uid() = user_id 
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'class_admin'
);

-- 2. Class Polls: Scoped by Branch and Section
CREATE POLICY "class_polls_select_policy" ON class_polls
FOR SELECT USING (
    branch_code = 'ALL' 
    OR branch_code = (auth.jwt() -> 'app_metadata' ->> 'branch_code')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 3. Poll Voting: Strictly prevents casting votes under another student's UUID
CREATE POLICY "class_poll_votes_insert_policy" ON class_poll_votes
FOR INSERT WITH CHECK (
    student_id = (
        SELECT id FROM student_profiles WHERE user_id = auth.uid()
    )
);

-- 4. Cancellation Reports: Students cannot insert or confirm reports; CR & Admin only
CREATE POLICY "cancellation_reports_insert_policy" ON cancellation_reports
FOR INSERT WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'class_admin')
);
```

---

## 5.4 Database Flow of Important Operations

### Workflow A: Student Login & Timetable Hydration
```
1. Student inputs Roll Number "2026041133" + Password
   ↓
2. Server queries: SELECT * FROM student_profiles WHERE roll_number = '2026041133'
   ↓ Returns: id, branch_code='ECE', section='SEC-B', batch='P1', user_id='ad3d47c5...'
   ↓
3. Server executes Gotrue Auth: signInWithPassword(student.2026041133@attendx.mmmut.ac.in)
   ↓ Returns: 3-part Supabase JWT access token
   ↓
4. Server joins branches & sections:
   SELECT branches.name, sections.default_room 
   FROM branches, sections WHERE code='ECE' AND section_name='SEC-B'
   ↓ Returns: "Electronics & Communication Engineering", Room: "TL-207"
   ↓
5. Server queries extracted timetables for ECE + SEC-B:
   findTimetableForStudent({ branchCode: "ECE", section: "SEC-B" })
   ↓ Returns: Timetable ID "mmmut-btech-ece-b-2025" (Classroom TL-207)
   ↓
6. HTTP 200 Response returned with UserAccount DTO + SessionToken
   ↓
7. Client stores in LocalStorage:
   - attendx_current_user -> hydrated with branch='ECE', room='TL-207'
   - attendx_session_token -> stored for bearer calls
   ↓
8. Dashboard greeting renders:
   "Hello, NITIN KUMAR — Electronics & Communication Engineering • Section SEC-B • Batch P1 • Classroom TL-207"
```

### Workflow B: Background Scheduled Class Check & Push Dispatch
```
1. Vercel Cron fires GET /api/cron/check-classes with Authorization: Bearer <CRON_SECRET>
   ↓
2. Route evaluates India Standard Time (IST) -> Day: "Monday", Time: 09:12 IST -> Period 1
   ↓
3. Route queries push_subscriptions joined with student_profiles:
   SELECT push_subscriptions.*, student_profiles.branch_code, student_profiles.section, student_profiles.batch
   FROM push_subscriptions JOIN student_profiles ON push_subscriptions.student_id = student_profiles.id;
   ↓
4. For each subscriber:
   - Resolves student timetable: findTimetableForStudent({ branchCode, section })
   - Filters Period 1 slot matching practical batch: (slot.batch == "ALL" || slot.batch == student.batch)
   - Checks duplicate dispatch set (prevents multiple alerts for same period)
   ↓
5. Server signs VAPID Web Push payload containing:
   - Title: "ATTENDX – CLASS STARTED"
   - Body: "Electronic Devices & Circuits (BEC-106) • Period 1 • TL-207"
   - Signed 5-minute Action Token
   ↓
6. Dispatches to Push Service (Google FCM / Mozilla) -> Delivered to student notification tray
```
