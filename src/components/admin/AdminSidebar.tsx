"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  Megaphone,
  Vote,
  AlertTriangle,
  Settings,
  ShieldAlert,
  LogOut,
  ExternalLink,
  ChevronRight,
  X,
} from "lucide-react";
import { UserAccount } from "@/types";
import { logoutAdmin } from "@/lib/auth";

export type AdminTab =
  | "overview"
  | "students"
  | "crs"
  | "timetables"
  | "announcements"
  | "polls"
  | "cancellations"
  | "settings";

interface AdminSidebarProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  currentUser: UserAccount | null;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  stats?: {
    totalStudents: number;
    totalCRs: number;
    activePolls: number;
    pendingCancellations: number;
  };
}

export default function AdminSidebar({
  currentTab,
  onTabChange,
  currentUser,
  isMobileOpen,
  onCloseMobile,
  stats,
}: AdminSidebarProps) {
  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: "overview",
      label: "Overview & Stats",
      icon: LayoutDashboard,
    },
    {
      id: "students",
      label: "Student Registry",
      icon: Users,
      badge: stats ? stats.totalStudents : undefined,
    },
    {
      id: "crs",
      label: "Class CRs",
      icon: UserCheck,
      badge: stats ? stats.totalCRs : undefined,
      badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    },
    {
      id: "timetables",
      label: "Master Timetables",
      icon: Calendar,
      badge: "20 Sheets",
    },
    {
      id: "announcements",
      label: "Announcements",
      icon: Megaphone,
    },
    {
      id: "polls",
      label: "Class Polls",
      icon: Vote,
      badge: stats && stats.activePolls > 0 ? `${stats.activePolls} Active` : undefined,
      badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    },
    {
      id: "cancellations",
      label: "Cancellations",
      icon: AlertTriangle,
      badge: stats && stats.pendingCancellations > 0 ? `${stats.pendingCancellations} Pending` : undefined,
      badgeColor: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    },
    {
      id: "settings",
      label: "Admin Settings",
      icon: Settings,
    },
  ];

  const handleSelect = (tab: AdminTab) => {
    onTabChange(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 text-zinc-200">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-white">AttendX</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                Admin
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-medium">Governance Portal</div>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          System Management
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-white" : "text-zinc-400 group-hover:text-indigo-400"
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    item.badgeColor ||
                    (isActive
                      ? "bg-white/20 text-white"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700/60")
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 px-3 pb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          External Navigation
        </div>

        <Link
          href="/"
          target="_blank"
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
        >
          <div className="flex items-center gap-3">
            <ExternalLink className="w-4 h-4 text-zinc-500" />
            <span>Student Portal View</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
        </Link>
      </div>

      {/* Admin Identity & Logout Footer */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/50">
        <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-900/80 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {currentUser?.fullName || "Administrator"}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono truncate">
                {currentUser?.email || "admin@attendx.ac.in"}
              </div>
            </div>
          </div>

          <button
            onClick={() => logoutAdmin()}
            title="Log out of Admin Portal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
