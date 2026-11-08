"use client";

import {
  StudentProfile,
  AttendanceRecord,
  TimetableSlot,
  CancellationReport,
  AuditLogEntry,
  NotificationItem,
  UniversityTimetable,
  UserAccount,
  ClassPoll,
  PollOption,
} from "@/types";
import { UNIVERSITY_DATABASE } from "@/data/extractedTimetables";
import { getCurrentUser, setCurrentUser, ADMIN_USER, getRegisteredUsers, saveRegisteredUsers } from "@/lib/auth";
import { canUserVoteInPoll, canUserClosePoll, canUserCreatePoll } from "@/lib/serverPolls";

export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 1. Current Active Student Profile
export function getStoredProfile(): StudentProfile {
  const currentUser = getCurrentUser();
  if (currentUser) {
    return currentUser as StudentProfile;
  }
  return ADMIN_USER as StudentProfile;
}

export function saveStoredProfile(profile: StudentProfile): void {
  if (typeof window === "undefined") return;
  try {
    setCurrentUser(profile);
    const users = getRegisteredUsers();
    const updated = users.map((u) => (u.id === profile.id ? { ...u, ...profile } : u));
    saveRegisteredUsers(updated);
  } catch (err) {
    console.error("Error saving profile", err);
  }
}

// 2. Attendance Records & Realistic Sample Data Generator
function getAttendanceStorageKey(userId: string): string {
  return `attendx_attendance_records_user_${userId}`;
}

export function generateSampleAttendance(profile: StudentProfile): AttendanceRecord[] {
  const timetable = getActiveTimetable(profile);
  const records: AttendanceRecord[] = [];
  const today = new Date();

  // Generate realistic attendance across past 24 days (skipping Sundays)
  for (let i = 24; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    // Skip Sundays
    if (d.getDay() === 0) continue;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

    // Scheduled slots for this student
    const daySlots = timetable.slots.filter(
      (s) => s.day === dayName && (s.batch === "ALL" || s.batch === profile.batch)
    );

    // One specific day cancelled for whole class (e.g. 11 days ago for fest rehearsal)
    const isHolidayOrCancelled = i === 11;

    daySlots.forEach((slot) => {
      let status: "PRESENT" | "ABSENT" | "CANCELLED" = "PRESENT";
      let notes: string | undefined = undefined;

      if (isHolidayOrCancelled) {
        status = "CANCELLED";
        notes = "Cancelled: University Cultural Fest Rehearsal";
      } else if (slot.category === "Lab") {
        // Multi-period practical: attended! (Demonstrates 4 discrete units per 4-period lab)
        status = "PRESENT";
        notes = "Full 4-period practical completed & verified";
      } else if (
        slot.subjectCode.includes("BHS") ||
        slot.subjectCode.includes("BCE") ||
        slot.subjectName.toLowerCase().includes("environment") ||
        slot.subjectName.toLowerCase().includes("civil")
      ) {
        // Shortage subject: ~65% attendance (demonstrates Shortage Red Alert & Recovery Needed)
        status = (i + slot.period) % 3 === 0 ? "ABSENT" : "PRESENT";
        if (status === "ABSENT") notes = "Unexcused absence";
      } else if (
        slot.subjectCode.includes("BAS") ||
        slot.subjectName.toLowerCase().includes("math") ||
        slot.subjectName.toLowerCase().includes("physics")
      ) {
        // Warning subject: ~77% attendance (demonstrates Yellow Warning Badge)
        status = (i + slot.period) % 5 === 0 ? "ABSENT" : "PRESENT";
        if (status === "ABSENT") notes = "Personal leave";
      } else {
        // Safe high attendance subjects: ~92% attendance (demonstrates Green Safe & Safe Bunks)
        status = (i + slot.period) % 11 === 0 ? "ABSENT" : "PRESENT";
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
        markedAt: `${dateStr}T13:00:00.000Z`,
        markedBy: "STUDENT",
        notes,
      });
    });
  }

  return records;
}

export function getStoredAttendance(profile?: StudentProfile): AttendanceRecord[] {
  if (typeof window === "undefined") return [];
  const currentProfile = profile || getStoredProfile();
  if (!currentProfile || !currentProfile.id) return [];

  const key = getAttendanceStorageKey(currentProfile.id);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const records: AttendanceRecord[] = JSON.parse(raw);
      return processAutoAbsences(records, currentProfile.id);
    }
  } catch (err) {
    console.error("Error loading attendance", err);
  }

  // Auto-generate realistic demo attendance so user can showcase functionality
  const sampleRecords = generateSampleAttendance(currentProfile);
  try {
    localStorage.setItem(key, JSON.stringify(sampleRecords));
  } catch (err) {
    console.error("Error saving sample attendance", err);
  }
  return sampleRecords;
}

export function resetToDemoData(profile?: StudentProfile): AttendanceRecord[] {
  const currentProfile = profile || getStoredProfile();
  const sample = generateSampleAttendance(currentProfile);
  saveStoredAttendance(sample, currentProfile.id);
  return sample;
}

export function clearAttendanceData(userId?: string): void {
  if (typeof window === "undefined") return;
  const targetId = userId || getStoredProfile()?.id;
  if (!targetId) return;
  localStorage.setItem(getAttendanceStorageKey(targetId), JSON.stringify([]));
}

export function saveStoredAttendance(records: AttendanceRecord[], userId?: string): void {
  if (typeof window === "undefined") return;
  const currentUserId = userId || getStoredProfile()?.id;
  if (!currentUserId) return;

  try {
    const key = getAttendanceStorageKey(currentUserId);
    localStorage.setItem(key, JSON.stringify(records));
  } catch (err) {
    console.error("Error saving attendance", err);
  }
}

// Automatic absence rule for past pending records
export function processAutoAbsences(records: AttendanceRecord[], userId: string): AttendanceRecord[] {
  const today = getTodayDateStr();
  let changed = false;

  const updated = records.map((r) => {
    if (r.date < today && r.status === "PENDING") {
      changed = true;
      return {
        ...r,
        status: "ABSENT" as const,
        markedBy: "AUTO_ABSENCE" as const,
        notes: "Automatically marked absent after cutoff deadline",
      };
    }
    return r;
  });

  if (changed && typeof window !== "undefined") {
    saveStoredAttendance(updated, userId);
  }
  return updated;
}



// Mark attendance for an individual period
export function updatePeriodAttendance(
  recordId: string,
  newStatus: "PRESENT" | "ABSENT" | "CANCELLED" | "PENDING",
  reason?: string
): AttendanceRecord[] {
  const profile = getStoredProfile();
  const records = getStoredAttendance(profile);
  let oldStatus = "PENDING";
  let targetSubject = "";
  let targetDate = "";
  let targetPeriod = 1;

  const updated = records.map((r) => {
    if (r.id === recordId) {
      oldStatus = r.status;
      targetSubject = r.subjectCode;
      targetDate = r.date;
      targetPeriod = r.period;
      return {
        ...r,
        status: newStatus,
        markedAt: new Date().toISOString(),
        markedBy: "STUDENT" as const,
        notes: reason || r.notes,
      };
    }
    return r;
  });

  saveStoredAttendance(updated, profile.id);

  // Add audit log if it was modified
  if (oldStatus !== newStatus && oldStatus !== "PENDING") {
    logAttendanceChange({
      id: "log-" + Date.now(),
      attendanceRecordId: recordId,
      studentId: profile.id,
      subjectCode: targetSubject,
      date: targetDate,
      period: targetPeriod,
      oldStatus: oldStatus as any,
      newStatus,
      reason: reason || "Manual correction by student",
      timestamp: new Date().toISOString(),
    });
  }

  return updated;
}

// Student independently deletes an individual attendance entry
export function deleteAttendanceRecord(recordId: string, userId?: string): AttendanceRecord[] {
  const profile = getStoredProfile();
  const currentUserId = userId || profile?.id;
  if (!currentUserId) return [];
  const records = getStoredAttendance(profile);
  const target = records.find((r) => r.id === recordId);
  const filtered = records.filter((r) => r.id !== recordId);
  saveStoredAttendance(filtered, currentUserId);
  if (target) {
    logAttendanceChange({
      id: "log-" + Date.now(),
      attendanceRecordId: recordId,
      studentId: currentUserId,
      subjectCode: target.subjectCode,
      date: target.date,
      period: target.period,
      oldStatus: target.status as any,
      newStatus: "CANCELLED",
      reason: "Record deleted by student",
      timestamp: new Date().toISOString(),
    });
  }
  return filtered;
}

// Quick action: Mark all periods of a given date
export function markAllPeriodsForDate(
  dateStr: string,
  newStatus: "PRESENT" | "ABSENT" | "CANCELLED"
): AttendanceRecord[] {
  const profile = getStoredProfile();
  const timetable = getActiveTimetable(profile);
  const records = getStoredAttendance(profile);
  const dateObj = new Date(dateStr);
  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

  const scheduledSlots = timetable.slots.filter(
    (s) => s.day === dayName && (s.batch === "ALL" || s.batch === profile.batch)
  );

  const updated = [...records];
  for (const slot of scheduledSlots) {
    const existingIdx = updated.findIndex(
      (r) => r.date === dateStr && r.period === slot.period && r.subjectCode === slot.subjectCode
    );
    if (existingIdx !== -1) {
      updated[existingIdx] = {
        ...updated[existingIdx],
        status: newStatus,
        markedAt: new Date().toISOString(),
        markedBy: "STUDENT",
      };
    } else {
      updated.push({
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
        status: newStatus,
        markedAt: new Date().toISOString(),
        markedBy: "STUDENT",
      });
    }
  }

  saveStoredAttendance(updated, profile.id);
  return updated;
}



// Quick action: Mark entire multi-period lab
export function markLabSession(
  dateStr: string,
  subjectCode: string,
  newStatus: "PRESENT" | "ABSENT" | "CANCELLED"
): AttendanceRecord[] {
  const profile = getStoredProfile();
  const timetable = getActiveTimetable(profile);
  const records = getStoredAttendance(profile);
  const dateObj = new Date(dateStr);
  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

  const labSlots = timetable.slots.filter(
    (s) =>
      s.day === dayName &&
      s.subjectCode === subjectCode &&
      s.category === "Lab" &&
      (s.batch === "ALL" || s.batch === profile.batch)
  );

  const updated = [...records];
  for (const slot of labSlots) {
    const existingIdx = updated.findIndex(
      (r) => r.date === dateStr && r.period === slot.period && r.subjectCode === slot.subjectCode
    );
    if (existingIdx !== -1) {
      updated[existingIdx] = {
        ...updated[existingIdx],
        status: newStatus,
        markedAt: new Date().toISOString(),
        markedBy: "STUDENT",
      };
    } else {
      updated.push({
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
        status: newStatus,
        markedAt: new Date().toISOString(),
        markedBy: "STUDENT",
      });
    }
  }

  saveStoredAttendance(updated, profile.id);
  return updated;
}



// 3. Timetable Customization (ISOLATED PER USER)
function getTimetableStorageKey(userId: string): string {
  return `attendx_custom_timetables_user_${userId}`;
}

export function getActiveTimetable(profile: StudentProfile): UniversityTimetable {
  if (typeof window !== "undefined" && profile?.id) {
    try {
      // 1. Personal override if student customized personally
      const key = getTimetableStorageKey(profile.id);
      const customRaw = localStorage.getItem(key);
      if (customRaw) {
        const customMap: Record<string, UniversityTimetable> = JSON.parse(customRaw);
        if (customMap[profile.activeTimetableId]) {
          return customMap[profile.activeTimetableId];
        }
      }

      // 2. Class Admin official class timetable override
      const classRaw = localStorage.getItem(
        `attendx_class_timetable_${profile.branchCode}_${profile.section}`
      );
      if (classRaw) {
        return JSON.parse(classRaw);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const found = UNIVERSITY_DATABASE.timetables.find(
    (t) => t.id === profile.activeTimetableId
  );
  return (
    found ||
    UNIVERSITY_DATABASE.timetables[0] || {
      id: "default",
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
      slots: [],
    }
  );
}

export function saveOfficialClassTimetable(
  timetable: UniversityTimetable,
  authorName: string,
  callerProfile?: StudentProfile
): boolean {
  const caller = callerProfile || (typeof window !== "undefined" ? getStoredProfile() : undefined);
  if (!caller) return false;

  if (caller.role !== "admin" && caller.role !== "class_admin") {
    throw new Error("Access Denied: Only Class CRs or Administrators can modify the official class timetable.");
  }
  if (caller.role === "class_admin") {
    if (caller.managedBranchCode && caller.managedBranchCode !== timetable.branchCode) {
      throw new Error(`Access Denied: You are authorized to manage ${caller.managedBranchCode}, not ${timetable.branchCode}.`);
    }
    if (caller.managedSection && caller.managedSection !== timetable.section) {
      throw new Error(`Access Denied: You are authorized to manage ${caller.managedSection}, not ${timetable.section}.`);
    }
    if (timetable.academicSessionId === null || (timetable as any).academicSessionId === "NULL") {
      throw new Error("Access Denied: Academic session ID cannot be NULL.");
    }
    if (timetable.academicSessionId) {
      if (!caller.academicSessionId || caller.academicSessionId !== timetable.academicSessionId) {
        throw new Error("Access Denied: Timetable academic session ID does not match your assigned session.");
      }
    }
    if (timetable.isSessionActive === false) {
      throw new Error("Access Denied: Cannot modify timetable for an inactive academic session.");
    }
    if (timetable.session && caller.academicSession && caller.academicSession !== timetable.session) {
      throw new Error(`Access Denied: You are authorized to manage academic session ${caller.academicSession}, not ${timetable.session}.`);
    }
    if (caller.managedBatch && caller.managedBatch !== "ALL") {
      const hasInvalidBatchSlots = timetable.slots?.some(
        (s) => s.batch !== "ALL" && s.batch !== caller.managedBatch
      );
      if (hasInvalidBatchSlots) {
        throw new Error(`Access Denied: You are only authorized to manage practical batch ${caller.managedBatch}.`);
      }
    }
  }

  if (typeof window === "undefined") return true;

  try {
    const key = `attendx_class_timetable_${timetable.branchCode}_${timetable.section}`;
    localStorage.setItem(key, JSON.stringify(timetable));

    // Also dispatch notification to entire class
    createClassAnnouncement({
      title: "Class Timetable Updated",
      message: `${authorName} (Class Admin) updated the official class schedule for ${timetable.branchCode} ${timetable.section}.`,
      type: "info",
      targetBranchCode: timetable.branchCode,
      targetSection: timetable.section,
      authorName,
      authorRole: "class_admin",
      link: "/timetable",
    });
    return true;
  } catch (e) {
    console.error("Error saving official class timetable", e);
    return false;
  }
}

export function resetCustomTimetable(profile?: StudentProfile): UniversityTimetable {
  const currentProfile = profile || getStoredProfile();
  if (typeof window !== "undefined" && currentProfile?.id) {
    try {
      const key = getTimetableStorageKey(currentProfile.id);
      const raw = localStorage.getItem(key);
      if (raw) {
        const map = JSON.parse(raw);
        delete map[currentProfile.activeTimetableId];
        localStorage.setItem(key, JSON.stringify(map));
      }
    } catch (e) {
      console.error("Error resetting custom timetable", e);
    }
  }
  return getActiveTimetable(currentProfile);
}

export function saveCustomTimetable(
  timetableId: string,
  customTimetable: UniversityTimetable,
  userId?: string
): void {
  if (typeof window === "undefined") return;
  const currentUserId = userId || getStoredProfile()?.id;
  if (!currentUserId) return;

  try {
    const key = getTimetableStorageKey(currentUserId);
    const raw = localStorage.getItem(key);
    const map = raw ? JSON.parse(raw) : {};
    map[timetableId] = customTimetable;
    localStorage.setItem(key, JSON.stringify(map));
  } catch (err) {
    console.error("Error saving custom timetable", err);
  }
}

// 4. Cancellation Reports
export function getCancellationReports(): CancellationReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("attendx_cancellations_v2");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [
    {
      id: "canc-1",
      studentId: "s-102",
      studentName: "Aditya Verma",
      date: "2026-11-06",
      subjectCode: "BAS-102",
      period: 3,
      reasonType: "TEACHER_ABSENT",
      description: "Dr. Vinod informed he is on emergency leave today.",
      confirmationCount: 18,
      status: "CONFIRMED",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "canc-2",
      studentId: "s-103",
      studentName: "Rohan Gupta",
      date: "2026-11-05",
      subjectCode: "BHS-101",
      period: 4,
      reasonType: "MASS_BUNK",
      description: "Class consensus for Annual Sports Fest preparations.",
      confirmationCount: 32,
      status: "CONFIRMED",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: "canc-3",
      studentId: "s-104",
      studentName: "Priya Singh",
      date: getTodayDateStr(),
      subjectCode: "BIT-103",
      period: 2,
      reasonType: "COLLEGE_HOLIDAY",
      description: "Guest lecture in Aryabhatt Hall during Period 2.",
      confirmationCount: 6,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    },
  ];
}

export function submitCancellationReport(
  report: Omit<CancellationReport, "id" | "confirmationCount" | "status" | "createdAt">
): CancellationReport {
  const existing = getCancellationReports();
  const newReport: CancellationReport = {
    ...report,
    id: "canc-" + Date.now(),
    confirmationCount: 1,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  const updated = [newReport, ...existing];
  if (typeof window !== "undefined") {
    localStorage.setItem("attendx_cancellations_v2", JSON.stringify(updated));
  }
  return newReport;
}

export function confirmCancellationReport(reportId: string): CancellationReport[] {
  const existing = getCancellationReports();
  let confirmedReport: CancellationReport | undefined;

  const updated = existing.map((r) => {
    if (r.id === reportId) {
      const nextCount = r.confirmationCount + 1;
      const res = { ...r, confirmationCount: nextCount, status: "CONFIRMED" as const };
      confirmedReport = res;
      return res;
    }
    return r;
  });

  if (typeof window !== "undefined") {
    localStorage.setItem("attendx_cancellations_v2", JSON.stringify(updated));
  }

  if (confirmedReport) {
    const records = getStoredAttendance();
    const updatedRecords = records.map((rec) => {
      if (rec.date === confirmedReport?.date) {
        if (confirmedReport.period && rec.period !== confirmedReport.period) return rec;
        if (confirmedReport.subjectCode && rec.subjectCode !== confirmedReport.subjectCode) return rec;
        return {
          ...rec,
          status: "CANCELLED" as const,
          notes: `Cancelled: ${confirmedReport.reasonType} - ${confirmedReport.description}`,
        };
      }
      return rec;
    });
    saveStoredAttendance(updatedRecords);
  }

  return updated;
}



// 5. Audit Logs (ISOLATED PER USER)
export function getAuditLogs(): AuditLogEntry[] {
  if (typeof window === "undefined") return [];
  const profile = getStoredProfile();
  if (!profile?.id) return [];
  try {
    const raw = localStorage.getItem(`attendx_audit_logs_user_${profile.id}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  const sampleLogs: AuditLogEntry[] = [
    {
      id: "log-demo-01",
      attendanceRecordId: "att-sample-1",
      studentId: profile.id,
      subjectCode: "BIT-103",
      date: "2026-11-04",
      period: 3,
      oldStatus: "PENDING",
      newStatus: "PRESENT",
      reason: "Teacher marked late in class register",
      timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: "log-demo-02",
      attendanceRecordId: "att-sample-2",
      studentId: profile.id,
      subjectCode: "BAS-102",
      date: "2026-10-28",
      period: 2,
      oldStatus: "ABSENT",
      newStatus: "CANCELLED",
      reason: "Department sports rehearsal holiday declared",
      timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: "log-demo-03",
      attendanceRecordId: "att-sample-3",
      studentId: profile.id,
      subjectCode: "BIT-104",
      date: "2026-10-21",
      period: 5,
      oldStatus: "PENDING",
      newStatus: "PRESENT",
      reason: "Lab viva and file verified by lab in-charge",
      timestamp: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
  ];
  return sampleLogs;
}

export function logAttendanceChange(log: AuditLogEntry): void {
  if (typeof window === "undefined") return;
  const existing = getAuditLogs();
  const updated = [log, ...existing].slice(0, 50);
  try {
    localStorage.setItem(`attendx_audit_logs_user_${log.studentId}`, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
}

// 6. Announcements & Notifications
const ANNOUNCEMENTS_KEY = "attendx_class_announcements_v1";

export function getClassAnnouncements(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [
    {
      id: "ann-welcome",
      title: "University Notice: 75% Attendance Mandatory",
      message: "Per MMMUT academic guidelines, students with attendance below 75% in theory or lab will be debarred from examinations.",
      type: "warning",
      timestamp: "Today",
      isRead: false,
      authorName: "Dean Academic Affairs",
      authorRole: "admin",
      targetBranchCode: "ALL",
      targetSection: "ALL",
    },
    {
      id: "ann-cr-01",
      title: "C Programming Lab Batch Schedule",
      message: "Tomorrow's practical batch P1 will report directly to Computer Lab 3 at 2:00 PM with completed lab records.",
      type: "info",
      timestamp: "1 hour ago",
      isRead: false,
      authorName: "Aryan Singh (CR)",
      authorRole: "class_admin",
      targetBranchCode: "IT",
      targetSection: "SEC-B",
    },
  ];
}

export function createClassAnnouncement(
  data: Omit<NotificationItem, "id" | "isRead" | "timestamp">
): NotificationItem {
  const existing = getClassAnnouncements();
  const newAnnouncement: NotificationItem = {
    ...data,
    id: "ann-" + Date.now(),
    timestamp: "Just now",
    isRead: false,
  };
  const updated = [newAnnouncement, ...existing];
  if (typeof window !== "undefined") {
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  }
  return newAnnouncement;
}

export function getNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  const profile = getStoredProfile();

  // 1. Personal notifications
  let personalNotifs: NotificationItem[] = [];
  try {
    const raw = localStorage.getItem(`attendx_notifications_user_${profile?.id}`);
    if (raw) personalNotifs = JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  // 2. Class announcements matching student's branch/section or target ALL
  const announcements = getClassAnnouncements().filter((a) => {
    if (!a.targetBranchCode || a.targetBranchCode === "ALL") return true;
    if (a.targetBranchCode === profile.branchCode) {
      if (!a.targetSection || a.targetSection === "ALL" || a.targetSection === profile.section) {
        return true;
      }
    }
    return false;
  });

  // Track read status for announcements per user
  let readAnnouncementIds: string[] = [];
  try {
    const readRaw = localStorage.getItem(`attendx_read_announcements_${profile?.id}`);
    if (readRaw) readAnnouncementIds = JSON.parse(readRaw);
  } catch (e) {
    console.error(e);
  }

  const mergedAnnouncements = announcements.map((a) => ({
    ...a,
    isRead: readAnnouncementIds.includes(a.id),
  }));

  const all = [...mergedAnnouncements, ...personalNotifs];
  if (all.length === 0) {
    return [
      {
        id: "n-1",
        title: "Welcome to AttendX",
        message: `Logged in as ${profile.fullName} (${profile.branchCode} ${profile.section}, Batch ${profile.batch}). Start tracking your daily classes!`,
        type: "info",
        timestamp: "Just now",
        isRead: false,
      },
    ];
  }
  return all;
}

export function markNotificationAsRead(id: string): void {
  if (typeof window === "undefined") return;
  const profile = getStoredProfile();

  // If announcement
  try {
    const readRaw = localStorage.getItem(`attendx_read_announcements_${profile?.id}`);
    const readIds: string[] = readRaw ? JSON.parse(readRaw) : [];
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem(`attendx_read_announcements_${profile?.id}`, JSON.stringify(readIds));
    }
  } catch (e) {
    console.error(e);
  }

  // If personal
  try {
    const raw = localStorage.getItem(`attendx_notifications_user_${profile?.id}`);
    if (raw) {
      const list: NotificationItem[] = JSON.parse(raw);
      const updated = list.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      localStorage.setItem(`attendx_notifications_user_${profile?.id}`, JSON.stringify(updated));
    }
  } catch (e) {
    console.error(e);
  }
}

// 7. Class Polls
const POLLS_STORAGE_KEY = "attendx_class_polls_v1";

export function getClassPolls(branchCode?: string, section?: string): ClassPoll[] {
  if (typeof window === "undefined") return [];

  const filterPolls = (list: ClassPoll[]) => {
    if (!branchCode) return list;
    return list.filter((p) => {
      if (p.branchCode === "ALL") return true;
      if (p.branchCode === branchCode) {
        return p.section === "ALL" || !section || p.section === section;
      }
      return false;
    });
  };

  try {
    const raw = localStorage.getItem(POLLS_STORAGE_KEY);
    if (raw) {
      const allPolls: ClassPoll[] = JSON.parse(raw);
      return filterPolls(allPolls);
    }
  } catch (e) {
    console.error("Error reading polls", e);
  }

  // Pre-seeded initial polls (strictly filtered by requested scope)
  const initialPolls: ClassPoll[] = [
    {
      id: "poll-demo-01",
      title: "Consensus on Mass Bunk for Friday P6 & P7?",
      description: "Proposed by Class Representative for cultural fest rehearsal preparation.",
      category: "MASS_BUNK",
      branchCode: "IT",
      section: "SEC-B",
      options: [
        { id: "opt-1", text: "Yes, 100% Mass Bunk", votes: 28 },
        { id: "opt-2", text: "No, Attend Classes", votes: 4 },
        { id: "opt-3", text: "Neutral / Depends on attendance", votes: 7 },
      ],
      createdBy: {
        id: "class-admin-aryan-003",
        name: "Aryan Singh (CR)",
        role: "class_admin",
      },
      votedUserIds: {},
      totalVotes: 39,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
    {
      id: "poll-demo-02",
      title: "Reschedule Physics Tutorial to Saturday Morning?",
      description: "Teacher requested moving Period 4 Thursday to Saturday 10:00 AM.",
      category: "RESCHEDULE",
      branchCode: "CSE",
      section: "SEC-A",
      options: [
        { id: "opt-21", text: "Agree (Saturday 10 AM)", votes: 19 },
        { id: "opt-22", text: "Disagree (Keep original slot)", votes: 14 },
      ],
      createdBy: {
        id: "admin-shubh-001",
        name: "Shubh Pandey",
        role: "admin",
      },
      votedUserIds: {},
      totalVotes: 33,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
  ];
  return filterPolls(initialPolls);
}

export function createClassPoll(
  data: Omit<ClassPoll, "id" | "totalVotes" | "votedUserIds" | "createdAt" | "status">,
  user?: UserAccount | StudentProfile
): ClassPoll {
  const currentUser = user || getCurrentUser();
  if (currentUser) {
    const authCheck = canUserCreatePoll(currentUser as UserAccount, data.branchCode, data.section);
    if (!authCheck.allowed) {
      throw new Error(authCheck.reason || "Access Denied: Cannot create poll.");
    }
  }

  const all = getClassPolls();
  const newPoll: ClassPoll = {
    ...data,
    id: "poll-" + Date.now(),
    totalVotes: 0,
    votedUserIds: {},
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  const updated = [newPoll, ...all];
  if (typeof window !== "undefined") {
    localStorage.setItem(POLLS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));

    // Also post announcement to the class
    createClassAnnouncement({
      title: `New Poll: ${data.title}`,
      message: `A new vote has been called for ${data.branchCode} ${data.section} by ${data.createdBy.name}. Cast your vote in the Class Polls tab!`,
      type: "info",
      targetBranchCode: data.branchCode,
      targetSection: data.section,
      authorName: data.createdBy.name,
      authorRole: data.createdBy.role,
      link: "/polls",
    });
  }
  return newPoll;
}

export function voteInPoll(
  pollId: string,
  optionId: string,
  userOrUserId: string | UserAccount | StudentProfile
): { success: boolean; poll?: ClassPoll; error?: string } {
  const currentUser: UserAccount =
    typeof userOrUserId === "object" && userOrUserId !== null
      ? (userOrUserId as UserAccount)
      : (getCurrentUser() || {
          id: userOrUserId,
          fullName: "Student",
          email: "student@mmmut.ac.in",
          role: "student" as const,
          degree: "B.Tech",
          branch: "Engineering",
          branchCode: "IT",
          section: "SEC-B",
          batch: "P1",
          semester: "Semester I",
          academicSession: "2025-26",
          attendanceThreshold: 75.0,
          activeTimetableId: "mmmut-btech-it-b-2025",
        });

  const all = getClassPolls();
  const pollIndex = all.findIndex((p) => p.id === pollId);
  if (pollIndex === -1) {
    return { success: false, error: "Poll not found" };
  }

  const poll = all[pollIndex];

  // Authoritative scope and role check
  const authCheck = canUserVoteInPoll(currentUser, poll);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.reason || "Access Denied" };
  }

  const option = poll.options.find((o) => o.id === optionId);
  if (!option) {
    return { success: false, error: "Invalid option selected" };
  }

  option.votes += 1;
  poll.totalVotes += 1;
  if (!poll.votedUserIds) poll.votedUserIds = {};
  poll.votedUserIds[currentUser.id] = optionId;

  all[pollIndex] = poll;
  if (typeof window !== "undefined") {
    localStorage.setItem(POLLS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("storage"));
  }

  return { success: true, poll };
}

export function closeClassPoll(
  pollId: string,
  user?: UserAccount | StudentProfile
): ClassPoll | null {
  const currentUser: UserAccount | null = (user as UserAccount) || getCurrentUser();
  if (!currentUser) return null;

  const all = getClassPolls();
  const pollIndex = all.findIndex((p) => p.id === pollId);
  if (pollIndex === -1) return null;

  const poll = all[pollIndex];
  const authCheck = canUserClosePoll(currentUser, poll);
  if (!authCheck.allowed) {
    console.error("Poll closure denied:", authCheck.reason);
    return null;
  }

  poll.status = "CLOSED";
  all[pollIndex] = poll;
  if (typeof window !== "undefined") {
    localStorage.setItem(POLLS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("storage"));
  }
  return poll;
}
