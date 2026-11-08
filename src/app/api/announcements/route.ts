import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import {
  serverGetAnnouncementsForUser,
  serverCreateAnnouncement,
  serverEditAnnouncement,
  serverDeleteAnnouncement,
} from "@/lib/serverAnnouncements";

/**
 * GET /api/announcements
 * Returns announcements authorized for the authenticated user based on role and class scope.
 * - Admin: all announcements across all classes.
 * - Class Admin (CR): announcements for their assigned class or 'ALL'.
 * - Student: announcements for their enrolled class (matching branch, section, batch, session, semester) or 'ALL'.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user, token } = authResult;
    const announcements = await serverGetAnnouncementsForUser(user, { token });

    return NextResponse.json({
      success: true,
      announcements,
      count: announcements.length,
      scope: {
        role: user.role,
        branchCode: user.managedBranchCode || user.branchCode,
        section: user.managedSection || user.section,
        batch: user.managedBatch || user.batch,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/announcements:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve class announcements." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/announcements
 * Creates a new class announcement with strict class-level authorization.
 * - Admin: may create announcements for any branch & section or 'ALL'.
 * - Class Admin: may create announcements ONLY for their authorized managed class.
 * - Student: rejected with 403 Access Denied.
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
        { success: false, error: "Access Denied: Students are not permitted to create announcements." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      message,
      type,
      branchCode,
      section,
      batch,
      academicSession,
      semester,
    } = body;

    // For Class Admin: reject direct attempts to target a branch/section outside authorized scope
    const targetBranch = user.role === "admin" ? (branchCode || "ALL") : (branchCode || user.managedBranchCode || user.branchCode);
    const targetSection = user.role === "admin" ? (section || "ALL") : (section || user.managedSection || user.section);

    const result = await serverCreateAnnouncement(
      user,
      {
        title,
        message,
        type: type || "info",
        branchCode: targetBranch,
        section: targetSection,
        batch,
        academicSession,
        semester,
      },
      { token }
    );

    if (!result.success) {
      const status = result.error?.includes("Access Denied") ? 403 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        announcement: result.announcement,
        message: "Class announcement created successfully.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/announcements:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create class announcement." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/announcements
 * Edits an announcement with strict class-level authorization.
 * - Admin: may edit any announcement across all classes.
 * - Class Admin: may edit ONLY announcements belonging to their assigned class.
 * - Student: rejected with 403 Access Denied.
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
        { success: false, error: "Access Denied: Students are not permitted to edit announcements." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const announcementId = body.id || body.announcementId;
    const { title, message, type } = body;

    if (!announcementId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: announcementId is required." },
        { status: 400 }
      );
    }

    const result = await serverEditAnnouncement(
      user,
      announcementId,
      { title, message, type },
      { token }
    );

    if (!result.success) {
      const status = result.error?.includes("Access Denied") ? 403 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      announcement: result.announcement,
      message: "Class announcement updated successfully.",
    });
  } catch (error: any) {
    console.error("Error in PATCH /api/announcements:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update class announcement." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/announcements
 * Deletes an announcement with strict class-level authorization.
 * - Admin: may delete any announcement across all classes.
 * - Class Admin: may delete ONLY announcements belonging to their assigned class.
 * - Student: rejected with 403 Access Denied.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user, token } = authResult;
    if (user.role === "student") {
      return NextResponse.json(
        { success: false, error: "Access Denied: Students are not permitted to delete announcements." },
        { status: 403 }
      );
    }

    let announcementId = req.nextUrl.searchParams.get("announcementId") || req.nextUrl.searchParams.get("id");
    if (!announcementId) {
      try {
        const body = await req.json();
        announcementId = body.announcementId || body.id;
      } catch {
        // Body may be empty
      }
    }

    if (!announcementId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: announcementId is required." },
        { status: 400 }
      );
    }

    const result = await serverDeleteAnnouncement(user, announcementId, { token });
    if (!result.success) {
      const status = result.error?.includes("Access Denied") ? 403 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Class announcement deleted successfully.",
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/announcements:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete class announcement." },
      { status: 500 }
    );
  }
}
