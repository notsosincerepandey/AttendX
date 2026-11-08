/**
 * AttendX Strict Class-Level Authorization Test Suite
 * 
 * Verifies class-level isolation for ANNOUNCEMENTS and POLLS:
 * 1. Exactly ONE Admin (admin@mmmut.ac.in) has unrestricted cross-class access.
 * 2. Class Admins (CRs) are strictly restricted to their assigned class.
 *    - Cross-class creation, viewing, editing, closing, or deletion is rejected (403).
 * 3. Students are strictly restricted to their enrolled class.
 *    - Cannot create, edit, close, or delete polls or announcements (403).
 *    - Cannot vote in or view another class's polls (403).
 *    - Cannot view another class's announcements.
 * 4. Batch (P1/P2), Academic Session, and Semester scoping are strictly enforced.
 * 5. Tampering with client payload parameters cannot bypass server-side guards.
 */

import {
  canUserViewPoll,
  filterPollsForUser,
  canUserCreatePoll,
  canUserVoteInPoll,
  canUserClosePoll,
  canUserEditPoll,
  canUserDeletePoll,
  serverGetPollsForUser,
  serverCreatePoll,
  serverVoteInPoll,
  serverClosePoll,
  serverEditPoll,
  serverDeletePoll,
  serverPollsStore,
  getUserScope as getPollUserScope,
} from "../src/lib/serverPolls";

import {
  canUserViewAnnouncement,
  filterAnnouncementsForUser,
  canUserCreateAnnouncement,
  canUserEditAnnouncement,
  canUserDeleteAnnouncement,
  serverGetAnnouncementsForUser,
  serverCreateAnnouncement,
  serverEditAnnouncement,
  serverDeleteAnnouncement,
  serverAnnouncementsStore,
  ClassAnnouncement,
} from "../src/lib/serverAnnouncements";

import { UserAccount, ClassPoll } from "../src/types";

// Ensure tests run in local development mode for test runner store isolation
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

const CR_IT_USER: UserAccount = {
  id: "cr-it-uuid-002",
  fullName: "Aryan Singh (CR IT)",
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
};

const CR_CSE_USER: UserAccount = {
  id: "cr-cse-uuid-003",
  fullName: "Rohan Verma (CR CSE)",
  email: "cr.cse@mmmut.ac.in",
  role: "class_admin",
  degree: "B.Tech",
  branch: "Computer Science & Engineering",
  branchCode: "CSE",
  section: "SEC-A",
  batch: "P1",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75.0,
  activeTimetableId: "mmmut-btech-cse-a-2025",
  managedBranchCode: "CSE",
  managedSection: "SEC-A",
};

const STUDENT_IT_P1: UserAccount = {
  id: "student-it-uuid-004",
  fullName: "Neha Sharma",
  email: "neha.it@mmmut.ac.in",
  role: "student",
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

const STUDENT_IT_P2: UserAccount = {
  id: "student-it-p2-uuid-005",
  fullName: "Vikas Patel",
  email: "vikas.it@mmmut.ac.in",
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

const STUDENT_CSE_A: UserAccount = {
  id: "student-cse-uuid-006",
  fullName: "Aman Gupta",
  email: "aman.cse@mmmut.ac.in",
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
  console.log(" AttendX Strict Class-Level Authorization Test Suite");
  console.log(" Target: ANNOUNCEMENTS & POLLS Scope Boundaries");
  console.log("================================================================================\n");

  // Reset in-memory stores before testing
  serverPollsStore.resetToDefaults();
  serverAnnouncementsStore.resetToDefaults();

  // ---------------------------------------------------------------------------
  // SECTION 1: POLLS AUTHORIZATION
  // ---------------------------------------------------------------------------
  console.log("--- TEST GROUP 1: POLL SCOPE & PERMISSIONS ---");

  // 1.1 Creation: CR Own Class vs Cross Class
  const crItCreateOwn = canUserCreatePoll(CR_IT_USER, "IT", "SEC-B");
  assert(crItCreateOwn.allowed === true, "CR can create poll for their own assigned class (IT SEC-B)");

  const crItCreateCross = canUserCreatePoll(CR_IT_USER, "CSE", "SEC-A");
  assert(crItCreateCross.allowed === false, "CR CANNOT create poll for another class (CSE SEC-A)");
  assert(crItCreateCross.reason?.includes("Access Denied") === true, "CR cross-class poll creation returns Access Denied reason");

  const crItCreateUnivWide = canUserCreatePoll(CR_IT_USER, "ALL", "ALL");
  assert(crItCreateUnivWide.allowed === false, "CR CANNOT create university-wide (ALL) poll");

  // 1.2 Creation: Student Prohibition
  const studentCreate = canUserCreatePoll(STUDENT_IT_P1, "IT", "SEC-B");
  assert(studentCreate.allowed === false, "Student CANNOT create polls even for own enrolled class");
  assert(studentCreate.reason?.includes("Access Denied") === true, "Student poll creation returns Access Denied");

  // 1.3 Creation: Admin Universal Access
  const adminCreateUniv = canUserCreatePoll(ADMIN_USER, "ALL", "ALL");
  assert(adminCreateUniv.allowed === true, "Admin can create university-wide poll");
  const adminCreateAnyClass = canUserCreatePoll(ADMIN_USER, "CSE", "SEC-A");
  assert(adminCreateAnyClass.allowed === true, "Admin can create poll for any class (CSE SEC-A)");

  // 1.4 Viewing & Scoping: Poll Isolation
  const itPoll: ClassPoll = {
    id: "poll-it-01",
    title: "IT Mass Bunk Consensus",
    category: "MASS_BUNK",
    branchCode: "IT",
    section: "SEC-B",
    options: [{ id: "opt-1", text: "Yes", votes: 0 }, { id: "opt-2", text: "No", votes: 0 }],
    createdBy: { id: CR_IT_USER.id, name: CR_IT_USER.fullName, role: "class_admin" },
    votedUserIds: {},
    totalVotes: 0,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  const csePoll: ClassPoll = {
    id: "poll-cse-01",
    title: "CSE Tutorial Shift",
    category: "RESCHEDULE",
    branchCode: "CSE",
    section: "SEC-A",
    options: [{ id: "opt-3", text: "Agree", votes: 0 }, { id: "opt-4", text: "Disagree", votes: 0 }],
    createdBy: { id: CR_CSE_USER.id, name: CR_CSE_USER.fullName, role: "class_admin" },
    votedUserIds: {},
    totalVotes: 0,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  const univPoll: ClassPoll = {
    id: "poll-univ-01",
    title: "University Holiday Preference",
    category: "GENERAL",
    branchCode: "ALL",
    section: "ALL",
    options: [{ id: "opt-5", text: "Monday", votes: 0 }, { id: "opt-6", text: "Friday", votes: 0 }],
    createdBy: { id: ADMIN_USER.id, name: ADMIN_USER.fullName, role: "admin" },
    votedUserIds: {},
    totalVotes: 0,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  assert(canUserViewPoll(CR_IT_USER, itPoll) === true, "CR IT can view IT poll");
  assert(canUserViewPoll(CR_IT_USER, csePoll) === false, "CR IT CANNOT view CSE poll (strictly filtered)");
  assert(canUserViewPoll(CR_IT_USER, univPoll) === true, "CR IT can view university-wide poll");

  assert(canUserViewPoll(STUDENT_IT_P1, itPoll) === true, "Student IT can view IT poll");
  assert(canUserViewPoll(STUDENT_IT_P1, csePoll) === false, "Student IT CANNOT view CSE poll");
  assert(canUserViewPoll(STUDENT_IT_P1, univPoll) === true, "Student IT can view university-wide poll");

  assert(canUserViewPoll(ADMIN_USER, itPoll) === true, "Admin can view IT poll");
  assert(canUserViewPoll(ADMIN_USER, csePoll) === true, "Admin can view CSE poll");
  assert(canUserViewPoll(ADMIN_USER, univPoll) === true, "Admin can view university-wide poll");

  // 1.5 Voting: Scope Isolation
  const studentVoteOwn = canUserVoteInPoll(STUDENT_IT_P1, itPoll);
  assert(studentVoteOwn.allowed === true, "Student IT can vote in IT poll");

  const studentVoteCross = canUserVoteInPoll(STUDENT_IT_P1, csePoll);
  assert(studentVoteCross.allowed === false, "Student IT CANNOT vote in CSE poll");
  assert(studentVoteCross.reason?.includes("Access Denied") === true, "Student cross-class vote returns Access Denied");

  const crVoteCross = canUserVoteInPoll(CR_IT_USER, csePoll);
  assert(crVoteCross.allowed === false, "CR IT CANNOT vote in CSE poll");

  // 1.6 Editing, Closing & Deletion: CR & Student Restrictions
  assert(canUserEditPoll(CR_IT_USER, itPoll).allowed === true, "CR IT can edit IT poll");
  assert(canUserEditPoll(CR_IT_USER, csePoll).allowed === false, "CR IT CANNOT edit CSE poll");
  assert(canUserEditPoll(STUDENT_IT_P1, itPoll).allowed === false, "Student CANNOT edit any poll");

  assert(canUserClosePoll(CR_IT_USER, itPoll).allowed === true, "CR IT can close IT poll");
  assert(canUserClosePoll(CR_IT_USER, csePoll).allowed === false, "CR IT CANNOT close CSE poll");
  assert(canUserClosePoll(STUDENT_IT_P1, itPoll).allowed === false, "Student CANNOT close any poll");

  assert(canUserDeletePoll(CR_IT_USER, itPoll).allowed === true, "CR IT can delete IT poll");
  assert(canUserDeletePoll(CR_IT_USER, csePoll).allowed === false, "CR IT CANNOT delete CSE poll");
  assert(canUserDeletePoll(STUDENT_IT_P1, itPoll).allowed === false, "Student CANNOT delete any poll");

  assert(canUserEditPoll(ADMIN_USER, csePoll).allowed === true, "Admin can edit any poll");
  assert(canUserClosePoll(ADMIN_USER, csePoll).allowed === true, "Admin can close any poll");
  assert(canUserDeletePoll(ADMIN_USER, csePoll).allowed === true, "Admin can delete any poll");

  // ---------------------------------------------------------------------------
  // SECTION 2: ANNOUNCEMENTS AUTHORIZATION
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: ANNOUNCEMENTS SCOPE & PERMISSIONS ---");

  // 2.1 Creation: CR Own Class vs Cross Class
  const crAnnCreateOwn = canUserCreateAnnouncement(CR_IT_USER, "IT", "SEC-B");
  assert(crAnnCreateOwn.allowed === true, "CR can create announcement for own assigned class (IT SEC-B)");

  const crAnnCreateCross = canUserCreateAnnouncement(CR_IT_USER, "CSE", "SEC-A");
  assert(crAnnCreateCross.allowed === false, "CR CANNOT create announcement for another class (CSE SEC-A)");
  assert(crAnnCreateCross.reason?.includes("Access Denied") === true, "CR cross-class announcement creation returns Access Denied");

  const crAnnCreateUniv = canUserCreateAnnouncement(CR_IT_USER, "ALL", "ALL");
  assert(crAnnCreateUniv.allowed === false, "CR CANNOT broadcast university-wide announcement");

  // 2.2 Creation: Student Prohibition
  const studentAnnCreate = canUserCreateAnnouncement(STUDENT_IT_P1, "IT", "SEC-B");
  assert(studentAnnCreate.allowed === false, "Student CANNOT create class announcements");
  assert(studentAnnCreate.reason?.includes("Access Denied") === true, "Student announcement creation returns Access Denied");

  // 2.3 Creation: Admin Universal Access
  const adminAnnCreateUniv = canUserCreateAnnouncement(ADMIN_USER, "ALL", "ALL");
  assert(adminAnnCreateUniv.allowed === true, "Admin can broadcast university-wide announcement");
  const adminAnnCreateClass = canUserCreateAnnouncement(ADMIN_USER, "CSE", "SEC-A");
  assert(adminAnnCreateClass.allowed === true, "Admin can create announcement for any class (CSE SEC-A)");

  // 2.4 Viewing & Scoping: Announcement Isolation
  const itAnn: ClassAnnouncement = {
    id: "ann-it-01",
    title: "IT Class Lab Notice",
    message: "Report to Lab 2 at 2 PM",
    type: "info",
    branchCode: "IT",
    section: "SEC-B",
    createdBy: CR_IT_USER.id,
    authorName: CR_IT_USER.fullName,
    authorRole: "class_admin",
    createdAt: new Date().toISOString(),
  };

  const cseAnn: ClassAnnouncement = {
    id: "ann-cse-01",
    title: "CSE Section A Math Assignment",
    message: "Submit tutorial 3 by Friday",
    type: "warning",
    branchCode: "CSE",
    section: "SEC-A",
    createdBy: CR_CSE_USER.id,
    authorName: CR_CSE_USER.fullName,
    authorRole: "class_admin",
    createdAt: new Date().toISOString(),
  };

  const univAnn: ClassAnnouncement = {
    id: "ann-univ-01",
    title: "Convocation Registration",
    message: "Register on university portal",
    type: "info",
    branchCode: "ALL",
    section: "ALL",
    createdBy: ADMIN_USER.id,
    authorName: ADMIN_USER.fullName,
    authorRole: "admin",
    createdAt: new Date().toISOString(),
  };

  assert(canUserViewAnnouncement(CR_IT_USER, itAnn) === true, "CR IT can view IT announcement");
  assert(canUserViewAnnouncement(CR_IT_USER, cseAnn) === false, "CR IT CANNOT view CSE announcement (filtered out)");
  assert(canUserViewAnnouncement(CR_IT_USER, univAnn) === true, "CR IT can view university-wide announcement");

  assert(canUserViewAnnouncement(STUDENT_IT_P1, itAnn) === true, "Student IT can view IT announcement");
  assert(canUserViewAnnouncement(STUDENT_IT_P1, cseAnn) === false, "Student IT CANNOT view CSE announcement (filtered out)");
  assert(canUserViewAnnouncement(STUDENT_IT_P1, univAnn) === true, "Student IT can view university-wide announcement");

  assert(canUserViewAnnouncement(ADMIN_USER, itAnn) === true, "Admin can view IT announcement");
  assert(canUserViewAnnouncement(ADMIN_USER, cseAnn) === true, "Admin can view CSE announcement");
  assert(canUserViewAnnouncement(ADMIN_USER, univAnn) === true, "Admin can view university-wide announcement");

  // 2.5 Editing & Deletion: CR & Student Restrictions
  assert(canUserEditAnnouncement(CR_IT_USER, itAnn).allowed === true, "CR IT can edit IT announcement");
  assert(canUserEditAnnouncement(CR_IT_USER, cseAnn).allowed === false, "CR IT CANNOT edit CSE announcement");
  assert(canUserEditAnnouncement(STUDENT_IT_P1, itAnn).allowed === false, "Student CANNOT edit any announcement");

  assert(canUserDeleteAnnouncement(CR_IT_USER, itAnn).allowed === true, "CR IT can delete IT announcement");
  assert(canUserDeleteAnnouncement(CR_IT_USER, cseAnn).allowed === false, "CR IT CANNOT delete CSE announcement");
  assert(canUserDeleteAnnouncement(STUDENT_IT_P1, itAnn).allowed === false, "Student CANNOT delete any announcement");

  assert(canUserEditAnnouncement(ADMIN_USER, cseAnn).allowed === true, "Admin can edit any announcement");
  assert(canUserDeleteAnnouncement(ADMIN_USER, cseAnn).allowed === true, "Admin can delete any announcement");

  // ---------------------------------------------------------------------------
  // SECTION 3: BATCH, SESSION & SEMESTER SCOPING
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: BATCH (P1/P2) & SESSION SCOPING ---");

  const itBatchP1Ann: ClassAnnouncement = {
    id: "ann-it-batch-p1",
    title: "P1 Lab Record Check",
    message: "Only Batch P1 students submit files",
    type: "info",
    branchCode: "IT",
    section: "SEC-B",
    batch: "P1",
    academicSession: "2025-26",
    semester: "Semester I",
    createdBy: CR_IT_USER.id,
    authorName: CR_IT_USER.fullName,
    authorRole: "class_admin",
    createdAt: new Date().toISOString(),
  };

  const itBatchP2Poll: ClassPoll = {
    id: "poll-it-batch-p2",
    title: "P2 Extra Practical Slot",
    category: "EXTRA_CLASS",
    branchCode: "IT",
    section: "SEC-B",
    batch: "P2",
    academicSession: "2025-26",
    semester: "Semester I",
    options: [{ id: "opt-p2-1", text: "Saturday", votes: 0 }, { id: "opt-p2-2", text: "Sunday", votes: 0 }],
    createdBy: { id: CR_IT_USER.id, name: CR_IT_USER.fullName, role: "class_admin" },
    votedUserIds: {},
    totalVotes: 0,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  // Student P1 vs Batch P1 announcement:
  assert(canUserViewAnnouncement(STUDENT_IT_P1, itBatchP1Ann) === true, "Student P1 can view Batch P1 announcement");
  // Student P2 vs Batch P1 announcement:
  assert(canUserViewAnnouncement(STUDENT_IT_P2, itBatchP1Ann) === false, "Student P2 CANNOT view Batch P1 announcement (strictly batch-isolated)");

  // Student P1 voting in P2 poll:
  const studentP1VoteP2 = canUserVoteInPoll(STUDENT_IT_P1, itBatchP2Poll);
  assert(studentP1VoteP2.allowed === false, "Student P1 CANNOT vote in Batch P2 poll");
  assert(studentP1VoteP2.reason?.includes("Access Denied") === true, "P1 student voting in P2 poll returns Access Denied");

  // Student P2 voting in P2 poll:
  const studentP2VoteP2 = canUserVoteInPoll(STUDENT_IT_P2, itBatchP2Poll);
  assert(studentP2VoteP2.allowed === true, "Student P2 CAN vote in Batch P2 poll");

  // ---------------------------------------------------------------------------
  // SECTION 4: SERVER MUTATION & TAMPERING RESISTANCE
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 4: SERVER MUTATIONS & TAMPER RESISTANCE ---");

  // Add test items to in-memory store
  serverPollsStore.set(itPoll);
  serverPollsStore.set(csePoll);
  serverAnnouncementsStore.set(itAnn);
  serverAnnouncementsStore.set(cseAnn);

  // 4.1 Server GET Polls isolation
  const crItPolls = await serverGetPollsForUser(CR_IT_USER);
  assert(crItPolls.some((p) => p.id === "poll-it-01"), "serverGetPollsForUser includes IT poll for CR IT");
  assert(!crItPolls.some((p) => p.id === "poll-cse-01"), "serverGetPollsForUser EXCLUDES CSE poll for CR IT");

  // 4.2 Server Create Poll: Spoofed scope rejection
  const crTamperedPoll = await serverCreatePoll(CR_IT_USER, {
    title: "Tampered Cross-Class Poll",
    category: "MASS_BUNK",
    branchCode: "CSE", // Tampered
    section: "SEC-A", // Tampered
    options: [{ text: "Yes" }, { text: "No" }],
  });
  assert(crTamperedPoll.success === false, "serverCreatePoll rejects CR attempting to pass cross-class branch/section");
  assert(crTamperedPoll.error?.includes("Access Denied") === true, "Rejection contains Access Denied");

  // 4.3 Server Close Poll: Cross-class close rejection
  const crCloseCse = await serverClosePoll(CR_IT_USER, "poll-cse-01");
  assert(crCloseCse.success === false, "serverClosePoll rejects CR closing another class's poll");
  assert(crCloseCse.error?.includes("Access Denied") === true, "Rejection contains Access Denied");

  // 4.4 Server Edit Poll: Cross-class edit rejection
  const crEditCse = await serverEditPoll(CR_IT_USER, "poll-cse-01", { title: "Hacked Poll" });
  assert(crEditCse.success === false, "serverEditPoll rejects CR editing another class's poll");
  assert(crEditCse.error?.includes("Access Denied") === true, "Rejection contains Access Denied");

  // 4.5 Server Delete Poll: Cross-class delete rejection
  const crDeleteCse = await serverDeletePoll(CR_IT_USER, "poll-cse-01");
  assert(crDeleteCse.success === false, "serverDeletePoll rejects CR deleting another class's poll");
  assert(crDeleteCse.error?.includes("Access Denied") === true, "Rejection contains Access Denied");

  // 4.6 Server Announcements: Cross-class create rejection
  const crTamperedAnn = await serverCreateAnnouncement(CR_IT_USER, {
    title: "Tampered Cross-Class Announcement",
    message: "Should fail",
    type: "danger",
    branchCode: "CSE",
    section: "SEC-A",
  });
  assert(crTamperedAnn.success === false, "serverCreateAnnouncement rejects CR creating for another class");
  assert(crTamperedAnn.error?.includes("Access Denied") === true, "Rejection contains Access Denied");

  // 4.7 Server Announcements: Student create rejection
  const studentServerAnn = await serverCreateAnnouncement(STUDENT_IT_P1, {
    title: "Student Post",
    message: "Should fail",
    type: "info",
    branchCode: "IT",
    section: "SEC-B",
  });
  assert(studentServerAnn.success === false, "serverCreateAnnouncement rejects student creation attempt");
  assert(studentServerAnn.error?.includes("Access Denied") === true, "Rejection contains Access Denied");

  // 4.8 Server Announcements: Cross-class edit & delete rejection
  const crEditCseAnn = await serverEditAnnouncement(CR_IT_USER, "ann-cse-01", { title: "Hacked Notice" });
  assert(crEditCseAnn.success === false, "serverEditAnnouncement rejects CR editing another class's announcement");

  const crDeleteCseAnn = await serverDeleteAnnouncement(CR_IT_USER, "ann-cse-01");
  assert(crDeleteCseAnn.success === false, "serverDeleteAnnouncement rejects CR deleting another class's announcement");

  // 4.9 Admin universal management
  const adminEdit = await serverEditAnnouncement(ADMIN_USER, "ann-cse-01", { title: "Admin Updated Title" });
  assert(adminEdit.success === true, "Admin can edit any class announcement");

  const adminDelete = await serverDeleteAnnouncement(ADMIN_USER, "ann-cse-01");
  assert(adminDelete.success === true, "Admin can delete any class announcement");

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
