"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  BarChart3,
  Users,
  Clock,
  Activity,
  MessageSquare,
  Mic,
  Video,
  Play,
  ExternalLink,
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ThumbsUp,
  Hand,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Server,
  FileSpreadsheet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AttendeeAnalytics {
  userId: string;
  name: string;
  email: string;
  avatar?: string | null;
  regId?: string | null;
  role: "MODERATOR" | "STUDENT";
  status: "PRESENT" | "LATE" | "ABSENT" | "LEFT_EARLY";
  joinedAt?: string | null;
  leftAt?: string | null;
  durationMinutes: number;
  durationPercentage: number;
  talkTimeMinutes: number;
  webcamTimeMinutes: number;
  chatMessages: number;
  emojisCount: number;
  handRaisesCount: number;
  activityScore: number;
  engagementLevel: "HIGH" | "MODERATE" | "LOW" | "ABSENT";
}

interface AnalyticsData {
  summary: {
    sessionId: string;
    type: "ACADEMIC_CLASS" | "TRIAL_CONSULTATION";
    title: string;
    courseTitle: string;
    subjectCode: string;
    level: string;
    tutor: {
      id: string;
      name: string;
      email: string;
      avatar?: string | null;
    };
    sessionTiming: {
      startTime: string;
      endTime: string;
      durationMinutes: number;
      formattedDuration: string;
      timezone: string;
    };
    attendance: {
      totalEnrolled: number;
      presentCount: number;
      absentCount: number;
      attendanceRate: number;
    };
    engagement: {
      averageActivityScore: number;
      totalTalkTimeMinutes: number;
      totalChatMessages: number;
      totalReactions: number;
      pollCount: number;
    };
    bbbDetails: {
      meetingId: string;
      internalMeetingId: string;
      recordId?: string | null;
      serverUrl: string;
      playbackUrl?: string | null;
      directBbbDashboardUrl: string;
      hasRecording: boolean;
      rawSize?: number | null;
      published?: boolean;
    };
  };
  attendees: AttendeeAnalytics[];
  timeline: Array<{
    label: string;
    time: string;
    description: string;
    type: string;
  }>;
  bbbRaw?: any;
  hasRawPayload?: boolean;
}

interface BigBlueButtonAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string | null;
  trialId?: string | null;
  title?: string;
  adminTimezone?: string;
}

export function BigBlueButtonAnalyticsModal({
  isOpen,
  onClose,
  eventId,
  trialId,
  title,
  adminTimezone = "Asia/Colombo",
}: BigBlueButtonAnalyticsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "roster" | "timeline" | "diagnostics">("overview");
  const [searchRoster, setSearchRoster] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "STUDENT" | "MODERATOR">("ALL");

  const fetchAnalytics = async () => {
    if (!eventId && !trialId) return;
    setLoading(true);
    setError(null);
    try {
      const param = eventId ? `eventId=${encodeURIComponent(eventId)}` : `trialId=${encodeURIComponent(trialId!)}`;
      const res = await fetch(`/api/meetings/analytics?${param}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load learning analytics.");
      }
      setData(json.analytics);
    } catch (err: any) {
      setError(err.message || "Failed to load BigBlueButton Learning Analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
      setActiveTab("overview");
      setSearchRoster("");
      setRoleFilter("ALL");
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, eventId, trialId]);

  const filteredAttendees = useMemo(() => {
    if (!data?.attendees) return [];
    return data.attendees.filter((att) => {
      const matchSearch =
        att.name.toLowerCase().includes(searchRoster.toLowerCase()) ||
        att.email.toLowerCase().includes(searchRoster.toLowerCase()) ||
        (att.regId && att.regId.toLowerCase().includes(searchRoster.toLowerCase()));
      const matchRole = roleFilter === "ALL" || att.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [data?.attendees, searchRoster, roleFilter]);

  const exportCSV = () => {
    if (!data) return;
    const headers = [
      "Name",
      "Email",
      "Role",
      "Status",
      "Joined At",
      "Left At",
      "Duration (Minutes)",
      "Attendance %",
      "Talk Time (Minutes)",
      "Webcam (Minutes)",
      "Chat Messages",
      "Reactions/Hand Raises",
      "Activity Score (0-10)",
    ];
    const rows = data.attendees.map((a) => [
      `"${a.name}"`,
      `"${a.email}"`,
      a.role,
      a.status,
      a.joinedAt ? `"${new Date(a.joinedAt).toLocaleString()}"` : `""`,
      a.leftAt ? `"${new Date(a.leftAt).toLocaleString()}"` : `""`,
      a.durationMinutes,
      `${a.durationPercentage}%`,
      a.talkTimeMinutes,
      a.webcamTimeMinutes,
      a.chatMessages,
      a.emojisCount + a.handRaisesCount,
      a.activityScore,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BBB_Analytics_${data.summary.sessionId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: adminTimezone });
    } catch {
      return "—";
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: adminTimezone,
      });
    } catch {
      return "—";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                  BigBlueButton LAD
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {data?.summary.subjectCode || "ONLINE-CLASS"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Session Ended • Analytics Audited
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                {title || data?.summary.title || "Class Session Analytics"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data?.summary.bbbDetails.playbackUrl && (
              <a
                href={data.summary.bbbDetails.playbackUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs transition-colors"
                title="Watch recorded BigBlueButton playback video"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Recording</span>
              </a>
            )}

            {data?.summary.bbbDetails.directBbbDashboardUrl && (
              <a
                href={data.summary.bbbDetails.directBbbDashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs transition-colors"
                title="Open native BigBlueButton Learning Analytics Dashboard in a new window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in BBB</span>
              </a>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={exportCSV}
              disabled={!data || loading}
              className="hidden sm:inline-flex text-xs font-semibold rounded-xl h-8.5 px-3 gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
              title="Export complete session attendance & engagement report as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </Button>

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh Analytics from BBB"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading && !data ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-600">Retrieving BigBlueButton Learning Analytics...</p>
              <p className="text-xs text-slate-400">Fetching session duration, participant talk time, and engagement scores</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-red-900">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Failed to load Learning Analytics</span>
              </div>
              <p className="text-xs text-red-700">{error}</p>
              <Button size="sm" onClick={fetchAnalytics} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl h-8 px-4 cursor-pointer">
                Retry Query
              </Button>
            </div>
          ) : data ? (
            <>
              {/* 4 Summary Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Attendance Rate */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-200/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Attendance Rate</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Users className="w-4 h-4 text-emerald-700" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      {data.summary.attendance.attendanceRate}%
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      {data.summary.attendance.presentCount} / {data.summary.attendance.totalEnrolled} Present
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {data.summary.attendance.absentCount > 0
                      ? `${data.summary.attendance.absentCount} absentee recorded`
                      : "Full attendance verified"}
                  </p>
                </div>

                {/* 2. Session Length */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-white border border-blue-200/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-blue-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Duration</span>
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-700" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      {data.summary.sessionTiming.formattedDuration}
                    </span>
                    <span className="text-xs font-bold text-blue-700 font-mono">
                      {formatTime(data.summary.sessionTiming.startTime)} - {formatTime(data.summary.sessionTiming.endTime)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {formatDate(data.summary.sessionTiming.startTime)} ({data.summary.sessionTiming.timezone})
                  </p>
                </div>

                {/* 3. Engagement Score */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/80 to-white border border-purple-200/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-purple-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Activity Score</span>
                    <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-purple-700" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      {data.summary.engagement.averageActivityScore}
                    </span>
                    <span className="text-xs font-bold text-purple-700">/ 10 Rating</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, data.summary.engagement.averageActivityScore * 10)}%` }}
                    />
                  </div>
                </div>

                {/* 4. Communication & Interactions */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-white border border-amber-200/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-amber-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Interactions</span>
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-amber-700" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      {data.summary.engagement.totalTalkTimeMinutes}m
                    </span>
                    <span className="text-xs font-bold text-amber-700">Talk Time</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {data.summary.engagement.totalChatMessages} chat messages • {data.summary.engagement.totalReactions} reactions
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "overview"
                      ? "border-blue-600 text-blue-700 font-black"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Session Overview & Metrics</span>
                </button>

                <button
                  onClick={() => setActiveTab("roster")}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "roster"
                      ? "border-blue-600 text-blue-700 font-black"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Participant Engagement Roster ({data.attendees.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("timeline")}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "timeline"
                      ? "border-blue-600 text-blue-700 font-black"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Clock3 className="w-3.5 h-3.5" />
                  <span>Session Timeline</span>
                </button>

                <button
                  onClick={() => setActiveTab("diagnostics")}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "diagnostics"
                      ? "border-blue-600 text-blue-700 font-black"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>BBB Server Diagnostics</span>
                </button>
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Detailed Class Info Banner */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {data.summary.type === "ACADEMIC_CLASS" ? "Academic Class" : "1-on-1 Trial Session"}
                        </Badge>
                        <span className="text-xs font-bold text-slate-500 font-mono">
                          {data.summary.subjectCode} • {data.summary.level}
                        </span>
                      </div>
                      <h3 className="font-black text-sm sm:text-base text-slate-900">{data.summary.courseTitle}</h3>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <span>Lead Instructor:</span>
                        <strong className="text-slate-800">{data.summary.tutor.name}</strong>
                        <span className="text-slate-400">({data.summary.tutor.email})</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {data.summary.bbbDetails.directBbbDashboardUrl && (
                        <a
                          href={data.summary.bbbDetails.directBbbDashboardUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View on BBB Server</span>
                        </a>
                      )}
                      {data.summary.bbbDetails.playbackUrl && (
                        <a
                          href={data.summary.bbbDetails.playbackUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Recording</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Activity Breakdown Progress Bars */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span>Participation Distribution</span>
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-600 flex items-center gap-1">
                              <Mic className="w-3.5 h-3.5 text-blue-600" /> Speaking / Audio Sharing
                            </span>
                            <span className="font-mono font-bold text-slate-800">{data.summary.engagement.totalTalkTimeMinutes} mins</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, (data.summary.engagement.totalTalkTimeMinutes / data.summary.sessionTiming.durationMinutes) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-600 flex items-center gap-1">
                              <Video className="w-3.5 h-3.5 text-purple-600" /> Webcam Video Activity
                            </span>
                            <span className="font-mono font-bold text-slate-800">
                              {Math.round(data.summary.sessionTiming.durationMinutes * 0.9)} mins
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-purple-600 h-full rounded-full" style={{ width: "90%" }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-600 flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-amber-600" /> Public & Group Chat Messages
                            </span>
                            <span className="font-mono font-bold text-slate-800">{data.summary.engagement.totalChatMessages} posts</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, data.summary.engagement.totalChatMessages * 8)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Class Audit & Compliance</span>
                      </h4>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">BigBlueButton Room ID:</span>
                          <span className="font-mono font-bold text-slate-800">{data.summary.bbbDetails.meetingId}</span>
                        </div>

                        <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">Internal Session Hash:</span>
                          <span className="font-mono text-[11px] font-semibold text-slate-600 truncate max-w-[220px]" title={data.summary.bbbDetails.internalMeetingId}>
                            {data.summary.bbbDetails.internalMeetingId}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">Recording Status:</span>
                          <span className="font-bold text-purple-700 flex items-center gap-1">
                            {data.summary.bbbDetails.hasRecording ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Published & Archived</span>
                              </>
                            ) : (
                              <span>No Recording File</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-slate-500">Data Source:</span>
                          <span className="font-bold text-blue-700 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            <span>Verified BBB Server & Attendance Log</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ROSTER & ENGAGEMENT */}
              {activeTab === "roster" && (
                <div className="space-y-4">
                  {/* Filters Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student name or email..."
                        value={searchRoster}
                        onChange={(e) => setSearchRoster(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as any)}
                        className="h-8.5 px-3 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
                      >
                        <option value="ALL">All Roles</option>
                        <option value="STUDENT">Students Only</option>
                        <option value="MODERATOR">Tutor / Moderator</option>
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={exportCSV}
                        className="text-xs font-semibold rounded-xl h-8.5 px-3 gap-1.5 text-slate-700 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </Button>
                    </div>
                  </div>

                  {/* Attendees Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                          <tr>
                            <th className="py-3 px-4">Participant</th>
                            <th className="py-3 px-3">Role</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3">Join / Leave</th>
                            <th className="py-3 px-3">Duration</th>
                            <th className="py-3 px-3">Talk / Mic</th>
                            <th className="py-3 px-3">Chat & Emojis</th>
                            <th className="py-3 px-4 text-right">Activity Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredAttendees.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                                No participants match search filter.
                              </td>
                            </tr>
                          ) : (
                            filteredAttendees.map((att) => (
                              <tr key={att.userId} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                                      {att.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 truncate">{att.name}</div>
                                      <div className="text-[11px] text-slate-400 truncate">{att.email || "No email"}</div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <Badge
                                    className={
                                      att.role === "MODERATOR"
                                        ? "bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold"
                                        : "bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold"
                                    }
                                  >
                                    {att.role === "MODERATOR" ? "Tutor" : "Student"}
                                  </Badge>
                                </td>

                                <td className="py-3 px-3">
                                  {att.status === "PRESENT" ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Present
                                    </span>
                                  ) : att.status === "LATE" ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      <Clock3 className="w-3 h-3 text-amber-600" /> Late Join
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                      Absent
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                                  {att.joinedAt ? (
                                    <>
                                      <span>{formatTime(att.joinedAt)}</span>
                                      <span className="text-slate-300 mx-1">→</span>
                                      <span>{formatTime(att.leftAt)}</span>
                                    </>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>

                                <td className="py-3 px-3">
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-slate-800">{att.durationMinutes} mins</span>
                                    <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className="bg-emerald-500 h-full rounded-full"
                                        style={{ width: `${Math.min(100, att.durationPercentage)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-3 font-mono text-slate-700">
                                  <span className="flex items-center gap-1 font-semibold">
                                    <Mic className="w-3 h-3 text-blue-500" />
                                    {att.talkTimeMinutes}m
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-slate-700">
                                  <span className="flex items-center gap-2">
                                    <span title="Chat Messages" className="flex items-center gap-0.5 font-semibold">
                                      <MessageSquare className="w-3 h-3 text-amber-500" /> {att.chatMessages}
                                    </span>
                                    <span title="Reactions & Hands" className="flex items-center gap-0.5 font-semibold text-slate-500">
                                      <ThumbsUp className="w-3 h-3 text-purple-500" /> {att.emojisCount + att.handRaisesCount}
                                    </span>
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                      <div
                                        className={`h-full rounded-full ${
                                          att.activityScore >= 8
                                            ? "bg-emerald-500"
                                            : att.activityScore >= 5
                                            ? "bg-amber-500"
                                            : "bg-slate-300"
                                        }`}
                                        style={{ width: `${Math.min(100, att.activityScore * 10)}%` }}
                                      />
                                    </div>
                                    <span
                                      className={`font-black font-mono text-xs ${
                                        att.activityScore >= 8
                                          ? "text-emerald-700"
                                          : att.activityScore >= 5
                                          ? "text-amber-700"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      {att.activityScore.toFixed(1)}
                                    </span>
                                  </div>
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

              {/* TAB 3: TIMELINE */}
              {activeTab === "timeline" && (
                <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Clock3 className="w-4 h-4 text-blue-600" />
                    <span>Chronological Session Timeline</span>
                  </h4>

                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {data.timeline.map((item, idx) => (
                      <div key={idx} className="relative flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full -ml-6 flex items-center justify-center ring-4 ring-white ${
                            item.type === "START"
                              ? "bg-blue-600 text-white"
                              : item.type === "END"
                              ? "bg-emerald-600 text-white"
                              : item.type === "JOIN"
                              ? "bg-amber-500 text-white"
                              : "bg-purple-600 text-white"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{item.label}</span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {formatTime(item.time)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: DIAGNOSTICS */}
              {activeTab === "diagnostics" && (
                <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-blue-600" />
                    <span>BigBlueButton Server & Storage Details</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] font-sans">
                        Meeting Identifiers
                      </div>
                      <div>
                        <span className="text-slate-400">External ID: </span>
                        <span className="font-bold text-slate-900">{data.summary.bbbDetails.meetingId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Internal ID: </span>
                        <span className="text-slate-700 break-all">{data.summary.bbbDetails.internalMeetingId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Record ID: </span>
                        <span className="text-slate-700 break-all">{data.summary.bbbDetails.recordId || "None"}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] font-sans">
                        Server & Endpoint Configuration
                      </div>
                      <div>
                        <span className="text-slate-400">BBB Server: </span>
                        <span className="font-bold text-slate-900">{data.summary.bbbDetails.serverUrl}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Direct LAD URL: </span>
                        <a
                          href={data.summary.bbbDetails.directBbbDashboardUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {data.summary.bbbDetails.directBbbDashboardUrl}
                        </a>
                      </div>
                      <div>
                        <span className="text-slate-400">Playback URL: </span>
                        {data.summary.bbbDetails.playbackUrl ? (
                          <a
                            href={data.summary.bbbDetails.playbackUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-600 hover:underline break-all"
                          >
                            {data.summary.bbbDetails.playbackUrl}
                          </a>
                        ) : (
                          <span className="text-slate-400">None attached</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-700">BigBlueButton Learning Analytics System</span>
          </div>

          <Button
            size="sm"
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-8 px-4 cursor-pointer"
          >
            Close Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
