# PART 7 — FEATURE-BY-FEATURE EXPLANATION

---

## 7.1 Complete Feature Directory

AttendX delivers 15 interconnected, production-ready features spanning student empowerment, schedule tracking, democratic consensus, and administrative oversight:

```
+-----------------------------------------------------------------------------------+
|                                  ATTENDX FUNCTIONAL MATRIX                        |
+-----------------------------------------------------------------------------------+
|   STUDENT FEATURES          |   CR FEATURES              |   ADMIN FEATURES       |
|   1. Roll No / Enr. Login   |   8. Class Timetable Edit  |   12. Super Admin Login|
|   2. Reactive Dashboard     |   9. Cancel Class Report   |   13. Student Directory|
|   3. Quick Period Marking   |   10. Class Poll Creation  |   14. CR Appointments  |
|   4. Attendance History     |   11. Official Section Post|   15. Password Reset   |
|   5. 75% Smart Calculator   |                            |   16. Timetable Release|
|   6. Analytics & Charts     |                            |                        |
|   7. Personal Timetable Mod |                            |                        |
+-----------------------------------------------------------------------------------+
```

---

## 7.2 Deep Dive into Every Application Feature

---

### Feature 1: Dual-Portal Authentication & Identity Resolution
- **What It Does:** Enables students to log in using their university Roll Number (e.g. `2026041133`) or Enrollment Number (`2026ECD1044`). Provides a separate, hardened portal for administrators (`/admin/login`).
- **Why It Exists:** Students do not remember complex internal cloud email aliases; they identify by university examination identifiers. Administrators require an isolated access perimeter.
- **User Interaction:** The student enters their roll number and password. The system identifies them, verifies credentials, and immediately directs them to their personalized dashboard.
- **Frontend Implementation:** [`src/app/login/page.tsx`](file:///d:/AttendX/src/app/login/page.tsx), [`src/app/admin/login/page.tsx`](file:///d:/AttendX/src/app/admin/login/page.tsx).
- **Backend Implementation:** [`src/app/api/auth/login/route.ts`](file:///d:/AttendX/src/app/api/auth/login/route.ts), [`src/app/api/admin/auth/login/route.ts`](file:///d:/AttendX/src/app/api/admin/auth/login/route.ts).
- **Database Involvement:** `student_profiles` table, Supabase `auth.users`.
- **Key Functions:** `loginUser()`, `authenticateCredentials()`, `rollNumberToEmailAlias()`.
- **Underlying Concept:** Identity resolution, Credential masking, JWT minting.

---

### Feature 2: Interactive Student Dashboard & Header Greeting
- **What It Does:** Serves as the central command screen displaying real-time overall percentage, total classes conducted/attended/absent/cancelled, Safe Absences badge, Shortage alert, today's schedule, and class greeting with exact lecture room.
- **Why It Exists:** Gives students an instantaneous 360-degree overview of their academic standing and daily commitments in under 3 seconds.
- **User Interaction:** Renders greeting: `"Hello, NITIN KUMAR • Electronics & Communication Engineering • Section SEC-B • Batch P1 • Classroom TL-207"`. Shows color-coded status badges (Green Safe, Yellow Warning, Red Danger).
- **Frontend Implementation:** [`src/app/page.tsx`](file:///d:/AttendX/src/app/page.tsx), [`src/components/StudentProfileModal.tsx`](file:///d:/AttendX/src/components/StudentProfileModal.tsx).
- **Backend Involvement:** Session verification via `verifyServerSession()` on initial load.
- **Database Involvement:** `student_profiles`, `branches`, `sections`.
- **Key Functions:** `computeDashboardStats()`, `getActiveTimetable()`, `getStoredProfile()`.
- **Underlying Concept:** Local-first reactive state hydration, responsive layout design.

---

### Feature 3: Period-by-Period Quick Attendance Marker
- **What It Does:** Renders all scheduled lecture and laboratory slots for the current calendar day, allowing students to toggle between `PRESENT`, `ABSENT`, and `CANCELLED` with a single click.
- **Why It Exists:** Eliminates tedious manual form filling. Provides an instant, tactile interface to record attendance right as classes conclude.
- **User Interaction:** Clicking "Present" increments attended and conducted counters, turns the card emerald green, and recalculates safe absences in real time.
- **Frontend Implementation:** [`src/components/QuickAttendanceMarker.tsx`](file:///d:/AttendX/src/components/QuickAttendanceMarker.tsx), [`src/app/mark-attendance/page.tsx`](file:///d:/AttendX/src/app/mark-attendance/page.tsx).
- **Storage Tier:** Client-side browser `localStorage` isolated under `attendx_attendance_records_user_<id>`.
- **Key Functions:** `updatePeriodAttendance()`, `markAllPeriodsForDate()`, `markLabSession()`.
- **Underlying Concept:** Optimistic UI updating, zero-latency local caching.

---

### Feature 4: Attendance History & Chronological Audit Log
- **What It Does:** Displays a comprehensive, searchable, filterable log of every single marked class, complete with timestamps, subject codes, faculty names, period numbers, and modification history.
- **Why It Exists:** Enables students to audit their attendance record over time, resolve discrepancies, and understand exactly which dates caused an attendance drop.
- **User Interaction:** Students can filter by subject (e.g. `BEC-106`), status (`ABSENT`), or search for specific dates. Any status modification automatically creates an immutable audit trail entry.
- **Frontend Implementation:** [`src/app/history/page.tsx`](file:///d:/AttendX/src/app/history/page.tsx).
- **Storage Tier:** Local storage record store + `attendx_attendance_audit_logs`.
- **Key Functions:** `logAttendanceChange()`, `getAuditLogs()`, `getStoredAttendance()`.
- **Underlying Concept:** Audit logging, immutable event recording, client-side filtering.

---

### Feature 5: Visual Attendance Analytics & Subject Trends
- **What It Does:** Renders graphical visual summaries of academic attendance using SVG charts: overall compliance donut charts, bar charts comparing subject percentages against the 75% baseline, and historical trendlines.
- **Why It Exists:** Visual representations allow students to spot dangerous attendance drops in specific subjects faster than raw numerical tables.
- **User Interaction:** Interactive tooltips display exact class counts when hovering over chart elements.
- **Frontend Implementation:** [`src/app/analytics/page.tsx`](file:///d:/AttendX/src/app/analytics/page.tsx) utilizing Recharts (`PieChart`, `BarChart`, `ResponsiveContainer`).
- **Data Flow:** `getStoredAttendance()` $\rightarrow$ `computeDashboardStats()` $\rightarrow$ formatted for Recharts dataset.
- **Underlying Concept:** Declarative data visualization, responsive SVG rendering.

---

### Feature 6: 75% Smart Recovery Calculator & What-If Simulator
- **What It Does:** The core mathematical decision-support engine of AttendX. Computes:
  1. **Safe Absences:** Exactly how many future lectures can be missed without breaching 75%.
  2. **Recovery Needed:** Exactly how many consecutive classes must be attended to climb above 75% or 80%.
  3. **What-If Simulator:** Interactive slider allowing students to simulate: *"If I attend 5 more classes and miss 2, what will my percentage be?"*
- **Why It Exists:** Solves the primary dilemma students face when deciding whether they can afford to take medical or personal leave.
- **Frontend Implementation:** [`src/app/calculator/page.tsx`](file:///d:/AttendX/src/app/calculator/page.tsx).
- **Math Engine:** [`src/lib/attendanceCalculator.ts`](file:///d:/AttendX/src/lib/attendanceCalculator.ts).
- **Key Functions:** `calculateMetrics()`, `simulateAttendance()`.
- **Underlying Concept:** Discrete inequality math, predictive modeling, gamified feedback (confetti).

---

### Feature 7: University Timetable Viewer & Schedule Center
- **What It Does:** Displays the student's complete weekly academic timetable (Monday through Saturday, Periods 1 to 8), with accurate period timings, subject names, faculty, and room numbers.
- **Why It Exists:** Replaces static university PDF printouts with an interactive, searchable digital schedule.
- **Frontend Implementation:** [`src/app/timetable/page.tsx`](file:///d:/AttendX/src/app/timetable/page.tsx).
- **Database / Data Tier:** [`src/data/extractedTimetables.ts`](file:///d:/AttendX/src/data/extractedTimetables.ts) (21 master schedules).
- **Key Functions:** `getActiveTimetable()`, `findTimetableForStudent()`.
- **Underlying Concept:** Relational schedule ingestion, responsive timetable grid layout.

---

### Feature 8: Student Personal Timetable Customization
- **What It Does:** Allows individual students to adjust their personal schedule (e.g. custom remedial classes, shifted elective slots, personal tutorial times) without affecting peers.
- **Why It Exists:** Recognizes that students participate in personalized academic activities (honors courses, remedial sessions, university club slots).
- **User Interaction:** Drag-and-drop slot swapping or opening the Edit Slot modal.
- **Storage Tier:** Isolated in `localStorage.setItem('attendx_custom_timetables_user_<id>', ...)` with a one-click "Reset to University Official" fallback.
- **Key Functions:** `saveCustomTimetable()`, `resetCustomTimetable()`.
- **Underlying Concept:** User-scoped data isolation, optimistic overrides.

---

### Feature 9: Class Representative (CR) Official Timetable Management
- **What It Does:** Empowers authorized Class CRs to modify and publish the official class timetable for their entire section when university faculty permanently reschedule a course.
- **Why It Exists:** University schedules change dynamically during the semester. CRs need the authority to publish official updates to their section without administrative intervention.
- **Authorization Guard:** Enforces `caller.role === "class_admin"` and verifies that `caller.managedBranchCode === timetable.branchCode` and `caller.managedSection === timetable.section`.
- **Frontend & Storage Implementation:** [`src/app/timetable/page.tsx`](file:///d:/AttendX/src/app/timetable/page.tsx), [`src/lib/storage.ts`](file:///d:/AttendX/src/lib/storage.ts#L485).
- **Underlying Concept:** Role-Based Access Control, peer synchronization.

---

### Feature 10: Democratic Class Cancellation Reporting & Consensus
- **What It Does:** Allows Class CRs and students to report cancelled lectures (teacher absent, mass bunk, university fest rehearsal) and facilitates atomic confirmations.
- **Why It Exists:** Prevents cancelled classes from corrupting student attendance records by excluding cancelled slots from both attended and conducted counts ($A/C$).
- **Frontend Implementation:** [`src/app/cancellations/page.tsx`](file:///d:/AttendX/src/app/cancellations/page.tsx).
- **Backend Endpoints:** `GET, POST /api/cancellations`, `POST /api/cancellations/confirm`.
- **Database Involvement:** `cancellation_reports`, `cancellation_report_confirmations`.
- **Key Functions:** `serverGetCancellationReports()`, `serverSubmitCancellationReport()`, `serverConfirmCancellationReport()`.
- **Underlying Concept:** Consensus mechanics, atomic database transactions.

---

### Feature 11: Class Polls & Student Democratic Voting
- **What It Does:** Provides a democratic voting mechanism where CRs can create polls (e.g. "Reschedule Math tutorial to Friday?", "Mass Bunk on College Fest Day?"), and students cast tamper-proof votes.
- **Why It Exists:** Unofficial WhatsApp group chats lead to disputes, lost messages, and unverified vote counts. AttendX brings voting inside the verified academic application.
- **Frontend Implementation:** [`src/app/polls/page.tsx`](file:///d:/AttendX/src/app/polls/page.tsx).
- **Backend Endpoints:** `GET, POST, PATCH /api/polls`.
- **Database Involvement:** `class_polls`, `class_poll_options`, `class_poll_votes`.
- **Security Constraint:** `UNIQUE (poll_id, student_id)` strictly prevents double voting.
- **Underlying Concept:** Scoped democratic consensus, cryptographic uniqueness.

---

### Feature 12: Official Sectional Announcements
- **What It Does:** Enables Administrators and Class CRs to broadcast official notices (exam dates, room changes, assignment deadlines) directly to students belonging to their branch and section.
- **Why It Exists:** Centralizes critical classroom notices directly within the attendance interface where students look daily.
- **Frontend Implementation:** [`src/components/StudentAnnouncements.tsx`](file:///d:/AttendX/src/components/StudentAnnouncements.tsx).
- **Backend Endpoint:** `GET, POST /api/announcements`.
- **Database Involvement:** `class_announcements`.
- **Underlying Concept:** Targeted publisher-subscriber messaging, RBAC.

---

### Feature 13: Web Push Notifications & Class Commencement Reminders
- **What It Does:** Dispatches background push alerts to student devices 5 minutes before scheduled lectures begin, providing one-click attendance marking action tokens.
- **Why It Exists:** Students often lose track of time between lectures or forget to mark attendance during the lecture window.
- **Frontend Implementation:** [`src/app/notifications/page.tsx`](file:///d:/AttendX/src/app/notifications/page.tsx), `public/sw.js`.
- **Backend Subsystem:** [`src/lib/webpush.ts`](file:///d:/AttendX/src/lib/webpush.ts), [`src/app/api/cron/check-classes/route.ts`](file:///d:/AttendX/src/app/api/cron/check-classes/route.ts).
- **Protocol:** RFC 8291 / RFC 8292 Web Push Protocol with VAPID cryptographic signing.
- **Underlying Concept:** Progressive Web App (PWA) background capabilities, VAPID signing, cron triggers.

---

### Feature 14: Dedicated Administrator Portal & Student Directory
- **What It Does:** Gives university administrators a separate command center (`/admin`) to search, filter, and inspect all 1,189 student records, assign or revoke Class CR roles, reset forgotten student credentials, and view university-wide metrics.
- **Why It Exists:** Centralized governance, student account support, and institutional oversight.
- **Frontend Implementation:** [`src/app/admin/page.tsx`](file:///d:/AttendX/src/app/admin/page.tsx).
- **Backend Endpoints:** `/api/admin/students`, `/api/admin/cr`, `/api/admin/reset-password`, `/api/admin/stats`.
- **Database Involvement:** `student_profiles`, `admin_password_resets`.
- **Underlying Concept:** Super-administrator privilege gating, paginated data tables, enterprise governance.

---

### Feature 15: Mandatory One-Time Password Rotation
- **What It Does:** Enforces that newly provisioned students change their initial seed password on first login, storing an irreversible flag in the database.
- **Why It Exists:** Protects accounts created from university manifests from unauthorized peer access.
- **Frontend Implementation:** Non-dismissible modal in `src/app/page.tsx`.
- **Backend Endpoint:** `/api/auth/rotate-password`.
- **Database Involvement:** `student_profiles.password_change_consumed`.
- **Underlying Concept:** State machine transition, atomic privilege escalation prevention.
