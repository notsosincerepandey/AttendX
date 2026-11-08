import { createClient } from "@supabase/supabase-js";
import { UserAccount } from "../src/types";
import {
  serverGetCancellationReportsForUser,
  serverCreateCancellationReport,
  serverConfirmCancellationReport,
  validateCancellationInput,
} from "../src/lib/serverCancellations";

// Test Users
const ADMIN_USER: UserAccount = {
  id: "admin-auth-uuid-001",
  fullName: "System Administrator",
  email: "admin@mmmut.ac.in",
  role: "admin",
  degree: "B.Tech",
  branch: "Information Technology",
  branchCode: "IT",
  section: "SEC-B",
  batch: "P1",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75,
  activeTimetableId: "default",
};

const CLASS_ADMIN_USER: UserAccount = {
  id: "cr-auth-uuid-001",
  fullName: "Harsh (CR)",
  email: "harsh@gmail.com",
  role: "class_admin",
  degree: "B.Tech",
  branch: "Information Technology",
  branchCode: "IT",
  section: "SEC-B",
  batch: "P1",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75,
  activeTimetableId: "default",
  managedBranchCode: "IT",
  managedSection: "SEC-B",
};

const STUDENT_USER: UserAccount = {
  id: "student-auth-uuid-001",
  fullName: "Shubh Pandey",
  email: "shubhpandey304@gmail.com",
  role: "student",
  degree: "B.Tech",
  branch: "Information Technology",
  branchCode: "IT",
  section: "SEC-B",
  batch: "P1",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75,
  activeTimetableId: "default",
};

const STUDENT_USER_CSE: UserAccount = {
  id: "student-auth-uuid-002",
  fullName: "Aarav Sharma",
  email: "aarav@gmail.com",
  role: "student",
  degree: "B.Tech",
  branch: "Computer Science & Engineering",
  branchCode: "CSE",
  section: "SEC-A",
  batch: "P1",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75,
  activeTimetableId: "default",
};

let passedCount = 0;
let totalCount = 0;

function assert(description: string, condition: boolean, extra?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${description}${extra ? ` -> ${extra}` : ""}`);
  } else {
    console.error(`  [FAIL] ${description}${extra ? ` -> ${extra}` : ""}`);
  }
}

async function runCancellationsTestSuite() {
  console.log("============================================================");
  console.log(" ATTENDX CANCELLATIONS PERSISTENCE & SECURITY TEST SUITE   ");
  console.log("============================================================\n");

  // 1. Input Validation Tests
  console.log("--- 1. INPUT VALIDATION TESTS ---");
  const v1 = validateCancellationInput({});
  assert("Empty payload is rejected", !v1.valid && Boolean(v1.error?.includes("date")));

  const v2 = validateCancellationInput({ date: "invalid-date", reasonType: "MASS_BUNK", description: "test" });
  assert("Invalid date format is rejected", !v2.valid && Boolean(v2.error?.includes("YYYY-MM-DD")));

  const v3 = validateCancellationInput({ date: "2026-11-09", reasonType: "INVALID_REASON", description: "test" });
  assert("Invalid reasonType is rejected", !v3.valid && Boolean(v3.error?.includes("reasonType")));

  const v4 = validateCancellationInput({ date: "2026-11-09", reasonType: "MASS_BUNK", description: "" });
  assert("Empty description is rejected", !v4.valid && Boolean(v4.error?.includes("description")));

  const v5 = validateCancellationInput({ date: "2026-11-09", reasonType: "MASS_BUNK", description: "Valid test", period: 99 });
  assert("Out of bounds period is rejected", !v5.valid && Boolean(v5.error?.includes("Period must be an integer between 1 and 12")));

  const v6 = validateCancellationInput({ date: "2026-11-09", reasonType: "MASS_BUNK", description: "Valid test", period: 3 });
  assert("Valid input payload passes validation", Boolean(v6.valid));

  // 2. Student Role Authorization Restrictions
  console.log("\n--- 2. STUDENT ROLE AUTHORIZATION RESTRICTIONS ---");
  const studentSubmit = await serverCreateCancellationReport(STUDENT_USER, {
    date: "2026-11-10",
    period: 2,
    subjectCode: "BIT-103",
    reasonType: "TEACHER_ABSENT",
    description: "Student trying to submit a cancellation report",
  });
  assert(
    "Student submission is rejected with 403 Access Denied",
    !studentSubmit.success && studentSubmit.statusCode === 403,
    studentSubmit.error
  );

  const studentConfirm = await serverConfirmCancellationReport(STUDENT_USER, "canc-demo-03");
  assert(
    "Student confirmation is rejected with 403 Access Denied",
    !studentConfirm.success && studentConfirm.statusCode === 403,
    studentConfirm.error
  );

  const studentRead = await serverGetCancellationReportsForUser(STUDENT_USER);
  assert(
    "Student can view cancellation reports within scope",
    Array.isArray(studentRead) && studentRead.length > 0,
    `Found ${studentRead.length} reports`
  );

  // 3. Class Admin (CR) Authorization & Scoping
  console.log("\n--- 3. CLASS ADMIN (CR) AUTHORIZATION & SCOPING ---");
  const crCrossClassSubmit = await serverCreateCancellationReport(CLASS_ADMIN_USER, {
    date: "2026-11-10",
    period: 2,
    subjectCode: "BCS-101",
    reasonType: "MASS_BUNK",
    description: "CR attempting cross-branch submission to CSE",
    branchCode: "CSE",
    section: "SEC-A",
  });
  assert(
    "CR submission targeting unauthorized branch is rejected (403)",
    !crCrossClassSubmit.success && crCrossClassSubmit.statusCode === 403,
    crCrossClassSubmit.error
  );

  const crValidSubmit = await serverCreateCancellationReport(CLASS_ADMIN_USER, {
    date: "2026-11-10",
    period: 3,
    subjectCode: "BIT-104",
    reasonType: "MASS_BUNK",
    description: "Class consensus for departmental sports meet",
    branchCode: "IT",
    section: "SEC-B",
  });
  assert(
    "CR submission for assigned class succeeds (201 Created)",
    crValidSubmit.success && crValidSubmit.statusCode === 201 && Boolean(crValidSubmit.report?.id),
    `Report ID: ${crValidSubmit.report?.id}`
  );

  const crConfirm = await serverConfirmCancellationReport(CLASS_ADMIN_USER, "canc-demo-03");
  assert(
    "CR confirmation for assigned class succeeds (200 OK)",
    crConfirm.success && crConfirm.statusCode === 200 && crConfirm.report?.status === "CONFIRMED",
    `Status: ${crConfirm.report?.status}`
  );

  const crDuplicateConfirm = await serverConfirmCancellationReport(CLASS_ADMIN_USER, "canc-demo-03");
  assert(
    "Duplicate CR confirmation is rejected with 409 Conflict",
    !crDuplicateConfirm.success && crDuplicateConfirm.statusCode === 409,
    crDuplicateConfirm.error
  );

  // 4. Admin Full Access
  console.log("\n--- 4. ADMINISTRATOR PRIVILEGES ---");
  const adminSubmit = await serverCreateCancellationReport(ADMIN_USER, {
    date: "2026-11-12",
    period: 1,
    subjectCode: "BME-101",
    reasonType: "COLLEGE_HOLIDAY",
    description: "University foundation day holiday announced by Dean",
    branchCode: "ME",
    section: "SEC-A",
  });
  assert(
    "Admin submission for any branch succeeds (201 Created)",
    adminSubmit.success && adminSubmit.statusCode === 201 && Boolean(adminSubmit.report?.id),
    `Report ID: ${adminSubmit.report?.id}`
  );

  const adminConfirm = await serverConfirmCancellationReport(ADMIN_USER, adminSubmit.report!.id);
  assert(
    "Admin confirmation for any report succeeds (200 OK)",
    adminConfirm.success && adminConfirm.statusCode === 200 && adminConfirm.report?.status === "CONFIRMED",
    `Status: ${adminConfirm.report?.status}`
  );

  const adminDuplicateConfirm = await serverConfirmCancellationReport(ADMIN_USER, adminSubmit.report!.id);
  assert(
    "Duplicate Admin confirmation is rejected with 409 Conflict",
    !adminDuplicateConfirm.success && adminDuplicateConfirm.statusCode === 409,
    adminDuplicateConfirm.error
  );

  const adminRead = await serverGetCancellationReportsForUser(ADMIN_USER);
  assert(
    "Admin can view all cancellation reports across the institution",
    Array.isArray(adminRead) && adminRead.length >= 3,
    `Total count: ${adminRead.length}`
  );

  // 5. Shared Visibility Across User Sessions
  console.log("\n--- 5. CROSS-SESSION VISIBILITY & DATA SHARING ---");
  const itStudentReports = await serverGetCancellationReportsForUser(STUDENT_USER);
  const itHasCrReport = itStudentReports.some((r) => r.id === crValidSubmit.report?.id);
  assert(
    "IT Student immediately sees newly submitted report by Class CR in shared session",
    itHasCrReport,
    `Found CR report in IT student view: ${itHasCrReport}`
  );

  console.log("\n============================================================");
  console.log(` RESULTS: ${passedCount} / ${totalCount} TESTS PASSED (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log("============================================================\n");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runCancellationsTestSuite();
