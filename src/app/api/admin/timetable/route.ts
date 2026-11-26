import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import {
  serverPublishTimetable,
  serverGetTimetables,
  serverArchiveTimetable,
  serverActivateTimetable,
  serverDeleteTimetables,
  inspectTimetableConsistency,
} from "@/lib/serverAdmin";

/**
 * GET /api/admin/timetable
 * Retrieves published timetable versions with filtering by academicYear, semester, branch, section, and status.
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
      return NextResponse.json({ success: true, message: "Inspector ready." });
    }

    const academicYear = searchParams.get("academicYear") || undefined;
    const semester = searchParams.get("semester") || undefined;
    const branchCode = searchParams.get("branchCode") || searchParams.get("branch") || undefined;
    const section = searchParams.get("section") || undefined;
    const status = (searchParams.get("status") as any) || "all";

    const result = await serverGetTimetables(user, {
      academicYear,
      semester,
      branchCode,
      section,
      status,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      versions: result.timetables,
      count: result.timetables.length,
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/timetable:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve timetable data." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/timetable
 * Publishes a master timetable with strict scope isolation, academic year tagging, and audit versioning.
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
    const {
      branchCode,
      section,
      scope,
      batch,
      academicYear,
      academicSession,
      semester,
      timetable,
      versionLabel,
    } = body;

    if (!timetable || !timetable.slots) {
      return NextResponse.json(
        { success: false, error: "Invalid timetable data payload. Missing slots." },
        { status: 400 }
      );
    }

    const result = await serverPublishTimetable(user, {
      branchCode,
      section,
      scope: scope || "ALL_BATCHES",
      batch,
      academicYear: academicYear || timetable.academicYear || "1st Year",
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
      message: `Successfully published timetable version ${result.version?.versionLabel} for ${result.version?.academicYear} ${result.version?.branchCode} ${result.version?.section} (Scope: ${scope || "ALL_BATCHES"}).`,
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
 * PUT /api/admin/timetable
 * Lifecycle management: Activate or archive a timetable version.
 */
export async function PUT(req: NextRequest) {
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
    const { action, versionId } = body;

    if (!versionId) {
      return NextResponse.json({ success: false, error: "Missing versionId." }, { status: 400 });
    }

    if (action === "activate") {
      const res = await serverActivateTimetable(user, versionId);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Timetable activated successfully." });
    }

    if (action === "archive") {
      const res = await serverArchiveTimetable(user, versionId);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Timetable archived successfully." });
    }

    return NextResponse.json({ success: false, error: "Invalid action. Use 'activate' or 'archive'." }, { status: 400 });
  } catch (error: any) {
    console.error("Error in PUT /api/admin/timetable:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/timetable
 * Bulk or single removal of timetables (safe archival or hard deletion).
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
        { success: false, error: "Access Denied: Administrator privileges required." },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const queryId = searchParams.get("id");
    const hardDelete = searchParams.get("hardDelete") === "true";

    let idsToDelete: string[] = [];
    if (queryId) {
      idsToDelete = [queryId];
    } else {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.ids)) {
        idsToDelete = body.ids;
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json(
        { success: false, error: "No timetable version IDs specified for removal." },
        { status: 400 }
      );
    }

    const result = await serverDeleteTimetables(user, { versionIds: idsToDelete, hardDelete });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Successfully ${hardDelete ? "deleted" : "archived"} ${result.count} timetable versions. Historical attendance records remain safe.`,
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/admin/timetable:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
