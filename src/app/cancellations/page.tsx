"use client";

import React, { useState, useEffect } from "react";
import {
  StudentProfile,
  CancellationReport,
  UniversityTimetable,
} from "@/types";
import {
  getStoredProfile,
  getActiveTimetable,
  getCancellationReports,
  getTodayDateStr,
} from "@/lib/storage";
import { getSessionToken } from "@/lib/auth";
import {
  AlertTriangle,
  Users,
  CheckCircle2,
  Plus,
  Info,
  AlertCircle,
} from "lucide-react";

export default function CancellationsPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [timetable, setTimetable] = useState<UniversityTimetable | null>(null);
  const [reports, setReports] = useState<CancellationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Form state
  const [reportDate, setReportDate] = useState("");
  const [reportPeriod, setReportPeriod] = useState<number | undefined>(undefined);
  const [reportSubjectCode, setReportSubjectCode] = useState<string>("ALL");
  const [reportReasonType, setReportReasonType] = useState<
    "MASS_BUNK" | "TEACHER_ABSENT" | "COLLEGE_HOLIDAY" | "OTHER"
  >("TEACHER_ABSENT");
  const [reportDescription, setReportDescription] = useState("");

  const fetchReports = async () => {
    setIsLoading(true);
    const token = getSessionToken();
    try {
      const res = await fetch("/api/cancellations", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
      } else {
        setReports(getCancellationReports());
      }
    } catch (err: any) {
      console.warn("API fetch error, falling back to local state:", err.message);
      setReports(getCancellationReports());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const prof = getStoredProfile();
    if (!prof) {
      setProfile(null);
      return;
    }
    const tt = getActiveTimetable(prof);
    setProfile(prof);
    setTimetable(tt);
    setReportDate(getTodayDateStr());
    fetchReports();
  }, []);

  // Auto-dismiss modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSubmitModalOpen(false);
    };
    if (isSubmitModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitModalOpen]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Timetable Mapping Not Found
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          No official timetable is currently mapped for branch <span className="font-semibold text-zinc-900 dark:text-zinc-200">{profile.branch} ({profile.branchCode})</span>, section <span className="font-semibold text-zinc-900 dark:text-zinc-200">{profile.section}</span>.
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Please contact your Department Administrator or Class Representative to publish your section&apos;s schedule.
        </p>
      </div>
    );
  }

  const canManageCancellations = profile.role === "admin" || profile.role === "class_admin";

  const handleConfirm = async (reportId: string) => {
    if (!canManageCancellations) return;
    setConfirmingId(reportId);
    setErrorBanner(null);
    setSuccessBanner(null);

    const token = getSessionToken();
    try {
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
        setSuccessBanner("Cancellation report confirmed. Classes marked as cancelled.");
        await fetchReports();
      } else {
        setErrorBanner(data.error || "Failed to confirm cancellation report.");
      }
    } catch (err: any) {
      setErrorBanner("Network error: Unable to confirm report. Please verify connection.");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCreateReport = async () => {
    if (!canManageCancellations) return;
    if (!reportDescription.trim()) return;

    setIsSubmitting(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    const token = getSessionToken();
    try {
      const res = await fetch("/api/cancellations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          date: reportDate,
          period: reportPeriod ? Number(reportPeriod) : undefined,
          subjectCode: reportSubjectCode === "ALL" ? undefined : reportSubjectCode,
          reasonType: reportReasonType,
          description: reportDescription.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.report) {
        setSuccessBanner("Cancellation report submitted and shared with class.");
        setIsSubmitModalOpen(false);
        setReportDescription("");
        await fetchReports();
      } else {
        setErrorBanner(data.error || "Failed to submit cancellation report.");
      }
    } catch (err: any) {
      setErrorBanner("Network error: Unable to submit report. Please check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Mass Bunk & Class Cancellation System
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Community-driven cancellation verification. Confirmed cancellations are excluded from both numerator and denominator (+0/+0).
          </p>
        </div>

        {canManageCancellations && (
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 self-start sm:self-center"
          >
            <Plus className="w-4 h-4" /> Report Cancellation / Mass Bunk
          </button>
        )}
      </div>

      {/* Rules Notice */}
      <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1">
        <div className="font-bold flex items-center gap-1.5">
          <Info className="w-4 h-4 text-amber-600" /> Cancellation Protocol Rule:
        </div>
        <p>
          Cancellation reports are submitted and confirmed by Class Representatives (CRs) and Administrators. Confirmed cancellations are excluded from both numerator and denominator (+0/+0) and will not hurt anyone&apos;s attendance percentage.
        </p>
      </div>

      {/* Feedback Banners */}
      {errorBanner && (
        <div className="p-4 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 rounded-xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-600 dark:text-rose-400 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Active Reports List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          Active Cancellation Reports ({profile.branchCode} {profile.section})
        </h2>

        {isLoading ? (
          <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center text-zinc-400 flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
            <span className="text-xs">Loading shared cancellation reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center text-zinc-400">
            No cancellation reports submitted yet.
          </div>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              className={`p-5 rounded-2xl border transition-all ${
                r.status === "CONFIRMED"
                  ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        r.reasonType === "MASS_BUNK"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                          : r.reasonType === "TEACHER_ABSENT"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      {r.reasonType.replace("_", " ")}
                    </span>

                    <span className="text-xs font-mono font-medium text-zinc-500">
                      Date: {r.date}
                    </span>

                    {r.period && (
                      <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        Period {r.period}
                      </span>
                    )}

                    {r.subjectCode && (
                      <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {r.subjectCode}
                      </span>
                    )}

                    {r.status === "CONFIRMED" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Confirmed (Excluded)
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                        Pending Peer Confirmation
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-zinc-800 dark:text-zinc-200 font-medium">
                    {r.description}
                  </p>

                  <div className="text-[11px] text-zinc-400">
                    Reported by <span className="font-semibold text-zinc-600 dark:text-zinc-300">{r.studentName}</span> &bull; {r.confirmationCount} students confirmed
                  </div>
                </div>

                {/* Confirm Action Button */}
                <div className="flex items-center gap-2 self-end sm:self-start">
                  {canManageCancellations && r.status === "PENDING" && (
                    <button
                      onClick={() => handleConfirm(r.id)}
                      disabled={confirmingId === r.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 disabled:opacity-50"
                    >
                      {confirmingId === r.id ? (
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-indigo-600 mr-1" />
                      ) : (
                        <Users className="w-3.5 h-3.5" />
                      )}
                      Confirm This Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Submit Report Modal */}
      {canManageCancellations && isSubmitModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSubmitModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Report Schedule Change / Mass Bunk
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Reason Category</label>
                <select
                  value={reportReasonType}
                  onChange={(e) => setReportReasonType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium"
                >
                  <option value="TEACHER_ABSENT">Teacher Absent / Class Cancelled</option>
                  <option value="MASS_BUNK">Mass Bunk (Class-wide consensus)</option>
                  <option value="COLLEGE_HOLIDAY">University / Department Holiday</option>
                  <option value="OTHER">Other Schedule Disruption</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Date</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Period (Optional)</label>
                  <select
                    value={reportPeriod || ""}
                    onChange={(e) => setReportPeriod(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  >
                    <option value="">Entire Day</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>
                        Period {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Subject (Optional)</label>
                <select
                  value={reportSubjectCode}
                  onChange={(e) => setReportSubjectCode(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                >
                  <option value="ALL">All Subjects Affected</option>
                  {timetable.subjects.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Description / Details</label>
                <textarea
                  rows={3}
                  placeholder="Provide context (e.g. Teacher announced on WhatsApp, or sports fest ceremony)"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReport}
                disabled={isSubmitting || !reportDescription.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />}
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
