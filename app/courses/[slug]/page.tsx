"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Clock,
  BookOpen,
  Users,
  Star,
  CheckCircle2,
  PlayCircle,
  FileText,
  Download,
  ArrowRight,
  ShieldCheck,
  Award,
  ChevronDown,
  ChevronRight,
  Lock,
} from "lucide-react";

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModuleIdx, setActiveModuleIdx] = useState<number | null>(0);

  useEffect(() => {
    async function loadCourse() {
      try {
        setLoading(true);
        const res = await fetch(`/api/courses/${slug}`);
        if (res.ok) {
          const data = await res.json();
          if (data.course) {
            setCourse({
              ...data.course,
              instructor: {
                name: data.course.instructor?.name || "Dr. Sarah Jenkins",
                avatar: data.course.instructor?.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
                roleTitle: data.course.instructor?.headline || "Senior Faculty Lecturer",
                bio: data.course.instructor?.bio || "Subject Chair with 18+ years teaching London A/L curriculum.",
              },
            });
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load course details from DB:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [slug]);

  if (!course && !loading) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-white">
        <Navbar />
        <div className="text-center py-24 space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">Course Not Found</h2>
          <p className="text-xs text-slate-500">The requested syllabus unit is not currently published in the database.</p>
          <Link href="/courses" className="inline-block px-4 py-2 rounded-xl bg-[#0c2461] text-white text-xs font-bold shadow-xs">
            Return to Course Directory
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const courseModules = course?.modules || [];

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar />

      <main className="flex-1 bg-slate-50 border-b border-slate-200">
        {/* Top Hero Banner */}
        <section className="bg-[#0a1e3f] text-white py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs">
                  {course?.subjectCode || "Pearson Edexcel Specification"}
                </Badge>
                <Badge className="bg-white/10 text-white text-xs">
                  {course?.level || "London A/L"}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tight text-white leading-tight">
                {course?.title}
              </h1>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                {course?.subtitle || course?.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <strong>4.98</strong> (1,840 ratings)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-sky-400" />
                  8,200 scholars enrolled
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-sky-400" />
                  64 hours on-demand video
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Avatar className="w-10 h-10 ring-2 ring-white/20">
                  <AvatarImage src={course?.instructor?.avatar} alt={course?.instructor?.name} />
                  <AvatarFallback>{course?.instructor?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xs font-bold text-white">{course?.instructor?.name}</div>
                  <div className="text-[11px] text-sky-300">{course?.instructor?.roleTitle}</div>
                </div>
              </div>
            </div>

            {/* Right Enrollment Card */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 text-slate-900 border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-slate-900">£{course?.price || 95}</span>
                <span className="text-xs text-slate-400 line-through">£160.00</span>
              </div>

              <Link
                href="/login"
                className="w-full py-3 rounded-xl bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <span>Enroll in Course Unit</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="font-bold text-slate-800">This course includes:</div>
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-blue-600" />
                  <span>Full topic lecture & problem walkthroughs</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Comprehensive theory & solution guides</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>Verifiable Academic Certificate of Mastery</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Course Syllabus Accordion */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Course Syllabus & Curriculum Modules</h2>
              <p className="text-xs text-slate-500 mt-1">
                {courseModules.length} Modules • Complete unit specification coverage
              </p>
            </div>

            <div className="space-y-3">
              {courseModules.map((module: any, idx: number) => {
                const isOpen = activeModuleIdx === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50"
                  >
                    <button
                      onClick={() => setActiveModuleIdx(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between font-bold text-xs sm:text-sm text-slate-900 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {isOpen ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        <span>{module.title}</span>
                      </div>
                      <span className="text-xs text-slate-500 font-semibold">
                        {module.lessons?.length || 2} Lessons
                      </span>
                    </button>

                    {isOpen && (
                      <div className="p-4 space-y-2.5 bg-slate-50 border-t border-slate-100 text-xs">
                        {module.lessons?.map((lesson: any, lIdx: number) => (
                          <div
                            key={lIdx}
                            className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              {lesson.isFreePreview ? (
                                <PlayCircle className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span className="font-semibold text-slate-800">{lesson.title}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                              <span>{lesson.durationMin || 30} mins</span>
                              {lesson.isFreePreview && (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                  Free Preview
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
