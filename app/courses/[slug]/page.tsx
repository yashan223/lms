"use client";

import React, { useState, useEffect, use } from "react";
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
  FolderOpen,
  Plus,
  Upload,
  Search,
  ExternalLink,
  Trash2,
  FileCheck2,
  Layers,
  HelpCircle,
  Calendar,
  AlertCircle,
  Loader2,
  Video,
  Calculator,
  FlaskConical,
  FileCode,
} from "lucide-react";
import { TrialRequestModal } from "@/components/trials/TrialRequestModal";

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
  videoUrl?: string | null;
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

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"materials" | "curriculum" | "overview">("materials");
  const [activeModuleIdx, setActiveModuleIdx] = useState<number | null>(0);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);

  // Role check — only ADMIN / INSTRUCTOR can upload or delete materials
  const [isStaff, setIsStaff] = useState(false);
  useEffect(() => {
    const role = document.cookie
      .split("; ")
      .find((r) => r.startsWith("edupulse_user_role="))
      ?.split("=")[1];
    setIsStaff(role === "ADMIN" || role === "INSTRUCTOR");
  }, []);

  // Materials filter & search
  const [materialCategory, setMaterialCategory] = useState<string>("ALL");
  const [materialSearch, setMaterialSearch] = useState<string>("");

  // Upload Material Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState("");
  const [newMaterialCategory, setNewMaterialCategory] = useState("HANDOUT");
  const [newMaterialDesc, setNewMaterialDesc] = useState("");
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load Course Data
  const loadCourse = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.course) {
          setCourse({
            ...data.course,
            instructor: {
              name: data.course.instructor?.name || "Dr. Sarah Jenkins",
              avatar: data.course.instructor?.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
              roleTitle: data.course.instructor?.headline || "Senior Faculty Tutor in Mathematics",
              bio: data.course.instructor?.bio || "Subject Lead with 18+ years teaching London A/L & O/L specification.",
            },
          });

          if (data.course.enrollments && data.course.enrollments.length > 0) {
            setIsEnrolled(true);
          }

          // Select first lesson by default if available
          if (data.course.modules?.[0]?.lessons?.[0]) {
            setSelectedLesson(data.course.modules[0].lessons[0]);
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
    loadCourse();
  }, [slug]);

  // Real-time synchronization for study materials & syllabus changes
  useRealtimeSync({
    events: ["MATERIALS_CHANGED", "COURSES_CHANGED", "ENROLLMENTS_CHANGED"],
    onSync: () => {
      loadCourse();
    },
  });

  // Handle Enrollment
  const handleEnroll = async () => {
    try {
      setEnrollLoading(true);
      const res = await fetch(`/api/courses/${encodeURIComponent(slug)}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setIsEnrolled(true);
        setActiveTab("materials");
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

  // Toggle Lesson Completion
  const toggleLessonCompletion = (lessonId: string) => {
    setCompletedLessonIds((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
  };

  // Upload Study Material to VPS Storage & Prisma
  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadFile || !newMaterialTitle.trim()) {
      setUploadStatusMsg({ type: "error", text: "Please select a file and provide a title." });
      return;
    }

    try {
      setUploadingMaterial(true);
      setUploadStatusMsg(null);

      // 1. Upload file to VPS storage
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

      // 2. Link material to Course in PostgreSQL
      const materialRes = await fetch(`/api/courses/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_material",
          title: newMaterialTitle.trim(),
          description: newMaterialDesc.trim() || null,
          fileUrl: uploadData.fileUrl,
          fileSize: uploadData.fileSize,
          fileType: uploadData.mimeType,
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

  // Delete Course Material
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

  if (!course && !loading) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-white">
        <Navbar />
        <div className="text-center py-24 space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">Course Not Found</h2>
          <p className="text-xs text-slate-500">The requested course syllabus is not currently available.</p>
          <Link href="/courses" className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs">
            Return to Course Directory
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const courseModules: Module[] = course?.modules || [];
  const totalLessons = courseModules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
  const materialsList: CourseMaterial[] = course?.materials || [];

  // Filtered Study Materials
  const filteredMaterials = materialsList.filter((mat) => {
    const matchesCategory = materialCategory === "ALL" || mat.category === materialCategory;
    const matchesSearch =
      mat.title.toLowerCase().includes(materialSearch.toLowerCase()) ||
      (mat.description && mat.description.toLowerCase().includes(materialSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "FORMULA_SHEET":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Formula Sheet</Badge>;
      case "MOCK_PAPER":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">Worked Solutions</Badge>;
      case "LAB_GUIDE":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Practical Lab Guide</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">Lecture Handbook</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      <Navbar />

      <main className="flex-1">
        {/* Top Hero Banner */}
        <section className="bg-[#0b1b3d] text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-blue-900/40">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs text-blue-300/80 mb-4 flex-wrap">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <Link href="/courses" className="hover:text-white transition-colors">Courses</Link>
              <span>/</span>
              <span className="text-white font-medium truncate max-w-md">{course?.title}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold">
                    {course?.subjectCode || "London Academic Specification"}
                  </Badge>
                  <Badge className="bg-white/10 text-white text-xs">
                    {course?.level || "London A/L"}
                  </Badge>
                  <Badge className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs">
                    {course?.category || "Pure Mathematics"}
                  </Badge>
                  {isEnrolled && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" /> Enrolled Scholar
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {course?.title}
                </h1>

                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                  {course?.subtitle || course?.description}
                </p>

                {/* Key Course Stats */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <strong>4.98</strong> (1,840 reviews)
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    {totalLessons} Interactive Lessons
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    {materialsList.length} Study Handbooks & Formula Sheets
                  </span>
                </div>

                {/* Instructor Bar */}
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="w-10 h-10 ring-2 ring-blue-400/40">
                    <AvatarImage src={course?.instructor?.avatar} alt={course?.instructor?.name} />
                    <AvatarFallback>{course?.instructor?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-xs font-bold text-white">{course?.instructor?.name}</div>
                    <div className="text-[11px] text-blue-300">{course?.instructor?.roleTitle}</div>
                  </div>
                </div>
              </div>

              {/* Right Action Quick Card */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-6 text-slate-900 border border-slate-200 shadow-xl space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-black text-slate-900">£{course?.price || 95}</span>
                    <span className="text-xs text-slate-400 ml-2">Full Specification</span>
                  </div>
                  <span className="text-xs text-slate-400 line-through">£160.00</span>
                </div>

                {isEnrolled ? (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>You have active access to this course!</span>
                    </div>
                    <button
                      onClick={() => setActiveTab("materials")}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>Access Study Materials</span>
                    </button>
                    <button
                      onClick={() => setShowTrialModal(true)}
                      className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Book 1-on-1 Faculty Trial (30 Mins)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleEnroll}
                      disabled={enrollLoading}
                      className="w-full py-3.5 h-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <span>{enrollLoading ? "Enrolling..." : "Enroll & Unlock All Materials"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <button
                      onClick={() => setShowTrialModal(true)}
                      className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Request 30-Min Free Trial Session</span>
                    </button>
                  </div>
                )}

                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="font-bold text-slate-800">Included in this course:</div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Downloadable Unit Handbooks & Formula Books</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlayCircle className="w-4 h-4 text-blue-600" />
                    <span>HD Topic Breakdown Video Lessons</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span>Accredited Academic Certificate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs Strip */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-2">
              <button
                onClick={() => setActiveTab("materials")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === "materials"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                <span>Study Materials & Downloads</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "materials" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {materialsList.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("curriculum")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === "curriculum"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Curriculum & Video Lessons</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "curriculum" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {totalLessons}
                </span>
              </button>



              <button
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Specification Details</span>
              </button>
            </div>
          </div>
        </section>

        {/* Tab 1: Dedicated Study Materials Hub */}
        {activeTab === "materials" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
            {/* Header & Upload Action */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Official Course Study Vault & Materials
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Download verified syllabus handbooks, step-by-step formula reference manuals, worked past paper solutions, and practical worksheets.
                  </p>
                </div>

                {isStaff && (
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Study Material</span>
                  </Button>
                )}
              </div>

              {/* Filters & Search Toolbar */}
              <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
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
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <FilterIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{filter.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search documents..."
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    className="pl-8 h-9 text-xs rounded-xl border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Study Materials Cards Grid */}
            {filteredMaterials.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No study materials matching your criteria</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your filter or search query, or upload a new resource for this subject.
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
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            {getCategoryBadge(material.category)}
                            <h3 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-blue-600 transition-colors mt-0.5">
                              {material.title}
                            </h3>
                          </div>
                        </div>
                      </div>

                      {material.description && (
                        <p className="text-xs text-slate-600 leading-relaxed pl-12">
                          {material.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span className="uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {material.fileType.includes("pdf") ? "PDF" : "DOC"}
                        </span>
                        <span>•</span>
                        <span>{material.fileSize}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={material.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Online</span>
                        </a>

                        <a
                          href={material.fileUrl}
                          download
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Curriculum & Video Classroom */}
        {activeTab === "curriculum" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left 7 Cols: Video Player & Lesson Study Sheet */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-5">
                  {selectedLesson ? (
                    <>
                      {/* Responsive Virtual Classroom Video Area */}
                      <div className="w-full aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-white relative overflow-hidden group shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                        <div className="relative z-10 text-center space-y-3 p-6">
                          <div className="w-16 h-16 rounded-full bg-blue-600/90 text-white flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform cursor-pointer">
                            <PlayCircle className="w-8 h-8" />
                          </div>
                          <div>
                            <div className="text-xs text-sky-400 font-bold uppercase tracking-wider">
                              Interactive Lecture Player
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-white max-w-md">
                              {selectedLesson.title}
                            </h3>
                          </div>
                          <span className="inline-block text-[11px] bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-white font-medium">
                            Duration: {selectedLesson.durationMin} Minutes • Stream Enabled
                          </span>
                        </div>
                      </div>

                      {/* Lesson Details & Actions */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">{selectedLesson.title}</h3>
                            <p className="text-xs text-slate-500">London Curriculum Unit Specification Coverage</p>
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
                              {completedLessonIds.includes(selectedLesson.id) ? "Completed" : "Mark Complete"}
                            </span>
                          </Button>
                        </div>

                        {/* Objectives Callout */}
                        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-slate-700 space-y-2">
                          <div className="font-bold text-blue-900 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <span>Lesson Core Learning Outcomes & Derivations</span>
                          </div>
                          <p className="leading-relaxed text-slate-600">
                            Master mathematical proofs, identify common marks allocation pitfalls in exam series, and understand standard notation for London Edexcel & Cambridge papers.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2" />
                      <span>Select a lesson from the module syllabus on the right to start studying.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right 5 Cols: Modules Accordion */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-slate-900">Syllabus Curriculum Modules</h3>
                    <p className="text-xs text-slate-500">
                      {courseModules.length} Modules • {totalLessons} Lessons
                    </p>
                  </div>

                  <div className="space-y-3">
                    {courseModules.map((module, idx) => {
                      const isOpen = activeModuleIdx === idx;
                      return (
                        <div
                          key={module.id || idx}
                          className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50"
                        >
                          <button
                            onClick={() => setActiveModuleIdx(isOpen ? null : idx)}
                            className="w-full p-3.5 text-left flex items-center justify-between font-bold text-xs text-slate-900 bg-white hover:bg-blue-50/40 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4 text-blue-600 shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span>{module.title}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-semibold shrink-0">
                              {module.lessons?.length || 0} Lessons
                            </span>
                          </button>

                          {isOpen && (
                            <div className="p-3 space-y-2 bg-slate-50 border-t border-slate-100 text-xs">
                              {module.lessons?.map((lesson, lIdx) => {
                                const isSelected = selectedLesson?.id === lesson.id;
                                const isDone = completedLessonIds.includes(lesson.id);
                                return (
                                  <div
                                    key={lesson.id || lIdx}
                                    onClick={() => setSelectedLesson(lesson)}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-blue-50 border-blue-300 text-blue-900 shadow-2xs font-bold"
                                        : "bg-white border-slate-200/80 hover:border-blue-200 text-slate-700"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                          isDone
                                            ? "bg-emerald-600 text-white"
                                            : isSelected
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {isDone ? <Check className="w-3.5 h-3.5" /> : lIdx + 1}
                                      </div>
                                      <span className="text-xs leading-snug">{lesson.title}</span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 shrink-0 ml-2">
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



        {/* Tab 4: Specification Details & Overview */}
        {activeTab === "overview" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Course & Syllabus Overview</h2>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">
                    {course?.description}
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Official Specification Requirements</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Pearson Edexcel & Cambridge Aligned</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Verified Examination Mark Schemes</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>Accredited Academic Certificate</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>Live Faculty Q&A Access</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead Faculty Card */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Lead Faculty Educator</h3>
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
            </div>
          </section>
        )}
      </main>

      {/* Upload Study Material Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Upload Course Study Material</h3>
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

            <form onSubmit={handleUploadMaterial} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Document Title</label>
                <Input
                  required
                  placeholder="e.g. Pure Mathematics P3 Integration Formulas & Worked Examples"
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
                  <option value="HANDOUT">📄 Lecture Handbook / Summary Notes</option>
                  <option value="FORMULA_SHEET">📐 Official Formula & Identity Sheet</option>
                  <option value="MOCK_PAPER">📝 Past Paper Worked Solutions</option>
                  <option value="LAB_GUIDE">🔬 Practical Laboratory Manual</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Description (Optional)</label>
                <textarea
                  placeholder="Provide a short description of the topics covered in this document..."
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
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

      {/* 30-Minute Free Trial Session Request Modal */}
      <TrialRequestModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        initialCourseId={course?.id}
        initialTutorId={course?.instructorId}
        allCourses={course ? [course] : []}
      />

      <Footer />
    </div>
  );
}
