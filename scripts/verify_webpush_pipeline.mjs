// ==============================================================================
// AttendX Web Push Pipeline Verification Suite
// ==============================================================================

import crypto from "crypto";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// 1. Core Logic from pushClient & webpush
function sanitizeVapidKey(key) {
  if (!key) return "";
  return key.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
}

function urlBase64ToUint8Array(base64String) {
  const sanitized = sanitizeVapidKey(base64String);
  const padding = "=".repeat((4 - (sanitized.length % 4)) % 4);
  const base64 = (sanitized + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = Buffer.from(base64, "base64");
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData[i];
  }
  return outputArray;
}

function areApplicationServerKeysEqual(existingKeyBuf, currentKey) {
  if (!existingKeyBuf) return false;
  const existingArr = new Uint8Array(existingKeyBuf);
  if (existingArr.length !== currentKey.length) return false;
  for (let i = 0; i < existingArr.length; i++) {
    if (existingArr[i] !== currentKey[i]) return false;
  }
  return true;
}

// Action Token HMAC Security
const SIGNING_SECRET = "attendx_action_security_secret_2026";

function generateActionToken(payload) {
  const dataStr = `${payload.studentId}:${payload.date}:${payload.period}:${payload.subjectCode}:${payload.deadlineTime}`;
  return crypto.createHmac("sha256", SIGNING_SECRET).update(dataStr).digest("hex");
}

function verifyActionToken(payload, token) {
  const expected = generateActionToken(payload);
  const tokenMatches = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!tokenMatches) return { valid: false, reason: "TAMPERED" };

  const deadline = new Date(payload.deadlineTime).getTime();
  const now = Date.now();
  if (now > deadline + 10000) return { valid: false, reason: "EXPIRED" };

  return { valid: true };
}

// Diagnostic Classifier
function classifyPushError(errMessage, isBrave) {
  const lower = errMessage.toLowerCase();
  if (lower.includes("push service error") || lower.includes("registration failed")) {
    if (isBrave) {
      return {
        type: "BRAVE_BLOCKED",
        guidance: "Brave Browser blocks push notifications by default. Enable 'Use Google services for push messaging' in brave://settings/privacy.",
      };
    }
    return {
      type: "FCM_NETWORK_BLOCKED",
      guidance: "Push Service Error: Google FCM ports (mtalk.google.com:5228) may be blocked by campus Wi-Fi or VPN.",
    };
  }
  if (lower.includes("permission")) {
    return {
      type: "PERMISSION_DENIED",
      guidance: "Notification permission was blocked in browser settings.",
    };
  }
  return {
    type: "UNKNOWN",
    guidance: errMessage,
  };
}

async function run() {
  console.log("\n=======================================================");
  console.log(" AttendX Web Push Pipeline Verification Suite");
  console.log("=======================================================\n");

  // GROUP 1: VAPID Key RFC 8292 Compliance & Sanitization
  console.log("--- GROUP 1: VAPID Public Key RFC 8292 Compliance ---");
  const configuredVapidKey = "REDACTED_VAPID_PUBLIC_KEY";

  // Test with wrapping quotes, whitespace, and newlines
  const dirtyVapidKey = `  "${configuredVapidKey}"\n  `;
  const sanitized = sanitizeVapidKey(dirtyVapidKey);
  assert(sanitized === configuredVapidKey, "Sanitizer removes outer quotes, whitespace, and newlines");

  const keyBytes = urlBase64ToUint8Array(configuredVapidKey);
  assert(keyBytes.length === 65, `Decoded VAPID public key is exactly 65 bytes (RFC 8292 P-256) (got: ${keyBytes.length})`);
  assert(keyBytes[0] === 4, `First byte is 0x04 uncompressed EC point header (got: 0x0${keyBytes[0].toString(16)})`);

  // GROUP 2: Existing Subscription Key Mismatch & Equality Detection
  console.log("\n--- GROUP 2: Existing Subscription Mismatch Detection ---");
  const matchingBuffer = keyBytes.buffer;
  assert(areApplicationServerKeysEqual(matchingBuffer, keyBytes) === true, "Identifies matching applicationServerKey");

  // Simulating stale subscription with old key
  const staleKeyBytes = new Uint8Array(65);
  staleKeyBytes[0] = 4;
  staleKeyBytes[1] = 99; // differs
  assert(areApplicationServerKeysEqual(staleKeyBytes.buffer, keyBytes) === false, "Detects stale/mismatched subscription key");
  assert(areApplicationServerKeysEqual(null, keyBytes) === false, "Handles null existing key safely");

  // GROUP 3: Multi-ID Subscription Store & Candidate Resolution
  console.log("\n--- GROUP 3: Multi-ID Subscription Store & Lookup ---");
  const store = new Map();
  const studentUuid = "user-uuid-998877";
  const rollNumber = "2026011044";
  const email = "student.2026011044@attendx.mmmut.ac.in";
  const subData = { endpoint: "https://fcm.googleapis.com/fcm/send/device-token-1", keys: { p256dh: "key", auth: "auth" } };

  // Save under UUID and link roll number
  store.set(studentUuid, [subData]);
  store.set(rollNumber, [subData]);

  // Candidate lookup helper
  function findSubscriptions(candidates) {
    for (const id of candidates) {
      if (store.has(id)) return store.get(id);
    }
    return [];
  }

  assert(findSubscriptions([studentUuid]).length > 0, "Finds subscription by auth UUID");
  assert(findSubscriptions([rollNumber]).length > 0, "Finds subscription by student roll number");
  assert(findSubscriptions([studentUuid, rollNumber, email]).length > 0, "Finds subscription by candidate ID list");
  assert(findSubscriptions(["non-existent-id"]).length === 0, "Returns empty array for unknown student without errors");

  // GROUP 4: Five-Minute Actionable Attendance Security
  console.log("\n--- GROUP 4: Five-Minute Actionable Attendance Window ---");
  const now = new Date();
  const dateStr = "2026-11-27";
  const activeDeadline = new Date(now.getTime() + 4 * 60 * 1000).toISOString(); // 4 mins in future
  const payload = {
    studentId: studentUuid,
    date: dateStr,
    period: 2,
    subjectCode: "BIT-103",
    deadlineTime: activeDeadline,
  };

  const actionToken = generateActionToken(payload);
  assert(typeof actionToken === "string" && actionToken.length === 64, "Generates 256-bit SHA256 hex action token");

  const validResult = verifyActionToken(payload, actionToken);
  assert(validResult.valid === true, "Action accepted within 5-minute window");

  // Tampering checks
  const tamperedPeriod = verifyActionToken({ ...payload, period: 3 }, actionToken);
  assert(tamperedPeriod.valid === false && tamperedPeriod.reason === "TAMPERED", "Tampered period strictly rejected");

  const tamperedStudent = verifyActionToken({ ...payload, studentId: "impostor-uuid" }, actionToken);
  assert(tamperedStudent.valid === false && tamperedStudent.reason === "TAMPERED", "Tampered studentId strictly rejected");

  // Expired checks (6 minutes past deadline)
  const expiredDeadline = new Date(now.getTime() - 6 * 60 * 1000).toISOString();
  const expiredPayload = { ...payload, deadlineTime: expiredDeadline };
  const expiredToken = generateActionToken(expiredPayload);
  const expiredResult = verifyActionToken(expiredPayload, expiredToken);
  assert(expiredResult.valid === false && expiredResult.reason === "EXPIRED", "Action rejected after 5-minute cutoff");

  // GROUP 5: Diagnostic Error Classifier (Brave & FCM Network)
  console.log("\n--- GROUP 5: Actionable Error Diagnostics ---");
  const braveDiag = classifyPushError("Registration failed - push service error", true);
  assert(braveDiag.type === "BRAVE_BLOCKED", "Classifies Brave push service error");
  assert(braveDiag.guidance.includes("brave://settings/privacy"), "Provides Brave settings URL in guidance");

  const networkDiag = classifyPushError("Registration failed - push service error", false);
  assert(networkDiag.type === "FCM_NETWORK_BLOCKED", "Classifies FCM network/firewall error on standard browsers");
  assert(networkDiag.guidance.includes("mtalk.google.com"), "Points to FCM port/host blockage");

  const permDiag = classifyPushError("Notification permission was denied", false);
  assert(permDiag.type === "PERMISSION_DENIED", "Classifies permission rejection");

  // SUMMARY
  console.log("\n=======================================================");
  console.log(` Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
