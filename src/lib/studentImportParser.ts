import * as XLSX from "xlsx";
import { normalizeSection, BRANCH_NAMES_MAP } from "@/data/extractedTimetables";
import {
  ParsedStudentRow,
  ImportPreviewSummary,
  VALID_BRANCHES,
  VALID_ACADEMIC_YEARS,
  normalizeBranchCode,
  normalizeAcademicYear,
  defaultSemesterForYear,
} from "./studentImportTypes";

export * from "./studentImportTypes";

/**
 * Maps arbitrary header names to standard AttendX student fields
 */
export function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const clean = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

  headers.forEach((header) => {
    const c = clean(header);
    if (!mapping.fullName && (c.includes("studentname") || c.includes("fullname") || c.includes("candidatename") || c === "name")) {
      mapping.fullName = header;
    } else if (!mapping.rollNumber && (c.includes("rollno") || c.includes("rollnumber") || c === "roll" || c === "rno")) {
      mapping.rollNumber = header;
    } else if (!mapping.enrollmentNumber && (c.includes("enroll") || c.includes("enrol") || c.includes("enrno") || c.includes("regno") || c.includes("registration"))) {
      mapping.enrollmentNumber = header;
    } else if (!mapping.fatherName && (c.includes("father") || c.includes("parent"))) {
      mapping.fatherName = header;
    } else if (!mapping.branchCode && (c.includes("branch") || c.includes("dept") || c.includes("department") || c.includes("course"))) {
      mapping.branchCode = header;
    } else if (!mapping.section && (c.includes("section") || c === "sec")) {
      mapping.section = header;
    } else if (!mapping.batch && (c.includes("batch") || c === "group")) {
      mapping.batch = header;
    } else if (!mapping.academicYear && (c.includes("year") || c === "yr")) {
      mapping.academicYear = header;
    } else if (!mapping.semester && (c.includes("semester") || c === "sem")) {
      mapping.semester = header;
    } else if (!mapping.email && (c.includes("email") || c === "mail")) {
      mapping.email = header;
    }
  });

  return mapping;
}

/**
 * Parse an Excel file (.xlsx, .xls) and extract student rows
 */
export async function parseExcelStudents(
  buffer: Buffer,
  customMapping?: Record<string, string>,
  defaultContext?: { academicYear?: string; session?: string; semester?: string }
): Promise<{ headers: string[]; mapping: Record<string, string>; rows: Record<string, any>[] }> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("The uploaded Excel workbook contains no sheets.");
  }

  // Pick first non-empty sheet
  let targetSheetName = workbook.SheetNames[0];
  let sheet = workbook.Sheets[targetSheetName];
  for (const sName of workbook.SheetNames) {
    const s = workbook.Sheets[sName];
    if (s && s["!ref"]) {
      targetSheetName = sName;
      sheet = s;
      break;
    }
  }

  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rawData || rawData.length === 0) {
    throw new Error("The selected Excel sheet is completely empty.");
  }

  // Find header row: row with the most text columns matching student keywords
  let headerRowIndex = 0;
  let maxScore = -1;
  const keywords = ["name", "roll", "enroll", "branch", "sec", "batch", "email"];

  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (!Array.isArray(row)) continue;
    let score = 0;
    row.forEach((cell) => {
      const cellStr = String(cell || "").toLowerCase();
      keywords.forEach((kw) => {
        if (cellStr.includes(kw)) score++;
      });
    });
    if (score > maxScore) {
      maxScore = score;
      headerRowIndex = i;
    }
  }

  const rawHeaders = (rawData[headerRowIndex] || []).map((h: any, idx: number) => {
    const str = String(h || "").trim();
    return str || `Column_${idx + 1}`;
  });

  const mapping = customMapping || detectColumnMapping(rawHeaders);
  const rows: Record<string, any>[] = [];

  for (let r = headerRowIndex + 1; r < rawData.length; r++) {
    const row = rawData[r];
    if (!Array.isArray(row) || row.every((c) => String(c || "").trim() === "")) continue;

    const rowObj: Record<string, any> = {};
    rawHeaders.forEach((h, cIdx) => {
      rowObj[h] = row[cIdx] !== undefined ? String(row[cIdx]).trim() : "";
    });
    rows.push(rowObj);
  }

  return { headers: rawHeaders, mapping, rows };
}

/**
 * Parse selectable text from a PDF file using pdf-parse PDFParse engine
 */
export async function parsePdfStudents(
  buffer: Buffer,
  defaultContext?: { academicYear?: string; session?: string; semester?: string }
): Promise<{ headers: string[]; mapping: Record<string, string>; rows: Record<string, any>[] }> {
  let text = "";
  try {
    const pdfModule = await import("pdf-parse");
    const PDFParse = (pdfModule as any).PDFParse || (pdfModule as any).default || pdfModule;
    if (typeof PDFParse === "function") {
      const parser = new PDFParse({ data: buffer });
      const textObj = await parser.getText();
      text = textObj?.text || "";
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
    } else {
      text = buffer.toString("utf-8");
    }
  } catch (parseErr: any) {
    throw new Error(
      `PDF parsing error: ${parseErr.message}. Please upload an Excel (.xlsx) file or ensure the PDF is text-selectable.`
    );
  }

  if (!text || text.trim().length === 0) {
    throw new Error(
      "The uploaded PDF contains no selectable text. It may be a scanned image. Please upload an Excel (.xlsx) file or a text-based PDF."
    );
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows: Record<string, any>[] = [];
  const rollRegex = /\b(202[0-9]{7})\b/;
  const branchPattern = /\b(IT|CSE|ECE|EE|ME|CE|CHE|ECE\(IOT\))\b/i;

  for (const line of lines) {
    const rollMatch = line.match(rollRegex);
    if (!rollMatch) continue;

    const roll = rollMatch[1];
    const tokens = line.split(/\s+/);
    const branchMatch = line.match(branchPattern);
    const branch = branchMatch ? branchMatch[1].toUpperCase() : "";

    let section = "SEC-A";
    const secMatch = line.match(/\b(SEC-[A-C]|[A-C])\b/i);
    if (secMatch) {
      section = normalizeSection(secMatch[1]);
    }

    let batch = "P1";
    const batchMatch = line.match(/\b(P[1-4])\b/i);
    if (batchMatch) {
      batch = batchMatch[1].toUpperCase();
    }

    let name = "Student";
    const rollIndex = tokens.indexOf(roll);
    if (rollIndex > 0) {
      const possibleNameTokens = tokens.slice(0, rollIndex).filter((t) => !/^\d+$/.test(t));
      if (possibleNameTokens.length > 0) {
        name = possibleNameTokens.join(" ");
      }
    } else if (rollIndex === 0 && tokens.length > 1) {
      const possibleNameTokens = tokens.slice(1).filter((t) => !/^\d+$/.test(t) && !branchPattern.test(t));
      if (possibleNameTokens.length > 0) {
        name = possibleNameTokens.slice(0, 3).join(" ");
      }
    }

    rows.push({
      fullName: name,
      rollNumber: roll,
      branchCode: branch,
      section,
      batch,
    });
  }

  if (rows.length === 0) {
    throw new Error(
      "Could not detect structured student records in the PDF. Please check the formatting or provide an Excel (.xlsx) file."
    );
  }

  const headers = ["fullName", "rollNumber", "branchCode", "section", "batch"];
  const mapping: Record<string, string> = {
    fullName: "fullName",
    rollNumber: "rollNumber",
    branchCode: "branchCode",
    section: "section",
    batch: "batch",
  };

  return { headers, mapping, rows };
}

/**
 * Validates, normalizes, and compares student rows against DB to prepare preview
 */
export function processStudentRecordsForPreview(
  rawRows: Record<string, any>[],
  mapping: Record<string, string>,
  existingStudents: { rollNumber?: string; enrollmentNumber?: string; email?: string }[],
  defaultContext?: {
    academicYear?: string;
    session?: string;
    semester?: string;
    branchCode?: string;
    section?: string;
  }
): ImportPreviewSummary {
  const existingRolls = new Set(
    existingStudents.map((s) => (s.rollNumber || "").trim().toLowerCase()).filter(Boolean)
  );
  const existingEnrolls = new Set(
    existingStudents.map((s) => (s.enrollmentNumber || "").trim().toLowerCase()).filter(Boolean)
  );

  const fileRolls = new Set<string>();
  const fileEnrolls = new Set<string>();

  const parsedRecords: ParsedStudentRow[] = [];

  let validCount = 0;
  let duplicateCount = 0;
  let existingCount = 0;
  let invalidCount = 0;

  const defaultYear = defaultContext?.academicYear || "1st Year";
  const defaultSession = defaultContext?.session || "2026-27";
  const defaultSemester = defaultContext?.semester || defaultSemesterForYear(defaultYear);

  rawRows.forEach((row, idx) => {
    const getVal = (field: string) => {
      const mappedHeader = mapping[field];
      return mappedHeader && row[mappedHeader] !== undefined ? String(row[mappedHeader]).trim() : "";
    };

    const fullName = getVal("fullName") || `Student ${idx + 1}`;
    const rollNumber = getVal("rollNumber");
    const enrollmentNumber = getVal("enrollmentNumber") || undefined;
    const fatherName = getVal("fatherName") || undefined;

    let branchCode = normalizeBranchCode(getVal("branchCode") || defaultContext?.branchCode);
    let section = normalizeSection(getVal("section") || defaultContext?.section || "SEC-A");
    let batch = (getVal("batch") || "P1").toUpperCase();
    if (!["P1", "P2", "P3", "P4", "ALL"].includes(batch)) batch = "P1";

    const academicYear = normalizeAcademicYear(getVal("academicYear"), defaultYear);
    const semester = getVal("semester") || defaultSemesterForYear(academicYear);
    const academicSession = getVal("academicSession") || defaultSession;

    let email = getVal("email");
    if (!email && rollNumber) {
      email = `student.${rollNumber}@attendx.mmmut.ac.in`;
    }

    const errors: string[] = [];

    // Validation checks
    if (!rollNumber) {
      errors.push("Missing Roll Number.");
    } else if (!/^[0-9a-zA-Z_-]{4,20}$/.test(rollNumber)) {
      errors.push(`Invalid Roll Number format: "${rollNumber}".`);
    }

    if (!branchCode) {
      errors.push("Missing or unresolvable Branch Code.");
    } else if (!VALID_BRANCHES.includes(branchCode)) {
      errors.push(`Unrecognized branch code: "${branchCode}".`);
    }

    if (!fullName || fullName.length < 2) {
      errors.push("Missing or invalid Student Full Name.");
    }

    const branchName = BRANCH_NAMES_MAP[branchCode] || branchCode;

    const rowId = `import-row-${idx + 1}-${Date.now()}`;

    // Determine status
    let status: ParsedStudentRow["status"] = "VALID";

    if (errors.length > 0) {
      status = "INVALID";
      invalidCount++;
    } else if (
      (rollNumber && existingRolls.has(rollNumber.toLowerCase())) ||
      (enrollmentNumber && existingEnrolls.has(enrollmentNumber.toLowerCase()))
    ) {
      status = "ALREADY_IN_DB";
      errors.push("Student record already exists in database.");
      existingCount++;
    } else if (
      (rollNumber && fileRolls.has(rollNumber.toLowerCase())) ||
      (enrollmentNumber && fileEnrolls.has(enrollmentNumber.toLowerCase()))
    ) {
      status = "DUPLICATE_IN_FILE";
      errors.push("Duplicate entry in this uploaded file.");
      duplicateCount++;
    } else {
      status = "VALID";
      validCount++;
    }

    if (rollNumber) fileRolls.add(rollNumber.toLowerCase());
    if (enrollmentNumber) fileEnrolls.add(enrollmentNumber.toLowerCase());

    parsedRecords.push({
      id: rowId,
      fullName,
      rollNumber,
      enrollmentNumber,
      fatherName,
      branchCode,
      branchName,
      section,
      batch,
      academicYear,
      semester,
      academicSession,
      email,
      status,
      errors,
      isSkipped: status !== "VALID",
    });
  });

  const willAddCount = parsedRecords.filter((r) => r.status === "VALID" && !r.isSkipped).length;

  return {
    totalDetected: parsedRecords.length,
    validCount,
    duplicateCount,
    existingCount,
    invalidCount,
    willAddCount,
    detectedHeaders: Object.values(mapping),
    columnMapping: mapping,
    records: parsedRecords,
  };
}
