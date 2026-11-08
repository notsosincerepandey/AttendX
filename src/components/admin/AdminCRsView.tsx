"use client";

import React, { useState, useEffect } from "react";
import {
  UserCheck,
  UserMinus,
  Plus,
  Search,
  Filter,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Users,
} from "lucide-react";
import { StudentDirectoryItem } from "@/types";
import { getSessionToken } from "@/lib/auth";

interface AdminCRsViewProps {
  onOpenAppointModal: (student?: StudentDirectoryItem) => void;
  onOpenRevokeModal: (student: StudentDirectoryItem) => void;
  onRefreshStats: () => void;
}

export default function AdminCRsView({
  onOpenAppointModal,
  onOpenRevokeModal,
  onRefreshStats,
}: AdminCRsViewProps) {
  const [crs, setCrs] = useState<StudentDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchCRs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getSessionToken();
      const res = await fetch("/api/admin/students?role=class_admin&pageSize=50", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCrs(data.students || []);
      } else {
        setError(data.error || "Failed to retrieve appointed Class CRs.");
      }
    } catch (err: any) {
      setError("Network error fetching Class Representatives.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCRs();
  }, []);

  const filteredCRs = crs.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.rollNumber && c.rollNumber.toLowerCase().includes(q)) ||
      (c.branchCode && c.branchCode.toLowerCase().includes(q)) ||
      (c.section && c.section.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 uppercase tracking-wider">
              Section Governance
            </span>
            <span className="text-xs text-zinc-400">
              {crs.length} Appointed Representative{crs.length !== 1 ? "s" : ""}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Class Representative (CR) Management
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
            CRs possess scoped authority to publish section notices, verify attendance anomalies, and launch student polls for their assigned MMMUT engineering sections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCRs}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700/60"
            title="Refresh CR list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          </button>

          <button
            onClick={() => onOpenAppointModal()}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Appoint New CR</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-xs font-semibold text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search CR by name, roll number, or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="text-xs text-zinc-400 font-medium">
          Showing <span className="font-bold text-white">{filteredCRs.length}</span> of {crs.length} CRs
        </div>
      </div>

      {/* CRs Table / Empty State */}
      {isLoading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <div className="text-xs text-zinc-400">Loading appointed Class Representatives...</div>
        </div>
      ) : filteredCRs.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-500">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No Appointed Class Representatives Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {search
              ? "No appointed CRs match your search query."
              : "No students have been assigned the Class CR role yet. You can promote any enrolled student from the Student Registry."}
          </p>
          <button
            onClick={() => onOpenAppointModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Select Student to Appoint</span>
          </button>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Student / CR</th>
                  <th className="px-4 py-3.5">Roll Number</th>
                  <th className="px-4 py-3.5">Managed Branch</th>
                  <th className="px-4 py-3.5">Managed Section</th>
                  <th className="px-4 py-3.5">Batch Scope</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredCRs.map((cr) => (
                  <tr key={cr.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white">{cr.fullName}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">{cr.email}</div>
                    </td>
                    <td className="px-4 py-4 font-mono font-semibold text-zinc-300">
                      {cr.rollNumber || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-mono font-bold text-[11px] border border-indigo-500/20">
                        {cr.managedBranchCode || cr.branchCode || "IT"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 font-mono font-bold text-[11px]">
                        {cr.managedSection || cr.section || "SEC-A"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-400 font-mono">
                      {cr.managedBatch || cr.batch || "ALL"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Class CR Active
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onOpenRevokeModal(cr)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-colors"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>Revoke CR</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
