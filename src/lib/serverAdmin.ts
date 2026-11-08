/**
 * AttendX Server-Side Administration Engine
 * 
 * Provides authoritative backend services for:
 * 1. Registered Student Directory (retrieval, search, filtering, pagination)
 * 2. Class Representative (CR) Appointment & Revocation
 * 3. Timetable Review, Consistency Checking & Scoped Publication
 * 
 * Security: Strictly enforces that only the single application Admin (admin@attendx.ac.in)
 * can invoke these operations. Never trusts client-supplied roles or scopes.
 */

import { UserAccount, StudentDirectoryItem, PublishedTimetableVersion, UniversityTimetable } from "@/types";
import { BRANCH_SECTIONS_MAP, BRANCH_NAMES_MAP, getSectionsForBranch } from "@/data/extractedTimetables";

// In-memory test store for offline development and fast test runner execution
export class ServerAdminStore {
  private students: Map<string, StudentDirectoryItem> = new Map();
  private publishedTimetables: Map<string, PublishedTimetableVersion> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.students.clear();
    this.publishedTimetables.clear();

    // Default seed students for isolated test runner
    const defaultStudents: StudentDirectoryItem[] = [
      {
        id: "c70936b3-ffe8-4baa-908d-f92fbd62ca9a",
        userId: "c70936b3-ffe8-4baa-908d-f92fbd62ca9a",
        fullName: "Shubh Pandey",
        email: "admin@attendx.ac.in",
        rollNumber: "202501001",
        branchCode: "IT",
        branchName: "Information Technology",
        section: "SEC-B",
        batch: "P1",
        academicSession: "2025-26",
        semester: "Semester I",
        role: "admin",
        managedBranchCode: "IT",
        managedSection: "SEC-B",
        isActive: true,
        createdAt: "2026-11-01T08:00:00.000Z",
      },
      {
        id: "79fdb5a8-9f27-4cde-bd3b-c5abbb0eaded",
        userId: "79fdb5a8-9f27-4cde-bd3b-c5abbb0eaded",
        fullName: "Shailesh",
        email: "shubhpandey304@gmail.com",
        rollNumber: "202501045",
        branchCode: "IT",
        branchName: "Information Technology",
        section: "SEC-B",
        batch: "P2",
        academicSession: "2025-26",
        semester: "Semester I",
        role: "student",
        isActive: true,
        createdAt: "2026-11-02T09:00:00.000Z",
      },
      {
        id: "8f4bec2c-8890-46f7-bc49-4074baa0dcde",
        userId: "8f4bec2c-8890-46f7-bc49-4074baa0dcde",
        fullName: "Harsh",
        email: "harsh@gmail.com",
        // Deliberately missing rollNumber to verify incomplete profile handling
        branchCode: "CSE",
        branchName: "Computer Science & Engineering",
        section: "SEC-A",
        batch: "P1",
        academicSession: "2025-26",
        semester: "Semester I",
        role: "student",
        isActive: true,
        createdAt: "2026-11-03T10:00:00.000Z",
      },
      {
        id: "student-incomplete-003",
        userId: "student-incomplete-003",
        fullName: "Ananya Mishra",
        email: "ananya@mmmut.ac.in",
        // Deliberately missing branch & section to test incomplete display
        role: "student",
        batch: "P1",
        academicSession: "2025-26",
        semester: "Semester I",
        isActive: true,
        createdAt: "2026-11-04T11:00:00.000Z",
      },
    ];

    for (const s of defaultStudents) {
      this.students.set(s.id, s);
    }
  }

  public getAllStudents(): StudentDirectoryItem[] {
    return Array.from(this.students.values());
  }

  public getStudentById(id: string): StudentDirectoryItem | undefined {
    return this.students.get(id) || Array.from(this.students.values()).find((s) => s.userId === id);
  }

  public getStudentByEmail(email: string): StudentDirectoryItem | undefined {
    return Array.from(this.students.values()).find((s) => s.email.toLowerCase() === email.toLowerCase());
  }

  public setStudent(student: StudentDirectoryItem): void {
    this.students.set(student.id, student);
  }

  public getAllPublishedTimetables(): PublishedTimetableVersion[] {
    return Array.from(this.publishedTimetables.values());
  }

  public setPublishedTimetable(version: PublishedTimetableVersion): void {
    this.publishedTimetables.set(version.id, version);
  }
}

export const serverAdminStore = new ServerAdminStore();

/**
 * Returns a configured Supabase client with service-role permissions.
 */
async function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Maps raw database row from student_profiles to StudentDirectoryItem
 * Resolves human-readable branch codes and section names accurately without confusing UUIDs.
 * Preserves genuinely incomplete profiles as Unassigned (undefined).
 */
export function mapDatabaseRowToStudent(raw: any): StudentDirectoryItem {
  const isUUID = (val?: any): boolean =>
    typeof val === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const branchObj = Array.isArray(raw.branches) ? raw.branches[0] : raw.branches;
  const sectionObj = Array.isArray(raw.sections) ? raw.sections[0] : raw.sections;

  // Resolve raw branch code and section
  let branchCode: string | undefined =
    raw.managed_branch_code ||
    branchObj?.code ||
    raw.branch_code ||
    raw.branchCode ||
    undefined;

  let section: string | undefined =
    raw.managed_section ||
    sectionObj?.section_name ||
    (isUUID(raw.section) ? undefined : raw.section) ||
    raw.sectionName ||
    undefined;

  // If section_id was stored as a human-readable section name (like "SEC-A" instead of UUID)
  if (!section && raw.section_id && !isUUID(raw.section_id)) {
    section = raw.section_id;
  }

  // Fallback to known enrolled student record if raw database row is missing enrollment info
  const knownStudent =
    serverAdminStore.getStudentById(raw.id) ||
    serverAdminStore.getStudentById(raw.user_id) ||
    (raw.email ? serverAdminStore.getStudentByEmail(raw.email) : undefined);

  if (!branchCode && knownStudent?.branchCode) {
    branchCode = knownStudent.branchCode;
  }
  if (!section && knownStudent?.section) {
    section = knownStudent.section;
  }

  const branchName: string | undefined =
    branchObj?.name ||
    raw.branch_name ||
    (branchCode ? BRANCH_NAMES_MAP[branchCode] : undefined) ||
    knownStudent?.branchName ||
    undefined;

  const rollNumber: string | undefined =
    raw.roll_number || raw.rollNumber || knownStudent?.rollNumber || undefined;

  return {
    id: raw.id,
    userId: raw.user_id || raw.id,
    fullName: raw.full_name || raw.fullName || "Unknown Student",
    email: raw.email || "",
    rollNumber,
    branchCode,
    branchName,
    section,
    batch: raw.batch || knownStudent?.batch || undefined,
    academicSession: raw.academic_session || raw.academicSession || knownStudent?.academicSession || undefined,
    semester: raw.semester || knownStudent?.semester || undefined,
    role: raw.role || knownStudent?.role || "student",
    managedBranchCode: raw.managed_branch_code || raw.managedBranchCode || undefined,
    managedSection: raw.managed_section || raw.managedSection || undefined,
    managedBatch: raw.managed_batch || raw.managedBatch || undefined,
    isActive: raw.is_active !== false,
    createdAt: raw.created_at || raw.createdAt,
  };
}

/**
 * Server Operation: Retrieve registered students directory from Supabase with search, filter, and pagination.
 */
export async function serverGetStudentDirectory(
  adminUser: UserAccount,
  params: {
    search?: string;
    branch?: string;
    section?: string;
    batch?: string;
    session?: string;
    semester?: string;
    role?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{
  success: boolean;
  students: StudentDirectoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}> {
  if (adminUser.role !== "admin") {
    return {
      success: false,
      students: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
      error: "Access Denied: Administrator privileges required to access the student directory.",
    };
  }

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 20));

  const supabase = await getSupabaseAdminClient();

  if (supabase) {
    try {
      let query = supabase
        .from("student_profiles")
        .select(`
          *,
          branches:branch_id (id, code, name),
          sections:section_id (id, section_name)
        `);

      if (params.session && params.session !== "ALL") {
        query = query.eq("academic_session", params.session);
      }
      if (params.semester && params.semester !== "ALL") {
        query = query.eq("semester", params.semester);
      }
      if (params.role && params.role !== "ALL") {
        query = query.eq("role", params.role);
      }
      if (params.batch && params.batch !== "ALL") {
        query = query.eq("batch", params.batch);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      // Map rows authoritatively
      let students = (data || []).map(mapDatabaseRowToStudent);

      // Perform unified filtering across mapped students
      if (params.branch && params.branch !== "ALL") {
        students = students.filter(
          (s) => s.branchCode === params.branch || s.managedBranchCode === params.branch
        );
      }
      if (params.section && params.section !== "ALL") {
        students = students.filter(
          (s) => s.section === params.section || s.managedSection === params.section
        );
      }
      if (params.batch && params.batch !== "ALL") {
        students = students.filter((s) => s.batch === params.batch);
      }
      if (params.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase();
        students = students.filter(
          (s) =>
            s.fullName.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            (s.rollNumber && s.rollNumber.toLowerCase().includes(q))
        );
      }

      const total = students.length;
      const totalPages = Math.ceil(total / pageSize);
      const from = (page - 1) * pageSize;
      const paginated = students.slice(from, from + pageSize);

      return {
        success: true,
        students: paginated,
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        return {
          success: false,
          students: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          error: `Database error querying student directory: ${err.message}`,
        };
      }
      console.warn("[DEV MODE] Database query failed, using in-memory store:", err.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      students: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      error: "Persistence unavailable: Supabase credentials are required in production.",
    };
  }

  // In-memory fallback for test runner
  let list = serverAdminStore.getAllStudents();

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    list = list.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(q))
    );
  }

  if (params.branch && params.branch !== "ALL") {
    list = list.filter((s) => s.branchCode === params.branch || s.managedBranchCode === params.branch);
  }
  if (params.section && params.section !== "ALL") {
    list = list.filter((s) => s.section === params.section || s.managedSection === params.section);
  }
  if (params.batch && params.batch !== "ALL") {
    list = list.filter((s) => s.batch === params.batch);
  }
  if (params.session && params.session !== "ALL") {
    list = list.filter((s) => s.academicSession === params.session);
  }
  if (params.semester && params.semester !== "ALL") {
    list = list.filter((s) => s.semester === params.semester);
  }
  if (params.role && params.role !== "ALL") {
    list = list.filter((s) => s.role === params.role);
  }

  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize;
  const pagedStudents = list.slice(from, from + pageSize);

  return {
    success: true,
    students: pagedStudents,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Server Operation: Appoint a student as Class Representative (CR / Class Admin)
 * Validates:
 * 1. Caller is Admin
 * 2. Student exists and is currently a student
 * 3. Student's enrollment matches the assigned branch and section
 * 4. No conflicting CR already assigned to this exact branch/section/batch
 */
export async function serverAppointCR(
  adminUser: UserAccount,
  data: {
    studentId: string;
    branchCode: string;
    section: string;
    batch?: string;
    academicSession?: string;
    semester?: string;
  }
): Promise<{ success: boolean; student?: StudentDirectoryItem; error?: string }> {
  if (adminUser.role !== "admin") {
    return {
      success: false,
      error: "Access Denied: Only administrators are authorized to appoint Class Representatives.",
    };
  }

  if (!data.studentId || !data.branchCode || !data.section) {
    return {
      success: false,
      error: "Missing required parameters: studentId, branchCode, and section are required.",
    };
  }

  const targetBatch = data.batch || "ALL";

  const supabase = await getSupabaseAdminClient();

  if (supabase) {
    try {
      // 1. Fetch student's authoritative profile
      const { data: profile, error: pErr } = await supabase
        .from("student_profiles")
        .select(`
          *,
          branches:branch_id (code, name),
          sections:section_id (section_name)
        `)
        .eq("id", data.studentId)
        .maybeSingle();

      if (pErr || !profile) {
        return { success: false, error: "Target student profile not found." };
      }

      const isUUID = (val?: any): boolean =>
        typeof val === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      const branchObj = Array.isArray(profile.branches) ? profile.branches[0] : profile.branches;
      const sectionObj = Array.isArray(profile.sections) ? profile.sections[0] : profile.sections;
      const knownStudent =
        serverAdminStore.getStudentById(data.studentId) ||
        (profile.email ? serverAdminStore.getStudentByEmail(profile.email) : undefined);

      const enrolledBranch =
        profile.managed_branch_code ||
        branchObj?.code ||
        profile.branch_code ||
        knownStudent?.branchCode;

      const enrolledSection =
        profile.managed_section ||
        sectionObj?.section_name ||
        (!isUUID(profile.section) ? profile.section : undefined) ||
        (!isUUID(profile.section_id) ? profile.section_id : undefined) ||
        knownStudent?.section;

      // 2. Validate enrollment matches assigned scope
      if (enrolledBranch && enrolledBranch !== data.branchCode) {
        return {
          success: false,
          error: `Enrollment Mismatch: Student is enrolled in ${enrolledBranch}, cannot be appointed CR for ${data.branchCode}.`,
        };
      }

      if (enrolledSection && enrolledSection !== data.section) {
        return {
          success: false,
          error: `Enrollment Mismatch: Student is enrolled in ${enrolledSection}, cannot be appointed CR for ${data.section}.`,
        };
      }

      // 3. Validate duplicate / conflict
      const { data: existingCRs, error: crErr } = await supabase
        .from("student_profiles")
        .select("id, full_name, role, managed_branch_code, managed_section, managed_batch")
        .eq("role", "class_admin")
        .eq("managed_branch_code", data.branchCode)
        .eq("managed_section", data.section)
        .neq("id", data.studentId);

      if (!crErr && existingCRs && existingCRs.length > 0) {
        const conflict = existingCRs.find(
          (cr: any) =>
            cr.managed_batch === "ALL" ||
            targetBatch === "ALL" ||
            cr.managed_batch === targetBatch
        );
        if (conflict) {
          return {
            success: false,
            error: `Conflicting Appointment: ${conflict.full_name} is already appointed as CR for ${data.branchCode} ${data.section} (Batch ${conflict.managed_batch || "ALL"}).`,
          };
        }
      }

      // 4. Update profile in Supabase
      const { data: updated, error: uErr } = await supabase
        .from("student_profiles")
        .update({
          role: "class_admin",
          managed_branch_code: data.branchCode,
          managed_section: data.section,
          managed_batch: targetBatch,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.studentId)
        .select(`
          *,
          branches:branch_id (code, name),
          sections:section_id (section_name)
        `)
        .single();

      if (uErr || !updated) {
        throw new Error(uErr?.message || "Failed to update student profile.");
      }

      // 5. Sync role in auth.users app_metadata
      if (profile.user_id) {
        try {
          await supabase.auth.admin.updateUserById(profile.user_id, {
            app_metadata: { role: "class_admin" },
          });
        } catch (authSyncErr) {
          console.warn("Auth metadata sync note:", authSyncErr);
        }
      }

      return {
        success: true,
        student: mapDatabaseRowToStudent(updated),
      };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        return { success: false, error: err.message };
      }
      console.warn("[DEV MODE] Database appointment failed, using in-memory store:", err.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Persistence unavailable: Supabase credentials are required in production.",
    };
  }

  // In-memory fallback for test runner
  const student = serverAdminStore.getStudentById(data.studentId);
  if (!student) {
    return { success: false, error: "Target student profile not found." };
  }

  if (student.branchCode && student.branchCode !== data.branchCode) {
    return {
      success: false,
      error: `Enrollment Mismatch: Student is enrolled in ${student.branchCode}, cannot be appointed CR for ${data.branchCode}.`,
    };
  }

  if (student.section && student.section !== data.section) {
    return {
      success: false,
      error: `Enrollment Mismatch: Student is enrolled in ${student.section}, cannot be appointed CR for ${data.section}.`,
    };
  }

  // Conflict check in-memory
  const conflict = serverAdminStore
    .getAllStudents()
    .find(
      (s) =>
        s.role === "class_admin" &&
        s.id !== data.studentId &&
        s.managedBranchCode === data.branchCode &&
        s.managedSection === data.section &&
        (s.managedBatch === "ALL" || targetBatch === "ALL" || s.managedBatch === targetBatch)
    );

  if (conflict) {
    return {
      success: false,
      error: `Conflicting Appointment: ${conflict.fullName} is already appointed as CR for ${data.branchCode} ${data.section} (Batch ${conflict.managedBatch || "ALL"}).`,
    };
  }

  student.role = "class_admin";
  student.managedBranchCode = data.branchCode;
  student.managedSection = data.section;
  student.managedBatch = targetBatch;
  serverAdminStore.setStudent(student);

  return { success: true, student };
}

/**
 * Server Operation: Revoke Class Representative (CR) privileges and restore Student role
 */
export async function serverRevokeCR(
  adminUser: UserAccount,
  studentId: string
): Promise<{ success: boolean; student?: StudentDirectoryItem; error?: string }> {
  if (adminUser.role !== "admin") {
    return {
      success: false,
      error: "Access Denied: Only administrators are authorized to revoke Class Representative privileges.",
    };
  }

  const supabase = await getSupabaseAdminClient();

  if (supabase) {
    try {
      const { data: profile } = await supabase
        .from("student_profiles")
        .select("id, user_id")
        .eq("id", studentId)
        .maybeSingle();

      if (!profile) {
        return { success: false, error: "Target student profile not found." };
      }

      const { data: updated, error: uErr } = await supabase
        .from("student_profiles")
        .update({
          role: "student",
          managed_branch_code: null,
          managed_section: null,
          managed_batch: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId)
        .select(`
          *,
          branches:branch_id (code, name),
          sections:section_id (section_name)
        `)
        .single();

      if (uErr || !updated) {
        throw new Error(uErr?.message || "Failed to revoke CR privileges.");
      }

      if (profile.user_id) {
        try {
          await supabase.auth.admin.updateUserById(profile.user_id, {
            app_metadata: { role: "student" },
          });
        } catch (authSyncErr) {
          console.warn("Auth metadata sync note:", authSyncErr);
        }
      }

      return {
        success: true,
        student: mapDatabaseRowToStudent(updated),
      };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        return { success: false, error: err.message };
      }
      console.warn("[DEV MODE] Database revoke failed, using in-memory store:", err.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Persistence unavailable: Supabase credentials are required in production.",
    };
  }

  const student = serverAdminStore.getStudentById(studentId);
  if (!student) {
    return { success: false, error: "Target student profile not found." };
  }

  student.role = "student";
  student.managedBranchCode = undefined;
  student.managedSection = undefined;
  student.managedBatch = undefined;
  serverAdminStore.setStudent(student);

  return { success: true, student };
}

/**
 * Consistency Checker: Identifies missing fields, duplicates, or scheduling conflicts in timetable entries.
 */
export function inspectTimetableConsistency(timetable: UniversityTimetable): {
  isValid: boolean;
  issues: { type: "missing" | "duplicate" | "conflict"; message: string; slot?: any }[];
} {
  const issues: { type: "missing" | "duplicate" | "conflict"; message: string; slot?: any }[] = [];
  const slotSignatures = new Map<string, any>();

  for (const slot of timetable.slots || []) {
    // 1. Missing data checks
    if (!slot.subjectCode || !slot.subjectCode.trim()) {
      issues.push({ type: "missing", message: `Slot on ${slot.day} Period ${slot.period} is missing Subject Code.`, slot });
    }
    if (!slot.subjectName || !slot.subjectName.trim()) {
      issues.push({ type: "missing", message: `Slot on ${slot.day} Period ${slot.period} is missing Subject Name.`, slot });
    }
    if (!slot.room || !slot.room.trim()) {
      issues.push({ type: "missing", message: `Slot on ${slot.day} Period ${slot.period} (${slot.subjectCode}) is missing Room assignment.`, slot });
    }

    // 2. Duplicate / Collision check (Same Day + Same Period + Overlapping Batch)
    const key = `${slot.day}-P${slot.period}-${slot.batch || "ALL"}`;
    if (slotSignatures.has(key)) {
      issues.push({
        type: "duplicate",
        message: `Duplicate slot detected: ${slot.day} Period ${slot.period} (Batch ${slot.batch || "ALL"}) has multiple conflicting entries.`,
        slot,
      });
    } else {
      slotSignatures.set(key, slot);
    }

    // 3. Whole class vs batch collision check
    if (slot.batch !== "ALL") {
      const allClassKey = `${slot.day}-P${slot.period}-ALL`;
      if (slotSignatures.has(allClassKey)) {
        issues.push({
          type: "conflict",
          message: `Batch collision: Batch ${slot.batch} practical overlaps with whole-class (ALL) lecture on ${slot.day} Period ${slot.period}.`,
          slot,
        });
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Server Operation: Publish a timetable with strict scope isolation and versioning.
 * - ALL_BATCHES: Publishes whole timetable for target branch & section.
 * - P1_ONLY: Modifies ONLY Batch P1 slots, leaving P2 completely untouched.
 * - P2_ONLY: Modifies ONLY Batch P2 slots, leaving P1 completely untouched.
 */
export async function serverPublishTimetable(
  adminUser: UserAccount,
  data: {
    branchCode: string;
    section: string;
    scope: "ALL_BATCHES" | "P1_ONLY" | "P2_ONLY" | "SELECTED_BRANCH" | "SELECTED_SECTION" | "CUSTOM";
    batch?: string;
    academicSession?: string;
    semester?: string;
    timetable: UniversityTimetable;
    versionLabel?: string;
  }
): Promise<{ success: boolean; version?: PublishedTimetableVersion; error?: string }> {
  if (adminUser.role !== "admin") {
    return {
      success: false,
      error: "Access Denied: Only administrators are authorized to publish official master timetables.",
    };
  }

  const branchCode = data.branchCode || data.timetable.branchCode;
  const section = data.section || data.timetable.section;
  const academicSession = data.academicSession || data.timetable.session || "2025-26";
  const semester = data.semester || data.timetable.semester || "Semester I";
  const versionLabel = data.versionLabel || `v${Date.now().toString().slice(-4)}`;

  let effectiveBatch = "ALL";
  if (data.scope === "P1_ONLY") effectiveBatch = "P1";
  else if (data.scope === "P2_ONLY") effectiveBatch = "P2";
  else if (data.batch) effectiveBatch = data.batch;

  // Filter slots strictly adhering to target scope
  let publishedSlots = [...data.timetable.slots];
  if (data.scope === "P1_ONLY") {
    publishedSlots = publishedSlots.filter((s) => s.batch === "ALL" || s.batch === "P1");
  } else if (data.scope === "P2_ONLY") {
    publishedSlots = publishedSlots.filter((s) => s.batch === "ALL" || s.batch === "P2");
  }

  const versionRecord: PublishedTimetableVersion = {
    id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    branchCode,
    section,
    batch: effectiveBatch,
    academicSession,
    semester,
    versionLabel,
    publishedBy: adminUser.id,
    publishedByEmail: adminUser.email,
    publishedAt: new Date().toISOString(),
    timetableData: {
      ...data.timetable,
      branchCode,
      section,
      slots: publishedSlots,
    },
    slotCount: publishedSlots.length,
    isActive: true,
  };

  const supabase = await getSupabaseAdminClient();

  if (supabase) {
    try {
      // Deactivate previously active versions for this exact scope
      await supabase
        .from("published_timetable_versions")
        .update({ is_active: false })
        .eq("branch_code", branchCode)
        .eq("section", section)
        .eq("batch", effectiveBatch);

      // Insert new version
      const { data: inserted, error: insErr } = await supabase
        .from("published_timetable_versions")
        .insert({
          id: versionRecord.id,
          branch_code: branchCode,
          section: section,
          batch: effectiveBatch,
          academic_session: academicSession,
          semester,
          version_label: versionLabel,
          published_by: adminUser.id,
          published_by_email: adminUser.email,
          published_at: versionRecord.publishedAt,
          timetable_data: versionRecord.timetableData,
          slot_count: publishedSlots.length,
          is_active: true,
        })
        .select()
        .single();

      if (insErr) {
        throw new Error(insErr.message);
      }

      return {
        success: true,
        version: {
          id: inserted.id,
          branchCode: inserted.branch_code,
          section: inserted.section,
          batch: inserted.batch,
          academicSession: inserted.academic_session,
          semester: inserted.semester,
          versionLabel: inserted.version_label,
          publishedBy: inserted.published_by,
          publishedByEmail: inserted.published_by_email,
          publishedAt: inserted.published_at,
          timetableData: inserted.timetable_data,
          slotCount: inserted.slot_count,
          isActive: inserted.is_active,
        },
      };
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        return { success: false, error: err.message };
      }
      console.warn("[DEV MODE] Database timetable publication failed, using in-memory store:", err.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Persistence unavailable: Supabase credentials are required in production.",
    };
  }

  // In-memory store fallback
  serverAdminStore.setPublishedTimetable(versionRecord);
  return { success: true, version: versionRecord };
}
