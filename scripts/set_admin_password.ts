/**
 * AttendX Production Admin Password Reset Utility
 * Securely updates the password for the existing production admin account (admin@mmmut.ac.in)
 * 
 * Safety Guarantees:
 * 1. Requires ATTENDX_TARGET_PROJECT_REF to strictly match 'cmdvsqbiozqltzcphpaf'.
 * 2. Reads new password exclusively from ATTENDX_NEW_ADMIN_PASSWORD.
 * 3. Enforces minimum 12-character password length.
 * 4. Paginates all auth.users using safe pagination helper; aborts on partial pages or errors.
 * 5. Requires exactly 1 matching admin@mmmut.ac.in Auth account.
 * 6. Verifies existing student_profiles record matches Auth UUID and has role 'admin'.
 * 7. Invokes strictly supabase.auth.admin.updateUserById(id, { password }) with NO other mutations.
 * 8. Never creates new users or alters student_profiles, metadata, or role bindings.
 * 9. Never logs passwords, service keys, or tokens.
 */
import fs from "fs";
import path from "path";
import {
  validateSupabaseTargetProject,
  fetchAllAuthUsers,
  AuthUserLike,
  SupabaseAdminAuthClientLike,
} from "./migrate_supabase_auth";

export const PRODUCTION_ADMIN_EMAIL = "admin@mmmut.ac.in";
export const REQUIRED_PRODUCTION_PROJECT_REF = "cmdvsqbiozqltzcphpaf";
export const MIN_PASSWORD_LENGTH = 12;

/**
 * Validates password presence and length requirements.
 * Rejects undefined, non-string, or passwords shorter than 12 characters.
 * Never logs or returns the password in error messages.
 */
export function validateAdminPassword(password: string | undefined): string {
  if (!password || typeof password !== "string") {
    throw new Error(
      "[SAFETY ABORT] Execution blocked: ATTENDX_NEW_ADMIN_PASSWORD environment variable is missing or empty."
    );
  }

  const trimmed = password.trim();
  if (trimmed.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `[SAFETY ABORT] Execution blocked: ATTENDX_NEW_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters long (received: ${trimmed.length} characters).`
    );
  }

  return trimmed;
}

/**
 * Validates project reference against the strict production project requirement.
 */
export function validateProductionProjectRef(
  supabaseUrl: string | undefined,
  targetProjectRef: string | undefined
): { projectRef: string; confirmedRef: string } {
  const result = validateSupabaseTargetProject(supabaseUrl, targetProjectRef);

  if (result.confirmedRef !== REQUIRED_PRODUCTION_PROJECT_REF) {
    throw new Error(
      `[SAFETY ABORT] Execution blocked: Forbidden target project reference '${result.confirmedRef}'. ` +
      `Admin password reset is restricted exclusively to production project reference '${REQUIRED_PRODUCTION_PROJECT_REF}'.`
    );
  }

  return result;
}

export interface VerifiedAdminTarget {
  authUserId: string;
  email: string;
  profileId: string;
  role: string;
}

/**
 * Pure Preflight Verifier:
 * - Detects duplicate or missing Auth accounts for admin@mmmut.ac.in.
 * - Confirms that exactly 1 Auth user exists.
 * - Verifies student_profiles record exists, links to the same UUID, and holds role 'admin'.
 */
export async function verifyAdminAccountAndProfile(
  targetEmail: string,
  authUsers: AuthUserLike[],
  fetchProfileFn: (email: string) => Promise<{ data: any | null; error: { message: string } | null }>
): Promise<VerifiedAdminTarget> {
  const normalizedEmail = targetEmail.trim().toLowerCase();

  // 1. Duplicate detection & exact Auth user matching
  const matchingAuthUsers = authUsers.filter(
    (u) => u.email?.trim().toLowerCase() === normalizedEmail
  );

  if (matchingAuthUsers.length === 0) {
    throw new Error(
      `[SAFETY ABORT] Target account not found: No Auth user with email '${normalizedEmail}' found in auth.users.`
    );
  }

  if (matchingAuthUsers.length > 1) {
    throw new Error(
      `[SAFETY ABORT] Ambiguous duplicate Auth users: Found ${matchingAuthUsers.length} accounts with email '${normalizedEmail}'. Refusing to select an arbitrary account.`
    );
  }

  const adminAuthUser = matchingAuthUsers[0];
  if (!adminAuthUser.id) {
    throw new Error(
      `[SAFETY ABORT] Malformed Auth user: Auth user '${normalizedEmail}' has no valid UUID.`
    );
  }

  // 2. Profile query & relationship verification
  const { data: profile, error: profileErr } = await fetchProfileFn(normalizedEmail);

  if (profileErr) {
    throw new Error(
      `[SAFETY ABORT] Profile query failed for '${normalizedEmail}': ${profileErr.message}`
    );
  }

  if (!profile) {
    throw new Error(
      `[SAFETY ABORT] Profile missing: No student_profiles record exists for '${normalizedEmail}'. Aborting to prevent orphaned Auth update.`
    );
  }

  if (profile.user_id !== adminAuthUser.id) {
    throw new Error(
      `[SAFETY ABORT] Profile UUID mismatch: student_profiles.user_id ('${profile.user_id}') does not match auth.users.id ('${adminAuthUser.id}').`
    );
  }

  if (profile.role !== "admin") {
    throw new Error(
      `[SAFETY ABORT] Role mismatch: Target profile role is '${profile.role}', expected 'admin'. Refusing to set password on non-admin profile.`
    );
  }

  return {
    authUserId: adminAuthUser.id,
    email: normalizedEmail,
    profileId: profile.id,
    role: profile.role,
  };
}

export interface SupabaseAdminAuthUpdater {
  updateUserById: (
    userId: string,
    attributes: { password: string; [key: string]: any }
  ) => Promise<{
    data: { user: AuthUserLike | null } | null;
    error: { message: string } | null;
  }>;
}

/**
 * Isolated Password Mutation:
 * Strictly calls admin.updateUserById with ONLY the password attribute.
 * Does not modify student_profiles, app_metadata, user_metadata, or any other field.
 */
export async function executeAdminPasswordReset(params: {
  adminAuthUpdater: SupabaseAdminAuthUpdater;
  verifiedTarget: VerifiedAdminTarget;
  newPassword: string;
}): Promise<{ success: boolean; authUserId: string }> {
  const { adminAuthUpdater, verifiedTarget, newPassword } = params;

  // Strict mutation isolation: Only password attribute passed
  const updatePayload = { password: newPassword };

  const { data, error } = await adminAuthUpdater.updateUserById(
    verifiedTarget.authUserId,
    updatePayload
  );

  if (error || !data?.user) {
    throw new Error(
      `[FATAL] Failed to update password for '${verifiedTarget.email}' (UUID: ${verifiedTarget.authUserId}): ${
        error?.message || "Unknown error"
      }`
    );
  }

  return {
    success: true,
    authUserId: verifiedTarget.authUserId,
  };
}

/**
 * Loads .env.local file into process.env safely
 */
export function loadLocalEnv(baseDir = process.cwd()): void {
  const envPath = path.resolve(baseDir, ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || "";
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[match[1]] = val.trim();
      }
    });
  }
}

/**
 * Main execution routine for production admin password reset
 */
export async function runAdminPasswordReset(): Promise<void> {
  console.log("=== AttendX Production Admin Password Reset Utility ===");

  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[SAFETY ABORT] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }

  // 1. Verify project reference against strictly cmdvsqbiozqltzcphpaf
  let validatedProject: { projectRef: string; confirmedRef: string };
  try {
    validatedProject = validateProductionProjectRef(supabaseUrl, process.env.ATTENDX_TARGET_PROJECT_REF);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  // 2. Validate new password from ATTENDX_NEW_ADMIN_PASSWORD
  let newPassword: string;
  try {
    newPassword = validateAdminPassword(process.env.ATTENDX_NEW_ADMIN_PASSWORD);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log(`Connecting to confirmed Supabase project (ref: ${validatedProject.projectRef})...`);

  // 3. Safe pagination of all auth.users
  let existingUsers: AuthUserLike[];
  try {
    console.log("Fetching all existing auth.users across all pages (100 per page)...");
    existingUsers = await fetchAllAuthUsers(supabase.auth.admin, 100);
    console.log(`Discovered ${existingUsers.length} total user(s) across all auth.users pages.`);
  } catch (err: any) {
    console.error("[FATAL] Failed to fetch auth users across pages:", err.message);
    console.error("[SAFETY ABORT] Halting reset immediately to prevent partial user list mapping.");
    process.exit(1);
  }

  // 4. Verify admin account and student profile
  let verifiedTarget: VerifiedAdminTarget;
  try {
    console.log(`Verifying target account '${PRODUCTION_ADMIN_EMAIL}' and linked student profile...`);
    verifiedTarget = await verifyAdminAccountAndProfile(
      PRODUCTION_ADMIN_EMAIL,
      existingUsers,
      async (email: string) => {
        return supabase.from("student_profiles").select("*").eq("email", email).maybeSingle();
      }
    );
    console.log(`[VERIFIED] Target account confirmed in auth.users (UUID: ${verifiedTarget.authUserId})`);
    console.log(`[VERIFIED] Linked student profile confirmed (ID: ${verifiedTarget.profileId}, Role: ${verifiedTarget.role})`);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  // 5. Execute isolated password update
  try {
    console.log(`Updating password in auth.users for UUID: ${verifiedTarget.authUserId}...`);
    const result = await executeAdminPasswordReset({
      adminAuthUpdater: supabase.auth.admin,
      verifiedTarget,
      newPassword,
    });

    console.log("\n============================================================");
    console.log("            ADMIN PASSWORD SUCCESSFULLY UPDATED             ");
    console.log("============================================================");
    console.log(`Target:      ${verifiedTarget.email}`);
    console.log(`Auth UUID:   ${result.authUserId}`);
    console.log(`Profile ID:  ${verifiedTarget.profileId}`);
    console.log(`Role:        ${verifiedTarget.role}`);
    console.log("Status:      Password successfully updated in Supabase Auth.");
    console.log("Protection:  zero profiles modified, zero metadata changed, zero secrets exposed.");
    console.log("============================================================\n");
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }
}

// Auto-run when executed directly from CLI
const scriptBasename = process.argv[1] ? path.basename(process.argv[1]).replace(/\.[^/.]+$/, "") : "";
const isDirectExecution = scriptBasename === "set_admin_password" && !process.env.ATTENDX_TEST_RUNNER;

if (isDirectExecution) {
  runAdminPasswordReset().catch((err) => {
    console.error("[UNCAUGHT EXCEPTION]", err);
    process.exit(1);
  });
}
