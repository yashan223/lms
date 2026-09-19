"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Calendar,
  CalendarCheck,
  Clock,
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  BookOpen,
  CalendarClock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  User,
  GraduationCap,
  ArrowLeft,
  ChevronRight,
  HelpCircle,
  Phone,
  Mail,
  Check,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { StudentAvailabilityModal } from "@/components/student/StudentAvailabilityModal";

interface CourseItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  level: string;
  subjectCode?: string;
  thumbnail?: string;
  instructor?: {
    id?: string;
    name: string;
    avatar?: string;
    roleTitle?: string;
  };
}

interface TutorItem {
  id: string;
  name: string;
  avatar?: string;
  headline?: string;
  bio?: string;
  country?: string;
  subjects?: any[];
  createdCourses?: any[];
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const formatForDateTimeInput = (date: Date) => {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

function FreeTrialContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCourseId = searchParams.get("courseId") || "";
  const initialTutorId = searchParams.get("tutorId") || "";

  // Auth and user state
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Data state
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [tutors, setTutors] = useState<TutorItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Trial allowance stats
  const [trialStats, setTrialStats] = useState<{
    totalUsed: number;
    maxAllowed: number;
    remaining: number;
    bookedTutorIds: string[];
    isMaxReached: boolean;
  } | null>(null);

  // Form selection state
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId);
  const [selectedTutorId, setSelectedTutorId] = useState<string>(initialTutorId);
  const [preferredDate, setPreferredDate] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Student contact info
  const [studentName, setStudentName] = useState<string>("");
  const [studentEmail, setStudentEmail] = useState<string>("");
  const [studentPhone, setStudentPhone] = useState<string>("");

  // Live slots state
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [openSlots, setOpenSlots] = useState<
    Array<{
      startTime: string;
      timeDisplay: string;
      dateLabel: string;
      matchesStudent?: boolean;
    }>
  >([]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdTrial, setCreatedTrial] = useState<any | null>(null);

  // Availability modal gating
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  // Categories list
  const categories = [
    "All",
    "School of Mathematics & Computing",
    "School of Computing & Engineering",
    "School of Science & O/L Academy",
    "School of Economics & Commerce",
  ];

  // 1. Fetch user authentication status
  useEffect(() => {
    async function loadAuth() {
      try {
        setAuthLoading(true);
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            setIsLoggedIn(true);
            setStudentName(data.user.name || "");
            setStudentEmail(data.user.email || "");
            setStudentPhone(data.user.phone || "");
          }
        }
      } catch (err) {
        console.error("Failed to check auth:", err);
      } finally {
        setAuthLoading(false);
      }
    }
    loadAuth();
  }, []);

  // 2. Fetch courses, tutors, and trial stats
  useEffect(() => {
    async function loadDirectoryData() {
      try {
        setDataLoading(true);
        const [courseRes, trialRes] = await Promise.all([
          fetch("/api/courses"),
          fetch("/api/trials").catch(() => null),
        ]);

        if (courseRes.ok) {
          const data = await courseRes.json();
          if (data.courses) {
            setCourses(data.courses);
          }
          if (data.tutors) {
            setTutors(data.tutors);
          }
        }

        if (trialRes && trialRes.ok) {
          const tData = await trialRes.json();
          if (tData.trialStats) {
            setTrialStats(tData.trialStats);
          }
        }
      } catch (err) {
        console.error("Failed to load trial data:", err);
      } finally {
        setDataLoading(false);
      }
    }
    loadDirectoryData();
  }, []);

  // 3. Pre-select course and tutor when initial params arrive
  useEffect(() => {
    if (initialCourseId && courses.length > 0) {
      setSelectedCourseId(initialCourseId);
      const match = courses.find((c) => c.id === initialCourseId || c.slug === initialCourseId);
      if (match) {
        if (match.instructor?.id) {
          setSelectedTutorId(match.instructor.id);
        }
      }
    }
    if (initialTutorId) {
      setSelectedTutorId(initialTutorId);
    }
  }, [initialCourseId, initialTutorId, courses]);

  // 4. Fetch dynamic tutor availability slots when tutor or course changes
  useEffect(() => {
    if (!selectedTutorId && !selectedCourseId) {
      setOpenSlots([]);
      return;
    }

    let isMounted = true;
    setLoadingSlots(true);

    const params = new URLSearchParams();
    if (selectedTutorId) params.set("tutorId", selectedTutorId);
    if (selectedCourseId) params.set("courseId", selectedCourseId);
    if (currentUser?.id) params.set("studentId", currentUser.id);
    params.set("days", "7");

    fetch(`/api/tutor/availability?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!isMounted) return;
        if (d.days && Array.isArray(d.days)) {
          const collected: Array<{
            startTime: string;
            timeDisplay: string;
            dateLabel: string;
            matchesStudent?: boolean;
          }> = [];
          for (const day of d.days) {
            for (const s of day.slots || []) {
              if (s.isAvailable && collected.length < 8) {
                collected.push({
                  startTime: s.startTime,
                  timeDisplay: s.timeDisplay,
                  dateLabel: day.dateLabel,
                  matchesStudent: Boolean(s.matchesStudentAvailability),
                });
              }
            }
          }
          setOpenSlots(collected);
        }
      })
      .catch((err) => console.error("Error fetching tutor slots:", err))
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTutorId, selectedCourseId, currentUser?.id]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchCat = selectedCategory === "All" || c.category === selectedCategory;
      const matchLevel =
        selectedLevel === "ALL" ||
        (selectedLevel === "AL" && (c.level?.includes("A/L") || c.level === "ADVANCED")) ||
        (selectedLevel === "OL" && (c.level?.includes("O/L") || c.level === "BEGINNER"));
      return matchCat && matchLevel;
    });
  }, [courses, selectedCategory, selectedLevel]);

  // Selected course and tutor entities
  const currentCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId || c.slug === selectedCourseId);
  }, [courses, selectedCourseId]);

  const currentTutor = useMemo(() => {
    if (selectedTutorId) {
      return tutors.find((t) => t.id === selectedTutorId) || null;
    }
    if (currentCourse?.instructor?.id) {
      return tutors.find((t) => t.id === currentCourse.instructor?.id) || null;
    }
    return null;
  }, [tutors, selectedTutorId, currentCourse]);

  // Handle Trial Booking Submission
  const handleSubmitTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isLoggedIn) {
      setErrorMsg("Please sign in or create a student account to book your 1-on-1 trial session.");
      return;
    }

    if (!selectedCourseId && !selectedTutorId) {
      setErrorMsg("Please select an individual class or a tutor for your trial session.");
      return;
    }

    if (!preferredDate) {
      setErrorMsg("Please choose your preferred date and time slot.");
      return;
    }

    // Check tutor trial duplicate limit
    if (currentTutor?.id && trialStats?.bookedTutorIds?.includes(currentTutor.id)) {
      setErrorMsg(`You have already booked a free trial with ${currentTutor.name}. Each student can book 1 trial per tutor across up to 5 tutors.`);
      return;
    }

    if (trialStats?.isMaxReached) {
      setErrorMsg("You have reached the maximum allowance of 5 free trial sessions.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_trial",
          courseId: selectedCourseId || undefined,
          tutorId: selectedTutorId || currentTutor?.id || undefined,
          preferredDate,
          topic: topic.trim() || undefined,
          notes: notes.trim() || undefined,
          studentName: studentName.trim() || currentUser?.name,
          studentEmail: studentEmail.trim() || currentUser?.email,
          studentPhone: studentPhone.trim() || currentUser?.phone || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.trial) {
        setCreatedTrial(data.trial);
        // Refresh trial stats
        fetch("/api/trials")
          .then((r) => r.json())
          .then((d) => {
            if (d.trialStats) setTrialStats(d.trialStats);
          })
          .catch(() => {});
      } else {
        if (res.status === 428 || data.code === "STUDY_AVAILABILITY_REQUIRED") {
          setShowAvailabilityModal(true);
        } else {
          setErrorMsg(data.error || "Failed to submit trial request. Please try again.");
        }
      }
    } catch (err: any) {
      console.error("Trial submission error:", err);
      setErrorMsg("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar />

      <main className="flex-1 bg-slate-50 border-b border-slate-200">
        {/* Top Breadcrumb & Hero Header */}
        <div className="bg-gradient-to-b from-[#0c2461] to-[#12366b] text-white py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 mb-4">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/classes" className="hover:text-white transition-colors">
                Classes
              </Link>
              <span>/</span>
              <span className="text-white font-bold">Request Free Trial</span>
            </div>

            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>100% Free • No Payment Required • 30 Mins 1-on-1</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black tracking-tight text-white leading-tight">
                Request a 30-Minute Free 1-on-1 Trial Session
              </h1>

              <p className="text-sm sm:text-base text-blue-100 leading-relaxed max-w-2xl">
                Experience our elite London A/L (IAL) and London O/L (IGCSE) academic tutors firsthand.
                Diagnose syllabus weak spots, practice tricky exam questions, and plan your revision roadmap with zero obligations.
              </p>
            </div>

            {/* Trial Allowance Banner for Logged-In Students */}
            {isLoggedIn && trialStats && (
              <div className="mt-8 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-3xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                    {trialStats.remaining}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {trialStats.remaining} of {trialStats.maxAllowed} Free Trials Remaining
                    </div>
                    <p className="text-xs text-blue-200">
                      You can request 1 trial per tutor across up to 5 different tutors.
                    </p>
                  </div>
                </div>

                <Badge className="bg-emerald-500 text-white font-bold text-xs px-3 py-1 rounded-lg shrink-0">
                  {trialStats.totalUsed} Booked
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          {createdTrial ? (
            /* SUCCESS CONFIRMATION STATE */
            <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6 text-center animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <Badge className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1">
                  Trial Request Confirmed
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
                  Your 30-Min 1-on-1 Trial is Booked!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  We have allocated your session and notified your tutor. Check your email for calendar invites and preparation notes.
                </p>
              </div>

              {/* Summary card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <span className="text-xs font-semibold text-slate-500">Scheduled Date & Time:</span>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    {new Date(createdTrial.preferredDate).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                {createdTrial.course && (
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <span className="text-xs font-semibold text-slate-500">Class / Subject:</span>
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[250px]">
                      {createdTrial.course.title}
                    </span>
                  </div>
                )}

                {createdTrial.tutor && (
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <span className="text-xs font-semibold text-slate-500">Assigned Tutor:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {createdTrial.tutor.name}
                    </span>
                  </div>
                )}

                {createdTrial.meetingLink && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-slate-500">Video Room Link:</span>
                    <a
                      href={createdTrial.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Session Room</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {createdTrial && (
                  <a
                    href={buildGoogleCalendarUrl({
                      title: `EduPulse 1-on-1 Trial: ${createdTrial.course?.title || "Academic Consultation"}`,
                      description: `Your 30-minute free trial session with ${createdTrial.tutor?.name || "Senior Tutor"}.\nMeeting: ${createdTrial.meetingLink || "Online Room"}\nTopic: ${createdTrial.topic || "Syllabus Review"}`,
                      dueDate: new Date(createdTrial.preferredDate),
                      durationMinutes: 30,
                      courseTitle: createdTrial.course?.title,
                      location: createdTrial.meetingLink || "Online Video Room",
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <CalendarClock className="w-4 h-4" />
                    <span>Add to Google Calendar</span>
                  </a>
                )}

                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Go to Student Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            /* BOOKING FORM & TRUST SIDEBAR */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              
              {/* LEFT FORM COLUMN */}
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-8">
                
                {/* Auth Notice if not logged in */}
                {!isLoggedIn && !authLoading && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Student Account Required for Booking
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Sign in or create an account to allocate your 5 free trial sessions.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <Link
                        href="/login?redirect=/trials"
                        className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 text-center"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/register?redirect=/trials"
                        className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold text-center shadow-xs"
                      >
                        Register
                      </Link>
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitTrial} className="space-y-8">
                  {/* STEP 1: CHOOSE QUALIFICATION & SUBJECT */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0c2461] text-white text-xs font-bold flex items-center justify-center">
                        1
                      </div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        Select Qualification & Individual Class
                      </h3>
                    </div>

                    {/* Qualification Level Filter */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { id: "ALL", label: "All Qualifications" },
                        { id: "AL", label: "London A/L (IAL)" },
                        { id: "OL", label: "London O/L (IGCSE)" },
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setSelectedLevel(lvl.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedLevel === lvl.id
                              ? "bg-[#0c2461] text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>

                    {/* School Category Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            selectedCategory === cat
                              ? "bg-blue-600 text-white font-bold shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Individual Class Dropdown / Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Choose Individual Class / Syllabus Unit:
                      </label>
                      <select
                        value={selectedCourseId}
                        onChange={(e) => {
                          setSelectedCourseId(e.target.value);
                          const c = courses.find((item) => item.id === e.target.value);
                          if (c?.instructor?.id) {
                            setSelectedTutorId(c.instructor.id);
                          }
                        }}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">-- Choose Subject / Individual Class --</option>
                        {filteredCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            [{c.level || "London A/L"}] {c.title} ({c.subjectCode || "Unit"})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* STEP 2: ASSIGNED TUTOR */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0c2461] text-white text-xs font-bold flex items-center justify-center">
                        2
                      </div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        Assigned Academic Faculty Tutor
                      </h3>
                    </div>

                    {currentTutor ? (
                      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-start gap-4">
                        <Avatar className="w-14 h-14 rounded-2xl border-2 border-blue-200 shadow-xs shrink-0">
                          <AvatarImage src={currentTutor.avatar} alt={currentTutor.name} />
                          <AvatarFallback className="font-bold bg-[#0c2461] text-white">
                            {currentTutor.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-sm text-slate-900">
                              {currentTutor.name}
                            </h4>
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              Verified Tutor
                            </Badge>
                          </div>
                          <p className="text-xs font-semibold text-blue-700 mt-0.5">
                            {currentTutor.headline || "Subject Specialist"}
                          </p>
                          {currentTutor.bio && (
                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                              {currentTutor.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          {selectedCourseId
                            ? "A certified specialist tutor will be assigned for this session."
                            : "Select an individual class above to view the assigned specialist tutor."}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* STEP 3: PICK DATE & TIME SLOT */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#0c2461] text-white text-xs font-bold flex items-center justify-center">
                          3
                        </div>
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                          Choose Date & Time Slot
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        30-Minute Consultation
                      </span>
                    </div>

                    {/* Open availability slots pill grid */}
                    {openSlots.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Suggested Available Slots (Next 7 Days):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {openSlots.map((slot, sIdx) => {
                            const isSelected = preferredDate === formatForDateTimeInput(new Date(slot.startTime));
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => setPreferredDate(formatForDateTimeInput(new Date(slot.startTime)))}
                                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                  isSelected
                                    ? "bg-[#0c2461] text-white border-[#0c2461] shadow-xs"
                                    : "bg-slate-50 hover:bg-blue-50 text-slate-800 border-slate-200"
                                }`}
                              >
                                <div className="text-[11px] font-bold opacity-80">{slot.dateLabel}</div>
                                <div className="text-xs font-extrabold mt-0.5">{slot.timeDisplay}</div>
                                {slot.matchesStudent && (
                                  <span className={`text-[9px] font-bold mt-1 inline-flex items-center gap-0.5 ${
                                    isSelected ? "text-amber-300" : "text-emerald-700"
                                  }`}>
                                    <Sparkles className="w-2.5 h-2.5" /> Best Fit
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Or manual datetime input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Or Pick Specific Date & Time:
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input
                          type="datetime-local"
                          value={preferredDate}
                          onChange={(e) => setPreferredDate(e.target.value)}
                          min={formatForDateTimeInput(new Date())}
                          className="pl-10 h-11 border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Sessions are conducted in your local device timezone.
                      </p>
                    </div>
                  </div>

                  {/* STEP 4: GOALS & STUDENT DETAILS */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0c2461] text-white text-xs font-bold flex items-center justify-center">
                        4
                      </div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        Topic Focus & Student Details
                      </h3>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Specific Question or Topic to Cover:
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Pure Maths P3 Integration by Parts, IGCSE Chemistry Stoichiometry..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="h-10 text-xs border-slate-300 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Student Full Name:
                        </label>
                        <Input
                          type="text"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="Your Name"
                          className="h-10 text-xs border-slate-300 rounded-xl"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Student Email:
                        </label>
                        <Input
                          type="email"
                          value={studentEmail}
                          onChange={(e) => setStudentEmail(e.target.value)}
                          placeholder="student@example.com"
                          className="h-10 text-xs border-slate-300 rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        WhatsApp / Phone (For Class Reminders & Meeting Link):
                      </label>
                      <Input
                        type="tel"
                        value={studentPhone}
                        onChange={(e) => setStudentPhone(e.target.value)}
                        placeholder="+94 77 123 4567 or +44 7123 456789"
                        className="h-10 text-xs border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Additional Notes or Exam Target (Optional):
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Tell the tutor about your exam board (Edexcel / Cambridge), target grade, or specific past paper question..."
                        className="w-full h-20 p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <Button
                      type="submit"
                      disabled={submitting || (trialStats ? trialStats.isMaxReached : false)}
                      className="w-full h-12 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Booking Your Session...</span>
                        </>
                      ) : (
                        <>
                          <CalendarCheck className="w-4 h-4 text-amber-300" />
                          <span>Confirm & Book 30-Min Free Trial</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>

                    <p className="text-center text-[11px] text-slate-500">
                      🔒 Zero payment details required. No credit card. 100% free academic consultation.
                    </p>
                  </div>
                </form>
              </div>

              {/* RIGHT SIDEBAR / TRUST PANEL */}
              <div className="lg:col-span-4 space-y-6">
                {/* Guarantee Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>What to Expect in Your Session:</span>
                  </h4>

                  <ul className="space-y-3 text-xs text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 font-bold" />
                      </div>
                      <span>
                        <strong>Live Diagnostic Breakdown:</strong> Pinpoint tricky topics and learn method-mark scoring techniques.
                      </span>
                    </li>

                    <li className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 font-bold" />
                      </div>
                      <span>
                        <strong>Interactive Whiteboard & Video:</strong> Test the live learning room, digital pen tools, and lesson handouts.
                      </span>
                    </li>

                    <li className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 font-bold" />
                      </div>
                      <span>
                        <strong>Personalized Revision Plan:</strong> Receive expert advice on exam series pacing (Jan / May / Oct).
                      </span>
                    </li>

                    <li className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 font-bold" />
                      </div>
                      <span>
                        <strong>Flexible Rescheduling:</strong> Need to change your time? Reschedule anytime via your student dashboard.
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Trial Allowance Info Card */}
                <div className="bg-blue-50/60 rounded-3xl p-6 border border-blue-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>5 Free Trials Allowance</span>
                  </div>
                  <p className="text-xs text-blue-950/80 leading-relaxed">
                    Every student account is granted up to <strong>5 free 30-minute trials</strong> across different subject tutors (limit 1 trial per tutor).
                    Test multiple subjects before deciding to top up hours or enroll.
                  </p>
                </div>

                {/* Frequently Asked Questions */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>Frequently Asked Questions</span>
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">Is this really 100% free?</div>
                      <p className="text-slate-500 mt-0.5 leading-relaxed">
                        Yes! No credit card or payment information is ever requested for trial sessions.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="font-bold text-slate-900">What equipment do I need?</div>
                      <p className="text-slate-500 mt-0.5 leading-relaxed">
                        A laptop, desktop, or tablet with a working microphone and internet connection.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="font-bold text-slate-900">How do I join the session?</div>
                      <p className="text-slate-500 mt-0.5 leading-relaxed">
                        You will receive an email and SMS with the secure video room link. It will also appear in your student dashboard calendar.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Need Help CTA */}
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-center space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Have questions or need assistance?
                  </span>
                  <Link
                    href="/classes"
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 hover:underline"
                  >
                    <span>Browse All Individual Classes</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Student Study Availability Modal Gating */}
      <StudentAvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        currentUser={currentUser}
        onUpdated={() => {
          setShowAvailabilityModal(false);
          // Re-trigger submission
        }}
      />
    </div>
  );
}

export default function FreeTrialPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading Trial Booking...</span>
          </div>
        </div>
      }
    >
      <FreeTrialContent />
    </Suspense>
  );
}
