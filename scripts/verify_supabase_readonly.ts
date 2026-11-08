/**
 * Read-Only Supabase Connectivity & Security Verification
 * NEVER prints, logs, or exposes secret values.
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

async function verifyReadOnly() {
  console.log("=== Read-Only Supabase Connectivity Verification ===");

  let publicInitPass = false;
  let adminInitPass = false;
  let connectivityPass = false;
  let keyCompatPass = false;
  let secretExposurePass = false;
  let errorDetail = "";

  // 1. Read environment variables securely
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.log("Result: .env.local not found");
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  let url = "";
  let anonKey = "";
  let serviceKey = "";

  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = match[2] || "";
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      val = val.trim();

      if (key === "NEXT_PUBLIC_SUPABASE_URL") url = val;
      if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY") anonKey = val;
      if (key === "SUPABASE_SERVICE_ROLE_KEY") serviceKey = val;
    }
  });

  // Check presence
  if (!url || !anonKey || !serviceKey) {
    errorDetail = "One or more required Supabase environment variables are missing or empty.";
    printReport(publicInitPass, adminInitPass, connectivityPass, keyCompatPass, secretExposurePass, errorDetail);
    return;
  }

  // 2. Key format compatibility check
  const isUrlValid = url.startsWith("https://") && url.includes(".supabase.co");
  const isAnonValid = anonKey.length > 20;
  const isServiceValid = serviceKey.length > 20;

  if (isUrlValid && isAnonValid && isServiceValid) {
    keyCompatPass = true;
  } else {
    errorDetail = "URL or key format is invalid. URL must start with https:// and keys must be non-empty valid tokens.";
  }

  // 3. Public client initialization
  let publicClient: any = null;
  try {
    publicClient = createClient(url, anonKey);
    if (publicClient && publicClient.auth) {
      publicInitPass = true;
    }
  } catch (err: any) {
    errorDetail = "Public client initialization failed: " + (err?.message || "Unknown error");
  }

  // 4. Server admin client initialization
  let adminClient: any = null;
  try {
    adminClient = createClient(url, serviceKey);
    if (adminClient && adminClient.auth && adminClient.auth.admin) {
      adminInitPass = true;
    }
  } catch (err: any) {
    errorDetail = "Admin client initialization failed: " + (err?.message || "Unknown error");
  }

  // 5. Read-only connectivity check
  if (adminClient) {
    try {
      // Safe read-only probe: querying auth user list (limit 1)
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) {
        errorDetail = "Supabase Auth API responded with error: " + error.message;
      } else {
        connectivityPass = true;
      }
    } catch (err: any) {
      errorDetail = "Network connection to Supabase failed: " + (err?.message || "Check internet connection / URL");
    }
  }

  // 6. Secret key exposure check
  // Verify that SUPABASE_SERVICE_ROLE_KEY is never imported or used in client code
  try {
    const srcDir = path.resolve(process.cwd(), "src");
    let exposedInClient = false;

    function scanDir(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const isClientComponent = content.includes('"use client"') || content.includes("'use client'");
          if (isClientComponent && content.includes("SUPABASE_SERVICE_ROLE_KEY")) {
            exposedInClient = true;
          }
          if (content.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")) {
            exposedInClient = true;
          }
        }
      }
    }

    scanDir(srcDir);
    secretExposurePass = !exposedInClient;
    if (exposedInClient) {
      errorDetail = "SUPABASE_SERVICE_ROLE_KEY was detected in client-side components!";
    }
  } catch (err: any) {
    secretExposurePass = false;
    errorDetail = "Error verifying client bundle exposure: " + err.message;
  }

  printReport(publicInitPass, adminInitPass, connectivityPass, keyCompatPass, secretExposurePass, errorDetail);
}

function printReport(
  pub: boolean,
  adm: boolean,
  conn: boolean,
  compat: boolean,
  exp: boolean,
  err: string
) {
  console.log("\n--- VERIFICATION METRICS ---");
  console.log(`Public client initialization: ${pub ? "PASS" : "FAIL"}`);
  console.log(`Server admin client initialization: ${adm ? "PASS" : "FAIL"}`);
  console.log(`Supabase connectivity: ${conn ? "PASS" : "FAIL"}`);
  console.log(`Key format compatibility: ${compat ? "PASS" : "FAIL"}`);
  console.log(`Secret key exposure check: ${exp ? "PASS" : "FAIL"}`);
  if (err) {
    console.log(`\nDiagnostic note: ${err}`);
  }
}

verifyReadOnly().catch((err) => {
  console.error("Verification execution error:", err.message);
  process.exit(1);
});
