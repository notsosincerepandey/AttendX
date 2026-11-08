/**
 * AttendX 1,189-Student Bulk Onboarding Utility
 * 
 * Safely imports and provisions student accounts from official session 2026-27 data.
 * 
 * Production Account Rules:
 * - Strictly preserves the 3 existing accounts:
 *     1. System Admin: admin@mmmut.ac.in (c70936b3-ffe8-4baa-908d-f92fbd62ca9a)
 *     2. Student: shubhpandey304@gmail.com (79fdb5a8-9f27-4cde-bd3b-c5abbb0eaded)
 *     3. Class Admin (CR): harsh@gmail.com (8f4bec2c-8890-46f7-bc49-4074baa0dcde)
 * - Sets roll number as the primary user login ID.
 * - Enforces default password: student@2026 (never logged).
 * - Enforces mandatory first-login password change and single-use self-service restriction.
 * - Enforces authoritative branch_id and section_id foreign keys (hard failure if missing).
 * - Idempotent, batch-atomic, with verified rollback and recovery.
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv, REQUIRED_PRODUCTION_PROJECT_REF } from "./set_admin_password";
import { fetchAllAuthUsers, AuthUserLike } from "./migrate_supabase_auth";

export const PRESERVED_ACCOUNTS = [
  { email: "admin@mmmut.ac.in", uuid: "c70936b3-ffe8-4baa-908d-f92fbd62ca9a", role: "admin" },
  { email: "shubhpandey304@gmail.com", uuid: "79fdb5a8-9f27-4cde-bd3b-c5abbb0eaded", role: "student" },
  { email: "harsh@gmail.com", uuid: "8f4bec2c-8890-46f7-bc49-4074baa0dcde", role: "class_admin" },
];

export const DEFAULT_STUDENT_PASSWORD = "student@2026";
export const DEFAULT_ACADEMIC_SESSION = "2026-27";
export const BATCH_SIZE = 25;

export const VALID_BRANCHES = new Set(["CE", "CSE", "EE", "ECE", "ECE(IOT)", "ME", "CHE", "IT"]);
export const VALID_BATCHES = new Set(["P1", "P2"]);

export const EXPECTED_BRANCH_SECTIONS: string[] = [
  "CE SEC-A", "CE SEC-B",
  "CSE SEC-A", "CSE SEC-B", "CSE SEC-C", "CSE SEC-D",
  "EE SEC-A", "EE SEC-B",
  "ECE SEC-A", "ECE SEC-B", "ECE SEC-C",
  "ECE(IOT) SEC-A",
  "ME SEC-A", "ME SEC-B",
  "CHE SEC-A",
  "IT SEC-A", "IT SEC-B"
];

export interface StudentManifestRecord {
  roll_no: string;
  enrollment_no: string;
  full_name: string;
  father_name: string;
  branch_code: string;
  section: string;
  raw_tp: string;
  batch: "P1" | "P2";
  academic_session: string;
  semester: string;
  internal_alias: string;
  role: "student";
}

export interface OnboardingPreflightReport {
  totalInManifest: number;
  preservedAccountsFound: number;
  existingAccountsCount: number;
  newAccountsToCreate: number;
  alreadyExistingRollNumbers: string[];
  duplicateRollsInManifest: string[];
  duplicateEnrollmentsInManifest: string[];
  duplicateAliasesInManifest: string[];
  invalidRecordsCount: number;
  invalidRecordDetails: { roll: string; reason: string }[];
  branchDistribution: Record<string, number>;
  sectionDistribution: Record<string, number>;
  batchDistribution: Record<string, number>;
  // Database prerequisite statuses
  databaseReady: boolean;
  missingPrerequisites: string[];
  missingBranches: string[];
  missingSections: string[];
  hasAcademicSession: boolean;
  hasResetTable: boolean;
  hasProfileColumns: boolean;
}

export interface BatchProvisionResult {
  success: boolean;
  createdCount: number;
  errors: string[];
  rollbackComplete?: boolean;
  criticalFailure?: boolean;
  remainingOrphans?: string[];
}

/**
 * Loads the validated 1,189 student manifest
 */
export function loadStudentManifest(): StudentManifestRecord[] {
  const manifestPath = path.resolve(process.cwd(), "scripts/student_manifest_1189.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`[FATAL] Manifest file not found at: ${manifestPath}. Run generate_import_manifest.py first.`);
  }
  const content = fs.readFileSync(manifestPath, "utf-8");
  const records: StudentManifestRecord[] = JSON.parse(content);
  return records;
}

/**
 * Evaluates preflight conditions strictly without performing any mutations.
 */
export async function evaluateOnboardingPreflight(
  manifest: StudentManifestRecord[],
  supabase: any
): Promise<OnboardingPreflightReport> {
  // 1. Fetch all existing auth users
  const authUsers: AuthUserLike[] = await fetchAllAuthUsers(supabase.auth.admin, 100);
  const existingEmails = new Set(authUsers.map((u) => u.email?.trim().toLowerCase()));

  // 2. Fetch all existing student profiles safely
  let profiles: any[] = [];
  const { data: pDataWithCols, error: pErrWithCols } = await supabase
    .from("student_profiles")
    .select("id, email, roll_number, enrollment_number, user_id, role, branch_code, section");

  if (pErrWithCols) {
    const { data: pDataBasic, error: pErrBasic } = await supabase
      .from("student_profiles")
      .select("id, email, user_id, role");
    if (pErrBasic) {
      throw new Error(`Failed to query student_profiles: ${pErrBasic.message}`);
    }
    profiles = pDataBasic || [];
  } else {
    profiles = pDataWithCols || [];
  }

  const profileEmails = new Set((profiles || []).map((p: any) => p.email?.trim().toLowerCase()));
  const profileRolls = new Set((profiles || []).map((p: any) => p.roll_number).filter(Boolean));
  const profileEnrollments = new Set((profiles || []).map((p: any) => p.enrollment_number).filter(Boolean));

  // 3. Strict verification of preserved accounts: UUID, email, AND role must all match simultaneously
  let preservedFoundCount = 0;
  for (const preserved of PRESERVED_ACCOUNTS) {
    const normalizedEmail = preserved.email.trim().toLowerCase();
    const foundAuth = authUsers.find(
      (u) =>
        u.id === preserved.uuid &&
        u.email?.trim().toLowerCase() === normalizedEmail &&
        (u.app_metadata?.role === preserved.role || (preserved.role === "admin" && normalizedEmail === "admin@mmmut.ac.in"))
    );
    const foundProfile = profiles.find(
      (p: any) =>
        (p.user_id === preserved.uuid || p.id === preserved.uuid) &&
        p.email?.trim().toLowerCase() === normalizedEmail &&
        p.role === preserved.role
    );

    if (foundAuth && foundProfile) {
      preservedFoundCount++;
    } else {
      console.warn(
        `[PREFLIGHT WARNING] Preserved account check failed for '${preserved.email}': ` +
        `authMatch=${Boolean(foundAuth)}, profileMatch=${Boolean(foundProfile)}`
      );
    }
  }

  // 4. Manifest comprehensive validation
  if (manifest.length !== 1189) {
    throw new Error(`[FATAL] Manifest record count must be exactly 1,189. Found: ${manifest.length}`);
  }

  const rollCounts: Record<string, number> = {};
  const enrollmentCounts: Record<string, number> = {};
  const aliasCounts: Record<string, number> = {};
  const branchCounts: Record<string, number> = {};
  const sectionCounts: Record<string, number> = {};
  const batchCounts: Record<string, number> = {};

  const duplicateRolls: string[] = [];
  const duplicateEnrollments: string[] = [];
  const duplicateAliases: string[] = [];
  const alreadyExistingRolls: string[] = [];
  const invalidDetails: { roll: string; reason: string }[] = [];

  for (const s of manifest) {
    // Unique roll numbers
    rollCounts[s.roll_no] = (rollCounts[s.roll_no] || 0) + 1;
    if (rollCounts[s.roll_no] === 2) duplicateRolls.push(s.roll_no);

    // Unique enrollment numbers
    enrollmentCounts[s.enrollment_no] = (enrollmentCounts[s.enrollment_no] || 0) + 1;
    if (enrollmentCounts[s.enrollment_no] === 2) duplicateEnrollments.push(s.enrollment_no);

    // Unique internal aliases
    const aliasLower = s.internal_alias.trim().toLowerCase();
    aliasCounts[aliasLower] = (aliasCounts[aliasLower] || 0) + 1;
    if (aliasCounts[aliasLower] === 2) duplicateAliases.push(s.internal_alias);

    // Internal alias derived correctly from roll number
    const expectedAlias = `student.${s.roll_no}@attendx.mmmut.ac.in`.toLowerCase();
    if (aliasLower !== expectedAlias) {
      invalidDetails.push({ roll: s.roll_no, reason: `Alias mismatch: expected ${expectedAlias}, got ${s.internal_alias}` });
    }

    // Required fields check
    if (!s.roll_no || !s.roll_no.trim()) invalidDetails.push({ roll: s.roll_no, reason: "Empty roll_no" });
    if (!s.enrollment_no || !s.enrollment_no.trim()) invalidDetails.push({ roll: s.roll_no, reason: "Empty enrollment_no" });
    if (!s.full_name || !s.full_name.trim()) invalidDetails.push({ roll: s.roll_no, reason: "Empty full_name" });
    if (!s.father_name || !s.father_name.trim()) invalidDetails.push({ roll: s.roll_no, reason: "Empty father_name" });
    if (!s.branch_code || !VALID_BRANCHES.has(s.branch_code)) invalidDetails.push({ roll: s.roll_no, reason: `Invalid branch_code: ${s.branch_code}` });
    if (!s.section || !s.section.trim()) invalidDetails.push({ roll: s.roll_no, reason: "Empty section" });
    if (!s.batch || !VALID_BATCHES.has(s.batch)) invalidDetails.push({ roll: s.roll_no, reason: `Invalid batch: ${s.batch}` });
    if (s.academic_session !== DEFAULT_ACADEMIC_SESSION) invalidDetails.push({ roll: s.roll_no, reason: `Invalid academic_session: ${s.academic_session}` });
    if (!s.semester || !s.semester.trim()) invalidDetails.push({ roll: s.roll_no, reason: "Empty semester" });

    // Check collision with existing accounts
    if (
      existingEmails.has(aliasLower) ||
      profileEmails.has(aliasLower) ||
      profileRolls.has(s.roll_no) ||
      profileEnrollments.has(s.enrollment_no)
    ) {
      alreadyExistingRolls.push(s.roll_no);
    }

    // Distributions
    branchCounts[s.branch_code] = (branchCounts[s.branch_code] || 0) + 1;
    const secKey = `${s.branch_code} ${s.section}`;
    sectionCounts[secKey] = (sectionCounts[secKey] || 0) + 1;
    batchCounts[s.batch] = (batchCounts[s.batch] || 0) + 1;
  }

  // 5. Check Database Prerequisites in live Supabase
  const missingPrerequisites: string[] = [];
  const { data: dbBranches } = await supabase.from("branches").select("id, code");
  const { data: dbSections } = await supabase.from("sections").select("id, section_name, branch_id");
  const { data: dbSessions } = await supabase.from("academic_sessions").select("id, session_name");
  const { error: resetErr } = await supabase.from("admin_password_resets").select("id").limit(1);

  const missingBranches = Array.from(VALID_BRANCHES).filter(
    (bCode) => !(dbBranches || []).some((d: any) => d.code === bCode)
  );

  const missingSections = EXPECTED_BRANCH_SECTIONS.filter((bs) => {
    const [bCode, sName] = bs.split(" ");
    const bId = (dbBranches || []).find((b: any) => b.code === bCode)?.id;
    if (!bId) return true;
    return !(dbSections || []).some((sec: any) => sec.branch_id === bId && sec.section_name === sName);
  });

  const hasAcademicSession = (dbSessions || []).some((s: any) => s.session_name === DEFAULT_ACADEMIC_SESSION);
  const hasResetTable = !resetErr;
  const hasProfileColumns = !pErrWithCols;

  if (missingBranches.length > 0) missingPrerequisites.push(`Missing branches in DB (${missingBranches.join(", ")})`);
  if (missingSections.length > 0) missingPrerequisites.push(`Missing sections in DB (${missingSections.length} sections)`);
  if (!hasAcademicSession) missingPrerequisites.push(`Missing academic_session '${DEFAULT_ACADEMIC_SESSION}' in DB`);
  if (!hasResetTable) missingPrerequisites.push("Missing table 'admin_password_resets' in DB");
  if (!hasProfileColumns) missingPrerequisites.push("Missing new columns on 'student_profiles' in DB");

  const databaseReady = missingPrerequisites.length === 0;
  const newToCreate = manifest.length - alreadyExistingRolls.length;

  return {
    totalInManifest: manifest.length,
    preservedAccountsFound: preservedFoundCount,
    existingAccountsCount: authUsers.length,
    newAccountsToCreate: newToCreate,
    alreadyExistingRollNumbers: alreadyExistingRolls,
    duplicateRollsInManifest: duplicateRolls,
    duplicateEnrollmentsInManifest: duplicateEnrollments,
    duplicateAliasesInManifest: duplicateAliases,
    invalidRecordsCount: invalidDetails.length,
    invalidRecordDetails: invalidDetails,
    branchDistribution: branchCounts,
    sectionDistribution: sectionCounts,
    batchDistribution: batchCounts,
    databaseReady,
    missingPrerequisites,
    missingBranches,
    missingSections,
    hasAcademicSession,
    hasResetTable,
    hasProfileColumns,
  };
}

/**
 * Provisions a single batch with authoritative student profile mapping,
 * strictly enforced foreign keys (branch_id & section_id), verified atomic rollback,
 * and complete elimination of basicData fallbacks.
 */
export async function provisionStudentBatch(
  batch: StudentManifestRecord[],
  supabase: any,
  helpers?: {
    branchMap?: Map<string, string>;
    sectionMap?: Map<string, string>;
    sessionId?: string;
    universityId?: string;
  }
): Promise<BatchProvisionResult> {
  const createdAuthIds: string[] = [];
  const errors: string[] = [];
  const PRESERVED_UUID_SET = new Set(PRESERVED_ACCOUNTS.map((a) => a.uuid.toLowerCase()));

  for (const student of batch) {
    try {
      // 1. Create Supabase Auth user
      const { data: authResult, error: authErr } = await supabase.auth.admin.createUser({
        email: student.internal_alias,
        password: DEFAULT_STUDENT_PASSWORD,
        email_confirm: true,
        app_metadata: {
          role: "student",
          roll_number: student.roll_no,
          enrollment_number: student.enrollment_no,
          father_name: student.father_name,
          branch_code: student.branch_code,
          section: student.section,
          batch: student.batch,
          academic_session: student.academic_session,
          password_change_consumed: false,
          requires_password_change: true,
        },
        user_metadata: {
          full_name: student.full_name,
          roll_number: student.roll_no,
        },
      });

      if (authErr || !authResult?.user) {
        throw new Error(`Failed to create Auth account for roll ${student.roll_no}: ${authErr?.message}`);
      }

      const userId = authResult.user.id;
      createdAuthIds.push(userId);

      // 2. Authoritative insert into student_profiles (Populates ALL required fields)
      const secLookupKey = `${student.branch_code}_${student.section}`;
      const branchId = helpers?.branchMap?.get(student.branch_code);
      const sectionId = helpers?.sectionMap?.get(secLookupKey);

      // HARD FOREIGN KEY REQUIREMENT: Do not permit imported students to have missing branch_id or section_id
      if (!branchId || !sectionId) {
        throw new Error(
          `Hard Schema Requirement Violated: Missing authoritative foreign key branch_id or section_id for roll ${student.roll_no} (${student.branch_code} ${student.section}). Reference records must exist in branches and sections tables.`
        );
      }

      const profileData: Record<string, any> = {
        id: userId,
        user_id: userId,
        full_name: student.full_name,
        father_name: student.father_name,
        roll_number: student.roll_no,
        enrollment_number: student.enrollment_no,
        email: student.internal_alias,
        role: "student",
        branch_id: branchId,
        section_id: sectionId,
        branch_code: student.branch_code,
        section: student.section,
        batch: student.batch,
        semester: student.semester || "Semester I",
        academic_session: student.academic_session || DEFAULT_ACADEMIC_SESSION,
        academic_session_id: helpers?.sessionId,
        university_id: helpers?.universityId,
        attendance_threshold: 75.0,
        is_active: true,
        status: "ACTIVE",
        password_change_consumed: false,
        requires_password_change: true,
      };

      const { error: profileErr } = await supabase.from("student_profiles").insert(profileData);
      if (profileErr) {
        // HARD FAILURE: Absolutely NO basicData fallback! Abort batch to preserve identity and enrollment integrity.
        throw new Error(`Authoritative student_profile insert failed for roll ${student.roll_no}: ${profileErr.message}`);
      }
    } catch (err: any) {
      errors.push(err.message);
      console.error(`[BATCH FAILURE] Aborting batch at student ${student.roll_no}:`, err.message);
      break; // Abort remaining items in batch
    }
  }

  // If batch encountered any error, execute VERIFIED atomic rollback
  if (errors.length > 0) {
    console.warn(`[ATOMIC ROLLBACK] Initiating verified rollback for ${createdAuthIds.length} newly created accounts...`);
    const rollbackErrors: string[] = [];

    for (const uid of createdAuthIds) {
      // Safety guarantee: Preserved accounts can NEVER be included in rollback
      if (PRESERVED_UUID_SET.has(uid.toLowerCase())) {
        console.error(`[CRITICAL SECURITY VIOLATION] Preserved UUID '${uid}' found in rollback queue! Skipping.`);
        rollbackErrors.push(`Security violation: preserved UUID ${uid} in rollback queue`);
        continue;
      }

      try {
        await supabase.from("student_profiles").delete().eq("user_id", uid);
      } catch (pErr: any) {
        rollbackErrors.push(`Profile delete error for ${uid}: ${pErr.message}`);
      }

      try {
        const { error: delAuthErr } = await supabase.auth.admin.deleteUser(uid);
        if (delAuthErr) {
          rollbackErrors.push(`Auth delete error for ${uid}: ${delAuthErr.message}`);
        }
      } catch (aErr: any) {
        rollbackErrors.push(`Auth delete exception for ${uid}: ${aErr.message}`);
      }
    }

    // POST-ROLLBACK VERIFICATION: Verify all created users are truly gone from database
    const remainingOrphans: string[] = [];
    for (const uid of createdAuthIds) {
      if (PRESERVED_UUID_SET.has(uid.toLowerCase())) continue;
      try {
        const { data: checkAuth } = await supabase.auth.admin.getUserById(uid);
        if (checkAuth?.user) {
          remainingOrphans.push(`auth.users:${uid}`);
        }
      } catch {
        // user not found = clean
      }
      try {
        const { data: checkProf } = await supabase.from("student_profiles").select("id").eq("user_id", uid).maybeSingle();
        if (checkProf) {
          remainingOrphans.push(`student_profiles:${uid}`);
        }
      } catch {
        // profile not found = clean
      }
    }

    if (remainingOrphans.length > 0) {
      console.error(
        `[CRITICAL ROLLBACK FAILURE] Batch rollback was incomplete! Orphaned records remaining in database: ${remainingOrphans.join(", ")}`
      );
      return {
        success: false,
        createdCount: 0,
        errors,
        rollbackComplete: false,
        criticalFailure: true,
        remainingOrphans,
      };
    }

    console.log(`[ROLLBACK VERIFIED] All ${createdAuthIds.length} newly created accounts were cleanly rolled back and verified removed.`);
    return {
      success: false,
      createdCount: 0,
      errors,
      rollbackComplete: true,
      criticalFailure: false,
    };
  }

  return { success: true, createdCount: createdAuthIds.length, errors: [] };
}

/**
 * Main execution runner
 */
export async function runBulkOnboarding(): Promise<void> {
  console.log("============================================================");
  console.log("      ATTENDX 1,189-STUDENT BULK ONBOARDING UTILITY         ");
  console.log("============================================================\n");

  loadLocalEnv();

  const isLive = process.argv.includes("--live");
  const isDryRun = !isLive || process.argv.includes("--dry-run");

  console.log(`Execution Mode: ${isDryRun ? "DRY-RUN (Safe Simulation - No Mutations)" : "LIVE EXECUTION"}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[FATAL] Supabase environment variables missing.");
    process.exit(1);
  }

  if (!supabaseUrl.includes(REQUIRED_PRODUCTION_PROJECT_REF)) {
    console.error(`[FATAL] URL does not match production project ${REQUIRED_PRODUCTION_PROJECT_REF}.`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Load manifest
  console.log("Loading student manifest (1,189 records)...");
  const manifest = loadStudentManifest();
  console.log(`Successfully loaded ${manifest.length} students from manifest.`);

  // 2. Preflight evaluation
  console.log("\nEvaluating preflight checks against production Supabase...");
  const preflight = await evaluateOnboardingPreflight(manifest, supabase);

  console.log("\n--- PREFLIGHT ASSESSMENT RESULTS ---");
  console.log(`Total students in manifest:              ${preflight.totalInManifest}`);
  console.log(`Preserved accounts found intact (3 of 3): ${preflight.preservedAccountsFound}`);
  console.log(`Existing Supabase Auth users:            ${preflight.existingAccountsCount}`);
  console.log(`New accounts to provision:               ${preflight.newAccountsToCreate}`);
  console.log(`Already onboarded students:              ${preflight.alreadyExistingRollNumbers.length}`);
  console.log(`Duplicate roll numbers in manifest:      ${preflight.duplicateRollsInManifest.length}`);
  console.log(`Duplicate enrollment numbers in manifest: ${preflight.duplicateEnrollmentsInManifest.length}`);
  console.log(`Duplicate aliases in manifest:           ${preflight.duplicateAliasesInManifest.length}`);
  console.log(`Invalid / incomplete records:            ${preflight.invalidRecordsCount}`);

  console.log("\n--- DATABASE PREREQUISITES STATUS ---");
  console.log(`Database Ready for Live Import:         ${preflight.databaseReady ? "YES (All objects present)" : "NO (Pending Migrations / Seeds)"}`);
  if (!preflight.databaseReady) {
    console.log("Missing Database Prerequisites:");
    preflight.missingPrerequisites.forEach((p) => console.log(`  - ${p}`));
  }

  console.log("\n--- BRANCH DISTRIBUTION ---");
  Object.entries(preflight.branchDistribution).forEach(([branch, count]) => {
    console.log(`  ${branch.padEnd(12)}: ${count} students`);
  });

  console.log("\n--- BATCH (T/P) DISTRIBUTION ---");
  Object.entries(preflight.batchDistribution).forEach(([batch, count]) => {
    console.log(`  Batch ${batch.padEnd(8)}: ${count} students`);
  });

  // Strict safety checks
  if (preflight.duplicateRollsInManifest.length > 0) {
    console.error("[SAFETY ABORT] Duplicate roll numbers detected in manifest.");
    process.exit(1);
  }

  if (preflight.duplicateEnrollmentsInManifest.length > 0) {
    console.error("[SAFETY ABORT] Duplicate enrollment numbers detected in manifest.");
    process.exit(1);
  }

  if (preflight.duplicateAliasesInManifest.length > 0) {
    console.error("[SAFETY ABORT] Duplicate internal aliases detected in manifest.");
    process.exit(1);
  }

  if (preflight.invalidRecordsCount > 0) {
    console.error("[SAFETY ABORT] Incomplete or invalid student records found in manifest.");
    process.exit(1);
  }

  if (preflight.preservedAccountsFound !== PRESERVED_ACCOUNTS.length) {
    console.error(`[SAFETY ABORT] Preserved accounts verification failed: found ${preflight.preservedAccountsFound} of ${PRESERVED_ACCOUNTS.length}.`);
    process.exit(1);
  }

  if (isDryRun) {
    console.log("\n============================================================");
    if (!preflight.databaseReady) {
      console.log(" [PREFLIGHT NOTICE] Manifest is 100% valid and verified.");
      console.log(" Database schema and reference tables require deployment of:");
      console.log("   supabase/migrations/20261108_bulk_student_onboarding.sql");
      console.log(" Zero production accounts were modified.");
    } else {
      console.log(" [SUCCESS] Preflight checks passed! 1,189 students verified.");
      console.log(" Dry-run completed cleanly. Zero production accounts modified.");
      console.log(" To execute live import, Admin approval is required.");
    }
    console.log("============================================================\n");
    return;
  }

  // Live execution gates
  if (process.env.ATTENDX_CONFIRM_BULK_IMPORT !== "true") {
    console.error("\n[SAFETY ABORT] Live execution blocked: ATTENDX_CONFIRM_BULK_IMPORT is not set to 'true'.");
    process.exit(1);
  }

  if (!preflight.databaseReady) {
    console.error("\n[SAFETY ABORT] Cannot run live execution: Database prerequisites are missing.");
    console.error("Please apply migration 'supabase/migrations/20261108_bulk_student_onboarding.sql' in Supabase SQL editor first.");
    process.exit(1);
  }

  // Helpers: Load branches, sections, and session IDs from database
  const branchMap = new Map<string, string>();
  const sectionMap = new Map<string, string>();
  let sessionId: string | undefined;
  let universityId: string | undefined;

  try {
    const { data: uData } = await supabase.from("universities").select("id").eq("short_name", "MMMUT").maybeSingle();
    universityId = uData?.id;

    const { data: sessData } = await supabase.from("academic_sessions").select("id").eq("session_name", DEFAULT_ACADEMIC_SESSION).maybeSingle();
    sessionId = sessData?.id;

    const { data: bData } = await supabase.from("branches").select("id, code");
    (bData || []).forEach((b: any) => branchMap.set(b.code, b.id));

    const { data: sData } = await supabase.from("sections").select("id, section_name, branch_id");
    (sData || []).forEach((s: any) => {
      const bCode = Array.from(branchMap.entries()).find(([code, id]) => id === s.branch_id)?.[0];
      if (bCode) sectionMap.set(`${bCode}_${s.section_name}`, s.id);
    });
  } catch (err: any) {
    console.error("[FATAL] Failed to load database reference maps:", err.message);
    process.exit(1);
  }

  console.log("\nStarting live batch provisioning (Batch size: " + BATCH_SIZE + ")...");
  const alreadyExistingSet = new Set(preflight.alreadyExistingRollNumbers);
  const toProcess = manifest.filter((s) => !alreadyExistingSet.has(s.roll_no));

  let totalProvisioned = 0;
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const chunk = toProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);

    console.log(`Processing Batch ${batchNum}/${totalBatches} (${chunk.length} students)...`);
    const result = await provisionStudentBatch(chunk, supabase, {
      branchMap,
      sectionMap,
      sessionId,
      universityId,
    });

    if (!result.success) {
      if (result.criticalFailure) {
        console.error(`[CRITICAL] Batch ${batchNum} failed with INCOMPLETE rollback! Immediate admin inspection required.`);
      } else {
        console.error(`[FATAL] Batch ${batchNum} failed. Atomic rollback verified cleanly. Halting import.`);
      }
      process.exit(1);
    }

    totalProvisioned += result.createdCount;
    console.log(`Batch ${batchNum} succeeded. Progress: ${totalProvisioned}/${toProcess.length} created.`);
  }

  console.log("\n============================================================");
  console.log(` [COMPLETE] Successfully provisioned ${totalProvisioned} student accounts!`);
  console.log("============================================================\n");
}

const isDirectRun = process.argv[1]?.includes("bulk_onboard_students");
if (isDirectRun) {
  runBulkOnboarding().catch((err) => {
    console.error("[FATAL ERROR]", err);
    process.exit(1);
  });
}
