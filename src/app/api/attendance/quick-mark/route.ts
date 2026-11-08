import { NextRequest, NextResponse } from "next/server";
import { verifyActionToken, getISTDateTime } from "@/lib/actionSecurity";
import { verifyServerSession } from "@/lib/serverAuthGuard";

export interface QuickMarkRequest {
  studentId: string;
  date: string;
  period: number;
  subjectCode: string;
  subjectName?: string;
  category?: "Theory" | "Lab" | "Tutorial";
  batch?: string;
  room?: string;
  faculty?: string;
  status: "PRESENT" | "ABSENT";
  startTime?: string;
  deadlineTime?: string;
  actionToken?: string;
  source?: string;
}

// In-memory server-side cache of attendance recorded via quick-mark
const serverAttendanceStore: Map<string, any> = new Map();

export async function POST(req: NextRequest) {
  try {
    const body: QuickMarkRequest = await req.json();
    const {
      studentId,
      date,
      period,
      subjectCode,
      subjectName,
      category,
      batch,
      room,
      faculty,
      status,
      startTime,
      deadlineTime,
      actionToken,
      source,
    } = body;

    // 1. Parameter Validation
    if (!studentId || !date || !period || !subjectCode || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required attendance parameters" },
        { status: 400 }
      );
    }

    if (status !== "PRESENT" && status !== "ABSENT") {
      return NextResponse.json(
        { success: false, error: "Status must be either PRESENT or ABSENT" },
        { status: 400 }
      );
    }

    // 1b. Session Ownership Verification (if Bearer token is provided)
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const session = await verifyServerSession(req);
      if (session.authenticated && session.user) {
        const isOwner =
          session.user.id === studentId ||
          session.user.email?.toLowerCase() === studentId.toLowerCase();
        const isAdmin = session.user.role === "admin";

        if (!isOwner && !isAdmin) {
          return NextResponse.json(
            {
              success: false,
              error: "Access Denied: You cannot mark or modify attendance records for another student.",
            },
            { status: 403 }
          );
        }
      }
    }

    const { now } = getISTDateTime();

    // 2. Cryptographic Action Token Verification (Tamper Protection)
    // If an actionToken is provided (from Push Action button), verify its authenticity
    if (actionToken && deadlineTime) {
      const isValid = verifyActionToken(
        {
          studentId,
          date,
          period,
          subjectCode,
          deadlineTime,
        },
        actionToken
      );

      if (!isValid) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid or forged action token. Student ID or session parameters were altered.",
          },
          { status: 401 }
        );
      }
    }

    // 3. Strict Five-Minute Attendance Window Enforcement on Server Authoritative Time
    if (deadlineTime) {
      const deadline = new Date(deadlineTime);
      // 10-second grace buffer strictly for network transmission latency
      const networkBufferMs = 10 * 1000;
      if (now.getTime() > deadline.getTime() + networkBufferMs) {
        return NextResponse.json(
          {
            success: false,
            error:
              "The 5-minute attendance window has expired. Retroactive attendance marking is strictly prohibited.",
            expiredAt: deadlineTime,
            serverTime: now.toISOString(),
          },
          { status: 403 }
        );
      }
    }

    // 4. Duplicate Action Prevention & Finalized Decision Immutability
    const recordKey = `${studentId}-${date}-p${period}-${subjectCode}`;
    const existing = serverAttendanceStore.get(recordKey);

    if (existing) {
      // If already marked, attendance decision is locked - cannot be flipped or overwritten
      return NextResponse.json({
        success: true,
        message: `Attendance is already recorded as ${existing.status}. Decisions are final and idempotent.`,
        record: existing,
        isDuplicate: true,
        finalizedStatus: existing.status,
      });
    }

    const recordId = `att-${date}-p${period}-${subjectCode}-${studentId.slice(0, 8)}`;
    const attendanceRecord = {
      id: recordId,
      student_id: studentId,
      date,
      period,
      subject_code: subjectCode,
      subject_name: subjectName || subjectCode,
      category: category || "Theory",
      batch: batch || "ALL",
      room: room || "TL-203",
      faculty: faculty || "",
      status,
      marked_at: now.toISOString(),
      marked_by: "WEB_PUSH_ACTION",
      notes: `Quick-marked ${status} via Service Worker notification action (${source || "PUSH"})`,
    };

    serverAttendanceStore.set(recordKey, attendanceRecord);

    // 5. Persist to Supabase atomically if credentials configured
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Check if an existing database record is already present
        const { data: existingDb } = await supabase
          .from("attendance_records")
          .select("id, status")
          .eq("student_id", studentId)
          .eq("session_date", date)
          .eq("period_number", period)
          .eq("subject_code", subjectCode)
          .maybeSingle();

        if (existingDb && (existingDb.status === "PRESENT" || existingDb.status === "ABSENT")) {
          // Keep existing decision idempotent
          return NextResponse.json({
            success: true,
            message: `Attendance already finalized as ${existingDb.status} in database`,
            record: existingDb,
            isDuplicate: true,
          });
        }

        // Upsert record
        await supabase.from("attendance_records").upsert(
          {
            student_id: studentId,
            session_date: date,
            period_number: period,
            subject_code: subjectCode,
            category: category || "Theory",
            status,
            marked_at: now.toISOString(),
            marked_by: "WEB_PUSH_ACTION",
          },
          {
            onConflict: "student_id,session_date,period_number,subject_code",
          }
        );

        // Record in audit log
        await supabase.from("attendance_audit_logs").insert({
          student_id: studentId,
          subject_code: subjectCode,
          old_status: existingDb ? existingDb.status : "PENDING",
          new_status: status,
          reason: `Actionable Web Push marking (${source || "SW_ACTION"})`,
          changed_at: now.toISOString(),
        });
      } catch (dbErr) {
        console.error("Error saving attendance to Supabase:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully marked ${status} for Period ${period} (${subjectCode})`,
      record: attendanceRecord,
      markedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/attendance/quick-mark:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const studentId = searchParams.get("studentId");
  const date = searchParams.get("date");
  const period = searchParams.get("period");
  const subjectCode = searchParams.get("subjectCode");

  if (!studentId || !date || !period || !subjectCode) {
    return NextResponse.json({ success: false, error: "Missing query parameters" }, { status: 400 });
  }

  const recordKey = `${studentId}-${date}-p${period}-${subjectCode}`;
  const existing = serverAttendanceStore.get(recordKey);

  return NextResponse.json({
    success: true,
    hasRecord: Boolean(existing),
    record: existing || null,
  });
}
