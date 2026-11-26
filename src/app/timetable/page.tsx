"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  StudentProfile,
  UniversityTimetable,
  TimetableSlot,
  AttendanceCategory,
  DateSpecificOverride,
} from "@/types";
import {
  getStoredProfile,
  getActiveTimetable,
  saveCustomTimetable,
  saveOfficialClassTimetable,
  resetCustomTimetable,
  getTodayDateStr,
} from "@/lib/storage";
import {
  getAllOverridesForStudent,
  getEffectiveSlotsForDate,
  savePersonalOverride,
  saveClassOverride,
  deletePersonalOverride,
  deleteClassOverride,
} from "@/lib/timetableOverrides";
import { UNIVERSITY_DATABASE } from "@/data/extractedTimetables";
import RadialNavWheel from "@/components/RadialNavWheel";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  FlaskConical,
  BookOpen,
  Filter,
  Sparkles,
  GripVertical,
  Move,
  Info,
  ChevronLeft,
  ChevronRight,
  Layers,
  CalendarDays,
  XCircle,
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

export default function TimetableManagementPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [timetable, setTimetable] = useState<UniversityTimetable | null>(null);
  const [overrides, setOverrides] = useState<DateSpecificOverride[]>([]);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("MY_BATCH");
  const [viewMode, setViewMode] = useState<"WEEKLY" | "DATE">("WEEKLY");
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-27");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [classPublishSuccess, setClassPublishSuccess] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Drag and drop state
  const [draggedSlot, setDraggedSlot] = useState<TimetableSlot | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: string; period: number } | null>(null);

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [slotFrequency, setSlotFrequency] = useState<"THIS_DAY_ONLY" | "EVERY_WEEK">("THIS_DAY_ONLY");
  const [slotDate, setSlotDate] = useState<string>("2026-11-27");
  const [slotDay, setSlotDay] = useState<string>("Monday");
  const [slotPeriod, setSlotPeriod] = useState<number>(1);
  const [slotSubjectCode, setSlotSubjectCode] = useState<string>("");
  const [slotSubjectName, setSlotSubjectName] = useState<string>("");
  const [slotCategory, setSlotCategory] = useState<AttendanceCategory>("Theory");
  const [slotBatch, setSlotBatch] = useState<string>("ALL");
  const [slotRoom, setSlotRoom] = useState<string>("");
  const [slotFaculty, setSlotFaculty] = useState<string>("");
  const [slotScope, setSlotScope] = useState<"PERSONAL" | "CLASS">("PERSONAL");

  // Removal scope modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetSlot, setDeleteTargetSlot] = useState<TimetableSlot | null>(null);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null);
  const [deleteOccurrenceDate, setDeleteOccurrenceDate] = useState<string>("2026-11-27");

  useEffect(() => {
    const prof = getStoredProfile();
    const today = getTodayDateStr();
    setSelectedDate(today);
    setSlotDate(today);
    setDeleteOccurrenceDate(today);
    if (!prof) {
      setProfile(null);
      return;
    }
    // For Admin account ONLY, replace My Timetable destination with Timetable Management Centre
    if (prof.role === "admin") {
      router.replace("/admin?tab=timetables");
      return;
    }
    const tt = getActiveTimetable(prof);
    const ovrs = getAllOverridesForStudent(prof);
    setProfile(prof);
    setTimetable(tt ? JSON.parse(JSON.stringify(tt)) : null);
    setOverrides(ovrs);

    // Default scope for CR
    if (prof.role === "class_admin") {
      setSlotScope("CLASS");
    }
  }, [router]);

  // Sync day name whenever slotDate changes
  useEffect(() => {
    if (slotDate) {
      const [y, m, d] = slotDate.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
      setSlotDay(dayName);
    }
  }, [slotDate]);

  // Auto-dismiss modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
        setIsDeleteModalOpen(false);
      }
    };
    if (isModalOpen || isDeleteModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isDeleteModalOpen]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Timetable Mapping Not Found
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          No official timetable is currently mapped for branch{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-200">
            {profile.branch} ({profile.branchCode})
          </span>
          , section{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-200">
            {profile.section}
          </span>
          .
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Please contact your Department Administrator or Class Representative to publish your section&apos;s schedule.
        </p>
      </div>
    );
  }

  // Filter slots for Weekly View
  const filteredSlots = timetable.slots.filter((s) => {
    if (selectedBatchFilter === "ALL") return true;
    if (selectedBatchFilter === "MY_BATCH") {
      return s.batch === "ALL" || s.batch === profile.batch;
    }
    return s.batch === selectedBatchFilter || s.batch === "ALL";
  });

  // Filter slots for Date View (combines recurring + extra classes - cancelled occurrences)
  const effectiveDateSlots = getEffectiveSlotsForDate(profile, selectedDate, {
    timetable,
    overrides,
    batch: selectedBatchFilter === "MY_BATCH" ? profile.batch : selectedBatchFilter,
    includeCancelled: true,
  });

  const openAddSlot = (day: string, period: number, dateOverride?: string) => {
    setEditingSlotIndex(null);
    setEditingSlot(null);
    setSlotDay(day);
    setSlotPeriod(period);
    // When adding an extra class, default to This Day Only as required
    setSlotFrequency("THIS_DAY_ONLY");
    setSlotDate(dateOverride || selectedDate || getTodayDateStr());

    const defaultSub = timetable.subjects[0];
    setSlotSubjectCode(defaultSub ? defaultSub.code : "BIT-103");
    setSlotSubjectName(defaultSub ? defaultSub.name : "Programming in C");
    setSlotCategory("Theory");
    setSlotBatch(profile.batch || "ALL");
    setSlotRoom(timetable.room);
    setSlotFaculty("");
    setSlotScope(profile.role === "class_admin" ? "CLASS" : "PERSONAL");
    setIsModalOpen(true);
  };

  const openEditSlot = (slot: TimetableSlot, index: number) => {
    setEditingSlotIndex(index);
    setEditingSlot(slot);
    setSlotDay(slot.day);
    setSlotPeriod(slot.period);
    setSlotSubjectCode(slot.subjectCode);
    setSlotSubjectName(slot.subjectName);
    setSlotCategory(slot.category);
    setSlotBatch(slot.batch);
    setSlotRoom(slot.room);
    setSlotFaculty(slot.faculty || "");
    setSlotFrequency(slot.isOneTime ? "THIS_DAY_ONLY" : "EVERY_WEEK");
    setSlotDate(slot.specificDate || selectedDate || getTodayDateStr());
    setSlotScope(profile.role === "class_admin" ? "CLASS" : "PERSONAL");
    setIsModalOpen(true);
  };

  const promptDeleteSlot = (slot: TimetableSlot, index: number | null) => {
    setDeleteTargetSlot(slot);
    setDeleteTargetIndex(index);
    setDeleteOccurrenceDate(slot.specificDate || selectedDate || getTodayDateStr());
    setIsModalOpen(false);
    setIsDeleteModalOpen(true);
  };

  // Option 1: Remove this occurrence only (preserves future & past recurring classes)
  const handleRemoveOccurrenceOnly = async () => {
    if (!deleteTargetSlot) return;

    const override: DateSpecificOverride = {
      id: `ovr-canc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      scope: slotScope,
      studentId: profile.id,
      branchCode: profile.branchCode,
      section: profile.section,
      academicYear: profile.academicYear || "1st Year",
      batch: deleteTargetSlot.batch || "ALL",
      date: deleteOccurrenceDate,
      type: "CANCEL_OCCURRENCE",
      originalPeriod: deleteTargetSlot.period,
      originalSubjectCode: deleteTargetSlot.subjectCode,
      originalSlotId: deleteTargetSlot.id,
      reason: `Cancelled for ${deleteOccurrenceDate}`,
      createdBy: profile.id,
      createdByName: profile.fullName,
      createdByRole: profile.role,
      createdAt: new Date().toISOString(),
    };

    if (slotScope === "CLASS" && (profile.role === "class_admin" || profile.role === "admin")) {
      saveClassOverride(profile.branchCode, profile.section, override);
    } else {
      savePersonalOverride(profile.id, override);
    }

    // Server-side sync
    try {
      await fetch("/api/timetable/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(override),
      });
    } catch (err) {
      console.warn("Server sync error for cancellation override", err);
    }

    const updatedOverrides = getAllOverridesForStudent(profile);
    setOverrides(updatedOverrides);
    setIsDeleteModalOpen(false);
    setDeleteTargetSlot(null);

    setFeedbackToast(
      `Class occurrence for ${deleteTargetSlot.subjectCode} cancelled on ${deleteOccurrenceDate} only. Recurring weekly schedule remains intact!`
    );
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Option 2: Remove every week (removes recurring slot permanently)
  const handleRemoveEveryWeek = () => {
    if (!deleteTargetSlot) return;

    if (deleteTargetIndex !== null && deleteTargetIndex >= 0) {
      const updated = [...timetable.slots];
      updated.splice(deleteTargetIndex, 1);
      const newTimetable = { ...timetable, slots: updated };
      setTimetable(newTimetable);
      saveCustomTimetable(newTimetable.id, newTimetable);

      if (slotScope === "CLASS" && (profile.role === "class_admin" || profile.role === "admin")) {
        saveOfficialClassTimetable(newTimetable, profile.fullName, profile);
      }
    }

    setIsDeleteModalOpen(false);
    setDeleteTargetSlot(null);

    setFeedbackToast(
      `Recurring weekly class ${deleteTargetSlot.subjectCode} removed from timetable. Historical attendance data remains intact!`
    );
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Delete an extra class occurrence directly
  const handleDeleteExtraClass = async () => {
    if (!deleteTargetSlot) return;

    if (deleteTargetSlot.overrideId) {
      deletePersonalOverride(profile.id, deleteTargetSlot.overrideId);
      deleteClassOverride(profile.branchCode, profile.section, deleteTargetSlot.overrideId);

      try {
        await fetch(`/api/timetable/overrides?id=${deleteTargetSlot.overrideId}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.warn("Server sync error for extra class removal", err);
      }
    }

    const updatedOverrides = getAllOverridesForStudent(profile);
    setOverrides(updatedOverrides);
    setIsDeleteModalOpen(false);
    setDeleteTargetSlot(null);

    setFeedbackToast(`Extra class ${deleteTargetSlot.subjectCode} removed successfully.`);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleSaveSlotModal = async () => {
    const periodNum = Number(slotPeriod);
    if (!periodNum || periodNum < 1 || periodNum > 12) {
      alert("Period number must be between 1 and 12.");
      return;
    }

    if (!slotSubjectCode.trim() || !slotSubjectName.trim()) {
      alert("Subject Code and Subject Name are required.");
      return;
    }

    // Branch 1: THIS DAY ONLY (One-time extra class)
    if (slotFrequency === "THIS_DAY_ONLY") {
      if (!slotDate) {
        alert("Please select an exact date for the one-time class.");
        return;
      }

      const occurrenceId = `extra-${slotDate}-p${periodNum}-${slotSubjectCode.trim()}-${Math.random().toString(36).substring(2, 6)}`;
      const overrideId = `ovr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const newOneTimeSlot: TimetableSlot = {
        id: `slot-${occurrenceId}`,
        day: slotDay,
        period: periodNum,
        subjectCode: slotSubjectCode.trim(),
        subjectName: slotSubjectName.trim(),
        category: slotCategory,
        batch: slotBatch,
        room: slotRoom.trim() || timetable.room,
        faculty: slotFaculty.trim(),
        isOneTime: true,
        specificDate: slotDate,
        occurrenceId,
        overrideId,
        status: "SCHEDULED",
      };

      const override: DateSpecificOverride = {
        id: overrideId,
        scope: slotScope,
        studentId: profile.id,
        branchCode: profile.branchCode,
        section: profile.section,
        academicYear: profile.academicYear || "1st Year",
        batch: slotBatch,
        date: slotDate,
        type: "EXTRA_CLASS",
        slot: newOneTimeSlot,
        createdBy: profile.id,
        createdByName: profile.fullName,
        createdByRole: profile.role,
        createdAt: new Date().toISOString(),
      };

      if (slotScope === "CLASS" && (profile.role === "class_admin" || profile.role === "admin")) {
        saveClassOverride(profile.branchCode, profile.section, override);
      } else {
        savePersonalOverride(profile.id, override);
      }

      // Persist to server API
      try {
        await fetch("/api/timetable/overrides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(override),
        });
      } catch (err) {
        console.warn("Server sync error for extra class override", err);
      }

      const updatedOverrides = getAllOverridesForStudent(profile);
      setOverrides(updatedOverrides);
      setIsModalOpen(false);

      setFeedbackToast(
        `Extra class scheduled for ${slotDate} (${slotDay}) Period ${periodNum}! Only visible on this date.`
      );
      setTimeout(() => setFeedbackToast(null), 4000);
      return;
    }

    // Branch 2: EVERY WEEK (Recurring timetable entry)
    const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    if (!validDays.includes(slotDay)) {
      alert("Please select a valid weekday.");
      return;
    }

    const newSlot: TimetableSlot = {
      id: editingSlot?.id || `slot-rec-${Date.now()}`,
      day: slotDay,
      period: periodNum,
      subjectCode: slotSubjectCode.trim(),
      subjectName: slotSubjectName.trim(),
      category: slotCategory,
      batch: slotBatch,
      room: slotRoom.trim() || timetable.room,
      faculty: slotFaculty.trim(),
    };

    const updated = [...timetable.slots];
    if (editingSlotIndex !== null) {
      updated[editingSlotIndex] = newSlot;
    } else {
      updated.push(newSlot);
    }

    const newTimetable = { ...timetable, slots: updated };
    setTimetable(newTimetable);
    saveCustomTimetable(newTimetable.id, newTimetable);

    if (slotScope === "CLASS" && (profile.role === "class_admin" || profile.role === "admin")) {
      saveOfficialClassTimetable(newTimetable, profile.fullName, profile);
    }

    setIsModalOpen(false);
    setFeedbackToast(`Recurring class saved to weekly schedule!`);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleSaveAndActivate = () => {
    saveCustomTimetable(timetable.id, timetable);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handlePublishForEntireClass = () => {
    try {
      const ok = saveOfficialClassTimetable(timetable, profile.fullName, profile);
      if (ok) {
        setClassPublishSuccess(true);
        setTimeout(() => setClassPublishSuccess(false), 4000);
      }
    } catch (err: any) {
      alert(err.message || "Failed to publish class timetable");
    }
  };

  const handleResetToOfficial = () => {
    const official = resetCustomTimetable(profile);
    setTimetable(official);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Drag & Drop Handlers (Weekly Matrix only)
  const handleDragStart = (e: React.DragEvent, slot: TimetableSlot) => {
    setDraggedSlot(slot);
    e.dataTransfer.setData("text/plain", JSON.stringify(slot));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, day: string, period: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragOverCell || dragOverCell.day !== day || dragOverCell.period !== period) {
      setDragOverCell({ day, period });
    }
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent, targetDay: string, targetPeriod: number) => {
    e.preventDefault();
    setDragOverCell(null);

    if (!draggedSlot) return;
    if (draggedSlot.day === targetDay && draggedSlot.period === targetPeriod) {
      setDraggedSlot(null);
      return;
    }

    const updatedSlots = [...timetable.slots];
    const sourceIdx = updatedSlots.findIndex(
      (s) =>
        s.day === draggedSlot.day &&
        s.period === draggedSlot.period &&
        s.subjectCode === draggedSlot.subjectCode &&
        s.batch === draggedSlot.batch
    );

    if (sourceIdx === -1) {
      setDraggedSlot(null);
      return;
    }

    const targetIdx = updatedSlots.findIndex(
      (s) =>
        s.day === targetDay &&
        s.period === targetPeriod &&
        (s.batch === draggedSlot.batch || (s.batch === "ALL" && draggedSlot.batch === "ALL"))
    );

    if (targetIdx !== -1) {
      // Swap slots
      const targetSlot = updatedSlots[targetIdx];
      updatedSlots[sourceIdx] = { ...draggedSlot, day: targetDay, period: targetPeriod };
      updatedSlots[targetIdx] = { ...targetSlot, day: draggedSlot.day, period: draggedSlot.period };
    } else {
      updatedSlots[sourceIdx] = { ...draggedSlot, day: targetDay, period: targetPeriod };
    }

    const newTimetable = { ...timetable, slots: updatedSlots };
    setTimetable(newTimetable);
    saveCustomTimetable(newTimetable.id, newTimetable);
    setDraggedSlot(null);
    setFeedbackToast(`Moved ${draggedSlot.subjectCode} to ${targetDay} Period ${targetPeriod}`);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Date navigation helpers
  const changeDateByDays = (days: number) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, "0");
    const newD = String(dateObj.getDate()).padStart(2, "0");
    setSelectedDate(`${newY}-${newM}-${newD}`);
  };

  const [selY, selM, selD] = (selectedDate || "2026-11-27").split("-").map(Number);
  const selectedDateObj = new Date(selY, (selM || 1) - 1, selD || 27);
  const selectedDayName = selectedDateObj.toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="futuristic-card p-6 rounded-2xl border border-white/[0.08] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              PDF Page {timetable.pageNumber} Reference
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              Classroom: <b className="font-mono text-zinc-800 dark:text-zinc-200">{timetable.room}</b>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Timetable Verification & Management
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Customize weekly recurring schedules or add date-specific one-time extra classes. All changes support full independent attendance marking.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleResetToOfficial}
            className="glossy-btn glossy-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Revert all personal modifications to official MMMUT university timetable"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Revert to Official
          </button>

          {(profile.role === "class_admin" || profile.role === "admin") && (
            <button
              onClick={handlePublishForEntireClass}
              className="glossy-btn glossy-btn-cyan shine-sweep px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Publish timetable changes to the official schedule for your entire class"
            >
              <Sparkles className="w-4 h-4" /> Publish to Entire Class ({profile.branchCode} {profile.section})
            </button>
          )}

          <button
            onClick={handleSaveAndActivate}
            className="glossy-btn glossy-btn-primary shine-sweep px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Personal Timetable
          </button>
        </div>
      </div>

      {classPublishSuccess && (
        <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
          <span>
            Official Class Timetable Published! All students in {profile.branchCode} {profile.section} will now receive this schedule.
          </span>
        </div>
      )}

      {feedbackToast && (
        <div className="p-3.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{feedbackToast}</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Active
          </span>
        </div>
      )}

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Timetable customizations saved successfully! Future attendance sessions will use this updated timetable.
        </div>
      )}

      {/* Control Strip: View Mode, Date Picker, Batch Filter */}
      <div className="futuristic-card p-4 rounded-2xl border border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Left: View Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setViewMode("WEEKLY")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "WEEKLY"
                  ? "glossy-btn glossy-btn-primary text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Recurring Weekly
            </button>
            <button
              onClick={() => setViewMode("DATE")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "DATE"
                  ? "glossy-btn glossy-btn-primary text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Date Schedule (One-Time & Extras)
            </button>
          </div>

          {/* Batch Selector */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setSelectedBatchFilter("MY_BATCH")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedBatchFilter === "MY_BATCH"
                  ? "glossy-btn glossy-btn-primary text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              Batch {profile.batch}
            </button>
            <button
              onClick={() => setSelectedBatchFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedBatchFilter === "ALL"
                  ? "glossy-btn glossy-btn-primary text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              All Batches
            </button>
          </div>
        </div>

        {/* Right: Date Navigator (Active in Date View) */}
        {viewMode === "DATE" ? (
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/[0.08] shadow-inner">
            <button
              onClick={() => changeDateByDays(-1)}
              className="icon-btn-glossy p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-zinc-200 focus:outline-none px-1 cursor-pointer"
            />
            <button
              onClick={() => changeDateByDays(1)}
              className="icon-btn-glossy p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => openAddSlot(selectedDayName, 1, selectedDate)}
              className="glossy-btn glossy-btn-primary shine-sweep px-3 py-1 font-bold text-white rounded-lg flex items-center gap-1 ml-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Extra Class
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openAddSlot("Monday", 1)}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 font-bold rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Class
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: WEEKLY MATRIX */}
      {viewMode === "WEEKLY" && (
        <div className="space-y-4">
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-600" />
              Showing the <b>Recurring Weekly Master Schedule</b>. Drag handle to reorder slots or click any card to edit.
            </span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {filteredSlots.length} Weekly Classes
            </span>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto">
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
                    const slotsForCell = filteredSlots.filter(
                      (s) => s.day === day && s.period === periodNum
                    );
                    const isOver = dragOverCell?.day === day && dragOverCell?.period === periodNum;

                    return (
                      <div
                        key={periodNum}
                        onDragOver={(e) => handleDragOver(e, day, periodNum)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day, periodNum)}
                        className={`p-1.5 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between group relative transition-all duration-150 ${
                          isOver
                            ? "bg-indigo-100/70 dark:bg-indigo-950/70 border-2 border-dashed border-indigo-500 scale-[1.02] shadow-inner"
                            : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        {isOver && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-indigo-500/10 z-10 rounded">
                            <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded shadow">
                              Drop to Move
                            </span>
                          </div>
                        )}

                        {slotsForCell.length === 0 ? (
                          <div className="h-full flex items-center justify-center">
                            <button
                              onClick={() => openAddSlot(day, periodNum)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 hover:bg-indigo-100 text-[10px] font-bold transition-opacity flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {slotsForCell.map((slot) => {
                              const originalIndex = timetable.slots.indexOf(slot);
                              const isBeingDragged =
                                draggedSlot?.day === slot.day &&
                                draggedSlot?.period === slot.period &&
                                draggedSlot?.subjectCode === slot.subjectCode &&
                                draggedSlot?.batch === slot.batch;

                              return (
                                <div
                                  key={`${slot.subjectCode}-${slot.batch}-${slot.period}`}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, slot)}
                                  onClick={() => openEditSlot(slot, originalIndex)}
                                  className={`p-2 rounded-lg border text-left cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] shadow-xs relative group/card ${
                                    isBeingDragged ? "opacity-40 scale-95 ring-2 ring-indigo-500" : ""
                                  } ${
                                    slot.category === "Lab"
                                      ? "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200"
                                      : slot.category === "Tutorial"
                                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                                      : "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] font-black">
                                    <span className="flex items-center gap-1">
                                      <GripVertical className="w-3 h-3 text-zinc-400 group-hover/card:text-indigo-600" />
                                      {slot.subjectCode}
                                    </span>
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

                  {/* Lunch Cell */}
                  <div className="bg-amber-50/40 dark:bg-amber-950/10 border-r border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[10px] text-amber-700/60 font-mono uppercase tracking-wider">
                    Recess
                  </div>

                  {/* Periods 5 - 8 */}
                  {[5, 6, 7, 8].map((periodNum) => {
                    const slotsForCell = filteredSlots.filter(
                      (s) => s.day === day && s.period === periodNum
                    );
                    const isOver = dragOverCell?.day === day && dragOverCell?.period === periodNum;

                    return (
                      <div
                        key={periodNum}
                        onDragOver={(e) => handleDragOver(e, day, periodNum)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day, periodNum)}
                        className={`p-1.5 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 flex flex-col justify-between group relative transition-all duration-150 ${
                          isOver
                            ? "bg-indigo-100/70 dark:bg-indigo-950/70 border-2 border-dashed border-indigo-500 scale-[1.02] shadow-inner"
                            : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        {isOver && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-indigo-500/10 z-10 rounded">
                            <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded shadow">
                              Drop to Move
                            </span>
                          </div>
                        )}

                        {slotsForCell.length === 0 ? (
                          <div className="h-full flex items-center justify-center">
                            <button
                              onClick={() => openAddSlot(day, periodNum)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 hover:bg-indigo-100 text-[10px] font-bold transition-opacity flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {slotsForCell.map((slot) => {
                              const originalIndex = timetable.slots.indexOf(slot);
                              const isBeingDragged =
                                draggedSlot?.day === slot.day &&
                                draggedSlot?.period === slot.period &&
                                draggedSlot?.subjectCode === slot.subjectCode &&
                                draggedSlot?.batch === slot.batch;

                              return (
                                <div
                                  key={`${slot.subjectCode}-${slot.batch}-${slot.period}`}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, slot)}
                                  onClick={() => openEditSlot(slot, originalIndex)}
                                  className={`p-2 rounded-lg border text-left cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] shadow-xs relative group/card ${
                                    isBeingDragged ? "opacity-40 scale-95 ring-2 ring-indigo-500" : ""
                                  } ${
                                    slot.category === "Lab"
                                      ? "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200"
                                      : slot.category === "Tutorial"
                                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                                      : "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] font-black">
                                    <span className="flex items-center gap-1">
                                      <GripVertical className="w-3 h-3 text-zinc-400 group-hover/card:text-indigo-600" />
                                      {slot.subjectCode}
                                    </span>
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

      {/* VIEW 2: DATE-SPECIFIC SCHEDULE (Shows One-Time Extra Classes & Overrides) */}
      {viewMode === "DATE" && (
        <div className="space-y-4">
          <div className="p-3 bg-violet-50/70 dark:bg-violet-950/30 rounded-xl border border-violet-200 dark:border-violet-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-violet-950 dark:text-violet-200">
            <span className="flex items-center gap-1.5 font-medium">
              <CalendarDays className="w-4 h-4 text-violet-600 shrink-0" />
              Viewing schedule for <b className="font-bold">{selectedDate} ({selectedDayName})</b>. This view synthesizes recurring classes, one-time extra classes, and date cancellations.
            </span>
            <span className="font-bold text-violet-700 dark:text-violet-400">
              {effectiveDateSlots.length} Classes Scheduled
            </span>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
            {effectiveDateSlots.length === 0 ? (
              <div className="py-16 text-center text-zinc-500">
                <Calendar className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
                  No classes scheduled for {selectedDate} ({selectedDayName})
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Click the &quot;Extra Class&quot; button above to schedule a one-time class on this date.
                </p>
              </div>
            ) : (
              effectiveDateSlots.map((slot) => {
                const isCancelled = slot.status === "CANCELLED";

                return (
                  <div
                    key={slot.occurrenceId || `${slot.period}-${slot.subjectCode}`}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isCancelled
                        ? "bg-rose-50/30 dark:bg-rose-950/20 opacity-60 line-through"
                        : slot.isOneTime
                        ? "bg-violet-50/30 dark:bg-violet-950/20"
                        : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-sm flex items-center justify-center shrink-0">
                        P{slot.period}
                      </span>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {slot.subjectCode}
                          </span>

                          {slot.isOneTime ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                              One-Time Extra Class
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              Recurring Weekly
                            </span>
                          )}

                          {isCancelled && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                              Cancelled for this date
                            </span>
                          )}

                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {slot.category}
                          </span>

                          <span className="text-xs text-zinc-400 font-mono">
                            {slot.room}
                          </span>
                          <span className="text-xs text-zinc-400 font-mono">
                            Batch: {slot.batch}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">
                          {slot.subjectName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => promptDeleteSlot(slot, null)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT CLASS WITH FREQUENCY SELECTION */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {editingSlotIndex !== null ? "Edit Timetable Slot" : "Add Scheduled Class"}
            </h3>

            {/* Frequency Selection: THIS DAY ONLY vs EVERY WEEK */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block text-xs">
                Schedule Frequency
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSlotFrequency("THIS_DAY_ONLY")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    slotFrequency === "THIS_DAY_ONLY"
                      ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 dark:border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    This Day Only
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1 leading-snug">
                    One-time extra class for a specific date. Will not modify recurring weekly schedule.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSlotFrequency("EVERY_WEEK")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    slotFrequency === "EVERY_WEEK"
                      ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 dark:border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                    Every Week
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1 leading-snug">
                    Recurring class that repeats every week on the chosen weekday.
                  </div>
                </button>
              </div>
            </div>

            {/* Scope Selection (for CR or Admin) */}
            {(profile.role === "class_admin" || profile.role === "admin") && (
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block text-xs">
                  Modification Scope
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSlotScope("PERSONAL")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      slotScope === "PERSONAL"
                        ? "bg-indigo-50 border-indigo-600 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-bold"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Personal Timetable Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotScope("CLASS")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      slotScope === "CLASS"
                        ? "bg-purple-50 border-purple-600 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 font-bold"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Publish for Class ({profile.branchCode} {profile.section})
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Conditional Date / Day Picker */}
              {slotFrequency === "THIS_DAY_ONLY" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Occurrence Date
                    </label>
                    <input
                      type="date"
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Period (Lecture Slot)
                    </label>
                    <select
                      value={slotPeriod}
                      onChange={(e) => setSlotPeriod(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold"
                    >
                      {PERIODS.map((p) => (
                        <option key={p.period} value={p.period}>
                          Period {p.period} ({p.time})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Day of Week
                    </label>
                    <select
                      value={slotDay}
                      onChange={(e) => setSlotDay(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold"
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Period
                    </label>
                    <select
                      value={slotPeriod}
                      onChange={(e) => setSlotPeriod(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold"
                    >
                      {PERIODS.map((p) => (
                        <option key={p.period} value={p.period}>
                          Period {p.period} ({p.time})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                  Subject Code
                </label>
                <input
                  type="text"
                  value={slotSubjectCode}
                  onChange={(e) => setSlotSubjectCode(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={slotSubjectName}
                  onChange={(e) => setSlotSubjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Classification
                  </label>
                  <select
                    value={slotCategory}
                    onChange={(e) => setSlotCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold"
                  >
                    <option value="Theory">Theory Class</option>
                    <option value="Lab">Practical / Lab</option>
                    <option value="Tutorial">Tutorial</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Target Batch
                  </label>
                  <select
                    value={slotBatch}
                    onChange={(e) => setSlotBatch(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold"
                  >
                    <option value="ALL">All Batches (P1 + P2)</option>
                    <option value="P1">Batch P1 Only</option>
                    <option value="P2">Batch P2 Only</option>
                    <option value="P3">Batch P3 Only</option>
                    <option value="P4">Batch P4 Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Room / Lab
                  </label>
                  <input
                    type="text"
                    value={slotRoom}
                    onChange={(e) => setSlotRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Faculty (Optional)
                  </label>
                  <input
                    type="text"
                    value={slotFaculty}
                    onChange={(e) => setSlotFaculty(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              {editingSlotIndex !== null || editingSlot ? (
                <button
                  type="button"
                  onClick={() => promptDeleteSlot(editingSlot || timetable.slots[editingSlotIndex!], editingSlotIndex)}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Class
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSlotModal}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Class
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DELETE SCOPE SELECTION (Remove Occurrence Only vs Remove Every Week) */}
      {isDeleteModalOpen && deleteTargetSlot && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeleteModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Remove Class: {deleteTargetSlot.subjectCode}
              </h3>
              <p className="text-xs text-zinc-500">
                {deleteTargetSlot.subjectName} (Period {deleteTargetSlot.period}, Batch {deleteTargetSlot.batch})
              </p>
            </div>

            {deleteTargetSlot.isOneTime ? (
              // Case A: Target slot is an Extra Class occurrence
              <div className="space-y-4 pt-2">
                <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center">
                  This is a one-time extra class scheduled for <b>{deleteTargetSlot.specificDate}</b>. Removing it will delete this occurrence only.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteExtraClass}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm"
                  >
                    Delete Extra Class
                  </button>
                </div>
              </div>
            ) : (
              // Case B: Target slot is a Recurring Class
              <div className="space-y-3 pt-2 text-xs">
                <p className="text-zinc-600 dark:text-zinc-400">
                  Select how you would like to remove this class:
                </p>

                {/* Option 1: Remove this occurrence only */}
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      Remove This Occurrence Only
                    </span>
                    <input
                      type="date"
                      value={deleteOccurrenceDate}
                      onChange={(e) => setDeleteOccurrenceDate(e.target.value)}
                      className="px-2 py-0.5 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700 rounded text-[11px] font-mono font-bold"
                    />
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                    Cancels this class for <b>{deleteOccurrenceDate}</b> only. Future and past weeks will continue showing this lecture as normal, and historical attendance is 100% preserved.
                  </p>
                  <button
                    onClick={handleRemoveOccurrenceOnly}
                    className="w-full py-2 font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-800 rounded-lg transition-colors"
                  >
                    Cancel for {deleteOccurrenceDate} Only
                  </button>
                </div>

                {/* Option 2: Remove every week */}
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl space-y-2">
                  <span className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    Remove Every Week
                  </span>
                  <p className="text-[11px] text-rose-800 dark:text-rose-400 leading-relaxed">
                    Permanently deletes this recurring lecture from your weekly timetable. Historical attendance logs are kept safe and will NOT be deleted.
                  </p>
                  <button
                    onClick={handleRemoveEveryWeek}
                    className="w-full py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs"
                  >
                    Delete From Weekly Timetable
                  </button>
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="text-xs text-zinc-500 hover:underline"
                  >
                    Keep Class (Cancel)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Radial Navigation Wheel */}
      <RadialNavWheel variant="floating" />
    </div>
  );
}
