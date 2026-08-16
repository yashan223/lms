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
  Sparkles,
  Check,
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
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [selectedLessonForNotes, setSelectedLessonForNotes] = useState<any>(null);

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
                bio: data.course.instructor?.bio || "Subject Chair with 18+ years teaching London A/L & O/L curriculum.",
              },
            });
            // check if enrolled
            if (data.course.enrollments && data.course.enrollments.length > 0) {
              setIsEnrolled(true);
            }
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

  const handleEnroll = async () => {
    try {
      setEnrollLoading(true);
      const res = await fetch(`/api/courses/${slug}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setIsEnrolled(true);
      } else {
        alert(data.error || "Enrollment failed. Please sign in.");
      }
    } catch (err) {
      console.error("Error enrolling in course:", err);
      alert("Unable to complete enrollment at this time.");
    } finally {
      setEnrollLoading(false);
    }
  };

  if (!course && !loading) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-white">
        <Navbar />
        <div className="text-center py-24 space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">Course Not Found</h2>
          <p className="text-xs text-slate-500">The requested syllabus unit is not currently published in the database.</p>
          <Link href="/courses" className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs">
            Return to Course Directory
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const courseModules = course?.modules || [];
  const totalLessons = courseModules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar />

      <main className="flex-1 bg-slate-50 border-b border-slate-200">
        {/* Top Hero Banner */}
        <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-blue-900/40">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs">
                  {course?.subjectCode || "London Academic Specification"}
                </Badge>
                <Badge className="bg-white/10 text-white text-xs">
                  {course?.level || "London A/L"}
                </Badge>
                {isEnrolled && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" /> Enrolled in Course
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                {course?.title}
              </h1>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                {course?.subtitle || course?.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <strong>4.98</strong> (1,840 reviews)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-blue-400" />
                  8,200 scholars enrolled
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  {totalLessons} Study Lessons
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Avatar className="w-10 h-10 ring-2 ring-blue-400/30">
                  <AvatarImage src={course?.instructor?.avatar} alt={course?.instructor?.name} />
                  <AvatarFallback>{course?.instructor?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xs font-bold text-white">{course?.instructor?.name}</div>
                  <div className="text-[11px] text-blue-300">{course?.instructor?.roleTitle}</div>
                </div>
              </div>
            </div>

            {/* Right Enrollment Card */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 text-slate-900 border border-slate-200 shadow-xl space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-slate-900">£{course?.price || 95}</span>
                  <span className="text-xs text-slate-400 ml-2">Standard Tuition</span>
                </div>
                <span className="text-xs text-slate-400 line-through">£160.00</span>
              </div>

              {isEnrolled ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>You are active in this course!</span>
                  </div>
                  <Link
                    href="/dashboard"
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span>Go to My Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <Button
                  onClick={handleEnroll}
                  disabled={enrollLoading}
                  className="w-full py-3.5 h-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <span>{enrollLoading ? "Enrolling..." : "Enroll in Syllabus Masterclass"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              <div className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="font-bold text-slate-800">This course includes:</div>
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-blue-600" />
                  <span>Comprehensive topic breakdowns & proofs</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Downloadable unit summary notes & formula sheets</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>Official Academic Certificate of Mastery</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Course Syllabus & Study Notes Hub */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 8 Cols: Syllabus Accordion & Lesson Details */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Course Syllabus & Curriculum Modules</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {courseModules.length} Modules • {totalLessons} Lessons • Complete Specification Coverage
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
                          className="w-full p-4 text-left flex items-center justify-between font-bold text-xs sm:text-sm text-slate-900 bg-white hover:bg-blue-50/30 transition-colors"
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
                                onClick={() => setSelectedLessonForNotes(lesson)}
                                className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-blue-300 flex items-center justify-between transition-all cursor-pointer group"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    {lIdx + 1}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-800 block group-hover:text-blue-600 transition-colors">{lesson.title}</span>
                                    <span className="text-[11px] text-slate-400">Click to view study overview & key formulas</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                  <span>{lesson.durationMin || 35} mins</span>
                                  {lesson.isFreePreview && (
                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                      Open Access
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

              {/* Lesson Study Notes Modal / Popover */}
              {selectedLessonForNotes && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{selectedLessonForNotes.title}</h3>
                        <p className="text-[11px] text-slate-500">Duration: {selectedLessonForNotes.durationMin} minutes • London Curriculum Masterclass</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedLessonForNotes(null)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                    <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                      <div className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Core Learning Objectives</span>
                      </div>
                      <p className="text-slate-600">
                        Detailed theoretical breakdown of step-by-step mathematical proofs, conceptual derivations, and common marks distribution criteria.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-800">Downloadable Handouts & Solution Notes</div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href="#download"
                          onClick={(e) => {
                            e.preventDefault();
                            alert("Study handbook downloaded successfully!");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          <span>Unit Study Notes (PDF)</span>
                        </a>
                        <a
                          href="#download"
                          onClick={(e) => {
                            e.preventDefault();
                            alert("Formula sheet downloaded successfully!");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          <span>Formula & Proof Sheet (PDF)</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right 4 Cols: Faculty & Course Requirements */}
            <div className="lg:col-span-4 space-y-6">
              {/* Faculty Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Lead Academic Faculty</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 ring-2 ring-blue-500/20">
                    <AvatarImage src={course?.instructor?.avatar} alt={course?.instructor?.name} />
                    <AvatarFallback>{course?.instructor?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{course?.instructor?.name}</div>
                    <div className="text-xs text-blue-600 font-semibold">{course?.instructor?.roleTitle}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {course?.instructor?.bio}
                </p>
              </div>

              {/* Course Features */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-3 text-xs">
                <h3 className="font-bold text-sm text-slate-900">Curriculum Standards</h3>
                <div className="flex items-center gap-2 text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% Mapped to London A/L & O/L Specifications</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Continuous Academic Term Updates</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified Distinction Credentials</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
