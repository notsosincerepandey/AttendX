"use client";

import React, { useState, useEffect } from "react";
import { StudentProfile } from "@/types";
import { UNIVERSITY_DATABASE } from "@/data/extractedTimetables";
import { saveStoredProfile } from "@/lib/storage";
import { X, Check, School, BookOpen, Users, Calendar, AlertCircle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: StudentProfile;
  onProfileUpdated: (updated: StudentProfile) => void;
}

export default function StudentProfileModal({
  isOpen,
  onClose,
  currentProfile,
  onProfileUpdated,
}: Props) {
  const [degree, setDegree] = useState(currentProfile.degree);
  const [branchCode, setBranchCode] = useState(currentProfile.branchCode);
  const [section, setSection] = useState(currentProfile.section);
  const [batch, setBatch] = useState(currentProfile.batch);
  const [session, setSession] = useState(currentProfile.academicSession);
  const [fullName, setFullName] = useState(currentProfile.fullName);
  const [email, setEmail] = useState(currentProfile.email);
  const [threshold, setThreshold] = useState(currentProfile.attendanceThreshold);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Available timetables based on selections
  const matchingTimetables = UNIVERSITY_DATABASE.timetables.filter(
    (t) => t.branchCode === branchCode
  );

  const availableSections = Array.from(
    new Set(matchingTimetables.map((t) => t.section))
  );

  const selectedTimetable = UNIVERSITY_DATABASE.timetables.find(
    (t) => t.branchCode === branchCode && t.section === section
  ) || matchingTimetables[0];

  const availableBatches = selectedTimetable?.batches || ["P1", "P2"];

  const isAdmin = currentProfile.role === "admin";

  const handleSave = () => {
    if (!selectedTimetable) return;

    // Ordinary students cannot alter branch, section, batch, degree or role
    const updatedProfile: StudentProfile = {
      ...currentProfile,
      fullName: fullName.trim() || currentProfile.fullName,
      email: email.trim() || currentProfile.email,
      degree: isAdmin ? selectedTimetable.degree : currentProfile.degree,
      branch: isAdmin ? selectedTimetable.branch : currentProfile.branch,
      branchCode: isAdmin ? selectedTimetable.branchCode : currentProfile.branchCode,
      section: isAdmin ? selectedTimetable.section : currentProfile.section,
      batch: isAdmin
        ? (availableBatches.includes(batch) ? batch : availableBatches[0])
        : currentProfile.batch,
      academicSession: isAdmin ? selectedTimetable.session : currentProfile.academicSession,
      semester: isAdmin ? selectedTimetable.semester : currentProfile.semester,
      attendanceThreshold: Number(threshold) || 75.0,
      activeTimetableId: isAdmin ? selectedTimetable.id : currentProfile.activeTimetableId,
      isPersonalized: false,
    };

    saveStoredProfile(updatedProfile);

    onProfileUpdated(updatedProfile);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-xl w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
            <School className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Student Profile & Timetable Mapping
            </h2>
            <p className="text-xs text-zinc-500">
              Select your official MMMUT First Year branch, section & practical batch
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                Student Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
              University
            </label>
            <div className="px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium">
              Madan Mohan Malaviya University of Technology, Gorakhpur (MMMUT)
            </div>
          </div>

          {!isAdmin && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Official academic enrollment (Branch, Section, Batch) can only be altered by university administrators.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                Branch / Program {!isAdmin && <span className="text-zinc-400 font-normal">(Locked)</span>}
              </label>
              <select
                disabled={!isAdmin}
                value={branchCode}
                onChange={(e) => {
                  setBranchCode(e.target.value);
                  const matched = UNIVERSITY_DATABASE.timetables.filter(
                    (t) => t.branchCode === e.target.value
                  );
                  if (matched.length > 0) {
                    setSection(matched[0].section);
                    setBatch(matched[0].batches[0]);
                  }
                }}
                className={`w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${!isAdmin ? "opacity-60 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900" : ""}`}
              >
                <option value="IT">Information Technology (B.Tech)</option>
                <option value="CSE">Computer Science & Engineering (B.Tech)</option>
                <option value="CE">Civil Engineering (B.Tech)</option>
                <option value="ME">Mechanical Engineering (B.Tech)</option>
                <option value="EE">Electrical Engineering (B.Tech)</option>
                <option value="ECE">Electronics & Communication (B.Tech)</option>
                <option value="CHE">Chemical Engineering (B.Tech)</option>
                <option value="ECE(IOT)">Electronics & Comm (IoT) (B.Tech)</option>
                <option value="BBA">Business Administration (BBA)</option>
                <option value="PHARM">Pharmacy (B.Pharm)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                Section {!isAdmin && <span className="text-zinc-400 font-normal">(Locked)</span>}
              </label>
              <select
                disabled={!isAdmin}
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${!isAdmin ? "opacity-60 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900" : ""}`}
              >
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                Practical Batch {!isAdmin && <span className="text-zinc-400 font-normal">(Locked)</span>}
              </label>
              <select
                disabled={!isAdmin}
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${!isAdmin ? "opacity-60 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900" : ""}`}
              >
                {availableBatches.map((b) => (
                  <option key={b} value={b}>
                    Batch {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                Attendance Threshold (%)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {selectedTimetable && (
            <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 text-xs space-y-1">
              <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                <span>Timetable Auto-Mapping:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  PDF Page {selectedTimetable.pageNumber} Verified
                </span>
              </div>
              <div className="text-zinc-600 dark:text-zinc-400">
                Classroom Room: <span className="font-mono font-medium">{selectedTimetable.room}</span> | Academic Session:{" "}
                <span className="font-medium">{selectedTimetable.session}</span> ({selectedTimetable.semester})
              </div>
              <div className="text-zinc-500">
                Loaded {selectedTimetable.subjects.length} subjects & {selectedTimetable.slots.length} weekly timetable slots.
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Apply & Load Timetable
          </button>
        </div>
      </div>
    </div>
  );
}
