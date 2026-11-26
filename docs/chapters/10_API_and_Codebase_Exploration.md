# PART 10 — API AND CODEBASE EXPLORATION

---

## 10.1 Directory Layout & Codebase Structure

The AttendX codebase follows Next.js 16's modern `src/` directory convention, separating presentation routes, reusable client components, backend server libraries, static timetable definitions, and database migrations.

```
d:\AttendX
├── public/                                  # Static browser assets & service workers
│   ├── sw.js                                # Background Push Notification Service Worker
│   ├── manifest.json                        # Progressive Web App (PWA) manifest
│   └── next.svg                             # Default application iconography
├── src/
│   ├── app/                                 # Next.js 16 App Router (Routes & API Handlers)
│   │   ├── admin/                           # Administrator portal screens
│   │   │   ├── login/page.tsx               # Dedicated Super Administrator login page
│   │   │   └── page.tsx                     # Super Administrator management dashboard
│   │   ├── analytics/page.tsx               # Recharts attendance visualization page
│   │   ├── calculator/page.tsx              # 75% Smart Attendance recovery calculator
│   │   ├── cancellations/page.tsx           # Class cancellation reporting & consensus
│   │   ├── history/page.tsx                 # Detailed period log & audit history page
│   │   ├── login/page.tsx                   # Student portal login & password rotation
│   │   ├── mark-attendance/page.tsx         # Fast period-by-period attendance marker
│   │   ├── notifications/page.tsx           # Web Push subscriber & test alert panel
│   │   ├── polls/page.tsx                   # Democratic class polls and voting interface
│   │   ├── timetable/page.tsx               # Interactive weekly timetable & schedule center
│   │   ├── page.tsx                         # Primary Student Dashboard (home route)
│   │   ├── layout.tsx                       # Master HTML layout, fonts & navigation bar
│   │   └── api/                             # Serverless backend API route handlers
│   │       ├── admin/                       # Administrator-only privileged endpoints
│   │       │   ├── auth/                    # Admin login, session verify & initial setup
│   │       │   ├── cr/                      # Class Representative assignment & listing
│   │       │   ├── reset-password/          # Emergency student password reset handler
│   │       │   ├── stats/                   # University-wide aggregated statistics
│   │       │   ├── students/                # Paginated student directory search & CRUD
│   │       │   └── timetable/               # Administrator timetable version management
│   │       ├── announcements/               # Class announcement publication & retrieval
│   │       ├── attendance/quick-mark/       # Fast attendance logging route handler
│   │       ├── auth/                        # Student authentication & password rotation
│   │       ├── cancellations/               # Cancellation submission & peer confirmation
│   │       ├── cron/                        # Scheduled automation endpoints
│   │       │   ├── auto-absence/            # Cutoff auto-absence marking daemon
│   │       │   └── check-classes/           # Active period evaluator & Web Push dispatcher
│   │       ├── notifications/               # Push subscription vault & test dispatcher
│   │       └── polls/                       # Class poll creation, voting & closure
│   ├── components/                          # Modular React 19 UI components
│   │   ├── AttendanceCalendar.tsx           # Monthly grid calendar showing status badges
│   │   ├── CRAnnouncementModal.tsx          # Modal for CR to publish class notices
│   │   ├── QuickAttendanceMarker.tsx        # Fast daily period-by-period marking card
│   │   ├── StudentAnnouncements.tsx         # Real-time banner displaying class notices
│   │   └── StudentProfileModal.tsx          # Profile viewer & academic identity display
│   ├── data/                                # Master university timetable datasets
│   │   ├── extractedTimetables.ts           # 21 Master MMMUT schedules & lookup functions
│   │   └── timetables.json                  # Raw extracted JSON timetable backup
│   ├── lib/                                 # Shared business logic, auth & storage libraries
│   │   ├── actionSecurity.ts                # Cryptographic 5-minute action token generator
│   │   ├── attendanceCalculator.ts          # Core mathematical attendance formula engine
│   │   ├── auth.ts                          # Client-side session and cookie helper routines
│   │   ├── pushClient.ts                    # Browser Service Worker push registration
│   │   ├── seed.ts                          # Mock profile data for demonstration modes
│   │   ├── serverAdmin.ts                   # Server-side administrative student logic
│   │   ├── serverAnnouncements.ts           # Authoritative announcement queries & storage
│   │   ├── serverAuth.ts                    # Credential authentication & password rotation
│   │   ├── serverAuthGuard.ts               # Authoritative session & RBAC security guards
│   │   ├── serverCancellations.ts           # Authoritative cancellation persistence logic
│   │   ├── serverPolls.ts                   # Democratic class poll voting & scoping engine
│   │   ├── storage.ts                       # Client-side storage layer with self-healing
│   │   ├── subscriptionStore.ts             # Web Push subscription persistence vault
│   │   ├── supabase.ts                      # Client-side Supabase client initialization
│   │   └── webpush.ts                       # Server-side VAPID push payload signing
│   └── types/                               # TypeScript domain model definitions
│       └── index.ts                         # Complete domain models (User, Timetable, etc.)
├── supabase/                                # Database schemas, migrations & SQL unit tests
│   ├── migrations/                          # Atomic, timestamped PostgreSQL migrations
│   └── schema.sql                           # Master PostgreSQL schema definition
├── scripts/                                 # Verification, migration & test automation scripts
├── package.json                             # Dependencies, scripts and package metadata
├── vercel.json                              # Vercel deployment configuration & cron schedules
└── next.config.ts                           # Next.js 16 Turbopack compiler configuration
```

---

## 10.2 Master Codebase Reference Table

| File / Folder Path | Architecture Tier | Primary Responsibility & Role | Key Exported Functions / Endpoints | Connected Components |
| :--- | :--- | :--- | :--- | :--- |
| `src/app/page.tsx` | Presentation (Client) | Main student dashboard; displays live greeting, statistics, and daily slots. | `StudentDashboard()` | `QuickAttendanceMarker`, `StudentAnnouncements`, `storage.ts` |
| `src/app/timetable/page.tsx` | Presentation (Client) | Interactive timetable schedule viewer and student personal override center. | `TimetableManagementPage()` | `storage.ts`, `extractedTimetables.ts` |
| `src/app/calculator/page.tsx`| Presentation (Client) | 75% attendance recovery roadmap calculator and what-if attendance simulator. | `SmartCalculatorPage()` | `attendanceCalculator.ts`, `canvas-confetti` |
| `src/app/admin/page.tsx` | Presentation (Client) | Super-administrator command center for student directory, CRs, and stats. | `AdminDashboardPage()` | `/api/admin/*`, `serverAdmin.ts` |
| `src/lib/serverAuthGuard.ts` | Security / Middleware | Verifies incoming bearer tokens (JWT/HMAC), fetches DB roles, and gates RBAC. | `verifyServerSession()`, `requireRole()`, `requireAdmin()` | All Route Handlers in `src/app/api/*` |
| `src/lib/serverAuth.ts` | Backend Logic | Identity resolution (Roll No $\rightarrow$ Alias), GoTrue Auth, and password rotation. | `authenticateCredentials()`, `rotateUserPassword()` | `/api/auth/login`, `/api/auth/rotate-password` |
| `src/lib/attendanceCalculator.ts`| Core Logic | Pure mathematical formulas for percentage, safe absences, and recovery classes. | `calculateMetrics()`, `computeDashboardStats()`, `simulateAttendance()` | `page.tsx`, `calculator/page.tsx`, `analytics/page.tsx` |
| `src/lib/storage.ts` | Client Persistence | Local storage abstraction, self-healing stale profiles, isolated custom timetables. | `getStoredProfile()`, `getActiveTimetable()`, `updatePeriodAttendance()` | All client page routes |
| `src/data/extractedTimetables.ts`| Static Data / Logic | Master repository of 21 official university timetables and branch lookup functions. | `UNIVERSITY_DATABASE`, `findTimetableForStudent()`, `getBranchFullName()` | `serverAuth.ts`, `serverAuthGuard.ts`, `storage.ts` |
| `src/lib/webpush.ts` | Backend Service | Signs Web Push payloads with VAPID ECDSA keys and dispatches push events. | `sendWebPush()` | `/api/cron/check-classes`, `/api/notifications/test-push` |
| `src/lib/actionSecurity.ts` | Security Utility | Generates and verifies time-limited (5-minute) signed tokens for quick marking. | `generateActionToken()`, `verifyActionToken()`, `getISTDateTime()` | `/api/cron/check-classes`, `/api/attendance/quick-mark` |
| `src/lib/serverPolls.ts` | Backend Domain | Manages class polls, enforces branch/section scoping, and validates vote uniqueness. | `serverGetPollsForUser()`, `serverVoteInPoll()`, `serverCreatePoll()` | `/api/polls/route.ts`, `polls/page.tsx` |
| `src/lib/serverCancellations.ts`| Backend Domain | Stores cancellation reports, coordinates CR/Admin confirmations, and logs reasons. | `serverGetCancellationReports()`, `serverSubmitCancellationReport()` | `/api/cancellations/*`, `cancellations/page.tsx` |
| `src/lib/subscriptionStore.ts` | Backend Domain | In-memory and Supabase cloud persistence for browser push subscriptions. | `savePushSubscription()`, `getAllActiveSubscriptions()` | `/api/notifications/subscribe`, `/api/cron/check-classes` |

---

## 10.3 Walkthrough of the Most Important Files

### 1. `src/lib/serverAuthGuard.ts` (The Gatekeeper)
*Explain in Simple Language:*  
This file is the **security bouncer** of the entire application. Whenever any frontend component asks the backend for data (like loading polls or assigning a CR), this file checks the student's digital badge (Bearer Token). It verifies whether the token is genuine, queries the database to see if the user is a student, CR, or admin, and stops any unauthorized user right at the door with an `HTTP 401 Unauthorized` or `HTTP 403 Forbidden` response.

### 2. `src/lib/attendanceCalculator.ts` (The Brain)
*Explain in Simple Language:*  
This file is the **mathematical calculator** of AttendX. It contains zero database or UI code; it is pure, deterministic mathematics. Given a list of class records, it counts attended and conducted classes, throws away cancelled classes so the student isn't penalized, applies the floor formula to tell the student how many classes they can safely skip, and applies the ceiling formula to tell them how many consecutive classes they must attend to escape detention.

### 3. `src/lib/storage.ts` (The Local Memory & Self-Healer)
*Explain in Simple Language:*  
This file manages everything saved inside the student's web browser. It ensures that when a student clicks "Present", the change is saved instantly even if the student is standing in an elevator without Wi-Fi. It also includes an automatic **doctor** (`getStoredProfile` self-healing): if an old profile had a bug where the branch said "Information Technology" for an ECE student, this file immediately detects the error and fixes it.

### 4. `src/data/extractedTimetables.ts` (The Official Schedule Directory)
*Explain in Simple Language:*  
This file represents the digitized version of the entire university's 20-page timetable PDF. It contains every class slot for all 7 engineering departments, the exact room numbers (`TL-207`, `TL-203`, etc.), the teacher names, and whether a class is Theory or Lab. It also provides the master matching function `findTimetableForStudent()`, ensuring students always see their own section's schedule.
