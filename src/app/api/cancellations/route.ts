import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import {
  serverGetCancellationReportsForUser,
  serverCreateCancellationReport,
  serverConfirmCancellationReport,
} from "@/lib/serverCancellations";

/**
 * GET /api/cancellations
 * Returns cancellation reports visible to the authenticated user.
 * - Admin: all reports.
 * - Class Admin: reports for their managed branch & section (or ALL).
 * - Student: reports for their enrolled branch & section (or ALL).
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user, token } = authResult;
    const reports = await serverGetCancellationReportsForUser(user, { token });

    return NextResponse.json({
      success: true,
      reports,
      count: reports.length,
      scope: {
        role: user.role,
        branchCode: user.managedBranchCode || user.branchCode,
        section: user.managedSection || user.section,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/cancellations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve cancellation reports." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cancellations
 * Submits a new cancellation report.
 * - Admin & Class Admin: authorized.
 * - Student: strictly forbidden (403).
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user, token } = authResult;

    if (user.role === "student") {
      return NextResponse.json(
        {
          success: false,
          error: "Access Denied: Students are not authorized to submit cancellation reports. Only Administrators and Class CRs can submit reports.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = await serverCreateCancellationReport(
      user,
      {
        date: body.date,
        period: body.period,
        subjectCode: body.subjectCode,
        reasonType: body.reasonType,
        description: body.description,
        branchCode: body.branchCode || user.managedBranchCode || user.branchCode,
        section: body.section || user.managedSection || user.section,
        batch: body.batch || user.managedBatch || user.batch || "ALL",
      },
      { token }
    );

    return NextResponse.json(
      {
        success: result.success,
        report: result.report,
        error: result.error,
      },
      { status: result.statusCode || (result.success ? 201 : 400) }
    );
  } catch (error: any) {
    console.error("Error in POST /api/cancellations:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit cancellation report." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cancellations
 * Confirms an existing cancellation report.
 * - Admin & Class Admin: authorized.
 * - Student: strictly forbidden (403).
 */
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user, token } = authResult;

    if (user.role === "student") {
      return NextResponse.json(
        {
          success: false,
          error: "Access Denied: Students are not authorized to confirm cancellation reports. Only Administrators and Class CRs can confirm reports.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const reportId = body.reportId || body.id;

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: "reportId is required." },
        { status: 400 }
      );
    }

    const result = await serverConfirmCancellationReport(user, reportId, { token });

    return NextResponse.json(
      {
        success: result.success,
        report: result.report,
        error: result.error,
      },
      { status: result.statusCode || (result.success ? 200 : 400) }
    );
  } catch (error: any) {
    console.error("Error in PATCH /api/cancellations:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to confirm cancellation report." },
      { status: 500 }
    );
  }
}
