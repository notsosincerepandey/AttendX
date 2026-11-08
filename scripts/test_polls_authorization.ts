/**
 * Automated Test Suite for Class Polls Authorization & Scoping
 * Tests:
 * 1. Cross-section poll listing isolation (Admin vs Class CR vs Student)
 * 2. Poll creation authorization boundaries
 * 3. Poll voting authorization (cross-section voting rejection, closed poll, duplicate vote)
 * 4. Poll closure authorization (cross-section closure rejection, student rejection, admin privileges)
 * 
 * Runs entirely in-memory with zero network or database mutations.
 */

import {
  canUserViewPoll,
  filterPollsForUser,
  canUserCreatePoll,
  canUserVoteInPoll,
  canUserClosePoll,
  serverGetPollsForUser,
  serverCreatePoll,
  serverVoteInPoll,
  serverClosePoll,
  serverPollsStore,
  SEED_CLASS_POLLS,
} from "../src/lib/serverPolls";
import { UserAccount, ClassPoll } from "../src/types";

// Test Users
const ADMIN_USER: UserAccount = {
  id: "admin-shubh-001",
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
  id: "class-admin-aryan-003",
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
};

const STUDENT_CSE_USER: UserAccount = {
  id: "student-cse-002",
  fullName: "Guest Student",
  email: "student@mmmut.ac.in",
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

const STUDENT_IT_USER: UserAccount = {
  id: "student-it-004",
  fullName: "IT Student",
  email: "student.it@mmmut.ac.in",
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

// Test Polls
const POLL_IT_SECB: ClassPoll = {
  id: "poll-it-01",
  title: "IT SEC-B Mass Bunk",
  category: "MASS_BUNK",
  branchCode: "IT",
  section: "SEC-B",
  options: [
    { id: "opt-1", text: "Yes", votes: 10 },
    { id: "opt-2", text: "No", votes: 2 },
  ],
  createdBy: {
    id: "class-admin-aryan-003",
    name: "Aryan Singh (CR)",
    role: "class_admin",
  },
  votedUserIds: {},
  totalVotes: 12,
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
};

const POLL_CSE_SECA: ClassPoll = {
  id: "poll-cse-01",
  title: "CSE SEC-A Reschedule",
  category: "RESCHEDULE",
  branchCode: "CSE",
  section: "SEC-A",
  options: [
    { id: "opt-3", text: "Agree", votes: 8 },
    { id: "opt-4", text: "Disagree", votes: 3 },
  ],
  createdBy: {
    id: "admin-shubh-001",
    name: "Shubh Pandey",
    role: "admin",
  },
  votedUserIds: {},
  totalVotes: 11,
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
};

const POLL_UNIVERSITY_ALL: ClassPoll = {
  id: "poll-univ-01",
  title: "Annual Sports Meet Date Preference",
  category: "GENERAL",
  branchCode: "ALL",
  section: "ALL",
  options: [
    { id: "opt-5", text: "First week of December", votes: 50 },
    { id: "opt-6", text: "Second week of December", votes: 45 },
  ],
  createdBy: {
    id: "admin-shubh-001",
    name: "Shubh Pandey",
    role: "admin",
  },
  votedUserIds: {},
  totalVotes: 95,
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
};

const ALL_TEST_POLLS = [POLL_IT_SECB, POLL_CSE_SECA, POLL_UNIVERSITY_ALL];

async function runTests() {
  console.log("=== Testing Class Polls Authorization & Scoping Engine ===\n");
  let passed = 0;
  let failed = 0;

  function report(name: string, ok: boolean, details?: string) {
    if (ok) {
      console.log(`[PASS] ${name}${details ? " - " + details : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}${details ? " - " + details : ""}`);
      failed++;
    }
  }

  // =============================================================
  // Suite 1: Poll Listing Authorization (Cross-Section Filtering)
  // =============================================================
  console.log("--- Suite 1: Poll Listing & Visibility Authorization ---");

  // 1.1 Class CR (IT / SEC-B) sees only IT / SEC-B and ALL polls; CSE polls are filtered out
  const crVisiblePolls = filterPollsForUser(ALL_TEST_POLLS, CR_IT_USER);
  const crSeesCse = crVisiblePolls.some((p) => p.branchCode === "CSE");
  const crSeesIt = crVisiblePolls.some((p) => p.branchCode === "IT" && p.section === "SEC-B");
  const crSeesAll = crVisiblePolls.some((p) => p.branchCode === "ALL");
  report(
    "1.1 Class CR (IT / SEC-B) receives IT SEC-B and ALL polls, but zero CSE SEC-A polls",
    !crSeesCse && crSeesIt && crSeesAll && crVisiblePolls.length === 2
  );

  // 1.2 Student (CSE / SEC-A) sees only CSE / SEC-A and ALL polls; IT polls are filtered out
  const cseStudentVisible = filterPollsForUser(ALL_TEST_POLLS, STUDENT_CSE_USER);
  const cseSeesIt = cseStudentVisible.some((p) => p.branchCode === "IT");
  const cseSeesCse = cseStudentVisible.some((p) => p.branchCode === "CSE");
  report(
    "1.2 Student (CSE / SEC-A) receives CSE SEC-A and ALL polls, but zero IT SEC-B polls",
    !cseSeesIt && cseSeesCse && cseStudentVisible.length === 2
  );

  // 1.3 Admin receives ALL polls across the entire university
  const adminVisible = filterPollsForUser(ALL_TEST_POLLS, ADMIN_USER);
  report(
    "1.3 Admin retains university-wide visibility and receives all polls (3 of 3)",
    adminVisible.length === 3
  );

  // 1.4 canUserViewPoll rejects CSE poll for IT CR
  report(
    "1.4 canUserViewPoll explicitly rejects CSE / SEC-A poll for IT / SEC-B CR",
    canUserViewPoll(CR_IT_USER, POLL_CSE_SECA) === false
  );

  // 1.5 canUserViewPoll accepts IT poll for IT CR
  report(
    "1.5 canUserViewPoll explicitly approves IT / SEC-B poll for IT / SEC-B CR",
    canUserViewPoll(CR_IT_USER, POLL_IT_SECB) === true
  );

  // =============================================================
  // Suite 2: Poll Creation Authorization
  // =============================================================
  console.log("\n--- Suite 2: Poll Creation Authorization ---");

  // 2.1 Class CR (IT / SEC-B) can create a poll for IT / SEC-B
  const crCreateAllowed = canUserCreatePoll(CR_IT_USER, "IT", "SEC-B");
  report(
    "2.1 Class CR can create poll for their authorized branch and section (IT / SEC-B)",
    crCreateAllowed.allowed
  );

  // 2.2 Class CR (IT / SEC-B) attempting to create poll for CSE / SEC-A is rejected
  const crCreateCse = canUserCreatePoll(CR_IT_USER, "CSE", "SEC-A");
  report(
    "2.2 Class CR attempting to create poll for another department (CSE / SEC-A) is rejected",
    !crCreateCse.allowed && Boolean(crCreateCse.reason?.includes("Access Denied"))
  );

  // 2.3 Class CR attempting to create a university-wide 'ALL' poll is rejected
  const crCreateAll = canUserCreatePoll(CR_IT_USER, "ALL", "ALL");
  report(
    "2.3 Class CR attempting to create university-wide ('ALL') poll is rejected",
    !crCreateAll.allowed && Boolean(crCreateAll.reason?.includes("Only university administrators"))
  );

  // 2.4 Student attempting to create a poll is rejected
  const studentCreate = canUserCreatePoll(STUDENT_CSE_USER, "CSE", "SEC-A");
  report(
    "2.4 Ordinary student attempting to create a poll is rejected with Access Denied",
    !studentCreate.allowed && Boolean(studentCreate.reason?.includes("Ordinary students are not permitted"))
  );

  // 2.5 Admin can create polls for ANY branch/section and for 'ALL'
  const adminCreateCse = canUserCreatePoll(ADMIN_USER, "CSE", "SEC-A");
  const adminCreateAll = canUserCreatePoll(ADMIN_USER, "ALL", "ALL");
  report(
    "2.5 Admin is authorized to create polls for any branch or university-wide",
    adminCreateCse.allowed && adminCreateAll.allowed
  );

  // =============================================================
  // Suite 3: Poll Voting Authorization
  // =============================================================
  console.log("\n--- Suite 3: Poll Voting Authorization ---");

  // 3.1 Class CR (IT / SEC-B) is permitted to vote in IT / SEC-B poll
  const crVoteIt = canUserVoteInPoll(CR_IT_USER, POLL_IT_SECB);
  report(
    "3.1 Class CR (IT / SEC-B) is permitted to vote in IT / SEC-B poll",
    crVoteIt.allowed
  );

  // 3.2 Class CR (IT / SEC-B) attempting to vote in CSE / SEC-A poll is REJECTED
  const crVoteCse = canUserVoteInPoll(CR_IT_USER, POLL_CSE_SECA);
  report(
    "3.2 Class CR (IT / SEC-B) attempting to vote in CSE / SEC-A poll is REJECTED",
    !crVoteCse.allowed && Boolean(crVoteCse.reason?.includes("Class Admins cannot vote in polls outside"))
  );

  // 3.3 Student (CSE / SEC-A) is permitted to vote in CSE / SEC-A poll
  const studentVoteCse = canUserVoteInPoll(STUDENT_CSE_USER, POLL_CSE_SECA);
  report(
    "3.3 Student (CSE / SEC-A) is permitted to vote in CSE / SEC-A poll",
    studentVoteCse.allowed
  );

  // 3.4 Student (CSE / SEC-A) attempting to vote in IT / SEC-B poll is REJECTED
  const studentVoteIt = canUserVoteInPoll(STUDENT_CSE_USER, POLL_IT_SECB);
  report(
    "3.4 Student (CSE / SEC-A) attempting to vote in IT / SEC-B poll is REJECTED",
    !studentVoteIt.allowed && Boolean(studentVoteIt.reason?.includes("cannot vote in polls outside their authorized branch"))
  );

  // 3.5 Both student and CR can vote in university-wide 'ALL' poll
  const crVoteAll = canUserVoteInPoll(CR_IT_USER, POLL_UNIVERSITY_ALL);
  const studentVoteAll = canUserVoteInPoll(STUDENT_CSE_USER, POLL_UNIVERSITY_ALL);
  report(
    "3.5 Both Class CR and Student are permitted to vote in university-wide ('ALL') poll",
    crVoteAll.allowed && studentVoteAll.allowed
  );

  // 3.6 Rejects voting in CLOSED poll
  const closedPoll: ClassPoll = { ...POLL_IT_SECB, status: "CLOSED" };
  const voteClosed = canUserVoteInPoll(CR_IT_USER, closedPoll);
  report(
    "3.6 Voting in CLOSED poll is rejected",
    !voteClosed.allowed && Boolean(voteClosed.reason?.includes("closed for voting"))
  );

  // 3.7 Rejects double-voting (user has already cast a vote)
  const alreadyVotedPoll: ClassPoll = {
    ...POLL_IT_SECB,
    votedUserIds: { [CR_IT_USER.id]: "opt-1" },
  };
  const voteAgain = canUserVoteInPoll(CR_IT_USER, alreadyVotedPoll);
  report(
    "3.7 Duplicate vote by the same user ID is rejected",
    !voteAgain.allowed && Boolean(voteAgain.reason?.includes("already cast your vote"))
  );

  // 3.8 Admin can vote in any poll
  const adminVoteIt = canUserVoteInPoll(ADMIN_USER, POLL_IT_SECB);
  const adminVoteCse = canUserVoteInPoll(ADMIN_USER, POLL_CSE_SECA);
  report(
    "3.8 Admin has permissions to vote across all sections",
    adminVoteIt.allowed && adminVoteCse.allowed
  );

  // =============================================================
  // Suite 4: Poll Closure Authorization
  // =============================================================
  console.log("\n--- Suite 4: Poll Closure Authorization ---");

  // 4.1 Class CR (IT / SEC-B) can close an IT / SEC-B poll
  const crCloseIt = canUserClosePoll(CR_IT_USER, POLL_IT_SECB);
  report(
    "4.1 Class CR (IT / SEC-B) can close an IT / SEC-B poll",
    crCloseIt.allowed
  );

  // 4.2 Class CR (IT / SEC-B) attempting to close a CSE / SEC-A poll is REJECTED
  const crCloseCse = canUserClosePoll(CR_IT_USER, POLL_CSE_SECA);
  report(
    "4.2 Class CR (IT / SEC-B) attempting to close a CSE / SEC-A poll is REJECTED",
    !crCloseCse.allowed && Boolean(crCloseCse.reason?.includes("Class Admins may close polls only within their authorized scope"))
  );

  // 4.3 Student attempting to close any poll is REJECTED
  const studentClose = canUserClosePoll(STUDENT_CSE_USER, POLL_CSE_SECA);
  report(
    "4.3 Ordinary student attempting to close a poll is REJECTED",
    !studentClose.allowed && Boolean(studentClose.reason?.includes("Students are not permitted to close polls"))
  );

  // 4.4 Admin can close any poll across any branch and section
  const adminCloseIt = canUserClosePoll(ADMIN_USER, POLL_IT_SECB);
  const adminCloseCse = canUserClosePoll(ADMIN_USER, POLL_CSE_SECA);
  report(
    "4.4 Admin has authority to close polls across all departments",
    adminCloseIt.allowed && adminCloseCse.allowed
  );

  // =============================================================
  // Suite 5: Server Operations Store Integration
  // =============================================================
  console.log("\n--- Suite 5: Server Store Operations Integration ---");

  serverPollsStore.resetToDefaults();

  // 5.1 Server-level getPollsForUser correctly filters seed polls for IT CR
  const serverPollsForCr = await serverGetPollsForUser(CR_IT_USER);
  const hasCseSeed = serverPollsForCr.some((p) => p.branchCode === "CSE");
  report(
    "5.1 serverGetPollsForUser excludes CSE seed poll (poll-demo-02) for IT CR",
    !hasCseSeed && serverPollsForCr.length === 1 && serverPollsForCr[0].id === "poll-demo-01"
  );

  // 5.2 Server-level vote rejection for IT CR voting in CSE poll
  const serverVoteCseRes = await serverVoteInPoll(CR_IT_USER, "poll-demo-02", "opt-201");
  report(
    "5.2 serverVoteInPoll rejects IT CR attempt to vote in CSE poll",
    !serverVoteCseRes.success && Boolean(serverVoteCseRes.error?.includes("Access Denied"))
  );

  // 5.3 Server-level close rejection for IT CR closing CSE poll
  const serverCloseCseRes = await serverClosePoll(CR_IT_USER, "poll-demo-02");
  report(
    "5.3 serverClosePoll rejects IT CR attempt to close CSE poll",
    !serverCloseCseRes.success && Boolean(serverCloseCseRes.error?.includes("Access Denied"))
  );

  // 5.4 Server-level create rejection for IT CR creating CSE poll
  const serverCreateCseRes = await serverCreatePoll(CR_IT_USER, {
    title: "Unauthorized CSE Poll",
    category: "GENERAL",
    branchCode: "CSE",
    section: "SEC-A",
    options: [{ text: "Yes" }, { text: "No" }],
  });
  report(
    "5.4 serverCreatePoll rejects IT CR attempt to create poll in CSE",
    !serverCreateCseRes.success && Boolean(serverCreateCseRes.error?.includes("Access Denied"))
  );

  // 5.5 Server-level authorized poll creation, voting, and closing for IT CR
  const serverCreateItRes = await serverCreatePoll(CR_IT_USER, {
    title: "Authorized IT Poll",
    category: "EXTRA_CLASS",
    branchCode: "IT",
    section: "SEC-B",
    options: [{ text: "Agree" }, { text: "Disagree" }],
  });
  report(
    "5.5 serverCreatePoll allows IT CR to create poll for IT SEC-B",
    serverCreateItRes.success && Boolean(serverCreateItRes.poll?.id)
  );

  if (serverCreateItRes.poll) {
    const newPollId = serverCreateItRes.poll.id;
    const voteRes = await serverVoteInPoll(STUDENT_IT_USER, newPollId, serverCreateItRes.poll.options[0].id);
    report(
      "5.6 serverVoteInPoll allows IT Student to vote in newly created IT poll",
      voteRes.success && voteRes.poll?.totalVotes === 1
    );

    const closeRes = await serverClosePoll(CR_IT_USER, newPollId);
    report(
      "5.7 serverClosePoll allows IT CR to close their authorized IT poll",
      closeRes.success && closeRes.poll?.status === "CLOSED"
    );
  }

  // =============================================================
  // Test Summary
  // =============================================================
  console.log("\n============================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
