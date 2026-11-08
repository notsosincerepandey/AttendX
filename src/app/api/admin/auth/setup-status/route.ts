import { NextRequest, NextResponse } from "next/server";
import { getAdminSetupStatus } from "@/lib/serverAdminSetup";

/**
 * GET /api/admin/auth/setup-status
 * Detects whether the primary administrator's initial password setup has been completed.
 * Publicly queryable boolean flag to determine whether /admin/login should display
 * the First-Time Setup card or standard Admin Login.
 * 
 * Never leaks credentials, tokens, or sensitive user data.
 */
export async function GET(_req: NextRequest) {
  try {
    const status = await getAdminSetupStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    console.error("Error in /api/admin/auth/setup-status:", err);
    return NextResponse.json(
      {
        success: false,
        setupCompleted: false,
        email: "admin@attendx.ac.in",
        error: "Unable to detect setup status.",
      },
      { status: 500 }
    );
  }
}
