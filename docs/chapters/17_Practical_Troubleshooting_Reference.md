# PART 17 — PRACTICAL TROUBLESHOOTING REFERENCE

---

## 17.1 Quick Diagnostic Matrix

This guide provides systematic, step-by-step diagnostic workflows for the 12 most common operational issues encountered during development, local testing, and production deployment.

```
+----------------------------------------------------------------------------------------------------+
|                                      TROUBLESHOOTING INDEX                                         |
+----------------------------------------------------------------------------------------------------+
|   ISSUE #   |   FAULT SYMPTOM                     |   PRIMARY INVESTIGATION LOCATION               |
|   1         |   Student Login Failure             |   src/lib/serverAuth.ts & student_profiles     |
|   2         |   Incorrect Branch Timetable        |   src/data/extractedTimetables.ts              |
|   3         |   Missing Local Attendance Logs     |   Browser LocalStorage namespace & keys        |
|   4         |   Attendance Percentage Mismatch    |   src/lib/attendanceCalculator.ts              |
|   5         |   Supabase Database Connection Error|   NEXT_PUBLIC_SUPABASE_URL & Service Key       |
|   6         |   Supabase Auth Session Expiration  |   Browser Token & GoTrue JWT expiry            |
|   7         |   Environment Variable Not Loaded   |   .env.local vs Vercel Production Dashboard    |
|   8         |   Next.js Production Build Failure  |   Turbopack TypeScript compiler & types        |
|   9         |   Web Push Notifications Not Firing |   Service Worker registration & VAPID keys     |
|   10        |   Automated Cron Job 401 Error      |   CRON_SECRET in vercel.json / actionSecurity  |
|   11        |   HTTP 403 Forbidden Access Denied  |   src/lib/serverAuthGuard.ts (requireRole)     |
|   12        |   Admin Portal Infinite Spinner     |   src/app/api/admin/auth/verify route          |
+----------------------------------------------------------------------------------------------------+
```

---

## 17.2 Systematic Diagnostic Workflows

---

### Issue 1: Student Login Failure
- **Symptoms:** User enters Roll Number or Enrollment Number and sees error: `"Invalid credentials. Please verify your roll number or enrollment number and password."`
- **Possible Causes:**
  1. The student roll number does not exist in `student_profiles`.
  2. The password entered does not match the bcrypt hash in Supabase Auth.
  3. The internal email alias mapping generated a mismatch.
- **Where to Investigate:** [`src/lib/serverAuth.ts`](file:///d:/AttendX/src/lib/serverAuth.ts) (`authenticateCredentials`), Supabase Table `student_profiles`.
- **How to Troubleshoot Safely:**
  1. Check if the student exists:
     ```sql
     SELECT id, roll_number, email, role FROM student_profiles WHERE roll_number = '2026041133';
     ```
  2. Check if the matching user exists in Supabase Auth:
     ```sql
     SELECT id, email FROM auth.users WHERE email = 'student.2026041133@attendx.mmmut.ac.in';
     ```
  3. If testing in development mode, check if `DEV_SEED_PASSWORD` is configured in `.env.local`.

---

### Issue 2: Incorrect Branch Timetable Displayed
- **Symptoms:** An ECE or CSE student logs in and sees Information Technology classes or Room `TL-203`.
- **Possible Causes:**
  1. Stale profile in browser LocalStorage (`attendx_current_user`) cached before the branch-wise fix.
  2. `branch_code` is missing or unmapped in `student_profiles`.
- **Where to Investigate:** [`src/lib/storage.ts`](file:///d:/AttendX/src/lib/storage.ts) (`getStoredProfile`), [`src/data/extractedTimetables.ts`](file:///d:/AttendX/src/data/extractedTimetables.ts).
- **How to Troubleshoot Safely:**
  1. In the browser console, run:
     ```js
     JSON.parse(localStorage.getItem('attendx_current_user'))
     ```
     Verify that `branchCode` is `'ECE'` and `branch` is `'Electronics & Communication Engineering'`.
  2. Refresh the page: the automated self-healing logic inside `getStoredProfile()` will automatically detect and correct the stale branch name and `activeTimetableId`.

---

### Issue 3: Missing Attendance Records After Browser Restart
- **Symptoms:** Student marked classes yesterday, but today the counters show $0/0$.
- **Possible Causes:**
  1. The student logged in using a different browser or opened the site in Incognito mode.
  2. The student cleared their browser site data or cookies.
  3. Storage key namespace mismatch between different user IDs.
- **Where to Investigate:** Browser Developer Tools $\rightarrow$ Application Tab $\rightarrow$ Local Storage.
- **How to Troubleshoot Safely:**
  1. Inspect whether the key `attendx_attendance_records_user_<id>` exists.
  2. If the user ID changed, check if records exist under another user ID key.

---

### Issue 4: Attendance Percentage Mismatch
- **Symptoms:** Student attended 3 out of 4 classes, but percentage shows an unexpected number.
- **Possible Causes:**
  1. Cancelled classes were mistakenly counted as absences.
  2. Multi-period laboratory units were counted as 1 period instead of 4 periods.
  3. Floating-point division precision issue.
- **Where to Investigate:** [`src/lib/attendanceCalculator.ts`](file:///d:/AttendX/src/lib/attendanceCalculator.ts) (`calculateMetrics`).
- **How to Troubleshoot Safely:**
  1. Verify the status of each record: only `PRESENT` and `ABSENT` should increment `conducted`.
  2. Confirm that `CANCELLED` records are excluded:
     ```ts
     records.filter(r => r.status === "CANCELLED") // Excluded from numerator and denominator
     ```

---

### Issue 5: Supabase Database Connection Error
- **Symptoms:** Server logs show: `Error: fetch failed` or `Connection refused to supabase.co`.
- **Possible Causes:**
  1. Missing or incorrect `NEXT_PUBLIC_SUPABASE_URL` in environment variables.
  2. Network firewall or DNS resolution issue reaching Supabase Cloud.
  3. Supabase project paused due to inactivity.
- **Where to Investigate:** `.env.local`, Supabase Cloud Dashboard.
- **How to Troubleshoot Safely:**
  1. Confirm the project URL is active by visiting `https://iczjocbishkvkkkfvalz.supabase.co/rest/v1/` in a browser. It should return an API schema response.
  2. Ensure `.env.local` contains valid, unquoted strings without trailing spaces.

---

### Issue 6: Next.js Production Build Failure
- **Symptoms:** Running `npm run build` exits with code 1 and TypeScript compilation errors.
- **Possible Causes:**
  1. A component accessed a property on `timetable` without checking if it is `null`.
  2. A server function used `request.headers` inside a static page without dynamic bail-out.
  3. Type mismatch between `UserAccount` and `StudentProfile`.
- **Where to Investigate:** Terminal output from `npm run build`.
- **How to Troubleshoot Safely:**
  1. Check for `null` safety guards:
     ```tsx
     if (!profile || !timetable) return <AlertComponent />;
     ```
  2. Run `npx tsc --noEmit` to locate exact file and line numbers of type errors.

---

### Issue 7: Web Push Notifications Not Delivering
- **Symptoms:** Student clicks "Send Test Alert" on `/notifications`, but no alert appears in the notification tray.
- **Possible Causes:**
  1. Browser notification permissions were blocked or dismissed by the user.
  2. The Service Worker `public/sw.js` failed to register.
  3. Invalid VAPID keys in `.env.local`.
- **Where to Investigate:** Browser Settings $\rightarrow$ Site Permissions $\rightarrow$ Notifications; Console log for `navigator.serviceWorker`.
- **How to Troubleshoot Safely:**
  1. Check permission status in console: `Notification.permission`. If `"denied"`, reset permissions in browser site settings.
  2. Check Service Worker registration in Chrome DevTools $\rightarrow$ Application $\rightarrow$ Service Workers.

---

### Issue 8: Automated Cron Job Failing with HTTP 401
- **Symptoms:** Vercel Cron monitor reports `/api/cron/check-classes` returned status `401 Unauthorized`.
- **Possible Causes:**
  1. Missing or mismatched `CRON_SECRET` in Vercel environment variables.
  2. The cron request was sent without the `Authorization: Bearer <CRON_SECRET>` header.
- **Where to Investigate:** [`src/lib/actionSecurity.ts`](file:///d:/AttendX/src/lib/actionSecurity.ts) (`validateCronAuthorization`), Vercel Dashboard Settings $\rightarrow$ Environment Variables.
- **How to Troubleshoot Safely:**
  1. Verify that `CRON_SECRET` is defined in Vercel Production environment variables.
  2. Test manually via PowerShell:
     ```powershell
     curl -H "Authorization: Bearer <YOUR_SECRET>" https://attend-x.vercel.app/api/cron/check-classes
     ```

---

### Issue 9: HTTP 403 Forbidden on CR or Admin Actions
- **Symptoms:** User clicks "Publish Timetable" or "Create Poll" and sees: `"Access Denied: Requires role [admin, class_admin]"`.
- **Possible Causes:**
  1. The student is an ordinary student and has not been appointed as a Class CR.
  2. The CR attempted to modify a timetable outside their assigned branch or section.
  3. The JWT bearer token expired or does not contain updated role claims.
- **Where to Investigate:** [`src/lib/serverAuthGuard.ts`](file:///d:/AttendX/src/lib/serverAuthGuard.ts), `student_profiles.role`.
- **How to Troubleshoot Safely:**
  1. In the database, check the student's role:
     ```sql
     SELECT id, full_name, role FROM student_profiles WHERE roll_number = '...';
     ```
  2. If the user is a CR, log out and log back in to refresh the JWT session token with the updated role claim.

---

### Issue 10: Admin Portal Shows Infinite Loading Spinner
- **Symptoms:** Navigating to `/admin` hangs on the loading spinner without rendering the dashboard.
- **Possible Causes:**
  1. No session token found in `localStorage.getItem('attendx_session_token')`.
  2. `/api/admin/auth/verify` returned 401 because the user is not an administrator.
- **Where to Investigate:** [`src/app/admin/page.tsx`](file:///d:/AttendX/src/app/admin/page.tsx) (`verifyAdminSession`), [`src/app/api/admin/auth/verify/route.ts`](file:///d:/AttendX/src/app/api/admin/auth/verify/route.ts).
- **How to Troubleshoot Safely:**
  1. Check Network tab in DevTools for the response of `GET /api/admin/auth/verify`.
  2. If the response is `401 Unauthorized`, log in through the dedicated portal at `/admin/login` using `admin@attendx.ac.in`.
