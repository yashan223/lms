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
  Video,
  GraduationCap,
  Sparkles,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AttendanceRecord {
  id: string;
  eventId: string | null;
  classTitle: string;
  courseId: string | null;
  courseTitle: string;
  tutorName: string;
  classDate: string;
  type: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | "SCHEDULED";
  joinedAt: string | null;
  durationMinutes: number;
  markedBy: string;
  notes: string;
  meetingLink: string;
}

interface AttendanceStats {
  totalScheduled: number;
  pastClassesCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number;
}

export function StudentAttendanceTracker({ studentId }: { studentId?: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const url = studentId
        ? `/api/attendance?view=student&studentId=${encodeURIComponent(studentId)}`
        : `/api/attendance?view=student`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || null);
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error("[StudentAttendanceTracker] Error fetching attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [studentId]);

  // Unique course list for dropdown filter
  const uniqueCourses = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) {
      if (r.courseId && r.courseTitle) {
        map.set(r.courseId, r.courseTitle);
      }
    }
    return Array.from(map.entries());
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.classTitle.toLowerCase().includes(q) ||
        r.courseTitle.toLowerCase().includes(q) ||
        r.tutorName.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        r.status === statusFilter;

      const matchesCourse =
        courseFilter === "ALL" ||
        r.courseId === courseFilter;

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [records, searchQuery, statusFilter, courseFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 font-bold text-xs gap-1 py-0.5 px-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Present
          </Badge>
        );
      case "LATE":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 font-bold text-xs gap-1 py-0.5 px-2.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Late
          </Badge>
        );
      case "ABSENT":
        return (
          <Badge className="bg-red-500/15 text-red-700 border-red-300 font-bold text-xs gap-1 py-0.5 px-2.5">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Absent
          </Badge>
        );
      case "EXCUSED":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 border-blue-300 font-bold text-xs gap-1 py-0.5 px-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
            Excused
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs gap-1 py-0.5 px-2.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Scheduled
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            Online Class Attendance Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic tracking recorded whenever you join live classes, seminars, and 1-on-1 consultations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchAttendance}
          disabled={loading}
          className="rounded-xl border-slate-200 text-xs font-semibold gap-1.5 self-start sm:self-auto h-9 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          Refresh Records
        </Button>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Attendance Rate */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
            <span>Attendance Rate</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-950">
              {stats ? `${stats.attendanceRate}%` : "—"}
            </span>
            <span className="text-[11px] text-blue-700 font-medium">
              {stats?.attendanceRate && stats.attendanceRate >= 80 ? "Exemplary" : "Requires attention"}
            </span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (stats?.attendanceRate || 0) >= 80
                  ? "bg-emerald-500"
                  : (stats?.attendanceRate || 0) >= 60
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, stats?.attendanceRate || 0))}%` }}
            />
          </div>
        </div>

        {/* Classes Attended */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
            <span>Classes Attended</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
            {stats ? stats.presentCount + stats.lateCount : "0"}
          </div>
          <p className="text-[11px] text-emerald-700">
            {stats ? `${stats.presentCount} on-time • ${stats.lateCount} late` : "0 recorded"}
          </p>
        </div>

        {/* Missed / Absent */}
        <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-red-900">
            <span>Missed Sessions</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-950">
            {stats ? stats.absentCount : "0"}
          </div>
          <p className="text-[11px] text-red-700">
            {stats?.excusedCount ? `${stats.excusedCount} excused absence(s)` : "Unexcused absences"}
          </p>
        </div>

        {/* Total Scheduled */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Total Scheduled</span>
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats ? stats.totalScheduled : "0"}
          </div>
          <p className="text-[11px] text-slate-500">
            Across all enrolled subjects
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by class title, course, or tutor..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
            />
          </div>

          {/* Course Filter Dropdown */}
          {uniqueCourses.length > 0 && (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer font-medium"
            >
              <option value="ALL">All Courses ({uniqueCourses.length})</option>
              {uniqueCourses.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Status:
          </span>
          {["ALL", "PRESENT", "LATE", "ABSENT", "EXCUSED", "SCHEDULED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {st === "ALL" ? "All Sessions" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Records List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <span>Class Attendance History</span>
            <span className="text-slate-400 font-normal">({filteredRecords.length} sessions)</span>
          </h3>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Status automatically updates when you join live rooms
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p>Loading attendance records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No attendance records found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery || statusFilter !== "ALL" || courseFilter !== "ALL"
                ? "No sessions match your search or filter criteria. Try clearing filters."
                : "Scheduled classes and consultations will log your live attendance here automatically once joined."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRecords.map((item) => {
              const dateObj = new Date(item.classDate);
              const formattedDate = dateObj.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const formattedTime = dateObj.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  {/* Left: Class & Course Info */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {item.classTitle}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {item.courseTitle}
                      </span>
                      <span>•</span>
                      <span>Tutor: <strong className="text-slate-700">{item.tutorName}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formattedDate} at {formattedTime}
                      </span>
                    </div>

                    {/* Joined Info & Notes */}
                    {item.joinedAt && (
                      <div className="flex items-center gap-2 text-[11px] text-emerald-700 pt-0.5">
                        <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>
                          Joined at {new Date(item.joinedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          {item.durationMinutes > 0 && ` (${item.durationMinutes} mins attended)`}
                        </span>
                      </div>
                    )}
                    {item.notes && !item.joinedAt && (
                      <p className="text-[11px] text-slate-500 italic">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Right: Join Button */}
                  <div className="shrink-0 flex items-center gap-2 self-start md:self-center">
                    <a
                      href={item.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>{item.status === "PRESENT" ? "Re-join Class" : "Enter Class"}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
