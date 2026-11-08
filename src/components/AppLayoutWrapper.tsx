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
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-zinc-700 dark:text-zinc-300">AttendX</span> &bull; Madan Mohan Malaviya University of Technology, Gorakhpur
          </div>
          <div>
            Built for First Year Engineering &bull; 75% University Minimum Attendance Rule Enforced
          </div>
        </div>
      </footer>
    </>
  );
}
