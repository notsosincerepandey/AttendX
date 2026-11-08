"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Server,
  User,
  LogOut,
  Sparkles,
} from "lucide-react";
import { UserAccount } from "@/types";
import { rotatePassword, logoutAdmin, getSessionToken } from "@/lib/auth";

interface AdminSettingsViewProps {
  currentUser: UserAccount | null;
}

export default function AdminSettingsView({ currentUser }: AdminSettingsViewProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const token = getSessionToken();

  const handleRotatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPassword || newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await rotatePassword(newPassword);
      if (res.success) {
        setSuccessMsg(res.message || "Administrator password successfully updated in Supabase Auth.");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setErrorMsg(res.error || "Failed to update administrator password.");
      }
    } catch {
      setErrorMsg("Network error updating administrator password.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-2 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold border border-indigo-500/30 uppercase tracking-wider">
            Security & Cryptography
          </span>
          <span className="text-xs text-zinc-400 font-mono">Supabase Auth Session</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Administrator Security & Parameters
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
          Manage system identity, cryptographic tokens, and authoritative password rotation for the sole primary administrator account.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Administrator Profile Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Administrator Identity</h3>
              <p className="text-[11px] text-zinc-400">Authoritative database profile</p>
            </div>
          </div>

          <div className="space-y-3 text-xs pt-2">
            <div className="p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/50 space-y-0.5">
              <div className="text-[10px] text-zinc-500 font-medium">Display Name</div>
              <div className="font-bold text-white">{currentUser?.fullName || "AttendX Administrator"}</div>
            </div>

            <div className="p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/50 space-y-0.5">
              <div className="text-[10px] text-zinc-500 font-medium">Primary Email & Login Identifier</div>
              <div className="font-mono font-bold text-indigo-400">{currentUser?.email || "admin@attendx.ac.in"}</div>
            </div>

            <div className="p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/50 space-y-0.5">
              <div className="text-[10px] text-zinc-500 font-medium">System Role</div>
              <div className="font-mono font-bold text-emerald-400">
                admin <span className="text-[10px] font-sans text-zinc-400">(Super Administrator)</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/50 space-y-0.5">
              <div className="text-[10px] text-zinc-500 font-medium">Active Database Instance</div>
              <div className="font-mono text-zinc-300">iczjocbishkvkkkfvalz.supabase.co</div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => logoutAdmin()}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Admin Portal</span>
              </button>
            </div>
          </div>
        </div>

        {/* Password Rotation Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Rotate Master Password</h3>
              <p className="text-[11px] text-zinc-400">Updates credentials in Supabase Auth</p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs font-semibold text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleRotatePassword} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">New Master Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 mt-2"
            >
              {isUpdating ? "Updating Password..." : "Update Master Password"}
            </button>
          </form>

          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed">
            <strong>Security Notice:</strong> The Administrator is not constrained by student one-time change locks. Updating your password here authoritatively changes your Supabase Auth credential immediately.
          </div>
        </div>
      </div>
    </div>
  );
}
