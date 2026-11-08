import { NextRequest, NextResponse } from "next/server";
import { getAllActiveSubscriptions, removeSubscription } from "@/lib/subscriptionStore";
import { sendWebPush } from "@/lib/webpush";
import { UNIVERSITY_DATABASE } from "@/data/extractedTimetables";
import { generateActionToken, getISTDateTime, validateCronAuthorization } from "@/lib/actionSecurity";

// Official MMMUT Period Timing Map (IST)
const PERIOD_START_TIMES: Record<number, { hour: number; minute: number; name: string }> = {
  1: { hour: 9, minute: 10, name: "9:10 AM - 10:00 AM" },
  2: { hour: 10, minute: 0, name: "10:00 AM - 10:50 AM" },
  3: { hour: 10, minute: 50, name: "10:50 AM - 11:40 AM" },
  4: { hour: 11, minute: 40, name: "11:40 AM - 12:30 PM" },
  // Lunch Break: 12:30 PM - 2:00 PM (Strictly zero classes)
  5: { hour: 14, minute: 0, name: "2:00 PM - 2:45 PM" },
  6: { hour: 14, minute: 45, name: "2:45 PM - 3:30 PM" },
  7: { hour: 15, minute: 30, name: "3:30 PM - 4:15 PM" },
  8: { hour: 16, minute: 15, name: "4:15 PM - 5:00 PM" },
};

// In-memory duplicate dispatch tracker: `date-period-studentId-subjectCode`
const dispatchedNotifications = new Set<string>();

export async function GET(req: NextRequest) {
  return handleCheckClasses(req);
}

export async function POST(req: NextRequest) {
  return handleCheckClasses(req);
}

async function handleCheckClasses(req: NextRequest) {
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

    const subscriptions = await getAllActiveSubscriptions();
    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active push subscriptions registered",
        notified: 0,
      });
    }

    // 2. India Standard Time (Asia/Kolkata) Authoritative Time Evaluation
    const { now, dayOfWeek, dateStr, hour, minute } = getISTDateTime();

    // Sundays have zero university classes
    if (dayOfWeek === "Sunday") {
      return NextResponse.json({
        success: true,
        message: "Sunday: No university classes scheduled today",
        dayOfWeek,
        dateStr,
        notified: 0,
      });
    }

    // 3. Determine Period to Process
    const forcePeriod = url.searchParams.get("period")
      ? Number(url.searchParams.get("period"))
      : null;

    let targetPeriod = forcePeriod;

    if (!targetPeriod) {
      // Find period that starts right now (within a ±5 minute window in IST)
      for (const [pStr, timing] of Object.entries(PERIOD_START_TIMES)) {
        const pNum = Number(pStr);
        const diffMinutes = (hour - timing.hour) * 60 + (minute - timing.minute);
        if (diffMinutes >= 0 && diffMinutes <= 4) {
          targetPeriod = pNum;
          break;
        }
      }
    }

    if (!targetPeriod) {
      return NextResponse.json({
        success: true,
        message: `No class starting at ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} IST. (Active operating hours: 9:10 - 17:00 IST)`,
        istTime: `${hour}:${minute}`,
        dayOfWeek,
        dateStr,
        notified: 0,
      });
    }

    let notificationsSent = 0;
    let duplicateSuppressed = 0;
    const failures: any[] = [];

    for (const sub of subscriptions) {
      // Default to IT Section B (or student's assigned timetable)
      const timetable = UNIVERSITY_DATABASE.timetables[0];
      if (!timetable) continue;

      // Filter slots for today and the matched period
      const matchingSlots = timetable.slots.filter(
        (s) => s.day === dayOfWeek && s.period === targetPeriod
      );

      for (const slot of matchingSlots) {
        // Duplicate notification prevention
        const dispatchKey = `${dateStr}-p${slot.period}-${sub.studentId}-${slot.subjectCode}`;
        if (dispatchedNotifications.has(dispatchKey)) {
          duplicateSuppressed++;
          continue;
        }

        // Calculate authoritative 5-minute window
        const startTime = now.toISOString();
        const deadlineTime = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

        // Generate cryptographically signed action token
        const actionToken = generateActionToken({
          studentId: sub.studentId,
          date: dateStr,
          period: slot.period,
          subjectCode: slot.subjectCode,
          deadlineTime,
        });

        const payload = {
          title: "ATTENDX – CLASS STARTED",
          body: `${slot.subjectName} (${slot.subjectCode})\nPeriod ${slot.period} • ${slot.category} | ${timetable.section} | ${slot.batch}\nRoom: ${slot.room}\n\nMark your attendance within five minutes.`,
          icon: "/next.svg",
          badge: "/next.svg",
          tag: `attendx-${dateStr}-p${slot.period}`,
          data: {
            studentId: sub.studentId,
            date: dateStr,
            period: slot.period,
            subjectCode: slot.subjectCode,
            subjectName: slot.subjectName,
            category: slot.category as any,
            batch: slot.batch,
            room: slot.room,
            faculty: slot.faculty,
            startTime,
            deadlineTime,
            actionToken,
            url: `/mark-attendance?date=${dateStr}&period=${slot.period}`,
          },
        };

        const result = await sendWebPush(sub.subscription, payload);
        if (result.success) {
          notificationsSent++;
          dispatchedNotifications.add(dispatchKey);
        } else {
          failures.push({
            endpoint: sub.subscription.endpoint.slice(0, 30) + "...",
            statusCode: result.statusCode,
            error: result.error,
          });

          // Unregister dead subscriptions automatically (404 Not Found or 410 Gone)
          if (result.statusCode === 404 || result.statusCode === 410) {
            await removeSubscription(sub.subscription.endpoint);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      dayOfWeek,
      dateStr,
      period: targetPeriod,
      istTime: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} IST`,
      notified: notificationsSent,
      duplicateSuppressed,
      failures: failures.length,
      failureDetails: failures,
    });
  } catch (error: any) {
    console.error("Error in /api/cron/check-classes:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
