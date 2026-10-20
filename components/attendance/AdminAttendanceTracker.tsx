"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  Search,
  Filter,
  Download,
  Users,
  RefreshCw,
  GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminAttendanceRecord {
  id: string;
  userName: string;
  userEmail: string;
  userRole: string;
  identifier: string;
  sessionTitle: string;
  courseTitle: string;
  tutorName: string;
  status: string;
  joinedAt: string | null;
  durationMinutes: number;
  markedBy: string;
  notes: string;
  createdAt: string;
}

export function AdminAttendanceTracker() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [records, setRecords] = useState<AdminAttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchAdminAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/attendance?view=admin");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || null);
        setRecords(data.recentAttendance || []);
      }
    } catch (err) {
      console.error("[AdminAttendanceTracker] Error fetching admin attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminAttendance();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.userName.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.sessionTitle.toLowerCase().includes(q) ||
        r.courseTitle.toLowerCase().includes(q) ||
        r.identifier.toLowerCase().includes(q);

      const matchesRole = roleFilter === "ALL" || r.userRole === roleFilter;
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [records, searchQuery, roleFilter, statusFilter]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      "ID",
      "User Name",
      "User Email",
      "Role",
      "Registration ID",
      "Class Title",
      "Course",
      "Tutor",
      "Status",
      "Joined At",
      "Marked By",
      "Notes",
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.id}"`,
      `"${r.userName}"`,
      `"${r.userEmail}"`,
      `"${r.userRole}"`,
      `"${r.identifier}"`,
      `"${r.sessionTitle.replace(/"/g, '""')}"`,
      `"${r.courseTitle.replace(/"/g, '""')}"`,
      `"${r.tutorName}"`,
      `"${r.status}"`,
      `"${r.joinedAt ? new Date(r.joinedAt).toISOString() : ""}"`,
      `"${r.markedBy}"`,
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            University Attendance &amp; Class Participation Registry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade log of online classroom attendance across all enrolled students and faculty tutors.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="rounded-xl border-slate-200 text-xs font-bold gap-1.5 h-9 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Statement
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAdminAttendance}
            disabled={loading}
            className="rounded-xl border-slate-200 text-xs font-semibold gap-1.5 h-9 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Total Attendance Records</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats ? stats.totalRecords : "0"}
          </div>
          <p className="text-[11px] text-slate-500">Live verified attendance logs</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
            <span>Student Attended Sessions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
            {stats ? stats.studentPresentCount : "0"}
          </div>
          <p className="text-[11px] text-emerald-700">Verified student online joins</p>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
            <span>Tutor Teaching Sessions</span>
            <GraduationCap className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-950">
            {stats ? stats.tutorPresentCount : "0"}
          </div>
          <p className="text-[11px] text-indigo-700">Conducted virtual lecture rooms</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student/tutor name, email, ID, class title..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Students Only</option>
              <option value="TUTOR">Tutors Only</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Class / Consultation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined Time</th>
                <th className="px-4 py-3">Tracking Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Loading attendance records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="font-bold">{r.userName}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {r.userEmail} {r.identifier && `• ${r.identifier}`}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.userRole === "STUDENT"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {r.userRole}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{r.sessionTitle}</div>
                      <div className="text-[11px] text-slate-500">{r.courseTitle}</div>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "PRESENT" && (
                        <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Present
                        </span>
                      )}
                      {r.status === "LATE" && (
                        <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Late
                        </span>
                      )}
                      {r.status === "ABSENT" && (
                        <span className="text-red-700 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-600" />
                          Absent
                        </span>
                      )}
                      {r.status === "EXCUSED" && (
                        <span className="text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-blue-600" />
                          Excused
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                      {r.joinedAt ? (
                        <>
                          {new Date(r.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{" "}
                          {new Date(r.joinedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px]">
                        {r.markedBy}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
