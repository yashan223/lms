"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  ArrowLeft,
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
  Users,
  Briefcase,
  Layers,
  ShieldCheck,
  DollarSign,
  Radio,
  Star,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { getRegionalTimezone } from "@/lib/timezones";
import { findCountry } from "@/lib/countries";
import { CountryFlag } from "@/components/ui/CountryFlag";

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
  const [activeTab, setActiveTab] = useState<
    "overview" | "courses" | "sessions" | "trials" | "wallet" | "progress"
  >("overview");
  const [historyData, setHistoryData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
  const specializations: string[] = parsedBio?.specializations || [];
  const experienceYears = parsedBio?.experienceYears || "";
  const officeHours = parsedBio?.officeHours || "";
  const hourlyRateAL =
    fullUser?.ialIasPayRate !== null && fullUser?.ialIasPayRate !== undefined
      ? String(fullUser.ialIasPayRate)
      : parsedBio?.hourlyRateAL || parsedBio?.hourlyRate || "5000";
  const hourlyRateOL =
    fullUser?.igcsePayRate !== null && fullUser?.igcsePayRate !== undefined
      ? String(fullUser.igcsePayRate)
      : parsedBio?.hourlyRateOL || "3500";
  const linkedin = parsedBio?.linkedin || "";
  const researchGate = parsedBio?.researchGate || "";
  const website = parsedBio?.website || "";

  // Combine live events for student: direct events + events of enrolled courses
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
    <div className="fixed inset-0 z-50 bg-[#f8fafc] text-slate-900 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* 1. TOP STICKY APP BAR */}
      <header className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-2xs shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Left: Back button + User Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Return to Admin Console (Esc)"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back</span>
            </button>

            <div className="h-6 w-px bg-slate-200 shrink-0 hidden sm:block" />

            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="w-11 h-11 sm:w-12 sm:h-12 ring-2 ring-slate-200/80 shadow-xs shrink-0">
                <AvatarImage src={fullUser.avatar || undefined} />
                <AvatarFallback className="bg-[#0c2461] text-white font-bold text-base">
                  {fullUser.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                    {fullUser.name}
                  </h1>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      isAdmin
                        ? "bg-slate-900 text-white"
                        : isTutor
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {isTutor ? "Tutor" : fullUser.role}
                  </span>

                  {isStudent && fullUser.studentId && (
                    <button
                      type="button"
                      onClick={() => handleCopy(fullUser.studentId, "top_student_id")}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Click to copy Student ID"
                    >
                      <ShieldCheck className="w-3 h-3 text-amber-600" />
                      <span>{fullUser.studentId}</span>
                      {copiedKey === "top_student_id" ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-amber-700/60" />
                      )}
                    </button>
                  )}

                  {isTutor && fullUser.tutorId && (
                    <button
                      type="button"
                      onClick={() => handleCopy(fullUser.tutorId, "top_tutor_id")}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Click to copy Tutor ID"
                    >
                      <ShieldCheck className="w-3 h-3 text-indigo-600" />
                      <span>{fullUser.tutorId}</span>
                      {copiedKey === "top_tutor_id" ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-indigo-700/60" />
                      )}
                    </button>
                  )}

                  {fullUser.role === "ADMIN" && fullUser.adminId && (
                    <button
                      type="button"
                      onClick={() => handleCopy(fullUser.adminId, "top_admin_id")}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Click to copy Admin ID"
                    >
                      <ShieldCheck className="w-3 h-3 text-rose-600" />
                      <span>{fullUser.adminId}</span>
                      {copiedKey === "top_admin_id" ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-rose-700/60" />
                      )}
                    </button>
                  )}

                  {isStudent && fullUser.academicLevel && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      London {fullUser.academicLevel}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{fullUser.email}</span>
                  </span>

                  {fullUser.phone && (
                    <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>{fullUser.phone}</span>
                    </span>
                  )}

                  {fullUser.country && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium" title={`Country: ${fullUser.country}`}>
                      <CountryFlag countryCode={findCountry(fullUser.country)?.code} flagEmoji={findCountry(fullUser.country)?.flag} size="xs" />
                      <span>{fullUser.country}</span>
                    </span>
                  )}

                  {fullUser.timezone && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Globe className="w-3 h-3 text-slate-400" />
                      <span>
                        {getRegionalTimezone(fullUser.timezone).flag} {getRegionalTimezone(fullUser.timezone).city}
                      </span>
                    </span>
                  )}

                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>Joined {new Date(fullUser.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isStudent && (
              <>
                {onGrantTokens && (
                  <Button
                    size="sm"
                    onClick={() => onGrantTokens(fullUser)}
                    className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs cursor-pointer gap-1.5"
                    title="Grant or adjust student credit hours"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>+ Grant Credit</span>
                  </Button>
                )}
                {onEnrollUser && (
                  <Button
                    size="sm"
                    onClick={() => onEnrollUser(fullUser)}
                    className="bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs cursor-pointer gap-1.5"
                    title="Enroll student in a class"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Enroll Class</span>
                  </Button>
                )}
                {onManageTrials && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onManageTrials(fullUser)}
                    className="border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs h-9 px-3 rounded-xl cursor-pointer gap-1.5"
                    title="Manage & reset free trials"
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
                variant="outline"
                onClick={() => onEditUser(fullUser)}
                className="border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs h-9 px-3 rounded-xl cursor-pointer gap-1.5"
                title="Edit User Profile"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </Button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Close Profile Inspector (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. STATS RIBBON (CLEAN MODERN WHITE CARDS) */}
      <div className="bg-slate-100/70 border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {isStudent ? (
            <>
              {/* Card 1: Official Student ID */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Student ID
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-[#0c2461] tracking-wide truncate">
                  {fullUser.studentId || "—"}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Verified Identity</div>
              </div>

              {/* Card 2: Academic Balance */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Wallet Balance
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-blue-900 tracking-tight">
                  {totalWalletHours} <span className="text-xs font-bold text-blue-600 font-sans">Hours</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Available Credit</div>
              </div>

              {/* Card 3: Enrolled Classes */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Enrolled Classes
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900">
                  {totalEnrollments} <span className="text-xs font-semibold text-slate-500">Active</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Course Curriculums</div>
              </div>

              {/* Card 4: Completed Lessons */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Completed Lessons
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-700">
                  {totalCompletedLessons} <span className="text-xs font-semibold text-slate-500">Lessons</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Syllabus Progress</div>
              </div>

              {/* Card 5: Live & Trials */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Live & Trials
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-purple-900">
                  {studentCombinedEvents.length + totalStudentTrials}{" "}
                  <span className="text-xs font-semibold text-slate-500">Sessions</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {studentCombinedEvents.length} live • {totalStudentTrials} trial
                </div>
              </div>

              {/* Card 6: Total Spent */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Spent
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-slate-900 truncate">
                  LKR {totalSpentLKR.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {totalPayments.length} Gateway Payments
                </div>
              </div>
            </>
          ) : isTutor ? (
            <>
              {/* Tutor KPI Cards */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tutor ID
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-[#0c2461] tracking-wide truncate">
                  {fullUser.tutorId || "—"}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Tutor Identity</div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Assigned Classes
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900">
                  {totalCreatedCourses} <span className="text-xs font-semibold text-slate-500">Classes</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Active Teaching Units</div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Active Students
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-blue-900">
                  {totalTutorStudents} <span className="text-xs font-semibold text-slate-500">Enrolled</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Across all courses</div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    London A/L Rate
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-amber-900">
                  LKR {Number(hourlyRateAL).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Per Hour Rate</div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    London O/L Rate
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-slate-800">
                  LKR {Number(hourlyRateOL).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Per Hour Rate</div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Live Classes & Rating
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-700 flex items-center gap-1.5">
                  <span>{tutorCombinedEvents.length}</span>
                  <span className="text-xs font-semibold text-slate-500">Held</span>
                  <span className="text-xs text-amber-600 font-bold ml-1">★ {avgRating}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">{allTutorReviews.length} Student Reviews</div>
              </div>
            </>
          ) : (
            <>
              {/* Admin KPI Cards */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Admin ID
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-[#0c2461] tracking-wide truncate">
                  {fullUser.adminId || "—"}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Verified Authority</div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Privileges
                </span>
                <div className="text-base sm:text-lg font-black text-emerald-700">All Modules</div>
                <div className="text-[10px] text-slate-500 font-medium">Courses, Users, Finance</div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Status
                </span>
                <div className="text-base sm:text-lg font-black text-blue-900">Active Admin</div>
                <div className="text-[10px] text-slate-500 font-medium">Full Permissions</div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Operating Timezone
                </span>
                <div className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {fullUser.timezone || "Asia/Colombo"}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Regional Time</div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Registration
                </span>
                <div className="text-base sm:text-lg font-black text-slate-900">
                  {new Date(fullUser.createdAt).toLocaleDateString()}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Account Created</div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Security
                </span>
                <div className="text-base sm:text-lg font-black text-emerald-700">Protected</div>
                <div className="text-[10px] text-slate-500 font-medium">Encrypted Credentials</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. NAVIGATION TABS BAR */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-2 overflow-x-auto shrink-0 shadow-2xs">
        <div className="flex items-center gap-1.5 py-2">
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
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
            <span>Syncing history...</span>
          </div>
        )}
      </div>

      {/* ERROR NOTICE */}
      {error && (
        <div className="m-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between shrink-0">
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

      {/* 4. MAIN SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Left Column: Account Identity & Personal/Guardian Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Account Identity & Contact</span>
                </h3>

                <div className="space-y-3.5 text-xs">
                  {/* Official Student ID */}
                  {isStudent && fullUser.studentId && (
                    <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-1">
                      <span className="text-amber-900 font-extrabold block text-[10px] uppercase tracking-wider">
                        Official Student ID
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-sm text-[#0c2461] tracking-wide select-all">
                          {fullUser.studentId}
                        </span>
                        <button
                          onClick={() => handleCopy(fullUser.studentId, "student_id_box")}
                          className="p-1 rounded-lg hover:bg-amber-100 text-amber-800 transition-colors cursor-pointer"
                          title="Copy Student ID"
                        >
                          {copiedKey === "student_id_box" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Official Tutor ID */}
                  {isTutor && fullUser.tutorId && (
                    <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 space-y-1">
                      <span className="text-indigo-900 font-extrabold block text-[10px] uppercase tracking-wider">
                        Official Tutor ID
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-sm text-[#0c2461] tracking-wide select-all">
                          {fullUser.tutorId}
                        </span>
                        <button
                          onClick={() => handleCopy(fullUser.tutorId, "tutor_id_box")}
                          className="p-1 rounded-lg hover:bg-indigo-100 text-indigo-800 transition-colors cursor-pointer"
                          title="Copy Tutor ID"
                        >
                          {copiedKey === "tutor_id_box" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Official Admin ID */}
                  {fullUser.role === "ADMIN" && fullUser.adminId && (
                    <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200/80 space-y-1">
                      <span className="text-rose-900 font-extrabold block text-[10px] uppercase tracking-wider">
                        Official Admin ID
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-sm text-[#0c2461] tracking-wide select-all">
                          {fullUser.adminId}
                        </span>
                        <button
                          onClick={() => handleCopy(fullUser.adminId, "admin_id_box")}
                          className="p-1 rounded-lg hover:bg-rose-100 text-rose-800 transition-colors cursor-pointer"
                          title="Copy Admin ID"
                        >
                          {copiedKey === "admin_id_box" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">System Internal ID</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 flex-1 truncate">
                        {fullUser.id}
                      </code>
                      <button
                        onClick={() => handleCopy(fullUser.id, "user_id")}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title="Copy System ID"
                      >
                        {copiedKey === "user_id" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">Registered Legal Name</span>
                    <div className="font-bold text-slate-900 mt-0.5 text-sm">{fullUser.name}</div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">Email Address</span>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5 font-mono">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      <span>{fullUser.email}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">Phone Contact</span>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{fullUser.phone || "Not provided"}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">Country of Residence</span>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <CountryFlag countryCode={findCountry(fullUser.country)?.code} flagEmoji={findCountry(fullUser.country)?.flag} size="xs" />
                      <span>{fullUser.country || "Not specified"}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">Operating Regional Timezone</span>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {fullUser.timezone ? getRegionalTimezone(fullUser.timezone).flag : "🌐"}{" "}
                        {fullUser.timezone || "Asia/Colombo"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">Registration Date</span>
                    <div className="font-semibold text-slate-700 mt-0.5">
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
                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Parent / Guardian Records</span>
                  </h3>

                  {fullUser.guardianName || fullUser.guardianPhone ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block font-medium">Guardian Full Name</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{fullUser.guardianName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block font-medium">Relationship to Student</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {fullUser.guardianRelationship || "Parent / Guardian"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block font-medium">Emergency Contact Phone</span>
                        <div className="font-mono font-bold text-blue-900 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{fullUser.guardianPhone || "—"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-2xl">
                      No parent or guardian details were provided during registration.
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
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
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
                        <div className="text-base font-black text-slate-900 mt-0.5">
                          {fullUser.headline || "Tutor / Academic Instructor"}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-slate-400 block uppercase tracking-wide">
                          About / Professional Summary
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed mt-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-line">
                          {rawAbout || "No bio details provided yet."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Degrees & Qualifications */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Academic Degrees & Accreditations</span>
                    </h3>

                    {degrees && degrees.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {degrees.map((deg: any, i: number) => (
                          <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
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
                      <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-2xl">
                        No specific degree records uploaded yet.
                      </div>
                    )}
                  </div>

                  {/* Subject Specializations & Rates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-2xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Teaching Specializations</span>
                      </h4>
                      {specializations && specializations.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {specializations.map((spec: string, i: number) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No specializations tagged.</p>
                      )}
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-2xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span>Standard Hourly Rates</span>
                      </h4>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                          <span className="font-sans font-bold text-blue-900">London A/L Tuition</span>
                          <span className="font-bold text-blue-700">LKR {Number(hourlyRateAL).toLocaleString()}/hr</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="font-sans font-bold text-slate-800">London O/L Tuition</span>
                          <span className="font-bold text-slate-700">LKR {Number(hourlyRateOL).toLocaleString()}/hr</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social & Academic Links */}
                  {(linkedin || researchGate || website || officeHours) && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-2 text-xs shadow-2xs">
                      <span className="font-bold text-slate-700 block">External Profiles & Office Availability</span>
                      <div className="flex flex-wrap gap-4 pt-1">
                        {officeHours && (
                          <span className="text-slate-600 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
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
                            <span>LinkedIn Profile</span>
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
                  {/* Student Academic Standing & Overview */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span>Student Academic Standing</span>
                      </h3>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold">
                        London {fullUser.academicLevel || "AL"} Curriculum
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-slate-400 block text-[11px] font-medium">Enrolled Track</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {fullUser.academicLevel === "OL" ? "Cambridge & Edexcel O-Levels" : "Cambridge & Edexcel A-Levels"}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-slate-400 block text-[11px] font-medium">Available Wallet Balance</span>
                        <span className="font-bold text-blue-700 text-sm font-mono flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span>{totalWalletHours} Hours Credit</span>
                        </span>
                      </div>
                    </div>

                    {/* Enrolled Courses Highlights */}
                    <div className="pt-2">
                      <span className="text-xs font-bold text-slate-700 block mb-2.5">
                        Active Class Enrollments ({totalEnrollments})
                      </span>
                      {fullUser.enrollments && fullUser.enrollments.length > 0 ? (
                        <div className="space-y-2">
                          {fullUser.enrollments.map((enr: any) => (
                            <div
                              key={enr.id}
                              className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 transition-colors"
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
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Enrolled
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          No active course enrollments yet.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4 shadow-2xs">
                  <h3 className="text-base font-black text-slate-900">Administrator Console Privileges</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This user possesses master administrative authority to manage all classes, courses, tutor allocations, BBB servers, and financial settings across the platform.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CLASSES & COURSES */}
        {activeTab === "courses" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isStudent ? "Enrolled Course Curriculums" : "Taught Course Catalog"}
              </h3>
              <p className="text-xs text-slate-500">
                {isStudent
                  ? "Subject breakdown, syllabus progress percentage, and assigned lecturers."
                  : "All academic courses created by this instructor with student enrollment rosters."}
              </p>
            </div>

            {isStudent ? (
              /* Student Enrollments Table */
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
                {fullUser.enrollments && fullUser.enrollments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-5">Subject & Class</th>
                          <th className="py-3.5 px-5">Instructor</th>
                          <th className="py-3.5 px-5">Academic Level</th>
                          <th className="py-3.5 px-5">Enrolled On</th>
                          <th className="py-3.5 px-5">Syllabus Progress</th>
                          <th className="py-3.5 px-5 text-right">Status</th>
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
                              <td className="py-4 px-5">
                                <div className="font-bold text-slate-900 text-sm">{c?.title || "Course"}</div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {c?.subjectCode || "CODE"}
                                </div>
                              </td>
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="w-7 h-7">
                                    <AvatarImage src={c?.tutor?.avatar} />
                                    <AvatarFallback>{c?.tutor?.name?.charAt(0) || "T"}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-semibold text-slate-800">{c?.tutor?.name || "Tutor"}</span>
                                </div>
                              </td>
                              <td className="py-4 px-5">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {c?.level || "A/L"}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-slate-600 font-medium">
                                {new Date(enr.enrolledAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </td>
                              <td className="py-4 px-5">
                                <div className="w-40 space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-slate-700">{percent}%</span>
                                    <span className="text-slate-400 font-mono">
                                      {completedForCourse}/{totalLessons} lessons
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="bg-[#0c2461] h-full rounded-full transition-all duration-300"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-5 text-right">
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
                  <div className="p-12 text-center text-xs text-slate-400">
                    No course enrollments found for this student.
                  </div>
                )}
              </div>
            ) : (
              /* Tutor Courses List */
              <div className="space-y-4">
                {fullUser.createdCourses && fullUser.createdCourses.length > 0 ? (
                  fullUser.createdCourses.map((c: any) => (
                    <div
                      key={c.id}
                      className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900">{c.title}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {c.subjectCode}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                              {c.level}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Created on {new Date(c.createdAt).toLocaleDateString()} • Status:{" "}
                            <strong className="text-emerald-600">{c.status || "PUBLISHED"}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold text-slate-700">
                            {c.modules?.length || 0} Modules
                          </span>
                          <span className="px-3 py-1.5 rounded-xl bg-blue-50 font-bold text-blue-700">
                            {c.enrollments?.length || 0} Students Enrolled
                          </span>
                        </div>
                      </div>

                      {/* Student Roster */}
                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-2.5">
                          Enrolled Students Roster ({c.enrollments?.length || 0})
                        </span>
                        {c.enrollments && c.enrollments.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {c.enrollments.map((enr: any) => (
                              <div
                                key={enr.id}
                                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-xs"
                              >
                                <Avatar className="w-8 h-8">
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
                          <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-2xl">
                            No students enrolled yet.
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
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
            <div>
              <h3 className="text-base font-black text-slate-900">
                BigBlueButton Live Classroom Sessions & Timings
              </h3>
              <p className="text-xs text-slate-500">
                Real-time BBB attendance, verified actual start/end timestamps, and recording playback URLs.
              </p>
            </div>

            {((isStudent ? studentCombinedEvents : tutorCombinedEvents) || []).length > 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-5">Session Title & Class</th>
                        <th className="py-3.5 px-5">Scheduled Date</th>
                        <th className="py-3.5 px-5">BBB Verified Timing</th>
                        <th className="py-3.5 px-5">Duration</th>
                        <th className="py-3.5 px-5">Attendees</th>
                        <th className="py-3.5 px-5">Room Status</th>
                        <th className="py-3.5 px-5 text-right">Recording Playback</th>
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
                            <td className="py-4 px-5">
                              <div className="font-bold text-slate-900 text-sm">
                                {ev.title}
                              </div>
                              <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                                {ev.courseTitle || ev.course?.title || "General Seminar"}
                              </div>
                            </td>

                            <td className="py-4 px-5 text-slate-600 font-medium">
                              <div>
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

                            <td className="py-4 px-5">
                              {hasActual ? (
                                <div className="font-mono text-[11px] text-slate-700">
                                  <div>
                                    Start:{" "}
                                    <span className="font-bold text-slate-900">
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

                            <td className="py-4 px-5 font-mono font-bold text-slate-800">
                              {durationMin ? `${durationMin} mins` : "—"}
                            </td>

                            <td className="py-4 px-5 font-mono">
                              <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 px-2.5 py-1 rounded-xl bg-slate-100">
                                <Users className="w-3.5 h-3.5 text-blue-600" />
                                <span>{ev.attendanceCount ?? 0}</span>
                              </span>
                            </td>

                            <td className="py-4 px-5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
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

                            <td className="py-4 px-5 text-right">
                              {ev.recordingUrl ? (
                                <a
                                  href={ev.recordingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="h-8 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
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
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                No live classroom sessions recorded for this user.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: 1-ON-1 TRIALS & CONSULTATIONS */}
        {activeTab === "trials" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-black text-slate-900">
                1-on-1 Consultation & Trial History
              </h3>
              <p className="text-xs text-slate-500">
                Booked private trial requests, meeting approval states, and session recordings.
              </p>
            </div>

            {((isStudent ? fullUser.studentTrials : fullUser.tutorTrials) || []).length > 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-5">{isStudent ? "Tutor" : "Student"}</th>
                        <th className="py-3.5 px-5">Subject / Topic</th>
                        <th className="py-3.5 px-5">Requested Date</th>
                        <th className="py-3.5 px-5">Status</th>
                        <th className="py-3.5 px-5">BBB Verified Timing</th>
                        <th className="py-3.5 px-5 text-right">Meeting / Recording</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(isStudent ? fullUser.studentTrials : fullUser.tutorTrials).map((tr: any) => (
                        <tr key={tr.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900 text-sm">
                              {isStudent ? tr.tutor?.name || "Tutor" : tr.student?.name || tr.studentName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {isStudent ? tr.tutor?.email : tr.student?.email || tr.studentEmail}
                            </div>
                          </td>

                          <td className="py-4 px-5">
                            <div className="font-semibold text-slate-800">
                              {tr.course?.title || tr.topic || "1-on-1 Consultation"}
                            </div>
                            {tr.notes && (
                              <div className="text-[11px] text-slate-400 italic truncate max-w-xs mt-0.5">
                                &quot;{tr.notes}&quot;
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-5 text-slate-600 font-medium">
                            <div>{new Date(tr.preferredDate).toLocaleDateString()}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {new Date(tr.preferredDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>

                          <td className="py-4 px-5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
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

                          <td className="py-4 px-5 font-mono text-[11px] text-slate-600">
                            {tr.actualStartTime ? (
                              <div>
                                {new Date(tr.actualStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                {tr.actualEndTime && ` - ${new Date(tr.actualEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="py-4 px-5 text-right">
                            {tr.recordingUrl ? (
                              <a
                                href={tr.recordingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-8 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-purple-700" />
                                <span>Recording</span>
                              </a>
                            ) : tr.meetingLink ? (
                              <a
                                href={tr.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="h-8 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Join Room</span>
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
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                No 1-on-1 trial consultation bookings found.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: WALLET, TOKENS & FINANCIAL HISTORY (Students) */}
        {activeTab === "wallet" && isStudent && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Wallet Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-1">
                <span className="text-xs font-bold text-amber-800">Current Token Balance</span>
                <div className="text-2xl font-black text-amber-950 font-mono flex items-center gap-2">
                  <Coins className="w-6 h-6 text-amber-600" />
                  <span>{totalWalletHours} Credit Hours</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-blue-50/70 border border-blue-200 space-y-1">
                <span className="text-xs font-bold text-blue-800">Successful Direct Payments</span>
                <div className="text-2xl font-black text-blue-950 font-mono">
                  LKR {totalSpentLKR.toLocaleString()}
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200 space-y-1">
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
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-5">Date & Time</th>
                          <th className="py-3.5 px-5">Type</th>
                          <th className="py-3.5 px-5">Hours (+ / -)</th>
                          <th className="py-3.5 px-5">Description / Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fullUser.tokenWallet.transactions.map((tx: any) => {
                          const isPositive = tx.amount > 0;
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-5 text-slate-500 font-mono">
                                {new Date(tx.createdAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-3.5 px-5">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    tx.type === "PURCHASE" || tx.type === "GRANT" || isPositive
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {tx.type}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 font-mono font-bold">
                                <span className={isPositive ? "text-emerald-600" : "text-slate-700"}>
                                  {isPositive ? `+${tx.amount}` : tx.amount} Hrs
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-slate-700">
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
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                  No credit transaction history recorded.
                </div>
              )}
            </div>

            {/* Direct Payments Gateway Transactions */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Payments.lk Invoices & Gateway History</span>
              </h4>

              {fullUser.payments && fullUser.payments.length > 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-5">Reference</th>
                          <th className="py-3.5 px-5">Item / Description</th>
                          <th className="py-3.5 px-5">Amount</th>
                          <th className="py-3.5 px-5">Payment Method</th>
                          <th className="py-3.5 px-5">Status</th>
                          <th className="py-3.5 px-5 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fullUser.payments.map((pm: any) => (
                          <tr key={pm.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3.5 px-5 font-mono font-semibold text-slate-800">
                              {pm.reference}
                            </td>
                            <td className="py-3.5 px-5 font-medium text-slate-900">
                              {pm.itemTitle || pm.itemType}
                            </td>
                            <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                              {pm.currency || "LKR"} {(pm.amountCents / 100).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-5 text-slate-600 font-mono text-[11px]">
                              {pm.paymentMethod || "Direct Card"}
                            </td>
                            <td className="py-3.5 px-5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                            <td className="py-3.5 px-5 text-right text-slate-500 font-mono text-[11px]">
                              {new Date(pm.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-400">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {fullUser.certificates.map((cert: any) => (
                    <div
                      key={cert.id}
                      className="p-5 rounded-3xl bg-amber-50/50 border border-amber-200 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <Award className="w-6 h-6 text-amber-600" />
                        <span className="text-[10px] font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-amber-200 text-amber-900">
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
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-400">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {fullUser.badges.map((b: any) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-3xl bg-white border border-slate-200 flex items-center gap-3.5 shadow-2xs"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-lg shrink-0">
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
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                  No badges earned yet.
                </div>
              )}
            </div>

            {/* Lesson Progress */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Completed Lessons Log ({totalCompletedLessons})</span>
              </h4>

              {fullUser.progress && fullUser.progress.length > 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                      <tr>
                        <th className="py-3 px-5">Lesson Title</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5 text-right">Completion Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fullUser.progress.map((pr: any) => (
                        <tr key={pr.id} className="hover:bg-slate-50">
                          <td className="py-3 px-5 font-medium text-slate-900">
                            {pr.lesson?.title || `Lesson #${pr.lessonId}`}
                          </td>
                          <td className="py-3 px-5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                pr.isCompleted
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {pr.isCompleted ? "Completed" : "In Progress"}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right text-slate-500 font-mono text-[11px]">
                            {new Date(pr.updatedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                  No lesson progress logs recorded yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. MINIMAL BOTTOM BAR */}
      <footer className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div className="flex items-center gap-2">
          <span>
            Viewing Profile: <strong className="text-slate-800">{fullUser.name}</strong> ({fullUser.email})
          </span>
          {fullUser.studentId && (
            <span className="font-mono text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {fullUser.studentId}
            </span>
          )}
          {fullUser.tutorId && (
            <span className="font-mono text-indigo-900 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {fullUser.tutorId}
            </span>
          )}
          {fullUser.adminId && (
            <span className="font-mono text-rose-900 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {fullUser.adminId}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="h-8 px-4 text-xs font-bold rounded-xl border-slate-200 hover:bg-slate-100 cursor-pointer"
        >
          Close History Inspector
        </Button>
      </footer>
    </div>
  );
}
