"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UNIVERSITY_DATABASE,
  UniversityTimetable,
  getSectionsForBranch,
  getAllBranches,
} from "@/data/extractedTimetables";
import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { UserAccount, StudentDirectoryItem } from "@/types";
import AdminSidebar, { AdminTab } from "@/components/admin/AdminSidebar";
import AdminTopBar from "@/components/admin/AdminTopBar";
import AdminOverviewView from "@/components/admin/AdminOverviewView";
import AdminStudentManagementView from "@/components/admin/AdminStudentManagementView";
import AdminTimetableManagementView from "@/components/admin/AdminTimetableManagementView";
import AdminClassManagementView from "@/components/admin/AdminClassManagementView";
import AdminCRsView from "@/components/admin/AdminCRsView";
import AdminAnnouncementsView from "@/components/admin/AdminAnnouncementsView";
import AdminPollsView from "@/components/admin/AdminPollsView";
import AdminCancellationsView from "@/components/admin/AdminCancellationsView";
import AdminSettingsView from "@/components/admin/AdminSettingsView";
import {
  CheckCircle,
  X,
  UserCheck,
  UserMinus,
  KeyRound,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function AdminPanelPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTab, setCurrentTab] = useState<AdminTab>("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Live aggregated stats
  const [stats, setStats] = useState({
    totalStudents: 1189,
    totalCRs: 0,
    totalAnnouncements: 0,
    totalPolls: 0,
    activePolls: 0,
    totalCancellations: 0,
    pendingCancellations: 0,
    totalTimetables: UNIVERSITY_DATABASE.timetables.length,
  });

  // --- Student Directory State ---
  const [students, setStudents] = useState<StudentDirectoryItem[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBranch, setFilterBranch] = useState("ALL");
  const [filterSection, setFilterSection] = useState("ALL");
  const [filterBatch, setFilterBatch] = useState("ALL");
  const [filterAcademicYear, setFilterAcademicYear] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSession, setFilterSession] = useState("ALL");
  const [filterSemester, setFilterSemester] = useState("ALL");
  const [filterRole, setFilterRole] = useState("ALL");

  // CR Appointment Modal State
  const [appointModalOpen, setAppointModalOpen] = useState(false);
  const [selectedStudentForCR, setSelectedStudentForCR] = useState<StudentDirectoryItem | null>(null);
  const [crScopeBranch, setCrScopeBranch] = useState("IT");
  const [crScopeSection, setCrScopeSection] = useState("SEC-B");
  const [crScopeBatch, setCrScopeBatch] = useState("ALL");
  const [crScopeSession, setCrScopeSession] = useState("2026-27");
  const [crScopeSemester, setCrScopeSemester] = useState("Semester I");
  const [appointSubmitting, setAppointSubmitting] = useState(false);
  const [appointError, setAppointError] = useState<string | null>(null);

  // CR Revocation Modal State
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [studentToRevoke, setStudentToRevoke] = useState<StudentDirectoryItem | null>(null);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);

  // Password reset modal state for admin
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetStudent, setResetTargetStudent] = useState<StudentDirectoryItem | null>(null);
  const [resetTempPassword, setResetTempPassword] = useState("");
  const [resetIsSubmitting, setResetIsSubmitting] = useState(false);
  const [resetGeneratedPass, setResetGeneratedPass] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // Toast State
  const [adminActionToast, setAdminActionToast] = useState<string | null>(null);

  // Timetables master list
  const [timetables] = useState<UniversityTimetable[]>(UNIVERSITY_DATABASE.timetables);

  // Fetch Student Directory
  const fetchStudents = async () => {
    setIsStudentsLoading(true);
    setStudentsError(null);
    const token = getSessionToken();

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (filterBranch !== "ALL") params.append("branch", filterBranch);
      if (filterSection !== "ALL") params.append("section", filterSection);
      if (filterBatch !== "ALL") params.append("batch", filterBatch);
      if (filterAcademicYear !== "ALL") params.append("academicYear", filterAcademicYear);
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      if (filterSession !== "ALL") params.append("session", filterSession);
      if (filterSemester !== "ALL") params.append("semester", filterSemester);
      if (filterRole !== "ALL") params.append("role", filterRole);
      params.append("page", String(currentPage));
      params.append("pageSize", String(pageSize));

      const res = await fetch(`/api/admin/students?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStudents(data.students);
        setTotalStudents(data.total);
        setTotalPages(data.totalPages || 1);
      } else {
        setStudentsError(data.error || "Failed to load student directory.");
      }
    } catch {
      setStudentsError("Network error: Unable to connect to student directory service.");
    } finally {
      setIsStudentsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getSessionToken();
      const res = await fetch("/api/admin/stats", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (e) {
      console.warn("Failed to load admin stats:", e);
    }
  };

  const handleOpenResetModal = (student: StudentDirectoryItem) => {
    setResetTargetStudent(student);
    setResetTempPassword("");
    setResetGeneratedPass(null);
    setResetError(null);
    setIsResetModalOpen(true);
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetStudent) return;
    setResetIsSubmitting(true);
    setResetError(null);
    try {
      const token = getSessionToken();
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetStudentIdentifier: resetTargetStudent.rollNumber || resetTargetStudent.email,
          temporaryPassword: resetTempPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetGeneratedPass(data.temporaryPassword);
        setAdminActionToast(`Password reset issued for ${resetTargetStudent.fullName}`);
        setTimeout(() => setAdminActionToast(null), 4000);
      } else {
        setResetError(data.error || "Failed to reset password.");
      }
    } catch {
      setResetError("Network error issuing password reset.");
    } finally {
      setResetIsSubmitting(false);
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    const token = getSessionToken();

    if (!user || !token) {
      router.replace("/admin/login");
      return;
    }

    if (user.role !== "admin") {
      router.replace("/");
      return;
    }

    setCurrentUser(user);

    // Read initial tab from URL if present
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = urlParams.get("tab") as AdminTab;
      if (
        urlTab &&
        [
          "overview",
          "students",
          "crs",
          "timetables",
          "classes",
          "announcements",
          "polls",
          "cancellations",
          "settings",
        ].includes(urlTab)
      ) {
        setCurrentTab(urlTab);
      }
    }

    setIsLoaded(true);

    // Verify session authoritatively on server
    fetch("/api/admin/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          router.replace("/admin/login");
        }
      })
      .catch(() => {});

    fetchStats();
  }, [router]);

  useEffect(() => {
    if (isLoaded && currentUser?.role === "admin") {
      fetchStudents();
    }
  }, [
    isLoaded,
    currentPage,
    pageSize,
    filterBranch,
    filterSection,
    filterBatch,
    filterAcademicYear,
    filterStatus,
    filterSession,
    filterSemester,
    filterRole,
    searchQuery,
  ]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterBranch("ALL");
    setFilterSection("ALL");
    setFilterBatch("ALL");
    setFilterAcademicYear("ALL");
    setFilterStatus("ALL");
    setFilterSession("ALL");
    setFilterSemester("ALL");
    setFilterRole("ALL");
    setCurrentPage(1);
  };

  const handleCRBranchChange = (newBranch: string) => {
    setCrScopeBranch(newBranch);
    const validSections = getSectionsForBranch(newBranch);
    if (!validSections.includes(crScopeSection)) {
      setCrScopeSection(validSections[0] || "SEC-A");
    }
  };

  const openAppointModal = (student: StudentDirectoryItem) => {
    setSelectedStudentForCR(student);
    const defaultBranch = student.branchCode || "IT";
    setCrScopeBranch(defaultBranch);
    const validSections = getSectionsForBranch(defaultBranch);
    const defaultSection =
      student.section && validSections.includes(student.section)
        ? student.section
        : validSections[0] || "SEC-A";
    setCrScopeSection(defaultSection);
    setCrScopeBatch(student.batch || "ALL");
    setCrScopeSession(student.academicSession || "2026-27");
    setCrScopeSemester(student.semester || "Semester I");
    setAppointError(null);
    setAppointModalOpen(true);
  };

  const handleConfirmAppointCR = async () => {
    if (!selectedStudentForCR) return;
    setAppointSubmitting(true);
    setAppointError(null);

    const token = getSessionToken();
    try {
      const res = await fetch("/api/admin/cr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          studentId: selectedStudentForCR.id,
          branchCode: crScopeBranch,
          section: crScopeSection,
          batch: crScopeBatch,
          academicSession: crScopeSession,
          semester: crScopeSemester,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAppointModalOpen(false);
        setAdminActionToast(
          `Appointed ${selectedStudentForCR.fullName} as Class Representative for ${crScopeBranch} ${crScopeSection} (${crScopeBatch})!`
        );
        setTimeout(() => setAdminActionToast(null), 4000);
        await fetchStudents();
        await fetchStats();
      } else {
        setAppointError(data.error || "Failed to appoint student as Class Representative.");
      }
    } catch {
      setAppointError("Network error: Unable to submit appointment.");
    } finally {
      setAppointSubmitting(false);
    }
  };

  const openRevokeModal = (student: StudentDirectoryItem) => {
    setStudentToRevoke(student);
    setRevokeModalOpen(true);
  };

  const handleConfirmRevokeCR = async () => {
    if (!studentToRevoke) return;
    setRevokeSubmitting(true);

    const token = getSessionToken();
    try {
      const res = await fetch(`/api/admin/cr?studentId=${studentToRevoke.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setRevokeModalOpen(false);
        setAdminActionToast(
          `Revoked Class Representative privileges for ${studentToRevoke.fullName}. Student role restored.`
        );
        setTimeout(() => setAdminActionToast(null), 4000);
        await fetchStudents();
        await fetchStats();
      } else {
        alert(data.error || "Failed to revoke Class Representative privileges.");
      }
    } catch {
      alert("Network error: Unable to revoke Class Representative.");
    } finally {
      setRevokeSubmitting(false);
    }
  };

  if (!isLoaded || !currentUser) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans">
      <AdminSidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentUser={currentUser}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        stats={stats}
      />

      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <AdminTopBar
          currentTab={currentTab}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
          onRefresh={() => {
            fetchStats();
            if (currentTab === "students") fetchStudents();
          }}
          isRefreshing={isStudentsLoading}
          currentUser={currentUser}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {adminActionToast && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-2xl text-xs font-bold text-emerald-300 flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{adminActionToast}</span>
              </div>
              <button onClick={() => setAdminActionToast(null)} className="text-emerald-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {currentTab === "overview" && (
            <AdminOverviewView
              stats={stats}
              onNavigate={setCurrentTab}
              currentUser={currentUser}
            />
          )}

          {/* TAB 2: STUDENT REGISTRY */}
          {currentTab === "students" && (
            <AdminStudentManagementView
              students={students}
              totalStudents={totalStudents}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              isLoading={isStudentsLoading}
              error={studentsError}
              searchQuery={searchQuery}
              filterBranch={filterBranch}
              filterSection={filterSection}
              filterBatch={filterBatch}
              filterAcademicYear={filterAcademicYear}
              filterStatus={filterStatus}
              filterRole={filterRole}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              onBranchChange={(val) => {
                setFilterBranch(val);
                setCurrentPage(1);
              }}
              onSectionChange={(val) => {
                setFilterSection(val);
                setCurrentPage(1);
              }}
              onBatchChange={(val) => {
                setFilterBatch(val);
                setCurrentPage(1);
              }}
              onAcademicYearChange={(val) => {
                setFilterAcademicYear(val);
                setCurrentPage(1);
              }}
              onStatusChange={(val) => {
                setFilterStatus(val);
                setCurrentPage(1);
              }}
              onRoleChange={(val) => {
                setFilterRole(val);
                setCurrentPage(1);
              }}
              onPageChange={setCurrentPage}
              onRefresh={fetchStudents}
              onClearFilters={handleClearFilters}
              onAppointCR={openAppointModal}
              onRevokeCR={openRevokeModal}
              onResetPassword={handleOpenResetModal}
            />
          )}

          {/* TAB 3: CLASS REPRESENTATIVES */}
          {currentTab === "crs" && (
            <AdminCRsView
              onOpenAppointModal={(student) => {
                if (student) openAppointModal(student);
                else if (students.length > 0) openAppointModal(students[0]);
                else setCurrentTab("students");
              }}
              onOpenRevokeModal={(cr) => openRevokeModal(cr)}
              onRefreshStats={fetchStats}
            />
          )}

          {/* TAB 4: MASTER TIMETABLES */}
          {currentTab === "timetables" && (
            <AdminTimetableManagementView
              initialTimetables={timetables}
              onTimetableUpdated={() => {
                fetchStats();
              }}
            />
          )}

          {/* TAB 5: CLASS MANAGEMENT */}
          {currentTab === "classes" && <AdminClassManagementView />}

          {/* TAB 6: ANNOUNCEMENTS */}
          {currentTab === "announcements" && <AdminAnnouncementsView />}

          {/* TAB 7: CLASS POLLS */}
          {currentTab === "polls" && <AdminPollsView />}

          {/* TAB 8: CANCELLATIONS */}
          {currentTab === "cancellations" && <AdminCancellationsView />}

          {/* TAB 9: SETTINGS */}
          {currentTab === "settings" && <AdminSettingsView currentUser={currentUser} />}
        </main>
      </div>

      {/* MODAL 1: APPOINT CLASS REPRESENTATIVE (CR) */}
      {appointModalOpen && selectedStudentForCR && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setAppointModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-600" />
                Appoint Class Representative (CR)
              </h3>
              <button onClick={() => setAppointModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700 text-xs space-y-2">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Existing Student Enrollment
              </div>
              <div className="grid grid-cols-2 gap-2 font-medium">
                <div>
                  <span className="text-zinc-400">Name:</span> <span className="font-bold">{selectedStudentForCR.fullName}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Roll:</span> <span className="font-mono">{selectedStudentForCR.rollNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Enrolled Class:</span>{" "}
                  <span className="font-bold text-indigo-600">
                    {selectedStudentForCR.branchCode || "Unassigned"} {selectedStudentForCR.section || ""}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">Enrolled Batch:</span>{" "}
                  <span className="font-mono font-bold">{selectedStudentForCR.batch || "P1"}</span>
                </div>
              </div>
            </div>

            {appointError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
                {appointError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Assign Class Admin Management Scope
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Managed Branch</label>
                  <select
                    value={crScopeBranch}
                    onChange={(e) => handleCRBranchChange(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                  >
                    {getAllBranches().map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Managed Section</label>
                  <select
                    value={crScopeSection}
                    onChange={(e) => setCrScopeSection(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                  >
                    {getSectionsForBranch(crScopeBranch).map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Managed Batch</label>
                  <select
                    value={crScopeBatch}
                    onChange={(e) => setCrScopeBatch(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                  >
                    <option value="ALL">Entire Section (ALL)</option>
                    <option value="P1">Batch P1 Only</option>
                    <option value="P2">Batch P2 Only</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Academic Session</label>
                  <input
                    type="text"
                    value={crScopeSession}
                    onChange={(e) => setCrScopeSession(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setAppointModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={appointSubmitting}
                onClick={handleConfirmAppointCR}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl shadow-xs"
              >
                {appointSubmitting ? "Appointing..." : "Confirm CR Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REVOKE CLASS REPRESENTATIVE (CR) */}
      {revokeModalOpen && studentToRevoke && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setRevokeModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 text-rose-600">
                <UserMinus className="w-4 h-4" />
                Revoke Class Representative Privileges
              </h3>
              <button onClick={() => setRevokeModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to revoke Class Representative privileges for{" "}
              <span className="font-bold text-zinc-900 dark:text-white">{studentToRevoke.fullName}</span>?
              They will be returned to an ordinary student role with zero management scope.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setRevokeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={revokeSubmitting}
                onClick={handleConfirmRevokeCR}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-xl shadow-xs"
              >
                {revokeSubmitting ? "Revoking..." : "Confirm Revocation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADMIN STUDENT PASSWORD RESET */}
      {isResetModalOpen && resetTargetStudent && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsResetModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        >
          <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reset Student Password</h3>
                  <p className="text-[11px] text-zinc-400">Issue temporary credential</p>
                </div>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/60 space-y-1 text-xs">
              <div className="text-zinc-400 font-semibold text-[11px]">Target Account</div>
              <div className="font-bold text-white">{resetTargetStudent.fullName}</div>
              <div className="font-mono text-[11px] text-indigo-400">
                Roll: {resetTargetStudent.rollNumber || "—"} &bull; {resetTargetStudent.email}
              </div>
            </div>

            {resetError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs font-semibold text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{resetError}</span>
              </div>
            )}

            {resetGeneratedPass ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Temporary Password Issued Successfully</span>
                </div>
                <div className="p-3 bg-zinc-950 rounded-xl font-mono text-center text-sm font-bold text-white border border-emerald-500/30 select-all">
                  {resetGeneratedPass}
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Provide this credential to the student. They will be required to choose a new password upon their first login.
                </p>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="w-full mt-2 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleExecuteResetPassword} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">
                    Custom Temporary Password (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Leave blank to auto-generate random credential"
                    value={resetTempPassword}
                    onChange={(e) => setResetTempPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    If blank, a cryptographically secure random password will be created.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetIsSubmitting}
                    className="px-4 py-2 rounded-xl text-white bg-amber-600 hover:bg-amber-500 font-bold shadow-md shadow-amber-600/30 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {resetIsSubmitting ? "Issuing Reset..." : "Reset Student Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
