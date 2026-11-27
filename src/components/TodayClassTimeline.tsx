"use client";

import React from "react";
import { TimetableSlot, AttendanceRecord } from "@/types";
import { Check, X, Clock, Calendar, Sparkles } from "lucide-react";

interface TodayClassTimelineProps {
  slots: TimetableSlot[];
  records: AttendanceRecord[];
  todayStr: string;
  dayName: string;
  onStatusChange: (slot: TimetableSlot, status: "PRESENT" | "ABSENT" | "CANCELLED") => void;
  onMarkAll?: (status: "PRESENT" | "ABSENT" | "CANCELLED") => void;
}

// MMMUT Period Timing Map
const PERIOD_TIMINGS: Record<number, { start: string; end: string; startMin: number; endMin: number }> = {
  1: { start: "09:10", end: "10:00", startMin: 9 * 60 + 10, endMin: 10 * 60 },
  2: { start: "10:00", end: "10:50", startMin: 10 * 60, endMin: 10 * 60 + 50 },
  3: { start: "10:50", end: "11:40", startMin: 10 * 60 + 50, endMin: 11 * 60 + 40 },
  4: { start: "11:40", end: "12:30", startMin: 11 * 60 + 40, endMin: 12 * 60 + 30 },
  5: { start: "14:00", end: "14:45", startMin: 14 * 60, endMin: 14 * 60 + 45 },
  6: { start: "14:45", end: "15:30", startMin: 14 * 60 + 45, endMin: 15 * 60 + 30 },
  7: { start: "15:30", end: "16:15", startMin: 15 * 60 + 30, endMin: 16 * 60 + 15 },
  8: { start: "16:15", end: "17:00", startMin: 16 * 60 + 15, endMin: 17 * 60 },
};

export default function TodayClassTimeline({
  slots,
  records,
  todayStr,
  dayName,
  onStatusChange,
  onMarkAll,
}: TodayClassTimelineProps) {
  // Determine current time in minutes from midnight for live time-state classification
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find next upcoming or ongoing class
  let nextSlotId: string | null = null;
  let ongoingSlotId: string | null = null;

  for (const slot of slots) {
    const timing = PERIOD_TIMINGS[slot.period];
    if (timing) {
      if (currentMinutes >= timing.startMin && currentMinutes <= timing.endMin) {
        ongoingSlotId = slot.occurrenceId || `${slot.period}-${slot.subjectCode}`;
        break;
      }
      if (currentMinutes < timing.startMin && !nextSlotId) {
        nextSlotId = slot.occurrenceId || `${slot.period}-${slot.subjectCode}`;
      }
    }
  }

  if (slots.length === 0) {
    return (
      <div className="futuristic-card rounded-2xl p-8 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 text-zinc-500 mx-auto flex items-center justify-center">
          <Calendar className="w-5 h-5" />
        </div>
        <div className="text-sm font-semibold text-zinc-300">
          No classes scheduled for today ({dayName})
        </div>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Take time to study or work on projects. Official university timetable resumes on the next academic working day.
        </p>
      </div>
    );
  }

  return (
    <div className="futuristic-card rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/[0.06] gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
          <h2 className="text-sm font-bold tracking-tight text-white uppercase tracking-wider">
            Today&apos;s Schedule &bull; {dayName}
          </h2>
          <span className="text-xs font-mono text-zinc-500">
            ({slots.length} {slots.length === 1 ? "class" : "classes"})
          </span>
        </div>

        {/* Quick Batch Actions */}
        {onMarkAll && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => onMarkAll("PRESENT")}
              className="glossy-btn glossy-btn-emerald shine-sweep px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" /> All Present
            </button>
            <button
              onClick={() => onMarkAll("ABSENT")}
              className="glossy-btn glossy-btn-rose shine-sweep px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" /> All Absent
            </button>
          </div>
        )}
      </div>

      {/* Minimal Class Timeline List */}
      <div className="space-y-2">
        {slots.map((slot) => {
          const slotKey = slot.occurrenceId || `${slot.period}-${slot.subjectCode}`;
          const isOngoing = ongoingSlotId === slotKey;
          const isNext = nextSlotId === slotKey && !ongoingSlotId;

          const record = records.find((r) => {
            if (slot.occurrenceId && r.occurrenceId) {
              return r.occurrenceId === slot.occurrenceId;
            }
            return r.period === slot.period && r.subjectCode === slot.subjectCode;
          });

          const status = record?.status || "PENDING";
          const timing = PERIOD_TIMINGS[slot.period];

          return (
            <div
              key={slotKey}
              className={`interactive-tile p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isOngoing
                  ? "bg-indigo-950/30 border-indigo-500/40 shadow-[0_0_24px_rgba(99,102,241,0.2)]"
                  : isNext
                  ? "bg-cyan-950/20 border-cyan-500/30 shadow-[0_0_18px_rgba(6,182,212,0.15)]"
                  : status === "PRESENT"
                  ? "bg-emerald-950/15 border-emerald-500/25"
                  : status === "ABSENT"
                  ? "bg-rose-950/15 border-rose-500/25"
                  : status === "CANCELLED"
                  ? "bg-zinc-900/40 border-white/5 opacity-60"
                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/15"
              }`}
            >
              {/* Left Column: Period Badge + Subject Info */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-mono font-bold text-xs shrink-0 ${
                    isOngoing
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : isNext
                      ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                      : "bg-zinc-900 border border-white/10 text-zinc-300"
                  }`}
                >
                  <span>P{slot.period}</span>
                  {timing && (
                    <span className="text-[8px] font-normal opacity-75">
                      {timing.start.split(":")[0]}:{timing.start.split(":")[1]}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-zinc-200">
                      {slot.subjectCode}
                    </span>

                    {/* Time State Tag */}
                    {isOngoing && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        ONGOING
                      </span>
                    )}
                    {isNext && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        NEXT UP
                      </span>
                    )}

                    {slot.isOneTime && (
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        EXTRA
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-medium px-2 py-0.2 rounded-full ${
                        slot.category === "Lab"
                          ? "bg-teal-950/80 text-teal-300 border border-teal-500/20"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}
                    >
                      {slot.category}
                    </span>

                    <span className="text-[11px] text-zinc-400 font-mono">
                      {slot.room || "Room TBA"}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300 font-medium line-clamp-1 mt-0.5">
                    {slot.subjectName}
                  </div>
                </div>
              </div>

              {/* Right Column: Attendance Action Buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onStatusChange(slot, "PRESENT")}
                  className={`glossy-btn px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    status === "PRESENT"
                      ? "glossy-btn-emerald shine-sweep"
                      : "glossy-btn-secondary text-zinc-400 hover:text-emerald-300 hover:border-emerald-500/40"
                  }`}
                  aria-label={`Mark period ${slot.period} present`}
                >
                  <Check className="w-3.5 h-3.5" /> Present
                </button>

                <button
                  type="button"
                  onClick={() => onStatusChange(slot, "ABSENT")}
                  className={`glossy-btn px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    status === "ABSENT"
                      ? "glossy-btn-rose shine-sweep"
                      : "glossy-btn-secondary text-zinc-400 hover:text-rose-300 hover:border-rose-500/40"
                  }`}
                  aria-label={`Mark period ${slot.period} absent`}
                >
                  <X className="w-3.5 h-3.5" /> Absent
                </button>

                <button
                  type="button"
                  onClick={() => onStatusChange(slot, "CANCELLED")}
                  className={`glossy-btn glossy-btn-secondary px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                    status === "CANCELLED"
                      ? "border-zinc-500 text-white bg-zinc-700/80"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  title="Mark period as cancelled"
                  aria-label={`Mark period ${slot.period} cancelled`}
                >
                  Cancelled
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
