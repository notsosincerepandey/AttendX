"use client";

import React, { useState, useEffect } from "react";
import {
  StudentProfile,
  AttendanceRecord,
  DashboardStats,
  UniversityTimetable,
} from "@/types";
import {
  getStoredProfile,
  getStoredAttendance,
  getActiveTimetable,
} from "@/lib/storage";
import {
  computeDashboardStats,
  simulateAttendance,
} from "@/lib/attendanceCalculator";
import {
  Calculator,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BookOpen,
  ArrowRight,
  Info,
  HelpCircle,
  Sliders,
} from "lucide-react";
import Link from "next/link";

import RadialNavWheel from "@/components/RadialNavWheel";

export default function SmartCalculatorPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [timetable, setTimetable] = useState<UniversityTimetable | null>(null);

  // Simulator state
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("OVERALL");
  const [futureAttend, setFutureAttend] = useState<number>(5);
  const [futureMiss, setFutureMiss] = useState<number>(1);
  const [targetPercentage, setTargetPercentage] = useState<number>(75);

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
      </div>
    );
  }

  const stats: DashboardStats = computeDashboardStats(
    records,
    timetable.subjects.map((s) => ({
      code: s.code,
      name: s.name,
      faculty: s.faculty,
    })),
    profile.attendanceThreshold
  );

  // Determine current baseline for simulator
  let currentAttended = stats.overallCombined.attended;
  let currentConducted = stats.overallCombined.conducted;
  let currentSubjectName = "All Subjects Combined";

  if (selectedSubjectCode !== "OVERALL") {
    const subj = stats.subjects.find((s) => s.subjectCode === selectedSubjectCode);
    if (subj) {
      currentAttended = subj.combined.attended;
      currentConducted = subj.combined.conducted;
      currentSubjectName = `${subj.subjectCode}: ${subj.subjectName}`;
    }
  }

  const currentPercentage =
    currentConducted === 0
      ? 100.0
      : Math.round(((currentAttended / currentConducted) * 100) * 100) / 100;

  // Simulate outcomes
  const simulatedPct = simulateAttendance(
    currentAttended,
    currentConducted,
    futureAttend,
    futureMiss
  );

  const missNextClassPct = simulateAttendance(
    currentAttended,
    currentConducted,
    0,
    1
  );

  const attendNext5Pct = simulateAttendance(
    currentAttended,
    currentConducted,
    5,
    0
  );

  // Target recovery
  const targetT = targetPercentage / 100;
  let classesNeededForTarget = 0;
  if (currentPercentage < targetPercentage) {
    classesNeededForTarget = Math.ceil(
      (targetT * currentConducted - currentAttended) / (1 - targetT)
    );
    if (classesNeededForTarget < 0) classesNeededForTarget = 0;
  }

  // Safe bunk calculation
  let safeBunksForTarget = 0;
  if (currentPercentage >= targetPercentage) {
    safeBunksForTarget = Math.floor(
      (currentAttended - targetT * currentConducted) / targetT
    );
    if (safeBunksForTarget < 0) safeBunksForTarget = 0;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Page Title */}
      <div className="futuristic-card p-6 rounded-2xl border border-white/[0.08] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-indigo-400" />
            Smart Attendance Calculator
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Mathematically precise safe bunk limit predictions and consecutive attendance recovery roadmaps for MMMUT 75% cutoff.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-xs font-bold text-indigo-300">
          Target: {targetPercentage}% Cutoff
        </div>
      </div>

      {/* Simulator Section */}
      <div className="futuristic-card rounded-2xl p-6 sm:p-8 border border-white/[0.08] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              Interactive What-If Simulator
            </h2>
            <p className="text-xs text-zinc-400">
              See what happens to your percentage under different future attendance scenarios.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Select Scope:</span>
            <select
              value={selectedSubjectCode}
              onChange={(e) => setSelectedSubjectCode(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-zinc-900 border border-white/10 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="OVERALL">All Subjects Combined</option>
              {stats.subjects.map((s) => (
                <option key={s.subjectCode} value={s.subjectCode}>
                  {s.subjectCode} - {s.subjectName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current vs Simulated Comparison Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Current Baseline
            </span>
            <div className="text-3xl font-black text-white mt-1 font-mono">
              {currentPercentage}%
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              {currentAttended} attended / {currentConducted} conducted
            </p>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-center md:col-span-2 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                Predicted Attendance After Scenario
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  simulatedPct >= targetPercentage
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                    : "bg-rose-950 text-rose-300 border border-rose-500/30"
                }`}
              >
                {simulatedPct >= targetPercentage ? "Eligible" : "Attendance Shortage"}
              </span>
            </div>

            <div className="flex items-baseline justify-center gap-3 my-1">
              <span className="text-4xl font-black text-indigo-300 font-mono">
                {simulatedPct}%
              </span>
              <span
                className={`text-sm font-bold flex items-center gap-1 ${
                  simulatedPct >= currentPercentage
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {simulatedPct >= currentPercentage ? (
                  <>
                    <TrendingUp className="w-4 h-4" /> +
                    {(simulatedPct - currentPercentage).toFixed(2)}%
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4" /> -
                    {(currentPercentage - simulatedPct).toFixed(2)}%
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-indigo-600 dark:text-indigo-400">
              New: {currentAttended + futureAttend} attended /{" "}
              {currentConducted + futureAttend + futureMiss} total conducted units
            </p>
          </div>
        </div>

        {/* Sliders & Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <span>Future Classes You Will Attend</span>
              <span className="px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100 font-mono text-sm">
                +{futureAttend} classes
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={futureAttend}
              onChange={(e) => setFutureAttend(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>0</span>
              <span>15</span>
              <span>30</span>
            </div>
          </div>

          <div className="space-y-2 p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30">
            <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-300">
              <span>Future Classes You Will Miss (Bunk)</span>
              <span className="px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-950 dark:text-rose-100 font-mono text-sm">
                +{futureMiss} classes
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={futureMiss}
              onChange={(e) => setFutureMiss(Number(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>0</span>
              <span>10</span>
              <span>20</span>
            </div>
          </div>
        </div>

        {/* Quick What-If Scenarios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                What if I miss the next class?
              </span>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                0 attended, 1 absent
              </div>
            </div>
            <span
              className={`text-sm font-black ${
                missNextClassPct >= targetPercentage
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {missNextClassPct}%
            </span>
          </div>

          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                What if I attend next 5 classes consecutively?
              </span>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                +5 attended, 0 absent
              </div>
            </div>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {attendNext5Pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Subject-Wise Safe Bunk & Recovery Planner Table */}
      <div className="futuristic-card rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden p-6">
        <div className="pb-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Subject-Wise Safe Absences & Recovery Analysis
          </h2>
          <p className="text-xs text-zinc-400">
            Calculated using exact mathematical formulas without averaging percentages.
          </p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase tracking-wider font-mono">
                <th className="py-3 px-3">Subject</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-center">Attended / Total</th>
                <th className="py-3 px-3 text-center">Current %</th>
                <th className="py-3 px-3 text-center">Can Safely Miss (&gt;=75%)</th>
                <th className="py-3 px-3 text-center">Consecutive Needed to 75%</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {stats.subjects.map((s) => (
                <tr key={s.subjectCode} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-indigo-400">
                      {s.subjectCode}
                    </div>
                    <div className="font-semibold text-zinc-200 line-clamp-1">
                      {s.subjectName}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                      Combined
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-zinc-300">
                    {s.combined.attended} / {s.combined.conducted}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`font-mono font-black text-sm ${
                        s.combined.status === "safe"
                          ? "text-emerald-400"
                          : s.combined.status === "warning"
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {s.combined.conducted === 0 ? "N/A" : `${s.combined.percentage}%`}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {s.combined.safeAbsences > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-mono">
                        +{s.combined.safeAbsences} classes
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-mono">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {s.combined.recoveryNeeded75 > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-400 bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-500/20 font-mono">
                        {s.combined.recoveryNeeded75} classes
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium">
                        Above 75% &check;
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {s.combined.status === "safe" && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/20">
                        Safe
                      </span>
                    )}
                    {s.combined.status === "warning" && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-500/20">
                        Warning
                      </span>
                    )}
                    {s.combined.status === "danger" && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-500/20">
                        Shortage
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formula Explanation Card */}
      <div className="futuristic-card p-6 rounded-2xl border border-white/[0.08] text-xs text-zinc-400 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400" />
          University Attendance Mathematics & Proofs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
            <span className="font-bold text-indigo-400">
              1. Safe Absences Formula:
            </span>
            <p className="font-mono text-[11px] bg-zinc-900 text-zinc-300 p-2 rounded border border-white/5">
              max_absences = floor((Attended - 0.75 * Conducted) / 0.75)
            </p>
            <p className="text-[11px] text-zinc-400">
              Guarantees attendance percentage remains strictly &gt;= 75% after missing that many classes.
            </p>
          </div>

          <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
            <span className="font-bold text-indigo-400">
              2. Consecutive Attendance Recovery Formula:
            </span>
            <p className="font-mono text-[11px] bg-zinc-900 text-zinc-300 p-2 rounded border border-white/5">
              classes_needed = ceil((0.75 * Conducted - Attended) / (1 - 0.75))
            </p>
            <p className="text-[11px] text-zinc-400">
              Solves (Attended + x) / (Conducted + x) &gt;= 0.75 for exact consecutive lecture attendance required.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Radial Navigation Wheel */}
      <RadialNavWheel variant="floating" />
    </div>
  );
}
