import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { UNIVERSITY_DATABASE, BRANCH_NAMES_MAP } from "../src/data/extractedTimetables";

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

function normalizeSection(section?: string): string {
  if (!section) return "";
  const s = section.trim().toUpperCase().replace(/\s+/g, "");
  if (s.startsWith("SEC-")) return s;
  if (s.startsWith("SEC")) return `SEC-${s.replace(/^SEC/, "")}`;
  if (["A", "B", "C", "D", "E"].includes(s)) return `SEC-${s}`;
  return s;
}

function findTimetableForStudent(params: { branchCode?: string; section?: string; timetableId?: string }) {
  const branchCode = (params.branchCode || "").trim().toUpperCase();
  const normSec = normalizeSection(params.section);

  if (branchCode && normSec) {
    const matched = UNIVERSITY_DATABASE.timetables.find(
      (t) => t.branchCode.toUpperCase() === branchCode && t.section.toUpperCase() === normSec
    );
    if (matched) return matched;
  }

  if (params.timetableId) {
    const byId = UNIVERSITY_DATABASE.timetables.find((t) => t.id === params.timetableId);
    if (byId) {
      if (!branchCode || byId.branchCode.toUpperCase() === branchCode) {
        return byId;
      }
    }
  }

  return null;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all branches
  const { data: branches, error: bErr } = await supabase.from("branches").select("id, code, name");
  if (bErr) throw bErr;
  const branchMap = new Map<string, { code: string; name: string }>();
  branches?.forEach((b) => branchMap.set(b.id, { code: b.code, name: b.name }));

  // Fetch all sections
  const { data: sections, error: sErr } = await supabase.from("sections").select("id, section_name, default_room");
  if (sErr) throw sErr;
  const sectionMap = new Map<string, string>();
  sections?.forEach((s) => sectionMap.set(s.id, s.section_name));

  // Fetch all student profiles
  const { data: students, error: studErr } = await supabase
    .from("student_profiles")
    .select("id, roll_number, enrollment_number, full_name, role, branch_id, branch_code, section_id, section, batch")
    .neq("role", "admin");

  if (studErr) throw studErr;

  console.log(`Total students to verify: ${students?.length}`);

  let mappedCount = 0;
  let unmappedCount = 0;
  const breakdown: Record<string, { total: number; mapped: number; room: string; timetableId: string }> = {};

  for (const st of (students || [])) {
    const bCode = st.branch_code || (st.branch_id ? branchMap.get(st.branch_id)?.code : undefined) || "";
    const sec = st.section || (st.section_id ? sectionMap.get(st.section_id) : undefined) || "";
    const bName = (st.branch_id ? branchMap.get(st.branch_id)?.name : undefined) || BRANCH_NAMES_MAP[bCode] || "Engineering";

    const tt = findTimetableForStudent({ branchCode: bCode, section: sec });
    const key = `${bCode} ${sec}`;

    if (!breakdown[key]) {
      breakdown[key] = {
        total: 0,
        mapped: 0,
        room: tt?.room || "NONE",
        timetableId: tt?.id || "NONE",
      };
    }
    breakdown[key].total++;

    if (tt) {
      mappedCount++;
      breakdown[key].mapped++;
    } else {
      unmappedCount++;
      console.warn(`Unmapped student: ${st.roll_number} (${st.full_name}) - Branch: ${bCode}, Section: ${sec}`);
    }
  }

  console.log("\n--- BREAKDOWN BY BRANCH & SECTION ---");
  console.table(breakdown);
  console.log(`\nResult: Mapped: ${mappedCount}, Unmapped: ${unmappedCount}`);

  // Test Nitin Kumar specifically
  const nitin = students?.find((s) => s.roll_number === "2026041133" || s.enrollment_number === "2026ECD1044");
  if (nitin) {
    const bCode = nitin.branch_code || (nitin.branch_id ? branchMap.get(nitin.branch_id)?.code : "");
    const sec = nitin.section || (nitin.section_id ? sectionMap.get(nitin.section_id) : "");
    const tt = findTimetableForStudent({ branchCode: bCode, section: sec });
    console.log("\n--- NITIN KUMAR VERIFICATION ---");
    console.log({
      rollNumber: nitin.roll_number,
      fullName: nitin.full_name,
      branchCode: bCode,
      section: sec,
      batch: nitin.batch,
      timetableId: tt?.id,
      room: tt?.room,
      timetableBranch: tt?.branch,
      p1SlotsCount: tt?.slots.filter((s) => s.batch === "ALL" || s.batch === nitin.batch).length,
    });
  }
}

main().catch(console.error);
