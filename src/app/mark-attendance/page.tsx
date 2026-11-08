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

  if (!profile || !timetable) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Parse day name for selectedDate
  const currDateObj = new Date(selectedDate || getTodayDateStr());
  const selectedDayName = currDateObj.toLocaleDateString("en-US", { weekday: "long" });

  // Get scheduled timetable slots for this day for this student's batch
  const scheduledSlots = timetable.slots
    .filter(
      (s) => s.day === selectedDayName && (s.batch === "ALL" || s.batch === profile.batch)
    )
    .sort((a, b) => a.period - b.period);

  // Filter attendance records exist for this selected date
  const dayRecords = records.filter((r) => r.date === selectedDate);

  const handleStatusChange = (
    slot: TimetableSlot,
    newStatus: "PRESENT" | "ABSENT" | "CANCELLED"
  ) => {
    const existing = records.find(
      (r) => r.date === selectedDate && r.period === slot.period && r.subjectCode === slot.subjectCode
    );

    let updated: AttendanceRecord[];
    if (existing) {
      updated = updatePeriodAttendance(existing.id, newStatus);
    } else {
      const newRecord: AttendanceRecord = {
        id: `att-${selectedDate}-p${slot.period}-${slot.subjectCode}`,
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-indigo-600 flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Daily Attendance Marking
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Mark your attendance period by period. Every individual lecture or lab period counts as 1 attendance unit.
          </p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => changeDateByDays(-1)}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none px-1"
          />
          <button
            onClick={() => changeDateByDays(1)}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Marking Actions Bar */}
      {scheduledSlots.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/30 dark:to-sky-950/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-700 dark:text-zinc-300">
            <span className="font-bold text-indigo-700 dark:text-indigo-300">{scheduledSlots.length} Classes</span> scheduled for <span className="font-semibold">{selectedDayName}</span> ({profile.branchCode} {profile.section}, Batch {profile.batch})
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const updated = markAllPeriodsForDate(selectedDate, "PRESENT");
                setRecords(updated);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Mark All Present (+{scheduledSlots.length})
            </button>
            <button
              onClick={() => {
                const updated = markAllPeriodsForDate(selectedDate, "ABSENT");
                setRecords(updated);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm"
            >
              Mark All Absent
            </button>
            <button
              onClick={() => {
                const updated = markAllPeriodsForDate(selectedDate, "CANCELLED");
                setRecords(updated);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors shadow-sm border border-zinc-300 dark:border-zinc-700"
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
                className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-teal-600 text-white rounded-lg">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-teal-800 dark:text-teal-300">
                        Multi-Period Lab Session: {subCode}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200/60 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200">
                        {periodsForLab.length} Consecutive Periods ({periodsForLab.map(p => `P${p.period}`).join(", ")})
                      </span>
                    </div>
                    <p className="text-xs text-teal-700 dark:text-teal-400 mt-0.5">
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
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors"
                  >
                    Mark Entire Lab Present
                  </button>
                  <button
                    onClick={() => {
                      const updated = markLabSession(selectedDate, subCode, "ABSENT");
                      setRecords(updated);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                  >
                    Mark Lab Absent
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scheduled Periods Table / Cards */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {scheduledSlots.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Calendar className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
              No classes scheduled on {selectedDayName}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
              According to the MMMUT official timetable, blank blocks are free periods and generate no attendance records.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {scheduledSlots.map((slot) => {
              const record = dayRecords.find(
                (r) => r.period === slot.period && r.subjectCode === slot.subjectCode
              );
              const status = record?.status || "PENDING";

              return (
                <div
                  key={`${slot.period}-${slot.subjectCode}`}
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    status === "PRESENT"
                      ? "bg-emerald-50/20"
                      : status === "ABSENT"
                      ? "bg-rose-50/20"
                      : status === "CANCELLED"
                      ? "bg-zinc-100/40 dark:bg-zinc-800/20 opacity-70"
                      : ""
                  }`}
                >
                  {/* Slot Information */}
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center shrink-0">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">Period</span>
                      <span className="text-lg font-black text-zinc-900 dark:text-white">
                        {slot.period}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {slot.subjectCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            slot.category === "Lab"
                              ? "bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300"
                              : slot.category === "Tutorial"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300"
                          }`}
                        >
                          {slot.category}
                        </span>
                        <span className="text-xs font-mono text-zinc-500">
                          Room: {slot.room}
                        </span>
                        <span className="text-xs text-zinc-400">
                          Batch: {slot.batch}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {slot.subjectName}
                      </h3>
                      {slot.faculty && (
                        <p className="text-xs text-zinc-500">Faculty: {slot.faculty}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions / Status */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStatusChange(slot, "PRESENT")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          status === "PRESENT"
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/40"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Present (+1)
                      </button>
                      <button
                        onClick={() => handleStatusChange(slot, "ABSENT")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          status === "ABSENT"
                            ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 ring-2 ring-rose-500/40"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-rose-50 hover:text-rose-700"
                        }`}
                      >
                        <XCircle className="w-4 h-4" /> Absent
                      </button>
                      <button
                        onClick={() => handleStatusChange(slot, "CANCELLED")}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          status === "CANCELLED"
                            ? "bg-zinc-700 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
      <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
        <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-500" /> Attendance Calculation Protocol:
        </div>
        <p>
          &bull; <b>Present:</b> +1 Attended, +1 Conducted. &bull; <b>Absent:</b> +0 Attended, +1 Conducted. &bull; <b>Cancelled:</b> Excluded (+0 Attended, +0 Conducted).
        </p>
        <p>
          &bull; Multi-period laboratories (e.g. 4 consecutive periods) generate 4 discrete attendance units. Unmarked periods automatically mark as Absent after the cutoff deadline.
        </p>
      </div>
    </div>
  );
}
