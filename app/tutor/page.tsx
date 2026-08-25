"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Search,
  Bell,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Home,
  FileText,
  Users,
  Calendar,
  Plus,
  ArrowRight,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  SlidersHorizontal,
  Trash2,
  FolderOpen,
  CalendarCheck,
  ShieldCheck,
  Edit3,
  Video,
  FileCheck2,
  DollarSign,
  TrendingUp,
  Download,
  ExternalLink,
  Loader2,
  LogOut,
  X,
  Tag,
  MessageSquareLock,
  Radio,
  PlayCircle,
  UserCheck,
  Mail,
  Phone,
  RefreshCw,
  Layers,
  Globe,
  Settings,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { EncryptedChatDrawer } from "@/components/chat/EncryptedChatDrawer";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Footer } from "@/components/layout/Footer";

const formatForDateTimeInput = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

const getSafeMeetingLink = (link?: string | null) => {
  if (!link || !link.trim()) return "https://meet.google.com/new";
  const trimmed = link.trim();
  if (trimmed.includes("edupulse-live") || trimmed.includes("xxx-yyyy-zzz")) {
    return "https://meet.google.com/new";
  }
  return trimmed;
};

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

  const [loading, setLoading] = useState(true);
  const [tutor, setTutor] = useState<any>(null);
  const [courses, setCourses] = useState<TutorCourse[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [events, setEvents] = useState<ScheduledClassEvent[]>([]);
  const [trials, setTrials] = useState<any[]>([]);

  // Navigation tree state
  const [navCoursesOpen, setNavCoursesOpen] = useState(true);

  // Filters & Search
  const [courseSearch, setCourseSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState<"ALL" | "LIVE" | "SCHEDULED" | "COMPLETED">("ALL");

  // Center Tab View: "courses" | "classes" | "students" | "trials"
  const [centerTab, setCenterTab] = useState<"courses" | "classes" | "students" | "trials">("courses");

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

  // Student Details Modal & Chat
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentRecord | null>(null);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [activeChatRecipientId, setActiveChatRecipientId] = useState<string | undefined>(undefined);

  // Profile Edit Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
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

  // Calendar Navigation State
  const [calDate, setCalDate] = useState(() => new Date());

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
      console.error("Failed to load tutor studio data:", err);
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

  // Calendar calculation
  const calendarDays = useMemo(() => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [calDate]);

  const hasEventOnDate = useCallback(
    (date: Date | null) => {
      if (!date) return false;
      const y = date.getFullYear();
      const m = date.getMonth();
      const d = date.getDate();
      return events.some((ev) => {
        const evDate = new Date(ev.dueDate);
        return (
          evDate.getFullYear() === y &&
          evDate.getMonth() === m &&
          evDate.getDate() === d
        );
      });
    },
    [events]
  );

  const prevMonth = () => {
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));
  };
  const goToToday = () => {
    setCalDate(new Date());
  };

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
        (c.subjectCode && c.subjectCode.toLowerCase().includes(courseSearch.toLowerCase())) ||
        (c.category && c.category.toLowerCase().includes(courseSearch.toLowerCase()));
      return matchSearch;
    });
  }, [courses, courseSearch]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      const matchQuery =
        st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        st.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (st.phone && st.phone.includes(studentSearch));

      const matchCourse =
        selectedCourseFilter === "ALL" ||
        st.enrolledCourses.some((c) => c.courseId === selectedCourseFilter);

      return matchQuery && matchCourse;
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

  // Schedule class
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

  // Start Class
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

  // End Class
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
      description: "This will remove the scheduled live class from all enrolled scholar calendars.",
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
          text: "Faculty qualifications saved successfully!",
        });
        setTutor(data.tutor);
        setTimeout(() => setShowProfileModal(false), 1200);
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
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
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    setNewClassDate(formatForDateTimeInput(d));
    setShowScheduleModal(true);
  };

  if (loading && !tutor) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
        <p className="text-sm font-semibold tracking-wider uppercase text-blue-200">
          Loading Tutor Studio...
        </p>
      </div>
    );
  }

  const tutorName = tutor?.name || "Senior Faculty Lecturer";

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col font-sans text-slate-800">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR (Exact same as Dashboard)                                */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Left Brand & Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0c2461] text-white flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5 text-blue-300" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-black text-sm text-[#0c2461] tracking-tight leading-none">
                  EDUPULSE ACADEMY
                </span>
                <span className="text-[10px] text-blue-600 font-bold tracking-widest leading-tight">
                  LONDON A/L & O/L
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-600">
              <Link
                href="/tutor"
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold"
              >
                Tutor Studio
              </Link>
            </nav>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-3">
            {/* Tutor Role Badge */}
            <Badge variant="roleInstructor" className="text-[11px] px-2.5 py-1 font-bold">
              Tutor
            </Badge>

            {/* Notification Center */}
            <NotificationBell userRole="INSTRUCTOR" />

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide hidden md:block">
                {tutorName}
              </span>
              <div className="w-8 h-8 rounded-full bg-[#0c2461] text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden">
                {tutor?.avatar ? (
                  <img src={tutor.avatar} alt={tutorName} className="w-full h-full object-cover" />
                ) : (
                  tutorName.charAt(0)
                )}
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>



      {/* ========================================================================= */}
      {/* 3. MAIN DASHBOARD 3-COLUMN WORKSPACE                                      */}
      {/* ========================================================================= */}
      <main className="max-w-[1480px] mx-auto w-full px-4 sm:px-6 py-6 space-y-5 flex-1">
        
        {/* 3-Column Grid Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ===================================================================== */}
          {/* LEFT SIDEBAR (col-span-3) - Navigation, Quick Tools, Online Scholars */}
          {/* ===================================================================== */}
          <aside className="lg:col-span-3 space-y-4">
            
            {/* Block 1: Navigation Tree (Dashboard style) */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Navigation
              </h3>
              <div className="space-y-2 text-xs font-medium text-slate-700">
                <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tutor Studio</span>
                </div>

                <div className="pl-4 space-y-1.5 text-slate-600">
                  <Link href="/" className="flex items-center gap-1.5 hover:text-blue-700 transition-colors">
                    <Home className="w-3.5 h-3.5 text-slate-400" />
                    <span>Site home</span>
                  </Link>

                  <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-blue-700 transition-colors">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>Student Dashboard View</span>
                  </Link>

                  {/* My Courses Navigation Tree */}
                  <div>
                    <div
                      onClick={() => setNavCoursesOpen(!navCoursesOpen)}
                      className="flex items-center gap-1.5 cursor-pointer hover:text-blue-700 font-semibold text-slate-800 transition-colors"
                    >
                      {navCoursesOpen ? (
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      )}
                      <span>My Taught Courses ({courses.length})</span>
                    </div>

                    {navCoursesOpen && (
                      <div className="pl-4 pt-1 space-y-1 text-[11px] text-slate-600">
                        {courses.length > 0 ? (
                          courses.map((c, idx) => (
                            <Link
                              key={c.id || idx}
                              href={`/courses/${c.slug}`}
                              className="flex items-center gap-1.5 hover:text-blue-700 cursor-pointer py-0.5 truncate group"
                              title={c.title}
                            >
                              <ChevronRight className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                              <span className="truncate group-hover:underline">{c.title}</span>
                            </Link>
                          ))
                        ) : (
                          <div className="text-slate-400 italic py-0.5">No assigned courses</div>
                        )}
                        <Link
                          href="/courses"
                          className="flex items-center gap-1.5 text-blue-700 font-semibold hover:underline cursor-pointer pt-1"
                        >
                          <span className="w-2 h-2 bg-blue-700 rounded-2xs inline-block" />
                          <span>Browse all courses...</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Block 2: Quick Studio Management Tools */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Faculty Tools
              </h3>

              <div className="space-y-1.5 text-xs font-medium">
                <button
                  onClick={() => setCenterTab("courses")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                    centerTab === "courses"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>My Courses & Syllabus</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-bold">
                    {courses.length}
                  </span>
                </button>

                <button
                  onClick={() => setCenterTab("classes")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                    centerTab === "classes"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-purple-600" />
                    <span>Live Classes</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-bold">
                    {events.length}
                  </span>
                </button>

                <button
                  onClick={() => setCenterTab("students")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                    centerTab === "students"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Enrolled Scholars</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-bold">
                    {students.length}
                  </span>
                </button>

                <button
                  onClick={() => setCenterTab("trials")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                    centerTab === "trials"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>1-on-1 Trial Bookings</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                    {trials.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Block 3: Enrolled Scholars Online / Direct Chat */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Scholars Roster ({students.length})
                </h3>
                <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online</span>
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {students.slice(0, 6).map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {st.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{st.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {st.enrolledCourses[0]?.courseTitle || "London A/L"}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openChatWithStudent(st.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      title="Direct Encrypted Message"
                    >
                      <MessageSquareLock className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {students.length > 6 && (
                <button
                  onClick={() => setCenterTab("students")}
                  className="w-full text-center text-xs font-semibold text-blue-600 hover:underline pt-1"
                >
                  View all {students.length} scholars...
                </button>
              )}
            </div>

          </aside>

          {/* ===================================================================== */}
          {/* CENTER COLUMN (col-span-6) - Main Workspace Content                  */}
          {/* ===================================================================== */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Center Tab Header Switcher */}
            <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-2xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCenterTab("courses")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  centerTab === "courses"
                    ? "bg-[#0c2461] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>My Courses ({courses.length})</span>
              </button>

              <button
                onClick={() => setCenterTab("classes")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  centerTab === "classes"
                    ? "bg-[#0c2461] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Live Classes ({events.length})</span>
              </button>

              <button
                onClick={() => setCenterTab("students")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  centerTab === "students"
                    ? "bg-[#0c2461] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Scholars Directory ({students.length})</span>
              </button>

              <button
                onClick={() => setCenterTab("trials")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  centerTab === "trials"
                    ? "bg-[#0c2461] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Trials ({trials.length})</span>
              </button>
            </div>

            {/* VIEW 1: MY COURSES & CURRICULUM */}
            {centerTab === "courses" && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      Assigned Curriculum Courses
                    </h3>

                    {/* Search Course Input */}
                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search courses..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {filteredCourses.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 italic">
                      No courses match your search.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredCourses.map((c) => (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all flex flex-col justify-between space-y-3 shadow-2xs"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                {c.subjectCode || "LONDON A/L"}
                              </span>
                              <span className="text-xs font-bold text-slate-900 font-mono">
                                £{c.price}
                              </span>
                            </div>

                            <h4 className="font-bold text-xs text-slate-900 line-clamp-2">
                              {c.title}
                            </h4>

                            <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-slate-400" />
                                {c.modules?.length || 0} Modules
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3 text-slate-400" />
                                {c.materials?.length || 0} Handbooks
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-slate-400" />
                                {c.enrollments?.length || 0} Scholars
                              </span>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                            <Link
                              href={`/courses/${c.slug}`}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <span>Open Syllabus</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>

                            <button
                              onClick={() => {
                                setScheduleMode("COURSE");
                                setNewClassCourseId(c.id);
                                setNewClassTitle(`Live Class: ${c.title}`);
                                setShowScheduleModal(true);
                              }}
                              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-md"
                            >
                              + Schedule
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: LIVE CLASSES */}
            {centerTab === "classes" && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      Live Classroom Sessions
                    </h3>

                    {/* Filter Pills */}
                    <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
                      {(["ALL", "LIVE", "SCHEDULED", "COMPLETED"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setClassFilter(f)}
                          className={`px-2.5 py-1 font-bold rounded-md transition-all ${
                            classFilter === f
                              ? "bg-white text-blue-700 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {f === "ALL" && "All"}
                          {f === "LIVE" && "Live Now"}
                          {f === "SCHEDULED" && "Upcoming"}
                          {f === "COMPLETED" && "Past"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 italic">
                      No live sessions found for this filter.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredEvents.map((ev) => {
                        const isLive = ev.status === "LIVE";
                        const isCompleted = ev.status === "COMPLETED";

                        return (
                          <div
                            key={ev.id}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isLive
                                ? "bg-red-50/50 border-red-200"
                                : "bg-white border-slate-200 hover:border-blue-200"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">
                                  {ev.title}
                                </span>
                                {isLive && (
                                  <Badge className="bg-red-600 text-white font-extrabold text-[9px] animate-pulse">
                                    ● LIVE
                                  </Badge>
                                )}
                                {isCompleted && (
                                  <Badge className="bg-slate-100 text-slate-600 text-[9px]">
                                    Ended
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {new Date(ev.dueDate).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {ev.meetingLink && (
                                  <a
                                    href={getSafeMeetingLink(ev.meetingLink)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline truncate max-w-[180px]"
                                  >
                                    {ev.meetingLink}
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {isLive ? (
                                <>
                                  <a
                                    href={getSafeMeetingLink(ev.meetingLink)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                                  >
                                    Join Room
                                  </a>
                                  <button
                                    onClick={() => handleEndClass(ev.id)}
                                    disabled={endingClassId === ev.id}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50"
                                  >
                                    End
                                  </button>
                                </>
                              ) : isCompleted ? null : (
                                <>
                                  <button
                                    onClick={() => handleStartClass(ev.id, ev.meetingLink)}
                                    disabled={startingClassId === ev.id}
                                    className="px-3 py-1.5 rounded-lg bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold cursor-pointer"
                                  >
                                    Start
                                  </button>
                                  <a
                                    href={buildGoogleCalendarUrl({
                                      title: ev.title,
                                      description: ev.description || "",
                                      dueDate: ev.dueDate,
                                      location: ev.meetingLink || "",
                                    })}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                    title="Add to Google Calendar"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    onClick={() => handleDeleteClass(ev.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600"
                                    title="Delete Class"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 3: ENROLLED SCHOLARS */}
            {centerTab === "students" && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      Enrolled Scholars Directory ({filteredStudents.length})
                    </h3>

                    {/* Search & Filter */}
                    <div className="flex items-center gap-2">
                      <div className="relative w-full sm:w-44">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search scholar..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <select
                        value={selectedCourseFilter}
                        onChange={(e) => setSelectedCourseFilter(e.target.value)}
                        className="py-1 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
                      >
                        <option value="ALL">All Courses</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.subjectCode || c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 italic">
                      No scholars match your query.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredStudents.map((st) => (
                        <div
                          key={st.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-2.5"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                                {st.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-slate-900">{st.name}</h4>
                                <p className="text-[10px] text-slate-500">{st.email}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => setSelectedStudentForModal(st)}
                              className="text-slate-400 hover:text-slate-700 p-1"
                              title="View Scholar Details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {st.enrolledCourses.map((c, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-medium truncate max-w-[160px]"
                              >
                                {c.courseTitle}
                              </span>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                            <button
                              onClick={() => openChatWithStudent(st.id)}
                              className="flex-1 py-1 text-center rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold flex items-center justify-center gap-1"
                            >
                              <MessageSquareLock className="w-3 h-3 text-blue-600" />
                              <span>Message</span>
                            </button>

                            <button
                              onClick={() => openScheduleForStudent(st)}
                              className="flex-1 py-1 text-center rounded-md bg-[#0c2461] hover:bg-[#103080] text-white text-[11px] font-bold"
                            >
                              1-on-1 Class
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 4: 1-ON-1 TRIALS */}
            {centerTab === "trials" && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      Student 1-on-1 Free Trial Bookings ({trials.length})
                    </h3>
                    <Badge className="bg-amber-100 text-amber-800 text-xs font-bold">
                      30-Min Sessions
                    </Badge>
                  </div>

                  {trials.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 italic">
                      No trial booking inquiries received.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {trials.map((tr) => (
                        <div
                          key={tr.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">
                                {tr.studentName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                ({tr.course?.title || "London A/L"})
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1 font-mono text-blue-700 font-bold">
                                <Clock className="w-3 h-3 text-blue-600" />
                                {new Date(tr.preferredDate).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span>{tr.studentEmail}</span>
                              {tr.studentPhone && <span>{tr.studentPhone}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <a
                              href={`mailto:${tr.studentEmail}?subject=EduPulse Trial Session&body=Dear ${tr.studentName},`}
                              className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold hover:bg-slate-50"
                            >
                              Email
                            </a>
                            <a
                              href={buildGoogleCalendarUrl({
                                title: `30-Min Trial: ${tr.studentName}`,
                                description: `1-on-1 Consultation for ${tr.course?.title || "London A/L"}`,
                                dueDate: tr.preferredDate,
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-md bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold"
                            >
                              Add to Calendar
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ===================================================================== */}
          {/* RIGHT SIDEBAR (col-span-3) - Faculty Card, Calendar, Studio Metrics   */}
          {/* ===================================================================== */}
          <aside className="lg:col-span-3 space-y-4">
            
            {/* Block 1: Faculty Profile Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Faculty Lead Profile
                </h3>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-950 text-white overflow-hidden border border-slate-200 shrink-0">
                  <img
                    src={
                      tutor?.avatar ||
                      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                    }
                    alt={tutorName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 truncate">{tutorName}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{tutor?.headline || "Subject Lead"}</p>
                  <span className="text-[10px] text-emerald-700 font-bold">● Active Online</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed border-t border-slate-100 pt-2">
                {tutor?.bio || "UK Faculty Educator specializing in London A/L & O/L Pearson Edexcel and Cambridge syllabi."}
              </p>
            </div>

            {/* Block 2: Upcoming Class Schedule */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Upcoming Classes
                </h3>
                <span className="text-[11px] font-bold text-blue-700 font-mono">
                  {events.length} Scheduled
                </span>
              </div>

              <div className="space-y-2">
                {events.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    No scheduled sessions.
                  </p>
                ) : (
                  events.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1"
                    >
                      <div className="font-bold text-slate-900 truncate">{ev.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                        <span>
                          {new Date(ev.dueDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-blue-600 font-semibold">Live Seminar</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <CalendarCheck className="w-3 h-3 text-blue-600" />
                  <span>Synced with Faculty Schedule</span>
                </span>
                <button
                  onClick={goToToday}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Jump to Today
                </button>
              </div>
            </div>

            {/* Block 3: Interactive Calendar Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {calDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevMonth}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600"
                    title="Next month"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 text-center text-xs">
                {calendarDays.map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} className="p-1" />;
                  const isToday =
                    date.getDate() === new Date().getDate() &&
                    date.getMonth() === new Date().getMonth() &&
                    date.getFullYear() === new Date().getFullYear();

                  const hasEvents = hasEventOnDate(date);

                  return (
                    <div
                      key={date.toISOString()}
                      className={`p-1 relative flex flex-col items-center justify-center rounded-md ${
                        isToday
                          ? "bg-[#0c2461] text-white font-bold"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-[11px] leading-tight">{date.getDate()}</span>
                      {hasEvents && (
                        <span
                          className={`w-1 h-1 rounded-full mt-0.5 ${
                            isToday ? "bg-amber-300" : "bg-blue-600"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Block 4: Studio Statistics Summary */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-2.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Studio Statistics
              </h3>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="font-bold text-slate-900 text-sm">{students.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Scholars</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="font-bold text-slate-900 text-sm">{courses.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Courses</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="font-bold text-slate-900 text-sm">{events.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Classes</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="font-bold text-slate-900 text-sm">{trials.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Trials</div>
                </div>
              </div>
            </div>

          </aside>

        </div>

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
                <div className="p-2 rounded-xl bg-[#0c2461] text-white">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Schedule Live Classroom Session
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
                  placeholder="e.g. Pure Mathematics Unit 4 Differential Calculus Past Papers"
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

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Edit Faculty Qualifications
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update lecturer identity, credentials, and contact details
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
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
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span>{profileStatusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Full Name *</label>
                <Input
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Academic Headline</label>
                <Input
                  value={profileHeadline}
                  onChange={(e) => setProfileHeadline(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Avatar URL</label>
                <Input
                  value={profileAvatar}
                  onChange={(e) => setProfileAvatar(e.target.value)}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Phone / WhatsApp</label>
                <Input
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Biography</label>
                <textarea
                  rows={3}
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProfileModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={profileSaving}
                  className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-5"
                >
                  {profileSaving ? "Saving..." : "Save Changes"}
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
                <div className="w-11 h-11 rounded-xl bg-[#0c2461] text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  {selectedStudentForModal.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedStudentForModal.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
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
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
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
                className="bg-[#0c2461] hover:bg-[#103080] text-white gap-1.5"
              >
                <MessageSquareLock className="w-3.5 h-3.5" />
                <span>Open Chat</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
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
            name: tutorName,
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
            Initializing Tutor Studio...
          </p>
        </div>
      }
    >
      <TutorDashboardContent />
    </Suspense>
  );
}
