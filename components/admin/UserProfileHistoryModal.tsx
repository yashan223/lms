"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Maximize2,
  Minimize2,
  Mail,
  Phone,
  Globe,
  Calendar,
  Clock,
  Coins,
  BookOpen,
  Video,
  Award,
  CreditCard,
  UserCheck,
  Shield,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Play,
  RotateCcw,
  Edit3,
  Search,
  ChevronRight,
  TrendingUp,
  FileText,
  Star,
  Users,
  Briefcase,
  Layers,
  ArrowUpRight,
  HelpCircle,
  Eye,
} from "lucide-react";
import { getRegionalTimezone } from "@/lib/timezones";

interface UserProfileHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  onGrantTokens?: (user: any) => void;
  onEnrollUser?: (user: any) => void;
  onManageTrials?: (user: any) => void;
  onEditUser?: (user: any) => void;
}

export function UserProfileHistoryModal({
  isOpen,
  onClose,
  user,
  onGrantTokens,
  onEnrollUser,
  onManageTrials,
  onEditUser,
}: UserProfileHistoryModalProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "courses" | "sessions" | "trials" | "wallet" | "progress"
  >("overview");
  const [historyData, setHistoryData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Fetch full user history when modal opens or user changes
  useEffect(() => {
    if (!isOpen || !user?.id) {
      setHistoryData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchFullHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_user_full_history",
            userId: user.id,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "Failed to fetch complete profile history.");
        }

        if (isMounted) {
          setHistoryData(data);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Error loading user profile history:", err);
          setError(err.message || "Failed to retrieve user profile data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchFullHistory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id]);

  // Combine prop user with deep fetched user
  const fullUser = historyData?.user || user;
  const taughtEvents = historyData?.taughtEvents || [];

  // Parse tutor bio if present
  const parsedBio = useMemo(() => {
    if (!fullUser?.bio) return null;
    try {
      if (typeof fullUser.bio === "string" && fullUser.bio.trim().startsWith("{")) {
        return JSON.parse(fullUser.bio);
      }
    } catch {}
    return null;
  }, [fullUser?.bio]);

  const rawAbout = parsedBio?.about || (typeof fullUser?.bio === "string" && !fullUser.bio.startsWith("{") ? fullUser.bio : "");
  const degrees: any[] = parsedBio?.degrees || [];
  const certifications: any[] = parsedBio?.certifications || [];
  const specializations: string[] = parsedBio?.specializations || [];
  const experienceYears = parsedBio?.experienceYears || "";
  const officeHours = parsedBio?.officeHours || "";
  const hourlyRateAL = parsedBio?.hourlyRateAL || parsedBio?.hourlyRate || "5000";
  const hourlyRateOL = parsedBio?.hourlyRateOL || "3500";
  const linkedin = parsedBio?.linkedin || "";
  const researchGate = parsedBio?.researchGate || "";
  const website = parsedBio?.website || "";

  // Combine live events for student: events assigned to student + events belonging to enrolled courses
  const studentCombinedEvents = useMemo(() => {
    if (!fullUser) return [];
    const directEvents = fullUser.events || [];
    const courseEvents = (fullUser.enrollments || []).flatMap((e: any) =>
      (e.course?.events || []).map((ev: any) => ({
        ...ev,
        courseTitle: e.course?.title,
        courseCode: e.course?.subjectCode,
      }))
    );

    const map = new Map<string, any>();
    directEvents.forEach((ev: any) => map.set(ev.id, { ...ev, courseTitle: ev.course?.title, courseCode: ev.course?.subjectCode }));
    courseEvents.forEach((ev: any) => {
      if (!map.has(ev.id)) map.set(ev.id, ev);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime()
    );
  }, [fullUser]);

  // Combine live events for tutor
  const tutorCombinedEvents = useMemo(() => {
    if (!fullUser) return [];
    const directTaught = taughtEvents || [];
    const courseEvents = (fullUser.createdCourses || []).flatMap((c: any) =>
      (c.events || []).map((ev: any) => ({
        ...ev,
        courseTitle: c.title,
        courseCode: c.subjectCode,
      }))
    );

    const map = new Map<string, any>();
    directTaught.forEach((ev: any) => map.set(ev.id, { ...ev, courseTitle: ev.course?.title, courseCode: ev.course?.subjectCode }));
    courseEvents.forEach((ev: any) => {
      if (!map.has(ev.id)) map.set(ev.id, ev);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime()
    );
  }, [fullUser, taughtEvents]);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen || !user) return null;

  const isStudent = fullUser?.role === "STUDENT";
  const isTutor = fullUser?.role === "TUTOR" || fullUser?.role === "INSTRUCTOR";
  const isAdmin = fullUser?.role === "ADMIN";

  // Quick stats calculations
  const totalWalletHours = fullUser?.tokenWallet?.balance ?? 0;
  const totalEnrollments = fullUser?.enrollments?.length ?? 0;
  const totalCreatedCourses = fullUser?.createdCourses?.length ?? 0;
  const totalCompletedLessons = (fullUser?.progress || []).filter((p: any) => p.isCompleted).length;
  const totalCertificates = fullUser?.certificates?.length ?? 0;
  const totalBadges = fullUser?.badges?.length ?? 0;
  const totalPayments = (fullUser?.payments || []).filter((p: any) => p.status === "SUCCESS");
  const totalSpentLKR = totalPayments.reduce((acc: number, p: any) => acc + (p.amountCents ? p.amountCents / 100 : 0), 0);
  const totalStudentTrials = fullUser?.studentTrials?.length ?? 0;
  const totalTutorTrials = fullUser?.tutorTrials?.length ?? 0;

  // Tutor aggregate stats
  const totalTutorStudents = (fullUser?.createdCourses || []).reduce(
    (acc: number, c: any) => acc + (c.enrollments?.length || 0),
    0
  );
  const allTutorReviews = (fullUser?.createdCourses || []).flatMap((c: any) => c.reviews || []);
  const avgRating = allTutorReviews.length > 0
    ? (allTutorReviews.reduce((acc: number, r: any) => acc + (r.rating || 5), 0) / allTutorReviews.length).toFixed(1)
    : "5.0";

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 w-full ${
          isFullScreen
            ? "fixed inset-2 sm:inset-4 max-w-none h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)]"
            : "max-w-6xl max-h-[92vh] h-auto"
        }`}
      >
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#0c2461] via-[#103080] to-[#1e3a8a] text-white p-5 sm:p-6 border-b border-blue-900/40 relative">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* User identity & badge */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16 sm:w-20 sm:h-20 ring-4 ring-white/20 shadow-lg">
                  <AvatarImage src={fullUser.avatar || undefined} />
                  <AvatarFallback className="bg-blue-400 text-white text-2xl font-black">
                    {fullUser.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`absolute bottom-0 right-0 w-4 h-4 rounded-full ring-2 ring-white ${
                    isAdmin
                      ? "bg-amber-400"
                      : isTutor
                      ? "bg-emerald-400"
                      : "bg-blue-400"
                  }`}
                  title={fullUser.role}
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    {fullUser.name}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      isAdmin
                        ? "bg-amber-400 text-slate-900"
                        : isTutor
                        ? "bg-emerald-400 text-emerald-950"
                        : "bg-blue-300 text-blue-950"
                    }`}
                  >
                    {isTutor ? "Tutor / Instructor" : fullUser.role}
                  </span>
                  {isStudent && fullUser.studentId && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-400 text-slate-900 shadow-xs flex items-center gap-1">
                      <span>ID: {fullUser.studentId}</span>
                    </span>
                  )}
                  {isStudent && fullUser.academicLevel && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-blue-100 border border-white/20">
                      London {fullUser.academicLevel}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-blue-100/90 mt-1">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Mail className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                    <span>{fullUser.email}</span>
                  </span>

                  {fullUser.phone && (
                    <span className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                      <span>{fullUser.phone}</span>
                    </span>
                  )}

                  {fullUser.timezone && (
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                      <span>
                        {getRegionalTimezone(fullUser.timezone).flag} {getRegionalTimezone(fullUser.timezone).city} (
                        {getRegionalTimezone(fullUser.timezone).abbr || getRegionalTimezone(fullUser.timezone).standardOffset})
                      </span>
                    </span>
                  )}

                  <span className="flex items-center gap-1.5 text-blue-200/70">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Joined {new Date(fullUser.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Modal Controls */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              {isStudent && (
                <>
                  {onGrantTokens && (
                    <Button
                      size="sm"
                      onClick={() => onGrantTokens(fullUser)}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs h-9 px-3 rounded-xl shadow-xs cursor-pointer gap-1.5"
                      title="Adjust student credit hours"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>+ Grant Credit</span>
                    </Button>
                  )}
                  {onEnrollUser && (
                    <Button
                      size="sm"
                      onClick={() => onEnrollUser(fullUser)}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs h-9 px-3 rounded-xl cursor-pointer gap-1.5"
                      title="Directly enroll student in a course"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Enroll Class</span>
                    </Button>
                  )}
                  {onManageTrials && (
                    <Button
                      size="sm"
                      onClick={() => onManageTrials(fullUser)}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs h-9 px-3 rounded-xl cursor-pointer gap-1.5"
                      title="Reset or manage free trials"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Trials</span>
                    </Button>
                  )}
                </>
              )}

              {onEditUser && (
                <Button
                  size="sm"
                  onClick={() => onEditUser(fullUser)}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs h-9 px-3 rounded-xl cursor-pointer gap-1.5"
                  title="Edit user details"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
              )}

              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title={isFullScreen ? "Exit Fullscreen" : "Fullscreen View"}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Profile Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* METRIC RIBBON */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mt-5 pt-4 border-t border-white/15">
            {isStudent ? (
              <>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Academic Balance</div>
                  <div className="text-base sm:text-lg font-black text-amber-300 font-mono flex items-center gap-1">
                    <Coins className="w-4 h-4 shrink-0 text-amber-300" />
                    <span>{totalWalletHours} Hrs</span>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Classes Enrolled</div>
                  <div className="text-base sm:text-lg font-black text-white">
                    {totalEnrollments} {totalEnrollments === 1 ? "Class" : "Classes"}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Completed Lessons</div>
                  <div className="text-base sm:text-lg font-black text-emerald-300">
                    {totalCompletedLessons} Lessons
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Live Sessions</div>
                  <div className="text-base sm:text-lg font-black text-white">
                    {studentCombinedEvents.length} Sessions
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">1-on-1 Trials</div>
                  <div className="text-base sm:text-lg font-black text-purple-200">
                    {totalStudentTrials} Bookings
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Total Spent</div>
                  <div className="text-base sm:text-lg font-black text-white font-mono">
                    LKR {totalSpentLKR.toLocaleString()}
                  </div>
                </div>
              </>
            ) : isTutor ? (
              <>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Assigned Courses</div>
                  <div className="text-base sm:text-lg font-black text-white">
                    {totalCreatedCourses} Courses
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Active Students</div>
                  <div className="text-base sm:text-lg font-black text-blue-200">
                    {totalTutorStudents} Students
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">London A/L Rate</div>
                  <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
                    LKR {Number(hourlyRateAL).toLocaleString()}/hr
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">London O/L Rate</div>
                  <div className="text-base sm:text-lg font-black text-white font-mono">
                    LKR {Number(hourlyRateOL).toLocaleString()}/hr
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Live Classes Conducted</div>
                  <div className="text-base sm:text-lg font-black text-emerald-300">
                    {tutorCombinedEvents.length} Classes
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Avg Rating</div>
                  <div className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                    <span>{avgRating}</span>
                    <span className="text-xs text-blue-200 font-normal">({allTutorReviews.length})</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Platform Role</div>
                  <div className="text-base sm:text-lg font-black text-white">Full Administrator</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">System Access</div>
                  <div className="text-base sm:text-lg font-black text-emerald-300">All Privileges</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Status</div>
                  <div className="text-base sm:text-lg font-black text-white">Active</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Timezone</div>
                  <div className="text-base sm:text-lg font-black text-white truncate">{fullUser.timezone || "Asia/Colombo"}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Created</div>
                  <div className="text-base sm:text-lg font-black text-white">
                    {new Date(fullUser.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-blue-200">Security</div>
                  <div className="text-base sm:text-lg font-black text-blue-200">Protected</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 py-2">
            {[
              { id: "overview", label: "Overview & Credentials", icon: UserCheck },
              {
                id: "courses",
                label: isStudent ? `Enrolled Classes (${totalEnrollments})` : `Assigned Courses (${totalCreatedCourses})`,
                icon: BookOpen,
              },
              {
                id: "sessions",
                label: `Live Classroom Sessions (${isStudent ? studentCombinedEvents.length : tutorCombinedEvents.length})`,
                icon: Video,
              },
              {
                id: "trials",
                label: `1-on-1 Consultations (${isStudent ? totalStudentTrials : totalTutorTrials})`,
                icon: Calendar,
              },
              ...(isStudent
                ? [
                    {
                      id: "wallet",
                      label: `Credit & Ledger (${fullUser?.tokenWallet?.transactions?.length || 0})`,
                      icon: Coins,
                    },
                    {
                      id: "progress",
                      label: `Badges & Progress (${totalCertificates + totalBadges})`,
                      icon: Award,
                    },
                  ]
                : []),
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#0c2461] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold shrink-0 py-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing deep history...</span>
            </div>
          )}
        </div>

        {/* ERROR NOTIFICATION */}
        {error && (
          <div className="m-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setError(null);
                setIsLoading(true);
              }}
              className="h-7 text-xs border-red-200 hover:bg-red-100"
            >
              Retry
            </Button>
          </div>
        )}

        {/* TAB BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
              {/* Left Column: Core Identity & Contact Info */}
              <div className="space-y-6">
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Account Identity & Contact</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    {isStudent && fullUser.studentId && (
                      <div>
                        <span className="text-slate-500 font-bold block text-[11px] uppercase tracking-wide">
                          Official Student ID
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="bg-amber-50 text-amber-950 font-bold px-2 py-1 rounded-lg border border-amber-200 font-mono text-xs flex-1 truncate shadow-2xs">
                            {fullUser.studentId}
                          </code>
                          <button
                            onClick={() => handleCopy(fullUser.studentId, "student_id")}
                            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                            title="Copy Student ID"
                          >
                            {copiedKey === "student_id" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400 font-medium block text-[11px]">System User ID</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="bg-white px-2 py-1 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 flex-1 truncate">
                          {fullUser.id}
                        </code>
                        <button
                          onClick={() => handleCopy(fullUser.id, "user_id")}
                          className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                          title="Copy User ID"
                        >
                          {copiedKey === "user_id" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block text-[11px]">Full Legal / Registered Name</span>
                      <div className="font-bold text-slate-900 mt-0.5">{fullUser.name}</div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block text-[11px]">Email Address</span>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                        <span>{fullUser.email}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block text-[11px]">Phone Contact</span>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{fullUser.phone || "Not provided"}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block text-[11px]">Operating Regional Timezone</span>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {fullUser.timezone ? getRegionalTimezone(fullUser.timezone).flag : "🌐"}{" "}
                          {fullUser.timezone || "Asia/Colombo"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block text-[11px]">Registration Date</span>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {new Date(fullUser.createdAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guardian Info (for students) */}
                {isStudent && (
                  <div className="bg-blue-50/60 rounded-2xl border border-blue-200/80 p-5 space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-700" />
                      <span>Parent / Guardian Records</span>
                    </h3>

                    {fullUser.guardianName || fullUser.guardianPhone ? (
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <span className="text-blue-700/80 text-[11px] block font-medium">Guardian Full Name</span>
                          <span className="font-bold text-slate-900">{fullUser.guardianName || "—"}</span>
                        </div>
                        <div>
                          <span className="text-blue-700/80 text-[11px] block font-medium">Relationship to Student</span>
                          <span className="font-bold text-slate-800">
                            {fullUser.guardianRelationship || "Parent / Guardian"}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-700/80 text-[11px] block font-medium">Emergency Guardian Phone</span>
                          <div className="font-mono font-bold text-blue-900 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                            <span>{fullUser.guardianPhone || "—"}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        No parent or guardian details were provided at registration.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Middle & Right Columns: Tutor Credentials OR Student Academic Summary */}
              <div className="lg:col-span-2 space-y-6">
                {isTutor ? (
                  <>
                    {/* Tutor Academic Headline & Bio */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                          <span>Professional Credentials & Headline</span>
                        </h3>
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold">
                          {experienceYears ? `${experienceYears} Years Exp` : "Verified Lecturer"}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wide">
                            Display Headline
                          </span>
                          <div className="text-sm font-black text-slate-900 mt-0.5">
                            {fullUser.headline || "Tutor / Academic Instructor"}
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wide">
                            About / Professional Summary
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line">
                            {rawAbout || "No bio details provided yet."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Degrees & Qualifications */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>Academic Degrees & Accreditations</span>
                      </h3>

                      {degrees && degrees.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {degrees.map((deg: any, i: number) => (
                            <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                              <div className="font-bold text-slate-900 text-xs">
                                {typeof deg === "object" ? deg.title || deg.degree : deg}
                              </div>
                              {typeof deg === "object" && deg.institution && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Briefcase className="w-3 h-3 text-slate-400" />
                                  <span>{deg.institution}</span>
                                </div>
                              )}
                              {typeof deg === "object" && deg.year && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Graduated: {deg.year}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                          No specific degree records uploaded yet.
                        </div>
                      )}
                    </div>

                    {/* Subject Specializations & Rates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span>Teaching Specializations</span>
                        </h4>
                        {specializations && specializations.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {specializations.map((spec: string, i: number) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200"
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No specializations tagged.</p>
                        )}
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span>Standard Hourly Rates</span>
                        </h4>
                        <div className="space-y-2 text-xs font-mono">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/70 border border-blue-100">
                            <span className="font-sans font-bold text-blue-900">London A/L Tuition</span>
                            <span className="font-bold text-blue-700">LKR {Number(hourlyRateAL).toLocaleString()}/hr</span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="font-sans font-bold text-slate-800">London O/L Tuition</span>
                            <span className="font-bold text-slate-700">LKR {Number(hourlyRateOL).toLocaleString()}/hr</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Social & Academic Links */}
                    {(linkedin || researchGate || website || officeHours) && (
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                        <span className="font-bold text-slate-700 block">External Links & Availability</span>
                        <div className="flex flex-wrap gap-3">
                          {officeHours && (
                            <span className="text-slate-600 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Office Hours: <strong>{officeHours}</strong></span>
                            </span>
                          )}
                          {linkedin && (
                            <a
                              href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>LinkedIn</span>
                            </a>
                          )}
                          {researchGate && (
                            <a
                              href={researchGate.startsWith("http") ? researchGate : `https://${researchGate}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>ResearchGate</span>
                            </a>
                          )}
                          {website && (
                            <a
                              href={website.startsWith("http") ? website : `https://${website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-700 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Personal Website</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : isStudent ? (
                  <>
                    {/* Student Academic Standing */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                          <span>Student Academic Profile</span>
                        </h3>
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold">
                          London {fullUser.academicLevel || "AL"} Curriculum
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                          <span className="text-slate-400 block text-[11px] font-medium">Enrolled Curriculums</span>
                          <span className="font-bold text-slate-900 text-sm">
                            {fullUser.academicLevel === "OL" ? "Cambridge & Edexcel O-Levels" : "Cambridge & Edexcel A-Levels"}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                          <span className="text-slate-400 block text-[11px] font-medium">Credit Hours in Wallet</span>
                          <span className="font-bold text-blue-700 text-sm font-mono flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            <span>{totalWalletHours} Hours Available</span>
                          </span>
                        </div>
                      </div>

                      {/* Enrolled Courses Highlights */}
                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-2">
                          Currently Active Class Enrollments ({totalEnrollments})
                        </span>
                        {fullUser.enrollments && fullUser.enrollments.length > 0 ? (
                          <div className="space-y-2">
                            {fullUser.enrollments.slice(0, 3).map((enr: any) => (
                              <div
                                key={enr.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 transition-colors"
                              >
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">
                                    {enr.course?.title}
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span>Tutor: {enr.course?.tutor?.name || "Instructor"}</span>
                                    <span>•</span>
                                    <span>Enrolled: {new Date(enr.enrolledAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Enrolled
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                            No active course enrollments.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <h3 className="text-sm font-black text-slate-900">Administrator Privileges</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      This user has full platform administrative access to create, update, and manage all courses, tutors, students, live classrooms, BigBlueButton rooms, financial records, and system settings.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CLASSES & COURSES */}
          {activeTab === "courses" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {isStudent ? "Enrolled Course Curriculums" : "Taught / Created Course Catalog"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isStudent
                      ? "Complete history of enrolled subjects, progress milestones, and assigned lecturers."
                      : "All academic courses created or assigned to this instructor, including student rosters."}
                  </p>
                </div>
              </div>

              {isStudent ? (
                /* Student Enrollments Table */
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  {fullUser.enrollments && fullUser.enrollments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Subject & Class</th>
                            <th className="py-3 px-4">Instructor</th>
                            <th className="py-3 px-4">Academic Level</th>
                            <th className="py-3 px-4">Enrolled On</th>
                            <th className="py-3 px-4">Syllabus Progress</th>
                            <th className="py-3 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {fullUser.enrollments.map((enr: any) => {
                            const c = enr.course;
                            const totalLessons = (c?.modules || []).reduce(
                              (acc: number, m: any) => acc + (m.lessons?.length || 0),
                              0
                            );
                            const completedForCourse = (fullUser.progress || []).filter((p: any) =>
                              (c?.modules || []).some((m: any) =>
                                (m.lessons || []).some((l: any) => l.id === p.lessonId && p.isCompleted)
                              )
                            ).length;
                            const percent = totalLessons > 0 ? Math.round((completedForCourse / totalLessons) * 100) : 0;

                            return (
                              <tr key={enr.id} className="hover:bg-blue-50/40 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">{c?.title || "Course"}</div>
                                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                    {c?.subjectCode || "CODE"}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={c?.tutor?.avatar} />
                                      <AvatarFallback>{c?.tutor?.name?.charAt(0) || "T"}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold text-slate-800">{c?.tutor?.name || "Tutor"}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {c?.level || "A/L"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-600">
                                  {new Date(enr.enrolledAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="w-36 space-y-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-bold text-slate-700">{percent}%</span>
                                      <span className="text-slate-400 font-mono">
                                        {completedForCourse}/{totalLessons} lessons
                                      </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Active Enrollment
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No course enrollments found for this student.
                    </div>
                  )}
                </div>
              ) : (
                /* Tutor Created Courses List */
                <div className="space-y-4">
                  {fullUser.createdCourses && fullUser.createdCourses.length > 0 ? (
                    fullUser.createdCourses.map((c: any) => (
                      <div
                        key={c.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900">{c.title}</h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {c.subjectCode}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                {c.level}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Created on {new Date(c.createdAt).toLocaleDateString()} • Status:{" "}
                              <strong className="text-emerald-600">{c.status || "PUBLISHED"}</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 font-bold text-slate-700">
                              {c.modules?.length || 0} Modules
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-blue-50 font-bold text-blue-700">
                              {c.enrollments?.length || 0} Enrolled Students
                            </span>
                          </div>
                        </div>

                        {/* Student Roster for this Course */}
                        <div>
                          <span className="text-xs font-bold text-slate-700 block mb-2">
                            Enrolled Students Roster ({c.enrollments?.length || 0})
                          </span>
                          {c.enrollments && c.enrollments.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                              {c.enrollments.map((enr: any) => (
                                <div
                                  key={enr.id}
                                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs"
                                >
                                  <Avatar className="w-7 h-7">
                                    <AvatarImage src={enr.user?.avatar} />
                                    <AvatarFallback>{enr.user?.name?.charAt(0) || "S"}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-900 truncate">
                                      {enr.user?.name || "Student"}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                      {enr.user?.email}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                              No students enrolled yet.
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                      No courses assigned or created by this tutor.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIVE CLASSROOM SESSIONS */}
          {activeTab === "sessions" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    BigBlueButton Live Classroom Sessions & Timings
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time BBB attendance, verified actual start/end timestamps, and recording playback URLs.
                  </p>
                </div>
              </div>

              {((isStudent ? studentCombinedEvents : tutorCombinedEvents) || []).length > 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Session Title & Course</th>
                          <th className="py-3 px-4">Scheduled Date</th>
                          <th className="py-3 px-4">BBB Actual Timing</th>
                          <th className="py-3 px-4">Duration</th>
                          <th className="py-3 px-4">Attendees</th>
                          <th className="py-3 px-4">Room Status</th>
                          <th className="py-3 px-4 text-right">Recording Playback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(isStudent ? studentCombinedEvents : tutorCombinedEvents).map((ev: any) => {
                          const hasActual = Boolean(ev.actualStartTime);
                          const durationMin =
                            ev.actualStartTime && ev.actualEndTime
                              ? Math.max(
                                  1,
                                  Math.round(
                                    (new Date(ev.actualEndTime).getTime() -
                                      new Date(ev.actualStartTime).getTime()) /
                                      (1000 * 60)
                                  )
                                )
                              : null;

                          return (
                            <tr key={ev.id} className="hover:bg-blue-50/40 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{ev.title}</span>
                                </div>
                                <div className="text-[11px] text-blue-600 font-medium">
                                  {ev.courseTitle || ev.course?.title || "General Seminar"}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-slate-600">
                                <div className="font-medium">
                                  {new Date(ev.dueDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {new Date(ev.dueDate).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                {hasActual ? (
                                  <div className="font-mono text-[11px] text-slate-700">
                                    <div>
                                      Start:{" "}
                                      <span className="font-bold">
                                        {new Date(ev.actualStartTime).toLocaleTimeString("en-US", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                    {ev.actualEndTime && (
                                      <div className="text-slate-500">
                                        End:{" "}
                                        {new Date(ev.actualEndTime).toLocaleTimeString("en-US", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs italic">Pending Launch</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                                {durationMin ? `${durationMin} mins` : "—"}
                              </td>

                              <td className="py-3.5 px-4 font-mono">
                                <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                                  <Users className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{ev.attendanceCount ?? 0}</span>
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    ev.status === "COMPLETED"
                                      ? "bg-slate-100 text-slate-700"
                                      : ev.status === "IN_PROGRESS"
                                      ? "bg-red-100 text-red-700 animate-pulse"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {ev.status || "SCHEDULED"}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                {ev.recordingUrl ? (
                                  <a
                                    href={ev.recordingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="h-7 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Play className="w-3 h-3 fill-purple-700" />
                                    <span>Watch Playback</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-[11px] italic">No Recording</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                  No live classroom sessions recorded for this user.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: 1-ON-1 TRIALS & CONSULTATIONS */}
          {activeTab === "trials" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    1-on-1 Consultation & Trial History
                  </h3>
                  <p className="text-xs text-slate-500">
                    Booked private trial requests, meeting approval states, and session recordings.
                  </p>
                </div>
              </div>

              {((isStudent ? fullUser.studentTrials : fullUser.tutorTrials) || []).length > 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">{isStudent ? "Tutor" : "Student"}</th>
                          <th className="py-3 px-4">Subject / Topic</th>
                          <th className="py-3 px-4">Requested Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Actual BBB Timing</th>
                          <th className="py-3 px-4 text-right">Meeting / Recording</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(isStudent ? fullUser.studentTrials : fullUser.tutorTrials).map((tr: any) => (
                          <tr key={tr.id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">
                                {isStudent ? tr.tutor?.name || "Tutor" : tr.student?.name || tr.studentName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {isStudent ? tr.tutor?.email : tr.student?.email || tr.studentEmail}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-800">
                                {tr.course?.title || tr.topic || "1-on-1 Consultation"}
                              </div>
                              {tr.notes && (
                                <div className="text-[11px] text-slate-400 italic truncate max-w-xs mt-0.5">
                                  &quot;{tr.notes}&quot;
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-slate-600">
                              <div className="font-medium">
                                {new Date(tr.preferredDate).toLocaleDateString()}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {new Date(tr.preferredDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  tr.status === "COMPLETED"
                                    ? "bg-slate-100 text-slate-700"
                                    : tr.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : tr.status === "CANCELLED"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {tr.status}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                              {tr.actualStartTime ? (
                                <div>
                                  {new Date(tr.actualStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  {tr.actualEndTime && ` - ${new Date(tr.actualEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {tr.recordingUrl ? (
                                <a
                                  href={tr.recordingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="h-7 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Play className="w-3 h-3 fill-purple-700" />
                                  <span>Recording</span>
                                </a>
                              ) : tr.meetingLink ? (
                                <a
                                  href={tr.meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="h-7 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Room Link</span>
                                </a>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                  No 1-on-1 trial consultation bookings found.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: WALLET, TOKENS & FINANCIAL HISTORY (Students) */}
          {activeTab === "wallet" && isStudent && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Wallet Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                  <span className="text-xs font-bold text-amber-800">Current Token Balance</span>
                  <div className="text-2xl font-black text-amber-950 font-mono flex items-center gap-2">
                    <Coins className="w-6 h-6 text-amber-600" />
                    <span>{totalWalletHours} Credit Hours</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1">
                  <span className="text-xs font-bold text-blue-800">Successful Direct Payments</span>
                  <div className="text-2xl font-black text-blue-950 font-mono">
                    LKR {totalSpentLKR.toLocaleString()}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <span className="text-xs font-bold text-emerald-800">Total Transactions</span>
                  <div className="text-2xl font-black text-emerald-950 font-mono">
                    {fullUser.tokenWallet?.transactions?.length || 0} Ledger Entries
                  </div>
                </div>
              </div>

              {/* Token Transaction Ledger */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>Academic Credit / Hours Ledger</span>
                </h4>

                {fullUser.tokenWallet?.transactions && fullUser.tokenWallet.transactions.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Date & Time</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-4">Hours (+ / -)</th>
                            <th className="py-3 px-4">Description / Reference</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {fullUser.tokenWallet.transactions.map((tx: any) => {
                            const isPositive = tx.amount > 0;
                            return (
                              <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4 text-slate-500 font-mono">
                                  {new Date(tx.createdAt).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      tx.type === "PURCHASE" || tx.type === "GRANT" || isPositive
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {tx.type}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono font-bold">
                                  <span className={isPositive ? "text-emerald-600" : "text-slate-700"}>
                                    {isPositive ? `+${tx.amount}` : tx.amount} Hrs
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-700">
                                  {tx.description}
                                  {tx.referenceId && (
                                    <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                                      Ref: {tx.referenceId}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                    No credit transaction history recorded.
                  </div>
                )}
              </div>

              {/* Direct Payments Gateway Transactions */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Payments.lk Invoices & Checkout History</span>
                </h4>

                {fullUser.payments && fullUser.payments.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Reference</th>
                            <th className="py-3 px-4">Item / Description</th>
                            <th className="py-3 px-4">Amount</th>
                            <th className="py-3 px-4">Payment Method</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {fullUser.payments.map((pm: any) => (
                            <tr key={pm.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                                {pm.reference}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-900">
                                {pm.itemTitle || pm.itemType}
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                {pm.currency || "LKR"} {(pm.amountCents / 100).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                                {pm.paymentMethod || "Direct Card"}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    pm.status === "SUCCESS"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : pm.status === "FAILED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {pm.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                                {new Date(pm.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                    No payment records found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: BADGES, PROGRESS & CERTIFICATES */}
          {activeTab === "progress" && isStudent && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Certificates */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Academic Course Certificates ({fullUser.certificates?.length || 0})</span>
                </h4>

                {fullUser.certificates && fullUser.certificates.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {fullUser.certificates.map((cert: any) => (
                      <div
                        key={cert.id}
                        className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <Award className="w-6 h-6 text-amber-600" />
                          <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-900">
                            {cert.certificateCode}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-xs">
                          {cert.course?.title || "Course Certificate"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Issued on {new Date(cert.issuedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                    No certificates earned yet.
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>Student Achievement Badges ({fullUser.badges?.length || 0})</span>
                </h4>

                {fullUser.badges && fullUser.badges.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {fullUser.badges.map((b: any) => (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-base shrink-0">
                          {b.icon || "🏅"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{b.name}</div>
                          <div className="text-[11px] text-slate-500">{b.description}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Awarded: {new Date(b.awardedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                    No badges earned yet.
                  </div>
                )}
              </div>

              {/* Lesson by Lesson User Progress */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Completed Lessons Log ({totalCompletedLessons})</span>
                </h4>

                {fullUser.progress && fullUser.progress.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                        <tr>
                          <th className="py-2.5 px-4">Lesson Title</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4 text-right">Completion Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fullUser.progress.map((pr: any) => (
                          <tr key={pr.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-medium text-slate-900">
                              {pr.lesson?.title || `Lesson #${pr.lessonId}`}
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  pr.isCompleted
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {pr.isCompleted ? "Completed" : "In Progress"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-500 font-mono text-[11px]">
                              {new Date(pr.updatedAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                    No lesson progress logs recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Viewing Profile History for <strong className="text-slate-800">{fullUser.name}</strong> ({fullUser.email})
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold text-slate-700 h-9 px-4 rounded-xl border-slate-200 cursor-pointer"
            >
              Close History Inspector
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
