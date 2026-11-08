/**
 * AttendX Server-Side Polls Authorization & Persistence Engine
 * 
 * Enforces role and section scope boundaries backed by persistent Supabase storage:
 * 1. Admins retain university-wide permissions.
 * 2. Class Admins: create/close polls only within managed branch and section.
 * 3. Students: vote only within enrolled branch and section.
 * 4. Persistence: Database-backed via Supabase (class_polls, class_poll_options, class_poll_votes).
 *    In production, never silently falls back to in-memory seed data.
 *    In test runner / offline dev environments, in-memory store is used for fast local test isolation.
 */

import { UserAccount, ClassPoll, PollOption } from "@/types";
import { isSupabaseJwt } from "@/lib/serverAuthGuard";

// Seed data used for in-memory testing and initialization
export const SEED_CLASS_POLLS: ClassPoll[] = [
  {
    id: "poll-demo-01",
    title: "Consensus on Mass Bunk for Friday P6 & P7?",
    description: "Proposed by Class Representative for cultural fest rehearsal preparation.",
    category: "MASS_BUNK",
    branchCode: "IT",
    section: "SEC-B",
    options: [
      { id: "opt-1", text: "Yes, 100% Mass Bunk", votes: 28 },
      { id: "opt-2", text: "No, Attend Classes", votes: 4 },
      { id: "opt-3", text: "Neutral / Depends on attendance", votes: 7 },
    ],
    createdBy: {
      id: "class-admin-aryan-003",
      name: "Aryan Singh (CR)",
      role: "class_admin",
    },
    votedUserIds: {},
    totalVotes: 39,
    status: "ACTIVE",
    createdAt: "2026-11-01T10:00:00.000Z",
  },
  {
    id: "poll-demo-02",
    title: "Reschedule Physics Tutorial to Saturday Morning?",
    description: "Teacher requested moving Period 4 Thursday to Saturday 10:00 AM.",
    category: "RESCHEDULE",
    branchCode: "CSE",
    section: "SEC-A",
    options: [
      { id: "opt-201", text: "Agree to Saturday 10 AM", votes: 12 },
      { id: "opt-202", text: "Keep Thursday Period 4", votes: 6 },
    ],
    createdBy: {
      id: "class-admin-aryan-003",
      name: "Aryan Singh (CR)",
      role: "class_admin",
    },
    votedUserIds: {},
    totalVotes: 18,
    status: "ACTIVE",
    createdAt: "2026-11-02T10:00:00.000Z",
  },
];

// In-memory server-side poll store for offline tests and development
export class ServerPollsStore {
  private polls: Map<string, ClassPoll> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.polls.clear();
    for (const p of SEED_CLASS_POLLS) {
      this.polls.set(p.id, JSON.parse(JSON.stringify(p)));
    }
  }

  public getAll(): ClassPoll[] {
    return Array.from(this.polls.values());
  }

  public getById(id: string): ClassPoll | undefined {
    return this.polls.get(id);
  }

  public set(poll: ClassPoll): void {
    this.polls.set(poll.id, poll);
  }

  public delete(id: string): void {
    this.polls.delete(id);
  }
}

export const serverPollsStore = new ServerPollsStore();

/**
 * Resolves the operational branch, section, batch, session and semester scope for a user based on role.
 */
export function getUserScope(user: UserAccount): {
  branchCode: string;
  section: string;
  batch?: string;
  academicSession?: string;
  semester?: string;
} {
  if (user.role === "class_admin") {
    return {
      branchCode: user.managedBranchCode || user.branchCode || "IT",
      section: user.managedSection || user.section || "SEC-B",
      batch: user.managedBatch || user.batch || "ALL",
      academicSession: user.academicSession,
      semester: user.semester,
    };
  }
  return {
    branchCode: user.branchCode || "IT",
    section: user.section || "SEC-B",
    batch: user.batch || "P1",
    academicSession: user.academicSession,
    semester: user.semester,
  };
}

/**
 * Checks whether a user has permission to view a poll.
 * - Admin: can view all polls across all classes.
 * - Class Admin & Student:
 *   - Allowed if poll is 'ALL' or matches their branch and section.
 *   - If poll targets a specific batch (e.g. P1), student's batch must match.
 *   - Academic session and semester must match if specified.
 */
export function canUserViewPoll(user: UserAccount, poll: ClassPoll): boolean {
  if (user.role === "admin") return true;

  const userScope = getUserScope(user);

  if (poll.branchCode === "ALL") return true;

  if (poll.branchCode === userScope.branchCode) {
    if (poll.section !== "ALL" && poll.section !== userScope.section) {
      return false;
    }

    if (poll.batch && poll.batch !== "ALL") {
      if (user.role === "student" && userScope.batch && poll.batch !== userScope.batch) {
        return false;
      }
      if (user.role === "class_admin" && userScope.batch && userScope.batch !== "ALL" && poll.batch !== userScope.batch) {
        return false;
      }
    }

    if (poll.academicSession && userScope.academicSession && poll.academicSession !== userScope.academicSession) {
      return false;
    }

    if (poll.semester && userScope.semester && poll.semester !== userScope.semester) {
      return false;
    }

    return true;
  }

  return false;
}

/**
 * Filters a list of polls authoritatively for a user.
 */
export function filterPollsForUser(polls: ClassPoll[], user: UserAccount): ClassPoll[] {
  return polls.filter((p) => canUserViewPoll(user, p));
}

/**
 * Checks whether a user has permission to create a poll for the target class scope.
 * - Admin: can create polls for ANY branch/section or 'ALL'.
 * - Class Admin: can create polls ONLY for their authorized managed branch and section (cannot create 'ALL').
 * - Student: cannot create polls.
 */
export function canUserCreatePoll(
  user: UserAccount,
  targetBranchCode: string,
  targetSection: string,
  targetBatch?: string
): { allowed: boolean; reason?: string } {
  if (user.role === "admin") {
    return { allowed: true };
  }

  if (user.role === "student") {
    return {
      allowed: false,
      reason: "Access Denied: Ordinary students are not permitted to create class polls.",
    };
  }

  if (user.role === "class_admin") {
    const scope = getUserScope(user);

    if (targetBranchCode === "ALL" || targetSection === "ALL") {
      return {
        allowed: false,
        reason: "Access Denied: Only university administrators may create university-wide ('ALL') polls.",
      };
    }

    if (targetBranchCode !== scope.branchCode || targetSection !== scope.section) {
      return {
        allowed: false,
        reason: `Access Denied: Class Admins may create polls only for their authorized scope (${scope.branchCode} ${scope.section}). Attempted: ${targetBranchCode} ${targetSection}.`,
      };
    }

    if (targetBatch && targetBatch !== "ALL" && scope.batch && scope.batch !== "ALL" && targetBatch !== scope.batch) {
      return {
        allowed: false,
        reason: `Access Denied: Class Admins cannot create polls outside their managed batch (${scope.batch}).`,
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Access Denied: Unrecognized role." };
}

/**
 * Checks whether a user has permission to vote in a specific poll.
 * - Poll must be ACTIVE.
 * - User must not have already voted.
 * - Admin: can vote in any poll.
 * - Class Admin: must match their authorized managed scope (or poll is 'ALL').
 * - Student: must match their enrolled class (or poll is 'ALL').
 */
export function canUserVoteInPoll(
  user: UserAccount,
  poll: ClassPoll
): { allowed: boolean; reason?: string } {
  if (poll.status === "CLOSED") {
    return { allowed: false, reason: "This poll is closed for voting." };
  }

  if (poll.votedUserIds && poll.votedUserIds[user.id]) {
    return { allowed: false, reason: "You have already cast your vote in this poll." };
  }

  if (user.role === "admin") {
    return { allowed: true };
  }

  const scope = getUserScope(user);

  if (poll.branchCode === "ALL") {
    return { allowed: true };
  }

  if (poll.branchCode !== scope.branchCode) {
    const roleDesc = user.role === "class_admin" ? "Class Admins" : "Students";
    return {
      allowed: false,
      reason: `Access Denied: ${roleDesc} cannot vote in polls outside their authorized branch (${scope.branchCode}). Target poll is for ${poll.branchCode}.`,
    };
  }

  if (poll.section !== "ALL" && poll.section !== scope.section) {
    const roleDesc = user.role === "class_admin" ? "Class Admins" : "Students";
    return {
      allowed: false,
      reason: `Access Denied: ${roleDesc} cannot vote in polls outside their authorized section (${scope.section}). Target poll is for ${poll.section}.`,
    };
  }

  if (poll.batch && poll.batch !== "ALL" && scope.batch && scope.batch !== "ALL" && poll.batch !== scope.batch) {
    return {
      allowed: false,
      reason: `Access Denied: Cannot vote in polls for another practical batch (${poll.batch}).`,
    };
  }

  if (poll.academicSession && scope.academicSession && poll.academicSession !== scope.academicSession) {
    return {
      allowed: false,
      reason: "Access Denied: Scoped to another academic session.",
    };
  }

  if (poll.semester && scope.semester && poll.semester !== scope.semester) {
    return {
      allowed: false,
      reason: "Access Denied: Scoped to another semester.",
    };
  }

  return { allowed: true };
}

/**
 * Checks whether a user has permission to close a specific poll.
 * - Student: cannot close polls.
 * - Admin: can close any poll across all classes.
 * - Class Admin: can close polls ONLY within their authorized branch and section.
 */
export function canUserClosePoll(
  user: UserAccount,
  poll: ClassPoll
): { allowed: boolean; reason?: string } {
  if (user.role === "student") {
    return {
      allowed: false,
      reason: "Access Denied: Students are not permitted to close polls.",
    };
  }

  if (user.role === "admin") {
    return { allowed: true };
  }

  if (user.role === "class_admin") {
    const scope = getUserScope(user);

    if (poll.branchCode !== scope.branchCode || (poll.section !== "ALL" && poll.section !== scope.section)) {
      return {
        allowed: false,
        reason: `Access Denied: Class Admins may close polls only within their authorized scope (${scope.branchCode} ${scope.section}). Target poll is for ${poll.branchCode} ${poll.section}.`,
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Access Denied: Unrecognized role." };
}

/**
 * Checks whether a user has permission to edit a specific poll.
 * - Student: cannot edit polls.
 * - Admin: can edit any poll across all classes.
 * - Class Admin: can edit polls ONLY within their authorized branch and section.
 */
export function canUserEditPoll(
  user: UserAccount,
  poll: ClassPoll
): { allowed: boolean; reason?: string } {
  if (user.role === "student") {
    return {
      allowed: false,
      reason: "Access Denied: Students are not permitted to edit polls.",
    };
  }

  if (user.role === "admin") {
    return { allowed: true };
  }

  if (user.role === "class_admin") {
    const scope = getUserScope(user);

    if (poll.branchCode !== scope.branchCode || (poll.section !== "ALL" && poll.section !== scope.section)) {
      return {
        allowed: false,
        reason: `Access Denied: Class Admins may edit polls only within their authorized scope (${scope.branchCode} ${scope.section}). Target poll is for ${poll.branchCode} ${poll.section}.`,
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Access Denied: Unrecognized role." };
}

/**
 * Checks whether a user has permission to delete a specific poll.
 * - Student: cannot delete polls.
 * - Admin: can delete any poll across all classes.
 * - Class Admin: can delete polls ONLY within their authorized branch and section.
 */
export function canUserDeletePoll(
  user: UserAccount,
  poll: ClassPoll
): { allowed: boolean; reason?: string } {
  if (user.role === "student") {
    return {
      allowed: false,
      reason: "Access Denied: Students are not permitted to delete polls.",
    };
  }

  if (user.role === "admin") {
    return { allowed: true };
  }

  if (user.role === "class_admin") {
    const scope = getUserScope(user);

    if (poll.branchCode !== scope.branchCode || (poll.section !== "ALL" && poll.section !== scope.section)) {
      return {
        allowed: false,
        reason: `Access Denied: Class Admins may delete polls only within their authorized scope (${scope.branchCode} ${scope.section}). Target poll is for ${poll.branchCode} ${poll.section}.`,
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Access Denied: Unrecognized role." };
}

/**
 * Returns a Supabase client configured for the call.
 * If userToken is a genuine 3-part Supabase JWT (header.payload.signature), forwards it
 * in the Authorization header so that PostgreSQL SECURITY DEFINER RPCs resolve auth.uid().
 * 
 * CRITICAL FIX: Never forwards 2-part HMAC tokens, custom profile tokens, or user IDs as Bearer tokens,
 * which causes PostgREST to reject requests with 'Expected 3 parts in JWT; got 2'.
 * When a genuine Supabase JWT is not present, uses the trusted server-side service-role key.
 */
export async function getSupabasePollsClient(userToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) return null;

  const { createClient } = await import("@supabase/supabase-js");

  // Only forward userToken if it is an authentic 3-part Supabase JWT starting with "eyJ"
  if (userToken && isSupabaseJwt(userToken)) {
    return createClient(url, anonKey || serviceKey || "", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    });
  }

  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return null;
}

/**
 * Backwards-compatible alias for Supabase service client.
 */
export async function getSupabaseAdminClient() {
  return getSupabasePollsClient();
}

/**
 * Maps Supabase raw database rows to the application ClassPoll domain interface.
 */
export function mapDatabaseRowsToClassPoll(
  rawPoll: any,
  rawOptions: any[],
  rawVotes: any[],
  creatorProfile?: any
): ClassPoll {
  const votedUserIds: Record<string, string> = {};
  const optionVoteCounts: Record<string, number> = {};

  for (const opt of rawOptions) {
    optionVoteCounts[opt.id] = 0;
  }

  for (const v of rawVotes) {
    votedUserIds[v.user_id] = v.option_id;
    if (optionVoteCounts[v.option_id] !== undefined) {
      optionVoteCounts[v.option_id]++;
    }
  }

  const options: PollOption[] = rawOptions
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((opt) => ({
      id: opt.id,
      text: opt.option_text,
      votes: optionVoteCounts[opt.id] || 0,
    }));

  return {
    id: rawPoll.id,
    title: rawPoll.title,
    description: rawPoll.description || undefined,
    category: rawPoll.category,
    branchCode: rawPoll.branch_code,
    section: rawPoll.section,
    options,
    createdBy: {
      id: rawPoll.created_by,
      name: creatorProfile?.full_name || "Faculty / Representative",
      role: (creatorProfile?.role as any) || "class_admin",
    },
    votedUserIds,
    totalVotes: rawVotes.length,
    status: rawPoll.status,
    createdAt: rawPoll.created_at,
    expiresAt: rawPoll.expires_at || undefined,
  };
}

/**
 * Server Operation: Fetch authorized polls for user
 * Authoritatively queries Supabase database; strictly rejects fallback to seed data in production.
 */
export async function serverGetPollsForUser(
  user: UserAccount,
  callOptions?: { client?: any; token?: string }
): Promise<ClassPoll[]> {
  const supabase = callOptions?.client || (await getSupabasePollsClient(callOptions?.token));

  if (supabase) {
    try {
      const { data: pollsData, error: pollsErr } = await supabase
        .from("class_polls")
        .select(`
          id,
          title,
          description,
          category,
          branch_code,
          section,
          created_by,
          status,
          created_at,
          expires_at,
          class_poll_options (id, option_text, sort_order),
          class_poll_votes (id, option_id, user_id)
        `)
        .order("created_at", { ascending: false });

      if (pollsErr) {
        throw new Error(`Failed to query class_polls: ${pollsErr.message}`);
      }

      // Query profiles for creator attribution
      const creatorIds = Array.from(new Set((pollsData || []).map((p: any) => p.created_by)));
      let profileMap = new Map();
      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("student_profiles")
          .select("user_id, full_name, role")
          .in("user_id", creatorIds);

        profileMap = new Map((profilesData || []).map((p: any) => [p.user_id, p]));
      }

      const polls: ClassPoll[] = (pollsData || []).map((p: any) => {
        return mapDatabaseRowsToClassPoll(
          p,
          p.class_poll_options || [],
          p.class_poll_votes || [],
          profileMap.get(p.created_by)
        );
      });

      return filterPollsForUser(polls, user);
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(`Database error fetching class polls: ${err.message}`);
      }
      console.warn("[DEV MODE] Database query failed, using in-memory store:", err.message);
    }
  }

  // Strict production requirement: never silently return seed data in production
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Class Polls service unavailable: Supabase credentials are not configured for production environment."
    );
  }

  // In-memory fallback exclusively for test runners and offline development
  return filterPollsForUser(serverPollsStore.getAll(), user);
}

/**
 * Server Operation: Authoritatively create a new poll in Supabase via create_class_poll_atomic RPC.
 */
export async function serverCreatePoll(
  user: UserAccount,
  data: {
    title: string;
    description?: string;
    category: "MASS_BUNK" | "RESCHEDULE" | "EXTRA_CLASS" | "GENERAL";
    branchCode: string;
    section: string;
    batch?: string;
    academicSession?: string;
    semester?: string;
    options: { text: string }[];
  },
  callOptions?: { client?: any; token?: string }
): Promise<{ success: boolean; poll?: ClassPoll; error?: string }> {
  if (!data.title || !data.title.trim()) {
    return { success: false, error: "Poll title is required." };
  }

  if (!data.options || data.options.length < 2) {
    return { success: false, error: "Poll must contain at least 2 options." };
  }

  const authCheck = canUserCreatePoll(user, data.branchCode, data.section, data.batch);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.reason };
  }

  const supabase = callOptions?.client || (await getSupabasePollsClient(callOptions?.token));

  if (supabase) {
    try {
      // Execute atomic transaction RPC function create_class_poll_atomic
      let pollId: string | null = null;
      const { data: rpcRes, error: rpcErr } = await supabase.rpc(
        "create_class_poll_atomic",
        {
          p_title: data.title.trim(),
          p_description: data.description?.trim() || null,
          p_category: data.category,
          p_branch_code: data.branchCode,
          p_section: data.section,
          p_options: data.options.map((opt) => opt.text.trim()),
        }
      );

      if (!rpcErr && rpcRes) {
        pollId = rpcRes?.poll_id || (typeof rpcRes === "string" ? rpcRes : null);
      } else if (rpcErr) {
        // If RPC failed due to missing auth.uid() in service-role mode, perform verified service-role insert
        if (rpcErr.message?.includes("Authentication required") || rpcErr.code === "42501") {
          const { data: newPollRow, error: pollInsertErr } = await supabase
            .from("class_polls")
            .insert({
              title: data.title.trim(),
              description: data.description?.trim() || null,
              category: data.category,
              branch_code: data.branchCode,
              section: data.section,
              created_by: user.id,
              status: "ACTIVE",
            })
            .select()
            .single();

          if (pollInsertErr || !newPollRow) {
            throw new Error(pollInsertErr?.message || "Failed to create class poll.");
          }

          pollId = newPollRow.id;

          const optionsPayload = data.options.map((opt, i) => ({
            poll_id: pollId,
            option_text: opt.text.trim(),
            sort_order: i,
          }));

          const { error: optionsErr } = await supabase.from("class_poll_options").insert(optionsPayload);
          if (optionsErr) {
            throw new Error(optionsErr.message || "Failed to insert poll options.");
          }
        } else {
          throw new Error(rpcErr.message || "Failed to create class poll atomically.");
        }
      }

      if (pollId) {
        const { data: pollRow, error: pollFetchErr } = await supabase
          .from("class_polls")
          .select(`
            *,
            class_poll_options (*),
            class_poll_votes (*)
          `)
          .eq("id", pollId)
          .maybeSingle();

        if (pollRow && !pollFetchErr) {
          const domainPoll = mapDatabaseRowsToClassPoll(
            pollRow,
            pollRow.class_poll_options || [],
            pollRow.class_poll_votes || [],
            { full_name: user.fullName, role: user.role }
          );
          return { success: true, poll: domainPoll };
        }
      }

      // Reconstruct domain poll if single query is unavailable
      const domainPoll: ClassPoll = {
        id: pollId || `poll-${Date.now()}`,
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        category: data.category,
        branchCode: data.branchCode,
        section: data.section,
        options: data.options.map((opt, i) => ({
          id: `opt-${pollId || Date.now()}-${i}`,
          text: opt.text.trim(),
          votes: 0,
        })),
        createdBy: {
          id: user.id,
          name: user.fullName,
          role: user.role === "admin" ? "admin" : "class_admin",
        },
        votedUserIds: {},
        totalVotes: 0,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      };

      return { success: true, poll: domainPoll };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        return { success: false, error: err.message };
      }
      console.warn("[DEV MODE] Database poll creation failed, falling back to in-memory store:", err.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Persistence unavailable: Supabase credentials are required in production.",
    };
  }

  // In-memory fallback exclusively for test runners
  const options: PollOption[] = data.options.map((opt, i) => ({
    id: `opt-${Date.now()}-${i}`,
    text: opt.text.trim(),
    votes: 0,
  }));

  const newPoll: ClassPoll = {
    id: `poll-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: data.title.trim(),
    description: data.description?.trim(),
    category: data.category,
    branchCode: data.branchCode,
    section: data.section,
    batch: data.batch || "ALL",
    options,
    createdBy: {
      id: user.id,
      name: user.fullName,
      role: user.role === "admin" ? "admin" : "class_admin",
    },
    votedUserIds: {},
    totalVotes: 0,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  serverPollsStore.set(newPoll);
  return { success: true, poll: newPoll };
}

/**
 * Server Operation: Authoritatively vote in a poll backed by Supabase via cast_poll_vote_atomic RPC.
 * Enforces atomic duplicate prevention and composite option-poll binding in PostgreSQL.
 */
export async function serverVoteInPoll(
  user: UserAccount,
  pollId: string,
  optionId: string,
  callOptions?: { client?: any; token?: string }
): Promise<{ success: boolean; poll?: ClassPoll; error?: string }> {
  const supabase = callOptions?.client || (await getSupabasePollsClient(callOptions?.token));

  if (supabase) {
    try {
      // Execute atomic transaction RPC function cast_poll_vote_atomic
      let voteSucceeded = false;
      const { data: voteRes, error: voteErr } = await supabase.rpc(
        "cast_poll_vote_atomic",
        {
          p_poll_id: pollId,
          p_option_id: optionId,
        }
      );

      if (!voteErr && voteRes?.success) {
        voteSucceeded = true;
      } else if (voteErr) {
        if (
          voteErr.code === "23505" ||
          voteErr.message?.includes("already cast your vote") ||
          voteErr.message?.includes("duplicate")
        ) {
          return {
            success: false,
            error: "You have already cast your vote in this poll.",
          };
        }
        if (voteErr.message?.includes("Access Denied")) {
          return { success: false, error: voteErr.message };
        }
        if (voteErr.message?.includes("closed for voting")) {
          return { success: false, error: "This poll is closed for voting." };
        }
        if (voteErr.message?.includes("Invalid option")) {
          return { success: false, error: "Invalid option selected for this poll." };
        }
        if (voteErr.message?.includes("Target poll not found")) {
          return { success: false, error: "Poll not found." };
        }

        // If RPC returned "Authentication required" because auth.uid() is null in service-role mode:
        if (voteErr.message?.includes("Authentication required") || voteErr.code === "42501") {
          // Pre-check for duplicate vote
          const { data: existingVote } = await supabase
            .from("class_poll_votes")
            .select("id")
            .eq("poll_id", pollId)
            .eq("user_id", user.id)
            .maybeSingle();

          if (existingVote) {
            return {
              success: false,
              error: "You have already cast your vote in this poll.",
            };
          }

          // Verify option belongs to this poll
          const { data: optRow } = await supabase
            .from("class_poll_options")
            .select("id")
            .eq("id", optionId)
            .eq("poll_id", pollId)
            .maybeSingle();

          if (!optRow) {
            return {
              success: false,
              error: "Invalid option selected for this poll.",
            };
          }

          // Insert vote (PostgreSQL unique constraint uq_class_poll_user_vote prevents race condition duplicates)
          const { error: insertVoteErr } = await supabase
            .from("class_poll_votes")
            .insert({
              poll_id: pollId,
              option_id: optionId,
              user_id: user.id,
            });

          if (insertVoteErr) {
            if (
              insertVoteErr.code === "23505" ||
              insertVoteErr.message?.includes("duplicate") ||
              insertVoteErr.message?.includes("already")
            ) {
              return {
                success: false,
                error: "You have already cast your vote in this poll.",
              };
            }
            throw new Error(insertVoteErr.message);
          }
          voteSucceeded = true;
        } else {
          throw new Error(voteErr.message);
        }
      }

      // Fetch updated poll row after atomic vote transaction
      const { data: updatedPollRow } = await supabase
        .from("class_polls")
        .select(`
          *,
          class_poll_options (*),
          class_poll_votes (*)
        `)
        .eq("id", pollId)
        .maybeSingle();

      if (updatedPollRow) {
        const domainPoll = mapDatabaseRowsToClassPoll(
          updatedPollRow,
          updatedPollRow.class_poll_options || [],
          updatedPollRow.class_poll_votes || []
        );
        return { success: true, poll: domainPoll };
      }

      return { success: true };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        return { success: false, error: err.message };
      }
      console.warn("[DEV MODE] Database voting failed, falling back to in-memory store:", err.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Persistence unavailable: Supabase credentials are required in production.",
    };
  }

  // In-memory fallback exclusively for test runners
  const poll = serverPollsStore.getById(pollId);
  if (!poll) {
    return { success: false, error: "Poll not found." };
  }

  const authCheck = canUserVoteInPoll(user, poll);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.reason };
  }

  const option = poll.options.find((o) => o.id === optionId);
  if (!option) {
    return { success: false, error: "Invalid option selected." };
  }

  option.votes += 1;
  poll.totalVotes += 1;
  if (!poll.votedUserIds) poll.votedUserIds = {};
  poll.votedUserIds[user.id] = optionId;

  serverPollsStore.set(poll);
  return { success: true, poll };
}

/**
 * Server Operation: Authoritatively close a poll backed by Supabase
 */
export async function serverClosePoll(
  user: UserAccount,
  pollId: string,
  callOptions?: { client?: any; token?: string }
): Promise<{ success: boolean; poll?: ClassPoll; error?: string }> {
  const supabase = callOptions?.client || (await getSupabasePollsClient(callOptions?.token));

  if (supabase) {
    try {
      const { data: pollRow, error: pollErr } = await supabase
        .from("class_polls")
        .select(`
          *,
          class_poll_options (*),
          class_poll_votes (*)
        `)
        .eq("id", pollId)
        .maybeSingle();

      if (pollErr || !pollRow) {
        return { success: false, error: "Poll not found." };
      }

      const domainPoll = mapDatabaseRowsToClassPoll(
        pollRow,
        pollRow.class_poll_options || [],
        pollRow.class_poll_votes || []
      );

      const authCheck = canUserClosePoll(user, domainPoll);
      if (!authCheck.allowed) {
        return { success: false, error: authCheck.reason };
      }

      const { error: updateErr } = await supabase
        .from("class_polls")
        .update({ status: "CLOSED" })
        .eq("id", pollId);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      domainPoll.status = "CLOSED";
      return { success: true, poll: domainPoll };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        return { success: false, error: err.message };
      }
      console.warn("[DEV MODE] Database close failed, falling back to in-memory store:", err.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Persistence unavailable: Supabase credentials are required in production.",
    };
  }

  // In-memory fallback exclusively for test runners
  const poll = serverPollsStore.getById(pollId);
  if (!poll) {
    return { success: false, error: "Poll not found." };
  }

  const authCheck = canUserClosePoll(user, poll);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.reason };
  }

  poll.status = "CLOSED";
  serverPollsStore.set(poll);
  return { success: true, poll };
}

/**
 * Server Operation: Authoritatively edit a poll backed by Supabase
 */
export async function serverEditPoll(
  user: UserAccount,
  pollId: string,
  data: { title?: string; description?: string; category?: any },
  callOptions?: { client?: any; token?: string }
): Promise<{ success: boolean; poll?: ClassPoll; error?: string }> {
  const supabase = callOptions?.client || (await getSupabasePollsClient(callOptions?.token));

  if (supabase) {
    try {
      const { data: pollRow, error: pollErr } = await supabase
        .from("class_polls")
        .select(`
          *,
          class_poll_options (*),
          class_poll_votes (*)
        `)
        .eq("id", pollId)
        .maybeSingle();

      if (pollErr || !pollRow) {
        return { success: false, error: "Poll not found." };
      }

      const domainPoll = mapDatabaseRowsToClassPoll(
        pollRow,
        pollRow.class_poll_options || [],
        pollRow.class_poll_votes || []
      );

      const authCheck = canUserEditPoll(user, domainPoll);
      if (!authCheck.allowed) {
        return { success: false, error: authCheck.reason };
      }

      const updatePayload: Record<string, any> = {};
      if (data.title) updatePayload.title = data.title.trim();
      if (data.description !== undefined) updatePayload.description = data.description?.trim();
      if (data.category) updatePayload.category = data.category;

      const { error: updateErr } = await supabase
        .from("class_polls")
        .update(updatePayload)
        .eq("id", pollId);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      if (data.title) domainPoll.title = data.title.trim();
      if (data.description !== undefined) domainPoll.description = data.description?.trim();
      if (data.category) domainPoll.category = data.category;

      return { success: true, poll: domainPoll };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        return { success: false, error: err.message };
      }
      console.warn("[DEV MODE] Database edit poll failed, falling back to in-memory store:", err.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Persistence unavailable: Supabase credentials are required in production.",
    };
  }

  const poll = serverPollsStore.getById(pollId);
  if (!poll) {
    return { success: false, error: "Poll not found." };
  }

  const authCheck = canUserEditPoll(user, poll);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.reason };
  }

  if (data.title) poll.title = data.title.trim();
  if (data.description !== undefined) poll.description = data.description?.trim();
  if (data.category) poll.category = data.category;

  serverPollsStore.set(poll);
  return { success: true, poll };
}

/**
 * Server Operation: Authoritatively delete a poll backed by Supabase
 */
export async function serverDeletePoll(
  user: UserAccount,
  pollId: string,
  callOptions?: { client?: any; token?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = callOptions?.client || (await getSupabasePollsClient(callOptions?.token));

  if (supabase) {
    try {
      const { data: pollRow, error: pollErr } = await supabase
        .from("class_polls")
        .select(`
          *,
          class_poll_options (*),
          class_poll_votes (*)
        `)
        .eq("id", pollId)
        .maybeSingle();

      if (pollErr || !pollRow) {
        return { success: false, error: "Poll not found." };
      }

      const domainPoll = mapDatabaseRowsToClassPoll(
        pollRow,
        pollRow.class_poll_options || [],
        pollRow.class_poll_votes || []
      );

      const authCheck = canUserDeletePoll(user, domainPoll);
      if (!authCheck.allowed) {
        return { success: false, error: authCheck.reason };
      }

      const { error: deleteErr } = await supabase
        .from("class_polls")
        .delete()
        .eq("id", pollId);

      if (deleteErr) {
        throw new Error(deleteErr.message);
      }

      return { success: true };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        return { success: false, error: err.message };
      }
      console.warn("[DEV MODE] Database delete poll failed, falling back to in-memory store:", err.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Persistence unavailable: Supabase credentials are required in production.",
    };
  }

  const poll = serverPollsStore.getById(pollId);
  if (!poll) {
    return { success: false, error: "Poll not found." };
  }

  const authCheck = canUserDeletePoll(user, poll);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.reason };
  }

  serverPollsStore.delete(pollId);
  return { success: true };
}
