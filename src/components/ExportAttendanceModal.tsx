"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AttendanceRecord, UniversityTimetable } from "@/types";
import {
  exportAttendanceMatrixToXLSX,
  exportAttendanceMatrixToCSV,
  prepareAttendanceMatrixData,
  generateMatrixFilename,
  formatDateSlash,
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
  CheckSquare,
  Square,
  Layers,
  ChevronRight,
} from "lucide-react";

export interface ExportAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  timetable?: UniversityTimetable | null;
  studentName?: string;
}

export type ExportFormat = "xlsx" | "csv";

export default function ExportAttendanceModal({
  isOpen,
  onClose,
  records,
  timetable,
  studentName,
}: ExportAttendanceModalProps) {
  // Extract all unique subjects present in student records
  const availableSubjects = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number }>();
    for (const r of records) {
      const code = (r.subjectCode || "UNKNOWN").trim().toUpperCase();
      const name = r.subjectName || code;
      if (!map.has(code)) {
        map.set(code, { code, name, count: 0 });
      }
      map.get(code)!.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [records]);

  // Extract min and max dates across all records
  const { minDateAvailable, maxDateAvailable } = useMemo(() => {
    const dates = records
      .map((r) => (r.date ? r.date.split("T")[0] : ""))
      .filter(Boolean)
      .sort();
    return {
      minDateAvailable: dates[0] || "",
      maxDateAvailable: dates[dates.length - 1] || "",
    };
  }, [records]);

  // State
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("xlsx");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successFilename, setSuccessFilename] = useState<string | null>(null);

  // Initialize filters when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessFilename(null);
      setIsExporting(false);
      // Default: full history range
      setStartDate(minDateAvailable);
      setEndDate(maxDateAvailable);
      // Default: select all subjects
      setSelectedSubjects(availableSubjects.map((s) => s.code));
    }
  }, [isOpen, minDateAvailable, maxDateAvailable, availableSubjects]);

  // Escape key handler
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

  // Validation
  const dateValidationError = useMemo(() => {
    if (startDate && endDate && startDate > endDate) {
      return "Start date cannot be after end date.";
    }
    return null;
  }, [startDate, endDate]);

  // Prepare matrix data based on current selections
  const matrixResult = useMemo(() => {
    if (dateValidationError || selectedSubjects.length === 0) {
      return {
        matrixRows: [],
        datesIncluded: [],
        unmappedRecords: [],
        totalRecordsMatched: 0,
        presentCount: 0,
        absentCount: 0,
      };
    }
    return prepareAttendanceMatrixData(records, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      selectedSubjectCodes: selectedSubjects,
      timetable,
    });
  }, [records, startDate, endDate, selectedSubjects, timetable, dateValidationError]);

  const { matrixRows, datesIncluded, totalRecordsMatched, presentCount, absentCount } =
    matrixResult;

  const targetFilename = useMemo(() => {
    return generateMatrixFilename(datesIncluded, selectedFormat);
  }, [datesIncluded, selectedFormat]);

  if (!isOpen) return null;

  // Preset Date Handlers
  const handlePresetAll = () => {
    setStartDate(minDateAvailable);
    setEndDate(maxDateAvailable);
  };

  const handlePresetLast30Days = () => {
    const end = maxDateAvailable || new Date().toISOString().slice(0, 10);
    const d = new Date(end);
    d.setDate(d.getDate() - 30);
    const start = d.toISOString().slice(0, 10);
    setStartDate(start < minDateAvailable ? minDateAvailable : start);
    setEndDate(end);
  };

  const handlePresetLast7Days = () => {
    const end = maxDateAvailable || new Date().toISOString().slice(0, 10);
    const d = new Date(end);
    d.setDate(d.getDate() - 7);
    const start = d.toISOString().slice(0, 10);
    setStartDate(start < minDateAvailable ? minDateAvailable : start);
    setEndDate(end);
  };

  // Subject Selection Handlers
  const handleToggleSubject = (code: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSelectAllSubjects = () => {
    setSelectedSubjects(availableSubjects.map((s) => s.code));
  };

  const handleClearAllSubjects = () => {
    setSelectedSubjects([]);
  };

  const handleExport = async () => {
    if (dateValidationError) {
      setErrorMessage(dateValidationError);
      return;
    }

    if (selectedSubjects.length === 0) {
      setErrorMessage("Please select at least one subject to include in the export.");
      return;
    }

    if (matrixRows.length === 0) {
      setErrorMessage(
        "No attendance records match the selected date range and subject filter."
      );
      return;
    }

    try {
      setIsExporting(true);
      setErrorMessage(null);

      let filename = "";
      const filterOpts = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        selectedSubjectCodes: selectedSubjects,
        timetable,
      };

      if (selectedFormat === "xlsx") {
        filename = await exportAttendanceMatrixToXLSX(records, filterOpts);
      } else {
        filename = exportAttendanceMatrixToCSV(records, filterOpts);
      }

      setSuccessFilename(filename);

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to generate attendance matrix. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const previewRow = matrixRows[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="matrix-export-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
    >
      <div className="futuristic-card w-full max-w-2xl p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-2xl space-y-5 text-left relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isExporting}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-xl icon-btn-glossy disabled:opacity-40 cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 pr-8">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" />
            <span>8-Period Attendance Matrix</span>
          </div>
          <h2
            id="matrix-export-title"
            className="text-lg sm:text-xl font-black text-white tracking-tight"
          >
            Export Attendance Sheet
          </h2>
          <p className="text-xs text-zinc-400">
            Generate an official 9-column schedule sheet (Date + Period 1–8) with custom date and subject filtering.
          </p>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Date Range Filter */}
          <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Date Range
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={handlePresetAll}
                  className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={handlePresetLast30Days}
                  className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
                >
                  30 Days
                </button>
                <button
                  type="button"
                  onClick={handlePresetLast7Days}
                  className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
                >
                  7 Days
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  min={minDateAvailable}
                  max={maxDateAvailable}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-black/40 border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={minDateAvailable}
                  max={maxDateAvailable}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-black/40 border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            {dateValidationError && (
              <p className="text-[11px] text-rose-400 font-semibold">{dateValidationError}</p>
            )}
          </div>

          {/* 2. Subject Multi-Select Filter */}
          <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                Subjects ({selectedSubjects.length}/{availableSubjects.length})
              </span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectAllSubjects}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Select All
                </button>
                <span className="text-zinc-600">&bull;</span>
                <button
                  type="button"
                  onClick={handleClearAllSubjects}
                  className="text-zinc-400 hover:text-zinc-200 font-semibold"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {availableSubjects.map((subj) => {
                const isSelected = selectedSubjects.includes(subj.code);
                return (
                  <button
                    key={subj.code}
                    type="button"
                    onClick={() => handleToggleSubject(subj.code)}
                    className={`w-full px-2.5 py-1 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-indigo-500/15 text-white border border-indigo-500/30 font-medium"
                        : "bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      )}
                      <span className="truncate">{subj.code} - {subj.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono ml-2 shrink-0">
                      {subj.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Format Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Excel Format */}
          <button
            type="button"
            onClick={() => setSelectedFormat("xlsx")}
            disabled={isExporting}
            className={`interactive-tile p-3.5 rounded-2xl border text-left transition-all relative flex items-center gap-3.5 cursor-pointer ${
              selectedFormat === "xlsx"
                ? "bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                : "bg-white/[0.02] border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04]"
            }`}
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Excel Workbook</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">.xlsx</span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                Red-highlighted absent cells, frozen headers, autofilters.
              </p>
            </div>
          </button>

          {/* CSV Format */}
          <button
            type="button"
            onClick={() => setSelectedFormat("csv")}
            disabled={isExporting}
            className={`interactive-tile p-3.5 rounded-2xl border text-left transition-all relative flex items-center gap-3.5 cursor-pointer ${
              selectedFormat === "csv"
                ? "bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                : "bg-white/[0.02] border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04]"
            }`}
          >
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">CSV Plaintext</span>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">.csv</span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                Universal 9-column UTF-8 CSV table with RFC 4180 escaping.
              </p>
            </div>
          </button>
        </div>

        {/* Matrix Scope & Live Structure Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>9-Column Matrix Structure</span>
              <span className="text-zinc-500">&bull;</span>
              <span className="text-zinc-400 font-normal">
                {matrixRows.length} {matrixRows.length === 1 ? "day" : "days"} ({totalRecordsMatched} classes: {presentCount} Present, {absentCount} Absent)
              </span>
            </span>
            <span className="font-mono text-[10px] text-zinc-500">
              {targetFilename}
            </span>
          </div>

          <div className="bg-black/50 border border-white/[0.06] rounded-2xl overflow-x-auto text-[10px]">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-zinc-400 bg-white/[0.02]">
                  <th className="py-1.5 px-2 text-left font-semibold">Date</th>
                  <th className="py-1.5 px-2 font-semibold">P1</th>
                  <th className="py-1.5 px-2 font-semibold">P2</th>
                  <th className="py-1.5 px-2 font-semibold">P3</th>
                  <th className="py-1.5 px-2 font-semibold">P4</th>
                  <th className="py-1.5 px-2 font-semibold">P5</th>
                  <th className="py-1.5 px-2 font-semibold">P6</th>
                  <th className="py-1.5 px-2 font-semibold">P7</th>
                  <th className="py-1.5 px-2 font-semibold">P8</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono">
                {previewRow ? (
                  <tr>
                    <td className="py-1.5 px-2 text-left font-bold text-zinc-300">
                      {previewRow.date}
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((pNum) => {
                      const val = (previewRow as any)[`period${pNum}`];
                      const isAbsent = previewRow.hasAbsent[pNum];
                      return (
                        <td
                          key={pNum}
                          className={`py-1.5 px-1.5 whitespace-nowrap ${
                            !val
                              ? "text-zinc-700"
                              : isAbsent
                              ? "bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 rounded"
                              : "text-emerald-300"
                          }`}
                        >
                          {val || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={9} className="py-4 text-center text-zinc-500 font-sans">
                      No attendance classes match the active date and subject filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Success Alert */}
        {successFilename && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">
              Matrix successfully downloaded: <strong className="text-white">{successFilename}</strong>
            </span>
          </div>
        )}

        {/* Error Alert */}
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
            className="glossy-btn glossy-btn-secondary px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={
              isExporting ||
              Boolean(dateValidationError) ||
              selectedSubjects.length === 0 ||
              matrixRows.length === 0
            }
            className={`glossy-btn ${
              selectedFormat === "xlsx" ? "glossy-btn-emerald" : "glossy-btn-cyan"
            } shine-sweep px-5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting Matrix...</span>
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
