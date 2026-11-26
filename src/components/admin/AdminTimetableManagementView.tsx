"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Trash2,
  Eye,
  Check,
  ChevronRight,
  Layers,
  Archive,
  RefreshCw,
  X,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import {
  UniversityTimetable,
  TimetableSlot,
  PublishedTimetableVersion,
} from "@/types";
import {
  getAllBranches,
  getSectionsForBranch,
  BRANCH_NAMES_MAP,
  normalizeSection,
} from "@/data/extractedTimetables";
import { VALID_ACADEMIC_YEARS } from "@/lib/studentImportTypes";
import { getSessionToken } from "@/lib/auth";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [
  { period: 1, name: "I", time: "9:10 - 10:00" },
  { period: 2, name: "II", time: "10:00 - 10:50" },
  { period: 3, name: "III", time: "10:50 - 11:40" },
  { period: 4, name: "IV", time: "11:40 - 12:30" },
  // Recess / Lunch Break is 12:30 - 2:00
  { period: 5, name: "V", time: "2:00 - 2:45" },
  { period: 6, name: "VI", time: "2:45 - 3:30" },
  { period: 7, name: "VII", time: "3:30 - 4:15" },
  { period: 8, name: "VIII", time: "4:15 - 5:00" },
];

interface AdminTimetableManagementViewProps {
  initialTimetables: UniversityTimetable[];
  onTimetableUpdated?: () => void;
}

export default function AdminTimetableManagementView({
  initialTimetables,
  onTimetableUpdated,
}: AdminTimetableManagementViewProps) {
  // Navigation / View state
  const [activeTab, setActiveTab] = useState<"grid" | "upload" | "versions">("grid");

  // Hierarchical Filter State
  const [selectedYear, setSelectedYear] = useState<string>("1st Year");
  const [selectedSemester, setSelectedSemester] = useState<string>("Semester I");
  const [selectedBranch, setSelectedBranch] = useState<string>("IT");
  const [selectedSection, setSelectedSection] = useState<string>("SEC-B");
  const [selectedBatchView, setSelectedBatchView] = useState<string>("ALL");

  // Timetable State
  const [timetables, setTimetables] = useState<UniversityTimetable[]>(initialTimetables);
  const [currentTimetable, setCurrentTimetable] = useState<UniversityTimetable | null>(
    initialTimetables[0] || null
  );

  // Published Versions State
  const [publishedVersions, setPublishedVersions] = useState<PublishedTimetableVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [selectedVersionIds, setSelectedVersionIds] = useState<Set<string>>(new Set());

  // Upload Workflow State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isParsingUpload, setIsParsingUpload] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<UniversityTimetable | null>(null);
  const [uploadIssues, setUploadIssues] = useState<
    { type: string; message: string; slot?: any }[]
  >([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPublishingUpload, setIsPublishingUpload] = useState(false);
  const [uploadSuccessToast, setUploadSuccessToast] = useState<string | null>(null);

  // Consistency Inspector State
  const [consistencyResult, setConsistencyResult] = useState<{
    isValid: boolean;
    issues: { type: string; message: string; slot?: any }[];
  } | null>(null);

  // Slot Edit Modal State
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [slotDay, setSlotDay] = useState("Monday");
  const [slotPeriod, setSlotPeriod] = useState(1);
  const [slotSubjectCode, setSlotSubjectCode] = useState("");
  const [slotSubjectName, setSlotSubjectName] = useState("");
  const [slotCategory, setSlotCategory] = useState<"Theory" | "Lab" | "Tutorial">("Theory");
  const [slotBatch, setSlotBatch] = useState("ALL");
  const [slotRoom, setSlotRoom] = useState("TL-203");
  const [slotFaculty, setSlotFaculty] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync section options when branch changes
  const availableSections = getSectionsForBranch(selectedBranch);

  const fetchVersions = async () => {
    setIsLoadingVersions(true);
    try {
      const token = getSessionToken();
      const res = await fetch("/api/admin/timetable", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPublishedVersions(data.versions || []);
      }
    } catch (e) {
      console.error("Failed to fetch timetable versions:", e);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  // Update current timetable based on hierarchy filters
  useEffect(() => {
    // 1. Look for published version matching scope
    const matchedPublished = publishedVersions.find(
      (v) =>
        v.isActive &&
        (v.academicYear || "1st Year") === selectedYear &&
        v.branchCode.toUpperCase() === selectedBranch.toUpperCase() &&
        normalizeSection(v.section) === normalizeSection(selectedSection)
    );

    if (matchedPublished && matchedPublished.timetableData) {
      setCurrentTimetable({
        ...matchedPublished.timetableData,
        academicYear: matchedPublished.academicYear || selectedYear,
      });
      return;
    }

    // 2. Look for static sheet matching branch and section (only for 1st Year)
    if (selectedYear === "1st Year") {
      const matchedStatic = timetables.find(
        (t) =>
          t.branchCode.toUpperCase() === selectedBranch.toUpperCase() &&
          normalizeSection(t.section) === normalizeSection(selectedSection)
      );
      if (matchedStatic) {
        setCurrentTimetable(matchedStatic);
        return;
      }
    }

    // 3. Fallback to empty template for 2nd/3rd/4th Year
    setCurrentTimetable({
      id: `tt-${selectedYear.toLowerCase().replace(/\s+/g, "-")}-${selectedBranch.toLowerCase()}-${selectedSection.toLowerCase()}`,
      pageNumber: 1,
      degree: "B.Tech",
      branch: BRANCH_NAMES_MAP[selectedBranch] || selectedBranch,
      branchCode: selectedBranch,
      section: selectedSection,
      room: "TBD",
      session: "2026-27",
      academicYear: selectedYear,
      semester: selectedSemester,
      batches: ["P1", "P2"],
      isVerified: false,
      subjects: [],
      slots: [],
    });
  }, [selectedYear, selectedSemester, selectedBranch, selectedSection, publishedVersions, timetables]);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (year === "2nd Year") setSelectedSemester("Semester III");
    else if (year === "3rd Year") setSelectedSemester("Semester V");
    else if (year === "4th Year") setSelectedSemester("Semester VII");
    else setSelectedSemester("Semester I");
  };

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    const secs = getSectionsForBranch(branch);
    if (!secs.includes(selectedSection)) {
      setSelectedSection(secs[0] || "SEC-A");
    }
  };

  // Run Consistency Check on current timetable
  const runConsistencyCheck = () => {
    if (!currentTimetable) return;
    const issues: { type: string; message: string; slot?: any }[] = [];
    const slotMap = new Map<string, TimetableSlot>();

    currentTimetable.slots.forEach((s) => {
      const key = `${s.day}-${s.period}-${s.batch}`;
      const allKey = `${s.day}-${s.period}-ALL`;

      if (slotMap.has(key)) {
        issues.push({
          type: "duplicate",
          message: `Duplicate slot on ${s.day} Period ${s.period} for Batch ${s.batch} (${s.subjectCode}).`,
          slot: s,
        });
      } else if (s.batch !== "ALL" && slotMap.has(allKey)) {
        issues.push({
          type: "conflict",
          message: `Overlap on ${s.day} Period ${s.period}: Batch ${s.batch} class (${s.subjectCode}) overlaps with section class (${slotMap.get(allKey)?.subjectCode}).`,
          slot: s,
        });
      } else {
        slotMap.set(key, s);
      }
    });

    setConsistencyResult({
      isValid: issues.length === 0,
      issues,
    });
  };

  // Upload and parse spreadsheet
  const handleParseUploadFile = async () => {
    if (!uploadFile) {
      setUploadError("Please select a timetable spreadsheet file.");
      return;
    }

    setIsParsingUpload(true);
    setUploadError(null);
    setUploadIssues([]);

    try {
      const token = getSessionToken();
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("academicYear", selectedYear);
      formData.append("semester", selectedSemester);
      formData.append("branchCode", selectedBranch);
      formData.append("section", selectedSection);
      formData.append("batch", selectedBatchView);

      const res = await fetch("/api/admin/timetable/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to parse timetable spreadsheet.");
      }

      setParsedPreview(data.timetable);
      setUploadIssues(data.issues || []);
    } catch (err: any) {
      setUploadError(err.message || "Failed to process timetable upload.");
    } finally {
      setIsParsingUpload(false);
    }
  };

  // Commit and publish uploaded timetable
  const handleConfirmPublishUpload = async () => {
    if (!parsedPreview) return;
    setIsPublishingUpload(true);
    setUploadError(null);

    try {
      const token = getSessionToken();
      const res = await fetch("/api/admin/timetable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          branchCode: selectedBranch,
          section: selectedSection,
          scope: "ALL_BATCHES",
          academicYear: selectedYear,
          academicSession: "2026-27",
          semester: selectedSemester,
          timetable: parsedPreview,
          versionLabel: `v-${selectedYear.replace(/\s+/g, "")}-${Date.now().toString().slice(-4)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to publish timetable version.");
      }

      setUploadSuccessToast(
        `Successfully published timetable for ${selectedYear} ${selectedBranch} ${selectedSection}!`
      );
      setTimeout(() => setUploadSuccessToast(null), 5000);
      setParsedPreview(null);
      setUploadFile(null);
      setActiveTab("grid");
      await fetchVersions();
      if (onTimetableUpdated) onTimetableUpdated();
    } catch (err: any) {
      setUploadError(err.message || "Failed to publish timetable.");
    } finally {
      setIsPublishingUpload(false);
    }
  };

  // Version lifecycle actions: Activate, Archive, Delete
  const handleActivateVersion = async (versionId: string) => {
    try {
      const token = getSessionToken();
      const res = await fetch("/api/admin/timetable", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: "activate", versionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchVersions();
      }
    } catch (e) {
      console.error("Error activating version:", e);
    }
  };

  const handleArchiveVersion = async (versionId: string) => {
    try {
      const token = getSessionToken();
      const res = await fetch("/api/admin/timetable", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: "archive", versionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchVersions();
      }
    } catch (e) {
      console.error("Error archiving version:", e);
    }
  };

  const handleBulkDeleteVersions = async (hardDelete = false) => {
    if (selectedVersionIds.size === 0) return;
    const confirmMsg = hardDelete
      ? `Permanently delete ${selectedVersionIds.size} selected timetable versions? Historical student attendance remains safe.`
      : `Archive ${selectedVersionIds.size} selected timetable versions?`;

    if (!confirm(confirmMsg)) return;

    try {
      const token = getSessionToken();
      const res = await fetch(`/api/admin/timetable${hardDelete ? "?hardDelete=true" : ""}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids: Array.from(selectedVersionIds) }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedVersionIds(new Set());
        await fetchVersions();
      }
    } catch (e) {
      console.error("Error deleting versions:", e);
    }
  };

  // Slot modal handlers
  const openAddSlot = (day: string, period: number) => {
    setSlotDay(day);
    setSlotPeriod(period);
    setSlotSubjectCode("");
    setSlotSubjectName("");
    setSlotCategory("Theory");
    setSlotBatch("ALL");
    setSlotRoom(currentTimetable?.room || "TL-Room");
    setSlotFaculty("");
    setEditingSlotIndex(null);
    setIsSlotModalOpen(true);
  };

  const openEditSlot = (slot: TimetableSlot, index: number) => {
    setSlotDay(slot.day);
    setSlotPeriod(slot.period);
    setSlotSubjectCode(slot.subjectCode);
    setSlotSubjectName(slot.subjectName);
    setSlotCategory(slot.category);
    setSlotBatch(slot.batch || "ALL");
    setSlotRoom(slot.room);
    setSlotFaculty(slot.faculty || "");
    setEditingSlotIndex(index);
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = () => {
    if (!currentTimetable || !slotSubjectCode.trim()) return;

    const newSlot: TimetableSlot = {
      day: slotDay,
      period: slotPeriod,
      subjectCode: slotSubjectCode.trim().toUpperCase(),
      subjectName: slotSubjectName.trim(),
      category: slotCategory,
      batch: slotBatch,
      room: slotRoom.trim(),
      faculty: slotFaculty.trim() || undefined,
    };

    let updatedSlots = [...currentTimetable.slots];
    if (editingSlotIndex !== null) {
      updatedSlots[editingSlotIndex] = newSlot;
    } else {
      updatedSlots.push(newSlot);
    }

    setCurrentTimetable({
      ...currentTimetable,
      slots: updatedSlots,
    });
    setIsSlotModalOpen(false);
  };

  const handleDeleteSlot = () => {
    if (!currentTimetable || editingSlotIndex === null) return;
    const updatedSlots = currentTimetable.slots.filter((_, idx) => idx !== editingSlotIndex);
    setCurrentTimetable({
      ...currentTimetable,
      slots: updatedSlots,
    });
    setIsSlotModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Notification Toast */}
      {uploadSuccessToast && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{uploadSuccessToast}</span>
        </div>
      )}

      {/* Hierarchical Breadcrumb & Mode Selector */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
              <span>{selectedYear}</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>{selectedSemester}</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-indigo-600 dark:text-indigo-400">{selectedBranch} {selectedSection}</span>
            </div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white mt-0.5">
              Timetable Management Centre & Master Schedules
            </h2>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab("grid")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "grid"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Weekly Schedule Grid
            </button>

            <button
              onClick={() => setActiveTab("upload")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "upload"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-indigo-500" /> Bulk Spreadsheet Upload
            </button>

            <button
              onClick={() => {
                setActiveTab("versions");
                fetchVersions();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "versions"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Version History ({publishedVersions.length})
            </button>
          </div>
        </div>

        {/* Hierarchical Filter Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
              Academic Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-xs"
            >
              {VALID_ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-xs"
            >
              {selectedYear === "1st Year" && (
                <>
                  <option value="Semester I">Semester I</option>
                  <option value="Semester II">Semester II</option>
                </>
              )}
              {selectedYear === "2nd Year" && (
                <>
                  <option value="Semester III">Semester III</option>
                  <option value="Semester IV">Semester IV</option>
                </>
              )}
              {selectedYear === "3rd Year" && (
                <>
                  <option value="Semester V">Semester V</option>
                  <option value="Semester VI">Semester VI</option>
                </>
              )}
              {selectedYear === "4th Year" && (
                <>
                  <option value="Semester VII">Semester VII</option>
                  <option value="Semester VIII">Semester VIII</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-xs"
            >
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
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-xs"
            >
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Batch View</label>
            <select
              value={selectedBatchView}
              onChange={(e) => setSelectedBatchView(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-xs"
            >
              <option value="ALL">All Batches (P1 + P2)</option>
              <option value="P1">Batch P1 Only</option>
              <option value="P2">Batch P2 Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: WEEKLY SCHEDULE MATRIX GRID */}
      {activeTab === "grid" && currentTimetable && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-zinc-900 dark:text-white">
                  {currentTimetable.branch} &bull; {currentTimetable.section}
                </span>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800">
                  Room: {currentTimetable.room || "TBD"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {currentTimetable.academicYear || selectedYear} &bull; {currentTimetable.semester || selectedSemester} &bull;{" "}
                {currentTimetable.slots.length} total classes scheduled
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={runConsistencyCheck}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 transition-colors flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Consistency Check
              </button>

              <button
                onClick={() => openAddSlot("Monday", 1)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Slot
              </button>

              <button
                onClick={async () => {
                  const token = getSessionToken();
                  const res = await fetch("/api/admin/timetable", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                      branchCode: selectedBranch,
                      section: selectedSection,
                      scope: "ALL_BATCHES",
                      academicYear: selectedYear,
                      academicSession: "2026-27",
                      semester: selectedSemester,
                      timetable: currentTimetable,
                      versionLabel: `v-${selectedYear.replace(/\s+/g, "")}-${Date.now().toString().slice(-4)}`,
                    }),
                  });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    setUploadSuccessToast(
                      `Published timetable for ${selectedYear} ${selectedBranch} ${selectedSection}!`
                    );
                    setTimeout(() => setUploadSuccessToast(null), 4000);
                    fetchVersions();
                  } else {
                    alert(data.error || "Failed to publish timetable.");
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Publish Active Schedule
              </button>
            </div>
          </div>

          {/* Consistency Results Banner */}
          {consistencyResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                consistencyResult.isValid
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {consistencyResult.isValid ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Zero Conflicts: Timetable entries are structurally valid and conflict-free.
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

          {/* Matrix Grid */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-xs">
            <div className="min-w-[1000px]">
              {/* Header Row */}
              <div className="grid grid-cols-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-center text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <div className="p-3 border-r border-zinc-200 dark:border-zinc-800">Day / Period</div>
                {PERIODS.slice(0, 4).map((p) => (
                  <div key={p.period} className="p-2 border-r border-zinc-200 dark:border-zinc-800">
                    <div className="text-[11px] font-black uppercase">Period {p.name}</div>
                    <div className="text-[10px] text-zinc-400 font-normal">{p.time}</div>
                  </div>
                ))}
                <div className="p-2 bg-amber-50/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border-r border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-bold text-[10px] tracking-wider">
                  RECESS (12:30-2:00)
                </div>
                {PERIODS.slice(4).map((p) => (
                  <div
                    key={p.period}
                    className="p-2 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0"
                  >
                    <div className="text-[11px] font-black uppercase">Period {p.name}</div>
                    <div className="text-[10px] text-zinc-400 font-normal">{p.time}</div>
                  </div>
                ))}
              </div>

              {/* Days Rows */}
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="grid grid-cols-10 border-b border-zinc-200 dark:border-zinc-800 last:border-b-0 min-h-[90px]"
                >
                  <div className="p-3 bg-zinc-50/60 dark:bg-zinc-800/40 border-r border-zinc-200 dark:border-zinc-800 font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center justify-center">
                    {day}
                  </div>

                  {/* Periods 1 - 4 */}
                  {[1, 2, 3, 4].map((pNum) => {
                    const cellSlots = currentTimetable.slots.filter(
                      (s) =>
                        s.day === day &&
                        s.period === pNum &&
                        (selectedBatchView === "ALL" || s.batch === "ALL" || s.batch === selectedBatchView)
                    );

                    return (
                      <div
                        key={pNum}
                        className="p-1.5 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between group relative hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {cellSlots.length === 0 ? (
                          <div
                            onClick={() => openAddSlot(day, pNum)}
                            className="h-full min-h-[65px] flex items-center justify-center cursor-pointer rounded-lg border border-transparent hover:border-dashed hover:border-indigo-300 dark:hover:border-indigo-800"
                          >
                            <span className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 text-[10px] font-bold flex items-center gap-0.5">
                              <Plus className="w-3 h-3" /> Add
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {cellSlots.map((slot) => {
                              const origIdx = currentTimetable.slots.indexOf(slot);
                              return (
                                <div
                                  key={`${slot.subjectCode}-${origIdx}`}
                                  onClick={() => openEditSlot(slot, origIdx)}
                                  className={`p-1.5 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.02] shadow-2xs ${
                                    slot.category === "Lab"
                                      ? "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200"
                                      : slot.category === "Tutorial"
                                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                                      : "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] font-black">
                                    <span>{slot.subjectCode}</span>
                                    <span className="opacity-75 font-mono text-[9px]">{slot.batch}</span>
                                  </div>
                                  <div className="text-[10px] font-bold truncate mt-0.5">
                                    {slot.subjectName}
                                  </div>
                                  <div className="text-[9px] text-zinc-500 font-mono flex items-center justify-between mt-0.5">
                                    <span>{slot.room}</span>
                                    {slot.faculty && (
                                      <span className="truncate max-w-[60px]">{slot.faculty}</span>
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

                  {/* Recess Column */}
                  <div className="bg-amber-50/30 dark:bg-amber-950/10 border-r border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[9px] text-amber-700/60 font-mono uppercase tracking-wider">
                    Recess
                  </div>

                  {/* Periods 5 - 8 */}
                  {[5, 6, 7, 8].map((pNum) => {
                    const cellSlots = currentTimetable.slots.filter(
                      (s) =>
                        s.day === day &&
                        s.period === pNum &&
                        (selectedBatchView === "ALL" || s.batch === "ALL" || s.batch === selectedBatchView)
                    );

                    return (
                      <div
                        key={pNum}
                        className="p-1.5 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 flex flex-col justify-between group relative hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {cellSlots.length === 0 ? (
                          <div
                            onClick={() => openAddSlot(day, pNum)}
                            className="h-full min-h-[65px] flex items-center justify-center cursor-pointer rounded-lg border border-transparent hover:border-dashed hover:border-indigo-300 dark:hover:border-indigo-800"
                          >
                            <span className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 text-[10px] font-bold flex items-center gap-0.5">
                              <Plus className="w-3 h-3" /> Add
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {cellSlots.map((slot) => {
                              const origIdx = currentTimetable.slots.indexOf(slot);
                              return (
                                <div
                                  key={`${slot.subjectCode}-${origIdx}`}
                                  onClick={() => openEditSlot(slot, origIdx)}
                                  className={`p-1.5 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.02] shadow-2xs ${
                                    slot.category === "Lab"
                                      ? "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200"
                                      : slot.category === "Tutorial"
                                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                                      : "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] font-black">
                                    <span>{slot.subjectCode}</span>
                                    <span className="opacity-75 font-mono text-[9px]">{slot.batch}</span>
                                  </div>
                                  <div className="text-[10px] font-bold truncate mt-0.5">
                                    {slot.subjectName}
                                  </div>
                                  <div className="text-[9px] text-zinc-500 font-mono flex items-center justify-between mt-0.5">
                                    <span>{slot.room}</span>
                                    {slot.faculty && (
                                      <span className="truncate max-w-[60px]">{slot.faculty}</span>
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

      {/* TAB 2: BULK SPREADSHEET UPLOAD & PREVIEW */}
      {activeTab === "upload" && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              Upload Master Timetable Spreadsheet (.xlsx)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Target Scope: <strong>{selectedYear}</strong> &bull; <strong>{selectedSemester}</strong> &bull;{" "}
              <strong>{selectedBranch} {selectedSection}</strong>.
            </p>
          </div>

          {uploadError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-800/20 space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setUploadFile(e.target.files[0]);
                  setParsedPreview(null);
                  setUploadError(null);
                }
              }}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {uploadFile ? uploadFile.name : "Select or drop timetable Excel spreadsheet"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Supports column formats (Day, Period, Subject Code, Subject Name, Room, Batch) or Day-Period Grid Matrix.
              </p>
            </div>
            {uploadFile && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Check className="w-3.5 h-3.5" /> File Selected ({(uploadFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Timetable uploads are staged and validated for conflicts before replacing any active schedule.
            </span>
            <button
              onClick={handleParseUploadFile}
              disabled={!uploadFile || isParsingUpload}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              {isParsingUpload ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Parsing Spreadsheet...
                </>
              ) : (
                <>
                  Parse & Validate Schedule <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Validation & Conflict Report */}
          {parsedPreview && (
            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Parsed {parsedPreview.slots.length} Timetable Slots
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Review extracted slots below. Confirming will activate this version and safely archive prior versions.
                  </p>
                </div>

                <button
                  onClick={handleConfirmPublishUpload}
                  disabled={isPublishingUpload}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 flex items-center gap-2"
                >
                  {isPublishingUpload ? "Activating..." : "Confirm & Activate Schedule"}
                </button>
              </div>

              {uploadIssues.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-amber-800 dark:text-amber-300">
                    {uploadIssues.length} Formatting / Conflict Note(s):
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-zinc-600 dark:text-zinc-400">
                    {uploadIssues.map((issue, idx) => (
                      <li key={idx}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Slot Preview Mini-Table */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 font-bold text-zinc-500 sticky top-0">
                    <tr>
                      <th className="p-2.5">Day</th>
                      <th className="p-2.5">Period</th>
                      <th className="p-2.5">Subject Code</th>
                      <th className="p-2.5">Subject Name</th>
                      <th className="p-2.5">Batch</th>
                      <th className="p-2.5">Room</th>
                      <th className="p-2.5">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {parsedPreview.slots.map((s, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="p-2.5 font-bold">{s.day}</td>
                        <td className="p-2.5 font-mono">P{s.period}</td>
                        <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400">
                          {s.subjectCode}
                        </td>
                        <td className="p-2.5">{s.subjectName}</td>
                        <td className="p-2.5 font-mono">{s.batch}</td>
                        <td className="p-2.5 font-mono text-zinc-400">{s.room}</td>
                        <td className="p-2.5">{s.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VERSION HISTORY & BULK REMOVAL */}
      {activeTab === "versions" && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Timetable Version History & Lifecycle Control
              </h3>
              <p className="text-xs text-zinc-500">
                Audited schedule publications with instant rollback, archival, and bulk removal.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchVersions}
                disabled={isLoadingVersions}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingVersions ? "animate-spin" : ""}`} /> Refresh
              </button>

              {selectedVersionIds.size > 0 && (
                <>
                  <button
                    onClick={() => handleBulkDeleteVersions(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1"
                  >
                    <Archive className="w-3.5 h-3.5" /> Archive ({selectedVersionIds.size})
                  </button>
                  <button
                    onClick={() => handleBulkDeleteVersions(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedVersionIds.size})
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-100 dark:border-zinc-800">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        publishedVersions.length > 0 &&
                        publishedVersions.every((v) => selectedVersionIds.has(v.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVersionIds(new Set(publishedVersions.map((v) => v.id)));
                        } else {
                          setSelectedVersionIds(new Set());
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </th>
                  <th className="p-3">Academic Scope</th>
                  <th className="p-3">Version Tag</th>
                  <th className="p-3">Batch Scope</th>
                  <th className="p-3">Slots</th>
                  <th className="p-3">Published By</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {isLoadingVersions ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500">
                      Loading published versions...
                    </td>
                  </tr>
                ) : publishedVersions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500">
                      No published timetable versions in database yet.
                    </td>
                  </tr>
                ) : (
                  publishedVersions.map((v) => {
                    const isChecked = selectedVersionIds.has(v.id);
                    return (
                      <tr
                        key={v.id}
                        className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                          isChecked ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const next = new Set(selectedVersionIds);
                              if (next.has(v.id)) next.delete(v.id);
                              else next.add(v.id);
                              setSelectedVersionIds(next);
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                        </td>
                        <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                          <div>
                            {v.academicYear || "1st Year"} &bull; {v.semester}
                          </div>
                          <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            {v.branchCode} {v.section}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          {v.versionLabel}
                        </td>
                        <td className="p-3 font-mono">{v.batch}</td>
                        <td className="p-3 font-mono">{v.slotCount} classes</td>
                        <td className="p-3 text-zinc-500">
                          <div>{v.publishedByEmail}</div>
                          <div className="text-[10px] text-zinc-400">
                            {new Date(v.publishedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3">
                          {v.isActive ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              Archived
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {!v.isActive ? (
                              <button
                                onClick={() => handleActivateVersion(v.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors"
                              >
                                Activate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchiveVersion(v.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 transition-colors"
                              >
                                Archive
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (confirm("Delete this timetable version?")) {
                                  setSelectedVersionIds(new Set([v.id]));
                                  handleBulkDeleteVersions(true);
                                }
                              }}
                              className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Add Slot Modal */}
      {isSlotModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSlotModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                {editingSlotIndex !== null ? "Edit Timetable Class" : "Add Timetable Class"}
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
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Period</label>
                  <select
                    value={slotPeriod}
                    onChange={(e) => setSlotPeriod(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  >
                    {PERIODS.map((p) => (
                      <option key={p.period} value={p.period}>
                        Period {p.name} ({p.time})
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
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Programming for Problem Solving"
                  value={slotSubjectName}
                  onChange={(e) => setSlotSubjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={slotCategory}
                    onChange={(e: any) => setSlotCategory(e.target.value)}
                    className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
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
                    className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
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
                    className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono"
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
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              {editingSlotIndex !== null ? (
                <button
                  type="button"
                  onClick={handleDeleteSlot}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/40 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSlot}
                  disabled={!slotSubjectCode.trim() || !slotSubjectName.trim() || !slotRoom.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl shadow-xs"
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
