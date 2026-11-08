import { NextRequest, NextResponse } from "next/server";
import { savePushSubscription } from "@/lib/subscriptionStore";
import { verifyServerSession } from "@/lib/serverAuthGuard";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, subscription, userAgent } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { success: false, error: "Missing Web Push subscription payload" },
        { status: 400 }
      );
    }

    // Authoritative session verification: mandatory for push registration
    const session = await verifyServerSession(req);
    if (!session.authenticated || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error:
            session.error ||
            "Authentication required. A valid session Bearer token is required to register Web Push subscriptions.",
        },
        { status: session.statusCode || 401 }
      );
    }

    // Authoritative student identity derived strictly from verified session
    const effectiveStudentId = session.user.id;

    const saved = await savePushSubscription(effectiveStudentId, subscription, userAgent);

    return NextResponse.json({
      success: true,
      message: "Push subscription registered successfully",
      subscriptionId: saved.id,
    });
  } catch (error: any) {
    console.error("Error in /api/notifications/subscribe:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
