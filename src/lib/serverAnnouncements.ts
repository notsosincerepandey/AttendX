/**
 * AttendX Server-Side Class Announcements Authorization & Persistence Engine
 * 
 * Enforces strict class-level isolation:
 * 1. Admin: View, create, edit, and delete announcements for ANY class or university-wide ('ALL').
 * 2. Class Admin (CR):
 *    - View announcements only for their assigned class (or 'ALL').
 *    - Create announcements only for their assigned class.
 *    - Edit and delete only announcements belonging to their assigned class.
 *    - Cross-class creation, viewing, editing, or deletion is strictly blocked with 403 Access Denied.
 * 3. Student:
 *    - View announcements only for their own enrolled class (or 'ALL').
 *    - Cannot create, edit, or delete announcements (403 Access Denied).
 * 
 * Server-Side Integrity:
 * - Uses authoritative user profile from database; never trusts client-supplied branch, section, batch, or role.
 * - In production, never falls back to mock/seed data.
 */

import { UserAccount, UserRole } from "@/types";
import { getUserScope } from "./serverPolls";
import { isSupabaseJwt } from "@/lib/serverAuthGuard";

export interface ClassAnnouncement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "danger" | "success";
  branchCode: string; // e.g. "IT" or "ALL"
  section: string; // e.g. "SEC-B" or "ALL"
  batch?: string; // "ALL" | "P1" | "P2"
  academicSession?: string;
  semester?: string;
  createdBy: string; // auth UUID
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
  updatedAt?: string;
}

// Seed data used for in-memory testing and isolated offline dev
export const SEED_CLASS_ANNOUNCEMENTS: ClassAnnouncement[] = [
  {
    id: "ann-demo-01",
    title: "University Notice: 75% Attendance Mandatory",
    message: "Per MMMUT academic guidelines, students with attendance below 75% will be debarred from examinations.",
    type: "warning",
    branchCode: "ALL",
    section: "ALL",
    batch: "ALL",
    academicSession: "2025-26",
    semester: "Semester I",
    createdBy: "admin-auth-uuid-001",
    authorName: "Dean Academic Affairs",
    authorRole: "admin",
    createdAt: "2026-11-01T08:00:00.000Z",
  },
  {
    id: "ann-demo-02",
    title: "C Programming Lab Batch Schedule",
    message: "Tomorrow's practical batch P1 will report directly to Computer Lab 3 at 2:00 PM with completed records.",
    type: "info",
    branchCode: "IT",
    section: "SEC-B",
    batch: "P1",
    academicSession: "2025-26",
    semester: "Semester I",
    createdBy: "cr-it-auth-uuid-002",
    authorName: "Aryan Singh (CR)",
    authorRole: "class_admin",
    createdAt: "2026-11-02T09:00:00.000Z",
  },
  {
    id: "ann-demo-03",
    title: "CSE Section A Physics Tutorial Shift",
    message: "Thursday Period 4 Physics Tutorial rescheduled to Saturday 10:00 AM.",
    type: "info",
    branchCode: "CSE",
    section: "SEC-A",
    batch: "ALL",
    academicSession: "2025-26",
    semester: "Semester I",
    createdBy: "admin-auth-uuid-001",
    authorName: "Prof. H. C. Verma",
    authorRole: "admin",
    createdAt: "2026-11-03T11:00:00.000Z",
  },
];

// In-memory store for offline development and fast test runner execution
export class ServerAnnouncementsStore {
  private announcements: Map<string, ClassAnnouncement> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.announcements.clear();
    for (const ann of SEED_CLASS_ANNOUNCEMENTS) {
      this.announcements.set(ann.id, JSON.parse(JSON.stringify(ann)));
    }
  }

  public getAll(): ClassAnnouncement[] {
    return Array.from(this.announcements.values());
  }

  public getById(id: string): ClassAnnouncement | undefined {
    return this.announcements.get(id);
  }

  public set(announcement: ClassAnnouncement): void {
    this.announcements.set(announcement.id, announcement);
  }

  public delete(id: string): boolean {
    return this.announcements.delete(id);
  }
}

export const serverAnnouncementsStore = new ServerAnnouncementsStore();

/**
 * Checks whether a user has permission to view an announcement.
 * - Admin: can view all announcements across all classes.
 * - Class Admin & Student:
 *   - Allowed if announcement is 'ALL' or matches their branch and section.
 *   - If announcement targets a specific batch (e.g. P1), student's batch must match.
 *   - Academic session and semester must match if specified.
 */
export function canUserViewAnnouncement(user: UserAccount, ann: ClassAnnouncement): boolean {
  if (user.role === "admin") return true;

  const scope = getUserScope(user);

  // University-wide announcements are visible to everyone
  if (ann.branchCode === "ALL") return true;

  // Branch mismatch -> strictly hidden
  if (ann.branchCode !== scope.branchCode) return false;

  // Section mismatch -> strictly hidden
  if (ann.section !== "ALL" && ann.section !== scope.section) return false;

  // Batch scoping: If announcement targets a specific batch (not "ALL")
  if (ann.batch && ann.batch !== "ALL") {
    // For student: must match student's enrolled batch
    if (user.role === "student" && scope.batch && ann.batch !== scope.batch) {
      return false;
    }
    // For CR: if CR is restricted to a managedBatch, must match
    if (user.role === "class_admin" && scope.batch && scope.batch !== "ALL" && ann.batch !== scope.batch) {
      return false;
    }
  }

  // Academic session scoping: If announcement specifies academicSession
  if (ann.academicSession && scope.academicSession && ann.academicSession !== scope.academicSession) {
    return false;
  }

  // Semester scoping: If announcement specifies semester
  if (ann.semester && scope.semester && ann.semester !== scope.semester) {
    return false;
  }

  return true;
}

/**
 * Authoritatively filters announcements for a user based on role and class scope.
 */
export function filterAnnouncementsForUser(
  announcements: ClassAnnouncement[],
  user: UserAccount
): ClassAnnouncement[] {
  return announcements.filter((a) => canUserViewAnnouncement(user, a));
}

/**
 * Checks whether a user has permission to create an announcement for the target class scope.
 * - Admin: can create announcements for ANY class or university-wide ('ALL').
 * - Class Admin (CR): can create announcements ONLY for their assigned class.
 *   - Cannot create 'ALL' branch or 'ALL' section announcements.
 *   - Cannot create for another branch or section.
 * - Student: cannot create announcements.
 */
export function canUserCreateAnnouncement(
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
      reason: "Access Denied: Students are not permitted to create class announcements.",
    };
  }

  if (user.role === "class_admin") {
    const scope = getUserScope(user);

    if (targetBranchCode === "ALL" || targetSection === "ALL") {
      return {
        allowed: false,
        reason: "Access Denied: Only university administrators may broadcast university-wide ('ALL') announcements.",
      };
    }

    if (targetBranchCode !== scope.branchCode || targetSection !== scope.section) {
      return {
        allowed: false,
        reason: `Access Denied: Class Admins may post announcements only for their authorized scope (${scope.branchCode} ${scope.section}). Attempted: ${targetBranchCode} ${targetSection}.`,
      };
    }

    if (targetBatch && targetBatch !== "ALL" && scope.batch && scope.batch !== "ALL" && targetBatch !== scope.batch) {
      return {
        allowed: false,
        reason: `Access Denied: Class Admins cannot post announcements outside their managed batch (${scope.batch}).`,
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Access Denied: Unrecognized role." };
}

/**
 * Checks whether a user has permission to edit a specific announcement.
 * - Admin: can edit any announcement across all classes.
 * - Class Admin (CR): can edit only announcements belonging to their assigned class.
 * - Student: cannot edit announcements.
 */
export function canUserEditAnnouncement(
  user: UserAccount,
  ann: ClassAnnouncement
): { allowed: boolean; reason?: string } {
  if (user.role === "student") {
    return {
      allowed: false,
      reason: "Access Denied: Students are not permitted to edit announcements.",
    };
  }

  if (user.role === "admin") {
    return { allowed: true };
  }

  if (user.role === "class_admin") {
    const scope = getUserScope(user);

    if (ann.branchCode !== scope.branchCode || (ann.section !== "ALL" && ann.section !== scope.section)) {
      return {
        allowed: false,
        reason: `Access Denied: Class Admins may edit announcements only within their authorized scope (${scope.branchCode} ${scope.section}). Target announcement is for ${ann.branchCode} ${ann.section}.`,
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Access Denied: Unrecognized role." };
}

/**
 * Checks whether a user has permission to delete a specific announcement.
 * - Admin: can delete any announcement.
 * - Class Admin (CR): can delete only announcements belonging to their assigned class.
 * - Student: cannot delete announcements.
 */
export function canUserDeleteAnnouncement(
  user: UserAccount,
  ann: ClassAnnouncement
): { allowed: boolean; reason?: string } {
  if (user.role === "student") {
    return {
      allowed: false,
      reason: "Access Denied: Students are not permitted to delete announcements.",
    };
  }

  if (user.role === "admin") {
    return { allowed: true };
  }

  if (user.role === "class_admin") {
    const scope = getUserScope(user);

    if (ann.branchCode !== scope.branchCode || (ann.section !== "ALL" && ann.section !== scope.section)) {
      return {
        allowed: false,
        reason: `Access Denied: Class Admins may delete announcements only within their authorized scope (${scope.branchCode} ${scope.section}). Target announcement is for ${ann.branchCode} ${ann.section}.`,
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Access Denied: Unrecognized role." };
}

/**
 * Returns a configured Supabase client for announcements.
 */
async function getSupabaseAnnouncementsClient(userToken?: string) {
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
 * Maps raw database rows from class_announcements to ClassAnnouncement domain model.
 */
export function mapDatabaseRowToClassAnnouncement(raw: any): ClassAnnouncement {
  return {
    id: raw.id,
    title: raw.title,
    message: raw.message,
    type: raw.type,
    branchCode: raw.branch_code,
    section: raw.section,
    batch: raw.batch || "ALL",
    academicSession: raw.academic_session || undefined,
    semester: raw.semester || undefined,
    createdBy: raw.created_by,
    authorName: raw.author_name || "Representative",
    authorRole: raw.author_role || "class_admin",
    createdAt: raw.created_at,
    updatedAt: raw.updated_at || undefined,
  };
}

/**
 * Server Operation: Fetch authorized announcements for user.
 * Authoritatively queries the database; strictly rejects falling back to demo data in production.
 */
export async function serverGetAnnouncementsForUser(
  user: UserAccount,
  callOptions?: { client?: any; token?: string }
): Promise<ClassAnnouncement[]> {
  const supabase = callOptions?.client || (await getSupabaseAnnouncementsClient(callOptions?.token));

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("class_announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to query class_announcements: ${error.message}`);
      }

      const announcements = (data || []).map(mapDatabaseRowToClassAnnouncement);
      return filterAnnouncementsForUser(announcements, user);
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(`Database error fetching announcements: ${err.message}`);
      }
      console.warn("[DEV MODE] Database query failed, using in-memory announcements store:", err.message);
    }
  }

  // Strict production requirement: never return mock/seed data in production
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Class Announcements service unavailable: Supabase credentials are not configured for production environment."
    );
  }

  // In-memory fallback exclusively for test runners and offline development
  return filterAnnouncementsForUser(serverAnnouncementsStore.getAll(), user);
}

/**
 * Server Operation: Create announcement with strict server-side authorization.
 */
export async function serverCreateAnnouncement(
  user: UserAccount,
  data: {
    title: string;
    message: string;
    type?: "info" | "warning" | "danger" | "success";
    branchCode: string;
    section: string;
    batch?: string;
    academicSession?: string;
    semester?: string;
  },
  callOptions?: { client?: any; token?: string }
): Promise<{ success: boolean; announcement?: ClassAnnouncement; error?: string }> {
  if (!data.title || !data.title.trim()) {
    return { success: false, error: "Announcement title is required." };
  }

  if (!data.message || !data.message.trim()) {
    return { success: false, error: "Announcement message is required." };
  }

  const authCheck = canUserCreateAnnouncement(user, data.branchCode, data.section, data.batch);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.reason };
  }

  const supabase = callOptions?.client || (await getSupabaseAnnouncementsClient(callOptions?.token));

  if (supabase) {
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from("class_announcements")
        .insert({
          title: data.title.trim(),
          message: data.message.trim(),
          type: data.type || "info",
          branch_code: data.branchCode,
          section: data.section,
          batch: data.batch || "ALL",
          academic_session: data.academicSession || user.academicSession || null,
          semester: data.semester || user.semester || null,
          created_by: user.id,
          author_name: user.fullName,
          author_role: user.role,
        })
        .select()
        .single();

      if (insertErr || !inserted) {
        throw new Error(`Failed to insert announcement: ${insertErr?.message || "Unknown error"}`);
      }

      return {
        success: true,
        announcement: mapDatabaseRowToClassAnnouncement(inserted),
      };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        return { success: false, error: err.message };
      }
      console.warn("[DEV MODE] Database announcement insert failed, using in-memory store:", err.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Persistence unavailable: Supabase credentials are required in production.",
    };
  }

  // In-memory fallback exclusively for test runners
  const newAnn: ClassAnnouncement = {
    id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: data.title.trim(),
    message: data.message.trim(),
    type: data.type || "info",
    branchCode: data.branchCode,
    section: data.section,
    batch: data.batch || "ALL",
    academicSession: data.academicSession || user.academicSession,
    semester: data.semester || user.semester,
    createdBy: user.id,
    authorName: user.fullName,
    authorRole: user.role,
    createdAt: new Date().toISOString(),
  };

  serverAnnouncementsStore.set(newAnn);
  return { success: true, announcement: newAnn };
}

/**
 * Server Operation: Edit announcement with strict server-side authorization.
 */
export async function serverEditAnnouncement(
  user: UserAccount,
  announcementId: string,
  data: {
    title?: string;
    message?: string;
    type?: "info" | "warning" | "danger" | "success";
  },
  callOptions?: { client?: any; token?: string }
): Promise<{ success: boolean; announcement?: ClassAnnouncement; error?: string }> {
  const supabase = callOptions?.client || (await getSupabaseAnnouncementsClient(callOptions?.token));

  if (supabase) {
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from("class_announcements")
        .select("*")
        .eq("id", announcementId)
        .maybeSingle();

      if (fetchErr || !existing) {
        return { success: false, error: "Announcement not found." };
      }

      const domainAnn = mapDatabaseRowToClassAnnouncement(existing);
      const authCheck = canUserEditAnnouncement(user, domainAnn);
      if (!authCheck.allowed) {
        return { success: false, error: authCheck.reason };
      }

      const updates: any = { updated_at: new Date().toISOString() };
      if (data.title && data.title.trim()) updates.title = data.title.trim();
      if (data.message && data.message.trim()) updates.message = data.message.trim();
      if (data.type) updates.type = data.type;

      const { data: updated, error: updateErr } = await supabase
        .from("class_announcements")
        .update(updates)
        .eq("id", announcementId)
        .select()
        .single();

      if (updateErr || !updated) {
        throw new Error(`Failed to update announcement: ${updateErr?.message || "Unknown error"}`);
      }

      return {
        success: true,
        announcement: mapDatabaseRowToClassAnnouncement(updated),
      };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        return { success: false, error: err.message };
      }
      console.warn("[DEV MODE] Database update failed, using in-memory store:", err.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Persistence unavailable: Supabase credentials are required in production.",
    };
  }

  // In-memory fallback exclusively for test runners
  const existing = serverAnnouncementsStore.getById(announcementId);
  if (!existing) {
    return { success: false, error: "Announcement not found." };
  }

  const authCheck = canUserEditAnnouncement(user, existing);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.reason };
  }

  if (data.title && data.title.trim()) existing.title = data.title.trim();
  if (data.message && data.message.trim()) existing.message = data.message.trim();
  if (data.type) existing.type = data.type;
  existing.updatedAt = new Date().toISOString();

  serverAnnouncementsStore.set(existing);
  return { success: true, announcement: existing };
}

/**
 * Server Operation: Delete announcement with strict server-side authorization.
 */
export async function serverDeleteAnnouncement(
  user: UserAccount,
  announcementId: string,
  callOptions?: { client?: any; token?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = callOptions?.client || (await getSupabaseAnnouncementsClient(callOptions?.token));

  if (supabase) {
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from("class_announcements")
        .select("*")
        .eq("id", announcementId)
        .maybeSingle();

      if (fetchErr || !existing) {
        return { success: false, error: "Announcement not found." };
      }

      const domainAnn = mapDatabaseRowToClassAnnouncement(existing);
      const authCheck = canUserDeleteAnnouncement(user, domainAnn);
      if (!authCheck.allowed) {
        return { success: false, error: authCheck.reason };
      }

      const { error: deleteErr } = await supabase
        .from("class_announcements")
        .delete()
        .eq("id", announcementId);

      if (deleteErr) {
        throw new Error(`Failed to delete announcement: ${deleteErr.message}`);
      }

      return { success: true };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        return { success: false, error: err.message };
      }
      console.warn("[DEV MODE] Database delete failed, using in-memory store:", err.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Persistence unavailable: Supabase credentials are required in production.",
    };
  }

  // In-memory fallback exclusively for test runners
  const existing = serverAnnouncementsStore.getById(announcementId);
  if (!existing) {
    return { success: false, error: "Announcement not found." };
  }

  const authCheck = canUserDeleteAnnouncement(user, existing);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.reason };
  }

  serverAnnouncementsStore.delete(announcementId);
  return { success: true };
}
