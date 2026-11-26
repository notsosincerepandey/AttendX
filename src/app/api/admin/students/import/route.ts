import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import {
  parseExcelStudents,
  parsePdfStudents,
  processStudentRecordsForPreview,
} from "@/lib/studentImportParser";
import { serverBulkImportStudents } from "@/lib/serverAdmin";

/**
 * POST /api/admin/students/import
 * Dual-mode endpoint:
 * 1. mode="preview": Parses uploaded Excel / PDF, checks DB duplicates, returns rich preview statistics.
 * 2. mode="commit": Executes atomic batch account creation and profiles insertion.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Access Denied: Administrator privileges required." },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    // MODE A: Multipart Form Data with file upload (Preview generation)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const academicYear = (formData.get("academicYear") as string) || "1st Year";
      const session = (formData.get("session") as string) || "2026-27";
      const semester = (formData.get("semester") as string) || undefined;
      const branchCode = (formData.get("branchCode") as string) || undefined;
      const section = (formData.get("section") as string) || undefined;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No student list file provided for import." },
          { status: 400 }
        );
      }

      const fileName = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let parsedData: { headers: string[]; mapping: Record<string, string>; rows: Record<string, any>[] };

      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        parsedData = await parseExcelStudents(buffer, undefined, { academicYear, session, semester });
      } else if (fileName.endsWith(".pdf")) {
        parsedData = await parsePdfStudents(buffer, { academicYear, session, semester });
      } else {
        return NextResponse.json(
          { success: false, error: "Unsupported file format. Please upload an Excel (.xlsx, .xls) or PDF (.pdf) file." },
          { status: 400 }
        );
      }

      // Fetch existing students from database to detect existing accounts
      let existingStudents: { rollNumber?: string; enrollmentNumber?: string; email?: string }[] = [];
      try {
        const { createClient } = await import("@supabase/supabase-js");
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          );
          const { data: dbStudents } = await adminClient
            .from("student_profiles")
            .select("roll_number, enrollment_number, email");
          existingStudents = (dbStudents || []).map((s) => ({
            rollNumber: s.roll_number,
            enrollmentNumber: s.enrollment_number,
            email: s.email,
          }));
        }
      } catch (dbErr) {
        console.warn("Could not fetch existing students for duplicate check:", dbErr);
      }

      const preview = processStudentRecordsForPreview(
        parsedData.rows,
        parsedData.mapping,
        existingStudents,
        { academicYear, session, semester, branchCode, section }
      );

      return NextResponse.json({
        success: true,
        preview,
      });
    }

    // MODE B: JSON Commit of validated records
    const body = await req.json();
    const { mode, records } = body;

    if (mode === "commit") {
      if (!Array.isArray(records) || records.length === 0) {
        return NextResponse.json(
          { success: false, error: "No student records provided for commit." },
          { status: 400 }
        );
      }

      // Filter out invalid or skipped records
      const validToImport = records.filter(
        (r: any) => !r.isSkipped && r.status !== "INVALID" && r.rollNumber && r.branchCode
      );

      if (validToImport.length === 0) {
        return NextResponse.json(
          { success: false, error: "Zero valid records to import after filtering skipped rows." },
          { status: 400 }
        );
      }

      const result = await serverBulkImportStudents(user, validToImport);

      return NextResponse.json({
        success: result.success,
        importedCount: result.importedCount,
        failedCount: result.failedCount,
        errors: result.errors,
        message: `Successfully imported ${result.importedCount} student accounts.${
          result.failedCount > 0 ? ` (${result.failedCount} failed)` : ""
        }`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid import request. Specify mode='commit' or upload a file." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/admin/students/import:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process student import." },
      { status: 500 }
    );
  }
}
