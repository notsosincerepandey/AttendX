"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  Layers,
  Building2,
  Users,
  CheckCircle,
  Calendar,
  Sparkles,
} from "lucide-react";
import { getAllBranches, BRANCH_SECTIONS_MAP } from "@/data/extractedTimetables";

export default function AdminClassManagementView() {
  const [selectedYear, setSelectedYear] = useState<string>("1st Year");
  const branches = getAllBranches();

  const academicYears = [
    {
      year: "1st Year",
      semesters: ["Semester I", "Semester II"],
      cohortSession: "2026-27",
      status: "Active (Current Cohort)",
      studentCount: 1189,
    },
    {
      year: "2nd Year",
      semesters: ["Semester III", "Semester IV"],
      cohortSession: "2025-26",
      status: "Active (Incoming Addition)",
      studentCount: 0,
    },
    {
      year: "3rd Year",
      semesters: ["Semester V", "Semester VI"],
      cohortSession: "2024-25",
      status: "Available for Enrollment",
      studentCount: 0,
    },
    {
      year: "4th Year",
      semesters: ["Semester VII", "Semester VIII"],
      cohortSession: "2023-24",
      status: "Available for Enrollment",
      studentCount: 0,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Overview Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              Institutional Academic Structure & Class Management
            </h2>
            <p className="text-xs text-zinc-500">
              Madan Mohan Malaviya University of Technology (MMMUT) academic year, semester, branch, and section configuration.
            </p>
          </div>
        </div>

        {/* Academic Year Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          {academicYears.map((ay) => {
            const isSelected = selectedYear === ay.year;
            return (
              <div
                key={ay.year}
                onClick={() => setSelectedYear(ay.year)}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-xs"
                    : "bg-zinc-50/60 dark:bg-zinc-800/30 border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-100/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                    {ay.year}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      ay.studentCount > 0
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                    }`}
                  >
                    {ay.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs">
                  <div className="text-zinc-500">
                    Session: <strong className="text-zinc-800 dark:text-zinc-200">{ay.cohortSession}</strong>
                  </div>
                  <div className="text-zinc-500">
                    Semesters:{" "}
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {ay.semesters.join(", ")}
                    </strong>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Registered Cohort</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {ay.studentCount} students
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Branches & Sections Matrix */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            Configured B.Tech Engineering Branches & Sections ({branches.length} Departments)
          </h3>
          <p className="text-xs text-zinc-500">
            Authoritative university department codes, class sections, and lab batch splits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {branches.map((b) => {
            const sections = BRANCH_SECTIONS_MAP[b.code] || ["SEC-A"];
            return (
              <div
                key={b.code}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {b.code}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    B.Tech
                  </span>
                </div>
                <div className="font-bold text-zinc-900 dark:text-white line-clamp-1">{b.name}</div>

                <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50 space-y-1 text-[11px] text-zinc-500">
                  <div>
                    Sections:{" "}
                    <strong className="text-zinc-800 dark:text-zinc-200">{sections.join(", ")}</strong>
                  </div>
                  <div>
                    Batches: <strong className="text-zinc-800 dark:text-zinc-200">P1, P2</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
