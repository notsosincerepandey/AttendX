"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
  Sparkles,
  Calendar,
} from "lucide-react";
import { getSessionToken } from "@/lib/auth";
import { getAllBranches } from "@/data/extractedTimetables";

interface CancellationItem {
  id: string;
  branchCode: string;
  section: string;
  subjectCode: string;
  subjectName: string;
  cancellationDate: string;
  periodNumber: number;
  reasonType: string;
  description: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  confirmationCount: number;
  reportedByRole: string;
  reporterName?: string;
  createdAt: string;
}

export default function AdminCancellationsView() {
  const [reports, setReports] = useState<CancellationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Submit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [branchCode, setBranchCode] = useState("IT");
  const [section, setSection] = useState("SEC-B");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [cancellationDate, setCancellationDate] = useState(new Date().toISOString().split("T")[0]);
  const [periodNumber, setPeriodNumber] = useState(1);
  const [reasonType, setReasonType] = useState("Faculty On Leave");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branches = getAllBranches();

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getSessionToken();
      const res = await fetch("/api/cancellations", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReports(data.reports || []);
      } else {
        setError(data.error || "Failed to load cancellation reports.");
      }
    } catch {
      setError("Network error fetching cancellation reports.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleConfirmReport = async (reportId: string) => {
    try {
      const token = getSessionToken();
      const res = await fetch("/api/cancellations/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessBanner("Cancellation report verified and confirmed!");
        fetchReports();
      } else {
        setError(data.error || "Failed to confirm cancellation report.");
      }
    } catch {
      setError("Network error confirming report.");
    }
  };

  const handleSubmitCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectCode.trim() || !subjectName.trim() || !description.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const token = getSessionToken();
      const res = await fetch("/api/cancellations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          branchCode,
          section,
          subjectCode: subjectCode.trim(),
          subjectName: subjectName.trim(),
          cancellationDate,
          periodNumber: Number(periodNumber),
          reasonType,
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessBanner("Official cancellation report published!");
        setIsModalOpen(false);
        setSubjectCode("");
        setSubjectName("");
        setDescription("");
        fetchReports();
      } else {
        setError(data.error || "Failed to submit cancellation report.");
      }
    } catch {
      setError("Network error submitting cancellation report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingReports = reports.filter((r) => r.status === "PENDING");
  const confirmedReports = reports.filter((r) => r.status === "CONFIRMED");

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30 uppercase tracking-wider">
              Lecture Audit
            </span>
            <span className="text-xs text-zinc-400">
              {pendingReports.length} Pending &bull; {confirmedReports.length} Confirmed
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Lecture Cancellation Reports & Audit
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
            Review cancellation claims submitted by Class CRs. Confirmed cancellations automatically adjust student attendance baselines to prevent inaccurate penalization under the 75% rule.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700/60"
            title="Refresh reports"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Cancellation</span>
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

      {/* Reports List */}
      {isLoading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mx-auto" />
          <div className="text-xs text-zinc-400">Loading cancellation records...</div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No Lecture Cancellations Reported</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            All scheduled academic periods are active. When a faculty member is absent or an official cancellation occurs, reports appear here for admin audit.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-md shadow-rose-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Report Official Cancellation</span>
          </button>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Class / Subject</th>
                  <th className="px-4 py-3.5">Date & Period</th>
                  <th className="px-4 py-3.5">Reason Category</th>
                  <th className="px-4 py-3.5">Details</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {reports.map((r) => {
                  const isPending = r.status === "PENDING";
                  return (
                    <tr key={r.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-white">{r.subjectName}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          {r.subjectCode} • {r.branchCode} {r.section}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-mono text-zinc-200">{r.cancellationDate}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">Period {r.periodNumber}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium text-[11px]">
                          {r.reasonType}
                        </span>
                      </td>
                      <td className="px-4 py-4 max-w-xs truncate text-zinc-400" title={r.description}>
                        {r.description}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isPending
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {isPending ? (
                            <>
                              <Clock className="w-3 h-3" />
                              Pending Audit
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Confirmed
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isPending ? (
                          <button
                            onClick={() => handleConfirmReport(r.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm shadow-emerald-600/30"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-zinc-500">
                            {r.confirmationCount || 1} confirmation{r.confirmationCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit Cancellation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Publish Official Cancellation</h3>
                  <p className="text-[11px] text-zinc-400">Exclude lecture from attendance calculation</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCancellation} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Branch</label>
                  <select
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                  >
                    {branches.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Section</label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                  >
                    <option value="SEC-A">Section A</option>
                    <option value="SEC-B">Section B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Subject Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BIT-101"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Fundamentals"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={cancellationDate}
                    onChange={(e) => setCancellationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Period Number</label>
                  <select
                    value={periodNumber}
                    onChange={(e) => setPeriodNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>
                        Period {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Reason Category</label>
                <select
                  value={reasonType}
                  onChange={(e) => setReasonType(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                >
                  <option value="Faculty On Leave">Faculty On Leave</option>
                  <option value="Official University Holiday">Official University Holiday</option>
                  <option value="Departmental Event / Seminar">Departmental Event / Seminar</option>
                  <option value="Class Rescheduled">Class Rescheduled</option>
                  <option value="Other">Other Administrative Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Description / Memo</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Official memo explaining the lecture cancellation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed"
                />
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
                  className="px-4 py-2 rounded-xl text-white bg-rose-600 hover:bg-rose-500 font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? "Publishing..." : "Publish Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
