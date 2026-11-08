import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import { serverAppointCR, serverRevokeCR } from "@/lib/serverAdmin";

/**
 * POST /api/admin/cr
 * Appoints a student as a Class Representative (CR / Class Admin) with strict scope validation.
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
        { success: false, error: "Access Denied: Administrator privileges required to appoint Class CRs." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { studentId, branchCode, section, batch, academicSession, semester } = body;

    const result = await serverAppointCR(user, {
      studentId,
      branchCode,
      section,
      batch,
      academicSession,
      semester,
    });

    if (!result.success) {
      const status = result.error?.includes("Access Denied")
        ? 403
        : result.error?.includes("Conflict")
        ? 409
        : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      student: result.student,
      message: `Successfully appointed ${result.student?.fullName} as Class Representative.`,
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/cr:", error);
    return NextResponse.json(
      { success: false, error: "Failed to appoint Class Representative." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/cr
 * Revokes Class Representative (CR) privileges and restores the student role.
 * Strictly restricted to verified Administrators.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Access Denied: Administrator privileges required to revoke Class CR privileges." },
        { status: 403 }
      );
    }

    let studentId = req.nextUrl.searchParams.get("studentId") || req.nextUrl.searchParams.get("id");
    if (!studentId) {
      try {
        const body = await req.json();
        studentId = body.studentId || body.id;
      } catch {
        // Body may be empty
      }
    }

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: studentId is required." },
        { status: 400 }
      );
    }

    const result = await serverRevokeCR(user, studentId);

    if (!result.success) {
      const status = result.error?.includes("Access Denied") ? 403 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      student: result.student,
      message: `Successfully revoked Class Representative privileges for ${result.student?.fullName}.`,
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/admin/cr:", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke Class Representative privileges." },
      { status: 500 }
    );
  }
}
