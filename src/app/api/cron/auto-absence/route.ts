import { NextRequest, NextResponse } from "next/server";
import { getISTDateTime, validateCronAuthorization } from "@/lib/actionSecurity";

export async function GET(req: NextRequest) {
  return handleAutoAbsence(req);
}

export async function POST(req: NextRequest) {
  return handleAutoAbsence(req);
}

async function handleAutoAbsence(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const authHeader = req.headers.get("authorization");
    const queryKey = url.searchParams.get("key");

    // 1. Authenticate Cron Caller via CRON_SECRET
    if (!validateCronAuthorization(authHeader, queryKey)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing CRON_SECRET" },
        { status: 401 }
      );
    }

    const { now, dayOfWeek, dateStr, hour, minute } = getISTDateTime();
    let markedCount = 0;

    // 2. Query Supabase using service-role key for backend automation
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Find all pending records whose 5-minute attendance window has expired
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

      const { data: expiredRecords, error: fetchErr } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("status", "PENDING")
        .lt("marked_at", fiveMinutesAgo);

      if (fetchErr) {
        console.error("Error fetching pending records in auto-absence:", fetchErr);
      }

      if (expiredRecords && expiredRecords.length > 0) {
        for (const rec of expiredRecords) {
          await supabase
            .from("attendance_records")
            .update({
              status: "ABSENT",
              marked_by: "AUTO_ABSENCE",
            })
            .eq("id", rec.id);

          await supabase.from("attendance_audit_logs").insert({
            student_id: rec.student_id,
            attendance_record_id: rec.id,
            subject_code: rec.subject_code,
            date: rec.session_date,
            period: rec.period_number,
            old_status: "PENDING",
            new_status: "ABSENT",
            reason: "Server auto-absence: 5-minute cutoff reached without student action",
            changed_at: now.toISOString(),
          });

          markedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-absence sweep completed at ${now.toISOString()} (${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} IST)`,
      dayOfWeek,
      dateStr,
      autoAbsencesMarked: markedCount,
    });
  } catch (error: any) {
    console.error("Error in /api/cron/auto-absence:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
