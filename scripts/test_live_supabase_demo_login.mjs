import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load .env.local manually
const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", url ? url.substring(0, 30) + "..." : "missing");
console.log("Anon key present:", Boolean(anonKey));
console.log("Service key present:", Boolean(serviceKey));

const adminClient = createClient(url, serviceKey);
const authClient = createClient(url, anonKey);

async function testLogin(identifier, password) {
  console.log(`\n--- Testing login for identifier: '${identifier}' ---`);
  const trimmed = identifier.trim();

  // Step 1: Look up student profile by roll number, enrollment number, or email
  const { data: matchedProfile, error: profErr } = await adminClient
    .from("student_profiles")
    .select("*, branches:branch_id (code, name, degree), sections:section_id (section_name, default_room)")
    .or(`roll_number.eq.${trimmed},enrollment_number.ilike.${trimmed},email.ilike.${trimmed}`)
    .maybeSingle();

  if (profErr) {
    console.error("Profile lookup error:", profErr);
    return false;
  }

  console.log("Profile found in DB:", matchedProfile ? {
    id: matchedProfile.id,
    name: matchedProfile.full_name,
    email: matchedProfile.email,
    roll: matchedProfile.roll_number,
    branch_code: matchedProfile.branch_code,
    section: matchedProfile.section,
    role: matchedProfile.role,
    is_active: matchedProfile.is_active,
    status: matchedProfile.status,
  } : "NOT FOUND");

  const targetEmail =
    matchedProfile?.email ||
    (trimmed.includes("@") ? trimmed : `student.${trimmed.toLowerCase()}@attendx.mmmut.ac.in`);

  console.log("Target email sent to Supabase Auth:", targetEmail);

  // Step 2: Supabase Auth sign in
  const { data: authResult, error: authErr } = await authClient.auth.signInWithPassword({
    email: targetEmail,
    password: password,
  });

  if (authErr) {
    console.error("Supabase Auth sign-in failed:", authErr.message);
    return false;
  }

  console.log("Supabase Auth sign-in SUCCESS!");
  console.log("Authenticated User ID:", authResult.user?.id);
  console.log("User email:", authResult.user?.email);
  console.log("Session access_token length:", authResult.session?.access_token?.length);
  return true;
}

async function run() {
  const rollSuccess = await testLogin("DEMO2026", "Demo@AttendX2026");
  const emailSuccess = await testLogin("demo.student@attendx.app", "Demo@AttendX2026");

  console.log("\n==============================================");
  console.log("Result summary:");
  console.log("Roll Number (DEMO2026) login:", rollSuccess ? "SUCCESS" : "FAILED");
  console.log("Email (demo.student@attendx.app) login:", emailSuccess ? "SUCCESS" : "FAILED");
  console.log("==============================================");

  if (!rollSuccess || !emailSuccess) process.exit(1);
}

run();
