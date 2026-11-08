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
import { computeDashboardStats } from "@/lib/attendanceCalculator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Sparkles,
  TrendingUp,
  Award,
  AlertTriangle,
  BookOpen,
  FlaskConical,
  CheckCircle2,
} from "lucide-react";

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export default function AnalyticsPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [timetable, setTimetable] = useState<UniversityTimetable | null>(null);

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

  if (!profile || !timetable) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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

  // Bar chart data for subjects
  const subjectChartData = stats.subjects.map((s) => ({
    name: s.subjectCode,
    Combined: s.combined.percentage,
    Theory: s.hasTheory ? s.theory.percentage : 0,
    Lab: s.hasLab ? s.lab.percentage : 0,
  }));

  // Pie chart data: Attended vs Absent vs Cancelled
  const distributionData = [
    { name: "Attended", value: stats.totalAttended, color: "#10b981" },
    { name: "Absent", value: stats.totalAbsent, color: "#ef4444" },
    { name: "Cancelled", value: stats.totalCancelled, color: "#6b7280" },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Attendance Analytics & Visualizations
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Deep-dive charts across subjects, theory vs practical sessions, and distribution trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300">
            Total Conducted: {stats.totalConducted} Units
          </span>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject-Wise Comparative Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Subject Comparative Attendance (%)
            </h2>
            <span className="text-xs text-zinc-400">Target: 75% Cutoff</span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`]}
                  contentStyle={{
                    backgroundColor: "rgba(24, 24, 27, 0.95)",
                    borderRadius: "12px",
                    color: "#fff",
                    border: "none",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="Combined" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Theory" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lab" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Distribution Pie Chart */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Units Distribution
            </h2>
            <p className="text-xs text-zinc-500">Conducted vs Excluded units</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} Units`, name]}
                  contentStyle={{
                    backgroundColor: "rgba(24, 24, 27, 0.95)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">
                {stats.totalAttended}
              </div>
              <div className="text-[10px] text-zinc-400">Attended</div>
            </div>
            <div>
              <div className="font-bold text-rose-600 dark:text-rose-400">
                {stats.totalAbsent}
              </div>
              <div className="text-[10px] text-zinc-400">Absent</div>
            </div>
            <div>
              <div className="font-bold text-zinc-500">
                {stats.totalCancelled}
              </div>
              <div className="text-[10px] text-zinc-400">Cancelled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Health Matrix Cards */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-500" />
          Subject Eligibility Matrix
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.subjects.map((subj) => (
            <div
              key={subj.subjectCode}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {subj.subjectCode}
                  </span>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-1">
                    {subj.subjectName}
                  </h4>
                </div>
                <span
                  className={`text-lg font-black ${
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

              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700/60">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Theory</span>
                  <div className="font-bold text-zinc-800 dark:text-zinc-200">
                    {subj.hasTheory ? (subj.theory.conducted === 0 ? "N/A" : `${subj.theory.percentage}%`) : "N/A"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Lab</span>
                  <div className="font-bold text-zinc-800 dark:text-zinc-200">
                    {subj.hasLab ? (subj.lab.conducted === 0 ? "N/A" : `${subj.lab.percentage}%`) : "N/A"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-zinc-500">
                  {subj.combined.attended}/{subj.combined.conducted} units
                </span>
                {subj.combined.status === "safe" ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Safe (+{subj.combined.safeAbsences})
                  </span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    Need {subj.combined.recoveryNeeded75}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
