import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/serverAuthGuard";

/**
 * GET /api/admin/auth/verify
 * Authoritative verification endpoint for active Administrator sessions.
 * Returns HTTP 200 with user profile if valid admin; HTTP 401/403 otherwise.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    return NextResponse.json({
      success: true,
      authenticated: true,
      user,
    });
  } catch (error: any) {
    console.error("Error in /api/admin/auth/verify:", error);
    return NextResponse.json(
      { success: false, error: "Internal error verifying administrator session." },
      { status: 500 }
    );
  }
}
