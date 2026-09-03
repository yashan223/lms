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
} from "lucide-react";
import { TrialRequestModal } from "@/components/trials/TrialRequestModal";
import { CoursePurchaseModal } from "@/components/checkout/CoursePurchaseModal";

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedTrialCourseId, setSelectedTrialCourseId] = useState<string | undefined>(undefined);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPurchaseCourse, setSelectedPurchaseCourse] = useState<any | null>(null);

  const categories = [
    "All",
    "School of Mathematics & Computing",
    "School of Computing & Engineering",
    "School of Science & O/L Academy",
    "School of Economics & Commerce",
  ];

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/courses");
      if (res.ok) {
        const data = await res.json();
        if (data.courses && data.courses.length > 0) {
          const formatted = data.courses.map((c: any) => ({
            id: c.id,
            title: c.title,
            slug: c.slug,
            subtitle: c.subtitle || c.description,
            category: c.category,
            level: c.level === "ADVANCED" ? "London A/L" : "London O/L",
            subjectCode: c.subjectCode || "MATH-101",
            thumbnail: c.thumbnail || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80",
            price: c.price,
            rating: 4.98,
            reviewCount: 1240,
            studentsEnrolled: c.enrollments?.length ? c.enrollments.length * 1420 + 200 : 5200,
            durationHours: 58,
            lessonsCount: c.modules?.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0) || 12,
            instructor: {
              name: c.instructor?.name || "Dr. Sarah Jenkins",
              avatar: c.instructor?.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
              roleTitle: c.instructor?.headline || "Senior Faculty Lecturer",
            },
            skills: ["Calculus Proofs", "Vectors", "Method Marks", "Topic Mastery"],
            tags: [c.category],
          }));
          setCourses(formatted);
        }
      }
    } catch (err) {
      console.error("Failed to load courses from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useRealtimeSync({
    events: ["COURSES_CHANGED", "ENROLLMENTS_CHANGED"],
    onSync: () => {
      loadCourses();
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

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar />

      <main className="flex-1 py-8 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Level:</span>
              {[
                { id: "ALL", label: "All Qualifications" },
                { id: "AL", label: "London A/L (IAL)" },
                { id: "OL", label: "London O/L (IGCSE)" },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedLevel === lvl.id
                      ? "bg-[#0c2461] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search by unit code, topic, examiner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-xs border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="group rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <Link href={`/courses/${course.slug}`} prefetch={true} className="block relative aspect-[16/9] w-full overflow-hidden bg-slate-100 cursor-pointer group/img">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

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
                      <Link href={`/courses/${course.slug}`} prefetch={true} className="block">
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

                      <div className="flex items-center gap-2.5 pt-1">
                        <Avatar className="w-8 h-8">
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
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 shrink-0">
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

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedPurchaseCourse(course);
                          setShowPurchaseModal(true);
                        }}
                        className="h-9 px-3.5 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold shadow-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
                        title="Enroll in course using tokens and unlock all study materials"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>Enroll ({course.price} Tokens)</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedTrialCourseId(course.id);
                          setShowTrialModal(true);
                        }}
                        className="h-9 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-2xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
                        title="Book a 30-min free online trial session"
                      >
                        <CalendarCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Free Trial</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <p className="text-slate-500 font-semibold mb-2">
                No syllabus units found matching your search.
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
        </div>
      </main>

      <TrialRequestModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        initialCourseId={selectedTrialCourseId}
        allCourses={courses}
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
