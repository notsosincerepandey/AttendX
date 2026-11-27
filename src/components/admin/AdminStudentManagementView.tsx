"use client";

import React, { useState } from "react";
import {
  Search,
  RefreshCw,
  Upload,
  UserPlus,
  UserCheck,
  UserMinus,
  KeyRound,
  Trash2,
  AlertCircle,
  Filter,
  Check,
  Users,
  ShieldAlert,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { StudentDirectoryItem } from "@/types";
import { getAllBranches, getSectionsForBranch } from "@/data/extractedTimetables";
import { VALID_ACADEMIC_YEARS } from "@/lib/studentImportTypes";
import BulkStudentImportModal from "./BulkStudentImportModal";
import StudentRemovalModal from "./StudentRemovalModal";
import ManualStudentCreateModal from "./ManualStudentCreateModal";

interface AdminStudentManagementViewProps {
  students: StudentDirectoryItem[];
  totalStudents: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filterBranch: string;
  filterSection: string;
  filterBatch: string;
  filterAcademicYear: string;
  filterStatus: string;
  filterRole: string;
  onSearchChange: (val: string) => void;
  onBranchChange: (val: string) => void;
  onSectionChange: (val: string) => void;
  onBatchChange: (val: string) => void;
  onAcademicYearChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onRoleChange: (val: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onClearFilters: () => void;
  onAppointCR: (student: StudentDirectoryItem) => void;
  onRevokeCR: (student: StudentDirectoryItem) => void;
  onResetPassword: (student: StudentDirectoryItem) => void;
}

export default function AdminStudentManagementView({
  students,
  totalStudents,
  currentPage,
  totalPages,
  pageSize,
  isLoading,
  error,
  searchQuery,
  filterBranch,
  filterSection,
  filterBatch,
  filterAcademicYear,
  filterStatus,
  filterRole,
  onSearchChange,
  onBranchChange,
  onSectionChange,
  onBatchChange,
  onAcademicYearChange,
  onStatusChange,
  onRoleChange,
  onPageChange,
  onRefresh,
  onClearFilters,
  onAppointCR,
  onRevokeCR,
  onResetPassword,
}: AdminStudentManagementViewProps) {
  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [removalModalStudent, setRemovalModalStudent] = useState<StudentDirectoryItem | null>(null);
  const [bulkRemovalStudents, setBulkRemovalStudents] = useState<StudentDirectoryItem[]>([]);
  const [isRemovalModalOpen, setIsRemovalModalOpen] = useState(false);

  // Multi-selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(students.map((s) => s.id));
      setSelectedStudentIds(allIds);
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const openSingleRemoval = (student: StudentDirectoryItem) => {
    setRemovalModalStudent(student);
    setBulkRemovalStudents([]);
    setIsRemovalModalOpen(true);
  };

  const openBulkRemoval = () => {
    const selectedList = students.filter((s) => selectedStudentIds.has(s.id));
    if (selectedList.length === 0) return;
    setBulkRemovalStudents(selectedList);
    setRemovalModalStudent(null);
    setIsRemovalModalOpen(true);
  };

  const allOnPageSelected =
    students.length > 0 && students.every((s) => selectedStudentIds.has(s.id));

  return (
    <div className="space-y-4">
      {/* Search and Action Toolbar */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or enrollment number..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-medium placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="glossy-btn glossy-btn-emerald shine-sweep px-4 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Add Student Manually
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="glossy-btn glossy-btn-primary px-4 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Bulk Import Students
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={onClearFilters}
              className="px-3 py-2.5 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
              Academic Year
            </label>
            <select
              value={filterAcademicYear}
              onChange={(e) => onAcademicYearChange(e.target.value)}
              className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-xs"
            >
              <option value="ALL">All Years</option>
              {VALID_ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Branch</label>
            <select
              value={filterBranch}
              onChange={(e) => onBranchChange(e.target.value)}
              className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-xs"
            >
              <option value="ALL">All Branches</option>
              {getAllBranches().map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Section</label>
            <select
              value={filterSection}
              onChange={(e) => onSectionChange(e.target.value)}
              className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-xs"
            >
              <option value="ALL">All Sections</option>
              {getSectionsForBranch(filterBranch).map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Batch</label>
            <select
              value={filterBatch}
              onChange={(e) => onBatchChange(e.target.value)}
              className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-xs"
            >
              <option value="ALL">All Batches</option>
              <option value="P1">Batch P1</option>
              <option value="P2">Batch P2</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="DEACTIVATED">Deactivated Only</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Role</label>
            <select
              value={filterRole}
              onChange={(e) => onRoleChange(e.target.value)}
              className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-xs"
            >
              <option value="ALL">All Roles</option>
              <option value="student">Student</option>
              <option value="class_admin">Class CR</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Strip */}
      {selectedStudentIds.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 p-3 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px]">
              {selectedStudentIds.size}
            </span>
            <span className="font-bold text-indigo-900 dark:text-indigo-200">
              Students selected across current directory
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openBulkRemoval}
              className="px-3 py-1.5 rounded-xl font-bold text-rose-700 dark:text-rose-300 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 border border-rose-200 dark:border-rose-900 flex items-center gap-1 transition-colors"
            >
              <UserMinus className="w-3.5 h-3.5" /> Deactivate Selected
            </button>
            <button
              onClick={() => setSelectedStudentIds(new Set())}
              className="px-3 py-1.5 rounded-xl font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Main Student Directory Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Authoritative Student Registry
            </h3>
            <p className="text-xs text-zinc-500">
              Database-backed directory with real-time academic year and role mapping.
            </p>
          </div>
          <div className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl">
            Total Students: <span className="text-indigo-600 dark:text-indigo-400">{totalStudents}</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={handleSelectAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                </th>
                <th className="p-3.5">Student Details</th>
                <th className="p-3.5">Roll Number</th>
                <th className="p-3.5">Academic Year</th>
                <th className="p-3.5">Branch & Section</th>
                <th className="p-3.5">Batch</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-zinc-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                    Loading authoritative student directory...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-zinc-500">
                    No student accounts match your filter criteria.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isMainAdmin = student.role === "admin";
                  const isCR = student.role === "class_admin";
                  const isSelected = selectedStudentIds.has(student.id);
                  const isDeactivated = !student.isActive || student.status === "DEACTIVATED";

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                        isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                      } ${isDeactivated ? "opacity-60 bg-zinc-50/40 dark:bg-zinc-900/60" : ""}`}
                    >
                      <td className="p-3 text-center">
                        {!isMainAdmin && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(student.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center text-white shrink-0 ${
                              isMainAdmin
                                ? "bg-indigo-600"
                                : isCR
                                ? "bg-purple-600"
                                : isDeactivated
                                ? "bg-zinc-400"
                                : "bg-zinc-700"
                            }`}
                          >
                            {student.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-zinc-100">
                              {student.fullName}
                            </div>
                            <div className="font-mono text-[10px] text-zinc-400">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          {student.rollNumber || "—"}
                        </div>
                        {student.enrollmentNumber && (
                          <div className="text-[10px] text-zinc-400">
                            Enr: {student.enrollmentNumber}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {student.academicYear || "1st Year"}
                        </span>
                        <div className="text-[10px] text-zinc-400">
                          {student.semester || "Semester I"}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {student.branchCode || "Unassigned"}
                        </span>{" "}
                        <span className="text-zinc-700 dark:text-zinc-300">{student.section || ""}</span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-zinc-600 dark:text-zinc-400">
                        {student.batch || "P1"}
                      </td>

                      <td className="p-3.5">
                        {isDeactivated ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            Deactivated
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {isMainAdmin ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            Admin
                          </span>
                        ) : isCR ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-1 w-fit">
                            <Sparkles className="w-3 h-3 text-purple-600" /> Class CR
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            Student
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        {isMainAdmin ? (
                          <span className="text-[10px] font-bold text-zinc-400 italic">Owner</span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            {isCR ? (
                              <button
                                onClick={() => onRevokeCR(student)}
                                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 transition-colors inline-flex items-center gap-1"
                                title="Revoke Class Representative Scope"
                              >
                                <UserMinus className="w-3 h-3" /> Revoke CR
                              </button>
                            ) : (
                              <button
                                onClick={() => onAppointCR(student)}
                                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 transition-colors inline-flex items-center gap-1"
                                title="Appoint as Class Representative"
                              >
                                <UserCheck className="w-3 h-3" /> Appoint CR
                              </button>
                            )}

                            <button
                              onClick={() => onResetPassword(student)}
                              className="px-2 py-1 rounded-xl text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition-colors inline-flex items-center gap-1"
                              title="Reset Password"
                            >
                              <KeyRound className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => openSingleRemoval(student)}
                              className="px-2 py-1 rounded-xl text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors inline-flex items-center gap-1"
                              title="Deactivate or Remove Student"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div>
            Showing page <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentPage}</span> of{" "}
            <span className="font-bold text-zinc-800 dark:text-zinc-200">{totalPages}</span> ({totalStudents} total students)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1 || isLoading}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Student Creation Modal */}
      <ManualStudentCreateModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={() => {
          onRefresh();
        }}
      />

      {/* Bulk Student Import Modal */}
      <BulkStudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          setIsImportModalOpen(false);
          onRefresh();
        }}
      />

      {/* Student Removal / Deactivation Modal */}
      <StudentRemovalModal
        isOpen={isRemovalModalOpen}
        onClose={() => {
          setIsRemovalModalOpen(false);
          setRemovalModalStudent(null);
          setBulkRemovalStudents([]);
        }}
        student={removalModalStudent}
        bulkStudents={bulkRemovalStudents}
        onSuccess={() => {
          setSelectedStudentIds(new Set());
          onRefresh();
        }}
      />
    </div>
  );
}
