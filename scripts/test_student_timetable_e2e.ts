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
  console.log("=== AttendX Branch-Wise Timetable Mapping Test Suite ===\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iczjocbishkvkkkfvalz.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch branches and sections
  const { data: branches } = await supabase.from("branches").select("id, code, name");
  const branchMap = new Map<string, { code: string; name: string }>();
  branches?.forEach((b) => branchMap.set(b.id, { code: b.code, name: b.name }));

  const { data: sections } = await supabase.from("sections").select("id, section_name, default_room");
  const sectionMap = new Map<string, string>();
  sections?.forEach((s) => sectionMap.set(s.id, s.section_name));

  // 2. Select sample students from diverse branches
  const sampleBranches = ["ECE", "IT", "CSE", "CE", "ME", "EE", "CHE"];
  const testStudents: any[] = [];

  // Specifically include Nitin Kumar
  const { data: nitinRecord } = await supabase
    .from("student_profiles")
    .select("id, roll_number, enrollment_number, full_name, branch_code, branch_id, section, section_id, batch, role")
    .or("roll_number.eq.2026041133,enrollment_number.ilike.2026ECD1044")
    .single();

  if (nitinRecord) {
    testStudents.push(nitinRecord);
  }

  for (const bCode of sampleBranches) {
    const { data: st } = await supabase
      .from("student_profiles")
      .select("id, roll_number, enrollment_number, full_name, branch_code, branch_id, section, section_id, batch, role")
      .eq("branch_code", bCode)
      .limit(1)
      .maybeSingle();

    if (st && !testStudents.some((s) => s.id === st.id)) {
      testStudents.push(st);
    }
  }

  console.log(`Found ${testStudents.length} representative students to test across branches.`);

  let allPassed = true;

  for (const student of testStudents) {
    const resolvedBranchCode = student.branch_code || (student.branch_id ? branchMap.get(student.branch_id)?.code : "") || "";
    const resolvedSection = normalizeSection(student.section || (student.section_id ? sectionMap.get(student.section_id) : "") || "");
    const resolvedBranchName = getBranchFullName(resolvedBranchCode);
    const resolvedBatch = student.batch || "P1";

    const timetable = findTimetableForStudent({
      branchCode: resolvedBranchCode,
      section: resolvedSection,
    });

    console.log(`\nTesting student: ${student.full_name} (${student.roll_number || student.enrollment_number})`);
    console.log(`  - Branch: ${resolvedBranchName} (${resolvedBranchCode})`);
    console.log(`  - Section: ${resolvedSection}`);
    console.log(`  - Practical Batch: ${resolvedBatch}`);

    if (!timetable) {
      console.error(`  FAIL: No timetable found for ${resolvedBranchCode} ${resolvedSection}`);
      allPassed = false;
      continue;
    }

    console.log(`  - Timetable ID: ${timetable.id}`);
    console.log(`  - Classroom: ${timetable.room}`);
    console.log(`  - Timetable Branch: ${timetable.branch}`);

    // Verify branch matches
    if (timetable.branchCode.toUpperCase() !== resolvedBranchCode.toUpperCase()) {
      console.error(`  FAIL: Timetable branchCode ${timetable.branchCode} does NOT match student branchCode ${resolvedBranchCode}`);
      allPassed = false;
    } else {
      console.log(`  PASS: Branch matches timetable branch (${timetable.branchCode})`);
    }

    // Verify section matches
    if (timetable.section.toUpperCase() !== resolvedSection.toUpperCase()) {
      console.error(`  FAIL: Timetable section ${timetable.section} does NOT match student section ${resolvedSection}`);
      allPassed = false;
    } else {
      console.log(`  PASS: Section matches timetable section (${timetable.section})`);
    }

    // Verify batch slot filtering
    const p1Slots = timetable.slots.filter((s) => s.batch === "ALL" || s.batch === "P1");
    const p2Slots = timetable.slots.filter((s) => s.batch === "ALL" || s.batch === "P2");
    console.log(`  - P1 Slots Count: ${p1Slots.length}, P2 Slots Count: ${p2Slots.length}`);
    if (p1Slots.length === 0 || p2Slots.length === 0) {
      console.error(`  FAIL: Practical slot filtering produced zero slots.`);
      allPassed = false;
    } else {
      console.log(`  PASS: Practical batch slot filtering verified.`);
    }

    // Specific verification for Nitin Kumar
    if (student.roll_number === "2026041133" || student.enrollment_number === "2026ECD1044") {
      if (timetable.room !== "TL-207") {
        console.error(`  FAIL: Nitin Kumar classroom is ${timetable.room}, expected TL-207!`);
        allPassed = false;
      } else {
        console.log(`  PASS: Nitin Kumar classroom is verified TL-207.`);
      }
      if (timetable.id !== "mmmut-btech-ece-b-2025") {
        console.error(`  FAIL: Nitin Kumar timetableId is ${timetable.id}, expected mmmut-btech-ece-b-2025!`);
        allPassed = false;
      } else {
        console.log(`  PASS: Nitin Kumar timetableId is verified mmmut-btech-ece-b-2025.`);
      }
    }
  }

  // 3. Test unmapped student fallback behavior (Requirement 7)
  console.log("\n--- Testing Unmapped Student Fallback (Requirement 7) ---");
  const unmappedResult = findTimetableForStudent({
    branchCode: "UNKNOWN_BRANCH",
    section: "SEC-Z",
  });
  if (unmappedResult === null) {
    console.log("PASS: findTimetableForStudent returns null for unmapped branch/section (NO IT fallback).");
  } else {
    console.error("FAIL: findTimetableForStudent returned fallback timetable:", unmappedResult.id);
    allPassed = false;
  }

  // 4. Test Stale Profile Self-Healing Simulation
  console.log("\n--- Testing Stale Profile Self-Healing ---");
  const staleProfile = {
    id: "stale-user-1",
    fullName: "NITIN KUMAR",
    email: "2026041133",
    role: "student" as const,
    degree: "B.Tech",
    branch: "Information Technology", // STALE BUG
    branchCode: "ECE",
    section: "SEC-B",
    batch: "P1",
    semester: "Semester I",
    academicSession: "2025-26",
    attendanceThreshold: 75.0,
    activeTimetableId: "mmmut-btech-it-b-2025", // STALE BUG
  };

  // Run self-healing logic
  const correctBranchName = getBranchFullName(staleProfile.branchCode);
  const correctTimetable = findTimetableForStudent({
    branchCode: staleProfile.branchCode,
    section: staleProfile.section,
    timetableId: staleProfile.activeTimetableId,
  });

  const healedProfile = {
    ...staleProfile,
    branch: correctBranchName,
    activeTimetableId: correctTimetable?.id || "",
  };

  console.log("Before Self-Healing:", {
    branch: staleProfile.branch,
    activeTimetableId: staleProfile.activeTimetableId,
  });
  console.log("After Self-Healing:", {
    branch: healedProfile.branch,
    activeTimetableId: healedProfile.activeTimetableId,
    classroom: correctTimetable?.room,
  });

  if (
    healedProfile.branch === "Electronics & Communication Engineering" &&
    healedProfile.activeTimetableId === "mmmut-btech-ece-b-2025" &&
    correctTimetable?.room === "TL-207"
  ) {
    console.log("PASS: Self-healing accurately corrected branch name to 'Electronics & Communication Engineering', timetableId to 'mmmut-btech-ece-b-2025', and classroom to 'TL-207'.");
  } else {
    console.error("FAIL: Self-healing failed to correct profile.");
    allPassed = false;
  }

  if (allPassed) {
    console.log("\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  } else {
    console.error("\nSOME CHECKS FAILED!");
    process.exit(1);
  }
}

main().catch(console.error);
