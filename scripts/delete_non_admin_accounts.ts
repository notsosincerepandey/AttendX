/**
 * AttendX Production Non-Admin Account Cleanup Utility
 * 
 * Securely deletes all non-admin Auth users and profiles in Supabase project 'cmdvsqbiozqltzcphpaf',
 * ensuring that ONLY the ADMIN account remains.
 * 
 * Safety Guarantees:
 * 1. Strictly requires target project ref to be 'cmdvsqbiozqltzcphpaf'.
 * 2. Strictly preserves ADMIN account (admin@mmmut.ac.in / c70936b3-ffe8-4baa-908d-f92fbd62ca9a).
 * 3. Never modifies Admin password, role, profile or UUID.
 * 4. Checks foreign key dependencies before deletion; aborts if any business data would be affected.
 * 5. Verifies post-deletion state: Auth user count must equal exactly 1 (the Admin).
 * 6. Never exposes service-role keys or secrets.
 */
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  fetchAllAuthUsers,
  AuthUserLike,
} from "./migrate_supabase_auth";
import {
  validateProductionProjectRef,
  loadLocalEnv,
  REQUIRED_PRODUCTION_PROJECT_REF,
} from "./set_admin_password";

export const PRESERVED_ADMIN_EMAIL = "admin@mmmut.ac.in";
export const PRESERVED_ADMIN_UUID = "c70936b3-ffe8-4baa-908d-f92fbd62ca9a";

export interface AccountDeletionPlan {
  adminUser: AuthUserLike;
  usersToDelete: AuthUserLike[];
  nonAdminProfileIds: string[];
  dependencyCheckPassed: boolean;
  conflictDetails?: string[];
}

/**
 * Evaluates preflight plan and verifies that:
 * 1. Exactly 1 Admin exists with the required UUID and email.
 * 2. Admin is never included in the deletion list.
 * 3. No business data (polls, votes, attendance records, overrides) would be cascaded or orphaned.
 */
export async function evaluateDeletionPlan(params: {
  authUsers: AuthUserLike[];
  supabaseClient: any;
}): Promise<AccountDeletionPlan> {
  const { authUsers, supabaseClient } = params;

  // 1. Locate Preserved Admin Account
  const adminUsers = authUsers.filter(
    (u) =>
      u.id === PRESERVED_ADMIN_UUID ||
      u.email?.trim().toLowerCase() === PRESERVED_ADMIN_EMAIL.toLowerCase()
  );

  if (adminUsers.length === 0) {
    throw new Error(
      `[SAFETY ABORT] Preserved Admin account not found: No user with UUID '${PRESERVED_ADMIN_UUID}' or email '${PRESERVED_ADMIN_EMAIL}'.`
    );
  }

  if (adminUsers.length > 1) {
    throw new Error(
      `[SAFETY ABORT] Duplicate admin matches detected (${adminUsers.length}). Refusing to proceed.`
    );
  }

  const adminUser = adminUsers[0];
  if (adminUser.id !== PRESERVED_ADMIN_UUID) {
    throw new Error(
      `[SAFETY ABORT] Admin UUID mismatch: Expected '${PRESERVED_ADMIN_UUID}', but found '${adminUser.id}'.`
    );
  }

  if (adminUser.email?.trim().toLowerCase() !== PRESERVED_ADMIN_EMAIL.toLowerCase()) {
    throw new Error(
      `[SAFETY ABORT] Admin email mismatch: Expected '${PRESERVED_ADMIN_EMAIL}', but found '${adminUser.email}'.`
    );
  }

  // 2. Identify Non-Admin Users to Delete
  const usersToDelete = authUsers.filter((u) => u.id !== PRESERVED_ADMIN_UUID);

  // Safety invariant check: Admin MUST NOT be in deletion list
  if (usersToDelete.some((u) => u.id === PRESERVED_ADMIN_UUID || u.email?.toLowerCase() === PRESERVED_ADMIN_EMAIL)) {
    throw new Error(
      `[SAFETY CRITICAL] Preserved Admin account was erroneously included in deletion list! Aborting immediately.`
    );
  }

  const nonAdminIds = usersToDelete.map((u) => u.id);
  const conflicts: string[] = [];
  let nonAdminProfileIds: string[] = [];

  if (nonAdminIds.length > 0) {
    // 3. Check student_profiles
    const { data: profiles, error: profErr } = await supabaseClient
      .from("student_profiles")
      .select("id, user_id, email, role")
      .in("user_id", nonAdminIds);

    if (profErr) {
      throw new Error(`[SAFETY ABORT] Failed to query student_profiles: ${profErr.message}`);
    }

    nonAdminProfileIds = (profiles || []).map((p: any) => p.id);

    // 4. Check business data: class_polls
    const { data: polls, error: pollErr } = await supabaseClient
      .from("class_polls")
      .select("id, title, created_by")
      .in("created_by", nonAdminIds);

    if (pollErr) {
      throw new Error(`[SAFETY ABORT] Failed to query class_polls: ${pollErr.message}`);
    }
    if (polls && polls.length > 0) {
      conflicts.push(`Found ${polls.length} class_poll(s) created by non-admin accounts.`);
    }

    // 5. Check business data: class_poll_votes
    const { data: votes, error: voteErr } = await supabaseClient
      .from("class_poll_votes")
      .select("id, poll_id, user_id")
      .in("user_id", nonAdminIds);

    if (voteErr) {
      throw new Error(`[SAFETY ABORT] Failed to query class_poll_votes: ${voteErr.message}`);
    }
    if (votes && votes.length > 0) {
      conflicts.push(`Found ${votes.length} class_poll_vote(s) cast by non-admin accounts.`);
    }

    // 6. Check business data: attendance_records
    if (nonAdminProfileIds.length > 0) {
      const { data: atts, error: attErr } = await supabaseClient
        .from("attendance_records")
        .select("id, student_id")
        .in("student_id", nonAdminProfileIds);

      if (attErr) {
        throw new Error(`[SAFETY ABORT] Failed to query attendance_records: ${attErr.message}`);
      }
      if (atts && atts.length > 0) {
        conflicts.push(`Found ${atts.length} attendance_record(s) referencing non-admin student profiles.`);
      }

      // Check student_timetable_overrides
      const { data: overrides, error: ovrErr } = await supabaseClient
        .from("student_timetable_overrides")
        .select("id, student_id")
        .in("student_id", nonAdminProfileIds);

      if (ovrErr) {
        throw new Error(`[SAFETY ABORT] Failed to query student_timetable_overrides: ${ovrErr.message}`);
      }
      if (overrides && overrides.length > 0) {
        conflicts.push(`Found ${overrides.length} student_timetable_override(s) referencing non-admin student profiles.`);
      }
    }
  }

  if (conflicts.length > 0) {
    return {
      adminUser,
      usersToDelete,
      nonAdminProfileIds,
      dependencyCheckPassed: false,
      conflictDetails: conflicts,
    };
  }

  return {
    adminUser,
    usersToDelete,
    nonAdminProfileIds,
    dependencyCheckPassed: true,
  };
}

/**
 * Executes deletion of non-admin accounts safely.
 */
export async function executeAccountDeletion(params: {
  plan: AccountDeletionPlan;
  supabaseClient: any;
}): Promise<{ deletedUsersCount: number; deletedProfilesCount: number }> {
  const { plan, supabaseClient } = params;

  if (!plan.dependencyCheckPassed) {
    throw new Error(
      `[SAFETY ABORT] Execution blocked due to business data dependencies:\n${plan.conflictDetails?.join("\n")}`
    );
  }

  // Double check admin invariant
  if (plan.usersToDelete.some((u) => u.id === PRESERVED_ADMIN_UUID)) {
    throw new Error("[SAFETY CRITICAL] Invariant violation: Admin UUID in deletion list!");
  }

  let deletedProfilesCount = 0;
  let deletedUsersCount = 0;

  // 1. Delete non-admin profiles from student_profiles
  if (plan.nonAdminProfileIds.length > 0) {
    const { error: deleteProfErr } = await supabaseClient
      .from("student_profiles")
      .delete()
      .in("id", plan.nonAdminProfileIds);

    if (deleteProfErr) {
      throw new Error(`Failed to delete non-admin student_profiles: ${deleteProfErr.message}`);
    }
    deletedProfilesCount = plan.nonAdminProfileIds.length;
  }

  // 2. Delete non-admin users from Supabase Auth
  for (const user of plan.usersToDelete) {
    if (user.id === PRESERVED_ADMIN_UUID) {
      continue; // Extra safety guard
    }
    const { error: deleteErr } = await supabaseClient.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      throw new Error(
        `Failed to delete Auth user '${user.email}' (UUID: ${user.id}): ${deleteErr.message}`
      );
    }
    deletedUsersCount++;
  }

  return {
    deletedUsersCount,
    deletedProfilesCount,
  };
}

/**
 * Main routine
 */
export async function runAccountCleanup(): Promise<void> {
  console.log("=== AttendX Production Non-Admin Account Deletion Routine ===");

  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  validateProductionProjectRef(supabaseUrl, REQUIRED_PRODUCTION_PROJECT_REF);

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase URL or service-role key.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Fetch all users
  const authUsers = await fetchAllAuthUsers(supabase.auth.admin, 100);
  console.log(`Discovered ${authUsers.length} total user(s) in Supabase Auth.`);

  // 2. Evaluate plan & dependency checks
  const plan = await evaluateDeletionPlan({ authUsers, supabaseClient: supabase });

  console.log(`\nPreserved Admin Account:`);
  console.log(`- Email: ${plan.adminUser.email}`);
  console.log(`- UUID: ${plan.adminUser.id}`);

  console.log(`\nNon-Admin Users Targeted For Deletion (${plan.usersToDelete.length}):`);
  for (const u of plan.usersToDelete) {
    console.log(`  - ${u.email} (${u.id})`);
  }

  if (!plan.dependencyCheckPassed) {
    console.error("\n[SAFETY CONFLICT DETECTED] Business data would be impacted:");
    plan.conflictDetails?.forEach((c) => console.error(`  - ${c}`));
    throw new Error("[SAFETY ABORT] Halting deletion to protect application data integrity.");
  }

  console.log(`\nDependency check PASSED: Zero business data conflicts found.`);
  console.log(`Executing deletion of ${plan.usersToDelete.length} non-admin Auth account(s)...`);

  const result = await executeAccountDeletion({ plan, supabaseClient: supabase });
  console.log(`\nDeletion Summary:`);
  console.log(`- Auth Accounts Deleted: ${result.deletedUsersCount}`);
  console.log(`- Non-Admin Profiles Deleted: ${result.deletedProfilesCount}`);

  // 3. Post-deletion validation
  console.log("\n--- Post-Deletion Verification ---");
  const remainingUsers = await fetchAllAuthUsers(supabase.auth.admin, 100);
  console.log(`Remaining Auth Users count: ${remainingUsers.length}`);

  if (remainingUsers.length !== 1) {
    throw new Error(
      `[POST-VERIFY FAILED] Expected exactly 1 remaining user, but found ${remainingUsers.length}!`
    );
  }

  const remaining = remainingUsers[0];
  if (remaining.id !== PRESERVED_ADMIN_UUID || remaining.email?.toLowerCase() !== PRESERVED_ADMIN_EMAIL.toLowerCase()) {
    throw new Error(
      `[POST-VERIFY FAILED] Remaining user '${remaining.email}' (${remaining.id}) does not match expected Admin!`
    );
  }

  // Verify Admin profile in student_profiles
  const { data: adminProf, error: adminProfErr } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", PRESERVED_ADMIN_UUID)
    .single();

  if (adminProfErr || !adminProf) {
    throw new Error(`[POST-VERIFY FAILED] Admin profile missing or unreadable: ${adminProfErr?.message}`);
  }

  if (adminProf.role !== "admin") {
    throw new Error(`[POST-VERIFY FAILED] Admin profile role is '${adminProf.role}', expected 'admin'!`);
  }

  console.log(`[VERIFIED SUCCESS] Exactly 1 account remains in production:`);
  console.log(`- Email: ${remaining.email}`);
  console.log(`- UUID: ${remaining.id}`);
  console.log(`- Profile Role: ${adminProf.role}`);
  console.log(`- Profile Full Name: ${adminProf.full_name}`);
}

// Auto-run when invoked directly from CLI
if (
  process.argv[1] &&
  path.basename(process.argv[1]).replace(/\.[jt]sx?$/, "") === "delete_non_admin_accounts" &&
  process.env.ATTENDX_TEST_RUNNER !== "true"
) {
  runAccountCleanup().catch((err) => {
    console.error("\n[FATAL ERROR]", err.message);
    process.exit(1);
  });
}
