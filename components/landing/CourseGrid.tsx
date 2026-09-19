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
} from "lucide-react";

export function CourseGrid() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

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
              studentsEnrolled: c.enrollments?.length ? c.enrollments.length * 1420 + 200 : 4800,
              durationHours: 58,
              lessonsCount: c.modules?.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0) || 12,
              instructor: {
                name: c.instructor?.name || "Dr. Sarah Jenkins",
                avatar: c.instructor?.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
                roleTitle: c.instructor?.headline || "Senior Tutor",
              },
              skills: ["Unit Proofs", "Calculus & Analysis", "Topic Mastery", "Interactive Labs"],
              tags: [c.category],
            }));
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
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.subjectCode && course.subjectCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (course.tags && course.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesCategory && matchesSearch;
    });
  }, [courses, selectedCategory, searchQuery]);

  return (
    <section id="courses" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#0c2461] tracking-tight mb-3">
              London A/L & O/L Subject Individual Classes
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
                placeholder="Search P1-P4, Units 1-6, IGCSE..."
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

        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat
                  ? "bg-[#0c2461] text-white shadow-sm shadow-blue-950/25 font-bold"
                  : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-800 border border-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="group rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <Link href={`/classes/${course.slug}`} prefetch={true} className="block relative aspect-[16/9] w-full overflow-hidden bg-slate-100 cursor-pointer group/img">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

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
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
