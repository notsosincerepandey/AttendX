import { NextRequest, NextResponse } from "next/server";
import { authenticateCredentials } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = body.identifier || body.rollNumber || body.email;
    const { password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Please enter your roll number or enrollment number and password." },
        { status: 400 }
      );
    }

    const result = await authenticateCredentials(identifier, password);

    if (result.success && result.user) {
      return NextResponse.json({
        success: true,
        user: result.user,
        sessionToken: result.sessionToken,
        requiresPasswordChange: result.requiresPasswordChange ?? false,
        passwordChangeConsumed: result.passwordChangeConsumed ?? false,
        message: `Authenticated as ${result.user.fullName}`,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error || "Invalid roll number or enrollment number, or password." },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("Error in /api/auth/login:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected authentication error occurred." },
      { status: 500 }
    );
  }
}
