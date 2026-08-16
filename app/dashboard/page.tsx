"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  GraduationCap,
  Search,
  Bell,
  MessageSquare,
  ChevronDown,
  ChevronRight,
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
  Sparkles,
  ShieldCheck,
  Edit3,
  Video,
  FileCheck2,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  headline: string | null;
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
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") as "STUDENT" | "INSTRUCTOR" | "ADMIN" | null;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  // Active View Role (defaults to roleParam, or user role, or STUDENT)
  const [currentRoleView, setCurrentRoleView] = useState<"STUDENT" | "INSTRUCTOR" | "ADMIN">(
    roleParam || "STUDENT"
  );

  // Navigation tree expansion
  const [navCoursesOpen, setNavCoursesOpen] = useState(true);
  const [navSitePagesOpen, setNavSitePagesOpen] = useState(false);

  // Timeline filters
  const [timelinePeriod, setTimelinePeriod] = useState("7");
  const [timelineSearch, setTimelineSearch] = useState("");
  const [calendarCourseFilter, setCalendarCourseFilter] = useState("all");

  // Customization mode
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Modals
  const [showManageFilesModal, setShowManageFilesModal] = useState(false);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedScriptToGrade, setSelectedScriptToGrade] = useState<any>(null);
  const [awardedMarks, setAwardedMarks] = useState("68");
  const [examinerRemarks, setExaminerRemarks] = useState("Excellent method marks in Q1-Q6. In Q7, check integration constant C.");

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventDate, setNewEventDate] = useState("2026-08-23T23:55");
  const [newEventType, setNewEventType] = useState("ASSIGNMENT");
  const [newEventCourseId, setNewEventCourseId] = useState("");

  // New File Upload State
  const [newFileName, setNewFileName] = useState("");
  const [newFileSize, setNewFileSize] = useState("1.4 MB");

  // Fetch real database records from Prisma
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

        if (!roleParam && data.user?.role) {
          setCurrentRoleView(data.user.role);
        }
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

  useEffect(() => {
    if (roleParam) {
      setCurrentRoleView(roleParam);
    }
  }, [roleParam]);

  // Filtered timeline events
  const filteredTimeline = useMemo(() => {
    return timelineEvents.filter((ev) => {
      const matchSearch =
        ev.title.toLowerCase().includes(timelineSearch.toLowerCase()) ||
        (ev.description && ev.description.toLowerCase().includes(timelineSearch.toLowerCase()));
      return matchSearch;
    });
  }, [timelineEvents, timelineSearch]);

  // Handle Event Creation saved directly to DB
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !user) return;

    try {
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_event",
          title: newEventTitle,
          description: newEventDesc,
          dueDate: new Date(newEventDate).toISOString(),
          type: newEventType,
          courseId: newEventCourseId || (allCourses[0]?.id ?? null),
          userId: user.id,
        }),
      });

      if (res.ok) {
        await fetchDashboardData();
        setShowNewEventModal(false);
        setNewEventTitle("");
        setNewEventDesc("");
      }
    } catch (err) {
      console.error("Error creating event:", err);
    }
  };

  // Handle Add Private File saved directly to DB
  const handleAddPrivateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName || !user) return;

    try {
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_private_file",
          fileName: newFileName,
          fileSize: newFileSize,
          userId: user.id,
        }),
      });

      if (res.ok) {
        await fetchDashboardData();
        setNewFileName("");
      }
    } catch (err) {
      console.error("Error adding private file:", err);
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

  // Dynamic user naming based on role view
  const getRoleUserHeader = () => {
    if (currentRoleView === "INSTRUCTOR") {
      return {
        name: "Dr. Sarah Jenkins, M.Sc.",
        title: "Senior Pearson Edexcel Lead Examiner",
        badge: "Chief Examiner",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      };
    } else if (currentRoleView === "ADMIN") {
      return {
        name: "Dr. Alastair Vance, M.Ed.",
        title: "Chief Academic Registrar & Center Dean",
        badge: "Center Admin",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      };
    } else {
      return {
        name: user?.name || "S.Y.T. PERERA",
        title: "London A/L Scholar (Spring / Summer 2026)",
        badge: "Student Scholar",
        avatar: user?.avatar || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
      };
    }
  };

  const currentProfile = getRoleUserHeader();
  const shortGreetingName = currentProfile.name.split(" ")[0];

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800 font-sans flex flex-col antialiased">
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
                  WORLDWIDE
                </span>
              </div>
            </Link>

            {/* University Dropdown Menus */}
            <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-1 hover:text-blue-700 cursor-pointer">
                <span>Services</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <div className="flex items-center gap-1 hover:text-blue-700 cursor-pointer">
                <span>Library</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <div className="flex items-center gap-1 hover:text-blue-700 cursor-pointer">
                <span>Questionnaire</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <div className="flex items-center gap-1 hover:text-blue-700 cursor-pointer">
                <span>Downloads</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <div className="flex items-center gap-1 hover:text-blue-700 cursor-pointer">
                <span>Help</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </nav>
          </div>

          {/* Right Header Utilities: Role Switcher, Search, Bell, Messages, User Profile */}
          <div className="flex items-center gap-3">
            {/* Quick Role Switcher Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-[11px] font-bold text-slate-500 pl-1 hidden sm:inline">Role:</span>
              <select
                value={currentRoleView}
                onChange={(e: any) => setCurrentRoleView(e.target.value)}
                className="bg-white font-bold text-slate-800 rounded-lg px-2 py-1 text-xs border-0 shadow-xs cursor-pointer focus:ring-1 focus:ring-blue-500"
              >
                <option value="STUDENT">🧑‍🎓 Student Scholar</option>
                <option value="INSTRUCTOR">👨‍🏫 Faculty Lecturer</option>
                <option value="ADMIN">🏛️ Academic Dean / Admin</option>
              </select>
            </div>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <button
              title="Search Portal"
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              title="Notifications"
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>

            <button
              title="Messages"
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* User Dropdown */}
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 pl-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide hidden md:block">
                {currentProfile.name}
              </span>
              <div className="w-8 h-8 rounded-full bg-[#0c2461] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {currentProfile.name.charAt(0)}
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </div>
      </header>

      {/* 2. BREADCRUMB & TITLE BAR */}
      <section className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6">
        <div className="max-w-[1480px] mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
                {currentRoleView === "INSTRUCTOR"
                  ? "Faculty Studio & Coursework Gradebook"
                  : currentRoleView === "ADMIN"
                  ? "Academic Dean Overview"
                  : "Dashboard"}
              </h1>
              <Badge
                variant={
                  currentRoleView === "INSTRUCTOR"
                    ? "roleInstructor"
                    : currentRoleView === "ADMIN"
                    ? "roleAdmin"
                    : "roleStudent"
                }
              >
                {currentProfile.badge}
              </Badge>
            </div>
            <div className="text-xs text-blue-700 font-medium flex items-center gap-2">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              {currentRoleView === "ADMIN" && (
                <>
                  <span>/</span>
                  <Link href="/admin" className="font-bold text-indigo-700 underline">
                    Open Academic Command Console →
                  </Link>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold border transition-all ${
              isCustomizing
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
            }`}
          >
            {isCustomizing ? "Stop customising this page" : "Customise this page"}
          </button>
        </div>
      </section>

      {/* 3. MAIN DASHBOARD 3-COLUMN WORKSPACE */}
      <main className="max-w-[1480px] mx-auto w-full px-4 sm:px-6 py-6 space-y-5 flex-1">
        {/* Welcome Greeting Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Hi, {shortGreetingName}!</span>
              <span>👋</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentProfile.title} • EduPulse Academy #UK-92810
            </p>
          </div>

          <div className="flex items-center gap-2">
            {currentRoleView === "INSTRUCTOR" && (
              <Button
                size="sm"
                onClick={() => setShowNewEventModal(true)}
                className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs gap-1.5 h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Schedule Assignment</span>
              </Button>
            )}
            {currentRoleView === "ADMIN" && (
              <Link
                href="/admin"
                className="px-3.5 py-1.5 rounded bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Open Admin Command Console</span>
              </Link>
            )}
          </div>
        </div>

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

                  <div
                    onClick={() => setNavSitePagesOpen(!navSitePagesOpen)}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-blue-700 transition-colors"
                  >
                    {navSitePagesOpen ? (
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    )}
                    <span>Site pages</span>
                  </div>

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
                        {currentRoleView === "INSTRUCTOR" ? "My Assigned Units" : "My courses"}
                      </span>
                    </div>

                    {navCoursesOpen && (
                      <div className="pl-4 pt-1 space-y-1 text-[11px] text-slate-600">
                        {allCourses.map((c, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 hover:text-blue-700 cursor-pointer py-0.5 truncate"
                            title={c.title}
                          >
                            <ChevronRight className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span className="truncate">{c.title}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-1.5 text-blue-700 font-semibold cursor-pointer pt-1">
                          <span className="w-2 h-2 bg-blue-700 rounded-2xs inline-block" />
                          <span>More...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Block 2: Private Files */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Private files
              </h3>

              {user?.privateFiles && user.privateFiles.length > 0 ? (
                <div className="space-y-1.5">
                  {user.privateFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between text-xs group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate text-[11px]">
                            {file.fileName}
                          </div>
                          <div className="text-[10px] text-slate-400">{file.fileSize}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePrivateFile(file.id)}
                        className="text-slate-300 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete file"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No files available</p>
              )}

              <button
                onClick={() => setShowManageFilesModal(true)}
                className="text-xs font-semibold text-blue-700 hover:underline block pt-1"
              >
                Manage private files...
              </button>
            </div>

            {/* Block 3: Online Users */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Online users
                </h3>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {onlineUsers.length + 8} online users (last 5 minutes)
              </div>

              <div className="space-y-2">
                {onlineUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800 truncate text-[11px]">
                        {u.name}
                      </span>
                    </div>
                    <button
                      onClick={() => alert(`Opening academic chat messenger with ${u.name}`)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Send message"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-400 pt-1">Other users (8)</div>
            </div>
          </aside>

          {/* ======================================================== */}
          {/* CENTER MAIN FEED (Role-Specific Workspaces) */}
          {/* ======================================================== */}
          <section className="lg:col-span-6 space-y-5">
            {/* FOR INSTRUCTORS: Mock Exam Grading Queue */}
            {currentRoleView === "INSTRUCTOR" && (
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Student Coursework Grading Queue
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Pending student submissions awaiting faculty review & solution remarks
                    </p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 font-bold text-[10px]">
                    3 Submissions Pending
                  </Badge>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      student: "S.Y.T. Perera (ID: UK-92810A01)",
                      paper: "Pure Mathematics P4 Coursework",
                      submitted: "2 hours ago",
                      pages: "8 Pages PDF",
                    },
                    {
                      student: "Tariq Al-Mansoor (ID: UK-92810A02)",
                      paper: "Physics Unit 4 Laboratory Problem Set",
                      submitted: "4 hours ago",
                      pages: "10 Pages PDF",
                    },
                    {
                      student: "Kavisha Fernando (ID: UK-92810A03)",
                      paper: "Foundation Mathematics Assignment 1H",
                      submitted: "Yesterday",
                      pages: "6 Pages PDF",
                    },
                  ].map((script, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-blue-50/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-slate-900">
                          {script.student}
                        </div>
                        <div className="text-[11px] text-blue-700 font-medium">
                          {script.paper}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ⏱️ {script.submitted} • 📄 {script.pages}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedScriptToGrade(script);
                          setShowGradeModal(true);
                        }}
                        className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold gap-1 self-end sm:self-center shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Grade Script</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Block 1: Timeline Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Timeline
              </h3>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                <select
                  value={timelinePeriod}
                  onChange={(e) => setTimelinePeriod(e.target.value)}
                  className="sm:col-span-3 h-8 rounded border border-slate-300 px-2 bg-white font-medium text-slate-700"
                >
                  <option value="7">Next 7 days</option>
                  <option value="14">Next 14 days</option>
                  <option value="30">Next 30 days</option>
                  <option value="all">All events</option>
                </select>

                <select className="sm:col-span-3 h-8 rounded border border-slate-300 px-2 bg-white font-medium text-slate-700">
                  <option>Sort by dates</option>
                  <option>Sort by courses</option>
                </select>

                <input
                  type="text"
                  placeholder="Search by activity type or name"
                  value={timelineSearch}
                  onChange={(e) => setTimelineSearch(e.target.value)}
                  className="sm:col-span-6 h-8 rounded border border-slate-300 px-3 text-xs"
                />
              </div>

              {/* Timeline Items */}
              <div className="pt-2">
                {filteredTimeline.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTimeline.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-blue-50/40 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 rounded-md bg-blue-100 text-blue-800 shrink-0 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 leading-snug truncate">
                              {ev.title}
                            </h4>
                            {ev.description && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {ev.description}
                              </p>
                            )}
                            <div className="text-[10px] text-blue-700 font-semibold mt-1">
                              📅 Due: {new Date(ev.dueDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => alert(`Opening submission console for: ${ev.title}`)}
                          className="px-3 py-1.5 rounded bg-white hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs border border-blue-200 transition-all self-end sm:self-center shrink-0"
                        >
                          {currentRoleView === "INSTRUCTOR" ? "Review Submissions" : "Add submission"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-500 font-semibold">
                      No activities require action
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Block 2: Upcoming events Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Upcoming events
              </h3>

              <div className="space-y-3 text-xs">
                {timelineEvents.slice(0, 2).map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-blue-700 hover:underline cursor-pointer">
                        {ev.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(ev.dueDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowNewEventModal(true)}
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  Go to calendar...
                </button>
              </div>
            </div>

            {/* Block 3: Calendar Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">Calendar</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={calendarCourseFilter}
                    onChange={(e) => setCalendarCourseFilter(e.target.value)}
                    className="h-7 text-xs rounded border border-slate-300 px-2 bg-white font-medium"
                  >
                    <option value="all">All courses</option>
                    {allCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setShowNewEventModal(true)}
                    className="px-2.5 py-1 rounded bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold transition-colors"
                  >
                    New event
                  </button>
                </div>
              </div>

              {/* Monthly Calendar Grid */}
              <div className="text-xs">
                <div className="text-center font-bold text-slate-800 mb-2">
                  August 2026
                </div>
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 mb-1">
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                  <div>Sun</div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {[...Array(31)].map((_, i) => {
                    const day = i + 1;
                    const isEventDay = day === 23 || day === 18 || day === 28;
                    const isToday = day === 16;
                    return (
                      <div
                        key={day}
                        onClick={() => {
                          if (isEventDay) alert(`Event on Aug ${day}: London A/L Exam Assessment`);
                        }}
                        className={`h-8 flex items-center justify-center rounded transition-colors cursor-pointer ${
                          isToday
                            ? "bg-blue-700 text-white font-bold"
                            : isEventDay
                            ? "bg-amber-100 text-amber-900 font-bold hover:bg-amber-200 border border-amber-300"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Block 4: Enrolled Course Cards (Course Overview) */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                {currentRoleView === "INSTRUCTOR" ? "My Syllabus Courses" : "Course overview"}
              </h3>

              <div className="space-y-4">
                {allCourses.map((course, idx) => (
                  <div
                    key={idx}
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

                    <button
                      onClick={() => alert(`Launching course workspace for ${course.title}`)}
                      className="px-4 py-2 rounded bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs self-end sm:self-center shrink-0 transition-colors"
                    >
                      {currentRoleView === "INSTRUCTOR" ? "Edit Curriculum" : "Enter Course"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ======================================================== */}
          {/* RIGHT SIDEBAR (Badges, Instructor Honorarium, Center Accreditation) */}
          {/* ======================================================== */}
          <aside className="lg:col-span-3 space-y-4">
            {/* FOR INSTRUCTOR: Honorarium & Evaluator Stats */}
            {currentRoleView === "INSTRUCTOR" && (
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Examiner Honorarium & Stats
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
            )}

            {/* Block 1: Latest Badges (For Student) */}
            {currentRoleView === "STUDENT" && (
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Latest badges
                </h3>

                {user?.badges && user.badges.length > 0 ? (
                  <div className="space-y-2.5">
                    {user.badges.map((b) => (
                      <div key={b.id} className="flex items-start gap-2.5 text-xs p-2 rounded bg-amber-50/60 border border-amber-200/80">
                        <div className="p-1.5 rounded-full bg-amber-400 text-amber-950 shrink-0">
                          <Award className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-[11px]">{b.name}</div>
                          <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                            {b.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">You have no badges to display</p>
                )}
              </div>
            )}

            {/* Block 2: Examination Center Verification */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Exam Center Accreditation
              </h3>
              <div className="text-xs space-y-2 text-slate-600">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-slate-500">Center No:</span>
                  <span className="font-mono font-bold text-slate-900">UK-92810</span>
                </div>
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-slate-500">Exam Board:</span>
                  <span className="font-semibold text-blue-700">Pearson Edexcel</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Target Series:</span>
                  <span className="font-bold text-amber-700">May/June 2026</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* MODAL 1: MANAGE PRIVATE FILES */}
      {showManageFilesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <span>Manage Private Files</span>
              </h3>
              <button
                onClick={() => setShowManageFilesModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPrivateFile} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Edexcel_Physics_Unit2_Formula_Notes.pdf"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full h-8 px-3 rounded border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Estimated Size</label>
                <input
                  type="text"
                  value={newFileSize}
                  onChange={(e) => setNewFileSize(e.target.value)}
                  className="w-full h-8 px-3 rounded border border-slate-300 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full h-8 rounded bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs"
              >
                Upload File to Database
              </button>
            </form>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-600 uppercase">Your Stored Files:</div>
              {user?.privateFiles && user.privateFiles.length > 0 ? (
                user.privateFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 rounded bg-slate-50 text-xs">
                    <span className="truncate max-w-[240px] text-slate-800">{file.fileName}</span>
                    <button
                      onClick={() => handleDeletePrivateFile(file.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No files uploaded yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE NEW CALENDAR EVENT */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>New Calendar Event / Assignment</span>
              </h3>
              <button
                onClick={() => setShowNewEventModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Event / Assignment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Assignment: Edexcel IAL Pure Maths P4 Mock Script is due"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full h-8 px-3 rounded border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Instructions / Description</label>
                <textarea
                  placeholder="e.g. Submit handwritten working for Questions 1-8 in PDF format."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full h-16 p-2 rounded border border-slate-300 text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Event Type</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="ASSIGNMENT">Assignment</option>
                    <option value="EXAM_MOCK">Exam Mock</option>
                    <option value="LIVE_SEMINAR">Live Seminar</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#0c2461] hover:bg-[#103080] text-white font-bold"
                >
                  Save Event to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EXAMINER SCRIPT GRADING MODAL */}
      {showGradeModal && selectedScriptToGrade && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Evaluate & Grade Mock Paper
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedScriptToGrade.paper} • {selectedScriptToGrade.student}
                </p>
              </div>
              <button
                onClick={() => setShowGradeModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-between">
                <span>Total Maximum Paper Marks: <strong>75 Marks</strong></span>
                <span className="text-[11px] font-bold uppercase bg-white px-2 py-0.5 rounded border border-blue-200">
                  Academic Evaluation Rubric
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Awarded Score (Out of 75)
                </label>
                <input
                  type="number"
                  max={75}
                  min={0}
                  value={awardedMarks}
                  onChange={(e) => setAwardedMarks(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-300 text-sm font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Faculty Solution Remarks & Feedback
                </label>
                <textarea
                  value={examinerRemarks}
                  onChange={(e) => setExaminerRemarks(e.target.value)}
                  className="w-full h-20 p-2.5 rounded-xl border border-slate-300 text-xs resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowGradeModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    alert(`Marks awarded: ${awardedMarks}/75 (${Math.round((parseInt(awardedMarks)/75)*100)}%). Feedback published to student portal.`);
                    setShowGradeModal(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Publish Grade & Solution Remarks
                </Button>
              </div>
            </div>
          </div>
        </div>
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
