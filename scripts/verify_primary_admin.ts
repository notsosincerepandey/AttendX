import fs from "fs";
import path from "path";
import { authenticateCredentials } from "@/lib/serverAuth";
import { verifyServerSession, requireAdmin } from "@/lib/serverAuthGuard";
import { serverGetStudentDirectory } from "@/lib/serverAdmin";
import { NextRequest } from "next/server";
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

async function runVerification() {
  console.log("==================================================");
  console.log("AttendX Admin Account Verification & RBAC Tests");
  console.log("==================================================");

  const env = parseEnv(path.resolve(process.cwd(), ".env.local"));
  Object.assign(process.env, env);
  const adminPassword = env.DEV_SEED_PASSWORD;
  const studentDefaultPassword = "student@2026";

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl?.includes("iczjocbishkvkkkfvalz")) {
    throw new Error("[SECURITY ABORT] Not target project iczjocbishkvkkkfvalz");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // 1. Verify admin login with admin@attendx.ac.in
  console.log("\n[TEST 1] Admin Login via authenticateCredentials...");
  const adminLoginRes = await authenticateCredentials("admin@attendx.ac.in", adminPassword);
  if (!adminLoginRes.success || !adminLoginRes.user || !adminLoginRes.sessionToken) {
    throw new Error(`Admin login failed: ${adminLoginRes.error}`);
  }
  console.log(" Admin login successful!");
  console.log("  - User ID:", adminLoginRes.user.id);
  console.log("  - Email:", adminLoginRes.user.email);
  console.log("  - Role:", adminLoginRes.user.role);
  console.log("  - Requires Password Change:", adminLoginRes.requiresPasswordChange);

  if (adminLoginRes.user.role !== "admin") {
    throw new Error(`Expected role 'admin', received '${adminLoginRes.user.role}'`);
  }
  if (adminLoginRes.user.email !== "admin@attendx.ac.in") {
    throw new Error(`Expected email 'admin@attendx.ac.in', received '${adminLoginRes.user.email}'`);
  }

  // 2. Verify Session Token through verifyServerSession
  console.log("\n[TEST 2] Server Session Verification with Admin Bearer Token...");
  const adminReq = new NextRequest("http://localhost:3000/api/admin/students", {
    headers: { Authorization: `Bearer ${adminLoginRes.sessionToken}` }
  });
  const adminSession = await verifyServerSession(adminReq);
  if (!adminSession.authenticated || !adminSession.user) {
    throw new Error(`Session verification failed: ${adminSession.error}`);
  }
  console.log(" Admin session verified!");
  console.log("  - Authoritative Role:", adminSession.user.role);
  if (adminSession.user.role !== "admin") {
    throw new Error(`Session user role is not admin: ${adminSession.user.role}`);
  }

  // 3. Test requireAdmin Guard with Admin Session
  console.log("\n[TEST 3] requireAdmin Guard with Admin Session...");
  const adminGuardRes = await requireAdmin(adminReq);
  if ("user" in adminGuardRes && adminGuardRes.user.role === "admin") {
    console.log(" requireAdmin allowed admin access!");
  } else {
    throw new Error("requireAdmin unexpectedly blocked admin access");
  }

  // 4. Test serverGetStudentDirectory with Admin User
  console.log("\n[TEST 4] serverGetStudentDirectory with Admin User...");
  const dirRes = await serverGetStudentDirectory(adminSession.user, { page: 1, pageSize: 5 });
  if (!dirRes.success) {
    throw new Error(`serverGetStudentDirectory failed: ${dirRes.error}`);
  }
  console.log(" Student directory retrieved!");
  console.log("  - Total students in directory:", dirRes.total);
  console.log("  - Sample student:", dirRes.students[0]?.fullName, "Roll:", dirRes.students[0]?.rollNumber);

  // 5. Test Ordinary Student Login
  console.log("\n[TEST 5] Ordinary Student Login via Roll Number...");
  const sampleRoll = "2026011016";
  const studentLoginRes = await authenticateCredentials(sampleRoll, studentDefaultPassword);
  if (!studentLoginRes.success || !studentLoginRes.user || !studentLoginRes.sessionToken) {
    throw new Error(`Student login failed: ${studentLoginRes.error}`);
  }
  console.log(" Student login successful!");
  console.log("  - User ID:", studentLoginRes.user.id);
  console.log("  - Roll Number:", studentLoginRes.user.rollNumber);
  console.log("  - Role:", studentLoginRes.user.role);

  if (studentLoginRes.user.role !== "student") {
    throw new Error(`Expected role 'student', received '${studentLoginRes.user.role}'`);
  }

  // 6. Test RBAC: Student blocked from requireAdmin
  console.log("\n[TEST 6] Student Blocked from requireAdmin Guard...");
  const studentReq = new NextRequest("http://localhost:3000/api/admin/students", {
    headers: { Authorization: `Bearer ${studentLoginRes.sessionToken}` }
  });
  const studentGuardRes = await requireAdmin(studentReq);
  if ("user" in studentGuardRes) {
    throw new Error("Security Violation: Student was granted admin access!");
  }
  const studentStatus = (studentGuardRes as any).status;
  console.log(` Student blocked with HTTP status: ${studentStatus} (Forbidden)`);
  if (studentStatus !== 403) {
    throw new Error(`Expected 403 status, received ${studentStatus}`);
  }

  // 7. Test Student Blocked from serverGetStudentDirectory
  console.log("\n[TEST 7] Student Blocked from serverGetStudentDirectory Operation...");
  const blockedDirRes = await serverGetStudentDirectory(studentLoginRes.user, {});
  if (blockedDirRes.success) {
    throw new Error("Security Violation: Student was able to retrieve student directory!");
  }
  console.log(` Student blocked with error: "${blockedDirRes.error}"`);

  // 8. Test Enrollment Number Login for Students
  console.log("\n[TEST 8] Student Login via Enrollment Number...");
  const enrollmentRes = await authenticateCredentials("2026CED0390", studentDefaultPassword);
  if (!enrollmentRes.success || !enrollmentRes.user) {
    throw new Error(`Enrollment number login failed: ${enrollmentRes.error}`);
  }
  console.log(" Enrollment number login successful! Student:", enrollmentRes.user.fullName);

  // 9. Account Counts Verification
  console.log("\n[TEST 9] Database Account Counts Verification...");
  const { count: profileCount } = await supabaseAdmin.from("student_profiles").select("*", { count: "exact", head: true });
  console.log(" Total student_profiles in Supabase:", profileCount);

  let allUsers: any[] = [];
  let page = 1;
  while (true) {
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (!listData || !listData.users || listData.users.length === 0) break;
    allUsers.push(...listData.users);
    if (listData.users.length < 1000) break;
    page++;
  }
  console.log(" Total Auth users in Supabase:", allUsers.length);

  const adminUsers = allUsers.filter(u => u.app_metadata?.role === "admin" || u.email?.toLowerCase() === "admin@attendx.ac.in");
  console.log(" Total Admin Auth users:", adminUsers.length);
  if (adminUsers.length !== 1) {
    throw new Error(`Expected exactly 1 admin user, found ${adminUsers.length}`);
  }

  const studentProfiles = await supabaseAdmin.from("student_profiles").select("id", { count: "exact" }).eq("role", "student");
  console.log(" Total genuine student profiles:", studentProfiles.count);
  if (studentProfiles.count !== 1189) {
    throw new Error(`Expected exactly 1,189 student profiles, found ${studentProfiles.count}`);
  }

  console.log("\n==================================================");
  console.log(" ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runVerification().catch(err => {
  console.error("\n[VERIFICATION FAILED]", err);
  process.exit(1);
});
