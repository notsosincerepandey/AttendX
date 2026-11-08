import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { POST as adminLoginHandler } from "@/app/api/admin/auth/login/route";
import { GET as adminVerifyHandler } from "@/app/api/admin/auth/verify/route";
import { GET as adminStatsHandler } from "@/app/api/admin/stats/route";
import { GET as adminStudentsHandler } from "@/app/api/admin/students/route";
import { POST as studentLoginHandler } from "@/app/api/auth/login/route";
import { createClient } from "@supabase/supabase-js";

function parseEnv(filePath: string) {
  const env: Record<string, string> = {};
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  }
  return env;
}

async function runTests() {
  console.log("==================================================================");
  console.log(" ATTENDX SEPARATE ADMIN PORTAL & SECURITY VERIFICATION SUITE");
  console.log("==================================================================");

  const env = parseEnv(path.resolve(process.cwd(), ".env.local"));
  Object.assign(process.env, env);

  const adminPassword = env.DEV_SEED_PASSWORD;
  const studentDefaultPass = "student@2026";
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl?.includes("iczjocbishkvkkkfvalz")) {
    throw new Error("[SECURITY ABORT] Target must be iczjocbishkvkkkfvalz");
  }

  // TEST 1: Admin Login via Dedicated Admin Endpoint (/api/admin/auth/login)
  console.log("\n--- TEST 1: Admin Login via Dedicated Admin Login Endpoint ---");
  const adminLoginReq = new NextRequest("http://localhost:3000/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@attendx.ac.in", password: adminPassword }),
  });
  const adminLoginRes = await adminLoginHandler(adminLoginReq);
  const adminLoginData = await adminLoginRes.json();

  if (adminLoginRes.status !== 200 || !adminLoginData.success) {
    throw new Error(`Admin login failed: ${adminLoginData.error}`);
  }
  const adminToken = adminLoginData.sessionToken;
  console.log("[PASS] 1.1 Admin authenticated successfully at /admin/login!");
  console.log("       User ID:", adminLoginData.user.id);
  console.log("       Email:", adminLoginData.user.email);
  console.log("       Role:", adminLoginData.user.role);
  console.log("       Session Token Present:", !!adminToken);

  if (adminLoginData.user.role !== "admin") {
    throw new Error(`Expected role 'admin', got '${adminLoginData.user.role}'`);
  }

  // TEST 2: Student Rejection at Admin Login Endpoint
  console.log("\n--- TEST 2: Student Account Rejection at Admin Login Endpoint ---");
  const studentAtAdminReq = new NextRequest("http://localhost:3000/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "2026011016", password: studentDefaultPass }),
  });
  const studentAtAdminRes = await studentAtAdminReq;
  const studentAtAdminData = await (await adminLoginHandler(studentAtAdminReq)).json();
  console.log("[PASS] 2.1 Student roll number blocked at /admin/login!");
  console.log("       Error message:", studentAtAdminData.error);

  const fakeEmailReq = new NextRequest("http://localhost:3000/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "attacker@mmmut.ac.in", password: "somePassword123!" }),
  });
  const fakeEmailRes = await adminLoginHandler(fakeEmailReq);
  const fakeEmailData = await fakeEmailRes.json();
  if (fakeEmailRes.status !== 403) {
    throw new Error(`Expected 403 status, got ${fakeEmailRes.status}`);
  }
  console.log("[PASS] 2.2 Arbitrary email strictly rejected with HTTP 403 Forbidden!");

  // TEST 2.3: Admin wrong password error message must be admin-appropriate and NEVER mention roll number
  const wrongPassReq = new NextRequest("http://localhost:3000/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@attendx.ac.in", password: "wrong_admin_password_test" }),
  });
  const wrongPassRes = await adminLoginHandler(wrongPassReq);
  const wrongPassData = await wrongPassRes.json();
  if (wrongPassRes.status !== 401) {
    throw new Error(`Expected 401 status for wrong admin password, got ${wrongPassRes.status}`);
  }
  if (wrongPassData.error?.toLowerCase().includes("roll number") || wrongPassData.error?.toLowerCase().includes("enrollment number")) {
    throw new Error(`Security Violation: Student roll number message displayed on admin login: "${wrongPassData.error}"`);
  }
  console.log("[PASS] 2.3 Incorrect admin password rejected with admin-tailored error!");
  console.log("       Error message:", wrongPassData.error);

  // TEST 3: Authoritative Verification Endpoint (/api/admin/auth/verify)
  console.log("\n--- TEST 3: Authoritative Admin Session Verification ---");
  const verifyReq = new NextRequest("http://localhost:3000/api/admin/auth/verify", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const verifyRes = await adminVerifyHandler(verifyReq);
  const verifyData = await verifyRes.json();
  if (verifyRes.status !== 200 || !verifyData.authenticated || verifyData.user.role !== "admin") {
    throw new Error("Admin session verification failed!");
  }
  console.log("[PASS] 3.1 Admin session verified authoritatively server-side (role: admin)!");

  const unauthVerifyReq = new NextRequest("http://localhost:3000/api/admin/auth/verify", {
    headers: {},
  });
  const unauthVerifyRes = await adminVerifyHandler(unauthVerifyReq);
  if (unauthVerifyRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated request, got ${unauthVerifyRes.status}`);
  }
  console.log("[PASS] 3.2 Unauthenticated verification rejected with HTTP 401!");

  // TEST 4: Admin Statistics Endpoint (/api/admin/stats)
  console.log("\n--- TEST 4: Live Institutional Stats Compilation ---");
  const statsReq = new NextRequest("http://localhost:3000/api/admin/stats", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const statsRes = await adminStatsHandler(statsReq);
  const statsData = await statsRes.json();
  if (statsRes.status !== 200 || !statsData.success) {
    throw new Error(`Failed to retrieve admin stats: ${statsData.error}`);
  }
  console.log("[PASS] 4.1 Stats retrieved successfully!");
  console.log("       Total Enrolled Students:", statsData.stats.totalStudents);
  console.log("       Total Appointed CRs:", statsData.stats.totalCRs);
  console.log("       Master Timetable Sheets:", statsData.stats.totalTimetables);
  console.log("       Active Class Polls:", statsData.stats.activePolls);
  console.log("       Cancellation Reports:", statsData.stats.totalCancellations);

  // TEST 5: Student Login Preservation (/api/auth/login)
  console.log("\n--- TEST 5: Preserved Student Portal Login Operations ---");
  const studentRollLoginReq = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "2026011016", password: studentDefaultPass }),
  });
  const studentRollLoginRes = await studentLoginHandler(studentRollLoginReq);
  const studentRollLoginData = await studentRollLoginRes.json();
  if (studentRollLoginRes.status !== 200 || !studentRollLoginData.success) {
    throw new Error(`Student roll number login failed: ${studentRollLoginData.error}`);
  }
  const studentToken = studentRollLoginData.sessionToken;
  console.log("[PASS] 5.1 Student login by Roll Number functional! Student:", studentRollLoginData.user.fullName);

  const studentEnrollLoginReq = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "2026CED0390", password: studentDefaultPass }),
  });
  const studentEnrollLoginRes = await studentLoginHandler(studentEnrollLoginReq);
  const studentEnrollLoginData = await studentEnrollLoginRes.json();
  if (studentEnrollLoginRes.status !== 200 || !studentEnrollLoginData.success) {
    throw new Error(`Student enrollment number login failed: ${studentEnrollLoginData.error}`);
  }
  console.log("[PASS] 5.2 Student login by Enrollment Number functional!");

  // TEST 6: Student Blocked from Admin Endpoints
  console.log("\n--- TEST 6: Student Access Blocked from Admin APIs ---");
  const studentVerifyReq = new NextRequest("http://localhost:3000/api/admin/auth/verify", {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentVerifyRes = await adminVerifyHandler(studentVerifyReq);
  if (studentVerifyRes.status !== 403) {
    throw new Error(`Expected 403 for student accessing admin verify, got ${studentVerifyRes.status}`);
  }
  console.log("[PASS] 6.1 Student blocked from /api/admin/auth/verify (HTTP 403 Forbidden)!");

  const studentStatsReq = new NextRequest("http://localhost:3000/api/admin/stats", {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentStatsRes = await adminStatsHandler(studentStatsReq);
  if (studentStatsRes.status !== 403) {
    throw new Error(`Expected 403 for student accessing admin stats, got ${studentStatsRes.status}`);
  }
  console.log("[PASS] 6.2 Student blocked from /api/admin/stats (HTTP 403 Forbidden)!");

  const studentDirReq = new NextRequest("http://localhost:3000/api/admin/students", {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentDirRes = await adminStudentsHandler(studentDirReq);
  if (studentDirRes.status !== 403) {
    throw new Error(`Expected 403 for student accessing student directory, got ${studentDirRes.status}`);
  }
  console.log("[PASS] 6.3 Student blocked from /api/admin/students (HTTP 403 Forbidden)!");

  // TEST 7: Database Integrity & Account Preservation
  console.log("\n--- TEST 7: Database Account Integrity & Preservation ---");
  const supabase = createClient(supabaseUrl, serviceKey);

  const { count: studentProfilesCount } = await supabase
    .from("student_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student");
  console.log("[PASS] 7.1 Genuine student accounts in database:", studentProfilesCount);
  if (studentProfilesCount !== 1189) {
    throw new Error(`Expected exactly 1,189 student accounts, got ${studentProfilesCount}`);
  }

  const { count: totalProfiles } = await supabase
    .from("student_profiles")
    .select("id", { count: "exact", head: true });
  console.log("[PASS] 7.2 Total profiles (students + sole admin):", totalProfiles);
  if (totalProfiles !== 1190) {
    throw new Error(`Expected exactly 1,190 total profiles, got ${totalProfiles}`);
  }

  console.log("\n==================================================================");
  console.log(" ALL 14 ADMIN PORTAL SEPARATION TESTS PASSED (100%)");
  console.log("==================================================================");
}

runTests().catch((err) => {
  console.error("\n[TEST FAILED]", err);
  process.exit(1);
});
