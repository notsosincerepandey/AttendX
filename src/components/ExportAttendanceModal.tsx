"use client";

import React, { useState, useEffect } from "react";
import { AttendanceRecord } from "@/types";
import {
  exportAttendanceToXLSX,
  exportAttendanceToCSV,
  prepareAttendanceExportData,
  generateExportFilename,
} from "@/lib/attendanceExport";
import {
  FileSpreadsheet,
  FileText,
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Filter,
} from "lucide-react";

export interface ExportAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  filterDescription?: string;
  studentName?: string;
}

export type ExportFormat = "xlsx" | "csv";

export default function ExportAttendanceModal({
  isOpen,
  onClose,
  records,
  filterDescription,
  studentName,
}: ExportAttendanceModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successFilename, setSuccessFilename] = useState<string | null>(null);

  // Auto-dismiss modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isExporting) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isExporting, onClose]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessFilename(null);
      setIsExporting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const { rows } = prepareAttendanceExportData(records);
  const previewRows = rows.slice(0, 3);
  const targetFilename = generateExportFilename(records, selectedFormat);

  const handleExport = async () => {
    if (records.length === 0) {
      setErrorMessage("No attendance records to export. Please adjust your filters or mark attendance first.");
      return;
    }

    try {
      setIsExporting(true);
      setErrorMessage(null);

      let filename = "";
      if (selectedFormat === "xlsx") {
        filename = await exportAttendanceToXLSX(records);
      } else {
        filename = exportAttendanceToCSV(records);
      }

      setSuccessFilename(filename);

      // Brief pause for success state before closing
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate export file. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
    >
      <div className="futuristic-card w-full max-w-lg p-6 sm:p-7 rounded-3xl border border-white/[0.08] shadow-2xl space-y-5 text-left relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isExporting}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors disabled:opacity-40"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pr-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Download className="w-3.5 h-3.5" />
            <span>Attendance Report Export</span>
          </div>
          <h2
            id="export-modal-title"
            className="text-lg sm:text-xl font-black text-white tracking-tight"
          >
            Choose Export Format
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Download your structured attendance record. Select the format that best fits your workflow.
          </p>
        </div>

        {/* Record Scope Badge */}
        <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-medium">
              {records.length} {records.length === 1 ? "record" : "records"} selected
            </span>
          </div>
          {filterDescription && (
            <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
              <Filter className="w-3 h-3 text-zinc-500" />
              {filterDescription}
            </span>
          )}
        </div>

        {/* Format Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Excel Format Option */}
          <button
            type="button"
            onClick={() => setSelectedFormat("xlsx")}
            disabled={isExporting}
            className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
              selectedFormat === "xlsx"
                ? "bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                : "bg-white/[0.02] border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04]"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                {selectedFormat === "xlsx" && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Selected
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Excel Workbook</h3>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold block">
                  .xlsx
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal">
                Formatted spreadsheet with frozen header row, autofilters, and column auto-sizing.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Best for MS Excel & Google Sheets</span>
            </div>
          </button>

          {/* CSV Format Option */}
          <button
            type="button"
            onClick={() => setSelectedFormat("csv")}
            disabled={isExporting}
            className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
              selectedFormat === "csv"
                ? "bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                : "bg-white/[0.02] border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04]"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                {selectedFormat === "csv" && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Selected
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">CSV File</h3>
                <span className="text-[10px] font-mono text-cyan-400 font-semibold block">
                  .csv
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal">
                Lightweight universal comma-separated text table with UTF-8 BOM encoding.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Universal & developer-friendly</span>
            </div>
          </button>
        </div>

        {/* Live Structure Preview */}
        {previewRows.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-300">Tabular Layout Preview</span>
              <span className="font-mono text-[10px]">Date &bull; Subject &bull; Attendance</span>
            </div>
            <div className="bg-black/40 border border-white/[0.06] rounded-xl overflow-hidden text-[11px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] text-zinc-400 bg-white/[0.02]">
                    <th className="py-1.5 px-3 font-semibold">Date</th>
                    <th className="py-1.5 px-3 font-semibold">Subject</th>
                    <th className="py-1.5 px-3 font-semibold">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-zinc-300 font-mono text-[10px]">
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-3 text-zinc-400">{row.date}</td>
                      <td className="py-1.5 px-3 text-white font-sans truncate max-w-[160px]">
                        {row.subject}
                      </td>
                      <td className="py-1.5 px-3">
                        <span
                          className={`font-semibold ${
                            row.attendance === "Present"
                              ? "text-emerald-400"
                              : row.attendance === "Absent"
                              ? "text-rose-400"
                              : "text-zinc-400"
                          }`}
                        >
                          {row.attendance}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rows.length > 3 && (
                    <tr>
                      <td colSpan={3} className="py-1 px-3 text-[10px] text-zinc-500 text-center font-sans">
                        + {rows.length - 3} more records sorted by Date and Subject...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filename Preview */}
        <div className="text-[11px] text-zinc-500 font-mono truncate">
          File: <span className="text-zinc-300">{targetFilename}</span>
        </div>

        {/* Success Feedback */}
        {successFilename && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">
              Export generated: <strong className="text-white">{successFilename}</strong>
            </span>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={handleExport}
              className="text-[11px] underline hover:text-white font-semibold shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl border border-white/[0.08] hover:bg-white/[0.04] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || records.length === 0}
            className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
              selectedFormat === "xlsx"
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25"
                : "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/25"
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating {selectedFormat === "xlsx" ? "Excel" : "CSV"}...</span>
              </>
            ) : successFilename ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Downloaded</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download {selectedFormat === "xlsx" ? "Excel (.xlsx)" : "CSV (.csv)"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
