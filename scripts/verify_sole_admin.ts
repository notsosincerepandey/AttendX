import { createClient } from "@supabase/supabase-js";
import { fetchAllAuthUsers } from "./migrate_supabase_auth";
import { loadLocalEnv, validateProductionProjectRef, REQUIRED_PRODUCTION_PROJECT_REF } from "./set_admin_password";

const PRESERVED_ADMIN_EMAIL = "admin@mmmut.ac.in";
const PRESERVED_ADMIN_UUID = "c70936b3-ffe8-4baa-908d-f92fbd62ca9a";

async function verify() {
  console.log("=== Verifying Production Auth State & Sole Admin Account ===");

  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  validateProductionProjectRef(supabaseUrl, REQUIRED_PRODUCTION_PROJECT_REF);

  const supabase = createClient(supabaseUrl!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Check Auth Users
  const authUsers = await fetchAllAuthUsers(supabase.auth.admin, 100);
  console.log(`Auth Users Count: ${authUsers.length}`);

  if (authUsers.length !== 1) {
    throw new Error(`[FAIL] Expected exactly 1 user, found ${authUsers.length}`);
  }

  const user = authUsers[0];
  console.log(`Remaining User: Email=${user.email}, UUID=${user.id}`);

  if (user.id !== PRESERVED_ADMIN_UUID) {
    throw new Error(`[FAIL] UUID is ${user.id}, expected ${PRESERVED_ADMIN_UUID}`);
  }

  if (user.email?.toLowerCase() !== PRESERVED_ADMIN_EMAIL.toLowerCase()) {
    throw new Error(`[FAIL] Email is ${user.email}, expected ${PRESERVED_ADMIN_EMAIL}`);
  }

  // 2. Check student_profiles
  const { data: profiles, error: profErr } = await supabase
    .from("student_profiles")
    .select("*");

  if (profErr) {
    throw new Error(`[FAIL] Error querying student_profiles: ${profErr.message}`);
  }

  console.log(`student_profiles count: ${profiles.length}`);
  if (profiles.length !== 1) {
    throw new Error(`[FAIL] Expected exactly 1 profile, found ${profiles.length}`);
  }

  const prof = profiles[0];
  console.log(`Remaining Profile: FullName=${prof.full_name}, Email=${prof.email}, Role=${prof.role}, UserID=${prof.user_id}`);

  if (prof.user_id !== PRESERVED_ADMIN_UUID) {
    throw new Error(`[FAIL] Profile user_id is ${prof.user_id}, expected ${PRESERVED_ADMIN_UUID}`);
  }

  if (prof.role !== "admin") {
    throw new Error(`[FAIL] Profile role is ${prof.role}, expected 'admin'`);
  }

  console.log("\n[PASS] All verification checks PASSED: Exactly 1 ADMIN account remains in production.");
}

verify().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
