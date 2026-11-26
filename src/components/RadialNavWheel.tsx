"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Calendar,
  Calculator,
  Sparkles,
  History,
  Vote,
  AlertTriangle,
  Bell,
  X,
  Compass,
} from "lucide-react";

export interface RadialNavNode {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentColor: string;
  tagline: string;
}

const NAV_NODES: RadialNavNode[] = [
  {
    id: "attendance",
    label: "Mark Attendance",
    href: "/mark-attendance",
    icon: CheckCircle2,
    accentColor: "#10b981", // emerald
    tagline: "Daily period logging",
  },
  {
    id: "timetable",
    label: "My Timetable",
    href: "/timetable",
    icon: Calendar,
    accentColor: "#6366f1", // indigo
    tagline: "Weekly lecture grid",
  },
  {
    id: "calculator",
    label: "Bunk Calculator",
    href: "/calculator",
    icon: Calculator,
    accentColor: "#06b6d4", // cyan
    tagline: "Safe absences & recovery",
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/analytics",
    icon: Sparkles,
    accentColor: "#8b5cf6", // violet
    tagline: "Visual trends & charts",
  },
  {
    id: "history",
    label: "Audit History",
    href: "/history",
    icon: History,
    accentColor: "#3b82f6", // blue
    tagline: "Past records & export",
  },
  {
    id: "polls",
    label: "Class Polls",
    href: "/polls",
    icon: Vote,
    accentColor: "#ec4899", // pink
    tagline: "Class votes & consensus",
  },
  {
    id: "cancellations",
    label: "Mass Bunk",
    href: "/cancellations",
    icon: AlertTriangle,
    accentColor: "#f59e0b", // amber
    tagline: "Leave & cancelled periods",
  },
  {
    id: "notifications",
    label: "Web Push",
    href: "/notifications",
    icon: Bell,
    accentColor: "#14b8a6", // teal
    tagline: "Live class start alerts",
  },
];

interface RadialNavWheelProps {
  /** Optional custom trigger mode */
  variant?: "floating" | "inline";
}

export default function RadialNavWheel({ variant = "floating" }: RadialNavWheelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<RadialNavNode | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile screen for dynamic radius adjustment
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Keyboard accessibility: Escape closes wheel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Click outside closes wheel
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Orbital radius based on viewport
  const radius = isMobile ? 116 : 148;

  const toggleWheel = () => {
    setIsOpen((prev) => !prev);
    setHoveredNode(null);
  };

  const handleNodeClick = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* Dimmed backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Wheel Container */}
      <div
        ref={containerRef}
        className={`z-50 select-none ${
          variant === "floating"
            ? "fixed bottom-6 right-6 sm:bottom-8 sm:right-8"
            : "relative inline-flex items-center justify-center"
        }`}
        role="navigation"
        aria-label="Interactive Radial Navigation"
      >
        {/* Expanded Orbital Canvas */}
        <div
          className={`absolute flex items-center justify-center pointer-events-none transition-all duration-400 ease-out ${
            isOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-75 pointer-events-none"
          }`}
          style={{
            // On mobile or desktop, keep centered on trigger or center of screen when modal
            width: radius * 2 + 120,
            height: radius * 2 + 120,
            top: `calc(50% - ${radius + 60}px)`,
            left: `calc(50% - ${radius + 60}px)`,
          }}
        >
          {/* Subtle Outer Orbital Track Line */}
          <div
            className="absolute rounded-full border border-white/[0.07] animate-slow-orbit pointer-events-none"
            style={{
              width: radius * 2 + 40,
              height: radius * 2 + 40,
            }}
          />

          {/* Primary Orbital Track Line */}
          <div
            className="absolute rounded-full border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)] pointer-events-none"
            style={{
              width: radius * 2,
              height: radius * 2,
            }}
          />

          {/* Secondary Inner Guideline */}
          <div
            className="absolute rounded-full border border-cyan-500/10 pointer-events-none"
            style={{
              width: radius * 1.3,
              height: radius * 1.3,
            }}
          />

          {/* Center Info HUD Pill (displayed on node hover) */}
          {hoveredNode && (
            <div
              className="absolute pointer-events-none text-center px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-white/10 shadow-xl transition-all duration-200"
              style={{
                transform: "translateY(-76px)",
              }}
            >
              <div
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: hoveredNode.accentColor }}
              >
                {hoveredNode.label}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                {hoveredNode.tagline}
              </div>
            </div>
          )}

          {/* Destination Nodes */}
          {NAV_NODES.map((node, index) => {
            // Distribute 8 nodes evenly around 360 deg, starting from top (-90 deg)
            const angleDeg = -90 + index * (360 / NAV_NODES.length);
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = Math.round(radius * Math.cos(angleRad));
            const y = Math.round(radius * Math.sin(angleRad));
            const isActive = pathname === node.href;
            const IconComponent = node.icon;

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => handleNodeClick(node.href)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                className={`group absolute w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-240 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-b from-zinc-700/90 to-zinc-800/90 border-2 shadow-xl scale-110"
                    : "bg-gradient-to-b from-[#13141f]/95 to-[#0b0c12]/95 hover:from-zinc-800/90 hover:to-zinc-900/90 border border-white/10 hover:border-white/30 hover:scale-110 active:scale-95"
                }`}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  borderColor: isActive ? node.accentColor : undefined,
                  boxShadow: isActive
                    ? `0 0 24px -2px ${node.accentColor}66, inset 0 1px 0 0 rgba(255, 255, 255, 0.25)`
                    : `0 4px 16px -2px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)`,
                }}
                title={node.label}
                aria-label={node.label}
              >
                <IconComponent
                  className="w-5 h-5 transition-all duration-200 group-hover:scale-110 group-hover:brightness-125"
                  style={{
                    color: isActive ? node.accentColor : "#d4d4d8",
                  }}
                />

                {/* Micro Label pill beneath or above node */}
                <span
                  className="absolute -bottom-5 sm:-bottom-6 whitespace-nowrap text-[9px] sm:text-[10px] font-medium tracking-tight text-zinc-300 px-1.5 py-0.5 rounded-md bg-black/75 border border-white/10 opacity-80 group-hover:opacity-100 transition-opacity shadow-sm"
                  style={{
                    color: isActive ? node.accentColor : undefined,
                  }}
                >
                  {node.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Central Core Orb Trigger */}
        <button
          type="button"
          onClick={toggleWheel}
          className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-240 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer shadow-xl ${
            isOpen
              ? "bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/20 shadow-2xl scale-105 active:scale-95"
              : "bg-gradient-to-tr from-indigo-950 via-zinc-900 to-zinc-950 border border-indigo-500/30 animate-orb-breathe hover:scale-106 active:scale-95"
          }`}
          style={{
            boxShadow: isOpen
              ? "0 0 28px 2px rgba(99, 102, 241, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.3)"
              : undefined,
          }}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close Navigation Wheel" : "Open Radial Navigation Wheel"}
        >
          {/* Subtle Outer Hairline Pulse Ring */}
          {!isOpen && (
            <span
              className="absolute inset-0 rounded-full border border-indigo-400/20 animate-ping opacity-40 pointer-events-none"
              style={{ animationDuration: "3s" }}
            />
          )}

          {/* Central Icon Switch */}
          {isOpen ? (
            <X className="w-6 h-6 text-zinc-300 transition-transform duration-200 rotate-90 hover:rotate-0" />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <Compass className="w-6 h-6 text-indigo-400 transition-transform group-hover:rotate-45" />
              <span className="text-[8px] font-bold text-zinc-400 font-mono tracking-tighter mt-0.5">
                MENU
              </span>
            </div>
          )}
        </button>
      </div>
    </>
  );
}
