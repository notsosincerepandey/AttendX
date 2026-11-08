import { AttendanceRecord, AttendanceMetrics, SubjectAttendanceSummary, DashboardStats } from "@/types";

export function calculateMetrics(
  records: AttendanceRecord[],
  threshold = 75
): AttendanceMetrics {
  // Only evaluate PRESENT and ABSENT; CANCELLED is excluded from numerator and denominator
  let attended = 0;
  let conducted = 0;

  for (const record of records) {
    if (record.status === "PRESENT") {
      attended += 1;
      conducted += 1;
    } else if (record.status === "ABSENT") {
      conducted += 1;
    }
  }

  if (conducted === 0) {
    return {
      attended: 0,
      conducted: 0,
      percentage: 100.0,
      safeAbsences: 0,
      recoveryNeeded75: 0,
      recoveryNeeded80: 0,
      status: "safe",
    };
  }

  const rawPercentage = (attended / conducted) * 100;
  const percentage = Math.round(rawPercentage * 100) / 100;

  // Safe absences calculation:
  // (attended) / (conducted + x) >= target
  // => x <= (attended - target * conducted) / target
  const target75 = threshold / 100;
  let safeAbsences = 0;
  if (rawPercentage >= threshold) {
    safeAbsences = Math.floor((attended - target75 * conducted) / target75);
    if (safeAbsences < 0) safeAbsences = 0;
  }

  // Recovery calculation:
  // (attended + y) / (conducted + y) >= target
  // => y >= (target * conducted - attended) / (1 - target)
  let recoveryNeeded75 = 0;
  if (rawPercentage < threshold) {
    recoveryNeeded75 = Math.ceil((target75 * conducted - attended) / (1 - target75));
    if (recoveryNeeded75 < 0) recoveryNeeded75 = 0;
  }

  const target80 = 0.8;
  let recoveryNeeded80 = 0;
  if (rawPercentage < 80) {
    recoveryNeeded80 = Math.ceil((target80 * conducted - attended) / (1 - target80));
    if (recoveryNeeded80 < 0) recoveryNeeded80 = 0;
  }

  let status: "safe" | "warning" | "danger" = "safe";
  if (percentage < threshold) {
    status = "danger";
  } else if (percentage < 85) {
    status = "warning";
  }

  return {
    attended,
    conducted,
    percentage,
    safeAbsences,
    recoveryNeeded75,
    recoveryNeeded80,
    status,
  };
}

export function calculateSubjectAttendance(
  subjectCode: string,
  subjectName: string,
  records: AttendanceRecord[],
  threshold = 75,
  faculty?: string
): SubjectAttendanceSummary {
  const subjectRecords = records.filter((r) => r.subjectCode === subjectCode);

  const theoryRecords = subjectRecords.filter(
    (r) => r.category === "Theory" || r.category === "Tutorial"
  );
  const labRecords = subjectRecords.filter((r) => r.category === "Lab");

  const theoryMetrics = calculateMetrics(theoryRecords, threshold);
  const labMetrics = calculateMetrics(labRecords, threshold);

  // Combined metrics MUST use raw attendance units, NEVER an average of percentages!
  const combinedMetrics = calculateMetrics(subjectRecords, threshold);

  return {
    subjectCode,
    subjectName,
    faculty,
    theory: theoryMetrics,
    lab: labMetrics,
    combined: combinedMetrics,
    hasTheory: theoryRecords.length > 0,
    hasLab: labRecords.length > 0,
  };
}

export function computeDashboardStats(
  records: AttendanceRecord[],
  subjects: { code: string; name: string; faculty?: string }[],
  threshold = 75
): DashboardStats {
  const theoryRecords = records.filter(
    (r) => r.category === "Theory" || r.category === "Tutorial"
  );
  const labRecords = records.filter((r) => r.category === "Lab");

  const overallTheory = calculateMetrics(theoryRecords, threshold);
  const overallLab = calculateMetrics(labRecords, threshold);
  const overallCombined = calculateMetrics(records, threshold);

  const totalConducted = overallCombined.conducted;
  const totalAttended = overallCombined.attended;
  const totalAbsent = totalConducted - totalAttended;
  const totalCancelled = records.filter((r) => r.status === "CANCELLED").length;

  const subjectSummaries = subjects.map((subj) =>
    calculateSubjectAttendance(subj.code, subj.name, records, threshold, subj.faculty)
  );

  return {
    overallCombined,
    overallTheory,
    overallLab,
    totalConducted,
    totalAttended,
    totalAbsent,
    totalCancelled,
    subjects: subjectSummaries,
  };
}

// What-if simulator
export function simulateAttendance(
  currentAttended: number,
  currentConducted: number,
  futureClassesToAttend: number,
  futureClassesToMiss: number
) {
  const newAttended = currentAttended + futureClassesToAttend;
  const newConducted = currentConducted + futureClassesToAttend + futureClassesToMiss;

  if (newConducted === 0) return 100.0;
  return Math.round(((newAttended / newConducted) * 100) * 100) / 100;
}
