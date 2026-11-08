"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  Info,
  AlertTriangle,
  Flame,
  X,
} from "lucide-react";
import { getSessionToken } from "@/lib/auth";
import { getAllBranches } from "@/data/extractedTimetables";

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  priority?: "info" | "warning" | "danger";
  branchCode?: string;
  section?: string;
  batch?: string;
  createdAt: string;
  authorName?: string;
}

export default function AdminAnnouncementsView() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // New Announcement Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newPriority, setNewPriority] = useState<"info" | "warning" | "danger">("info");
  const [targetBranch, setTargetBranch] = useState("ALL");
  const [targetSection, setTargetSection] = useState("ALL");
  const [targetBatch, setTargetBatch] = useState("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branches = getAllBranches();

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getSessionToken();
      const res = await fetch("/api/announcements", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAnnouncements(data.announcements || []);
      } else {
        setError(data.error || "Failed to load announcements.");
      }
    } catch {
      setError("Network error fetching announcements.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const token = getSessionToken();
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          message: newMessage.trim(),
          priority: newPriority,
          branchCode: targetBranch,
          section: targetSection,
          batch: targetBatch,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessBanner(`Announcement "${newTitle.trim()}" published successfully!`);
        setIsModalOpen(false);
        setNewTitle("");
        setNewMessage("");
        setNewPriority("info");
        fetchAnnouncements();
      } else {
        setError(data.error || "Failed to publish announcement.");
      }
    } catch {
      setError("Network error publishing announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const token = getSessionToken();
      const res = await fetch(`/api/announcements?id=${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        setSuccessBanner("Announcement deleted.");
      } else {
        setError(data.error || "Failed to delete announcement.");
      }
    } catch {
      setError("Network error deleting announcement.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold border border-cyan-500/30 uppercase tracking-wider">
              Campus Broadcast
            </span>
            <span className="text-xs text-zinc-400">
              {announcements.length} Published Notice{announcements.length !== 1 ? "s" : ""}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Class & Institutional Announcements
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
            Broadcast authoritative notices across all MMMUT branches or scope them to specific departmental sections. Announcements appear on student dashboards instantly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnnouncements}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700/60"
            title="Refresh announcements"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/30 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Announcement</span>
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-xs font-semibold text-emerald-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-xs font-semibold text-rose-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Announcements List */}
      {isLoading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto" />
          <div className="text-xs text-zinc-400">Loading announcements...</div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-500">
            <Megaphone className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No Announcements Published Yet</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            You have not broadcast any announcements. Create one to inform students about examinations, lab guidelines, or university notices.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-all shadow-md shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Announcement</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((a) => {
            const isDanger = a.priority === "danger";
            const isWarning = a.priority === "warning";
            return (
              <div
                key={a.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 space-y-3 transition-all shadow-md relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isDanger
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                            : isWarning
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        }`}
                      >
                        {a.priority || "Info"}
                      </span>

                      <span className="text-[11px] font-mono text-zinc-400">
                        Scope: {a.branchCode || "ALL"} {a.section ? `• ${a.section}` : ""}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white">{a.title}</h3>
                  </div>

                  <button
                    onClick={() => handleDeleteAnnouncement(a.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors shrink-0"
                    title="Delete announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{a.message}</p>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>By: {a.authorName || "Administrator"}</span>
                  <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Broadcast Announcement</h3>
                  <p className="text-[11px] text-zinc-400">Create notice visible to students</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End-Semester Practical Lab Evaluation Schedule"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Message Body</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter complete announcement details..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Priority Level</label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                  >
                    <option value="info">Info (Standard)</option>
                    <option value="warning">Warning (Important)</option>
                    <option value="danger">Urgent / Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Target Department</label>
                  <select
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
                  >
                    <option value="ALL">ALL Departments (Campus-wide)</option>
                    {branches.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-white bg-cyan-600 hover:bg-cyan-500 font-bold shadow-md shadow-cyan-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? "Publishing..." : "Publish Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
