/**
 * AttendX — Vercel Environment Variables Synchronizer
 * 
 * Safely inspects and updates Vercel Production environment variables for project 'attend-x'
 * to point strictly to Supabase project 'iczjocbishkvkkkfvalz'.
 * 
 * Guarantees:
 * - Inspects all existing Vercel env vars.
 * - Updates NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.
 * - Preserves all unrelated variables (VAPID, CRON_SECRET, etc.).
 * - Never prints or logs secrets.
 * - Strictly avoids modifying database or student records.
 */

import https from "https";
import { loadLocalEnv } from "./set_admin_password";

loadLocalEnv();

export const PROJECT_NAME = "attend-x";
export const TARGET_SUPABASE_REF = "iczjocbishkvkkkfvalz";
export const OLD_SUPABASE_REF = "cmdvsqbiozqltzcphpaf";

export const TARGET_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iczjocbishkvkkkfvalz.supabase.co";
export const TARGET_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const TARGET_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export interface VercelEnvVar {
  id: string;
  key: string;
  value?: string;
  target: string[] | string;
  type: string;
  configurationId?: string | null;
  createdAt?: number;
  updatedAt?: number;
}

export function maskSecret(val?: string): string {
  if (!val) return "[EMPTY]";
  if (val.length <= 12) return "********";
  return `${val.slice(0, 7)}...${val.slice(-4)}`;
}

async function vercelFetch(endpoint: string, token: string, method = "GET", body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith("http") ? endpoint : `https://api.vercel.com${endpoint}`);
    const req = https.request(
      url,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(parsed.error?.message || `HTTP ${res.statusCode}: ${data}`));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            } else {
              resolve(data);
            }
          }
        });
      }
    );
    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

export async function syncVercelEnv(token?: string) {
  const authToken = token || process.env.VERCEL_TOKEN || process.env.VERCEL_AUTH_TOKEN;

  if (!authToken) {
    return {
      authenticated: false,
      blocker: "Vercel Authentication Token missing. Neither VERCEL_TOKEN nor VERCEL_AUTH_TOKEN is set in the environment, and Vercel CLI session is not authenticated.",
    };
  }

  // 1. Fetch existing env vars
  console.log(`Inspecting environment variables for Vercel project '${PROJECT_NAME}'...`);
  const listRes = await vercelFetch(`/v9/projects/${PROJECT_NAME}/env`, authToken);
  const existingEnvs: VercelEnvVar[] = listRes.envs || [];

  console.log(`Found ${existingEnvs.length} total environment variables configured on Vercel.`);

  // 2. Identify variables pointing to old project or needing update
  const variablesToUpdate = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      value: TARGET_SUPABASE_URL,
      type: "plain",
      targets: ["production", "preview", "development"],
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      value: TARGET_ANON_KEY,
      type: "plain",
      targets: ["production", "preview", "development"],
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      value: TARGET_SERVICE_ROLE_KEY,
      type: "sensitive",
      targets: ["production", "preview", "development"],
    },
  ];

  const updatedKeys: string[] = [];
  const oldProjectReferencesFound: string[] = [];

  for (const targetVar of variablesToUpdate) {
    const existing = existingEnvs.find((e) => e.key === targetVar.key);
    if (existing) {
      // Check if value contains old ref
      if (existing.value?.includes(OLD_SUPABASE_REF)) {
        oldProjectReferencesFound.push(existing.key);
      }

      console.log(`Updating existing variable '${targetVar.key}' on Vercel...`);
      await vercelFetch(`/v9/projects/${PROJECT_NAME}/env/${existing.id}`, authToken, "PATCH", {
        value: targetVar.value,
        target: targetVar.targets,
        type: targetVar.type,
      });
      updatedKeys.push(targetVar.key);
    } else {
      console.log(`Creating missing variable '${targetVar.key}' on Vercel...`);
      await vercelFetch(`/v10/projects/${PROJECT_NAME}/env`, authToken, "POST", {
        key: targetVar.key,
        value: targetVar.value,
        target: targetVar.targets,
        type: targetVar.type,
      });
      updatedKeys.push(targetVar.key);
    }
  }

  return {
    authenticated: true,
    updatedKeys,
    oldProjectReferencesFound,
    totalExisting: existingEnvs.length,
  };
}

if (process.argv[1]?.includes("update_vercel_env")) {
  const tokenArg = process.argv.find((a) => a.startsWith("--token="))?.split("=")[1];
  syncVercelEnv(tokenArg)
    .then((result) => {
      if (!result.authenticated) {
        console.error("\n[VERCEL AUTHENTICATION BLOCKER]");
        console.error(result.blocker);
        process.exit(2);
      } else {
        console.log("\n[SUCCESS] Vercel environment variables synchronized cleanly!");
        console.log(`Updated Variables: ${result.updatedKeys?.join(", ")}`);
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("\n[VERCEL API ERROR]", err.message);
      process.exit(1);
    });
}
