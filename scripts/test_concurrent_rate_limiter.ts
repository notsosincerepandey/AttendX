/**
 * AttendX Live Concurrent Rate Limiter Verification Suite
 *
 * Target: Isolated TEST Project iczjocbishkvkkkfvalz
 * Endpoint: https://iczjocbishkvkkkfvalz.supabase.co
 *
 * Exercises the genuine PostgreSQL RPC: public.check_and_record_reset_rate_limit()
 *   - Sends 35 genuinely concurrent HTTP network requests across Node runtime to Supabase TEST DB.
 *   - Uses the actual deployed RPC (no local mocks or simulated counters).
 *   - Confirms exactly 30 requests succeed and 5 are rejected under concurrency.
 *   - Confirms subsequent 36th request remains rejected (rolling window enforced).
 *   - Tests a second administrator independently (verifying advisory lock isolation).
 *   - Strictly validates input parameters (null/empty admin, zero attempts, negative window).
 */

import { createClient } from "@supabase/supabase-js";

const TEST_PROJECT_REF = "iczjocbishkvkkkfvalz";
const TEST_PROJECT_URL = "https://iczjocbishkvkkkfvalz.supabase.co";
const TEST_SERVICE_ROLE_KEY = "REDACTED_SUPABASE_SERVICE_ROLE_KEY";

let passed = 0;
let failed = 0;

function report(name: string, ok: boolean, details?: string) {
  if (ok) {
    console.log(`  [PASS] [CONCURRENCY-TEST-LIVE] ${name}`);
    passed++;
  } else {
    console.error(`  [FAIL] [CONCURRENCY-TEST-LIVE] ${name}${details ? " -> " + details : ""}`);
    failed++;
  }
}

async function runLiveConcurrentRateLimiterTests() {
  console.log("============================================================");
  console.log(" ATTENDX LIVE CONCURRENT RATE LIMITER VERIFICATION (TEST)   ");
  console.log(` Target Project Reference: ${TEST_PROJECT_REF}                `);
  console.log(` Supabase URL:             ${TEST_PROJECT_URL}    `);
  console.log("============================================================\n");

  const adminClient = createClient(TEST_PROJECT_URL, TEST_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Check if RPC is deployed on TEST project
  const probeId = `probe_test_${Date.now()}`;
  const { data: probeData, error: probeErr } = await adminClient.rpc("check_and_record_reset_rate_limit", {
    p_admin_id: probeId,
    p_max_attempts: 30,
    p_window_seconds: 60,
  });

  if (probeErr && (probeErr.code === "PGRST202" || probeErr.message.includes("Could not find the function"))) {
    console.error(`\n[RPC_NOT_YET_DEPLOYED] Function 'check_and_record_reset_rate_limit' was not found on TEST project '${TEST_PROJECT_REF}'.`);
    console.error("The SQL migration 'supabase/migrations/20261108_bulk_student_onboarding.sql' must be executed in the TEST project SQL Editor followed by 'NOTIFY pgrst, ''reload schema'';'.\n");
    console.log("============================================================");
    console.log(" TEST RUN BLOCKED: AWAITING MIGRATION APPLICATION ON TEST   ");
    console.log("============================================================\n");
    process.exit(2);
  }

  // ------------------------------------------------------------------------
  // TEST GROUP 1: Parameter Validation via Live PostgreSQL RPC
  // ------------------------------------------------------------------------
  console.log("--- TEST GROUP 1: Parameter Validation via Live RPC ---");
  
  const { error: nullAdminErr } = await adminClient.rpc("check_and_record_reset_rate_limit", {
    p_admin_id: "",
    p_max_attempts: 30,
    p_window_seconds: 60,
  });
  report("1.1. Live RPC rejects empty admin ID with PostgreSQL exception", 
    Boolean(nullAdminErr && nullAdminErr.message.includes("p_admin_id cannot be null or empty")),
    nullAdminErr?.message
  );

  const { error: zeroAttemptsErr } = await adminClient.rpc("check_and_record_reset_rate_limit", {
    p_admin_id: "admin@mmmut.ac.in",
    p_max_attempts: 0,
    p_window_seconds: 60,
  });
  report("1.2. Live RPC rejects max_attempts <= 0 with PostgreSQL exception", 
    Boolean(zeroAttemptsErr && zeroAttemptsErr.message.includes("p_max_attempts must be a positive integer")),
    zeroAttemptsErr?.message
  );

  const { error: negWindowErr } = await adminClient.rpc("check_and_record_reset_rate_limit", {
    p_admin_id: "admin@mmmut.ac.in",
    p_max_attempts: 30,
    p_window_seconds: -10,
  });
  report("1.3. Live RPC rejects window_seconds <= 0 with PostgreSQL exception", 
    Boolean(negWindowErr && negWindowErr.message.includes("p_window_seconds must be a positive integer")),
    negWindowErr?.message
  );

  // ------------------------------------------------------------------------
  // TEST GROUP 2: High Concurrent Load for Single Administrator (35 Threads)
  // ------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: High Concurrent Load (35 Simultaneous Network Requests) ---");
  const testAdminA = `admin_concurrent_A_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Dispatch 35 genuinely concurrent HTTP network requests via Promise.all
  console.log(`Firing 35 concurrent RPC requests for Admin A: ${testAdminA}...`);
  const burstPromises = Array.from({ length: 35 }, () =>
    adminClient.rpc("check_and_record_reset_rate_limit", {
      p_admin_id: testAdminA,
      p_max_attempts: 30,
      p_window_seconds: 60,
    })
  );

  const burstResults = await Promise.all(burstPromises);

  const allowedCount = burstResults.filter((r) => r.data === true && !r.error).length;
  const rejectedCount = burstResults.filter((r) => r.data === false && !r.error).length;
  const errorCount = burstResults.filter((r) => r.error).length;

  report("2.1. Exactly 30 concurrent requests succeed (allowed = true)", allowedCount === 30, `Allowed: ${allowedCount}, Errors: ${errorCount}`);
  report("2.2. Exactly 5 concurrent requests are rejected (allowed = false)", rejectedCount === 5, `Rejected: ${rejectedCount}`);

  // Subsequent immediate request must also be rejected
  const { data: immediate36th, error: err36 } = await adminClient.rpc("check_and_record_reset_rate_limit", {
    p_admin_id: testAdminA,
    p_max_attempts: 30,
    p_window_seconds: 60,
  });
  report("2.3. Subsequent 36th request remains rejected (rolling window enforced)", immediate36th === false && !err36);

  // ------------------------------------------------------------------------
  // TEST GROUP 3: Cross-Administrator Isolation Under Concurrency
  // ------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: Cross-Administrator Isolation Under Concurrency ---");
  const testAdminB = `admin_concurrent_B_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Admin B launches request while Admin A is completely exhausted
  const { data: adminBFirst, error: errB1 } = await adminClient.rpc("check_and_record_reset_rate_limit", {
    p_admin_id: testAdminB,
    p_max_attempts: 30,
    p_window_seconds: 60,
  });
  report("3.1. Admin B is NOT blocked by Admin A's rate limit", adminBFirst === true && !errB1);

  // Dispatch 29 more concurrent requests for Admin B (bringing Admin B to 30)
  const adminBPromises = Array.from({ length: 29 }, () =>
    adminClient.rpc("check_and_record_reset_rate_limit", {
      p_admin_id: testAdminB,
      p_max_attempts: 30,
      p_window_seconds: 60,
    })
  );
  const adminBResults = await Promise.all(adminBPromises);
  const adminBAllowedCount = 1 + adminBResults.filter((r) => r.data === true && !r.error).length;
  report("3.2. Admin B reaches exactly 30 permitted attempts independently", adminBAllowedCount === 30, `Admin B Allowed: ${adminBAllowedCount}`);

  // Admin B's 31st request is rejected
  const { data: adminB31st, error: errB31 } = await adminClient.rpc("check_and_record_reset_rate_limit", {
    p_admin_id: testAdminB,
    p_max_attempts: 30,
    p_window_seconds: 60,
  });
  report("3.3. Admin B's 31st attempt is rejected", adminB31st === false && !errB31);

  console.log("\n============================================================");
  console.log(` LIVE CONCURRENT RATE LIMITER SUMMARY: ${passed} PASSED, ${failed} FAILED `);
  console.log(` Project Verified: ${TEST_PROJECT_REF} (${TEST_PROJECT_URL})`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveConcurrentRateLimiterTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
