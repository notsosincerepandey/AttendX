import * as XLSX from "xlsx";
import { TimetableSlot, UniversityTimetable, TimetableSubject, AttendanceCategory } from "@/types";
import { normalizeSection, BRANCH_NAMES_MAP } from "@/data/extractedTimetables";

export interface ParsedTimetableResult {
  timetable: UniversityTimetable;
  isValid: boolean;
  issues: {
    type: "missing" | "duplicate" | "conflict" | "format";
    message: string;
    slot?: TimetableSlot;
  }[];
  slotCount: number;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Validates timetable slots for structural consistency, duplicates, and conflicts.
 */
export function validateTimetableSlots(slots: TimetableSlot[]): {
  isValid: boolean;
  issues: { type: "missing" | "duplicate" | "conflict" | "format"; message: string; slot?: TimetableSlot }[];
} {
  const issues: { type: "missing" | "duplicate" | "conflict" | "format"; message: string; slot?: TimetableSlot }[] = [];
  const slotMap = new Map<string, TimetableSlot>();

  slots.forEach((slot, index) => {
    // 1. Missing fields
    if (!slot.subjectCode || !slot.subjectCode.trim()) {
      issues.push({
        type: "missing",
        message: `Slot #${index + 1} (${slot.day} Period ${slot.period}) is missing a Subject Code.`,
        slot,
      });
    }

    if (!slot.subjectName || !slot.subjectName.trim()) {
      issues.push({
        type: "missing",
        message: `Slot #${index + 1} (${slot.day} Period ${slot.period}) is missing a Subject Name.`,
        slot,
      });
    }

    if (!slot.room || !slot.room.trim()) {
      issues.push({
        type: "missing",
        message: `Slot #${index + 1} (${slot.day} Period ${slot.period}) is missing a Room Number.`,
        slot,
      });
    }

    if (slot.period < 1 || slot.period > 8) {
      issues.push({
        type: "format",
        message: `Slot #${index + 1} has invalid period ${slot.period}. Must be between 1 and 8.`,
        slot,
      });
    }

    if (!DAYS.includes(slot.day)) {
      issues.push({
        type: "format",
        message: `Slot #${index + 1} has invalid day "${slot.day}".`,
        slot,
      });
    }

    // 2. Conflict & duplicate check
    const exactKey = `${slot.day}-${slot.period}-${slot.batch || "ALL"}`;
    const allBatchKey = `${slot.day}-${slot.period}-ALL`;

    if (slotMap.has(exactKey)) {
      const existing = slotMap.get(exactKey)!;
      issues.push({
        type: "conflict",
        message: `Conflict on ${slot.day} Period ${slot.period} for Batch ${slot.batch}: Multiple classes scheduled (${slot.subjectCode} vs ${existing.subjectCode}).`,
        slot,
      });
    } else if (slot.batch !== "ALL" && slotMap.has(allBatchKey)) {
      const existing = slotMap.get(allBatchKey)!;
      issues.push({
        type: "conflict",
        message: `Conflict on ${slot.day} Period ${slot.period}: Batch ${slot.batch} class (${slot.subjectCode}) overlaps with full class session (${existing.subjectCode}).`,
        slot,
      });
    } else {
      slotMap.set(exactKey, slot);
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Parses timetable slots from Excel workbook.
 * Supports both tabular slot lists and grid matrix formats.
 */
export async function parseExcelTimetable(
  buffer: Buffer,
  meta: {
    academicYear: string;
    semester: string;
    branchCode: string;
    section: string;
    batch?: string;
    room?: string;
    session?: string;
  }
): Promise<ParsedTimetableResult> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("Excel file contains no readable sheets.");
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const slots: TimetableSlot[] = [];
  const subjectsMap = new Map<string, TimetableSubject>();

  // Detect format:
  // Format A: List format with columns: Day, Period, Subject Code, Subject Name, Category, Batch, Room, Faculty
  // Format B: Grid matrix with Days on Y axis, Periods 1-8 on X axis

  let isListFormat = false;
  let headerRowIndex = -1;

  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const rowStr = rawRows[r].map((c) => String(c).toLowerCase()).join(" ");
    if (rowStr.includes("day") && (rowStr.includes("period") || rowStr.includes("subject"))) {
      isListFormat = true;
      headerRowIndex = r;
      break;
    }
  }

  if (isListFormat && headerRowIndex >= 0) {
    const headers = rawRows[headerRowIndex].map((h) => String(h).trim().toLowerCase());
    const dayIdx = headers.findIndex((h) => h.includes("day"));
    const periodIdx = headers.findIndex((h) => h.includes("period"));
    const codeIdx = headers.findIndex((h) => h.includes("code") || h === "subject code");
    const nameIdx = headers.findIndex((h) => h.includes("name") || h === "subject name");
    const catIdx = headers.findIndex((h) => h.includes("category") || h.includes("type"));
    const batchIdx = headers.findIndex((h) => h.includes("batch"));
    const roomIdx = headers.findIndex((h) => h.includes("room"));
    const facIdx = headers.findIndex((h) => h.includes("faculty") || h.includes("teacher"));

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.every((c) => !c)) continue;

      const rawDay = dayIdx >= 0 ? String(row[dayIdx]).trim() : "Monday";
      const matchedDay = DAYS.find((d) => d.toLowerCase() === rawDay.toLowerCase()) || "Monday";
      const period = periodIdx >= 0 ? parseInt(String(row[periodIdx]).replace(/[^0-9]/g, "")) || 1 : 1;
      const subjectCode = codeIdx >= 0 ? String(row[codeIdx]).trim() : "SUB-101";
      const subjectName = nameIdx >= 0 ? String(row[nameIdx]).trim() : subjectCode;
      const rawCat = catIdx >= 0 ? String(row[catIdx]).trim() : "Theory";
      const category: AttendanceCategory =
        rawCat.toLowerCase().includes("lab") ? "Lab" : rawCat.toLowerCase().includes("tut") ? "Tutorial" : "Theory";
      const batch = batchIdx >= 0 && row[batchIdx] ? String(row[batchIdx]).trim().toUpperCase() : "ALL";
      const room = roomIdx >= 0 && row[roomIdx] ? String(row[roomIdx]).trim() : meta.room || "Room-TBD";
      const faculty = facIdx >= 0 && row[facIdx] ? String(row[facIdx]).trim() : undefined;

      if (subjectCode) {
        slots.push({
          day: matchedDay,
          period: Math.min(8, Math.max(1, period)),
          subjectCode,
          subjectName,
          category,
          batch,
          room,
          faculty,
        });

        if (!subjectsMap.has(subjectCode)) {
          subjectsMap.set(subjectCode, {
            code: subjectCode,
            name: subjectName,
            credits: category === "Lab" ? "1.5" : "3.0",
            faculty: faculty || "Faculty",
          });
        }
      }
    }
  } else {
    // Format B: Grid Matrix parser
    // Expect rows where first column is Day (Monday, Tuesday, etc.) and columns 1-8 are periods
    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;
      const firstCell = String(row[0]).trim();
      const matchedDay = DAYS.find((d) => d.toLowerCase() === firstCell.toLowerCase());

      if (matchedDay) {
        // Cells 1 to 8 represent periods 1 to 8
        for (let p = 1; p < Math.min(9, row.length); p++) {
          const cellContent = String(row[p]).trim();
          if (!cellContent || cellContent === "-" || cellContent.toLowerCase() === "recess") continue;

          // Parse cell format like: "BIT-101: PPS (TL-203)" or "BIT-101 (P1)"
          let subjectCode = cellContent;
          let subjectName = cellContent;
          let room = meta.room || "Room-TBD";
          let batch = "ALL";
          let category: AttendanceCategory = "Theory";

          if (cellContent.includes("Lab") || cellContent.includes("LAB")) {
            category = "Lab";
          } else if (cellContent.includes("Tut") || cellContent.includes("TUT")) {
            category = "Tutorial";
          }

          if (cellContent.includes("(P1)") || cellContent.includes("P1")) batch = "P1";
          else if (cellContent.includes("(P2)") || cellContent.includes("P2")) batch = "P2";

          const codeMatch = cellContent.match(/\b([A-Z]{2,4}-[0-9]{2,4}[A-Z]?)\b/);
          if (codeMatch) {
            subjectCode = codeMatch[1];
          }

          slots.push({
            day: matchedDay,
            period: p,
            subjectCode,
            subjectName,
            category,
            batch,
            room,
          });

          if (!subjectsMap.has(subjectCode)) {
            subjectsMap.set(subjectCode, {
              code: subjectCode,
              name: subjectName,
              credits: category === "Lab" ? "1.5" : "3.0",
              faculty: "Faculty",
            });
          }
        }
      }
    }
  }

  if (slots.length === 0) {
    throw new Error(
      "No valid timetable slots could be parsed from the uploaded file. Please verify the format."
    );
  }

  const { isValid, issues } = validateTimetableSlots(slots);

  const timetableId = `custom-tt-${meta.academicYear.toLowerCase().replace(/\s+/g, "-")}-${meta.branchCode.toLowerCase()}-${meta.section.toLowerCase()}-${Date.now().toString().slice(-4)}`;

  const timetable: UniversityTimetable = {
    id: timetableId,
    pageNumber: 1,
    degree: "B.Tech",
    branch: BRANCH_NAMES_MAP[meta.branchCode] || meta.branchCode,
    branchCode: meta.branchCode,
    section: normalizeSection(meta.section),
    room: meta.room || slots[0]?.room || "TL-Room",
    session: meta.session || "2026-27",
    academicYear: meta.academicYear,
    semester: meta.semester,
    batches: ["P1", "P2"],
    isVerified: true,
    status: "active",
    subjects: Array.from(subjectsMap.values()),
    slots,
  };

  return {
    timetable,
    isValid,
    issues,
    slotCount: slots.length,
  };
}
