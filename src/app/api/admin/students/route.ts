import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import { serverGetStudentDirectory, serverCreateSingleStudent } from "@/lib/serverAdmin";
import { CreateSingleStudentInput } from "@/types";

/**
 * GET /api/admin/students
 * Authoritative endpoint for retrieving the registered student directory with search, filter, and pagination.
 * Strictly restricted to verified Administrators.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Access Denied: Administrator privileges required." },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const branch = searchParams.get("branch") || undefined;
    const section = searchParams.get("section") || undefined;
    const batch = searchParams.get("batch") || undefined;
    const session = searchParams.get("session") || undefined;
    const academicYear = searchParams.get("academicYear") || undefined;
    const status = searchParams.get("status") || undefined;
    const semester = searchParams.get("semester") || undefined;
    const role = searchParams.get("role") || undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
    const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 20;

    const result = await serverGetStudentDirectory(user, {
      search,
      branch,
      section,
      batch,
      session,
      academicYear,
      status,
      semester,
      role,
      page,
      pageSize,
    });

    if (!result.success) {
      const status = result.error?.includes("Access Denied") ? 403 : 500;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      students: result.students,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/students:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve student directory." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/students
 * Authoritative endpoint for creating a single student account manually.
 * Strictly restricted to verified Administrators.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Access Denied: Administrator privileges required." },
        { status: 403 }
      );
    }

    const body: CreateSingleStudentInput = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const result = await serverCreateSingleStudent(user, body);

    if (!result.success) {
      const isClientError =
        result.error?.includes("required") ||
        result.error?.includes("already registered") ||
        result.error?.includes("Invalid") ||
        result.error?.includes("Please");
      return NextResponse.json(
        { success: false, error: result.error },
        { status: isClientError ? 400 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      student: result.student,
      message: `Student account for ${result.student?.fullName} (${result.student?.rollNumber}) created successfully.`,
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/students:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create student account." },
      { status: 500 }
    );
  }
}
