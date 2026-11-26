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
import { getEffectiveSlotsForDate } from "@/lib/timetableOverrides";
import AttendanceRing from "@/components/AttendanceRing";
import TodayClassTimeline from "@/components/TodayClassTimeline";
import RadialNavWheel from "@/components/RadialNavWheel";
import {
  Calendar,
  Sparkles,
  BookOpen,
  FlaskConical,
  RotateCcw,
  Sliders,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

export default function Dashboard() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [timetable, setTimetable] = useState<UniversityTimetable | null>(null);
  const [todayStr, setTodayStr] = useState<string>("");
  const [showDevTools, setShowDevTools] = useState(false);

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

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 futuristic-card rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
          <Calendar className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          Timetable Mapping Not Found
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          No official timetable is currently mapped for branch <span className="font-semibold text-zinc-200">{profile.branch} ({profile.branchCode})</span>, section <span className="font-semibold text-zinc-200">{profile.section}</span>.
        </p>
        <p className="text-[11px] text-zinc-500">
          Please contact your Department Administrator or Class Representative.
        </p>
      </div>
    );
  }

  // Authoritative calculations from existing system
  const stats: DashboardStats = computeDashboardStats(
    records,
    timetable.subjects.map((s) => ({
      code: s.code,
      name: s.name,
      faculty: s.faculty,
    })),
    profile.attendanceThreshold
  );

  const todayDate = new Date(todayStr || getTodayDateStr());
  const dayName = todayDate.toLocaleDateString("en-US", { weekday: "long" });
  const formattedDate = todayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Effective slots for today (handles one-day extra classes & cancellations)
  const todaySlots = getEffectiveSlotsForDate(profile, todayStr, { timetable });
  const todayRecords = records.filter((r) => r.date === todayStr);

  const handleStatusChange = (
    slot: TimetableSlot,
    newStatus: "PRESENT" | "ABSENT" | "CANCELLED"
  ) => {
    const existing = records.find((r) => {
      if (r.date !== todayStr) return false;
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
        id: `att-${todayStr}-p${slot.period}-${slot.subjectCode}${slot.occurrenceId ? `-${slot.occurrenceId}` : ""}`,
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
        isExtraClass: slot.isOneTime,
        occurrenceId: slot.occurrenceId,
        slotId: slot.id,
      };
      updated = [...records, newRecord];
      saveStoredAttendance(updated, profile.id);
    }
    setRecords(updated);
  };

  const handleMarkAll = (status: "PRESENT" | "ABSENT" | "CANCELLED") => {
    const updated = markAllPeriodsForDate(todayStr, status);
    setRecords(updated);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* 1. Sparse Minimalist Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {profile.branchCode || "B.TECH"} &bull; {profile.section} &bull; {profile.batch}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              Room {timetable.room || "TL-203"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {profile.fullName}
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/5 text-xs text-zinc-400 font-mono">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>{dayName}, {formattedDate}</span>
          </div>

          {/* Discreet Dev Helper Toggle */}
          <button
            onClick={() => setShowDevTools(!showDevTools)}
            className="p-1.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Toggle Demo Data Tools"
            aria-label="Toggle Data Tools"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Discreet Demo Controls (Kept minimal and non-competing) */}
      {showDevTools && (
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 flex items-center justify-between text-xs animate-in fade-in">
          <span className="text-zinc-400 font-mono text-[11px]">Demo Data Helpers:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const demo = resetToDemoData(profile);
                setRecords(demo);
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-900 font-semibold transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Load Sample Ledger
            </button>
            <button
              onClick={() => {
                clearAttendanceData(profile.id);
                setRecords([]);
              }}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Slate
            </button>
          </div>
        </div>
      )}

      {/* 2. PRIMARY VISUAL ELEMENT: The Attendance Ring */}
      <section className="futuristic-card rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Subtle decorative radial glow behind the ring */}
        <div className="absolute w-72 h-72 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        <AttendanceRing
          percentage={stats.overallCombined.percentage}
          attended={stats.overallCombined.attended}
          conducted={stats.overallCombined.conducted}
          status={stats.overallCombined.status}
          safeAbsences={stats.overallCombined.safeAbsences}
          recoveryNeeded={stats.overallCombined.recoveryNeeded75}
          threshold={profile.attendanceThreshold || 75}
        />

        {/* Minimal Secondary Breakdown (Theory vs Lab) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 w-full max-w-md mt-6 pt-6 border-t border-white/[0.06] text-xs">
          {/* Theory Metric */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span className="flex items-center gap-1.5 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Theory
              </span>
              <span className="font-mono font-bold text-white">
                {stats.overallTheory.conducted === 0 ? "N/A" : `${stats.overallTheory.percentage}%`}
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${stats.overallTheory.conducted === 0 ? 0 : Math.min(100, stats.overallTheory.percentage)}%` }}
              />
            </div>
            <div className="text-[10px] text-zinc-500 mt-1.5 font-mono">
              {stats.overallTheory.attended}/{stats.overallTheory.conducted} periods
            </div>
          </div>

          {/* Lab Metric */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span className="flex items-center gap-1.5 font-medium">
                <FlaskConical className="w-3.5 h-3.5 text-teal-400" /> Practicals
              </span>
              <span className="font-mono font-bold text-white">
                {stats.overallLab.conducted === 0 ? "N/A" : `${stats.overallLab.percentage}%`}
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-700"
                style={{ width: `${stats.overallLab.conducted === 0 ? 0 : Math.min(100, stats.overallLab.percentage)}%` }}
              />
            </div>
            <div className="text-[10px] text-zinc-500 mt-1.5 font-mono">
              {stats.overallLab.attended}/{stats.overallLab.conducted} units
            </div>
          </div>
        </div>
      </section>

      {/* 3. TODAY'S CLASSES TIMELINE (Minimal & Prioritized) */}
      <section>
        <TodayClassTimeline
          slots={todaySlots}
          records={todayRecords}
          todayStr={todayStr}
          dayName={dayName}
          onStatusChange={handleStatusChange}
          onMarkAll={handleMarkAll}
        />
      </section>

      {/* 4. Sparse Quick Action Hint */}
      <div className="flex items-center justify-between px-2 text-xs text-zinc-500">
        <span>Use the Navigation Orb below for all features &bull; ESC to close</span>
        <Link
          href="/timetable"
          className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
        >
          Inspect Full Weekly Schedule <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 5. INTERACTIVE RADIAL NAVIGATION WHEEL */}
      <RadialNavWheel variant="floating" />
    </div>
  );
}
