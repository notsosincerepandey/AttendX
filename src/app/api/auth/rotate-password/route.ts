import { NextRequest, NextResponse } from "next/server";
import { verifyServerSession } from "@/lib/serverAuthGuard";
import { rotateUserPassword } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session.authenticated || !session.user) {
      return NextResponse.json(
        { success: false, error: session.error || "Authentication required to rotate password." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const userIdentifier = session.user.rollNumber || session.user.email || session.user.id;
    const result = await rotateUserPassword(userIdentifier, newPassword, {
      isStudentSelfService: session.user.role === "student",
      callerRole: session.user.role,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        sessionToken: result.sessionToken,
        message: "Your password was successfully updated and rotated in the secure auth store.",
      });
    }

    return NextResponse.json(
      { success: false, error: result.error || "Failed to update password." },
      { status: result.statusCode || 400 }
    );
  } catch (error: any) {
    console.error("Error in /api/auth/rotate-password:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while rotating password." },
      { status: 500 }
    );
  }
}
