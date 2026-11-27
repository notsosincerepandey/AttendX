/**
 * Comprehensive End-to-End Live HTTP & Security Verification of AttendX
 * Runs against http://localhost:3000
 */
import fs from "fs";
import path from "path";

// Load .env.local for script execution
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
}

import { generateActionToken } from "../src/lib/actionSecurity";

async function runE2E() {
  const BASE_URL = "http://localhost:3000";
  console.log("=== AttendX End-to-End Live System & Security Verification ===");
  console.log(`Target: ${BASE_URL}\n`);

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

  // 1. Subscription Endpoint Validation
  console.log("--- 1. Testing Subscription Endpoint ---");
  const badSubRes = await fetch(`${BASE_URL}/api/notifications/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  report("1a. Rejects empty subscription payload with 400", badSubRes.status === 400);

  const testStudentId = "admin-shubh-001";
  const dummyEndpoint = `https://fcm.googleapis.com/fcm/send/attendx-test-${Date.now()}`;
  const validSubRes = await fetch(`${BASE_URL}/api/notifications/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: testStudentId,
      subscription: {
        endpoint: dummyEndpoint,
        keys: {
          p256dh: "mock_test_p256dh_sample_key_only_for_unit_testing_1234567890",
          auth: "mock_auth_secret_123",
        },
      },
      userAgent: "AttendX-E2E-Verifier/1.0",
    }),
  });
  const validSubData = await validSubRes.json();
  report(
    "1b. Registers valid Web Push subscription with 200",
    validSubRes.status === 200 && validSubData.success === true,
    `Subscription ID: ${validSubData.subscriptionId}`
  );

  // 2. Test Push Trigger with Signed Action Token
  console.log("\n--- 2. Testing Push Dispatch to Google FCM ---");
  const testPushRes = await fetch(`${BASE_URL}/api/notifications/test-push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: testStudentId,
      subjectName: "Programming in C",
      subjectCode: "BIT-103",
      period: 2,
    }),
  });
  const testPushData = await testPushRes.json();
  report(
    "2. Server processed push dispatch through web-push library",
    testPushRes.status === 200 || testPushRes.status === 404,
    `Delivered: ${testPushData.delivered || 0}, Failed: ${testPushData.failed || 0}`
  );

  // 3. Quick-Mark Within 5-Minute Window with Valid Cryptographic Token
  console.log("\n--- 3. Testing Quick-Mark Attendance Action & Token Verification ---");
  const now = new Date();
  const startTime = new Date(now.getTime() - 60000).toISOString(); // 1 minute ago
  const deadlineTime = new Date(now.getTime() + 4 * 60000).toISOString(); // 4 minutes remaining
  const validToken = generateActionToken({
    studentId: testStudentId,
    date: "2026-11-07",
    period: 2,
    subjectCode: "BIT-103",
    deadlineTime,
  });

  const quickMarkRes = await fetch(`${BASE_URL}/api/attendance/quick-mark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: testStudentId,
      date: "2026-11-07",
      period: 2,
      subjectCode: "BIT-103",
      subjectName: "Programming in C",
      category: "Theory",
      batch: "P1",
      status: "PRESENT",
      startTime,
      deadlineTime,
      actionToken: validToken,
      source: "SERVICE_WORKER_ACTION",
    }),
  });
  const quickMarkData = await quickMarkRes.json();
  report(
    "3a. Quick-mark with valid HMAC action token accepted with 200",
    quickMarkRes.status === 200 && quickMarkData.success === true,
    quickMarkData.message
  );

  // 3b. Anti-Tamper Security Check: Forged Student ID or Tampered Payload
  const forgedRes = await fetch(`${BASE_URL}/api/attendance/quick-mark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: "victim-student-999", // Attempting to mark for another student
      date: "2026-11-07",
      period: 2,
      subjectCode: "BIT-103",
      status: "PRESENT",
      startTime,
      deadlineTime,
      actionToken: validToken, // Token was signed for testStudentId, not victim
    }),
  });
  const forgedData = await forgedRes.json();
  report(
    "3b. Anti-Tamper: Request with mismatched student ID is rejected with 401 Unauthorized",
    forgedRes.status === 401 && forgedData.success === false,
    forgedData.error
  );

  // 4. Duplicate Action Prevention & Immutability (Cannot flip decision)
  console.log("\n--- 4. Testing Duplicate Action Prevention & Finalized Decision Lock ---");
  const flipAttemptRes = await fetch(`${BASE_URL}/api/attendance/quick-mark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: testStudentId,
      date: "2026-11-07",
      period: 2,
      subjectCode: "BIT-103",
      status: "ABSENT", // Trying to overwrite prior PRESENT decision
      startTime,
      deadlineTime,
      actionToken: validToken,
    }),
  });
  const flipData = await flipAttemptRes.json();
  report(
    "4. Immutability: Duplicate submission cannot overwrite finalized decision (stays PRESENT)",
    flipAttemptRes.status === 200 &&
      flipData.isDuplicate === true &&
      flipData.finalizedStatus === "PRESENT",
    flipData.message
  );

  // 5. Five-Minute Window Deadline Enforcement (Past Cutoff)
  console.log("\n--- 5. Testing Five-Minute Deadline Enforcement ---");
  const expiredStartTime = new Date(now.getTime() - 15 * 60000).toISOString();
  const expiredDeadline = new Date(now.getTime() - 10 * 60000).toISOString();
  const expiredToken = generateActionToken({
    studentId: testStudentId,
    date: "2026-11-07",
    period: 3,
    subjectCode: "BAS-102",
    deadlineTime: expiredDeadline,
  });

  const expiredRes = await fetch(`${BASE_URL}/api/attendance/quick-mark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: testStudentId,
      date: "2026-11-07",
      period: 3,
      subjectCode: "BAS-102",
      status: "PRESENT",
      startTime: expiredStartTime,
      deadlineTime: expiredDeadline,
      actionToken: expiredToken,
    }),
  });
  const expiredData = await expiredRes.json();
  report(
    "5. Deadline: Retroactive marking after 5-minute cutoff rejected with 403 Forbidden",
    expiredRes.status === 403 && expiredData.success === false,
    expiredData.error
  );

  // 6. Cron Sweep Endpoints & Security Authorization
  console.log("\n--- 6. Testing Server Cron Sweep Endpoints & Security ---");
  const cronSecret = process.env.CRON_SECRET || "attendx_dev_test_cron_secret";

  // 6a. Reject unauthorized cron request
  const unauthRes = await fetch(`${BASE_URL}/api/cron/check-classes`);
  const unauthData = await unauthRes.json();
  report(
    "6a. Cron Security: Rejects unauthorized invocation without CRON_SECRET with 401",
    unauthRes.status === 401 && unauthData.success === false,
    unauthData.error
  );

  // 6b. Allow authorized check-classes request with Bearer token
  const checkClassesRes = await fetch(`${BASE_URL}/api/cron/check-classes?period=2`, {
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });
  const checkClassesData = await checkClassesRes.json();
  report(
    "6b. Cron Execution: Authorized invocation with CRON_SECRET succeeds with 200",
    checkClassesRes.status === 200 && checkClassesData.success === true,
    `IST Time: ${checkClassesData.istTime || "N/A"}, Period: ${checkClassesData.period}, Notified: ${checkClassesData.notified}`
  );

  // 6c. Allow authorized auto-absence sweep
  const autoAbsenceRes = await fetch(`${BASE_URL}/api/cron/auto-absence`, {
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });
  const autoAbsenceData = await autoAbsenceRes.json();
  report(
    "6c. Cron Execution: Authorized /api/cron/auto-absence succeeds with 200",
    autoAbsenceRes.status === 200 && autoAbsenceData.success === true,
    autoAbsenceData.message
  );

  console.log(`\n========================================`);
  console.log(`E2E Security & System Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

runE2E().catch((err) => {
  console.error("E2E Test Execution Error:", err);
  process.exit(1);
});
