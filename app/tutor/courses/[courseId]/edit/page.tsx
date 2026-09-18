"use client";

import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  CircleUserRound,
  Clock3,
  Coins,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  FolderPlus,
  GraduationCap,
  Layers3,
  Loader2,
  Plus,
  Radio,
  Save,
  Search,
  Star,
  Trash2,
  Upload,
  UserMinus,
  Users,
  Video,
  X,
  AlertCircle,
  Calendar,
  Play,
  PlayCircle,
  ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

type Lesson = {
  id: string;
  title: string;
  durationMin: number;
  position?: number;
  isFreePreview?: boolean;
  videoUrl?: string | null;
  description?: string | null;
};

type Module = {
  id: string;
  title: string;
  position?: number;
  lessons: Lesson[];
};

type Material = {
  id: string;
  title: string;
  description?: string | null;
  fileUrl: string;
  fileSize?: string | null;
  fileType?: string | null;
  category?: string | null;
  createdAt?: string | Date;
};

type EnrolledUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  avatar?: string | null;
  phone?: string | null;
};

type Enrollment = {
  id: string;
  enrolledAt: string | Date;
  user?: EnrolledUser;
};

type ClassEvent = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "PENDING_APPROVAL" | "CANCELLED" | string;
  meetingLink?: string | null;
  dueDate: string | Date;
  startedAt?: string | Date | null;
  endedAt?: string | Date | null;
};

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string | Date;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
  };
};

type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  category?: string | null;
  subjectCode?: string | null;
  price: number;
  level: string;
  status: string;
  featured?: boolean;
  thumbnail?: string | null;
  tutorId?: string | null;
  tutor?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
  } | null;
  modules: Module[];
  materials: Material[];
  enrollments: Enrollment[];
  events?: ClassEvent[];
  reviews?: Review[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type Tab = "overview" | "curriculum" | "materials" | "students" | "live_classes" | "reviews";

const CATEGORIES = [
  "School of Mathematics & Computing",
  "School of Computing & Engineering",
  "School of Science & O/L Academy",
  "School of Economics & Commerce",
  "General Sciences & Foundations",
];

const MATERIAL_CATEGORIES = [
  { value: "HANDOUT", label: "Handout & Study Notes" },
  { value: "FORMULA_SHEET", label: "Formula Sheet & Tables" },
  { value: "PRACTICE_SET", label: "Practice Handbook & Solutions" },
  { value: "LAB_GUIDE", label: "Practical Lab Guide" },
  { value: "SLIDES", label: "Class Slides" },
  { value: "OTHER", label: "General Resource File" },
];

async function callTutorApi(payload: Record<string, unknown>) {
  const response = await fetch("/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed. Please try again.");
  }
  return data;
}

export function TutorCourseWorkspaceContent({
  isNewCourseProp,
}: {
  isNewCourseProp?: boolean;
} = {}) {
  const params = useParams<{ courseId?: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params?.courseId;
  const isNewCourse = Boolean(isNewCourseProp || courseId === "new" || !courseId);

  // Tabs
  const tabParam = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && ["overview", "curriculum", "materials", "students", "live_classes", "reviews"].includes(tabParam)
      ? tabParam
      : "overview"
  );

  // Core data states
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Course Details Form state
  const [detailsForm, setDetailsForm] = useState({
    title: "",
    subjectCode: "",
    category: CATEGORIES[0],
    price: "10",
    level: "ADVANCED",
    status: "PUBLISHED",
    subtitle: "",
    description: "",
    thumbnail: "",
  });

  // Thumbnail upload state
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);

  // Curriculum Builder state
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingModule, setAddingModule] = useState(false);
  const [editingModule, setEditingModule] = useState<{ id: string; title: string } | null>(null);
  const [activeModuleForLesson, setActiveModuleForLesson] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    durationMin: "30",
    videoUrl: "",
    isFreePreview: false,
  });
  const [editingLesson, setEditingLesson] = useState<{
    id: string;
    moduleId: string;
    title: string;
    durationMin: string;
    videoUrl: string;
    isFreePreview: boolean;
  } | null>(null);

  // Study Materials state
  const [matTitle, setMatTitle] = useState("");
  const [matDesc, setMatDesc] = useState("");
  const [matCategory, setMatCategory] = useState("HANDOUT");
  const [matFile, setMatFile] = useState<File | null>(null);
  const [uploadingMat, setUploadingMat] = useState(false);
  const [matSearch, setMatSearch] = useState("");
  const [matCategoryFilter, setMatCategoryFilter] = useState("ALL");

  // Students & Enrollment state
  const [studentSearch, setStudentSearch] = useState("");

  // Live Classes state
  const [classTitle, setClassTitle] = useState("");
  const [classDate, setClassDate] = useState("");
  const [classMeetLink, setClassMeetLink] = useState("");
  const [classDescription, setClassDescription] = useState("");
  const [isSchedulingClass, setIsSchedulingClass] = useState(false);
  const [startingClassId, setStartingClassId] = useState<string | null>(null);
  const [endingClassId, setEndingClassId] = useState<string | null>(null);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "danger" | "warning" | "info";
    confirmText: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "danger",
    confirmText: "Delete",
    onConfirm: () => {},
  });

  // Fetch full course data and tutor context
  const loadData = async (silent = false) => {
    if (isNewCourse) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/tutor", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tutor data");

      const found = (data.courses || []).find((c: Course) => c.id === courseId);
      if (!found) throw new Error("Course not found in tutor curriculum.");

      // Also attach events linked to this course from data.events
      const courseEvents = found.events || (data.events || []).filter((e: any) => e.courseId === courseId);
      const enrichedCourse = { ...found, events: courseEvents };

      setCourse(enrichedCourse);

      setDetailsForm({
        title: found.title || "",
        subjectCode: found.subjectCode || "",
        category: found.category || CATEGORIES[0],
        price: String(found.price ?? 10),
        level: found.level || "ADVANCED",
        status: found.status || "PUBLISHED",
        subtitle: found.subtitle || "",
        description: found.description || "",
        thumbnail: found.thumbnail || "",
      });
    } catch (err: any) {
      setBannerMsg({ type: "error", text: err.message || "Unable to load course data." });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  // Realtime synchronization across LMS actions
  useRealtimeSync({
    events: ["COURSES_CHANGED", "MATERIALS_CHANGED", "ENROLLMENTS_CHANGED", "EVENTS_CHANGED"],
    onSync: () => {
      loadData(true);
    },
  });

  const showToast = (type: "success" | "error", text: string) => {
    setBannerMsg({ type, text });
    setTimeout(() => {
      setBannerMsg((current) => (current?.text === text ? null : current));
    }, 5000);
  };

  // -------------------------------------------------------------
  // Course Details Handlers
  // -------------------------------------------------------------
  const handleSaveDetails = async (e: FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    try {
      if (isNewCourse) {
        if (!detailsForm.title.trim()) {
          throw new Error("Class title is required.");
        }
        if (!detailsForm.description.trim()) {
          throw new Error("Class description is required.");
        }
        const res = await callTutorApi({
          action: "create_course",
          title: detailsForm.title.trim(),
          subjectCode: detailsForm.subjectCode.trim(),
          category: detailsForm.category,
          price: detailsForm.price,
          level: detailsForm.level,
          subtitle: detailsForm.subtitle.trim(),
          description: detailsForm.description.trim(),
          thumbnail: detailsForm.thumbnail.trim() || null,
        });
        showToast("success", "Individual class created successfully! Redirecting to full workspace...");
        if (res.course?.id) {
          router.push(`/tutor/courses/${res.course.id}/edit`);
        } else {
          router.push("/tutor?tab=courses");
        }
        return;
      }

      await callTutorApi({
        action: "update_course",
        courseId,
        title: detailsForm.title.trim(),
        subjectCode: detailsForm.subjectCode.trim(),
        category: detailsForm.category,
        price: detailsForm.price,
        level: detailsForm.level,
        status: detailsForm.status,
        subtitle: detailsForm.subtitle.trim(),
        description: detailsForm.description.trim(),
        thumbnail: detailsForm.thumbnail.trim() || null,
      });
      await loadData(true);
      showToast("success", "Class details saved successfully!");
    } catch (err: any) {
      showToast("error", err.message || "Failed to save class details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleQuickStatusChange = async (newStatus: string) => {
    try {
      await callTutorApi({
        action: "update_course",
        courseId,
        title: detailsForm.title,
        description: detailsForm.description,
        category: detailsForm.category,
        status: newStatus,
      });
      setDetailsForm((prev) => ({ ...prev, status: newStatus }));
      await loadData(true);
      showToast("success", `Class status updated to ${newStatus}`);
    } catch (err: any) {
      showToast("error", err.message || "Failed to update class status.");
    }
  };

  const handleThumbnailUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingThumb(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("isPrivate", "false");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");

      setDetailsForm((prev) => ({ ...prev, thumbnail: data.fileUrl }));
      if (!isNewCourse) {
        await callTutorApi({
          action: "update_course",
          courseId,
          title: detailsForm.title,
          description: detailsForm.description,
          category: detailsForm.category,
          thumbnail: data.fileUrl,
        });
        await loadData(true);
      }
      showToast("success", "Class cover image uploaded and updated!");
    } catch (err: any) {
      showToast("error", err.message || "Failed to upload cover image.");
    } finally {
      setIsUploadingThumb(false);
    }
  };

  const handleDeleteCourse = () => {
    setConfirmModal({
      isOpen: true,
      title: `Delete "${course?.title}"?`,
      description:
        "This will delete this course, modules, lessons, study materials, and student enrollments. This action cannot be undone.",
      variant: "danger",
      confirmText: "Delete Course",
      onConfirm: async () => {
        try {
          await callTutorApi({ action: "delete_course", courseId });
          router.push("/tutor?tab=courses");
        } catch (err: any) {
          showToast("error", err.message || "Failed to delete course.");
        }
      },
    });
  };

  // -------------------------------------------------------------
  // Curriculum Handlers
  // -------------------------------------------------------------
  const handleAddModule = async (e: FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;
    setAddingModule(true);
    try {
      const nextPos = (course?.modules?.length || 0) + 1;
      await callTutorApi({
        action: "add_module",
        courseId,
        title: newModuleTitle.trim(),
        position: nextPos,
      });
      setNewModuleTitle("");
      await loadData(true);
      showToast("success", "Syllabus module created successfully.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to add module.");
    } finally {
      setAddingModule(false);
    }
  };

  const handleUpdateModule = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingModule || !editingModule.title.trim()) return;
    try {
      await callTutorApi({
        action: "update_module",
        moduleId: editingModule.id,
        title: editingModule.title.trim(),
      });
      setEditingModule(null);
      await loadData(true);
      showToast("success", "Module updated.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to update module.");
    }
  };

  const handleDeleteModule = (mod: Module) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Module "${mod.title}"?`,
      description: `This will remove this module and all ${mod.lessons?.length || 0} lessons inside it.`,
      variant: "danger",
      confirmText: "Delete Module",
      onConfirm: async () => {
        try {
          await callTutorApi({ action: "delete_module", moduleId: mod.id });
          await loadData(true);
          showToast("success", "Module deleted.");
        } catch (err: any) {
          showToast("error", err.message || "Failed to delete module.");
        }
      },
    });
  };

  const handleAddLesson = async (moduleId: string) => {
    if (!lessonForm.title.trim()) {
      showToast("error", "Please provide a lesson title.");
      return;
    }
    try {
      await callTutorApi({
        action: "add_lesson",
        moduleId,
        title: lessonForm.title.trim(),
        durationMin: lessonForm.durationMin || "30",
        videoUrl: lessonForm.videoUrl.trim() || undefined,
        isFreePreview: lessonForm.isFreePreview,
      });
      setLessonForm({ title: "", durationMin: "30", videoUrl: "", isFreePreview: false });
      setActiveModuleForLesson(null);
      await loadData(true);
      showToast("success", "Lesson added to module.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to add lesson.");
    }
  };

  const handleUpdateLesson = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !editingLesson.title.trim()) return;
    try {
      await callTutorApi({
        action: "update_lesson",
        lessonId: editingLesson.id,
        title: editingLesson.title.trim(),
        durationMin: editingLesson.durationMin,
        videoUrl: editingLesson.videoUrl.trim() || undefined,
        isFreePreview: editingLesson.isFreePreview,
      });
      setEditingLesson(null);
      await loadData(true);
      showToast("success", "Lesson updated successfully.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to update lesson.");
    }
  };

  const handleDeleteLesson = (lesson: Lesson) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Lesson "${lesson.title}"?`,
      description: "Are you sure you want to remove this lesson from the curriculum?",
      variant: "danger",
      confirmText: "Delete Lesson",
      onConfirm: async () => {
        try {
          await callTutorApi({ action: "delete_lesson", lessonId: lesson.id });
          await loadData(true);
          showToast("success", "Lesson removed.");
        } catch (err: any) {
          showToast("error", err.message || "Failed to remove lesson.");
        }
      },
    });
  };

  // -------------------------------------------------------------
  // Study Materials Handlers
  // -------------------------------------------------------------
  const handleUploadMaterial = async (e: FormEvent) => {
    e.preventDefault();
    if (!matFile) {
      showToast("error", "Please select a file to upload.");
      return;
    }
    if (!matTitle.trim()) {
      showToast("error", "Please enter a title for the material.");
      return;
    }

    setUploadingMat(true);
    try {
      const formData = new FormData();
      formData.append("file", matFile);
      formData.append("isPrivate", "false");

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "File upload failed.");

      await callTutorApi({
        action: "add_course_material",
        courseId,
        title: matTitle.trim(),
        description: matDesc.trim() || null,
        fileUrl: uploadData.fileUrl,
        fileSize: uploadData.fileSize || "1.5 MB",
        fileType: uploadData.mimeType || "application/pdf",
        category: matCategory,
      });

      setMatTitle("");
      setMatDesc("");
      setMatFile(null);
      await loadData(true);
      showToast("success", "Study material published to course.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to publish material.");
    } finally {
      setUploadingMat(false);
    }
  };

  const handleDeleteMaterial = (material: Material) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete "${material.title}"?`,
      description: "This study material will be permanently removed from this course repository.",
      variant: "danger",
      confirmText: "Delete Material",
      onConfirm: async () => {
        try {
          await callTutorApi({ action: "delete_course_material", materialId: material.id });
          await loadData(true);
          showToast("success", "Material removed.");
        } catch (err: any) {
          showToast("error", err.message || "Failed to delete material.");
        }
      },
    });
  };

  const filteredMaterials = useMemo(() => {
    const materials = course?.materials || [];
    return materials.filter((m) => {
      const matchesCat = matCategoryFilter === "ALL" || m.category === matCategoryFilter;
      const q = matSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [course?.materials, matSearch, matCategoryFilter]);

  // -------------------------------------------------------------
  // Students & Enrollment Handlers
  // -------------------------------------------------------------
  const filteredEnrollments = useMemo(() => {
    const enrollments = course?.enrollments || [];
    const q = studentSearch.trim().toLowerCase();
    if (!q) return enrollments;
    return enrollments.filter((e) => {
      const name = e.user?.name?.toLowerCase() || "";
      const email = e.user?.email?.toLowerCase() || "";
      return name.includes(q) || email.includes(q);
    });
  }, [course?.enrollments, studentSearch]);

  const handleUnenrollStudent = (enrollment: Enrollment) => {
    const studentName = enrollment.user?.name || enrollment.user?.email || "this student";
    setConfirmModal({
      isOpen: true,
      title: `Unenroll ${studentName}?`,
      description: `Remove ${studentName} from this course? They will lose access to course materials and lessons.`,
      variant: "warning",
      confirmText: "Unenroll Student",
      onConfirm: async () => {
        if (!enrollment.user?.id) return;
        try {
          await callTutorApi({
            action: "unenroll_student",
            studentId: enrollment.user.id,
            courseId,
          });
          await loadData(true);
          showToast("success", `${studentName} has been unenrolled.`);
        } catch (err: any) {
          showToast("error", err.message || "Failed to unenroll student.");
        }
      },
    });
  };

  // -------------------------------------------------------------
  // Live Classes Handlers
  // -------------------------------------------------------------
  const handleScheduleClass = async (e: FormEvent) => {
    e.preventDefault();
    if (!classTitle.trim() || !classDate) {
      showToast("error", "Class title and scheduled time are required.");
      return;
    }
    setIsSchedulingClass(true);
    try {
      await callTutorApi({
        action: "schedule_class",
        courseId,
        title: classTitle.trim(),
        description: classDescription.trim() || null,
        dueDate: classDate,
        meetingLink: classMeetLink.trim() || "https://meet.google.com/new",
        type: "LIVE_SEMINAR",
      });
      setClassTitle("");
      setClassDate("");
      setClassMeetLink("");
      setClassDescription("");
      await loadData(true);
      showToast("success", "Live class scheduled successfully!");
    } catch (err: any) {
      showToast("error", err.message || "Failed to schedule live class.");
    } finally {
      setIsSchedulingClass(false);
    }
  };

  const handleStartClass = async (eventItem: ClassEvent) => {
    setStartingClassId(eventItem.id);
    try {
      const res = await callTutorApi({
        action: "start_class",
        eventId: eventItem.id,
        meetingLink: eventItem.meetingLink,
      });
      await loadData(true);
      showToast("success", "Live class started!");
      if (res.meetingLink) {
        window.open(res.meetingLink, "_blank");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to start live class.");
    } finally {
      setStartingClassId(null);
    }
  };

  const handleEndClass = async (eventItem: ClassEvent) => {
    setEndingClassId(eventItem.id);
    try {
      await callTutorApi({
        action: "end_class",
        eventId: eventItem.id,
      });
      await loadData(true);
      showToast("success", "Live class session concluded.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to conclude class.");
    } finally {
      setEndingClassId(null);
    }
  };

  const handleDeleteClass = (eventItem: ClassEvent) => {
    setConfirmModal({
      isOpen: true,
      title: `Cancel Live Class "${eventItem.title}"?`,
      description: "This will remove this scheduled live class session from the calendar.",
      variant: "danger",
      confirmText: "Delete Session",
      onConfirm: async () => {
        try {
          await callTutorApi({ action: "delete_class", eventId: eventItem.id });
          await loadData(true);
          showToast("success", "Live class deleted.");
        } catch (err: any) {
          showToast("error", err.message || "Failed to delete live class.");
        }
      },
    });
  };

  // -------------------------------------------------------------
  // Render States
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <h2 className="text-base font-bold text-slate-800">Loading Tutor Course Workspace...</h2>
        <p className="text-xs text-slate-400 mt-1">Fetching syllabus, study materials, and student rosters...</p>
      </div>
    );
  }

  if (!course && !isNewCourse) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-6 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Individual Class Not Found</h2>
          <p className="text-xs text-slate-500">
            {bannerMsg?.text || "The requested class could not be located in your tutor teaching portfolio."}
          </p>
          <Link
            href="/tutor?tab=courses"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Tutor Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const totalLessons = course ? course.modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) : 0;
  const totalDurationMin = course
    ? course.modules.reduce(
        (sum, m) => sum + (m.lessons || []).reduce((lSum, l) => lSum + (l.durationMin || 0), 0),
        0
      )
    : 0;
  const totalTokensEarned = course ? course.price * (course.enrollments?.length || 0) : 0;

  const tabList: { id: Tab; label: string; count?: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "overview", label: isNewCourse ? "Individual Class Setup & Details" : "Class Details", icon: BookOpen },
    { id: "curriculum", label: "Curriculum & Syllabus", count: isNewCourse ? undefined : totalLessons, icon: Layers3 },
    { id: "materials", label: "Study Materials", count: isNewCourse ? undefined : course?.materials?.length, icon: FileText },
    { id: "students", label: "Enrolled Students", count: isNewCourse ? undefined : course?.enrollments?.length, icon: Users },
    { id: "live_classes", label: "Live Google Meets", count: isNewCourse ? undefined : course?.events?.length, icon: Video },
    { id: "reviews", label: "Reviews & Ratings", count: isNewCourse ? undefined : course?.reviews?.length, icon: Star },
  ];

  const currentStatus = course?.status || detailsForm.status;
  const statusBadgeColor =
    currentStatus === "PUBLISHED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : currentStatus === "PENDING_REVIEW"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : currentStatus === "DRAFT"
      ? "bg-slate-100 text-slate-700 border-slate-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/tutor?tab=courses"
              className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              title="Return to Tutor Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-black text-blue-600">
                  {isNewCourse ? "New Individual Class Creator" : "Tutor Class Workspace"}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-mono font-bold text-slate-500">
                  {detailsForm.subjectCode || (isNewCourse ? "NEW-SYLLABUS" : "COURSE-ID")}
                </span>
              </div>
              <h1 className="font-black text-base sm:text-lg text-slate-900 truncate leading-tight">
                {detailsForm.title || (isNewCourse ? "Create New Individual Class" : course?.title)}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isNewCourse ? (
              <Button
                onClick={handleSaveDetails}
                disabled={savingDetails || !detailsForm.title.trim() || !detailsForm.description.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-9 px-4 gap-1.5 shadow-xs cursor-pointer"
              >
                {savingDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{savingDetails ? "Creating Individual Class..." : "Create Individual Class"}</span>
              </Button>
            ) : (
              <>
                {/* Quick Status Selector */}
                <select
                  value={course?.status || "PUBLISHED"}
                  onChange={(e) => handleQuickStatusChange(e.target.value)}
                  className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusBadgeColor}`}
                  title="Change course publishing state"
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="DRAFT">Draft</option>
                </select>

                {/* Public Course Preview */}
                {course && (
                  <Link
                    href={`/courses/${course.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Preview Class</span>
                  </Link>
                )}

                {/* Delete Course Button */}
                <button
                  onClick={handleDeleteCourse}
                  className="h-9 w-9 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Delete this class"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Container ─────────────────────────────────────────────── */}
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner Alert Message */}
        {bannerMsg && (
          <div
            className={`rounded-2xl border px-4 py-3 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 ${
              bannerMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {bannerMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="truncate">{bannerMsg.text}</span>
            </div>
            <button
              onClick={() => setBannerMsg(null)}
              className="p-1 hover:opacity-75 cursor-pointer shrink-0"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Top Summary KPI Bar ───────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold text-slate-500">Enrolled Students</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{course?.enrollments?.length || 0}</div>
            <div className="text-[10px] text-slate-400">Active learners</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold text-slate-500">Modules</span>
              <Layers3 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{course?.modules?.length || (isNewCourse ? 1 : 0)}</div>
            <div className="text-[10px] text-slate-400">Curriculum units</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold text-slate-500">Total Lessons</span>
              <GraduationCap className="w-4 h-4 text-violet-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{totalLessons}</div>
            <div className="text-[10px] text-slate-400">
              {totalDurationMin > 0 ? `${Math.round(totalDurationMin / 60)}h ${totalDurationMin % 60}m` : "Self-paced"}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold text-slate-500">Study Files</span>
              <FileText className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{course?.materials?.length || 0}</div>
            <div className="text-[10px] text-slate-400">Handouts & slides</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold text-slate-500">Tuition Rate</span>
              <Coins className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600">{detailsForm.price || "10"}</div>
            <div className="text-[10px] text-slate-400">Tokens / enrollment</div>
          </div>
        </section>

        {/* ── Main Tabbed Section ────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          {/* Tab Navigation Header */}
          <div className="border-b border-slate-200 bg-slate-50/70 px-4 sm:px-6 pt-3 flex items-center overflow-x-auto gap-1 scrollbar-none">
            {tabList.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-bold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs"
                      : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60 rounded-t-xl"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isActive ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Individual Class Details & Settings */}
          {activeTab === "overview" && (
            <form onSubmit={handleSaveDetails} className="p-6 lg:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Individual Class Identification & Core Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure curriculum title, academic school, tuition tokens, cover image, and syllabus breakdown.
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={savingDetails}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 px-5 rounded-xl gap-2 shadow-xs cursor-pointer shrink-0"
                >
                  {savingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{savingDetails ? (isNewCourse ? "Creating Individual Class..." : "Saving Details...") : (isNewCourse ? "Create Individual Class & Continue" : "Save All Changes")}</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Class Title */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Individual Class Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={detailsForm.title}
                    onChange={(e) => setDetailsForm({ ...detailsForm, title: e.target.value })}
                    placeholder="e.g. Pure Mathematics & Mechanics Core"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                {/* Subject Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Subject Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={detailsForm.subjectCode}
                    onChange={(e) => setDetailsForm({ ...detailsForm, subjectCode: e.target.value })}
                    placeholder="e.g. MATH-AL-01"
                    className="h-10 text-xs rounded-xl font-mono uppercase"
                  />
                </div>

                {/* Academic Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Academic School / Category</label>
                  <select
                    value={detailsForm.category}
                    onChange={(e) => setDetailsForm({ ...detailsForm, category: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Enrollment Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Required Tuition Tokens <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Coins className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="number"
                      required
                      min="0"
                      step="0.5"
                      value={detailsForm.price}
                      onChange={(e) => setDetailsForm({ ...detailsForm, price: e.target.value })}
                      className="pl-9 h-10 text-xs rounded-xl font-bold"
                    />
                  </div>
                </div>

                {/* Academic Level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Academic Level</label>
                  <select
                    value={detailsForm.level}
                    onChange={(e) => setDetailsForm({ ...detailsForm, level: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ADVANCED">London A/L (Advanced)</option>
                    <option value="INTERMEDIATE">London O/L (Intermediate)</option>
                    <option value="FOUNDATION">Foundation / Preparatory</option>
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Publishing Status</label>
                  <select
                    value={detailsForm.status}
                    onChange={(e) => setDetailsForm({ ...detailsForm, status: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="PUBLISHED">Published (Available to Students)</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="DRAFT">Draft (Under Preparation)</option>
                  </select>
                </div>

                {/* Short Subtitle */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Course Tagline / Short Summary</label>
                  <Input
                    value={detailsForm.subtitle}
                    onChange={(e) => setDetailsForm({ ...detailsForm, subtitle: e.target.value })}
                    placeholder="Brief 1-sentence overview of the syllabus focus and expected outcomes..."
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                {/* Course Cover / Thumbnail */}
                <div className="md:col-span-3 space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Course Cover Thumbnail</label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-slate-200 rounded-2xl bg-slate-50/40">
                    <div className="w-32 h-20 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                      {detailsForm.thumbnail ? (
                        <img
                          src={detailsForm.thumbnail}
                          alt="Course Cover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-blue-600 hover:border-blue-300 cursor-pointer shadow-2xs">
                          {isUploadingThumb ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-blue-500" />
                          )}
                          <span>{isUploadingThumb ? "Uploading..." : "Upload New Image"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailUpload}
                            disabled={isUploadingThumb}
                            className="sr-only"
                          />
                        </label>
                        <span className="text-[11px] text-slate-400">or enter image URL directly:</span>
                      </div>
                      <Input
                        value={detailsForm.thumbnail}
                        onChange={(e) => setDetailsForm({ ...detailsForm, thumbnail: e.target.value })}
                        placeholder="https://example.com/course-cover.jpg"
                        className="h-9 text-xs rounded-xl bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Full Course Description */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Comprehensive Course Syllabus Description</label>
                  <textarea
                    rows={6}
                    value={detailsForm.description}
                    onChange={(e) => setDetailsForm({ ...detailsForm, description: e.target.value })}
                    placeholder="Elaborate on prerequisites, learning objectives, exam board specifications, and weekly milestones..."
                    className="w-full rounded-2xl border border-slate-200 p-4 text-xs font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button
                  type="submit"
                  disabled={savingDetails}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 px-6 rounded-xl gap-2 shadow-xs cursor-pointer"
                >
                  {savingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{savingDetails ? (isNewCourse ? "Creating Individual Class..." : "Saving Details...") : (isNewCourse ? "Create Individual Class & Open Workspace" : "Save All Changes")}</span>
                </Button>
              </div>
            </form>
          )}

          {/* If new course, show guidance on other tabs */}
          {isNewCourse && activeTab !== "overview" && (
            <div className="p-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
                <Layers3 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-slate-900">
                  Save Class Details to Unlock {tabList.find((t) => t.id === activeTab)?.label}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fill in the class specifications, title, and description in the Class Details tab, then click <strong>Create Individual Class &amp; Open Workspace</strong> to activate the curriculum builder, study file uploads, and student rosters.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setActiveTab("overview")}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Go to Class Details Form
              </Button>
            </div>
          )}

          {/* Tab 2: Curriculum & Syllabus Builder */}
          {!isNewCourse && activeTab === "curriculum" && course && (
            <div className="p-6 lg:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Curriculum & Syllabus Architecture</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Structure units into sequential modules and configure video lessons, durations, and free previews.
                  </p>
                </div>
              </div>

              {/* Add New Module Form */}
              <form
                onSubmit={handleAddModule}
                className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row items-center gap-3"
              >
                <div className="relative flex-1 w-full">
                  <FolderPlus className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    required
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    placeholder="Enter new syllabus module title (e.g. Unit 3: Differential Calculus)..."
                    className="pl-9 h-10 bg-white rounded-xl text-xs"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={addingModule || !newModuleTitle.trim()}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 px-5 rounded-xl gap-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  {addingModule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Add Module</span>
                </Button>
              </form>

              {/* Modules List */}
              {(course?.modules?.length || 0) === 0 ? (
                <div className="text-center py-16 px-4 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                  <Layers3 className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-sm text-slate-700">No Curriculum Modules Added</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Get started by creating your first module using the form above to add lessons, videos, and study topics.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(course?.modules || []).map((mod, modIdx) => {
                    const isAddingLessonHere = activeModuleForLesson === mod.id;
                    const modLessons = mod.lessons || [];
                    const modDuration = modLessons.reduce((sum, l) => sum + (l.durationMin || 0), 0);

                    return (
                      <div
                        key={mod.id}
                        className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs transition-shadow hover:shadow-xs"
                      >
                        {/* Module Header Bar */}
                        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {modIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <h3 className="font-black text-sm text-slate-900 truncate">{mod.title}</h3>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                <span>{modLessons.length} {modLessons.length === 1 ? "Lesson" : "Lessons"}</span>
                                <span>•</span>
                                <span>{modDuration} mins total</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (isAddingLessonHere) {
                                  setActiveModuleForLesson(null);
                                } else {
                                  setActiveModuleForLesson(mod.id);
                                  setLessonForm({ title: "", durationMin: "30", videoUrl: "", isFreePreview: false });
                                }
                              }}
                              className="h-8 text-xs font-bold rounded-xl gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Lesson</span>
                            </Button>

                            <button
                              onClick={() => setEditingModule({ id: mod.id, title: mod.title })}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Rename Module"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteModule(mod)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Module"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Module Rename Form */}
                        {editingModule?.id === mod.id && (
                          <form
                            onSubmit={handleUpdateModule}
                            className="p-3 bg-amber-50/60 border-b border-amber-200 flex items-center gap-2"
                          >
                            <Input
                              required
                              value={editingModule.title}
                              onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                              className="h-8 text-xs bg-white rounded-lg flex-1"
                            />
                            <Button type="submit" size="sm" className="h-8 text-xs bg-blue-600 text-white rounded-lg">
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingModule(null)}
                              className="h-8 text-xs rounded-lg px-2"
                            >
                              Cancel
                            </Button>
                          </form>
                        )}

                        {/* Add Lesson Form for this Module */}
                        {isAddingLessonHere && (
                          <div className="p-4 bg-blue-50/40 border-b border-blue-100 space-y-3 animate-in fade-in">
                            <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                              <PlayCircle className="w-4 h-4 text-blue-600" />
                              <span>New Lesson in Module {modIdx + 1}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                              <div className="sm:col-span-5">
                                <Input
                                  placeholder="Lesson title (e.g. Fundamental Theorem Proofs)..."
                                  value={lessonForm.title}
                                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                                  className="h-9 text-xs bg-white rounded-xl"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Mins"
                                  value={lessonForm.durationMin}
                                  onChange={(e) => setLessonForm({ ...lessonForm, durationMin: e.target.value })}
                                  className="h-9 text-xs bg-white rounded-xl"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <Input
                                  placeholder="Video URL (YouTube/Vimeo/MP4)..."
                                  value={lessonForm.videoUrl}
                                  onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                                  className="h-9 text-xs bg-white rounded-xl"
                                />
                              </div>
                              <div className="sm:col-span-2 flex items-center justify-end gap-2">
                                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={lessonForm.isFreePreview}
                                    onChange={(e) =>
                                      setLessonForm({ ...lessonForm, isFreePreview: e.target.checked })
                                    }
                                    className="rounded text-blue-600 h-3.5 w-3.5"
                                  />
                                  <span>Free Preview</span>
                                </label>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveModuleForLesson(null)}
                                className="h-8 text-xs rounded-xl"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleAddLesson(mod.id)}
                                className="h-8 text-xs bg-blue-600 text-white rounded-xl gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Save Lesson</span>
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Lessons List in Module */}
                        <div className="p-4 space-y-2">
                          {modLessons.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-400 font-medium">
                              No lessons inside this module yet. Click "+ Add Lesson" above.
                            </div>
                          ) : (
                            modLessons.map((lesson, lIdx) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 font-mono text-[11px] flex items-center justify-center shrink-0">
                                    {lIdx + 1}
                                  </span>
                                  <PlayCircle className="w-4 h-4 text-blue-500 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="font-bold text-xs text-slate-900 truncate">
                                      {lesson.title}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                      <span className="flex items-center gap-1">
                                        <Clock3 className="w-3 h-3" />
                                        {lesson.durationMin} mins
                                      </span>
                                      {lesson.isFreePreview && (
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1.5 py-0">
                                          Free Preview
                                        </Badge>
                                      )}
                                      {lesson.videoUrl && (
                                        <a
                                          href={lesson.videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-500 hover:underline flex items-center gap-0.5"
                                        >
                                          <span>Video Link</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() =>
                                      setEditingLesson({
                                        id: lesson.id,
                                        moduleId: mod.id,
                                        title: lesson.title,
                                        durationMin: String(lesson.durationMin || 30),
                                        videoUrl: lesson.videoUrl || "",
                                        isFreePreview: Boolean(lesson.isFreePreview),
                                      })
                                    }
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded-md cursor-pointer"
                                    title="Edit Lesson"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLesson(lesson)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                                    title="Delete Lesson"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Edit Lesson Modal */}
              {editingLesson && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-sm text-slate-900">Edit Lesson Details</h3>
                      <button
                        onClick={() => setEditingLesson(null)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleUpdateLesson} className="space-y-3 text-xs">
                      <div>
                        <label className="font-bold block mb-1">Lesson Title</label>
                        <Input
                          required
                          value={editingLesson.title}
                          onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold block mb-1">Duration (Minutes)</label>
                          <Input
                            type="number"
                            min="1"
                            value={editingLesson.durationMin}
                            onChange={(e) =>
                              setEditingLesson({ ...editingLesson, durationMin: e.target.value })
                            }
                            className="rounded-xl"
                          />
                        </div>
                        <div className="flex items-center pt-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingLesson.isFreePreview}
                              onChange={(e) =>
                                setEditingLesson({ ...editingLesson, isFreePreview: e.target.checked })
                              }
                              className="rounded text-blue-600 h-4 w-4"
                            />
                            <span className="font-bold">Allow Free Preview</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="font-bold block mb-1">Class Video URL</label>
                        <Input
                          placeholder="https://youtube.com/watch?v=..."
                          value={editingLesson.videoUrl}
                          onChange={(e) => setEditingLesson({ ...editingLesson, videoUrl: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>

                      <div className="pt-3 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingLesson(null)}
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" className="bg-blue-600 text-white rounded-xl">
                          Save Lesson Changes
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Study Materials & Vaults */}
          {!isNewCourse && activeTab === "materials" && course && (
            <div className="p-6 lg:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Course Materials & Document Repository</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload and publish handouts, problem sheets, formula booklets, and class slides directly.
                  </p>
                </div>
              </div>

              {/* Upload Material Card */}
              <form
                onSubmit={handleUploadMaterial}
                className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    Upload & Publish Resource
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Accessible to Enrolled Students
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Document Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Unit 2 Mechanics Formula Handbook"
                      value={matTitle}
                      onChange={(e) => setMatTitle(e.target.value)}
                      className="bg-white rounded-xl h-10"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Document Classification</label>
                    <select
                      value={matCategory}
                      onChange={(e) => setMatCategory(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium"
                    >
                      {MATERIAL_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Topic Notes / Instructions</label>
                    <Input
                      placeholder="Optional brief description of what this handout covers..."
                      value={matDesc}
                      onChange={(e) => setMatDesc(e.target.value)}
                      className="bg-white rounded-xl h-10"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">
                      Resource File <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      required
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setMatFile(file);
                        if (file && !matTitle) {
                          const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
                          setMatTitle(cleanName);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-white p-1 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={uploadingMat || !matFile}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-6 rounded-xl gap-2 cursor-pointer shadow-xs"
                  >
                    {uploadingMat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{uploadingMat ? "Uploading File..." : "Publish Material to Course"}</span>
                  </Button>
                </div>
              </form>

              {/* Published Materials List & Filter Header */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-black text-sm text-slate-900">
                    Published Study Files ({filteredMaterials.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Search materials..."
                        value={matSearch}
                        onChange={(e) => setMatSearch(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-xl"
                      />
                    </div>
                    <select
                      value={matCategoryFilter}
                      onChange={(e) => setMatCategoryFilter(e.target.value)}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700"
                    >
                      <option value="ALL">All Categories</option>
                      {MATERIAL_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredMaterials.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1.5">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                    <h4 className="font-bold text-xs text-slate-700">No Study Materials Match</h4>
                    <p className="text-[11px] text-slate-400">
                      {matSearch ? "Try adjusting your search query." : "Upload documents using the form above."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredMaterials.map((mat) => (
                      <div
                        key={mat.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 transition-colors flex flex-col justify-between space-y-3 shadow-2xs"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              {mat.category ? mat.category.replace(/_/g, " ") : "HANDOUT"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {mat.fileSize || "1.5 MB"}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-1">
                            {mat.title}
                          </h4>
                          {mat.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2">{mat.description}</p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <a
                            href={mat.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download / View</span>
                          </a>
                          <button
                            onClick={() => handleDeleteMaterial(mat)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Delete Material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Enrolled Scholars & Students */}
          {!isNewCourse && activeTab === "students" && course && (
            <div className="p-6 lg:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Enrolled Student Roster</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View active course participants, learning progress, and student contact details.
                  </p>
                </div>
              </div>

              {/* Enrolled Students Table */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-black text-sm text-slate-900">
                    Active Learners ({filteredEnrollments.length})
                  </h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search enrolled students..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                {filteredEnrollments.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1.5">
                    <Users className="w-8 h-8 text-slate-300 mx-auto" />
                    <h4 className="font-bold text-xs text-slate-700">No Students Enrolled</h4>
                    <p className="text-[11px] text-slate-400">
                      {studentSearch ? "No students matched your search query." : "Students who enroll in this course will appear here."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
                    {filteredEnrollments.map((enrollment) => {
                      const user = enrollment.user;
                      const dateStr = enrollment.enrolledAt
                        ? new Date(enrollment.enrolledAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Enrolled";

                      return (
                        <div
                          key={enrollment.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-10 w-10 rounded-xl border border-slate-200">
                              <AvatarImage src={user?.avatar || ""} />
                              <AvatarFallback className="bg-blue-50 text-blue-700 font-bold text-xs">
                                {(user?.name || user?.email || "ST").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-black text-xs text-slate-900 truncate">
                                {user?.name || "Student Participant"}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                              {user?.phone && (
                                <div className="text-[10px] text-slate-400">{user.phone}</div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                            <span className="text-[11px] text-slate-400 font-medium">
                              Enrolled {dateStr}
                            </span>
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              <Check className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnenrollStudent(enrollment)}
                              className="h-8 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl gap-1"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Unenroll</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 5: Live Classes & Google Meet Hub */}
          {!isNewCourse && activeTab === "live_classes" && course && (
            <div className="p-6 lg:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Live Classes & Google Meet Sessions</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Schedule live tutorial sessions, webinars, and interactive past-paper discussions for this course.
                  </p>
                </div>
              </div>

              {/* Schedule New Live Class Form */}
              <form
                onSubmit={handleScheduleClass}
                className="p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4"
              >
                <div className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-violet-600" />
                  Schedule Live Google Meet Class
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-bold text-slate-700">
                      Class Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Unit 3 Problem Solving Workshop & Past Paper Q&A"
                      value={classTitle}
                      onChange={(e) => setClassTitle(e.target.value)}
                      className="bg-white rounded-xl h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">
                      Session Date & Time <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="datetime-local"
                      required
                      value={classDate}
                      onChange={(e) => setClassDate(e.target.value)}
                      className="bg-white rounded-xl h-10 text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-bold text-slate-700">Google Meet / Video Link</label>
                    <Input
                      placeholder="https://meet.google.com/new or custom room link"
                      value={classMeetLink}
                      onChange={(e) => setClassMeetLink(e.target.value)}
                      className="bg-white rounded-xl h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Brief Agenda / Topic Focus</label>
                    <Input
                      placeholder="e.g. Mechanics formulas review"
                      value={classDescription}
                      onChange={(e) => setClassDescription(e.target.value)}
                      className="bg-white rounded-xl h-10"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSchedulingClass}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs h-10 px-6 rounded-xl gap-2 cursor-pointer shadow-xs"
                  >
                    {isSchedulingClass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    <span>{isSchedulingClass ? "Scheduling Session..." : "Schedule Live Class"}</span>
                  </Button>
                </div>
              </form>

              {/* Sessions List */}
              <div className="space-y-4">
                <h3 className="font-black text-sm text-slate-900">
                  Scheduled & Past Live Sessions ({course?.events?.length || 0})
                </h3>

                {(course?.events?.length || 0) === 0 ? (
                  <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1.5">
                    <Video className="w-8 h-8 text-slate-300 mx-auto" />
                    <h4 className="font-bold text-xs text-slate-700">No Live Classes Scheduled</h4>
                    <p className="text-[11px] text-slate-400">
                      Use the schedule form above to add upcoming live sessions for this course.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(course?.events || []).map((eventItem) => {
                      const isLive = eventItem.status === "LIVE";
                      const isCompleted = eventItem.status === "COMPLETED";
                      const eventTime = new Date(eventItem.dueDate).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={eventItem.id}
                          className={`p-4 rounded-2xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            isLive
                              ? "bg-rose-50/50 border-rose-200"
                              : isCompleted
                              ? "bg-slate-50/50 border-slate-200"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`text-[10px] ${
                                  isLive
                                    ? "bg-rose-600 text-white animate-pulse"
                                    : isCompleted
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-violet-100 text-violet-800"
                                }`}
                              >
                                {isLive ? "LIVE NOW" : eventItem.status}
                              </Badge>
                              <span className="text-xs font-mono font-medium text-slate-500">
                                {eventTime}
                              </span>
                            </div>
                            <h4 className="font-black text-xs sm:text-sm text-slate-900 truncate">
                              {eventItem.title}
                            </h4>
                            {eventItem.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1">{eventItem.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {isLive ? (
                              <>
                                <a
                                  href={eventItem.meetingLink || "https://meet.google.com"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
                                >
                                  <Radio className="w-3.5 h-3.5" />
                                  <span>Enter Class Room</span>
                                </a>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={endingClassId === eventItem.id}
                                  onClick={() => handleEndClass(eventItem)}
                                  className="rounded-xl text-xs font-bold"
                                >
                                  {endingClassId === eventItem.id ? "Ending..." : "End Class"}
                                </Button>
                              </>
                            ) : isCompleted ? (
                              <Badge className="bg-slate-100 text-slate-600 text-xs">Concluded</Badge>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  disabled={startingClassId === eventItem.id}
                                  onClick={() => handleStartClass(eventItem)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl gap-1.5"
                                >
                                  {startingClassId === eventItem.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5" />
                                  )}
                                  <span>Launch Now</span>
                                </Button>
                                {eventItem.meetingLink && (
                                  <a
                                    href={eventItem.meetingLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-50"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </>
                            )}

                            <button
                              onClick={() => handleDeleteClass(eventItem)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Delete Session"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 6: Course Reviews & Student Feedback */}
          {!isNewCourse && activeTab === "reviews" && course && (
            <div className="p-6 lg:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Student Reviews & Academic Feedback</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verified feedback and star ratings submitted by enrolled students.
                  </p>
                </div>
              </div>

              {(course?.reviews?.length || 0) > 0 ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center gap-4">
                    <div className="text-3xl font-black text-amber-800">
                      {(
                        (course?.reviews || []).reduce((s, r) => s + r.rating, 0) /
                        (course?.reviews?.length || 1)
                      ).toFixed(1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <Star key={st} className="w-4 h-4 text-amber-500 fill-amber-500" />
                        ))}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Based on {course?.reviews?.length || 0} verified student reviews
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
                    {(course?.reviews || []).map((rev) => (
                      <div key={rev.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={rev.user?.avatar || ""} />
                              <AvatarFallback className="text-[10px] bg-slate-100 font-bold">
                                {(rev.user?.name || "ST").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-xs text-slate-900">
                              {rev.user?.name || rev.user?.email || "Student"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(rev.rating)].map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            ))}
                          </div>
                        </div>
                        {rev.comment && <p className="text-xs text-slate-600">{rev.comment}</p>}
                        <div className="text-[10px] text-slate-400">
                          {new Date(rev.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1.5">
                  <Star className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-xs text-slate-700">No Student Reviews Yet</h4>
                  <p className="text-[11px] text-slate-400">
                    Once enrolled students submit ratings and feedback for this course, they will appear here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Global Confirmation Modal ─────────────────────────────────── */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />
    </main>
  );
}

export default function TutorEditCourseWorkspacePage({
  isNewCourseProp,
}: {
  isNewCourseProp?: boolean;
} = {}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <h2 className="text-base font-bold text-slate-800">Loading Tutor Class Workspace...</h2>
          <p className="text-xs text-slate-400 mt-1">Fetching syllabus, study materials, and student rosters...</p>
        </div>
      }
    >
      <TutorCourseWorkspaceContent isNewCourseProp={isNewCourseProp} />
    </Suspense>
  );
}

