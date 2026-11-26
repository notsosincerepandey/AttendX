"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Trash2,
  Filter,
  Check,
  ChevronDown,
} from "lucide-react";
import {
  ParsedStudentRow,
  ImportPreviewSummary,
  VALID_BRANCHES,
  VALID_ACADEMIC_YEARS,
} from "@/lib/studentImportTypes";
import { getSessionToken } from "@/lib/auth";

interface BulkStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
}

export default function BulkStudentImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: BulkStudentImportModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [academicYear, setAcademicYear] = useState("1st Year");
  const [academicSession, setAcademicSession] = useState("2026-27");
  const [semester, setSemester] = useState("Semester I");

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewSummary | null>(null);
  const [previewFilter, setPreviewFilter] = useState<"ALL" | "VALID" | "DUPLICATES" | "INVALID">("ALL");
  const [importError, setImportError] = useState<string | null>(null);

  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    success: boolean;
    importedCount: number;
    failedCount: number;
    errors: { rollNumber: string; error: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAcademicYearChange = (year: string) => {
    setAcademicYear(year);
    if (year === "2nd Year") setSemester("Semester III");
    else if (year === "3rd Year") setSemester("Semester V");
    else if (year === "4th Year") setSemester("Semester VII");
    else setSemester("Semester I");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportError(null);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!selectedFile) {
      setImportError("Please select an Excel (.xlsx, .xls) or PDF (.pdf) file.");
      return;
    }

    setIsLoadingPreview(true);
    setImportError(null);

    try {
      const token = getSessionToken();
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("academicYear", academicYear);
      formData.append("session", academicSession);
      formData.append("semester", semester);

      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process import preview.");
      }

      setPreviewData(data.preview);
      setStep("preview");
    } catch (err: any) {
      setImportError(err.message || "Failed to parse uploaded file.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleToggleRowSkip = (rowId: string) => {
    if (!previewData) return;
    const updated = previewData.records.map((r) => {
      if (r.id === rowId) {
        return { ...r, isSkipped: !r.isSkipped };
      }
      return r;
    });

    const willAddCount = updated.filter((r) => r.status === "VALID" && !r.isSkipped).length;
    setPreviewData({
      ...previewData,
      records: updated,
      willAddCount,
    });
  };

  const handleUpdateRecordField = (rowId: string, field: keyof ParsedStudentRow, value: string) => {
    if (!previewData) return;
    const updated = previewData.records.map((r) => {
      if (r.id === rowId) {
        const copy: any = { ...r, [field]: value };
        // Clear errors if basic requirements are now satisfied
        if (copy.rollNumber && copy.branchCode) {
          copy.errors = copy.errors.filter((e: string) => !e.includes("Missing"));
          if (copy.errors.length === 0 && copy.status === "INVALID") {
            copy.status = "VALID";
            copy.isSkipped = false;
          }
        }
        return copy;
      }
      return r;
    });

    const willAddCount = updated.filter((r) => r.status === "VALID" && !r.isSkipped).length;
    setPreviewData({
      ...previewData,
      records: updated,
      willAddCount,
    });
  };

  const handleCommitImport = async () => {
    if (!previewData) return;

    const validRecords = previewData.records.filter((r) => r.status === "VALID" && !r.isSkipped);
    if (validRecords.length === 0) {
      setImportError("No valid records selected for import.");
      return;
    }

    setIsCommitting(true);
    setImportError(null);

    try {
      const token = getSessionToken();
      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: "commit",
          records: validRecords,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to commit student import.");
      }

      setCommitResult(data);
      setStep("done");
      onImportSuccess(data.importedCount);
    } catch (err: any) {
      setImportError(err.message || "Failed to import student accounts.");
    } finally {
      setIsCommitting(false);
    }
  };

  const filteredRecords = (previewData?.records || []).filter((r) => {
    if (previewFilter === "VALID") return r.status === "VALID";
    if (previewFilter === "DUPLICATES") return r.status === "DUPLICATE_IN_FILE" || r.status === "ALREADY_IN_DB";
    if (previewFilter === "INVALID") return r.status === "INVALID";
    return true;
  });

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCommitting) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-4xl w-full p-6 space-y-5 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Bulk Student Onboarding & Registry Import
              </h3>
              <p className="text-xs text-zinc-500">
                Upload student rosters via Excel (.xlsx, .xls) or PDF with automated duplicate detection.
              </p>
            </div>
          </div>
          <button
            disabled={isCommitting}
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {importError && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* STEP 1: FILE UPLOAD */}
        {step === "upload" && (
          <div className="space-y-5 overflow-y-auto pr-1">
            {/* Target Cohort Configuration */}
            <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                1. Target Cohort Configuration
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1 text-zinc-600 dark:text-zinc-400">
                    Academic Year
                  </label>
                  <select
                    value={academicYear}
                    onChange={(e) => handleAcademicYearChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                  >
                    {VALID_ACADEMIC_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-zinc-600 dark:text-zinc-400">
                    Academic Session
                  </label>
                  <input
                    type="text"
                    value={academicSession}
                    onChange={(e) => setAcademicSession(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                    placeholder="2026-27"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-zinc-600 dark:text-zinc-400">
                    Default Semester
                  </label>
                  <input
                    type="text"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                    placeholder="Semester I"
                  />
                </div>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-800/20 space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {selectedFile ? selectedFile.name : "Click or drag student roster file here"}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Supports Microsoft Excel (.xlsx, .xls) and selectable-text PDF (.pdf) documents.
                </p>
              </div>
              {selectedFile && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <Check className="w-3.5 h-3.5" /> File Selected ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {/* Format Instructions */}
            <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-indigo-600" /> Flexible Column Auto-Detection
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                AttendX automatically identifies columns matching <strong>Name</strong>, <strong>Roll Number</strong>,{" "}
                <strong>Enrollment Number</strong>, <strong>Branch</strong>, <strong>Section</strong>, and{" "}
                <strong>Batch</strong>. Duplicates and already-registered students will be flagged in the next step
                before committing.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedFile || isLoadingPreview}
                onClick={handleUploadAndPreview}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-50"
              >
                {isLoadingPreview ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Extracting Records...
                  </>
                ) : (
                  <>
                    Inspect & Preview Records <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & SELECTION */}
        {step === "preview" && previewData && (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            {/* Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs shrink-0">
              <div className="bg-zinc-100 dark:bg-zinc-800 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Total Detected</div>
                <div className="text-base font-black text-zinc-900 dark:text-white">
                  {previewData.totalDetected}
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl text-center border border-emerald-200 dark:border-emerald-800">
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold">Valid</div>
                <div className="text-base font-black text-emerald-700 dark:text-emerald-300">
                  {previewData.validCount}
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl text-center border border-amber-200 dark:border-amber-800">
                <div className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-bold">File Dupes</div>
                <div className="text-base font-black text-amber-700 dark:text-amber-300">
                  {previewData.duplicateCount}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl text-center border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] text-blue-700 dark:text-blue-300 uppercase font-bold">Already in DB</div>
                <div className="text-base font-black text-blue-700 dark:text-blue-300">
                  {previewData.existingCount}
                </div>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl text-center border border-rose-200 dark:border-rose-900/60">
                <div className="text-[10px] text-rose-700 dark:text-rose-300 uppercase font-bold">Invalid / Incomplete</div>
                <div className="text-base font-black text-rose-700 dark:text-rose-300">
                  {previewData.invalidCount}
                </div>
              </div>

              <div className="bg-indigo-600 text-white p-2.5 rounded-xl text-center shadow-xs">
                <div className="text-[10px] text-indigo-200 uppercase font-bold">Will Add</div>
                <div className="text-base font-black">{previewData.willAddCount}</div>
              </div>
            </div>

            {/* Filter Pill Tabs */}
            <div className="flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewFilter("ALL")}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                    previewFilter === "ALL"
                      ? "bg-zinc-800 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  All ({previewData.records.length})
                </button>
                <button
                  onClick={() => setPreviewFilter("VALID")}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                    previewFilter === "VALID"
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Valid Ready ({previewData.validCount})
                </button>
                <button
                  onClick={() => setPreviewFilter("DUPLICATES")}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                    previewFilter === "DUPLICATES"
                      ? "bg-amber-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Duplicates / Existing ({previewData.duplicateCount + previewData.existingCount})
                </button>
                <button
                  onClick={() => setPreviewFilter("INVALID")}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                    previewFilter === "INVALID"
                      ? "bg-rose-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Invalid ({previewData.invalidCount})
                </button>
              </div>

              <span className="text-[11px] text-zinc-400">
                Tip: Toggle checkbox to include/exclude specific rows.
              </span>
            </div>

            {/* Interactive Preview Table */}
            <div className="flex-1 overflow-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-800/80 sticky top-0 font-bold text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-2.5 w-10 text-center">Import</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Student Name</th>
                    <th className="p-2.5">Roll Number</th>
                    <th className="p-2.5">Enrollment</th>
                    <th className="p-2.5">Branch</th>
                    <th className="p-2.5">Section</th>
                    <th className="p-2.5">Batch</th>
                    <th className="p-2.5">Year</th>
                    <th className="p-2.5">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredRecords.map((row) => {
                    const isRowValid = row.status === "VALID";
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors ${
                          row.isSkipped ? "opacity-50 bg-zinc-50/50 dark:bg-zinc-900/40" : ""
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={!row.isSkipped && isRowValid}
                            disabled={!isRowValid}
                            onChange={() => handleToggleRowSkip(row.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          {row.status === "VALID" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Valid
                            </span>
                          ) : row.status === "ALREADY_IN_DB" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              In DB
                            </span>
                          ) : row.status === "DUPLICATE_IN_FILE" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Dupe
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              Invalid
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-bold">{row.fullName}</td>
                        <td className="p-2.5 font-mono font-bold">{row.rollNumber || "—"}</td>
                        <td className="p-2.5 font-mono text-zinc-500">{row.enrollmentNumber || "—"}</td>
                        <td className="p-2.5 font-semibold text-indigo-600 dark:text-indigo-400">
                          {row.branchCode}
                        </td>
                        <td className="p-2.5">{row.section}</td>
                        <td className="p-2.5 font-mono">{row.batch}</td>
                        <td className="p-2.5 text-zinc-500">{row.academicYear}</td>
                        <td className="p-2.5 text-rose-600 dark:text-rose-400 text-[11px]">
                          {row.errors.join(", ") || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Commit Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Back to File Selection
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">
                  Ready to add: <strong className="text-indigo-600">{previewData.willAddCount}</strong> students
                </span>
                <button
                  type="button"
                  disabled={previewData.willAddCount === 0 || isCommitting}
                  onClick={handleCommitImport}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-40"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating Accounts...
                    </>
                  ) : (
                    <>
                      Confirm & Create {previewData.willAddCount} Accounts
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: DONE SUMMARY */}
        {step === "done" && commitResult && (
          <div className="space-y-5 text-center py-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white">
                Student Onboarding Completed
              </h4>
              <p className="text-xs text-zinc-500 mt-1">
                Successfully created and linked {commitResult.importedCount} student accounts to Supabase.
              </p>
            </div>

            {commitResult.failedCount > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-left max-h-40 overflow-y-auto">
                <div className="font-bold text-amber-800 dark:text-amber-300 mb-1">
                  {commitResult.failedCount} records encountered errors:
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-zinc-600 dark:text-zinc-400">
                  {commitResult.errors.map((e, idx) => (
                    <li key={idx}>
                      Roll {e.rollNumber}: {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Done & Return to Student Registry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
