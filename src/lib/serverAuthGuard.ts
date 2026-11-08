import { NextRequest, NextResponse } from "next/server";
import { UserAccount, UserRole } from "@/types";

/**
 * Verifies whether a token is a genuine 3-part Supabase JWT (header.payload.signature).
 * Never confuses a 2-part HMAC session token, user ID UUID, or custom profile token with a Supabase JWT.
 */
export function isSupabaseJwt(token?: string | null): token is string {
  if (!token || typeof token !== "string") return false;
  const trimmed = token.trim();
  const parts = trimmed.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0) && trimmed.startsWith("eyJ");
}

export interface VerifiedSession {
  authenticated: boolean;
  user: UserAccount | null;
  error?: string;
  statusCode?: number;
}

/**
 * Authoritatively verifies the Supabase Auth session token from the Authorization header.
 * Never trusts client-supplied roles, IDs, or localStorage data.
 */
export async function verifyServerSession(req: NextRequest): Promise<VerifiedSession> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authenticated: false,
      user: null,
      error: "Missing or malformed Authorization header. Bearer token required.",
      statusCode: 401,
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return {
      authenticated: false,
      user: null,
      error: "Empty bearer token.",
      statusCode: 401,
    };
  }

  // In production mode, strictly require Supabase Auth credentials and prohibit local fallback
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    return {
      authenticated: false,
      user: null,
      error:
        "Authentication service unavailable: Supabase Auth credentials not configured for production environment.",
      statusCode: 503,
    };
  }

  // 1. Authoritative verification via Supabase Auth
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Check if token is an HMAC server session token or standard Supabase JWT
      const isHmacToken = token.includes(".") && token.split(".").length === 2;
      let authUser: any = null;
      let userEmail = "";
      let appMetaRole: UserRole | null = null;
      let hmacUser: UserAccount | null = null;

      if (isHmacToken) {
        const { authenticateTokenOffline } = await import("@/lib/serverAuth");
        const hmacResult = authenticateTokenOffline(token);
        if (!hmacResult.success || !hmacResult.user) {
          return {
            authenticated: false,
            user: null,
            error: "Invalid, expired, or tampered session token.",
            statusCode: 401,
          };
        }
        hmacUser = hmacResult.user;
        userEmail = hmacUser.email;
        appMetaRole = hmacUser.role;
        authUser = {
          id: hmacUser.id,
          email: hmacUser.email,
          user_metadata: { full_name: hmacUser.fullName },
          app_metadata: {
            role: hmacUser.role,
            roll_number: hmacUser.rollNumber,
            requires_password_change: hmacUser.requiresPasswordChange,
            password_change_consumed: hmacUser.passwordChangeConsumed,
          },
        };
      } else {
        // Verify JWT against Supabase Auth service
        const { data: authData, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !authData?.user) {
          // Check if token is a valid offline session token fallback before rejecting
          const { authenticateTokenOffline } = await import("@/lib/serverAuth");
          const fallbackCheck = authenticateTokenOffline(token);
          if (fallbackCheck.success && fallbackCheck.user) {
            hmacUser = fallbackCheck.user;
            userEmail = hmacUser.email;
            appMetaRole = hmacUser.role;
            authUser = {
              id: hmacUser.id,
              email: hmacUser.email,
              user_metadata: { full_name: hmacUser.fullName },
              app_metadata: {
                role: hmacUser.role,
                roll_number: hmacUser.rollNumber,
                requires_password_change: hmacUser.requiresPasswordChange,
                password_change_consumed: hmacUser.passwordChangeConsumed,
              },
            };
          } else {
            return {
              authenticated: false,
              user: null,
              error: "Invalid, expired, or revoked Supabase Auth session token.",
              statusCode: 401,
            };
          }
        } else {
          authUser = authData.user;
          userEmail = authUser.email || "";
          appMetaRole = (authUser.app_metadata?.role as UserRole) || null;
        }
      }

      // Query linked student profile with relational lookup
      let profile: any = null;
      try {
        const { data, error } = await supabase
          .from("student_profiles")
          .select(`
            *,
            branches:branch_id (code, name),
            sections:section_id (section_name)
          `)
          .eq("user_id", authUser.id)
          .maybeSingle();

        if (error) {
          const { data: flatData } = await supabase
            .from("student_profiles")
            .select("*")
            .eq("user_id", authUser.id)
            .maybeSingle();
          profile = flatData;
        } else {
          profile = data;
        }
      } catch {
        const { data: flatData } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("user_id", authUser.id)
          .maybeSingle();
        profile = flatData;
      }

      const authoritativeRole: UserRole =
        appMetaRole || (profile?.role as UserRole) || "student";

      // Authoritative human-readable branch code and section
      let resolvedBranchCode = profile?.managed_branch_code || (profile?.branches as any)?.code || profile?.branch_code;
      let resolvedBranchName = (profile?.branches as any)?.name || profile?.branch_name;
      let resolvedSection = profile?.managed_section || (profile?.sections as any)?.section_name || profile?.section;

      // Ensure section_id UUID is never substituted for human-readable section name
      if (profile?.branch_id && (!resolvedBranchCode || !resolvedBranchName)) {
        try {
          const { data: bData } = await supabase
            .from("branches")
            .select("code, name")
            .eq("id", profile.branch_id)
            .maybeSingle();
          if (bData) {
            resolvedBranchCode = resolvedBranchCode || bData.code;
            resolvedBranchName = resolvedBranchName || bData.name;
          }
        } catch {
          // Ignore lookup error
        }
      }

      if (profile?.section_id && !resolvedSection) {
        try {
          const { data: sData } = await supabase
            .from("sections")
            .select("section_name")
            .eq("id", profile.section_id)
            .maybeSingle();
          if (sData) {
            resolvedSection = resolvedSection || sData.section_name;
          }
        } catch {
          // Ignore lookup error
        }
      }

      resolvedBranchCode = resolvedBranchCode || "IT";
      resolvedBranchName = resolvedBranchName || "Engineering";
      resolvedSection = resolvedSection || "SEC-B";

      const verifiedUser: UserAccount = {
        id: authUser.id,
        fullName: profile?.full_name || authUser.user_metadata?.full_name || "User",
        email: userEmail,
        role: authoritativeRole,
        degree: "B.Tech",
        branch: resolvedBranchName,
        branchCode: resolvedBranchCode,
        section: resolvedSection,
        batch: profile?.batch || "P1",
        semester: profile?.semester || "Semester I",
        academicSession: profile?.academic_session || "2025-26",
        academicSessionId: profile?.academic_session_id,
        universityId: profile?.university_id,
        attendanceThreshold: Number(profile?.attendance_threshold) || 75.0,
        activeTimetableId: `mmmut-btech-${resolvedBranchCode.toLowerCase()}-${resolvedSection.toLowerCase().replace(/[^a-z0-9]/g, "")}-2025`,
        managedBranchCode: profile?.managed_branch_code || (authoritativeRole === "class_admin" ? resolvedBranchCode : undefined),
        managedSection: profile?.managed_section || (authoritativeRole === "class_admin" ? resolvedSection : undefined),
        managedBatch: profile?.managed_batch || (authoritativeRole === "class_admin" ? (profile?.batch || "ALL") : undefined),
      };

      return {
        authenticated: true,
        user: verifiedUser,
      };
    } catch (err: any) {
      console.error("Supabase Auth verification failure:", err);
      return {
        authenticated: false,
        user: null,
        error: "Internal error verifying Supabase Auth credentials.",
        statusCode: 500,
      };
    }
  }

  // 2. Standalone Server fallback verification (e.g. testing / local development before Supabase URL is plugged)
  // Re-validates through serverAuth database
  const { authenticateTokenOffline } = await import("@/lib/serverAuth");
  const offlineCheck = authenticateTokenOffline(token);
  if (offlineCheck.success && offlineCheck.user) {
    return {
      authenticated: true,
      user: offlineCheck.user,
    };
  }

  return {
    authenticated: false,
    user: null,
    error: "Unauthorized: Invalid session token.",
    statusCode: 401,
  };
}

/**
 * Enforces that the request has a valid authenticated session.
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ user: UserAccount; token?: string } | NextResponse> {
  const session = await verifyServerSession(req);
  if (!session.authenticated || !session.user) {
    return NextResponse.json(
      { success: false, error: session.error || "Authentication required." },
      { status: session.statusCode || 401 }
    );
  }
  const authHeader = req.headers.get("authorization");
  const rawToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : undefined;
  // Strictly enforce requirement: Never forward internal two-part AttendX token as a Supabase JWT
  const token = isSupabaseJwt(rawToken) ? rawToken : undefined;
  return { user: session.user, token };
}

/**
 * Enforces server-side Role-Based Access Control (RBAC).
 * Ordinary students cannot bypass this by tampering with client storage or parameters.
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[]
): Promise<{ user: UserAccount } | NextResponse> {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult.user;
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      {
        success: false,
        error: `Access Denied: Action requires one of [${allowedRoles.join(
          ", "
        )}] role. Your role is '${user.role}'.`,
      },
      { status: 403 }
    );
  }

  return { user };
}

/**
 * Strictly restricts execution to verified application administrators.
 */
export async function requireAdmin(
  req: NextRequest
): Promise<{ user: UserAccount } | NextResponse> {
  return requireRole(req, ["admin"]);
}

/**
 * Restricts execution to Class CRs (scoped to their university, branch, section, academic session and batch) or full Administrators.
 */
export async function requireClassAdmin(
  req: NextRequest,
  targetBranch?: string,
  targetSection?: string,
  targetBatch?: string,
  targetSession?: string,
  targetSessionId?: string,
  targetUniversityId?: string
): Promise<{ user: UserAccount } | NextResponse> {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult.user;
  if (user.role === "admin") {
    return { user };
  }

  if (user.role === "class_admin") {
    if (targetUniversityId && user.universityId && user.universityId !== targetUniversityId) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Scoped to another university." },
        { status: 403 }
      );
    }
    if (targetBranch && user.managedBranchCode && user.managedBranchCode !== targetBranch) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Scoped to another academic branch." },
        { status: 403 }
      );
    }
    if (targetSection && user.managedSection && user.managedSection !== targetSection) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Scoped to another academic section." },
        { status: 403 }
      );
    }
    if (
      targetBatch &&
      targetBatch !== "ALL" &&
      user.managedBatch &&
      user.managedBatch !== "ALL" &&
      user.managedBatch !== targetBatch
    ) {
      return NextResponse.json(
        { success: false, error: `Access Denied: Scoped to practical batch ${user.managedBatch}, not ${targetBatch}.` },
        { status: 403 }
      );
    }
    if (targetSessionId) {
      if (!targetSessionId || targetSessionId === "NULL") {
        return NextResponse.json(
          { success: false, error: "Access Denied: Valid academic session ID is required." },
          { status: 403 }
        );
      }
      if (!user.academicSessionId || user.academicSessionId !== targetSessionId) {
        return NextResponse.json(
          { success: false, error: "Access Denied: Scoped to another academic session." },
          { status: 403 }
        );
      }
    }
    if (targetSession && user.academicSession && user.academicSession !== targetSession) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Scoped to another academic session." },
        { status: 403 }
      );
    }
    return { user };
  }

  return NextResponse.json(
    { success: false, error: "Access Denied: Class CR or Administrator privileges required." },
    { status: 403 }
  );
}
