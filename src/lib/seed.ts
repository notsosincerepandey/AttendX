import { AttendanceRecord, StudentProfile } from "@/types";
import { UNIVERSITY_DATABASE } from "@/data/extractedTimetables";

export const DEFAULT_STUDENT: StudentProfile = {
  id: "student-it-b-p1-001",
  fullName: "Shubh Pandey",
  email: "shubh.pandey@mmmut.ac.in",
  role: "admin",
  university: "Madan Mohan Malaviya University of Technology, Gorakhpur",
  degree: "B.Tech",
  branch: "Information Technology",
  branchCode: "IT",
  section: "SEC-B",
  batch: "P1",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75.0,
  isPersonalized: false,
  activeTimetableId: "mmmut-btech-it-b-2025",
};

// Generates past 4 weeks of realistic attendance records for the student
export function generateSeedAttendance(
  profile: StudentProfile = DEFAULT_STUDENT,
  referenceDateStr: string = "2026-11-07"
): AttendanceRecord[] {
  const timetable = UNIVERSITY_DATABASE.timetables.find(
    (t) => t.id === profile.activeTimetableId
  );
  if (!timetable) return [];

  const records: AttendanceRecord[] = [];
  const refDate = new Date(referenceDateStr);

  // Generate 24 working days backwards (approx 4-5 weeks of university semester)
  let daysBack = 1;
  let workingDaysCount = 0;

  while (workingDaysCount < 24 && daysBack < 45) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - daysBack);
    daysBack++;

    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
    if (dayName === "Sunday") continue;

    workingDaysCount++;
    const dateStr = d.toISOString().split("T")[0];

    // Get slots for this day applicable to the student's batch
    const slots = timetable.slots.filter(
      (s) => s.day === dayName && (s.batch === "ALL" || s.batch === profile.batch)
    );

    for (const slot of slots) {
      // Deterministic realistic attendance:
      // High attendance in Math & Web Designing (~85%)
      // Moderate in Physics (~78%)
      // Near boundary in C Programming (~74%) to showcase warnings and safe absence calculator
      const hash = (dateStr + slot.subjectCode + slot.period).split("").reduce(
        (acc, char) => acc + char.charCodeAt(0),
        0
      );

      let status: "PRESENT" | "ABSENT" | "CANCELLED" = "PRESENT";

      // Occasionally a cancelled class (e.g. mass bunk or holiday)
      if (hash % 29 === 0) {
        status = "CANCELLED";
      } else if (slot.subjectCode === "BIT-103") {
        // C programming has a bit lower attendance to trigger warning (<75%)
        status = hash % 4 === 0 ? "ABSENT" : "PRESENT";
      } else if (slot.subjectCode === "BSM-131") {
        // Physics ~80%
        status = hash % 5 === 0 ? "ABSENT" : "PRESENT";
      } else {
        // High attendance in others (~90%)
        status = hash % 10 === 0 ? "ABSENT" : "PRESENT";
      }

      records.push({
        id: `att-${dateStr}-p${slot.period}-${slot.subjectCode}`,
        studentId: profile.id,
        date: dateStr,
        period: slot.period,
        subjectCode: slot.subjectCode,
        subjectName: slot.subjectName,
        category: slot.category,
        batch: slot.batch,
        room: slot.room,
        faculty: slot.faculty,
        status,
        markedAt: `${dateStr}T17:00:00.000Z`,
        markedBy: "STUDENT",
      });
    }
  }

  // Also generate TODAY's classes with 'PENDING' status so student can immediately mark them
  const todayDayName = refDate.toLocaleDateString("en-US", { weekday: "long" });
  if (todayDayName !== "Sunday") {
    const todaySlots = timetable.slots.filter(
      (s) => s.day === todayDayName && (s.batch === "ALL" || s.batch === profile.batch)
    );

    for (const slot of todaySlots) {
      records.push({
        id: `att-${referenceDateStr}-p${slot.period}-${slot.subjectCode}`,
        studentId: profile.id,
        date: referenceDateStr,
        period: slot.period,
        subjectCode: slot.subjectCode,
        subjectName: slot.subjectName,
        category: slot.category,
        batch: slot.batch,
        room: slot.room,
        faculty: slot.faculty,
        status: "PENDING", // Ready to be marked!
        markedAt: `${referenceDateStr}T09:00:00.000Z`,
        markedBy: "STUDENT",
      });
    }
  }

  return records;
}
