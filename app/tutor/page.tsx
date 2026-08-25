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
  LayoutDashboard,
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
  CalendarCheck,
  Radio,
  ChevronDown,
  Globe,
  Settings,
  Flame,
  Check,
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
    "overview" | "students" | "courses" | "classes" | "trials" | "profile"
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
  const [classFilter, setClassFilter] = useState<"ALL" | "LIVE" | "SCHEDULED" | "COMPLETED">("ALL");

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

  // Selected Student Modal & Chat
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

  const fetchTutorData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tutor");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
      }
      const data = await res.json();
      if (data.tutor) {
        setTutor(data.tutor);
        setProfileName(data.tutor.name || "");
        setProfileHeadline(data.tutor.headline || "");
        setProfileBio(data.tutor.bio || "");
        setProfilePhone(data.tutor.phone || "");
        setProfileAvatar(data.tutor.avatar || "");
      }
      setCourses(data.courses || []);
      setStudents(data.students || []);
      setEvents(data.events || []);
      setTrials(data.trials || []);

      if (data.courses && data.courses.length > 0 && !newClassCourseId) {
        setNewClassCourseId(data.courses[0].id);
      }
    } catch (err) {
      console.error("Failed to load tutor data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutorData();
  }, []);

  useRealtimeSync({
    events: ["COURSES_CHANGED", "ENROLLMENTS_CHANGED", "EVENTS_CHANGED", "USERS_CHANGED", "TRIALS_CHANGED"],
    onSync: () => {
      fetchTutorData();
    },
  });

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      const matchesQuery =
        st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        st.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (st.phone && st.phone.includes(studentSearch));

      const matchesCourse =
        selectedCourseFilter === "ALL" ||
        st.enrolledCourses.some((c) => c.courseId === selectedCourseFilter);

      return matchesQuery && matchesCourse;
    });
  }, [students, studentSearch, selectedCourseFilter]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (classFilter === "ALL") return true;
      if (classFilter === "LIVE") return ev.status === "LIVE";
      if (classFilter === "SCHEDULED") return ev.status === "SCHEDULED" || !ev.status;
      if (classFilter === "COMPLETED") return ev.status === "COMPLETED";
      return true;
    });
  }, [events, classFilter]);

  // Upcoming / Live Class for Hero card
  const activeOrNextClass = useMemo(() => {
    const live = events.find((e) => e.status === "LIVE");
    if (live) return live;
    const sorted = [...events].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    return sorted.find((e) => new Date(e.dueDate).getTime() >= Date.now() - 3600000);
  }, [events]);

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
          title: newClassTitle.trim(),
          description: newClassDesc.trim(),
          meetingLink: newClassMeetingLink.trim(),
          scheduledDate: newClassDate,
          courseId: scheduleMode === "COURSE" ? newClassCourseId : null,
          studentId: scheduleMode === "STUDENT" ? newClassStudentId : null,
          tutorId: tutor?.id,
          type: newClassType,
        }),
      });

      if (res.ok) {
        setShowScheduleModal(false);
        setNewClassTitle("");
        setNewClassDesc("");
        setNewClassMeetingLink("");
        setNewClassDate("");
        fetchTutorData();
      }
    } catch (error) {
      console.error("Failed to schedule class:", error);
    } finally {
      setSchedulingClass(false);
    }
  };

  // Start Live Class
  const handleStartClass = async (eventId: string, existingMeetingLink?: string | null) => {
    try {
      setStartingClassId(eventId);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_class",
          eventId,
          meetingLink: existingMeetingLink,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchTutorData();
        if (data.meetingLink) {
          window.open(data.meetingLink, "_blank", "noopener,noreferrer");
        }
      }
    } catch (error) {
      console.error("Failed to start class:", error);
    } finally {
      setStartingClassId(null);
    }
  };

  // End Live Class
  const handleEndClass = async (eventId: string) => {
    try {
      setEndingClassId(eventId);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_class",
          eventId,
        }),
      });
      if (res.ok) {
        fetchTutorData();
      }
    } catch (error) {
      console.error("Failed to end class:", error);
    } finally {
      setEndingClassId(null);
    }
  };

  // Delete Class
  const handleDeleteClass = async (eventId: string) => {
    setConfirmModalData({
      isOpen: true,
      title: "Cancel & Delete Class Session?",
      description: "This will remove the scheduled live class from all enrolled student calendars and dashboards.",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete_class",
              eventId,
            }),
          });
          if (res.ok) {
            fetchTutorData();
          }
        } catch (error) {
          console.error("Failed to delete class:", error);
        } finally {
          setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Save Profile
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
          text: "Faculty credentials & bio saved successfully!",
        });
        setTutor(data.tutor);
      } else {
        setProfileStatusMsg({
          type: "error",
          text: data.error || "Failed to update profile.",
        });
      }
    } catch (error) {
      setProfileStatusMsg({
        type: "error",
        text: "Network error saving profile.",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const openChatWithStudent = (studentId: string) => {
    setActiveChatRecipientId(studentId);
    setIsChatDrawerOpen(true);
  };

  const openScheduleForStudent = (student: StudentRecord) => {
    setScheduleMode("STUDENT");
    setNewClassStudentId(student.id);
    setNewClassTitle(`1-on-1 Consultation: ${student.name}`);
    setShowScheduleModal(true);
  };

  if (loading && !tutor) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
        <p className="text-sm font-semibold tracking-wider uppercase text-blue-200">
          Loading Faculty Studio...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-800">
      <Navbar />

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE FACULTY HERO BANNER                                         */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#071739] via-[#0c2461] to-[#1e3799] text-white pt-8 pb-12 border-b border-blue-900/50 shadow-xl relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Lecturer Bio & Avatar */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative group shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl bg-blue-950">
                  <img
                    src={
                      tutor?.avatar ||
                      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                    }
                    alt={tutor?.name || "Faculty Lecturer"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#0c2461] flex items-center justify-center shadow-xs" title="Online Faculty">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {tutor?.name || "Senior Faculty Lecturer"}
                  </h1>
                  <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 text-[11px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                    <span>Lead UK Educator</span>
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[11px] font-semibold">
                    Accredited #UK-92810
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-blue-200/90 font-medium">
                  {tutor?.headline || "Senior Lecturer • London A/L & O/L Subject Lead"}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-blue-300/80 pt-1 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {tutor?.email || "faculty@edupulse.uk"}
                  </span>
                  {tutor?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {tutor.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <Button
                onClick={() => {
                  setScheduleMode("COURSE");
                  setNewClassTitle("");
                  setShowScheduleModal(true);
                }}
                className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white text-xs font-bold rounded-xl px-4 py-2.5 h-auto shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Live Class</span>
              </Button>

              <Link
                href="/courses"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/10 flex items-center gap-1.5 transition-all"
              >
                <BookOpen className="w-4 h-4 text-blue-300" />
                <span>Explore Catalog</span>
              </Link>

              <button
                onClick={fetchTutorData}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer"
                title="Refresh Studio Data"
              >
                <RefreshCw className="w-4 h-4 text-blue-200" />
              </button>
            </div>

          </div>

          {/* Quick Metrics Bar in Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {students.length}
                </div>
                <div className="text-[11px] text-blue-200 font-medium">Enrolled Scholars</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {courses.length}
                </div>
                <div className="text-[11px] text-blue-200 font-medium">Active Courses</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {events.length}
                </div>
                <div className="text-[11px] text-blue-200 font-medium">Live Sessions</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {trials.length}
                </div>
                <div className="text-[11px] text-blue-200 font-medium">Trial Bookings</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TABBED NAVIGATION BAR                                                  */}
      {/* ========================================================================= */}
      <div className="sticky top-16 z-30 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-2 py-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "overview"
                    ? "bg-[#0c2461] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveTab("students")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "students"
                    ? "bg-[#0c2461] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Enrolled Scholars</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "students" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {students.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("courses")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "courses"
                    ? "bg-[#0c2461] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>My Courses & Syllabus</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "courses" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {courses.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("classes")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "classes"
                    ? "bg-[#0c2461] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Live Classes</span>
                {events.some((e) => e.status === "LIVE") ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-red-500 text-white animate-pulse">
                    LIVE NOW
                  </span>
                ) : (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === "classes" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {events.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("trials")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "trials"
                    ? "bg-[#0c2461] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>1-on-1 Trial Sessions</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "trials" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {trials.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("profile")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "profile"
                    ? "bg-[#0c2461] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Faculty Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN TAB CONTENT AREA                                                  */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 1: STUDIO OVERVIEW                                                  */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            
            {/* Top Row: Next Live Class Callout & Quick Trial Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left 7 cols: Live Class Showcase */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Next Live Classroom Session
                      </h3>
                      <p className="text-xs text-slate-500">
                        Interactive Google Meet lecture broadcasting
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setScheduleMode("COURSE");
                      setShowScheduleModal(true);
                    }}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 gap-1.5 h-8 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule Class</span>
                  </Button>
                </div>

                {activeOrNextClass ? (
                  <div className={`p-5 rounded-2xl border transition-all ${
                    activeOrNextClass.status === "LIVE"
                      ? "bg-red-50/70 border-red-200"
                      : "bg-blue-50/50 border-blue-100"
                  } space-y-4`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {activeOrNextClass.status === "LIVE" ? (
                            <Badge className="bg-red-600 text-white font-extrabold text-[10px] animate-pulse">
                              ● LIVE BROADCASTING
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 font-bold text-[10px] border-blue-200">
                              Upcoming Scheduled Class
                            </Badge>
                          )}
                          {activeOrNextClass.course?.subjectCode && (
                            <span className="text-[11px] font-mono font-bold text-slate-600">
                              [{activeOrNextClass.course.subjectCode}]
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-base text-slate-900">
                          {activeOrNextClass.title}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {activeOrNextClass.description || "Live syllabus topic lecture and past paper analysis."}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 justify-end">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          {new Date(activeOrNextClass.dueDate).toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                          {new Date(activeOrNextClass.dueDate).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-600 flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono truncate max-w-[220px]">
                          {activeOrNextClass.meetingLink || "Room generated upon start"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeOrNextClass.status === "LIVE" ? (
                          <>
                            <a
                              href={activeOrNextClass.meetingLink || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-500/20"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Live Room</span>
                            </a>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEndClass(activeOrNextClass.id)}
                              disabled={endingClassId === activeOrNextClass.id}
                              className="text-xs font-semibold text-slate-700 h-8"
                            >
                              {endingClassId === activeOrNextClass.id ? "Ending..." : "End Session"}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleStartClass(
                                  activeOrNextClass.id,
                                  activeOrNextClass.meetingLink
                                )
                              }
                              disabled={startingClassId === activeOrNextClass.id}
                              className="bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs h-8 gap-1.5 shadow-sm cursor-pointer"
                            >
                              <PlayCircle className="w-3.5 h-3.5 text-blue-300" />
                              <span>
                                {startingClassId === activeOrNextClass.id
                                  ? "Launching..."
                                  : "Start Class Now"}
                              </span>
                            </Button>
                            <a
                              href={buildGoogleCalendarUrl({
                                title: activeOrNextClass.title,
                                description: activeOrNextClass.description || "",
                                dueDate: activeOrNextClass.dueDate,
                                location: activeOrNextClass.meetingLink || "",
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white"
                              title="Add to Google Calendar"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                    <Video className="w-8 h-8 text-slate-400 mx-auto" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">No Active or Scheduled Classes</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Schedule a live seminar for your course cohorts or 1-on-1 student consultations.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowScheduleModal(true)}
                      className="bg-[#0c2461] text-white text-xs font-bold rounded-xl px-4"
                    >
                      + Schedule Class
                    </Button>
                  </div>
                )}
              </div>

              {/* Right 5 cols: Student 1-on-1 Trial Inquiries */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        1-on-1 Trial Bookings
                      </h3>
                      <p className="text-xs text-slate-500">
                        30-Min student consultations
                      </p>
                    </div>
                  </div>

                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-bold">
                    {trials.length} Booked
                  </Badge>
                </div>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {trials.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 italic">
                      No trial consultation requests at the moment.
                    </div>
                  ) : (
                    trials.slice(0, 4).map((trial) => (
                      <div
                        key={trial.id}
                        className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/40 border border-slate-200/80 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-xs text-slate-900">
                              {trial.studentName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {trial.course?.title || "London A/L General Inquiry"}
                            </div>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-emerald-200">
                            Confirmed
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                          <span className="text-slate-600 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(trial.preferredDate).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>

                          <div className="flex items-center gap-2">
                            <a
                              href={`mailto:${trial.studentEmail}`}
                              className="text-blue-600 hover:text-blue-800 font-semibold"
                              title="Email Scholar"
                            >
                              Email
                            </a>
                            <a
                              href={buildGoogleCalendarUrl({
                                title: `30-Min Trial: ${trial.studentName}`,
                                description: `1-on-1 Academic Consultation for ${trial.course?.title || "Curriculum"}`,
                                dueDate: trial.preferredDate,
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-600 hover:text-slate-900 font-semibold"
                              title="Add to Google Calendar"
                            >
                              Calendar
                            </a>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {trials.length > 4 && (
                  <button
                    onClick={() => setActiveTab("trials")}
                    className="w-full py-2 text-center text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    View All {trials.length} Trial Bookings →
                  </button>
                )}
              </div>

            </div>

            {/* Bottom Row: Active Courses Grid & Quick Student Roster */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Courses overview */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        My Taught Courses & Curricula
                      </h3>
                      <p className="text-xs text-slate-500">
                        {courses.length} courses managed under your faculty credentials
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("courses")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    View All Courses →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {courses.slice(0, 4).map((course) => (
                    <div
                      key={course.id}
                      className="p-4 rounded-xl bg-slate-50 hover:bg-blue-50/30 border border-slate-200/80 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                            {course.subjectCode || course.category}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            £{course.price}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs text-slate-900 line-clamp-2">
                          {course.title}
                        </h4>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-slate-400" />
                            {course.modules?.length || 0} Modules
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-400" />
                            {course.materials?.length || 0} Materials
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            {course.enrollments?.length || 0} Students
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                        <Link
                          href={`/courses/${course.slug}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <span>Open Syllabus</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => {
                            setScheduleMode("COURSE");
                            setNewClassCourseId(course.id);
                            setNewClassTitle(`Masterclass: ${course.title}`);
                            setShowScheduleModal(true);
                          }}
                          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                        >
                          + Live Class
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Students Roster */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Recent Scholars
                      </h3>
                      <p className="text-xs text-slate-500">
                        {students.length} enrolled across courses
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("students")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    View All →
                  </button>
                </div>

                <div className="space-y-3">
                  {students.slice(0, 5).map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {student.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {student.enrolledCourses[0]?.courseTitle || "Enrolled Scholar"}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => openChatWithStudent(student.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all shrink-0"
                        title="Direct Message"
                      >
                        <MessageSquareLock className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 2: ENROLLED SCHOLARS DIRECTORY                                     */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "students" && (
          <div className="space-y-6">
            
            {/* Header with Search & Course Filter */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Enrolled Scholars Directory ({filteredStudents.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Direct access to scholars across all your London A/L & O/L course cohorts
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search scholar name or email..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl"
                    />
                  </div>

                  {/* Course Filter */}
                  <select
                    value={selectedCourseFilter}
                    onChange={(e) => setSelectedCourseFilter(e.target.value)}
                    className="h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
                  >
                    <option value="ALL">All Enrolled Courses</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.subjectCode ? `[${c.subjectCode}] ` : ""}{c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.length === 0 ? (
                <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                  <Users className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-700">No Scholars Match Your Criteria</h4>
                  <p className="text-xs text-slate-500">
                    Try searching a different name or changing the course filter.
                  </p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">
                              {student.name}
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              {student.headline || "London A/L Scholar"}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedStudentForModal(student)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          title="View Scholar Profile"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{student.email}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{student.phone}</span>
                        </div>
                      </div>

                      {/* Enrolled Courses Badges */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Enrolled Cohorts ({student.enrolledCourses.length}):
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {student.enrolledCourses.map((c, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 truncate max-w-[200px]"
                            >
                              {c.courseTitle}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openChatWithStudent(student.id)}
                        className="text-xs font-semibold gap-1.5 h-8 w-full"
                      >
                        <MessageSquareLock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Message</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => openScheduleForStudent(student)}
                        className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold gap-1.5 h-8 w-full cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>1-on-1 Class</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 3: MY COURSES & SYLLABUS                                            */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Curriculum & Course Management ({courses.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Manage module syllabi, video lectures, and student enrollments for each specification
                </p>
              </div>

              <Link
                href="/courses"
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 flex items-center gap-1.5 w-fit"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Browse Student Catalog View</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-lg hover:border-blue-200 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-extrabold px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-200/60">
                        {course.subjectCode || "LONDON A/L"}
                      </span>
                      <span className="text-sm font-bold text-slate-900 font-mono">
                        £{course.price}
                      </span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 leading-snug">
                      {course.title}
                    </h4>

                    {course.subtitle && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {course.subtitle}
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{course.modules?.length || 0}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Modules</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{course.materials?.length || 0}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Handbooks</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{course.enrollments?.length || 0}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Scholars</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="flex-1 py-2 text-center rounded-xl bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Open Syllabus</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setScheduleMode("COURSE");
                        setNewClassCourseId(course.id);
                        setNewClassTitle(`Live Class: ${course.title}`);
                        setShowScheduleModal(true);
                      }}
                      className="text-xs font-semibold gap-1 h-9 rounded-xl"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Class</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 4: LIVE CLASSES & SEMINARS                                          */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "classes" && (
          <div className="space-y-6">
            
            {/* Header & Filter Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Live Classroom Sessions ({filteredEvents.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Broadcasting rooms, seminar schedules, and lecture meetings
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  {(["ALL", "LIVE", "SCHEDULED", "COMPLETED"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setClassFilter(filter)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        classFilter === filter
                          ? "bg-white text-blue-700 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {filter === "ALL" && "All Sessions"}
                      {filter === "LIVE" && "Live Now"}
                      {filter === "SCHEDULED" && "Upcoming"}
                      {filter === "COMPLETED" && "Completed"}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-4 gap-1.5 h-9"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Class</span>
                </Button>
              </div>
            </div>

            {/* Classes List */}
            <div className="space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                  <Video className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-700">No Classes Found</h4>
                  <p className="text-xs text-slate-500">
                    No classes match the active filter. Schedule a new class using the button above.
                  </p>
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const isLive = ev.status === "LIVE";
                  const isCompleted = ev.status === "COMPLETED";

                  return (
                    <div
                      key={ev.id}
                      className={`bg-white rounded-2xl border transition-all p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isLive
                          ? "border-red-300 bg-red-50/30 ring-1 ring-red-200"
                          : "border-slate-200 hover:border-blue-200"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl shrink-0 ${
                          isLive
                            ? "bg-red-500 text-white animate-pulse"
                            : isCompleted
                            ? "bg-slate-100 text-slate-500"
                            : "bg-blue-50 text-blue-600"
                        }`}>
                          <Video className="w-5 h-5" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">
                              {ev.title}
                            </h4>
                            {isLive && (
                              <Badge className="bg-red-600 text-white font-extrabold text-[10px]">
                                ● LIVE NOW
                              </Badge>
                            )}
                            {isCompleted && (
                              <Badge className="bg-slate-100 text-slate-600 font-bold text-[10px]">
                                Completed
                              </Badge>
                            )}
                            {ev.course?.title && (
                              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                {ev.course.title}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(ev.dueDate).toLocaleDateString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(ev.dueDate).toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {ev.meetingLink && (
                              <span className="flex items-center gap-1 font-mono text-blue-600">
                                <Globe className="w-3.5 h-3.5" />
                                <a
                                  href={ev.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline truncate max-w-[200px]"
                                >
                                  {ev.meetingLink}
                                </a>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {isLive ? (
                          <>
                            <a
                              href={ev.meetingLink || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-500/20"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Room</span>
                            </a>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEndClass(ev.id)}
                              disabled={endingClassId === ev.id}
                              className="text-xs font-semibold h-9"
                            >
                              {endingClassId === ev.id ? "Ending..." : "End Session"}
                            </Button>
                          </>
                        ) : isCompleted ? (
                          <span className="text-xs text-slate-400 font-semibold px-3 py-1 bg-slate-50 rounded-lg">
                            Session Ended
                          </span>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStartClass(ev.id, ev.meetingLink)}
                              disabled={startingClassId === ev.id}
                              className="bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs h-9 gap-1.5 shadow-sm cursor-pointer"
                            >
                              <PlayCircle className="w-3.5 h-3.5 text-blue-300" />
                              <span>
                                {startingClassId === ev.id ? "Starting..." : "Start Class"}
                              </span>
                            </Button>

                            <a
                              href={buildGoogleCalendarUrl({
                                title: ev.title,
                                description: ev.description || "",
                                dueDate: ev.dueDate,
                                location: ev.meetingLink || "",
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                              title="Add to Google Calendar"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </a>

                            <button
                              onClick={() => handleDeleteClass(ev.id)}
                              className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              title="Cancel & Delete Class"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 5: 1-ON-1 TRIAL SESSIONS                                            */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "trials" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Student 1-on-1 Free Trial Consultations ({trials.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Prospective student bookings requesting a 30-min online evaluation session
                </p>
              </div>

              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-bold px-3 py-1 w-fit">
                {trials.length} Inquiries Received
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trials.length === 0 ? (
                <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                  <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-700">No Trial Bookings Yet</h4>
                  <p className="text-xs text-slate-500">
                    When prospective students request a 30-min trial session on your courses, they will appear here.
                  </p>
                </div>
              ) : (
                trials.map((trial) => (
                  <div
                    key={trial.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-amber-200 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center">
                            {trial.studentName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">
                              {trial.studentName}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60">
                              30-Min Trial Session
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="font-bold text-slate-800 truncate">
                          Course: {trial.course?.title || "General Curriculum"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{trial.studentEmail}</span>
                        </div>
                        {trial.studentPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{trial.studentPhone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 font-mono text-[11px] text-blue-700 font-semibold pt-1 border-t border-slate-200/60">
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>
                            {new Date(trial.preferredDate).toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {trial.notes && (
                        <p className="text-xs text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                          "{trial.notes}"
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <a
                        href={`mailto:${trial.studentEmail}?subject=EduPulse: 30-Min Trial Session Confirmation&body=Dear ${trial.studentName},%0D%0A%0D%0AThank you for requesting a 30-min online trial session with EduPulse Academy.`}
                        className="flex-1 py-2 text-center rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all"
                      >
                        Email Scholar
                      </a>

                      <a
                        href={buildGoogleCalendarUrl({
                          title: `30-Min Trial: ${trial.studentName}`,
                          description: `1-on-1 Consultation for ${trial.course?.title || "London A/L"}`,
                          dueDate: trial.preferredDate,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 text-center rounded-xl bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs shadow-xs transition-all"
                      >
                        Add to Calendar
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 6: FACULTY PROFILE & QUALIFICATIONS                                 */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "profile" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-bold text-lg text-slate-900">
                  Faculty Credentials & Studio Settings
                </h3>
                <p className="text-xs text-slate-500">
                  Update your lecturer identity, qualifications summary, and student contact details.
                </p>
              </div>

              {profileStatusMsg && (
                <div
                  className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    profileStatusMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {profileStatusMsg.type === "success" ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{profileStatusMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-blue-950 shrink-0">
                    <img
                      src={
                        profileAvatar ||
                        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                      }
                      alt={profileName || "Avatar Preview"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1.5 w-full">
                    <label className="font-bold text-xs text-slate-700 block">
                      Profile Avatar URL
                    </label>
                    <Input
                      value={profileAvatar}
                      onChange={(e) => setProfileAvatar(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="text-xs rounded-xl h-9 bg-white"
                    />
                    <p className="text-[11px] text-slate-400">
                      Paste a direct HTTPS image link for your lecturer avatar.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-xs text-slate-700 block">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="text-xs rounded-xl h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-xs text-slate-700 block">
                      Academic Title & Headline
                    </label>
                    <Input
                      value={profileHeadline}
                      onChange={(e) => setProfileHeadline(e.target.value)}
                      className="text-xs rounded-xl h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-xs text-slate-700 block">
                    Phone / WhatsApp Number
                  </label>
                  <Input
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="text-xs rounded-xl h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-xs text-slate-700 block">
                    Lecturer Biography & Qualifications Summary
                  </label>
                  <textarea
                    rows={4}
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <Button
                    type="submit"
                    disabled={profileSaving}
                    className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-6 h-10 gap-2 shadow-md cursor-pointer"
                  >
                    {profileSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Credentials...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Faculty Profile</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* 4. MODALS & DRAWERS                                                       */}
      {/* ========================================================================= */}

      {/* Schedule Live Class Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Schedule Live Virtual Class
                  </h3>
                  <p className="text-xs text-slate-500">
                    Broadcast a Google Meet interactive seminar to students
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleClass} className="space-y-4 text-xs">
              {/* Audience Target Toggle */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Class Audience Target
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
                    <span>1-on-1 Scholar Mentoring</span>
                  </button>
                </div>
              </div>

              {scheduleMode === "COURSE" ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Select Course Cohort <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newClassCourseId}
                    onChange={(e) => setNewClassCourseId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.subjectCode ? `[${c.subjectCode}] ` : ""}{c.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Select Scholar <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newClassStudentId}
                    onChange={(e) => setNewClassStudentId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium"
                    required
                  >
                    <option value="">Choose a scholar...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Class Topic / Title <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Unit 4 Differential Calculus Past Papers"
                  value={newClassTitle}
                  onChange={(e) => setNewClassTitle(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Session Format
                  </label>
                  <select
                    value={newClassType}
                    onChange={(e) => setNewClassType(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium"
                  >
                    <option value="LIVE_SEMINAR">Live Virtual Seminar</option>
                    <option value="DEADLINE">Study Workshop / Milestone</option>
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
                  Google Meet / Zoom URL (Optional)
                </label>
                <Input
                  placeholder="Leave blank to automatically generate room"
                  value={newClassMeetingLink}
                  onChange={(e) => setNewClassMeetingLink(e.target.value)}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Session Notes / Agenda (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Topics to be covered, required formula books, etc."
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={schedulingClass}
                  className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-5 gap-1.5 cursor-pointer shadow-md"
                >
                  {schedulingClass ? "Scheduling..." : "Confirm Schedule"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Details Inspection Modal */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                  {selectedStudentForModal.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {selectedStudentForModal.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudentForModal.headline || "London A/L Scholar"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Email:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedStudentForModal.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Phone:</span>
                  <span className="font-bold text-slate-800">{selectedStudentForModal.phone}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-slate-700">Enrolled Courses ({selectedStudentForModal.enrolledCourses.length}):</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedStudentForModal.enrolledCourses.map((c, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                      <span className="font-semibold text-blue-900 truncate mr-2">{c.courseTitle}</span>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {new Date(c.enrolledAt).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudentForModal(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const s = selectedStudentForModal;
                  setSelectedStudentForModal(null);
                  openChatWithStudent(s.id);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                <MessageSquareLock className="w-3.5 h-3.5" />
                <span>Open Chat</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Destructive Actions */}
      <ConfirmationModal
        isOpen={confirmModalData.isOpen}
        onClose={() => setConfirmModalData((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalData.onConfirm}
        title={confirmModalData.title}
        description={confirmModalData.description}
        variant={confirmModalData.variant}
      />

      {/* Encrypted Direct Chat Drawer */}
      <EncryptedChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        currentUser={
          tutor || {
            id: "instructor",
            name: "Senior Faculty Lecturer",
            email: "faculty@edupulse.uk",
            role: "INSTRUCTOR",
          }
        }
        initialRecipientId={activeChatRecipientId}
      />

      <Footer />
    </div>
  );
}

export default function TutorDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
          <p className="text-sm font-semibold tracking-wider uppercase text-blue-200">
            Initializing Faculty Studio...
          </p>
        </div>
      }
    >
      <TutorDashboardContent />
    </Suspense>
  );
}
