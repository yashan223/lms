"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
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
  Video,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface AttendanceRecord {
  id: string;
  userName: string;
  userEmail: string;
  userRole: string;
  regId: string;
  classTitle: string;
  courseTitle: string;
  courseId: string | null;
  tutorName: string;
  status: string;
  joinedAt: string | null;
  durationMinutes: number;
  markedBy: string;
  notes: string;
  createdAt: string;
}

interface SessionItem {
  eventId: string;
  title: string;
  dueDate: string;
  courseTitle: string;
  courseId: string | null;
  tutorName: string;
  meetingLink: string;
  status: string;
  tutorStatus: string;
  tutorJoinedAt: string | null;
  studentAttendeesCount: number;
}

interface RosterStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar: string | null;
  studentRegId: string | null;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | "SCHEDULED" | string;
  joinedAt: string | null;
  durationMinutes: number;
  markedBy: string;
  notes: string;
  attendanceId: string | null;
}

export function AdminAttendanceTracker({
  onOpenAnalytics,
}: {
  onOpenAnalytics?: (eventId: string, title?: string) => void;
} = {}) {
  const [activeSubTab, setActiveSubTab] = useState<"all" | "roster">("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Roster inspection
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [rosterData, setRosterData] = useState<any>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/attendance");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || null);
        setRecords(data.records || []);
        setSessions(data.sessions || []);
        if (!selectedEventId && data.sessions && data.sessions.length > 0) {
          setSelectedEventId(data.sessions[0].eventId);
        }
      }
    } catch (err) {
      console.error("[AdminAttendanceTracker] Error fetching attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoster = async (eventId: string) => {
    if (!eventId) return;
    try {
      setLoadingRoster(true);
      const res = await fetch(`/api/attendance?eventId=${encodeURIComponent(eventId)}`);
      if (res.ok) {
        const data = await res.json();
        setRosterData(data);
      }
    } catch (err) {
      console.error("[AdminAttendanceTracker] Error fetching roster:", err);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(() => {
      fetchAttendance();
      if (selectedEventId) {
        fetchRoster(selectedEventId);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedEventId]);

  useRealtimeSync({
    events: ["ATTENDANCE_CHANGED", "EVENTS_CHANGED"],
    onSync: () => {
      fetchAttendance();
      if (selectedEventId) {
        fetchRoster(selectedEventId);
      }
    },
  });

  useEffect(() => {
    if (activeSubTab === "roster" && selectedEventId) {
      fetchRoster(selectedEventId);
    }
  }, [activeSubTab, selectedEventId]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.userName.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.classTitle.toLowerCase().includes(q) ||
        r.courseTitle.toLowerCase().includes(q) ||
        r.regId.toLowerCase().includes(q) ||
        r.tutorName.toLowerCase().includes(q);

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
      "Email",
      "Role",
      "Registration ID",
      "Class Title",
      "Course",
      "Tutor",
      "Status",
      "Joined Time",
      "Marked Source",
      "Notes",
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.id}"`,
      `"${r.userName}"`,
      `"${r.userEmail}"`,
      `"${r.userRole}"`,
      `"${r.regId}"`,
      `"${r.classTitle.replace(/"/g, '""')}"`,
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
    link.setAttribute("download", `class_attendance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Attendance Tracker (Students &amp; Tutors)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin attendance records for online classes, BigBlueButton live sessions, and 1-on-1 consultations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* SubTab Toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveSubTab("all")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeSubTab === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Attendance Records
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("roster")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeSubTab === "roster"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Class Roster Inspector
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="rounded-xl border-slate-200 text-xs font-semibold gap-1.5 h-9 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAttendance}
            disabled={loading}
            className="rounded-xl border-slate-200 text-xs font-semibold gap-1.5 h-9 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Logged Joins
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats ? stats.totalRecords : "0"}
          </div>
          <p className="text-[11px] text-slate-500">Live online joins</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
            Student Attendees
          </div>
          <div className="text-2xl font-black text-blue-950 tracking-tight">
            {stats ? stats.studentPresent : "0"}
          </div>
          <p className="text-[11px] text-blue-700">Verified student attendance</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
            Tutor Teaching Joins
          </div>
          <div className="text-2xl font-black text-purple-950 tracking-tight">
            {stats ? stats.tutorPresent : "0"}
          </div>
          <p className="text-[11px] text-purple-700">Tutors who held scheduled classes</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Online Sessions
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats ? stats.totalLiveSessions : "0"}
          </div>
          <p className="text-[11px] text-slate-500">Scheduled &amp; delivered</p>
        </div>
      </div>

      {/* VIEW 1: ALL RECORDS */}
      {activeSubTab === "all" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student/tutor name, email, registration ID, or class title..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Students Only</option>
                <option value="TUTOR">Tutors Only</option>
                <option value="ADMIN">Admins / Observers</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="ABSENT">Absent</option>
                <option value="EXCUSED">Excused</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Online Class</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined Time</th>
                    <th className="px-4 py-3">Source</th>
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
                        No attendance records match your search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{r.userName}</div>
                          <div className="text-[11px] text-slate-400">
                            {r.userEmail} {r.regId && `• ${r.regId}`}
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
                          <div className="font-semibold text-slate-800">{r.classTitle}</div>
                          <div className="text-[11px] text-slate-500">
                            {r.courseTitle} • Tutor: <strong className="text-slate-700">{r.tutorName}</strong>
                          </div>
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
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
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
      )}

      {/* VIEW 2: ROSTER INSPECTOR */}
      {activeSubTab === "roster" && (
        <div className="space-y-4">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Select Class Session to Inspect:
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full sm:max-w-md px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {sessions.length === 0 ? (
                  <option value="">No class sessions found</option>
                ) : (
                  sessions.map((s) => (
                    <option key={s.eventId} value={s.eventId}>
                      {new Date(s.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} • {s.title} ({s.courseTitle})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenAnalytics && selectedEventId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenAnalytics(selectedEventId, rosterData?.event?.title)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition shadow-xs cursor-pointer"
                  title="View BigBlueButton Learning Analytics Dashboard"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Learning Analytics</span>
                </Button>
              )}

              {rosterData?.event?.meetingLink && (
                <a
                  href={rosterData.event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  Enter Room
                </a>
              )}
            </div>
          </div>

          {/* Roster overview */}
          {rosterData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {rosterData.event.title} — {rosterData.event.courseTitle}
                  </h4>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                    <span>
                      Tutor: <strong className="text-slate-800">{rosterData.event.tutorName}</strong>
                    </span>
                    {rosterData.event.tutorAttendance ? (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Tutor Joined ({rosterData.event.tutorAttendance.status})
                        {rosterData.event.tutorAttendance.joinedAt && (
                          <span className="text-emerald-800 font-normal">
                            • {new Date(rosterData.event.tutorAttendance.joinedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {rosterData.event.tutorAttendance.durationMinutes ? (
                          <span className="text-emerald-800 font-normal">
                            ({rosterData.event.tutorAttendance.durationMinutes}m)
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Tutor Attendance: Pending Join
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {rosterData.stats.presentCount + rosterData.stats.lateCount} Attended
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">
                    {rosterData.stats.totalEnrolled} Total Enrolled
                  </span>
                </div>
              </div>

              {loadingRoster ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                  Loading roster...
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {rosterData.roster.map((student: RosterStudent) => (
                    <div
                      key={student.studentId}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {student.studentName}
                          </span>
                          {student.studentRegId && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">
                              {student.studentRegId}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {student.studentEmail}
                          {student.joinedAt && (
                            <span className="text-emerald-700 ml-2 font-medium">
                              • Joined {new Date(student.joinedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {student.status === "PRESENT" && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Present
                          </span>
                        )}
                        {student.status === "LATE" && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Late
                          </span>
                        )}
                        {student.status === "ABSENT" && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            Absent
                          </span>
                        )}
                        {student.status === "EXCUSED" && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                            Excused
                          </span>
                        )}
                        {(student.status === "SCHEDULED" || (!["PRESENT", "LATE", "ABSENT", "EXCUSED"].includes(student.status))) && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Scheduled
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
