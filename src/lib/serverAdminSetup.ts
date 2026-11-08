import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const PRIMARY_ADMIN_EMAIL = "admin@attendx.ac.in";
export const SETUP_COMPLETED_REASON = "ADMIN_INITIAL_SETUP_COMPLETED";

/**
 * Timing-safe string comparison to protect against timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) {
      // Dummy comparison to prevent timing leak on length
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Returns a configured Supabase admin service-role client.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase service credentials are not configured in environment.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Authoritatively inspects whether the primary administrator's initial password setup has been completed.
 * Reads both Supabase Auth app_metadata and the authoritative database profile.
 * Never exposes secrets, passwords, or tokens.
 */
export async function getAdminSetupStatus(): Promise<{
  success: boolean;
  setupCompleted: boolean;
  email: string;
  error?: string;
}> {
  try {
    const supabase = getAdminClient();

    // 1. Fetch user from Supabase Auth
    let authUser: any = null;
    let page = 1;
    while (!authUser && page <= 5) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data || !data.users || data.users.length === 0) break;
      authUser = data.users.find((u) => u.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL);
      if (data.users.length < 1000) break;
      page++;
    }

    if (!authUser) {
      return {
        success: false,
        setupCompleted: false,
        email: PRIMARY_ADMIN_EMAIL,
        error: "Primary administrator account not found in authentication system.",
      };
    }

    const authMetaCompleted = Boolean(authUser.app_metadata?.admin_setup_completed);

    // 2. Query student_profiles record for administrator
    const { data: profile } = await supabase
      .from("student_profiles")
      .select("id, role, deactivation_reason")
      .eq("email", PRIMARY_ADMIN_EMAIL)
      .maybeSingle();

    const profileCompleted = profile?.deactivation_reason === SETUP_COMPLETED_REASON;

    // Irreversible completion check: either flag indicates setup has concluded
    const setupCompleted = authMetaCompleted || profileCompleted;

    return {
      success: true,
      setupCompleted,
      email: PRIMARY_ADMIN_EMAIL,
    };
  } catch (err: any) {
    console.error("Error inspecting admin setup status:", err);
    return {
      success: false,
      setupCompleted: false,
      email: PRIMARY_ADMIN_EMAIL,
      error: "Unable to inspect administrator setup status.",
    };
  }
}

/**
 * Validates the provided activation key against server-side authorization mechanisms.
 * Supports ADMIN_SETUP_KEY, ADMIN_ACTIVATION_KEY, ADMIN_SETUP_TOKEN, or DEV_SEED_PASSWORD.
 * Never exposes the key or logs it.
 */
function verifyActivationKey(providedKey: string): boolean {
  if (!providedKey || typeof providedKey !== "string") return false;
  const trimmed = providedKey.trim();
  if (!trimmed) return false;

  const validKeys = [
    process.env.ADMIN_SETUP_KEY,
    process.env.ADMIN_ACTIVATION_KEY,
    process.env.ADMIN_SETUP_TOKEN,
    process.env.DEV_SEED_PASSWORD,
  ].filter((k): k is string => Boolean(k && k.trim()));

  if (validKeys.length === 0) {
    console.error("[SECURITY ALERT] No administrator activation key configured on server.");
    return false;
  }

  return validKeys.some((k) => safeCompare(trimmed, k.trim()));
}

// In-process lock to prevent simultaneous race conditions within the same instance
let setupLockInProgress = false;

/**
 * Executes the one-time First Admin Password Setup.
 * 
 * Security Guarantees:
 * 1. Strictly restricted to admin@attendx.ac.in.
 * 2. Requires authorized one-time activation key (never email alone).
 * 3. Enforces atomic one-time execution; rejected if already completed.
 * 4. Updates existing Supabase Auth account password and sets admin_setup_completed = true.
 * 5. Preserves existing Auth UUID, app_metadata.role = 'admin', and student_profiles record.
 * 6. Never modifies any student accounts or credentials.
 * 7. Never exposes secrets or credentials in logs or output.
 */
export async function executeAdminFirstTimeSetup(params: {
  email: string;
  activationKey: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  statusCode: number;
}> {
  const { email, activationKey, newPassword, confirmPassword } = params;

  // 1. Validate email targeting
  const trimmedEmail = String(email || "").trim().toLowerCase();
  if (trimmedEmail !== PRIMARY_ADMIN_EMAIL) {
    return {
      success: false,
      error: "Access Denied: First-time setup is exclusively restricted to the primary administrator account (admin@attendx.ac.in).",
      statusCode: 403,
    };
  }

  // 2. Validate passwords
  if (!newPassword || !confirmPassword) {
    return {
      success: false,
      error: "Please enter and confirm your new administrator password.",
      statusCode: 400,
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      error: "Password confirmation does not match the new password.",
      statusCode: 400,
    };
  }

  if (newPassword.length < 8) {
    return {
      success: false,
      error: "Administrator password must be at least 8 characters in length.",
      statusCode: 400,
    };
  }

  // 3. Prevent concurrency via in-process mutex
  if (setupLockInProgress) {
    return {
      success: false,
      error: "Setup is currently being processed. Please wait a moment.",
      statusCode: 429,
    };
  }

  setupLockInProgress = true;

  try {
    const supabase = getAdminClient();

    // 4. Authoritatively verify existing account and setup status
    let authUser: any = null;
    let page = 1;
    while (!authUser && page <= 5) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data || !data.users || data.users.length === 0) break;
      authUser = data.users.find((u) => u.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL);
      if (data.users.length < 1000) break;
      page++;
    }

    if (!authUser) {
      return {
        success: false,
        error: "Administrator account not found in authentication system.",
        statusCode: 404,
      };
    }

    // Irreversible completion check
    const { data: profile } = await supabase
      .from("student_profiles")
      .select("id, role, deactivation_reason")
      .eq("email", PRIMARY_ADMIN_EMAIL)
      .maybeSingle();

    if (
      authUser.app_metadata?.admin_setup_completed === true ||
      profile?.deactivation_reason === SETUP_COMPLETED_REASON
    ) {
      return {
        success: false,
        error: "Initial administrator setup has already been completed. This one-time setup interface is permanently closed.",
        statusCode: 409,
      };
    }

    // 5. Authorize using one-time activation mechanism
    const isAuthorized = verifyActivationKey(activationKey);
    if (!isAuthorized) {
      return {
        success: false,
        error: "Invalid one-time activation key. Please verify your activation credentials.",
        statusCode: 401,
      };
    }

    // 6. Persist atomic setup flag in database (student_profiles)
    const { error: profileUpdateErr } = await supabase
      .from("student_profiles")
      .update({
        deactivation_reason: SETUP_COMPLETED_REASON,
        password_change_consumed: true,
        requires_password_change: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.id);

    if (profileUpdateErr) {
      console.error("Failed to persist setup flag in student_profiles:", profileUpdateErr);
    }

    // 7. Update password and authoritative app_metadata in Supabase Auth
    const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: newPassword,
      app_metadata: {
        ...authUser.app_metadata,
        role: "admin",
        admin_setup_completed: true,
        admin_setup_completed_at: new Date().toISOString(),
        password_change_consumed: true,
        requires_password_change: false,
      },
    });

    if (authUpdateErr) {
      console.error("Failed to update admin password in Supabase Auth:", authUpdateErr);
      return {
        success: false,
        error: "Failed to update administrator credentials in Supabase Auth service.",
        statusCode: 500,
      };
    }

    return {
      success: true,
      message: "Administrator password configured successfully. Initial setup is now permanently closed.",
      statusCode: 200,
    };
  } catch (err: any) {
    console.error("Exception during admin first-time setup:", err);
    return {
      success: false,
      error: "An unexpected error occurred during administrator setup.",
      statusCode: 500,
    };
  } finally {
    setupLockInProgress = false;
  }
}
