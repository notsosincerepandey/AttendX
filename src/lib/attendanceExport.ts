import type { AttendanceRecord, AttendanceStatus } from "../types";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Format date string safely without timezone offset shift.
 * Handles "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss" -> "DD MMM YYYY" (e.g. "24 Nov 2026").
 */
export function formatDateSafe(rawDate?: string): string {
  if (!rawDate) return "";
  const clean = rawDate.split("T")[0].trim();
  const parts = clean.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (month >= 1 && month <= 12 && !isNaN(day)) {
      return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
    }
  }
  return clean;
}

/**
 * Format database status string into human-friendly Title Case:
 * "PRESENT" -> "Present"
 * "ABSENT" -> "Absent"
 * "CANCELLED" -> "Cancelled"
 * "PENDING" -> "Pending"
 */
export function formatAttendanceStatus(status?: AttendanceStatus | string): string {
  if (!status) return "";
  const s = status.toUpperCase();
  if (s === "PRESENT") return "Present";
  if (s === "ABSENT") return "Absent";
  if (s === "CANCELLED") return "Cancelled";
  if (s === "PENDING") return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

/**
 * RFC 4180 compliant CSV field escaping.
 * Wraps values containing commas, quotes, or newlines in double quotes and escapes internal quotes.
 */
export function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates descriptive filename according to date range.
 * Examples:
 * - AttendX_Attendance_2026-11-27.xlsx (single day / today)
 * - AttendX_Attendance_2026-11-20_to_2026-11-27.csv (range)
 */
export function generateExportFilename(
  records: AttendanceRecord[],
  extension: "xlsx" | "csv",
  customPrefix = "AttendX_Attendance"
): string {
  const nowStr = new Date().toISOString().slice(0, 10);

  if (!records || records.length === 0) {
    return `${prefixSafe(customPrefix)}_${nowStr}.${extension}`;
  }

  const validDates = records
    .map((r) => (r.date ? r.date.split("T")[0] : ""))
    .filter(Boolean)
    .sort();

  if (validDates.length === 0) {
    return `${prefixSafe(customPrefix)}_${nowStr}.${extension}`;
  }

  const minDate = validDates[0];
  const maxDate = validDates[validDates.length - 1];

  if (minDate === maxDate) {
    return `${prefixSafe(customPrefix)}_${minDate}.${extension}`;
  }

  return `${prefixSafe(customPrefix)}_${minDate}_to_${maxDate}.${extension}`;
}

function prefixSafe(prefix: string): string {
  return prefix.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export interface PreparedAttendanceRow {
  date: string;
  rawDate: string;
  subject: string;
  attendance: string;
}

/**
 * Prepares and sorts attendance data for export.
 * Sorting rules:
 * 1. Date, ascending.
 * 2. Subject name, ascending within the date.
 * Stable secondary fallback: period number.
 */
export function prepareAttendanceExportData(records: AttendanceRecord[]): {
  sortedRecords: AttendanceRecord[];
  rows: PreparedAttendanceRow[];
} {
  if (!records || records.length === 0) {
    return { sortedRecords: [], rows: [] };
  }

  // 1. Sort ascending by date, then ascending by subject
  const sortedRecords = [...records].sort((a, b) => {
    const rawDateA = (a.date || "").split("T")[0];
    const rawDateB = (b.date || "").split("T")[0];
    const dateComp = rawDateA.localeCompare(rawDateB);
    if (dateComp !== 0) return dateComp;

    const nameA = (a.subjectName || a.subjectCode || "").trim();
    const nameB = (b.subjectName || b.subjectCode || "").trim();
    const subjComp = nameA.localeCompare(nameB);
    if (subjComp !== 0) return subjComp;

    return (a.period || 0) - (b.period || 0);
  });

  // 2. Map to required 3 columns: Date | Subject | Attendance
  const rows: PreparedAttendanceRow[] = sortedRecords.map((r) => ({
    date: formatDateSafe(r.date),
    rawDate: (r.date || "").split("T")[0],
    subject: (r.subjectName || r.subjectCode || "Unknown Subject").trim(),
    attendance: formatAttendanceStatus(r.status),
  }));

  return { sortedRecords, rows };
}

/**
 * Trigger client-side file download via Blob.
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Generates and triggers download of native Excel (.xlsx) file.
 * Returns the downloaded filename.
 */
export async function exportAttendanceToXLSX(
  records: AttendanceRecord[],
  options?: { filename?: string }
): Promise<string> {
  const XLSX = await import("xlsx");
  const { rows } = prepareAttendanceExportData(records);
  const filename = options?.filename || generateExportFilename(records, "xlsx");

  const header = ["Date", "Subject", "Attendance"];
  const sheetData = [
    header,
    ...rows.map((r) => [r.date, r.subject, r.attendance]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column width formatting (Date: 16, Subject: 38, Attendance: 16)
  ws["!cols"] = [{ wch: 16 }, { wch: 38 }, { wch: 16 }];

  // Freeze top header row
  ws["!views"] = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];
  ws["!freeze"] = { xSplit: "0", ySplit: "1" };

  // Enable autofilters across all 3 columns
  const lastRow = Math.max(1, rows.length + 1);
  ws["!autofilter"] = { ref: `A1:C${lastRow}` };

  // Bold headers
  ["A1", "B1", "C1"].forEach((ref) => {
    if (ws[ref]) {
      ws[ref].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "F4F4F5" } },
      };
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");

  const buffer = XLSX.write(wb, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  });

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  triggerBrowserDownload(blob, filename);
  return filename;
}

/**
 * Generates and triggers download of RFC 4180 UTF-8 CSV file.
 * Returns the downloaded filename.
 */
export function exportAttendanceToCSV(
  records: AttendanceRecord[],
  options?: { filename?: string }
): string {
  const { rows } = prepareAttendanceExportData(records);
  const filename = options?.filename || generateExportFilename(records, "csv");

  const lines = [
    "Date,Subject,Attendance",
    ...rows.map(
      (r) =>
        `${escapeCSV(r.date)},${escapeCSV(r.subject)},${escapeCSV(r.attendance)}`
    ),
  ];

  // Prepend UTF-8 BOM (\uFEFF) to guarantee Excel & Google Sheets detect UTF-8 encoding
  const csvContent = "\uFEFF" + lines.join("\r\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  triggerBrowserDownload(blob, filename);
  return filename;
}
