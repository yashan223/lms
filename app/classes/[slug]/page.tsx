"use client";

import React, { useState, useEffect, use, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  Clock,
  BookOpen,
  Users,
  CheckCircle2,
  FileText,
  Download,
  ArrowRight,
  ShieldCheck,
  Award,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Lock,
  CalendarCheck,
  Check,
  FolderOpen,
  Upload,
  Search,
  ExternalLink,
  Trash2,
  FileCheck2,
  Layers,
  AlertCircle,
  Loader2,
  Calculator,
  FlaskConical,
  FileCode,
  Coins,
  Sparkles,
  GraduationCap,
  Info,
  X,
  Compass,
  CheckCircle,
} from "lucide-react";
import { TrialRequestModal } from "@/components/trials/TrialRequestModal";
import { CoursePurchaseModal } from "@/components/checkout/CoursePurchaseModal";
import { parseTutorBio } from "@/lib/utils";

interface CourseMaterial {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileSize: string;
  fileType: string;
  category: "HANDOUT" | "FORMULA_SHEET" | "MOCK_PAPER" | "LAB_GUIDE" | "SLIDES" | string;
  createdAt: string;
}

interface Lesson {
  id: string;
  title: string;
  description?: string | null;
  durationMin: number;
  position: number;
  isFreePreview: boolean;
}

interface Module {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const getCachedCourse = () => {
    if (typeof window !== "undefined" && (window as any).__EDU_COURSE_CACHE) {
      return (
        (window as any).__EDU_COURSE_CACHE[slug] ||
        (window as any).__EDU_COURSE_CACHE[decodeURIComponent(slug)] ||
        null
      );
    }
    return null;
  };

  const initialCached = getCachedCourse();
  const [course, setCourse] = useState<any>(initialCached);
  const [loading, setLoading] = useState(!initialCached);
  const [activeTab, setActiveTab] = useState<"materials" | "curriculum" | "overview">("materials");
  const [activeModuleIdx, setActiveModuleIdx] = useState<number | null>(0);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(
    initialCached?.modules?.[0]?.lessons?.[0] || null
  );
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentLevel, setStudentLevel] = useState<"OL" | "AL">("AL");
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const isOL = studentLevel === "OL";
  const effectivePrice =
    isOL && course?.olPrice !== null && course?.olPrice !== undefined && Number(course.olPrice) >= 0
      ? Number(course.olPrice)
      : course?.price !== null && course?.price !== undefined && !isNaN(Number(course.price))
      ? Number(course.price)
      : 0;

  const [isStaff, setIsStaff] = useState(false);
  useEffect(() => {
    const role = document.cookie
      .split("; ")
      .find((r) => r.startsWith("edupulse_user_role="))
      ?.split("=")[1];
    setIsStaff(role === "ADMIN" || role === "TUTOR" || role === "INSTRUCTOR");
  }, []);

  const [materialCategory, setMaterialCategory] = useState<string>("ALL");
  const [materialSearch, setMaterialSearch] = useState<string>("");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState("");
  const [newMaterialCategory, setNewMaterialCategory] = useState("HANDOUT");
  const [newMaterialDesc, setNewMaterialDesc] = useState("");
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load completed topics from localStorage
  const storageKey = `edupulse_completed_topics_${slug}`;
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setCompletedLessonIds(JSON.parse(saved));
        }
      } catch {}
    }
  }, [storageKey]);

  const loadCourse = async (silent = false) => {
    try {
      if (!course && !silent) {
        setLoading(true);
      }
      const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.course) {
          const formatted = {
            ...data.course,
            instructor: {
              name: data.course.instructor?.name || "Faculty Tutor",
              avatar: data.course.instructor?.avatar || "",
              roleTitle: data.course.instructor?.headline || "Academic Tutor",
              bio: data.course.instructor?.bio || "",
            },
          };

          if (typeof window !== "undefined") {
            (window as any).__EDU_COURSE_CACHE = (window as any).__EDU_COURSE_CACHE || {};
            (window as any).__EDU_COURSE_CACHE[slug] = formatted;
            if (data.course.slug) (window as any).__EDU_COURSE_CACHE[data.course.slug] = formatted;
            if (data.course.id) (window as any).__EDU_COURSE_CACHE[data.course.id] = formatted;
          }

          setCourse(formatted);

          if (typeof data.isLoggedIn === "boolean") {
            setIsLoggedIn(data.isLoggedIn);
          }

          if (data.academicLevel) {
            setStudentLevel(data.academicLevel);
          }

          if (typeof data.isEnrolled === "boolean") {
            setIsEnrolled(data.isEnrolled);
          } else {
            setIsEnrolled(false);
          }

          if (data.course.modules?.[0]?.lessons?.[0]) {
            setSelectedLesson((prev) => prev || data.course.modules[0].lessons[0]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load course details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = getCachedCourse();
    if (cached) {
      setCourse(cached);
      setLoading(false);
      loadCourse(true);
    } else {
      loadCourse(false);
    }
  }, [slug]);

  useRealtimeSync({
    events: ["MATERIALS_CHANGED", "COURSES_CHANGED", "ENROLLMENTS_CHANGED"],
    onSync: () => {
      loadCourse(true);
    },
  });

  const toggleLessonCompletion = (lessonId: string) => {
    setCompletedLessonIds((prev) => {
      const updated = prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadFile || !newMaterialTitle.trim()) {
      setUploadStatusMsg({ type: "error", text: "Please select a file and provide a title." });
      return;
    }

    try {
      setUploadingMaterial(true);
      setUploadStatusMsg(null);

      const formData = new FormData();
      formData.append("file", selectedUploadFile);
      formData.append("isPrivate", "false");
      formData.append("category", "document");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setUploadStatusMsg({ type: "error", text: uploadData.error || "File upload failed" });
        return;
      }

      const materialRes = await fetch(`/api/courses/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_material",
          title: newMaterialTitle.trim(),
          description: newMaterialDesc.trim() || null,
          fileUrl: uploadData.fileUrl || uploadData.file?.fileUrl,
          fileSize: uploadData.fileSize || uploadData.file?.fileSize || "1.0 MB",
          fileType: uploadData.fileType || uploadData.mimeType || uploadData.file?.fileType || "application/pdf",
          category: newMaterialCategory,
        }),
      });

      if (materialRes.ok) {
        setUploadStatusMsg({ type: "success", text: "Study material published successfully!" });
        setNewMaterialTitle("");
        setNewMaterialDesc("");
        setSelectedUploadFile(null);
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadStatusMsg(null);
        }, 1200);
        await loadCourse();
      } else {
        const err = await materialRes.json();
        setUploadStatusMsg({ type: "error", text: err.error || "Could not save material record." });
      }
    } catch (err) {
      console.error("Material upload error:", err);
      setUploadStatusMsg({ type: "error", text: "Connection error during upload." });
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Are you sure you want to remove this study material?")) return;
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_material",
          materialId,
        }),
      });
      if (res.ok) {
        await loadCourse();
      }
    } catch (err) {
      console.error("Error deleting material:", err);
    }
  };

  const courseModules: Module[] = useMemo(() => course?.modules || [], [course?.modules]);
  const allLessons: Lesson[] = useMemo(
    () => courseModules.flatMap((m) => m.lessons || []),
    [courseModules]
  );
  const totalLessons = allLessons.length;
  const completedCount = completedLessonIds.filter((id) =>
    allLessons.some((l) => l.id === id)
  ).length;
  const progressPercentage =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const materialsList: CourseMaterial[] = useMemo(() => course?.materials || [], [course?.materials]);

  const filteredMaterials = useMemo(() => {
    return materialsList.filter((mat) => {
      const matchesCategory = materialCategory === "ALL" || mat.category === materialCategory;
      const matchesSearch =
        mat.title.toLowerCase().includes(materialSearch.toLowerCase()) ||
        (mat.description && mat.description.toLowerCase().includes(materialSearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [materialsList, materialCategory, materialSearch]);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "FORMULA_SHEET":
        return (
          <Badge className="bg-sky-50 text-sky-700 border-sky-200/80 text-[10px] font-semibold gap-1">
            <Calculator className="w-3 h-3" />
            Formula Sheet
          </Badge>
        );
      case "MOCK_PAPER":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 text-[10px] font-semibold gap-1">
            <FileCode className="w-3 h-3" />
            Worked Solutions
          </Badge>
        );
      case "LAB_GUIDE":
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200/80 text-[10px] font-semibold gap-1">
            <FlaskConical className="w-3 h-3" />
            Practical Lab Guide
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200/80 text-[10px] font-semibold gap-1">
            <FileText className="w-3 h-3" />
            Study Handbook
          </Badge>
        );
    }
  };

  // Find next and previous lessons for navigation
  const currentLessonIndex = selectedLesson
    ? allLessons.findIndex((l) => l.id === selectedLesson.id)
    : -1;
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1
      ? allLessons[currentLessonIndex + 1]
      : null;

  if (!course && !loading) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-50">
        <Navbar />
        <div className="max-w-md mx-auto text-center py-28 px-4 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Class Syllabus Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            The requested syllabus specification may have been moved or is currently being updated by faculty.
          </p>
          <div className="pt-2">
            <Link
              href="/classes"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold shadow-sm transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>Browse Class Catalog</span>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      <Navbar />

      <main className="flex-1">
        {/* Modern Clean Hero Section */}
        <section className="relative bg-gradient-to-b from-[#091124] via-[#0c1836] to-[#091124] text-white py-10 lg:py-14 px-4 sm:px-6 lg:px-8 border-b border-blue-950/60 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-5 flex-wrap">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              <Link href="/classes" className="hover:text-white transition-colors">
                Individual Classes
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-200 font-medium truncate max-w-sm sm:max-w-md">
                {course?.title}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              {/* Left Column: Course Details */}
              <div className="lg:col-span-8 space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold font-mono tracking-wider px-2.5 py-1">
                    {course?.subjectCode || "LONDON SPECIFICATION"}
                  </Badge>
                  <Badge className="bg-white/10 text-slate-200 border border-white/15 text-xs font-semibold px-2.5 py-1">
                    {course?.level || "London A/L"}
                  </Badge>
                  <Badge className="bg-sky-500/15 text-sky-300 border border-sky-400/25 text-xs font-medium px-2.5 py-1">
                    {course?.category || "Academic Curriculum"}
                  </Badge>
                  {isEnrolled && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
                      <Check className="w-3.5 h-3.5" /> Enrolled Student
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-white leading-tight">
                  {course?.title}
                </h1>

                <p className="text-slate-300 text-xs sm:text-sm lg:text-base leading-relaxed max-w-2xl font-normal">
                  {course?.subtitle || course?.description}
                </p>

                {/* Key Course Metrics Chips */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                    <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>
                      <strong className="text-white font-bold">{totalLessons}</strong> Curriculum Topics
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>
                      <strong className="text-white font-bold">{materialsList.length}</strong> Study Handbooks & Sheets
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Live Interactive Tuition</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Verified London Faculty</span>
                  </div>
                </div>

                {/* Lead Instructor Card */}
                <div className="pt-2">
                  <div className="inline-flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-2.5 pr-4 transition-all">
                    <Avatar className="w-11 h-11 ring-2 ring-blue-400/40 shrink-0">
                      <AvatarImage src={course?.instructor?.avatar} alt={course?.instructor?.name} />
                      <AvatarFallback className="bg-blue-900 text-white font-bold">
                        {course?.instructor?.name?.charAt(0) || "T"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">
                          {course?.instructor?.name}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">
                        {course?.instructor?.roleTitle}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Sticky Pricing & Enrollment Card */}
              <div className="lg:col-span-4 lg:sticky lg:top-6">
                <div className="bg-white rounded-3xl p-6 sm:p-7 text-slate-900 border border-slate-200/90 shadow-2xl space-y-5">
                  {course?.thumbnail && (
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-100 shadow-xs">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <Badge className="bg-[#091124]/80 backdrop-blur-md text-white border-0 text-[10px] font-bold">
                          {course?.subjectCode || "Official Specification"}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {isLoggedIn ? (
                    <>
                      {/* Token Pricing Display */}
                      <div className="flex items-center justify-between gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-600 shadow-2xs">
                            <Coins className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                                {effectivePrice}
                              </span>
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Tokens
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Full class access & study vault
                            </span>
                          </div>
                        </div>

                        {isOL &&
                        course?.olPrice !== null &&
                        course?.olPrice !== undefined &&
                        Number(course.olPrice) > 0 ? (
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                            London O/L Rate
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
                            London A/L Rate
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      {isEnrolled ? (
                        <div className="space-y-2.5">
                          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold shadow-2xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Active Enrollment: You have full access!</span>
                          </div>
                          <button
                            onClick={() => setActiveTab("materials")}
                            className="w-full py-3.5 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                          >
                            <FolderOpen className="w-4 h-4" />
                            <span>Access Study Materials Vault</span>
                          </button>
                          <button
                            onClick={() => setShowTrialModal(true)}
                            className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-all cursor-pointer"
                          >
                            <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Book 1-on-1 Consultation Session</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <Button
                            onClick={() => setShowPurchaseModal(true)}
                            className="w-full py-4 h-auto rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                          >
                            <Lock className="w-4 h-4 text-blue-300" />
                            <span>
                              {effectivePrice === 0
                                ? "Enroll in Class (Free)"
                                : `Enroll & Unlock Class (${effectivePrice} Tokens)`}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                          <button
                            onClick={() => setShowTrialModal(true)}
                            className="w-full py-2.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200 transition-all cursor-pointer shadow-2xs"
                          >
                            <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Request 30-Min Free Trial Session</span>
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-blue-500/10 text-blue-700 border border-blue-500/20 text-xs font-bold px-2.5 py-1">
                          Student Pricing Protected
                        </Badge>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                          Full Specification
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Sign in to view class tokens & pricing
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            Token rates and class enrollment are reserved for registered student accounts.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Link
                          href={`/register?redirect=${encodeURIComponent(`/classes/${slug}`)}`}
                          className="w-full py-3.5 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all text-center"
                        >
                          <span>Create Free Student Account</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/login?redirect=${encodeURIComponent(`/classes/${slug}`)}`}
                          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center"
                        >
                          <span>Already have an account? Sign In</span>
                        </Link>
                      </div>
                    </>
                  )}

                  {/* Included in This Class Checklist */}
                  <div className="space-y-2.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
                    <div className="font-bold text-slate-900">What is included in this class:</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-slate-700">Downloadable Handbooks & Formula Books</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-slate-700">Full Syllabus Topics & Learning Objectives</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-slate-700">Live BBB Classroom Sessions & Tutor Q&A</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FileCheck2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-slate-700">Past Paper Worked Solutions & Derivations</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Award className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-slate-700">Accredited Academic Certificate</span>
                      </div>
                    </div>
                  </div>

                  {/* Trust Footer */}
                  <div className="pt-2 text-[11px] text-slate-500 text-center border-t border-slate-100 flex items-center justify-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Verified London Faculty • 100% Academic Guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Navigation Strip */}
        <section className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-2.5">
              <button
                onClick={() => setActiveTab("materials")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === "materials"
                    ? "bg-[#0c2461] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                <span>Study Materials Vault</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    activeTab === "materials"
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {materialsList.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("curriculum")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === "curriculum"
                    ? "bg-[#0c2461] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Curriculum & Syllabus</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    activeTab === "curriculum"
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {totalLessons}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-[#0c2461] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Specification & Faculty</span>
              </button>
            </div>
          </div>
        </section>

        {/* Tab 1: Study Materials Vault */}
        {activeTab === "materials" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
            {/* Header / Filter Bar */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      Official Course Study Vault & Materials
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
                    Download verified syllabus handbooks, step-by-step formula reference manuals, worked past paper solutions, and practical worksheets.
                  </p>
                </div>

                {isStaff && (
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 shrink-0 cursor-pointer h-10 px-4"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Study Material</span>
                  </Button>
                )}
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {[
                    { key: "ALL", label: "All Materials", icon: Layers },
                    { key: "HANDOUT", label: "Handbooks & Notes", icon: FileText },
                    { key: "FORMULA_SHEET", label: "Formula Sheets", icon: Calculator },
                    { key: "MOCK_PAPER", label: "Worked Papers", icon: FileCode },
                    { key: "LAB_GUIDE", label: "Practical Labs", icon: FlaskConical },
                  ].map((filter) => {
                    const FilterIcon = filter.icon;
                    return (
                      <button
                        key={filter.key}
                        onClick={() => setMaterialCategory(filter.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                          materialCategory === filter.key
                            ? "bg-[#0c2461] text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <FilterIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{filter.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search documents & formula sheets..."
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    className="pl-9 h-10 text-xs rounded-xl border-slate-200"
                  />
                  {materialSearch && (
                    <button
                      onClick={() => setMaterialSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Locked Notice Banner */}
            {!isEnrolled && !isStaff && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-blue-950">
                      Study Materials & Downloads are Locked
                    </h4>
                    <p className="text-xs text-blue-800/90 mt-0.5 leading-relaxed">
                      Enroll in this individual class to unlock download access to all {materialsList.length} verified handbooks, formula booklets, and worked solutions.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowPurchaseModal(true)}
                  className="bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs h-10 px-4 rounded-xl shadow-sm shrink-0 cursor-pointer gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-blue-300" />
                  <span>
                    {effectivePrice === 0
                      ? "Enroll in Class (Free)"
                      : `Enroll in Class (${effectivePrice} Tokens)`}
                  </span>
                </Button>
              </div>
            )}

            {/* Materials Grid */}
            {filteredMaterials.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No study materials matching your criteria</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your filter or search query, or check back soon as faculty uploads new syllabus resources.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setMaterialCategory("ALL");
                    setMaterialSearch("");
                  }}
                  variant="outline"
                  className="text-xs font-bold rounded-xl"
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            {getCategoryBadge(material.category)}
                            <h3 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-blue-600 transition-colors mt-1">
                              {material.title}
                            </h3>
                          </div>
                        </div>
                      </div>

                      {material.description && (
                        <p className="text-xs text-slate-600 leading-relaxed pl-14">
                          {material.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span className="uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {material.fileType.includes("pdf")
                            ? "PDF"
                            : material.fileType.includes("word") || material.fileType.includes("doc")
                            ? "DOC"
                            : "DOC"}
                        </span>
                        <span>•</span>
                        <span>{material.fileSize}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEnrolled || isStaff ? (
                          <>
                            <a
                              href={material.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                              <span>View</span>
                            </a>

                            <a
                              href={material.fileUrl}
                              download
                              className="px-3.5 py-1.5 rounded-lg bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>

                            {isStaff && (
                              <button
                                onClick={() => handleDeleteMaterial(material.id)}
                                title="Delete material"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          <Button
                            onClick={() => setShowPurchaseModal(true)}
                            className="px-3.5 py-1.5 h-8 rounded-lg bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Unlock File</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Curriculum & Syllabus (NO VIDEO LESSONS) */}
        {activeTab === "curriculum" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
            {/* Top Progress & Curriculum Overview Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-black text-slate-900">
                      Syllabus Curriculum & Topic Breakdown
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Structured syllabus units covering full Cambridge & Pearson Edexcel examination requirements.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      {completedCount} of {totalLessons} Topics Mastered
                    </div>
                    <div className="text-[11px] text-slate-500">{progressPercentage}% Complete</div>
                  </div>
                  <div className="w-24 sm:w-32 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Two-Column Explorer: Topic Deep Dive + Module Navigator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Topic Details Deep Dive */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
                  {selectedLesson ? (
                    <>
                      {/* Topic Header Card */}
                      <div className="border-b border-slate-100 pb-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold">
                              Topic #{selectedLesson.position}
                            </Badge>
                            <Badge className="bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {selectedLesson.durationMin} Mins Class Study
                            </Badge>
                            {selectedLesson.isFreePreview && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                                Free Preview Topic
                              </Badge>
                            )}
                          </div>

                          <Button
                            size="sm"
                            onClick={() => toggleLessonCompletion(selectedLesson.id)}
                            className={`rounded-xl text-xs font-bold gap-1.5 transition-all ${
                              completedLessonIds.includes(selectedLesson.id)
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              {completedLessonIds.includes(selectedLesson.id)
                                ? "Mastered"
                                : "Mark as Mastered"}
                            </span>
                          </Button>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                          {selectedLesson.title}
                        </h3>

                        {selectedLesson.description && (
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            {selectedLesson.description}
                          </p>
                        )}
                      </div>

                      {/* Learning Objectives Box */}
                      <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3 text-xs">
                        <div className="font-bold text-blue-950 flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-600" />
                          <span>Core Syllabus Learning Objectives</span>
                        </div>
                        <ul className="space-y-2 text-slate-700 leading-relaxed list-none pl-0">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>
                              Master foundational definitions, algebraic expressions, and canonical representations required by London specifications.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>
                              Execute rigorous multi-step problem solving, analytical proofs, and graphical evaluations.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>
                              Analyze common examination pitfalls, mark scheme constraints, and step-by-step mark allocations.
                            </span>
                          </li>
                        </ul>
                      </div>

                      {/* Examination Focus Box */}
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-slate-700" />
                          <span>Past Paper & Assessment Relevance</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          This syllabus unit is regularly assessed in Paper 1 and Paper 2 series. Students must show complete step-by-step working without relying solely on calculator approximations to receive maximum method marks.
                        </p>
                      </div>

                      {/* Study Vault & Live Session CTAs */}
                      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0c2461] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            <span>Interactive Tuition & Support</span>
                          </div>
                          <div className="text-sm font-bold">Have questions on this topic?</div>
                          <p className="text-[11px] text-slate-300 max-w-sm">
                            Connect directly with {course?.instructor?.name || "faculty"} for 1-on-1 personalized revision or worked solution review.
                          </p>
                        </div>
                        <Button
                          onClick={() => setShowTrialModal(true)}
                          className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs h-9 px-4 rounded-xl shadow-xs shrink-0 cursor-pointer"
                        >
                          Book Trial Session
                        </Button>
                      </div>

                      {/* Previous / Next Topic Navigator */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        {prevLesson ? (
                          <button
                            onClick={() => setSelectedLesson(prevLesson)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="truncate max-w-[140px] sm:max-w-[200px]">
                              {prevLesson.title}
                            </span>
                          </button>
                        ) : (
                          <div />
                        )}

                        {nextLesson ? (
                          <button
                            onClick={() => setSelectedLesson(nextLesson)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer ml-auto"
                          >
                            <span className="truncate max-w-[140px] sm:max-w-[200px]">
                              {nextLesson.title}
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <div />
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16 text-slate-400 space-y-3">
                      <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                      <h4 className="text-sm font-bold text-slate-700">No topic selected</h4>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Choose a syllabus topic from the module list on the right to review learning objectives and study handbooks.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Module & Topic Navigator */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-sm text-slate-900">Curriculum Modules</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {courseModules.length} Modules • {totalLessons} Units
                      </p>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                      Full Coverage
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {courseModules.map((module, idx) => {
                      const isOpen = activeModuleIdx === idx;
                      const moduleLessons = module.lessons || [];
                      const completedInModule = moduleLessons.filter((l) =>
                        completedLessonIds.includes(l.id)
                      ).length;

                      return (
                        <div
                          key={module.id || idx}
                          className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50"
                        >
                          <button
                            onClick={() => setActiveModuleIdx(isOpen ? null : idx)}
                            className="w-full p-4 text-left flex items-center justify-between font-bold text-xs text-slate-900 bg-white hover:bg-blue-50/40 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4 text-blue-600 shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <div>
                                <span className="block leading-snug">{module.title}</span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {completedInModule} / {moduleLessons.length} Completed
                                </span>
                              </div>
                            </div>
                            <span className="text-[11px] text-slate-500 font-semibold shrink-0">
                              {moduleLessons.length} Topics
                            </span>
                          </button>

                          {isOpen && (
                            <div className="p-3 space-y-2 bg-slate-50 border-t border-slate-100 text-xs">
                              {moduleLessons.map((lesson, lIdx) => {
                                const isSelected = selectedLesson?.id === lesson.id;
                                const isDone = completedLessonIds.includes(lesson.id);

                                return (
                                  <div
                                    key={lesson.id || lIdx}
                                    onClick={() => setSelectedLesson(lesson)}
                                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-blue-50/90 border-blue-300 text-blue-950 shadow-2xs font-bold"
                                        : "bg-white border-slate-200/80 hover:border-blue-200 text-slate-700"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                          isDone
                                            ? "bg-emerald-600 text-white"
                                            : isSelected
                                            ? "bg-[#0c2461] text-white"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {isDone ? (
                                          <Check className="w-3.5 h-3.5" />
                                        ) : (
                                          lIdx + 1
                                        )}
                                      </div>
                                      <span className="text-xs leading-snug">{lesson.title}</span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 shrink-0 ml-2 font-mono">
                                      {lesson.durationMin}m
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab 3: Specification & Faculty */}
        {activeTab === "overview" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Specification Overview */}
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Class & Syllabus Specification</h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">
                    {course?.description}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Accreditation & Curriculum Standards</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Pearson Edexcel & Cambridge Aligned</div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Rigorous adherence to official UK and International GCE examination guidelines.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <FileCheck2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Verified Study Handbooks</div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Step-by-step formula reference manuals and worked derivations.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Academic Certificate</div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Verified credential upon mastering all curriculum syllabus topics.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Live Interactive Tuition</div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Direct live BBB classroom coaching and tutor consultation sessions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Faculty Lead Profile */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-sm text-slate-900">Lead Faculty Tutor</h3>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                    Verified
                  </Badge>
                </div>

                <div className="flex items-center gap-3.5 pt-1">
                  <Avatar className="w-14 h-14 ring-2 ring-blue-500/20 shrink-0">
                    <AvatarImage src={course?.instructor?.avatar} alt={course?.instructor?.name} />
                    <AvatarFallback className="bg-blue-900 text-white font-bold">
                      {course?.instructor?.name?.charAt(0) || "T"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{course?.instructor?.name}</div>
                    <div className="text-xs text-blue-600 font-semibold mt-0.5">
                      {course?.instructor?.roleTitle}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pt-2">
                  {parseTutorBio(course?.instructor?.bio)}
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setShowTrialModal(true)}
                    className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200 transition-all cursor-pointer shadow-2xs"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Request 1-on-1 Trial Session</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Upload Study Material Modal for Tutors/Admins */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Upload Class Study Material</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {uploadStatusMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  uploadStatusMsg.type === "success"
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {uploadStatusMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{uploadStatusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUploadMaterial} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Document Title</label>
                <Input
                  required
                  placeholder="Enter document title (e.g., Pure Maths 1 Handout)"
                  value={newMaterialTitle}
                  onChange={(e) => setNewMaterialTitle(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Resource Category</label>
                <select
                  value={newMaterialCategory}
                  onChange={(e) => setNewMaterialCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-blue-500"
                >
                  <option value="HANDOUT">📄 Study Handbook / Summary Notes</option>
                  <option value="FORMULA_SHEET">📐 Official Formula & Identity Sheet</option>
                  <option value="MOCK_PAPER">📝 Past Paper Worked Solutions</option>
                  <option value="LAB_GUIDE">🔬 Practical Laboratory Manual</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Description (Optional)</label>
                <textarea
                  placeholder="Provide a short description of the syllabus units or topics covered..."
                  value={newMaterialDesc}
                  onChange={(e) => setNewMaterialDesc(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Select File (PDF, DOC, PPT)</label>
                <div className="p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl text-center space-y-2 bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="material-file-upload"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedUploadFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="material-file-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <FolderOpen className="w-8 h-8 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">
                      {selectedUploadFile ? selectedUploadFile.name : "Click to select a file from your device"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {selectedUploadFile
                        ? `${(selectedUploadFile.size / (1024 * 1024)).toFixed(2)} MB`
                        : "Supports PDF, Word, PowerPoint up to 100MB"}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                  className="text-xs font-semibold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={uploadingMaterial}
                  className="bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  {uploadingMaterial ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading File...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Publish Material</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trial Request Modal */}
      <TrialRequestModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        initialCourseId={course?.id}
        initialTutorId={course?.instructorId || (course as any)?.tutorId || (course as any)?.instructor?.id}
        allCourses={course ? [course] : []}
      />

      {/* Course Purchase Modal */}
      <CoursePurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        course={course}
        onSuccess={() => {
          setIsEnrolled(true);
          setActiveTab("materials");
          loadCourse(true);
        }}
      />

      <Footer />
    </div>
  );
}
