export type AttendanceStatus = "PRESENT" | "ABSENT" | "CANCELLED" | "PENDING";
export type AttendanceCategory = "Theory" | "Lab" | "Tutorial";
export type UserRole = "admin" | "class_admin" | "student";

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  rollNumber?: string;
  enrollmentNumber?: string;
  fatherName?: string;
  password?: string;
  role: UserRole;
  university?: string;
  degree: string;
  branch: string;
  branchCode: string;
  section: string;
  batch: string; // "P1", "P2", "P3", "P4", "T1", "T2"
  semester: string;
  academicSession: string;
  academicSessionId?: string;
  universityId?: string;
  attendanceThreshold: number; // default 75
  activeTimetableId: string;
  managedBranchCode?: string; // For Class Admins
  managedSection?: string; // For Class Admins
  managedBatch?: string; // For Batch-restricted Class Admins
  requiresPasswordChange?: boolean;
  passwordChangeConsumed?: boolean;
}

export interface StudentDirectoryItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  rollNumber?: string;
  branchCode?: string;
  branchName?: string;
  section?: string;
  batch?: string;
  academicSession?: string;
  semester?: string;
  role: UserRole;
  managedBranchCode?: string;
  managedSection?: string;
  managedBatch?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface PublishedTimetableVersion {
  id: string;
  branchCode: string;
  section: string;
  batch: string;
  academicSession: string;
  semester: string;
  versionLabel: string;
  publishedBy: string;
  publishedByEmail: string;
  publishedAt: string;
  timetableData: any;
  slotCount: number;
  isActive: boolean;
}

export interface PeriodDefinition {
  period: number;
  name: string;
  startTime: string;
  endTime: string;
  isLunch: boolean;
}

export interface TimetableSubject {
  code: string;
  name: string;
  credits: string;
  faculty: string;
}

export interface TimetableSlot {
  id?: string;
  day: string; // "Monday", "Tuesday", etc.
  period: number; // 1 to 12
  subjectCode: string;
  subjectName: string;
  category: AttendanceCategory;
  batch: string; // "ALL" | "P1" | "P2" | "P3" | "P4" | "T1" | "T2"
  room: string;
  faculty?: string;
  startTime?: string;
  endTime?: string;
}

export interface UniversityTimetable {
  id: string;
  pageNumber: number;
  degree: string;
  branch: string;
  branchCode: string;
  section: string;
  room: string;
  session: string;
  academicSessionId?: string;
  isSessionActive?: boolean;
  semester: string;
  batches: string[];
  isVerified: boolean;
  subjects: TimetableSubject[];
  slots: TimetableSlot[];
  effectiveFrom?: string;
}

export interface StudentProfile extends UserAccount {
  isPersonalized?: boolean;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  period: number;
  subjectCode: string;
  subjectName: string;
  category: AttendanceCategory;
  batch: string;
  room: string;
  faculty?: string;
  status: AttendanceStatus;
  markedAt: string;
  markedBy: "STUDENT" | "AUTO_ABSENCE" | "ADMIN_OVERRIDE";
  notes?: string;
}

export interface AttendanceMetrics {
  attended: number;
  conducted: number;
  percentage: number;
  safeAbsences: number;
  recoveryNeeded75: number;
  recoveryNeeded80: number;
  status: "safe" | "warning" | "danger"; // green >=85, yellow 75-84.99, red <75
}

export interface SubjectAttendanceSummary {
  subjectCode: string;
  subjectName: string;
  faculty?: string;
  theory: AttendanceMetrics;
  lab: AttendanceMetrics;
  combined: AttendanceMetrics;
  hasTheory: boolean;
  hasLab: boolean;
}

export interface DashboardStats {
  overallCombined: AttendanceMetrics;
  overallTheory: AttendanceMetrics;
  overallLab: AttendanceMetrics;
  totalConducted: number;
  totalAttended: number;
  totalAbsent: number;
  totalCancelled: number;
  subjects: SubjectAttendanceSummary[];
}

export interface CancellationReport {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  period?: number;
  subjectCode?: string;
  reasonType: "MASS_BUNK" | "TEACHER_ABSENT" | "COLLEGE_HOLIDAY" | "OTHER";
  description: string;
  confirmationCount: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  attendanceRecordId: string;
  studentId: string;
  subjectCode: string;
  date: string;
  period: number;
  oldStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason?: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "warning" | "danger" | "success" | "info";
  timestamp: string;
  isRead: boolean;
  link?: string;
  authorName?: string;
  authorRole?: "admin" | "class_admin";
  targetBranchCode?: string; // e.g. "IT" or "ALL"
  targetSection?: string; // e.g. "SEC-B" or "ALL"
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface ClassPoll {
  id: string;
  title: string;
  description?: string;
  category: "MASS_BUNK" | "RESCHEDULE" | "EXTRA_CLASS" | "GENERAL";
  branchCode: string; // e.g. "IT" or "ALL"
  section: string; // e.g. "SEC-B" or "ALL"
  batch?: string; // e.g. "ALL" | "P1" | "P2"
  academicSession?: string;
  semester?: string;
  options: PollOption[];
  createdBy: {
    id: string;
    name: string;
    role: "admin" | "class_admin";
  };
  votedUserIds: Record<string, string>; // userId -> optionId
  totalVotes: number;
  status: "ACTIVE" | "CLOSED";
  createdAt: string;
  expiresAt?: string;
}
