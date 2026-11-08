/**
 * AttendX Supabase Auth Migration & Provisioning Script (Phase 1.5 - Hardened)
 * Safely provisions and links Admin, Class CR, and Student accounts in Supabase Auth
 * 
 * Safety Guarantees:
 * 1. Preserves existing student_profiles UUIDs (preventing orphaned attendance records).
 * 2. Preserves existing branch, section, and batch assignments without overwriting.
 * 3. Prevents role downgrades (admin status is never demoted).
 * 4. Detects and blocks user_id / email collisions.
 * 5. Strictly idempotent: repeated execution creates zero duplicates.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { URL } from "url";

/**
 * Strict Supabase Project Reference Validator using Node.js built-in URL parser.
 * Enforces HTTPS, exact hostname format (<project-ref>.supabase.co), no embedded credentials,
 * no extraneous path/query/fragment components, and exact match against ATTENDX_TARGET_PROJECT_REF.
 */
export function validateSupabaseTargetProject(
  rawSupabaseUrl: string | undefined,
  targetProjectRefEnv: string | undefined
): { projectRef: string; confirmedRef: string } {
  if (!rawSupabaseUrl || typeof rawSupabaseUrl !== "string" || rawSupabaseUrl.trim() === "") {
    throw new Error("[SAFETY ABORT] Execution blocked: NEXT_PUBLIC_SUPABASE_URL is missing or empty.");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawSupabaseUrl.trim());
  } catch {
    throw new Error("[SAFETY ABORT] Execution blocked: NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }

  // 1. Strict HTTPS Protocol
  if (parsed.protocol !== "https:") {
    throw new Error("[SAFETY ABORT] Execution blocked: NEXT_PUBLIC_SUPABASE_URL must strictly use HTTPS.");
  }

  // Reject uppercase characters in the raw URL hostname to enforce canonical lowercase references
  const rawHost = rawSupabaseUrl.trim().replace(/^https?:\/\//i, "").split(/[\/?#:]/)[0];
  if (/[A-Z]/.test(rawHost)) {
    throw new Error("[SAFETY ABORT] Execution blocked: Supabase URL hostname must be strictly lowercase.");
  }

  // 2. Reject embedded credentials in the URL
  if (parsed.username || parsed.password) {
    throw new Error("[SAFETY ABORT] Execution blocked: NEXT_PUBLIC_SUPABASE_URL contains embedded credentials.");
  }

  // 3. Reject non-standard ports
  if (parsed.port && parsed.port !== "443") {
    throw new Error("[SAFETY ABORT] Execution blocked: Non-standard port in Supabase URL is forbidden.");
  }

  // 4. Validate Pathname (allow only root '/' or empty '')
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error("[SAFETY ABORT] Execution blocked: Unexpected pathname in Supabase URL. Only root is permitted.");
  }

  // 5. Reject query parameters or fragments
  if (parsed.search || parsed.hash) {
    throw new Error("[SAFETY ABORT] Execution blocked: Query parameters or fragments in Supabase URL are forbidden.");
  }

  // 6. Strict Hostname Format: <project-ref>.supabase.co
  const hostnameParts = parsed.hostname.toLowerCase().split(".");
  if (hostnameParts.length !== 3 || hostnameParts[1] !== "supabase" || hostnameParts[2] !== "co") {
    throw new Error("[SAFETY ABORT] Execution blocked: Invalid Supabase hostname. Expected format: <project-ref>.supabase.co");
  }

  const extractedProjectRef = hostnameParts[0];
  // Documented Supabase project reference format: exactly 20 lowercase alphanumeric characters
  const PROJECT_REF_REGEX = /^[a-z0-9]{20}$/;
  if (!PROJECT_REF_REGEX.test(extractedProjectRef)) {
    throw new Error(
      `[SAFETY ABORT] Execution blocked: Malformed project reference in Supabase hostname. ` +
      `Expected exactly 20 lowercase alphanumeric characters (received: ${extractedProjectRef.length} chars).`
    );
  }

  // 7. Require ATTENDX_TARGET_PROJECT_REF
  if (!targetProjectRefEnv || typeof targetProjectRefEnv !== "string" || targetProjectRefEnv.trim() === "") {
    throw new Error(
      "[SAFETY ABORT] Execution blocked: ATTENDX_TARGET_PROJECT_REF environment variable is missing.\n" +
      "To perform account provisioning/migration, you must explicitly specify the target project reference:\n" +
      "  $env:ATTENDX_TARGET_PROJECT_REF=\"<intended-project-ref>\""
    );
  }

  const confirmedRef = targetProjectRefEnv.trim();
  if (!PROJECT_REF_REGEX.test(confirmedRef)) {
    throw new Error(
      `[SAFETY ABORT] Execution blocked: Invalid ATTENDX_TARGET_PROJECT_REF format. ` +
      `Expected exactly 20 lowercase alphanumeric characters (received: ${confirmedRef.length} chars).`
    );
  }

  // 8. Exact Reference Match
  if (extractedProjectRef !== confirmedRef) {
    throw new Error(
      `[SAFETY ABORT] Execution blocked: Supabase project reference mismatch.\n` +
      `URL configured for project reference: '${extractedProjectRef}'\n` +
      `ATTENDX_TARGET_PROJECT_REF specified: '${confirmedRef}'\n` +
      `Migration halted immediately to protect against writing to the wrong Supabase project.`
    );
  }

  return { projectRef: extractedProjectRef, confirmedRef };
}

export interface AuthUserLike {
  id: string;
  email?: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  [key: string]: any;
}

export interface SupabaseAdminAuthClientLike {
  listUsers: (params: { page: number; perPage: number }) => Promise<{
    data: { users: AuthUserLike[] } | null;
    error: { message: string } | null;
  }>;
}

/**
 * Paginates through all pages of supabase.auth.admin.listUsers until all users are collected.
 * Aborts with an error if any page fails, preventing incomplete user list processing.
 * Guards against infinite loops with MAX_PAGES.
 */
export async function fetchAllAuthUsers(
  adminAuthClient: SupabaseAdminAuthClientLike,
  perPage = 100,
  maxPages = 500
): Promise<AuthUserLike[]> {
  const allUsers: AuthUserLike[] = [];
  let page = 1;

  while (page <= maxPages) {
    const { data, error } = await adminAuthClient.listUsers({ page, perPage });

    if (error) {
      throw new Error(`[CRITICAL] Failed to fetch auth users on page ${page}: ${error.message}`);
    }

    const pageUsers = data?.users || [];
    allUsers.push(...pageUsers);

    // If fewer than perPage users returned, we have reached the final partial or empty page
    if (pageUsers.length < perPage) {
      break;
    }

    page++;
    if (page > maxPages) {
      throw new Error(
        `[CRITICAL SAFETY ABORT] Auth pagination exceeded safety limit of ${maxPages} pages (${maxPages * perPage} users). Halting migration.`
      );
    }
  }

  return allUsers;
}

export interface MigrationTarget {
  email: string;
  fullName: string;
  role: string;
  managedBranchCode?: string;
  managedSection?: string;
  defaultBatch: string;
  defaultSession: string;
  defaultSemester: string;
}

export interface TargetPreflightPlan {
  target: MigrationTarget;
  authStatus: "EXISTS" | "NEW" | "AMBIGUOUS_DUPLICATE";
  profileStatus: "EXISTS" | "NEW" | "COLLISION" | "FETCH_ERROR";
  existingAuthUser: AuthUserLike | null;
  existingProfile: any | null;
  proposedAction: string;
  hasConflict: boolean;
  conflictReason?: string;
}

/**
 * Pure Preflight Evaluator: Assesses Auth user discovery and profile state for a target account.
 * Determines proposed action and flags conflicts without executing any mutations.
 */
export async function evaluatePreflightPlan(
  target: MigrationTarget,
  existingUsers: AuthUserLike[],
  fetchProfileFn: (email: string) => Promise<{ data: any | null; error: { message: string } | null }>
): Promise<TargetPreflightPlan> {
  // Preflight 1: Duplicate Auth-User Detection & Exact Matching
  const matchingAuthUsers = existingUsers.filter(
    (u) => u.email?.toLowerCase() === target.email.toLowerCase()
  );

  let authStatus: "EXISTS" | "NEW" | "AMBIGUOUS_DUPLICATE" = "NEW";
  let existingAuthUser: AuthUserLike | null = null;
  let hasConflict = false;
  let conflictReason: string | undefined;

  if (matchingAuthUsers.length > 1) {
    authStatus = "AMBIGUOUS_DUPLICATE";
    hasConflict = true;
    conflictReason = `Multiple Auth users (${matchingAuthUsers.length}) found with email '${target.email}'. Refusing to select an arbitrary duplicate.`;
  } else if (matchingAuthUsers.length === 1) {
    authStatus = "EXISTS";
    existingAuthUser = matchingAuthUsers[0];
  }

  // Preflight 2: Profile Query & Collision Check BEFORE Mutation
  const { data: existingProfile, error: profileFetchErr } = await fetchProfileFn(target.email.toLowerCase());

  let profileStatus: "EXISTS" | "NEW" | "COLLISION" | "FETCH_ERROR" = "NEW";

  if (profileFetchErr) {
    profileStatus = "FETCH_ERROR";
    hasConflict = true;
    conflictReason = `Failed to query student_profiles: ${profileFetchErr.message}`;
  } else if (existingProfile) {
    profileStatus = "EXISTS";

    if (existingAuthUser && existingProfile.user_id && existingProfile.user_id !== existingAuthUser.id) {
      profileStatus = "COLLISION";
      hasConflict = true;
      conflictReason = `Profile ${existingProfile.id} is already linked to user_id '${existingProfile.user_id}', but matching auth.users UUID is '${existingAuthUser.id}'.`;
    } else if (!existingAuthUser && existingProfile.user_id) {
      profileStatus = "COLLISION";
      hasConflict = true;
      conflictReason = `Profile ${existingProfile.id} is already linked to user_id '${existingProfile.user_id}', but no auth.users row exists with this email.`;
    }
  }

  // Determine proposed action
  let proposedAction = "";
  if (hasConflict) {
    proposedAction = `BLOCKED: ${conflictReason}`;
  } else if (authStatus === "EXISTS" && profileStatus === "EXISTS") {
    proposedAction = `UPDATE auth.users app_metadata and LINK existing student_profiles record (${existingProfile.id})`;
  } else if (authStatus === "EXISTS" && profileStatus === "NEW") {
    proposedAction = `UPDATE auth.users app_metadata and INSERT new student_profiles record`;
  } else if (authStatus === "NEW" && profileStatus === "EXISTS") {
    proposedAction = `PROVISION new auth.user and LINK existing student_profiles record (${existingProfile.id})`;
  } else {
    proposedAction = `PROVISION new auth.user and INSERT new student_profiles record`;
  }

  return {
    target,
    authStatus,
    profileStatus,
    existingAuthUser,
    existingProfile,
    proposedAction,
    hasConflict,
    conflictReason,
  };
}

// Load environment variables
const envPath = path.resolve(process.cwd(), ".env.local");
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MIGRATION_TARGETS = [
  {
    email: "admin@mmmut.ac.in",
    fullName: "Shubh Pandey",
    role: "admin",
    managedBranchCode: "IT",
    managedSection: "SEC-B",
    defaultBatch: "P1",
    defaultSession: "2025-26",
    defaultSemester: "Semester I",
  },
  {
    email: "cr.it@mmmut.ac.in",
    fullName: "Aryan Singh (CR)",
    role: "class_admin",
    managedBranchCode: "IT",
    managedSection: "SEC-B",
    defaultBatch: "P1",
    defaultSession: "2025-26",
    defaultSemester: "Semester I",
  },
  {
    email: "student@mmmut.ac.in",
    fullName: "Guest Student",
    role: "student",
    managedBranchCode: "CSE",
    managedSection: "SEC-A",
    defaultBatch: "P1",
    defaultSession: "2025-26",
    defaultSemester: "Semester I",
  },
];

async function runMigration() {
  console.log("=== AttendX Phase 1.5: Hardened Supabase Auth & Role Migration ===");

  if (!supabaseUrl || !serviceKey) {
    console.error("[ERROR] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }

  // -------------------------------------------------------------
  // Mandatory Target Project-Reference Confirmation Guard
  // -------------------------------------------------------------
  let validatedProject: { projectRef: string; confirmedRef: string };
  try {
    validatedProject = validateSupabaseTargetProject(supabaseUrl, process.env.ATTENDX_TARGET_PROJECT_REF);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log(`Connecting to confirmed Supabase project (ref: ${validatedProject.projectRef})...`);

  let existingUsers: AuthUserLike[];
  try {
    console.log("Fetching all existing auth.users across all pages (100 per page)...");
    existingUsers = await fetchAllAuthUsers(supabase.auth.admin, 100);
    console.log(`Discovered ${existingUsers.length} total user(s) across all auth.users pages.`);
  } catch (err: any) {
    console.error("[ERROR] Failed to fetch auth users across pages:", err.message);
    console.error("[SAFETY ABORT] Halting migration immediately to prevent partial user list mapping.");
    process.exit(1);
  }

  const isDryRun = process.env.ATTENDX_MIGRATION_DRY_RUN === "true";
  const confirmExecute = process.env.ATTENDX_CONFIRM_EXECUTE_MIGRATION === "true";

  console.log(`\nMode: ${isDryRun ? "DRY-RUN (Safe Read-Only Simulation)" : "LIVE EXECUTION"}`);

  // =============================================================
  // Phase 1: Pure Read-Only Preflight Evaluation (All Targets)
  // =============================================================
  console.log("\n--- Evaluating Preflight Plans for Migration Targets ---");
  const plans: TargetPreflightPlan[] = [];

  for (const target of MIGRATION_TARGETS) {
    const plan = await evaluatePreflightPlan(
      target,
      existingUsers,
      async (email) => {
        return supabase.from("student_profiles").select("*").eq("email", email).maybeSingle();
      }
    );
    plans.push(plan);
  }

  // Display Preflight / Assessment Report
  console.log("\n============================================================");
  console.log("            MIGRATION PREFLIGHT ASSESSMENT REPORT           ");
  console.log("============================================================");
  for (const p of plans) {
    console.log(`Target: ${p.target.email} (${p.target.role})`);
    console.log(`  Auth Status:    ${p.authStatus}${p.existingAuthUser ? ` (UUID: ${p.existingAuthUser.id})` : ""}`);
    console.log(`  Profile Status: ${p.profileStatus}${p.existingProfile ? ` (ID: ${p.existingProfile.id})` : ""}`);
    console.log(`  Proposed Plan:  ${p.proposedAction}`);
    if (p.hasConflict) {
      console.log(`  [CONFLICT ALERT] ${p.conflictReason}`);
    }
    console.log("------------------------------------------------------------");
  }

  // =============================================================
  // ARCHITECTURAL SAFETY GATE: DRY-RUN EXIT
  // =============================================================
  if (isDryRun) {
    const conflictCount = plans.filter((p) => p.hasConflict).length;
    console.log("\n[DRY-RUN COMPLETE] Read-only simulation finished successfully.");
    console.log(`Evaluated ${plans.length} target accounts (${conflictCount} conflict(s) detected).`);
    console.log("ZERO mutations made to Supabase Auth or database.");
    console.log("No temporary passwords generated.");
    return;
  }

  // =============================================================
  // PRODUCTION EXECUTION CONFIRMATION GUARD
  // =============================================================
  if (!confirmExecute) {
    console.error("\n[SAFETY ABORT] Execution blocked: ATTENDX_CONFIRM_EXECUTE_MIGRATION is not set to 'true'.");
    console.error("To execute actual mutations against the confirmed Supabase database, you must explicitly set:");
    console.error("  $env:ATTENDX_CONFIRM_EXECUTE_MIGRATION=\"true\"");
    console.error("Alternatively, to run a safe read-only simulation without making changes, use dry-run mode:");
    console.error("  $env:ATTENDX_MIGRATION_DRY_RUN=\"true\"");
    process.exit(1);
  }

  // =============================================================
  // Phase 2: Live Mutation Execution (Only reached when confirmed)
  // =============================================================
  console.log("\n============================================================");
  console.log("            EXECUTING AUTH & PROFILE MUTATIONS              ");
  console.log("============================================================");

  for (const plan of plans) {
    const { target, existingAuthUser: existingAuth, existingProfile, hasConflict, conflictReason } = plan;
    console.log(`\n--- Processing target account: ${target.email} ---`);

    if (hasConflict) {
      console.error(`[SKIPPED DUE TO CONFLICT] ${conflictReason}`);
      continue;
    }

    let authUserId: string;

    // Step 2a: Supabase Auth Provisioning / App_Metadata Update
    if (existingAuth) {
      authUserId = existingAuth.id;
      console.log(`[EXISTS] User ${target.email} confirmed in auth.users (UUID: ${authUserId})`);

      const currentRole = existingAuth.app_metadata?.role;
      const effectiveRole = currentRole === "admin" ? "admin" : target.role;

      const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, {
        app_metadata: {
          ...existingAuth.app_metadata,
          role: effectiveRole,
          managedBranchCode: target.managedBranchCode,
          managedSection: target.managedSection,
        },
      });

      if (updateErr) {
        console.error(
          `[ERROR] Failed to update app_metadata for ${target.email}: ${updateErr.message}. ` +
          `Aborting dependent profile update for this account.`
        );
        continue;
      } else {
        console.log(`[UPDATED] Authoritative role '${effectiveRole}' locked in app_metadata.`);
      }
    } else {
      console.log(`[PROVISION] Creating user ${target.email} with role '${target.role}'...`);
      const secureRandomBytes = crypto.randomBytes(24).toString("base64url");
      const tempKey = `InitAuth_${secureRandomBytes}!9A`;

      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: target.email,
        password: tempKey,
        email_confirm: true,
        app_metadata: {
          role: target.role,
          managedBranchCode: target.managedBranchCode,
          managedSection: target.managedSection,
        },
        user_metadata: {
          full_name: target.fullName,
        },
      });

      if (createErr || !created?.user) {
        console.error(
          `[ERROR] Failed to create auth user for ${target.email}: ${createErr?.message}. ` +
          `Aborting profile creation.`
        );
        continue;
      }
      authUserId = created.user.id;
      console.log(`[CREATED] User ${target.email} provisioned in auth.users (UUID: ${authUserId})`);
    }

    // Step 2b: Student Profile Linkage / Insertion
    if (existingProfile) {
      console.log(`[PRESERVE] Existing student profile found (ID: ${existingProfile.id}). Preserving batch, section, and relations.`);

      const { error: profileUpdateErr } = await supabase
        .from("student_profiles")
        .update({
          user_id: authUserId,
          role: existingProfile.role === "admin" ? "admin" : target.role,
          managed_branch_code: existingProfile.managed_branch_code || target.managedBranchCode,
          managed_section: existingProfile.managed_section || target.managedSection,
        })
        .eq("id", existingProfile.id);

      if (profileUpdateErr) {
        console.error(
          `[PARTIAL PROVISIONING WARNING] Auth user was updated/provisioned (UUID: ${authUserId}), ` +
          `but student_profiles record ${existingProfile.id} failed to update: ${profileUpdateErr.message}. ` +
          `Manual review or rerunning the idempotent script is required. No automated rollback was performed.`
        );
      } else {
        console.log(`[LINKED] student_profiles record ${existingProfile.id} linked to auth.users UUID ${authUserId}.`);
      }
    } else {
      const { error: profileInsertErr } = await supabase.from("student_profiles").insert({
        id: authUserId,
        user_id: authUserId,
        email: target.email,
        full_name: target.fullName,
        role: target.role,
        managed_branch_code: target.managedBranchCode,
        managed_section: target.managedSection,
        batch: target.defaultBatch,
        semester: target.defaultSemester,
        academic_session: target.defaultSession,
        attendance_threshold: 75.0,
      });

      if (profileInsertErr) {
        console.error(
          `[PARTIAL PROVISIONING WARNING] Auth user was provisioned (UUID: ${authUserId}), ` +
          `but new student_profiles record could not be inserted: ${profileInsertErr.message}. ` +
          `Manual review or rerunning the idempotent script is required. No automated rollback was performed.`
        );
      } else {
        console.log(`[CREATED] New student profile created for ${target.email} with UUID ${authUserId}.`);
      }
    }
  }

  console.log("\n=== Hardened Migration Completed Successfully ===");
}

// Execute only when invoked directly as a script (never when imported as a module)
const isDirectExecution =
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith("migrate_supabase_auth.ts") || process.argv[1].endsWith("migrate_supabase_auth.js"));

if (isDirectExecution) {
  runMigration().catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
}
