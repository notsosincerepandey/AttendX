"use client";

import React from "react";
import {
  Users,
  UserCheck,
  Calendar,
  Megaphone,
  Vote,
  AlertTriangle,
  Server,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { AdminTab } from "./AdminSidebar";
import { UserAccount } from "@/types";

interface AdminOverviewProps {
  stats: {
    totalStudents: number;
    totalCRs: number;
    totalAnnouncements: number;
    totalPolls: number;
    activePolls: number;
    totalCancellations: number;
    pendingCancellations: number;
    totalTimetables: number;
  };
  onNavigate: (tab: AdminTab) => void;
  currentUser: UserAccount | null;
}

export default function AdminOverviewView({
  stats,
  onNavigate,
  currentUser,
}: AdminOverviewProps) {
  const cards = [
    {
      label: "Registered Students",
      value: stats.totalStudents.toLocaleString(),
      sub: "Enrolled First Year B.Tech",
      icon: Users,
      color: "from-blue-600/20 to-indigo-600/20 border-blue-500/30 text-blue-400",
      tab: "students" as AdminTab,
      badge: "Active",
    },
    {
      label: "Appointed Class CRs",
      value: stats.totalCRs.toString(),
      sub: "Authorized Section Representatives",
      icon: UserCheck,
      color: "from-emerald-600/20 to-teal-600/20 border-emerald-500/30 text-emerald-400",
      tab: "crs" as AdminTab,
      badge: `${stats.totalCRs} Active`,
    },
    {
      label: "Master Timetables",
      value: `${stats.totalTimetables} Sheets`,
      sub: "7 Engineering Departments",
      icon: Calendar,
      color: "from-purple-600/20 to-pink-600/20 border-purple-500/30 text-purple-400",
      tab: "timetables" as AdminTab,
      badge: "Verified",
    },
    {
      label: "Live Class Polls",
      value: stats.activePolls.toString(),
      sub: `${stats.totalPolls} Total Polls Recorded`,
      icon: Vote,
      color: "from-amber-600/20 to-orange-600/20 border-amber-500/30 text-amber-400",
      tab: "polls" as AdminTab,
      badge: stats.activePolls > 0 ? "Active Voting" : "Idle",
    },
    {
      label: "Cancellation Reports",
      value: stats.totalCancellations.toString(),
      sub: `${stats.pendingCancellations} Pending Confirmation`,
      icon: AlertTriangle,
      color: "from-rose-600/20 to-red-600/20 border-rose-500/30 text-rose-400",
      tab: "cancellations" as AdminTab,
      badge: stats.pendingCancellations > 0 ? "Review Required" : "Clean",
    },
    {
      label: "Announcements",
      value: stats.totalAnnouncements.toString(),
      sub: "Departmental & Institutional",
      icon: Megaphone,
      color: "from-cyan-600/20 to-sky-600/20 border-cyan-500/30 text-cyan-400",
      tab: "announcements" as AdminTab,
      badge: "Broadcast",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-indigo-950/60 to-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 uppercase tracking-wider">
                Super Administrator
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {currentUser?.email || "admin@attendx.ac.in"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              AttendX Governance Dashboard
            </h2>
            <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
              Institutional control plane for Madan Mohan Malaviya University of Technology. Manage 1,189 verified engineering registrations, validate Class CR appointments, coordinate timetable slots, and audit cancellations in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate("students")}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <span>Manage Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate("timetables")}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-200 bg-zinc-800 hover:bg-zinc-700/80 transition-all border border-zinc-700/60"
            >
              Master Timetables
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <button
              key={idx}
              onClick={() => onNavigate(c.tab)}
              className="text-left bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 transition-all shadow-md group relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-zinc-400">{c.label}</div>
                  <div className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">
                    {c.value}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-medium">{c.sub}</div>
                </div>

                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${c.color} flex items-center justify-center shrink-0 border`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-zinc-400">{c.badge}</span>
                <span className="text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold">
                  Open Tab <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Operations & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Operations */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Administrative Workflows
            </h3>
            <span className="text-[11px] text-zinc-400">Direct Actions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate("crs")}
              className="p-4 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/60 text-left transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Appoint Class CR
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Assign section representative rights with strict departmental and batch scope validation.
              </p>
            </button>

            <button
              onClick={() => onNavigate("announcements")}
              className="p-4 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/60 text-left transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-cyan-400" />
                  Broadcast Notice
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Publish urgent announcements with priority badges (`info`, `warning`, `danger`) to all classes.
              </p>
            </button>

            <button
              onClick={() => onNavigate("polls")}
              className="p-4 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/60 text-left transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <Vote className="w-4 h-4 text-amber-400" />
                  Create University Poll
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Launch official class ballots with atomic vote prevention and real-time distribution telemetry.
              </p>
            </button>

            <button
              onClick={() => onNavigate("timetables")}
              className="p-4 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/60 text-left transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  Publish Timetable Slot
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Review master timetable schedules, check period collisions, and publish isolated batch updates.
              </p>
            </button>
          </div>
        </div>

        {/* System & Architecture Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              Backend Infrastructure
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
              OPERATIONAL
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 space-y-1">
              <div className="text-zinc-400 font-semibold text-[11px]">Active Supabase Project</div>
              <div className="font-mono font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                iczjocbishkvkkkfvalz
              </div>
              <div className="text-[10px] text-zinc-500">AttendX-Test Database Instance</div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 space-y-1">
              <div className="text-zinc-400 font-semibold text-[11px]">Security Architecture</div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Authoritative Supabase Auth RBAC
              </div>
              <div className="text-[10px] text-zinc-500">
                PostgreSQL RLS • JWT App Metadata Verified
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 space-y-1">
              <div className="text-zinc-400 font-semibold text-[11px]">Attendance Threshold</div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                75.0% Mandatory Cutoff
              </div>
              <div className="text-[10px] text-zinc-500">
                Enforced by MMMUT University Academic Bylaws
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
