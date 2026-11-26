# PART 1 — PROJECT OVERVIEW

---

## 1.1 Executive Summary & Introduction

**AttendX** is a full-stack, autonomous, student-centric academic attendance management, schedule intelligence, and timetable tracking platform designed and implemented for the engineering and management students of **Madan Mohan Malaviya University of Technology (MMMUT), Gorakhpur**. 

Unlike conventional Enterprise Resource Planning (ERP) or centralized Learning Management Systems (LMS) that serve as administrative instruments of surveillance and post-facto punitive enforcement, AttendX shifts the paradigm toward **proactive student empowerment**. It provides students, Class Representatives (CRs), and departmental administrators with a synchronized, real-time operating environment that automates timetable mapping, calculates mathematical attendance metrics, enforces ordinance thresholds, facilitates democratic class cancellation consensus, and dispatches timely push notifications for class commencement.

```
+-----------------------------------------------------------------------------------+
|                                  ATTENDX PARADIGM                                 |
+-----------------------------------------------------------------------------------+
|   TRADITIONAL UNIVERSITY ERP             |   ATTENDX STUDENT INTELLIGENCE         |
|   - Top-down administrative registry     |   - Bottom-up student empowerment      |
|   - Updated days/weeks after classes     |   - Instant real-time logging & sync   |
|   - Unforgiving "Detained List" surprise |   - Predictive "Safe Bunk" calculation |
|   - Static PDF timetables across sheets  |   - Automated dynamic section mapping  |
|   - Unilateral teacher absence logging   |   - Democratic class cancellation votes|
+-----------------------------------------------------------------------------------+
```

---

## 1.2 Origin Story & Motivation

In academic institutions governed by rigid statutory attendance minimums—specifically the mandatory **75% minimum attendance rule** enforced by university ordinances and technical education regulatory bodies (such as AICTE and UGC)—students frequently face severe academic repercussions due to information asymmetry:
1. **The Black Box of Official Attendance Records:** Official university attendance registers are manually updated by instructors and uploaded into central portals after significant latency—often several weeks into the semester or directly before end-semester examinations.
2. **The "Detention Shock":** Because students lack real-time visibility into their cumulative attended vs. conducted class tallies, hundreds of students are unexpectedly placed on the "Detained / Debarred List" days before exams, forfeiting examination eligibility.
3. **Unrecorded Institutional Cancellations:** Mass bunks, unexpected faculty leave, departmental meetings, cultural rehearsals, and university holidays frequently lead to cancelled lectures that are erroneously marked as absences or recorded inconsistently across registers.
4. **Complex Practical / Lecture Timetable Layouts:** First-year and degree students at MMMUT share complex master schedules split across 20+ PDF pages with split practical batches (Batch P1 vs. Batch P2), leading to missed lab sessions due to room and timing confusion.

AttendX was conceived and constructed to eliminate this friction entirely. By equipping students with a high-fidelity local tracking engine backed by cloud persistence and official master schedule intelligence, AttendX enables students to maintain continuous, verified custody over their academic attendance.

---

## 1.3 The Problem Statement

> **Formal Problem Statement:**  
> *"Undergraduate engineering students at technical universities lack an integrated, reliable, real-time tool to track period-by-period class attendance against statutory 75% thresholds, predict the consequences of prospective absences, synchronize branch- and batch-specific timetable updates across peer groups, and democratically record institutional class cancellations, leading to inadvertent examination debarment, administrative disputes, and academic stress."*

### Key Dimensions of the Problem:
- **Disparate Class Structures:** Theory classes (1 credit/unit) and Laboratory classes (multi-period blocks) must be calculated mathematically using raw aggregate units rather than flawed arithmetic averages of percentages (preventing Simpson's Paradox).
- **Batch Discrepancies:** A single section (e.g., Section B) is bifurcated into practical batches (P1 and P2). Practical sessions occur in dedicated labs while theory lectures occur in lecture theaters, requiring strict schedule isolation.
- **Absence Forecasting Deficit:** Students do not merely need to know their *past* attendance; they require answers to forward-looking operational questions:
  - *"How many consecutive lectures can I safely miss without dropping below 75%?"*
  - *"If I am already below 75%, exactly how many consecutive classes must I attend to recover compliance?"*

---

## 1.4 Project Objectives

AttendX was architected to fulfill the following engineering and academic objectives:

1. **Automated Academic Identity & Timetable Resolution:**  
   Ingest the student's authoritative academic identity (Roll Number, Enrollment Number, Branch, Section, and Practical Batch) and automatically map the exact official timetable from MMMUT's master database (21 distinct timetables), resolving specific lecture rooms (e.g., `TL-207` for ECE SEC-B vs. `TL-203` for IT SEC-B).
2. **Precision Mathematical Attendance Engine:**  
   Calculate attended, conducted, and cancelled classes in real time; compute the current aggregate percentage; determine the integer count of **Safe Absences** (classes a student can miss while remaining $\ge 75\%$); and compute the **Recovery Classes Needed** (classes a student must attend consecutively to cross $75\%$ or $80\%$).
3. **Discrete Theory and Laboratory Analytics:**  
   Track Theory and Laboratory metrics separately and combined, ensuring multi-period lab practicals (e.g., 4-period programming lab) correctly record individual discrete units.
4. **Democratic Class Cancellation Reporting & Consensus:**  
   Provide Class Representatives (CRs) and students with an authenticated workflow to report class cancellations (teacher absence, mass bunk, university holiday) with atomic peer confirmation and administrative confirmation.
5. **Class Polls & Voting System:**  
   Enable authenticated student bodies to create, vote on, and conclude class-specific polls (e.g., rescheduling a tutorial, deciding a mass bunk date) with strict branch/section isolation and cryptographic tamper prevention.
6. **Class Commencement Reminders via Web Push:**  
   Implement background push notifications triggered via automated cron execution to alert students 5 minutes before scheduled classes begin, providing one-click attendance marking action tokens.
7. **Administrative Governance & Emergency Interventions:**  
   Provide university administrators with an isolated portal (`/admin`) to inspect university-wide stats, manage Class CR appointments, reset student credentials securely, and publish official timetable revisions.

---

## 1.5 Target Users & Persona Profiles

```
+-----------------------------------------------------------------------------------+
|                                  USER TAXONOMY                                    |
+-----------------------------------------------------------------------------------+
|  ROLE: Student            |  ROLE: Class Admin (CR)      |  ROLE: Administrator   |
|  - Tracks daily classes   |  - All Student capabilities  |  - University overview |
|  - Customizes schedule    |  - Official class timetables |  - Student directory   |
|  - Simulates attendance   |  - Submits cancellation reps |  - CR assignment       |
|  - Votes in class polls   |  - Creates & closes polls    |  - Password resets     |
|  - Receives push alerts   |  - Posts announcements       |  - Timetable releases  |
+-----------------------------------------------------------------------------------+
```

### Persona 1: Undergraduate Student (`student`)
- **Primary Need:** Effortless attendance logging, 75% rule compliance monitoring, recovery roadmaps, and instant timetable reference on mobile and desktop.
- **Access Boundary:** Restricted strictly to personal attendance logs, personal schedule overrides, and reading announcements/polls scoped to their assigned branch, section, and batch.

### Persona 2: Class Representative / CR (`class_admin`)
- **Primary Need:** Ability to represent their peer group authoritatively—modifying official class timetable variations, submitting and verifying class cancellation reports, creating class polls, and publishing sectional notices.
- **Access Boundary:** Strictly scoped to their managed branch and section (e.g., an IT Section-B CR cannot alter CSE Section-A schedules or announcements).

### Persona 3: Department / System Administrator (`admin`)
- **Primary Need:** Centralized command, security management, password recovery, CR role allocation, university-wide metrics oversight, and system-wide audit logging.
- **Access Boundary:** Unrestricted institution-wide access guarded by dedicated server-side authentication (`/admin/login`).

---

## 1.6 Scope and Real-World Application

### Production Scope (Live System Baseline):
- **University:** Madan Mohan Malaviya University of Technology, Gorakhpur (U.P.), India.
- **Student Cohort:** First-Year B.Tech Batch (Session 2026–27).
- **Imported Genuine Accounts:** Exactly **1,189 verified student profiles** onboarded with genuine roll numbers, enrollment numbers, fathers' names, branch allocations, section designations, and practical batch assignments.
- **Academic Branches Supported:** 
  1. Computer Science & Engineering (`CSE` - Sections A, B, C, D)
  2. Electronics & Communication Engineering (`ECE` - Sections A, B, C)
  3. Information Technology (`IT` - Sections A, B)
  4. Mechanical Engineering (`ME` - Sections A, B)
  5. Civil Engineering (`CE` - Sections A, B)
  6. Electrical Engineering (`EE` - Sections A, B)
  7. Chemical Engineering (`CHE` - Section A)
  8. Specialized & Allied Branches (`ECE(IOT)`, `BBA`, `PHARM`)
- **Timetable Sheets Ingested:** 21 full academic timetable matrices with 100% fidelity to the official university deanery notifications.

---

## 1.7 Current Limitations

To maintain absolute academic and technical honesty during evaluation, the following boundaries of the current implementation must be recognized:
1. **Self-Service Student Attendance Logging:**  
   AttendX operates on student self-reporting and CR class consensus; it does not currently interface with physical biometric fingerprint scanners or RFID turnstiles installed at classroom doors.
2. **Local-First Client Storage for Attendance Records:**  
   While student identities, profiles, push subscriptions, polls, announcements, cancellations, and timetables are fully persisted in cloud-hosted PostgreSQL (Supabase), individual daily marked attendance records are managed client-side in browser `localStorage` with offline synchronization mechanisms.
3. **Session-Specific Roster:**  
   The current operational dataset focuses on the first-year cohort across all engineering branches. Expansion to 2nd, 3rd, and 4th years is architecturally supported via database schemas (`academic_sessions`) but awaits university administrative roster ingestion.

---

## 1.8 Comparison: AttendX vs. Traditional University Systems

| Evaluation Dimension | Traditional University ERP / LMS | AttendX Student Engine |
| :--- | :--- | :--- |
| **System Philosophy** | Top-down administrative monitoring & enforcement | Bottom-up student empowerment & decision support |
| **Data Latency** | High (days or weeks for faculty to upload logs) | Zero latency (real-time, period-by-period marking) |
| **Attendance Calculations** | Static percentage display | Dynamic: Safe Bunks, Recovery Required, What-If Simulator |
| **Formula Integrity** | Often distorts labs by averaging percentages | Computes exact raw aggregate units ($A/C \times 100$) |
| **Cancelled Classes** | Counted as absent or ignored inconsistently | Explicit status: excluded from numerator & denominator |
| **Schedule Delivery** | Static, unsearchable 20-page PDF documents | Dynamic, branch-, section-, and batch-resolved schedule |
| **Notifications** | Rarely provides class-time reminders | Web Push 5 minutes prior to period commencement |
| **Democracy & Consensus**| No student voting mechanism | Cryptographic class polls with real-time peer tallying |
| **Offline Resilience** | Completely inaccessible without high-speed Internet | PWA-ready local storage resilience for schedule & logs |

---

## 1.9 Why Student-Maintained Tracking Is Essential

When evaluating AttendX, professors frequently ask: *"Why should students track attendance when the university already has an official register?"*

The answer lies in **preventative risk management**:
- University ERPs publish records after the fact. If an attendance register reveals a shortage of 72% at the end of the 14th week, the student has already been debarred; no mathematical possibility of recovery remains.
- In contrast, AttendX alerts the student at Week 4: *"Your attendance is currently 71.4%. You need 3 consecutive classes to reach 75%. You cannot afford any absences this week."*
- AttendX bridges the critical gap between **regulations** and **daily student decisions**.
