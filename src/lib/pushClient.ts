"use client";

import { getSessionToken } from "@/lib/auth";

export function sanitizeVapidKey(key?: string): string {
  if (!key) return "";
  return key.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
}

const RAW_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "REDACTED_VAPID_PUBLIC_KEY";

export const VAPID_PUBLIC_KEY = sanitizeVapidKey(RAW_VAPID_PUBLIC_KEY);

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const sanitized = sanitizeVapidKey(base64String);
  const padding = "=".repeat((4 - (sanitized.length % 4)) % 4);
  const base64 = (sanitized + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isBraveBrowser(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as any;
  if (nav?.brave && typeof nav.brave.isBrave === "function") {
    try {
      return await nav.brave.isBrave();
    } catch {
      return false;
    }
  }
  return false;
}

function areApplicationServerKeysEqual(
  existingKeyBuf: ArrayBuffer | null | undefined,
  currentKey: Uint8Array
): boolean {
  if (!existingKeyBuf) return false;
  const existingArr = new Uint8Array(existingKeyBuf);
  if (existingArr.length !== currentKey.length) return false;
  for (let i = 0; i < existingArr.length; i++) {
    if (existingArr[i] !== currentKey[i]) return false;
  }
  return true;
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
        error: "Failed to initialize background Service Worker. Please reload the page and try again.",
      };
    }

    // 3. Prepare VAPID Public Key
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    if (applicationServerKey.length !== 65 || applicationServerKey[0] !== 4) {
      return {
        success: false,
        error:
          "VAPID public key configuration error: Key must be 65 bytes starting with 0x04. Please check NEXT_PUBLIC_VAPID_PUBLIC_KEY.",
      };
    }

    // 4. Check for Existing Push Subscription
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Validate that the existing subscription matches the current VAPID key
      const matchesKey = areApplicationServerKeysEqual(
        subscription.options?.applicationServerKey,
        applicationServerKey
      );
      if (!matchesKey) {
        console.warn("Existing push subscription key differs from current VAPID key. Unsubscribing stale registration...");
        try {
          await subscription.unsubscribe();
        } catch (unsubErr) {
          console.warn("Could not cleanly unsubscribe stale subscription:", unsubErr);
        }
        subscription = null;
      }
    }

    // 5. Subscribe if no valid subscription exists
    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any,
        });
      } catch (subErr: any) {
        const errMsg = String(subErr?.message || subErr);
        console.warn("Initial pushManager.subscribe call failed:", errMsg);

        // Auto-recovery cycle for Chromium push service desynchronization:
        // 1. Clear any zombie subscription
        // 2. Wait for background push connection reset
        // 3. Retry once cleanly
        const isPushServiceErr =
          errMsg.toLowerCase().includes("push service error") ||
          errMsg.toLowerCase().includes("registration failed");

        if (isPushServiceErr) {
          try {
            const zombie = await registration.pushManager.getSubscription();
            if (zombie) await zombie.unsubscribe();
            await new Promise((res) => setTimeout(res, 400));

            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: applicationServerKey as any,
            });
          } catch (retryErr: any) {
            console.error("Push registration retry failed:", retryErr);

            // Check if user is running Brave Browser (shields block FCM by default)
            const isBrave = await isBraveBrowser();
            if (isBrave) {
              return {
                success: false,
                error:
                  "Brave Browser blocks push notifications by default. To enable: Open brave://settings/privacy, toggle ON 'Use Google services for push messaging', and relaunch Brave.",
              };
            }

            return {
              success: false,
              error:
                "Push Service Error: Your browser was unable to connect to the Google FCM push service. If you are on university Wi-Fi or VPN, mtalk.google.com:5228 may be blocked. Try disconnecting your VPN or switching to mobile data.",
            };
          }
        } else {
          return {
            success: false,
            error: subErr?.message || "Failed to create push subscription in browser.",
          };
        }
      }
    }

    if (!subscription) {
      return {
        success: false,
        error: "Unable to establish push subscription with browser push manager.",
      };
    }

    // 6. Send subscription to AttendX backend with Authorization Bearer token
    const token = getSessionToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers,
      body: JSON.stringify({
        studentId,
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      if (res.status === 401) {
        return {
          success: false,
          error: "Your session token has expired. Please log in again to register for notifications.",
        };
      }
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
    const token = getSessionToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/notifications/test-push", {
      method: "POST",
      headers,
      body: JSON.stringify({
        studentId,
        ...classDetails,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      if (res.status === 401) {
        return {
          success: false,
          error: "Authentication expired. Please log in again to test push notifications.",
        };
      }
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
      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      // Notify backend to remove subscription
      const token = getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers,
        body: JSON.stringify({ studentId, endpoint }),
      }).catch(() => {});
    }
    localStorage.removeItem(`attendx_push_enabled_${studentId}`);
    return true;
  } catch (err) {
    console.error("Error unsubscribing:", err);
    return false;
  }
}
