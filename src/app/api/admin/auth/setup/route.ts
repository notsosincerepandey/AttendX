import { NextRequest, NextResponse } from "next/server";
import { executeAdminFirstTimeSetup } from "@/lib/serverAdminSetup";

/**
 * POST /api/admin/auth/setup
 * Atomic, one-time administrator password setup endpoint.
 * 
 * Enforcements:
 * 1. Exclusively accepts admin@attendx.ac.in.
 * 2. Requires one-time activation key; rejects unauthorized callers with HTTP 401.
 * 3. Atomic one-time execution; rejected with HTTP 409 Conflict if already completed.
 * 4. Permanently locks initial setup in database upon completion.
 * 5. Updates Supabase Auth account password while preserving existing Auth UUID and role.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, activationKey, newPassword, confirmPassword } = body;

    const result = await executeAdminFirstTimeSetup({
      email,
      activationKey,
      newPassword,
      confirmPassword,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Error in /api/admin/auth/setup:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during administrator setup." },
      { status: 500 }
    );
  }
}
