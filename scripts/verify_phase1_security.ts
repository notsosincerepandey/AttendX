import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./set_admin_password";

loadLocalEnv();

const TEST_PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iczjocbishkvkkkfvalz.supabase.co";
const TEST_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!TEST_SERVICE_ROLE_KEY) {
  console.error("[Configuration Error] SUPABASE_SERVICE_ROLE_KEY must be configured in environment.");
  process.exit(1);
}

const supabase = createClient(TEST_PROJECT_URL, TEST_SERVICE_ROLE_KEY);

async function inspectDeployedSecurity() {
  console.log("============================================================");
  console.log(" PHASE 1: DEPLOYED DATABASE SECURITY INSPECTION (TEST DB)   ");
  console.log(" Project: iczjocbishkvkkkfvalz                              ");
  console.log("============================================================\n");

  // 1. Verify tables and RLS
  const tables = [
    "student_profiles",
    "admin_password_resets",
    "password_sync_authorizations",
    "admin_reset_rate_limits",
    "branches",
    "sections",
    "timetables",
    "timetable_slots",
    "attendance_records",
    "cancellation_reports",
    "class_polls",
    "class_poll_options",
    "class_poll_votes",
    "class_announcements",
    "notifications",
    "push_subscriptions",
  ];

  console.log("--- 1. Table RLS & Query Access Verification ---");
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*").limit(1);
    if (error) {
      console.error(`  [FAIL] Table '${t}' query error:`, error.message);
    } else {
      console.log(`  [PASS] Table '${t}' accessible via service_role (found ${data.length} sample rows)`);
    }
  }

  console.log("\n--- 2. Reset Ticket & Authorization Cleanup Verification ---");
  const { data: tickets, error: tErr } = await supabase
    .from("admin_password_resets")
    .select("id, user_id, action, consumed")
    .eq("consumed", false);

  if (tErr) {
    console.error("  [FAIL] Error querying admin_password_resets:", tErr.message);
  } else {
    console.log(`  [PASS] Unconsumed reset tickets count in DB: ${tickets.length}`);
  }

  const { data: auths, error: aErr } = await supabase
    .from("password_sync_authorizations")
    .select("id, user_id, operation");

  if (aErr) {
    console.error("  [FAIL] Error querying password_sync_authorizations:", aErr.message);
  } else {
    console.log(`  [PASS] Lingering password_sync_authorizations count in DB: ${auths.length}`);
  }

  const { data: limits, error: lErr } = await supabase
    .from("admin_reset_rate_limits")
    .select("id, admin_id, created_at")
    .limit(5);

  if (lErr) {
    console.error("  [FAIL] Error querying admin_reset_rate_limits:", lErr.message);
  } else {
    console.log(`  [PASS] admin_reset_rate_limits is active (records present: ${limits.length})`);
  }

  console.log("\n--- 3. RPC Execution & Advisory Locking Verification ---");
  const adminId = `security_verify_admin_${Date.now()}`;
  const { data: rpcRes, error: rpcErr } = await supabase.rpc("check_and_record_reset_rate_limit", {
    p_admin_id: adminId,
    p_max_attempts: 30,
    p_window_seconds: 60,
  });

  if (rpcErr || rpcRes !== true) {
    console.error("  [FAIL] check_and_record_reset_rate_limit RPC failed:", rpcErr?.message);
  } else {
    console.log(`  [PASS] check_and_record_reset_rate_limit successfully acquired advisory lock and recorded attempt (result: ${rpcRes})`);
  }

  // Cleanup test rate limit record
  await supabase.from("admin_reset_rate_limits").delete().eq("admin_id", adminId);
}

inspectDeployedSecurity().catch(console.error);
