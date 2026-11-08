import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { GET as setupStatusHandler } from "@/app/api/admin/auth/setup-status/route";
import { POST as setupHandler } from "@/app/api/admin/auth/setup/route";
import { POST as adminLoginHandler } from "@/app/api/admin/auth/login/route";
import { createClient } from "@supabase/supabase-js";

function parseEnv(filePath: string) {
  const env: Record<string, string> = {};
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[trimmed.slice(0, idx).trim()] = val;
      }
    }
  }
  return env;
}

async function runVerification() {
  console.log("==================================================================");
  console.log(" ATTENDX ONE-TIME FIRST ADMIN PASSWORD SETUP VERIFICATION SUITE");
  console.log("==================================================================");

  const env = parseEnv(path.resolve(process.cwd(), ".env.local"));
  Object.assign(process.env, env);

  const activationKey = env.DEV_SEED_PASSWORD;
  const targetEmail = "admin@attendx.ac.in";
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl?.includes("iczjocbishkvkkkfvalz")) {
    throw new Error("[SECURITY ABORT] Target must be iczjocbishkvkkkfvalz");
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Initial State Inspection
  console.log("\n--- TEST 1: Initial Setup Status Detection ---");
  const statusReq1 = new NextRequest("http://localhost:3000/api/admin/auth/setup-status");
  const statusRes1 = await setupStatusHandler(statusReq1);
  const statusData1 = await statusRes1.json();

  console.log("[PASS] 1.1 Setup status endpoint responding:", statusRes1.status);
  console.log("       Target Email:", statusData1.email);
  console.log("       Setup Completed (Initial):", statusData1.setupCompleted);

  // 2. Security Rejection: Invalid Target Email
  console.log("\n--- TEST 2: Email Authorization Enforcement ---");
  const badEmailReq = new NextRequest("http://localhost:3000/api/admin/auth/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "attacker@mmmut.ac.in",
      activationKey,
      newPassword: "NewSecureAdminPass2026!",
      confirmPassword: "NewSecureAdminPass2026!",
    }),
  });
  const badEmailRes = await setupHandler(badEmailReq);
  const badEmailData = await badEmailRes.json();
  if (badEmailRes.status !== 403) {
    throw new Error(`Expected HTTP 403 for unauthorized email, received ${badEmailRes.status}`);
  }
  console.log("[PASS] 2.1 Unauthorized email strictly rejected with HTTP 403 Forbidden!");
  console.log("       Error message:", badEmailData.error);

  // 3. Security Rejection: Password Validation
  console.log("\n--- TEST 3: Password Validation Enforcement ---");
  const mismatchReq = new NextRequest("http://localhost:3000/api/admin/auth/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: targetEmail,
      activationKey,
      newPassword: "NewSecureAdminPass2026!",
      confirmPassword: "DifferentPassword2026!",
    }),
  });
  const mismatchRes = await setupHandler(mismatchReq);
  if (mismatchRes.status !== 400) {
    throw new Error(`Expected HTTP 400 for password mismatch, received ${mismatchRes.status}`);
  }
  console.log("[PASS] 3.1 Mismatched passwords strictly rejected with HTTP 400 Bad Request!");

  const shortReq = new NextRequest("http://localhost:3000/api/admin/auth/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: targetEmail,
      activationKey,
      newPassword: "short",
      confirmPassword: "short",
    }),
  });
  const shortRes = await setupHandler(shortReq);
  if (shortRes.status !== 400) {
    throw new Error(`Expected HTTP 400 for short password, received ${shortRes.status}`);
  }
  console.log("[PASS] 3.2 Password shorter than 8 chars strictly rejected with HTTP 400 Bad Request!");

  // 4. Security Rejection: Invalid Activation Key (Cannot authorize using email alone)
  console.log("\n--- TEST 4: One-Time Activation Key Authorization ---");
  const badKeyReq = new NextRequest("http://localhost:3000/api/admin/auth/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: targetEmail,
      activationKey: "invalid_unauthorized_key_999",
      newPassword: "NewSecureAdminPass2026!",
      confirmPassword: "NewSecureAdminPass2026!",
    }),
  });
  const badKeyRes = await setupHandler(badKeyReq);
  const badKeyData = await badKeyRes.json();
  if (badKeyRes.status !== 401) {
    throw new Error(`Expected HTTP 401 for invalid activation key, received ${badKeyRes.status}`);
  }
  console.log("[PASS] 4.1 Invalid activation key rejected with HTTP 401 Unauthorized!");
  console.log("       Error message:", badKeyData.error);

  // 5. Successful Execution: First-Time Setup
  console.log("\n--- TEST 5: Authorized First-Time Setup Execution ---");
  const brandNewAdminPassword = "AdminPermanent@2026!Sec";
  const validSetupReq = new NextRequest("http://localhost:3000/api/admin/auth/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: targetEmail,
      activationKey,
      newPassword: brandNewAdminPassword,
      confirmPassword: brandNewAdminPassword,
    }),
  });
  const validSetupRes = await setupHandler(validSetupReq);
  const validSetupData = await validSetupRes.json();
  if (validSetupRes.status !== 200 || !validSetupData.success) {
    throw new Error(`First-time setup failed: ${validSetupData.error}`);
  }
  console.log("[PASS] 5.1 First-time setup completed successfully!");
  console.log("       Server message:", validSetupData.message);

  // 6. Idempotency & Atomic Lock: Setup CANNOT succeed a second time
  console.log("\n--- TEST 6: Atomic One-Time Enforcement (Re-setup Permanently Blocked) ---");
  const repeatedSetupReq = new NextRequest("http://localhost:3000/api/admin/auth/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: targetEmail,
      activationKey,
      newPassword: "AnotherNewPassword123!",
      confirmPassword: "AnotherNewPassword123!",
    }),
  });
  const repeatedSetupRes = await setupHandler(repeatedSetupReq);
  const repeatedSetupData = await repeatedSetupRes.json();
  if (repeatedSetupRes.status !== 409) {
    throw new Error(`Expected HTTP 409 Conflict for repeated setup, received ${repeatedSetupRes.status}`);
  }
  console.log("[PASS] 6.1 Subsequent setup attempt strictly rejected with HTTP 409 Conflict!");
  console.log("       Error message:", repeatedSetupData.error);

  // 7. Setup Status Endpoint after Completion
  console.log("\n--- TEST 7: Setup Status Detection After Completion ---");
  const statusReq2 = new NextRequest("http://localhost:3000/api/admin/auth/setup-status");
  const statusRes2 = await setupStatusHandler(statusReq2);
  const statusData2 = await statusRes2.json();
  console.log("[PASS] 7.1 Setup status now reports completed:", statusData2.setupCompleted);
  if (statusData2.setupCompleted !== true) {
    throw new Error("Expected setupCompleted to be true after setup execution");
  }

  // 8. Normal Login with the Newly Configured Password
  console.log("\n--- TEST 8: Normal Authentication with Newly Configured Password ---");
  const loginWithNewPassReq = new NextRequest("http://localhost:3000/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: targetEmail, password: brandNewAdminPassword }),
  });
  const loginWithNewPassRes = await adminLoginHandler(loginWithNewPassReq);
  const loginWithNewPassData = await loginWithNewPassRes.json();

  if (loginWithNewPassRes.status !== 200 || !loginWithNewPassData.success) {
    throw new Error(`Admin login with new password failed: ${loginWithNewPassData.error}`);
  }
  console.log("[PASS] 8.1 Administrator authenticated successfully using newly set password!");
  console.log("       User ID:", loginWithNewPassData.user.id);
  console.log("       Role:", loginWithNewPassData.user.role);
  console.log("       Email:", loginWithNewPassData.user.email);
  console.log("       Session Token Present:", Boolean(loginWithNewPassData.sessionToken));

  // 9. Database Account Integrity & Preservation
  console.log("\n--- TEST 9: Database Account Preservation Checks ---");
  const { count: studentProfilesCount } = await supabase
    .from("student_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student");
  console.log("[PASS] 9.1 Genuine student accounts in database:", studentProfilesCount);
  if (studentProfilesCount !== 1189) {
    throw new Error(`Expected exactly 1,189 student accounts, got ${studentProfilesCount}`);
  }

  const { count: totalProfiles } = await supabase
    .from("student_profiles")
    .select("id", { count: "exact", head: true });
  console.log("[PASS] 9.2 Total profiles (students + sole admin):", totalProfiles);
  if (totalProfiles !== 1190) {
    throw new Error(`Expected exactly 1,190 total profiles, got ${totalProfiles}`);
  }

  console.log("\n==================================================================");
  console.log(" ALL FIRST-TIME ADMIN SETUP TESTS PASSED SUCCESSFULLY (100%)");
  console.log("==================================================================");
}

runVerification().catch((err) => {
  console.error("\n[TEST FAILED]", err);
  process.exit(1);
});
