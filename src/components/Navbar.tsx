"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckCircle2,
  Calendar,
  Calculator,
  History,
  AlertTriangle,
  ShieldAlert,
  Bell,
  User,
  Menu,
  X,
  GraduationCap,
  Sparkles,
  LogOut,
  LogIn,
  Vote,
  Megaphone,
  Plus,
} from "lucide-react";
import { UserAccount, NotificationItem } from "@/types";
import { getCurrentUser, logoutUser, getSessionToken } from "@/lib/auth";
import {
  getNotifications,
  markNotificationAsRead,
  createClassAnnouncement,
} from "@/lib/storage";
import StudentProfileModal from "./StudentProfileModal";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Announcement Modal state for Class Admin / Admin
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [annType, setAnnType] = useState<"info" | "warning" | "danger">("info");
  const [annSuccess, setAnnSuccess] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-dismiss notification panel and mobile drawer on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isNotifOpen && notifRef.current && !notifRef.current.contains(target)) {
        setIsNotifOpen(false);
      }
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        mobileToggleBtnRef.current &&
        !mobileToggleBtnRef.current.contains(target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNotifOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    if (isNotifOpen || isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotifOpen, isMobileMenuOpen]);

  const fetchAnnouncements = async () => {
    const token = getSessionToken();
    if (!token) {
      setNotifications(getNotifications());
      return;
    }
    try {
      const res = await fetch("/api/announcements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.announcements)) {
        const apiNotifs: NotificationItem[] = data.announcements.map((a: any) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          type: a.type || "info",
          timestamp: new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          isRead: false,
          authorName: a.authorName,
          authorRole: a.authorRole,
          targetBranchCode: a.branchCode,
          targetSection: a.section,
        }));
        const localNotifs = getNotifications().filter((n) => !n.authorRole);
        setNotifications([...apiNotifs, ...localNotifs]);
      } else {
        setNotifications(getNotifications());
      }
    } catch {
      setNotifications(getNotifications());
    }
  };

  const handlePostAnnouncement = async () => {
    if (!annTitle.trim() || !annMessage.trim() || !currentUser) return;
    const token = getSessionToken();
    if (token) {
      try {
        const res = await fetch("/api/announcements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: annTitle.trim(),
            message: annMessage.trim(),
            type: annType,
            branchCode: currentUser.role === "admin" ? "ALL" : currentUser.branchCode,
            section: currentUser.role === "admin" ? "ALL" : currentUser.section,
          }),
        });
        if (res.ok) {
          setAnnTitle("");
          setAnnMessage("");
          setIsAnnounceModalOpen(false);
          await fetchAnnouncements();
          return;
        }
      } catch {
        // Fall back to local storage
      }
    }

    createClassAnnouncement({
      title: annTitle.trim(),
      message: annMessage.trim(),
      type: annType,
      targetBranchCode: currentUser.role === "admin" ? "ALL" : currentUser.branchCode,
      targetSection: currentUser.role === "admin" ? "ALL" : currentUser.section,
      authorName: currentUser.fullName,
      authorRole: currentUser.role === "admin" ? "admin" : "class_admin",
    });
    setAnnTitle("");
    setAnnMessage("");
    setIsAnnounceModalOpen(false);
    setNotifications(getNotifications());
  };

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    fetchAnnouncements();

    // Redirect to /login if on protected page without session
    if (!user && pathname !== "/login") {
      router.push("/login");
    }

    const handleStorageChange = () => {
      setCurrentUser(getCurrentUser());
      fetchAnnouncements();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [pathname, router]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Role-specific navigation links:
  // For the ADMIN account ONLY: keep Admin Panel, Timetable Centre (replacing My Timetable).
  // Student-oriented links (Dashboard, Mark Attendance, Calculator, Class Polls, Analytics, History & Export, Class Cancellation Reports)
  // are removed from the Admin account while profile controls, announcements, and logout remain.
  // For Students and CRs: keep all student-oriented navigation intact!
  const navLinks =
    currentUser?.role === "admin"
      ? [
          { href: "/admin", label: "Admin Panel", icon: ShieldAlert },
          { href: "/admin?tab=timetables", label: "Timetable Centre", icon: Calendar },
        ]
      : [
          { href: "/", label: "Dashboard", icon: LayoutDashboard },
          { href: "/mark-attendance", label: "Mark Attendance", icon: CheckCircle2 },
          { href: "/calculator", label: "Calculator", icon: Calculator },
          { href: "/timetable", label: "My Timetable", icon: Calendar },
          { href: "/polls", label: "Class Polls", icon: Vote },
          { href: "/analytics", label: "Analytics", icon: Sparkles },
          { href: "/history", label: "History & Export", icon: History },
          { href: "/cancellations", label: "Class Cancellation Reports", icon: AlertTriangle },
        ];

  if (pathname === "/login") {
    return (
      <header className="sticky top-0 z-40 bg-[#07070a]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white">
                  Attend<span className="text-indigo-400">X</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                  MMMUT
                </span>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 font-medium hidden sm:inline font-mono">
              Student Attendance Portal
            </span>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 transition-colors border border-white/10"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#07070a]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-white">
                    Attend<span className="text-indigo-400">X</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                    MMMUT
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold nav-item-glossy ${
                    isActive
                      ? "bg-white/[0.08] text-white border border-white/10 font-bold shadow-xs"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Notifications Popover */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 icon-btn-glossy"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#07070a] animate-pulse" />
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 futuristic-card rounded-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400" /> Notifications & Notices
                    </h3>
                    <div className="flex items-center gap-2">
                      {(currentUser?.role === "admin" || currentUser?.role === "class_admin") && (
                        <button
                          onClick={() => {
                            setIsNotifOpen(false);
                            setIsAnnounceModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-purple-300 bg-purple-950/70 border border-purple-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-purple-900 transition-colors"
                        >
                          <Megaphone className="w-3 h-3" /> Post Notice
                        </button>
                      )}
                      <span className="text-xs text-zinc-500 font-mono">{notifications.length}</span>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-4 text-center">No new notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            setNotifications(getNotifications());
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            n.isRead
                              ? "bg-white/[0.02] border-white/5 text-zinc-500"
                              : n.type === "danger"
                              ? "bg-rose-950/30 border-rose-500/30 text-zinc-200"
                              : n.authorRole
                              ? "bg-purple-950/30 border-purple-500/30 text-zinc-200"
                              : "bg-indigo-950/30 border-indigo-500/30 text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white">{n.title}</span>
                              {n.authorRole && (
                                <span
                                  className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${
                                    n.authorRole === "admin"
                                      ? "bg-indigo-950 text-indigo-300 border border-indigo-500/30"
                                      : "bg-purple-950 text-purple-300 border border-purple-500/30"
                                  }`}
                                >
                                  {n.authorRole === "admin" ? "University Admin" : "Class CR"}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 shrink-0 font-mono">{n.timestamp}</span>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed">{n.message}</p>
                          {n.authorName && (
                            <div className="text-[9px] text-zinc-500 mt-1 font-mono">
                              By {n.authorName}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2.5 mt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <Link
                      href="/notifications"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                    >
                      <Bell className="w-3 h-3" /> Push Notification Settings &rarr;
                    </Link>
                    <span className="text-[10px] text-zinc-500 font-mono">5-min window</span>
                  </div>
                </div>
              )}
            </div>

            {/* Profile badge & Switcher */}
            {currentUser ? (
              <>
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:border-indigo-500/40 bg-zinc-900/80 nav-item-glossy text-left group shadow-sm hover:shadow-indigo-500/10"
                >
                  <div
                    className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs shadow-sm text-white ${
                      currentUser.role === "admin"
                        ? "bg-indigo-600"
                        : currentUser.role === "class_admin"
                        ? "bg-purple-600"
                        : "bg-emerald-600"
                    }`}
                  >
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                      <span>{currentUser.fullName}</span>
                      {currentUser.role === "admin" && (
                        <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                          Admin
                        </span>
                      )}
                      {currentUser.role === "class_admin" && (
                        <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                          Class CR
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {currentUser.branchCode} {currentUser.section} &bull; {currentUser.batch}
                    </div>
                  </div>
                </button>

                {/* Logout Button */}
                <button
                  onClick={logoutUser}
                  className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 icon-btn-glossy"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="glossy-btn glossy-btn-primary shine-sweep px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" /> Log In
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              ref={mobileToggleBtnRef}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="xl:hidden border-b border-white/[0.06] bg-[#07070a]/95 backdrop-blur-xl px-4 pt-2 pb-4 space-y-1"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-white/10 text-white font-bold"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Student Profile Modal */}
      {currentUser && (
        <StudentProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentProfile={currentUser as any}
          onProfileUpdated={(updated) => {
            setCurrentUser(updated);
            window.location.reload();
          }}
        />
      )}

      {/* Class Admin / Admin Announcement Modal */}
      {isAnnounceModalOpen && currentUser && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAnnounceModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-purple-600" />
                Post Class Announcement
              </h3>
              <button
                onClick={() => setIsAnnounceModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Broadcasted as <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentUser.fullName}</span> ({currentUser.role === "admin" ? "University Admin" : "Class Admin / CR"}). Target: <span className="font-mono font-bold text-indigo-600">{currentUser.role === "admin" ? "All University" : `${currentUser.branchCode} ${currentUser.section}`}</span>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Notice Headline / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Extra Class on Saturday or Room Changed"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Priority / Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAnnType("info")}
                    className={`py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                      annType === "info"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600"
                    }`}
                  >
                    Information
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnType("warning")}
                    className={`py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                      annType === "warning"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600"
                    }`}
                  >
                    Warning
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnType("danger")}
                    className={`py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                      annType === "danger"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600"
                    }`}
                  >
                    Urgent
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Message Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide complete details for your classmates..."
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsAnnounceModalOpen(false)}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handlePostAnnouncement}
                className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm"
              >
                Broadcast Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
