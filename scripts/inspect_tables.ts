import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./set_admin_password";

async function main() {
  loadLocalEnv();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  // Test common column names
  const testCols = [
    "id", "title", "message", "type", "student_id", "user_id", "is_read", "read",
    "created_at", "timestamp", "branch_code", "section", "target_branch_code", "target_section",
    "batch", "target_batch", "author_name", "author_role", "link"
  ];

  for (const col of testCols) {
    const { error } = await supabase.from("notifications").select(col).limit(1);
    if (!error) {
      console.log(`Column '${col}': EXISTS`);
    } else {
      // If error mentions column doesn't exist
      // console.log(`Column '${col}': NO (${error.message})`);
    }
  }
}
main();
