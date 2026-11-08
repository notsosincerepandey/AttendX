/**
 * Focused Unit Tests for migrate_supabase_auth.ts Auth Pagination & Duplicate Detection
 * Tests fetchAllAuthUsers and duplicate detection entirely in-memory with zero network or database calls.
 */
import { fetchAllAuthUsers, AuthUserLike, SupabaseAdminAuthClientLike } from "./migrate_supabase_auth";

async function runPaginationTests() {
  console.log("=== Testing migrate_supabase_auth Pagination & Multi-Page Resolution ===\n");
  let passed = 0;
  let failed = 0;

  function report(name: string, ok: boolean, details?: string) {
    if (ok) {
      console.log(`[PASS] ${name}${details ? " - " + details : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}${details ? " - " + details : ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Empty first page
  // -------------------------------------------------------------
  const mockEmptyClient: SupabaseAdminAuthClientLike = {
    listUsers: async ({ page, perPage }) => {
      return { data: { users: [] }, error: null };
    },
  };
  const emptyRes = await fetchAllAuthUsers(mockEmptyClient, 100);
  report("1. Empty first page returns empty array without looping", Array.isArray(emptyRes) && emptyRes.length === 0);

  // -------------------------------------------------------------
  // Test 2: Exactly 100 users on page 1, followed by empty page 2
  // -------------------------------------------------------------
  let pageRequestsT2: number[] = [];
  const mock100ExactClient: SupabaseAdminAuthClientLike = {
    listUsers: async ({ page, perPage }) => {
      pageRequestsT2.push(page);
      if (page === 1) {
        const users: AuthUserLike[] = Array.from({ length: 100 }, (_, i) => ({
          id: `user_p1_${i}`,
          email: `p1_user_${i}@test.local`,
        }));
        return { data: { users }, error: null };
      }
      return { data: { users: [] }, error: null }; // Page 2 empty
    },
  };
  const resT2 = await fetchAllAuthUsers(mock100ExactClient, 100);
  report(
    "2. Exactly 100 users on page 1 followed by empty page 2 fetches both pages cleanly",
    resT2.length === 100 && pageRequestsT2.length === 2 && pageRequestsT2[0] === 1 && pageRequestsT2[1] === 2
  );

  // -------------------------------------------------------------
  // Test 3: Existing target account on page 2 (Page 1 has 100, Page 2 has 50)
  // -------------------------------------------------------------
  const targetEmail = "admin@mmmut.ac.in";
  const mockTargetOnPage2Client: SupabaseAdminAuthClientLike = {
    listUsers: async ({ page }) => {
      if (page === 1) {
        const users = Array.from({ length: 100 }, (_, i) => ({
          id: `p1_${i}`,
          email: `other_${i}@test.local`,
        }));
        return { data: { users }, error: null };
      }
      if (page === 2) {
        const users = Array.from({ length: 49 }, (_, i) => ({
          id: `p2_${i}`,
          email: `other_p2_${i}@test.local`,
        }));
        // Target account is 50th user on page 2
        users.push({ id: "admin_uuid_target_page2", email: targetEmail });
        return { data: { users }, error: null };
      }
      return { data: { users: [] }, error: null };
    },
  };
  const resT3 = await fetchAllAuthUsers(mockTargetOnPage2Client, 100);
  const matchedT3 = resT3.filter((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
  report(
    "3. Target account located on page 2 is discovered across pages",
    resT3.length === 150 && matchedT3.length === 1 && matchedT3[0].id === "admin_uuid_target_page2"
  );

  // -------------------------------------------------------------
  // Test 4: Existing target account on final partial page (Page 3 of 3)
  // -------------------------------------------------------------
  const mockTargetOnFinalPartialPageClient: SupabaseAdminAuthClientLike = {
    listUsers: async ({ page }) => {
      if (page === 1 || page === 2) {
        return {
          data: {
            users: Array.from({ length: 100 }, (_, i) => ({ id: `u_p${page}_${i}`, email: `user_p${page}_${i}@test.local` })),
          },
          error: null,
        };
      }
      if (page === 3) {
        // Final partial page (30 users)
        const users = Array.from({ length: 29 }, (_, i) => ({ id: `u_p3_${i}`, email: `user_p3_${i}@test.local` }));
        users.push({ id: "cr_it_final_page_uuid", email: "cr.it@mmmut.ac.in" });
        return { data: { users }, error: null };
      }
      return { data: { users: [] }, error: null };
    },
  };
  const resT4 = await fetchAllAuthUsers(mockTargetOnFinalPartialPageClient, 100);
  const matchedT4 = resT4.filter((u) => u.email?.toLowerCase() === "cr.it@mmmut.ac.in");
  report(
    "4. Target account on final partial page (Page 3) discovered cleanly",
    resT4.length === 230 && matchedT4.length === 1 && matchedT4[0].id === "cr_it_final_page_uuid"
  );

  // -------------------------------------------------------------
  // Test 5: Duplicate target emails across different pages (Page 1 and Page 2)
  // -------------------------------------------------------------
  const mockDuplicateAcrossPagesClient: SupabaseAdminAuthClientLike = {
    listUsers: async ({ page }) => {
      if (page === 1) {
        const users = Array.from({ length: 99 }, (_, i) => ({ id: `u_p1_${i}`, email: `user_${i}@test.local` }));
        users.push({ id: "dup_uuid_1", email: "student@mmmut.ac.in" }); // Match 1 on page 1
        return { data: { users }, error: null };
      }
      if (page === 2) {
        const users = Array.from({ length: 49 }, (_, i) => ({ id: `u_p2_${i}`, email: `user_p2_${i}@test.local` }));
        users.push({ id: "dup_uuid_2", email: "student@mmmut.ac.in" }); // Duplicate on page 2!
        return { data: { users }, error: null };
      }
      return { data: { users: [] }, error: null };
    },
  };
  const resT5 = await fetchAllAuthUsers(mockDuplicateAcrossPagesClient, 100);
  const matchedT5 = resT5.filter((u) => u.email?.toLowerCase() === "student@mmmut.ac.in");
  const isAmbiguous = matchedT5.length > 1;
  report(
    "5. Duplicate target emails across different pages are captured and flagged as ambiguous (matched length > 1)",
    resT5.length === 150 && isAmbiguous && matchedT5.length === 2
  );

  // -------------------------------------------------------------
  // Test 6: API error on later page (Page 2 fails)
  // -------------------------------------------------------------
  let errorCaught = false;
  let errorMessage = "";
  const mockErrorOnPage2Client: SupabaseAdminAuthClientLike = {
    listUsers: async ({ page }) => {
      if (page === 1) {
        return {
          data: { users: Array.from({ length: 100 }, (_, i) => ({ id: `u_${i}`, email: `u_${i}@test.local` })) },
          error: null,
        };
      }
      return { data: null, error: { message: "Internal Auth Gateway Timeout 504" } };
    },
  };
  try {
    await fetchAllAuthUsers(mockErrorOnPage2Client, 100);
  } catch (err: any) {
    errorCaught = true;
    errorMessage = err.message;
  }
  report(
    "6. API error on later page aborts provisioning entirely (never returns incomplete list)",
    errorCaught && errorMessage.includes("Internal Auth Gateway Timeout 504") && errorMessage.includes("page 2")
  );

  // -------------------------------------------------------------
  // Test 7: Infinite loop safeguard (exceeding MAX_PAGES)
  // -------------------------------------------------------------
  let loopSafeguardTriggered = false;
  const mockEndlessClient: SupabaseAdminAuthClientLike = {
    listUsers: async ({ page }) => {
      return {
        data: { users: Array.from({ length: 100 }, (_, i) => ({ id: `inf_${page}_${i}` })) },
        error: null,
      };
    },
  };
  try {
    // Set maxPages = 5 for test speed
    await fetchAllAuthUsers(mockEndlessClient, 100, 5);
  } catch (err: any) {
    loopSafeguardTriggered = true;
  }
  report("7. Pagination safely halts with error if safety limit of pages is exceeded", loopSafeguardTriggered);

  console.log(`\n=== Pagination Suite Completed: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) process.exit(1);
}

runPaginationTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
