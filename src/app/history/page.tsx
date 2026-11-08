"use client";

import React, { useState, useEffect } from "react";
import {
  StudentProfile,
  AttendanceRecord,
  AuditLogEntry,
  UniversityTimetable,
} from "@/types";
import {
  getStoredProfile,
  getStoredAttendance,
  getActiveTimetable,
  updatePeriodAttendance,
  getAuditLogs,
} from "@/lib/storage";
import {
  History,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  Calendar,
} from "lucide-react";

export default function AttendanceHistoryPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [timetable, setTimetable] = useState<UniversityTimetable | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<"PRESENT" | "ABSENT" | "CANCELLED">("PRESENT");
  const [editReason, setEditReason] = useState("");

  useEffect(() => {
    const prof = getStoredProfile();
    if (!prof) {
      setProfile(null);
      return;
    }
    const att = getStoredAttendance(prof);
    const tt = getActiveTimetable(prof);
    const logs = getAuditLogs();
    setProfile(prof);
    setRecords(att);
    setTimetable(tt);
    setAuditLogs(logs);
  }, []);

  // Auto-dismiss modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingRecord(null);
    };
    if (editingRecord) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingRecord]);

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
      </div>
    );
  }

  // Filter records
  const filteredRecords = records.filter((r) => {
    if (filterSubject !== "ALL" && r.subjectCode !== filterSubject) return false;
    if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
    if (filterCategory !== "ALL" && r.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSub = r.subjectCode.toLowerCase().includes(q) || r.subjectName.toLowerCase().includes(q);
      const matchDate = r.date.includes(q);
      if (!matchSub && !matchDate) return false;
    }
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.period - a.period);

  const handleSaveCorrection = () => {
    if (!editingRecord) return;
    const updated = updatePeriodAttendance(editingRecord.id, newStatus, editReason);
    setRecords(updated);
    setAuditLogs(getAuditLogs());
    setEditingRecord(null);
    setEditReason("");
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Period",
      "Subject Code",
      "Subject Name",
      "Category",
      "Room",
      "Batch",
      "Status",
      "Marked By",
      "Marked At",
    ];

    const rows = filteredRecords.map((r) => [
      r.date,
      `Period ${r.period}`,
      `"${r.subjectCode}"`,
      `"${r.subjectName}"`,
      r.category,
      `"${r.room}"`,
      r.batch,
      r.status,
      r.markedBy,
      r.markedAt,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `AttendX_Report_${profile.branchCode}_${profile.section}_${profile.batch}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Attendance History & Export
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Complete period-by-period audit records, corrections log, and official transcripts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export CSV / Excel
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print PDF Report
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search subject or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Subjects</option>
            {timetable.subjects.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present (+1)</option>
            <option value="ABSENT">Absent (0)</option>
            <option value="CANCELLED">Cancelled (Excluded)</option>
          </select>
        </div>

        <div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Categories</option>
            <option value="Theory">Theory Only</option>
            <option value="Lab">Lab Only</option>
            <option value="Tutorial">Tutorial Only</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
          <span className="font-bold text-zinc-700 dark:text-zinc-300">
            Showing {filteredRecords.length} records
          </span>
          <span className="text-zinc-400">
            Student: {profile.fullName} &bull; {profile.branchCode} {profile.section} (Batch {profile.batch})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 uppercase tracking-wider bg-zinc-50/70 dark:bg-zinc-800/40">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Marked By</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    No matching attendance records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                    <td className="py-3 px-4 font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      {r.date}
                    </td>
                    <td className="py-3 px-4 font-bold">
                      Period {r.period}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {r.subjectCode}
                      </span>
                      <div className="text-[11px] text-zinc-500 line-clamp-1">
                        {r.subjectName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.category === "Lab"
                            ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                            : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                        }`}
                      >
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500">
                      {r.room}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          r.status === "PRESENT"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                            : r.status === "ABSENT"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {r.status === "PRESENT" && <CheckCircle2 className="w-3 h-3" />}
                        {r.status === "ABSENT" && <XCircle className="w-3 h-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-zinc-400">
                      {r.markedBy}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingRecord(r);
                          setNewStatus(r.status === "ABSENT" ? "ABSENT" : r.status === "CANCELLED" ? "CANCELLED" : "PRESENT");
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline"
                      >
                        Correct
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Trail */}
      {auditLogs.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              Recent Attendance Modification Audit Trail
            </h2>
            <span className="text-xs text-zinc-400">{auditLogs.length} logged events</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {log.subjectCode} (Period {log.period})
                  </span>{" "}
                  on <span className="font-mono text-zinc-500">{log.date}</span> &bull; Changed from{" "}
                  <span className="font-bold text-rose-500">{log.oldStatus}</span> to{" "}
                  <span className="font-bold text-emerald-500">{log.newStatus}</span>
                  {log.reason && <p className="text-[11px] text-zinc-400 mt-0.5">Reason: {log.reason}</p>}
                </div>
                <span className="text-[10px] text-zinc-400">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Correction Modal */}
      {editingRecord && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingRecord(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Correct Attendance Record
            </h3>
            <p className="text-xs text-zinc-500">
              Modifying attendance for <span className="font-bold text-zinc-800 dark:text-zinc-200">{editingRecord.subjectCode}</span> on {editingRecord.date} (Period {editingRecord.period}).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">New Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus("PRESENT")}
                    className={`p-2 rounded-lg font-bold border transition-colors ${
                      newStatus === "PRESENT"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600"
                    }`}
                  >
                    Present
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus("ABSENT")}
                    className={`p-2 rounded-lg font-bold border transition-colors ${
                      newStatus === "ABSENT"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600"
                    }`}
                  >
                    Absent
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus("CANCELLED")}
                    className={`p-2 rounded-lg font-bold border transition-colors ${
                      newStatus === "CANCELLED"
                        ? "bg-zinc-700 text-white border-zinc-700"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600"
                    }`}
                  >
                    Cancelled
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Reason for Correction</label>
                <input
                  type="text"
                  placeholder="e.g. Teacher marked attendance late, or marked present in class"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCorrection}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
