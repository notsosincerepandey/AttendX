import webpush from "web-push";

export interface StoredSubscription {
  id: string;
  studentId: string;
  subscription: webpush.PushSubscription;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory server-side storage (persists while Node server daemon runs)
const memorySubscriptions: Map<string, StoredSubscription> = new Map();

export async function savePushSubscription(
  studentId: string,
  subscription: webpush.PushSubscription,
  userAgent?: string
): Promise<StoredSubscription> {
  const endpoint = subscription.endpoint;
  const id = `sub-${Buffer.from(endpoint).toString("base64").slice(0, 24)}`;

  const entry: StoredSubscription = {
    id,
    studentId,
    subscription,
    userAgent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memorySubscriptions.set(endpoint, entry);

  // If Supabase is configured, also persist to Supabase
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await supabase.from("push_subscriptions").upsert(
        {
          student_id: studentId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );
    } catch (err) {
      console.error("Error syncing push subscription to Supabase:", err);
    }
  }

  return entry;
}

export async function getSubscriptionsForStudent(
  studentId: string
): Promise<StoredSubscription[]> {
  const matching: StoredSubscription[] = [];

  memorySubscriptions.forEach((sub) => {
    if (sub.studentId === studentId) {
      matching.push(sub);
    }
  });

  // If Supabase configured and memory had none, query Supabase
  if (matching.length === 0 && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("student_id", studentId);

      if (data) {
        data.forEach((row: any) => {
          const entry: StoredSubscription = {
            id: row.id,
            studentId: row.student_id,
            subscription: {
              endpoint: row.endpoint,
              keys: {
                p256dh: row.p256dh,
                auth: row.auth,
              },
            },
            userAgent: row.user_agent,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
          matching.push(entry);
          memorySubscriptions.set(row.endpoint, entry);
        });
      }
    } catch (err) {
      console.error("Error fetching subscriptions from Supabase:", err);
    }
  }

  return matching;
}

export async function getAllActiveSubscriptions(): Promise<StoredSubscription[]> {
  const all: StoredSubscription[] = [];
  memorySubscriptions.forEach((sub) => all.push(sub));
  return all;
}

export async function removeSubscription(endpoint: string): Promise<void> {
  memorySubscriptions.delete(endpoint);

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    } catch (err) {
      console.error("Error deleting push subscription from Supabase:", err);
    }
  }
}
