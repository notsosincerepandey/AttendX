"use client";

import React, { useState, useEffect } from "react";
import {
  UNIVERSITY_DATABASE,
  UniversityTimetable,
  TimetableSlot,
  getSectionsForBranch,
  getAllBranches,
  BRANCH_NAMES_MAP,
} from "@/data/extractedTimetables";
import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { UserAccount, StudentDirectoryItem, PublishedTimetableVersion } from "@/types";
import { inspectTimetableConsistency } from "@/lib/serverAdmin";
import Link from "next/link";
import {
  ShieldAlert,
  Upload,
  CheckCircle,
  FileText,
  Search,
  Filter,
  Eye,
  Edit,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Layers,
  Lock,
  ArrowRight,
  Users,
  UserCheck,
  UserMinus,
  Sparkles,
  RefreshCw,
  X,
  AlertCircle,
  Calendar,
  Check,
  BookOpen,
} from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [
  { period: 1, name: "I", time: "9:10 - 10:00" },
  { period: 2, name: "II", time: "10:00 - 10:50" },
  { period: 3, name: "III", time: "10:50 - 11:40" },
  { period: 4, name: "IV", time: "11:40 - 12:30" },
  // Lunch Break is 12:30 - 2:00
  { period: 5, name: "V", time: "2:00 - 2:45" },
  { period: 6, name: "VI", time: "2:45 - 3:30" },
  { period: 7, name: "VII", time: "3:30 - 4:15" },
  { period: 8, name: "VIII", time: "4:15 - 5:00" },
];

export default function AdminPanelPage() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [adminTab, setAdminTab] = useState<"students" | "timetables">("students");

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
  const [filterSession, setFilterSession] = useState("ALL");
  const [filterSemester, setFilterSemester] = useState("ALL");
  const [filterRole, setFilterRole] = useState("ALL");

  // CR Appointment Modal State
  const [appointModalOpen, setAppointModalOpen] = useState(false);
  const [selectedStudentForCR, setSelectedStudentForCR] = useState<StudentDirectoryItem | null>(null);
  const [crScopeBranch, setCrScopeBranch] = useState("IT");
  const [crScopeSection, setCrScopeSection] = useState("SEC-B");
  const [crScopeBatch, setCrScopeBatch] = useState("ALL");
  const [crScopeSession, setCrScopeSession] = useState("2025-26");
  const [crScopeSemester, setCrScopeSemester] = useState("Semester I");
  const [appointSubmitting, setAppointSubmitting] = useState(false);
  const [appointError, setAppointError] = useState<string | null>(null);

  // CR Revocation Modal State
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [studentToRevoke, setStudentToRevoke] = useState<StudentDirectoryItem | null>(null);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);

  // Toast State
  const [adminActionToast, setAdminActionToast] = useState<string | null>(null);

  // --- Timetable Management Centre State ---
  const [timetables, setTimetables] = useState<UniversityTimetable[]>(UNIVERSITY_DATABASE.timetables);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>(
    UNIVERSITY_DATABASE.timetables[0]?.id || ""
  );
  const [timetableSearch, setTimetableSearch] = useState("");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("ALL");
  const [selectedBatchView, setSelectedBatchView] = useState<string>("ALL");

  // Consistency & Conflicts
  const [consistencyResult, setConsistencyResult] = useState<{
    isValid: boolean;
    issues: { type: "missing" | "duplicate" | "conflict"; message: string; slot?: any }[];
  } | null>(null);

  // Edit / Add Slot Modal
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [slotDay, setSlotDay] = useState("Monday");
  const [slotPeriod, setSlotPeriod] = useState(1);
  const [slotSubjectCode, setSlotSubjectCode] = useState("");
  const [slotSubjectName, setSlotSubjectName] = useState("");
  const [slotCategory, setSlotCategory] = useState<"Theory" | "Lab" | "Tutorial">("Theory");
  const [slotBatch, setSlotBatch] = useState("ALL");
  const [slotRoom, setSlotRoom] = useState("");
  const [slotFaculty, setSlotFaculty] = useState("");

  // Publish Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishScope, setPublishScope] = useState<
    "ALL_BATCHES" | "P1_ONLY" | "P2_ONLY" | "SELECTED_BRANCH" | "SELECTED_SECTION" | "CUSTOM"
  >("ALL_BATCHES");
  const [publishVersionLabel, setPublishVersionLabel] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccessBanner, setPublishSuccessBanner] = useState<string | null>(null);

  // Published Versions History
  const [publishedVersions, setPublishedVersions] = useState<PublishedTimetableVersion[]>([]);

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
    } catch (err: any) {
      setStudentsError("Network error: Unable to connect to student directory service.");
    } finally {
      setIsStudentsLoading(false);
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    // Read initial tab from URL if present
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("tab") === "timetables") {
        setAdminTab("timetables");
      }
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded && currentUser?.role === "admin") {
      fetchStudents();
    }
  }, [
    isLoaded,
    currentUser,
    currentPage,
    pageSize,
    filterBranch,
    filterSection,
    filterBatch,
    filterSession,
    filterSemester,
    filterRole,
  ]);

  const selectedTimetable =
    timetables.find((t) => t.id === selectedTimetableId) || timetables[0];

  // Run consistency check on selected timetable
  const runConsistencyCheck = () => {
    if (!selectedTimetable) return;
    const result = inspectTimetableConsistency(selectedTimetable);
    setConsistencyResult(result);
  };

  // Change branch in directory filter and clear invalid section
  const handleFilterBranchChange = (newBranch: string) => {
    setFilterBranch(newBranch);
    const validSections = getSectionsForBranch(newBranch);
    if (filterSection !== "ALL" && !validSections.includes(filterSection)) {
      setFilterSection("ALL");
    }
    setCurrentPage(1);
  };

  // Change branch in CR modal and refresh available sections
  const handleCRBranchChange = (newBranch: string) => {
    setCrScopeBranch(newBranch);
    const validSections = getSectionsForBranch(newBranch);
    if (!validSections.includes(crScopeSection)) {
      setCrScopeSection(validSections[0] || "SEC-A");
    }
  };

  // Open Appoint Modal
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
    setCrScopeSession(student.academicSession || "2025-26");
    setCrScopeSemester(student.semester || "Semester I");
    setAppointError(null);
    setAppointModalOpen(true);
  };

  // Handle Appoint CR submission
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
        setAdminActionToast(`Appointed ${selectedStudentForCR.fullName} as Class Representative for ${crScopeBranch} ${crScopeSection} (${crScopeBatch})!`);
        setTimeout(() => setAdminActionToast(null), 4000);
        await fetchStudents();
      } else {
        setAppointError(data.error || "Failed to appoint student as Class Representative.");
      }
    } catch (err: any) {
      setAppointError("Network error: Unable to submit appointment.");
    } finally {
      setAppointSubmitting(false);
    }
  };

  // Open Revoke Modal
  const openRevokeModal = (student: StudentDirectoryItem) => {
    setStudentToRevoke(student);
    setRevokeModalOpen(true);
  };

  // Handle Revoke CR submission
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
        setAdminActionToast(`Revoked Class Representative privileges for ${studentToRevoke.fullName}. Student role restored.`);
        setTimeout(() => setAdminActionToast(null), 4000);
        await fetchStudents();
      } else {
        alert(data.error || "Failed to revoke Class Representative privileges.");
      }
    } catch (err: any) {
      alert("Network error: Unable to revoke Class Representative.");
    } finally {
      setRevokeSubmitting(false);
    }
  };

  // Clear all directory filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterBranch("ALL");
    setFilterSection("ALL");
    setFilterBatch("ALL");
    setFilterSession("ALL");
    setFilterSemester("ALL");
    setFilterRole("ALL");
    setCurrentPage(1);
  };

  // Open Add Slot modal for a specific day and period
  const openAddSlot = (day: string, period: number) => {
    if (!selectedTimetable) return;
    setEditingSlotIndex(null);
    setSlotDay(day);
    setSlotPeriod(period);
    const defaultSub = selectedTimetable.subjects[0];
    setSlotSubjectCode(defaultSub ? defaultSub.code : "");
    setSlotSubjectName(defaultSub ? defaultSub.name : "");
    setSlotCategory("Theory");
    setSlotBatch(selectedBatchView !== "ALL" ? selectedBatchView : "ALL");
    setSlotRoom(selectedTimetable.room);
    setSlotFaculty("");
    setIsSlotModalOpen(true);
  };

  // Open Edit Slot modal for an existing slot
  const openEditSlot = (slot: TimetableSlot, index: number) => {
    setEditingSlotIndex(index);
    setSlotDay(slot.day);
    setSlotPeriod(slot.period);
    setSlotSubjectCode(slot.subjectCode);
    setSlotSubjectName(slot.subjectName);
    setSlotCategory(slot.category);
    setSlotBatch(slot.batch);
    setSlotRoom(slot.room);
    setSlotFaculty(slot.faculty || "");
    setIsSlotModalOpen(true);
  };

  // Delete Slot with confirmation
  const handleDeleteSlot = () => {
    if (editingSlotIndex === null || !selectedTimetable) return;
    if (confirm("Are you sure you want to delete this timetable slot?")) {
      const updatedSlots = [...selectedTimetable.slots];
      updatedSlots.splice(editingSlotIndex, 1);
      const updatedTimetables = timetables.map((t) =>
        t.id === selectedTimetable.id ? { ...t, slots: updatedSlots } : t
      );
      setTimetables(updatedTimetables);
      setIsSlotModalOpen(false);
      setConsistencyResult(null);
    }
  };

  // Handle Timetable Slot Save
  const handleSaveSlot = () => {
    if (!selectedTimetable) return;
    if (!slotSubjectCode.trim() || !slotSubjectName.trim() || !slotRoom.trim()) {
      alert("Please fill all required slot details (Subject Code, Subject Name, and Room).");
      return;
    }

    const newSlot: TimetableSlot = {
      day: slotDay,
      period: slotPeriod,
      subjectCode: slotSubjectCode.trim(),
      subjectName: slotSubjectName.trim(),
      category: slotCategory,
      batch: slotBatch,
      room: slotRoom.trim(),
      faculty: slotFaculty.trim() || undefined,
    };

    const updatedSlots = [...selectedTimetable.slots];
    if (editingSlotIndex !== null) {
      updatedSlots[editingSlotIndex] = newSlot;
    } else {
      updatedSlots.push(newSlot);
    }

    const updatedTimetables = timetables.map((t) =>
      t.id === selectedTimetable.id ? { ...t, slots: updatedSlots } : t
    );
    setTimetables(updatedTimetables);
    setIsSlotModalOpen(false);
    setConsistencyResult(null); // re-evaluate on next check
  };

  // Handle Timetable Publish
  const handleConfirmPublishTimetable = async () => {
    if (!selectedTimetable || !currentUser) return;
    setIsPublishing(true);

    const token = getSessionToken();
    try {
      const res = await fetch("/api/admin/timetable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          branchCode: selectedTimetable.branchCode,
          section: selectedTimetable.section,
          scope: publishScope,
          timetable: selectedTimetable,
          versionLabel: publishVersionLabel.trim() || `v${Date.now().toString().slice(-4)}`,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIsPublishModalOpen(false);
        setPublishSuccessBanner(data.message);
        setTimeout(() => setPublishSuccessBanner(null), 5000);
        if (data.version) {
          setPublishedVersions((prev) => [data.version, ...prev]);
        }
      } else {
        alert(data.error || "Failed to publish timetable.");
      }
    } catch {
      alert("Network error: Unable to publish timetable.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Strict Server-Role Guard: Exactly ONE Admin
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">
          Access Restricted: Administrator Privileges Required
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
          The central student directory, Class CR appointments, and master timetable publication are restricted to the primary AttendX administrator account (<span className="font-mono font-bold text-indigo-600">admin@attendx.ac.in</span>).
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition-all"
          >
            Switch to Administrator Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Filtered timetable list for left sidebar
  const filteredTimetableSheets = timetables.filter((t) => {
    if (!timetableSearch) return true;
    const q = timetableSearch.toLowerCase();
    return (
      t.branch.toLowerCase().includes(q) ||
      t.branchCode.toLowerCase().includes(q) ||
      t.section.toLowerCase().includes(q) ||
      t.room.toLowerCase().includes(q)
    );
  });

  // Filter slots for inspection view
  const inspectedSlots = (selectedTimetable?.slots || []).filter((s) => {
    if (selectedDayFilter !== "ALL" && s.day !== selectedDayFilter) return false;
    if (selectedBatchView !== "ALL" && s.batch !== "ALL" && s.batch !== selectedBatchView) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-slate-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30 uppercase tracking-wider">
              Sole Administrator & System Owner
            </span>
            <span className="text-xs text-zinc-400">
              admin@attendx.ac.in
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-indigo-400" />
            AttendX Central Administration Portal
          </h1>
          <p className="text-xs text-zinc-300 max-w-2xl mt-1 leading-relaxed">
            Manage live student registrations, verify Class Representative (CR) appointments with scope validation, and review or publish isolated university timetables across MMMUT batches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-right">
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">System Role</div>
            <div className="text-xs font-black text-amber-300">University Administrator</div>
          </div>
        </div>
      </div>

      {adminActionToast && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          {adminActionToast}
        </div>
      )}

      {publishSuccessBanner && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
          {publishSuccessBanner}
        </div>
      )}

      {/* Main Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setAdminTab("students")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminTab === "students"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Student Directory & CR Appointments ({totalStudents})
        </button>

        <button
          onClick={() => setAdminTab("timetables")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminTab === "timetables"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Timetable Management Centre (20 Sheets)
        </button>
      </div>

      {adminTab === "students" ? (
        /* ========================================================================= */
        /* TAB 1: COMPLETE STUDENT DIRECTORY & CR MANAGEMENT                         */
        /* ========================================================================= */
        <div className="space-y-5">
          {/* Controls & Filter Bar */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by student name, email, or roll number..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchStudents();
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchStudents()}
                  disabled={isStudentsLoading}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isStudentsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Branch</label>
                <select
                  value={filterBranch}
                  onChange={(e) => handleFilterBranchChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-xs"
                >
                  <option value="ALL">All Branches</option>
                  {getAllBranches().map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Section</label>
                <select
                  value={filterSection}
                  onChange={(e) => {
                    setFilterSection(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-xs"
                >
                  <option value="ALL">All Sections</option>
                  {getSectionsForBranch(filterBranch).map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Batch</label>
                <select
                  value={filterBatch}
                  onChange={(e) => {
                    setFilterBatch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-xs"
                >
                  <option value="ALL">All Batches</option>
                  <option value="P1">Batch P1</option>
                  <option value="P2">Batch P2</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Session</label>
                <select
                  value={filterSession}
                  onChange={(e) => {
                    setFilterSession(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-xs"
                >
                  <option value="ALL">All Sessions</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2024-25">2024-25</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Semester</label>
                <select
                  value={filterSemester}
                  onChange={(e) => {
                    setFilterSemester(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-xs"
                >
                  <option value="ALL">All Semesters</option>
                  <option value="Semester I">Semester I</option>
                  <option value="Semester II">Semester II</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => {
                    setFilterRole(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-xs"
                >
                  <option value="ALL">All Roles</option>
                  <option value="student">Student</option>
                  <option value="class_admin">Class Admin / CR</option>
                </select>
              </div>
            </div>
          </div>

          {/* Student Directory Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Official Student Directory & Role Registry
                </h3>
                <p className="text-xs text-zinc-500">
                  Authoritative student registrations fetched directly from Supabase.
                </p>
              </div>
              <div className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-xl">
                Total Registered: <span className="text-indigo-600 dark:text-indigo-400">{totalStudents}</span>
              </div>
            </div>

            {studentsError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {studentsError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-100 dark:border-zinc-800">
                  <tr>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Roll Number</th>
                    <th className="p-3.5">Branch</th>
                    <th className="p-3.5">Section</th>
                    <th className="p-3.5">Batch</th>
                    <th className="p-3.5">Session / Semester</th>
                    <th className="p-3.5">Current Role</th>
                    <th className="p-3.5">CR Scope</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {isStudentsLoading ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-zinc-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                        Loading registered student profiles from Supabase...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-zinc-500">
                        No student profiles match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => {
                      const isMainAdmin = student.role === "admin";
                      const isCR = student.role === "class_admin";

                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center text-white ${
                                  isMainAdmin
                                    ? "bg-indigo-600"
                                    : isCR
                                    ? "bg-purple-600"
                                    : "bg-zinc-600"
                                }`}
                              >
                                {student.fullName.charAt(0)}
                              </div>
                              <span>{student.fullName}</span>
                            </div>
                          </td>

                          <td className="p-3.5 font-mono text-zinc-600 dark:text-zinc-400">
                            {student.email}
                          </td>

                          <td className="p-3.5">
                            {student.rollNumber ? (
                              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                {student.rollNumber}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                                Not Registered
                              </span>
                            )}
                          </td>

                          <td className="p-3.5">
                            {student.branchCode ? (
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                {student.branchCode}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="p-3.5">
                            {student.section ? (
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                {student.section}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="p-3.5">
                            {student.batch ? (
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {student.batch}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                                Missing
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-zinc-500">
                            {student.academicSession || "2025-26"} &bull; {student.semester || "Sem I"}
                          </td>

                          <td className="p-3.5">
                            {isMainAdmin ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Main Admin
                              </span>
                            ) : isCR ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1 w-fit">
                                <Sparkles className="w-3 h-3 text-purple-600" /> Class CR
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                Student
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 font-medium">
                            {isCR ? (
                              <span className="text-purple-700 dark:text-purple-300 font-bold">
                                {student.managedBranchCode || student.branchCode} {student.managedSection || student.section} ({student.managedBatch || "ALL"})
                              </span>
                            ) : isMainAdmin ? (
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                All Classes
                              </span>
                            ) : (
                              <span className="text-zinc-400">&mdash;</span>
                            )}
                          </td>

                          <td className="p-3.5 text-right">
                            {isMainAdmin ? (
                              <span className="text-[10px] font-bold text-zinc-400 italic">
                                System Owner
                              </span>
                            ) : isCR ? (
                              <button
                                onClick={() => openRevokeModal(student)}
                                className="px-3 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 transition-colors inline-flex items-center gap-1"
                              >
                                <UserMinus className="w-3.5 h-3.5" /> Revoke CR
                              </button>
                            ) : (
                              <button
                                onClick={() => openAppointModal(student)}
                                className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-colors inline-flex items-center gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Appoint CR
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <div>
                Showing page <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentPage}</span> of{" "}
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{totalPages}</span> ({totalStudents} students)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 2: TIMETABLE MANAGEMENT CENTRE                                        */
        /* ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: 20 Timetables List */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Extracted Sheets ({filteredTimetableSheets.length})
              </h3>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                Official MMMUT
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search branch, section, room..."
                value={timetableSearch}
                onChange={(e) => setTimetableSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredTimetableSheets.map((t) => {
                const isSelected = t.id === selectedTimetable?.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTimetableId(t.id);
                      setConsistencyResult(null);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 shadow-xs"
                        : "bg-zinc-50/60 dark:bg-zinc-800/30 border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-100/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                        Page {t.pageNumber} &bull; {t.degree}
                      </span>
                      {t.isVerified && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {t.branchCode} &bull; {t.section}
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center justify-between mt-1">
                      <span>Room {t.room}</span>
                      <span>{t.slots.length} slots</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Timetable Inspection, Review, & Publishing */}
          <div className="lg:col-span-3 space-y-4">
            {selectedTimetable && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-zinc-900 dark:text-white">
                        {selectedTimetable.branch} &bull; {selectedTimetable.section}
                      </h2>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800">
                        Room: {selectedTimetable.room}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {selectedTimetable.session} &bull; {selectedTimetable.semester} &bull; Batches:{" "}
                      {selectedTimetable.batches.join(", ")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={runConsistencyCheck}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 transition-colors flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Run Consistency Check
                    </button>

                    <button
                      onClick={() => {
                        setPublishScope("ALL_BATCHES");
                        setPublishVersionLabel(`v${Date.now().toString().slice(-4)}`);
                        setIsPublishModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Publish Timetable
                    </button>
                  </div>
                </div>

                {/* Consistency Inspector Alerts */}
                {consistencyResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs leading-relaxed ${
                      consistencyResult.isValid
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                        : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      {consistencyResult.isValid ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          Zero Conflicts Detected: Timetable entries are structurally valid and conflict-free.
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          {consistencyResult.issues.length} Consistency Issue(s) Detected:
                        </>
                      )}
                    </div>
                    {!consistencyResult.isValid && (
                      <ul className="list-disc pl-5 space-y-0.5 mt-2 font-medium">
                        {consistencyResult.issues.map((issue, idx) => (
                          <li key={idx}>{issue.message}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Batch Control Strip & Add Slot */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-indigo-500" /> Batch View:
                    </span>
                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <button
                        onClick={() => setSelectedBatchView("ALL")}
                        className={`px-3 py-1 rounded-md font-bold transition-colors ${
                          selectedBatchView === "ALL"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                        }`}
                      >
                        All Batches (P1 + P2)
                      </button>
                      <button
                        onClick={() => setSelectedBatchView("P1")}
                        className={`px-3 py-1 rounded-md font-bold transition-colors ${
                          selectedBatchView === "P1"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                        }`}
                      >
                        Batch P1 Only
                      </button>
                      <button
                        onClick={() => setSelectedBatchView("P2")}
                        className={`px-3 py-1 rounded-md font-bold transition-colors ${
                          selectedBatchView === "P2"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                        }`}
                      >
                        Batch P2 Only
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500 font-medium">
                      Showing{" "}
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {
                          (selectedTimetable.slots || []).filter(
                            (s) =>
                              selectedBatchView === "ALL" ||
                              s.batch === "ALL" ||
                              s.batch === selectedBatchView
                          ).length
                        }
                      </span>{" "}
                      slots
                    </span>
                    <button
                      onClick={() => openAddSlot("Monday", 1)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Timetable Slot
                    </button>
                  </div>
                </div>

                {/* Timetable Matrix Grid (Identical to Student View) */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-x-auto">
                  <div className="min-w-[1000px]">
                    {/* Header Row: Periods */}
                    <div className="grid grid-cols-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/70 text-center text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      <div className="p-3 border-r border-zinc-200 dark:border-zinc-800">
                        Day / Period
                      </div>
                      {PERIODS.slice(0, 4).map((p) => (
                        <div key={p.period} className="p-2 border-r border-zinc-200 dark:border-zinc-800">
                          <div className="text-[11px] font-black uppercase">Period {p.name}</div>
                          <div className="text-[10px] text-zinc-400 font-normal">{p.time}</div>
                        </div>
                      ))}
                      {/* Lunch Column */}
                      <div className="p-2 bg-amber-50/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border-r border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-bold tracking-wider text-[11px]">
                        LUNCH BREAK (12:30-2:00)
                      </div>
                      {PERIODS.slice(4).map((p) => (
                        <div key={p.period} className="p-2 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0">
                          <div className="text-[11px] font-black uppercase">Period {p.name}</div>
                          <div className="text-[10px] text-zinc-400 font-normal">{p.time}</div>
                        </div>
                      ))}
                    </div>

                    {/* Days Rows */}
                    {DAYS.map((day) => (
                      <div
                        key={day}
                        className="grid grid-cols-10 border-b border-zinc-200 dark:border-zinc-800 last:border-b-0 min-h-[105px]"
                      >
                        {/* Day Name Column */}
                        <div className="p-3 bg-zinc-50/60 dark:bg-zinc-800/40 border-r border-zinc-200 dark:border-zinc-800 font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center justify-center">
                          {day}
                        </div>

                        {/* Periods 1 - 4 */}
                        {[1, 2, 3, 4].map((periodNum) => {
                          const slotsForCell = (selectedTimetable.slots || []).filter(
                            (s) =>
                              s.day === day &&
                              s.period === periodNum &&
                              (selectedBatchView === "ALL" || s.batch === "ALL" || s.batch === selectedBatchView)
                          );

                          return (
                            <div
                              key={periodNum}
                              className="p-1.5 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between group relative hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                              {slotsForCell.length === 0 ? (
                                <div
                                  onClick={() => openAddSlot(day, periodNum)}
                                  className="h-full min-h-[75px] flex items-center justify-center cursor-pointer rounded-lg border border-transparent hover:border-dashed hover:border-indigo-300 dark:hover:border-indigo-800"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAddSlot(day, periodNum);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 hover:bg-indigo-100 text-[10px] font-bold transition-opacity flex items-center gap-1 shadow-xs"
                                  >
                                    <Plus className="w-3 h-3" /> Add Class
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {slotsForCell.map((slot) => {
                                    const origIndex = selectedTimetable.slots.indexOf(slot);
                                    return (
                                      <div
                                        key={`${slot.subjectCode}-${slot.batch}-${origIndex}`}
                                        onClick={() => openEditSlot(slot, origIndex)}
                                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.02] shadow-xs group/card ${
                                          slot.category === "Lab"
                                            ? "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200"
                                            : slot.category === "Tutorial"
                                            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                                            : "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between text-[10px] font-black">
                                          <span>{slot.subjectCode}</span>
                                          <span className="opacity-80 font-mono text-[9px] bg-white/60 dark:bg-black/30 px-1 rounded">
                                            {slot.batch}
                                          </span>
                                        </div>
                                        <div className="text-[11px] font-bold line-clamp-1 mt-0.5">
                                          {slot.subjectName}
                                        </div>
                                        <div className="text-[9px] text-zinc-500 font-mono mt-1 flex items-center justify-between">
                                          <span>{slot.room}</span>
                                          {slot.faculty && (
                                            <span className="truncate max-w-[65px]">{slot.faculty}</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Lunch Cell */}
                        <div className="bg-amber-50/40 dark:bg-amber-950/10 border-r border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[10px] text-amber-700/60 font-mono uppercase tracking-wider">
                          Recess
                        </div>

                        {/* Periods 5 - 8 */}
                        {[5, 6, 7, 8].map((periodNum) => {
                          const slotsForCell = (selectedTimetable.slots || []).filter(
                            (s) =>
                              s.day === day &&
                              s.period === periodNum &&
                              (selectedBatchView === "ALL" || s.batch === "ALL" || s.batch === selectedBatchView)
                          );

                          return (
                            <div
                              key={periodNum}
                              className="p-1.5 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 flex flex-col justify-between group relative hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                              {slotsForCell.length === 0 ? (
                                <div
                                  onClick={() => openAddSlot(day, periodNum)}
                                  className="h-full min-h-[75px] flex items-center justify-center cursor-pointer rounded-lg border border-transparent hover:border-dashed hover:border-indigo-300 dark:hover:border-indigo-800"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAddSlot(day, periodNum);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 hover:bg-indigo-100 text-[10px] font-bold transition-opacity flex items-center gap-1 shadow-xs"
                                  >
                                    <Plus className="w-3 h-3" /> Add Class
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {slotsForCell.map((slot) => {
                                    const origIndex = selectedTimetable.slots.indexOf(slot);
                                    return (
                                      <div
                                        key={`${slot.subjectCode}-${slot.batch}-${origIndex}`}
                                        onClick={() => openEditSlot(slot, origIndex)}
                                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.02] shadow-xs group/card ${
                                          slot.category === "Lab"
                                            ? "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200"
                                            : slot.category === "Tutorial"
                                            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                                            : "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between text-[10px] font-black">
                                          <span>{slot.subjectCode}</span>
                                          <span className="opacity-80 font-mono text-[9px] bg-white/60 dark:bg-black/30 px-1 rounded">
                                            {slot.batch}
                                          </span>
                                        </div>
                                        <div className="text-[11px] font-bold line-clamp-1 mt-0.5">
                                          {slot.subjectName}
                                        </div>
                                        <div className="text-[9px] text-zinc-500 font-mono mt-1 flex items-center justify-between">
                                          <span>{slot.room}</span>
                                          {slot.faculty && (
                                            <span className="truncate max-w-[65px]">{slot.faculty}</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: APPOINT CLASS REPRESENTATIVE (CR)                                 */}
      {/* ========================================================================= */}
      {appointModalOpen && selectedStudentForCR && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setAppointModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-600" />
                Appoint Class Representative (CR)
              </h3>
              <button onClick={() => setAppointModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing Enrollment Details */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700 text-xs space-y-2">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Existing Student Enrollment
              </div>
              <div className="grid grid-cols-2 gap-2 font-medium">
                <div>
                  <span className="text-zinc-400">Name:</span> <span className="font-bold">{selectedStudentForCR.fullName}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Email:</span> <span className="font-mono">{selectedStudentForCR.email}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Enrolled Class:</span>{" "}
                  <span className="font-bold text-indigo-600">{selectedStudentForCR.branchCode || "Unassigned"} {selectedStudentForCR.section || ""}</span>
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

            {/* Scope Selection */}
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
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium"
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
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium"
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
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium"
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
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium"
                  />
                </div>
              </div>

              {/* Enrollment Match Warning */}
              {selectedStudentForCR.branchCode &&
                (selectedStudentForCR.branchCode !== crScopeBranch ||
                  (selectedStudentForCR.section && selectedStudentForCR.section !== crScopeSection)) && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
                    <span className="font-bold">Enrollment Mismatch Warning:</span> Student is enrolled in{" "}
                    {selectedStudentForCR.branchCode} {selectedStudentForCR.section}. Class CRs must match their enrolled class.
                  </div>
                )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setAppointModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={
                  appointSubmitting ||
                  (selectedStudentForCR.branchCode !== undefined &&
                    selectedStudentForCR.branchCode !== crScopeBranch) ||
                  (selectedStudentForCR.section !== undefined &&
                    selectedStudentForCR.section !== crScopeSection)
                }
                onClick={handleConfirmAppointCR}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg shadow-sm"
              >
                {appointSubmitting ? "Appointing..." : "Confirm CR Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REVOKE CLASS REPRESENTATIVE (CR) PRIVILEGES                       */}
      {/* ========================================================================= */}
      {revokeModalOpen && studentToRevoke && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setRevokeModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-4">
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
                className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={revokeSubmitting}
                onClick={handleConfirmRevokeCR}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-lg shadow-sm"
              >
                {revokeSubmitting ? "Revoking..." : "Confirm Revocation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PREVIEW & PUBLISH MASTER TIMETABLE                                */}
      {/* ========================================================================= */}
      {isPublishModalOpen && selectedTimetable && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPublishModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Publish Master Class Timetable
              </h3>
              <button onClick={() => setIsPublishModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Target Publication Scope</label>
                <select
                  value={publishScope}
                  onChange={(e: any) => setPublishScope(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold"
                >
                  <option value="ALL_BATCHES">All Batches (Full Class Schedule)</option>
                  <option value="P1_ONLY">Batch P1 Only (Strict Isolation: leaves P2 untouched)</option>
                  <option value="P2_ONLY">Batch P2 Only (Strict Isolation: leaves P1 untouched)</option>
                  <option value="SELECTED_SECTION">Selected Section ({selectedTimetable.section})</option>
                  <option value="SELECTED_BRANCH">Selected Branch ({selectedTimetable.branchCode})</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Version Label / Tag</label>
                <input
                  type="text"
                  placeholder="e.g. v1.0-official or Sem1-Final"
                  value={publishVersionLabel}
                  onChange={(e) => setPublishVersionLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-medium"
                />
              </div>

              {/* Scope Impact Preview */}
              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2 text-xs">
                <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                  <span>Publication Preview & Scope Impact</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-200/60 dark:bg-indigo-900/60 font-bold">
                    {publishScope}
                  </span>
                </div>
                <div className="text-indigo-800 dark:text-indigo-300 font-medium space-y-0.5">
                  <div>&bull; Class: <span className="font-bold">{selectedTimetable.branchCode} {selectedTimetable.section}</span> &bull; Room: <span className="font-mono font-bold">{selectedTimetable.room}</span></div>
                  <div>&bull; Publishing Admin: <span className="font-bold text-indigo-950 dark:text-white">admin@attendx.ac.in</span></div>
                  <div>
                    &bull; Active Slots to Publish:{" "}
                    <span className="font-mono font-bold">
                      {
                        selectedTimetable.slots.filter((s) => {
                          if (publishScope === "P1_ONLY") return s.batch === "ALL" || s.batch === "P1";
                          if (publishScope === "P2_ONLY") return s.batch === "ALL" || s.batch === "P2";
                          return true;
                        }).length
                      }
                    </span>{" "}
                    of {selectedTimetable.slots.length} total slots
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Strict Scope Isolation: Publishing {publishScope === "P1_ONLY" ? "P1" : publishScope === "P2_ONLY" ? "P2" : "selected scope"} will modify only matching slots. Other batches and sections remain completely untouched.
                  </div>
                </div>

                {/* Full-Grid Slots Preview */}
                <div className="mt-2 border border-indigo-200/80 dark:border-indigo-800 rounded-lg overflow-hidden max-h-40 overflow-y-auto bg-white/80 dark:bg-zinc-900/80 text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-indigo-100/60 dark:bg-indigo-950/80 font-bold text-zinc-700 dark:text-zinc-300 sticky top-0">
                      <tr>
                        <th className="p-1.5">Day</th>
                        <th className="p-1.5">Period</th>
                        <th className="p-1.5">Subject</th>
                        <th className="p-1.5">Batch</th>
                        <th className="p-1.5">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {selectedTimetable.slots
                        .filter((s) => {
                          if (publishScope === "P1_ONLY") return s.batch === "ALL" || s.batch === "P1";
                          if (publishScope === "P2_ONLY") return s.batch === "ALL" || s.batch === "P2";
                          return true;
                        })
                        .map((s, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                            <td className="p-1.5 font-bold">{s.day.slice(0, 3)}</td>
                            <td className="p-1.5 font-mono">P{s.period}</td>
                            <td className="p-1.5 font-semibold truncate max-w-[120px]">{s.subjectCode}</td>
                            <td className="p-1.5 font-mono">{s.batch}</td>
                            <td className="p-1.5 font-mono text-zinc-400">{s.room}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={isPublishing}
                onClick={handleConfirmPublishTimetable}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg shadow-sm"
              >
                {isPublishing ? "Publishing Schedule..." : "Confirm & Publish Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT / ADD TIMETABLE SLOT                                         */}
      {/* ========================================================================= */}
      {isSlotModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSlotModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-600" />
                {editingSlotIndex !== null ? "Edit Timetable Slot" : "Add Timetable Slot"}
              </h3>
              <button onClick={() => setIsSlotModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Day</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Period</label>
                  <select
                    value={slotPeriod}
                    onChange={(e) => setSlotPeriod(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>
                        Period {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Subject Code</label>
                <input
                  type="text"
                  placeholder="e.g. BIT-101"
                  value={slotSubjectCode}
                  onChange={(e) => setSlotSubjectCode(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Programming for Problem Solving"
                  value={slotSubjectName}
                  onChange={(e) => setSlotSubjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={slotCategory}
                    onChange={(e: any) => setSlotCategory(e.target.value)}
                    className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Lab">Lab</option>
                    <option value="Tutorial">Tutorial</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Batch</label>
                  <select
                    value={slotBatch}
                    onChange={(e) => setSlotBatch(e.target.value)}
                    className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  >
                    <option value="ALL">ALL</option>
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Room</label>
                  <input
                    type="text"
                    value={slotRoom}
                    onChange={(e) => setSlotRoom(e.target.value)}
                    className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Faculty Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Prof. H. C. Verma"
                  value={slotFaculty}
                  onChange={(e) => setSlotFaculty(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              {editingSlotIndex !== null ? (
                <button
                  type="button"
                  onClick={handleDeleteSlot}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/40 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Slot
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSlot}
                  disabled={!slotSubjectCode.trim() || !slotSubjectName.trim() || !slotRoom.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg shadow-sm"
                >
                  Save Slot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
