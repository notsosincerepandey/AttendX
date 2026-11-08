"use client";

import React, { useState, useEffect } from "react";
import {
  Vote,
  Plus,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Calendar,
  X,
  Sparkles,
} from "lucide-react";
import { getSessionToken } from "@/lib/auth";
import { getAllBranches } from "@/data/extractedTimetables";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface PollItem {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  isClosed: boolean;
  branchCode?: string;
  section?: string;
  batch?: string;
  createdAt: string;
  creatorName?: string;
}

export default function AdminPollsView() {
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Create Poll Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["Yes", "No"]);
  const [targetBranch, setTargetBranch] = useState("ALL");
  const [targetSection, setTargetSection] = useState("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branches = getAllBranches();

  const fetchPolls = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getSessionToken();
      const res = await fetch("/api/polls", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPolls(data.polls || []);
      } else {
        setError(data.error || "Failed to load class polls.");
      }
    } catch {
      setError("Network error fetching class polls.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!question.trim() || validOptions.length < 2) {
      setError("Please provide a question and at least 2 non-empty options.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const token = getSessionToken();
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question: question.trim(),
          options: validOptions,
          branchCode: targetBranch,
          section: targetSection,
          batch: "ALL",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessBanner("Class poll created successfully!");
        setIsModalOpen(false);
        setQuestion("");
        setOptions(["Yes", "No"]);
        fetchPolls();
      } else {
        setError(data.error || "Failed to create poll.");
      }
    } catch {
      setError("Network error creating poll.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    try {
      const token = getSessionToken();
      const res = await fetch("/api/polls", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pollId, isClosed: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPolls((prev) =>
          prev.map((p) => (p.id === pollId ? { ...p, isClosed: true } : p))
        );
        setSuccessBanner("Poll closed to further voting.");
      } else {
        setError(data.error || "Failed to close poll.");
      }
    } catch {
      setError("Network error closing poll.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 uppercase tracking-wider">
              Democratic Governance
            </span>
            <span className="text-xs text-zinc-400">
              {polls.length} Total Poll{polls.length !== 1 ? "s" : ""}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Institutional Class Decision Polls
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
            Monitor student voting trends on rescheduling, laboratory sessions, and class preferences. Admins retain full authority to launch, audit, and close ballots institution-wide.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPolls}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700/60"
            title="Refresh polls"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/30 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Launch Class Poll</span>
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

      {/* Polls List */}
      {isLoading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
          <div className="text-xs text-zinc-400">Loading live class polls...</div>
        </div>
      ) : polls.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-500">
            <Vote className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No Active Class Polls</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            No class decision polls have been launched yet. Create a poll to gather student feedback on schedule changes or academic preferences.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-all shadow-md shadow-amber-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Launch First Poll</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {polls.map((poll) => {
            const total = poll.totalVotes || poll.options.reduce((sum, o) => sum + (o.votes || 0), 0);
            return (
              <div
                key={poll.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 space-y-4 transition-all shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          poll.isClosed
                            ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        {poll.isClosed ? "Ballot Closed" : "Active Voting"}
                      </span>

                      <span className="text-[11px] font-mono text-zinc-400">
                        Scope: {poll.branchCode || "ALL"} {poll.section ? `• ${poll.section}` : ""}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">{poll.question}</h3>
                  </div>

                  {!poll.isClosed && (
                    <button
                      onClick={() => handleClosePoll(poll.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors shrink-0 border border-zinc-700"
                      title="Close poll to further voting"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Close</span>
                    </button>
                  )}
                </div>

                {/* Options Vote Bars */}
                <div className="space-y-2.5">
                  {poll.options.map((opt) => {
                    const percentage = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                    return (
                      <div key={opt.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-200">{opt.text}</span>
                          <span className="font-mono text-zinc-400 text-[11px]">
                            {opt.votes} vote{opt.votes !== 1 ? "s" : ""} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 transition-all duration-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>Total: {total} votes recorded</span>
                  <span>{new Date(poll.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Poll Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Create Class Poll</h3>
                  <p className="text-[11px] text-zinc-400">Launch student voting on campus</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Poll Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Should the Physics Lab on Friday be shifted to 2:00 PM?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-zinc-300 font-bold">Poll Options (2 to 6)</label>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Option</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Target Department</label>
                  <select
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="ALL">ALL Departments (Campus-wide)</option>
                    {branches.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Target Section</label>
                  <select
                    value={targetSection}
                    onChange={(e) => setTargetSection(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="ALL">ALL Sections</option>
                    <option value="SEC-A">Section A</option>
                    <option value="SEC-B">Section B</option>
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
                  className="px-4 py-2 rounded-xl text-white bg-amber-600 hover:bg-amber-500 font-bold shadow-md shadow-amber-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? "Launching..." : "Launch Poll"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
