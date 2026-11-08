import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AttendX | Smart Attendance Management System - MMMUT Gorakhpur",
  description:
    "Student-managed attendance tracking, 75% cutoff calculation, multi-period laboratory units, and official university timetable extraction for Madan Mohan Malaviya University of Technology, Gorakhpur.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-indigo-500 selection:text-white">
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
      </body>
    </html>
  );
}
