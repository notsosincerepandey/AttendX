import { BRANCH_NAMES_MAP, normalizeSection } from "@/data/extractedTimetables";

export interface ParsedStudentRow {
  id: string; // Temporary row id for preview tracking
  fullName: string;
  rollNumber: string;
  enrollmentNumber?: string;
  fatherName?: string;
  branchCode: string;
  branchName: string;
  section: string;
  batch: string;
  academicYear: string;
  semester: string;
  academicSession: string;
  email: string;
  status: "VALID" | "DUPLICATE_IN_FILE" | "ALREADY_IN_DB" | "INVALID";
  errors: string[];
  isSkipped?: boolean;
}

export interface ImportPreviewSummary {
  totalDetected: number;
  validCount: number;
  duplicateCount: number;
  existingCount: number;
  invalidCount: number;
  willAddCount: number;
  detectedHeaders: string[];
  columnMapping: Record<string, string>;
  records: ParsedStudentRow[];
}

export const VALID_BRANCHES = ["IT", "CSE", "ECE", "EE", "ME", "CE", "CHE", "ECE(IOT)"];
export const VALID_ACADEMIC_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export const BRANCH_ALIASES: Record<string, string> = {
  it: "IT",
  "information technology": "IT",
  infotech: "IT",
  cse: "CSE",
  "computer science": "CSE",
  "computer science & engineering": "CSE",
  "computer science and engineering": "CSE",
  ece: "ECE",
  "electronics & communication": "ECE",
  "electronics and communication": "ECE",
  "electronics & communication engineering": "ECE",
  "ece(iot)": "ECE(IOT)",
  "ece iot": "ECE(IOT)",
  "iot": "ECE(IOT)",
  ee: "EE",
  "electrical engineering": "EE",
  electrical: "EE",
  me: "ME",
  "mechanical engineering": "ME",
  mechanical: "ME",
  ce: "CE",
  "civil engineering": "CE",
  civil: "CE",
  che: "CHE",
  "chemical engineering": "CHE",
  chemical: "CHE",
};

export function normalizeBranchCode(raw?: string): string {
  if (!raw) return "";
  const cleaned = raw.trim().toLowerCase();
  if (BRANCH_ALIASES[cleaned]) return BRANCH_ALIASES[cleaned];
  const upper = raw.trim().toUpperCase();
  if (VALID_BRANCHES.includes(upper)) return upper;
  return upper;
}

export function normalizeAcademicYear(raw?: string, defaultYear = "1st Year"): string {
  if (!raw) return defaultYear;
  const str = raw.trim().toLowerCase();
  if (str.includes("1") || str.includes("first")) return "1st Year";
  if (str.includes("2") || str.includes("second")) return "2nd Year";
  if (str.includes("3") || str.includes("third")) return "3rd Year";
  if (str.includes("4") || str.includes("fourth")) return "4th Year";
  return defaultYear;
}

export function defaultSemesterForYear(academicYear: string): string {
  switch (academicYear) {
    case "2nd Year":
      return "Semester III";
    case "3rd Year":
      return "Semester V";
    case "4th Year":
      return "Semester VII";
    case "1st Year":
    default:
      return "Semester I";
  }
}
