"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Server,
  KeyRound,
  ShieldCheck,
  Check,
} from "lucide-react";
import { getCurrentUser, setCurrentUser, setSessionToken } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();

  // Setup Detection State
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);
  const [isSetupMode, setIsSetupMode] = useState(false);

  // Normal Login State
  const [email, setEmail] = useState("admin@attendx.ac.in");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // First-Time Setup State
  const [activationKey, setActivationKey] = useState("");
  const [showActivationKey, setShowActivationKey] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSetupLoading, setIsSetupLoading] = useState(false);
  const [setupErrorMsg, setSetupErrorMsg] = useState("");
  const [setupSuccessMsg, setSetupSuccessMsg] = useState("");

  // If already authenticated as administrator, automatically redirect to /admin
  useEffect(() => {
    const user = getCurrentUser();
    if (user && user.role === "admin") {
      router.replace("/admin");
    }
  }, [router]);

  // Detect whether initial setup has been completed
  useEffect(() => {
    async function checkSetupStatus() {
      try {
        const res = await fetch("/api/admin/auth/setup-status");
        const data = await res.json();
        if (res.ok && data.success) {
          const isDone = Boolean(data.setupCompleted);
          setSetupCompleted(isDone);
          // If setup is NOT completed, default into First-Time Setup view
          if (!isDone) {
            setIsSetupMode(true);
          }
        } else {
          // If detection endpoint fails, default to standard login for safety
          setSetupCompleted(true);
        }
      } catch (err) {
        console.error("Admin setup status detection error:", err);
        setSetupCompleted(true);
      } finally {
        setIsCheckingSetup(false);
      }
    }
    checkSetupStatus();
  }, []);

  // Handler for Standard Administrator Sign In
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both administrator email and password.");
      return;
    }

    if (email.trim().toLowerCase() !== "admin@attendx.ac.in") {
      setErrorMsg(
        "Access Denied: Only the verified primary Administrator account (admin@attendx.ac.in) is authorized here. Students must use the Student Portal at /login."
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        setCurrentUser(data.user);
        if (data.sessionToken) {
          setSessionToken(data.sessionToken);
        }

        setSuccessMsg("Administrator session verified! Redirecting to Admin Dashboard...");
        setTimeout(() => {
          router.push("/admin");
          window.location.href = "/admin";
        }, 500);
      } else {
        setErrorMsg(data.error || "Authentication failed. Please verify your credentials.");
      }
    } catch (err: any) {
      console.error("Admin login network error:", err);
      setErrorMsg("Network error. Unable to connect to AttendX authentication services.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for One-Time First Admin Password Setup
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupErrorMsg("");
    setSetupSuccessMsg("");

    if (!activationKey.trim()) {
      setSetupErrorMsg("Please enter your one-time administrator activation key.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setSetupErrorMsg("Please enter and confirm your new administrator password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSetupErrorMsg("Password confirmation does not match the new password.");
      return;
    }

    if (newPassword.length < 8) {
      setSetupErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    setIsSetupLoading(true);

    try {
      const res = await fetch("/api/admin/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@attendx.ac.in",
          activationKey: activationKey.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSetupSuccessMsg(
          "Administrator password configured successfully! Initial setup is now permanently closed."
        );
        // Permanently lock setup mode in client state
        setSetupCompleted(true);
        setIsSetupMode(false);

        // Automatically log in with the newly set password
        try {
          const loginRes = await fetch("/api/admin/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@attendx.ac.in", password: newPassword }),
          });
          const loginData = await loginRes.json();
          if (loginRes.ok && loginData.success && loginData.user) {
            setCurrentUser(loginData.user);
            if (loginData.sessionToken) setSessionToken(loginData.sessionToken);
            setTimeout(() => {
              router.push("/admin");
              window.location.href = "/admin";
            }, 600);
            return;
          }
        } catch {
          // If auto login fails, user can proceed via standard login
        }

        // Pre-fill password in login form
        setPassword(newPassword);
      } else {
        setSetupErrorMsg(data.error || "Setup failed. Please verify your activation credentials.");
      }
    } catch (err: any) {
      console.error("Admin setup network error:", err);
      setSetupErrorMsg("Network error. Unable to communicate with administrator setup service.");
    } finally {
      setIsSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center py-12 px-4 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-rose-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-indigo-900 via-indigo-700 to-indigo-500 rounded-2xl text-white shadow-xl shadow-indigo-500/20 border border-indigo-400/20">
            <ShieldAlert className="w-8 h-8 text-indigo-200" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Administrative Gateway
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              AttendX Admin Portal
            </h1>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
              Restricted governance portal for MMMUT attendance monitoring, class CR appointments, and master timetable publications.
            </p>
          </div>
        </div>

        {/* First-Time Setup Card vs Standard Login Card */}
        {isSetupMode && setupCompleted === false ? (
          /* ========================================================
           * FIRST-TIME ADMIN SETUP INTERFACE
           * Displayed ONLY when primary admin initial setup is pending
           * ======================================================== */
          <div className="bg-zinc-900/90 backdrop-blur-md border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40 space-y-5">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  One-Time Activation
                </div>
                <h2 className="text-base font-bold text-white mt-0.5">
                  Initial Administrator Password Setup
                </h2>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              The primary administrator account requires an initial password setup before governance access is enabled.
            </p>

            {setupErrorMsg && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-xs font-semibold text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="leading-relaxed">{setupErrorMsg}</div>
              </div>
            )}

            {setupSuccessMsg && (
              <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-xs font-semibold text-emerald-300 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{setupSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSetup} className="space-y-4">
              {/* Pre-filled & Locked Admin Account */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Primary Administrator Account
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    disabled
                    value="admin@attendx.ac.in"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-zinc-800/40 border border-zinc-700/50 rounded-xl text-zinc-400 font-mono cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Fixed primary identity: <span className="font-mono text-zinc-400">admin@attendx.ac.in</span>
                </p>
              </div>

              {/* One-Time Activation Key */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>One-Time Activation Key</span>
                  <span className="text-[10px] font-normal text-amber-400 font-mono">Instance Authorized</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input
                    type={showActivationKey ? "text" : "password"}
                    required
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value)}
                    placeholder="Enter instance activation key"
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-zinc-800/70 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowActivationKey(!showActivationKey)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {showActivationKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Enter your server instance activation key to securely verify administrator authority.
                </p>
              </div>

              {/* New Admin Password */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  New Administrator Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Choose a strong administrator password"
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-zinc-800/70 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Minimum 8 characters. Make it secure and memorable.
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Confirm Administrator Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter administrator password"
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-zinc-800/70 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSetupLoading}
                className="w-full py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isSetupLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Configuring Credentials & Locking Setup...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Initial Setup & Activate Admin</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Switch to normal login toggle */}
            <div className="pt-2 border-t border-zinc-800/80 text-center">
              <button
                type="button"
                onClick={() => setIsSetupMode(false)}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Already set up? <strong>Sign In with existing password</strong>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================
           * STANDARD ADMINISTRATOR LOGIN INTERFACE
           * ======================================================== */
          <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            {errorMsg && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-xs font-semibold text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-xs font-semibold text-emerald-300 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@attendx.ac.in"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-zinc-800/70 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Restricted to authorized system owner: <span className="font-mono text-zinc-400">admin@attendx.ac.in</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Master Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter administrator password"
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-zinc-800/70 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In as Administrator</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* If initial setup is still pending, offer switch back to setup */}
            {setupCompleted === false && (
              <div className="pt-2 border-t border-zinc-800/80 text-center">
                <button
                  type="button"
                  onClick={() => setIsSetupMode(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>First-time setup pending? Click here to set initial password</span>
                </button>
              </div>
            )}

            {/* Security Notice Box */}
            <div className="pt-2 border-t border-zinc-800/80">
              <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                <div className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Security Notice</span>
                </div>
                <p className="leading-relaxed">
                  Unauthorized access attempts are logged and monitored. Students and Class CRs cannot log in through this portal.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Portal Switch Link */}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>Are you a student or Class CR? <strong>Go to Student Portal</strong></span>
          </Link>
        </div>

        <div className="text-center text-[10px] text-zinc-600">
          AttendX Administration &bull; MMMUT Gorakhpur &bull; Protected by Supabase Auth RBAC
        </div>
      </div>
    </div>
  );
}
