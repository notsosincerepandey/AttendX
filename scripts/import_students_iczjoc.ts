/**
 * AttendX Student Bulk Importer
 * 
 * Target Supabase Project: iczjocbishkvkkkfvalz (AttendX-Test)
 * Source Data: D:\AttendX\BTech_Student_Data_Session_2026-27.xlsx (17 Worksheets)
 * 
 * Requirements:
 * 1. Inspect all 17 worksheets and map student records to bulk onboarding schema.
 * 2. Validate roll numbers, branch, section, and batch.
 * 3. Import all valid student records into iczjocbishkvkkkfvalz.
 * 4. Create student authentication accounts with GoTrue admin.
 * 5. Default password: student@2026.
 * 6. Role: student.
 * 7. Preserve existing accounts without overwriting or duplicate roll numbers.
 * 8. Mandatory first-login password change enforced.
 * 9. Strictly target iczjocbishkvkkkfvalz; forbid cmdvsqbiozqltzcphpaf.
 * 10. Report total imported, skipped, rejected, and failed records.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

export const TARGET_PROJECT_REF = "iczjocbishkvkkkfvalz";
export const FORBIDDEN_PROJECT_REF = "cmdvsqbiozqltzcphpaf";

export const TARGET_PROJECT_URL = "https://iczjocbishkvkkkfvalz.supabase.co";
export const TARGET_SERVICE_ROLE_KEY = "REDACTED_SUPABASE_SERVICE_ROLE_KEY";

export const DEFAULT_STUDENT_PASSWORD = "student@2026";
export const DEFAULT_ACADEMIC_SESSION = "2026-27";
export const DEFAULT_SEMESTER = "Semester I";

export const VALID_BRANCHES = new Set(["CE", "CSE", "EE", "ECE", "ECE(IOT)", "ME", "CHE", "IT"]);
export const VALID_BATCHES = new Set(["P1", "P2"]);

export interface StudentRecord {
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

export interface ValidationResult {
  valid: StudentRecord[];
  rejected: { record: any; reason: string }[];
}

export interface ImportStats {
  totalExcelRecords: number;
  validRecords: number;
  rejectedRecords: number;
  skippedRecords: number;
  importedRecords: number;
  failedRecords: number;
  rejectedDetails: { roll: string; reason: string }[];
  failedDetails: { roll: string; error: string }[];
}

/**
 * Loads and validates manifest records against domain constraints
 */
export function validateStudentManifest(rawRecords: any[]): ValidationResult {
  const valid: StudentRecord[] = [];
  const rejected: { record: any; reason: string }[] = [];
  const seenRolls = new Set<string>();
  const seenEnrollments = new Set<string>();

  for (const raw of rawRecords) {
    const roll = String(raw.roll_no || "").trim();
    const enroll = String(raw.enrollment_no || "").trim();
    const name = String(raw.full_name || "").trim();
    const father = String(raw.father_name || "").trim();
    const branch = String(raw.branch_code || "").trim();
    const section = String(raw.section || "").trim();
    const batch = String(raw.batch || "").trim() as "P1" | "P2";
    const session = String(raw.academic_session || "").trim() || DEFAULT_ACADEMIC_SESSION;
    const semester = String(raw.semester || "").trim() || DEFAULT_SEMESTER;
    const alias = `student.${roll}@attendx.mmmut.ac.in`.toLowerCase();

    // Validation checks
    if (!roll || !/^\d{8,15}$/.test(roll)) {
      rejected.push({ record: raw, reason: `Invalid roll number format: '${roll}'` });
      continue;
    }
    if (seenRolls.has(roll)) {
      rejected.push({ record: raw, reason: `Duplicate roll number in input: '${roll}'` });
      continue;
    }
    if (!enroll) {
      rejected.push({ record: raw, reason: `Missing enrollment number for roll '${roll}'` });
      continue;
    }
    if (seenEnrollments.has(enroll)) {
      rejected.push({ record: raw, reason: `Duplicate enrollment number in input: '${enroll}'` });
      continue;
    }
    if (!name) {
      rejected.push({ record: raw, reason: `Missing full name for roll '${roll}'` });
      continue;
    }
    if (!father) {
      rejected.push({ record: raw, reason: `Missing father's name for roll '${roll}'` });
      continue;
    }
    if (!VALID_BRANCHES.has(branch)) {
      rejected.push({ record: raw, reason: `Invalid branch '${branch}' for roll '${roll}'` });
      continue;
    }
    if (!section.startsWith("SEC-")) {
      rejected.push({ record: raw, reason: `Invalid section '${section}' for roll '${roll}'` });
      continue;
    }
    if (!VALID_BATCHES.has(batch)) {
      rejected.push({ record: raw, reason: `Invalid batch '${batch}' for roll '${roll}'` });
      continue;
    }

    seenRolls.add(roll);
    seenEnrollments.add(enroll);

    valid.push({
      roll_no: roll,
      enrollment_no: enroll,
      full_name: name,
      father_name: father,
      branch_code: branch,
      section,
      raw_tp: String(raw.raw_tp || "").trim(),
      batch,
      academic_session: session,
      semester,
      internal_alias: alias,
      role: "student",
    });
  }

  return { valid, rejected };
}

/**
 * Paginates all auth users from Supabase GoTrue
 */
async function fetchAllAuthUsers(authAdmin: any): Promise<any[]> {
  const allUsers: any[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await authAdmin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list auth users page ${page}: ${error.message}`);
    }
    const users = data?.users || [];
    allUsers.push(...users);
    if (users.length < perPage) break;
    page++;
  }

  return allUsers;
}

/**
 * Executes the student import workflow
 */
export async function executeStudentImport(): Promise<ImportStats> {
  console.log("==================================================================");
  console.log("       ATTENDX STUDENT BULK ONBOARDING & SUPABASE IMPORT          ");
  console.log("==================================================================");
  console.log(`Target Project:     ${TARGET_PROJECT_REF} (AttendX-Test)`);
  console.log(`Target Endpoint:    ${TARGET_PROJECT_URL}`);
  console.log(`Default Password:   ${DEFAULT_STUDENT_PASSWORD}`);
  console.log(`Mandatory Change:   YES (requires_password_change = true)`);
  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log("MODE:               DRY-RUN (Simulating without database mutations)");
  } else {
    console.log("MODE:               LIVE EXECUTION");
  }
  console.log("------------------------------------------------------------------");

  // 1. Strict Target Verification
  if (!TARGET_PROJECT_URL.includes(TARGET_PROJECT_REF)) {
    throw new Error(`[FATAL] Target project URL does not contain required project ${TARGET_PROJECT_REF}`);
  }
  if (TARGET_PROJECT_URL.includes(FORBIDDEN_PROJECT_REF)) {
    throw new Error(`[FATAL] TARGET VIOLATION: URL points to forbidden project ${FORBIDDEN_PROJECT_REF}`);
  }

  const supabase = createClient(TARGET_PROJECT_URL, TARGET_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2. Extract and load manifest from all 17 worksheets of the Excel workbook
  console.log("Extracting fresh student data from D:\\AttendX\\BTech_Student_Data_Session_2026-27.xlsx...");
  try {
    execSync("python scripts/generate_import_manifest.py", { stdio: "inherit" });
  } catch (pyErr: any) {
    console.warn(`[WARNING] Failed to run python generator directly: ${pyErr.message}. Falling back to cached manifest.`);
  }

  const manifestPath = path.resolve(process.cwd(), "scripts/student_manifest_1189.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`[FATAL] Manifest file missing at ${manifestPath}`);
  }
  const rawRecords = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  console.log(`Loaded ${rawRecords.length} records across all 17 worksheets.`);

  // 3. Validate student records
  const { valid, rejected } = validateStudentManifest(rawRecords);
  console.log(`Validation completed: ${valid.length} valid records, ${rejected.length} rejected records.`);

  // 4. Fetch reference mappings from Supabase
  console.log("Fetching reference tables from target database...");
  const { data: dbBranches, error: bErr } = await supabase.from("branches").select("id, code");
  if (bErr || !dbBranches) throw new Error(`Failed to query branches: ${bErr?.message}`);

  const { data: dbSections, error: sErr } = await supabase.from("sections").select("id, section_name, branch_id");
  if (sErr || !dbSections) throw new Error(`Failed to query sections: ${sErr?.message}`);

  const { data: dbSessions, error: sessErr } = await supabase.from("academic_sessions").select("id, session_name");
  if (sessErr || !dbSessions) throw new Error(`Failed to query academic_sessions: ${sessErr?.message}`);

  const { data: dbUniversities, error: uErr } = await supabase.from("universities").select("id, short_name");
  if (uErr || !dbUniversities) throw new Error(`Failed to query universities: ${uErr?.message}`);

  const branchMap = new Map<string, string>();
  dbBranches.forEach((b: any) => branchMap.set(b.code, b.id));

  const sectionMap = new Map<string, string>();
  dbSections.forEach((s: any) => {
    const bCode = dbBranches.find((b: any) => b.id === s.branch_id)?.code;
    if (bCode) sectionMap.set(`${bCode}_${s.section_name}`, s.id);
  });

  const sessionId = dbSessions.find((s: any) => s.session_name === DEFAULT_ACADEMIC_SESSION)?.id;
  const universityId = dbUniversities.find((u: any) => u.short_name === "MMMUT")?.id;

  console.log(`Reference maps loaded: ${branchMap.size} branches, ${sectionMap.size} sections, session=${sessionId ? 'OK' : 'MISSING'}.`);

  // 5. Fetch existing users to guarantee preservation
  console.log("Fetching existing auth users and student profiles...");
  const existingAuthUsers = await fetchAllAuthUsers(supabase.auth.admin);
  const existingEmails = new Set(existingAuthUsers.map((u: any) => u.email?.trim().toLowerCase()));

  const { data: existingProfiles, error: pErr } = await supabase
    .from("student_profiles")
    .select("id, email, roll_number, enrollment_number");
  if (pErr) throw new Error(`Failed to query student_profiles: ${pErr.message}`);

  const existingProfileRolls = new Set((existingProfiles || []).map((p: any) => p.roll_number).filter(Boolean));
  const existingProfileEmails = new Set((existingProfiles || []).map((p: any) => p.email?.trim().toLowerCase()).filter(Boolean));

  console.log(`Found ${existingAuthUsers.length} existing auth accounts and ${(existingProfiles || []).length} existing profiles.`);

  // 6. Partition valid records into skipped (already existing) vs to-import
  const toImport: StudentRecord[] = [];
  let skippedCount = 0;

  for (const student of valid) {
    const emailLower = student.internal_alias.toLowerCase();
    const isAlreadyAuth = existingEmails.has(emailLower);
    const isAlreadyProfileRoll = existingProfileRolls.has(student.roll_no);
    const isAlreadyProfileEmail = existingProfileEmails.has(emailLower);

    if (isAlreadyAuth || isAlreadyProfileRoll || isAlreadyProfileEmail) {
      skippedCount++;
    } else {
      toImport.push(student);
    }
  }

  console.log(`Skipped existing accounts: ${skippedCount}`);
  console.log(`New student accounts to provision: ${toImport.length}`);

  // 7. Process import in controlled concurrent batches
  const stats: ImportStats = {
    totalExcelRecords: rawRecords.length,
    validRecords: valid.length,
    rejectedRecords: rejected.length,
    skippedRecords: skippedCount,
    importedRecords: 0,
    failedRecords: 0,
    rejectedDetails: rejected.map((r) => ({ roll: r.record?.roll_no || "unknown", reason: r.reason })),
    failedDetails: [],
  };

  const CONCURRENCY = 6;
  let currentIndex = 0;
  const startTime = Date.now();

  async function processStudent(student: StudentRecord): Promise<void> {
    const branchId = branchMap.get(student.branch_code);
    const secKey = `${student.branch_code}_${student.section}`;
    const sectionId = sectionMap.get(secKey);

    if (!branchId || !sectionId) {
      stats.failedRecords++;
      stats.failedDetails.push({
        roll: student.roll_no,
        error: `Missing DB foreign key: branchId=${branchId}, sectionId=${sectionId} for ${student.branch_code} ${student.section}`,
      });
      return;
    }

    if (isDryRun) {
      stats.importedRecords++;
      return;
    }

    let createdUserId: string | null = null;
    try {
      // Step A: Create Auth User
      let authUser: any = null;
      let lastAuthErr: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
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

        if (!authErr && authData?.user) {
          authUser = authData.user;
          break;
        }

        lastAuthErr = authErr;
        // Exponential backoff if rate limited
        await new Promise((res) => setTimeout(res, attempt * 500));
      }

      if (!authUser) {
        throw new Error(`Auth account creation failed after 3 attempts: ${lastAuthErr?.message}`);
      }

      createdUserId = authUser.id;

      // Step B: Insert into student_profiles
      const profileData: Record<string, any> = {
        id: createdUserId,
        user_id: createdUserId,
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
        semester: student.semester,
        academic_session: student.academic_session,
        academic_session_id: sessionId,
        university_id: universityId,
        attendance_threshold: 75.0,
        is_active: true,
        status: "ACTIVE",
        password_change_consumed: false,
        requires_password_change: true,
      };

      let profileInserted = false;
      let lastProfileErr: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        const { error: profileErr } = await supabase.from("student_profiles").insert(profileData);
        if (!profileErr) {
          profileInserted = true;
          break;
        }
        lastProfileErr = profileErr;
        await new Promise((res) => setTimeout(res, attempt * 300));
      }

      if (!profileInserted) {
        // Rollback created auth user
        if (createdUserId) {
          await supabase.auth.admin.deleteUser(createdUserId);
        }
        throw new Error(`Profile insert failed after 3 attempts: ${lastProfileErr?.message}`);
      }

      stats.importedRecords++;
    } catch (err: any) {
      stats.failedRecords++;
      stats.failedDetails.push({ roll: student.roll_no, error: err.message });
      console.error(`[IMPORT ERROR] Roll ${student.roll_no}: ${err.message}`);
    }
  }

  // Worker pool for concurrency
  async function worker(workerId: number): Promise<void> {
    while (true) {
      const idx = currentIndex++;
      if (idx >= toImport.length) break;

      const student = toImport[idx];
      await processStudent(student);

      const processedCount = stats.importedRecords + stats.failedRecords;
      if (processedCount % 50 === 0 || processedCount === toImport.length) {
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        const percent = ((processedCount / toImport.length) * 100).toFixed(1);
        console.log(`[PROGRESS] ${processedCount}/${toImport.length} (${percent}%) | Imported: ${stats.importedRecords} | Failed: ${stats.failedRecords} | Time: ${elapsedSec}s`);
      }
    }
  }

  console.log(`\nLaunching worker pool with ${CONCURRENCY} concurrent workers...`);
  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nImport execution finished in ${durationSec}s.`);

  // 8. Post-import verification & audit
  console.log("\nRunning post-import database verification...");
  const finalAuthUsers = await fetchAllAuthUsers(supabase.auth.admin);
  const { data: finalProfiles } = await supabase
    .from("student_profiles")
    .select("id, email, roll_number, role, branch_code, section, batch, requires_password_change, password_change_consumed");

  console.log("==================================================================");
  console.log("                   IMPORT SUMMARY REPORT                          ");
  console.log("==================================================================");
  console.log(`Total Excel Records:      ${stats.totalExcelRecords}`);
  console.log(`Valid Student Records:    ${stats.validRecords}`);
  console.log(`Rejected Records:         ${stats.rejectedRecords}`);
  console.log(`Skipped Records:          ${stats.skippedRecords}`);
  console.log(`Imported Successfully:    ${stats.importedRecords}`);
  console.log(`Failed Records:           ${stats.failedRecords}`);
  console.log("------------------------------------------------------------------");
  console.log(`Target Supabase Auth Users:       ${finalAuthUsers.length}`);
  console.log(`Target Supabase Student Profiles: ${(finalProfiles || []).length}`);
  console.log("==================================================================\n");

  return stats;
}

// CLI Execution
if (process.argv[1]?.includes("import_students_iczjoc")) {
  executeStudentImport()
    .then((stats) => {
      if (stats.failedRecords > 0) {
        console.error(`Import finished with ${stats.failedRecords} failures.`);
        process.exit(1);
      } else {
        console.log("Import completed successfully with 0 failures!");
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("[FATAL ERROR DURING IMPORT]", err);
      process.exit(1);
    });
}
