"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, UserMinus, X, AlertCircle, ShieldAlert } from "lucide-react";
import { StudentDirectoryItem } from "@/types";
import { getSessionToken } from "@/lib/auth";

interface StudentRemovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: StudentDirectoryItem | null;
  bulkStudents?: StudentDirectoryItem[];
  onSuccess: () => void;
}

export default function StudentRemovalModal({
  isOpen,
  onClose,
  student,
  bulkStudents = [],
  onSuccess,
}: StudentRemovalModalProps) {
  const isBulk = bulkStudents.length > 0;
  const [removalType, setRemovalType] = useState<"deactivate" | "delete">("deactivate");
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetStudents = isBulk ? bulkStudents : student ? [student] : [];
  if (targetStudents.length === 0) return null;

  const handleConfirmAction = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const token = getSessionToken();
      let payload: any = {
        action: removalType,
        reason: reason.trim() || undefined,
      };

      if (isBulk) {
        payload.studentIds = targetStudents.map((s) => s.id);
      } else {
        payload.studentId = targetStudents[0].id;
      }

      const res = await fetch("/api/admin/students/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process removal.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while removing student account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDeleteDisabled =
    removalType === "delete" && confirmText.trim().toUpperCase() !== "PERMANENT DELETE";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                removalType === "delete"
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              }`}
            >
              {removalType === "delete" ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <UserMinus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {isBulk
                  ? `Remove ${targetStudents.length} Students`
                  : `Remove Student: ${targetStudents[0].fullName}`}
              </h3>
              <p className="text-xs text-zinc-500">
                Confirm account deactivation or deletion with audit safeguard.
              </p>
            </div>
          </div>
          <button
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Target Details Card */}
        {!isBulk ? (
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-100 dark:border-zinc-700/60 text-xs space-y-1.5">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Student Information
            </div>
            <div className="grid grid-cols-2 gap-2 font-medium">
              <div>
                <span className="text-zinc-400">Name:</span>{" "}
                <span className="font-bold text-zinc-900 dark:text-white">
                  {targetStudents[0].fullName}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">Roll No:</span>{" "}
                <span className="font-mono font-bold">{targetStudents[0].rollNumber || "—"}</span>
              </div>
              <div>
                <span className="text-zinc-400">Academic Year:</span>{" "}
                <span className="font-bold text-indigo-600">
                  {targetStudents[0].academicYear || "1st Year"}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">Branch & Section:</span>{" "}
                <span>
                  {targetStudents[0].branchCode} {targetStudents[0].section} ({targetStudents[0].batch})
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-100 dark:border-zinc-700/60 text-xs">
            <div className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              Selected Students ({targetStudents.length})
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[11px] text-zinc-500">
              {targetStudents.slice(0, 10).map((s) => (
                <div key={s.id}>
                  &bull; {s.fullName} ({s.rollNumber || "No Roll"} - {s.branchCode} {s.section})
                </div>
              ))}
              {targetStudents.length > 10 && (
                <div>...and {targetStudents.length - 10} more students</div>
              )}
            </div>
          </div>
        )}

        {/* Action Type Selector */}
        <div className="space-y-2 text-xs">
          <label className="font-bold block text-zinc-800 dark:text-zinc-200">
            Select Removal Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div
              onClick={() => setRemovalType("deactivate")}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                removalType === "deactivate"
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold"
                  : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5 mb-1">
                <UserMinus className="w-3.5 h-3.5 text-amber-600" /> Safe Deactivation (Recommended)
              </div>
              <p className="text-[10px] font-normal opacity-85 leading-relaxed">
                Revokes student login. Preserves historical attendance records and keeps statistics intact.
              </p>
            </div>

            <div
              onClick={() => setRemovalType("delete")}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                removalType === "delete"
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-bold"
                  : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5 mb-1">
                <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Permanent Deletion
              </div>
              <p className="text-[10px] font-normal opacity-85 leading-relaxed">
                Permanently wipes student profile and attendance records. Cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Reason / Confirmation */}
        <div className="space-y-2 text-xs">
          <label className="font-semibold block text-zinc-700 dark:text-zinc-300">
            Administrative Reason (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Transferred to another university or duplicate enrollment"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
          />

          {removalType === "delete" && (
            <div className="pt-2 space-y-1">
              <label className="font-bold text-rose-600 dark:text-rose-400 block text-[11px]">
                Type "PERMANENT DELETE" to confirm irreversible deletion:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="PERMANENT DELETE"
                className="w-full px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl font-mono text-rose-900 dark:text-rose-200"
              />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || isDeleteDisabled}
            onClick={handleConfirmAction}
            className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-40 ${
              removalType === "delete"
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30"
            }`}
          >
            {isSubmitting
              ? "Processing..."
              : removalType === "delete"
              ? "Confirm Permanent Deletion"
              : `Deactivate ${isBulk ? `${targetStudents.length} Students` : "Student"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
