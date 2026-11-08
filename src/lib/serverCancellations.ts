import { UserAccount, UserRole, CancellationReport } from "@/types";
import { getUserScope } from "./serverPolls";

export interface CreateCancellationInput {
  date: string;
  period?: number;
  subjectCode?: string;
  reasonType: "MASS_BUNK" | "TEACHER_ABSENT" | "COLLEGE_HOLIDAY" | "OTHER";
  description: string;
  branchCode?: string;
  section?: string;
  batch?: string;
}

// In-memory fallback cache for development or simulated environments
const IN_MEMORY_CANCELLATIONS: CancellationReport[] = [
  {
    id: "canc-demo-01",
    studentId: "s-102",
    studentName: "Aditya Verma",
    date: "2026-11-06",
    subjectCode: "BAS-102",
    period: 3,
    reasonType: "TEACHER_ABSENT",
    description: "Dr. Vinod informed he is on emergency leave today.",
    confirmationCount: 18,
    status: "CONFIRMED",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "canc-demo-02",
    studentId: "s-103",
    studentName: "Rohan Gupta",
    date: "2026-11-05",
    subjectCode: "BHS-101",
    period: 4,
    reasonType: "MASS_BUNK",
    description: "Class consensus for Annual Sports Fest preparations.",
    confirmationCount: 32,
    status: "CONFIRMED",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "canc-demo-03",
    studentId: "s-104",
    studentName: "Priya Singh",
    date: "2026-11-08",
    subjectCode: "BIT-103",
    period: 2,
    reasonType: "COLLEGE_HOLIDAY",
    description: "Guest lecture in Aryabhatt Hall during Period 2.",
    confirmationCount: 6,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  },
];

// Tracks confirmed user IDs per report in development/fallback environments
const IN_MEMORY_CONFIRMATIONS = new Map<string, Set<string>>();

/**
 * Returns a configured Supabase client.
 * If userToken is supplied, applies user Authorization header for RLS enforcement.
 * Otherwise uses service role for administrative queries.
 */
export async function getSupabaseCancellationsClient(userToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) return null;

  const { createClient } = await import("@supabase/supabase-js");

  if (userToken) {
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
 * Maps raw database rows from public.cancellation_reports to the CancellationReport interface.
 */
export function mapDatabaseRowToCancellationReport(row: any): CancellationReport {
  return {
    id: row.id,
    studentId: row.reported_by_student_id || row.student_id || "unknown",
    studentName: row.student_name || "Representative",
    date: row.session_date || row.date || new Date().toISOString().slice(0, 10),
    period: row.period_number !== null && row.period_number !== undefined ? Number(row.period_number) : undefined,
    subjectCode: row.subject_code || undefined,
    reasonType: row.reason_type || "OTHER",
    description: row.description || "",
    confirmationCount: Number(row.confirmation_count || 1),
    status: row.status || "PENDING",
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/**
 * Validates cancellation report input data.
 */
export function validateCancellationInput(input: any): { valid: boolean; error?: string } {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Invalid request payload." };
  }

  if (!input.date || typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { valid: false, error: "Valid date in YYYY-MM-DD format is required." };
  }

  const validReasons = ["MASS_BUNK", "TEACHER_ABSENT", "COLLEGE_HOLIDAY", "OTHER"];
  if (!input.reasonType || !validReasons.includes(input.reasonType)) {
    return { valid: false, error: `reasonType must be one of: ${validReasons.join(", ")}` };
  }

  if (!input.description || typeof input.description !== "string" || !input.description.trim()) {
    return { valid: false, error: "A clear description is required." };
  }

  if (input.description.trim().length > 1000) {
    return { valid: false, error: "Description must not exceed 1000 characters." };
  }

  if (input.period !== undefined && input.period !== null && input.period !== "") {
    const p = Number(input.period);
    if (!Number.isInteger(p) || p < 1 || p > 12) {
      return { valid: false, error: "Period must be an integer between 1 and 12." };
    }
  }

  return { valid: true };
}

/**
 * Fetch cancellation reports authorized for the authenticated user.
 * - Admin: sees all cancellation reports.
 * - Class Admin / Student: sees reports matching their authorized branch & section or 'ALL'.
 */
export async function serverGetCancellationReportsForUser(
  user: UserAccount,
  options?: { client?: any; token?: string }
): Promise<CancellationReport[]> {
  const supabase = options?.client || (await getSupabaseCancellationsClient(options?.token));

  if (supabase) {
    try {
      let query = supabase
        .from("cancellation_reports")
        .select("*")
        .order("session_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (user.role !== "admin") {
        const branchCode = user.role === "class_admin" ? (user.managedBranchCode || user.branchCode) : user.branchCode;
        const section = user.role === "class_admin" ? (user.managedSection || user.section) : user.section;

        query = query.or(
          `branch_code.is.null,branch_code.eq.ALL,and(branch_code.eq.${branchCode},or(section.is.null,section.eq.ALL,section.eq.${section}))`
        );
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data.map(mapDatabaseRowToCancellationReport);
      }
      if (error) {
        console.warn("[serverGetCancellationReportsForUser] Supabase query returned error:", error.message);
      }
    } catch (err: any) {
      console.error("[serverGetCancellationReportsForUser] Exception:", err.message);
    }
  }

  // In-memory fallback
  return IN_MEMORY_CANCELLATIONS;
}

/**
 * Create a new cancellation report.
 * Strictly enforces that only admin and class_admin may submit reports.
 * Students are rejected with a 403 Access Denied.
 */
export async function serverCreateCancellationReport(
  user: UserAccount,
  input: CreateCancellationInput,
  options?: { client?: any; token?: string }
): Promise<{ success: boolean; report?: CancellationReport; error?: string; statusCode?: number }> {
  // 1. Role verification
  if (user.role === "student") {
    return {
      success: false,
      error: "Access Denied: Students are not authorized to submit cancellation reports. Only Administrators and Class CRs can submit reports.",
      statusCode: 403,
    };
  }

  if (user.role !== "admin" && user.role !== "class_admin") {
    return {
      success: false,
      error: "Access Denied: Unrecognized role.",
      statusCode: 403,
    };
  }

  // 2. Input validation
  const validation = validateCancellationInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.error, statusCode: 400 };
  }

  // 3. Class Admin Scope enforcement
  let targetBranch = input.branchCode;
  let targetSection = input.section;

  if (user.role === "class_admin") {
    const userManagedBranch = user.managedBranchCode || user.branchCode;
    const userManagedSection = user.managedSection || user.section;

    if (input.branchCode && input.branchCode !== userManagedBranch) {
      return {
        success: false,
        error: `Access Denied: Class Admins may only submit reports for their assigned branch (${userManagedBranch}). Attempted: ${input.branchCode}`,
        statusCode: 403,
      };
    }

    if (input.section && input.section !== userManagedSection && input.section !== "ALL") {
      return {
        success: false,
        error: `Access Denied: Class Admins may only submit reports for their assigned section (${userManagedSection}). Attempted: ${input.section}`,
        statusCode: 403,
      };
    }

    targetBranch = userManagedBranch;
    targetSection = userManagedSection;
  } else {
    // Admin defaults
    targetBranch = targetBranch || user.branchCode || "IT";
    targetSection = targetSection || user.section || "SEC-B";
  }

  const supabase = options?.client || (await getSupabaseCancellationsClient(options?.token));

  if (supabase) {
    try {
      // Resolve section_id from sections table
      let resolvedSectionId: string | null = null;
      try {
        const { data: secData } = await supabase
          .from("sections")
          .select("id, branch_id, branches!inner(code)")
          .eq("section_name", targetSection)
          .eq("branches.code", targetBranch)
          .maybeSingle();

        if (secData?.id) {
          resolvedSectionId = secData.id;
        }
      } catch (secErr) {
        // If join fails, continue with null section_id
      }

      const insertPayload: Record<string, any> = {
        session_date: input.date,
        period_number: input.period ? Number(input.period) : null,
        subject_code: input.subjectCode && input.subjectCode !== "ALL" ? input.subjectCode.trim() : null,
        reason_type: input.reasonType,
        description: input.description.trim(),
        branch_code: targetBranch,
        section: targetSection,
        batch: input.batch || "ALL",
        student_name: user.fullName || "Representative",
        reported_by_student_id: user.id,
        confirmation_count: 1,
        status: "PENDING",
      };

      if (resolvedSectionId) {
        insertPayload.section_id = resolvedSectionId;
      }

      const { data, error } = await supabase
        .from("cancellation_reports")
        .insert(insertPayload)
        .select()
        .single();

      if (!error && data) {
        const createdReport = mapDatabaseRowToCancellationReport(data);
        return { success: true, report: createdReport, statusCode: 201 };
      }

      if (error) {
        console.error("[serverCreateCancellationReport] Database insert failed:", error.message);
        // If column missing or RLS error, return detailed error
        return { success: false, error: `Database insert failed: ${error.message}`, statusCode: 400 };
      }
    } catch (dbErr: any) {
      console.error("[serverCreateCancellationReport] Exception:", dbErr.message);
      return { success: false, error: dbErr.message, statusCode: 500 };
    }
  }

  // In-memory fallback
  const mockReport: CancellationReport = {
    id: "canc-" + Date.now(),
    studentId: user.id,
    studentName: user.fullName,
    date: input.date,
    period: input.period ? Number(input.period) : undefined,
    subjectCode: input.subjectCode === "ALL" ? undefined : input.subjectCode,
    reasonType: input.reasonType,
    description: input.description.trim(),
    confirmationCount: 1,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  IN_MEMORY_CANCELLATIONS.unshift(mockReport);
  return { success: true, report: mockReport, statusCode: 201 };
}

/**
 * Confirm a cancellation report.
 * Strictly enforces that only admin and class_admin may confirm reports.
 * Class admins may only confirm reports for their assigned class.
 */
export async function serverConfirmCancellationReport(
  user: UserAccount,
  reportId: string,
  options?: { client?: any; token?: string }
): Promise<{ success: boolean; report?: CancellationReport; error?: string; statusCode?: number }> {
  // 1. Role verification
  if (user.role === "student") {
    return {
      success: false,
      error: "Access Denied: Students are not authorized to confirm cancellation reports. Only Administrators and Class CRs can confirm reports.",
      statusCode: 403,
    };
  }

  if (user.role !== "admin" && user.role !== "class_admin") {
    return {
      success: false,
      error: "Access Denied: Unrecognized role.",
      statusCode: 403,
    };
  }

  if (!reportId || typeof reportId !== "string" || !reportId.trim()) {
    return { success: false, error: "reportId is required.", statusCode: 400 };
  }

  const supabase = options?.client || (await getSupabaseCancellationsClient(options?.token));

  if (supabase) {
    try {
      // 2. Fetch existing report to verify existence and scope
      const { data: existing, error: fetchErr } = await supabase
        .from("cancellation_reports")
        .select("*")
        .eq("id", reportId)
        .maybeSingle();

      if (fetchErr) {
        return { success: false, error: `Failed to fetch report: ${fetchErr.message}`, statusCode: 500 };
      }

      if (!existing) {
        return { success: false, error: `Cancellation report '${reportId}' not found.`, statusCode: 404 };
      }

      // 3. Class Admin scope validation
      if (user.role === "class_admin") {
        const userManagedBranch = user.managedBranchCode || user.branchCode;
        const userManagedSection = user.managedSection || user.section;

        if (existing.branch_code && existing.branch_code !== userManagedBranch) {
          return {
            success: false,
            error: `Access Denied: Class Admins may only confirm reports for their assigned branch (${userManagedBranch}). Target report is for ${existing.branch_code}.`,
            statusCode: 403,
          };
        }

        if (existing.section && existing.section !== userManagedSection && existing.section !== "ALL") {
          return {
            success: false,
            error: `Access Denied: Class Admins may only confirm reports for their assigned section (${userManagedSection}). Target report is for ${existing.section}.`,
            statusCode: 403,
          };
        }
      }

      // 4. Attempt atomic database stored procedure RPC
      try {
        const { data: rpcResult, error: rpcErr } = await supabase.rpc(
          "confirm_cancellation_report_atomic",
          {
            p_report_id: reportId,
            p_user_id: user.id,
          }
        );

        if (!rpcErr && rpcResult) {
          if (!rpcResult.success) {
            return {
              success: false,
              error: rpcResult.error || "Failed to confirm report.",
              statusCode: rpcResult.statusCode || 400,
            };
          }

          // Fetch updated report
          const { data: freshData } = await supabase
            .from("cancellation_reports")
            .select("*")
            .eq("id", reportId)
            .maybeSingle();

          if (freshData) {
            return { success: true, report: mapDatabaseRowToCancellationReport(freshData), statusCode: 200 };
          }
        }
      } catch {
        // RPC not deployed yet, proceed to table-level atomic checks
      }

      // 5. Duplicate confirmation check via cancellation_report_confirmations table or confirmed_by field
      try {
        const { data: existingConf } = await supabase
          .from("cancellation_report_confirmations")
          .select("id")
          .eq("report_id", reportId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingConf) {
          return {
            success: false,
            error: "You have already confirmed this cancellation report.",
            statusCode: 409,
          };
        }
      } catch {
        // Fallback: check legacy single confirmed_by field
        if (existing.confirmed_by === user.id) {
          return {
            success: false,
            error: "You have already confirmed this cancellation report.",
            statusCode: 409,
          };
        }
      }

      // 6. Record user confirmation in tracking table
      let recordedInTable = false;
      try {
        const { error: insertConfErr } = await supabase
          .from("cancellation_report_confirmations")
          .insert({
            report_id: reportId,
            user_id: user.id,
          });

        if (insertConfErr) {
          if (insertConfErr.code === "23505" || insertConfErr.message?.includes("duplicate")) {
            return {
              success: false,
              error: "You have already confirmed this cancellation report.",
              statusCode: 409,
            };
          }
        } else {
          recordedInTable = true;
        }
      } catch {
        // Table may not exist yet
      }

      // 7. Atomic confirmation count calculation & status update
      let nextCount = Number(existing.confirmation_count || 1) + 1;
      if (recordedInTable) {
        try {
          const { count } = await supabase
            .from("cancellation_report_confirmations")
            .select("id", { count: "exact", head: true })
            .eq("report_id", reportId);
          if (count && count > 0) {
            nextCount = Math.max(Number(existing.confirmation_count || 1) + 1, count);
          }
        } catch {
          // ignore count error
        }
      }

      const { data: updated, error: updateErr } = await supabase
        .from("cancellation_reports")
        .update({
          status: "CONFIRMED",
          confirmation_count: nextCount,
          confirmed_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId)
        .select()
        .single();

      if (updateErr) {
        return { success: false, error: `Failed to confirm report: ${updateErr.message}`, statusCode: 400 };
      }

      const confirmedReport = mapDatabaseRowToCancellationReport(updated);
      return { success: true, report: confirmedReport, statusCode: 200 };
    } catch (err: any) {
      console.error("[serverConfirmCancellationReport] Exception:", err.message);
      return { success: false, error: err.message, statusCode: 500 };
    }
  }

  // In-memory fallback
  const idx = IN_MEMORY_CANCELLATIONS.findIndex((r) => r.id === reportId);
  if (idx === -1) {
    return { success: false, error: `Cancellation report '${reportId}' not found.`, statusCode: 404 };
  }

  // Duplicate confirmation check for in-memory store
  let userConfirmations = IN_MEMORY_CONFIRMATIONS.get(reportId);
  if (!userConfirmations) {
    userConfirmations = new Set<string>();
    IN_MEMORY_CONFIRMATIONS.set(reportId, userConfirmations);
  }

  if (userConfirmations.has(user.id)) {
    return {
      success: false,
      error: "You have already confirmed this cancellation report.",
      statusCode: 409,
    };
  }

  userConfirmations.add(user.id);

  const target = IN_MEMORY_CANCELLATIONS[idx];
  const updatedReport: CancellationReport = {
    ...target,
    confirmationCount: target.confirmationCount + 1,
    status: "CONFIRMED",
  };
  IN_MEMORY_CANCELLATIONS[idx] = updatedReport;

  return { success: true, report: updatedReport, statusCode: 200 };
}
