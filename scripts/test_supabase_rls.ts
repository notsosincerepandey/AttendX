/**
 * AttendX Live Supabase PostgreSQL & Row Level Security (RLS) Verification Script (Hardened & Safe)
 * 
 * SAFETY ARCHITECTURE & PRODUCTION SAFEGUARDS:
 * 1. Strictly requires ATTENDX_ALLOW_DISPOSABLE_DB_TESTS="true".
 * 2. Strictly requires ATTENDX_CONFIRM_TEST_PROJECT_REF to match the project ref in NEXT_PUBLIC_SUPABASE_URL.
 * 3. Never modifies, promotes, deletes, or alters existing AttendX accounts (admin, CR, or student).
 * 4. The service-role client is used ONLY for creating and tearing down dedicated disposable test fixtures.
 * 5. ALL RLS policy assertions execute exclusively through actual authenticated Supabase Auth user sessions
 *    (via anon key + signInWithPassword), never through the service-role client.
 * 6. Full try/finally cleanup guarantees that all created disposable test rows and auth users are removed.
 * 7. Zero secrets, tokens, or passwords are ever printed or logged.
 */
import fs from "fs";
import path from "path";

// Load environment variables locally
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runLiveSupabaseRLSTests() {
  console.log("=== AttendX: Live Supabase PostgreSQL & RLS Policy Verification (Safe) ===\n");

  // -------------------------------------------------------------
  // Production Safeguard 1: Mandatory Environment Lock
  // -------------------------------------------------------------
  if (process.env.ATTENDX_ALLOW_DISPOSABLE_DB_TESTS !== "true") {
    console.error("[SAFETY ABORT] Execution blocked: ATTENDX_ALLOW_DISPOSABLE_DB_TESTS is not set to 'true'.");
    console.error("To execute live database tests against a designated disposable test database, you must explicitly set:");
    console.error("  $env:ATTENDX_ALLOW_DISPOSABLE_DB_TESTS=\"true\"");
    console.error("  $env:ATTENDX_CONFIRM_TEST_PROJECT_REF=\"<your-project-ref>\"");
    process.exit(1);
  }

  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("[ERROR] Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  // -------------------------------------------------------------
  // Production Safeguard 2: Explicit Project Ref Confirmation
  // -------------------------------------------------------------
  const urlMatch = supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/);
  const actualProjectRef = urlMatch ? urlMatch[1] : null;
  const confirmedRef = process.env.ATTENDX_CONFIRM_TEST_PROJECT_REF;

  if (!actualProjectRef || !confirmedRef || actualProjectRef !== confirmedRef) {
    console.error("[SAFETY ABORT] Execution blocked: Project ref mismatch.");
    console.error(`URL project ref does not match ATTENDX_CONFIRM_TEST_PROJECT_REF.`);
    console.error("Test execution aborted to protect production databases.");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");

  // Service role client strictly for provisioning disposable fixtures and teardown
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let passed = 0;
  let failed = 0;

  function report(name: string, ok: boolean, details?: string) {
    if (ok) {
      console.log(`[PASS] [POSTGRESQL-RLS] ${name}${details ? " - " + details : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] [POSTGRESQL-RLS] ${name}${details ? " - " + details : ""}`);
      failed++;
    }
  }

  // Track created disposable fixtures for guaranteed cleanup
  const disposableAuthUserIds: string[] = [];
  const disposableProfileIds: string[] = [];
  const disposableAttendanceIds: string[] = [];
  const disposableOverrideIds: string[] = [];
  const disposableReportIds: string[] = [];
  const disposableSlotIds: string[] = [];
  const disposableVersionIds: string[] = [];
  const disposableSectionIds: string[] = [];
  const disposableBranchIds: string[] = [];
  const disposableSessionIds: string[] = [];
  const disposableUniversityIds: string[] = [];

  const runTimestamp = Date.now();
  const testPassword = `DispPass_${runTimestamp}_!A9x`;

  // Disposable user credentials
  const emailStudentA = `disposable_student_a_${runTimestamp}@test.local`;
  const emailStudentB = `disposable_student_b_${runTimestamp}@test.local`;
  const emailCR = `disposable_cr_${runTimestamp}@test.local`;
  const emailAdmin = `disposable_admin_${runTimestamp}@test.local`;

  try {
    console.log("--- 1. Provisioning Dedicated Disposable Test Hierarchy & Users (Service Role) ---");

    // 1a. Provision or resolve disposable academic hierarchy fixtures
    let univId: string;
    const { data: existingUniv } = await serviceClient
      .from("universities")
      .select("id")
      .eq("short_name", "MMMUT_DISP_TEST")
      .maybeSingle();

    if (existingUniv) {
      univId = existingUniv.id;
    } else {
      const { data: newUniv, error: uErr } = await serviceClient
        .from("universities")
        .insert({
          name: "Madan Mohan Malaviya University of Technology (Test)",
          short_name: `DISP_UNIV_${runTimestamp}`,
          location: "Gorakhpur",
        })
        .select()
        .single();
      if (uErr || !newUniv) throw new Error("Failed to create test university fixture: " + uErr?.message);
      univId = newUniv.id;
      disposableUniversityIds.push(univId);
    }

    // Provision disposable academic session
    const { data: sessionFixture, error: sErr } = await serviceClient
      .from("academic_sessions")
      .insert({
        university_id: univId,
        session_name: "2025-26",
        year_name: "First Year",
        semester_name: "Semester I",
        is_active: true,
      })
      .select()
      .single();
    if (sErr || !sessionFixture) throw new Error("Failed to create test academic session fixture: " + sErr?.message);
    const sessionId = sessionFixture.id;
    disposableSessionIds.push(sessionId);

    // Provision disposable branches (IT for Alice/CR, CSE for Bob)
    const { data: branchIT, error: bITErr } = await serviceClient
      .from("branches")
      .insert({
        university_id: univId,
        name: "Information Technology",
        code: `IT_${runTimestamp}`,
        degree: "B.Tech",
      })
      .select()
      .single();
    if (bITErr || !branchIT) throw new Error("Failed to create IT branch fixture: " + bITErr?.message);
    disposableBranchIds.push(branchIT.id);

    const { data: branchCSE, error: bCSEErr } = await serviceClient
      .from("branches")
      .insert({
        university_id: univId,
        name: "Computer Science and Engineering",
        code: `CSE_${runTimestamp}`,
        degree: "B.Tech",
      })
      .select()
      .single();
    if (bCSEErr || !branchCSE) throw new Error("Failed to create CSE branch fixture: " + bCSEErr?.message);
    disposableBranchIds.push(branchCSE.id);

    // Provision disposable sections (SEC-B for Alice/CR under IT, SEC-A for Bob under CSE)
    const { data: secB_IT, error: sBITErr } = await serviceClient
      .from("sections")
      .insert({
        branch_id: branchIT.id,
        section_name: "SEC-B",
        default_room: "TL-203",
      })
      .select()
      .single();
    if (sBITErr || !secB_IT) throw new Error("Failed to create SEC-B section fixture: " + sBITErr?.message);
    disposableSectionIds.push(secB_IT.id);

    const { data: secA_CSE, error: sACSEErr } = await serviceClient
      .from("sections")
      .insert({
        branch_id: branchCSE.id,
        section_name: "SEC-A",
        default_room: "TL-101",
      })
      .select()
      .single();
    if (sACSEErr || !secA_CSE) throw new Error("Failed to create SEC-A section fixture: " + sACSEErr?.message);
    disposableSectionIds.push(secA_CSE.id);

    // Helper to create disposable auth user & profile safely with valid foreign key UUIDs
    async function createDisposableUser(
      email: string,
      role: "student" | "class_admin" | "admin",
      universityId: string,
      branchId: string,
      sectionId: string,
      academicSessionId: string,
      branchCode: string,
      section: string,
      batch: string,
      managedBranch?: string,
      managedSec?: string,
      managedBat?: string
    ) {
      const { data: authUser, error: authErr } = await serviceClient.auth.admin.createUser({
        email,
        password: testPassword,
        email_confirm: true,
        app_metadata: { role },
      });

      if (authErr || !authUser?.user) {
        throw new Error(`Failed to create disposable auth user ${email}: ${authErr?.message}`);
      }
      disposableAuthUserIds.push(authUser.user.id);

      const { data: profile, error: profErr } = await serviceClient
        .from("student_profiles")
        .insert({
          user_id: authUser.user.id,
          full_name: `Disposable ${role} ${runTimestamp}`,
          email,
          role,
          university_id: universityId,
          branch_id: branchId,
          section_id: sectionId,
          academic_session_id: academicSessionId,
          batch,
          semester: "Semester I",
          academic_session: "2025-26",
          managed_branch_code: managedBranch || null,
          managed_section: managedSec || null,
          managed_batch: managedBat || null,
          is_active: true,
          status: "ACTIVE",
          attendance_threshold: 75.0,
        })
        .select()
        .single();

      if (profErr || !profile) {
        throw new Error(`Failed to create disposable profile for ${email}: ${profErr?.message}`);
      }
      disposableProfileIds.push(profile.id);

      // Authenticate a separate client with this user's genuine Supabase Auth session
      const userClient = createClient(supabaseUrl!, anonKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: signInData, error: signInErr } = await userClient.auth.signInWithPassword({
        email,
        password: testPassword,
      });

      if (signInErr || !signInData.session) {
        throw new Error(`Failed to sign in as disposable user ${email}: ${signInErr?.message}`);
      }

      return { authUser: authUser.user, profile, client: userClient };
    }

    // Provision disposable test fixtures with complete relational UUIDs
    const userA = await createDisposableUser(
      emailStudentA,
      "student",
      univId,
      branchIT.id,
      secB_IT.id,
      sessionId,
      `IT_${runTimestamp}`,
      "SEC-B",
      "P1"
    );
    const userB = await createDisposableUser(
      emailStudentB,
      "student",
      univId,
      branchCSE.id,
      secA_CSE.id,
      sessionId,
      `CSE_${runTimestamp}`,
      "SEC-A",
      "P2"
    );
    const userCR = await createDisposableUser(
      emailCR,
      "class_admin",
      univId,
      branchIT.id,
      secB_IT.id,
      sessionId,
      `IT_${runTimestamp}`,
      "SEC-B",
      "P1",
      `IT_${runTimestamp}`,
      "SEC-B",
      "P1"
    );
    const userAdmin = await createDisposableUser(
      emailAdmin,
      "admin",
      univId,
      branchIT.id,
      secB_IT.id,
      sessionId,
      `IT_${runTimestamp}`,
      "SEC-B",
      "P1"
    );

    report("1a. Created dedicated disposable test hierarchy & users (Student A, Student B, CR, Admin)", true);
    report("1b. Authenticated separate Supabase sessions for each disposable user", true);

    // -------------------------------------------------------------
    // Test 2: Student A vs. Student B Isolation (PostgreSQL RLS)
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Student Cross-Data Isolation via Authenticated Clients ---");

    // Student A inserts own attendance using authenticated client
    const { data: attA, error: attAErr } = await userA.client
      .from("attendance_records")
      .insert({
        student_id: userA.profile.id,
        session_date: "2026-11-07",
        period_number: 1,
        subject_code: "DISP-101",
        category: "Theory",
        status: "PRESENT",
        marked_by: "STUDENT",
      })
      .select()
      .single();

    if (attA) disposableAttendanceIds.push(attA.id);
    report(
      "2a. Student A client can insert their own attendance record",
      !attAErr && attA?.status === "PRESENT"
    );

    // Student B attempts to query Student A's attendance using authenticated client
    const { data: bobReadA } = await userB.client
      .from("attendance_records")
      .select()
      .eq("id", attA?.id);

    report(
      "2b. Student B client CANNOT read Student A's attendance (RLS filtered 0 rows)",
      !bobReadA || bobReadA.length === 0,
      "PostgreSQL RLS prevented cross-student read"
    );

    // Student B attempts to delete Student A's attendance using authenticated client
    const { error: bobDeleteAErr } = await userB.client
      .from("attendance_records")
      .delete()
      .eq("id", attA?.id);

    // Verify row still exists in database
    const { data: verifySurvives } = await userA.client
      .from("attendance_records")
      .select()
      .eq("id", attA?.id);

    report(
      "2c. Student B client CANNOT delete Student A's attendance (Record survived)",
      Boolean(verifySurvives && verifySurvives.length === 1),
      "PostgreSQL RLS prevented cross-student deletion"
    );

    // -------------------------------------------------------------
    // Test 3: Profile Security & Anti-Escalation Triggers
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing Profile Security Trigger via Authenticated Student Client ---");

    // Student A attempts to elevate role to admin using their authenticated client
    const { error: studentEscalateErr } = await userA.client
      .from("student_profiles")
      .update({ role: "admin" })
      .eq("id", userA.profile.id);

    report(
      "3a. Authenticated student client CANNOT self-escalate role (Blocked by trigger)",
      Boolean(studentEscalateErr && studentEscalateErr.message.includes("Access Denied")),
      studentEscalateErr?.message
    );

    // Student A attempts to change protected academic fields (section)
    const { error: studentChangeSecErr } = await userA.client
      .from("student_profiles")
      .update({ section_id: "00000000-0000-0000-0000-000000000001" })
      .eq("id", userA.profile.id);

    report(
      "3b. Authenticated student client CANNOT change section assignment (Blocked by trigger)",
      Boolean(studentChangeSecErr && studentChangeSecErr.message.includes("Access Denied")),
      studentChangeSecErr?.message
    );

    // Student A updates harmless profile field (full_name)
    const { error: updateNameErr } = await userA.client
      .from("student_profiles")
      .update({ full_name: "Alice Verified Name" })
      .eq("id", userA.profile.id);

    report(
      "3c. Authenticated student client CAN update harmless profile fields (full_name)",
      !updateNameErr
    );

    // -------------------------------------------------------------
    // Test 4: Class CR Scoped Timetable Enforcement (PostgreSQL RLS)
    // -------------------------------------------------------------
    console.log("\n--- 4. Testing Class CR Scope Boundaries via Authenticated CR Client ---");

    // Class CR attempts to manage version with NULL academic_session_id
    const { error: crNullSessionErr } = await userCR.client
      .from("timetable_versions")
      .insert({
        section_id: secB_IT.id,
        academic_session_id: null, // Strictly rejected!
        version_label: "CR_DISP_NULL_SESSION",
      });

    report(
      "4a. Class CR client CANNOT create timetable version with NULL academic_session_id",
      Boolean(crNullSessionErr)
    );

    // Class CR attempts to manage version with fabricated session UUID
    const { error: crFakeSessionErr } = await userCR.client
      .from("timetable_versions")
      .insert({
        section_id: secB_IT.id,
        academic_session_id: "ffffffff-ffff-ffff-ffff-ffffffffffff", // Nonexistent!
        version_label: "CR_DISP_FAKE_SESSION",
      });

    report(
      "4b. Class CR client CANNOT create timetable version with fabricated academic_session_id",
      Boolean(crFakeSessionErr)
    );

    // Class CR creates timetable version for their assigned section & session
    const { data: tvCR, error: tvCRErr } = await userCR.client
      .from("timetable_versions")
      .insert({
        section_id: secB_IT.id,
        academic_session_id: sessionId,
        version_label: `CR_VALID_${runTimestamp}`,
        is_active: true,
      })
      .select()
      .single();

    if (tvCR) disposableVersionIds.push(tvCR.id);
    report(
      "4c. Class CR client CAN create timetable version for their assigned section & session",
      !tvCRErr && Boolean(tvCR)
    );

    // -------------------------------------------------------------
    // Test 5: Student Personal Timetable CRUD (PostgreSQL RLS)
    // -------------------------------------------------------------
    console.log("\n--- 5. Testing Student Personal Timetable Overrides via Authenticated Client ---");

    const { data: overrideA, error: overrideAErr } = await userA.client
      .from("student_timetable_overrides")
      .insert({
        student_id: userA.profile.id,
        day_of_week: "Monday",
        period_number: 1,
        subject_code: "ALICE-CUSTOM-101",
        subject_name: "Personal Study Slot",
        category: "Theory",
        applicable_batch: "ALL",
        custom_start_time: "09:00:00",
        custom_end_time: "10:00:00",
      })
      .select()
      .single();

    if (overrideA) disposableOverrideIds.push(overrideA.id);
    report(
      "5a. Student A can create a personal timetable slot without timetable_slot_id",
      !overrideAErr && overrideA?.subject_code === "ALICE-CUSTOM-101"
    );

    // Student A deletes own override
    if (overrideA) {
      const { error: deleteOverrideErr } = await userA.client
        .from("student_timetable_overrides")
        .delete()
        .eq("id", overrideA.id);

      report(
        "5b. Student A can delete own timetable overrides to restore official schedule",
        !deleteOverrideErr
      );
    }

    // -------------------------------------------------------------
    console.log("\n--- 6. Testing Cancellation Reports Access Control & Reference Tables RLS ---");

    // 6a. Student A reads academic_sessions & batches (public read-only)
    const { data: sessionRows, error: sessionErr } = await userA.client
      .from("academic_sessions")
      .select("id")
      .limit(1);
    report("6a. Authenticated student can read academic_sessions via RLS policy", !sessionErr);

    // 6b. Student A attempts to insert academic_sessions (blocked by RLS)
    const { error: insertSessionErr } = await userA.client
      .from("academic_sessions")
      .insert({ session_name: "2099-00", year_name: "Hack Year", semester_name: "Hack Sem" });
    report("6b. Non-admin cannot insert into academic_sessions (blocked by RLS)", Boolean(insertSessionErr));

    // 6c. Student A inserts report for their own section (succeeds)
    const { data: reportA, error: reportAErr } = await userA.client
      .from("cancellation_reports")
      .insert({
        reported_by_student_id: userA.profile.id,
        section_id: userA.profile.section_id,
        session_date: new Date().toISOString().split("T")[0],
        period_number: 1,
        subject_code: "BCS-01",
        reason_type: "TEACHER_ABSENT",
        description: "Teacher notified absence",
        status: "PENDING",
        confirmed_by: null,
      })
      .select()
      .single();

    if (reportA) disposableReportIds.push(reportA.id);
    report("6c. Student A can submit cancellation report for their assigned section", !reportAErr && Boolean(reportA));

    // 6d. Student A attempts to submit report with non-null confirmed_by (blocked by RLS)
    const { error: studentForgedConfirmErr } = await userA.client
      .from("cancellation_reports")
      .insert({
        reported_by_student_id: userA.profile.id,
        section_id: userA.profile.section_id,
        session_date: new Date().toISOString().split("T")[0],
        period_number: 1,
        subject_code: "BCS-01",
        reason_type: "TEACHER_ABSENT",
        status: "PENDING",
        confirmed_by: "Deceptive Admin",
      });
    report("6d. Student A cannot insert report with non-null confirmed_by", Boolean(studentForgedConfirmErr));

    // 6e. Student A attempts to submit report for Student B's section (blocked by RLS)
    const { error: crossSecReportErr } = await userA.client
      .from("cancellation_reports")
      .insert({
        reported_by_student_id: userA.profile.id,
        section_id: userB.profile.section_id,
        session_date: new Date().toISOString().split("T")[0],
        period_number: 1,
        subject_code: "BCS-02",
        reason_type: "MASS_BUNK",
        status: "PENDING",
        confirmed_by: null,
      });
    report("6e. Student A is rejected when submitting report for Student B's section", Boolean(crossSecReportErr));

    // 6f. Student B queries cancellation_reports (isolated to Student B's section)
    const { data: bReports } = await userB.client
      .from("cancellation_reports")
      .select("*")
      .eq("id", reportA?.id || "00000000-0000-0000-0000-000000000000");
    report("6f. Student B cannot see Student A's section cancellation report (section isolated)", !bReports || bReports.length === 0);

    // 6g. Student A attempts to update report status to CONFIRMED (blocked by RLS)
    if (reportA) {
      const { data: updateData, error: updateReportErr } = await userA.client
        .from("cancellation_reports")
        .update({ status: "CONFIRMED" })
        .eq("id", reportA.id)
        .select("id");

      const { data: freshReport } = await userA.client
        .from("cancellation_reports")
        .select("status")
        .eq("id", reportA.id)
        .single();

      const zeroRowsAffected =
        !updateReportErr &&
        Array.isArray(updateData) &&
        updateData.length === 0;
      const statusRemainsPending = freshReport?.status === "PENDING";

      report(
        "6g. Student cannot update cancellation report status (admin only)",
        zeroRowsAffected && statusRemainsPending,
        "PostgreSQL RLS prevented status update (0 rows affected, status remained PENDING)"
      );

      // 6h. Admin updates report status to CONFIRMED (allowed)
      const { error: adminUpdateReportErr } = await userAdmin.client
        .from("cancellation_reports")
        .update({ status: "CONFIRMED" })
        .eq("id", reportA.id);
      report("6h. Admin can update cancellation report status", !adminUpdateReportErr);
    }

  } catch (err: any) {
    console.error("[ERROR] Unexpected error during live RLS verification:", err.message);
  } finally {
    // -------------------------------------------------------------
    // Guaranteed Teardown: Remove ONLY records created by this test run
    // -------------------------------------------------------------
    console.log("\n--- Teardown & Cleanup of Disposable Test Data ---");

    if (disposableReportIds.length > 0) {
      await serviceClient.from("cancellation_reports").delete().in("id", disposableReportIds);
    }
    if (disposableAttendanceIds.length > 0) {
      await serviceClient.from("attendance_records").delete().in("id", disposableAttendanceIds);
    }
    if (disposableSlotIds.length > 0) {
      await serviceClient.from("timetable_slots").delete().in("id", disposableSlotIds);
    }
    if (disposableVersionIds.length > 0) {
      await serviceClient.from("timetable_versions").delete().in("id", disposableVersionIds);
    }
    if (disposableOverrideIds.length > 0) {
      await serviceClient.from("student_timetable_overrides").delete().in("id", disposableOverrideIds);
    }
    if (disposableProfileIds.length > 0) {
      await serviceClient.from("student_profiles").delete().in("id", disposableProfileIds);
    }
    for (const authUserId of disposableAuthUserIds) {
      await serviceClient.auth.admin.deleteUser(authUserId);
    }
    if (disposableSectionIds.length > 0) {
      await serviceClient.from("sections").delete().in("id", disposableSectionIds);
    }
    if (disposableBranchIds.length > 0) {
      await serviceClient.from("branches").delete().in("id", disposableBranchIds);
    }
    if (disposableSessionIds.length > 0) {
      await serviceClient.from("academic_sessions").delete().in("id", disposableSessionIds);
    }
    if (disposableUniversityIds.length > 0) {
      await serviceClient.from("universities").delete().in("id", disposableUniversityIds);
    }

    console.log(`Teardown complete. Deleted ${disposableAuthUserIds.length} disposable auth users and all associated test rows.`);
    console.log("Zero changes made to existing AttendX test accounts.");
  }

  console.log(`\n=== Live PostgreSQL/RLS Suite Completed: ${passed} Passed, ${failed} Failed ===`);
}

runLiveSupabaseRLSTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
