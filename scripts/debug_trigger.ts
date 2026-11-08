import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const TEST_PROJECT_URL = "https://iczjocbishkvkkkfvalz.supabase.co";
const TEST_SERVICE_ROLE_KEY = "REDACTED_SUPABASE_SERVICE_ROLE_KEY";
const adminClient = createClient(TEST_PROJECT_URL, TEST_SERVICE_ROLE_KEY);

async function debugTrigger() {
  const runId = Date.now();
  const testEmail = `debug.trigger.${runId}@attendx.mmmut.ac.in`;

  console.log("1. Creating user...");
  const { data: userRes } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: "InitPass@2026",
    email_confirm: true,
    app_metadata: { role: "student" },
  });
  const uid = userRes!.user!.id;

  // Insert profile with consumed=true, requires=false
  await adminClient.from("student_profiles").upsert({
    id: uid,
    user_id: uid,
    email: testEmail,
    full_name: "Debug Student",
    role: "student",
    roll_number: `DBG_${runId}`,
    branch_code: "CSE",
    section: "SEC-A",
    batch: "P1",
    semester: "Semester I",
    academic_session: "2026-27",
    attendance_threshold: 75.0,
    is_active: true,
    status: "ACTIVE",
    password_change_consumed: true,
    requires_password_change: false,
  });

  const ticketEntropy = crypto.randomBytes(32).toString("hex");
  const ticketHash = crypto.createHash("sha256").update(ticketEntropy).digest("hex");

  await adminClient.from("admin_password_resets").insert({
    user_id: uid,
    ticket_hash: ticketHash,
    action: "RESET",
    consumed: false,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });

  console.log("Executing updateUserById with admin_reset_ticket...");
  const res = await fetch(`${TEST_PROJECT_URL}/auth/v1/admin/users/${uid}`, {
    method: "PUT",
    headers: {
      "apikey": TEST_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${TEST_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password: "NewTempPassword@2026",
      ban_duration: "none",
      app_metadata: {
        role: "student",
        admin_reset_ticket: ticketHash,
        account_status: "ACTIVE",
      },
    }),
  });

  console.log("Status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Response text:", text);

  // Cleanup
  await adminClient.from("student_profiles").delete().eq("user_id", uid);
  await adminClient.auth.admin.deleteUser(uid);
}

debugTrigger().catch(console.error);
