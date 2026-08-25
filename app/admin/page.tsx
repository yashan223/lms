"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  GraduationCap,
  Users,
  BookOpen,
  FileCheck2,
  TrendingUp,
  Search,
  Plus,
  ArrowLeft,
  Calendar,
  DollarSign,
  Download,
  Layers,
  Award,
  ShieldCheck,
  FileText,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserPlus,
  CreditCard,
  Settings,
  Clock,
  Eye,
  Sliders,
  Menu,
  X,
  LogOut,
  UserCheck,
  KeyRound,
  PlayCircle,
  FolderPlus,
  Sparkles,
  Phone,
  Upload,
  Loader2,
  RefreshCw,
  Video,
  Radio,
} from "lucide-react";
import { buildGoogleCalendarUrl } from "@/lib/calendar";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "live_classes" | "users" | "courses" | "finances"
  >("overview");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);

  // Live Class Hub States
  const [liveClassFilter, setLiveClassFilter] = useState<"ALL" | "LIVE" | "SCHEDULED" | "COMPLETED">("ALL");
  const [liveClassSearch, setLiveClassSearch] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [startingClassId, setStartingClassId] = useState<string | null>(null);
  const [endingClassId, setEndingClassId] = useState<string | null>(null);

  // New Live Class Form States
  const [newClassTitle, setNewClassTitle] = useState("");
  const [newClassCourseId, setNewClassCourseId] = useState("");
  const [newClassTutorId, setNewClassTutorId] = useState("");
  const [newClassStudentId, setNewClassStudentId] = useState("");
  const [newClassDate, setNewClassDate] = useState("");
  const [newClassMeetingLink, setNewClassMeetingLink] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [newClassType, setNewClassType] = useState("LIVE_SEMINAR");
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);

  // User Management State
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showEnrollUserModal, setShowEnrollUserModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any>(null);

  // New/Edit User Form Fields
  const [formUserName, setFormUserName] = useState("");
  const [formUserEmail, setFormUserEmail] = useState("");
  const [formUserPhone, setFormUserPhone] = useState("");
  const [formUserPassword, setFormUserPassword] = useState("");
  const [formUserRole, setFormUserRole] = useState("STUDENT");
  const [formUserHeadline, setFormUserHeadline] = useState("");
  const [formUserBio, setFormUserBio] = useState("");
  const [selectedCourseToEnroll, setSelectedCourseToEnroll] = useState("");

  // Course Management State
  const [courseSearch, setCourseSearch] = useState("");
  const [courseCatFilter, setCourseCatFilter] = useState("ALL");
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [showManageSyllabusModal, setShowManageSyllabusModal] = useState(false);
  const [selectedCourseForEdit, setSelectedCourseForEdit] = useState<any>(null);
  const [selectedCourseForSyllabus, setSelectedCourseForSyllabus] = useState<any>(null);

  // New/Edit Course Form Fields
  const [courseFormTitle, setCourseFormTitle] = useState("");
  const [courseFormCode, setCourseFormCode] = useState("");
  const [courseFormCategory, setCourseFormCategory] = useState("School of Mathematics & Computing");
  const [courseFormPrice, setCourseFormPrice] = useState("95");
  const [courseFormLevel, setCourseFormLevel] = useState("ADVANCED");
  const [courseFormStatus, setCourseFormStatus] = useState("PUBLISHED");
  const [courseFormSubtitle, setCourseFormSubtitle] = useState("");
  const [courseFormInstructorId, setCourseFormInstructorId] = useState("");

  // Syllabus Module & Lesson State
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDuration, setNewLessonDuration] = useState("30");
  const [selectedModuleIdForLesson, setSelectedModuleIdForLesson] = useState("");

  // Course Material & File Management State
  const [showManageMaterialsModal, setShowManageMaterialsModal] = useState(false);
  const [selectedCourseForMaterials, setSelectedCourseForMaterials] = useState<any>(null);
  const [matFormTitle, setMatFormTitle] = useState("");
  const [matFormCategory, setMatFormCategory] = useState("HANDOUT");
  const [matFormDesc, setMatFormDesc] = useState("");
  const [selectedMatUploadFile, setSelectedMatUploadFile] = useState<File | null>(null);
  const [uploadingCourseMaterial, setUploadingCourseMaterial] = useState(false);
  const [materialStatusMsg, setMaterialStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [matSearchQuery, setMatSearchQuery] = useState("");

  // Confirmation modal state
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void> | void;
    variant: "danger" | "warning" | "info" | "success";
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
    variant: "info",
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Admin logout error:", err);
    } finally {
      window.location.href = "/login";
    }
  };

  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch live database records from PostgreSQL
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await fetch("/api/admin", {
        cache: "no-store",
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsersList(data.allUsers || []);
        setCoursesList(data.courses || []);
        setFacultyList(data.faculty || []);
        setEventsList(data.events || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setFetchError(errData.error || "Failed to load academy records from server");
      }
    } catch (err: any) {
      console.error("Admin data fetch error:", err);
      setFetchError(err.message || "Unable to connect to administration server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Real-time multi-user live synchronization via SSE
  useRealtimeSync({
    onSync: () => {
      fetchAdminData();
    },
  });

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return allUsersList.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.headline && u.headline.toLowerCase().includes(userSearch.toLowerCase()));
      const matchesRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [allUsersList, userSearch, userRoleFilter]);

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    return coursesList.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
        (c.subjectCode && c.subjectCode.toLowerCase().includes(courseSearch.toLowerCase())) ||
        (c.category && c.category.toLowerCase().includes(courseSearch.toLowerCase()));
      const matchesCat = courseCatFilter === "ALL" || c.category === courseCatFilter;
      return matchesSearch && matchesCat;
    });
  }, [coursesList, courseSearch, courseCatFilter]);

  // Financial calculations
  const totalEnrollmentsCount = useMemo(() => {
    return coursesList.reduce((acc, c) => acc + (c.enrollments?.length || 0), 0);
  }, [coursesList]);

  const totalCalculatedRevenue = useMemo(() => {
    return coursesList.reduce((acc, c) => {
      const count = c.enrollments?.length || 0;
      return acc + count * (c.price || 95);
    }, 0);
  }, [coursesList]);

  // ========================================================
  // USER HANDLERS
  // ========================================================
  const handleOpenAddUser = () => {
    setFormUserName("");
    setFormUserEmail("");
    setFormUserPhone("");
    setFormUserPassword("StudentPass123!");
    setFormUserRole("STUDENT");
    setFormUserHeadline("London A/L Pure Maths Scholar");
    setFormUserBio("Enrolled in London A/L & O/L masterclass syllabus.");
    setShowAddUserModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_user",
          name: formUserName,
          email: formUserEmail,
          phone: formUserPhone,
          password: formUserPassword,
          role: formUserRole,
          headline: formUserHeadline,
          bio: formUserBio,
        }),
      });

      if (res.ok) {
        setShowAddUserModal(false);
        fetchAdminData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create user");
      }
    } catch (err) {
      console.error("Error creating user:", err);
    }
  };

  const handleOpenEditUser = (user: any) => {
    setSelectedUserForEdit(user);
    setFormUserName(user.name);
    setFormUserEmail(user.email);
    setFormUserPhone(user.phone || "");
    setFormUserRole(user.role);
    setFormUserHeadline(user.headline || "");
    setFormUserBio(user.bio || "");
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_user",
          userId: selectedUserForEdit.id,
          name: formUserName,
          email: formUserEmail,
          phone: formUserPhone,
          role: formUserRole,
          headline: formUserHeadline,
          bio: formUserBio,
        }),
      });

      if (res.ok) {
        setShowEditUserModal(false);
        fetchAdminData();
      }
    } catch (err) {
      console.error("Error updating user:", err);
    }
  };

  const handleDeleteUser = (user: any) => {
    setConfirmModalData({
      isOpen: true,
      title: `Delete User: ${user.name}?`,
      description: `This will permanently remove ${user.name} (${user.email}) and all related enrollments from academy records.`,
      variant: "danger",
      onConfirm: async () => {
        try {
          await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete_user",
              userId: user.id,
            }),
          });
          fetchAdminData();
        } catch (err) {
          console.error("Error deleting user:", err);
        } finally {
          setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleOpenEnrollUser = (user: any) => {
    setSelectedUserForEdit(user);
    if (coursesList.length > 0) {
      setSelectedCourseToEnroll(coursesList[0].id);
    }
    setShowEnrollUserModal(true);
  };

  const handleEnrollUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit || !selectedCourseToEnroll) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enroll_user",
          userId: selectedUserForEdit.id,
          courseId: selectedCourseToEnroll,
        }),
      });

      if (res.ok) {
        setShowEnrollUserModal(false);
        fetchAdminData();
      }
    } catch (err) {
      console.error("Error enrolling user:", err);
    }
  };

  // ========================================================
  // COURSE HANDLERS
  // ========================================================
  const handleOpenAddCourse = () => {
    setCourseFormTitle("");
    setCourseFormCode("MATH-AS-01");
    setCourseFormCategory("School of Mathematics & Computing");
    setCourseFormPrice("95");
    setCourseFormLevel("ADVANCED");
    setCourseFormStatus("PUBLISHED");
    setCourseFormSubtitle("Comprehensive syllabus lecture walkthroughs, unit proofs, and problem sets.");
    if (facultyList.length > 0) {
      setCourseFormInstructorId(facultyList[0].id);
    }
    setShowAddCourseModal(true);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_course",
          title: courseFormTitle,
          subjectCode: courseFormCode,
          category: courseFormCategory,
          price: courseFormPrice,
          level: courseFormLevel,
          status: courseFormStatus,
          subtitle: courseFormSubtitle,
          instructorId: courseFormInstructorId,
        }),
      });

      if (res.ok) {
        setShowAddCourseModal(false);
        fetchAdminData();
      }
    } catch (err) {
      console.error("Error creating course:", err);
    }
  };

  const handleOpenEditCourse = (course: any) => {
    setSelectedCourseForEdit(course);
    setCourseFormTitle(course.title);
    setCourseFormCode(course.subjectCode || "");
    setCourseFormCategory(course.category);
    setCourseFormPrice(course.price.toString());
    setCourseFormLevel(course.level);
    setCourseFormStatus(course.status);
    setCourseFormSubtitle(course.subtitle || "");
    setCourseFormInstructorId(course.instructorId || "");
    setShowEditCourseModal(true);
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForEdit) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_course",
          courseId: selectedCourseForEdit.id,
          title: courseFormTitle,
          subjectCode: courseFormCode,
          category: courseFormCategory,
          price: courseFormPrice,
          level: courseFormLevel,
          status: courseFormStatus,
          subtitle: courseFormSubtitle,
          instructorId: courseFormInstructorId,
        }),
      });

      if (res.ok) {
        setShowEditCourseModal(false);
        fetchAdminData();
      }
    } catch (err) {
      console.error("Error updating course:", err);
    }
  };

  const handleDeleteCourse = (course: any) => {
    setConfirmModalData({
      isOpen: true,
      title: `Delete Course: ${course.title}?`,
      description: `This will delete the entire syllabus, including all modules, video lessons, and student enrollments.`,
      variant: "danger",
      onConfirm: async () => {
        try {
          await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete_course",
              courseId: course.id,
            }),
          });
          fetchAdminData();
        } catch (err) {
          console.error("Error deleting course:", err);
        } finally {
          setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForSyllabus || !newModuleTitle) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_module",
          courseId: selectedCourseForSyllabus.id,
          title: newModuleTitle,
        }),
      });

      if (res.ok) {
        setNewModuleTitle("");
        await fetchAdminData();
        const updatedRes = await fetch("/api/admin");
        const data = await updatedRes.json();
        const updatedCourse = data.courses.find((c: any) => c.id === selectedCourseForSyllabus.id);
        setSelectedCourseForSyllabus(updatedCourse);
      }
    } catch (err) {
      console.error("Error adding module:", err);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_module",
          moduleId,
        }),
      });
      await fetchAdminData();
      const updatedRes = await fetch("/api/admin");
      const data = await updatedRes.json();
      const updatedCourse = data.courses.find((c: any) => c.id === selectedCourseForSyllabus.id);
      setSelectedCourseForSyllabus(updatedCourse);
    } catch (err) {
      console.error("Error deleting module:", err);
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleIdForLesson || !newLessonTitle) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_lesson",
          moduleId: selectedModuleIdForLesson,
          title: newLessonTitle,
          durationMin: newLessonDuration,
          isFreePreview: true,
        }),
      });

      if (res.ok) {
        setNewLessonTitle("");
        setSelectedModuleIdForLesson("");
        await fetchAdminData();
        const updatedRes = await fetch("/api/admin");
        const data = await updatedRes.json();
        const updatedCourse = data.courses.find((c: any) => c.id === selectedCourseForSyllabus.id);
        setSelectedCourseForSyllabus(updatedCourse);
      }
    } catch (err) {
      console.error("Error adding lesson:", err);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_lesson",
          lessonId,
        }),
      });
      await fetchAdminData();
      const updatedRes = await fetch("/api/admin");
      const data = await updatedRes.json();
      const updatedCourse = data.courses.find((c: any) => c.id === selectedCourseForSyllabus.id);
      setSelectedCourseForSyllabus(updatedCourse);
    } catch (err) {
      console.error("Error deleting lesson:", err);
    }
  };

  // ========================================================
  // COURSE MATERIAL / FILE HANDLERS
  // ========================================================
  const handleOpenManageMaterials = (course: any) => {
    setSelectedCourseForMaterials(course);
    setMatFormTitle("");
    setMatFormCategory("HANDOUT");
    setMatFormDesc("");
    setSelectedMatUploadFile(null);
    setMaterialStatusMsg(null);
    setMatSearchQuery("");
    setShowManageMaterialsModal(true);
  };

  const handleUploadCourseMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForMaterials || !selectedMatUploadFile || !matFormTitle.trim()) {
      setMaterialStatusMsg({ type: "error", text: "Please select a file and provide a title." });
      return;
    }

    try {
      setUploadingCourseMaterial(true);
      setMaterialStatusMsg(null);

      // 1. Upload to VPS storage
      const formData = new FormData();
      formData.append("file", selectedMatUploadFile);
      formData.append("isPrivate", "false");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setMaterialStatusMsg({ type: "error", text: uploadData.error || "File upload failed" });
        return;
      }

      // 2. Link material in academy records via admin
      const saveRes = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_course_material",
          courseId: selectedCourseForMaterials.id,
          title: matFormTitle.trim(),
          description: matFormDesc.trim() || null,
          fileUrl: uploadData.fileUrl,
          fileSize: uploadData.fileSize,
          fileType: uploadData.mimeType,
          category: matFormCategory,
        }),
      });

      if (saveRes.ok) {
        setMaterialStatusMsg({ type: "success", text: "Course file published successfully!" });
        setMatFormTitle("");
        setMatFormDesc("");
        setSelectedMatUploadFile(null);

        await fetchAdminData();
        const updatedRes = await fetch("/api/admin");
        const data = await updatedRes.json();
        const updatedCourse = data.courses.find((c: any) => c.id === selectedCourseForMaterials.id);
        if (updatedCourse) setSelectedCourseForMaterials(updatedCourse);
      } else {
        const err = await saveRes.json();
        setMaterialStatusMsg({ type: "error", text: err.error || "Failed to record material." });
      }
    } catch (err) {
      console.error("Course file upload error:", err);
      setMaterialStatusMsg({ type: "error", text: "Connection error during file upload." });
    } finally {
      setUploadingCourseMaterial(false);
    }
  };

  const handleDeleteCourseMaterial = (mat: any) => {
    setConfirmModalData({
      isOpen: true,
      title: `Delete File: ${mat.title}?`,
      description: `This will permanently remove this material from student download portals.`,
      variant: "danger",
      onConfirm: async () => {
        try {
          await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete_course_material",
              materialId: mat.id,
            }),
          });
          await fetchAdminData();
          const updatedRes = await fetch("/api/admin");
          const data = await updatedRes.json();
          const updatedCourse = data.courses.find((c: any) => c.id === selectedCourseForMaterials?.id);
          if (updatedCourse) setSelectedCourseForMaterials(updatedCourse);
        } catch (err) {
          console.error("Error deleting course material:", err);
        }
      },
    });
  };

  // ========================================================
  // LIVE CLASS & GOOGLE MEET HANDLERS
  // ========================================================
  const handleStartClass = async (event: any) => {
    try {
      setStartingClassId(event.id);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_class",
          eventId: event.id,
          meetingLink: event.meetingLink,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const linkToOpen = data.meetingLink || event.meetingLink;
        if (linkToOpen) {
          window.open(linkToOpen, "_blank");
        }
        await fetchAdminData();
      }
    } catch (err) {
      console.error("Error starting live class:", err);
    } finally {
      setStartingClassId(null);
    }
  };

  const handleEndClass = async (event: any) => {
    try {
      setEndingClassId(event.id);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_class",
          eventId: event.id,
        }),
      });

      if (res.ok) {
        await fetchAdminData();
      }
    } catch (err) {
      console.error("Error ending class:", err);
    } finally {
      setEndingClassId(null);
    }
  };

  const handleScheduleLiveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassTitle.trim() || !newClassDate) return;
    try {
      setIsSubmittingClass(true);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule_class",
          title: newClassTitle.trim(),
          courseId: newClassCourseId || null,
          tutorId: newClassTutorId || null,
          studentId: newClassStudentId || null,
          scheduledDate: new Date(newClassDate).toISOString(),
          meetingLink: newClassMeetingLink.trim() || null,
          description: newClassDesc.trim() || null,
          type: newClassType,
        }),
      });

      if (res.ok) {
        setShowScheduleModal(false);
        setNewClassTitle("");
        setNewClassCourseId("");
        setNewClassTutorId("");
        setNewClassStudentId("");
        setNewClassDate("");
        setNewClassMeetingLink("");
        setNewClassDesc("");
        await fetchAdminData();
      }
    } catch (err) {
      console.error("Error scheduling live class:", err);
    } finally {
      setIsSubmittingClass(false);
    }
  };

  const handleDeleteLiveClass = (event: any) => {
    setConfirmModalData({
      isOpen: true,
      title: `Cancel Class: ${event.title}?`,
      description: `This will cancel this live Google Meet class session and remove it from faculty and student calendars.`,
      variant: "danger",
      onConfirm: async () => {
        try {
          await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete_event",
              eventId: event.id,
            }),
          });
          fetchAdminData();
        } catch (err) {
          console.error("Error deleting class:", err);
        } finally {
          setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Filtered Live Classes
  const liveClassesList = useMemo(() => {
    return eventsList.filter((ev) => {
      const matchSearch =
        ev.title.toLowerCase().includes(liveClassSearch.toLowerCase()) ||
        (ev.course?.title && ev.course.title.toLowerCase().includes(liveClassSearch.toLowerCase())) ||
        (ev.user?.name && ev.user.name.toLowerCase().includes(liveClassSearch.toLowerCase())) ||
        (ev.course?.instructor?.name && ev.course.instructor.name.toLowerCase().includes(liveClassSearch.toLowerCase()));

      let matchFilter = true;
      if (liveClassFilter === "LIVE") {
        matchFilter = ev.status === "LIVE";
      } else if (liveClassFilter === "SCHEDULED") {
        matchFilter = ev.status === "SCHEDULED" || (!ev.status && new Date(ev.dueDate) >= new Date());
      } else if (liveClassFilter === "COMPLETED") {
        matchFilter = ev.status === "COMPLETED";
      }

      return matchSearch && matchFilter;
    });
  }, [eventsList, liveClassSearch, liveClassFilter]);

  const liveNowCount = eventsList.filter((e) => e.status === "LIVE").length;
  const upcomingCount = eventsList.filter((e) => e.status === "SCHEDULED" || (!e.status && new Date(e.dueDate) >= new Date())).length;
  const completedCount = eventsList.filter((e) => e.status === "COMPLETED").length;

  const navMenuItems = [
    { id: "overview", label: "Executive Overview", icon: Layers },
    {
      id: "live_classes",
      label: "Live Classes & Meets",
      icon: Video,
      badge: liveNowCount > 0 ? `${liveNowCount} LIVE` : eventsList.length,
      badgeColor: liveNowCount > 0 ? "bg-red-500 text-white animate-pulse" : undefined,
    },
    { id: "users", label: "User Management", icon: Users, badge: allUsersList.length },
    { id: "courses", label: "Course Management", icon: BookOpen, badge: coursesList.length },
    { id: "finances", label: "Financials & Tuition", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
      {/* 1. LEFT SIDEBAR PANEL */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white text-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-slate-200 shadow-2xs lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black text-sm shadow-xs shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight leading-none text-slate-900">
                EduPulse Admin
              </span>
              <span className="text-[9px] font-bold tracking-wider text-blue-500 uppercase">
                Academy #UK-92810
              </span>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto scrollbar-none">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
            Administration Hub
          </div>

          {navMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setSidebarOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${
                  isActive
                    ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-blue-500 group-hover:text-blue-600"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-blue-100/70 group-hover:text-blue-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom Profile & Links */}
        <div className="p-3.5 border-t border-slate-200 space-y-3 bg-slate-50/70">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <Avatar className="w-8 h-8 ring-1 ring-blue-200">
              <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" />
              <AvatarFallback>AV</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">Dr. Alastair Vance</div>
              <div className="text-[10px] text-blue-500 font-semibold truncate">System Administrator</div>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <Link
              href="/"
              className="w-full px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white flex items-center gap-2 transition-colors font-semibold text-[11px]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Public Academy Home</span>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full px-2.5 py-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-2 transition-colors font-semibold text-[11px] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* 2. RIGHT WORKSPACE */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
          <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
                aria-label="Open Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight capitalize">
                  {activeTab === "live_classes"
                    ? "Live Classes & Google Meet Operations"
                    : activeTab === "users"
                    ? "User Management"
                    : activeTab === "courses"
                    ? "Course Management"
                    : activeTab === "finances"
                    ? "Financials & Tuition"
                    : "Executive Overview"}
                </h2>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Live Institutional Administration & Academic Governance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                size="sm"
                variant="outline"
                onClick={fetchAdminData}
                disabled={loading}
                className="text-xs font-bold text-slate-700 h-9 rounded-xl border-slate-200 hover:bg-slate-50 gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh Data</span>
              </Button>

              {activeTab === "live_classes" && (
                <Button
                  size="sm"
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs shadow-blue-600/20 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-blue-100" />
                  <span>+ Schedule Live Class</span>
                </Button>
              )}

              {activeTab === "users" && (
                <Button
                  size="sm"
                  onClick={handleOpenAddUser}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs shadow-blue-500/20 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-blue-100" />
                  <span>+ Add New User</span>
                </Button>
              )}

              {activeTab === "courses" && (
                <Button
                  size="sm"
                  onClick={handleOpenAddCourse}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs shadow-blue-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-100" />
                  <span>+ Create Course</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] w-full mx-auto">
          {/* Error Banner */}
          {fetchError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span><strong>System Connection Error:</strong> {fetchError}</span>
              </div>
              <Button
                size="sm"
                onClick={fetchAdminData}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl h-8"
              >
                Retry Connection
              </Button>
            </div>
          )}

          {/* Loading Indicator for Initial Mount */}
          {loading && allUsersList.length === 0 && !fetchError && (
            <div className="py-24 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <div className="text-sm font-bold text-slate-800">Loading Institutional Records...</div>
              <p className="text-xs text-slate-400">Synchronizing student scholars, faculty lecturers, and curriculum syllabi.</p>
            </div>
          )}
          {/* ======================================================== */}
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {/* ======================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Executive Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Total Accounts</span>
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">{allUsersList.length} Active</div>
                  <div className="text-[11px] text-slate-500">{allUsersList.filter(u => u.role === "STUDENT").length} Students • {facultyList.length} Faculty</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-600">Active Syllabi</span>
                    <BookOpen className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">{coursesList.length} Masterclasses</div>
                  <div className="text-[11px] text-blue-600 font-semibold">{coursesList.reduce((acc, c) => acc + (c.modules?.length || 0), 0)} Total Modules</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-600">Course Enrollments</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">{totalEnrollmentsCount} Enrollments</div>
                  <div className="text-[11px] text-emerald-600 font-semibold">Verified Enrollment Records</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-indigo-600">Gross Tuition Volume</span>
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">£{totalCalculatedRevenue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</div>
                  <div className="text-[11px] text-slate-500">Calculated from enrollments</div>
                </div>
              </div>

              {/* Recent User Registrations */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">Recent User Registrations & Accounts</h3>
                  <button onClick={() => setActiveTab("users")} className="text-xs font-bold text-blue-600 hover:underline">View All →</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Academic Title</th>
                        <th className="py-3 px-4">Enrolled Courses</th>
                        <th className="py-3 px-4">Registered Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allUsersList.slice(0, 5).map((u) => (
                        <tr key={u.id} className="hover:bg-blue-50/30">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{u.headline || "Enrolled Scholar"}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{u.enrollments?.length || 0} Courses</td>
                          <td className="py-3 px-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString("en-GB")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: LIVE CLASSES & GOOGLE MEET OPERATIONS HUB */}
          {/* ======================================================== */}
          {activeTab === "live_classes" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Top Operational Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl bg-white border shadow-2xs space-y-1 ${liveNowCount > 0 ? "border-red-300 ring-2 ring-red-500/20" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full bg-red-500 ${liveNowCount > 0 ? "animate-ping" : ""}`} />
                      Currently Live Now
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                      <Radio className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {liveNowCount} {liveNowCount === 1 ? "Class Active" : "Classes Active"}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Google Meet Real-time Rooms</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600">Upcoming Scheduled</span>
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {upcomingCount} Sessions
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Lectures & Masterclasses</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600">Completed Sessions</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {completedCount} Delivered
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Archive & Logs</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600">Authorized Faculty</span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {facultyList.length} Tutors
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Senior Lecturers</div>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search by class title, subject, tutor, or student..."
                      value={liveClassSearch}
                      onChange={(e) => setLiveClassSearch(e.target.value)}
                      className="pl-9 h-10 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                    {[
                      { id: "ALL", label: `All Classes (${eventsList.length})`, icon: Video },
                      { id: "LIVE", label: `Live Now (${liveNowCount})`, icon: Radio },
                      { id: "SCHEDULED", label: `Scheduled (${upcomingCount})`, icon: Calendar },
                      { id: "COMPLETED", label: `Completed (${completedCount})`, icon: CheckCircle2 },
                    ].map((tab) => {
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setLiveClassFilter(tab.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                            liveClassFilter === tab.id
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <TabIcon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  onClick={() => setShowScheduleModal(true)}
                  className="w-full md:w-auto text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-10 rounded-xl shadow-xs cursor-pointer"
                >
                  <Video className="w-4 h-4 text-blue-100" />
                  <span>+ Schedule Live Class</span>
                </Button>
              </div>

              {/* 1. CURRENTLY ONGOING / LIVE NOW SECTION */}
              {(liveClassFilter === "ALL" || liveClassFilter === "LIVE") && liveNowCount > 0 && (
                <div className="rounded-2xl border-2 border-red-500 bg-red-50/20 p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-red-200/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600"></span>
                      </span>
                      <div>
                        <h3 className="font-black text-sm text-red-950 uppercase tracking-wide">
                          Live Classes Currently In Progress ({liveNowCount})
                        </h3>
                        <p className="text-xs text-red-700">
                          Active Google Meet classrooms with students & faculty connected
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {eventsList
                      .filter((e) => e.status === "LIVE")
                      .map((ev) => (
                        <div
                          key={ev.id}
                          className="bg-white rounded-2xl p-4 border border-red-200 shadow-sm space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <Badge className="bg-red-600 text-white text-[10px] font-black uppercase tracking-wider mb-1 flex items-center gap-1 w-fit">
                                  <Radio className="w-2.5 h-2.5 animate-pulse text-white" />
                                  <span>LIVE NOW</span>
                                </Badge>
                                <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                                  {ev.title}
                                </h4>
                                {ev.course && (
                                  <p className="text-xs text-blue-700 font-bold mt-0.5">
                                    {ev.course.title} {ev.course.subjectCode ? `(${ev.course.subjectCode})` : ""}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Faculty & Attendance */}
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="w-7 h-7 ring-1 ring-slate-200">
                                  <AvatarImage src={ev.course?.instructor?.avatar || ev.user?.avatar} />
                                  <AvatarFallback>FL</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-800 truncate text-[11px]">
                                    {ev.course?.instructor?.name || ev.user?.name || "Senior Faculty Tutor"}
                                  </div>
                                  <div className="text-[10px] text-slate-400">Class Instructor</div>
                                </div>
                              </div>

                              <div className="text-right text-[11px]">
                                <span className="font-bold text-slate-700">
                                  {ev.course?.enrollments?.length || 1} Scholars Enrolled
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            {ev.meetingLink ? (
                              <a
                                href={ev.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Join Google Meet</span>
                                <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">No link available</span>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEndClass(ev)}
                              disabled={endingClassId === ev.id}
                              className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-xl h-9"
                            >
                              {endingClassId === ev.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                "End Class"
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 2. ALL / FILTERED CLASSES LIST */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-0">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Academic Class Schedule & Google Meet Directory
                    </h3>
                    <p className="text-xs text-slate-500">
                      Showing {liveClassesList.length} classes matching current filter
                    </p>
                  </div>
                </div>

                {liveClassesList.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {liveClassesList.map((ev) => {
                      const isLive = ev.status === "LIVE";
                      const isCompleted = ev.status === "COMPLETED";
                      const meetLink = ev.meetingLink || (ev.description?.match(/https:\/\/meet\.google\.com\/[a-z0-9-]+/i)?.[0]);

                      return (
                        <div
                          key={ev.id}
                          className={`p-4 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                            isLive ? "bg-red-50/30" : "hover:bg-slate-50/70"
                          }`}
                        >
                          {/* Class Info */}
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isLive
                                  ? "bg-red-100 text-red-700 animate-pulse"
                                  : isCompleted
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              <Video className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                                  {ev.title}
                                </h4>
                                {isLive && (
                                  <Badge className="bg-red-600 text-white text-[9px] font-black uppercase flex items-center gap-1">
                                    <Radio className="w-2.5 h-2.5 animate-pulse text-white" />
                                    <span>Live Now</span>
                                  </Badge>
                                )}
                                {isCompleted && (
                                  <Badge className="bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                                    <span>Completed</span>
                                  </Badge>
                                )}
                                {!isLive && !isCompleted && (
                                  <Badge className="bg-blue-100 text-blue-800 text-[9px] font-bold">
                                    Scheduled
                                  </Badge>
                                )}
                              </div>

                              {ev.course && (
                                <p className="text-xs text-blue-700 font-semibold truncate">
                                  {ev.course.title} {ev.course.subjectCode ? `(${ev.course.subjectCode})` : ""}
                                </p>
                              )}

                              <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {new Date(ev.dueDate).toLocaleString("en-GB", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>

                                <span className="text-slate-500">
                                  Instructor:{" "}
                                  <strong className="text-slate-800">
                                    {ev.course?.instructor?.name || ev.user?.name || "Senior Faculty"}
                                  </strong>
                                </span>

                                {meetLink && (
                                  <a
                                    href={meetLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 truncate max-w-[220px]"
                                  >
                                    <span>{meetLink}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                            {isLive ? (
                              <>
                                {meetLink && (
                                  <a
                                    href={meetLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                    <span>Observe Meet</span>
                                  </a>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEndClass(ev)}
                                  disabled={endingClassId === ev.id}
                                  className="text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-xl h-8"
                                >
                                  {endingClassId === ev.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    "End Class"
                                  )}
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStartClass(ev)}
                                  disabled={startingClassId === ev.id}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-8 gap-1.5 shadow-2xs cursor-pointer"
                                >
                                  {startingClassId === ev.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <PlayCircle className="w-3.5 h-3.5" />
                                  )}
                                  <span>Start Class</span>
                                </Button>

                                <a
                                  href={buildGoogleCalendarUrl({
                                    title: ev.title,
                                    description: ev.description || "",
                                    dueDate: ev.dueDate,
                                    courseTitle: ev.course?.title,
                                    location: meetLink,
                                    durationMinutes: 60,
                                  })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-xl border border-sky-200 bg-white hover:bg-sky-50 text-sky-700 font-semibold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                                  title="Add to Google Calendar"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                                  <span className="hidden sm:inline">Google Cal</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-sky-400" />
                                </a>

                                <button
                                  onClick={() => handleDeleteLiveClass(ev)}
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Cancel / Delete Class"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <Video className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="font-bold text-xs text-slate-700">No Classes Found</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      No Google Meet classes match the selected filter. Schedule a new lecture or workshop.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setShowScheduleModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                    >
                      + Schedule Class
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: USER MANAGEMENT HUB */}
          {/* ======================================================== */}
          {activeTab === "users" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* User Metric Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-slate-500">Total Accounts</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">{allUsersList.length} Users</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-blue-600">Students</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">
                    {allUsersList.filter((u) => u.role === "STUDENT").length} Scholars
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-sky-600">Faculty & Lecturers</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">
                    {allUsersList.filter((u) => u.role === "INSTRUCTOR").length} Lecturers
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-indigo-600">System Admins</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">
                    {allUsersList.filter((u) => u.role === "ADMIN").length} Admins
                  </div>
                </div>
              </div>

              {/* User Filters & Search */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search user by name, email, or role..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 h-10 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                    {[
                      { id: "ALL", label: "All Users" },
                      { id: "STUDENT", label: "Students" },
                      { id: "INSTRUCTOR", label: "Lecturers" },
                      { id: "ADMIN", label: "Admins" },
                    ].map((rf) => (
                      <button
                        key={rf.id}
                        onClick={() => setUserRoleFilter(rf.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                          userRoleFilter === rf.id
                            ? "bg-blue-500 text-white shadow-xs shadow-blue-500/20"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {rf.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleOpenAddUser}
                  className="w-full md:w-auto text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white gap-1.5 h-10 rounded-xl shadow-xs shadow-blue-500/20 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-blue-100" />
                  <span>+ Add New User</span>
                </Button>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4">User Member</th>
                        <th className="py-3.5 px-4">System Role</th>
                        <th className="py-3.5 px-4">Academic Title / Headline</th>
                        <th className="py-3.5 px-4">Enrolled / Taught Courses</th>
                        <th className="py-3.5 px-4">Registration Date</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8 ring-1 ring-slate-200">
                                <AvatarImage src={u.avatar || undefined} />
                                <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-bold text-slate-900">{u.name}</div>
                                <div className="text-[11px] text-slate-500">{u.email}</div>
                                {u.phone && (
                                  <div className="text-[10px] text-blue-600 font-mono flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3" />
                                    <span>{u.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                                u.role === "ADMIN"
                                  ? "bg-slate-900 text-white"
                                  : u.role === "INSTRUCTOR"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {u.headline || "Active Member"}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {u.role === "STUDENT"
                              ? `${u.enrollments?.length || 0} Courses Enrolled`
                              : `${u.createdCourses?.length || 0} Courses Assigned`}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString("en-GB")}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {u.role === "STUDENT" && (
                                <button
                                  onClick={() => handleOpenEnrollUser(u)}
                                  className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[11px] cursor-pointer"
                                  title="Enroll in Course"
                                >
                                  Enroll
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 cursor-pointer"
                                title="Edit User"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: COURSE MANAGEMENT HUB */}
          {/* ======================================================== */}
          {activeTab === "courses" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Course Metric Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-slate-500">Total Active Courses</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">{coursesList.length} Courses</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-blue-600">Published Status</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">
                    {coursesList.filter((c) => c.status === "PUBLISHED").length} Active
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-sky-600">Total Curriculum Modules</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">
                    {coursesList.reduce((acc, c) => acc + (c.modules?.length || 0), 0)} Modules
                  </div>
                </div>
              </div>

              {/* Course Filters & Search */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search course title, code, or category..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="pl-9 h-10 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-400"
                  />
                </div>

                <Button
                  onClick={handleOpenAddCourse}
                  className="w-full md:w-auto text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white gap-1.5 h-10 rounded-xl shadow-xs shadow-blue-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-blue-100" />
                  <span>+ Create New Course</span>
                </Button>
              </div>

              {/* Courses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px]">
                          {course.subjectCode || "MATH-101"}
                        </Badge>
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                          {course.status}
                        </Badge>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm leading-snug">
                        {course.title}
                      </h4>

                      <p className="text-xs text-slate-500 line-clamp-2">
                        {course.subtitle || course.description}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> {course.modules?.length || 0} Modules</span>
                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-slate-400" /> {course.materials?.length || 0} Files</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> {course.enrollments?.length || 0} Enrolled</span>
                        <span className="font-bold text-slate-900">£{course.price}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCourseForSyllabus(course);
                          setShowManageSyllabusModal(true);
                        }}
                        className="text-xs font-bold gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 h-8 rounded-xl flex-1 cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
                        <span>Syllabus</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenManageMaterials(course)}
                        className="text-xs font-bold gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8 rounded-xl flex-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Files ({course.materials?.length || 0})</span>
                      </Button>

                      <button
                        onClick={() => handleOpenEditCourse(course)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Edit Course Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteCourse(course)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Delete Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* ======================================================== */}
          {/* TAB 5: FINANCIALS & TUITION */}
          {/* ======================================================== */}
          {activeTab === "finances" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-slate-500">Gross Collected Tuition</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">
                    £{totalCalculatedRevenue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold">100% Verified Bank Clearance</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-blue-600">Total Active Enrollments</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">{totalEnrollmentsCount} Students</div>
                  <div className="text-[11px] text-slate-500">Across {coursesList.length} published courses</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-indigo-600">Faculty Honorarium Pool</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">
                    £{(totalCalculatedRevenue * 0.3).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-500">Allocated to Senior Lecturers</div>
                </div>
              </div>

              {/* Tuition Invoicing & Transactions Ledger */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-3 p-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Student Tuition & Enrollment Ledger</h3>
                    <p className="text-xs text-slate-500">Official transaction log for student registrations and course enrollments</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => alert("Financial statement exported successfully!")}
                    className="text-xs font-bold text-slate-700 h-8 rounded-xl gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export Statement</span>
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Course Enrolled</th>
                        <th className="py-3 px-4">Tuition Fee</th>
                        <th className="py-3 px-4">Payment Status</th>
                        <th className="py-3 px-4">Enrolled Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {coursesList.flatMap(c => (c.enrollments || []).map((en: any) => ({
                        student: en.user?.name || "Student",
                        email: en.user?.email || "student@edupulse.uk",
                        course: c.title,
                        price: c.price,
                        date: en.enrolledAt,
                        id: en.id,
                      }))).map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{tx.student}</div>
                            <div className="text-[11px] text-slate-400">{tx.email}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">{tx.course}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">£{tx.price}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              PAID
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{new Date(tx.date).toLocaleDateString("en-GB")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* USER MANAGEMENT MODALS */}
      {/* ======================================================== */}
      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Add New User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Full Name</label>
                <Input required placeholder="e.g. Tariq Al-Mansoor" value={formUserName} onChange={(e) => setFormUserName(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Email Address</label>
                  <Input required type="email" placeholder="tariq@student.edupulse.uk" value={formUserEmail} onChange={(e) => setFormUserEmail(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Contact Number</label>
                  <Input placeholder="+44 7911 123456" value={formUserPhone} onChange={(e) => setFormUserPhone(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Role</label>
                  <select value={formUserRole} onChange={(e) => setFormUserRole(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                    <option value="STUDENT">Student</option>
                    <option value="INSTRUCTOR">Faculty Lecturer</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Initial Password</label>
                  <Input placeholder="Default: StudentPass123!" value={formUserPassword} onChange={(e) => setFormUserPassword(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Academic Title / Headline</label>
                <Input placeholder="e.g. London A/L Pure Maths Scholar" value={formUserHeadline} onChange={(e) => setFormUserHeadline(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddUserModal(false)} className="rounded-xl cursor-pointer">Cancel</Button>
                <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl cursor-pointer">Create User</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditUserModal && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Edit User Details</h3>
              <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Full Name</label>
                <Input required value={formUserName} onChange={(e) => setFormUserName(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Email Address</label>
                  <Input required type="email" value={formUserEmail} onChange={(e) => setFormUserEmail(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Contact Number</label>
                  <Input placeholder="+44 7911 123456" value={formUserPhone} onChange={(e) => setFormUserPhone(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Role</label>
                <select value={formUserRole} onChange={(e) => setFormUserRole(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                  <option value="STUDENT">Student</option>
                  <option value="INSTRUCTOR">Faculty Lecturer</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Academic Title</label>
                <Input value={formUserHeadline} onChange={(e) => setFormUserHeadline(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEditUserModal(false)} className="rounded-xl cursor-pointer">Cancel</Button>
                <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl cursor-pointer">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENROLL USER MODAL */}
      {showEnrollUserModal && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Enroll Student</h3>
                <p className="text-xs text-slate-500">{selectedUserForEdit.name} ({selectedUserForEdit.email})</p>
              </div>
              <button onClick={() => setShowEnrollUserModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleEnrollUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">Select Course to Enroll</label>
                <select
                  value={selectedCourseToEnroll}
                  onChange={(e) => setSelectedCourseToEnroll(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs"
                >
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEnrollUserModal(false)} className="rounded-xl cursor-pointer">Cancel</Button>
                <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl cursor-pointer">Enroll Student</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COURSE MANAGEMENT MODALS */}
      {/* ======================================================== */}
      {/* CREATE COURSE MODAL */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Create New Course</h3>
              <button onClick={() => setShowAddCourseModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Course Title</label>
                <Input required placeholder="e.g. London A/L Pure Mathematics P1-P4" value={courseFormTitle} onChange={(e) => setCourseFormTitle(e.target.value)} className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Subject Code</label>
                  <Input placeholder="e.g. WMA11-14" value={courseFormCode} onChange={(e) => setCourseFormCode(e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Tuition Price (£)</label>
                  <Input type="number" required value={courseFormPrice} onChange={(e) => setCourseFormPrice(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Academic Category</label>
                <select value={courseFormCategory} onChange={(e) => setCourseFormCategory(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                  <option value="School of Mathematics & Computing">School of Mathematics & Computing</option>
                  <option value="School of Computing & Engineering">School of Computing & Engineering</option>
                  <option value="School of Science & O/L Academy">School of Science & O/L Academy</option>
                  <option value="School of Economics & Commerce">School of Economics & Commerce</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Level</label>
                  <select value={courseFormLevel} onChange={(e) => setCourseFormLevel(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                    <option value="ADVANCED">London A/L (Advanced)</option>
                    <option value="INTERMEDIATE">London O/L (Intermediate)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Lead Lecturer</label>
                  <select value={courseFormInstructorId} onChange={(e) => setCourseFormInstructorId(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                    {facultyList.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Subtitle / Short Summary</label>
                <Input value={courseFormSubtitle} onChange={(e) => setCourseFormSubtitle(e.target.value)} className="rounded-xl" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddCourseModal(false)} className="rounded-xl cursor-pointer">Cancel</Button>
                <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl cursor-pointer">Create Course</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COURSE MODAL */}
      {showEditCourseModal && selectedCourseForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Edit Course Details</h3>
              <button onClick={() => setShowEditCourseModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleUpdateCourse} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Course Title</label>
                <Input required value={courseFormTitle} onChange={(e) => setCourseFormTitle(e.target.value)} className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Subject Code</label>
                  <Input value={courseFormCode} onChange={(e) => setCourseFormCode(e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Tuition Price (£)</label>
                  <Input type="number" required value={courseFormPrice} onChange={(e) => setCourseFormPrice(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Academic Category</label>
                <select value={courseFormCategory} onChange={(e) => setCourseFormCategory(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                  <option value="School of Mathematics & Computing">School of Mathematics & Computing</option>
                  <option value="School of Computing & Engineering">School of Computing & Engineering</option>
                  <option value="School of Science & O/L Academy">School of Science & O/L Academy</option>
                  <option value="School of Economics & Commerce">School of Economics & Commerce</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Subtitle</label>
                <Input value={courseFormSubtitle} onChange={(e) => setCourseFormSubtitle(e.target.value)} className="rounded-xl" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEditCourseModal(false)} className="rounded-xl cursor-pointer">Cancel</Button>
                <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl cursor-pointer">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SYLLABUS BUILDER MODAL */}
      {showManageSyllabusModal && selectedCourseForSyllabus && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Syllabus & Module Builder</h3>
                <p className="text-xs text-slate-500">{selectedCourseForSyllabus.title}</p>
              </div>
              <button onClick={() => setShowManageSyllabusModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>

            {/* Add Module Input */}
            <form onSubmit={handleAddModule} className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 flex gap-2">
              <Input
                required
                placeholder="Enter new module title (e.g. Module 3: Vectors & Matrices)..."
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                className="bg-white text-xs rounded-xl"
              />
              <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer">
                + Add Module
              </Button>
            </form>

            {/* Modules List */}
            <div className="space-y-4 pt-2">
              {selectedCourseForSyllabus.modules?.map((mod: any, mIdx: number) => (
                <div key={mod.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-blue-500 text-white text-[10px] flex items-center justify-center font-mono">
                        {mIdx + 1}
                      </span>
                      <span>{mod.title}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteModule(mod.id)}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                      title="Delete Module"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Lessons inside Module */}
                  <div className="pl-6 space-y-1.5">
                    {mod.lessons?.map((les: any, lIdx: number) => (
                      <div key={les.id} className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <PlayCircle className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-medium text-slate-800">{les.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">{les.durationMin} mins</span>
                          <button
                            onClick={() => handleDeleteLesson(les.id)}
                            className="text-slate-300 hover:text-red-500 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Lesson Form */}
                    {selectedModuleIdForLesson === mod.id ? (
                      <form onSubmit={handleAddLesson} className="pt-2 flex gap-2">
                        <Input
                          required
                          placeholder="Lesson title..."
                          value={newLessonTitle}
                          onChange={(e) => setNewLessonTitle(e.target.value)}
                          className="bg-white text-xs h-8 rounded-lg flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Mins"
                          value={newLessonDuration}
                          onChange={(e) => setNewLessonDuration(e.target.value)}
                          className="bg-white text-xs h-8 w-16 rounded-lg"
                        />
                        <Button type="submit" size="sm" className="bg-blue-500 text-white text-xs h-8 rounded-lg cursor-pointer">Add</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedModuleIdForLesson("")} className="text-xs h-8 rounded-lg cursor-pointer px-2" aria-label="Close"><X className="w-3.5 h-3.5" /></Button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setSelectedModuleIdForLesson(mod.id)}
                        className="text-[11px] font-bold text-blue-600 hover:underline pt-1 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Lesson to this Module</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COURSE MATERIAL & FILE MANAGEMENT MODAL */}
      {/* ======================================================== */}
      {showManageMaterialsModal && selectedCourseForMaterials && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedCourseForMaterials.subjectCode || "COURSE-FILE-HUB"}
                  </span>
                  <h3 className="font-bold text-base text-slate-900">
                    Course Files & Study Materials
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedCourseForMaterials.title} • {selectedCourseForMaterials.materials?.length || 0} Files Published
                </p>
              </div>
              <button
                onClick={() => setShowManageMaterialsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Upload File Form */}
            <form
              onSubmit={handleUploadCourseMaterial}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  Upload Course Study Material
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Academy Resource Repository
                </span>
              </div>

              {/* Status Message */}
              {materialStatusMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    materialStatusMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {materialStatusMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{materialStatusMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Document Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Pure Maths P3 Revision Guide 2026"
                    value={matFormTitle}
                    onChange={(e) => setMatFormTitle(e.target.value)}
                    className="bg-white rounded-xl text-xs h-9"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Material Classification
                  </label>
                  <select
                    value={matFormCategory}
                    onChange={(e) => setMatFormCategory(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium"
                  >
                    <option value="HANDOUT">Handout & Study Notes</option>
                    <option value="FORMULA_SHEET">Formula Sheet & Tables</option>
                    <option value="MOCK_PAPER">Mock Exam Paper & Solutions</option>
                    <option value="LAB_GUIDE">Practical Lab Guide</option>
                    <option value="SLIDES">Lecture Slides</option>
                    <option value="OTHER">General Resource File</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Description / Topic Notes
                </label>
                <Input
                  placeholder="Optional brief description of the document contents..."
                  value={matFormDesc}
                  onChange={(e) => setMatFormDesc(e.target.value)}
                  className="bg-white rounded-xl text-xs h-9"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Choose File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedMatUploadFile(file);
                    if (file && !matFormTitle) {
                      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
                      setMatFormTitle(cleanName);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer bg-white p-1 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-1 flex justify-end">
                <Button
                  type="submit"
                  disabled={uploadingCourseMaterial || !selectedMatUploadFile}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 cursor-pointer shadow-xs shadow-blue-600/20"
                >
                  {uploadingCourseMaterial ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading File...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Publish to Course Files</span>
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Existing Course Materials List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Published Files ({selectedCourseForMaterials.materials?.length || 0})
                </h4>
                {selectedCourseForMaterials.materials?.length > 3 && (
                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Filter files..."
                      value={matSearchQuery}
                      onChange={(e) => setMatSearchQuery(e.target.value)}
                      className="pl-8 h-7 text-[11px] rounded-lg"
                    />
                  </div>
                )}
              </div>

              {selectedCourseForMaterials.materials && selectedCourseForMaterials.materials.length > 0 ? (
                <div className="space-y-2">
                  {selectedCourseForMaterials.materials
                    .filter((mat: any) =>
                      !matSearchQuery ||
                      mat.title.toLowerCase().includes(matSearchQuery.toLowerCase()) ||
                      (mat.description && mat.description.toLowerCase().includes(matSearchQuery.toLowerCase())) ||
                      (mat.category && mat.category.toLowerCase().includes(matSearchQuery.toLowerCase()))
                    )
                    .map((mat: any) => (
                      <div
                        key={mat.id}
                        className="p-3 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-300 transition-colors"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              {mat.category ? mat.category.replace(/_/g, " ") : "HANDOUT"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {mat.fileSize || "1.5 MB"}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {mat.title}
                          </div>
                          {mat.description && (
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {mat.description}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {mat.fileUrl && (
                            <a
                              href={mat.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteCourseMaterial(mat)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Delete Material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No study materials uploaded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Use the form above to attach lecture slides, formula booklets, handouts, and problem sets to this syllabus unit.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManageMaterialsModal(false)}
                className="rounded-xl cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}



      {/* ======================================================== */}
      {/* SCHEDULE LIVE GOOGLE MEET CLASS MODAL (ADMIN) */}
      {/* ======================================================== */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Schedule Live Class & Google Meet
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create synchronized real-time Google Meet classroom session
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleLiveClass} className="space-y-3.5 text-xs">
              {/* Class Title */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Class / Session Title <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Edexcel IAL Pure Maths P3 Integration Workshop"
                  value={newClassTitle}
                  onChange={(e) => setNewClassTitle(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* Course Association */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Course / Masterclass Association
                </label>
                <select
                  value={newClassCourseId}
                  onChange={(e) => setNewClassCourseId(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Academy-Wide / General Tutorial</option>
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.subjectCode ? `(${c.subjectCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Faculty Instructor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Faculty Lecturer Lead
                  </label>
                  <select
                    value={newClassTutorId}
                    onChange={(e) => setNewClassTutorId(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select Faculty Lead...</option>
                    {facultyList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.headline || "Faculty"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Specific Scholar (Optional)
                  </label>
                  <select
                    value={newClassStudentId}
                    onChange={(e) => setNewClassStudentId(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Enrolled Course Scholars</option>
                    {allUsersList
                      .filter((u) => u.role === "STUDENT")
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.email})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Date & Google Meet Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Date & Scheduled Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newClassDate}
                    onChange={(e) => setNewClassDate(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Google Meet Room Link (Optional)
                  </label>
                  <Input
                    placeholder="https://meet.google.com/..."
                    value={newClassMeetingLink}
                    onChange={(e) => setNewClassMeetingLink(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Description / Topic */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Class Overview & Topic Objectives
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Live problem breakdown, past paper revision, and student Q&A."
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingClass || !newClassTitle.trim() || !newClassDate}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl gap-1.5 shadow-sm cursor-pointer"
                >
                  {isSubmittingClass ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-3.5 h-3.5" />
                      <span>Publish Live Class</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={confirmModalData.isOpen}
        onClose={() => setConfirmModalData((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalData.onConfirm}
        title={confirmModalData.title}
        description={confirmModalData.description}
        variant={confirmModalData.variant}
      />
    </div>
  );
}
