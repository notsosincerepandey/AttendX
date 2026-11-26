import { NextRequest, NextResponse } from "next/server";
import { removeSubscription } from "@/lib/subscriptionStore";
import { verifyServerSession } from "@/lib/serverAuthGuard";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Missing subscription endpoint" },
        { status: 400 }
      );
    }

    // Optional auth verification
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const session = await verifyServerSession(req);
      if (!session.authenticated) {
        return NextResponse.json(
          { success: false, error: "Invalid session" },
          { status: 401 }
        );
      }
    }

    await removeSubscription(endpoint);

    return NextResponse.json({
      success: true,
      message: "Subscription removed successfully",
    });
  } catch (error: any) {
    console.error("Error in /api/notifications/unsubscribe:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
