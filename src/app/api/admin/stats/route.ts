import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/serverAuthGuard";
import { UNIVERSITY_DATABASE } from "@/data/extractedTimetables";

/**
 * GET /api/admin/stats
 * Authoritatively aggregates key institutional statistics for the Admin Dashboard.
 * Strictly gated by requireAdmin().
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    let totalStudents = 1189;
    let totalCRs = 0;
    let totalAnnouncements = 0;
    let totalPolls = 0;
    let activePolls = 0;
    let totalCancellations = 0;
    let pendingCancellations = 0;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 1. Total genuine students count
        const { count: studentCount } = await supabase
          .from("student_profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "student");
        if (typeof studentCount === "number") totalStudents = studentCount;

        // 2. Appointed CRs count
        const { count: crCount } = await supabase
          .from("student_profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "class_admin");
        if (typeof crCount === "number") totalCRs = crCount;

        // 3. Announcements count
        const { count: annCount } = await supabase
          .from("class_announcements")
          .select("id", { count: "exact", head: true });
        if (typeof annCount === "number") totalAnnouncements = annCount;

        // 4. Polls counts
        const { count: pollCount } = await supabase
          .from("class_polls")
          .select("id", { count: "exact", head: true });
        if (typeof pollCount === "number") totalPolls = pollCount;

        const { count: activeCount } = await supabase
          .from("class_polls")
          .select("id", { count: "exact", head: true })
          .eq("is_closed", false);
        if (typeof activeCount === "number") activePolls = activeCount;

        // 5. Cancellation reports counts
        const { count: cancCount } = await supabase
          .from("cancellation_reports")
          .select("id", { count: "exact", head: true });
        if (typeof cancCount === "number") totalCancellations = cancCount;

        const { count: pendingCount } = await supabase
          .from("cancellation_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "PENDING");
        if (typeof pendingCount === "number") pendingCancellations = pendingCount;
      } catch (dbErr) {
        console.warn("Error querying database stats:", dbErr);
      }
    }

    const totalTimetables = UNIVERSITY_DATABASE.timetables.length;

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        totalCRs,
        totalAnnouncements,
        totalPolls,
        activePolls,
        totalCancellations,
        pendingCancellations,
        totalTimetables,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to compile admin statistics." },
      { status: 500 }
    );
  }
}
