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
  Award,
  Star,
  Atom,
} from "lucide-react";
import {
  FacultyTutor,
  formatDbTutors,
  parseTutorBio,
  isTutorQualifiedForLevel,
} from "@/lib/faculty-tutors";
import { TrialRequestModal } from "@/components/trials/TrialRequestModal";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { getStudentAcademicLevel, isCourseOL, isCourseAL } from "@/lib/currency";
import { ScrollReveal } from "@/components/landing/ScrollEffects";

function getTutorPhoto(tutor: FacultyTutor): string {
  if (tutor.avatar && (tutor.avatar.startsWith("http") || tutor.avatar.startsWith("/"))) {
    return tutor.avatar;
  }
  const nameLower = (tutor.name || "").toLowerCase();
  if (nameLower.includes("yashan")) {
    return "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80";
  }
  if (nameLower.includes("enigma") || nameLower.includes("science")) {
    return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80";
}

interface CourseGridProps {
  initialAcademicLevel?: "OL" | "AL" | null;
}

export function CourseGrid({ initialAcademicLevel }: CourseGridProps = {}) {
  const [courses, setCourses] = useState<any[]>([]);
  const [tutors, setTutors] = useState<FacultyTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"all" | "tutors" | "classes">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>(initialAcademicLevel || "ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(initialAcademicLevel));
  const [userAcademicLevel, setUserAcademicLevel] = useState<"OL" | "AL" | null>(
    initialAcademicLevel || null
  );
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedTrialTutorId, setSelectedTrialTutorId] = useState<string | undefined>(undefined);
  const [selectedTrialCourseId, setSelectedTrialCourseId] = useState<string | undefined>(undefined);

  const [subjectsList, setSubjectsList] = useState<string[]>([
    "Mathematics & Computing",
    "Physics & Engineering",
    "Chemistry & Biology",
    "Economics & Business Studies",
  ]);

  const categories = useMemo(() => ["All", ...subjectsList], [subjectsList]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const noCacheOptions = { cache: "no-store" as RequestCache, headers: { "Cache-Control": "no-cache" } };
      const [res, dashRes, subjectsRes] = await Promise.all([
        fetch("/api/courses", noCacheOptions),
        fetch("/api/dashboard", noCacheOptions).catch(() => null),
        fetch("/api/subjects", noCacheOptions).catch(() => null),
      ]);
      if (subjectsRes && subjectsRes.ok) {
        const sData = await subjectsRes.json();
        if (sData.names && Array.isArray(sData.names) && sData.names.length > 0) {
          setSubjectsList(sData.names);
        }
      }
        if (dashRes && dashRes.ok) {
          const dashData = await dashRes.json();
          if (dashData.user) {
            setIsLoggedIn(true);
            setCurrentUser(dashData.user);
            if (dashData.user.role === "STUDENT") {
              const lvl = getStudentAcademicLevel(dashData.user);
              setUserAcademicLevel(lvl);
              setSelectedLevel(lvl || "ALL");
            } else {
              setUserAcademicLevel(null);
              setSelectedLevel("ALL");
            }
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
                level: isCourseOL(c) ? "Cambridge/Edexcel IGCSE & OL" : "Cambridge/Edexcel AS & A2",
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
                  name: c.instructor?.name || "Tutor",
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
  };

  useEffect(() => {
    loadCourses();

    const handleSwitchTab = (e: Event) => {
      const customEvent = e as CustomEvent<"all" | "tutors" | "classes">;
      if (customEvent.detail) {
        setViewMode(customEvent.detail);
      }
    };

    const handleSearchEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ query?: string; level?: string; mode?: "all" | "tutors" | "classes" }>;
      if (customEvent.detail) {
        if (typeof customEvent.detail.query === "string") {
          setSearchQuery(customEvent.detail.query);
        }
        if (customEvent.detail.level) {
          setSelectedLevel(customEvent.detail.level);
        }
        if (customEvent.detail.mode) {
          setViewMode(customEvent.detail.mode);
        }
      }
    };

    window.addEventListener("edupulse:switch-tab", handleSwitchTab);
    window.addEventListener("edupulse:search", handleSearchEvent);
    return () => {
      window.removeEventListener("edupulse:switch-tab", handleSwitchTab);
      window.removeEventListener("edupulse:search", handleSearchEvent);
    };
  }, []);

  useRealtimeSync({
    events: ["COURSES_CHANGED"],
    onSync: () => {
      loadCourses();
    },
  });

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const effectiveLevel = selectedLevel;
      const matchesCategory =
        selectedCategory === "All" ||
        (course.category &&
          course.category.toUpperCase() === selectedCategory.toUpperCase());
      const matchesLevel =
        effectiveLevel === "ALL" ||
        (effectiveLevel === "AL" && isCourseAL(course)) ||
        (effectiveLevel === "OL" && isCourseOL(course));
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
      const effectiveLevel = selectedLevel;
      const matchesCategory =
        selectedCategory === "All" ||
        (tutor.category &&
          tutor.category.toUpperCase() === selectedCategory.toUpperCase()) ||
        (selectedCategory.toUpperCase() === "ICT" &&
          (tutor.headline?.toUpperCase().includes("IT") ||
            tutor.name?.toLowerCase().includes("yashan"))) ||
        (selectedCategory.toUpperCase() === "BIOLOGY" &&
          (tutor.headline?.toUpperCase().includes("SCIENCE") ||
            tutor.headline?.toUpperCase().includes("ACADEMICS") ||
            tutor.name?.toLowerCase().includes("enigma")));

      const matchesLevel =
        effectiveLevel === "ALL" ||
        isTutorQualifiedForLevel(tutor, effectiveLevel);

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

  const isCurrentTutor = currentUser?.role === "TUTOR" || currentUser?.role === "INSTRUCTOR";

  const currentTutorCard = useMemo(() => {
    if (!isCurrentTutor || !currentUser) return null;
    return (
      tutors.find(
        (t) =>
          t.id === currentUser.id ||
          (currentUser.tutorId && t.tutorId === currentUser.tutorId) ||
          (currentUser.email && (t as any).email === currentUser.email) ||
          t.name?.toLowerCase() === currentUser.name?.toLowerCase()
      ) || ({
        id: currentUser.id,
        tutorId: currentUser.tutorId || null,
        name: currentUser.name || "Academic Tutor",
        avatar: currentUser.avatar || "",
        headline: currentUser.headline || "Verified Academic Tutor",
        bio: currentUser.bio || "",
        category: "All",
        level: "BOTH" as const,
        levelLabel: "Cambridge/Edexcel Specialist",
        rating: 5.0,
        reviewCount: 0,
        country: currentUser.country || "Sri Lanka",
        classesCount:
          courses.filter(
            (c) => c.instructor?.id === currentUser.id || c.tutorId === currentUser.id
          ).length || 1,
        subjects: [],
      } as FacultyTutor)
    );
  }, [isCurrentTutor, currentUser, tutors, courses]);

  const displayCourses = useMemo(() => {
    if (isCurrentTutor && currentUser?.id) {
      // Prioritize and always include current tutor's own classes even if qualification filter is selected
      const myCourses = courses.filter(
        (c) => c.instructor?.id === currentUser.id || c.tutorId === currentUser.id
      );
      const otherCourses = filteredCourses.filter(
        (c) => c.instructor?.id !== currentUser.id && c.tutorId !== currentUser.id
      );
      return [...myCourses, ...otherCourses];
    }
    return filteredCourses;
  }, [isCurrentTutor, currentUser, courses, filteredCourses]);

  const renderTutorCard = (tutor: FacultyTutor, idx: number) => (
    <ScrollReveal key={`tutor-${tutor.id}`} animation="fade-up" delay={idx * 60} className="h-full">
      <div className="h-full bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 transition-all duration-300 flex flex-col justify-between group">
        <div>
          {/* Photo & Badges */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/4.2] mb-4 bg-slate-100">
            <img
              src={getTutorPhoto(tutor)}
              alt={tutor.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {tutor.country && (
              <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-[#0c2461] backdrop-blur-md shadow-xs">
                {tutor.country}
              </span>
            )}
          </div>

          {/* Name & Role */}
          <h3 className="text-lg font-bold font-heading text-[#0c2461] group-hover:text-blue-600 transition-colors mb-1 truncate">
            {tutor.name}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-1 mb-4">
            {tutor.headline || tutor.levelLabel}
          </p>

          {/* 3-Column Stats Bar */}
          <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center mb-4">
            <div>
              <div className="text-xs font-bold text-[#0c2461]">
                {tutor.classesCount || tutor.subjects?.length || 1}+
              </div>
              <div className="text-[10px] text-slate-500">Classes</div>
            </div>
            <div className="border-x border-slate-100">
              <div className="text-xs font-bold text-[#0c2461] truncate px-0.5">
                {tutor.level === "OL" ? "IGCSE & OL" : tutor.level === "AL" ? "AS & A2" : "O/L & A/L"}
              </div>
              <div className="text-[10px] text-slate-500">Track</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-[#0c2461]">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{tutor.rating || 4.9}</span>
              </div>
              <div className="text-[10px] text-slate-500">Rating</div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {currentUser?.id === tutor.id ? (
          <Link
            href="/tutor/profile"
            className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 group/btn cursor-pointer"
          >
            <span>Your Tutor Profile</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        ) : (
          <button
            onClick={() => {
              setSelectedTrialTutorId(tutor.id);
              setShowTrialModal(true);
            }}
            className="w-full py-2.5 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 group/btn cursor-pointer"
          >
            <span>Book Free Trial</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover/btn:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </ScrollReveal>
  );

  const renderCourseCard = (course: any, idx: number) => (
    <ScrollReveal key={`course-${course.id}`} animation="fade-up" delay={idx * 60} className="h-full">
      <div className="h-full bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 transition-all duration-300 flex flex-col justify-between group">
        <div>
          {/* Photo & Badges */}
          <Link
            href={`/classes/${course.slug}`}
            className="block relative rounded-2xl overflow-hidden aspect-[4/4.2] mb-4 bg-gradient-to-br from-[#0c2461] to-[#1e3799]"
          >
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center group-hover:scale-105 transition-transform duration-500">
                <BookOpen className="w-10 h-10 text-white/40 mb-2" />
                <span className="text-white/80 font-bold text-xs uppercase tracking-wider">{course.category}</span>
              </div>
            )}
            {course.examBoard && (
              <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-[#0c2461] backdrop-blur-md shadow-xs">
                {course.examBoard}
              </span>
            )}
          </Link>

          {/* Name & Role */}
          <Link href={`/classes/${course.slug}`}>
            <h3 className="text-lg font-bold font-heading text-[#0c2461] group-hover:text-blue-600 transition-colors mb-1 truncate">
              {course.title}
            </h3>
          </Link>
          <p className="text-xs text-slate-500 line-clamp-1 mb-4">
            {course.instructor?.name || "Expert Faculty"} • {course.category}
          </p>

          {/* 3-Column Stats Bar */}
          <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center mb-4">
            <div>
              <div className="text-xs font-bold text-[#0c2461]">
                {course.lessonsCount || 10}
              </div>
              <div className="text-[10px] text-slate-500">Lessons</div>
            </div>
            <div className="border-x border-slate-100">
              <div className="text-xs font-bold text-[#0c2461] truncate px-0.5">
                {course.durationHours || 12}h
              </div>
              <div className="text-[10px] text-slate-500">Duration</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-[#0c2461]">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>4.9</span>
              </div>
              <div className="text-[10px] text-slate-500">Rating</div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Link
          href={
            currentUser?.id === course.instructor?.id || currentUser?.id === course.tutorId
              ? `/tutor/courses/${course.id}/edit`
              : `/classes/${course.slug}`
          }
          className="w-full py-2.5 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 group/btn cursor-pointer"
        >
          <span>
            {currentUser?.id === course.instructor?.id || currentUser?.id === course.tutorId
              ? "Manage Your Class"
              : "View Class & Enroll"}
          </span>
          <ArrowRight className="w-3.5 h-3.5 transform group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </ScrollReveal>
  );

  return (
    <section id="courses" className="py-20 lg:py-24 bg-[#f8f8f8] border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <ScrollReveal animation="fade-up" duration={700}>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black font-heading text-[#0c2461] tracking-tight leading-tight">
                Explore Classes.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Unit-by-unit syllabus coverage, comprehensive tuition walkthroughs, and structured topic individual classes.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/classes"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-600 text-[#0c2461] hover:text-blue-600 text-xs font-bold whitespace-nowrap transition-all shadow-xs"
              >
                <span>Full Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* Qualification Level Filter Tabs (Cambridge/Edexcel AS & A2 and IGCSE & OL) */}
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200/90 flex flex-wrap items-center justify-start gap-2 mb-8 shadow-xs">
          {[
            { id: "ALL", label: "All Qualifications" },
            { id: "AL", label: "Cambridge/Edexcel AS and A2" },
            { id: "OL", label: "Cambridge/Edexcel IGCSE and OL" },
          ].map((lvl) => {
            const isSelected = selectedLevel === lvl.id;

            // Calculate matching count of courses for each level
            const count = courses.filter((c) =>
              lvl.id === "ALL"
                ? true
                : lvl.id === "AL"
                ? isCourseAL(c)
                : isCourseOL(c)
            ).length;

            return (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 text-[#0c2461] hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <span>{lvl.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-white text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Classes Grid */}
        {displayCourses.length > 0 || currentTutorCard ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {currentTutorCard && renderTutorCard(currentTutorCard, 0)}
            {displayCourses.map((course, idx) =>
              renderCourseCard(course, idx + (currentTutorCard ? 1 : 0))
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
            <p className="text-slate-500 font-semibold mb-2">
              No classes found matching your criteria.
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
          currentUser={currentUser}
        />
      </div>
    </section>
  );
}
