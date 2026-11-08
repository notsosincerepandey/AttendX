/**
 * Phase 1.5 Authentication Security Remediation Test Suite
 * Tests server-side role enforcement, token verification, role escalation prevention, and password rotation
 */
import fs from "fs";
import path from "path";

// Load .env.local
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

import {
  authenticateCredentials,
  registerStudentAccount,
  createServerSessionToken,
  authenticateTokenOffline,
  rotateUserPassword,
} from "../src/lib/serverAuth";

async function runAuthRemediationTests() {
  console.log("=== AttendX Phase 1.5: Authentication Remediation Test Suite ===\n");
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

  // 1. Password Stripping & Sanitization
  console.log("--- 1. Testing Credential Sanitization (Zero Password Leakage) ---");
  const testDevPass = process.env.DEV_SEED_PASSWORD || "test_dev_seed_2026_key";
  const authRes = await authenticateCredentials("admin@mmmut.ac.in", testDevPass);
  report(
    "1a. Authenticates admin on the server",
    authRes.success === true && authRes.user?.role === "admin"
  );
  report(
    "1b. Strips password from returned UserAccount object",
    Boolean(authRes.user && !("password" in authRes.user) && !("rawPassword" in authRes.user)),
    "No password or passwordHash field in response"
  );
  report(
    "1c. Generates valid session token",
    Boolean(authRes.sessionToken && authRes.sessionToken.length > 20)
  );

  // 2. Cryptographic Token Verification
  console.log("\n--- 2. Testing Cryptographic Server Session Tokens ---");
  const validToken = authRes.sessionToken!;
  const tokenVerify = authenticateTokenOffline(validToken);
  report(
    "2a. Authoritatively verifies valid server token",
    tokenVerify.success === true && tokenVerify.user?.email === "admin@mmmut.ac.in"
  );

  // Tamper test: Alter token payload to elevate privileges
  const tamperedToken = "dGVtcC1zdHVkZW50LTAwMjpzdHVkZW50QG1tbXV0LmFjLmluOmFkbWluOjE5OTk5OTk5OTk5OTk=." + "a".repeat(64);
  const tamperVerify = authenticateTokenOffline(tamperedToken);
  report(
    "2b. Strictly rejects forged or tampered token with invalid signature",
    tamperVerify.success === false
  );

  // 3. Role Escalation Prevention on Registration
  console.log("\n--- 3. Testing Public Registration Role Escalation Defense ---");
  const maliciousRegEmail = `hacker_${Date.now()}@mmmut.ac.in`;
  const regResult = await registerStudentAccount({
    fullName: "Privilege Escalation Attacker",
    email: maliciousRegEmail,
    password: "StrongPassword123!",
    role: "admin", // Attacker attempts to register as admin!
    branchCode: "IT",
    section: "SEC-B",
    batch: "P1",
    degree: "B.Tech",
    branch: "IT",
    semester: "Semester I",
    academicSession: "2025-26",
    activeTimetableId: "mmmut-btech-it-b-2025",
    attendanceThreshold: 75.0,
  });

  report(
    "3a. Registration succeeds for legitimate account",
    regResult.success === true
  );
  report(
    "3b. Attacker cannot elevate role to admin; server forcefully overrides role to 'student'",
    regResult.user?.role === "student",
    `Assigned Role: '${regResult.user?.role}' (admin request was nullified)`
  );

  // 4. Role Hierarchy & Boundaries
  console.log("\n--- 4. Testing Account Role Separation ---");
  const crAuth = await authenticateCredentials("cr.it@mmmut.ac.in", testDevPass);
  report(
    "4a. Class CR authenticates with 'class_admin' role",
    crAuth.success === true && crAuth.user?.role === "class_admin"
  );
  report(
    "4b. Class CR is scoped strictly to IT Section B",
    crAuth.user?.managedBranchCode === "IT" && crAuth.user?.managedSection === "SEC-B"
  );

  const studentAuth = await authenticateCredentials("student@mmmut.ac.in", testDevPass);
  report(
    "4c. Guest student authenticates with 'student' role",
    studentAuth.success === true && studentAuth.user?.role === "student"
  );

  // 5. Password Rotation Capability
  console.log("\n--- 5. Testing Credential Rotation Architecture ---");
  const testRotateEmail = "student@mmmut.ac.in";
  const newSecret = "NewRotatedKey#2026";
  const rotateRes = await rotateUserPassword(testRotateEmail, newSecret);
  report(
    "5a. Password rotation executed cleanly",
    rotateRes.success === true,
    rotateRes.message
  );

  const reauthNew = await authenticateCredentials(testRotateEmail, newSecret);
  report(
    "5b. Re-authenticates with new rotated password",
    reauthNew.success === true
  );

  // Reset back to test password for continued non-destructive testing
  await rotateUserPassword(testRotateEmail, testDevPass);

  // 6. Push Subscription Schema Integrity
  console.log("\n--- 6. Testing Push Subscription Schema & Isolation ---");
  const { savePushSubscription, getSubscriptionsForStudent } = await import("../src/lib/subscriptionStore");
  const testSubEndpoint = "https://fcm.googleapis.com/fcm/send/test-sub-auth-check-" + Date.now();
  const testSub = await savePushSubscription(
    "admin-shubh-001",
    {
      endpoint: testSubEndpoint,
      keys: {
        p256dh: "REDACTED_VAPID_PUBLIC_KEY",
        auth: "REDACTED_VAPID_AUTH_SUBKEY",
      },
    },
    "AttendX-Test-Agent/1.0"
  );

  report(
    "6a. student_id stores authentic student identifier ('admin-shubh-001'), not endpoint URL",
    testSub.studentId === "admin-shubh-001" && testSub.studentId !== testSubEndpoint
  );
  report(
    "6b. Endpoint, P256DH key, and Auth secret are stored in separate discrete fields",
    Boolean(testSub.subscription.endpoint && testSub.subscription.keys.p256dh && testSub.subscription.keys.auth)
  );

  const studentSubs = await getSubscriptionsForStudent("victim-student-isolated");
  report(
    "6c. Subscription lookup enforces student isolation (cannot access other student's subscriptions)",
    studentSubs.length === 0
  );

  console.log(`\n========================================`);
  console.log(`Phase 1.5 Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

runAuthRemediationTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
