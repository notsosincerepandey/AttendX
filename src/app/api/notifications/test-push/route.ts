import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionsForStudent, removeSubscription } from "@/lib/subscriptionStore";
import { sendWebPush } from "@/lib/webpush";
import { generateActionToken } from "@/lib/actionSecurity";
import { verifyServerSession } from "@/lib/serverAuthGuard";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, subjectName, subjectCode, period, category, batch, room, section } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "Missing studentId parameter" },
        { status: 400 }
      );
    }

    // Authoritative session verification: mandatory for test push triggering
    const session = await verifyServerSession(req);
    if (!session.authenticated || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error:
            session.error ||
            "Authentication required. A valid session Bearer token is required to trigger Web Push notifications.",
        },
        { status: session.statusCode || 401 }
      );
    }

    const isOwner =
      session.user.id === studentId ||
      session.user.email?.toLowerCase() === studentId.toLowerCase();
    const isAdmin = session.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Access Denied: You cannot trigger push notifications for another student.",
        },
        { status: 403 }
      );
    }

    const subscriptions = await getSubscriptionsForStudent(studentId);

    if (subscriptions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No active Web Push subscription found for this account. Please enable notifications and grant browser permission first.",
        },
        { status: 404 }
      );
    }

    const now = new Date();
    const startTime = now.toISOString();
    // 5-minute attendance window deadline
    const deadlineTime = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const currentDay = String(now.getDate()).padStart(2, "0");
    const dateStr = `${currentYear}-${currentMonth}-${currentDay}`;

    const subName = subjectName || "Programming in C";
    const subCode = subjectCode || "BIT-103";
    const perNum = period || 2;
    const cat = category || "Theory";
    const bat = batch || "P1";
    const sec = section || "SEC-B";
    const rm = room || "TL-203";

    const actionToken = generateActionToken({
      studentId,
      date: dateStr,
      period: perNum,
      subjectCode: subCode,
      deadlineTime,
    });

    const payload = {
      title: "ATTENDX – CLASS STARTED",
      body: `${subName} (${subCode})\nPeriod ${perNum} • ${cat} | ${sec} | ${bat}\nRoom: ${rm}\n\nMark your attendance within five minutes.`,
      icon: "/next.svg",
      badge: "/next.svg",
      tag: `attendx-class-${perNum}-${dateStr}`,
      data: {
        studentId,
        date: dateStr,
        period: perNum,
        subjectCode: subCode,
        subjectName: subName,
        category: cat as any,
        batch: bat,
        room: rm,
        startTime,
        deadlineTime,
        actionToken,
        url: `/mark-attendance?date=${dateStr}&period=${perNum}`,
      },
    };

    let delivered = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const result = await sendWebPush(sub.subscription, payload);
      if (result.success) {
        delivered++;
      } else {
        failed++;
        // If expired or gone (404/410), clean up obsolete subscription
        if (result.statusCode === 404 || result.statusCode === 410) {
          await removeSubscription(sub.subscription.endpoint);
        }
      }
    }

    return NextResponse.json({
      success: delivered > 0,
      delivered,
      failed,
      deadlineTime,
      message:
        delivered > 0
          ? `Push notification sent to ${delivered} browser device(s). Actions enabled for 5 minutes.`
          : "Failed to deliver push notification to registered browsers.",
    });
  } catch (error: any) {
    console.error("Error in /api/notifications/test-push:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
