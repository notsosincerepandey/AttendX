import { NextRequest, NextResponse } from "next/server";
import { verifyServerSession } from "@/lib/serverAuthGuard";
import { adminResetStudentPassword } from "@/lib/serverAuth";

// In-memory sliding window fallback + Persistent distributed rate limiter
const resetAttemptsMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 30;

async function checkResetRateLimit(adminId: string): Promise<boolean> {
  // 1. Atomic database-backed rate limiter (shared across all instances)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      const { data, error } = await supabaseAdmin.rpc("check_and_record_reset_rate_limit", {
        p_admin_id: adminId,
        p_max_attempts: RATE_LIMIT_MAX_ATTEMPTS,
        p_window_seconds: 60,
      });

      if (!error && typeof data === "boolean") {
        return !data; // data = false indicates limit exceeded
      }
    } catch {
      // Database limiter unavailable or in local test fixture; continue to memory limiter
    }
  }

  // 2. In-memory sliding-window fallback
  const now = Date.now();
  const timestamps = resetAttemptsMap.get(adminId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    resetAttemptsMap.set(adminId, validTimestamps);
    return true;
  }

  validTimestamps.push(now);
  resetAttemptsMap.set(adminId, validTimestamps);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session.authenticated || !session.user) {
      return NextResponse.json(
        { success: false, error: session.error || "Authentication required." },
        { status: 401 }
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Access Denied: Only the Administrator can reset student passwords." },
        { status: 403 }
      );
    }

    // Rate Limiting (Atomic DB + in-memory fallback)
    if (await checkResetRateLimit(session.user.id || session.user.email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded: Too many password resets issued. Please wait a minute before trying again.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { targetStudentIdentifier, temporaryPassword } = body;

    // Strict Input Validation
    if (!targetStudentIdentifier || typeof targetStudentIdentifier !== "string") {
      return NextResponse.json(
        { success: false, error: "Please provide a valid target student roll number, email, or user ID." },
        { status: 400 }
      );
    }

    const trimmedIdentifier = targetStudentIdentifier.trim();
    if (trimmedIdentifier.length < 3 || trimmedIdentifier.length > 100 || /[\r\n\t]/.test(trimmedIdentifier)) {
      return NextResponse.json(
        { success: false, error: "Target identifier contains invalid format or characters." },
        { status: 400 }
      );
    }

    // Protection against resetting Administrator accounts
    if (
      trimmedIdentifier.toLowerCase() === "admin@mmmut.ac.in" ||
      trimmedIdentifier.toLowerCase() === "admin@attendx.ac.in" ||
      trimmedIdentifier.toLowerCase() === session.user.email.toLowerCase()
    ) {
      return NextResponse.json(
        { success: false, error: "Access Denied: The System Admin account cannot be reset via the student reset API." },
        { status: 400 }
      );
    }

    // Temporary Password Validation (if passed by admin)
    if (temporaryPassword !== undefined && temporaryPassword !== null) {
      if (typeof temporaryPassword !== "string" || temporaryPassword.length < 8 || temporaryPassword.length > 100) {
        return NextResponse.json(
          { success: false, error: "Temporary password must be a string between 8 and 100 characters long." },
          { status: 400 }
        );
      }
    }

    const result = await adminResetStudentPassword(
      session.user,
      trimmedIdentifier,
      temporaryPassword
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Student password successfully reset. Mandatory password change enforced on next login.",
        temporaryPassword: result.temporaryPassword,
        student: result.student,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error || "Failed to reset student password." },
      { status: result.statusCode || 400 }
    );
  } catch (error: any) {
    console.error("Error in /api/admin/reset-password:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while resetting password." },
      { status: 500 }
    );
  }
}
