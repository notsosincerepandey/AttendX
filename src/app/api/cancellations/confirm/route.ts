import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import { serverConfirmCancellationReport } from "@/lib/serverCancellations";

/**
 * POST /api/cancellations/confirm
 * Confirms an existing cancellation report.
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
    console.error("Error in POST /api/cancellations/confirm:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to confirm cancellation report." },
      { status: 500 }
    );
  }
}
