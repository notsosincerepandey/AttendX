import { NextRequest, NextResponse } from "next/server";
import { registerStudentAccount } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      password,
      branchCode,
      section,
      batch,
      degree,
      branch,
      semester,
      academicSession,
      activeTimetableId,
    } = body;

    if (!fullName || !email || !password || !branchCode || !section) {
      return NextResponse.json(
        { success: false, error: "Missing required registration parameters." },
        { status: 400 }
      );
    }

    // Role cannot be manipulated by client; server forces "student"
    const result = await registerStudentAccount({
      fullName,
      email,
      password,
      branchCode,
      section,
      batch: batch || "P1",
      degree: degree || "B.Tech",
      branch: branch || "Engineering",
      semester: semester || "Semester I",
      academicSession: academicSession || "2025-26",
      activeTimetableId: activeTimetableId || "mmmut-btech-it-b-2025",
      attendanceThreshold: 75.0,
    });

    if (result.success && result.user) {
      return NextResponse.json({
        success: true,
        user: result.user,
        message: `Account created for ${result.user.fullName}`,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error || "Registration failed." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in /api/auth/register:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected registration error occurred." },
      { status: 500 }
    );
  }
}
