import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuthGuard";
import { findTimetableForStudent } from "@/data/extractedTimetables";

/**
 * GET /api/timetable/active
 * Authoritative endpoint for student or class timetable resolution.
 * Checks published database timetables first, then static fallbacks strictly matching academic context.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const academicYear = user.academicYear || "1st Year";
    const semester = user.semester || (academicYear === "2nd Year" ? "Semester III" : "Semester I");
    const branchCode = user.branchCode;
    const section = user.section;
    const batch = user.batch || "P1";

    // 1. Check Supabase published_timetable_versions for an active published schedule
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: published } = await adminClient
          .from("published_timetable_versions")
          .select("*")
          .eq("is_active", true)
          .eq("branch_code", branchCode)
          .eq("section", section)
          .eq("academic_year", academicYear)
          .order("published_at", { ascending: false })
          .maybeSingle();

        if (published && published.timetable_data) {
          return NextResponse.json({
            success: true,
            source: "published_database",
            timetable: published.timetable_data,
          });
        }
      } catch (dbErr) {
        console.warn("Error querying published timetable versions:", dbErr);
      }
    }

    // 2. Strict static timetable matching
    const staticTimetable = findTimetableForStudent({
      branchCode,
      section,
      academicYear,
      semester,
    });

    if (staticTimetable) {
      return NextResponse.json({
        success: true,
        source: "static_master",
        timetable: staticTimetable,
      });
    }

    // 3. If student is 2nd Year or no timetable matches, return clean not-found message (never cross-contaminate)
    return NextResponse.json({
      success: false,
      found: false,
      message: `No active timetable published for ${academicYear} ${branchCode} ${section}. Please contact your administrator.`,
    });
  } catch (error: any) {
    console.error("Error in GET /api/timetable/active:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve active timetable." },
      { status: 500 }
    );
  }
}
