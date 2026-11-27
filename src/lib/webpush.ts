import * as webpushModule from "web-push";

const wp: any = (webpushModule as any).default || webpushModule;

function cleanKey(val?: string): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
}

const RAW_VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const RAW_VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const RAW_VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:admin@mmmut.ac.in";

const VAPID_PUBLIC_KEY = cleanKey(RAW_VAPID_PUBLIC_KEY);
const VAPID_PRIVATE_KEY = cleanKey(RAW_VAPID_PRIVATE_KEY);
const VAPID_SUBJECT = cleanKey(RAW_VAPID_SUBJECT) || "mailto:admin@mmmut.ac.in";

let isVapidConfigured = false;

// Initialize VAPID details on server only when credentials are provided
try {
  if (wp && typeof wp.setVapidDetails === "function") {
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      wp.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      isVapidConfigured = true;
    } else {
      if (process.env.NODE_ENV === "production") {
        console.warn(
          "[Security Notice] Web Push VAPID keys not configured in environment (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)."
        );
      }
    }
  }
} catch (err: any) {
  console.error("Error configuring web-push VAPID details:", err?.message || err);
}

export { wp as webpush, VAPID_PUBLIC_KEY, isVapidConfigured };

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
  if (!isVapidConfigured) {
    return {
      success: false,
      error: "VAPID credentials not configured in environment variables.",
    };
  }
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
