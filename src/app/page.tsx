"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  StudentProfile,
  AttendanceRecord,
  DashboardStats,
  UniversityTimetable,
  TimetableSlot,
} from "@/types";
import {
  getStoredProfile,
  getStoredAttendance,
  getActiveTimetable,
  updatePeriodAttendance,
  markAllPeriodsForDate,
  saveStoredAttendance,
  getTodayDateStr,
  resetToDemoData,
  clearAttendanceData,
} from "@/lib/storage";
import { computeDashboardStats } from "@/lib/attendanceCalculator";
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  FlaskConical,
  ShieldCheck,
  Calculator,
  AlertTriangle,
  ChevronRight,
  Check,
  X,
  Minus,
  Bell,
} from "lucide-react";

export default function Dashboard() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [timetable, setTimetable] = useState<UniversityTimetable | null>(null);
  const [todayStr, setTodayStr] = useState<string>("");

  useEffect(() => {
    const prof = getStoredProfile();
    if (!prof) {
      setProfile(null);
      return;
    }
    const att = getStoredAttendance(prof);
    const tt = getActiveTimetable(prof);
    setProfile(prof);
    setRecords(att);
    setTimetable(tt);
    setTodayStr(getTodayDateStr());
  }, []);

  if (!profile || !timetable) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Calculate dashboard statistics
  const stats: DashboardStats = computeDashboardStats(
    records,
    timetable.subjects.map((s) => ({
      code: s.code,
      name: s.name,
      faculty: s.faculty,
    })),
    profile.attendanceThreshold
  );

  // Filter today's classes for this student
  const todayDate = new Date(todayStr || getTodayDateStr());
  const todayDayName = todayDate.toLocaleDateString("en-US", { weekday: "long" });

  const todaySlots = timetable.slots
    .filter(
      (s) => s.day === todayDayName && (s.batch === "ALL" || s.batch === profile.batch)
    )
    .sort((a, b) => a.period - b.period);

  const todayRecords = records.filter((r) => r.date === todayStr);

  const handleStatusChange = (
    slot: TimetableSlot,
    newStatus: "PRESENT" | "ABSENT" | "CANCELLED"
  ) => {
    const existing = records.find(
      (r) => r.date === todayStr && r.period === slot.period && r.subjectCode === slot.subjectCode
    );

    let updated: AttendanceRecord[];
    if (existing) {
      updated = updatePeriodAttendance(existing.id, newStatus);
    } else {
      const newRecord: AttendanceRecord = {
        id: `att-${todayStr}-p${slot.period}-${slot.subjectCode}`,
        studentId: profile.id,
        date: todayStr,
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

  const getStatusBadge = (status: "safe" | "warning" | "danger", pct: number, conducted = 1) => {
    if (conducted === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
          N/A (No classes)
        </span>
      );
    }
    if (status === "safe") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5" /> Safe ({pct}%)
        </span>
      );
    }
    if (status === "warning") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800">
          <AlertTriangle className="w-3.5 h-3.5" /> Warning ({pct}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800">
        <AlertCircle className="w-3.5 h-3.5" /> Shortage ({pct}%)
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Simplistic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Hello, {profile.fullName}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {profile.branch} &bull; Section {profile.section} &bull; Batch {profile.batch} &bull; Classroom {timetable.room}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>
              {todayDayName}, {todayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>

          <button
            onClick={() => {
              const demo = resetToDemoData(profile);
              setRecords(demo);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1 transition-colors"
            title="Load realistic dummy attendance across all subjects to showcase functionality"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Load Dummy Data</span>
          </button>

          <button
            onClick={() => {
              clearAttendanceData(profile.id);
              setRecords([]);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs font-semibold transition-colors"
            title="Reset to clean 0/0 slate"
          >
            Reset Slate
          </button>
        </div>
      </div>

      {/* Actionable Web Push Callout */}
      <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-sky-50/50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-sky-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100">
              Actionable Web Push Notifications Ready
            </div>
            <div className="text-zinc-500">
              Get class-start alerts and mark yourself Present or Absent directly from your notification panel without opening AttendX.
            </div>
          </div>
        </div>

        <Link
          href="/notifications"
          className="px-3 py-1.5 rounded-xl font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-zinc-700 transition-colors shrink-0 text-center shadow-xs"
        >
          Setup Notifications &rarr;
        </Link>
      </div>

      {/* Fresh Account Helper Notice (when no attendance marked yet) */}
      {stats.overallCombined.conducted === 0 && (
        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              Clean attendance tracker ready. Mark today&apos;s lectures below to record your first attendance!
            </span>
          </div>
        </div>
      )}

      {/* 2. Three Clean Attendance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Combined */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Overall Combined
              </p>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
                {stats.overallCombined.conducted === 0 ? "N/A" : `${stats.overallCombined.percentage}%`}
              </div>
            </div>
            {getStatusBadge(stats.overallCombined.status, stats.overallCombined.percentage, stats.overallCombined.conducted)}
          </div>

          <div className="my-3">
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  stats.overallCombined.status === "safe"
                    ? "bg-emerald-500"
                    : stats.overallCombined.status === "warning"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${stats.overallCombined.conducted === 0 ? 0 : Math.min(100, stats.overallCombined.percentage)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
            <span>
              {stats.overallCombined.attended} / {stats.overallCombined.conducted} units
            </span>
            {stats.overallCombined.conducted === 0 ? (
              <span className="text-zinc-400">No classes held</span>
            ) : stats.overallCombined.safeAbsences > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                +{stats.overallCombined.safeAbsences} safe bunks
              </span>
            ) : stats.overallCombined.recoveryNeeded75 > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                Need {stats.overallCombined.recoveryNeeded75} classes
              </span>
            ) : (
              <span className="text-zinc-400">Baseline</span>
            )}
          </div>
        </div>

        {/* Theory Classes */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Theory Classes
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
                {stats.overallTheory.conducted === 0 ? "N/A" : `${stats.overallTheory.percentage}%`}
              </div>
            </div>
            {getStatusBadge(stats.overallTheory.status, stats.overallTheory.percentage, stats.overallTheory.conducted)}
          </div>

          <div className="my-3">
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  stats.overallTheory.status === "safe"
                    ? "bg-indigo-500"
                    : stats.overallTheory.status === "warning"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${stats.overallTheory.conducted === 0 ? 0 : Math.min(100, stats.overallTheory.percentage)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
            <span>
              {stats.overallTheory.attended} / {stats.overallTheory.conducted} periods
            </span>
            {stats.overallTheory.conducted === 0 ? (
              <span className="text-zinc-400">No theory held</span>
            ) : stats.overallTheory.safeAbsences > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                +{stats.overallTheory.safeAbsences} safe bunks
              </span>
            ) : stats.overallTheory.recoveryNeeded75 > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                Need {stats.overallTheory.recoveryNeeded75}
              </span>
            ) : (
              <span className="text-zinc-400">Baseline</span>
            )}
          </div>
        </div>

        {/* Lab Sessions */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <FlaskConical className="w-3.5 h-3.5 text-teal-500" /> Lab Sessions
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
                {stats.overallLab.conducted === 0 ? "N/A" : `${stats.overallLab.percentage}%`}
              </div>
            </div>
            {getStatusBadge(stats.overallLab.status, stats.overallLab.percentage, stats.overallLab.conducted)}
          </div>

          <div className="my-3">
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  stats.overallLab.status === "safe"
                    ? "bg-teal-500"
                    : stats.overallLab.status === "warning"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${stats.overallLab.conducted === 0 ? 0 : Math.min(100, stats.overallLab.percentage)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
            <span>
              {stats.overallLab.attended} / {stats.overallLab.conducted} units
            </span>
            <span className="text-teal-600 dark:text-teal-400 font-medium">
              4-period labs = 4 units
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Today's Classes + Subject List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Today&apos;s Schedule
                </h2>
                <p className="text-xs text-zinc-500">
                  Click a button to mark your attendance for that period.
                </p>
              </div>

              {todaySlots.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      const updated = markAllPeriodsForDate(todayStr, "PRESENT");
                      setRecords(updated);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
                  >
                    All Present
                  </button>
                  <button
                    onClick={() => {
                      const updated = markAllPeriodsForDate(todayStr, "ABSENT");
                      setRecords(updated);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 dark:border-rose-800"
                  >
                    All Absent
                  </button>
                  <button
                    onClick={() => {
                      const updated = markAllPeriodsForDate(todayStr, "CANCELLED");
                      setRecords(updated);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
                  >
                    All Cancelled
                  </button>
                </div>
              )}
            </div>

            {/* List */}
            <div className="mt-4 space-y-2.5">
              {todaySlots.length === 0 ? (
                <div className="py-10 text-center text-zinc-400 text-xs">
                  <Calendar className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-1.5" />
                  No classes scheduled for today ({todayDayName}).
                </div>
              ) : (
                todaySlots.map((slot) => {
                  const record = todayRecords.find(
                    (r) => r.period === slot.period && r.subjectCode === slot.subjectCode
                  );
                  const status = record?.status || "PENDING";

                  return (
                    <div
                      key={`${slot.period}-${slot.subjectCode}`}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        status === "PRESENT"
                          ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
                          : status === "ABSENT"
                          ? "bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                          : status === "CANCELLED"
                          ? "bg-zinc-100/50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-700 opacity-60"
                          : "bg-zinc-50/60 dark:bg-zinc-800/30 border-zinc-200/70 dark:border-zinc-700/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center shrink-0">
                          P{slot.period}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              {slot.subjectCode}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                                slot.category === "Lab"
                                  ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                                  : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              }`}
                            >
                              {slot.category}
                            </span>
                            <span className="text-xs text-zinc-400 font-mono">
                              {slot.room}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 mt-0.5">
                            {slot.subjectName}
                          </div>
                        </div>
                      </div>

                      {/* 3 Crisp Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => handleStatusChange(slot, "PRESENT")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            status === "PRESENT"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" /> Present
                        </button>
                        <button
                          onClick={() => handleStatusChange(slot, "ABSENT")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            status === "ABSENT"
                              ? "bg-rose-600 text-white shadow-xs"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-rose-50 hover:text-rose-700"
                          }`}
                        >
                          <X className="w-3.5 h-3.5" /> Absent
                        </button>
                        <button
                          onClick={() => handleStatusChange(slot, "CANCELLED")}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            status === "CANCELLED"
                              ? "bg-zinc-700 text-white"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          }`}
                          title="Cancelled class"
                        >
                          Cancelled
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
              <Link
                href="/mark-attendance"
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
              >
                Open Calendar View <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/timetable"
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Inspect Timetable Grid &rarr;
              </Link>
            </div>
          </div>

          {/* Simple 2-Card Tool Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/calculator"
              className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors flex items-center justify-between group shadow-xs"
            >
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-indigo-500" /> Safe Bunk Calculator
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Simulate future classes and plan bunks
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/cancellations"
              className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-700 transition-colors flex items-center justify-between group shadow-xs"
            >
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Mass Bunk Reports
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Teacher absent or university holiday
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Right Col: Subject Breakdown */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Subjects ({stats.subjects.length})
            </h2>
            <Link
              href="/calculator"
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Analysis &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {stats.subjects.map((subj) => (
              <div
                key={subj.subjectCode}
                className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {subj.subjectCode}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      subj.combined.conducted === 0
                        ? "text-zinc-500 dark:text-zinc-400"
                        : subj.combined.status === "safe"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : subj.combined.status === "warning"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {subj.combined.conducted === 0 ? "N/A" : `${subj.combined.percentage}%`}
                  </span>
                </div>

                <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1">
                  {subj.subjectName}
                </div>

                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      subj.combined.status === "safe"
                        ? "bg-emerald-500"
                        : subj.combined.status === "warning"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${subj.combined.conducted === 0 ? 0 : Math.min(100, subj.combined.percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                  <span>
                    {subj.combined.attended}/{subj.combined.conducted} units
                  </span>
                  {subj.combined.safeAbsences > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{subj.combined.safeAbsences} safe
                    </span>
                  ) : subj.combined.recoveryNeeded75 > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      Need {subj.combined.recoveryNeeded75}
                    </span>
                  ) : (
                    <span className="text-zinc-400">&ge;75%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
