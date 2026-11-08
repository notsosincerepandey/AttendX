"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  StudentProfile,
  UniversityTimetable,
  TimetableSlot,
  AttendanceCategory,
} from "@/types";
import {
  getStoredProfile,
  getActiveTimetable,
  saveCustomTimetable,
  saveOfficialClassTimetable,
  resetCustomTimetable,
} from "@/lib/storage";
import { UNIVERSITY_DATABASE } from "@/data/extractedTimetables";
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
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("MY_BATCH");
  const [effectiveDate, setEffectiveDate] = useState<string>("2026-11-07");
  const [versionLabel, setVersionLabel] = useState<string>("V1.1 (Personalized)");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [classPublishSuccess, setClassPublishSuccess] = useState<boolean>(false);

  // Drag and drop state
  const [draggedSlot, setDraggedSlot] = useState<TimetableSlot | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: string; period: number } | null>(null);
  const [moveToast, setMoveToast] = useState<string | null>(null);

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [slotDay, setSlotDay] = useState<string>("Monday");
  const [slotPeriod, setSlotPeriod] = useState<number>(1);
  const [slotSubjectCode, setSlotSubjectCode] = useState<string>("");
  const [slotSubjectName, setSlotSubjectName] = useState<string>("");
  const [slotCategory, setSlotCategory] = useState<AttendanceCategory>("Theory");
  const [slotBatch, setSlotBatch] = useState<string>("ALL");
  const [slotRoom, setSlotRoom] = useState<string>("");
  const [slotFaculty, setSlotFaculty] = useState<string>("");

  useEffect(() => {
    const prof = getStoredProfile();
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
    setProfile(prof);
    setTimetable(tt ? JSON.parse(JSON.stringify(tt)) : null); // clone for local edits
  }, [router]);

  // Auto-dismiss modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    if (isModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

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
          No official timetable is currently mapped for branch <span className="font-semibold text-zinc-900 dark:text-zinc-200">{profile.branch} ({profile.branchCode})</span>, section <span className="font-semibold text-zinc-900 dark:text-zinc-200">{profile.section}</span>.
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Please contact your Department Administrator or Class Representative to publish your section&apos;s schedule.
        </p>
      </div>
    );
  }

  // Filter slots by batch selection
  const filteredSlots = timetable.slots.filter((s) => {
    if (selectedBatchFilter === "ALL") return true;
    if (selectedBatchFilter === "MY_BATCH") {
      return s.batch === "ALL" || s.batch === profile.batch;
    }
    return s.batch === selectedBatchFilter || s.batch === "ALL";
  });

  const openAddSlot = (day: string, period: number) => {
    setEditingSlotIndex(null);
    setSlotDay(day);
    setSlotPeriod(period);
    const defaultSub = timetable.subjects[0];
    setSlotSubjectCode(defaultSub ? defaultSub.code : "BIT-103");
    setSlotSubjectName(defaultSub ? defaultSub.name : "Programming in C");
    setSlotCategory("Theory");
    setSlotBatch("ALL");
    setSlotRoom(timetable.room);
    setSlotFaculty("");
    setIsModalOpen(true);
  };

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
    setIsModalOpen(true);
  };

  const handleDeleteSlot = (index: number) => {
    const updated = [...timetable.slots];
    updated.splice(index, 1);
    const newTimetable = { ...timetable, slots: updated };
    setTimetable(newTimetable);
    saveCustomTimetable(newTimetable.id, newTimetable);
  };

  const handleSaveSlotModal = () => {
    const periodNum = Number(slotPeriod);
    if (!periodNum || periodNum < 1 || periodNum > 12) {
      alert("Period number must be between 1 and 12.");
      return;
    }

    const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    if (!validDays.includes(slotDay)) {
      alert("Please select a valid weekday.");
      return;
    }

    if (!slotSubjectCode.trim() || !slotSubjectName.trim()) {
      alert("Subject Code and Subject Name are required.");
      return;
    }

    const newSlot: TimetableSlot = {
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
    setIsModalOpen(false);
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

  // Drag & Drop Handlers
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

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if dragging out of cell container
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

    // Check if target cell already has a slot with overlapping batch
    const targetIdx = updatedSlots.findIndex(
      (s) =>
        s.day === targetDay &&
        s.period === targetPeriod &&
        (s.batch === draggedSlot.batch || (s.batch === "ALL" && draggedSlot.batch === "ALL"))
    );

    if (targetIdx !== -1) {
      // Swap the two slots!
      const targetSlot = updatedSlots[targetIdx];
      updatedSlots[sourceIdx] = {
        ...draggedSlot,
        day: targetDay,
        period: targetPeriod,
      };
      updatedSlots[targetIdx] = {
        ...targetSlot,
        day: draggedSlot.day,
        period: draggedSlot.period,
      };
      setMoveToast(
        `Swapped ${draggedSlot.subjectCode} (${draggedSlot.day} P${draggedSlot.period}) with ${targetSlot.subjectCode} (${targetDay} P${targetPeriod})`
      );
    } else {
      // Move slot directly into target empty period
      updatedSlots[sourceIdx] = {
        ...draggedSlot,
        day: targetDay,
        period: targetPeriod,
      };
      setMoveToast(
        `Moved ${draggedSlot.subjectCode} from ${draggedSlot.day} P${draggedSlot.period} to ${targetDay} Period ${targetPeriod}`
      );
    }

    const newTimetable = { ...timetable, slots: updatedSlots };
    setTimetable(newTimetable);
    saveCustomTimetable(newTimetable.id, newTimetable);
    setDraggedSlot(null);
    setTimeout(() => setMoveToast(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            Timetable Verification & Personalization
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Drag & drop any class to another slot or day to rearrange. Click any class to edit theory/lab classification, faculty, or room.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleResetToOfficial}
            className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5"
            title="Revert all personal modifications to official MMMUT university timetable"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Revert to Official
          </button>

          {(profile.role === "class_admin" || profile.role === "admin") && (
            <button
              onClick={handlePublishForEntireClass}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/25 transition-all flex items-center gap-1.5"
              title="Publish timetable changes to the official schedule for your entire class"
            >
              <Sparkles className="w-4 h-4" /> Publish to Entire Class ({profile.branchCode} {profile.section})
            </button>
          )}

          <button
            onClick={handleSaveAndActivate}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Save Personal Timetable
          </button>
        </div>
      </div>

      {classPublishSuccess && (
        <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
          <span>
            Official Class Timetable Published! All students in {profile.branchCode} {profile.section} will now receive this schedule, and an announcement was dispatched to their notification feeds.
          </span>
        </div>
      )}

      {/* Drag & Drop Feedback Toast */}
      {moveToast && (
        <div className="p-3.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4" />
            <span>{moveToast}</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Auto-Saved
          </span>
        </div>
      )}

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Timetable customizations saved successfully! Future attendance sessions will use this updated timetable.
        </div>
      )}

      {/* Interactive Helper Banner */}
      <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/40 dark:to-sky-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-3 text-xs text-indigo-950 dark:text-indigo-200">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            <b>Drag and drop:</b> Grab the handle icon <GripVertical className="w-3 h-3 inline text-zinc-500" /> on any class card to move it into any empty period or swap it with an existing lecture.
          </span>
        </div>
        <span className="font-semibold text-indigo-700 dark:text-indigo-300 hidden sm:inline">
          {filteredSlots.length} Classes Visible
        </span>
      </div>

      {/* Control Strip: Batch Filter & Versioning */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-500" /> View Filter:
          </span>
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setSelectedBatchFilter("MY_BATCH")}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                selectedBatchFilter === "MY_BATCH"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              My Batch ({profile.batch})
            </button>
            <button
              onClick={() => setSelectedBatchFilter("ALL")}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                selectedBatchFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              Show All Batches (P1 + P2)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-medium">Effective Date:</span>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 font-mono text-zinc-800 dark:text-zinc-200"
            />
          </div>
        </div>
      </div>

      {/* Weekly Matrix Grid with Drag and Drop */}
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
                          <Plus className="w-3 h-3" /> Add Class
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
                              key={`${slot.subjectCode}-${slot.batch}`}
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
                          <Plus className="w-3 h-3" /> Add Class
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
                              key={`${slot.subjectCode}-${slot.batch}`}
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

      {/* Edit / Add Slot Modal */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {editingSlotIndex !== null ? "Edit Timetable Slot" : "Add Scheduled Class"}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Day
                  </label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
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
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
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
                    Applicable Batch
                  </label>
                  <select
                    value={slotBatch}
                    onChange={(e) => setSlotBatch(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold"
                  >
                    <option value="ALL">All Batches</option>
                    <option value="P1">Batch P1</option>
                    <option value="P2">Batch P2</option>
                    <option value="P3">Batch P3</option>
                    <option value="P4">Batch P4</option>
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
                    Faculty
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
              {editingSlotIndex !== null ? (
                <button
                  onClick={() => {
                    handleDeleteSlot(editingSlotIndex);
                    setIsModalOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Class
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSlotModal}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
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
