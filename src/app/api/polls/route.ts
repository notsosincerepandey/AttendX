import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import {
  serverGetPollsForUser,
  serverCreatePoll,
  serverVoteInPoll,
  serverClosePoll,
  serverEditPoll,
  serverDeletePoll,
} from "@/lib/serverPolls";

/**
 * GET /api/polls
 * Returns only polls authorized for the authenticated user based on role and section scope.
 * - Admin: all polls
 * - Class Admin: polls matching their managed branch & section (or 'ALL')
 * - Student: polls matching their enrolled branch & section (or 'ALL')
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user, token } = authResult;
    const polls = await serverGetPollsForUser(user, { token });

    return NextResponse.json({
      success: true,
      polls,
      count: polls.length,
      scope: {
        role: user.role,
        branchCode: user.managedBranchCode || user.branchCode,
        section: user.managedSection || user.section,
        batch: user.managedBatch || user.batch,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/polls:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve class polls." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/polls
 * Creates a new class poll with strict server-side authorization.
 * - Admin: may create polls for any branch & section or 'ALL'.
 * - Class Admin: may create polls ONLY for their authorized branch and section.
 * - Student: rejected with 403.
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
        { success: false, error: "Access Denied: Students are not permitted to create polls." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, description, category, branchCode, section, batch, options } = body;

    // For Class Admin: reject direct attempts to target a branch/section outside authorized scope
    const targetBranch = user.role === "admin" ? (branchCode || "ALL") : (branchCode || user.managedBranchCode || user.branchCode);
    const targetSection = user.role === "admin" ? (section || "ALL") : (section || user.managedSection || user.section);

    const result = await serverCreatePoll(
      user,
      {
        title,
        description,
        category,
        branchCode: targetBranch,
        section: targetSection,
        batch,
        options,
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
        poll: result.poll,
        message: "Class poll created successfully.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/polls:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create class poll." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/polls
 * Performs vote casting, poll closure, or poll editing with strict server-side authorization.
 * Body: { action: "vote", pollId, optionId }
 *   OR  { action: "close", pollId }
 *   OR  { action: "edit", pollId, title, description, category }
 */
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user, token } = authResult;
    const body = await req.json();
    const { action, pollId, optionId, title, description, category } = body;

    if (!action || !pollId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: action and pollId are required." },
        { status: 400 }
      );
    }

    if (action === "vote") {
      if (!optionId) {
        return NextResponse.json(
          { success: false, error: "optionId is required to vote." },
          { status: 400 }
        );
      }

      const result = await serverVoteInPoll(user, pollId, optionId, { token });
      if (!result.success) {
        const status = result.error?.includes("Access Denied") ? 403 : 400;
        return NextResponse.json(
          { success: false, error: result.error },
          { status }
        );
      }

      return NextResponse.json({
        success: true,
        poll: result.poll,
        message: "Vote recorded successfully.",
      });
    }

    if (action === "close") {
      const result = await serverClosePoll(user, pollId, { token });
      if (!result.success) {
        const status = result.error?.includes("Access Denied") ? 403 : 400;
        return NextResponse.json(
          { success: false, error: result.error },
          { status }
        );
      }

      return NextResponse.json({
        success: true,
        poll: result.poll,
        message: "Poll closed for voting.",
      });
    }

    if (action === "edit") {
      const result = await serverEditPoll(user, pollId, { title, description, category }, { token });
      if (!result.success) {
        const status = result.error?.includes("Access Denied") ? 403 : 400;
        return NextResponse.json(
          { success: false, error: result.error },
          { status }
        );
      }

      return NextResponse.json({
        success: true,
        poll: result.poll,
        message: "Poll updated successfully.",
      });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action '${action}'. Expected 'vote', 'close', or 'edit'.` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in PATCH /api/polls:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update poll." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/polls
 * Deletes a poll with strict server-side authorization.
 * - Admin: may delete any poll across all classes.
 * - Class Admin: may delete ONLY polls within authorized branch & section.
 * - Student: rejected with 403.
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
        { success: false, error: "Access Denied: Students are not permitted to delete polls." },
        { status: 403 }
      );
    }

    let pollId = req.nextUrl.searchParams.get("pollId") || req.nextUrl.searchParams.get("id");
    if (!pollId) {
      try {
        const body = await req.json();
        pollId = body.pollId || body.id;
      } catch {
        // Body may be empty
      }
    }

    if (!pollId) {
      return NextResponse.json(
        { success: false, error: "pollId is required." },
        { status: 400 }
      );
    }

    const result = await serverDeletePoll(user, pollId, { token });
    if (!result.success) {
      const status = result.error?.includes("Access Denied") ? 403 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Poll deleted successfully.",
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/polls:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete poll." },
      { status: 500 }
    );
  }
}
