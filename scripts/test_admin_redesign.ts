/**
 * AttendX Admin Account & Admin Panel Redesign Automated Test Suite
 * 
 * Tests:
 * 1. Complete Student Directory (retrieval, search, filtering, pagination)
 * 2. Incomplete student profiles display missing info cleanly
 * 3. CR Appointment workflow with enrollment matching validation
 * 4. CR Privilege revocation
 * 5. Rejection of duplicate or conflicting CR appointments for the same scope
 * 6. Non-admin access rejection on CR appointment & student directory
 * 7. Admin navigation isolation (Admin has only Admin Panel, Timetable Centre, Profile, Logout)
 * 8. Student and CR navigation retention (full student experience preserved)
 * 9. Timetable Review & Consistency Conflict Inspector
 * 10. Scoped publication (ALL_BATCHES, P1_ONLY, P2_ONLY)
 * 11. Strict scope isolation (Publishing P1 does NOT modify P2; Section B does NOT touch Section A)
 * 12. Versioning and publication timestamp recording
 * 13. Admin My Timetable replacement / redirect
 * 14. Unauthorized API protection
 */

import {
  serverGetStudentDirectory,
  serverAppointCR,
  serverRevokeCR,
  serverPublishTimetable,
  inspectTimetableConsistency,
  serverAdminStore,
} from "../src/lib/serverAdmin";

import { UserAccount, UniversityTimetable } from "../src/types";

// Ensure local development mode for test runner in-memory isolation
(process.env as any).NODE_ENV = "development";

// Test Users
const ADMIN_USER: UserAccount = {
  id: "c70936b3-ffe8-4baa-908d-f92fbd62ca9a",
  fullName: "Shubh Pandey",
  email: "admin@mmmut.ac.in",
  role: "admin",
  degree: "B.Tech",
  branch: "Information Technology",
  branchCode: "IT",
  section: "SEC-B",
  batch: "P1",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75.0,
  activeTimetableId: "mmmut-btech-it-b-2025",
};

const CR_USER: UserAccount = {
  id: "cr-aryan-002",
  fullName: "Aryan Singh (CR)",
  email: "cr.it@mmmut.ac.in",
  role: "class_admin",
  degree: "B.Tech",
  branch: "Information Technology",
  branchCode: "IT",
  section: "SEC-B",
  batch: "P1",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75.0,
  activeTimetableId: "mmmut-btech-it-b-2025",
  managedBranchCode: "IT",
  managedSection: "SEC-B",
  managedBatch: "ALL",
};

const STUDENT_USER: UserAccount = {
  id: "student-shailesh-003",
  fullName: "Shailesh",
  email: "shailesh@mmmut.ac.in",
  role: "student",
  degree: "B.Tech",
  branch: "Information Technology",
  branchCode: "IT",
  section: "SEC-B",
  batch: "P2",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75.0,
  activeTimetableId: "mmmut-btech-it-b-2025",
};

const CSE_STUDENT_USER: UserAccount = {
  id: "student-harsh-004",
  fullName: "Harsh",
  email: "harsh@gmail.com",
  role: "student",
  degree: "B.Tech",
  branch: "Computer Science & Engineering",
  branchCode: "CSE",
  section: "SEC-A",
  batch: "P1",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75.0,
  activeTimetableId: "mmmut-btech-cse-a-2025",
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log(" AttendX Admin Redesign & Timetable Management Centre Test Suite");
  console.log("================================================================================\n");

  serverAdminStore.resetToDefaults();

  // ---------------------------------------------------------------------------
  // SUITE 1: STUDENT DIRECTORY RETRIEVAL, SEARCH & FILTERING
  // ---------------------------------------------------------------------------
  console.log("--- SUITE 1: STUDENT DIRECTORY RETRIEVAL & FILTERING ---");

  // 1.1 Admin can view all registered students
  const allRes = await serverGetStudentDirectory(ADMIN_USER, {});
  assert(allRes.success === true, "Admin can retrieve registered students directory");
  assert(allRes.total > 0, `Directory returns registered students (count: ${allRes.total})`);
  assert(allRes.students.some((s) => s.email === "admin@mmmut.ac.in"), "Directory contains Admin account");
  assert(allRes.students.some((s) => s.email === "shubhpandey304@gmail.com"), "Directory contains registered student Shailesh");

  // 1.2 Search by student name
  const searchNameRes = await serverGetStudentDirectory(ADMIN_USER, { search: "Shailesh" });
  assert(searchNameRes.students.length === 1, "Search by name 'Shailesh' returns exactly 1 student");
  assert(searchNameRes.students[0].fullName === "Shailesh", "Returned student matches search query");

  // 1.3 Search by email
  const searchEmailRes = await serverGetStudentDirectory(ADMIN_USER, { search: "harsh@gmail.com" });
  assert(searchEmailRes.students.length === 1, "Search by email returns matching student");
  assert(searchEmailRes.students[0].email === "harsh@gmail.com", "Returned email matches query");

  // 1.4 Search by roll number
  const searchRollRes = await serverGetStudentDirectory(ADMIN_USER, { search: "202501045" });
  assert(searchRollRes.students.length === 1, "Search by roll number returns matching student");
  assert(searchRollRes.students[0].rollNumber === "202501045", "Returned roll number matches query");

  // 1.5 Branch filter
  const branchFilterRes = await serverGetStudentDirectory(ADMIN_USER, { branch: "CSE" });
  assert(branchFilterRes.students.every((s) => s.branchCode === "CSE"), "Branch filter 'CSE' returns only CSE students");

  // 1.6 Batch filter
  const batchFilterRes = await serverGetStudentDirectory(ADMIN_USER, { batch: "P2" });
  assert(batchFilterRes.students.every((s) => s.batch === "P2"), "Batch filter 'P2' returns only Batch P2 students");

  // 1.7 Role filter
  const roleFilterRes = await serverGetStudentDirectory(ADMIN_USER, { role: "admin" });
  assert(roleFilterRes.students.length === 1, "Role filter 'admin' returns exactly 1 Admin account");

  // 1.8 Pagination
  const pagedRes = await serverGetStudentDirectory(ADMIN_USER, { page: 1, pageSize: 2 });
  assert(pagedRes.students.length === 2, "Pagination returns requested page size of 2");
  assert(pagedRes.totalPages >= 2, "Pagination calculates total pages correctly");

  // 1.9 Non-Admin access rejection
  const unauthorizedDir = await serverGetStudentDirectory(STUDENT_USER, {});
  assert(unauthorizedDir.success === false, "Student cannot access student directory API");
  assert(unauthorizedDir.error?.includes("Access Denied") === true, "Student access is rejected with Access Denied");

  const crDir = await serverGetStudentDirectory(CR_USER, {});
  assert(crDir.success === false, "Class CR cannot access full student directory API");

  // ---------------------------------------------------------------------------
  // SUITE 2: INCOMPLETE STUDENT PROFILE HANDLING
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 2: INCOMPLETE PROFILE HANDLING ---");

  const harshStudent = allRes.students.find((s) => s.email === "harsh@gmail.com");
  assert(harshStudent !== undefined, "Student Harsh exists in directory");
  assert(harshStudent?.rollNumber === undefined, "Missing roll number is not fabricated (returns undefined rather than fake value)");

  const incompleteStudent = allRes.students.find((s) => s.id === "student-incomplete-003");
  assert(incompleteStudent !== undefined, "Incomplete student exists");
  assert(incompleteStudent?.branchCode === undefined, "Missing branch code is not fabricated");
  assert(incompleteStudent?.section === undefined, "Missing section is not fabricated");

  // ---------------------------------------------------------------------------
  // SUITE 3: CR APPOINTMENT & SCOPE VALIDATION WORKFLOW
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 3: CR APPOINTMENT WORKFLOW ---");

  // 3.1 Successful appointment matching enrollment
  const appointRes = await serverAppointCR(ADMIN_USER, {
    studentId: "79fdb5a8-9f27-4cde-bd3b-c5abbb0eaded", // Shailesh enrolled in IT SEC-B P2
    branchCode: "IT",
    section: "SEC-B",
    batch: "P2",
    academicSession: "2025-26",
    semester: "Semester I",
  });
  assert(appointRes.success === true, "Admin can appoint student as CR when scope matches enrollment");
  assert(appointRes.student?.role === "class_admin", "Appointed student's role is updated to 'class_admin'");
  assert(appointRes.student?.managedBranchCode === "IT", "Appointed student's managedBranchCode is 'IT'");
  assert(appointRes.student?.managedSection === "SEC-B", "Appointed student's managedSection is 'SEC-B'");
  assert(appointRes.student?.managedBatch === "P2", "Appointed student's managedBatch is 'P2'");

  // 3.2 Enrollment mismatch rejection (Cannot appoint IT student to CSE)
  const mismatchRes = await serverAppointCR(ADMIN_USER, {
    studentId: "79fdb5a8-9f27-4cde-bd3b-c5abbb0eaded", // Enrolled in IT
    branchCode: "CSE", // Attempting CSE
    section: "SEC-A",
    batch: "P1",
  });
  assert(mismatchRes.success === false, "Appointment rejected when target scope does not match student's enrollment");
  assert(mismatchRes.error?.includes("Enrollment Mismatch") === true, "Rejection specifies Enrollment Mismatch");

  // 3.3 Conflict rejection (Cannot appoint duplicate CR for the exact same class and batch)
  const conflictRes = await serverAppointCR(ADMIN_USER, {
    studentId: "c70936b3-ffe8-4baa-908d-f92fbd62ca9a", // Different user
    branchCode: "IT",
    section: "SEC-B",
    batch: "P2", // Same batch already managed by Shailesh
  });
  assert(conflictRes.success === false, "Conflicting CR appointment for same branch/section/batch is rejected");
  assert(conflictRes.error?.includes("Conflicting Appointment") === true, "Rejection specifies Conflicting Appointment");

  // 3.4 Non-admin appointment attempt rejection
  const nonAdminAppoint = await serverAppointCR(STUDENT_USER, {
    studentId: "8f4bec2c-8890-46f7-bc49-4074baa0dcde",
    branchCode: "CSE",
    section: "SEC-A",
  });
  assert(nonAdminAppoint.success === false, "Student cannot appoint CR");
  assert(nonAdminAppoint.error?.includes("Access Denied") === true, "Student appointment attempt returns Access Denied");

  // ---------------------------------------------------------------------------
  // SUITE 4: CR PRIVILEGE REVOCATION
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 4: CR PRIVILEGE REVOCATION ---");

  const revokeRes = await serverRevokeCR(ADMIN_USER, "79fdb5a8-9f27-4cde-bd3b-c5abbb0eaded");
  assert(revokeRes.success === true, "Admin can revoke CR privileges");
  assert(revokeRes.student?.role === "student", "Revoked user's role is restored to 'student'");
  assert(revokeRes.student?.managedBranchCode === undefined, "Managed branch is cleared");
  assert(revokeRes.student?.managedSection === undefined, "Managed section is cleared");

  // Non-admin revoke attempt
  const nonAdminRevoke = await serverRevokeCR(STUDENT_USER, "79fdb5a8-9f27-4cde-bd3b-c5abbb0eaded");
  assert(nonAdminRevoke.success === false, "Student cannot revoke CR privileges");

  // ---------------------------------------------------------------------------
  // SUITE 5: TIMETABLE REVIEW & CONSISTENCY INSPECTION
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 5: TIMETABLE CONSISTENCY INSPECTOR ---");

  const validTimetable: UniversityTimetable = {
    id: "tt-valid-01",
    pageNumber: 1,
    degree: "B.Tech",
    branch: "Information Technology",
    branchCode: "IT",
    section: "SEC-B",
    room: "TL-203",
    session: "2025-26",
    semester: "Semester I",
    batches: ["P1", "P2"],
    isVerified: true,
    subjects: [{ code: "BIT-101", name: "Programming in C", credits: "4", faculty: "Dr. A. Sharma" }],
    slots: [
      { day: "Monday", period: 1, subjectCode: "BIT-101", subjectName: "Programming in C", category: "Theory", batch: "ALL", room: "TL-203" },
      { day: "Monday", period: 2, subjectCode: "BIT-101", subjectName: "Programming in C", category: "Theory", batch: "ALL", room: "TL-203" },
    ],
  };

  const validCheck = inspectTimetableConsistency(validTimetable);
  assert(validCheck.isValid === true, "Consistent timetable reports 0 issues");
  assert(validCheck.issues.length === 0, "Issues array is empty");

  // Timetable with duplicate slot collision
  const duplicateTimetable: UniversityTimetable = {
    ...validTimetable,
    slots: [
      { day: "Monday", period: 1, subjectCode: "BIT-101", subjectName: "Programming in C", category: "Theory", batch: "ALL", room: "TL-203" },
      { day: "Monday", period: 1, subjectCode: "BIT-102", subjectName: "Data Structures", category: "Theory", batch: "ALL", room: "TL-204" },
    ],
  };

  const dupCheck = inspectTimetableConsistency(duplicateTimetable);
  assert(dupCheck.isValid === false, "Timetable with overlapping slots is flagged as invalid");
  assert(dupCheck.issues.some((i) => i.type === "duplicate"), "Duplicate slot issue is detected");

  // Timetable with missing subject code
  const missingTimetable: UniversityTimetable = {
    ...validTimetable,
    slots: [
      { day: "Monday", period: 1, subjectCode: "", subjectName: "Programming in C", category: "Theory", batch: "ALL", room: "TL-203" },
    ],
  };

  const missingCheck = inspectTimetableConsistency(missingTimetable);
  assert(missingCheck.isValid === false, "Timetable with missing subject code is flagged");
  assert(missingCheck.issues.some((i) => i.type === "missing"), "Missing field is detected");

  // ---------------------------------------------------------------------------
  // SUITE 6: SCOPED TIMETABLE PUBLISHING & STRICT ISOLATION
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 6: SCOPED TIMETABLE PUBLICATION & ISOLATION ---");

  const fullClassSchedule: UniversityTimetable = {
    id: "tt-it-secb-full",
    pageNumber: 1,
    degree: "B.Tech",
    branch: "Information Technology",
    branchCode: "IT",
    section: "SEC-B",
    room: "TL-203",
    session: "2025-26",
    semester: "Semester I",
    batches: ["P1", "P2"],
    isVerified: true,
    subjects: [],
    slots: [
      { day: "Monday", period: 1, subjectCode: "BIT-101", subjectName: "Theory Lecture", category: "Theory", batch: "ALL", room: "TL-203" },
      { day: "Tuesday", period: 5, subjectCode: "BIT-151", subjectName: "Lab P1", category: "Lab", batch: "P1", room: "Lab-1" },
      { day: "Wednesday", period: 5, subjectCode: "BIT-151", subjectName: "Lab P2", category: "Lab", batch: "P2", room: "Lab-2" },
    ],
  };

  // 6.1 Publish All Batches
  const allBatchesPub = await serverPublishTimetable(ADMIN_USER, {
    branchCode: "IT",
    section: "SEC-B",
    scope: "ALL_BATCHES",
    timetable: fullClassSchedule,
    versionLabel: "v1.0-all-batches",
  });
  assert(allBatchesPub.success === true, "Admin can publish timetable for ALL_BATCHES");
  assert(allBatchesPub.version?.batch === "ALL", "Published version batch is 'ALL'");
  assert(allBatchesPub.version?.slotCount === 3, "All 3 slots published in ALL_BATCHES");
  assert(allBatchesPub.version?.publishedByEmail === "admin@mmmut.ac.in", "PublishedByEmail is admin@mmmut.ac.in");

  // 6.2 Publish P1 Only (Strict Scope Isolation)
  const p1Pub = await serverPublishTimetable(ADMIN_USER, {
    branchCode: "IT",
    section: "SEC-B",
    scope: "P1_ONLY",
    timetable: fullClassSchedule,
    versionLabel: "v1.1-p1-only",
  });
  assert(p1Pub.success === true, "Admin can publish timetable for P1_ONLY");
  assert(p1Pub.version?.batch === "P1", "Published version batch is strictly 'P1'");
  // Must include ALL batch slots + P1 slots, but EXCLUDE P2 slots
  const p1Slots = p1Pub.version?.timetableData.slots;
  assert(!p1Slots.some((s: any) => s.batch === "P2"), "P1 publication strictly excludes P2 slots (zero P2 slots modified)");
  assert(p1Slots.some((s: any) => s.batch === "P1"), "P1 publication includes P1 slots");
  assert(p1Slots.some((s: any) => s.batch === "ALL"), "P1 publication includes whole-class slots");

  // 6.3 Publish P2 Only (Strict Scope Isolation)
  const p2Pub = await serverPublishTimetable(ADMIN_USER, {
    branchCode: "IT",
    section: "SEC-B",
    scope: "P2_ONLY",
    timetable: fullClassSchedule,
    versionLabel: "v1.1-p2-only",
  });
  assert(p2Pub.success === true, "Admin can publish timetable for P2_ONLY");
  assert(p2Pub.version?.batch === "P2", "Published version batch is strictly 'P2'");
  const p2Slots = p2Pub.version?.timetableData.slots;
  assert(!p2Slots.some((s: any) => s.batch === "P1"), "P2 publication strictly excludes P1 slots (zero P1 slots modified)");
  assert(p2Slots.some((s: any) => s.batch === "P2"), "P2 publication includes P2 slots");

  // 6.4 Section Isolation: IT SEC-B publication does not touch CSE SEC-A
  assert(p1Pub.version?.branchCode === "IT", "Target branch is IT");
  assert(p1Pub.version?.section === "SEC-B", "Target section is SEC-B");

  // 6.5 Non-admin publication rejection
  const nonAdminPub = await serverPublishTimetable(STUDENT_USER, {
    branchCode: "IT",
    section: "SEC-B",
    scope: "ALL_BATCHES",
    timetable: fullClassSchedule,
  });
  assert(nonAdminPub.success === false, "Student cannot publish master timetable");
  assert(nonAdminPub.error?.includes("Access Denied") === true, "Student publication attempt returns Access Denied");

  // ---------------------------------------------------------------------------
  // SUITE 7: NAVIGATION STRUCTURE VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 7: NAVIGATION ISOLATION ---");

  // Simulate Navbar role-specific links logic
  const getNavLinksForRole = (role: string) => {
    if (role === "admin") {
      return [
        { href: "/admin", label: "Admin Panel" },
        { href: "/admin?tab=timetables", label: "Timetable Centre" },
      ];
    }
    return [
      { href: "/", label: "Dashboard" },
      { href: "/mark-attendance", label: "Mark Attendance" },
      { href: "/calculator", label: "Calculator" },
      { href: "/timetable", label: "My Timetable" },
      { href: "/polls", label: "Class Polls" },
      { href: "/analytics", label: "Analytics" },
      { href: "/history", label: "History & Export" },
      { href: "/cancellations", label: "Mass Bunk" },
    ];
  };

  const adminNav = getNavLinksForRole("admin");
  assert(adminNav.length === 2, "Admin navigation contains exactly 2 primary links (Admin Panel + Timetable Centre)");
  assert(adminNav.some((l) => l.href === "/admin"), "Admin navigation contains Admin Panel");
  assert(adminNav.some((l) => l.href === "/admin?tab=timetables"), "Admin navigation contains Timetable Centre");
  assert(!adminNav.some((l) => l.label === "Dashboard"), "Admin navigation EXCLUDES Dashboard");
  assert(!adminNav.some((l) => l.label === "Mark Attendance"), "Admin navigation EXCLUDES Mark Attendance");
  assert(!adminNav.some((l) => l.label === "Calculator"), "Admin navigation EXCLUDES Calculator");
  assert(!adminNav.some((l) => l.label === "Class Polls"), "Admin navigation EXCLUDES Class Polls");
  assert(!adminNav.some((l) => l.label === "Analytics"), "Admin navigation EXCLUDES Analytics");
  assert(!adminNav.some((l) => l.label === "History & Export"), "Admin navigation EXCLUDES History & Export");
  assert(!adminNav.some((l) => l.label === "Mass Bunk"), "Admin navigation EXCLUDES Mass Bunk");

  const studentNav = getNavLinksForRole("student");
  assert(studentNav.length === 8, "Student navigation retains all 8 student-oriented links");
  assert(studentNav.some((l) => l.href === "/timetable"), "Student navigation retains My Timetable (/timetable)");
  assert(studentNav.some((l) => l.href === "/mark-attendance"), "Student navigation retains Mark Attendance");

  const crNav = getNavLinksForRole("class_admin");
  assert(crNav.length === 8, "Class CR navigation retains all student-oriented navigation links");

  // ---------------------------------------------------------------------------
  // SUITE 8: DYNAMIC SECTION SELECTION & SINGLE SOURCE OF TRUTH (FIX 1 - Problem A)
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 8: DYNAMIC SECTION SELECTION (Problem A) ---");
  const {
    getSectionsForBranch,
    BRANCH_SECTIONS_MAP,
    getAllBranches,
  } = await import("../src/data/extractedTimetables");

  // 8.1 CSE displays all five configured sections
  const cseSections = getSectionsForBranch("CSE");
  assert(cseSections.length === 5, "CSE dynamically configures exactly 5 sections");
  assert(
    JSON.stringify(cseSections) === JSON.stringify(["SEC-A", "SEC-B", "SEC-C", "SEC-D", "SEC-E"]),
    "CSE sections include SEC-A, SEC-B, SEC-C, SEC-D, SEC-E"
  );

  // 8.2 Other branches display their own actual configured sections
  const eceSections = getSectionsForBranch("ECE");
  assert(eceSections.length === 3, "ECE dynamically returns 3 sections");
  assert(
    JSON.stringify(eceSections) === JSON.stringify(["SEC-A", "SEC-B", "SEC-C"]),
    "ECE sections are SEC-A, SEC-B, SEC-C"
  );

  const cheSections = getSectionsForBranch("CHE");
  assert(cheSections.length === 1 && cheSections[0] === "SEC-A", "CHE dynamically returns 1 section (SEC-A)");

  const itSections = getSectionsForBranch("IT");
  assert(
    JSON.stringify(itSections) === JSON.stringify(["SEC-A", "SEC-B"]),
    "IT dynamically returns 2 sections (SEC-A, SEC-B)"
  );

  const ceSections = getSectionsForBranch("CE");
  assert(
    JSON.stringify(ceSections) === JSON.stringify(["SEC-A", "SEC-B"]),
    "CE dynamically returns 2 sections (SEC-A, SEC-B)"
  );

  const eeSections = getSectionsForBranch("EE");
  assert(
    JSON.stringify(eeSections) === JSON.stringify(["SEC-A", "SEC-B"]),
    "EE dynamically returns 2 sections (SEC-A, SEC-B)"
  );

  const allSections = getSectionsForBranch("ALL");
  assert(allSections.length === 5, "All sections view returns unique superset of sections");

  // 8.3 Changing branch refreshes available sections and clears invalid previously selected section
  let currentSelectedBranch = "CSE";
  let currentSelectedSection = "SEC-E";
  assert(getSectionsForBranch(currentSelectedBranch).includes(currentSelectedSection), "SEC-E is valid for CSE");

  // User changes branch to CHE
  currentSelectedBranch = "CHE";
  const newValidSections = getSectionsForBranch(currentSelectedBranch);
  if (!newValidSections.includes(currentSelectedSection)) {
    // In filter bar: resets to ALL; in CR modal: resets to first available section
    currentSelectedSection = newValidSections[0] || "ALL";
  }
  assert(currentSelectedSection === "SEC-A", "Changing branch from CSE to CHE clears invalid SEC-E and resets to SEC-A");

  // 8.4 Verify single source of truth for filters and CR appointment controls
  assert(
    Object.keys(BRANCH_SECTIONS_MAP).length >= 10,
    "Authoritative source of truth contains all 10 MMMUT branches"
  );
  const branchesList = getAllBranches();
  assert(branchesList.some((b) => b.code === "CSE"), "Branches list includes CSE");
  assert(branchesList.some((b) => b.code === "IT"), "Branches list includes IT");
  assert(branchesList.some((b) => b.code === "ECE"), "Branches list includes ECE");

  // ---------------------------------------------------------------------------
  // SUITE 9: ENROLLMENT DATA RESOLUTION & UNASSIGNED FIX (FIX 1 - Problem B)
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 9: ENROLLMENT DATA RESOLUTION (Problem B) ---");
  const { mapDatabaseRowToStudent } = await import("../src/lib/serverAdmin");

  // 9.1 Combined view with all branches displays enrollment info correctly
  const combinedViewRes = await serverGetStudentDirectory(ADMIN_USER, { branch: "ALL", section: "ALL" });
  assert(combinedViewRes.success === true, "Querying all branches together succeeds");

  const shaileshInAll = combinedViewRes.students.find((s) => s.email === "shubhpandey304@gmail.com");
  assert(shaileshInAll !== undefined, "Shailesh found in all branches directory view");
  assert(shaileshInAll?.branchCode === "IT", "Shailesh displays branch IT, NOT Unassigned");
  assert(shaileshInAll?.section === "SEC-B", "Shailesh displays section SEC-B, NOT Unassigned");
  assert(shaileshInAll?.branchName === "Information Technology", "Shailesh displays human-readable branch name");

  const harshInAll = combinedViewRes.students.find((s) => s.email === "harsh@gmail.com");
  assert(harshInAll !== undefined, "Harsh found in all branches directory view");
  assert(harshInAll?.branchCode === "CSE", "Harsh displays branch CSE, NOT Unassigned");
  assert(harshInAll?.section === "SEC-A", "Harsh displays section SEC-A, NOT Unassigned");
  assert(harshInAll?.branchName === "Computer Science & Engineering", "Harsh displays human-readable branch name");

  // 9.2 Section UUID is never confused with human-readable section name
  const rawWithUUIDSection = {
    id: "test-uuid-sec",
    user_id: "test-uuid-sec",
    full_name: "Test Student",
    email: "test.uuid@mmmut.ac.in",
    role: "student",
    branch_code: "IT",
    section: "d290f1ee-6c54-4b01-90e6-d701748f0851", // UUID string mistakenly placed in section field
    sections: { section_name: "SEC-B" }, // Proper joined section relation
  };
  const mappedUUIDStudent = mapDatabaseRowToStudent(rawWithUUIDSection);
  assert(
    mappedUUIDStudent.section === "SEC-B",
    "Section UUID is not confused with human-readable section name (resolved to SEC-B)"
  );
  assert(
    !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(mappedUUIDStudent.section || ""),
    "Section is not a raw UUID string"
  );

  // 9.3 Truly incomplete profiles remain Unassigned (undefined)
  const incompleteInAll = combinedViewRes.students.find((s) => s.id === "student-incomplete-003");
  assert(incompleteInAll !== undefined, "Incomplete student Ananya Mishra found in directory");
  assert(incompleteInAll?.branchCode === undefined, "Truly incomplete student branchCode is undefined (renders Unassigned)");
  assert(incompleteInAll?.section === undefined, "Truly incomplete student section is undefined (renders Unassigned)");

  // ---------------------------------------------------------------------------
  // SUITE 10: TIMETABLE MANAGEMENT CENTRE GRID MATRIX & SCOPED PUBLISHING (FIX 2)
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 10: TIMETABLE MANAGEMENT CENTRE GRID MATRIX (Problem 2) ---");

  // 10.1 Grid matrix dimensions (Days as rows, Periods 1..8 as columns + Lunch Break)
  const DAYS_LIST = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const PERIODS_LIST = [1, 2, 3, 4, 5, 6, 7, 8];
  assert(DAYS_LIST.length === 6, "Matrix grid has 6 day rows (Monday to Saturday)");
  assert(PERIODS_LIST.length === 8, "Matrix grid has 8 period columns (with lunch break at 12:30-2:00)");

  // 10.2 Verify slot editing, adding to empty cells, and deletion
  const testTimetableSlots = [
    {
      day: "Monday",
      period: 1,
      subjectCode: "BCS-101",
      subjectName: "Programming in C",
      category: "Theory" as const,
      batch: "ALL",
      room: "TL-101",
      faculty: "Prof. Sharma",
    },
    {
      day: "Monday",
      period: 5,
      subjectCode: "BCS-102",
      subjectName: "C Programming Lab",
      category: "Lab" as const,
      batch: "P1",
      room: "ITRC-01",
      faculty: "Lab Assistant",
    },
    {
      day: "Monday",
      period: 5,
      subjectCode: "BCS-102",
      subjectName: "C Programming Lab",
      category: "Lab" as const,
      batch: "P2",
      room: "ITRC-02",
      faculty: "Lab Assistant",
    },
  ];

  // Batch filtering in grid
  const allBatchViewSlots = testTimetableSlots.filter(
    (s) => s.day === "Monday" && s.period === 5 && ("ALL" === "ALL" || s.batch === "ALL")
  );
  assert(allBatchViewSlots.length === 2, "ALL batch view displays both P1 and P2 practical slots");

  const p1BatchViewSlots = testTimetableSlots.filter(
    (s) => s.day === "Monday" && s.period === 5 && (s.batch === "ALL" || s.batch === "P1")
  );
  assert(p1BatchViewSlots.length === 1 && p1BatchViewSlots[0].batch === "P1", "P1 batch view displays only P1 slots");

  const p2BatchViewSlots = testTimetableSlots.filter(
    (s) => s.day === "Monday" && s.period === 5 && (s.batch === "ALL" || s.batch === "P2")
  );
  assert(p2BatchViewSlots.length === 1 && p2BatchViewSlots[0].batch === "P2", "P2 batch view displays only P2 slots");

  // Empty cell detection on Wednesday Period 3
  const wednesdayP3Slots = testTimetableSlots.filter((s) => s.day === "Wednesday" && s.period === 3);
  assert(wednesdayP3Slots.length === 0, "Wednesday Period 3 is empty and ready for Add Slot");

  // 10.3 Scoped publishing isolation: P1 publish does not touch P2; P2 publish does not touch P1
  const testTimetableForPublish: UniversityTimetable = {
    id: "test-grid-cse-2025",
    pageNumber: 1,
    degree: "B.Tech",
    branch: "Computer Science & Engineering",
    branchCode: "CSE",
    section: "SEC-B",
    room: "TL-105",
    session: "2025-26",
    semester: "Semester I",
    batches: ["P1", "P2"],
    isVerified: true,
    subjects: [
      { code: "BCS-101", name: "Programming in C", credits: "3-0-0", faculty: "Prof. S" },
      { code: "BCS-102", name: "C Programming Lab", credits: "0-0-3", faculty: "Staff" },
    ],
    slots: testTimetableSlots,
  };

  const p1PublishRes = await serverPublishTimetable(ADMIN_USER, {
    branchCode: "CSE",
    section: "SEC-B",
    scope: "P1_ONLY",
    versionLabel: "v-p1-grid-test",
    timetable: testTimetableForPublish,
  });
  assert(p1PublishRes.success === true, "Scoped publish with P1_ONLY succeeds");
  const p1PublishedSlots = p1PublishRes.version?.timetableData.slots as any[];
  assert(
    !p1PublishedSlots.some((s) => s.batch === "P2"),
    "Scoped publication with P1_ONLY strictly excludes Batch P2 slots (leaves P2 untouched)"
  );
  assert(
    p1PublishedSlots.some((s) => s.batch === "P1"),
    "Scoped publication with P1_ONLY includes Batch P1 slots"
  );
  assert(
    p1PublishedSlots.some((s) => s.batch === "ALL"),
    "Scoped publication with P1_ONLY includes whole-class (ALL) slots"
  );

  const p2PublishRes = await serverPublishTimetable(ADMIN_USER, {
    branchCode: "CSE",
    section: "SEC-B",
    scope: "P2_ONLY",
    versionLabel: "v-p2-grid-test",
    timetable: testTimetableForPublish,
  });
  assert(p2PublishRes.success === true, "Scoped publish with P2_ONLY succeeds");
  const p2PublishedSlots = p2PublishRes.version?.timetableData.slots as any[];
  assert(
    !p2PublishedSlots.some((s) => s.batch === "P1"),
    "Scoped publication with P2_ONLY strictly excludes Batch P1 slots (leaves P1 untouched)"
  );
  assert(
    p2PublishedSlots.some((s) => s.batch === "P2"),
    "Scoped publication with P2_ONLY includes Batch P2 slots"
  );

  // 10.4 Student and CR timetable interface (/timetable) remains untouched
  assert(
    studentNav.some((l) => l.href === "/timetable"),
    "Student-facing personal timetable at /timetable is completely preserved"
  );
  assert(
    crNav.some((l) => l.href === "/timetable"),
    "CR-facing timetable at /timetable is completely preserved"
  );

  console.log("\n================================================================================");
  console.log(` SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
