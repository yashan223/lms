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
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Lock,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { TrialRequestModal } from "@/components/trials/TrialRequestModal";
import { CoursePurchaseModal } from "@/components/checkout/CoursePurchaseModal";
import { PermanentEnrollmentModal } from "@/components/enrollment/PermanentEnrollmentModal";
import { parseTutorBio } from "@/lib/utils";

interface CourseMaterial {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileSize: string;
  fileType: string;
  category: string;
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
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [studentLevel, setStudentLevel] = useState<"OL" | "AL">("AL");
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPermanentEnrollmentModal, setShowPermanentEnrollmentModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({ "0": true });

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
              name: data.course.instructor?.name || "Tutor",
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

          if (data.user) {
            setCurrentUser(data.user);
          }

          if (data.academicLevel) {
            setStudentLevel(data.academicLevel);
          }

          if (typeof data.isEnrolled === "boolean") {
            setIsEnrolled(data.isEnrolled);
          } else {
            setIsEnrolled(false);
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

  const toggleModule = (idxKey: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [idxKey]: !prev[idxKey],
    }));
  };

  if (!course && !loading) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-50">
        <Navbar />
        <div className="max-w-md mx-auto text-center py-28 px-4 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Class Not Found</h2>
          <p className="text-xs text-slate-500">
            The requested class could not be found or is not currently available.
          </p>
          <div className="pt-2">
            <Link
              href="/classes"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Classes</span>
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

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Simple Clean Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 space-y-5 shadow-xs">
          {/* Navigation row & Tags */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/classes"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Classes</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              {course?.subjectCode && (
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border-blue-200"
                >
                  {course.subjectCode}
                </Badge>
              )}
              {course?.level && (
                <Badge variant="outline" className="text-xs text-slate-700 bg-slate-50 border-slate-200">
                  {course.level}
                </Badge>
              )}
              {course?.category && (
                <Badge variant="outline" className="text-xs text-slate-600 bg-slate-50 border-slate-200">
                  {course.category}
                </Badge>
              )}
              {isEnrolled && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check className="w-3.5 h-3.5" /> Enrolled
                </span>
              )}
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {course?.title}
            </h1>
            {course?.description && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                {course.description}
              </p>
            )}
          </div>

          {/* Tutor & Quick Action Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Instructor */}
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-1 ring-slate-200">
                <AvatarImage src={course?.instructor?.avatar} alt={course?.instructor?.name} />
                <AvatarFallback className="bg-slate-100 text-slate-700 font-bold text-xs">
                  {course?.instructor?.name?.charAt(0) || "T"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xs font-bold text-slate-900">{course?.instructor?.name}</div>
                <div className="text-[11px] text-slate-500">{course?.instructor?.roleTitle}</div>
              </div>
            </div>

            {/* Actions: Price & Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {isLoggedIn ? (
                <>
                  {isEnrolled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTrialModal(true)}
                      className="text-xs font-bold rounded-xl h-9 gap-1.5 cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Book Consultation</span>
                    </Button>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-sm font-black text-slate-900">{effectivePrice}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Tokens</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setShowPermanentEnrollmentModal(true)}
                        className="bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs rounded-xl h-9 px-4 gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-blue-200" />
                        <span>
                          {effectivePrice === 0 ? "Enroll Free" : `Enroll (${effectivePrice} Tokens)`}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTrialModal(true)}
                        className="text-xs font-bold rounded-xl h-9 gap-1.5 cursor-pointer border-slate-200"
                      >
                        <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Free Trial</span>
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/classes/${slug}`)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs shadow-xs"
                >
                  <span>Sign in to Enroll</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Clean Minimalist Tabs */}
        <div className="flex items-center gap-4 sm:gap-6 border-b border-slate-200 px-1">
          <button
            onClick={() => setActiveTab("materials")}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "materials"
                ? "border-[#0c2461] text-[#0c2461]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Study Materials</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                activeTab === "materials"
                  ? "bg-blue-50 text-blue-700 font-bold"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {materialsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("curriculum")}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "curriculum"
                ? "border-[#0c2461] text-[#0c2461]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Curriculum & Topics</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                activeTab === "curriculum"
                  ? "bg-blue-50 text-blue-700 font-bold"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {totalLessons}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-[#0c2461] text-[#0c2461]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tutor & Details</span>
          </button>
        </div>

        {/* Tab 1: Study Materials */}
        {activeTab === "materials" && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { key: "ALL", label: "All" },
                  { key: "HANDOUT", label: "Handbooks" },
                  { key: "FORMULA_SHEET", label: "Formula Sheets" },
                  { key: "MOCK_PAPER", label: "Worked Papers" },
                  { key: "LAB_GUIDE", label: "Lab Guides" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setMaterialCategory(f.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      materialCategory === f.key
                        ? "bg-[#0c2461] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search documents..."
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    className="pl-8 h-9 text-xs rounded-xl border-slate-200"
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

                {isStaff && (
                  <Button
                    size="sm"
                    onClick={() => setShowUploadModal(true)}
                    className="bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs rounded-xl h-9 px-3 shrink-0 gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Locked Notice (if not enrolled & not staff) */}
            {!isEnrolled && !isStaff && (
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-blue-700 shrink-0" />
                  <span className="text-blue-950 font-medium">
                    Study materials are available to enrolled students.
                  </span>
                </div>
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="font-bold text-blue-700 hover:text-blue-900 underline text-xs shrink-0 cursor-pointer text-left sm:text-right"
                >
                  Enroll to unlock downloads →
                </button>
              </div>
            )}

            {/* Materials List */}
            {filteredMaterials.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/90 text-xs text-slate-500 space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">No study materials found</p>
                <p className="text-slate-400">
                  {materialSearch
                    ? "Try clearing your search query."
                    : "No documents have been uploaded for this class yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="bg-white rounded-xl p-4 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                          {mat.title}
                        </div>
                        {mat.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {mat.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-medium">
                          <span className="uppercase font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                            {mat.fileType.includes("pdf") ? "PDF" : "DOC"}
                          </span>
                          <span>•</span>
                          <span>{mat.fileSize}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {isEnrolled || isStaff ? (
                        <>
                          <a
                            href={mat.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            <span>View</span>
                          </a>
                          <a
                            href={mat.fileUrl}
                            download
                            className="px-3.5 py-1.5 rounded-lg bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                          {isStaff && (
                            <button
                              onClick={() => handleDeleteMaterial(mat.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setShowPurchaseModal(true)}
                          className="h-8 px-3 rounded-lg bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Lock className="w-3 h-3 text-blue-200" />
                          <span>Unlock File</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Curriculum & Topics */}
        {activeTab === "curriculum" && (
          <div className="space-y-4">
            {/* Progress summary if topics exist */}
            {totalLessons > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 flex items-center justify-between gap-4 text-xs">
                <span className="font-bold text-slate-700">
                  {completedCount} of {totalLessons} topics completed
                </span>
                <div className="w-36 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#0c2461] h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Modules List */}
            {courseModules.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/90 text-xs text-slate-500 space-y-2">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">No syllabus modules published</p>
                <p className="text-slate-400">The curriculum modules will appear here once configured.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseModules.map((module, idx) => {
                  const key = String(idx);
                  const isExpanded = !!expandedModules[key];
                  const lessons = module.lessons || [];

                  return (
                    <div
                      key={module.id || idx}
                      className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs"
                    >
                      <button
                        onClick={() => toggleModule(key)}
                        className="w-full p-4 text-left flex items-center justify-between font-bold text-xs sm:text-sm text-slate-900 hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-600 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span>{module.title}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-semibold shrink-0">
                          {lessons.length} {lessons.length === 1 ? "Topic" : "Topics"}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 p-3 space-y-2 bg-slate-50/50">
                          {lessons.map((lesson, lIdx) => {
                            const isDone = completedLessonIds.includes(lesson.id);

                            return (
                              <div
                                key={lesson.id || lIdx}
                                className="bg-white rounded-xl p-3 border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => toggleLessonCompletion(lesson.id)}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                                      isDone
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                    }`}
                                    title={isDone ? "Mark as incomplete" : "Mark as completed"}
                                  >
                                    {isDone ? <Check className="w-3.5 h-3.5" /> : lIdx + 1}
                                  </button>
                                  <div>
                                    <div
                                      className={`font-semibold text-xs leading-snug ${
                                        isDone ? "text-slate-500 line-through" : "text-slate-900"
                                      }`}
                                    >
                                      {lesson.title}
                                    </div>
                                    {lesson.description && (
                                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                        {lesson.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {lesson.durationMin}m
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Tutor & Details */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Course Description & Info */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">About this Class</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {course?.description || "No additional description provided for this class."}
              </p>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Level</span>
                  <span className="font-bold text-slate-800">{course?.level || "London A/L"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Category</span>
                  <span className="font-bold text-slate-800">{course?.category || "General"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Subject Code</span>
                  <span className="font-mono font-bold text-slate-800">{course?.subjectCode || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Delivery</span>
                  <span className="font-bold text-slate-800">Live BigBlueButton Classes</span>
                </div>
              </div>
            </div>

            {/* Right: Tutor Profile */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">Instructor</h3>
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 ring-1 ring-slate-200">
                  <AvatarImage src={course?.instructor?.avatar} alt={course?.instructor?.name} />
                  <AvatarFallback className="bg-slate-100 text-slate-700 font-bold">
                    {course?.instructor?.name?.charAt(0) || "T"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xs font-bold text-slate-900">{course?.instructor?.name}</div>
                  <div className="text-[11px] text-blue-600 font-semibold">{course?.instructor?.roleTitle}</div>
                </div>
              </div>

              {course?.instructor?.bio && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {parseTutorBio(course.instructor.bio)}
                </p>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTrialModal(true)}
                className="w-full text-xs font-bold rounded-xl h-9 gap-1.5 cursor-pointer border-slate-200"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Book 1-on-1 Consultation</span>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Upload Material Modal for Tutors / Staff */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Upload Study Material</h3>
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
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {uploadStatusMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{uploadStatusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUploadMaterial} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Title</label>
                <Input
                  required
                  placeholder="Document title"
                  value={newMaterialTitle}
                  onChange={(e) => setNewMaterialTitle(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Category</label>
                <select
                  value={newMaterialCategory}
                  onChange={(e) => setNewMaterialCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white"
                >
                  <option value="HANDOUT">Study Handbook / Notes</option>
                  <option value="FORMULA_SHEET">Formula Sheet</option>
                  <option value="MOCK_PAPER">Worked Solutions / Past Papers</option>
                  <option value="LAB_GUIDE">Practical Lab Guide</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Description (Optional)</label>
                <textarea
                  placeholder="Brief note on topics covered..."
                  value={newMaterialDesc}
                  onChange={(e) => setNewMaterialDesc(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">File (PDF, Word, etc.)</label>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedUploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                  className="text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={uploadingMaterial}
                  className="bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {uploadingMaterial ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Publish Material</span>
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
        currentUser={currentUser}
      />

      {/* Permanent Class Enrollment Modal with Availability Matching */}
      <PermanentEnrollmentModal
        isOpen={showPermanentEnrollmentModal}
        onClose={() => setShowPermanentEnrollmentModal(false)}
        course={course}
        onSuccess={() => {
          loadCourse(true);
        }}
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
