import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import { parseExcelTimetable } from "@/lib/timetableImportParser";

/**
 * POST /api/admin/timetable/upload
 * Parses and validates an uploaded timetable spreadsheet (.xlsx) before publishing.
 * Strictly restricted to verified Administrators.
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const academicYear = (formData.get("academicYear") as string) || "1st Year";
    const semester = (formData.get("semester") as string) || "Semester I";
    const branchCode = (formData.get("branchCode") as string) || "IT";
    const section = (formData.get("section") as string) || "SEC-A";
    const batch = (formData.get("batch") as string) || "ALL";
    const room = (formData.get("room") as string) || undefined;
    const session = (formData.get("session") as string) || "2026-27";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No timetable spreadsheet file provided." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await parseExcelTimetable(buffer, {
      academicYear,
      semester,
      branchCode,
      section,
      batch,
      room,
      session,
    });

    return NextResponse.json({
      success: true,
      timetable: result.timetable,
      isValid: result.isValid,
      issues: result.issues,
      slotCount: result.slotCount,
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/timetable/upload:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to parse timetable file." },
      { status: 500 }
    );
  }
}
