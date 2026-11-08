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
  submitCancellationReport,
  confirmCancellationReport,
  getTodayDateStr,
} from "@/lib/storage";
import {
  AlertTriangle,
  Users,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";

export default function CancellationsPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [timetable, setTimetable] = useState<UniversityTimetable | null>(null);
  const [reports, setReports] = useState<CancellationReport[]>([]);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Form state
  const [reportDate, setReportDate] = useState("");
  const [reportPeriod, setReportPeriod] = useState<number | undefined>(undefined);
  const [reportSubjectCode, setReportSubjectCode] = useState<string>("ALL");
  const [reportReasonType, setReportReasonType] = useState<
    "MASS_BUNK" | "TEACHER_ABSENT" | "COLLEGE_HOLIDAY" | "OTHER"
  >("TEACHER_ABSENT");
  const [reportDescription, setReportDescription] = useState("");

  useEffect(() => {
    const prof = getStoredProfile();
    const tt = getActiveTimetable(prof);
    setProfile(prof);
    setTimetable(tt);
    setReports(getCancellationReports());
    setReportDate(getTodayDateStr());
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

  if (!profile || !timetable) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleConfirm = (reportId: string) => {
    const updated = confirmCancellationReport(reportId);
    setReports(updated);
  };

  const handleCreateReport = () => {
    if (!reportDescription.trim()) return;

    const newRep = submitCancellationReport({
      studentId: profile.id,
      studentName: profile.fullName,
      date: reportDate,
      period: reportPeriod ? Number(reportPeriod) : undefined,
      subjectCode: reportSubjectCode === "ALL" ? undefined : reportSubjectCode,
      reasonType: reportReasonType,
      description: reportDescription.trim(),
    });

    setReports(getCancellationReports());
    setIsSubmitModalOpen(false);
    setReportDescription("");
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

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Report Cancellation / Mass Bunk
        </button>
      </div>

      {/* Rules Notice */}
      <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1">
        <div className="font-bold flex items-center gap-1.5">
          <Info className="w-4 h-4 text-amber-600" /> Cancellation Protocol Rule:
        </div>
        <p>
          A single student reporting a mass bunk or teacher absence does not immediately cancel classes for everyone. It enters a confirmation queue. Once peer confirmation or moderator approval occurs, affected periods automatically switch to CANCELLED state and will not hurt anyone&apos;s attendance percentage.
        </p>
      </div>

      {/* Active Reports List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          Active Cancellation Reports ({profile.branchCode} {profile.section})
        </h2>

        {reports.length === 0 ? (
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
                  {r.status === "PENDING" && (
                    <button
                      onClick={() => handleConfirm(r.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5" /> Confirm This Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Submit Report Modal */}
      {isSubmitModalOpen && (
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
                className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReport}
                className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
