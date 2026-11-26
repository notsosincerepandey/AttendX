"use client";

import React from "react";
import Link from "next/link";
import {
  Menu,
  ShieldCheck,
  RefreshCw,
  LogOut,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { UserAccount } from "@/types";
import { logoutAdmin } from "@/lib/auth";
import { AdminTab } from "./AdminSidebar";

interface AdminTopBarProps {
  currentTab: AdminTab;
  onOpenMobile: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  currentUser: UserAccount | null;
}

export default function AdminTopBar({
  currentTab,
  onOpenMobile,
  onRefresh,
  isRefreshing,
  currentUser,
}: AdminTopBarProps) {
  const titles: Record<AdminTab, { title: string; subtitle: string }> = {
    overview: {
      title: "Executive Overview & System Telemetry",
      subtitle: "Live institutional metrics, database records, and administrative health.",
    },
    students: {
      title: "Registered Student Directory & Registry",
      subtitle: "Filter, search, audit student records, and issue reset credentials.",
    },
    crs: {
      title: "Class Representatives (CR) Governance",
      subtitle: "Appoint, audit, and revoke Class CR permissions with scope validation.",
    },
    timetables: {
      title: "Master University Timetable Management",
      subtitle: "Inspect departmental sheets, resolve slot collisions, and publish scoped updates.",
    },
    classes: {
      title: "Institutional Class & Academic Structure",
      subtitle: "Multi-year academic hierarchy, semesters, branch allocations, and cohort sections.",
    },
    announcements: {
      title: "Class & Institutional Announcements",
      subtitle: "Broadcast urgent advisories and notifications across MMMUT departments.",
    },
    polls: {
      title: "Class Decision Polls & Vote Distributions",
      subtitle: "Inspect live voting telemetry, close polls, and analyze participation rates.",
    },
    cancellations: {
      title: "Lecture Cancellation Reports & Confirmations",
      subtitle: "Review, confirm, and audit class cancellation requests across batches.",
    },
    settings: {
      title: "Administrator Security & Credentials",
      subtitle: "Manage master credentials, token rotation, and system parameters.",
    },
  };

  const current = titles[currentTab] || {
    title: "AttendX Administration",
    subtitle: "Central governance portal",
  };

  return (
    <header className="sticky top-0 z-20 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobile}
          className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
              {current.title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-zinc-400 truncate mt-0.5">
            {current.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh administrative data"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        )}

        <Link
          href="/"
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700/80 hover:text-white transition-colors border border-zinc-700/60"
        >
          <span>Student Portal</span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
        </Link>

        <button
          onClick={() => logoutAdmin()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
