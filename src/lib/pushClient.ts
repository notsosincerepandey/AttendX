"use client";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "REDACTED_VAPID_PUBLIC_KEY";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error("Service worker registration failed:", err);
    return null;
  }
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    return existing;
  } catch (err) {
    console.error("Error retrieving existing push subscription:", err);
    return null;
  }
}

export async function subscribeToPushNotifications(
  studentId: string
): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      error:
        "Web Push notifications are not supported by this browser. (On iOS, add AttendX to your Home Screen to enable Web Push).",
    };
  }

  try {
    // 1. Request Browser Permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        success: false,
        error:
          permission === "denied"
            ? "Notification permission was blocked. Please enable notifications in your browser site settings."
            : "Notification permission was dismissed without approval.",
      };
    }

    // 2. Register Service Worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return {
        success: false,
        error: "Failed to initialize background Service Worker.",
      };
    }

    // 3. Subscribe with VAPID Public Key
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    // 4. Send subscription to AttendX backend
    const res = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      return {
        success: false,
        error: result.error || "Backend failed to register push subscription.",
      };
    }

    // Store push status in localStorage
    localStorage.setItem(`attendx_push_enabled_${studentId}`, "true");

    return { success: true, subscription };
  } catch (error: any) {
    console.error("Subscription flow failed:", error);
    return {
      success: false,
      error: error?.message || "Failed to create push subscription.",
    };
  }
}

export async function triggerTestPushNotification(
  studentId: string,
  classDetails?: {
    subjectName?: string;
    subjectCode?: string;
    period?: number;
    category?: string;
    batch?: string;
    room?: string;
    section?: string;
  }
): Promise<{ success: boolean; message?: string; error?: string; deadlineTime?: string }> {
  try {
    const res = await fetch("/api/notifications/test-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        ...classDetails,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || "Failed to send test push notification.",
      };
    }

    return {
      success: true,
      message: data.message,
      deadlineTime: data.deadlineTime,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network request failed.",
    };
  }
}

export async function unsubscribeFromPushNotifications(
  studentId: string
): Promise<boolean> {
  try {
    const sub = await getExistingPushSubscription();
    if (sub) {
      await sub.unsubscribe();
    }
    localStorage.removeItem(`attendx_push_enabled_${studentId}`);
    return true;
  } catch (err) {
    console.error("Error unsubscribing:", err);
    return false;
  }
}
