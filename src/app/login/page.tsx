"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser, registerNewUser, rotatePassword } from "@/lib/auth";
import { UNIVERSITY_DATABASE } from "@/data/extractedTimetables";
import {
  GraduationCap,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Mandatory First-Time Password Change State
  const [showMandatoryChange, setShowMandatoryChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeError, setChangeError] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  // Registration state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBranchCode, setRegBranchCode] = useState("IT");
  const [regSection, setRegSection] = useState("SEC-B");
  const [regBatch, setRegBatch] = useState("P1");

  // Filter available sections & batches for registration
  const branchTimetables = UNIVERSITY_DATABASE.timetables.filter(
    (t) => t.branchCode === regBranchCode
  );
  const availableSections = Array.from(
    new Set(branchTimetables.map((t) => t.section))
  );
  const matchedTimetable =
    branchTimetables.find((t) => t.section === regSection) || branchTimetables[0];
  const availableBatches = matchedTimetable?.batches || ["P1", "P2"];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const res = await loginUser(email, password);
    if (res.success && res.user) {
      if (res.requiresPasswordChange) {
        setLoggedInUser(res.user);
        setShowMandatoryChange(true);
        return;
      }
      setSuccessMsg(`Welcome, ${res.user.fullName}! Redirecting to dashboard...`);
      setTimeout(() => {
        router.push("/");
        window.location.href = "/";
      }, 600);
    } else {
      setErrorMsg(res.error || "Failed to log in.");
    }
  };

  const handleMandatoryPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError("");

    if (!newPassword || newPassword.length < 8) {
      setChangeError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword === "student@2026") {
      setChangeError("New password cannot be the default password. Please choose a secure custom password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangeError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsUpdatingPassword(true);
    const res = await rotatePassword(newPassword);
    setIsUpdatingPassword(false);

    if (res.success) {
      setSuccessMsg("Password successfully updated! Redirecting to your dashboard...");
      setShowMandatoryChange(false);
      setTimeout(() => {
        router.push("/");
        window.location.href = "/";
      }, 700);
    } else {
      setChangeError(res.error || "Failed to update password. Please try again.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg("Please complete all registration fields.");
      return;
    }

    if (!matchedTimetable) {
      setErrorMsg("Could not map official timetable for chosen branch/section.");
      return;
    }

    const res = await registerNewUser({
      fullName: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: "student",
      degree: matchedTimetable.degree,
      branch: matchedTimetable.branch,
      branchCode: matchedTimetable.branchCode,
      section: matchedTimetable.section,
      batch: availableBatches.includes(regBatch) ? regBatch : availableBatches[0],
      semester: matchedTimetable.semester,
      academicSession: matchedTimetable.session,
      attendanceThreshold: 75.0,
      activeTimetableId: matchedTimetable.id,
    });

    if (res.success && res.user) {
      setSuccessMsg(`Account created for ${res.user.fullName}! Redirecting...`);
      setTimeout(() => {
        router.push("/");
        window.location.href = "/";
      }, 600);
    } else {
      setErrorMsg(res.error || "Registration failed.");
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-10 px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 rounded-2xl text-white shadow-xl shadow-indigo-500/25">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            Attend<span className="text-indigo-600 dark:text-indigo-400">X</span> Portal
          </h1>
          <p className="text-xs text-zinc-500">
            Madan Mohan Malaviya University of Technology, Gorakhpur
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-6">
          {/* Tabs */}
          <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-bold">
            <button
              onClick={() => {
                setTab("login");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`py-2 rounded-lg transition-colors ${
                tab === "login"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              disabled
              title="New student sign up is currently disabled"
              className="py-2 rounded-lg text-zinc-400 dark:text-zinc-500 bg-transparent cursor-not-allowed opacity-50 select-none font-bold"
            >
              New Student Sign Up
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {showMandatoryChange ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Mandatory First-Time Password Change</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  Welcome to AttendX, <strong className="font-semibold">{loggedInUser?.fullName}</strong>! You must change your default password before accessing your dashboard.
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  Notice: This is your ONE permitted self-service password change. Any subsequent password resets must be requested from the Administrator.
                </p>
              </div>

              {changeError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{changeError}</span>
                </div>
              )}

              <form onSubmit={handleMandatoryPasswordChange} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    New Secure Password (min 8 characters)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {isUpdatingPassword ? "Updating Password..." : "Update Password & Access Dashboard"}{" "}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Roll Number or Enrollment Number
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your roll number or enrollment number"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                Log In <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aryan Sharma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Enter university email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      required
                      placeholder="Create password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3 pr-9 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                      aria-label={showRegPassword ? "Hide password" : "Show password"}
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Class & Batch Selection */}
              <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  Academic Allocation
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Branch / Program
                  </label>
                  <select
                    value={regBranchCode}
                    onChange={(e) => {
                      setRegBranchCode(e.target.value);
                      const matched = UNIVERSITY_DATABASE.timetables.filter(
                        (t) => t.branchCode === e.target.value
                      );
                      if (matched.length > 0) {
                        setRegSection(matched[0].section);
                        setRegBatch(matched[0].batches[0]);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Section
                    </label>
                    <select
                      value={regSection}
                      onChange={(e) => setRegSection(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {availableSections.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Practical Batch
                    </label>
                    <select
                      value={regBatch}
                      onChange={(e) => setRegBatch(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {availableBatches.map((b) => (
                        <option key={b} value={b}>
                          Batch {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {matchedTimetable && (
                  <p className="text-[10px] text-zinc-500 font-mono pt-1">
                    Mapped to Room {matchedTimetable.room} ({matchedTimetable.session}) &bull; Clean 0% attendance starting baseline.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                Create Account & Access Timetable <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Dedicated Admin Portal Link */}
        <div className="text-center pt-2">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
            <span>Are you an Administrator? <strong>Go to Admin Portal</strong></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
