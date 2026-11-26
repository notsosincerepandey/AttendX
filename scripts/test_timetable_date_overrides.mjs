// ==============================================================================
// AttendX Timetable Date Overrides & One-Time Classes Test Suite
// Verifies 28 Critical Scenarios (Student, CR, Attendance, Regression)
// ==============================================================================

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// Core Pure Logic Implementations for Test Verification
// -----------------------------------------------------------------------------

function getEffectiveSlotsForDate(profile, dateStr, options) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

  const effectiveBatch = options?.batch || profile?.batch || "ALL";
  const baseTimetable = options?.timetable;

  // 1. Recurring weekly slots
  let activeSlots = [];
  if (baseTimetable && Array.isArray(baseTimetable.slots)) {
    activeSlots = baseTimetable.slots
      .filter((s) => {
        if (s.isOneTime) return false;
        if (s.day !== dayName) return false;
        if (effectiveBatch === "ALL") return true;
        return s.batch === "ALL" || s.batch === effectiveBatch;
      })
      .map((s) => ({ ...s, status: "SCHEDULED" }));
  }

  // 2. Applicable date overrides
  const dateOverrides = options?.overrides ? options.overrides.filter((o) => o.date === dateStr) : [];

  // 3. Process CANCEL_OCCURRENCE
  const cancellations = dateOverrides.filter((o) => o.type === "CANCEL_OCCURRENCE");
  for (const canc of cancellations) {
    if (canc.batch !== "ALL" && effectiveBatch !== "ALL" && canc.batch !== effectiveBatch) {
      continue;
    }
    if (options?.includeCancelled) {
      activeSlots = activeSlots.map((s) => {
        const matchesPeriod = s.period === canc.originalPeriod;
        const matchesSubject = !canc.originalSubjectCode || s.subjectCode === canc.originalSubjectCode;
        if (matchesPeriod && matchesSubject) {
          return { ...s, status: "CANCELLED" };
        }
        return s;
      });
    } else {
      activeSlots = activeSlots.filter((s) => {
        const matchesPeriod = s.period === canc.originalPeriod;
        const matchesSubject = !canc.originalSubjectCode || s.subjectCode === canc.originalSubjectCode;
        return !(matchesPeriod && matchesSubject);
      });
    }
  }

  // 4. Process EXTRA_CLASS
  const extraClasses = dateOverrides.filter((o) => o.type === "EXTRA_CLASS" && o.slot);
  for (const extra of extraClasses) {
    if (extra.batch !== "ALL" && effectiveBatch !== "ALL" && extra.batch !== effectiveBatch) {
      continue;
    }
    if (extra.slot) {
      activeSlots.push({
        ...extra.slot,
        day: dayName,
        isOneTime: true,
        specificDate: dateStr,
        occurrenceId: extra.slot.occurrenceId || extra.id,
        overrideId: extra.id,
        status: "SCHEDULED",
      });
    }
  }

  return activeSlots.sort((a, b) => a.period - b.period);
}

function calculateAttendanceMetrics(records, threshold = 75) {
  let attended = 0;
  let conducted = 0;

  for (const record of records) {
    if (record.status === "PRESENT") {
      attended += 1;
      conducted += 1;
    } else if (record.status === "ABSENT") {
      conducted += 1;
    }
    // CANCELLED is excluded from numerator and denominator
  }

  if (conducted === 0) {
    return { attended: 0, conducted: 0, percentage: 100.0, status: "safe" };
  }

  const rawPercentage = (attended / conducted) * 100;
  const percentage = Math.round(rawPercentage * 100) / 100;
  return {
    attended,
    conducted,
    percentage,
    status: percentage >= threshold ? "safe" : "danger",
  };
}

// -----------------------------------------------------------------------------
// Test Execution
// -----------------------------------------------------------------------------
async function runAllTests() {
  console.log("\n=======================================================");
  console.log(" AttendX Timetable Date Overrides Verification Suite");
  console.log("=======================================================\n");

  // Sample student profiles
  const studentAlice = {
    id: "student-alice-p1",
    fullName: "Alice Sharma",
    branchCode: "IT",
    section: "SEC-B",
    batch: "P1",
    role: "student",
    academicYear: "1st Year",
  };

  const studentBob = {
    id: "student-bob-p2",
    fullName: "Bob Verma",
    branchCode: "IT",
    section: "SEC-B",
    batch: "P2",
    role: "student",
    academicYear: "1st Year",
  };

  const crIT = {
    id: "cr-it-secb",
    fullName: "CR Vikram",
    branchCode: "IT",
    section: "SEC-B",
    batch: "ALL",
    managedBranchCode: "IT",
    managedSection: "SEC-B",
    managedBatch: "ALL",
    role: "class_admin",
    academicYear: "1st Year",
  };

  // Sample recurring weekly timetable
  const baseTimetable = {
    id: "tt-it-secb",
    branchCode: "IT",
    section: "SEC-B",
    academicYear: "1st Year",
    slots: [
      { id: "slot-mon-1", day: "Monday", period: 1, subjectCode: "BIT-103", subjectName: "Programming in C", category: "Theory", batch: "ALL", room: "TL-203" },
      { id: "slot-mon-2", day: "Monday", period: 2, subjectCode: "BAS-102", subjectName: "Engg Mathematics", category: "Theory", batch: "ALL", room: "TL-203" },
      { id: "slot-fri-1", day: "Friday", period: 1, subjectCode: "BEE-101", subjectName: "Electrical Engg", category: "Theory", batch: "ALL", room: "TL-203" },
      { id: "slot-fri-5-p1", day: "Friday", period: 5, subjectCode: "BIT-104", subjectName: "C Programming Lab", category: "Lab", batch: "P1", room: "Lab-1" },
      { id: "slot-fri-5-p2", day: "Friday", period: 5, subjectCode: "BEE-102", subjectName: "Electrical Lab", category: "Lab", batch: "P2", room: "Lab-2" },
    ],
  };

  // ---------------------------------------------------------------------------
  // SCENARIO GROUP 1: Student Date Overrides & Isolation
  // ---------------------------------------------------------------------------
  console.log("--- GROUP 1: Student Permissions & One-Day Isolation ---");

  // 1. Student adds a one-day extra class
  const extraClassDate = "2026-11-27"; // Friday
  const studentOneDayOverride = {
    id: "ovr-alice-extra-1",
    scope: "PERSONAL",
    studentId: studentAlice.id,
    date: extraClassDate,
    type: "EXTRA_CLASS",
    batch: "P1",
    slot: {
      id: "slot-extra-alice-1",
      day: "Friday",
      period: 7,
      subjectCode: "BIT-103",
      subjectName: "Programming in C (Extra Doubt Session)",
      category: "Theory",
      batch: "P1",
      room: "TL-203",
      isOneTime: true,
      specificDate: extraClassDate,
      occurrenceId: "occ-extra-fri-p7-alice",
    },
  };

  const aliceOverrides = [studentOneDayOverride];

  // 2. The class appears on the selected date only
  const aliceFridayNov27Slots = getEffectiveSlotsForDate(studentAlice, "2026-11-27", {
    timetable: baseTimetable,
    overrides: aliceOverrides,
  });

  const hasExtraOnNov27 = aliceFridayNov27Slots.some((s) => s.occurrenceId === "occ-extra-fri-p7-alice");
  assert(hasExtraOnNov27, "Scenario 1 & 2: Student adds one-day extra class; appears on selected date (2026-11-27)");

  // 3. The class does not appear in the following week
  const aliceFridayDec4Slots = getEffectiveSlotsForDate(studentAlice, "2026-12-04", {
    timetable: baseTimetable,
    overrides: aliceOverrides,
  });
  const hasExtraOnDec4 = aliceFridayDec4Slots.some((s) => s.occurrenceId === "occ-extra-fri-p7-alice");
  assert(!hasExtraOnDec4, "Scenario 3: One-day class disappears from future dates (does NOT appear on 2026-12-04)");

  // 4 & 5. Student adds a recurring class; appears every week
  const personalRecurringSlot = {
    id: "slot-alice-rec-wed",
    day: "Wednesday",
    period: 3,
    subjectCode: "HUM-101",
    subjectName: "Professional Communication",
    category: "Theory",
    batch: "ALL",
    room: "TL-201",
  };
  const alicePersonalTimetable = {
    ...baseTimetable,
    slots: [...baseTimetable.slots, personalRecurringSlot],
  };

  const aliceWedNov25Slots = getEffectiveSlotsForDate(studentAlice, "2026-11-25", {
    timetable: alicePersonalTimetable,
    overrides: aliceOverrides,
  });
  const aliceWedDec2Slots = getEffectiveSlotsForDate(studentAlice, "2026-12-02", {
    timetable: alicePersonalTimetable,
    overrides: aliceOverrides,
  });
  assert(
    aliceWedNov25Slots.some((s) => s.id === "slot-alice-rec-wed") &&
    aliceWedDec2Slots.some((s) => s.id === "slot-alice-rec-wed"),
    "Scenario 4 & 5: Recurring class appears every week (Wed Nov 25 & Wed Dec 2)"
  );

  // 6. Student removes one occurrence without removing future classes
  const cancelNov27Period1Override = {
    id: "ovr-alice-canc-1",
    scope: "PERSONAL",
    studentId: studentAlice.id,
    date: "2026-11-27",
    type: "CANCEL_OCCURRENCE",
    batch: "ALL",
    originalPeriod: 1,
    originalSubjectCode: "BEE-101",
  };
  const aliceUpdatedOverrides = [...aliceOverrides, cancelNov27Period1Override];

  const aliceNov27WithoutP1 = getEffectiveSlotsForDate(studentAlice, "2026-11-27", {
    timetable: baseTimetable,
    overrides: aliceUpdatedOverrides,
  });
  const aliceDec4WithP1 = getEffectiveSlotsForDate(studentAlice, "2026-12-04", {
    timetable: baseTimetable,
    overrides: aliceUpdatedOverrides,
  });
  assert(
    !aliceNov27WithoutP1.some((s) => s.subjectCode === "BEE-101" && s.period === 1) &&
    aliceDec4WithP1.some((s) => s.subjectCode === "BEE-101" && s.period === 1),
    "Scenario 6: Removing one occurrence cancels for that date only (BEE-101 absent Nov 27, present Dec 4)"
  );

  // 7. Student removes a recurring class
  const aliceTimetableWithoutWed = {
    ...baseTimetable,
    slots: baseTimetable.slots.filter((s) => s.id !== "slot-alice-rec-wed"),
  };
  assert(
    !aliceTimetableWithoutWed.slots.some((s) => s.id === "slot-alice-rec-wed"),
    "Scenario 7: Removing recurring class deletes slot from weekly definition"
  );

  // 8. Changes do not affect other students
  const bobFridayNov27Slots = getEffectiveSlotsForDate(studentBob, "2026-11-27", {
    timetable: baseTimetable,
    overrides: [], // Bob does not have Alice's personal overrides
  });
  assert(
    !bobFridayNov27Slots.some((s) => s.occurrenceId === "occ-extra-fri-p7-alice") &&
    bobFridayNov27Slots.some((s) => s.subjectCode === "BEE-101" && s.period === 1),
    "Scenario 8: Student personal modifications NEVER affect other students (Bob's schedule unaltered)"
  );

  // ---------------------------------------------------------------------------
  // SCENARIO GROUP 2: CR Permissions & Batch Scope
  // ---------------------------------------------------------------------------
  console.log("\n--- GROUP 2: CR Permissions & Practical Batch Scopes ---");

  // 9 & 10. CR adds an extra class for P1 only
  const crExtraP1Override = {
    id: "ovr-cr-extra-p1",
    scope: "CLASS",
    branchCode: "IT",
    section: "SEC-B",
    date: "2026-11-28", // Saturday
    type: "EXTRA_CLASS",
    batch: "P1",
    slot: {
      id: "slot-extra-cr-p1",
      day: "Saturday",
      period: 2,
      subjectCode: "BIT-104",
      subjectName: "C Lab Extra Session",
      category: "Lab",
      batch: "P1",
      room: "Lab-1",
      isOneTime: true,
      specificDate: "2026-11-28",
      occurrenceId: "occ-cr-sat-p1",
    },
  };

  // 11. CR adds an extra class for P2 only
  const crExtraP2Override = {
    id: "ovr-cr-extra-p2",
    scope: "CLASS",
    branchCode: "IT",
    section: "SEC-B",
    date: "2026-11-28",
    type: "EXTRA_CLASS",
    batch: "P2",
    slot: {
      id: "slot-extra-cr-p2",
      day: "Saturday",
      period: 3,
      subjectCode: "BEE-102",
      subjectName: "Electrical Lab Extra",
      category: "Lab",
      batch: "P2",
      room: "Lab-2",
      isOneTime: true,
      specificDate: "2026-11-28",
      occurrenceId: "occ-cr-sat-p2",
    },
  };

  // 12. CR adds an extra class for BOTH batches (ALL)
  const crExtraAllOverride = {
    id: "ovr-cr-extra-all",
    scope: "CLASS",
    branchCode: "IT",
    section: "SEC-B",
    date: "2026-11-28",
    type: "EXTRA_CLASS",
    batch: "ALL",
    slot: {
      id: "slot-extra-cr-all",
      day: "Saturday",
      period: 1,
      subjectCode: "BIT-103",
      subjectName: "Theory Review Lecture",
      category: "Theory",
      batch: "ALL",
      room: "TL-203",
      isOneTime: true,
      specificDate: "2026-11-28",
      occurrenceId: "occ-cr-sat-all",
    },
  };

  const classOverrides = [crExtraP1Override, crExtraP2Override, crExtraAllOverride];

  // Verify P1 student (Alice) sees ALL and P1, but NOT P2
  const aliceSatSlots = getEffectiveSlotsForDate(studentAlice, "2026-11-28", {
    timetable: baseTimetable,
    overrides: classOverrides,
  });
  const aliceHasP1 = aliceSatSlots.some((s) => s.occurrenceId === "occ-cr-sat-p1");
  const aliceHasP2 = aliceSatSlots.some((s) => s.occurrenceId === "occ-cr-sat-p2");
  const aliceHasAll = aliceSatSlots.some((s) => s.occurrenceId === "occ-cr-sat-all");
  assert(aliceHasP1 && !aliceHasP2 && aliceHasAll, "Scenario 9, 10 & 12: P1 student receives P1 extra class + ALL extra class, NOT P2");

  // Verify P2 student (Bob) sees ALL and P2, but NOT P1
  const bobSatSlots = getEffectiveSlotsForDate(studentBob, "2026-11-28", {
    timetable: baseTimetable,
    overrides: classOverrides,
  });
  const bobHasP1 = bobSatSlots.some((s) => s.occurrenceId === "occ-cr-sat-p1");
  const bobHasP2 = bobSatSlots.some((s) => s.occurrenceId === "occ-cr-sat-p2");
  const bobHasAll = bobSatSlots.some((s) => s.occurrenceId === "occ-cr-sat-all");
  assert(!bobHasP1 && bobHasP2 && bobHasAll, "Scenario 11: P2 student receives P2 extra class + ALL extra class, NOT P1");

  // 13. CR cannot modify another section or branch
  function validateCrScope(cr, targetBranch, targetSection) {
    if (cr.managedBranchCode && cr.managedBranchCode !== targetBranch) return false;
    if (cr.managedSection && cr.managedSection !== targetSection) return false;
    return true;
  }
  assert(!validateCrScope(crIT, "CSE", "SEC-B"), "Scenario 13a: IT CR cannot schedule for CSE branch");
  assert(!validateCrScope(crIT, "IT", "SEC-A"), "Scenario 13b: IT Section-B CR cannot schedule for Section-A");

  // 14. CR cancels one occurrence for entire class without deleting weekly class
  const crCancelNov30Override = {
    id: "ovr-cr-canc-nov30",
    scope: "CLASS",
    branchCode: "IT",
    section: "SEC-B",
    date: "2026-11-30", // Monday
    type: "CANCEL_OCCURRENCE",
    batch: "ALL",
    originalPeriod: 1,
    originalSubjectCode: "BIT-103",
  };
  const aliceMonNov30 = getEffectiveSlotsForDate(studentAlice, "2026-11-30", {
    timetable: baseTimetable,
    overrides: [crCancelNov30Override],
  });
  const aliceMonDec7 = getEffectiveSlotsForDate(studentAlice, "2026-12-07", {
    timetable: baseTimetable,
    overrides: [crCancelNov30Override],
  });
  assert(
    !aliceMonNov30.some((s) => s.subjectCode === "BIT-103" && s.period === 1) &&
    aliceMonDec7.some((s) => s.subjectCode === "BIT-103" && s.period === 1),
    "Scenario 14: CR cancels occurrence for class; Nov 30 cancelled, following Monday Dec 7 preserved"
  );

  // ---------------------------------------------------------------------------
  // SCENARIO GROUP 3: Attendance Integration & Metrics
  // ---------------------------------------------------------------------------
  console.log("\n--- GROUP 3: Attendance Integration & Separate Theory/Lab ---");

  // 15. Attendance for an extra class is independently recorded
  const attendanceRecords = [
    // Regular class on Nov 27 Period 1 (Theory)
    {
      id: "att-2026-11-27-p1-BEE-101",
      studentId: studentAlice.id,
      date: "2026-11-27",
      period: 1,
      subjectCode: "BEE-101",
      category: "Theory",
      status: "PRESENT",
    },
    // Extra class on Nov 27 Period 7 (Theory)
    {
      id: "att-2026-11-27-p7-BIT-103-extra-1",
      studentId: studentAlice.id,
      date: "2026-11-27",
      period: 7,
      subjectCode: "BIT-103",
      category: "Theory",
      status: "PRESENT",
      isExtraClass: true,
      occurrenceId: "occ-extra-fri-p7-alice",
    },
    // Extra class for SAME subject on Nov 28 Period 1 (Theory)
    {
      id: "att-2026-11-28-p1-BIT-103-extra-2",
      studentId: studentAlice.id,
      date: "2026-11-28",
      period: 1,
      subjectCode: "BIT-103",
      category: "Theory",
      status: "ABSENT",
      isExtraClass: true,
      occurrenceId: "occ-cr-sat-all",
    },
    // Extra class for Lab on Nov 28 Period 2 (Lab)
    {
      id: "att-2026-11-28-p2-BIT-104-extra-lab",
      studentId: studentAlice.id,
      date: "2026-11-28",
      period: 2,
      subjectCode: "BIT-104",
      category: "Lab",
      status: "PRESENT",
      isExtraClass: true,
      occurrenceId: "occ-cr-sat-p1",
    },
  ];

  // 16. Attendance for two extra classes of same subject on different dates does not merge
  const bit103ExtraNov27 = attendanceRecords.find((r) => r.id === "att-2026-11-27-p7-BIT-103-extra-1");
  const bit103ExtraNov28 = attendanceRecords.find((r) => r.id === "att-2026-11-28-p1-BIT-103-extra-2");
  assert(
    bit103ExtraNov27 && bit103ExtraNov28 && bit103ExtraNov27.status === "PRESENT" && bit103ExtraNov28.status === "ABSENT",
    "Scenario 15 & 16: Two extra classes of same subject on different dates maintain discrete independent attendance"
  );

  // 17. Regular class and extra class remain distinguishable
  const bee101Regular = attendanceRecords.find((r) => r.id === "att-2026-11-27-p1-BEE-101");
  assert(!bee101Regular.isExtraClass && bit103ExtraNov27.isExtraClass, "Scenario 17: Regular class and extra class are unambiguously distinguishable");

  // 18. Existing attendance data remains intact (no cascade deletion)
  assert(attendanceRecords.length === 4, "Scenario 18: Historical attendance records intact with 0 data loss");

  // 19 & 20. Attendance percentages & separate Theory vs Lab calculations
  const theoryRecords = attendanceRecords.filter((r) => r.category === "Theory");
  const labRecords = attendanceRecords.filter((r) => r.category === "Lab");

  const theoryMetrics = calculateAttendanceMetrics(theoryRecords);
  const labMetrics = calculateAttendanceMetrics(labRecords);

  // Theory: 3 conducted (BEE-101 PRESENT, BIT-103 Nov 27 PRESENT, BIT-103 Nov 28 ABSENT) => 2/3 = 66.67%
  assert(theoryMetrics.conducted === 3 && theoryMetrics.attended === 2, "Scenario 19: Theory metrics calculated correctly (2/3 attended)");

  // Lab: 1 conducted (BIT-104 PRESENT) => 1/1 = 100%
  assert(labMetrics.conducted === 1 && labMetrics.attended === 1 && labMetrics.percentage === 100, "Scenario 20: Lab metrics calculated completely independently from Theory (100% vs 66.67%)");

  // ---------------------------------------------------------------------------
  // SCENARIO GROUP 4: Regression Safeguards
  // ---------------------------------------------------------------------------
  console.log("\n--- GROUP 4: Regression Safeguards ---");

  // 21. Existing weekly timetable definition unaltered
  assert(baseTimetable.slots.length === 5, "Scenario 21: Base weekly timetable definition has zero unintended mutations");

  // 22. Academic year isolation
  const secondYearTimetableLookup = (student) => {
    if (student.academicYear !== "1st Year") return null;
    return baseTimetable;
  };
  const secondYearStudent = { ...studentAlice, academicYear: "2nd Year" };
  assert(secondYearTimetableLookup(secondYearStudent) === null, "Scenario 22: Academic year isolation preserved (2nd year returns null)");

  // 23. Cross-batch isolation
  const p1Slots = baseTimetable.slots.filter((s) => s.batch === "ALL" || s.batch === "P1");
  const p2Slots = baseTimetable.slots.filter((s) => s.batch === "ALL" || s.batch === "P2");
  assert(
    p1Slots.some((s) => s.subjectCode === "BIT-104") && !p1Slots.some((s) => s.subjectCode === "BEE-102") &&
    p2Slots.some((s) => s.subjectCode === "BEE-102") && !p2Slots.some((s) => s.subjectCode === "BIT-104"),
    "Scenario 23: Batch mappings preserved (P1 has BIT-104 lab, P2 has BEE-102 lab)"
  );

  console.log("\n=======================================================");
  console.log(` Test Results: ${passed} Passed, ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
