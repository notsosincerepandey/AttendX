# PART 18 — QUICK REVISION SHEET (PRE-VIVA CRAM GUIDE)

> [!IMPORTANT]
> **READ THIS IN THE 10 MINUTES BEFORE YOUR VIVA BEGINS.**  
> This sheet condenses the entire AttendX project into high-impact facts, spoken pitches, critical formulas, and the 20 most lethal viva questions.

---

## 18.1 AttendX at a Glance

- **AttendX in One Sentence:**  
  *AttendX is an autonomous, student-centric academic attendance and timetable intelligence engine that enables university students to track classes in real time, forecast safe absences against statutory 75% thresholds, and synchronize official branch schedules.*
- **The Problem:**  
  University ERP registers are updated weeks late, leaving students blindsided by sudden end-semester debarment lists without the time or mathematical foresight to recover.
- **The Solution:**  
  A local-first, zero-latency daily attendance cockpit combined with cloud PostgreSQL persistence, predictive mathematical formulas (Safe Absences & Recovery Roadmaps), democratic class consensus on cancellations and polls, and Web Push class commencement reminders.
- **The Tech Stack:**  
  Next.js 16.4.5 (App Router, Turbopack), React 19.3.0, TypeScript 5, Tailwind CSS v4, Supabase (PostgreSQL 15, GoTrue Auth, RLS), Web Push API (RFC 8292 VAPID), Recharts 3.10.1, Vercel Edge Hosting.
- **The Architecture in 5 Lines:**  
  1. **Presentation:** React 19 Client UI with local-first `localStorage` caching for zero-latency marking.  
  2. **API Tier:** Next.js Serverless Route Handlers executing stateless micro-operations.  
  3. **Security Guard:** `serverAuthGuard.ts` verifying 3-part Supabase JWTs and gating Role-Based Access Control.  
  4. **Database:** Supabase Cloud PostgreSQL with 25 relational tables and Row Level Security.  
  5. **Background Automation:** Vercel Cron triggering VAPID Web Push alerts 5 minutes before scheduled lectures.
- **The Database:**  
  PostgreSQL 15 on Supabase (`iczjocbishkvkkkfvalz`). 1,189 verified student accounts across 7 branches, 17 sections, and 21 master university timetables.
- **The Authentication:**  
  Students log in via **Roll Number** (e.g. `2026041133`) or **Enrollment Number** (`2026ECD1044`). The backend converts it to an internal alias (`student.<roll>@attendx.mmmut.ac.in`) and authenticates via Supabase Auth bcrypt hashing.
- **The Core Mathematical Formulas:**  
  $$\text{Percentage } (P) = \left( \frac{A}{C} \right) \times 100 \quad \text{[Cancelled classes excluded from } A \text{ and } C\text{]}$$  
  $$\text{Safe Absences } (S) = \left\lfloor \frac{A - (0.75 \times C)}{0.75} \right\rfloor \quad \text{[Floor applied for discrete integer classes]}$$  
  $$\text{Recovery Needed } (R_{75}) = \left\lceil \frac{(0.75 \times C) - A}{0.25} \right\rceil \quad \text{[Ceiling applied; each class recovers } 0.25 \text{ units]}$$

---

## 18.2 Spoken Project Introductions

### The 60-Second Elevator Pitch
> *"Good morning, Professor. AttendX is an attendance management and schedule intelligence engine built for students at MMMUT. While the university has an official register, it is updated weeks late, leading to unexpected student debarment right before exams. AttendX solves this by giving students real-time control: it automatically maps their branch and section timetable, allows one-click period marking, and uses mathematical formulas to tell them exactly how many classes they can safely miss, or how many they must attend to escape shortage. It also includes democratic class polls, peer-confirmed cancellations, and push notifications before class starts. The project is fully deployed on Vercel with a Supabase PostgreSQL backend containing 1,189 genuine student records."*

### The 2-Minute Structured Introduction
> *"Good morning, Professor. I built AttendX to solve a critical information asymmetry problem in universities. Under university ordinances, students must maintain 75% attendance to sit for examinations. However, students lack real-time visibility into their attendance counts, and unrecorded class cancellations or complex practical lab schedules frequently cause unintentional attendance shortages.*  
>  
> *AttendX is a full-stack web application built on Next.js 16, React 19, and Supabase PostgreSQL. When a student logs in using their university examination roll number, the system automatically resolves their academic profile and binds their exact timetable from our database of 21 master university schedules—resolving their specific lecture hall, such as Room TL-207 for ECE Section-B.*  
>  
> *Architecturally, AttendX uses a local-first design: students can mark attendance period-by-period with zero network latency, and our mathematical engine calculates cumulative percentages, Safe Absences, and Recovery Roadmaps without percentage distortion. Collective events—like mass bunks, tutorial rescheduling polls, and class cancellations—are persisted in cloud PostgreSQL with Row Level Security and unique voting constraints. In short, AttendX transforms a rigid administrative rule into an actionable daily academic tool for students."*

### The 5-Minute Technical Deep Dive
> *"Good morning, Professor. I would like to walk you through the technical architecture of AttendX.*  
>  
> *First, regarding our **Frontend and Presentation Tier**: We use Next.js 16 with Turbopack and React 19. The UI is built using Tailwind CSS v4 and Recharts. The student dashboard hydrates state from browser LocalStorage for immediate responsiveness, so students can mark attendance even in offline lecture halls. Storage is strictly namespaced by student UUID to prevent data mixing on shared devices.*  
>  
> *Second, regarding **Authentication and Security**: Students do not log in using artificial email addresses; they input their university Roll Number or Enrollment Number. Our serverless route handler `/api/auth/login` maps this identifier to an internal alias and verifies credentials against Supabase GoTrue Auth using bcrypt hashing. Sessions are maintained via 3-part JWT access tokens, with a fallback to cryptographically signed HMAC-SHA256 tokens. Sensitive routes are protected by our `serverAuthGuard.ts` middleware, which enforces Role-Based Access Control across students, Class Representatives, and Administrators.*  
>  
> *Third, regarding our **Database and Relational Architecture**: We use PostgreSQL 15 hosted on Supabase Cloud. Our schema contains 25 normalized tables adhering to Third Normal Form. For example, `student_profiles` has foreign keys referencing `branches`, `sections`, and `academic_sessions`. In `class_poll_votes`, we enforce a composite unique constraint `(poll_id, student_id)` to mathematically guarantee that a student cannot vote more than once.*  
>  
> *Fourth, regarding our **Mathematical Engine**: In `attendanceCalculator.ts`, we avoid Simpson's Paradox by summing raw attended and conducted units across theory and labs rather than averaging percentages. We compute Safe Absences using $\lfloor (A - 0.75C) / 0.75 \rfloor$, and Recovery Classes Needed using $\lceil (0.75C - A) / 0.25 \rceil$. Cancelled classes are completely excluded from both the numerator and denominator so students are not penalized.*  
>  
> *Finally, regarding **Automation**: We use Vercel Cron to trigger `/api/cron/check-classes` every morning. The server evaluates current India Standard Time, filters the active timetable slot for the student's specific practical batch (P1 vs P2), and signs an RFC 8292 VAPID Web Push notification delivered directly to the student's notification tray.*  
>  
> *The project is fully live and deployed on Vercel with 1,189 genuine student accounts. I would be delighted to demonstrate any part of the system or code."*

---

## 18.3 The Top 20 Most Critical Viva Questions

1. **What is the primary difference between AttendX and our university ERP?**  
   *Answer:* University ERPs are post-facto administrative logs for teachers; AttendX is a real-time, predictive decision-support tool for students.
2. **Where is your database client created?**  
   *Answer:* In `src/lib/serverAuthGuard.ts` (lines 70–75) and `src/lib/serverAuth.ts` using `createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`.
3. **Can a student see the service-role key in their browser?**  
   *Answer:* No. It is not prefixed with `NEXT_PUBLIC_`, meaning Next.js never bundles it to client JavaScript; it exists strictly on the server.
4. **How does a student log in without an email address?**  
   *Answer:* The student enters their Roll Number; the backend server queries `student_profiles` and resolves it to an internal email alias for Supabase Auth.
5. **How do you calculate Safe Absences?**  
   *Answer:* $\lfloor (A - (0.75 \times C)) / 0.75 \rfloor$. We apply the floor function because classes occur in discrete integer units.
6. **How do you calculate Recovery Classes Needed?**  
   *Answer:* $\lceil ((0.75 \times C) - A) / (1 - 0.75) \rceil$. We apply the ceiling function; each class attended recovers 0.25 units against the deficit.
7. **What happens to cancelled classes in your math?**  
   *Answer:* They are given status `CANCELLED` and completely excluded from both attended ($A$) and conducted ($C$) totals ($A/C$).
8. **What is Simpson's Paradox in attendance?**  
   *Answer:* Averaging percentages between theory and practicals distorts the truth. We avoid it by summing raw aggregate units across all classes.
9. **How do you prevent a student from voting twice in a class poll?**  
   *Answer:* PostgreSQL enforces a `UNIQUE (poll_id, student_id)` constraint on the `class_poll_votes` table.
10. **Where is the official university timetable stored?**  
    *Answer:* In `src/data/extractedTimetables.ts`, containing 21 official master MMMUT schedules extracted from the university PDF.
11. **How do you know Nitin Kumar belongs in Room TL-207?**  
    *Answer:* `findTimetableForStudent()` matches his branch `ECE` and section `SEC-B` to timetable `mmmut-btech-ece-b-2025`, which assigns Room `TL-207`.
12. **Why don't Batch P1 students see Batch P2 lab classes?**  
    *Answer:* The timetable slots are filtered by `slot.batch === "ALL" || slot.batch === profile.batch`.
13. **What is Row Level Security (RLS)?**  
    *Answer:* A PostgreSQL feature where the database engine itself enforces access policies based on the user's JWT `auth.uid()`.
14. **What is a Service Worker?**  
    *Answer:* A background browser script (`public/sw.js`) that intercepts push events and displays notifications even when the app tab is closed.
15. **What is VAPID in Web Push?**  
    *Answer:* Voluntary Application Server Identification (RFC 8292)—cryptographic ECDSA keys proving our server authorized the push alert.
16. **What is the dual-token architecture in AttendX?**  
    *Answer:* Genuine 3-part Supabase Auth JWTs for cloud operation, and 2-part HMAC-SHA256 tokens for offline resilience.
17. **How does an administrator reset a student password?**  
    *Answer:* Via `POST /api/admin/reset-password`, which verifies the admin's JWT and calls `supabaseAdmin.auth.admin.updateUserById()`.
18. **What is the Self-Healing mechanism in `getStoredProfile()`?**  
    *Answer:* On boot, `getStoredProfile()` checks if cached profile branch names or timetable IDs are stale, healing them to match canonical data.
19. **How does your GitHub connect to Vercel?**  
    *Answer:* Through automated GitHub webhooks that trigger a Turbopack production build whenever code is pushed to `main`.
20. **Is your project frontend-only or full-stack?**  
    *Answer:* Full-stack. It has a React 19 frontend, Next.js serverless route handlers, cryptographic middleware, and a cloud PostgreSQL 15 database.
