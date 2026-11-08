import { calculateMetrics, calculateSubjectAttendance, simulateAttendance } from "../src/lib/attendanceCalculator";
import { UNIVERSITY_DATABASE } from "../src/data/extractedTimetables";
import { AttendanceRecord } from "../src/types";

function runTests() {
  console.log("=== AttendX Calculation & Timetable Validation Test Suite ===\n");
  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${details ? "- " + details : ""}`);
    }
  }

  // 1. Check IT Section B exists and has correct batches
  const itSecB = UNIVERSITY_DATABASE.timetables.find((t) => t.id === "mmmut-btech-it-b-2025");
  assert("Scenario 1 & 2: IT Section B Timetable exists", !!itSecB);
  assert("Scenario 1 & 2: IT Section B has P1 and P2 batches", Boolean(itSecB?.batches.includes("P1") && itSecB?.batches.includes("P2")));

  // Check P1 specific slots
  const p1Slots = itSecB?.slots.filter((s) => s.batch === "P1" || s.batch === "ALL");
  const p2Slots = itSecB?.slots.filter((s) => s.batch === "P2" || s.batch === "ALL");
  assert("Scenario 1: P1 receives P1 & ALL slots", (p1Slots?.length || 0) > 0);
  assert("Scenario 2: P2 receives P2 & ALL slots", (p2Slots?.length || 0) > 0);

  // Check Wednesday 5th period: P1 has BIT-104 Lab, P2 has BIT-103 Lab
  const wedP1 = itSecB?.slots.find((s) => s.day === "Wednesday" && s.period === 5 && s.batch === "P1");
  const wedP2 = itSecB?.slots.find((s) => s.day === "Wednesday" && s.period === 5 && s.batch === "P2");
  assert("Scenario 3: Batch separation (P1 has BIT-104 Lab, P2 has BIT-103 Lab on Wed P5)",
    wedP1?.subjectCode === "BIT-104" && wedP2?.subjectCode === "BIT-103"
  );

  // 4. Blank timetable cells generate no classes
  const nonExistentSlot = itSecB?.slots.find((s) => s.day === "Friday" && s.period === 5);
  assert("Scenario 4: Blank cells have no timetable slot", nonExistentSlot === undefined);

  // 5. Lunch breaks (period 0) generate no classes
  const lunchSlot = itSecB?.slots.find((s) => s.period === 0);
  assert("Scenario 5: Lunch breaks generate no classes", lunchSlot === undefined);

  // 6. A four-period lab generates four attendance units
  // In IT Sec B Wednesday PM: BIT-104 Lab is scheduled for periods 5, 6, 7, 8 (4 individual periods)
  const wedBit104 = itSecB?.slots.filter((s) => s.day === "Wednesday" && s.subjectCode === "BIT-104");
  assert("Scenario 6: 4-period lab generates 4 individual slot units", wedBit104?.length === 4);

  // 7. Theory and Lab percentages calculated independently
  const mockRecords: AttendanceRecord[] = [
    // Theory: 3 attended, 4 conducted (75%)
    { id: "1", studentId: "s1", date: "2026-11-01", period: 1, subjectCode: "BIT-103", subjectName: "Programming in C", category: "Theory", batch: "ALL", room: "TL-203", status: "PRESENT", markedAt: "", markedBy: "STUDENT" },
    { id: "2", studentId: "s1", date: "2026-11-02", period: 1, subjectCode: "BIT-103", subjectName: "Programming in C", category: "Theory", batch: "ALL", room: "TL-203", status: "PRESENT", markedAt: "", markedBy: "STUDENT" },
    { id: "3", studentId: "s1", date: "2026-11-03", period: 1, subjectCode: "BIT-103", subjectName: "Programming in C", category: "Theory", batch: "ALL", room: "TL-203", status: "PRESENT", markedAt: "", markedBy: "STUDENT" },
    { id: "4", studentId: "s1", date: "2026-11-04", period: 1, subjectCode: "BIT-103", subjectName: "Programming in C", category: "Theory", batch: "ALL", room: "TL-203", status: "ABSENT", markedAt: "", markedBy: "STUDENT" },

    // Lab: 4-period lab, attended 3, absent 1 (75%)
    { id: "5", studentId: "s1", date: "2026-11-05", period: 5, subjectCode: "BIT-103", subjectName: "Programming in C", category: "Lab", batch: "P2", room: "CL-02", status: "PRESENT", markedAt: "", markedBy: "STUDENT" },
    { id: "6", studentId: "s1", date: "2026-11-05", period: 6, subjectCode: "BIT-103", subjectName: "Programming in C", category: "Lab", batch: "P2", room: "CL-02", status: "PRESENT", markedAt: "", markedBy: "STUDENT" },
    { id: "7", studentId: "s1", date: "2026-11-05", period: 7, subjectCode: "BIT-103", subjectName: "Programming in C", category: "Lab", batch: "P2", room: "CL-02", status: "PRESENT", markedAt: "", markedBy: "STUDENT" },
    { id: "8", studentId: "s1", date: "2026-11-05", period: 8, subjectCode: "BIT-103", subjectName: "Programming in C", category: "Lab", batch: "P2", room: "CL-02", status: "ABSENT", markedAt: "", markedBy: "STUDENT" },

    // Cancelled class (should be excluded!)
    { id: "9", studentId: "s1", date: "2026-11-06", period: 1, subjectCode: "BIT-103", subjectName: "Programming in C", category: "Theory", batch: "ALL", room: "TL-203", status: "CANCELLED", markedAt: "", markedBy: "STUDENT" },
  ];

  const subSummary = calculateSubjectAttendance("BIT-103", "Programming in C", mockRecords, 75);
  assert("Scenario 7: Theory attendance calculated independently (3/4 = 75%)", subSummary.theory.attended === 3 && subSummary.theory.conducted === 4 && subSummary.theory.percentage === 75);
  assert("Scenario 7: Lab attendance calculated independently (3/4 = 75%)", subSummary.lab.attended === 3 && subSummary.lab.conducted === 4 && subSummary.lab.percentage === 75);

  // 8. Combined attendance: total attended (6) / total conducted (8) = 75%
  assert("Scenario 8: Combined subject attendance uses weighted attendance units (6/8 = 75%)", subSummary.combined.attended === 6 && subSummary.combined.conducted === 8 && subSummary.combined.percentage === 75);

  // 9. Cancelled classes excluded: total records = 9, but conducted = 8
  assert("Scenario 9: Cancelled classes excluded from conducted denominator", subSummary.combined.conducted === 8);

  // 10. Absent classes count in denominator: attended = 6, absent = 2, conducted = 8
  assert("Scenario 10: Absent classes remain in the denominator", subSummary.combined.conducted === 8 && subSummary.combined.attended === 6);

  // 15. Zero conducted periods do not cause division by zero / NaN
  const zeroMetrics = calculateMetrics([], 75);
  assert("Scenario 15: Zero conducted periods returns 100% without NaN or error", zeroMetrics.percentage === 100 && !isNaN(zeroMetrics.percentage) && zeroMetrics.conducted === 0);

  // Safe absence math: Attended 30, Conducted 40 (75%) -> Safe absences should be 0!
  const safeRecords: AttendanceRecord[] = [];
  for (let i = 0; i < 30; i++) {
    safeRecords.push({ id: `p${i}`, studentId: "s", date: "2026-11-01", period: 1, subjectCode: "X", subjectName: "X", category: "Theory", batch: "ALL", room: "", status: "PRESENT", markedAt: "", markedBy: "STUDENT" });
  }
  for (let i = 0; i < 10; i++) {
    safeRecords.push({ id: `a${i}`, studentId: "s", date: "2026-11-01", period: 2, subjectCode: "X", subjectName: "X", category: "Theory", batch: "ALL", room: "", status: "ABSENT", markedAt: "", markedBy: "STUDENT" });
  }
  const exact75 = calculateMetrics(safeRecords, 75);
  assert("Math Check: Safe absences at exact 75% (30/40) is 0", exact75.safeAbsences === 0);

  // Attended 31, Conducted 40 (77.5%) -> Safe absences = floor((31 - 0.75*40)/0.75) = floor(1 / 0.75) = 1
  safeRecords.push({ id: "p30", studentId: "s", date: "2026-11-01", period: 3, subjectCode: "X", subjectName: "X", category: "Theory", batch: "ALL", room: "", status: "PRESENT", markedAt: "", markedBy: "STUDENT" });
  const above75 = calculateMetrics(safeRecords, 75);
  assert("Math Check: Safe absences at 31/41 (75.6%) is 0", above75.safeAbsences === 0);

  console.log(`\nResults: ${passed} / ${total} tests PASSED.`);
}

runTests();
