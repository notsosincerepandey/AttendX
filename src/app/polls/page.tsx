"use client";

import React, { useState, useEffect } from "react";
import { StudentProfile, ClassPoll } from "@/types";
import { getStoredProfile } from "@/lib/storage";
import { getSessionToken, setSessionToken } from "@/lib/auth";
import { canUserVoteInPoll, canUserClosePoll } from "@/lib/serverPolls";
import {
  Vote,
  Plus,
  CheckCircle2,
  Clock,
  Users,
  Lock,
  X,
  Sparkles,
  Filter,
  AlertTriangle,
  Calendar,
  Check,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import RadialNavWheel from "@/components/RadialNavWheel";

export default function ClassPollsPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [polls, setPolls] = useState<ClassPoll[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>({}); // pollId -> optionId
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Create Poll Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [pollDescription, setPollDescription] = useState("");
  const [pollCategory, setPollCategory] = useState<
    "MASS_BUNK" | "RESCHEDULE" | "EXTRA_CLASS" | "GENERAL"
  >("MASS_BUNK");
  const [pollOptions, setPollOptions] = useState<string[]>([
    "Yes, 100% agreed",
    "No, attend class as scheduled",
  ]);

  const refreshPolls = async (prof?: StudentProfile | null) => {
    setIsLoading(true);
    setErrorBanner(null);

    const token = getSessionToken();
    if (!token) {
      setErrorBanner("Authentication required: Please log in with your university account to access class polls.");
      setPolls([]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/polls", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.polls)) {
        setPolls(data.polls);
        setErrorBanner(null);
      } else if (res.status === 401) {
        setSessionToken(null);
        setErrorBanner("Your session has expired or was revoked. Please log in again to access class polls.");
        setPolls([]);
      } else {
        setErrorBanner(data.error || "Unable to load class polls from the university server.");
        setPolls([]);
      }
    } catch (err: any) {
      setErrorBanner("Network error: Unable to reach the class polls server. Please verify your connection.");
      setPolls([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const prof = getStoredProfile();
    setProfile(prof);
    refreshPolls(prof);

    const handleStorage = () => {
      refreshPolls(prof);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Auto-dismiss modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    if (isModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isClassAdminOrAdmin =
    profile.role === "admin" || profile.role === "class_admin";

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleVote = async (pollId: string) => {
    const optionId = selectedVotes[pollId];
    if (!optionId) {
      showToast("Please choose an option before voting.");
      return;
    }

    const token = getSessionToken();
    if (!token) {
      showToast("Authentication required: Please log in to vote.");
      return;
    }

    try {
      const res = await fetch("/api/polls", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "vote", pollId, optionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Your vote has been counted!");
        await refreshPolls(profile);
      } else if (res.status === 401) {
        setSessionToken(null);
        showToast("Session expired or revoked. Please log in again.");
      } else {
        showToast(data.error || "Unable to cast vote.");
      }
    } catch (err) {
      showToast("Network error while submitting vote. Please try again.");
    }
  };

  const handleClosePoll = async (pollId: string) => {
    const token = getSessionToken();
    if (!token) {
      showToast("Authentication required: Please log in to close polls.");
      return;
    }

    try {
      const res = await fetch("/api/polls", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "close", pollId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Poll closed for voting.");
        await refreshPolls(profile);
      } else if (res.status === 401) {
        setSessionToken(null);
        showToast("Session expired or revoked. Please log in again.");
      } else {
        showToast(data.error || "Unable to close poll.");
      }
    } catch (err) {
      showToast("Network error while closing poll. Please try again.");
    }
  };

  const handleAddOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (pollOptions.length > 2) {
      const updated = [...pollOptions];
      updated.splice(index, 1);
      setPollOptions(updated);
    }
  };

  const handleCreatePoll = async () => {
    if (!pollTitle.trim()) {
      showToast("Please enter a question or title for the poll.");
      return;
    }

    const validOptions = pollOptions
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (validOptions.length < 2) {
      showToast("Poll must contain at least 2 options.");
      return;
    }

    const targetBranch = profile.role === "admin" ? "ALL" : (profile.managedBranchCode || profile.branchCode || "IT");
    const targetSection = profile.role === "admin" ? "ALL" : (profile.managedSection || profile.section || "SEC-B");

    const token = getSessionToken();
    if (!token) {
      showToast("Authentication required: Please log in to create polls.");
      return;
    }

    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: pollTitle.trim(),
          description: pollDescription.trim(),
          category: pollCategory,
          branchCode: targetBranch,
          section: targetSection,
          options: validOptions.map((text) => ({ text })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPollTitle("");
        setPollDescription("");
        setPollOptions(["Yes, 100% agreed", "No, attend class as scheduled"]);
        setIsModalOpen(false);
        showToast("Class poll published successfully!");
        await refreshPolls(profile);
      } else if (res.status === 401) {
        setSessionToken(null);
        showToast("Session expired or revoked. Please log in again.");
      } else {
        showToast(data.error || "Failed to create class poll.");
      }
    } catch (err) {
      showToast("Network error while creating poll. Please try again.");
    }
  };

  const filteredPolls = polls.filter((p) => {
    if (categoryFilter === "ALL") return true;
    return p.category === categoryFilter;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="futuristic-card p-6 rounded-2xl border border-white/[0.08] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {profile.role === "admin"
                ? "University-Wide Consensus"
                : `${profile.managedBranchCode || profile.branchCode} ${profile.managedSection || profile.section} Consensus`}
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              Student Democracy & Polling
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Vote className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Class Polls & Voting
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Vote on class cancellations, lab rescheduling, and class matters. Real-time anonymous voting powered by your Class Representatives.
          </p>
        </div>

        {/* Create Poll Button for Class Admin / Admin */}
        {isClassAdminOrAdmin ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="glossy-btn glossy-btn-primary shine-sweep px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md shadow-purple-600/25 flex items-center gap-2 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Create Class Poll
          </button>
        ) : (
          <div className="text-xs text-zinc-400 bg-zinc-800/60 px-3 py-2 rounded-xl border border-white/10 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Polls organized by your Class CR</span>
          </div>
        )}
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Error or Authentication Required Banner */}
      {errorBanner && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => refreshPolls(profile)}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shrink-0 shadow-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {[
          { id: "ALL", label: "All Polls" },
          { id: "MASS_BUNK", label: "Class Cancellations" },
          { id: "RESCHEDULE", label: "Rescheduling" },
          { id: "EXTRA_CLASS", label: "Extra Classes" },
          { id: "GENERAL", label: "General" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              categoryFilter === tab.id
                ? "glossy-btn glossy-btn-primary text-white shadow-xs"
                : "glossy-btn glossy-btn-secondary text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Polls Feed */}
      <div className="space-y-4">
        {filteredPolls.length === 0 ? (
          <div className="futuristic-card p-12 rounded-2xl border border-white/[0.08] text-center text-zinc-400 text-xs">
            <Vote className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
            No active polls found for {categoryFilter === "ALL" ? "this class" : categoryFilter.replace("_", " ")}.
          </div>
        ) : (
          filteredPolls.map((poll) => {
            const userVotedOptionId = poll.votedUserIds?.[profile.id];
            const hasVoted = Boolean(userVotedOptionId);
            const isClosed = poll.status === "CLOSED";
            const voteCheck = canUserVoteInPoll(profile, poll);
            const canVote = voteCheck.allowed;
            const closeCheck = canUserClosePoll(profile, poll);
            const canClose = closeCheck.allowed;

            return (
              <div
                key={poll.id}
                className="futuristic-card p-5 rounded-2xl border border-white/[0.08] shadow-xs space-y-4 transition-all"
              >
                {/* Poll Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          poll.category === "MASS_BUNK"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                            : poll.category === "RESCHEDULE"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                        }`}
                      >
                        {poll.category === "MASS_BUNK"
                          ? "CLASS CANCELLATION"
                          : poll.category.replace("_", " ")}
                      </span>

                      <span className="text-[10px] font-bold text-zinc-400 font-mono">
                        {poll.branchCode} {poll.section}
                      </span>

                      {isClosed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          Closed
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse">
                          Live Voting
                        </span>
                      )}
                    </div>

                    <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                      {poll.title}
                    </h2>

                    {poll.description && (
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {poll.description}
                      </p>
                    )}
                  </div>

                  {/* Creator Info & Admin Close Action */}
                  <div className="flex sm:flex-col items-end gap-1.5 shrink-0 text-right">
                    <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-purple-500" />
                      <span>{poll.createdBy.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {poll.totalVotes} total votes
                    </span>

                    {/* Authorized Class Admin or Admin can close poll */}
                    {!isClosed && canClose && (
                      <button
                        onClick={() => handleClosePoll(poll.id)}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-700 mt-1 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded-lg"
                      >
                        Close Voting
                      </button>
                    )}
                  </div>
                </div>

                {/* Options List */}
                <div className="space-y-2.5">
                  {poll.options.map((option) => {
                    const percentage =
                      poll.totalVotes > 0
                        ? Math.round((option.votes / poll.totalVotes) * 100)
                        : 0;
                    const isSelectedByMe = userVotedOptionId === option.id;
                    const isPickedRadio = selectedVotes[poll.id] === option.id;

                    return (
                      <div
                        key={option.id}
                        onClick={() => {
                          if (!hasVoted && !isClosed && canVote) {
                            setSelectedVotes({
                              ...selectedVotes,
                              [poll.id]: option.id,
                            });
                          }
                        }}
                        className={`interactive-tile p-3 rounded-xl border relative overflow-hidden transition-all ${
                          !hasVoted && !isClosed && canVote
                            ? isPickedRadio
                              ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-950/30 cursor-pointer"
                              : "border-white/10 hover:border-purple-500/30 cursor-pointer bg-white/[0.02]"
                            : isSelectedByMe
                            ? "border-purple-500/50 bg-purple-950/20"
                            : "border-white/5 bg-white/[0.01]"
                        }`}
                      >
                        {/* Background Progress Fill Bar */}
                        {(hasVoted || isClosed) && (
                          <div
                            className={`absolute inset-y-0 left-0 transition-all duration-700 ${
                              isSelectedByMe
                                ? "bg-purple-500/20"
                                : "bg-white/[0.06]"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        )}

                        <div className="relative flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            {!hasVoted && !isClosed ? (
                              canVote ? (
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                    isPickedRadio
                                      ? "border-purple-500 bg-purple-600 text-white"
                                      : "border-zinc-500"
                                  }`}
                                >
                                  {isPickedRadio && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                              ) : null
                            ) : isSelectedByMe ? (
                              <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            ) : null}

                            <span
                              className={`font-semibold ${
                                isSelectedByMe
                                  ? "text-purple-300 font-bold"
                                  : "text-zinc-200"
                              }`}
                            >
                              {option.text}
                            </span>
                          </div>

                          {(hasVoted || isClosed) && (
                            <div className="font-mono text-xs font-bold text-zinc-300 flex items-center gap-2 shrink-0">
                              <span>{option.votes} votes</span>
                              <span className="text-purple-400 w-10 text-right">
                                {percentage}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  {!hasVoted && !isClosed ? (
                    canVote ? (
                      <button
                        onClick={() => handleVote(poll.id)}
                        disabled={!selectedVotes[poll.id]}
                        className="glossy-btn glossy-btn-primary shine-sweep px-4 py-2 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        Cast My Vote
                      </button>
                    ) : (
                      <span className="text-amber-400 text-[11px] font-medium flex items-center gap-1.5 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-800/60">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Voting restricted to {poll.branchCode} {poll.section}
                      </span>
                    )
                  ) : (
                    <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {hasVoted ? "You have voted in this poll" : "Poll concluded"}
                    </span>
                  )}

                  {hasVoted && (
                    <span className="text-[10px] text-zinc-400">
                      Votes are anonymous & consensus-tracked
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Poll Modal */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="futuristic-card rounded-2xl shadow-2xl border border-white/10 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Vote className="w-5 h-5 text-purple-400" />
                Launch Class Poll
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="icon-btn-glossy p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Create a democratic poll for <span className="font-bold text-purple-400">{profile.branchCode} {profile.section}</span>. Classmates can vote once and see real-time percentages.
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-zinc-300">Poll Question / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Class cancellation Friday Period 6 & 7 for cultural fest?"
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-zinc-300">Category</label>
                <select
                  value={pollCategory}
                  onChange={(e) => setPollCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="MASS_BUNK">Class Cancellation Consensus</option>
                  <option value="RESCHEDULE">Class / Lab Rescheduling</option>
                  <option value="EXTRA_CLASS">Extra Class Agreement</option>
                  <option value="GENERAL">General Class Decision</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-zinc-300">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Provide context or explanation for the vote..."
                  value={pollDescription}
                  onChange={(e) => setPollDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-zinc-300">Poll Options (2 - 5)</label>
                  {pollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      + Add Option
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...pollOptions];
                          updated[idx] = e.target.value;
                          setPollOptions(updated);
                        }}
                        className="flex-1 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="icon-btn-glossy p-2 text-zinc-400 hover:text-rose-400 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="glossy-btn glossy-btn-secondary px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePoll}
                className="glossy-btn glossy-btn-primary shine-sweep px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm"
              >
                Launch Poll to Class
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Radial Navigation Wheel */}
      <RadialNavWheel variant="floating" />
    </div>
  );
}