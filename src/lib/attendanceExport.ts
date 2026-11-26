import type {
  AttendanceRecord,
  AttendanceStatus,
  UniversityTimetable,
} from "../types";

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
 * Format date string safely as "DD/MM/YYYY" without timezone offset shift.
 * Handles "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss" -> "DD/MM/YYYY" (e.g. "02/02/2026").
 */
export function formatDateSlash(rawDate?: string): string {
  if (!rawDate) return "";
  const clean = rawDate.split("T")[0].trim();
  const parts = clean.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0];
    const month = parts[1].padStart(2, "0");
    const day = parts[2].padStart(2, "0");
    return `${day}/${month}/${year}`;
  }
  return clean;
}

/**
 * Format date string safely as "DD MMM YYYY" (e.g. "24 Nov 2026").
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
 * Format database status string into single-letter code:
 * "PRESENT" -> "P"
 * "ABSENT" -> "A"
 * "CANCELLED" -> "C"
 */
export function formatStatusCode(status?: AttendanceStatus | string): "P" | "A" | "C" {
  if (!status) return "P";
  const s = status.toUpperCase();
  if (s === "ABSENT") return "A";
  if (s === "CANCELLED") return "C";
  return "P";
}

/**
 * Format period cell content:
 * e.g. "BSM 141 - P", "BHS 101 - A"
 */
export function formatPeriodAttendanceCode(
  subjectCode: string,
  status?: AttendanceStatus | string
): string {
  const code = (subjectCode || "").trim();
  if (!code) return "";
  const statusCode = formatStatusCode(status);
  return `${code} - ${statusCode}`;
}

/**
 * Format database status string into human-friendly Title Case:
 * "PRESENT" -> "Present"
 * "ABSENT" -> "Absent"
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
 * Generates descriptive filename according to date range and format.
 * Examples:
 * - AttendX_Attendance_Matrix_2026-02-02.xlsx
 * - AttendX_Attendance_Matrix_2026-02-02_to_2026-02-04.xlsx
 */
export function generateMatrixFilename(
  dates: string[],
  extension: "xlsx" | "csv",
  prefix = "AttendX_Attendance_Matrix"
): string {
  const nowStr = new Date().toISOString().slice(0, 10);
  if (!dates || dates.length === 0) {
    return `${prefix}_${nowStr}.${extension}`;
  }

  const sortedDates = [...dates].filter(Boolean).sort();
  if (sortedDates.length === 0) {
    return `${prefix}_${nowStr}.${extension}`;
  }

  const minDate = sortedDates[0];
  const maxDate = sortedDates[sortedDates.length - 1];

  if (minDate === maxDate) {
    return `${prefix}_${minDate}.${extension}`;
  }

  return `${prefix}_${minDate}_to_${maxDate}.${extension}`;
}

export interface MatrixRow {
  date: string; // Formatted "DD/MM/YYYY"
  rawDate: string; // "YYYY-MM-DD"
  period1: string;
  period2: string;
  period3: string;
  period4: string;
  period5: string;
  period6: string;
  period7: string;
  period8: string;
  hasAbsent: { [period: number]: boolean };
}

export interface MatrixExportFilterOptions {
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  selectedSubjectCodes?: string[]; // array of subject codes to include
  timetable?: UniversityTimetable | null;
}

export interface PreparedMatrixResult {
  matrixRows: MatrixRow[];
  datesIncluded: string[]; // sorted "YYYY-MM-DD"
  unmappedRecords: AttendanceRecord[];
  totalRecordsMatched: number;
  presentCount: number;
  absentCount: number;
}

/**
 * Resolves period number (1 to 8) for an attendance record.
 * 1. Checks r.period if valid 1..8
 * 2. Falls back to timetable lookup if available
 * 3. Returns null if unmappable
 */
export function resolveRecordPeriod(
  record: AttendanceRecord,
  timetable?: UniversityTimetable | null
): number | null {
  if (typeof record.period === "number" && record.period >= 1 && record.period <= 8) {
    return record.period;
  }

  // Attempt fallback via timetable mapping if available
  if (timetable && record.date && record.subjectCode) {
    try {
      // Find day of week (e.g. "Mon", "Tue", "Wednesday", etc.)
      const dateParts = record.date.split("-");
      if (dateParts.length === 3) {
        const d = new Date(
          parseInt(dateParts[0], 10),
          parseInt(dateParts[1], 10) - 1,
          parseInt(dateParts[2], 10),
          12,
          0,
          0
        );
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const dayName = dayNames[d.getDay()];

        const matchedSlot = timetable.slots.find(
          (s) =>
            s.day.toLowerCase().startsWith(dayName.slice(0, 3).toLowerCase()) &&
            s.subjectCode === record.subjectCode &&
            s.period >= 1 &&
            s.period <= 8
        );

        if (matchedSlot) {
          return matchedSlot.period;
        }
      }
    } catch {
      // Ignore fallback error
    }
  }

  return null;
}

/**
 * Builds the 8-period daily attendance matrix from attendance records.
 * Rules:
 * - Column 1: Date (DD/MM/YYYY)
 * - Columns 2-9: Period 1 through Period 8
 * - Chronological ascending date sorting
 * - Cell format: "Subject Code - Status" (e.g. "BSM 141 - P", "BHS 101 - A")
 * - If a date has no records matching filters, no row is created
 * - Unselected subjects leave their period empty
 */
export function prepareAttendanceMatrixData(
  records: AttendanceRecord[],
  options?: MatrixExportFilterOptions
): PreparedMatrixResult {
  const startDate = options?.startDate?.trim();
  const endDate = options?.endDate?.trim();
  const selectedSubjects = options?.selectedSubjectCodes
    ? new Set(options.selectedSubjectCodes.map((s) => s.trim().toUpperCase()))
    : null;

  const unmappedRecords: AttendanceRecord[] = [];
  let totalRecordsMatched = 0;
  let presentCount = 0;
  let absentCount = 0;

  // 1. Group records by date (YYYY-MM-DD)
  const dateBuckets = new Map<string, AttendanceRecord[]>();

  for (const r of records) {
    if (!r.date) continue;
    const cleanDate = r.date.split("T")[0];

    // Date range filter (inclusive)
    if (startDate && cleanDate < startDate) continue;
    if (endDate && cleanDate > endDate) continue;

    // Subject filter
    const subjCode = (r.subjectCode || "").trim().toUpperCase();
    if (selectedSubjects && !selectedSubjects.has(subjCode)) {
      continue;
    }

    if (!dateBuckets.has(cleanDate)) {
      dateBuckets.set(cleanDate, []);
    }
    dateBuckets.get(cleanDate)!.push(r);
  }

  // 2. Sort dates in ascending chronological order
  const sortedDates = Array.from(dateBuckets.keys()).sort();

  // 3. Construct matrix rows
  const matrixRows: MatrixRow[] = [];

  for (const dateStr of sortedDates) {
    const dayRecords = dateBuckets.get(dateStr) || [];
    if (dayRecords.length === 0) continue;

    const periodCells: { [period: number]: string[] } = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
    };
    const hasAbsent: { [period: number]: boolean } = {
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false,
      7: false,
      8: false,
    };

    for (const r of dayRecords) {
      const periodNum = resolveRecordPeriod(r, options?.timetable);

      if (!periodNum || periodNum < 1 || periodNum > 8) {
        unmappedRecords.push(r);
        console.warn(
          `[AttendanceMatrix] Unmapped record: id=${r.id}, date=${r.date}, subject=${r.subjectCode}, period=${r.period}`
        );
        continue;
      }

      totalRecordsMatched++;
      const statusCode = formatStatusCode(r.status);
      if (statusCode === "A") absentCount++;
      if (statusCode === "P") presentCount++;

      const cellSnippet = formatPeriodAttendanceCode(r.subjectCode, r.status);
      periodCells[periodNum].push(cellSnippet);

      if (statusCode === "A") {
        hasAbsent[periodNum] = true;
      }
    }

    // Only output a row if at least one period cell has an entry
    const hasAnyPeriod = Object.values(periodCells).some((arr) => arr.length > 0);
    if (!hasAnyPeriod) continue;

    matrixRows.push({
      date: formatDateSlash(dateStr),
      rawDate: dateStr,
      period1: periodCells[1].join(", "),
      period2: periodCells[2].join(", "),
      period3: periodCells[3].join(", "),
      period4: periodCells[4].join(", "),
      period5: periodCells[5].join(", "),
      period6: periodCells[6].join(", "),
      period7: periodCells[7].join(", "),
      period8: periodCells[8].join(", "),
      hasAbsent,
    });
  }

  return {
    matrixRows,
    datesIncluded: sortedDates,
    unmappedRecords,
    totalRecordsMatched,
    presentCount,
    absentCount,
  };
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

const PERIOD_COLUMN_LETTERS = ["B", "C", "D", "E", "F", "G", "H", "I"];

/**
 * Generates and triggers download of native Excel (.xlsx) 8-period attendance matrix.
 * Highlights absent cells in RED (#FFC7CE fill with #9C0006 text).
 */
export async function exportAttendanceMatrixToXLSX(
  records: AttendanceRecord[],
  options?: MatrixExportFilterOptions & { filename?: string }
): Promise<string> {
  const XLSX = await import("xlsx-js-style");
  const { matrixRows, datesIncluded } = prepareAttendanceMatrixData(records, options);

  const filename =
    options?.filename || generateMatrixFilename(datesIncluded, "xlsx");

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

  // Column widths: Date: 14, Period 1..8: 18 each
  ws["!cols"] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];

  // Freeze top header row
  ws["!views"] = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];
  ws["!freeze"] = { xSplit: "0", ySplit: "1" };

  // Enable autofilters across all 9 columns
  const lastRow = Math.max(1, matrixRows.length + 1);
  ws["!autofilter"] = { ref: `A1:I${lastRow}` };

  const borderStyle = {
    top: { style: "thin", color: { rgb: "E4E4E7" } },
    bottom: { style: "thin", color: { rgb: "E4E4E7" } },
    left: { style: "thin", color: { rgb: "E4E4E7" } },
    right: { style: "thin", color: { rgb: "E4E4E7" } },
  };

  // Header row styling (A1:I1)
  const headerLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  headerLetters.forEach((col) => {
    const cellRef = `${col}1`;
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E1E2D" }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle,
      };
    }
  });

  // Data rows styling
  matrixRows.forEach((row, idx) => {
    const rowNum = idx + 2;

    // Date column (Column A)
    const dateRef = `A${rowNum}`;
    if (ws[dateRef]) {
      ws[dateRef].s = {
        font: { bold: true, color: { rgb: "18181B" } },
        fill: { fgColor: { rgb: "F4F4F5" }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle,
      };
    }

    // Period columns (B to I)
    PERIOD_COLUMN_LETTERS.forEach((colLetter, pIdx) => {
      const periodNum = pIdx + 1;
      const cellRef = `${colLetter}${rowNum}`;
      const cell = ws[cellRef];
      if (!cell) return;

      const cellText = String(cell.v || "").trim();

      if (!cellText) {
        // Empty period
        cell.s = {
          alignment: { horizontal: "center", vertical: "center" },
          border: borderStyle,
        };
      } else if (row.hasAbsent[periodNum] || cellText.includes("- A")) {
        // Red background for absent records
        cell.s = {
          fill: { fgColor: { rgb: "FFC7CE" }, patternType: "solid" },
          font: { color: { rgb: "9C0006" }, bold: true },
          alignment: { horizontal: "center", vertical: "center" },
          border: borderStyle,
        };
      } else {
        // Normal / Present period
        cell.s = {
          fill: { fgColor: { rgb: "F0FDF4" }, patternType: "solid" },
          font: { color: { rgb: "166534" }, bold: true },
          alignment: { horizontal: "center", vertical: "center" },
          border: borderStyle,
        };
      }
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance Matrix");

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
 * Generates and triggers download of RFC 4180 UTF-8 CSV 8-period attendance matrix.
 */
export function exportAttendanceMatrixToCSV(
  records: AttendanceRecord[],
  options?: MatrixExportFilterOptions & { filename?: string }
): string {
  const { matrixRows, datesIncluded } = prepareAttendanceMatrixData(records, options);

  const filename =
    options?.filename || generateMatrixFilename(datesIncluded, "csv");

  const header =
    "Date,Period 1,Period 2,Period 3,Period 4,Period 5,Period 6,Period 7,Period 8";

  const lines = [
    header,
    ...matrixRows.map(
      (r) =>
        `${escapeCSV(r.date)},${escapeCSV(r.period1)},${escapeCSV(r.period2)},${escapeCSV(r.period3)},${escapeCSV(r.period4)},${escapeCSV(r.period5)},${escapeCSV(r.period6)},${escapeCSV(r.period7)},${escapeCSV(r.period8)}`
    ),
  ];

  // Prepend UTF-8 BOM (\uFEFF)
  const csvContent = "\uFEFF" + lines.join("\r\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  triggerBrowserDownload(blob, filename);
  return filename;
}
