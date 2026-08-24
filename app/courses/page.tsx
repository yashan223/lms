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
  Star,
  Clock,
  BookOpen,
  Users,
  ArrowRight,
  Filter,
  GraduationCap,
  Sparkles,
} from "lucide-react";
export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const categories = [
    "All",
    "School of Mathematics & Computing",
    "School of Computing & Engineering",
    "School of Science & O/L Academy",
    "School of Economics & Commerce",
  ];

  // Fetch live courses from server
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

  // Real-time updates when courses change
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
          {/* Search & Filter Controls */}
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

          {/* Category Pills */}
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

          {/* Course Grid */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="group rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail Banner */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <Badge className="bg-white/95 text-[#0c2461] backdrop-blur-md text-[11px] font-bold shadow-xs">
                          {course.level}
                        </Badge>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                        <span className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md font-mono text-[11px]">
                          {course.subjectCode}
                        </span>
                        <span className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md font-semibold text-amber-300">
                          <Star className="w-3 h-3 fill-amber-300" />
                          {course.rating} ({course.reviewCount})
                        </span>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-5 space-y-3">
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {course.subtitle}
                      </p>

                      {/* Course metadata */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 py-1 border-y border-slate-100">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          {course.durationHours} hrs
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          {course.lessonsCount} lessons
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          {course.studentsEnrolled.toLocaleString()} scholars
                        </span>
                      </div>

                      {/* Examiner Info */}
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

                  {/* Footer Pricing & Enroll Action */}
                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">
                        £{course.price}
                      </span>
                    </div>

                    <Link
                      href={`/courses/${course.slug}`}
                      className="px-4 py-2 rounded-xl bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <span>Study Materials & Syllabus</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
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

      <Footer />
    </div>
  );
}
