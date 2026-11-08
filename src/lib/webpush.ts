import * as webpushModule from "web-push";

const wp: any = (webpushModule as any).default || webpushModule;

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "REDACTED_VAPID_PUBLIC_KEY";
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || "REDACTED_VAPID_PRIVATE_KEY";
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:admin@mmmut.ac.in";

// Initialize VAPID details on server
try {
  if (wp && typeof wp.setVapidDetails === "function") {
    wp.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }
} catch (err) {
  console.error("Error configuring web-push VAPID details:", err);
}

export { wp as webpush, VAPID_PUBLIC_KEY };

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data: {
    studentId: string;
    date: string;
    period: number;
    subjectCode: string;
    subjectName: string;
    category: "Theory" | "Lab" | "Tutorial";
    batch: string;
    room: string;
    faculty?: string;
    startTime: string; // ISO string
    deadlineTime: string; // ISO string (startTime + 5 mins)
    url?: string;
  };
}

export async function sendWebPush(
  subscription: webpushModule.PushSubscription,
  payload: PushNotificationPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const stringified = JSON.stringify(payload);
    const result = await wp.sendNotification(subscription, stringified);
    return { success: true, statusCode: result.statusCode };
  } catch (error: any) {
    console.error("Web Push delivery failed:", error?.statusCode, error?.message);
    return {
      success: false,
      statusCode: error?.statusCode,
      error: error?.message || "Failed to send push notification",
    };
  }
}
