import { UserAccount, DateSpecificOverride, TimetableSlot } from "@/types";

// In-memory cache for server-side persistence and fallback
const serverOverridesStore: Map<string, DateSpecificOverride> = new Map();

/**
 * Fetch date overrides matching query criteria
 */
export async function serverGetDateOverrides(filter: {
  date?: string;
  branchCode?: string;
  section?: string;
  academicYear?: string;
  studentId?: string;
  scope?: "PERSONAL" | "CLASS";
}): Promise<DateSpecificOverride[]> {
  // 1. Try Supabase if configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      let query = supabase.from("timetable_date_overrides").select("*");

      if (filter.date) {
        query = query.eq("override_date", filter.date);
      }
      if (filter.scope) {
        query = query.eq("override_scope", filter.scope);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          scope: row.override_scope,
          studentId: row.student_id,
          branchCode: row.branch_code,
          section: row.section,
          batch: row.batch || "ALL",
          academicYear: row.academic_year || "1st Year",
          date: row.override_date,
          type: row.override_type,
          slot: row.slot_data,
          originalSlotId: row.original_slot_id,
          originalPeriod: row.original_period,
          originalSubjectCode: row.original_subject_code,
          reason: row.reason,
          createdBy: row.created_by,
          createdByName: row.created_by_name,
          createdByRole: row.created_by_role,
          createdAt: row.created_at,
        }));
      }
    } catch (err) {
      console.warn("Error querying timetable_date_overrides from Supabase:", err);
    }
  }

  // 2. Fallback to in-memory store
  const results: DateSpecificOverride[] = [];
  for (const override of serverOverridesStore.values()) {
    if (filter.date && override.date !== filter.date) continue;
    if (filter.scope && override.scope !== filter.scope) continue;

    if (override.scope === "PERSONAL") {
      if (filter.studentId && override.studentId !== filter.studentId) continue;
    } else if (override.scope === "CLASS") {
      if (filter.branchCode && override.branchCode !== filter.branchCode) continue;
      if (filter.section && override.section !== filter.section) continue;
      if (filter.academicYear && override.academicYear !== filter.academicYear) continue;
    }
    results.push(override);
  }
  return results;
}

/**
 * Save date-specific override with strict server-side authorization
 */
export async function serverSaveDateOverride(
  user: UserAccount,
  override: DateSpecificOverride
): Promise<{ success: boolean; override?: DateSpecificOverride; error?: string; status?: number }> {
  // Validate basic parameters
  if (!override.date || !override.type || !override.batch) {
    return { success: false, error: "Missing required override parameters.", status: 400 };
  }

  const effectiveScope = override.scope || (user.role === "student" ? "PERSONAL" : "CLASS");

  // Authorization Check
  if (effectiveScope === "PERSONAL") {
    // Student can only set override for themselves
    override.studentId = user.id;
    override.scope = "PERSONAL";
  } else if (effectiveScope === "CLASS") {
    // Only Admin or Class Admin (CR) can publish for CLASS scope
    if (user.role !== "admin" && user.role !== "class_admin") {
      return {
        success: false,
        error: "Access Denied: Only Class Representatives and Administrators can schedule class-wide timetable modifications.",
        status: 403,
      };
    }

    // Class Admin Scope Boundary Enforcement
    if (user.role === "class_admin") {
      const authorizedBranch = user.managedBranchCode || user.branchCode;
      const authorizedSection = user.managedSection || user.section;

      if (override.branchCode && override.branchCode !== authorizedBranch) {
        return {
          success: false,
          error: `Access Denied: You are authorized to manage ${authorizedBranch}, not ${override.branchCode}.`,
          status: 403,
        };
      }
      if (override.section && override.section !== authorizedSection) {
        return {
          success: false,
          error: `Access Denied: You are authorized to manage Section ${authorizedSection}, not Section ${override.section}.`,
          status: 403,
        };
      }

      // Batch validation:
      // CR can schedule for ALL (both P1 and P2) or specific batch (P1 or P2)
      if (user.managedBatch && user.managedBatch !== "ALL") {
        if (override.batch !== "ALL" && override.batch !== user.managedBatch) {
          return {
            success: false,
            error: `Access Denied: You are authorized for batch ${user.managedBatch}, not ${override.batch}.`,
            status: 403,
          };
        }
      }

      override.branchCode = authorizedBranch;
      override.section = authorizedSection;
      override.academicYear = user.academicYear || "1st Year";
    }
  }

  // Ensure unique ID
  const finalOverride: DateSpecificOverride = {
    ...override,
    id: override.id || `ovr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdBy: user.id,
    createdByName: user.fullName,
    createdByRole: user.role,
    createdAt: override.createdAt || new Date().toISOString(),
  };

  // If slot provided, ensure occurrenceId is assigned
  if (finalOverride.slot) {
    finalOverride.slot = {
      ...finalOverride.slot,
      isOneTime: true,
      specificDate: finalOverride.date,
      occurrenceId: finalOverride.slot.occurrenceId || `occ-${finalOverride.id}`,
      overrideId: finalOverride.id,
      status: finalOverride.type === "CANCEL_OCCURRENCE" ? "CANCELLED" : "SCHEDULED",
    };
  }

  // 1. Save to in-memory store
  serverOverridesStore.set(finalOverride.id, finalOverride);

  // 2. Persist to Supabase if configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      await supabase.from("timetable_date_overrides").upsert({
        id: finalOverride.id,
        override_scope: finalOverride.scope,
        student_id: finalOverride.scope === "PERSONAL" ? finalOverride.studentId : null,
        branch_code: finalOverride.branchCode || null,
        section: finalOverride.section || null,
        batch: finalOverride.batch || "ALL",
        academic_year: finalOverride.academicYear || "1st Year",
        override_date: finalOverride.date,
        override_type: finalOverride.type,
        slot_data: finalOverride.slot || null,
        original_slot_id: finalOverride.originalSlotId || null,
        original_period: finalOverride.originalPeriod || null,
        original_subject_code: finalOverride.originalSubjectCode || null,
        reason: finalOverride.reason || null,
        created_by: finalOverride.createdBy,
        created_by_name: finalOverride.createdByName,
        created_by_role: finalOverride.createdByRole,
        created_at: finalOverride.createdAt,
      });
    } catch (err) {
      console.warn("Error persisting date override to Supabase:", err);
    }
  }

  return { success: true, override: finalOverride, status: 200 };
}

/**
 * Delete date-specific override with permission check
 */
export async function serverDeleteDateOverride(
  user: UserAccount,
  overrideId: string
): Promise<{ success: boolean; error?: string; status?: number }> {
  // Check in-memory store first
  const existing = serverOverridesStore.get(overrideId);

  // Authorization:
  if (existing) {
    if (user.role !== "admin") {
      if (existing.scope === "PERSONAL" && existing.studentId !== user.id) {
        return { success: false, error: "Access Denied: You cannot delete another user's personal timetable override.", status: 403 };
      }
      if (existing.scope === "CLASS") {
        if (user.role !== "class_admin") {
          return { success: false, error: "Access Denied: Only Class Representatives and Administrators can delete class overrides.", status: 403 };
        }
        const authBranch = user.managedBranchCode || user.branchCode;
        const authSection = user.managedSection || user.section;
        if (existing.branchCode !== authBranch || existing.section !== authSection) {
          return { success: false, error: "Access Denied: You cannot delete overrides for another class.", status: 403 };
        }
      }
    }
    serverOverridesStore.delete(overrideId);
  }

  // Delete from Supabase if configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      await supabase.from("timetable_date_overrides").delete().eq("id", overrideId);
    } catch (err) {
      console.warn("Error deleting override from Supabase:", err);
    }
  }

  return { success: true, status: 200 };
}
