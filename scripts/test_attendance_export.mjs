/**
 * AttendX Attendance Export Verification Test Suite
 * Tests XLSX generation, CSV generation, 3-column layout, date sorting,
 * subject sorting within date, timezone-safe date formatting, CSV escaping,
 * and SheetJS workbook integrity.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import {
  formatDateSafe,
  formatAttendanceStatus,
  escapeCSV,
  generateExportFilename,
  prepareAttendanceExportData,
} from "../src/lib/attendanceExport.ts";

console.log("=======================================================");
console.log(" AttendX Attendance Export Verification Suite");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

// Mock Attendance Data
const sampleRecords = [
  {
    id: "att-3",
    studentId: "stu-1",
    date: "2026-11-24",
    period: 3,
    subjectCode: "BAS-202",
    subjectName: "Physics",
    category: "Theory",
    batch: "P1",
    room: "TL-203",
    status: "PRESENT",
    markedAt: "2026-11-24T12:00:00Z",
    markedBy: "STUDENT",
  },
  {
    id: "att-1",
    studentId: "stu-1",
    date: "2026-11-24",
    period: 1,
    subjectCode: "BAS-201",
    subjectName: "Mathematics II",
    category: "Theory",
    batch: "P1",
    room: "TL-203",
    status: "PRESENT",
    markedAt: "2026-11-24T10:00:00Z",
    markedBy: "STUDENT",
  },
  {
    id: "att-2",
    studentId: "stu-1",
    date: "2026-11-24",
    period: 2,
    subjectCode: "BIT-201",
    subjectName: "Data Structures",
    category: "Theory",
    batch: "P1",
    room: "TL-203",
    status: "ABSENT",
    markedAt: "2026-11-24T11:00:00Z",
    markedBy: "STUDENT",
  },
  {
    id: "att-6",
    studentId: "stu-1",
    date: "2026-11-25",
    period: 3,
    subjectCode: "BAS-202",
    subjectName: "Physics",
    category: "Theory",
    batch: "P1",
    room: "TL-203",
    status: "ABSENT",
    markedAt: "2026-11-25T12:00:00Z",
    markedBy: "STUDENT",
  },
  {
    id: "att-4",
    studentId: "stu-1",
    date: "2026-11-25",
    period: 1,
    subjectCode: "BAS-201",
    subjectName: "Mathematics II",
    category: "Theory",
    batch: "P1",
    room: "TL-203",
    status: "PRESENT",
    markedAt: "2026-11-25T10:00:00Z",
    markedBy: "STUDENT",
  },
  {
    id: "att-5",
    studentId: "stu-1",
    date: "2026-11-25",
    period: 2,
    subjectCode: "BIT-201",
    subjectName: "Data Structures",
    category: "Theory",
    batch: "P1",
    room: "TL-203",
    status: "PRESENT",
    markedAt: "2026-11-25T11:00:00Z",
    markedBy: "STUDENT",
  },
];

console.log("--- GROUP 1: Date & Status Formatting (Timezone Safe) ---");

runTest("formatDateSafe produces 'DD MMM YYYY' without timezone offset shift", () => {
  assert.equal(formatDateSafe("2026-11-24"), "24 Nov 2026");
  assert.equal(formatDateSafe("2026-05-08"), "8 May 2026");
  assert.equal(formatDateSafe("2026-12-31"), "31 Dec 2026");
  assert.equal(formatDateSafe("2026-01-01T00:00:00.000Z"), "1 Jan 2026");
  assert.equal(formatDateSafe(""), "");
});

runTest("formatAttendanceStatus normalizes database status to clean Title Case", () => {
  assert.equal(formatAttendanceStatus("PRESENT"), "Present");
  assert.equal(formatAttendanceStatus("ABSENT"), "Absent");
  assert.equal(formatAttendanceStatus("CANCELLED"), "Cancelled");
  assert.equal(formatAttendanceStatus("PENDING"), "Pending");
  assert.equal(formatAttendanceStatus("present"), "Present");
});

console.log("\n--- GROUP 2: Data Sorting & 3-Column Layout ---");

runTest("Sorting rule 1: Date ascending order (Nov 24 before Nov 25)", () => {
  const { rows } = prepareAttendanceExportData(sampleRecords);
  assert.equal(rows.length, 6);
  assert.equal(rows[0].date, "24 Nov 2026");
  assert.equal(rows[1].date, "24 Nov 2026");
  assert.equal(rows[2].date, "24 Nov 2026");
  assert.equal(rows[3].date, "25 Nov 2026");
  assert.equal(rows[4].date, "25 Nov 2026");
  assert.equal(rows[5].date, "25 Nov 2026");
});

runTest("Sorting rule 2: Subject ascending within the date (Data Structures < Math II < Physics)", () => {
  const { rows } = prepareAttendanceExportData(sampleRecords);
  // On 24 Nov 2026:
  assert.equal(rows[0].subject, "Data Structures");
  assert.equal(rows[0].attendance, "Absent");
  assert.equal(rows[1].subject, "Mathematics II");
  assert.equal(rows[1].attendance, "Present");
  assert.equal(rows[2].subject, "Physics");
  assert.equal(rows[2].attendance, "Present");

  // On 25 Nov 2026:
  assert.equal(rows[3].subject, "Data Structures");
  assert.equal(rows[3].attendance, "Present");
  assert.equal(rows[4].subject, "Mathematics II");
  assert.equal(rows[4].attendance, "Present");
  assert.equal(rows[5].subject, "Physics");
  assert.equal(rows[5].attendance, "Absent");
});

runTest("Separate rows preserved for multiple subjects on same date", () => {
  const { rows } = prepareAttendanceExportData(sampleRecords);
  const nov24Rows = rows.filter((r) => r.date === "24 Nov 2026");
  assert.equal(nov24Rows.length, 3);
  const subjects = nov24Rows.map((r) => r.subject);
  assert.deepEqual(subjects, ["Data Structures", "Mathematics II", "Physics"]);
});

runTest("Separate rows preserved for same subject across multiple dates", () => {
  const { rows } = prepareAttendanceExportData(sampleRecords);
  const physicsRows = rows.filter((r) => r.subject === "Physics");
  assert.equal(physicsRows.length, 2);
  assert.equal(physicsRows[0].date, "24 Nov 2026");
  assert.equal(physicsRows[0].attendance, "Present");
  assert.equal(physicsRows[1].date, "25 Nov 2026");
  assert.equal(physicsRows[1].attendance, "Absent");
});

runTest("Empty records returns empty rows gracefully without throwing", () => {
  const { rows, sortedRecords } = prepareAttendanceExportData([]);
  assert.equal(rows.length, 0);
  assert.equal(sortedRecords.length, 0);
});

console.log("\n--- GROUP 3: CSV Escaping & RFC 4180 Compliance ---");

runTest("RFC 4180 escaping handles plain strings, commas, and quotes", () => {
  assert.equal(escapeCSV("Mathematics II"), "Mathematics II");
  assert.equal(
    escapeCSV("Data Structures, Algorithms & OOP"),
    '"Data Structures, Algorithms & OOP"'
  );
  assert.equal(
    escapeCSV('Seminar on "Cloud Computing"'),
    '"Seminar on ""Cloud Computing"""'
  );
  assert.equal(escapeCSV(null), "");
  assert.equal(escapeCSV(undefined), "");
});

runTest("CSV generation produces exact headers 'Date,Subject,Attendance' and valid rows", () => {
  const { rows } = prepareAttendanceExportData(sampleRecords);
  const lines = [
    "Date,Subject,Attendance",
    ...rows.map(
      (r) => `${escapeCSV(r.date)},${escapeCSV(r.subject)},${escapeCSV(r.attendance)}`
    ),
  ];
  const csvContent = "\uFEFF" + lines.join("\r\n");

  assert.ok(csvContent.startsWith("\uFEFF"), "Must start with UTF-8 BOM");
  const parsedLines = csvContent.replace("\uFEFF", "").split("\r\n");
  assert.equal(parsedLines[0], "Date,Subject,Attendance");
  assert.equal(parsedLines[1], "24 Nov 2026,Data Structures,Absent");
  assert.equal(parsedLines[2], "24 Nov 2026,Mathematics II,Present");
  assert.equal(parsedLines[3], "24 Nov 2026,Physics,Present");
  assert.equal(parsedLines[4], "25 Nov 2026,Data Structures,Present");
  assert.equal(parsedLines[5], "25 Nov 2026,Mathematics II,Present");
  assert.equal(parsedLines[6], "25 Nov 2026,Physics,Absent");
});

console.log("\n--- GROUP 4: Filename Generation ---");

runTest("Filename reflects date range when multiple dates exist", () => {
  const filename = generateExportFilename(sampleRecords, "xlsx");
  assert.equal(filename, "AttendX_Attendance_2026-11-24_to_2026-11-25.xlsx");
});

runTest("Filename reflects single date when all records share one date", () => {
  const singleDay = sampleRecords.slice(0, 3);
  const filename = generateExportFilename(singleDay, "csv");
  assert.equal(filename, "AttendX_Attendance_2026-11-24.csv");
});

console.log("\n--- GROUP 5: XLSX Generation & SheetJS Workbook Validation ---");

runTest("XLSX workbook creation, sheet naming, cell formatting, and autofilter", () => {
  const { rows } = prepareAttendanceExportData(sampleRecords);
  const header = ["Date", "Subject", "Attendance"];
  const sheetData = [header, ...rows.map((r) => [r.date, r.subject, r.attendance])];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = [{ wch: 16 }, { wch: 38 }, { wch: 16 }];
  ws["!views"] = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];
  ws["!freeze"] = { xSplit: "0", ySplit: "1" };
  ws["!autofilter"] = { ref: `A1:C${rows.length + 1}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  assert.ok(buffer.length > 0, "Buffer must not be empty");

  // Read back the written workbook to verify integrity
  const readBack = XLSX.read(buffer, { type: "buffer" });
  assert.deepEqual(readBack.SheetNames, ["Attendance"]);
  const readSheet = readBack.Sheets["Attendance"];

  // Verify headers
  assert.equal(readSheet["A1"]?.v, "Date");
  assert.equal(readSheet["B1"]?.v, "Subject");
  assert.equal(readSheet["C1"]?.v, "Attendance");

  // Verify first data row
  assert.equal(readSheet["A2"]?.v, "24 Nov 2026");
  assert.equal(readSheet["B2"]?.v, "Data Structures");
  assert.equal(readSheet["C2"]?.v, "Absent");

  // Verify last data row
  assert.equal(readSheet["A7"]?.v, "25 Nov 2026");
  assert.equal(readSheet["B7"]?.v, "Physics");
  assert.equal(readSheet["C7"]?.v, "Absent");

  // Verify autofilter and columns preserved
  assert.ok(readSheet["!autofilter"], "Autofilter must be defined");
  assert.equal(readSheet["!autofilter"].ref, "A1:C7");
});

console.log("\n--- GROUP 6: Edge Cases & Filtered Export ---");

runTest("Special characters in subject names preserve data integrity in XLSX and CSV", () => {
  const specialRecords = [
    {
      id: "sp-1",
      studentId: "stu-1",
      date: "2026-11-26",
      period: 1,
      subjectCode: "CSE-101",
      subjectName: 'Advanced C++ & Object-Oriented "Programming"',
      category: "Theory",
      batch: "P1",
      room: "TL-201",
      status: "PRESENT",
      markedAt: "2026-11-26T10:00:00Z",
      markedBy: "STUDENT",
    },
    {
      id: "sp-2",
      studentId: "stu-1",
      date: "2026-11-26",
      period: 2,
      subjectCode: "ME-102",
      subjectName: "Engineering Graphics & Design, Part I",
      category: "Theory",
      batch: "P1",
      room: "TL-202",
      status: "ABSENT",
      markedAt: "2026-11-26T11:00:00Z",
      markedBy: "STUDENT",
    },
  ];

  const { rows } = prepareAttendanceExportData(specialRecords);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].subject, 'Advanced C++ & Object-Oriented "Programming"');
  assert.equal(rows[0].attendance, "Present");
  assert.equal(rows[1].subject, "Engineering Graphics & Design, Part I");
  assert.equal(rows[1].attendance, "Absent");

  // CSV generation with quotes and commas
  const csvLine1 = `${escapeCSV(rows[0].date)},${escapeCSV(rows[0].subject)},${escapeCSV(rows[0].attendance)}`;
  assert.equal(
    csvLine1,
    '26 Nov 2026,"Advanced C++ & Object-Oriented ""Programming""",Present'
  );
  const csvLine2 = `${escapeCSV(rows[1].date)},${escapeCSV(rows[1].subject)},${escapeCSV(rows[1].attendance)}`;
  assert.equal(
    csvLine2,
    '26 Nov 2026,"Engineering Graphics & Design, Part I",Absent'
  );

  // XLSX generation with special characters
  const ws = XLSX.utils.aoa_to_sheet([
    ["Date", "Subject", "Attendance"],
    [rows[0].date, rows[0].subject, rows[0].attendance],
    [rows[1].date, rows[1].subject, rows[1].attendance],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  const readBack = XLSX.read(buffer, { type: "buffer" });
  const readSheet = readBack.Sheets["Attendance"];
  assert.equal(readSheet["B2"]?.v, 'Advanced C++ & Object-Oriented "Programming"');
  assert.equal(readSheet["B3"]?.v, "Engineering Graphics & Design, Part I");
});

runTest("Filtered export respects active subject filter without data leakage", () => {
  const mathOnly = sampleRecords.filter((r) => r.subjectCode === "BAS-201");
  const { rows } = prepareAttendanceExportData(mathOnly);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].date, "24 Nov 2026");
  assert.equal(rows[0].subject, "Mathematics II");
  assert.equal(rows[0].attendance, "Present");
  assert.equal(rows[1].date, "25 Nov 2026");
  assert.equal(rows[1].subject, "Mathematics II");
  assert.equal(rows[1].attendance, "Present");
});

console.log("\n=======================================================");
console.log(` Test Results: ${passed} Passed, ${failed} Failed`);
console.log("=======================================================");

if (failed > 0) process.exit(1);
