"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Upload,
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Button } from "@/components/ui/button";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { TrialRequestModal } from "@/components/trials/TrialRequestModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { EncryptedChatDrawer } from "@/components/chat/EncryptedChatDrawer";

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

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  headline: string | null;
  createdCourses?: Array<{
    id: string;
    title: string;
    slug: string;
    subjectCode: string | null;
    category: string;
    modules?: Array<{
      lessons: Array<{ id: string; title: string }>;
    }>;
  }>;
  enrollments: Array<{
    course: {
      id: string;
      title: string;
      slug: string;
      subjectCode: string | null;
      category: string;
      modules: Array<{
        lessons: Array<{ id: string; title: string }>;
      }>;
    };
  }>;
  privateFiles: Array<{
    id: string;
    fileName: string;
    fileSize: string;
    fileType: string;
    fileUrl?: string | null;
    createdAt: string;
  }>;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string | null;
    awardedAt: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    description: string | null;
    dueDate: string;
    type: string;
  }>;
}

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  // Authentic Database User Role
  const userRole: "STUDENT" | "INSTRUCTOR" | "ADMIN" = user?.role || "STUDENT";

  // Navigation tree expansion
  const [navCoursesOpen, setNavCoursesOpen] = useState(true);
  const [navSitePagesOpen, setNavSitePagesOpen] = useState(false);

  // Timeline filters & sorting
  const [timelinePeriod, setTimelinePeriod] = useState("all");
  const [timelineSort, setTimelineSort] = useState("date");
  const [timelineSearch, setTimelineSearch] = useState("");
  const [calendarCourseFilter, setCalendarCourseFilter] = useState("all");

  // Monthly Calendar Navigation & Selected Day State
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Modals
  const [showManageFilesModal, setShowManageFilesModal] = useState(false);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedTrialCourseId, setSelectedTrialCourseId] = useState<string | undefined>(undefined);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [activeChatRecipientId, setActiveChatRecipientId] = useState<string | undefined>(undefined);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventType, setNewEventType] = useState("LIVE_SEMINAR");
  const [newEventCourseId, setNewEventCourseId] = useState("");
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventSuccess, setEventSuccess] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  // Real File Upload State
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Live Class Banner
  const [liveClassBanner, setLiveClassBanner] = useState<{
    title: string;
    meetingLink: string;
  } | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [seenLiveEventIds, setSeenLiveEventIds] = useState<Set<string>>(new Set());

  // Fetch real records from server
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setAllCourses(data.allCourses || []);
        setOnlineUsers(data.onlineUsers || []);
        setTimelineEvents(data.timelineEvents || []);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Check for any newly LIVE events after each data sync
  useEffect(() => {
    if (!timelineEvents || userRole !== "STUDENT") return;
    const liveEv = timelineEvents.find(
      (ev: any) => ev.status === "LIVE" && !seenLiveEventIds.has(ev.id)
    );
    if (liveEv) {
      setSeenLiveEventIds((prev) => new Set(prev).add(liveEv.id));
      setLiveClassBanner({
        title: liveEv.title,
        meetingLink: liveEv.meetingLink || "https://meet.google.com/new",
      });
      setBannerVisible(true);
    }
  }, [timelineEvents, userRole, seenLiveEventIds]);

  // Real-time synchronization across open tabs without page reload
  const { isConnected: realtimeConnected } = useRealtimeSync({
    onSync: () => {
      fetchDashboardData();
    },
  });

  // Role-specific assigned/enrolled courses
  const myCourses: any[] = useMemo(() => {
    if (userRole === "STUDENT") {
      return (user?.enrollments || []).map((e) => e.course).filter(Boolean);
    }
    if (userRole === "INSTRUCTOR") {
      return user?.createdCourses && user.createdCourses.length > 0
        ? user.createdCourses
        : allCourses;
    }
    return allCourses;
  }, [userRole, user, allCourses]);

  // Pre-fetch course details in background for instant 0ms clicks
  const prefetchCourse = useCallback((slug?: string) => {
    if (!slug || typeof window === "undefined") return;
    const cache = (window as any).__EDU_COURSE_CACHE;
    if (cache && (cache[slug] || cache[decodeURIComponent(slug)])) return;

    fetch(`/api/courses/${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.course) {
          const formatted = {
            ...data.course,
            instructor: {
              name: data.course.instructor?.name || "Dr. Sarah Jenkins",
              avatar: data.course.instructor?.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
              roleTitle: data.course.instructor?.headline || "Senior Faculty Tutor in Mathematics",
              bio: data.course.instructor?.bio || "Subject Lead with 18+ years teaching London A/L & O/L specification.",
            },
          };
          (window as any).__EDU_COURSE_CACHE = (window as any).__EDU_COURSE_CACHE || {};
          (window as any).__EDU_COURSE_CACHE[slug] = formatted;
          if (data.course.slug) (window as any).__EDU_COURSE_CACHE[data.course.slug] = formatted;
          if (data.course.id) (window as any).__EDU_COURSE_CACHE[data.course.id] = formatted;
        }
      })
      .catch(() => {});
  }, []);

  // Background warm cache for assigned/enrolled courses
  useEffect(() => {
    if (myCourses && myCourses.length > 0) {
      myCourses.forEach((c) => {
        if (c.slug) prefetchCourse(c.slug);
      });
    }
  }, [myCourses, prefetchCourse]);

  // Open New Event Modal with prefilled date/time (Instructors and Admins only)
  const handleOpenNewEventModal = (forDate?: Date) => {
    if (userRole === "STUDENT") return;
    const base = forDate || selectedDate || new Date();
    const d = new Date(base);
    if (!forDate) {
      const now = new Date();
      d.setHours(now.getHours() + 1, 0, 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    setNewEventDate(formatForDateTimeInput(d));
    setNewEventTitle("");
    setNewEventDesc("");
    setNewEventType("LIVE_SEMINAR");
    setNewEventCourseId(
      calendarCourseFilter !== "all" ? calendarCourseFilter : (myCourses[0]?.id || "")
    );
    setEventError(null);
    setEventSuccess(null);
    setShowNewEventModal(true);
  };

  // Handle Event Creation saved directly to DB
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === "STUDENT") {
      setEventError("Only faculty tutors and administrators can schedule academic classes and events.");
      return;
    }
    if (!newEventTitle.trim()) {
      setEventError("Please enter an event title.");
      return;
    }

    try {
      setIsSubmittingEvent(true);
      setEventError(null);
      setEventSuccess(null);

      let isoDueDate: string;
      if (newEventDate) {
        const parsed = new Date(newEventDate);
        isoDueDate = !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
      } else {
        isoDueDate = new Date().toISOString();
      }

      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_event",
          title: newEventTitle.trim(),
          description: newEventDesc.trim(),
          dueDate: isoDueDate,
          type: newEventType,
          courseId: newEventCourseId && newEventCourseId !== "none" ? newEventCourseId : null,
          userId: user?.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create calendar event");
      }

      setEventSuccess("Event added to calendar!");
      await fetchDashboardData();
      setTimeout(() => {
        setShowNewEventModal(false);
        setNewEventTitle("");
        setNewEventDesc("");
        setEventSuccess(null);
      }, 500);
    } catch (err: any) {
      console.error("Error creating event:", err);
      setEventError(err.message || "Failed to create event. Please try again.");
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // Handle Delete Event from DB
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      setDeletingEventId(eventId);
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_event",
          eventId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to delete event");
      }

      await fetchDashboardData();
    } catch (err: any) {
      console.error("Error deleting event:", err);
      alert(err.message || "Failed to delete event");
    } finally {
      setDeletingEventId(null);
    }
  };

  // Monthly Calendar Navigation & Calculations
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();

  const prevMonth = () => {
    setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCalendarMonth(today);
    setSelectedDate(today);
  };

  // Filter events strictly assigned to the student
  const studentTimelineEvents = useMemo(() => {
    if (userRole !== "STUDENT") return timelineEvents;
    const enrolledCourseIds = new Set(myCourses.map((c) => c.id));
    return timelineEvents.filter((ev) => {
      // 1. Directly assigned to this specific student (e.g. 1-on-1 trial session, individual mock assessment)
      if (ev.userId && user?.id && ev.userId === user.id) return true;
      // 2. Assigned to a course the student is enrolled in (and not assigned exclusively to another student)
      const matchesCourse =
        (ev.courseId && enrolledCourseIds.has(ev.courseId)) ||
        (ev.course?.id && enrolledCourseIds.has(ev.course.id));
      if (matchesCourse && (!ev.userId || (user?.id && ev.userId === user.id))) {
        return true;
      }
      return false;
    });
  }, [timelineEvents, userRole, myCourses, user]);

  // Calendar Days Grid Generation
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
    const firstDayOfWeek = new Date(calendarYear, calendarMonthIndex, 1).getDay(); // 0 is Sunday
    const startOffset = (firstDayOfWeek + 6) % 7; // Monday = 0, Sunday = 6

    const prevMonthDaysCount = new Date(calendarYear, calendarMonthIndex, 0).getDate();

    const cells: Array<{
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      events: any[];
    }> = [];

    const todayStr = new Date().toDateString();
    const selectedStr = selectedDate?.toDateString() || "";

    // Trailing days from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const date = new Date(calendarYear, calendarMonthIndex - 1, d);
      const dateStr = date.toDateString();
      const events = studentTimelineEvents.filter((ev) => {
        const matchDate = new Date(ev.dueDate).toDateString() === dateStr;
        if (!matchDate) return false;
        if (calendarCourseFilter !== "all") {
          return ev.courseId === calendarCourseFilter || ev.course?.id === calendarCourseFilter;
        }
        return true;
      });

      cells.push({
        date,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedStr,
        events,
      });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calendarYear, calendarMonthIndex, d);
      const dateStr = date.toDateString();
      const events = studentTimelineEvents.filter((ev) => {
        const matchDate = new Date(ev.dueDate).toDateString() === dateStr;
        if (!matchDate) return false;
        if (calendarCourseFilter !== "all") {
          return ev.courseId === calendarCourseFilter || ev.course?.id === calendarCourseFilter;
        }
        return true;
      });

      cells.push({
        date,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedStr,
        events,
      });
    }

    // Leading days of next month
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(calendarYear, calendarMonthIndex + 1, d);
      const dateStr = date.toDateString();
      const events = studentTimelineEvents.filter((ev) => {
        const matchDate = new Date(ev.dueDate).toDateString() === dateStr;
        if (!matchDate) return false;
        if (calendarCourseFilter !== "all") {
          return ev.courseId === calendarCourseFilter || ev.course?.id === calendarCourseFilter;
        }
        return true;
      });

      cells.push({
        date,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedStr,
        events,
      });
    }

    return cells;
  }, [calendarYear, calendarMonthIndex, studentTimelineEvents, calendarCourseFilter, selectedDate]);

  // Selected Day's Events
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const selectedStr = selectedDate.toDateString();
    return studentTimelineEvents.filter((ev) => {
      const matchDate = new Date(ev.dueDate).toDateString() === selectedStr;
      if (!matchDate) return false;
      if (calendarCourseFilter !== "all") {
        return ev.courseId === calendarCourseFilter || ev.course?.id === calendarCourseFilter;
      }
      return true;
    });
  }, [selectedDate, studentTimelineEvents, calendarCourseFilter]);

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    let list = [...studentTimelineEvents];
    if (calendarCourseFilter !== "all") {
      list = list.filter(
        (ev) => ev.courseId === calendarCourseFilter || ev.course?.id === calendarCourseFilter
      );
    }
    const now = new Date().getTime() - 24 * 60 * 60 * 1000;
    return list
      .filter((ev) => new Date(ev.dueDate).getTime() >= now)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [studentTimelineEvents, calendarCourseFilter]);

  // Filtered timeline events
  const filteredTimeline = useMemo(() => {
    let list = [...studentTimelineEvents];

    if (calendarCourseFilter !== "all") {
      list = list.filter(
        (ev) => ev.courseId === calendarCourseFilter || ev.course?.id === calendarCourseFilter
      );
    }

    if (timelinePeriod !== "all") {
      const days = parseInt(timelinePeriod, 10);
      if (!isNaN(days)) {
        const now = Date.now();
        const futureLimit = now + days * 24 * 60 * 60 * 1000;
        list = list.filter((ev) => {
          const t = new Date(ev.dueDate).getTime();
          return t >= now - 24 * 60 * 60 * 1000 && t <= futureLimit;
        });
      }
    }

    if (timelineSearch.trim()) {
      const q = timelineSearch.toLowerCase();
      list = list.filter(
        (ev) =>
          ev.title.toLowerCase().includes(q) ||
          (ev.description && ev.description.toLowerCase().includes(q)) ||
          (ev.course?.title && ev.course.title.toLowerCase().includes(q)) ||
          (ev.type && ev.type.toLowerCase().includes(q))
      );
    }

    if (timelineSort === "course") {
      list.sort((a, b) => (a.course?.title || "").localeCompare(b.course?.title || ""));
    } else {
      list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }

    return list;
  }, [studentTimelineEvents, calendarCourseFilter, timelinePeriod, timelineSearch, timelineSort]);

  // Handle Add Private File - Uploads real file to VPS storage & saves to DB
  const handleAddPrivateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadFile || !user) return;

    try {
      setUploadingFile(true);
      setUploadError(null);
      setUploadSuccess(null);

      const formData = new FormData();
      formData.append("file", selectedUploadFile);
      formData.append("category", "document");
      formData.append("isPrivate", "true");
      formData.append("userId", user.id);
      formData.append("saveToDb", "true");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      setUploadSuccess(`"${selectedUploadFile.name}" successfully uploaded!`);
      setSelectedUploadFile(null);
      await fetchDashboardData();
    } catch (err: any) {
      console.error("Error uploading private file:", err);
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle Delete Private File from DB
  const handleDeletePrivateFile = async (fileId: string) => {
    try {
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_private_file",
          fileId,
        }),
      });

      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("Error deleting private file:", err);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      window.location.href = "/login";
    }
  };

  // Dynamic user naming based on authentic database user
  const getRoleUserHeader = () => {
    if (userRole === "INSTRUCTOR") {
      return {
        name: user?.name || "Dr. Sarah Jenkins",
        title: user?.headline || "Senior Faculty Tutor in Pure Mathematics",
        badge: "Faculty Tutor",
        avatar: user?.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      };
    } else if (userRole === "ADMIN") {
      return {
        name: user?.name || "Dr. Alastair Vance",
        title: user?.headline || "System Administrator",
        badge: "System Admin",
        avatar: user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      };
    } else {
      return {
        name: user?.name || "S.Y.T. Perera",
        title: user?.headline || "London A/L Student",
        badge: "Student",
        avatar: user?.avatar || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
      };
    }
  };

  const currentProfile = getRoleUserHeader();
  const shortGreetingName = currentProfile.name.split(" ")[0];

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800 font-sans flex flex-col antialiased">

      {/* ── LIVE CLASS BANNER ─────────────────────────────────────────────── */}
      {liveClassBanner && (
        <div
          className={`fixed top-0 left-0 right-0 z-[999] transition-transform duration-500 ease-out ${
            bannerVisible ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping inline-block opacity-80" />
                <span className="w-2.5 h-2.5 rounded-full bg-white inline-block -ml-4" />
              </span>
              <div className="min-w-0">
                <span className="font-bold text-sm">Class is Live Now!</span>
                <span className="text-white/80 text-xs ml-2 truncate">{liveClassBanner.title}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={liveClassBanner.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 bg-white text-red-700 font-bold text-xs rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5 shadow"
              >
                <Video className="w-3.5 h-3.5" />
                Join Now
              </a>
              <button
                onClick={() => {
                  setBannerVisible(false);
                  setTimeout(() => setLiveClassBanner(null), 500);
                }}
                className="p-1 rounded hover:bg-red-700 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP LMS NAVIGATION HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Left: Brand Logo & Dropdown Services Menu */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-[#0c2461] text-white flex items-center justify-center font-black text-sm shadow-xs">
                <GraduationCap className="w-5 h-5 text-sky-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-wider text-[#0c2461] leading-none">
                  ACADEMY
                </span>
                <span className="text-[8px] font-bold tracking-widest text-sky-600">
                  LONDON A/L & O/L
                </span>
              </div>
            </Link>

            {userRole === "ADMIN" && (
              <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-600">
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Console</span>
                </Link>
              </nav>
            )}
          </div>

          {/* Right Header Utilities: Role Badge, Search, User Profile, Sign Out */}
          <div className="flex items-center gap-3">
            {/* User Role Badge */}
            <Badge
              variant={
                userRole === "INSTRUCTOR"
                  ? "roleInstructor"
                  : userRole === "ADMIN"
                  ? "roleAdmin"
                  : "roleStudent"
              }
              className="text-[11px] px-2.5 py-1 font-bold"
            >
              {currentProfile.badge}
            </Badge>

            {/* Notification Center */}
            <NotificationBell userRole={userRole} />

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide hidden md:block">
                {currentProfile.name}
              </span>
              <div className="w-8 h-8 rounded-full bg-[#0c2461] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {currentProfile.name.charAt(0)}
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



      {/* 3. MAIN DASHBOARD 3-COLUMN WORKSPACE */}
      <main className="max-w-[1480px] mx-auto w-full px-4 sm:px-6 py-6 space-y-5 flex-1">

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ======================================================== */}
          {/* LEFT SIDEBAR (Navigation, Private Files, Online Users) */}
          {/* ======================================================== */}
          <aside className="lg:col-span-3 space-y-4">
            {/* Block 1: Navigation Tree */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Navigation
              </h3>
              <div className="space-y-2 text-xs font-medium text-slate-700">
                <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dashboard</span>
                </div>

                <div className="pl-4 space-y-1.5 text-slate-600">
                  <Link href="/" className="flex items-center gap-1.5 hover:text-blue-700 transition-colors">
                    <Home className="w-3.5 h-3.5 text-slate-400" />
                    <span>Site home</span>
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
                      <span>
                        {userRole === "INSTRUCTOR" ? "My Assigned Units" : "My courses"}
                      </span>
                    </div>

                    {navCoursesOpen && (
                      <div className="pl-4 pt-1 space-y-1 text-[11px] text-slate-600">
                        {myCourses.length > 0 ? (
                          myCourses.map((c, idx) => (
                            <Link
                              key={c.id || idx}
                              href={c.slug ? `/courses/${c.slug}` : "/courses"}
                              prefetch={true}
                              onMouseEnter={() => prefetchCourse(c.slug)}
                              className="flex items-center gap-1.5 hover:text-blue-700 cursor-pointer py-0.5 truncate group"
                              title={c.title}
                            >
                              <ChevronRight className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                              <span className="truncate group-hover:underline">{c.title}</span>
                            </Link>
                          ))
                        ) : (
                          <div className="text-slate-400 italic py-0.5">No enrolled courses</div>
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

            {/* Block 2: Private Files */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Private files
                </h3>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Private Cloud Storage
                </span>
              </div>

              {user?.privateFiles && user.privateFiles.length > 0 ? (
                <div className="space-y-1.5">
                  {user.privateFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between text-xs group hover:bg-blue-50/50 transition-colors"
                    >
                      <a
                        href={file.fileUrl || "#"}
                        target={file.fileUrl ? "_blank" : undefined}
                        rel="noreferrer"
                        className="flex items-center gap-2 min-w-0 flex-1 hover:underline text-left"
                        title={file.fileUrl ? "Open file" : file.fileName}
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate text-[11px] group-hover:text-blue-700">
                            {file.fileName}
                          </div>
                          <div className="text-[10px] text-slate-400">{file.fileSize}</div>
                        </div>
                      </a>
                      <div className="flex items-center gap-1">
                        {file.fileUrl && (
                          <a
                            href={file.fileUrl}
                            download={file.fileName}
                            className="text-slate-400 hover:text-blue-600 p-1"
                            title="Download file"
                          >
                            <Download className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeletePrivateFile(file.id)}
                          className="text-slate-300 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete file"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No private files stored yet</p>
              )}

              <button
                onClick={() => setShowManageFilesModal(true)}
                className="text-xs font-semibold text-blue-700 hover:underline block pt-1"
              >
                Manage private files...
              </button>
            </div>

            {/* Block 3: Academic Calendar */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevMonth}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Next month"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="py-1">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 text-center text-xs">
                {calendarDays.map((cell, idx) => {
                  const hasEvents = cell.events.length > 0;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(cell.date)}
                      className={`p-1 flex flex-col items-center justify-center rounded-md cursor-pointer ${
                        cell.isToday
                          ? "bg-[#0c2461] text-white font-bold"
                          : cell.isSelected
                          ? "bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-400"
                          : cell.isCurrentMonth
                          ? "text-slate-700 hover:bg-slate-100"
                          : "text-slate-300"
                      }`}
                    >
                      <span className="text-[11px] leading-tight">{cell.dayNumber}</span>
                      {hasEvents && (
                        <span
                          className={`w-1 h-1 rounded-full mt-0.5 ${
                            cell.isToday ? "bg-amber-300" : "bg-blue-600"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </aside>

          {/* ======================================================== */}
          {/* CENTER MAIN FEED (Role-Specific Workspaces) */}
          {/* ======================================================== */}
          <section className="lg:col-span-9 space-y-5">
            {/* Block 1: Timeline Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Timeline & Deadlines</span>
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {filteredTimeline.length} {filteredTimeline.length === 1 ? "Activity" : "Activities"}
                </span>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                <select
                  value={timelinePeriod}
                  onChange={(e) => setTimelinePeriod(e.target.value)}
                  className="sm:col-span-3 h-8 rounded border border-slate-300 px-2 bg-white font-medium text-slate-700"
                >
                  <option value="all">All upcoming & past</option>
                  <option value="7">Next 7 days</option>
                  <option value="14">Next 14 days</option>
                  <option value="30">Next 30 days</option>
                </select>

                <select
                  value={timelineSort}
                  onChange={(e) => setTimelineSort(e.target.value)}
                  className="sm:col-span-3 h-8 rounded border border-slate-300 px-2 bg-white font-medium text-slate-700"
                >
                  <option value="date">Sort by due date</option>
                  <option value="course">Sort by course</option>
                </select>

                <div className="sm:col-span-6 relative">
                  <input
                    type="text"
                    placeholder="Search activities, titles or courses..."
                    value={timelineSearch}
                    onChange={(e) => setTimelineSearch(e.target.value)}
                    className="w-full h-8 rounded border border-slate-300 pl-8 pr-3 text-xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Timeline Items */}
              <div className="pt-1">
                {filteredTimeline.length > 0 ? (
                  <div className="space-y-2.5">
                    {filteredTimeline.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-blue-50/30 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-blue-100 text-blue-800 shrink-0 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-xs text-slate-900 leading-snug">
                                {ev.title}
                              </h4>
                              {ev.status === "LIVE" && (
                                <Badge className="bg-red-600 text-white text-[9px] font-black uppercase flex items-center gap-1">
                                  <Radio className="w-2.5 h-2.5 animate-pulse text-white" />
                                  <span>Live Now</span>
                                </Badge>
                              )}
                              {ev.type && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  ev.type === "WORKSHOP"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : ev.type === "LIVE_SEMINAR"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : ev.type === "DEADLINE"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}>
                                  {ev.type.replace("_", " ")}
                                </span>
                              )}
                            </div>
                            {ev.description && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {ev.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                              <span className="text-blue-700 font-semibold flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-blue-600" />
                                {new Date(ev.dueDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {ev.course && (
                                <span className="text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[180px]">
                                  {ev.course.title}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {ev.status === "LIVE" ? (
                            <a
                              href={getSafeMeetingLink(ev.meetingLink || ev.description?.match(/https?:\/\/[^\s]+/)?.[0])}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 animate-pulse"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Live Meet</span>
                            </a>
                          ) : ev.description?.includes("http") || ev.meetingLink ? (
                            <a
                              href={getSafeMeetingLink(ev.meetingLink || ev.description?.match(/https?:\/\/[^\s]+/)?.[0])}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-semibold text-xs border border-emerald-200 transition-all shadow-2xs inline-flex items-center gap-1"
                            >
                              <Video className="w-3 h-3 text-emerald-600" />
                              <span>Meet Room</span>
                            </a>
                          ) : null}

                          <a
                            href={buildGoogleCalendarUrl({
                              title: ev.title,
                              description: ev.description,
                              dueDate: ev.dueDate,
                              courseTitle: ev.course?.title,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-md bg-white hover:bg-sky-50 text-sky-700 hover:text-sky-800 font-semibold text-xs border border-sky-200 transition-all shadow-2xs inline-flex items-center gap-1"
                            title="Add this class/deadline to Google Calendar"
                          >
                            <Calendar className="w-3 h-3 text-sky-600" />
                            <span>Google Cal</span>
                            <ExternalLink className="w-2.5 h-2.5 text-sky-400" />
                          </a>

                          {ev.course?.slug && (
                            <Link
                              href={`/courses/${ev.course.slug}`}
                              prefetch={true}
                              onMouseEnter={() => prefetchCourse(ev.course.slug)}
                              className="px-2.5 py-1 rounded-md bg-white hover:bg-blue-600 hover:text-white text-blue-700 font-semibold text-xs border border-blue-200 transition-all shadow-2xs"
                            >
                              Study Materials
                            </Link>
                          )}

                          {userRole !== "STUDENT" && (ev.userId === user?.id || userRole === "ADMIN") && (
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              disabled={deletingEventId === ev.id}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete event"
                            >
                              {deletingEventId === ev.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-500 font-semibold">
                      No activities match your current filter
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Block 2: Upcoming Classes Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Upcoming Classes
                </h3>
                <span className="text-[11px] font-bold text-blue-700 font-mono">
                  {upcomingEvents.length} Scheduled
                </span>
              </div>

              <div className="space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    No scheduled sessions.
                  </p>
                ) : (
                  upcomingEvents.slice(0, 4).map((ev) => (
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
                        <span className="text-blue-600 font-semibold">
                          {ev.type === "LIVE_SEMINAR"
                            ? "Live Seminar"
                            : ev.type === "DEADLINE"
                            ? "Deadline"
                            : ev.type === "WORKSHOP"
                            ? "Workshop"
                            : ev.type?.replace("_", " ")}
                        </span>
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

            {/* Block 4: Enrolled Course Cards (Course Overview) */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {userRole === "INSTRUCTOR" ? "My Syllabus Courses" : "Enrolled Course Overview"}
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {myCourses.length} {myCourses.length === 1 ? "Unit" : "Units"} Active
                </span>
              </div>

              {myCourses.length > 0 ? (
                <div className="space-y-4">
                  {myCourses.map((course, idx) => (
                    <div
                      key={course.id || idx}
                      className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-300 transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="text-[10px] font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block border border-blue-200">
                          {course.subjectCode || "Pearson Edexcel"}
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {course.title}
                        </h4>
                        <div className="text-[11px] text-slate-500">
                          {course.category} • {course.modules?.length || 2} Modules Active
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {userRole === "STUDENT" && (course.instructorId || course.instructor?.id) && (
                          <button
                            onClick={() => {
                              setActiveChatRecipientId(course.instructorId || course.instructor?.id);
                              setIsChatDrawerOpen(true);
                            }}
                            className="px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                          >
                            <MessageSquareLock className="w-3.5 h-3.5" />
                            <span>Message Tutor</span>
                          </button>
                        )}

                        <Link
                          href={`/courses/${course.slug}`}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs inline-flex items-center gap-1.5"
                        >
                          <span>{userRole === "INSTRUCTOR" ? "Manage Syllabus & Materials" : "Study Materials & Notes"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-xs text-slate-500 font-medium mb-3">You are not enrolled in any courses yet.</p>
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs"
                  >
                    <span>Explore Available Courses</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* ======================================================== */}
          {/* RIGHT SIDEBAR (For Instructor Stats) */}
          {/* ======================================================== */}
          {userRole === "INSTRUCTOR" && (
            <aside className="lg:col-span-3 space-y-4">
              {/* FOR INSTRUCTOR: Honorarium & Faculty Stats */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Faculty Honorarium & Stats
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-emerald-50 text-emerald-900 font-bold border border-emerald-200">
                    <span>Monthly Clearance:</span>
                    <span>£1,840.00</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Scripts Graded:</span>
                    <span className="font-bold text-slate-900">94 Papers</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Avg Evaluation Turnaround:</span>
                    <span className="font-bold text-slate-900">4.2 Hours</span>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* MODAL 1: MANAGE PRIVATE FILES (VPS LOCAL STORAGE) */}
      {showManageFilesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Manage Private Files</h3>
                  <p className="text-[11px] text-slate-500">Secure Storage for Study Materials & Notes</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowManageFilesModal(false);
                  setSelectedUploadFile(null);
                  setUploadError(null);
                  setUploadSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Upload Feedback */}
            {uploadSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}
            {uploadError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Upload Box */}
            <form onSubmit={handleAddPrivateFile} className="space-y-3 text-xs">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer relative group">
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedUploadFile(e.target.files[0]);
                      setUploadError(null);
                      setUploadSuccess(null);
                    }
                  }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.png,.jpg,.jpeg,.webp,.mp4,.mp3"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  {selectedUploadFile ? (
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 truncate max-w-xs">
                        {selectedUploadFile.name}
                      </div>
                      <div className="text-[11px] text-blue-600 font-semibold">
                        {(selectedUploadFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-700">
                        Choose a file or drag & drop here
                      </div>
                      <div className="text-[11px] text-slate-400">
                        PDF, DOCX, Images, Videos, ZIP up to 100MB
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedUploadFile && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedUploadFile(null)}
                    disabled={uploadingFile}
                    className="h-8 text-xs font-semibold"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={!selectedUploadFile || uploadingFile}
                  className="flex-1 h-8 bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs"
                >
                  {uploadingFile ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving File...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File</span>
                    </span>
                  )}
                </Button>
              </div>
            </form>

            {/* List of Stored Files */}
            <div className="space-y-2 pt-3 border-t border-slate-100 max-h-56 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase">
                <span>Stored Private Files ({user?.privateFiles?.length || 0})</span>
                <span className="text-slate-400 font-normal lowercase">saved to account</span>
              </div>
              {user?.privateFiles && user.privateFiles.length > 0 ? (
                <div className="space-y-1.5">
                  {user.privateFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 hover:bg-slate-100/60 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate max-w-[220px]">
                            {file.fileName}
                          </div>
                          <div className="text-[10px] text-slate-400">{file.fileSize}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {file.fileUrl && (
                          <>
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-blue-50 text-blue-700 text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                              title="Open/View in browser"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View</span>
                            </a>
                            <a
                              href={file.fileUrl}
                              download={file.fileName}
                              className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs"
                              title="Download to device"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                          </>
                        )}
                        <button
                          onClick={() => handleDeletePrivateFile(file.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2 text-center">
                  No private files uploaded yet. Upload lecture notes, mock scripts, or revision guides.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE NEW CALENDAR EVENT (Instructors & Admins Only) */}
      {userRole !== "STUDENT" && showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Add Calendar Event / Academic Task</span>
              </h3>
              <button
                onClick={() => {
                  setShowNewEventModal(false);
                  setEventError(null);
                  setEventSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error & Success Feedback */}
            {eventSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{eventSuccess}</span>
              </div>
            )}
            {eventError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{eventError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Event / Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter event or task title"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Course Association</label>
                <select
                  value={newEventCourseId}
                  onChange={(e) => setNewEventCourseId(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">General / Personal (No specific course)</option>
                  {myCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.subjectCode ? `(${c.subjectCode})` : ""}
                    </option>
                  ))}
                  {myCourses.length === 0 && allCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Due Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Event Type</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="LIVE_SEMINAR">Live Virtual Seminar / Class</option>
                    <option value="WORKSHOP">Virtual Workshop / Masterclass</option>
                    <option value="DEADLINE">Study Deadline / Milestone</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Instructions / Description (Optional)</label>
                <textarea
                  placeholder="Add instructions or description for this event..."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full h-16 p-2 rounded-lg border border-slate-300 text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewEventModal(false);
                    setEventError(null);
                    setEventSuccess(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEvent || !newEventTitle.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[#0c2461] hover:bg-[#103080] disabled:bg-slate-300 text-white font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  {isSubmittingEvent ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Event...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Calendar Event</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REQUEST 30-MINUTE FREE TRIAL ONLINE SESSION */}
      <TrialRequestModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        initialCourseId={selectedTrialCourseId}
        allCourses={allCourses}
        currentUser={user}
        onSuccess={() => {
          fetchDashboardData();
        }}
      />

      {/* End-to-End Encrypted Chat Drawer */}
      {user && (
        <EncryptedChatDrawer
          currentUser={user}
          initialRecipientId={activeChatRecipientId}
          isOpen={isChatDrawerOpen}
          onOpen={() => setIsChatDrawerOpen(true)}
          onClose={() => {
            setIsChatDrawerOpen(false);
            setActiveChatRecipientId(undefined);
          }}
        />
      )}

    </div>
  );
}

export default function MoodleDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Academic LMS Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
