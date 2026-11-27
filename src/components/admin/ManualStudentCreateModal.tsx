"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  GraduationCap,
  Building,
  Layers,
  KeyRound,
  Check,
} from "lucide-react";
import { StudentDirectoryItem, CreateSingleStudentInput } from "@/types";
import { getAllBranches, getSectionsForBranch } from "@/data/extractedTimetables";
import { VALID_ACADEMIC_YEARS } from "@/lib/studentImportTypes";
import { getSessionToken } from "@/lib/auth";

interface ManualStudentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: StudentDirectoryItem) => void;
}

export default function ManualStudentCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: ManualStudentCreateModalProps) {
  // Form fields
  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [branchCode, setBranchCode] = useState("IT");
  const [academicYear, setAcademicYear] = useState("1st Year");
  const [semester, setSemester] = useState("Semester I");
  const [academicSession, setAcademicSession] = useState("2026-27");
  const [section, setSection] = useState("SEC-B");
  const [batch, setBatch] = useState("P1");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(true);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdStudent, setCreatedStudent] = useState<StudentDirectoryItem | null>(null);

  // Sync available sections when branch changes
  useEffect(() => {
    const validSections = getSectionsForBranch(branchCode);
    if (!validSections.includes(section)) {
      setSection(validSections[0] || "SEC-A");
    }
  }, [branchCode, section]);

  // Sync default semester when academic year changes
  const handleAcademicYearChange = (year: string) => {
    setAcademicYear(year);
    if (year === "2nd Year") setSemester("Semester III");
    else if (year === "3rd Year") setSemester("Semester V");
    else if (year === "4th Year") setSemester("Semester VII");
    else setSemester("Semester I");
  };

  // Auto-dismiss modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setFullName("");
    setRollNumber("");
    setEnrollmentNumber("");
    setEmail("");
    setFatherName("");
    setBranchCode("IT");
    setAcademicYear("1st Year");
    setSemester("Semester I");
    setAcademicSession("2026-27");
    setSection("SEC-B");
    setBatch("P1");
    setPassword("");
    setStatus("ACTIVE");
    setRequiresPasswordChange(true);
    setFieldErrors({});
    setServerError(null);
    setCreatedStudent(null);
  };

  // Quick preset for Demo Student account
  const handleFillDemoPreset = () => {
    setFullName("Aditya Verma (Demo Student)");
    setRollNumber("DEMO2026");
    setEnrollmentNumber("DEMO2026001");
    setEmail("demo.student@attendx.app");
    setFatherName("Mr. Verma");
    setBranchCode("IT");
    setAcademicYear("1st Year");
    setSemester("Semester I");
    setAcademicSession("2026-27");
    setSection("SEC-B");
    setBatch("P1");
    setPassword("Demo@AttendX2026");
    setStatus("ACTIVE");
    setRequiresPasswordChange(false);
    setFieldErrors({});
    setServerError(null);
  };

  const validateClient = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = "Full name is required (at least 2 characters).";
    }

    const trimmedRoll = rollNumber.trim().toUpperCase();
    if (!trimmedRoll) {
      errors.rollNumber = "Roll number is required.";
    } else if (!/^[A-Z0-9_-]+$/i.test(trimmedRoll)) {
      errors.rollNumber = "Roll number must be alphanumeric (e.g. 2026011045 or DEMO2026).";
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = "Please enter a valid email format.";
      }
    }

    if (password.trim() && password.trim().length < 6) {
      errors.password = "Custom password must be at least 6 characters long.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateClient()) return;

    setIsSubmitting(true);
    const token = getSessionToken();

    const payload: CreateSingleStudentInput = {
      fullName: fullName.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      enrollmentNumber: enrollmentNumber.trim() ? enrollmentNumber.trim().toUpperCase() : undefined,
      fatherName: fatherName.trim() || undefined,
      email: email.trim() ? email.trim().toLowerCase() : undefined,
      branchCode,
      academicYear,
      semester,
      academicSession,
      section,
      batch,
      password: password.trim() || undefined,
      status,
      requiresPasswordChange,
      isDemo: rollNumber.trim().toUpperCase().includes("DEMO") || email.trim().toLowerCase().includes("demo"),
    };

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success && data.student) {
        setCreatedStudent(data.student);
        onSuccess(data.student);
      } else {
        setServerError(data.error || "Failed to create student account.");
      }
    } catch {
      setServerError("Network error: Unable to reach student creation service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="futuristic-card rounded-3xl border border-white/10 max-w-2xl w-full p-6 sm:p-7 space-y-5 my-8 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Add Student Manually
              </h2>
              <p className="text-xs text-zinc-400">
                Provision a single student profile and linked authentication credentials.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!createdStudent && (
              <button
                type="button"
                onClick={handleFillDemoPreset}
                className="glossy-btn glossy-btn-secondary px-2.5 py-1 text-[11px] font-bold text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5"
                title="Fill with official demo student credentials for GitHub README testing"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Fill Demo Preset
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="icon-btn-glossy p-2 rounded-xl text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {createdStudent && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Student Account Created Successfully!</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-[11px]">
              <div>
                <span className="text-zinc-400 block text-[10px]">Name</span>
                <span className="text-white font-sans font-semibold">{createdStudent.fullName}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Roll Number</span>
                <span className="text-emerald-300 font-bold">{createdStudent.rollNumber}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Class</span>
                <span className="text-white">{createdStudent.branchCode} {createdStudent.section} ({createdStudent.batch})</span>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-zinc-400 block text-[10px]">Login Identifier</span>
                <span className="text-indigo-300">{createdStudent.rollNumber} or {createdStudent.email}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-400">
                The student directory and statistics have been refreshed.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="glossy-btn glossy-btn-emerald shine-sweep px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Another Student
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="glossy-btn glossy-btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Server Error Banner */}
        {serverError && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs font-semibold text-rose-300 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form Body */}
        {!createdStudent && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identity Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-zinc-300">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: "" });
                  }}
                  className={`w-full px-3 py-2 bg-zinc-900 border ${
                    fieldErrors.fullName ? "border-rose-500" : "border-white/10"
                  } rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500`}
                />
                {fieldErrors.fullName && (
                  <span className="text-[10px] text-rose-400 mt-0.5 block">{fieldErrors.fullName}</span>
                )}
              </div>

              <div>
                <label className="font-semibold block mb-1 text-zinc-300">
                  Roll Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026011045 or DEMO2026"
                  value={rollNumber}
                  onChange={(e) => {
                    setRollNumber(e.target.value);
                    if (fieldErrors.rollNumber) setFieldErrors({ ...fieldErrors, rollNumber: "" });
                  }}
                  className={`w-full px-3 py-2 bg-zinc-900 border ${
                    fieldErrors.rollNumber ? "border-rose-500" : "border-white/10"
                  } rounded-xl text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-indigo-500`}
                />
                {fieldErrors.rollNumber && (
                  <span className="text-[10px] text-rose-400 mt-0.5 block">{fieldErrors.rollNumber}</span>
                )}
              </div>

              <div>
                <label className="font-semibold block mb-1 text-zinc-300">
                  Enrollment Number <span className="text-zinc-500 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026CED0388"
                  value={enrollmentNumber}
                  onChange={(e) => setEnrollmentNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-zinc-300">
                  Email Address <span className="text-zinc-500 text-[10px]">(Optional custom alias)</span>
                </label>
                <input
                  type="email"
                  placeholder="Leave empty for auto university alias"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
                  }}
                  className={`w-full px-3 py-2 bg-zinc-900 border ${
                    fieldErrors.email ? "border-rose-500" : "border-white/10"
                  } rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500`}
                />
                {fieldErrors.email && (
                  <span className="text-[10px] text-rose-400 mt-0.5 block">{fieldErrors.email}</span>
                )}
              </div>
            </div>

            {/* Academic Classification Group */}
            <div className="pt-2 border-t border-white/[0.06]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1 text-zinc-300">
                    Branch <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    className="w-full px-2.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {getAllBranches().map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} ({b.name.split(" ")[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-zinc-300">Section</label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-2.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {getSectionsForBranch(branchCode).map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-zinc-300">Practical Batch</label>
                  <select
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full px-2.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="P1">Batch P1</option>
                    <option value="P2">Batch P2</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-zinc-300">Academic Year</label>
                  <select
                    value={academicYear}
                    onChange={(e) => handleAcademicYearChange(e.target.value)}
                    className="w-full px-2.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {VALID_ACADEMIC_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1 text-zinc-300">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-2.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {[
                      "Semester I",
                      "Semester II",
                      "Semester III",
                      "Semester IV",
                      "Semester V",
                      "Semester VI",
                      "Semester VII",
                      "Semester VIII",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-zinc-300">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="w-full px-2.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE (Can log in)</option>
                    <option value="INACTIVE">INACTIVE (Access blocked)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Security & Credentials Group */}
            <div className="pt-2 border-t border-white/[0.06] space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-zinc-300">
                  Initial Password <span className="text-zinc-500 text-[10px]">(Default: AttendX@2026)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter custom password or leave blank for default"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
                    }}
                    className={`w-full pl-3 pr-10 py-2 bg-zinc-900 border ${
                      fieldErrors.password ? "border-rose-500" : "border-white/10"
                    } rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="text-[10px] text-rose-400 mt-0.5 block">{fieldErrors.password}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reqPassChange"
                  checked={requiresPasswordChange}
                  onChange={(e) => setRequiresPasswordChange(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="reqPassChange" className="text-zinc-300 text-[11px] cursor-pointer">
                  Require mandatory password change on student&apos;s first login (Leave unchecked for Demo account)
                </label>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="glossy-btn glossy-btn-secondary px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="glossy-btn glossy-btn-emerald shine-sweep px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Creating Student...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Create Student Account
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
