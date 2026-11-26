import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppLayoutWrapper from "@/components/AppLayoutWrapper";

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#07070a] text-zinc-100 font-sans selection:bg-indigo-500 selection:text-white relative">
        <div className="ambient-bg" aria-hidden="true" />
        <div className="relative z-10 flex-1 flex flex-col">
          <AppLayoutWrapper>{children}</AppLayoutWrapper>
        </div>
      </body>
    </html>
  );
}
