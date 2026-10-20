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
  Users,
  Check,
  TrendingUp,
  RefreshCw,
  Sparkles,
  BookOpen,
  ChevronRight,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SessionItem {
  eventId: string;
  classTitle: string;
  courseId: string;
  courseTitle: string;
  dueDate: string;
  type: string;
  status: string;
  tutorStatus: string;
  tutorJoinedAt: string | null;
  studentAttendeesCount: number;
  meetingLink: string;
}

interface RosterStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar: string | null;
  studentRegId: string | null;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
  joinedAt: string | null;
  durationMinutes: number;
  markedBy: string;
  notes: string;
  attendanceId: string | null;
}

interface ClassRosterData {
  event: {
    id: string;
    title: string;
    dueDate: string;
    courseTitle: string;
    courseId: string;
    tutorName: string;
    tutorAttendance: any;
  };
  roster: RosterStudent[];
  stats: {
    totalEnrolled: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    attendanceRate: number;
  };
}

export function TutorAttendanceTracker({ tutorId }: { tutorId?: string }) {
  const [activeTab, setActiveTab] = useState<"roster" | "teaching_log">("roster");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // Selected session for roster inspection
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [rosterData, setRosterData] = useState<ClassRosterData | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  // Search in roster
  const [rosterSearch, setRosterSearch] = useState("");

  const fetchTutorData = async () => {
    try {
      setLoading(true);
      const url = tutorId
        ? `/api/attendance?view=tutor&tutorId=${encodeURIComponent(tutorId)}`
        : `/api/attendance?view=tutor`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || null);
        setSessions(data.sessions || []);
        setCourses(data.courses || []);

        // Default to first session if not already set
        if (!selectedEventId && data.sessions && data.sessions.length > 0) {
          setSelectedEventId(data.sessions[0].eventId);
        }
      }
    } catch (err) {
      console.error("[TutorAttendanceTracker] Error fetching tutor attendance:", err);
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
      console.error("[TutorAttendanceTracker] Error fetching roster:", err);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    fetchTutorData();
  }, [tutorId]);

  useEffect(() => {
    if (selectedEventId) {
      fetchRoster(selectedEventId);
    }
  }, [selectedEventId]);

  // Update a student's attendance status
  const handleUpdateStudentStatus = async (
    studentUserId: string,
    newStatus: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED",
    attendanceId?: string | null
  ) => {
    if (!selectedEventId) return;
    try {
      setSavingStudentId(studentUserId);
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          userId: studentUserId,
          attendanceId: attendanceId || undefined,
          status: newStatus,
        }),
      });

      if (res.ok) {
        // Optimistically update local roster
        setRosterData((prev) => {
          if (!prev) return prev;
          const updatedRoster = prev.roster.map((s) =>
            s.studentId === studentUserId ? { ...s, status: newStatus } : s
          );
          const present = updatedRoster.filter((s) => s.status === "PRESENT").length;
          const late = updatedRoster.filter((s) => s.status === "LATE").length;
          const absent = updatedRoster.filter((s) => s.status === "ABSENT").length;
          const excused = updatedRoster.filter((s) => s.status === "EXCUSED").length;
          const rate =
            updatedRoster.length > 0
              ? Math.round(((present + late) / updatedRoster.length) * 100)
              : 0;

          return {
            ...prev,
            roster: updatedRoster,
            stats: {
              ...prev.stats,
              presentCount: present,
              lateCount: late,
              absentCount: absent,
              excusedCount: excused,
              attendanceRate: rate,
            },
          };
        });
      }
    } catch (err) {
      console.error("[TutorAttendanceTracker] Error updating student status:", err);
    } finally {
      setSavingStudentId(null);
    }
  };

  // Mark all enrolled students as PRESENT
  const handleMarkAllPresent = async () => {
    if (!selectedEventId || !rosterData || rosterData.roster.length === 0) return;
    try {
      setLoadingRoster(true);
      const updates = rosterData.roster.map((s) => ({
        userId: s.studentId,
        status: "PRESENT",
      }));

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          updates,
        }),
      });

      if (res.ok) {
        await fetchRoster(selectedEventId);
      }
    } catch (err) {
      console.error("[TutorAttendanceTracker] Error marking all present:", err);
    } finally {
      setLoadingRoster(false);
    }
  };

  // Filtered roster students
  const filteredRoster = useMemo(() => {
    if (!rosterData) return [];
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return rosterData.roster;
    return rosterData.roster.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.studentEmail.toLowerCase().includes(q) ||
        (s.studentRegId && s.studentRegId.toLowerCase().includes(q))
    );
  }, [rosterData, rosterSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Class Attendance &amp; Teaching Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time student participation and your personal teaching delivery records for accredited online classes.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("roster")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "roster"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Class Session Roster
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("teaching_log")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "teaching_log"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              My Teaching Log
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchTutorData}
            disabled={loading}
            className="rounded-xl border-slate-200 text-xs font-semibold gap-1.5 h-9 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Tutor Delivery Rate */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
            <span>Teaching Delivery Rate</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-950">
            {stats ? `${stats.tutorDeliveryRate}%` : "100%"}
          </div>
          <p className="text-[11px] text-blue-700">
            {stats ? `${stats.totalConducted} of ${stats.totalClassesScheduled} sessions held` : "—"}
          </p>
        </div>

        {/* Total Student Attendees */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
            <span>Total Attendees</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
            {stats ? stats.totalStudentAttendees : "0"}
          </div>
          <p className="text-[11px] text-emerald-700">
            Across all online classes
          </p>
        </div>

        {/* Average Class Attendance */}
        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-900">
            <span>Avg Students / Class</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-950">
            {stats ? stats.avgAttendeesPerClass : "0"}
          </div>
          <p className="text-[11px] text-sky-700">
            Average attendance per lecture
          </p>
        </div>

        {/* Classes Scheduled */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Classes Assigned</span>
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats ? stats.totalClassesScheduled : "0"}
          </div>
          <p className="text-[11px] text-slate-500">
            {courses.length} active curriculum modules
          </p>
        </div>
      </div>

      {/* VIEW 1: CLASS SESSION ROSTER */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          {/* Class Session Selector Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Select Online Class Session:
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full sm:max-w-md px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                {sessions.length === 0 ? (
                  <option value="">No online class sessions scheduled</option>
                ) : (
                  sessions.map((s) => {
                    const d = new Date(s.dueDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    });
                    return (
                      <option key={s.eventId} value={s.eventId}>
                        {d} • {s.classTitle} ({s.courseTitle})
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Quick Actions */}
            {rosterData && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkAllPresent}
                  disabled={loadingRoster}
                  className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold gap-1.5 h-9 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Mark All Present
                </Button>

                {sessions.find((s) => s.eventId === selectedEventId)?.meetingLink && (
                  <a
                    href={sessions.find((s) => s.eventId === selectedEventId)!.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Enter Meeting
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Session Overview Stats Banner */}
          {rosterData && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                  Active Session Attendance Summary
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {rosterData.event.title}
                </h3>
                <p className="text-xs text-slate-300">
                  {rosterData.event.courseTitle} •{" "}
                  {new Date(rosterData.event.dueDate).toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center px-3 py-1.5 rounded-xl bg-white/10">
                  <div className="text-lg font-bold text-emerald-400">
                    {rosterData.stats.presentCount + rosterData.stats.lateCount} / {rosterData.stats.totalEnrolled}
                  </div>
                  <div className="text-[10px] text-slate-300 font-medium">Attended</div>
                </div>

                <div className="text-center px-3 py-1.5 rounded-xl bg-white/10">
                  <div className="text-lg font-bold text-blue-400">
                    {rosterData.stats.attendanceRate}%
                  </div>
                  <div className="text-[10px] text-slate-300 font-medium">Attendance Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Roster Search Bar */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search enrolled students by name, email, or student ID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              />
            </div>
            <span className="text-xs text-slate-500 shrink-0 font-medium hidden sm:inline">
              Click status pills to manually override
            </span>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Student Roster ({filteredRoster.length} students)
              </h4>
              <span className="text-[11px] text-slate-500">
                Automatic tracking via live room joins
              </span>
            </div>

            {loadingRoster ? (
              <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p>Loading session roster...</p>
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="py-16 text-center px-4">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h5 className="text-sm font-bold text-slate-800">No students enrolled yet</h5>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Enrolled students for this curriculum will appear here with automated join tracking.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRoster.map((student) => {
                  const isSaving = savingStudentId === student.studentId;
                  return (
                    <div
                      key={student.studentId}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                    >
                      {/* Student Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-xs text-xs">
                          {student.studentName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {student.studentName}
                            </span>
                            {student.studentRegId && (
                              <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                {student.studentRegId}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {student.studentEmail}
                            {student.joinedAt && (
                              <span className="text-emerald-700 ml-2 font-medium">
                                • Joined at {new Date(student.joinedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Toggle Pills */}
                      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                        {(["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const).map((st) => {
                          const isActive = student.status === st;
                          let activeClass = "";
                          if (st === "PRESENT") activeClass = "bg-emerald-600 text-white font-bold shadow-xs";
                          if (st === "LATE") activeClass = "bg-amber-600 text-white font-bold shadow-xs";
                          if (st === "ABSENT") activeClass = "bg-red-600 text-white font-bold shadow-xs";
                          if (st === "EXCUSED") activeClass = "bg-blue-600 text-white font-bold shadow-xs";

                          return (
                            <button
                              key={st}
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleUpdateStudentStatus(student.studentId, st, student.attendanceId)}
                              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                                isActive
                                  ? activeClass
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                              }`}
                            >
                              {st === "PRESENT" && "✓ Present"}
                              {st === "LATE" && "⏱ Late"}
                              {st === "ABSENT" && "✗ Absent"}
                              {st === "EXCUSED" && "ℹ Excused"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: TEACHING LOG */}
      {activeTab === "teaching_log" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Teaching Delivery Records ({sessions.length} sessions)
            </h4>
            <span className="text-[11px] text-slate-500">
              Verified BigBlueButton virtual classroom sessions
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="py-16 text-center px-4">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h5 className="text-sm font-bold text-slate-800">No sessions conducted yet</h5>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Conducted class sessions and consultations will automatically record here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sessions.map((sess) => {
                const dateObj = new Date(sess.dueDate);
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
                    key={sess.eventId}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {sess.classTitle}
                        </span>
                        {sess.tutorStatus === "PRESENT" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                            ✓ Delivered
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">
                            {sess.tutorStatus}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {sess.courseTitle}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formattedDate} at {formattedTime}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                          {sess.studentAttendeesCount} students attended
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedEventId(sess.eventId);
                          setActiveTab("roster");
                        }}
                        className="rounded-xl border-slate-200 text-xs font-semibold gap-1.5 h-9 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        View Student Roster
                      </Button>

                      {sess.meetingLink && (
                        <a
                          href={sess.meetingLink}
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
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
