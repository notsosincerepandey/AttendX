import { NextRequest, NextResponse } from "next/server";
import { authenticateCredentials } from "@/lib/serverAuth";

/**
 * POST /api/admin/auth/login
 * Dedicated authentication endpoint for the AttendX Admin Portal.
 * 
 * Security Guarantees:
 * 1. Strictly accepts ONLY the primary administrator email (admin@attendx.ac.in).
 * 2. Rejects roll numbers, enrollment numbers, student emails, and ordinary users with HTTP 403 Forbidden.
 * 3. Authoritatively verifies credentials against Supabase Auth.
 * 4. Ensures resulting account holds the verified 'admin' role before issuing a session.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email || body.identifier;
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Please enter your administrator email and password." },
        { status: 400 }
      );
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    // Enforce that only the primary admin email can access the Admin Portal
    if (trimmedEmail !== "admin@attendx.ac.in") {
      return NextResponse.json(
        {
          success: false,
          error: "Access Denied: Only the verified primary Administrator account (admin@attendx.ac.in) is authorized to access the Admin Portal. Students must use the Student Portal at /login.",
        },
        { status: 403 }
      );
    }

    const result = await authenticateCredentials("admin@attendx.ac.in", password);

    if (!result.success || !result.user) {
      const adminErrorMessage =
        result.error &&
        !result.error.toLowerCase().includes("roll number") &&
        !result.error.toLowerCase().includes("enrollment number")
          ? result.error
          : "Invalid administrator credentials. Please check your administrator email and password.";

      return NextResponse.json(
        { success: false, error: adminErrorMessage },
        { status: 401 }
      );
    }

    // Secondary server-side role check
    if (result.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Access Denied: This account does not possess administrator privileges." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      sessionToken: result.sessionToken,
      message: "Administrator session established successfully.",
    });
  } catch (error: any) {
    console.error("Error in /api/admin/auth/login:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during administrator authentication." },
      { status: 500 }
    );
  }
}
