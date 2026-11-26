"use client";

import React, { useState, useEffect } from "react";
import {
  StudentProfile,
  AttendanceRecord,
  UniversityTimetable,
  TimetableSlot,
} from "@/types";
import {
  getStoredProfile,
  getStoredAttendance,
  getActiveTimetable,
  updatePeriodAttendance,
  markAllPeriodsForDate,
  markLabSession,
  saveStoredAttendance,
  getTodayDateStr,
} from "@/lib/storage";
import { getEffectiveSlotsForDate } from "@/lib/timetableOverrides";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Clock,
  Sparkles,
  FlaskConical,
  BookOpen,
  Filter,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import RadialNavWheel from "@/components/RadialNavWheel";

export default function MarkAttendancePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [timetable, setTimetable] = useState<UniversityTimetable | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    const prof = getStoredProfile();
    if (!prof) {
      setProfile(null);
      return;
    }
    const tt = getActiveTimetable(prof);
    const att = getStoredAttendance(prof);
    const today = getTodayDateStr();

    setProfile(prof);
    setTimetable(tt);
    setRecords(att);
    setSelectedDate(today);
  }, []);

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

  // Parse day name for selectedDate
  const currDateObj = new Date(selectedDate || getTodayDateStr());
  const selectedDayName = currDateObj.toLocaleDateString("en-US", { weekday: "long" });

  // Get effective scheduled timetable slots for this specific date (including one-time extra classes)
  const scheduledSlots = getEffectiveSlotsForDate(profile, selectedDate, { timetable });

  // Filter attendance records exist for this selected date
  const dayRecords = records.filter((r) => r.date === selectedDate);

  const handleStatusChange = (
    slot: TimetableSlot,
    newStatus: "PRESENT" | "ABSENT" | "CANCELLED"
  ) => {
    const existing = records.find((r) => {
      if (r.date !== selectedDate) return false;
      if (slot.occurrenceId && r.occurrenceId) {
        return r.occurrenceId === slot.occurrenceId;
      }
      return r.period === slot.period && r.subjectCode === slot.subjectCode;
    });

    let updated: AttendanceRecord[];
    if (existing) {
      updated = updatePeriodAttendance(existing.id, newStatus);
    } else {
      const newRecord: AttendanceRecord = {
        id: `att-${selectedDate}-p${slot.period}-${slot.subjectCode}${slot.occurrenceId ? `-${slot.occurrenceId}` : ""}`,
        studentId: profile.id,
        date: selectedDate,
        period: slot.period,
        subjectCode: slot.subjectCode,
        subjectName: slot.subjectName,
        category: slot.category,
        batch: slot.batch,
        room: slot.room,
        faculty: slot.faculty,
        status: newStatus,
        markedAt: new Date().toISOString(),
        markedBy: "STUDENT",
        isExtraClass: slot.isOneTime,
        occurrenceId: slot.occurrenceId,
        slotId: slot.id,
      };
      updated = [...records, newRecord];
      saveStoredAttendance(updated, profile.id);
    }
    setRecords(updated);
  };

  const changeDateByDays = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const newDateStr = d.toISOString().split("T")[0];
    setSelectedDate(newDateStr);
  };

  // Find if there's a multi-period practical session on this day
  const labSlots = scheduledSlots.filter((s) => s.category === "Lab");
  const uniqueLabSubjects = Array.from(new Set(labSlots.map((s) => s.subjectCode)));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 futuristic-card p-6 rounded-2xl border border-white/[0.08] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-indigo-400 flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-indigo-400" />
            Daily Attendance Marking
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Mark your attendance period by period. Every individual lecture or lab period counts as 1 attendance unit.
          </p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2 bg-zinc-900/90 p-1.5 rounded-xl border border-white/10 shadow-inner">
          <button
            onClick={() => changeDateByDays(-1)}
            className="icon-btn-glossy p-1.5 rounded-lg text-zinc-400 hover:text-white"
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
            className="icon-btn-glossy p-1.5 rounded-lg text-zinc-400 hover:text-white"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Marking Actions Bar */}
      {scheduledSlots.length > 0 && (
        <div className="futuristic-card p-4 rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/20 via-sky-950/20 to-purple-950/20 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-300">
            <span className="font-bold text-indigo-400">{scheduledSlots.length} Classes</span> scheduled for <span className="font-semibold text-white">{selectedDayName}</span> ({profile.branchCode} {profile.section}, Batch {profile.batch})
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const updated = markAllPeriodsForDate(selectedDate, "PRESENT");
                setRecords(updated);
              }}
              className="glossy-btn glossy-btn-emerald shine-sweep px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark All Present (+{scheduledSlots.length})
            </button>
            <button
              onClick={() => {
                const updated = markAllPeriodsForDate(selectedDate, "ABSENT");
                setRecords(updated);
              }}
              className="glossy-btn glossy-btn-rose shine-sweep px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" /> Mark All Absent
            </button>
            <button
              onClick={() => {
                const updated = markAllPeriodsForDate(selectedDate, "CANCELLED");
                setRecords(updated);
              }}
              className="glossy-btn glossy-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 shadow-sm"
            >
              Mark All Cancelled
            </button>
          </div>
        </div>
      )}

      {/* Multi-Period Lab Quick Actions (if applicable on this day) */}
      {uniqueLabSubjects.length > 0 && (
        <div className="space-y-2">
          {uniqueLabSubjects.map((subCode) => {
            const periodsForLab = scheduledSlots.filter((s) => s.subjectCode === subCode && s.category === "Lab");
            const firstLabSlot = periodsForLab[0];

            return (
              <div
                key={subCode}
                className="futuristic-card p-4 rounded-xl border border-teal-500/20 bg-gradient-to-r from-teal-950/20 to-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-teal-500/20 border border-teal-500/30 text-teal-300 rounded-lg shadow-sm">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-teal-300">
                        Multi-Period Lab Session: {subCode}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-900/60 text-teal-200 border border-teal-700/50">
                        {periodsForLab.length} Consecutive Periods ({periodsForLab.map(p => `P${p.period}`).join(", ")})
                      </span>
                    </div>
                    <p className="text-xs text-teal-400 mt-0.5">
                      {firstLabSlot.subjectName} in {firstLabSlot.room}. Each period constitutes 1 discrete attendance unit ({periodsForLab.length} units total).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      const updated = markLabSession(selectedDate, subCode, "PRESENT");
                      setRecords(updated);
                    }}
                    className="glossy-btn glossy-btn-primary shine-sweep px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Entire Lab Present
                  </button>
                  <button
                    onClick={() => {
                      const updated = markLabSession(selectedDate, subCode, "ABSENT");
                      setRecords(updated);
                    }}
                    className="glossy-btn glossy-btn-rose shine-sweep px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Mark Lab Absent
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scheduled Periods Table / Cards */}
      <div className="futuristic-card rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden">
        {scheduledSlots.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Calendar className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <h3 className="text-base font-bold text-zinc-200">
              No classes scheduled on {selectedDayName}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
              According to the MMMUT official timetable, blank blocks are free periods and generate no attendance records.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {scheduledSlots.map((slot) => {
              const record = dayRecords.find((r) => {
                if (slot.occurrenceId && r.occurrenceId) {
                  return r.occurrenceId === slot.occurrenceId;
                }
                return r.period === slot.period && r.subjectCode === slot.subjectCode;
              });
              const status = record?.status || "PENDING";

              return (
                <div
                  key={slot.occurrenceId || `${slot.period}-${slot.subjectCode}`}
                  className={`interactive-tile p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 ${
                    status === "PRESENT"
                      ? "bg-emerald-500/[0.06] border-l-4 border-l-emerald-500"
                      : status === "ABSENT"
                      ? "bg-rose-500/[0.06] border-l-4 border-l-rose-500"
                      : status === "CANCELLED"
                      ? "bg-zinc-800/30 opacity-70 border-l-4 border-l-zinc-600"
                      : ""
                  }`}
                >
                  {/* Slot Information */}
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-white/[0.03] border border-white/10 text-center shrink-0 shadow-inner">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Period</span>
                      <span className="text-lg font-black text-white">
                        {slot.period}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {slot.subjectCode}
                        </span>
                        {slot.isOneTime && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800/60">
                            Extra Class
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            slot.category === "Lab"
                              ? "bg-teal-950/80 text-teal-300 border border-teal-800/50"
                              : slot.category === "Tutorial"
                              ? "bg-amber-950/80 text-amber-300 border border-amber-800/50"
                              : "bg-indigo-950/80 text-indigo-300 border border-indigo-800/50"
                          }`}
                        >
                          {slot.category}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          Room: {slot.room}
                        </span>
                        <span className="text-xs text-zinc-400">
                          Batch: {slot.batch}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-zinc-100">
                        {slot.subjectName}
                      </h3>
                      {slot.faculty && (
                        <p className="text-xs text-zinc-400">Faculty: {slot.faculty}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions / Status */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStatusChange(slot, "PRESENT")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          status === "PRESENT"
                            ? "glossy-btn glossy-btn-emerald ring-2 ring-emerald-500/40 text-white shadow-md shadow-emerald-950/30"
                            : "glossy-btn glossy-btn-secondary text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/30"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Present (+1)
                      </button>
                      <button
                        onClick={() => handleStatusChange(slot, "ABSENT")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          status === "ABSENT"
                            ? "glossy-btn glossy-btn-rose ring-2 ring-rose-500/40 text-white shadow-md shadow-rose-950/30"
                            : "glossy-btn glossy-btn-secondary text-zinc-300 hover:text-rose-400 hover:border-rose-500/30"
                        }`}
                      >
                        <XCircle className="w-4 h-4" /> Absent
                      </button>
                      <button
                        onClick={() => handleStatusChange(slot, "CANCELLED")}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          status === "CANCELLED"
                            ? "glossy-btn ring-2 ring-zinc-500/40 bg-zinc-700 text-white"
                            : "glossy-btn glossy-btn-secondary text-zinc-400 hover:text-zinc-200"
                        }`}
                        title="Exclude from attendance calculations"
                      >
                        Cancelled (0)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rules Notice */}
      <div className="p-4 futuristic-card rounded-xl border border-white/5 text-xs text-zinc-400 space-y-1">
        <div className="font-bold text-zinc-200 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-400" /> Attendance Calculation Protocol:
        </div>
        <p>
          &bull; <b>Present:</b> +1 Attended, +1 Conducted. &bull; <b>Absent:</b> +0 Attended, +1 Conducted. &bull; <b>Cancelled:</b> Excluded (+0 Attended, +0 Conducted).
        </p>
        <p>
          &bull; Multi-period laboratories (e.g. 4 consecutive periods) generate 4 discrete attendance units. Unmarked periods automatically mark as Absent after the cutoff deadline.
        </p>
      </div>

      {/* Floating Radial Navigation Wheel */}
      <RadialNavWheel variant="floating" />
    </div>
  );
}
