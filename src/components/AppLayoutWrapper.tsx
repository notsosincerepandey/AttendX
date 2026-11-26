"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminPortal = pathname?.startsWith("/admin");

  if (isAdminPortal) {
    return <div className="min-h-screen w-full flex flex-col">{children}</div>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <footer className="border-t border-white/[0.06] bg-[#07070a]/60 backdrop-blur-md py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-zinc-300">AttendX</span> &bull; Madan Mohan Malaviya University of Technology, Gorakhpur
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            75% Statutory Minimum Attendance Enforced &bull; First Year Engineering
          </div>
        </div>
      </footer>
    </>
  );
}
