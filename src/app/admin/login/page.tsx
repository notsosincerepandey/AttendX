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
} from "lucide-react";
import { getCurrentUser, setCurrentUser, setSessionToken } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@attendx.ac.in");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // If already authenticated as administrator, automatically redirect to /admin
  useEffect(() => {
    const user = getCurrentUser();
    if (user && user.role === "admin") {
      router.replace("/admin");
    }
  }, [router]);

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
        // Authoritative storage
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

        {/* Login Card */}
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
