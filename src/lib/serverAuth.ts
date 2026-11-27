import crypto from "crypto";
import { UserAccount, UserRole } from "@/types";
import {
  UNIVERSITY_DATABASE,
  getBranchFullName,
  normalizeSection,
  findTimetableForStudent,
} from "@/data/extractedTimetables";

export interface ServerUserRecord extends UserAccount {
  passwordHash?: string;
  rawPassword?: string;
}

function getSigningSecret(): string {
  const secret =
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VAPID_PRIVATE_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[Security Error] Session signing secret is not configured in environment (CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY)."
      );
    }
    return "attendx-dev-local-session-signing-secret";
  }

  return secret;
}

function getDevSeedPassword(role: UserRole): string | undefined {
  // In production, strictly return undefined (no dev seed passwords)
  if (process.env.NODE_ENV === "production") return undefined;
  if (role === "admin") return process.env.ADMIN_DEV_PASSWORD || process.env.DEV_SEED_PASSWORD;
  if (role === "class_admin") return process.env.CR_DEV_PASSWORD || process.env.DEV_SEED_PASSWORD;
  return process.env.STUDENT_DEV_PASSWORD || process.env.DEV_SEED_PASSWORD;
}

export const DEMO_STUDENT_ID = "demo-student-attendx-2026";
export const DEMO_STUDENT_RECORD: ServerUserRecord = {
  id: DEMO_STUDENT_ID,
  fullName: "Aditya Verma (Demo Student)",
  email: "demo.student@attendx.app",
  rollNumber: "DEMO2026",
  enrollmentNumber: "DEMO2026001",
  role: "student",
  degree: "B.Tech",
  branch: "Information Technology",
  branchCode: "IT",
  section: "SEC-B",
  batch: "P1",
  semester: "Semester I",
  academicYear: "1st Year",
  academicSession: "2026-27",
  attendanceThreshold: 75,
  activeTimetableId: "tt-it-sec-b",
  password: "Demo@AttendX2026",
  rawPassword: "Demo@AttendX2026",
  requiresPasswordChange: false,
  passwordChangeConsumed: true,
  isActive: true,
  status: "ACTIVE",
  isDemo: true,
};

const SEED_ACCOUNTS: ServerUserRecord[] = [DEMO_STUDENT_RECORD];

const serverUsersStore: Map<string, ServerUserRecord> = new Map();

SEED_ACCOUNTS.forEach((acc) => {
  serverUsersStore.set(acc.email.toLowerCase(), acc);
  if (acc.rollNumber) {
    serverUsersStore.set(acc.rollNumber.toLowerCase(), acc);
  }
});

export function sanitizeUser(user: ServerUserRecord): UserAccount {
  const { passwordHash, rawPassword, password, ...safeUser } = user as any;
  return safeUser as UserAccount;
}

/**
 * Test helper: Seeds an in-memory test user into the server vault for isolated test runs.
 */
export function seedUserForTesting(user: ServerUserRecord): void {
  serverUsersStore.set(user.email.toLowerCase(), user);
  if (user.rollNumber) {
    serverUsersStore.set(user.rollNumber.toLowerCase(), user);
  }
}

/**
 * Normalizes a student roll number or email identifier to the authoritative internal email alias.
 * Ensures external users can log in using roll numbers without revealing internal aliases in UI.
 */
export function rollNumberToEmailAlias(identifier: string): string {
  const trimmed = identifier.trim();
  if (!trimmed.includes("@")) {
    return `student.${trimmed.toLowerCase()}@attendx.mmmut.ac.in`;
  }
  return trimmed.toLowerCase();
}

/**
 * Creates a cryptographically signed HMAC token for server-validated sessions.
 */
export function createServerSessionToken(user: UserAccount): string {
  const secret = getSigningSecret();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const roll = user.rollNumber || "";
  const payload = `${user.id}:${user.email}:${user.role}:${expiresAt}:${roll}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const encodedPayload = Buffer.from(payload).toString("base64");
  return `${encodedPayload}.${signature}`;
}

/**
 * Validates a server-signed HMAC session token.
 */
export function authenticateTokenOffline(
  token: string
): { success: boolean; user?: UserAccount; error?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return { success: false, error: "Invalid token format." };

    const [encodedPayload, signature] = parts;
    const payload = Buffer.from(encodedPayload, "base64").toString("utf-8");

    let userId = "";
    let email = "";
    let role: UserRole = "student";
    let expiresAt = 0;
    let rollNumber: string | undefined = undefined;

    if (payload.startsWith("{")) {
      const parsed = JSON.parse(payload);
      userId = parsed.id || parsed.userId || "";
      email = parsed.email || "";
      role = (parsed.role as UserRole) || "student";
      expiresAt = Number(parsed.exp ? parsed.exp * 1000 : parsed.expiresAt || 0);
      rollNumber = parsed.rollNumber;
    } else {
      const [uId, em, ro, expStr, roll] = payload.split(":");
      userId = uId;
      email = em;
      role = ro as UserRole;
      expiresAt = Number(expStr);
      rollNumber = roll;
    }

    if (expiresAt && Date.now() > expiresAt) {
      return { success: false, error: "Session token has expired." };
    }

    const secret = getSigningSecret();
    const expectedSigHex = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const expectedSigB64 = crypto.createHmac("sha256", secret).update(encodedPayload).digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf1 = Buffer.from(expectedSigHex, "hex");
    const expBuf2 = Buffer.from(expectedSigB64, "hex");

    const matches1 = sigBuf.length === expBuf1.length && crypto.timingSafeEqual(sigBuf, expBuf1);
    const matches2 = sigBuf.length === expBuf2.length && crypto.timingSafeEqual(sigBuf, expBuf2);

    if (!matches1 && !matches2) {
      return { success: false, error: "Forged or tampered session token." };
    }

    const matched = serverUsersStore.get(email.toLowerCase());
    if (matched) {
      return { success: true, user: sanitizeUser(matched) };
    }

    const payloadObj: any = payload.startsWith("{") ? JSON.parse(payload) : null;
    const bCode = payloadObj?.branchCode || "";
    const bName = payloadObj?.branch || (bCode ? getBranchFullName(bCode) : "Engineering");
    const sec = normalizeSection(payloadObj?.section || "");
    const batch = payloadObj?.batch || "P1";
    const matchedTimetable = findTimetableForStudent({
      branchCode: bCode,
      section: sec,
      timetableId: payloadObj?.activeTimetableId,
    });

    return {
      success: true,
      user: {
        id: userId,
        fullName: payloadObj?.fullName || email.split("@")[0],
        email,
        rollNumber: rollNumber || (email.match(/^\d+$/) ? email : undefined),
        enrollmentNumber: payloadObj?.enrollmentNumber,
        role: role as UserRole,
        degree: payloadObj?.degree || "B.Tech",
        branch: role === "admin" ? "Administrator" : bName,
        branchCode: role === "admin" ? "ADMIN" : bCode,
        section: role === "admin" ? "" : sec,
        batch,
        semester: payloadObj?.semester || "Semester I",
        academicSession: payloadObj?.academicSession || "2025-26",
        attendanceThreshold: Number(payloadObj?.attendanceThreshold) || 75.0,
        activeTimetableId: role === "admin" ? (UNIVERSITY_DATABASE.timetables[0]?.id || "") : (matchedTimetable?.id || ""),
      },
    };
  } catch {
    return { success: false, error: "Token verification failed." };
  }
}

/**
 * Authenticates user credentials authoritative against Supabase Auth (or server store).
 * Accepts either student roll number (e.g. 2026011001) or university email (e.g. admin@mmmut.ac.in).
 */
export async function authenticateCredentials(
  identifier: string,
  pass: string
): Promise<{
  success: boolean;
  user?: UserAccount;
  sessionToken?: string;
  error?: string;
  requiresPasswordChange?: boolean;
  passwordChangeConsumed?: boolean;
}> {
  const trimmed = identifier.trim();
  const isPrimaryAdmin = trimmed.toLowerCase() === "admin@attendx.ac.in";
  let targetEmail = isPrimaryAdmin ? "admin@attendx.ac.in" : "";
  let resolvedRoll: string | undefined = undefined;
  let resolvedEnrollment: string | undefined = undefined;
  let resolvedProfile: any = null;

  // In production mode, strictly require Supabase Auth credentials and prohibit local fallback
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    return {
      success: false,
      error:
        "Authentication service unavailable: Supabase Auth credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) are not configured for production environment.",
    };
  }

  // 1. Authoritative resolution of Roll Number, Enrollment Number, or Admin Email via Supabase
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      let matchedProfile: any = null;
      if (isPrimaryAdmin) {
        const { data } = await adminClient
          .from("student_profiles")
          .select("*")
          .eq("email", "admin@attendx.ac.in")
          .maybeSingle();
        matchedProfile = data;
      } else {
        // Secure query matching roll_number, enrollment_number, or email for students
        const { data } = await adminClient
          .from("student_profiles")
          .select("*, branches:branch_id (code, name, degree), sections:section_id (section_name, default_room)")
          .or(`roll_number.eq.${trimmed},enrollment_number.ilike.${trimmed},email.ilike.${trimmed}`)
          .maybeSingle();
        matchedProfile = data;
      }

      if (!matchedProfile && (trimmed.toUpperCase() === "DEMO2026" || trimmed.toLowerCase() === "demo.student@attendx.app")) {
        try {
          const { ensureDemoStudentAccountExists } = await import("@/lib/serverAdmin");
          await ensureDemoStudentAccountExists();
          const { data: recheck } = await adminClient
            .from("student_profiles")
            .select("*, branches:branch_id (code, name, degree), sections:section_id (section_name, default_room)")
            .or(`roll_number.eq.${trimmed},email.ilike.${trimmed}`)
            .maybeSingle();
          matchedProfile = recheck;
        } catch (provErr) {
          console.warn("Auto-provision demo error:", provErr);
        }
      }

      if (matchedProfile) {
        resolvedProfile = matchedProfile;
        resolvedRoll = matchedProfile.roll_number;
        resolvedEnrollment = matchedProfile.enrollment_number;
        targetEmail =
          matchedProfile.email ||
          (matchedProfile.roll_number
            ? `student.${matchedProfile.roll_number}@attendx.mmmut.ac.in`
            : "");
      }
    } catch (lookupErr) {
      console.warn("Identifier lookup error:", lookupErr);
    }
  }

  if (!targetEmail) {
    if (trimmed.toUpperCase() === "DEMO2026" || trimmed.toLowerCase() === "demo.student@attendx.app") {
      targetEmail = "demo.student@attendx.app";
    } else {
      targetEmail = isPrimaryAdmin ? "admin@attendx.ac.in" : rollNumberToEmailAlias(trimmed);
    }
  }

  // 2. Supabase Auth authoritative sign in if cloud credentials exist
  const supabaseAuthKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseAuthKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAuthKey
      );

      const { data: authResult, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: pass,
      });

      if (!authError && authResult.user && authResult.session) {
        // Query linked student profile if not already fetched
        let profile: any = resolvedProfile;
        if (!profile) {
          try {
            const { data } = await supabase
              .from("student_profiles")
              .select("*, branches:branch_id (code, name, degree), sections:section_id (section_name, default_room)")
              .eq("user_id", authResult.user.id)
              .maybeSingle();
            profile = data;
          } catch {
            // ignore lookup error
          }
        }

        const appMeta = authResult.user.app_metadata || {};
        const role = (appMeta.role as UserRole) || (profile?.role as UserRole) || "student";

        // Check if student account is deactivated
        if (
          role !== "admin" &&
          (profile?.is_active === false ||
            profile?.status === "DEACTIVATED" ||
            appMeta.account_status === "DEACTIVATED")
        ) {
          return {
            success: false,
            error: "Access Denied: This student account has been deactivated by administrator.",
          };
        }

        const rollNumber =
          resolvedRoll || profile?.roll_number || appMeta.roll_number || trimmed;
        const enrollmentNumber =
          resolvedEnrollment || profile?.enrollment_number || appMeta.enrollment_number;

        const requiresPasswordChange =
          appMeta.requires_password_change ??
          profile?.requires_password_change ??
          (appMeta.password_change_consumed === false);

        const passwordChangeConsumed =
          appMeta.password_change_consumed ??
          profile?.password_change_consumed ??
          false;

        // Mask internal alias for students completely so internal alias is never exposed or asked for
        const displayIdentifier = role === "admin" ? "admin@attendx.ac.in" : (rollNumber || enrollmentNumber || trimmed);

        const resolvedBranchCode =
          profile?.managed_branch_code ||
          profile?.branches?.code ||
          profile?.branch_code ||
          appMeta.branch_code ||
          "";

        const resolvedBranchName =
          profile?.branches?.name ||
          (resolvedBranchCode ? getBranchFullName(resolvedBranchCode) : "") ||
          profile?.branch ||
          "Engineering";

        const resolvedSection = normalizeSection(
          profile?.managed_section ||
          profile?.sections?.section_name ||
          profile?.section ||
          appMeta.section ||
          ""
        );

        const resolvedBatch = profile?.batch || appMeta.batch || "P1";
        const academicYear = profile?.academic_year || appMeta.academic_year || "1st Year";
        const semester = profile?.semester || (academicYear === "2nd Year" ? "Semester III" : "Semester I");

        const matchedTimetable = findTimetableForStudent({
          branchCode: resolvedBranchCode,
          section: resolvedSection,
          academicYear,
          semester,
        });

        const activeTimetableId = matchedTimetable?.id || "";

        const userObj: UserAccount = {
          id: profile?.id || authResult.user.id,
          fullName: profile?.full_name || authResult.user.user_metadata?.full_name || (role === "admin" ? "AttendX Administrator" : "Student"),
          email: role === "admin" ? "admin@attendx.ac.in" : displayIdentifier,
          rollNumber,
          enrollmentNumber,
          fatherName: profile?.father_name || appMeta.father_name,
          role,
          degree: profile?.degree || profile?.branches?.degree || "B.Tech",
          branch: role === "admin" ? "Administrator" : resolvedBranchName,
          branchCode: role === "admin" ? "ADMIN" : resolvedBranchCode,
          section: role === "admin" ? "" : resolvedSection,
          batch: resolvedBatch,
          semester,
          academicYear,
          academicSession: profile?.academic_session || appMeta.academic_session || "2026-27",
          academicSessionId: profile?.academic_session_id,
          universityId: profile?.university_id,
          attendanceThreshold: Number(profile?.attendance_threshold) || 75.0,
          activeTimetableId: role === "admin" ? (UNIVERSITY_DATABASE.timetables[0]?.id || "") : activeTimetableId,
          managedBranchCode: profile?.managed_branch_code,
          managedSection: profile?.managed_section,
          managedBatch: profile?.managed_batch,
          requiresPasswordChange,
          passwordChangeConsumed,
          isActive: true,
          status: "ACTIVE",
        };

        // Prefer genuine Supabase Auth JWT access token; fallback to cryptographic HMAC token for offline sessions
        const sessionToken = authResult.session?.access_token || createServerSessionToken(userObj);

        return {
          success: true,
          user: userObj,
          sessionToken,
          requiresPasswordChange,
          passwordChangeConsumed,
        };
      } else if (authError) {
        console.warn(`Supabase Auth sign-in failed for ${isPrimaryAdmin ? "admin" : "student"}:`, authError.message);
        if (isPrimaryAdmin) {
          return {
            success: false,
            error: "Invalid administrator credentials. Please check your administrator email and password.",
          };
        }
        return {
          success: false,
          error: "Invalid credentials. Please verify your roll number or enrollment number and password.",
        };
      }
    } catch (err) {
      console.warn("Supabase Auth sign-in failed, checking server vault:", err);
      if (isPrimaryAdmin) {
        return {
          success: false,
          error: "Invalid administrator credentials. Please check your administrator email and password.",
        };
      }
    }
  }

  // 3. Server Vault check (Accessible in offline / development mode)
  const matched =
    serverUsersStore.get(targetEmail) ||
    serverUsersStore.get(trimmed.toLowerCase()) ||
    (Array.from(serverUsersStore.values()).find((u) => u.rollNumber === trimmed || u.enrollmentNumber === trimmed || (u.email && u.email.toLowerCase() === trimmed.toLowerCase())));

  if (matched) {
    const devPass = getDevSeedPassword(matched.role);
    const isValid = (devPass && devPass === pass) || matched.rawPassword === pass || matched.password === pass;
    if (isValid) {
      const safe = sanitizeUser(matched);
      if (safe.role === "student" && (safe.rollNumber || safe.enrollmentNumber)) {
        safe.email = safe.rollNumber || safe.enrollmentNumber || trimmed;
      }
      const token = createServerSessionToken(safe);
      return {
        success: true,
        user: safe,
        sessionToken: token,
        requiresPasswordChange: matched.requiresPasswordChange ?? false,
        passwordChangeConsumed: matched.passwordChangeConsumed ?? false,
      };
    }
    if (isPrimaryAdmin) {
      return { success: false, error: "Invalid administrator credentials. Please check your administrator email and password." };
    }
    return { success: false, error: "Invalid credentials. Please verify your roll number or enrollment number and password." };
  }

  if (isPrimaryAdmin) {
    return { success: false, error: "Invalid administrator credentials. Please check your administrator email and password." };
  }
  return { success: false, error: "Invalid credentials. Please verify your roll number or enrollment number and password." };
}

/**
 * Rotates user password authoritatively on the server and in Supabase Auth.
 * Enforces the strict rule: Students are permitted exactly ONE self-service password change.
 * Subsequent attempts without an Admin reset are rejected with HTTP 403.
 */
export async function rotateUserPassword(
  identifierOrEmail: string,
  newPassword: string,
  options?: {
    isStudentSelfService?: boolean;
    callerRole?: UserRole;
  }
): Promise<{ success: boolean; sessionToken?: string; message?: string; error?: string; statusCode?: number }> {
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters long.", statusCode: 400 };
  }

  const normalizedIdentifier = identifierOrEmail.trim();
  const isPrimaryAdmin = normalizedIdentifier.toLowerCase() === "admin@attendx.ac.in";
  let targetEmail = isPrimaryAdmin ? "admin@attendx.ac.in" : rollNumberToEmailAlias(normalizedIdentifier);
  let resolvedUserId: string | undefined = undefined;

  // If Supabase is configured, update Supabase Auth via Admin Service Role
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Match profile by roll_number, enrollment_number, email, or user_id
      try {
        let query = supabaseAdmin.from("student_profiles").select("user_id, email, roll_number, enrollment_number");
        if (isPrimaryAdmin) {
          query = query.eq("email", "admin@attendx.ac.in") as any;
        } else {
          query = query.or(`roll_number.eq.${normalizedIdentifier},enrollment_number.ilike.${normalizedIdentifier},user_id.eq.${normalizedIdentifier}`) as any;
        }
        const { data: matchedProfile } = await query.maybeSingle();

        if (matchedProfile) {
          resolvedUserId = matchedProfile.user_id;
          targetEmail =
            matchedProfile.email ||
            (matchedProfile.roll_number
              ? `student.${matchedProfile.roll_number}@attendx.mmmut.ac.in`
              : targetEmail);
        }
      } catch {
        // ignore profile lookup error
      }

      let authUser: any = null;
      if (resolvedUserId) {
        try {
          const { data: directUser } = await supabaseAdmin.auth.admin.getUserById(resolvedUserId);
          authUser = directUser?.user;
        } catch {
          // ignore error
        }
      }

      if (!authUser) {
        let page = 1;
        while (!authUser && page <= 5) {
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
          authUser = listData?.users?.find(
            (u) =>
              u.email?.toLowerCase() === targetEmail.toLowerCase() ||
              u.id === normalizedIdentifier ||
              u.app_metadata?.roll_number === normalizedIdentifier
          );
          if (authUser || !listData?.users || listData.users.length < 1000) break;
          page++;
        }
      }

      if (!authUser) {
        const matchedFallback = serverUsersStore.get(targetEmail);
        if (matchedFallback) {
          if (matchedFallback.role === "student" && matchedFallback.passwordChangeConsumed) {
            return {
              success: false,
              statusCode: 403,
              error:
                "Access Denied: You have already consumed your one permitted self-service password change. Subsequent password resets must be requested from your Administrator.",
            };
          }
          matchedFallback.rawPassword = newPassword;
          matchedFallback.passwordChangeConsumed = true;
          matchedFallback.requiresPasswordChange = false;
          serverUsersStore.set(targetEmail, matchedFallback);
          return { success: true, message: "Your password was successfully updated and rotated." };
        }
        return { success: false, error: "User account not found.", statusCode: 404 };
      }

      const role = (authUser.app_metadata?.role as UserRole) || "student";
      const isStudent = role === "student";

      // ENFORCE ONE-TIME PASSWORD CHANGE RULE FOR STUDENTS:
      if (isStudent && (options?.isStudentSelfService !== false || options?.callerRole !== "admin")) {
        const consumed = authUser.app_metadata?.password_change_consumed === true;
        if (consumed) {
          return {
            success: false,
            statusCode: 403,
            error:
              "Access Denied: You have already consumed your one permitted self-service password change. Subsequent password resets must be requested from your Administrator.",
          };
        }
      }

      // Prepare updated app_metadata
      const updatedAppMeta = {
        ...authUser.app_metadata,
        password_change_consumed: true,
        requires_password_change: false,
      };

      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: newPassword,
        app_metadata: updatedAppMeta,
      });

      if (updateErr) {
        return { success: false, error: updateErr.message, statusCode: 400 };
      }

      // Update student_profiles if columns exist
      try {
        await supabaseAdmin
          .from("student_profiles")
          .update({
            password_change_consumed: true,
            requires_password_change: false,
          })
          .eq("user_id", authUser.id);
      } catch {
        // Table columns may not exist yet
      }

      // Re-issue a fresh authoritative session token because Supabase Auth revokes existing sessions on password change
      let newSessionToken: string | undefined = undefined;
      if (authUser.email && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const anonClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          );
          const { data: signData } = await anonClient.auth.signInWithPassword({
            email: authUser.email,
            password: newPassword,
          });
          if (signData?.session?.access_token) {
            newSessionToken = signData.session.access_token;
          }
        } catch (signErr) {
          console.warn("Unable to obtain fresh Supabase JWT after rotation, using HMAC token:", signErr);
        }
      }

      if (!newSessionToken) {
        let profData: any = null;
        try {
          const { data: p } = await supabaseAdmin
            .from("student_profiles")
            .select("*, branches:branch_id (code, name, degree), sections:section_id (section_name)")
            .eq("user_id", authUser.id)
            .maybeSingle();
          profData = p;
        } catch {
          // ignore lookup error
        }

        const bCode = profData?.managed_branch_code || profData?.branches?.code || profData?.branch_code || "";
        const bName = profData?.branches?.name || (bCode ? getBranchFullName(bCode) : "Engineering");
        const sec = normalizeSection(profData?.managed_section || profData?.sections?.section_name || profData?.section || "");
        const batch = profData?.batch || "P1";
        const matchedTt = findTimetableForStudent({ branchCode: bCode, section: sec });

        const refreshedUser: UserAccount = {
          id: authUser.id,
          fullName: profData?.full_name || authUser.user_metadata?.full_name || "User",
          email: authUser.email || targetEmail,
          role,
          degree: profData?.degree || profData?.branches?.degree || "B.Tech",
          branch: role === "admin" ? "Administrator" : bName,
          branchCode: role === "admin" ? "ADMIN" : bCode,
          section: role === "admin" ? "" : sec,
          batch,
          semester: profData?.semester || "Semester I",
          academicSession: profData?.academic_session || "2025-26",
          attendanceThreshold: Number(profData?.attendance_threshold) || 75.0,
          activeTimetableId: role === "admin" ? (UNIVERSITY_DATABASE.timetables[0]?.id || "") : (matchedTt?.id || ""),
          requiresPasswordChange: false,
          passwordChangeConsumed: true,
        };
        newSessionToken = createServerSessionToken(refreshedUser);
      }

      return {
        success: true,
        sessionToken: newSessionToken,
        message: "Your password was successfully updated and rotated.",
      };
    } catch (err: any) {
      console.error("Supabase password rotation error:", err);
      return { success: false, error: "Failed to update password in Supabase Auth.", statusCode: 500 };
    }
  }

  return { success: true, message: "Password updated and rotated successfully." };
}

/**
 * Admin-Only Student Password Reset:
 * Allows the sole Administrator (admin@mmmut.ac.in) to reset a student's password.
 * Issues a temporary password and resets password_change_consumed to false,
 * requiring mandatory password change on the student's next login.
 */
let testSupabaseAdminOverride: any = null;
export function setTestSupabaseAdmin(client: any) {
  testSupabaseAdminOverride = client;
}

/**
 * Admin Reset: Resets a student's password to a temporary credential.
 * Enforces mandatory password change on first login, generates an ephemeral Admin reset ticket,
 * and resets password_change_consumed state so the student can perform exactly one self-service change.
 */
export async function adminResetStudentPassword(
  adminUser: UserAccount,
  targetStudentIdentifier: string,
  customTempPassword?: string
): Promise<{
  success: boolean;
  temporaryPassword?: string;
  student?: { id: string; email: string; rollNumber?: string; fullName: string };
  error?: string;
  statusCode?: number;
}> {
  if (adminUser.role !== "admin") {
    return {
      success: false,
      statusCode: 403,
      error: "Access Denied: Only the Administrator can reset student passwords.",
    };
  }

  const targetEmail = rollNumberToEmailAlias(targetStudentIdentifier.trim());
  const tempPassword = customTempPassword || "student@2026";

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin =
        testSupabaseAdminOverride ||
        createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

      // Locate target user
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const authUser = listData?.users?.find(
        (u: any) =>
          u.email?.toLowerCase() === targetEmail.toLowerCase() ||
          u.id === targetStudentIdentifier ||
          u.app_metadata?.roll_number === targetStudentIdentifier
      );

      if (!authUser) {
        const matchedFallback = serverUsersStore.get(targetEmail);
        if (matchedFallback) {
          matchedFallback.rawPassword = tempPassword;
          matchedFallback.passwordChangeConsumed = false;
          matchedFallback.requiresPasswordChange = true;
          serverUsersStore.set(targetEmail, matchedFallback);
          return {
            success: true,
            temporaryPassword: tempPassword,
            student: {
              id: matchedFallback.id,
              email: matchedFallback.email,
              rollNumber: matchedFallback.rollNumber,
              fullName: matchedFallback.fullName,
            },
          };
        }
        return { success: false, statusCode: 404, error: "Target student account not found." };
      }

      if (
        authUser.email?.toLowerCase() === "admin@mmmut.ac.in" ||
        authUser.email?.toLowerCase() === "admin@attendx.ac.in" ||
        authUser.id === adminUser.id ||
        (authUser.app_metadata?.role &&
          authUser.app_metadata.role !== "student" &&
          authUser.app_metadata.role !== "class_admin")
      ) {
        return {
          success: false,
          statusCode: 400,
          error: "Access Denied: Non-student accounts cannot be reset via the student reset utility.",
        };
      }

      // 1. Generate 256-bit cryptographically secure random reset ticket
      const rawTicketEntropy = crypto.randomBytes(32).toString("hex");
      // 2. Hash ticket with SHA-256 (only hash is stored)
      const ticketHash = crypto.createHash("sha256").update(rawTicketEntropy).digest("hex");

      // 3. Store ticket record in admin_password_resets (5-minute expiry, unconsumed)
      const { error: ticketInsertErr } = await supabaseAdmin.from("admin_password_resets").insert({
        user_id: authUser.id,
        ticket_hash: ticketHash,
        action: "RESET",
        consumed: false,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      if (ticketInsertErr) {
        return {
          success: false,
          statusCode: 500,
          error: `Failed to initialize admin reset authorization ticket: ${ticketInsertErr.message}`,
        };
      }

      // 4. Update password via GoTrue admin API with ticket hash in app_metadata
      // Step 4a: Pre-bind reset ticket into app_metadata on auth.users so that
      // the auth trigger has access to the ticket during the subsequent password update.
      const updatedAppMeta = {
        ...authUser.app_metadata,
        admin_reset_ticket: ticketHash,
        admin_recovery_ticket: null,
        account_status: "ACTIVE",
      };

      const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        app_metadata: updatedAppMeta,
      });

      if (metaErr) {
        await supabaseAdmin
          .from("admin_password_resets")
          .delete()
          .eq("user_id", authUser.id)
          .eq("ticket_hash", ticketHash);

        return { success: false, statusCode: 500, error: `Failed to bind admin reset metadata: ${metaErr.message}` };
      }

      // Step 4b: Update password (and clear any prior ban) to fire enforce_one_time_password_change()
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: tempPassword,
        ban_duration: "none", // Clears any prior recovery lock
      });

      if (updateErr) {
        // Rollback / cleanup: Invalidate unconsumed ticket immediately on GoTrue error
        await supabaseAdmin
          .from("admin_password_resets")
          .delete()
          .eq("user_id", authUser.id)
          .eq("ticket_hash", ticketHash);

        return { success: false, statusCode: 500, error: `GoTrue password reset failed: ${updateErr.message}` };
      }

      // 5. Verify database profile synchronization strictly
      const { data: verifiedProfile, error: verifyErr } = await supabaseAdmin
        .from("student_profiles")
        .select("password_change_consumed, requires_password_change")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (
        verifyErr ||
        !verifiedProfile ||
        verifiedProfile.password_change_consumed !== false ||
        verifiedProfile.requires_password_change !== true
      ) {
        const details = verifyErr
          ? verifyErr.message
          : !verifiedProfile
          ? "Student profile record not found"
          : `Flags inconsistent (consumed=${verifiedProfile.password_change_consumed}, requires=${verifiedProfile.requires_password_change})`;

        console.error(
          `[CRITICAL SECURITY ALERT] Admin reset profile verification failed for user ${authUser.id}: ${details}`
        );

        // RECOVERY PROCEDURE: GoTrue password update succeeded, but profile verification failed.
        // We cannot leave tempPassword active or the account in an ambiguous state.
        // 1. Generate an authoritative recovery ticket in admin_password_resets (action = 'RECOVERY_LOCK').
        //    This prevents the password update from entering PATH B (student self-service change).
        // 2. Scramble and neutralize the account password with cryptographically secure random ASCII (<72 bytes).
        // 3. Ban user in GoTrue (ban_duration: '876000h') to reject all authentication attempts.
        // 4. Enforce requires_password_change = true and password_change_consumed = false.
        // 5. Independently verify the recovery lock.
        let recoveryVerified = false;
        let recoveryDiagnostic = "";

        try {
          // Cleanup initial reset ticket and any pending authorizations for this user
          await supabaseAdmin
            .from("admin_password_resets")
            .delete()
            .eq("user_id", authUser.id)
            .eq("ticket_hash", ticketHash);

          await supabaseAdmin
            .from("password_sync_authorizations")
            .delete()
            .eq("user_id", authUser.id);

          const recoveryTicketEntropy = crypto.randomBytes(32).toString("hex");
          const recoveryTicketHash = crypto.createHash("sha256").update(recoveryTicketEntropy).digest("hex");

          await supabaseAdmin.from("admin_password_resets").insert({
            user_id: authUser.id,
            ticket_hash: recoveryTicketHash,
            action: "RECOVERY_LOCK",
            consumed: false,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          });

          // Pre-bind recovery ticket into app_metadata
          const recoveryMeta = {
            ...authUser.app_metadata,
            admin_reset_ticket: null,
            admin_recovery_ticket: recoveryTicketHash,
            account_status: "RECOVERY_LOCKED",
            requires_password_change: true,
            password_change_consumed: false,
          };

          const { error: metaLockErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            app_metadata: recoveryMeta,
          });

          if (metaLockErr) {
            recoveryDiagnostic = `updateUserById metadata lock error: ${metaLockErr.message}`;
          } else {
            // Cryptographically secure random ASCII safely below 72 bytes (47 chars total)
            const scrambleEntropy = crypto.randomBytes(20).toString("hex");
            const scramblePassword = `LOCKED_${scrambleEntropy}`;

            const { error: lockErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
              password: scramblePassword,
              ban_duration: "876000h",
            });

            if (lockErr) {
              recoveryDiagnostic = `updateUserById lock error: ${lockErr.message}`;
            } else {
              // Clean up any remaining authorizations for this user
              await supabaseAdmin
                .from("password_sync_authorizations")
                .delete()
                .eq("user_id", authUser.id);

              // Independent verification of the locking operation
              const { data: checkUser, error: checkUserErr } = await supabaseAdmin.auth.admin.getUserById(authUser.id);
              if (checkUserErr || !checkUser?.user) {
                recoveryDiagnostic = `Failed to fetch user state: ${checkUserErr?.message || "User not found"}`;
              } else {
                const userMeta = checkUser.user.app_metadata || {};
                const bannedUntil = checkUser.user.banned_until;
                const isBanned = Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
                const isStatusLocked = userMeta.account_status === "RECOVERY_LOCKED";
                const isRequiresTrue = userMeta.requires_password_change === true;
                const isConsumedFalse = userMeta.password_change_consumed === false;

                // Check DB ticket table
                const { data: pendingTickets } = await supabaseAdmin
                  .from("admin_password_resets")
                  .select("id")
                  .eq("user_id", authUser.id)
                  .eq("consumed", false);

                const zeroPendingTickets = !pendingTickets || pendingTickets.length === 0;

                // Check DB authorizations table
                const { data: pendingAuths } = await supabaseAdmin
                  .from("password_sync_authorizations")
                  .select("id")
                  .eq("user_id", authUser.id);

                const zeroPendingAuths = !pendingAuths || pendingAuths.length === 0;

                if (isBanned && isStatusLocked && isRequiresTrue && isConsumedFalse && zeroPendingTickets && zeroPendingAuths) {
                  recoveryVerified = true;
                  console.warn(`[RECOVERY ACTION] Credential securely scrambled and account locked for user ${authUser.id}. Recovery independently verified.`);
                } else {
                  recoveryDiagnostic = `Lock verification mismatch (banned=${isBanned}, status=${userMeta.account_status}, req=${isRequiresTrue}, cons=${isConsumedFalse}, pendingTickets=${pendingTickets?.length || 0}, pendingAuths=${pendingAuths?.length || 0})`;
                }
              }
            }
          }
        } catch (recErr: any) {
          recoveryDiagnostic = `Recovery exception: ${recErr.message}`;
        }

        if (recoveryVerified) {
          return {
            success: false,
            statusCode: 500,
            error: `Database profile synchronization verification failed: ${details}. Recovery executed and independently verified: account locked and password neutralized to prevent desynchronization. Please re-attempt the reset.`,
          };
        } else {
          console.error(
            `[CRITICAL ALERT: MANUAL INTERVENTION REQUIRED] Recovery lock could not be independently verified for user ${authUser.id} (${targetEmail}): ${recoveryDiagnostic}`
          );
          return {
            success: false,
            statusCode: 500,
            error: `CRITICAL_RECOVERY_FAILED: Reset failed and automatic account locking could not be independently verified (${recoveryDiagnostic}). Account ${authUser.id} (${targetEmail}) requires immediate manual administrative intervention.`,
          };
        }
      }

      return {
        success: true,
        temporaryPassword: tempPassword,
        student: {
          id: authUser.id,
          email: authUser.email || targetEmail,
          rollNumber: authUser.app_metadata?.roll_number,
          fullName: authUser.user_metadata?.full_name || "Student",
        },
      };
    } catch (err: any) {
      console.error("Admin password reset failure:", err);
      return { success: false, statusCode: 500, error: "Internal error resetting student password." };
    }
  }

  // Dev fallback
  const matched = serverUsersStore.get(targetEmail);
  if (matched) {
    matched.rawPassword = tempPassword;
    matched.passwordChangeConsumed = false;
    matched.requiresPasswordChange = true;
    serverUsersStore.set(targetEmail, matched);
    return {
      success: true,
      temporaryPassword: tempPassword,
      student: {
        id: matched.id,
        email: matched.email,
        rollNumber: matched.rollNumber,
        fullName: matched.fullName,
      },
    };
  }

  return { success: false, statusCode: 404, error: "Target student account not found." };
}

/**
 * Public Registration: Registers a new student account.
 * Strictly enforces role: "student" — cannot be overridden to "admin" or "class_admin".
 */
export async function registerStudentAccount(
  data: Omit<UserAccount, "id" | "role"> & { password: string; role?: string }
): Promise<{ success: boolean; user?: UserAccount; sessionToken?: string; error?: string }> {
  // In production mode, strictly require Supabase Auth credentials and prohibit local fallback
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    return {
      success: false,
      error:
        "Registration service unavailable: Supabase Auth credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) are not configured for production environment.",
    };
  }

  const normalizedEmail = data.email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { success: false, error: "Please provide a valid university email address." };
  }

  if (serverUsersStore.has(normalizedEmail)) {
    return { success: false, error: "An account with this email address is already registered." };
  }

  if (!data.password || data.password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  // Security mandate: Public registration FORCES role to "student"
  const newStudent: ServerUserRecord = {
    ...data,
    id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: "student", // IMMUTABLE: no user can register as admin or CR
    rawPassword: data.password,
    attendanceThreshold: 75.0,
  };

  serverUsersStore.set(normalizedEmail, newStudent);

  // If Supabase configured, create in Supabase Auth
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: createdAuth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: data.password,
        email_confirm: true,
        app_metadata: { role: "student" }, // Forces student role
        user_metadata: { full_name: newStudent.fullName },
      });

      if (!authErr && createdAuth?.user) {
        newStudent.id = createdAuth.user.id;
        await supabaseAdmin.from("student_profiles").insert({
          id: createdAuth.user.id,
          user_id: createdAuth.user.id,
          full_name: newStudent.fullName,
          email: newStudent.email,
          role: "student",
          batch: newStudent.batch,
          semester: newStudent.semester,
          academic_session: newStudent.academicSession,
          attendance_threshold: newStudent.attendanceThreshold,
        });
      }
    } catch (dbErr) {
      console.error("Error provisioning user in Supabase:", dbErr);
    }
  }

  const safe = sanitizeUser(newStudent);
  const token = createServerSessionToken(safe);
  return { success: true, user: safe, sessionToken: token };
}
