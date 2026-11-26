import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import {
  serverGetDateOverrides,
  serverSaveDateOverride,
  serverDeleteDateOverride,
} from "@/lib/serverTimetableOverrides";
import { DateSpecificOverride } from "@/types";

/**
 * GET /api/timetable/overrides
 * Fetch date-specific overrides (one-time extra classes, date cancellations, rescheduling).
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get("date") || undefined;
    const scopeParam = searchParams.get("scope") as "PERSONAL" | "CLASS" | null;

    const branchCode =
      user.role === "admin"
        ? (searchParams.get("branchCode") || undefined)
        : (user.managedBranchCode || user.branchCode);
    const section =
      user.role === "admin"
        ? (searchParams.get("section") || undefined)
        : (user.managedSection || user.section);
    const academicYear =
      user.role === "admin"
        ? (searchParams.get("academicYear") || undefined)
        : (user.academicYear || "1st Year");

    const overrides = await serverGetDateOverrides({
      date,
      scope: scopeParam || undefined,
      branchCode,
      section,
      academicYear,
      studentId: user.id,
    });

    return NextResponse.json({ success: true, overrides });
  } catch (error: any) {
    console.error("Error in GET /api/timetable/overrides:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch timetable overrides." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/timetable/overrides
 * Create or update a date-specific override (Extra class or Cancel occurrence).
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const body: DateSpecificOverride = await req.json();

    const result = await serverSaveDateOverride(user, body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Timetable override saved successfully.",
      override: result.override,
    });
  } catch (error: any) {
    console.error("Error in POST /api/timetable/overrides:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save timetable override." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/timetable/overrides
 * Delete a date-specific override.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const searchParams = req.nextUrl.searchParams;
    const overrideId = searchParams.get("id");

    if (!overrideId) {
      return NextResponse.json(
        { success: false, error: "Missing override ID parameter." },
        { status: 400 }
      );
    }

    const result = await serverDeleteDateOverride(user, overrideId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Timetable override deleted successfully.",
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/timetable/overrides:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete timetable override." },
      { status: 500 }
    );
  }
}
