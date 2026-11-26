import * as XLSX from "xlsx";
import {
  parseExcelStudents,
  processStudentRecordsForPreview,
  normalizeBranchCode,
  normalizeAcademicYear,
} from "../src/lib/studentImportParser";
import {
  parseExcelTimetable,
  validateTimetableSlots,
} from "../src/lib/timetableImportParser";
import {
  findTimetableForStudent,
  UNIVERSITY_DATABASE,
} from "../src/data/extractedTimetables";
import {
  serverAdminStore,
  serverGetStudentDirectory,
  serverDeactivateStudent,
  serverReactivateStudent,
  serverPublishTimetable,
  serverGetTimetables,
  serverArchiveTimetable,
  serverActivateTimetable,
  serverDeleteTimetables,
} from "../src/lib/serverAdmin";
import { UserAccount, TimetableSlot } from "../src/types";

const ADMIN_USER: UserAccount = {
  id: "admin-uuid-1",
  fullName: "AttendX Administrator",
  email: "admin@attendx.ac.in",
  role: "admin",
  degree: "B.Tech",
  branch: "Administrator",
  branchCode: "ADMIN",
  section: "",
  batch: "ALL",
  semester: "Semester I",
  academicSession: "2026-27",
  academicYear: "1st Year",
  attendanceThreshold: 75.0,
  activeTimetableId: "",
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log(" AttendX Admin Portal & Academic Year Upgrade Test Suite");
  console.log("=======================================================\n");

  // ---------------------------------------------------------------------------
  // TEST 1: Student Import Parser & Normalization
  // ---------------------------------------------------------------------------
  console.log("--- TEST 1: Student Import Parsing & Normalization ---");
  assert(normalizeBranchCode("Information Technology") === "IT", "Branch alias 'Information Technology' resolves to 'IT'");
  assert(normalizeBranchCode("Computer Science & Engineering") === "CSE", "Branch alias resolves to 'CSE'");
  assert(normalizeBranchCode("ECE") === "ECE", "Raw code 'ECE' preserved");
  assert(normalizeAcademicYear("2nd Year") === "2nd Year", "Academic year '2nd Year' recognized");
  assert(normalizeAcademicYear("2") === "2nd Year", "Academic year '2' normalized to '2nd Year'");
  assert(normalizeAcademicYear("first") === "1st Year", "Academic year 'first' normalized to '1st Year'");

  // Generate synthetic in-memory Excel workbook
  const testStudentData = [
    ["Student Name", "Roll No", "Enrollment No", "Branch", "Section", "Batch"],
    ["Aarav Sharma", "2026041001", "ENR2026001", "Information Technology", "SEC-A", "P1"],
    ["Diya Patel", "2026041002", "ENR2026002", "Computer Science", "SEC-B", "P2"],
    ["Rohan Verma", "2026041003", "ENR2026003", "Electronics & Communication", "SEC-A", "P1"],
    ["Duplicate In File", "2026041001", "ENR2026001", "IT", "SEC-A", "P1"], // Dupe
    ["Missing Roll", "", "ENR2026005", "IT", "SEC-A", "P1"], // Invalid
  ];
  const ws = XLSX.utils.aoa_to_sheet(testStudentData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const parsedExcel = await parseExcelStudents(excelBuffer, undefined, { academicYear: "2nd Year" });
  assert(parsedExcel.rows.length === 5, `Extracted 5 data rows from Excel workbook`);

  // Mock DB existing students
  const existingDb = [{ rollNumber: "2026041003", enrollmentNumber: "ENR2026003" }]; // Rohan already in DB

  const preview = processStudentRecordsForPreview(parsedExcel.rows, parsedExcel.mapping, existingDb, {
    academicYear: "2nd Year",
  });

  assert(preview.totalDetected === 5, `Total detected records is 5`);
  assert(preview.validCount === 2, `Valid records count is 2 (Aarav, Diya)`);
  assert(preview.duplicateCount === 1, `File duplicates correctly detected (Roll 2026041001)`);
  assert(preview.existingCount === 1, `Already in DB correctly detected (Roll 2026041003)`);
  assert(preview.invalidCount === 1, `Invalid record correctly flagged for missing roll number`);
  assert(preview.willAddCount === 2, `willAddCount is exactly 2`);

  // ---------------------------------------------------------------------------
  // TEST 2: Timetable Conflict & Slot Validator
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: Timetable Slot & Conflict Validator ---");
  const validSlots: TimetableSlot[] = [
    { day: "Monday", period: 1, subjectCode: "BIT-101", subjectName: "PPS", category: "Theory", batch: "ALL", room: "TL-203" },
    { day: "Monday", period: 2, subjectCode: "BIT-102", subjectName: "Physics", category: "Theory", batch: "ALL", room: "TL-203" },
    { day: "Tuesday", period: 5, subjectCode: "BIT-151", subjectName: "PPS Lab", category: "Lab", batch: "P1", room: "L-101" },
    { day: "Tuesday", period: 5, subjectCode: "BIT-152", subjectName: "Physics Lab", category: "Lab", batch: "P2", room: "L-102" },
  ];
  const validCheck = validateTimetableSlots(validSlots);
  assert(validCheck.isValid === true, "Valid slots pass consistency check with zero errors");

  // Conflict 1: Overlapping classes for the same batch
  const conflictingSlots: TimetableSlot[] = [
    { day: "Monday", period: 1, subjectCode: "BIT-101", subjectName: "PPS", category: "Theory", batch: "P1", room: "TL-203" },
    { day: "Monday", period: 1, subjectCode: "BIT-102", subjectName: "Physics", category: "Theory", batch: "P1", room: "TL-203" }, // Conflicting
  ];
  const conflictCheck = validateTimetableSlots(conflictingSlots);
  assert(conflictCheck.isValid === false, "Overlapping classes for the same batch correctly flagged as conflict");
  assert(conflictCheck.issues[0]?.type === "conflict", "Issue type is 'conflict'");

  // Conflict 2: Missing room
  const missingRoomSlots: TimetableSlot[] = [
    { day: "Monday", period: 1, subjectCode: "BIT-101", subjectName: "PPS", category: "Theory", batch: "ALL", room: "" },
  ];
  const missingCheck = validateTimetableSlots(missingRoomSlots);
  assert(missingCheck.isValid === false, "Slot with missing room number flagged as issue");
  assert(missingCheck.issues[0]?.type === "missing", "Issue type is 'missing'");

  // ---------------------------------------------------------------------------
  // TEST 3: Student Removal & Safe Deactivation
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: Student Removal & Deactivation Mechanism ---");
  serverAdminStore.resetToDefaults();
  const testStudent = serverAdminStore.getAllStudents().find((s) => s.email !== "admin@attendx.ac.in")!;

  const deactRes = await serverDeactivateStudent(ADMIN_USER, {
    studentId: testStudent.id,
    reason: "Graduated or inactive",
  });
  assert(deactRes.success === true, "Deactivation returned success");

  const deactStudent = serverAdminStore.getStudentById(testStudent.id)!;
  assert(deactStudent.isActive === false, "Deactivated student has isActive = false");
  assert(deactStudent.status === "DEACTIVATED", "Deactivated student status marked DEACTIVATED");

  // Reactivate
  const reactRes = await serverReactivateStudent(ADMIN_USER, { studentId: testStudent.id });
  assert(reactRes.success === true, "Reactivation returned success");
  const reactStudent = serverAdminStore.getStudentById(testStudent.id)!;
  assert(reactStudent.isActive === true, "Reactivated student has isActive = true");
  assert(reactStudent.status === "ACTIVE", "Reactivated student has status ACTIVE");

  // ---------------------------------------------------------------------------
  // TEST 4: Timetable Versioning & Lifecycle Management
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 4: Timetable Lifecycle & Scoped Versioning ---");
  const pubRes1 = await serverPublishTimetable(ADMIN_USER, {
    branchCode: "IT",
    section: "SEC-B",
    scope: "ALL_BATCHES",
    academicYear: "2nd Year",
    semester: "Semester III",
    versionLabel: "v-2nd-it-1.0",
    timetable: {
      id: "tt-2nd-it-b",
      pageNumber: 1,
      degree: "B.Tech",
      branch: "Information Technology",
      branchCode: "IT",
      section: "SEC-B",
      room: "TL-205",
      session: "2026-27",
      academicYear: "2nd Year",
      semester: "Semester III",
      batches: ["P1", "P2"],
      isVerified: true,
      subjects: [],
      slots: validSlots,
    },
  });
  assert(pubRes1.success === true, "Successfully published 2nd Year IT SEC-B timetable");
  assert(pubRes1.version?.academicYear === "2nd Year", "Published timetable tagged with academicYear = '2nd Year'");

  const listRes = await serverGetTimetables(ADMIN_USER);
  assert(listRes.success === true, "Retrieved published timetables list");
  assert(listRes.timetables.length >= 1, "At least 1 published timetable exists in store");

  // ---------------------------------------------------------------------------
  // TEST 5: Second-Year Student Timetable Isolation
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 5: Second-Year Student Timetable Isolation ---");
  // 1st Year student lookup
  const firstYearMatch = findTimetableForStudent({
    branchCode: "IT",
    section: "SEC-B",
    academicYear: "1st Year",
  });
  assert(firstYearMatch !== null, "1st Year student receives 1st Year static timetable");
  assert(firstYearMatch?.branchCode === "IT", "Matches IT branch");

  // 2nd Year student lookup against static sheets
  const secondYearMatch = findTimetableForStudent({
    branchCode: "IT",
    section: "SEC-B",
    academicYear: "2nd Year",
  });
  assert(
    secondYearMatch === null,
    "CRITICAL: 2nd Year student NEVER silently receives 1st Year timetable (Isolation verified!)"
  );

  console.log("\n=======================================================");
  console.log(` Summary: ${passed} passed, ${failed} failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});
