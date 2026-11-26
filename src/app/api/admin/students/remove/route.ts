import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import {
  serverDeactivateStudent,
  serverBulkDeactivateStudents,
  serverReactivateStudent,
  serverDeleteStudentPermanently,
} from "@/lib/serverAdmin";

/**
 * POST /api/admin/students/remove
 * Authoritative endpoint for student deactivation, reactivation, and safe deletion.
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

    const body = await req.json();
    const { action = "deactivate", studentId, studentIds, reason } = body;

    // 1. Single student deactivation
    if (action === "deactivate" && studentId) {
      const result = await serverDeactivateStudent(user, { studentId, reason });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: "Student account successfully deactivated. Historical attendance data remains preserved.",
      });
    }

    // 2. Bulk student deactivation
    if (action === "deactivate" && Array.isArray(studentIds)) {
      if (studentIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "No student IDs provided for deactivation." },
          { status: 400 }
        );
      }
      const result = await serverBulkDeactivateStudents(user, { studentIds, reason });
      return NextResponse.json({
        success: result.success,
        deactivatedCount: result.deactivatedCount,
        errors: result.errors,
        message: `Successfully deactivated ${result.deactivatedCount} student accounts.`,
      });
    }

    // 3. Student reactivation
    if (action === "reactivate" && studentId) {
      const result = await serverReactivateStudent(user, { studentId });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: "Student account successfully reactivated. Full access restored.",
      });
    }

    // 4. Permanent deletion (Only when explicitly requested with confirmation)
    if (action === "delete" && studentId) {
      const result = await serverDeleteStudentPermanently(user, { studentId });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: "Student account and associated records permanently deleted.",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action or missing studentId / studentIds payload." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/admin/students/remove:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Operation failed." },
      { status: 500 }
    );
  }
}
