/**
 * Unit Test Suite for delete_non_admin_accounts.ts
 * 
 * Verifies:
 * 1. Project reference guard (strictly cmdvsqbiozqltzcphpaf)
 * 2. Missing admin detection & abort
 * 3. Duplicate admin detection & abort
 * 4. Admin preservation invariant (admin is never included in usersToDelete)
 * 5. Business data conflict detection & abort (polls, votes, attendance records)
 * 6. Deletion execution isolation
 * 
 * Runs entirely in-memory with zero network or database mutations.
 */
import {
  evaluateDeletionPlan,
  executeAccountDeletion,
  PRESERVED_ADMIN_EMAIL,
  PRESERVED_ADMIN_UUID,
} from "./delete_non_admin_accounts";
import { validateProductionProjectRef, REQUIRED_PRODUCTION_PROJECT_REF } from "./set_admin_password";
import { AuthUserLike } from "./migrate_supabase_auth";

process.env.ATTENDX_TEST_RUNNER = "true";

async function runTests() {
  console.log("=== Testing AttendX delete_non_admin_accounts.ts Safety Gates ===\n");
  let passed = 0;
  let failed = 0;

  function report(name: string, ok: boolean, details?: string) {
    if (ok) {
      console.log(`[PASS] ${name}${details ? " - " + details : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}${details ? " - " + details : ""}`);
      failed++;
    }
  }

  // --- Suite 1: Production Project Guard ---
  console.log("--- Suite 1: Production Project Reference Guard ---");

  try {
    validateProductionProjectRef(
      `https://${REQUIRED_PRODUCTION_PROJECT_REF}.supabase.co`,
      REQUIRED_PRODUCTION_PROJECT_REF
    );
    report("1.1 Matches exact production project reference cmdvsqbiozqltzcphpaf", true);
  } catch {
    report("1.1 Matches exact production project reference cmdvsqbiozqltzcphpaf", false);
  }

  try {
    validateProductionProjectRef(
      "https://fake-project-ref.supabase.co",
      "fake-project-ref"
    );
    report("1.2 Rejects non-production project reference", false);
  } catch (err: any) {
    report(
      "1.2 Rejects non-production project reference",
      err.message.includes("[SAFETY ABORT]")
    );
  }

  // --- Suite 2: Admin Account Verification & Protection ---
  console.log("\n--- Suite 2: Admin Account Verification & Protection ---");

  const validAdmin: AuthUserLike = {
    id: PRESERVED_ADMIN_UUID,
    email: PRESERVED_ADMIN_EMAIL,
    created_at: new Date().toISOString(),
  };

  const studentUser: AuthUserLike = {
    id: "student-uuid-001",
    email: "student@mmmut.ac.in",
    created_at: new Date().toISOString(),
  };

  const crUser: AuthUserLike = {
    id: "cr-uuid-002",
    email: "cr.it@mmmut.ac.in",
    created_at: new Date().toISOString(),
  };

  // Mock client with zero conflicts
  const mockCleanSupabase = {
    from: (table: string) => ({
      select: () => ({
        in: async () => ({ data: [], error: null }),
      }),
      delete: () => ({
        in: async () => ({ error: null }),
      }),
    }),
    auth: {
      admin: {
        deleteUser: async () => ({ error: null }),
      },
    },
  };

  // 2.1 Rejects when Admin is missing from auth users
  try {
    await evaluateDeletionPlan({
      authUsers: [studentUser, crUser],
      supabaseClient: mockCleanSupabase,
    });
    report("2.1 Rejects when Admin account is missing", false);
  } catch (err: any) {
    report("2.1 Rejects when Admin account is missing", err.message.includes("[SAFETY ABORT]"));
  }

  // 2.2 Rejects duplicate admin matches
  try {
    await evaluateDeletionPlan({
      authUsers: [validAdmin, { ...validAdmin, id: "duplicate-admin-uuid" }],
      supabaseClient: mockCleanSupabase,
    });
    report("2.2 Rejects when duplicate Admin accounts detected", false);
  } catch (err: any) {
    report("2.2 Rejects when duplicate Admin accounts detected", err.message.includes("[SAFETY ABORT]"));
  }

  // 2.3 Correctly segregates admin from non-admin accounts
  const plan = await evaluateDeletionPlan({
    authUsers: [validAdmin, studentUser, crUser],
    supabaseClient: mockCleanSupabase,
  });

  report(
    "2.3 Preserves Admin and identifies exactly 2 non-admin users for deletion",
    plan.adminUser.id === PRESERVED_ADMIN_UUID &&
    plan.usersToDelete.length === 2 &&
    !plan.usersToDelete.some((u) => u.id === PRESERVED_ADMIN_UUID)
  );

  // --- Suite 3: Dependency Conflict Detection ---
  console.log("\n--- Suite 3: Business Data Conflict Detection ---");

  // Mock client with existing poll created by non-admin
  const mockConflictPollSupabase = {
    from: (table: string) => ({
      select: () => ({
        in: async () => {
          if (table === "class_polls") {
            return { data: [{ id: "poll-1", title: "Important Poll", created_by: "cr-uuid-002" }], error: null };
          }
          return { data: [], error: null };
        },
      }),
    }),
  };

  const conflictPlan = await evaluateDeletionPlan({
    authUsers: [validAdmin, crUser],
    supabaseClient: mockConflictPollSupabase,
  });

  report(
    "3.1 Detects poll dependency conflict and sets dependencyCheckPassed = false",
    conflictPlan.dependencyCheckPassed === false &&
    Boolean(conflictPlan.conflictDetails?.some((c) => c.includes("class_poll(s)")))
  );

  // Attempting execution on conflicted plan must throw
  try {
    await executeAccountDeletion({
      plan: conflictPlan,
      supabaseClient: mockConflictPollSupabase,
    });
    report("3.2 Execution blocked when business data dependency exists", false);
  } catch (err: any) {
    report("3.2 Execution blocked when business data dependency exists", err.message.includes("[SAFETY ABORT]"));
  }

  // --- Suite 4: Execution Isolation ---
  console.log("\n--- Suite 4: Execution Isolation & Admin Invariant ---");

  let deletedAuthIds: string[] = [];
  const mockExecutionSupabase = {
    from: (table: string) => ({
      delete: () => ({
        in: async () => ({ error: null }),
      }),
    }),
    auth: {
      admin: {
        deleteUser: async (id: string) => {
          deletedAuthIds.push(id);
          return { error: null };
        },
      },
    },
  };

  const execResult = await executeAccountDeletion({
    plan,
    supabaseClient: mockExecutionSupabase,
  });

  report(
    "4.1 Deletes exactly the 2 non-admin users",
    execResult.deletedUsersCount === 2 &&
    deletedAuthIds.includes(studentUser.id) &&
    deletedAuthIds.includes(crUser.id)
  );

  report(
    "4.2 Never deletes or targets the Admin UUID",
    !deletedAuthIds.includes(PRESERVED_ADMIN_UUID)
  );

  console.log("\n============================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("============================================================\n");

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
