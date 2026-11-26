"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle, AlertCircle, Sparkles } from "lucide-react";

interface AttendanceRingProps {
  percentage: number;
  attended: number;
  conducted: number;
  status: "safe" | "warning" | "danger";
  safeAbsences: number;
  recoveryNeeded: number;
  threshold?: number;
}

export default function AttendanceRing({
  percentage,
  attended,
  conducted,
  status,
  safeAbsences,
  recoveryNeeded,
  threshold = 75,
}: AttendanceRingProps) {
  const [animatedPct, setAnimatedPct] = useState(0);

  // SVG Geometry
  const size = 220;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // 75% statutory marker position
  const thresholdAngle = (threshold / 100) * 360 - 90; // degrees from top
  const thresholdRad = (thresholdAngle * Math.PI) / 180;
  const markerX = size / 2 + (radius + 2) * Math.cos(thresholdRad);
  const markerY = size / 2 + (radius + 2) * Math.sin(thresholdRad);

  useEffect(() => {
    // Smooth entrance progression
    if (conducted === 0) {
      setAnimatedPct(0);
      return;
    }
    const timer = setTimeout(() => {
      setAnimatedPct(Math.min(100, Math.max(0, percentage)));
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage, conducted]);

  // Color mapping based on university 75% rule
  const strokeColor =
    conducted === 0
      ? "#52525b" // zinc-600
      : status === "safe"
      ? "#10b981" // emerald
      : status === "warning"
      ? "#f59e0b" // amber
      : "#f43f5e"; // rose

  const glowShadow =
    conducted === 0
      ? "none"
      : status === "safe"
      ? "drop-shadow(0 0 12px rgba(16, 185, 129, 0.35))"
      : status === "warning"
      ? "drop-shadow(0 0 12px rgba(245, 158, 11, 0.35))"
      : "drop-shadow(0 0 12px rgba(244, 63, 94, 0.35))";

  const strokeDashoffset = circumference - (animatedPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative flex items-center justify-center">
        {/* SVG Circular Ring */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{ filter: glowShadow }}
          aria-hidden="true"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={strokeWidth}
          />

          {/* Animated Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* 75% Minimum Statutory Milestone Indicator */}
        <div
          className="absolute w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8] border border-black pointer-events-none"
          style={{
            left: `${markerX}px`,
            top: `${markerY}px`,
            transform: "translate(-50%, -50%)",
          }}
          title={`75% University Statutory Cutoff`}
        />

        {/* Center Readout HUD */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-0.5">
            Overall
          </span>

          <div className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
            {conducted === 0 ? "N/A" : `${percentage}%`}
          </div>

          <div className="mt-1">
            {conducted === 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                No classes held
              </span>
            ) : status === "safe" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> &ge;75% Safe
              </span>
            ) : status === "warning" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> Caution
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/30">
                <AlertCircle className="w-3 h-3 text-rose-400" /> Shortage
              </span>
            )}
          </div>

          <span className="text-[11px] text-zinc-400 mt-1 font-mono">
            {attended} / {conducted} units
          </span>
        </div>
      </div>

      {/* Strategic Bunk / Recovery Guidance Pill */}
      <div className="mt-4">
        {conducted === 0 ? (
          <p className="text-xs text-zinc-400">
            Attendance ledger active. Log today&apos;s lectures to initialize metrics.
          </p>
        ) : safeAbsences > 0 ? (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-emerald-950/60 to-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 font-medium shadow-sm hover:scale-[1.02] transition-transform">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <b>+{safeAbsences}</b> safe absences remaining above 75%
          </div>
        ) : recoveryNeeded > 0 ? (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-rose-950/60 to-rose-950/30 border border-rose-500/30 text-xs text-rose-300 font-medium shadow-sm hover:scale-[1.02] transition-transform">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Must attend next <b>{recoveryNeeded}</b> classes to restore 75%
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 text-xs text-zinc-300 font-medium shadow-sm hover:scale-[1.02] transition-transform">
            Precisely at 75% statutory boundary
          </div>
        )}
      </div>
    </div>
  );
}
