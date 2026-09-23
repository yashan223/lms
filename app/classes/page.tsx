"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  Search,
  Clock,
  BookOpen,
  Users,
  ArrowRight,
  Filter,
  GraduationCap,
  CalendarCheck,
  Video,
  Lock,
  Coins,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { TrialRequestModal } from "@/components/trials/TrialRequestModal";
import { CoursePurchaseModal } from "@/components/checkout/CoursePurchaseModal";
import { FacultyTutor, formatDbTutors, parseTutorBio } from "@/lib/faculty-tutors";

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [tutors, setTutors] = useState<FacultyTutor[]>([]);
  const [trialStats, setTrialStats] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"masterclasses" | "tutors">("masterclasses");
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedTrialCourseId, setSelectedTrialCourseId] = useState<string | undefined>(undefined);
  const [selectedTrialTutorId, setSelectedTrialTutorId] = useState<string | undefined>(undefined);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPurchaseCourse, setSelectedPurchaseCourse] = useState<any | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentLevel, setStudentLevel] = useState<"OL" | "AL">("AL");

  const categories = [
    "All",
    "School of Mathematics & Computing",
    "School of Computing & Engineering",
    "School of Science & O/L Academy",
    "School of Economics & Commerce",
  ];

  const loadCourses = async (isInitial?: any) => {
    try {
      if (isInitial === true && courses.length === 0) {
        setLoading(true);
      }
      const [res, dashRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/dashboard").catch(() => null),
      ]);
      if (dashRes && dashRes.ok) {
        const dashData = await dashRes.json();
        if (dashData.user) {
          setIsLoggedIn(true);
          const lvl = dashData.user.academicLevel === "OL" || dashData.user.headline?.includes("O/L") || dashData.user.headline?.includes("IGCSE") ? "OL" : "AL";
          setStudentLevel(lvl);
        }
      }
      if (res.ok) {
        const data = await res.json();
        if (data.courses && data.courses.length > 0) {
          const formatted = data.courses.map((c: any) => {
            const totalMins = c.modules?.reduce(
              (acc: number, m: any) =>
                acc +
                (m.lessons?.reduce((lAcc: number, l: any) => lAcc + (l.durationMin || 0), 0) || 0),
              0
            ) || 0;
            const calcHours = Math.round(totalMins / 60) || 1;

            return {
              id: c.id,
              title: c.title,
              slug: c.slug,
              subtitle: c.subtitle || c.description,
              category: c.category,
              level: c.level === "ADVANCED" ? "London A/L" : "London O/L",
              subjectCode: c.subjectCode || "MATH-101",
              thumbnail: c.thumbnail || null,
              price: c.price,
              olPrice: c.olPrice !== null && c.olPrice !== undefined ? Number(c.olPrice) : null,
              rating: 5.0,
              reviewCount: c.enrollments?.length || 0,
              studentsEnrolled: c.enrollments?.length || 0,
              durationHours: calcHours,
              lessonsCount:
                c.modules?.reduce(
                  (acc: number, m: any) => acc + (m.lessons?.length || 0),
                  0
                ) || 0,
              instructor: {
                id: c.instructor?.id,
                name: c.instructor?.name || "Faculty Tutor",
                avatar: c.instructor?.avatar || "",
                roleTitle: c.instructor?.headline || "Academic Tutor",
              },
              skills: [],
              tags: [c.category],
            };
          });
          setCourses(formatted);
        }
        if (data.tutors && Array.isArray(data.tutors)) {
          setTutors(formatDbTutors(data.tutors));
        }
      }

      // Fetch student trial stats
      fetch("/api/trials")
        .then((r) => r.json())
        .then((d) => {
          if (d.trialStats) {
            setTrialStats(d.trialStats);
          }
        })
        .catch(() => {});
    } catch (err) {
      console.error("Failed to load courses from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses(true);
  }, []);

  useRealtimeSync({
    events: ["COURSES_CHANGED", "ENROLLMENTS_CHANGED", "TRIALS_CHANGED"],
    onSync: () => {
      loadCourses(false);
    },
  });

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchCat =
        selectedCategory === "All" || course.category === selectedCategory;
      const matchLevel =
        selectedLevel === "ALL" ||
        (selectedLevel === "AL" && course.level.includes("A/L")) ||
        (selectedLevel === "OL" && course.level.includes("O/L"));
      const matchSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.subjectCode && course.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchLevel && matchSearch;
    });
  }, [courses, selectedCategory, selectedLevel, searchQuery]);

  const filteredTutors = useMemo(() => {
    return tutors.filter((tutor) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        tutor.name?.toLowerCase().includes(q) ||
        tutor.headline?.toLowerCase().includes(q) ||
        tutor.bio?.toLowerCase().includes(q) ||
        tutor.category?.toLowerCase().includes(q) ||
        (tutor.subjects &&
          tutor.subjects.some(
            (s: any) =>
              s.name?.toLowerCase().includes(q) ||
              s.code?.toLowerCase().includes(q) ||
              s.levelBadge?.toLowerCase().includes(q)
          )) ||
        (tutor.createdCourses &&
          tutor.createdCourses.some(
            (c: any) =>
              c.title?.toLowerCase().includes(q) ||
              c.subjectCode?.toLowerCase().includes(q) ||
              c.category?.toLowerCase().includes(q)
          ));

      const matchCat =
        selectedCategory === "All" ||
        tutor.category === selectedCategory ||
        (tutor.createdCourses && tutor.createdCourses.some((c: any) => c.category === selectedCategory)) ||
        (tutor.headline && tutor.headline.toLowerCase().includes(selectedCategory.toLowerCase()));

      const matchLevel =
        selectedLevel === "ALL" ||
        tutor.level === "BOTH" ||
        (selectedLevel === "AL" && (tutor.level === "AL" || tutor.subjects?.some((s: any) => s.level === "AL"))) ||
        (selectedLevel === "OL" && (tutor.level === "OL" || tutor.subjects?.some((s: any) => s.level === "OL")));

      return matchSearch && matchCat && matchLevel;
    });
  }, [tutors, searchQuery, selectedCategory, selectedLevel]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar />

      <main className="flex-1 py-8 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Main View Switcher: Masterclasses vs Tutors */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setViewMode("masterclasses")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === "masterclasses"
                    ? "bg-[#0c2461] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Browse Individual Classes</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  viewMode === "masterclasses" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {courses.length}
                </span>
              </button>

              <button
                onClick={() => setViewMode("tutors")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === "tutors"
                    ? "bg-[#0c2461] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <GraduationCap className="w-4 h-4 text-amber-400" />
                <span>Tutors Conducting Classes</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  viewMode === "tutors" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {tutors.length}
                </span>
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder={
                  viewMode === "masterclasses"
                    ? "Search individual class, unit code, topic..."
                    : "Search tutor, subject, specialty..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-xs border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Level Filter (Shown for both Masterclasses and Tutors) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Level:</span>
              {[
                { id: "ALL", label: "All Qualifications" },
                { id: "AL", label: "London A/L (IAL)" },
                { id: "OL", label: "London O/L (IGCSE)" },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedLevel === lvl.id
                      ? "bg-[#0c2461] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>

            {viewMode === "masterclasses" ? (
              <button
                onClick={() => setViewMode("tutors")}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Looking for O/L & A/L Tutors?</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setViewMode("masterclasses")}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Browse Individual Classes Syllabus</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Academic Categories Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* VIEW 1: MASTERCLASSES GRID */}
          {viewMode === "masterclasses" && (
            <>
              {filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => (
                    <div
                      key={course.id}
                      className="group rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        <Link href={`/classes/${course.slug}`} prefetch={true} className="block relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-[#0c2461] to-[#1e3799] cursor-pointer group/img">
                          {course.thumbnail ? (
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center group-hover/img:scale-105 transition-transform duration-300">
                              <BookOpen className="w-10 h-10 text-white/30 mb-1.5" />
                              <span className="text-white/70 font-semibold text-xs uppercase tracking-wider">{course.category}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <Badge className="bg-white/95 text-[#0c2461] backdrop-blur-md text-[11px] font-bold shadow-xs">
                              {course.level}
                            </Badge>
                          </div>

                          <div className="absolute bottom-3 left-3 flex items-center text-white text-xs">
                            <span className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md font-mono text-[11px]">
                              {course.subjectCode}
                            </span>
                          </div>
                        </Link>

                        <div className="p-5 space-y-3">
                          <Link href={`/classes/${course.slug}`} prefetch={true} className="block">
                            <h3 className="font-bold text-slate-900 text-base hover:text-blue-700 transition-colors leading-snug line-clamp-2 cursor-pointer">
                              {course.title}
                            </h3>
                          </Link>

                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {course.subtitle}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-slate-500 py-1 border-y border-slate-100">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              {course.durationHours} hrs
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                              {course.lessonsCount} lessons
                            </span>
                          </div>

                          {/* Tutor Details on Card */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="w-8 h-8 shrink-0">
                                <AvatarImage src={course.instructor.avatar} alt={course.instructor.name} />
                                <AvatarFallback>{course.instructor.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate">
                                  {course.instructor.name}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {course.instructor.roleTitle}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setSearchQuery(course.instructor.name);
                                setViewMode("tutors");
                              }}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-bold whitespace-nowrap cursor-pointer hover:underline"
                              title={`View ${course.instructor.name}'s profile & classes`}
                            >
                              View Tutor &gt;
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-3">
                        {isLoggedIn ? (
                          <>
                            {(() => {
                              const isOL = studentLevel === "OL";
                              const effectivePrice = isOL && course.olPrice !== null && course.olPrice !== undefined && Number(course.olPrice) > 0 ? Number(course.olPrice) : course.price;
                              return (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-2xs">
                                      <Coins className="w-4 h-4" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-2xl font-black text-slate-900">
                                        {effectivePrice}
                                      </span>
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Tokens
                                      </span>
                                    </div>
                                  </div>
                                  {isOL && course.olPrice !== null && course.olPrice !== undefined && Number(course.olPrice) > 0 ? (
                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                                      O/L Rate
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                                      Instant Access
                                    </span>
                                  )}
                                </div>
                              );
                            })()}

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => {
                                  setSelectedPurchaseCourse(course);
                                  setShowPurchaseModal(true);
                                }}
                                className="h-9 px-3 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                title="Enroll in individual class using tokens and unlock all study materials"
                              >
                                <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                <span>Enroll</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedTrialCourseId(course.id);
                                  setSelectedTrialTutorId(course.instructor?.id);
                                  setShowTrialModal(true);
                                }}
                                className="h-9 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                title="Book a 30-min free online trial session"
                              >
                                <CalendarCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>Free Trial</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full flex items-center justify-between gap-2">
                            <Link
                              href={`/login?redirect=${encodeURIComponent(`/classes/${course.slug}`)}`}
                              className="group/lock flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover/lock:bg-amber-500/10 border border-slate-200 group-hover/lock:border-amber-500/20 flex items-center justify-center text-slate-400 group-hover/lock:text-amber-600 transition-colors">
                                <Lock className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700 group-hover/lock:text-indigo-600">
                                  Sign in to view
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Student Pricing
                                </span>
                              </div>
                            </Link>

                            <Link
                              href={`/classes/${course.slug}`}
                              prefetch={true}
                              className="h-9 px-3.5 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold shadow-xs inline-flex items-center justify-center gap-1.5 transition-all"
                            >
                              <span>View Syllabus</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
                  <p className="text-slate-500 font-semibold mb-2">
                    No individual classes found matching your search.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("All");
                      setSelectedLevel("ALL");
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              )}
            </>
          )}

          {/* VIEW 2: TUTORS CONDUCTING CLASSES */}
          {viewMode === "tutors" && (
            <>
              {trialStats && (
                <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-blue-950">
                        1-on-1 Free Trial Allowance: {trialStats.remaining} of 5 Left
                      </div>
                      <p className="text-[11px] text-blue-800/80">
                        Each student can request up to 5 free trials across different tutors (limit 1 trial per tutor).
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-[#0c2461] text-white font-bold text-[11px] px-3 py-1 rounded-lg shrink-0">
                    {trialStats.totalUsed} of 5 Booked
                  </Badge>
                </div>
              )}

              {filteredTutors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTutors.map((tutor) => (
                    <div
                      key={tutor.id}
                      className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        {/* Tutor Header Info */}
                        <div className="flex items-start gap-4">
                          <Avatar className="w-16 h-16 rounded-2xl border-2 border-blue-100 shadow-xs shrink-0">
                            <AvatarImage src={tutor.avatar} alt={tutor.name} />
                            <AvatarFallback className="text-lg font-bold bg-[#0c2461] text-white">
                              {tutor.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-slate-900 text-base leading-snug">
                                {tutor.name}
                              </h3>
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold py-0.5">
                                Verified Tutor
                              </Badge>
                            </div>

                            <p className="text-xs font-semibold text-blue-700 mt-1 line-clamp-2">
                              {tutor.headline || "Expert Tutor"}
                            </p>

                            {tutor.country && (
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {tutor.country}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Tutor Bio */}
                        {tutor.bio && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                              {parseTutorBio(tutor.bio)}
                            </p>
                          </div>
                        )}

                        {/* Masterclasses & Classes Conducted */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                              {tutor.createdCourses?.length || 0} Individual Classes
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Video className="w-3.5 h-3.5 text-emerald-600" />
                              {tutor.events?.length || 0} Live Sessions
                            </span>
                          </div>

                          {/* Subjects & Specifications */}
                          {tutor.subjects && tutor.subjects.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                London O/L & A/L Subjects Taught:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {tutor.subjects.map((sub: any, sIdx: number) => (
                                  <span
                                    key={sIdx}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-colors ${
                                      sub.level === "AL"
                                        ? "bg-blue-50/80 text-blue-900 border-blue-200"
                                        : "bg-emerald-50/80 text-emerald-900 border-emerald-200"
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        sub.level === "AL" ? "bg-blue-600" : "bg-emerald-600"
                                      }`}
                                    />
                                    <span className="font-mono text-[10px] font-bold opacity-80">
                                      {sub.code}
                                    </span>
                                    <span>{sub.name}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {tutor.createdCourses && tutor.createdCourses.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                Individual Classes Conducted:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {tutor.createdCourses.map((c: any) => (
                                  <Link
                                    key={c.id}
                                    href={`/classes/${c.slug}`}
                                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold border border-blue-100 flex items-center gap-1 transition-colors"
                                  >
                                    <span className="font-mono font-bold">{c.subjectCode || "MC"}</span>
                                    <span className="truncate max-w-[150px]">{c.title}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action CTAs */}
                      <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                        {trialStats?.bookedTutorIds?.includes(tutor.id) ? (
                          <button
                            onClick={() => {
                              setSelectedTrialTutorId(tutor.id);
                              setSelectedTrialCourseId(tutor.createdCourses?.[0]?.id);
                              setShowTrialModal(true);
                            }}
                            className="flex-1 h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            title="You have already requested a trial with this tutor"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Trial Booked</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedTrialTutorId(tutor.id);
                              setSelectedTrialCourseId(tutor.createdCourses?.[0]?.id);
                              setShowTrialModal(true);
                            }}
                            className="flex-1 h-10 px-4 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold shadow-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <CalendarCheck className="w-3.5 h-3.5 text-amber-300" />
                            <span>Book 1-on-1 Trial Class</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSearchQuery(tutor.name);
                            setViewMode("masterclasses");
                          }}
                          className="h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                          title="View all classes by this tutor"
                        >
                          <span>Classes</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
                  <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-semibold mb-2">
                    No tutors found matching your search.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("All");
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      <TrialRequestModal
        isOpen={showTrialModal}
        onClose={() => {
          setShowTrialModal(false);
          setSelectedTrialCourseId(undefined);
          setSelectedTrialTutorId(undefined);
        }}
        initialCourseId={selectedTrialCourseId}
        initialTutorId={selectedTrialTutorId}
        allCourses={courses}
        onSuccess={() => {
          loadCourses(false);
        }}
      />

      <CoursePurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          setSelectedPurchaseCourse(null);
        }}
        course={selectedPurchaseCourse}
      />

      <Footer />
    </div>
  );
}
