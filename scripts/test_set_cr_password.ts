/**
 * Unit Test Suite for set_cr_password.ts
 * Tests:
 * 1. Production project guard (strictly cmdvsqbiozqltzcphpaf)
 * 2. Missing and invalid passwords (presence, whitespace, min 12-char length)
 * 3. Auth user discovery (missing target, duplicate detection, exact match)
 * 4. Profile validation (missing profile, UUID mismatch)
 * 5. Role validation (strictly class_admin)
 * 6. Scope validation (strictly IT / SEC-B)
 * 7. Isolated mutation verification (strictly calls updateUserById with only password)
 * 
 * Runs entirely in-memory with zero network or database calls.
 */
import {
  validateCrPassword,
  validateProductionProjectRef,
  verifyCrAccountAndProfile,
  executeCrPasswordReset,
  REQUIRED_PRODUCTION_PROJECT_REF,
  PRODUCTION_CR_EMAIL,
  EXPECTED_CR_ROLE,
  EXPECTED_CR_BRANCH,
  EXPECTED_CR_SECTION,
  MIN_PASSWORD_LENGTH,
} from "./set_cr_password";
import { AuthUserLike } from "./migrate_supabase_auth";

// Flag test runner environment so set_cr_password.ts does not auto-run
process.env.ATTENDX_TEST_RUNNER = "true";

async function runTests() {
  console.log("=== Testing AttendX set_cr_password.ts Safety Gates & Logic ===\n");
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
  // Test Suite 1: Production Project Reference Guard
  // =============================================================
  console.log("--- Suite 1: Production Project Reference Guard ---");

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
  // Test Suite 2: Password Validation & Requirements
  // =============================================================
  console.log("\n--- Suite 2: Password Validation & Requirements ---");

  // 2.1 Rejects undefined password
  try {
    validateCrPassword(undefined);
    report("2.1 Rejects undefined password", false, "Did not throw");
  } catch (err: any) {
    report(
      "2.1 Rejects undefined password",
      err.message.includes("ATTENDX_NEW_CR_PASSWORD environment variable is missing or empty")
    );
  }

  // 2.2 Rejects empty or whitespace-only password
  try {
    validateCrPassword("   ");
    report("2.2 Rejects whitespace-only password", false, "Did not throw");
  } catch (err: any) {
    report(
      "2.2 Rejects whitespace-only password",
      err.message.includes("at least 12 characters long")
    );
  }

  // 2.3 Rejects password with 11 characters (below minimum of 12)
  try {
    validateCrPassword("CrSecret12!");
    report("2.3 Rejects password below 12 characters (11 chars)", false, "Did not throw");
  } catch (err: any) {
    report(
      "2.3 Rejects password below 12 characters (11 chars)",
      err.message.includes("at least 12 characters long") && err.message.includes("received: 11 characters")
    );
  }

  // 2.4 Accepts valid password of 12 characters or more
  try {
    const validPass = "ValidCrPass#2026!";
    const res = validateCrPassword(validPass);
    report("2.4 Accepts password meeting minimum 12-character requirement", res === validPass);
  } catch (err: any) {
    report("2.4 Accepts password meeting minimum 12-character requirement", false, err.message);
  }

  // 2.5 Error messages never leak password content
  try {
    validateCrPassword("crpassword");
    report("2.5 Error message never echoes secret password", false);
  } catch (err: any) {
    report("2.5 Error message never echoes secret password", !err.message.includes("crpassword"));
  }

  // =============================================================
  // Test Suite 3: Auth User Exact Matching & Duplicate Detection
  // =============================================================
  console.log("\n--- Suite 3: Auth User Discovery & Duplicate Detection ---");

  const validCrAuthUser: AuthUserLike = {
    id: "cr-auth-uuid-001",
    email: PRODUCTION_CR_EMAIL,
    app_metadata: { role: "class_admin" },
  };

  const mockCrProfileFetcher = async (email: string) => ({
    data: {
      id: "cr-profile-uuid-001",
      user_id: "cr-auth-uuid-001",
      email,
      role: EXPECTED_CR_ROLE,
      managed_branch_code: EXPECTED_CR_BRANCH,
      managed_section: EXPECTED_CR_SECTION,
    },
    error: null,
  });

  // 3.1 Rejects when target CR account is missing from auth.users
  try {
    await verifyCrAccountAndProfile(
      PRODUCTION_CR_EMAIL,
      [],
      mockCrProfileFetcher
    );
    report("3.1 Rejects when target CR account is missing in auth.users", false, "Did not throw");
  } catch (err: any) {
    report(
      "3.1 Rejects when target CR account is missing in auth.users",
      err.message.includes("Target account not found") && err.message.includes(PRODUCTION_CR_EMAIL)
    );
  }

  // 3.2 Rejects when duplicate CR accounts exist in auth.users
  const duplicateCrUsers: AuthUserLike[] = [
    { id: "cr-uuid-1", email: PRODUCTION_CR_EMAIL },
    { id: "cr-uuid-2", email: PRODUCTION_CR_EMAIL },
  ];
  try {
    await verifyCrAccountAndProfile(
      PRODUCTION_CR_EMAIL,
      duplicateCrUsers,
      mockCrProfileFetcher
    );
    report("3.2 Rejects when duplicate accounts exist in auth.users", false, "Did not throw");
  } catch (err: any) {
    report(
      "3.2 Rejects when duplicate accounts exist in auth.users",
      err.message.includes("Ambiguous duplicate Auth users") && err.message.includes("Found 2 accounts")
    );
  }

  // 3.3 Matches single CR account case-insensitively
  try {
    const targetWithCaps = [
      { id: "cr-auth-uuid-001", email: "CR.IT@mmmut.ac.in" },
    ];
    const res = await verifyCrAccountAndProfile(
      PRODUCTION_CR_EMAIL,
      targetWithCaps,
      mockCrProfileFetcher
    );
    report("3.3 Matches single CR account case-insensitively", res.authUserId === "cr-auth-uuid-001");
  } catch (err: any) {
    report("3.3 Matches single CR account case-insensitively", false, err.message);
  }

  // =============================================================
  // Test Suite 4: Profile Verification & UUID Mismatch
  // =============================================================
  console.log("\n--- Suite 4: Profile Verification & UUID Mismatch ---");

  // 4.1 Rejects when profile query encounters database error
  try {
    await verifyCrAccountAndProfile(
      PRODUCTION_CR_EMAIL,
      [validCrAuthUser],
      async () => ({ data: null, error: { message: "Connection timeout to PostgreSQL" } })
    );
    report("4.1 Rejects when profile query encounters database error", false, "Did not throw");
  } catch (err: any) {
    report(
      "4.1 Rejects when profile query encounters database error",
      err.message.includes("Profile query failed") && err.message.includes("Connection timeout")
    );
  }

  // 4.2 Rejects when student_profiles record does not exist
  try {
    await verifyCrAccountAndProfile(
      PRODUCTION_CR_EMAIL,
      [validCrAuthUser],
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
    await verifyCrAccountAndProfile(
      PRODUCTION_CR_EMAIL,
      [validCrAuthUser],
      async (email) => ({
        data: {
          id: "cr-profile-1",
          user_id: "mismatched-foreign-uuid",
          email,
          role: EXPECTED_CR_ROLE,
          managed_branch_code: EXPECTED_CR_BRANCH,
          managed_section: EXPECTED_CR_SECTION,
        },
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

  // =============================================================
  // Test Suite 5: Role & Institutional Scope Verification
  // =============================================================
  console.log("\n--- Suite 5: Role & Institutional Scope Verification ---");

  // 5.1 Rejects when profile role is 'student' instead of 'class_admin'
  try {
    await verifyCrAccountAndProfile(
      PRODUCTION_CR_EMAIL,
      [validCrAuthUser],
      async (email) => ({
        data: {
          id: "cr-profile-1",
          user_id: validCrAuthUser.id,
          email,
          role: "student",
          managed_branch_code: EXPECTED_CR_BRANCH,
          managed_section: EXPECTED_CR_SECTION,
        },
        error: null,
      })
    );
    report("5.1 Rejects when profile role is 'student'", false, "Did not throw");
  } catch (err: any) {
    report(
      "5.1 Rejects when profile role is 'student'",
      err.message.includes("Role mismatch: Target profile role is 'student', expected 'class_admin'")
    );
  }

  // 5.2 Rejects when profile role is 'admin' instead of 'class_admin'
  try {
    await verifyCrAccountAndProfile(
      PRODUCTION_CR_EMAIL,
      [validCrAuthUser],
      async (email) => ({
        data: {
          id: "cr-profile-1",
          user_id: validCrAuthUser.id,
          email,
          role: "admin",
          managed_branch_code: EXPECTED_CR_BRANCH,
          managed_section: EXPECTED_CR_SECTION,
        },
        error: null,
      })
    );
    report("5.2 Rejects when profile role is 'admin'", false, "Did not throw");
  } catch (err: any) {
    report(
      "5.2 Rejects when profile role is 'admin'",
      err.message.includes("Role mismatch: Target profile role is 'admin', expected 'class_admin'")
    );
  }

  // 5.3 Rejects when managed branch is not IT (e.g. CSE)
  try {
    await verifyCrAccountAndProfile(
      PRODUCTION_CR_EMAIL,
      [validCrAuthUser],
      async (email) => ({
        data: {
          id: "cr-profile-1",
          user_id: validCrAuthUser.id,
          email,
          role: EXPECTED_CR_ROLE,
          managed_branch_code: "CSE",
          managed_section: EXPECTED_CR_SECTION,
        },
        error: null,
      })
    );
    report("5.3 Rejects when managed branch is not IT", false, "Did not throw");
  } catch (err: any) {
    report(
      "5.3 Rejects when managed branch is not IT",
      err.message.includes("Scope mismatch (Branch): Target profile managed branch is 'CSE', expected 'IT'")
    );
  }

  // 5.4 Rejects when managed section is not SEC-B (e.g. SEC-A)
  try {
    await verifyCrAccountAndProfile(
      PRODUCTION_CR_EMAIL,
      [validCrAuthUser],
      async (email) => ({
        data: {
          id: "cr-profile-1",
          user_id: validCrAuthUser.id,
          email,
          role: EXPECTED_CR_ROLE,
          managed_branch_code: EXPECTED_CR_BRANCH,
          managed_section: "SEC-A",
        },
        error: null,
      })
    );
    report("5.4 Rejects when managed section is not SEC-B", false, "Did not throw");
  } catch (err: any) {
    report(
      "5.4 Rejects when managed section is not SEC-B",
      err.message.includes("Scope mismatch (Section): Target profile managed section is 'SEC-A', expected 'SEC-B'")
    );
  }

  // 5.5 Succeeds when profile UUID, class_admin role, and IT / SEC-B scope match
  try {
    const verified = await verifyCrAccountAndProfile(
      PRODUCTION_CR_EMAIL,
      [validCrAuthUser],
      mockCrProfileFetcher
    );
    report(
      "5.5 Successfully verifies matching Auth UUID, class_admin role, and IT / SEC-B scope",
      verified.authUserId === validCrAuthUser.id &&
      verified.role === EXPECTED_CR_ROLE &&
      verified.managedBranchCode === EXPECTED_CR_BRANCH &&
      verified.managedSection === EXPECTED_CR_SECTION
    );
  } catch (err: any) {
    report("5.5 Successfully verifies matching Auth UUID, class_admin role, and IT / SEC-B scope", false, err.message);
  }

  // =============================================================
  // Test Suite 6: Mutation Isolation (Zero Side-Effects)
  // =============================================================
  console.log("\n--- Suite 6: Mutation Isolation & Zero Side-Effects ---");

  let updateUserCalls: { userId: string; payload: any }[] = [];
  const mockUpdater = {
    updateUserById: async (userId: string, attributes: { password: string; [key: string]: any }) => {
      updateUserCalls.push({ userId, payload: attributes });
      return {
        data: {
          user: {
            id: userId,
            email: PRODUCTION_CR_EMAIL,
          },
        },
        error: null,
      };
    },
  };

  const verifiedTarget = {
    authUserId: "cr-auth-uuid-001",
    email: PRODUCTION_CR_EMAIL,
    profileId: "cr-profile-uuid-001",
    role: EXPECTED_CR_ROLE,
    managedBranchCode: EXPECTED_CR_BRANCH,
    managedSection: EXPECTED_CR_SECTION,
  };

  // 6.1 Strictly passes ONLY { password: ... } payload to updateUserById
  updateUserCalls = [];
  const execResult = await executeCrPasswordReset({
    adminAuthUpdater: mockUpdater,
    verifiedTarget,
    newPassword: "A-Very-Secure-CR-Password-2026!",
  });

  const payloadKeys = Object.keys(updateUserCalls[0]?.payload || {});
  report(
    "6.1 Calls updateUserById exactly once with the verified UUID",
    updateUserCalls.length === 1 && updateUserCalls[0].userId === verifiedTarget.authUserId
  );
  report(
    "6.2 Payload contains ONLY 'password' property (zero metadata or role modifications)",
    payloadKeys.length === 1 && payloadKeys[0] === "password"
  );
  report(
    "6.3 Returns successful execution result with matching auth UUID",
    execResult.success && execResult.authUserId === verifiedTarget.authUserId
  );

  // 6.4 Handles and propagates error when updateUserById fails
  const failingUpdater = {
    updateUserById: async () => ({
      data: null,
      error: { message: "Internal server error from Supabase Auth service" },
    }),
  };

  try {
    await executeCrPasswordReset({
      adminAuthUpdater: failingUpdater,
      verifiedTarget,
      newPassword: "A-Very-Secure-CR-Password-2026!",
    });
    report("6.4 Throws fatal error when updateUserById fails", false, "Did not throw");
  } catch (err: any) {
    report(
      "6.4 Throws fatal error when updateUserById fails",
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
