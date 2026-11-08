/**
 * Unit Test Suite for migrate_supabase_auth.ts Project Guard Validation
 * Tests strict URL validation, error handling, protocol checking, credential rejection,
 * and project reference confirmation entirely in-memory with zero network or database calls.
 */
import { validateSupabaseTargetProject } from "./migrate_supabase_auth";

interface TestCase {
  name: string;
  url: string | undefined;
  ref: string | undefined;
  shouldPass: boolean;
  expectedRef?: string;
  expectedErrorSubstring?: string;
}

const testCases: TestCase[] = [
  {
    name: "Valid HTTPS URL with exact matching project ref",
    url: "https://iczjocbishkvkkkfvalz.supabase.co",
    ref: "iczjocbishkvkkkfvalz",
    shouldPass: true,
    expectedRef: "iczjocbishkvkkkfvalz",
  },
  {
    name: "Valid HTTPS URL with trailing slash and matching ref",
    url: "https://iczjocbishkvkkkfvalz.supabase.co/",
    ref: "iczjocbishkvkkkfvalz",
    shouldPass: true,
    expectedRef: "iczjocbishkvkkkfvalz",
  },
  {
    name: "Valid project ref with whitespace in environment variable (trimmed)",
    url: "https://iczjocbishkvkkkfvalz.supabase.co",
    ref: "  iczjocbishkvkkkfvalz  ",
    shouldPass: true,
    expectedRef: "iczjocbishkvkkkfvalz",
  },
  {
    name: "Rejects missing/undefined URL",
    url: undefined,
    ref: "iczjocbishkvkkkfvalz",
    shouldPass: false,
    expectedErrorSubstring: "NEXT_PUBLIC_SUPABASE_URL is missing or empty",
  },
  {
    name: "Rejects malformed unparseable URL",
    url: "not-a-valid-url",
    ref: "iczjocbishkvkkkfvalz",
    shouldPass: false,
    expectedErrorSubstring: "not a valid URL",
  },
  {
    name: "Rejects non-HTTPS protocol (HTTP)",
    url: "http://iczjocbishkvkkkfvalz.supabase.co",
    ref: "iczjocbishkvkkkfvalz",
    shouldPass: false,
    expectedErrorSubstring: "must strictly use HTTPS",
  },
  {
    name: "Rejects credentials embedded in URL",
    url: "https://user:pass@iczjocbishkvkkkfvalz.supabase.co",
    ref: "iczjocbishkvkkkfvalz",
    shouldPass: false,
    expectedErrorSubstring: "contains embedded credentials",
  },
  {
    name: "Rejects non-standard port",
    url: "https://iczjocbishkvkkkfvalz.supabase.co:8443",
    ref: "iczjocbishkvkkkfvalz",
    shouldPass: false,
    expectedErrorSubstring: "Non-standard port",
  },
  {
    name: "Rejects unexpected path",
    url: "https://iczjocbishkvkkkfvalz.supabase.co/rest/v1/auth",
    ref: "iczjocbishkvkkkfvalz",
    shouldPass: false,
    expectedErrorSubstring: "Unexpected pathname",
  },
  {
    name: "Rejects query parameters",
    url: "https://iczjocbishkvkkkfvalz.supabase.co/?apikey=test",
    ref: "iczjocbishkvkkkfvalz",
    shouldPass: false,
    expectedErrorSubstring: "Query parameters or fragments",
  },
  {
    name: "Rejects URL fragment / hash",
    url: "https://iczjocbishkvkkkfvalz.supabase.co/#token",
    ref: "iczjocbishkvkkkfvalz",
    shouldPass: false,
    expectedErrorSubstring: "Query parameters or fragments",
  },
  {
    name: "Rejects wrong domain/hostname",
    url: "https://iczjocbishkvkkkfvalz.othercloud.co",
    ref: "iczjocbishkvkkkfvalz",
    shouldPass: false,
    expectedErrorSubstring: "Invalid Supabase hostname",
  },
  {
    name: "Rejects malformed project reference in hostname",
    url: "https://invalid@ref.supabase.co",
    ref: "invalid@ref",
    shouldPass: false,
    expectedErrorSubstring: "contains embedded credentials",
  },
  {
    name: "Rejects missing ATTENDX_TARGET_PROJECT_REF",
    url: "https://iczjocbishkvkkkfvalz.supabase.co",
    ref: undefined,
    shouldPass: false,
    expectedErrorSubstring: "ATTENDX_TARGET_PROJECT_REF environment variable is missing",
  },
  {
    name: "Rejects empty ATTENDX_TARGET_PROJECT_REF",
    url: "https://iczjocbishkvkkkfvalz.supabase.co",
    ref: "   ",
    shouldPass: false,
    expectedErrorSubstring: "ATTENDX_TARGET_PROJECT_REF environment variable is missing",
  },
  {
    name: "Rejects project reference shorter than 20 characters in URL",
    url: "https://iczjocbishkvkkkfval.supabase.co", // 19 chars
    ref: "iczjocbishkvkkkfval",
    shouldPass: false,
    expectedErrorSubstring: "Expected exactly 20 lowercase alphanumeric characters",
  },
  {
    name: "Rejects project reference longer than 20 characters in URL",
    url: "https://iczjocbishkvkkkfvalzz.supabase.co", // 21 chars
    ref: "iczjocbishkvkkkfvalzz",
    shouldPass: false,
    expectedErrorSubstring: "Expected exactly 20 lowercase alphanumeric characters",
  },
  {
    name: "Rejects uppercase project reference in URL",
    url: "https://ICZJOCBISHKVKKKFVALZ.supabase.co",
    ref: "iczjocbishkvkkkfvalz",
    shouldPass: false,
    expectedErrorSubstring: "must be strictly lowercase",
  },
  {
    name: "Rejects project reference with hyphens in URL",
    url: "https://iczjocbish-kvkkkfval.supabase.co",
    ref: "iczjocbish-kvkkkfval",
    shouldPass: false,
    expectedErrorSubstring: "Expected exactly 20 lowercase alphanumeric characters",
  },
  {
    name: "Rejects ATTENDX_TARGET_PROJECT_REF shorter than 20 characters",
    url: "https://iczjocbishkvkkkfvalz.supabase.co",
    ref: "short_ref",
    shouldPass: false,
    expectedErrorSubstring: "Expected exactly 20 lowercase alphanumeric characters",
  },
  {
    name: "Rejects ATTENDX_TARGET_PROJECT_REF with uppercase letters",
    url: "https://iczjocbishkvkkkfvalz.supabase.co",
    ref: "ICZJOCBISHKVKKKFVALZ",
    shouldPass: false,
    expectedErrorSubstring: "Expected exactly 20 lowercase alphanumeric characters",
  },
  {
    name: "Rejects mismatched project reference (valid 20 chars but different)",
    url: "https://iczjocbishkvkkkfvalz.supabase.co",
    ref: "aaaaaaaaaaaaaaaaaaaa",
    shouldPass: false,
    expectedErrorSubstring: "Supabase project reference mismatch",
  },
];

console.log("=== Testing migrate_supabase_auth Project Guard Validation ===\n");
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  try {
    const res = validateSupabaseTargetProject(tc.url, tc.ref);
    if (tc.shouldPass) {
      if (tc.expectedRef && res.projectRef !== tc.expectedRef) {
        console.error(`[FAIL] ${tc.name}: Expected projectRef '${tc.expectedRef}', got '${res.projectRef}'`);
        failed++;
      } else {
        console.log(`[PASS] ${tc.name}`);
        passed++;
      }
    } else {
      console.error(`[FAIL] ${tc.name}: Expected error but succeeded with '${res.projectRef}'`);
      failed++;
    }
  } catch (err: any) {
    if (!tc.shouldPass) {
      if (tc.expectedErrorSubstring && !err.message.includes(tc.expectedErrorSubstring)) {
        console.error(`[FAIL] ${tc.name}: Error '${err.message}' did not contain '${tc.expectedErrorSubstring}'`);
        failed++;
      } else {
        console.log(`[PASS] ${tc.name}`);
        passed++;
      }
    } else {
      console.error(`[FAIL] ${tc.name}: Unexpected error thrown: ${err.message}`);
      failed++;
    }
  }
}

console.log(`\n=== Project Guard Validation Suite: ${passed} Passed, ${failed} Failed ===`);
if (failed > 0) process.exit(1);
