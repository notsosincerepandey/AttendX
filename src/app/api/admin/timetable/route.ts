import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import { serverPublishTimetable, inspectTimetableConsistency, serverAdminStore } from "@/lib/serverAdmin";

/**
 * POST /api/admin/timetable
 * Publishes a master timetable with strict scope isolation and audit versioning.
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
        { success: false, error: "Access Denied: Administrator privileges required to publish master timetables." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { branchCode, section, scope, batch, academicSession, semester, timetable, versionLabel } = body;

    if (!timetable || !timetable.slots) {
      return NextResponse.json(
        { success: false, error: "Invalid timetable data payload." },
        { status: 400 }
      );
    }

    const result = await serverPublishTimetable(user, {
      branchCode,
      section,
      scope: scope || "ALL_BATCHES",
      batch,
      academicSession,
      semester,
      timetable,
      versionLabel,
    });

    if (!result.success) {
      const status = result.error?.includes("Access Denied") ? 403 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      version: result.version,
      message: `Successfully published timetable version ${result.version?.versionLabel} for ${result.version?.branchCode} ${result.version?.section} (Scope: ${scope || "ALL_BATCHES"}).`,
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/timetable:", error);
    return NextResponse.json(
      { success: false, error: "Failed to publish master timetable." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/timetable
 * Inspects timetable consistency or retrieves published versions.
 */
export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get("action");

    if (action === "inspect") {
      // In-memory or passed timetable inspection
      return NextResponse.json({ success: true, message: "Inspector ready." });
    }

    const versions = serverAdminStore.getAllPublishedTimetables();
    return NextResponse.json({
      success: true,
      versions,
      count: versions.length,
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/timetable:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve timetable data." },
      { status: 500 }
    );
  }
}
