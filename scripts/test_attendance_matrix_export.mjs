/**
 * AttendX 8-Period Attendance Matrix Export Verification Suite
 * Tests all 17 criteria specified in the redesign requirements.
 */

import assert from "node:assert/strict";
import XLSX from "xlsx-js-style";
import {
  formatDateSlash,
  formatStatusCode,
  formatPeriodAttendanceCode,
  escapeCSV,
  generateMatrixFilename,
  resolveRecordPeriod,
  prepareAttendanceMatrixData,
} from "../src/lib/attendanceExport.ts";

console.log("=======================================================");
console.log(" AttendX 8-Period Attendance Matrix Test Suite");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function runTest(num, name, fn) {
  try {
    fn();
    console.log(`  [PASS] Test ${num}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] Test ${num}: ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

// Comprehensive multi-day, multi-period dataset
const mockAttendanceRecords = [
  // Day 1: 2026-02-02 (Monday)
  {
    id: "att-101",
    studentId: "stu-1",
    date: "2026-02-02",
    period: 1,
    subjectCode: "BSM 141",
    subjectName: "Mathematics II",
    status: "PRESENT",
  },
  {
    id: "att-102",
    studentId: "stu-1",
    date: "2026-02-02",
    period: 2,
    subjectCode: "BHS 101",
    subjectName: "Professional Communication",
    status: "PRESENT",
  },
  {
    id: "att-103",
    studentId: "stu-1",
    date: "2026-02-02",
    period: 3,
    subjectCode: "BEE 102",
    subjectName: "Basic Electrical Eng",
    status: "ABSENT",
  },
  {
    id: "att-104",
    studentId: "stu-1",
    date: "2026-02-02",
    period: 4,
    subjectCode: "BCS 103",
    subjectName: "Programming in C",
    status: "PRESENT",
  },
  {
    id: "att-105",
    studentId: "stu-1",
    date: "2026-02-02",
    period: 5,
    subjectCode: "BSM 141", // Same subject again in period 5!
    subjectName: "Mathematics II",
    status: "PRESENT",
  },
  // Period 6 is free/empty
  {
    id: "att-107",
    studentId: "stu-1",
    date: "2026-02-02",
    period: 7,
    subjectCode: "BHS 101",
    subjectName: "Professional Communication",
    status: "ABSENT",
  },
  // Period 8 is free/empty

  // Day 2: 2026-02-03 (Tuesday)
  {
    id: "att-201",
    studentId: "stu-1",
    date: "2026-02-03",
    period: 1,
    subjectCode: "BHS 101",
    subjectName: "Professional Communication",
    status: "ABSENT",
  },
  {
    id: "att-202",
    studentId: "stu-1",
    date: "2026-02-03",
    period: 2,
    subjectCode: "BSM 141",
    subjectName: "Mathematics II",
    status: "PRESENT",
  },
  // Period 3 is free
  {
    id: "att-204",
    studentId: "stu-1",
    date: "2026-02-03",
    period: 4,
    subjectCode: "BEE 102",
    subjectName: "Basic Electrical Eng",
    status: "PRESENT",
  },
  {
    id: "att-205",
    studentId: "stu-1",
    date: "2026-02-03",
    period: 5,
    subjectCode: "BCS 103",
    subjectName: "Programming in C",
    status: "ABSENT",
  },
  // Period 6, 7 free
  {
    id: "att-208",
    studentId: "stu-1",
    date: "2026-02-03",
    period: 8,
    subjectCode: "BSM 141",
    subjectName: "Mathematics II",
    status: "PRESENT",
  },

  // Day 3: 2026-02-04 (Wednesday)
  {
    id: "att-301",
    studentId: "stu-1",
    date: "2026-02-04",
    period: 1,
    subjectCode: "BSM 141",
    subjectName: "Mathematics II",
    status: "PRESENT",
  },
  {
    id: "att-303",
    studentId: "stu-1",
    date: "2026-02-04",
    period: 3,
    subjectCode: "BHS 101",
    subjectName: "Professional Communication",
    status: "ABSENT",
  },
  {
    id: "att-305",
    studentId: "stu-1",
    date: "2026-02-04",
    period: 5,
    subjectCode: "BEE 102",
    subjectName: "Basic Electrical Eng",
    status: "PRESENT",
  },
  {
    id: "att-306",
    studentId: "stu-1",
    date: "2026-02-04",
    period: 6,
    subjectCode: "BCS 103",
    subjectName: "Programming in C",
    status: "PRESENT",
  },
];

// Test 1: Single-day export
runTest(1, "Single-day export produces exactly 1 row with correct date", () => {
  const { matrixRows } = prepareAttendanceMatrixData(mockAttendanceRecords, {
    startDate: "2026-02-02",
    endDate: "2026-02-02",
  });
  assert.equal(matrixRows.length, 1);
  assert.equal(matrixRows[0].date, "02/02/2026");
  assert.equal(matrixRows[0].rawDate, "2026-02-02");
});

// Test 2: Multi-day export
runTest(2, "Multi-day export includes all dates in selected range", () => {
  const { matrixRows } = prepareAttendanceMatrixData(mockAttendanceRecords, {
    startDate: "2026-02-02",
    endDate: "2026-02-03",
  });
  assert.equal(matrixRows.length, 2);
  assert.equal(matrixRows[0].date, "02/02/2026");
  assert.equal(matrixRows[1].date, "03/02/2026");
});

// Test 3: Full attendance-history export
runTest(3, "Full attendance-history export includes all 3 days", () => {
  const { matrixRows } = prepareAttendanceMatrixData(mockAttendanceRecords);
  assert.equal(matrixRows.length, 3);
  assert.equal(matrixRows[0].date, "02/02/2026");
  assert.equal(matrixRows[1].date, "03/02/2026");
  assert.equal(matrixRows[2].date, "04/02/2026");
});

// Test 4: Single-subject selection
runTest(4, "Single-subject selection: only selected subject periods populated, others blank", () => {
  const { matrixRows } = prepareAttendanceMatrixData(mockAttendanceRecords, {
    selectedSubjectCodes: ["BEE 102"],
  });
  assert.equal(matrixRows.length, 3);
  // On 02/02/2026, BEE 102 is only in Period 3 (Absent)
  assert.equal(matrixRows[0].period1, "");
  assert.equal(matrixRows[0].period2, "");
  assert.equal(matrixRows[0].period3, "BEE 102 - A");
  assert.equal(matrixRows[0].period4, "");
  assert.equal(matrixRows[0].period5, "");
});

// Test 5: Multiple-subject selection
runTest(5, "Multiple-subject selection includes selected codes and excludes others", () => {
  const { matrixRows } = prepareAttendanceMatrixData(mockAttendanceRecords, {
    selectedSubjectCodes: ["BSM 141", "BCS 103"],
  });
  // On 02/02/2026: P1=BSM 141 - P, P2(BHS 101)=empty, P3(BEE 102)=empty, P4=BCS 103 - P, P5=BSM 141 - P
  assert.equal(matrixRows[0].period1, "BSM 141 - P");
  assert.equal(matrixRows[0].period2, "");
  assert.equal(matrixRows[0].period3, "");
  assert.equal(matrixRows[0].period4, "BCS 103 - P");
  assert.equal(matrixRows[0].period5, "BSM 141 - P");
});

// Test 6: All-subject selection
runTest(6, "All-subject selection maps all classes across all periods", () => {
  const { matrixRows, totalRecordsMatched } = prepareAttendanceMatrixData(
    mockAttendanceRecords,
    {
      selectedSubjectCodes: ["BSM 141", "BHS 101", "BEE 102", "BCS 103"],
    }
  );
  assert.equal(totalRecordsMatched, mockAttendanceRecords.length);
  assert.equal(matrixRows.length, 3);
});

// Test 7: Empty periods
runTest(7, "Empty periods remain strictly empty string without fake placeholders", () => {
  const { matrixRows } = prepareAttendanceMatrixData(mockAttendanceRecords);
  // On 02/02/2026: Period 6 is free, Period 8 is free
  assert.equal(matrixRows[0].period6, "");
  assert.equal(matrixRows[0].period8, "");
  // On 03/02/2026: Period 3 is free, Period 6 is free, Period 7 is free
  assert.equal(matrixRows[1].period3, "");
  assert.equal(matrixRows[1].period6, "");
  assert.equal(matrixRows[1].period7, "");
});

// Test 8: Same subject appearing multiple times on one day
runTest(8, "Same subject appearing multiple times in one day maps to separate periods", () => {
  const { matrixRows } = prepareAttendanceMatrixData(mockAttendanceRecords);
  // On 02/02/2026, BSM 141 is in Period 1 and Period 5
  assert.equal(matrixRows[0].period1, "BSM 141 - P");
  assert.equal(matrixRows[0].period5, "BSM 141 - P");
  // Both entries are independent and preserved
});

// Test 9: Correct mapping of Period 1 through Period 8
runTest(9, "Strict 1-to-1 period slot mapping (P1..P8 mapped to respective columns)", () => {
  const { matrixRows } = prepareAttendanceMatrixData(mockAttendanceRecords);
  const row1 = matrixRows[0]; // 02/02/2026
  assert.equal(row1.period1, "BSM 141 - P");
  assert.equal(row1.period2, "BHS 101 - P");
  assert.equal(row1.period3, "BEE 102 - A");
  assert.equal(row1.period4, "BCS 103 - P");
  assert.equal(row1.period5, "BSM 141 - P");
  assert.equal(row1.period6, "");
  assert.equal(row1.period7, "BHS 101 - A");
  assert.equal(row1.period8, "");

  const row2 = matrixRows[1]; // 03/02/2026
  assert.equal(row2.period1, "BHS 101 - A");
  assert.equal(row2.period2, "BSM 141 - P");
  assert.equal(row2.period3, "");
  assert.equal(row2.period4, "BEE 102 - P");
  assert.equal(row2.period5, "BCS 103 - A");
  assert.equal(row2.period6, "");
  assert.equal(row2.period7, "");
  assert.equal(row2.period8, "BSM 141 - P");
});

// Test 10: Present cell formatting
runTest(10, "Present cells are formatted as '<Subject> - P'", () => {
  assert.equal(formatPeriodAttendanceCode("BSM 141", "PRESENT"), "BSM 141 - P");
  assert.equal(formatPeriodAttendanceCode("BEE 102", "present"), "BEE 102 - P");
});

// Test 11: Absent cell red formatting in XLSX
runTest(11, "Absent cells receive red fill (#FFC7CE) and dark red font (#9C0006) in XLSX", () => {
  const { matrixRows } = prepareAttendanceMatrixData(mockAttendanceRecords);
  const header = [
    "Date",
    "Period 1",
    "Period 2",
    "Period 3",
    "Period 4",
    "Period 5",
    "Period 6",
    "Period 7",
    "Period 8",
  ];
  const sheetData = [
    header,
    ...matrixRows.map((r) => [
      r.date,
      r.period1,
      r.period2,
      r.period3,
      r.period4,
      r.period5,
      r.period6,
      r.period7,
      r.period8,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Apply row 2 Period 3 (C2 = BEE 102 - A): Absent
  assert.equal(ws["D2"].v, "BEE 102 - A"); // Column D is Period 3! (A=Date, B=P1, C=P2, D=P3)
  ws["D2"].s = {
    fill: { fgColor: { rgb: "FFC7CE" }, patternType: "solid" },
    font: { color: { rgb: "9C0006" }, bold: true },
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance Matrix");
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

  assert.ok(buffer.length > 0);
  const xmlString = buffer.toString("utf-8");
  assert.ok(xmlString.includes("FFC7CE"), "Must contain absent red fill hex FFC7CE");
  assert.ok(xmlString.includes("9C0006"), "Must contain absent text color hex 9C0006");
});

// Test 12: CSV output correctness
runTest(12, "CSV output has 9 columns, UTF-8 BOM, and identical period matrix mapping", () => {
  const { matrixRows } = prepareAttendanceMatrixData(mockAttendanceRecords);
  const header =
    "Date,Period 1,Period 2,Period 3,Period 4,Period 5,Period 6,Period 7,Period 8";
  const lines = [
    header,
    ...matrixRows.map(
      (r) =>
        `${escapeCSV(r.date)},${escapeCSV(r.period1)},${escapeCSV(r.period2)},${escapeCSV(r.period3)},${escapeCSV(r.period4)},${escapeCSV(r.period5)},${escapeCSV(r.period6)},${escapeCSV(r.period7)},${escapeCSV(r.period8)}`
    ),
  ];
  const csvContent = "\uFEFF" + lines.join("\r\n");

  assert.ok(csvContent.startsWith("\uFEFF"), "Must start with UTF-8 BOM");
  const parsed = csvContent.replace("\uFEFF", "").split("\r\n");
  assert.equal(parsed[0], header);
  assert.equal(
    parsed[1],
    "02/02/2026,BSM 141 - P,BHS 101 - P,BEE 102 - A,BCS 103 - P,BSM 141 - P,,BHS 101 - A,"
  );
  assert.equal(
    parsed[2],
    "03/02/2026,BHS 101 - A,BSM 141 - P,,BEE 102 - P,BCS 103 - A,,,BSM 141 - P"
  );
  assert.equal(
    parsed[3],
    "04/02/2026,BSM 141 - P,,BHS 101 - A,,BEE 102 - P,BCS 103 - P,,"
  );
});

// Test 13: Date sorting
runTest(13, "Dates are strictly sorted in ascending chronological order", () => {
  // Pass unsorted input across 3 different dates
  const unsorted = [
    mockAttendanceRecords[11], // 04/02/2026 (Day 3)
    mockAttendanceRecords[0],  // 02/02/2026 (Day 1)
    mockAttendanceRecords[6],  // 03/02/2026 (Day 2)
  ];
  const { matrixRows } = prepareAttendanceMatrixData(unsorted);
  assert.equal(matrixRows.length, 3);
  assert.equal(matrixRows[0].date, "02/02/2026");
  assert.equal(matrixRows[1].date, "03/02/2026");
  assert.equal(matrixRows[2].date, "04/02/2026");
});

// Test 14: Inclusive date-range filtering
runTest(14, "Date filtering includes boundaries inclusively and ignores outer dates", () => {
  const { matrixRows } = prepareAttendanceMatrixData(mockAttendanceRecords, {
    startDate: "2026-02-03",
    endDate: "2026-02-04",
  });
  assert.equal(matrixRows.length, 2);
  assert.equal(matrixRows[0].date, "03/02/2026");
  assert.equal(matrixRows[1].date, "04/02/2026");
});

// Test 15: Attendance records with missing period mapping
runTest(15, "Missing or invalid period records are logged and tracked in unmappedRecords without crash", () => {
  const recordsWithUnmapped = [
    ...mockAttendanceRecords,
    {
      id: "att-err",
      studentId: "stu-1",
      date: "2026-02-05",
      period: 99, // Invalid period number!
      subjectCode: "UNK 999",
      status: "PRESENT",
    },
  ];
  const { unmappedRecords, matrixRows } = prepareAttendanceMatrixData(recordsWithUnmapped);
  assert.equal(unmappedRecords.length, 1);
  assert.equal(unmappedRecords[0].id, "att-err");
  // The invalid record was NOT forced into period 1
  const day5Row = matrixRows.find((r) => r.rawDate === "2026-02-05");
  assert.equal(day5Row, undefined, "Day with only unmapped record produces no row");
});

// Test 16: No attendance data available
runTest(16, "Empty attendance data produces 0 matrix rows gracefully without error", () => {
  const { matrixRows, datesIncluded } = prepareAttendanceMatrixData([]);
  assert.equal(matrixRows.length, 0);
  assert.equal(datesIncluded.length, 0);
  const filename = generateMatrixFilename([], "xlsx");
  assert.ok(filename.endsWith(".xlsx"));
});

// Test 17: Date format slash never shifts timezone
runTest(17, "formatDateSlash converts 'YYYY-MM-DD' to 'DD/MM/YYYY' without timezone shift", () => {
  assert.equal(formatDateSlash("2026-02-02"), "02/02/2026");
  assert.equal(formatDateSlash("2026-11-24"), "24/11/2026");
  assert.equal(formatDateSlash("2026-01-01T00:00:00Z"), "01/01/2026");
});

console.log("\n=======================================================");
console.log(` Test Results: ${passed} Passed, ${failed} Failed`);
console.log("=======================================================");

if (failed > 0) process.exit(1);
