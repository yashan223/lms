"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import {
  GraduationCap,
  Users,
  Calendar,
  Video,
  BookOpen,
  Award,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Edit3,
  UserCheck,
  Mail,
  Phone,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Sliders,
  FileText,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Download,
  Info,
  Loader2,
  PlayCircle,
  MessageSquareLock,
  X,
  Radio,
} from "lucide-react";
import { EncryptedChatDrawer } from "@/components/chat/EncryptedChatDrawer";

interface EnrolledCourseInfo {
  courseId: string;
  courseTitle: string;
  subjectCode?: string;
  enrolledAt: string;
}

interface StudentRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  headline: string;
  enrolledCourses: EnrolledCourseInfo[];
  latestEnrollment: string;
}

interface TutorCourse {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  subjectCode?: string;
  category: string;
  price: number;
  modules?: any[];
  materials?: any[];
  enrollments?: any[];
}

interface ScheduledClassEvent {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  type: string;
  status?: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED" | string;
  meetingLink?: string | null;
  courseId?: string;
  course?: {
    id: string;
    title: string;
    slug: string;
    subjectCode?: string;
  };
}

function TutorDashboardContent() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "overview" | "students" | "classes" | "calendar" | "profile" | "courses"
  >("overview");

  const [loading, setLoading] = useState(true);
  const [tutor, setTutor] = useState<any>(null);
  const [courses, setCourses] = useState<TutorCourse[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [events, setEvents] = useState<ScheduledClassEvent[]>([]);
  const [trials, setTrials] = useState<any[]>([]);

  // Search & Filter States
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");

  // Schedule Class Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"COURSE" | "STUDENT">("COURSE");
  const [newClassStudentId, setNewClassStudentId] = useState("");
  const [newClassTitle, setNewClassTitle] = useState("");
  const [newClassCourseId, setNewClassCourseId] = useState("");
  const [newClassDate, setNewClassDate] = useState("");
  const [newClassMeetingLink, setNewClassMeetingLink] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [newClassType, setNewClassType] = useState("LIVE_SEMINAR");
  const [schedulingClass, setSchedulingClass] = useState(false);
  const [startingClassId, setStartingClassId] = useState<string | null>(null);
  const [endingClassId, setEndingClassId] = useState<string | null>(null);

  // Selected Student Modal
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentRecord | null>(null);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [activeChatRecipientId, setActiveChatRecipientId] = useState<string | undefined>(undefined);

  // Profile Edit State
  const [profileName, setProfileName] = useState("");
  const [profileHeadline, setProfileHeadline] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatusMsg, setProfileStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Confirmation Modal
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "danger" | "warning" | "success";
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "danger",
    onConfirm: async () => {},
  });

  // Fetch all Tutor Data from Backend
  const fetchTutorData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tutor", {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setTutor(data.tutor);
        setCourses(data.courses || []);
        setStudents(data.students || []);
        setEvents(data.events || []);
        setTrials(data.trials || []);

        // Pre-fill profile state
        if (data.tutor) {
          setProfileName(data.tutor.name || "");
          setProfileHeadline(data.tutor.headline || "");
          setProfileBio(data.tutor.bio || "");
          setProfilePhone(data.tutor.phone || "");
          setProfileAvatar(data.tutor.avatar || "");
        }
      }
    } catch (err) {
      console.error("Error fetching tutor dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutorData();
  }, []);

  // Real-time Live Synchronization Hook
  const { isConnected: realtimeConnected } = useRealtimeSync({
    onSync: () => {
      fetchTutorData();
    },
  });

  // Handle Profile Update Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutor?.id) return;

    try {
      setProfileSaving(true);
      setProfileStatusMsg(null);

      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          tutorId: tutor.id,
          name: profileName,
          headline: profileHeadline,
          bio: profileBio,
          phone: profilePhone,
          avatar: profileAvatar,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfileStatusMsg({
          type: "success",
          text: "Academic qualifications and profile updated successfully!",
        });
        await fetchTutorData();
      } else {
        setProfileStatusMsg({
          type: "error",
          text: data.error || "Failed to update profile details.",
        });
      }
    } catch (err: any) {
      setProfileStatusMsg({
        type: "error",
        text: err.message || "Connection error during profile save.",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Schedule Class Submit
  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassTitle.trim() || !newClassDate) return;

    try {
      setSchedulingClass(true);

      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule_class",
          tutorId: tutor?.id,
          title: newClassTitle.trim(),
          courseId: scheduleMode === "COURSE" ? (newClassCourseId || courses[0]?.id || null) : (newClassCourseId || null),
          studentId: scheduleMode === "STUDENT" ? newClassStudentId : null,
          scheduledDate: new Date(newClassDate).toISOString(),
          meetingLink: newClassMeetingLink.trim(),
          description: newClassDesc.trim(),
          type: newClassType,
        }),
      });

      if (res.ok) {
        setShowScheduleModal(false);
        setNewClassTitle("");
        setNewClassDate("");
        setNewClassMeetingLink("");
        setNewClassDesc("");
        setNewClassStudentId("");
        await fetchTutorData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to schedule class.");
      }
    } catch (err) {
      console.error("Schedule class error:", err);
      alert("Error connecting to scheduler service.");
    } finally {
      setSchedulingClass(false);
    }
  };

  // Handle Start Live Class (Tutor Action)
  const handleStartClass = async (event: ScheduledClassEvent) => {
    try {
      setStartingClassId(event.id);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_class",
          eventId: event.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const linkToOpen = data.meetingLink || event.meetingLink || (event.description?.match(/https:\/\/meet\.google\.com\/[^\s]+/i)?.[0]);
        if (linkToOpen) {
          window.open(linkToOpen, "_blank");
        }
        await fetchTutorData();
      }
    } catch (err) {
      console.error("Error starting class:", err);
    } finally {
      setStartingClassId(null);
    }
  };

  // Handle End Live Class (Tutor Action)
  const handleEndClass = async (event: ScheduledClassEvent) => {
    try {
      setEndingClassId(event.id);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_class",
          eventId: event.id,
        }),
      });

      if (res.ok) {
        await fetchTutorData();
      }
    } catch (err) {
      console.error("Error ending class:", err);
    } finally {
      setEndingClassId(null);
    }
  };

  // Handle Delete Class
  const handleDeleteClass = (event: ScheduledClassEvent) => {
    setConfirmModalData({
      isOpen: true,
      title: `Cancel Class Session?`,
      description: `Are you sure you want to cancel "${event.title}"? Enrolled students will be notified of the schedule change.`,
      variant: "danger",
      onConfirm: async () => {
        try {
          await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete_class",
              eventId: event.id,
            }),
          });
          await fetchTutorData();
        } catch (err) {
          console.error("Error cancelling class:", err);
        }
      },
    });
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.enrolledCourses.some((c) =>
          c.courseTitle.toLowerCase().includes(studentSearch.toLowerCase())
        );

      const matchCourse =
        selectedCourseFilter === "ALL" ||
        s.enrolledCourses.some((c) => c.courseId === selectedCourseFilter);

      return matchSearch && matchCourse;
    });
  }, [students, studentSearch, selectedCourseFilter]);

  // Filtered Scheduled Classes
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (classFilter === "ALL") return true;
      if (classFilter === "SEMINARS") return ev.type === "LIVE_SEMINAR";
      if (classFilter === "UPCOMING") return new Date(ev.dueDate) >= new Date();
      return true;
    });
  }, [events, classFilter]);

  // Total enrolled count across all tutor courses
  const totalEnrolledCount = useMemo(() => {
    return students.length;
  }, [students]);

  // Total lessons authored
  const totalLessonsCount = useMemo(() => {
    return courses.reduce(
      (acc, c) =>
        acc +
        (c.modules?.reduce(
          (mAcc: number, m: any) => mAcc + (m.lessons?.length || 0),
          0
        ) || 0),
      0
    );
  }, [courses]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <Navbar />

      {/* 1. TUTOR STUDIO TOP HEADER & BANNER */}
      <section className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Faculty Identity */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={
                    tutor?.avatar ||
                    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                  }
                  alt={tutor?.name || "Faculty Tutor"}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/20 shadow-sm"
                />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {tutor?.name || "Dr. Sarah Jenkins"}
                  </h1>
                  <Badge
                    variant="roleInstructor"
                    className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider"
                  >
                    Senior Faculty Tutor
                  </Badge>
                </div>
                <p className="text-xs text-blue-700 font-semibold truncate mt-0.5">
                  {tutor?.headline || "Senior Lead Lecturer in Pure Mathematics & Mechanics"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {tutor?.email || "tutor@edupulse.uk"} • Authorized Faculty #FAC-7819
                </p>
              </div>
            </div>

            {/* Quick Action Buttons & Real-Time Sync Indicator */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Real-time Status Badge removed */}

              {/* Fast Schedule Class Button */}
              <Button
                size="sm"
                onClick={() => setShowScheduleModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 shadow-sm shadow-blue-600/20 cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                <span>+ Schedule Live Class</span>
              </Button>

              {/* Refresh Data Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={fetchTutorData}
                disabled={loading}
                className="text-xs font-bold text-slate-700 h-9 rounded-xl border-slate-200 hover:bg-slate-50 gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-blue-600 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {/* 2. NAVIGATION TABS */}
          <div className="flex items-center gap-1 sm:gap-2 mt-6 overflow-x-auto border-b border-slate-100 pb-0">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 sm:px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-blue-600 text-blue-700 bg-blue-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("students")}
              className={`px-3 sm:px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "students"
                  ? "border-blue-600 text-blue-700 bg-blue-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>My Students ({students.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("classes")}
              className={`px-3 sm:px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "classes"
                  ? "border-blue-600 text-blue-700 bg-blue-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Video className="w-3.5 h-3.5 text-purple-600" />
              <span>Assigned Classes ({events.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-3 sm:px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "calendar"
                  ? "border-blue-600 text-blue-700 bg-blue-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Academic Calendar</span>
            </button>

            <button
              onClick={() => setActiveTab("courses")}
              className={`px-3 sm:px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "courses"
                  ? "border-blue-600 text-blue-700 bg-blue-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>My Courses ({courses.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`px-3 sm:px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "profile"
                  ? "border-blue-600 text-blue-700 bg-blue-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Profile & Qualifications</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. MAIN TAB CONTENT */}
      <main className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Metric Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Total Enrolled Students
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {totalEnrolledCount} Scholars
                </div>
                <div className="text-[11px] text-blue-600 font-semibold">
                  Across {courses.length} Assigned Masterclasses
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Scheduled Live Classes
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Video className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {events.length} Sessions
                </div>
                <div className="text-[11px] text-purple-700 font-semibold">
                  Interactive Live Seminars
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Syllabus Modules & Lessons
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {totalLessonsCount} Lessons
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold">
                  Author & Masterclass Lead
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Faculty Accreditation
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  Verified
                </div>
                <div className="text-[11px] text-amber-700 font-semibold">
                  London A/L Faculty Fellow
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Schedule Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Upcoming Live Classes */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Upcoming Assigned Classes & Live Seminars
                    </h3>
                    <p className="text-xs text-slate-500">
                      Scheduled video walkthroughs, Q&A sessions, and problem workshops
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowScheduleModal(true)}
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl h-8 cursor-pointer"
                  >
                    + New Class
                  </Button>
                </div>

                {events.length > 0 ? (
                  <div className="space-y-3">
                    {events.slice(0, 5).map((ev) => (
                      <div
                        key={ev.id}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Video className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                {ev.title}
                              </h4>
                              {ev.status === "LIVE" && (
                                <Badge className="bg-red-600 text-white text-[9px] font-black uppercase flex items-center gap-1">
                                  <Radio className="w-2.5 h-2.5 animate-pulse text-white" />
                                  <span>LIVE NOW</span>
                                </Badge>
                              )}
                              <Badge className="text-[9px] px-1.5 py-0 bg-purple-100 text-purple-800 font-bold">
                                {ev.type === "LIVE_SEMINAR" ? "Live Seminar" : "Class"}
                              </Badge>
                            </div>
                            {ev.course && (
                              <p className="text-xs text-blue-700 font-semibold truncate mt-0.5">
                                {ev.course.title}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {new Date(ev.dueDate).toLocaleString("en-GB", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {ev.status === "LIVE" ? (
                            <>
                              <a
                                href={ev.meetingLink || (ev.description?.match(/https?:\/\/[^\s]+/)?.[0]) || "https://meet.google.com"}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs animate-pulse"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>In Session</span>
                              </a>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEndClass(ev)}
                                disabled={endingClassId === ev.id}
                                className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-xl h-8"
                              >
                                {endingClassId === ev.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "End"}
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleStartClass(ev)}
                              disabled={startingClassId === ev.id}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-8 gap-1.5 shadow-xs cursor-pointer"
                            >
                              {startingClassId === ev.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <PlayCircle className="w-3.5 h-3.5" />
                              )}
                              <span>Start Class</span>
                            </Button>
                          )}

                          <a
                            href={buildGoogleCalendarUrl({
                              title: ev.title,
                              description: ev.description,
                              dueDate: ev.dueDate,
                              courseTitle: ev.course?.title,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-100 text-sky-700 font-semibold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                            title="Add to Google Calendar"
                          >
                            <Calendar className="w-3.5 h-3.5 text-sky-600" />
                            <span className="hidden sm:inline">Google Cal</span>
                            <ExternalLink className="w-2.5 h-2.5 text-sky-400" />
                          </a>

                          <button
                            onClick={() => handleDeleteClass(ev)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Cancel Class"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <Video className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="font-bold text-xs text-slate-700">
                      No Live Classes Scheduled Yet
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Schedule a live theory proof session, practical workshop, or interactive seminar for your enrolled scholars.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setShowScheduleModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                    >
                      + Schedule First Class
                    </Button>
                  </div>
                )}

                {/* 30-Minute Free Trial Sessions Section */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          Student 30-Min Free Trial Bookings
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          1-on-1 online consultation and syllabus trial sessions
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold">
                      {trials.length} {trials.length === 1 ? "Session" : "Sessions"}
                    </Badge>
                  </div>

                  {trials.length > 0 ? (
                    <div className="space-y-2.5">
                      {trials.map((tr) => (
                        <div
                          key={tr.id}
                          className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">{tr.studentName}</span>
                              <Badge className="bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                30-Min Trial
                              </Badge>
                              {tr.course && (
                                <span className="text-blue-700 font-semibold text-xs truncate max-w-[200px]">
                                  • {tr.course.title}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-600 text-[11px] flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{tr.studentEmail}</span>
                              </span>
                              {tr.studentPhone && (
                                <span className="flex items-center gap-1">
                                  <span>•</span>
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{tr.studentPhone}</span>
                                </span>
                              )}
                            </div>
                            {tr.topic && (
                              <p className="text-[11px] text-slate-500 italic">
                                Focus: "{tr.topic}"
                              </p>
                            )}
                            <div className="text-[11px] text-blue-700 font-bold flex items-center gap-1.5 pt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {new Date(tr.preferredDate).toLocaleString("en-GB", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {" "}(30 mins)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <a
                              href={buildGoogleCalendarUrl({
                                title: `30-Min Free Trial: ${tr.course?.title || "London A/L Tutorial"} (${tr.studentName})`,
                                description: `30-Minute 1-on-1 Online Trial Session with Faculty.\nTopic: ${tr.topic}\nStudent: ${tr.studentName} (${tr.studentEmail})\nClassroom: ${tr.meetingLink}`,
                                dueDate: tr.preferredDate,
                                courseTitle: tr.course?.title,
                                location: tr.meetingLink,
                                durationMinutes: 30,
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-xl border border-sky-200 bg-white hover:bg-sky-50 text-sky-700 font-semibold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                              title="Add to Google Calendar"
                            >
                              <Calendar className="w-3.5 h-3.5 text-sky-600" />
                              <span className="hidden sm:inline">Google Cal</span>
                              <ExternalLink className="w-2.5 h-2.5 text-sky-400" />
                            </a>

                            {tr.meetingLink && (
                              <a
                                href={tr.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Start Trial Room</span>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No trial session requests yet. Students can book 30-minute trials from course catalog pages.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Faculty Profile Summary & Fast Hub */}
              <div className="space-y-4">
                {/* Faculty Card */}
                <div className="bg-gradient-to-br from-blue-900 to-indigo-950 rounded-2xl p-5 text-white shadow-md space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        tutor?.avatar ||
                        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                      }
                      alt={tutor?.name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/30"
                    />
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm truncate">{tutor?.name}</div>
                      <div className="text-[11px] text-blue-200 truncate">{tutor?.headline}</div>
                    </div>
                  </div>

                  <div className="text-xs text-blue-100/90 leading-relaxed bg-white/10 p-3 rounded-xl border border-white/10">
                    <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      <span>Academic Qualifications</span>
                    </p>
                    <p className="text-[11px] line-clamp-3">
                      {tutor?.bio || "Doctoral & Master's Faculty Fellow in Pure Mathematics & Natural Sciences."}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setActiveTab("profile")}
                    className="w-full bg-white hover:bg-blue-50 text-blue-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Edit Qualifications & Profile
                  </Button>
                </div>

                {/* Quick Student Stats Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Enrolled Student Cohort</span>
                  </h4>
                  <div className="text-xs text-slate-500">
                    You currently have <strong className="text-slate-800">{students.length} active students</strong> registered across your curriculum masterclasses.
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {students.slice(0, 3).map((st) => (
                      <div key={st.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {st.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800 truncate text-[11px]">
                            {st.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {st.enrolledCourses[0]?.subjectCode || "MATH"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("students")}
                    className="w-full text-xs font-bold rounded-xl"
                  >
                    View All Students
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MY STUDENTS (COHORT ROSTER) */}
        {/* ======================================================== */}
        {activeTab === "students" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search student by name, email, or course..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                  Filter by Course:
                </label>
                <select
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
                >
                  <option value="ALL">All Assigned Courses ({courses.length})</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Enrolled Student Directory ({filteredStudents.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Active scholars registered for your London A/L and O/L masterclasses
                  </p>
                </div>
              </div>

              {filteredStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider">
                      <tr>
                        <th className="p-3.5 pl-5">Student Scholar</th>
                        <th className="p-3.5">Contact Details</th>
                        <th className="p-3.5">Enrolled Subject(s)</th>
                        <th className="p-3.5">Enrolled Date</th>
                        <th className="p-3.5 text-right pr-5">Classroom Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5 pl-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                                {st.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900">{st.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {st.headline}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span>{st.email}</span>
                              </div>
                              {st.phone && st.phone !== "Not provided" && (
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{st.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="flex flex-col gap-1">
                              {st.enrolledCourses.map((c, i) => (
                                <span
                                  key={i}
                                  className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold max-w-xs truncate"
                                >
                                  {c.courseTitle}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="p-3.5 text-slate-500 text-[11px]">
                            {new Date(st.latestEnrollment).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>

                          <td className="p-3.5 pr-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveChatRecipientId(st.id);
                                  setIsChatDrawerOpen(true);
                                }}
                                className="text-[11px] font-bold h-7 rounded-lg border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 cursor-pointer gap-1"
                              >
                                <MessageSquareLock className="w-3 h-3" />
                                <span>Message</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedStudentForModal(st)}
                                className="text-[11px] font-bold h-7 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                              >
                                View Profile
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => {
                                  setScheduleMode("STUDENT");
                                  setNewClassStudentId(st.id);
                                  setNewClassTitle(`1-on-1 Mentoring: ${st.name}`);
                                  setShowScheduleModal(true);
                                }}
                                className="text-[11px] font-bold h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                              >
                                + 1-on-1 Class
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No Students Found</p>
                  <p className="text-xs text-slate-400">Try adjusting your search query or filter.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ASSIGNED CLASSES & LIVE SEMINARS */}
        {/* ======================================================== */}
        {activeTab === "classes" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Assigned Live Classes & Seminar Schedule
                </h3>
                <p className="text-xs text-slate-500">
                  Manage your interactive virtual lectures and live topic workshops
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                >
                  <option value="ALL">All Classes ({events.length})</option>
                  <option value="UPCOMING">Upcoming Dates</option>
                  <option value="SEMINARS">Live Seminars Only</option>
                </select>

                <Button
                  size="sm"
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Class</span>
                </Button>
              </div>
            </div>

            {/* Classes Grid */}
            {filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between space-y-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {ev.status === "LIVE" && (
                            <Badge className="bg-red-600 text-white text-[9px] font-black uppercase flex items-center gap-1">
                              <Radio className="w-2.5 h-2.5 animate-pulse text-white" />
                              <span>LIVE NOW</span>
                            </Badge>
                          )}
                          <Badge className="bg-purple-100 text-purple-800 text-[10px] font-bold">
                            {ev.type === "LIVE_SEMINAR" ? "Live Masterclass" : "Class Session"}
                          </Badge>
                        </div>
                        <button
                          onClick={() => handleDeleteClass(ev)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Cancel class"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">
                          {ev.title}
                        </h4>
                        {ev.course && (
                          <p className="text-xs text-blue-700 font-semibold mt-1 truncate">
                            {ev.course.title}
                          </p>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {new Date(ev.dueDate).toLocaleString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {ev.status === "LIVE" ? (
                          <>
                            <a
                              href={ev.meetingLink || (ev.description?.match(/https?:\/\/[^\s]+/)?.[0]) || "https://meet.google.com"}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all animate-pulse"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>In Session (Join)</span>
                            </a>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEndClass(ev)}
                              disabled={endingClassId === ev.id}
                              className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-xl h-9"
                            >
                              {endingClassId === ev.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "End"}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleStartClass(ev)}
                            disabled={startingClassId === ev.id}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-auto gap-1.5 shadow-xs cursor-pointer"
                          >
                            {startingClassId === ev.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <PlayCircle className="w-3.5 h-3.5" />
                            )}
                            <span>Start Class</span>
                          </Button>
                        )}

                        <a
                          href={buildGoogleCalendarUrl({
                            title: ev.title,
                            description: ev.description,
                            dueDate: ev.dueDate,
                            courseTitle: ev.course?.title,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-100 text-sky-700 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all shrink-0"
                          title="Add to Google Calendar"
                        >
                          <Calendar className="w-3.5 h-3.5 text-sky-600" />
                          <span className="hidden sm:inline">Google Cal</span>
                          <ExternalLink className="w-2.5 h-2.5 text-sky-400" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                <Video className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-sm text-slate-800">No Classes Scheduled</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click the button below to schedule a new live class or problem-solving seminar for your students.
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                >
                  + Schedule New Class
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: ACADEMIC CALENDAR */}
        {/* ======================================================== */}
        {activeTab === "calendar" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Faculty Academic Calendar</h3>
                  <p className="text-xs text-slate-500">
                    Monthly timeline of your classes, live seminars, and curriculum deadlines
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Calendar Event</span>
                </Button>
              </div>

              {/* Calendar Timeline List */}
              <div className="space-y-3">
                {events.length > 0 ? (
                  events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                          <span className="text-[10px] font-black uppercase text-blue-600">
                            {new Date(ev.dueDate).toLocaleString("en-GB", { month: "short" })}
                          </span>
                          <span className="text-sm font-black text-slate-900 leading-none">
                            {new Date(ev.dueDate).getDate()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {ev.title}
                          </h4>
                          {ev.course && (
                            <p className="text-xs text-blue-700 font-semibold truncate">
                              {ev.course.title}
                            </p>
                          )}
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            ⏰ {new Date(ev.dueDate).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={buildGoogleCalendarUrl({
                            title: ev.title,
                            description: ev.description,
                            dueDate: ev.dueDate,
                            courseTitle: ev.course?.title,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg border border-sky-200 bg-sky-50/50 hover:bg-sky-100 text-sky-700 font-semibold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                          title="Add to Google Calendar"
                        >
                          <Calendar className="w-3.5 h-3.5 text-sky-600" />
                          <span className="hidden sm:inline">Google Cal</span>
                          <ExternalLink className="w-2.5 h-2.5 text-sky-400" />
                        </a>
                        <Badge className="bg-purple-100 text-purple-800 text-[10px] font-bold">
                          {ev.type}
                        </Badge>
                        <button
                          onClick={() => handleDeleteClass(ev)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-xs text-slate-400">
                    No academic calendar events scheduled.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: MY COURSES */}
        {/* ======================================================== */}
        {activeTab === "courses" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Authored & Assigned Masterclasses ({courses.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Curriculum courses under your direct academic instruction
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-colors"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {course.category}
                      </Badge>
                      <span className="text-xs font-black text-slate-800">
                        {course.subjectCode || "MATH"}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-snug">
                        {course.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {course.subtitle || "Official London A/L Curriculum Masterclass."}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-50">
                        <div className="font-bold text-slate-900">
                          {course.modules?.length || 0}
                        </div>
                        <div className="text-[10px] text-slate-400">Modules</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <div className="font-bold text-slate-900">
                          {course.materials?.length || 0}
                        </div>
                        <div className="text-[10px] text-slate-400">Materials</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <div className="font-bold text-slate-900">
                          {course.enrollments?.length || 0}
                        </div>
                        <div className="text-[10px] text-slate-400">Scholars</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                    >
                      <span>Open Study Hub</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowScheduleModal(true);
                        setNewClassCourseId(course.id);
                        setNewClassTitle(`Lecture: ${course.title}`);
                      }}
                      className="text-[11px] font-bold h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      + Schedule Class
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: PROFILE & QUALIFICATIONS EDITOR */}
        {/* ======================================================== */}
        {activeTab === "profile" && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900">
                  Faculty Profile & Academic Qualifications
                </h3>
                <p className="text-xs text-slate-500">
                  Update your credentials, university degrees, subject specializations, and contact information
                </p>
              </div>

              {profileStatusMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    profileStatusMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {profileStatusMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{profileStatusMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Full Name & Academic Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Dr. Sarah Jenkins, Ph.D."
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Faculty Headline / Department Role <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Senior Faculty Tutor in Pure Mathematics & Mechanics"
                      value={profileHeadline}
                      onChange={(e) => setProfileHeadline(e.target.value)}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block">
                      Academic Qualifications & University Degrees <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Click quick tag to append:</span>
                  </div>

                  {/* Quick Degree Snippets */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {[
                      "B.Sc. (Hons) First Class (London)",
                      "Ph.D. Mathematical Analysis (Imperial)",
                      "Cambridge Tripos Masterclass Fellow",
                      "Edexcel IAL Chief Examiner (Mathematics)",
                      "PGCE Secondary Education with Distinction",
                    ].map((deg, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setProfileBio((prev) =>
                            prev.includes(deg) ? prev : prev ? `${prev} • ${deg}` : deg
                          );
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        + {deg}
                      </button>
                    ))}
                  </div>

                  <textarea
                    required
                    rows={4}
                    placeholder="e.g. B.Sc. (Hons) First Class Mathematics (University of London), Ph.D. Applied Mathematical Analysis (Imperial College London). Subject Lead for IAL Pure Mathematics (P1-P4) and Mechanics with 18+ years of academic teaching experience."
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 leading-relaxed resize-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This information is displayed publicly on course syllabus pages and tutor directory.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Contact Phone / WhatsApp
                    </label>
                    <Input
                      placeholder="e.g. +44 20 7946 0912"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Profile Picture URL
                    </label>
                    <Input
                      placeholder="https://images.unsplash.com/..."
                      value={profileAvatar}
                      onChange={(e) => setProfileAvatar(e.target.value)}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <Button
                    type="submit"
                    disabled={profileSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-xs cursor-pointer"
                  >
                    {profileSaving ? "Saving Qualifications..." : "Save Profile & Qualifications"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL: SCHEDULE NEW LIVE CLASS / SEMINAR */}
      {/* ======================================================== */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Schedule Live Class / Seminar
                </h3>
                <p className="text-xs text-slate-500">
                  Create a live lecture session for your enrolled scholars
                </p>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleClass} className="space-y-3.5 text-xs">
              {/* Assignment Mode Toggle */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Assignment Target
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleMode("COURSE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      scheduleMode === "COURSE"
                        ? "bg-blue-50 border-blue-300 text-blue-700 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Whole Course Cohort</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode("STUDENT")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      scheduleMode === "STUDENT"
                        ? "bg-blue-50 border-blue-300 text-blue-700 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                    <span>1-on-1 Student Mentoring</span>
                  </button>
                </div>
              </div>

              {scheduleMode === "COURSE" ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Select Target Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newClassCourseId}
                    onChange={(e) => setNewClassCourseId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.subjectCode || "MATH"})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Select Student Scholar <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={newClassStudentId}
                      onChange={(e) => setNewClassStudentId(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium"
                    >
                      <option value="">-- Choose Student --</option>
                      {students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Related Course
                    </label>
                    <select
                      value={newClassCourseId}
                      onChange={(e) => setNewClassCourseId(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium"
                    >
                      <option value="">General Academic Mentoring</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Class Topic / Title <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Pure Mathematics P3: Complex Numbers & Proofs Workshop"
                  value={newClassTitle}
                  onChange={(e) => setNewClassTitle(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Class Format / Type
                  </label>
                  <select
                    value={newClassType}
                    onChange={(e) => setNewClassType(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium"
                  >
                    <option value="LIVE_SEMINAR">Live Virtual Seminar</option>
                    <option value="ASSIGNMENT">Problem Workshop / Milestone</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Date & Time <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    required
                    value={newClassDate}
                    onChange={(e) => setNewClassDate(e.target.value)}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Virtual Classroom Link (Zoom / Meet / Teams)
                </label>
                <Input
                  placeholder="e.g. https://meet.google.com/abc-defg-hij"
                  value={newClassMeetingLink}
                  onChange={(e) => setNewClassMeetingLink(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Agenda & Preparation Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Bring formula sheet and complete unit 4 practice questions before session."
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(false)}
                  className="rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={schedulingClass}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  {schedulingClass ? "Scheduling..." : "Confirm & Schedule Class"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: VIEW STUDENT SCHOLAR PROFILE & ENROLLMENTS */}
      {/* ======================================================== */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {selectedStudentForModal.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">
                    {selectedStudentForModal.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">{selectedStudentForModal.headline}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold">{selectedStudentForModal.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{selectedStudentForModal.phone || "Not provided"}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>Enrolled Masterclasses ({selectedStudentForModal.enrolledCourses.length})</span>
                </h4>
                <div className="space-y-1.5">
                  {selectedStudentForModal.enrolledCourses.map((c, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="font-semibold text-slate-800 truncate">{c.courseTitle}</div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(c.enrolledAt).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedStudentForModal(null)}
                  className="rounded-xl cursor-pointer"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const studentToAssign = selectedStudentForModal;
                    setSelectedStudentForModal(null);
                    setScheduleMode("STUDENT");
                    setNewClassStudentId(studentToAssign.id);
                    setNewClassTitle(`1-on-1 Mentoring: ${studentToAssign.name}`);
                    setShowScheduleModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl gap-1.5 cursor-pointer shadow-xs"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Schedule 1-on-1 Class</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={confirmModalData.isOpen}
        onClose={() =>
          setConfirmModalData((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={confirmModalData.onConfirm}
        title={confirmModalData.title}
        description={confirmModalData.description}
        variant={confirmModalData.variant}
      />

      {/* End-to-End Encrypted Chat Drawer */}
      {tutor && (
        <EncryptedChatDrawer
          currentUser={tutor}
          initialRecipientId={activeChatRecipientId}
          isOpen={isChatDrawerOpen}
          onOpen={() => setIsChatDrawerOpen(true)}
          onClose={() => {
            setIsChatDrawerOpen(false);
            setActiveChatRecipientId(undefined);
          }}
        />
      )}

      <Footer />
    </div>
  );
}

export default function TutorDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-slate-500">
          Loading Tutor Studio...
        </div>
      }
    >
      <TutorDashboardContent />
    </Suspense>
  );
}
