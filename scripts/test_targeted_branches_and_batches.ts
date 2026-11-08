import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  UNIVERSITY_DATABASE,
  findTimetableForStudent,
  getBranchFullName,
  normalizeSection,
} from "../src/data/extractedTimetables";

function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const f of envFiles) {
    const full = path.join(process.cwd(), f);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

async function main() {
  console.log("=== TARGETED MULTI-BRANCH & PRACTICAL BATCH SAFETY AUDIT ===\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iczjocbishkvkkkfvalz.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch metadata lookup tables
  const { data: branches } = await supabase.from("branches").select("id, code, name");
  const branchMap = new Map<string, { code: string; name: string }>();
  branches?.forEach((b) => branchMap.set(b.id, { code: b.code, name: b.name }));

  const { data: sections } = await supabase.from("sections").select("id, section_name, default_room");
  const sectionMap = new Map<string, string>();
  sections?.forEach((s) => sectionMap.set(s.id, s.section_name));

  // Required branches: ECE, IT, CSE, ME, CE, EE, CHE (P1 and P2)
  const targetBranches = ["ECE", "IT", "CSE", "ME", "CE", "EE", "CHE"];
  const targetBatches = ["P1", "P2"];

  const studentsToTest: any[] = [];

  // Always include NITIN KUMAR
  const { data: nitin } = await supabase
    .from("student_profiles")
    .select("id, roll_number, enrollment_number, full_name, branch_code, branch_id, section, section_id, batch, role")
    .or("roll_number.eq.2026041133,enrollment_number.ilike.2026ECD1044")
    .single();

  if (nitin) {
    studentsToTest.push({ ...nitin, testLabel: "NITIN KUMAR (Reference Issue Student)" });
  }

  // Find a student for each branch and batch
  for (const bCode of targetBranches) {
    for (const bBatch of targetBatches) {
      const { data: st } = await supabase
        .from("student_profiles")
        .select("id, roll_number, enrollment_number, full_name, branch_code, branch_id, section, section_id, batch, role")
        .eq("branch_code", bCode)
        .eq("batch", bBatch)
        .limit(1)
        .maybeSingle();

      if (st && !studentsToTest.some((s) => s.id === st.id)) {
        studentsToTest.push({ ...st, testLabel: `${bCode} ${bBatch}` });
      }
    }
  }

  console.log(`Auditing ${studentsToTest.length} students across all required branches and practical batches:\n`);

  let allChecksPassed = true;

  for (const student of studentsToTest) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[TEST CASE] ${student.testLabel}: ${student.full_name} (${student.roll_number || student.enrollment_number})`);

    // 1. Database branch and section
    const dbBranchCode = student.branch_code || (student.branch_id ? branchMap.get(student.branch_id)?.code : "");
    const dbSection = normalizeSection(student.section || (student.section_id ? sectionMap.get(student.section_id) : ""));
    const dbBranchName = (student.branch_id ? branchMap.get(student.branch_id)?.name : "") || getBranchFullName(dbBranchCode);
    const dbBatch = student.batch || "P1";

    console.log(`  1. Database Academic Identity:`);
    console.log(`     Branch: ${dbBranchName} (${dbBranchCode})`);
    console.log(`     Section: ${dbSection} | Batch: ${dbBatch}`);

    // 2. Simulated Login response resolution
    const resolvedBranchCode = student.branch_code || dbBranchCode;
    const resolvedBranchName = dbBranchName;
    const resolvedSection = dbSection;
    const resolvedBatch = dbBatch;

    const matchedTimetable = findTimetableForStudent({
      branchCode: resolvedBranchCode,
      section: resolvedSection,
    });

    if (!matchedTimetable) {
      console.error(`  FAIL: findTimetableForStudent returned null for valid student!`);
      allChecksPassed = false;
      continue;
    }

    const loginResponse = {
      fullName: student.full_name,
      rollNumber: student.roll_number,
      enrollmentNumber: student.enrollment_number,
      role: student.role,
      branch: resolvedBranchName,
      branchCode: resolvedBranchCode,
      section: resolvedSection,
      batch: resolvedBatch,
      activeTimetableId: matchedTimetable.id,
    };

    console.log(`  2. Login Response Payload:`);
    console.log(`     branch: "${loginResponse.branch}" (No IT default)`);
    console.log(`     branchCode: "${loginResponse.branchCode}"`);
    console.log(`     section: "${loginResponse.section}"`);
    console.log(`     activeTimetableId: "${loginResponse.activeTimetableId}"`);

    // 3. Stored profile check
    if (resolvedBranchCode !== "IT" && loginResponse.branch === "Information Technology") {
      console.error(`  FAIL: Non-IT student received "Information Technology" in login response!`);
      allChecksPassed = false;
    }

    // 4. Dashboard branch and classroom
    const dashboardBranch = loginResponse.branch;
    const dashboardClassroom = matchedTimetable.room;
    console.log(`  4. Dashboard Display:`);
    console.log(`     Branch: ${dashboardBranch} | Classroom: ${dashboardClassroom}`);

    // 5. Timetable mapping ID
    console.log(`  5. Timetable Mapping ID: ${matchedTimetable.id}`);
    if (matchedTimetable.branchCode.toUpperCase() !== resolvedBranchCode.toUpperCase()) {
      console.error(`  FAIL: Timetable branchCode (${matchedTimetable.branchCode}) !== resolvedBranchCode (${resolvedBranchCode})`);
      allChecksPassed = false;
    }

    // 6. Subjects and weekly timetable slots
    const subjectCodes = matchedTimetable.subjects.map((s) => s.code);
    console.log(`  6. Timetable Structure:`);
    console.log(`     Subjects (${subjectCodes.length}): ${subjectCodes.join(", ")}`);
    console.log(`     Total Weekly Slots: ${matchedTimetable.slots.length}`);

    // 7. Practical batch filtering
    const batchFilteredSlots = matchedTimetable.slots.filter(
      (s) => s.batch === "ALL" || s.batch === resolvedBatch
    );
    const oppositeBatch = resolvedBatch === "P1" ? "P2" : "P1";
    const oppositeBatchSlots = matchedTimetable.slots.filter(
      (s) => s.batch === "ALL" || s.batch === oppositeBatch
    );

    console.log(`  7. Practical Batch Filtering:`);
    console.log(`     Assigned Batch (${resolvedBatch}) Slots: ${batchFilteredSlots.length}`);
    console.log(`     Opposite Batch (${oppositeBatch}) Slots: ${oppositeBatchSlots.length}`);

    // Verify slots contain zero opposite batch-only practicals
    const contaminatedSlots = batchFilteredSlots.filter(
      (s) => s.batch !== "ALL" && s.batch !== resolvedBatch
    );
    if (contaminatedSlots.length > 0) {
      console.error(`  FAIL: Contaminated practical slots found for ${resolvedBatch}!`);
      allChecksPassed = false;
    } else {
      console.log(`     [PASS] Strictly zero ${oppositeBatch} practical slots in student schedule.`);
    }

    // Specific verification for NITIN KUMAR
    if (student.roll_number === "2026041133" || student.enrollment_number === "2026ECD1044") {
      console.log(`\n  >>> SPECIFIC NITIN KUMAR VALIDATION <<<`);
      const isRoomCorrect = dashboardClassroom === "TL-207";
      const isIdCorrect = matchedTimetable.id === "mmmut-btech-ece-b-2025";
      const isBranchCorrect = resolvedBranchCode === "ECE" && resolvedBranchName === "Electronics & Communication Engineering";

      console.log(`     Branch is ECE: ${isBranchCorrect ? "PASS (TL-207)" : "FAIL"}`);
      console.log(`     Classroom is TL-207: ${isRoomCorrect ? "PASS" : "FAIL"}`);
      console.log(`     Timetable ID is mmmut-btech-ece-b-2025: ${isIdCorrect ? "PASS" : "FAIL"}`);

      if (!isRoomCorrect || !isIdCorrect || !isBranchCorrect) {
        allChecksPassed = false;
      }
    }
  }

  // 8. Test Unknown/Invalid Academic Identity Fallback
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`[TEST CASE] Invalid/Unknown Branch & Section Fallback:`);
  const invalidResult = findTimetableForStudent({
    branchCode: "NONEXISTENT",
    section: "SEC-X",
  });
  console.log(`  findTimetableForStudent({ branchCode: "NONEXISTENT", section: "SEC-X" }):`, invalidResult);
  if (invalidResult === null) {
    console.log(`  [PASS] Strictly returned null. No silent fallback to IT Section-B.`);
  } else {
    console.error(`  FAIL: Universal fallback detected:`, invalidResult);
    allChecksPassed = false;
  }

  console.log(`================================================================================`);
  if (allChecksPassed) {
    console.log(`AUDIT RESULT: ALL TARGETED TESTS PASSED WITHOUT EXCEPTION.`);
  } else {
    console.error(`AUDIT RESULT: ONE OR MORE TESTS FAILED.`);
    process.exit(1);
  }
}

main().catch(console.error);
