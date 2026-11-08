/**
 * AttendX Focused Recovery Failure Simulation Suite
 *
 * Verifies Requirement 4:
 *   - Simulates GoTrue credential scrambling failure
 *   - Simulates ban verification failure
 *   - Simulates database ticket cleanup failure
 *   - Proves API NEVER reports success unless independently verified
 *   - Proves critical failures are logged and surfaced for manual intervention
 */

import crypto from "crypto";
import { adminResetStudentPassword } from "../src/lib/serverAuth";
import { UserAccount } from "../src/types";

let passed = 0;
let failed = 0;

function report(name: string, ok: boolean, details?: string) {
  if (ok) {
    console.log(`  [PASS] [RECOVERY-FAILURE-TEST] ${name}`);
    passed++;
  } else {
    console.error(`  [FAIL] [RECOVERY-FAILURE-TEST] ${name}${details ? " -> " + details : ""}`);
    failed++;
  }
}

async function runRecoveryFailureTests() {
  console.log("============================================================");
  console.log(" ATTENDX ADMIN RESET RECOVERY FAILURE SIMULATION SUITE     ");
  console.log("============================================================\n");

  const adminUser: UserAccount = {
    id: "admin-uid-test",
    email: "admin@mmmut.ac.in",
    role: "admin",
    fullName: "System Admin",
    degree: "B.Tech",
    branch: "Computer Science & Engineering",
    branchCode: "CSE",
    section: "SEC-A",
    batch: "P1",
    semester: "Semester I",
    academicSession: "2026-27",
    attendanceThreshold: 75,
    activeTimetableId: "",
  };

  // We test against simulated supabase client to verify exact branching
  const targetStudentEmail = "student.recovery.fail@attendx.mmmut.ac.in";
  const studentUid = "11111111-2222-3333-4444-555555555555";

  // Save real env
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "mock_service_key";

  try {
    const supabaseJs = await import("@supabase/supabase-js");

    // ------------------------------------------------------------------------
    // SCENARIO 1: GoTrue Credential Scrambling Failure
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 1: Simulating GoTrue Credential Scrambling Failure ---");
    let lockUpdateCalled = false;

    const mockClientScrambleFail = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: [
                {
                  id: studentUid,
                  email: targetStudentEmail,
                  app_metadata: { role: "student", password_change_consumed: false, requires_password_change: true },
                },
              ],
            },
            error: null,
          }),
          updateUserById: async (id: string, attrs: any) => {
            if (attrs.app_metadata?.admin_recovery_ticket) {
              lockUpdateCalled = true;
              return { data: null, error: { message: "GoTrue connection timeout during scramble lock" } };
            }
            return { data: { user: { id } }, error: null };
          },
          getUserById: async (id: string) => ({
            data: { user: { id, banned_until: null, app_metadata: {} } },
            error: null,
          }),
        },
      },
      from: (tbl: string) => ({
        insert: async () => ({ error: null }),
        delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
        select: () => ({
          eq: (col: string, val: any) => ({
            maybeSingle: async () => ({
              // Profile synchronization fails (returns null or error)
              data: null,
              error: { message: "student_profiles row missing or synchronization error" },
            }),
            eq: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    };

    // Inject mock client via test hook
    const { setTestSupabaseAdmin } = await import("../src/lib/serverAuth");
    setTestSupabaseAdmin(mockClientScrambleFail);

    const res1 = await adminResetStudentPassword(adminUser, targetStudentEmail, "TempPass@2026");

    report(
      "1.1. Reset reports failure (HTTP 500) when credential scrambling fails",
      !res1.success && res1.statusCode === 500
    );
    report(
      "1.2. Critical error explicitly identifies manual administrative intervention required",
      Boolean(res1.error && res1.error.includes("CRITICAL_RECOVERY_FAILED") && res1.error.includes("manual administrative intervention")),
      res1.error
    );
    report("1.3. Scramble lock was attempted by recovery procedure", lockUpdateCalled);

    // ------------------------------------------------------------------------
    // SCENARIO 2: Ban Verification Failure (Lock not registered in GoTrue)
    // ------------------------------------------------------------------------
    console.log("\n--- SCENARIO 2: Simulating Ban Verification Failure ---");
    const mockClientBanFail = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: [
                {
                  id: studentUid,
                  email: targetStudentEmail,
                  app_metadata: { role: "student", password_change_consumed: false, requires_password_change: true },
                },
              ],
            },
            error: null,
          }),
          updateUserById: async (id: string, attrs: any) => ({
            data: { user: { id } },
            error: null,
          }),
          getUserById: async (id: string) => ({
            // User retrieved has NO banned_until set (simulating verification failure)
            data: {
              user: {
                id,
                banned_until: null, // NOT BANNED!
                app_metadata: { account_status: "RECOVERY_LOCKED", requires_password_change: true, password_change_consumed: false },
              },
            },
            error: null,
          }),
        },
      },
      from: (tbl: string) => ({
        insert: async () => ({ error: null }),
        delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: { message: "Profile sync failed" } }),
            eq: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    };

    setTestSupabaseAdmin(mockClientBanFail);

    const res2 = await adminResetStudentPassword(adminUser, targetStudentEmail, "TempPass@2026");

    report(
      "2.1. Reset reports failure (HTTP 500) when ban verification fails",
      !res2.success && res2.statusCode === 500
    );
    report(
      "2.2. Error indicates lock verification mismatch and mandates manual intervention",
      Boolean(res2.error && res2.error.includes("CRITICAL_RECOVERY_FAILED") && res2.error.includes("banned=false")),
      res2.error
    );

    // ------------------------------------------------------------------------
    // SCENARIO 3: Database Ticket Cleanup Failure (Pending ticket remains)
    // ------------------------------------------------------------------------
    console.log("\n--- SCENARIO 3: Simulating Database Ticket Cleanup Failure ---");
    const mockClientTicketCleanupFail = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: [
                {
                  id: studentUid,
                  email: targetStudentEmail,
                  app_metadata: { role: "student", password_change_consumed: false, requires_password_change: true },
                },
              ],
            },
            error: null,
          }),
          updateUserById: async (id: string) => ({ data: { user: { id } }, error: null }),
          getUserById: async (id: string) => ({
            data: {
              user: {
                id,
                banned_until: new Date(Date.now() + 1000000000).toISOString(),
                app_metadata: { account_status: "RECOVERY_LOCKED", requires_password_change: true, password_change_consumed: false },
              },
            },
            error: null,
          }),
        },
      },
      from: (tbl: string) => ({
        insert: async () => ({ error: null }),
        delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: { message: "Profile sync failed" } }),
            // Simulating 1 pending ticket still unconsumed in DB!
            eq: async () => ({ data: [{ id: "unconsumed-ticket-1" }], error: null }),
          }),
        }),
      }),
    };

    setTestSupabaseAdmin(mockClientTicketCleanupFail);

    const res3 = await adminResetStudentPassword(adminUser, targetStudentEmail, "TempPass@2026");

    report(
      "3.1. Reset reports failure (HTTP 500) when ticket cleanup verification fails",
      !res3.success && res3.statusCode === 500
    );
    report(
      "3.2. Error indicates pendingTickets mismatch and flags manual intervention",
      Boolean(res3.error && res3.error.includes("CRITICAL_RECOVERY_FAILED") && res3.error.includes("pendingTickets=1")),
      res3.error
    );

    // Reset override
    setTestSupabaseAdmin(null);

  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  }

  console.log("\n============================================================");
  console.log(` RECOVERY FAILURE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED `);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runRecoveryFailureTests().catch((err) => {
  console.error("[FATAL ERROR IN RECOVERY FAILURE SUITE]", err);
  process.exit(1);
});
