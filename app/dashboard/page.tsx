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
  Download,
  ExternalLink,
  Loader2,
  LogOut,
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

  // Timeline filters
  const [timelinePeriod, setTimelinePeriod] = useState("7");
  const [timelineSearch, setTimelineSearch] = useState("");
  const [calendarCourseFilter, setCalendarCourseFilter] = useState("all");

  // Modals
  const [showManageFilesModal, setShowManageFilesModal] = useState(false);
  const [showNewEventModal, setShowNewEventModal] = useState(false);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventDate, setNewEventDate] = useState("2026-08-23T23:55");
  const [newEventType, setNewEventType] = useState("ASSIGNMENT");
  const [newEventCourseId, setNewEventCourseId] = useState("");

  // Real File Upload State
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

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

  // Filtered timeline events
  const filteredTimeline = useMemo(() => {
    return timelineEvents.filter((ev) => {
      const matchSearch =
        ev.title.toLowerCase().includes(timelineSearch.toLowerCase()) ||
        (ev.description && ev.description.toLowerCase().includes(timelineSearch.toLowerCase()));
      return matchSearch;
    });
  }, [timelineEvents, timelineSearch]);

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

            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-600">
              <Link
                href="/courses"
                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-blue-700 transition-colors"
              >
                Course Catalog
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold"
              >
                Dashboard
              </Link>
              {userRole === "ADMIN" && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Console</span>
                </Link>
              )}
            </nav>
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

      {/* 2. BREADCRUMB & TITLE BAR */}
      <section className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6">
        <div className="max-w-[1480px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">
              {userRole === "INSTRUCTOR"
                ? "Faculty Studio & Academic Hub"
                : "Scholar Academic Dashboard"}
            </h1>
          </div>
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
            {userRole === "INSTRUCTOR" && (
              <Button
                size="sm"
                onClick={() => setShowNewEventModal(true)}
                className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs gap-1.5 h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Schedule Assignment</span>
              </Button>
            )}
            {userRole === "ADMIN" && (
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
          <section className="lg:col-span-9 space-y-5">
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

                        <Link
                          href={ev.course?.slug ? `/courses/${ev.course.slug}` : "/courses"}
                          className="px-3 py-1.5 rounded bg-white hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs border border-blue-200 transition-all self-end sm:self-center shrink-0"
                        >
                          View Study Materials
                        </Link>
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
                    <option value="all">{userRole === "STUDENT" ? "All my courses" : "All courses"}</option>
                    {myCourses.map((c) => (
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

                      <Link
                        href={`/courses/${course.slug}`}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs self-end sm:self-center shrink-0 transition-colors shadow-2xs inline-flex items-center gap-1.5"
                      >
                        <span>{userRole === "INSTRUCTOR" ? "Manage Syllabus & Materials" : "Study Materials & Notes"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
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
                    <span>Browse Course Catalog</span>
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
              {/* FOR INSTRUCTOR: Honorarium & Evaluator Stats */}
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
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded hover:bg-slate-100"
              >
                ✕
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
                  className="px-4 py-1.5 rounded bg-[#0c2461] hover:bg-[#103080] text-white font-bold cursor-pointer"
                >
                  Save Calendar Event
                </button>
              </div>
            </form>
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
