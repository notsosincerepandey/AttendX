/**
 * Unit Test Suite for set_admin_password.ts
 * Tests:
 * 1. Project-reference validation and rejection (strictly cmdvsqbiozqltzcphpaf)
 * 2. Password presence, whitespace trimming, and minimum 12-character length enforcement
 * 3. Auth user duplicate detection and missing user rejection
 * 4. Profile validation (missing profile, UUID mismatch, non-admin role rejection)
 * 5. Isolated mutation verification (strictly calls updateUserById with only password)
 * 
 * Runs entirely in-memory with zero network or database calls.
 */
import {
  validateAdminPassword,
  validateProductionProjectRef,
  verifyAdminAccountAndProfile,
  executeAdminPasswordReset,
  REQUIRED_PRODUCTION_PROJECT_REF,
  PRODUCTION_ADMIN_EMAIL,
  MIN_PASSWORD_LENGTH,
} from "./set_admin_password";
import { AuthUserLike } from "./migrate_supabase_auth";

// Flag test runner environment so set_admin_password.ts does not auto-run
process.env.ATTENDX_TEST_RUNNER = "true";

async function runTests() {
  console.log("=== Testing AttendX set_admin_password.ts Safety Gates & Logic ===\n");
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

  // =============================================================
  // Test Suite 1: Project-Reference Validation & Production Isolation
  // =============================================================
  console.log("--- Suite 1: Project-Reference Strict Production Enforcement ---");

  // 1.1 Valid production URL and matching project reference
  try {
    const res = validateProductionProjectRef(
      "https://cmdvsqbiozqltzcphpaf.supabase.co",
      "cmdvsqbiozqltzcphpaf"
    );
    report("1.1 Matches exact production project reference cmdvsqbiozqltzcphpaf", res.confirmedRef === REQUIRED_PRODUCTION_PROJECT_REF);
  } catch (err: any) {
    report("1.1 Matches exact production project reference cmdvsqbiozqltzcphpaf", false, err.message);
  }

  // 1.2 Rejects test project reference even if URL matches it
  try {
    validateProductionProjectRef(
      "https://iczjocbishkvkkkfvalz.supabase.co",
      "iczjocbishkvkkkfvalz"
    );
    report("1.2 Rejects non-production project reference iczjocbishkvkkkfvalz", false, "Did not throw");
  } catch (err: any) {
    report(
      "1.2 Rejects non-production project reference iczjocbishkvkkkfvalz",
      err.message.includes("Forbidden target project reference") &&
      err.message.includes("restricted exclusively to production project reference")
    );
  }

  // 1.3 Rejects mismatched project reference
  try {
    validateProductionProjectRef(
      "https://cmdvsqbiozqltzcphpaf.supabase.co",
      "wrongref123456789012"
    );
    report("1.3 Rejects mismatched project reference", false, "Did not throw");
  } catch (err: any) {
    report(
      "1.3 Rejects mismatched project reference",
      err.message.includes("project reference mismatch")
    );
  }

  // 1.4 Rejects missing target project reference env
  try {
    validateProductionProjectRef(
      "https://cmdvsqbiozqltzcphpaf.supabase.co",
      undefined
    );
    report("1.4 Rejects missing target project reference env", false, "Did not throw");
  } catch (err: any) {
    report(
      "1.4 Rejects missing target project reference env",
      err.message.includes("ATTENDX_TARGET_PROJECT_REF environment variable is missing")
    );
  }

  // =============================================================
  // Test Suite 2: Password Requirements & Length Enforcement
  // =============================================================
  console.log("\n--- Suite 2: Password Validation & Minimum Length Enforcements ---");

  // 2.1 Rejects undefined password
  try {
    validateAdminPassword(undefined);
    report("2.1 Rejects undefined password", false, "Did not throw");
  } catch (err: any) {
    report(
      "2.1 Rejects undefined password",
      err.message.includes("ATTENDX_NEW_ADMIN_PASSWORD environment variable is missing or empty")
    );
  }

  // 2.2 Rejects empty or whitespace-only password
  try {
    validateAdminPassword("   ");
    report("2.2 Rejects whitespace-only password", false, "Did not throw");
  } catch (err: any) {
    report(
      "2.2 Rejects whitespace-only password",
      err.message.includes("at least 12 characters long")
    );
  }

  // 2.3 Rejects password with 11 characters (below minimum of 12)
  try {
    validateAdminPassword("ShortPass1!");
    report("2.3 Rejects password below 12 characters (11 chars)", false, "Did not throw");
  } catch (err: any) {
    report(
      "2.3 Rejects password below 12 characters (11 chars)",
      err.message.includes("at least 12 characters long") && err.message.includes("received: 11 characters")
    );
  }

  // 2.4 Accepts valid password of 12 characters or more
  try {
    const validPass = "ValidAdminPass#2026!";
    const res = validateAdminPassword(validPass);
    report("2.4 Accepts password meeting minimum 12-character requirement", res === validPass);
  } catch (err: any) {
    report("2.4 Accepts password meeting minimum 12-character requirement", false, err.message);
  }

  // 2.5 Error messages never leak password content
  try {
    const testSecret = "SecretPass12";
    validateAdminPassword("short");
    report("2.5 Error message never echoes secret password", false);
  } catch (err: any) {
    report("2.5 Error message never echoes secret password", !err.message.includes("short"));
  }

  // =============================================================
  // Test Suite 3: Auth User Exact Matching & Duplicate Detection
  // =============================================================
  console.log("\n--- Suite 3: Auth User Exact Matching & Duplicate Detection ---");

  const validAdminUser: AuthUserLike = {
    id: "admin-auth-uuid-001",
    email: PRODUCTION_ADMIN_EMAIL,
    app_metadata: { role: "admin" },
  };

  const mockProfileFetcher = async (email: string) => ({
    data: {
      id: "profile-uuid-001",
      user_id: "admin-auth-uuid-001",
      email,
      role: "admin",
    },
    error: null,
  });

  // 3.1 Rejects when target account does not exist in auth.users
  try {
    await verifyAdminAccountAndProfile(
      PRODUCTION_ADMIN_EMAIL,
      [],
      mockProfileFetcher
    );
    report("3.1 Rejects when target account is missing in auth.users", false, "Did not throw");
  } catch (err: any) {
    report(
      "3.1 Rejects when target account is missing in auth.users",
      err.message.includes("Target account not found") && err.message.includes(PRODUCTION_ADMIN_EMAIL)
    );
  }

  // 3.2 Rejects when duplicate accounts exist in auth.users
  const duplicateUsers: AuthUserLike[] = [
    { id: "admin-uuid-1", email: PRODUCTION_ADMIN_EMAIL },
    { id: "admin-uuid-2", email: PRODUCTION_ADMIN_EMAIL },
  ];
  try {
    await verifyAdminAccountAndProfile(
      PRODUCTION_ADMIN_EMAIL,
      duplicateUsers,
      mockProfileFetcher
    );
    report("3.2 Rejects when duplicate accounts exist in auth.users", false, "Did not throw");
  } catch (err: any) {
    report(
      "3.2 Rejects when duplicate accounts exist in auth.users",
      err.message.includes("Ambiguous duplicate Auth users") && err.message.includes("Found 2 accounts")
    );
  }

  // 3.3 Matches single account case-insensitively
  try {
    const targetWithCaps = [
      { id: "admin-auth-uuid-001", email: "Admin@MMMUT.AC.IN" },
    ];
    const res = await verifyAdminAccountAndProfile(
      PRODUCTION_ADMIN_EMAIL,
      targetWithCaps,
      mockProfileFetcher
    );
    report("3.3 Matches single account case-insensitively", res.authUserId === "admin-auth-uuid-001");
  } catch (err: any) {
    report("3.3 Matches single account case-insensitively", false, err.message);
  }

  // =============================================================
  // Test Suite 4: Profile Verification & Role Mismatch Guards
  // =============================================================
  console.log("\n--- Suite 4: Profile Verification & Role Mismatch Guards ---");

  // 4.1 Rejects when profile query fails with error
  try {
    await verifyAdminAccountAndProfile(
      PRODUCTION_ADMIN_EMAIL,
      [validAdminUser],
      async () => ({ data: null, error: { message: "Database connection timeout" } })
    );
    report("4.1 Rejects when profile query encounters database error", false, "Did not throw");
  } catch (err: any) {
    report(
      "4.1 Rejects when profile query encounters database error",
      err.message.includes("Profile query failed") && err.message.includes("Database connection timeout")
    );
  }

  // 4.2 Rejects when student_profiles record does not exist
  try {
    await verifyAdminAccountAndProfile(
      PRODUCTION_ADMIN_EMAIL,
      [validAdminUser],
      async () => ({ data: null, error: null })
    );
    report("4.2 Rejects when student_profiles record is missing", false, "Did not throw");
  } catch (err: any) {
    report(
      "4.2 Rejects when student_profiles record is missing",
      err.message.includes("Profile missing: No student_profiles record exists")
    );
  }

  // 4.3 Rejects when student_profiles.user_id does not match auth.users UUID
  try {
    await verifyAdminAccountAndProfile(
      PRODUCTION_ADMIN_EMAIL,
      [validAdminUser],
      async (email) => ({
        data: { id: "profile-1", user_id: "different-user-uuid", email, role: "admin" },
        error: null,
      })
    );
    report("4.3 Rejects when profile.user_id differs from auth UUID", false, "Did not throw");
  } catch (err: any) {
    report(
      "4.3 Rejects when profile.user_id differs from auth UUID",
      err.message.includes("Profile UUID mismatch")
    );
  }

  // 4.4 Rejects when profile role is student instead of admin
  try {
    await verifyAdminAccountAndProfile(
      PRODUCTION_ADMIN_EMAIL,
      [validAdminUser],
      async (email) => ({
        data: { id: "profile-1", user_id: validAdminUser.id, email, role: "student" },
        error: null,
      })
    );
    report("4.4 Rejects when profile role is non-admin ('student')", false, "Did not throw");
  } catch (err: any) {
    report(
      "4.4 Rejects when profile role is non-admin ('student')",
      err.message.includes("Role mismatch: Target profile role is 'student', expected 'admin'")
    );
  }

  // 4.5 Succeeds when profile UUID and admin role match perfectly
  try {
    const verified = await verifyAdminAccountAndProfile(
      PRODUCTION_ADMIN_EMAIL,
      [validAdminUser],
      mockProfileFetcher
    );
    report(
      "4.5 Successfully verifies matching Auth UUID and admin role",
      verified.authUserId === validAdminUser.id && verified.role === "admin"
    );
  } catch (err: any) {
    report("4.5 Successfully verifies matching Auth UUID and admin role", false, err.message);
  }

  // =============================================================
  // Test Suite 5: Mutation Isolation (Zero Side-Effects)
  // =============================================================
  console.log("\n--- Suite 5: Mutation Isolation & Zero Side-Effects ---");

  let updateUserCalls: { userId: string; payload: any }[] = [];
  const mockUpdater = {
    updateUserById: async (userId: string, attributes: { password: string; [key: string]: any }) => {
      updateUserCalls.push({ userId, payload: attributes });
      return {
        data: {
          user: {
            id: userId,
            email: PRODUCTION_ADMIN_EMAIL,
          },
        },
        error: null,
      };
    },
  };

  const verifiedTarget = {
    authUserId: "admin-auth-uuid-001",
    email: PRODUCTION_ADMIN_EMAIL,
    profileId: "profile-uuid-001",
    role: "admin",
  };

  // 5.1 Strictly passes ONLY { password: ... } payload to updateUserById
  updateUserCalls = [];
  const execResult = await executeAdminPasswordReset({
    adminAuthUpdater: mockUpdater,
    verifiedTarget,
    newPassword: "A-Very-Secure-Password-1234!",
  });

  const payloadKeys = Object.keys(updateUserCalls[0]?.payload || {});
  report(
    "5.1 Calls updateUserById exactly once with the verified UUID",
    updateUserCalls.length === 1 && updateUserCalls[0].userId === verifiedTarget.authUserId
  );
  report(
    "5.2 Payload contains ONLY 'password' property (zero metadata or role modifications)",
    payloadKeys.length === 1 && payloadKeys[0] === "password"
  );
  report(
    "5.3 Returns successful execution result with matching auth UUID",
    execResult.success && execResult.authUserId === verifiedTarget.authUserId
  );

  // 5.4 Handles and propagates error when updateUserById fails
  const failingUpdater = {
    updateUserById: async () => ({
      data: null,
      error: { message: "Internal server error from Supabase Auth service" },
    }),
  };

  try {
    await executeAdminPasswordReset({
      adminAuthUpdater: failingUpdater,
      verifiedTarget,
      newPassword: "A-Very-Secure-Password-1234!",
    });
    report("5.4 Throws fatal error when updateUserById fails", false, "Did not throw");
  } catch (err: any) {
    report(
      "5.4 Throws fatal error when updateUserById fails",
      err.message.includes("[FATAL] Failed to update password") &&
      err.message.includes("Internal server error from Supabase Auth service")
    );
  }

  // =============================================================
  // Test Summary
  // =============================================================
  console.log("\n============================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
