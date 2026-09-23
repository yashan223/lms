"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Clock,
  BookOpen,
  Users,
  ArrowRight,
  ShieldCheck,
  Coins,
  Lock,
  GraduationCap,
  CalendarCheck,
  Sparkles,
  Award,
} from "lucide-react";
import {
  FacultyTutor,
  formatDbTutors,
  parseTutorBio,
} from "@/lib/faculty-tutors";
import { TrialRequestModal } from "@/components/trials/TrialRequestModal";

export function CourseGrid() {
  const [courses, setCourses] = useState<any[]>([]);
  const [tutors, setTutors] = useState<FacultyTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"tutors" | "classes">("tutors");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedTrialTutorId, setSelectedTrialTutorId] = useState<string | undefined>(undefined);
  const [selectedTrialCourseId, setSelectedTrialCourseId] = useState<string | undefined>(undefined);

  const categories = [
    "All",
    "School of Mathematics & Computing",
    "School of Computing & Engineering",
    "School of Science & O/L Academy",
    "School of Economics & Commerce",
  ];

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        const [res, dashRes] = await Promise.all([
          fetch("/api/courses"),
          fetch("/api/dashboard").catch(() => null),
        ]);
        if (dashRes && dashRes.ok) {
          const dashData = await dashRes.json();
          if (dashData.user) {
            setIsLoggedIn(true);
          }
        }
        if (res.ok) {
          const data = await res.json();
          if (data.tutors && Array.isArray(data.tutors)) {
            setTutors(formatDbTutors(data.tutors));
          }
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
        }
      } catch (err) {
        console.error("Failed to load courses from DB:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesCategory =
        selectedCategory === "All" || course.category === selectedCategory;
      const matchesLevel =
        selectedLevel === "ALL" ||
        (selectedLevel === "AL" && course.level.includes("A/L")) ||
        (selectedLevel === "OL" && course.level.includes("O/L"));
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        course.subtitle.toLowerCase().includes(q) ||
        course.instructor.name.toLowerCase().includes(q) ||
        (course.subjectCode && course.subjectCode.toLowerCase().includes(q)) ||
        (course.tags && course.tags.some((t: string) => t.toLowerCase().includes(q)));
      return matchesCategory && matchesLevel && matchesSearch;
    });
  }, [courses, selectedCategory, selectedLevel, searchQuery]);

  const filteredTutors = useMemo(() => {
    return tutors.filter((tutor) => {
      const matchesCategory =
        selectedCategory === "All" || tutor.category === selectedCategory;

      const matchesLevel =
        selectedLevel === "ALL" ||
        tutor.level === "BOTH" ||
        (selectedLevel === "AL" && (tutor.level === "AL" || tutor.subjects.some((s) => s.level === "AL"))) ||
        (selectedLevel === "OL" && (tutor.level === "OL" || tutor.subjects.some((s) => s.level === "OL")));

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tutor.name.toLowerCase().includes(q) ||
        tutor.headline.toLowerCase().includes(q) ||
        tutor.bio.toLowerCase().includes(q) ||
        tutor.category.toLowerCase().includes(q) ||
        tutor.subjects.some(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q) ||
            s.levelBadge.toLowerCase().includes(q)
        );

      return matchesCategory && matchesLevel && matchesSearch;
    });
  }, [tutors, selectedCategory, selectedLevel, searchQuery]);

  return (
    <section id="courses" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#0c2461] tracking-tight mb-3">
              London A/L & O/L Subject Individual Classes & Tutors
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Unit-by-unit syllabus coverage, comprehensive tuition walkthroughs, and structured topic individual classes.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search P1-P4, Units 1-6, IGCSE, tutor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-slate-200 focus-visible:ring-blue-500 rounded-xl text-xs"
              />
            </div>
            <Link
              href="/classes"
              className="hidden sm:flex px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-800 text-xs font-bold whitespace-nowrap transition-colors items-center gap-1 shrink-0"
            >
              <span>Full Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Main View Switcher & Level Filter */}
        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 shadow-2xs">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setViewMode("tutors")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "tutors"
                  ? "bg-[#0c2461] text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>O/L & A/L Tutors with Subjects</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  viewMode === "tutors" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {filteredTutors.length}
              </span>
            </button>

            <button
              onClick={() => setViewMode("classes")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "classes"
                  ? "bg-[#0c2461] text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>Individual Classes</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  viewMode === "classes" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {filteredCourses.length}
              </span>
            </button>
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden md:inline">
              Level:
            </span>
            {[
              { id: "ALL", label: "All Qualifications" },
              { id: "AL", label: "London A/L (IAL)" },
              { id: "OL", label: "London O/L (IGCSE)" },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedLevel === lvl.id
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        {/* School / Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#0c2461] text-white shadow-sm shadow-blue-950/25 font-bold"
                  : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-800 border border-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* VIEW 1: O/L & A/L TUTORS WITH SUBJECTS */}
        {viewMode === "tutors" && (
          <>
            {filteredTutors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {filteredTutors.map((tutor) => (
                  <div
                    key={tutor.id}
                    className="group rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Tutor Header Info */}
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <Avatar className="w-16 h-16 rounded-2xl border-2 border-blue-100 shadow-xs">
                            <AvatarImage src={tutor.avatar} alt={tutor.name} className="object-cover" />
                            <AvatarFallback className="text-base font-bold bg-[#0c2461] text-white">
                              {tutor.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                            title="Verified Active Tutor"
                          >
                            <ShieldCheck className="w-3 h-3" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                              {tutor.name}
                            </h3>
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold py-0.5 px-2 rounded-md">
                              Verified
                            </Badge>
                          </div>

                          <p className="text-xs font-semibold text-blue-700 mt-1 line-clamp-2">
                            {tutor.headline}
                          </p>

                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Badge className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold py-0.5">
                              {tutor.levelLabel}
                            </Badge>
                            {tutor.country && (
                              <span className="text-[11px] text-slate-400 font-medium">
                                • {tutor.country}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {parseTutorBio(tutor.bio)}
                        </p>
                      </div>

                      {/* Subjects & Specifications */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                            London O/L & A/L Subjects:
                          </span>
                          <span className="text-[11px] font-bold text-blue-600">
                            {tutor.subjects.length} Units
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {tutor.subjects.map((sub, idx) => (
                            <span
                              key={idx}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-colors ${
                                sub.level === "AL"
                                  ? "bg-blue-50/80 text-blue-900 border-blue-200 hover:bg-blue-100/80"
                                  : "bg-emerald-50/80 text-emerald-900 border-emerald-200 hover:bg-emerald-100/80"
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
                    </div>

                    {/* Footer Action CTAs */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      <button
                        onClick={() => {
                          setSelectedTrialTutorId(tutor.id);
                          setShowTrialModal(true);
                        }}
                        className="flex-1 h-10 px-3.5 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold shadow-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="Book a 30-min free online trial session"
                      >
                        <CalendarCheck className="w-3.5 h-3.5 text-amber-300" />
                        <span>Free 1-on-1 Trial</span>
                      </button>

                      <Link
                        href="/classes"
                        className="h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 inline-flex items-center justify-center gap-1.5 transition-all"
                      >
                        <span>Classes</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-200">
                <p className="text-slate-500 font-semibold mb-2">
                  No tutors found matching your criteria.
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

        {/* VIEW 2: INDIVIDUAL CLASSES */}
        {viewMode === "classes" && (
          <>
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className="group rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <Link
                        href={`/classes/${course.slug}`}
                        prefetch={true}
                        className="block relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-[#0c2461] to-[#1e3799] cursor-pointer group/img"
                      >
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
                          <Badge
                            variant="default"
                            className="bg-white/95 text-[#0c2461] backdrop-blur-md text-[11px] font-bold shadow-xs"
                          >
                            {course.level}
                          </Badge>
                          {course.examBoard && (
                            <Badge
                              variant="sky"
                              className="bg-sky-500 text-white font-bold text-[10px]"
                            >
                              {course.examBoard}
                            </Badge>
                          )}
                        </div>

                        <div className="absolute bottom-3 left-3 flex items-center text-white text-xs">
                          <span className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md font-mono text-[11px]">
                            {course.subjectCode}
                          </span>
                        </div>
                      </Link>

                      <div className="p-5 sm:p-6 space-y-3.5">
                        <Link href={`/classes/${course.slug}`} prefetch={true}>
                          <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
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

                        <div className="flex items-center gap-2.5 pt-1">
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={course.instructor.avatar}
                              alt={course.instructor.name}
                            />
                            <AvatarFallback>
                              {course.instructor.name.charAt(0)}
                            </AvatarFallback>
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
                      </div>
                    </div>

                    <div className="px-5 sm:px-6 pb-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                      {isLoggedIn ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-2xs">
                            <Coins className="w-4 h-4" />
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900">
                              {course.price}
                            </span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Tokens
                            </span>
                          </div>
                        </div>
                      ) : (
                        <Link
                          href="/register"
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
                      )}

                      <Link
                        href={`/classes/${course.slug}`}
                        prefetch={true}
                        className="px-4 py-2 rounded-xl bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <span>View Syllabus</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-200">
                <p className="text-slate-500 font-semibold mb-2">
                  No syllabus units found matching &quot;{searchQuery}&quot;
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

        {/* Free 1-on-1 Trial Modal */}
        <TrialRequestModal
          isOpen={showTrialModal}
          onClose={() => {
            setShowTrialModal(false);
            setSelectedTrialTutorId(undefined);
            setSelectedTrialCourseId(undefined);
          }}
          initialTutorId={selectedTrialTutorId}
          initialCourseId={selectedTrialCourseId}
          allCourses={courses}
        />
      </div>
    </section>
  );
}
