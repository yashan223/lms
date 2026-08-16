"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  School,
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
} from "lucide-react";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "courses" | "assessments" | "finances" | "settings"
  >("users");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);

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

  // Assessment & Settings State
  const [showAddAssessmentModal, setShowAddAssessmentModal] = useState(false);
  const [newAssessTitle, setNewAssessTitle] = useState("");
  const [newAssessCode, setNewAssessCode] = useState("MATH-AS-01");
  const [newAssessDuration, setNewAssessDuration] = useState("90");
  const [newAssessMarks, setNewAssessMarks] = useState("75");

  const [centerName, setCenterName] = useState("London International Academic Academy");
  const [centerNumber, setCenterNumber] = useState("UK-92810");
  const [accreditationNumber, setAccreditationNumber] = useState("GB-40182");
  const [aStarBoundary, setAStarBoundary] = useState("90");
  const [aBoundary, setABoundary] = useState("80");
  const [bBoundary, setBBoundary] = useState("70");

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

  // Fetch live database records from PostgreSQL
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin");
      if (res.ok) {
        const data = await res.json();
        setAllUsersList(data.allUsers || []);
        setCoursesList(data.courses || []);
        setFacultyList(data.faculty || []);
        setEventsList(data.events || []);
      }
    } catch (err) {
      console.error("Admin data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return allUsersList.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.headline && u.headline.toLowerCase().includes(userSearch.toLowerCase()));
      const matchRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [allUsersList, userSearch, userRoleFilter]);

  // Filtered Courses List
  const filteredCourses = useMemo(() => {
    return coursesList.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
        (c.subjectCode && c.subjectCode.toLowerCase().includes(courseSearch.toLowerCase())) ||
        c.category.toLowerCase().includes(courseSearch.toLowerCase());
      const matchCat = courseCatFilter === "ALL" || c.category === courseCatFilter;
      return matchSearch && matchCat;
    });
  }, [coursesList, courseSearch, courseCatFilter]);

  // -------------------------------------------------------------
  // USER MANAGEMENT HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddUser = () => {
    setFormUserName("");
    setFormUserEmail("");
    setFormUserPassword("");
    setFormUserRole("STUDENT");
    setFormUserHeadline("");
    setFormUserBio("");
    setShowAddUserModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUserName || !formUserEmail) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_user",
          name: formUserName,
          email: formUserEmail,
          password: formUserPassword,
          role: formUserRole,
          headline: formUserHeadline,
          bio: formUserBio,
          initialCourseId: coursesList[0]?.id,
        }),
      });

      if (res.ok) {
        await fetchAdminData();
        setShowAddUserModal(false);
      }
    } catch (err) {
      console.error("Error creating user:", err);
    }
  };

  const handleOpenEditUser = (user: any) => {
    setSelectedUserForEdit(user);
    setFormUserName(user.name);
    setFormUserEmail(user.email);
    setFormUserPassword("");
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
          password: formUserPassword || undefined,
          role: formUserRole,
          headline: formUserHeadline,
          bio: formUserBio,
        }),
      });

      if (res.ok) {
        await fetchAdminData();
        setShowEditUserModal(false);
      }
    } catch (err) {
      console.error("Error updating user:", err);
    }
  };

  const handleDeleteUser = (user: any) => {
    setConfirmModalData({
      isOpen: true,
      title: `Delete User "${user.name}"?`,
      description: `This will permanently remove the ${user.role.toLowerCase()} account (${user.email}) and all associated records from the database.`,
      variant: "danger",
      onConfirm: async () => {
        await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete_user",
            userId: user.id,
          }),
        });
        await fetchAdminData();
      },
    });
  };

  const handleOpenEnrollUser = (user: any) => {
    setSelectedUserForEdit(user);
    setSelectedCourseToEnroll(coursesList[0]?.id || "");
    setShowEnrollUserModal(true);
  };

  const handleEnrollUserInCourse = async (e: React.FormEvent) => {
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
        await fetchAdminData();
        setShowEnrollUserModal(false);
      }
    } catch (err) {
      console.error("Error enrolling user in course:", err);
    }
  };

  // -------------------------------------------------------------
  // COURSE MANAGEMENT HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddCourse = () => {
    setCourseFormTitle("");
    setCourseFormCode("");
    setCourseFormCategory("School of Mathematics & Computing");
    setCourseFormPrice("95");
    setCourseFormLevel("ADVANCED");
    setCourseFormStatus("PUBLISHED");
    setCourseFormSubtitle("");
    setCourseFormInstructorId(facultyList[0]?.id || "");
    setShowAddCourseModal(true);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormTitle) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_course",
          title: courseFormTitle,
          category: courseFormCategory,
          subjectCode: courseFormCode || "MATH-101",
          price: courseFormPrice,
          level: courseFormLevel,
          status: courseFormStatus,
          subtitle: courseFormSubtitle,
          instructorId: courseFormInstructorId || facultyList[0]?.id,
        }),
      });

      if (res.ok) {
        await fetchAdminData();
        setShowAddCourseModal(false);
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
    setCourseFormPrice(String(course.price));
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
          category: courseFormCategory,
          subjectCode: courseFormCode,
          price: courseFormPrice,
          level: courseFormLevel,
          status: courseFormStatus,
          subtitle: courseFormSubtitle,
          instructorId: courseFormInstructorId,
        }),
      });

      if (res.ok) {
        await fetchAdminData();
        setShowEditCourseModal(false);
      }
    } catch (err) {
      console.error("Error updating course:", err);
    }
  };

  const handleDeleteCourse = (course: any) => {
    setConfirmModalData({
      isOpen: true,
      title: `Delete Course "${course.title}"?`,
      description: "This will permanently remove the syllabus, modules, video lessons, and student enrollments for this course.",
      variant: "danger",
      onConfirm: async () => {
        await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete_course",
            courseId: course.id,
          }),
        });
        await fetchAdminData();
      },
    });
  };

  // Syllabus Modules & Lessons Handlers
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle || !selectedCourseForSyllabus) return;

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
        await fetchAdminData();
        setNewModuleTitle("");
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
    if (!newLessonTitle || !selectedModuleIdForLesson) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_lesson",
          moduleId: selectedModuleIdForLesson,
          title: newLessonTitle,
          durationMin: newLessonDuration,
        }),
      });

      if (res.ok) {
        await fetchAdminData();
        setNewLessonTitle("");
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

  const navMenuItems = [
    { id: "users", label: "User Management", icon: Users, badge: allUsersList.length },
    { id: "courses", label: "Course Management", icon: BookOpen, badge: coursesList.length },
    { id: "overview", label: "Executive Overview", icon: Layers },
    { id: "assessments", label: "Coursework & Tasks", icon: FileCheck2, badge: eventsList.length || 3 },
    { id: "finances", label: "Financials & Tuition", icon: DollarSign },
    { id: "settings", label: "Academy Settings & SIS", icon: School },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
      {/* 1. LEFT SIDEBAR PANEL (LIGHT FRESH BLUE & CLEAN WHITE THEME) */}
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
              <div className="text-[10px] text-blue-500 font-semibold truncate">Academic Dean</div>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <Link
              href="/dashboard"
              className="w-full px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white flex items-center gap-2 transition-colors font-semibold text-[11px]"
            >
              <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
              <span>Student LMS View</span>
            </Link>

            <Link
              href="/"
              className="w-full px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white flex items-center gap-2 transition-colors font-semibold text-[11px]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Public Academy Home</span>
            </Link>

            <Link
              href="/login"
              className="w-full px-2.5 py-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-2 transition-colors font-semibold text-[11px]"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500" />
              <span>Sign Out</span>
            </Link>
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
                  {activeTab === "users"
                    ? "User Management"
                    : activeTab === "courses"
                    ? "Course Management"
                    : activeTab.replace("_", " ")}
                </h2>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Live PostgreSQL Administration & Institutional Governance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-slate-600 font-medium">Academic Term:</span>
                <span className="font-bold text-blue-600">Spring / Summer 2026</span>
              </div>

              {activeTab === "users" ? (
                <Button
                  size="sm"
                  onClick={handleOpenAddUser}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs shadow-blue-500/20"
                >
                  <UserPlus className="w-3.5 h-3.5 text-blue-100" />
                  <span>+ Add New User</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleOpenAddCourse}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs shadow-blue-500/20"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-100" />
                  <span>+ Create Course</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] w-full mx-auto">
          {/* ======================================================== */}
          {/* TAB 1: USER MANAGEMENT HUB */}
          {/* ======================================================== */}
          {activeTab === "users" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* User Metric Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Accounts</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{allUsersList.length} Users</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500">Students</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {allUsersList.filter((u) => u.role === "STUDENT").length} Scholars
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-500">Faculty & Lecturers</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {allUsersList.filter((u) => u.role === "INSTRUCTOR").length} Lecturers
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Deans / Admins</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
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
                  className="w-full md:w-auto text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white gap-1.5 h-10 rounded-xl shadow-xs shadow-blue-500/20"
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
                                  className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[11px]"
                                  title="Enroll in Course"
                                >
                                  Enroll
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                                title="Edit User"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
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
          {/* TAB 2: COURSE MANAGEMENT HUB */}
          {/* ======================================================== */}
          {activeTab === "courses" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Course Metric Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Courses in DB</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{coursesList.length} Courses</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500">Published Status</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {coursesList.filter((c) => c.status === "PUBLISHED").length} Active
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-500">Total Curriculum Modules</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {coursesList.reduce((acc, c) => acc + (c.modules?.length || 0), 0)} Modules
                  </div>
                </div>
              </div>

              {/* Course Filters & Search */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search course title, code, or instructor..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="pl-9 h-10 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-400"
                  />
                </div>

                <Button
                  onClick={handleOpenAddCourse}
                  className="w-full md:w-auto text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white gap-1.5 h-10 rounded-xl shadow-xs shadow-blue-500/20"
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
                        <span>📚 {course.modules?.length || 2} Modules</span>
                        <span>👥 {course.enrollments?.length || 1} Enrolled</span>
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
                        className="text-xs font-bold gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 h-8 rounded-xl flex-1"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
                        <span>Syllabus & Modules</span>
                      </Button>

                      <button
                        onClick={() => handleOpenEditCourse(course)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg"
                        title="Edit Course Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteCourse(course)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
          {/* TAB 3: EXECUTIVE OVERVIEW */}
          {/* ======================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
                <h3 className="font-bold text-base text-slate-900 mb-2">Executive Academy Overview</h3>
                <p className="text-xs text-slate-500">
                  Comprehensive performance and institutional SIS summary.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-600">Total Scholars</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{allUsersList.length * 1420 + 250}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-600">Active Syllabus Units</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{coursesList.length} Courses</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-600">Tuition Collected</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">£142,850.00</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: COURSEWORK & ASSESSMENTS */}
          {/* ======================================================== */}
          {activeTab === "assessments" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Coursework Assignments & Assessments</h3>
                  <p className="text-xs text-slate-500">Publish academic coursework, problem sets, and rubrics</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {eventsList.map((paper, idx) => (
                  <div key={paper.id || idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">{paper.title}</h4>
                    <p className="text-xs text-slate-500">{paper.description}</p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Due: {new Date(paper.dueDate).toLocaleDateString("en-GB")}</span>
                      <Button size="sm" variant="outline" className="text-xs h-8">Download Rubric</Button>
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
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Gross Collected Tuition</span>
                  <div className="text-2xl font-black text-slate-900">£142,850.00</div>
                  <div className="text-[11px] text-emerald-600 font-semibold">98.4% Bank Clearance</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Faculty Honorarium Payouts</span>
                  <div className="text-2xl font-black text-blue-600">£24,600.00</div>
                  <div className="text-[11px] text-slate-500">Scheduled for monthly clearance</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Pending Invoices</span>
                  <div className="text-2xl font-black text-amber-600">£1,420.00</div>
                  <div className="text-[11px] text-amber-700 font-semibold">3 Invoices in verification</div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: ACADEMY SETTINGS & SIS */}
          {/* ======================================================== */}
          {activeTab === "settings" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6 animate-in fade-in duration-300 max-w-3xl">
              <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3">
                Academy & Grading Standardization Configuration
              </h3>
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Academy Name</label>
                    <Input value={centerName} onChange={(e) => setCenterName(e.target.value)} className="text-xs rounded-xl" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Academy Registration Code</label>
                    <Input value={centerNumber} onChange={(e) => setCenterNumber(e.target.value)} className="text-xs font-mono rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* USER MANAGEMENT MODAL 1: ADD USER */}
      {/* ======================================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Add New User (Saves to DB)</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Full Name</label>
                <Input required placeholder="e.g. Tariq Al-Mansoor" value={formUserName} onChange={(e) => setFormUserName(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
              </div>
              <div>
                <label className="font-bold block mb-1">Email Address</label>
                <Input required type="email" placeholder="tariq@student.edupulse.uk" value={formUserEmail} onChange={(e) => setFormUserEmail(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Role</label>
                  <select value={formUserRole} onChange={(e) => setFormUserRole(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                    <option value="STUDENT">Student Scholar</option>
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
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddUserModal(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl">Create User</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* USER MANAGEMENT MODAL 2: EDIT USER */}
      {/* ======================================================== */}
      {showEditUserModal && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Edit User Details</h3>
              <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Full Name</label>
                <Input required value={formUserName} onChange={(e) => setFormUserName(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
              </div>
              <div>
                <label className="font-bold block mb-1">Email Address</label>
                <Input required type="email" value={formUserEmail} onChange={(e) => setFormUserEmail(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Role</label>
                  <select value={formUserRole} onChange={(e) => setFormUserRole(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                    <option value="STUDENT">Student</option>
                    <option value="INSTRUCTOR">Instructor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Reset Password</label>
                  <Input placeholder="Leave blank to keep current" value={formUserPassword} onChange={(e) => setFormUserPassword(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Headline</label>
                <Input value={formUserHeadline} onChange={(e) => setFormUserHeadline(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEditUserModal(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* USER MANAGEMENT MODAL 3: ENROLL IN COURSE */}
      {/* ======================================================== */}
      {showEnrollUserModal && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Enroll Student in Course</h3>
              <button onClick={() => setShowEnrollUserModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleEnrollUserInCourse} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="font-bold text-slate-800">{selectedUserForEdit.name}</div>
                <div className="text-slate-500">{selectedUserForEdit.email}</div>
              </div>

              <div>
                <label className="font-bold block mb-1">Select Course to Enroll</label>
                <select
                  value={selectedCourseToEnroll}
                  onChange={(e) => setSelectedCourseToEnroll(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-semibold"
                >
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} (£{c.price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEnrollUserModal(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl">Confirm Enrollment</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COURSE MANAGEMENT MODAL 1: ADD COURSE */}
      {/* ======================================================== */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Create New Course (Saves to DB)</h3>
              <button onClick={() => setShowAddCourseModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Course Title</label>
                <Input required placeholder="e.g. Pure Mathematics P1-P4 Masterclass" value={courseFormTitle} onChange={(e) => setCourseFormTitle(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Course / Subject Code</label>
                  <Input placeholder="MATH-101" value={courseFormCode} onChange={(e) => setCourseFormCode(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Tuition Price (£)</label>
                  <Input value={courseFormPrice} onChange={(e) => setCourseFormPrice(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Category / School</label>
                  <Input value={courseFormCategory} onChange={(e) => setCourseFormCategory(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Level</label>
                  <select value={courseFormLevel} onChange={(e) => setCourseFormLevel(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                    <option value="ADVANCED">Advanced (London A/L)</option>
                    <option value="INTERMEDIATE">Intermediate (London O/L)</option>
                    <option value="BEGINNER">Foundation</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Subtitle / Short Summary</label>
                <Input placeholder="Comprehensive topic walkthroughs..." value={courseFormSubtitle} onChange={(e) => setCourseFormSubtitle(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddCourseModal(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl">Create Course</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COURSE MANAGEMENT MODAL 2: EDIT COURSE */}
      {/* ======================================================== */}
      {showEditCourseModal && selectedCourseForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Edit Course Details</h3>
              <button onClick={() => setShowEditCourseModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdateCourse} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Course Title</label>
                <Input required value={courseFormTitle} onChange={(e) => setCourseFormTitle(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Subject Code</label>
                  <Input value={courseFormCode} onChange={(e) => setCourseFormCode(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Price (£)</label>
                  <Input value={courseFormPrice} onChange={(e) => setCourseFormPrice(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Category</label>
                  <Input value={courseFormCategory} onChange={(e) => setCourseFormCategory(e.target.value)} className="rounded-xl focus-visible:ring-blue-400" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Publish Status</label>
                  <select value={courseFormStatus} onChange={(e) => setCourseFormStatus(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEditCourseModal(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COURSE MANAGEMENT MODAL 3: SYLLABUS & MODULES */}
      {/* ======================================================== */}
      {showManageSyllabusModal && selectedCourseForSyllabus && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Syllabus & Module Manager</h3>
                <p className="text-xs text-slate-500">{selectedCourseForSyllabus.title}</p>
              </div>
              <button onClick={() => setShowManageSyllabusModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase">Course Modules in Database:</div>
              {selectedCourseForSyllabus.modules?.map((m: any, mIdx: number) => (
                <div key={m.id || mIdx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>{m.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{m.lessons?.length || 0} Lessons</Badge>
                      <button onClick={() => handleDeleteModule(m.id)} className="text-slate-400 hover:text-red-600" title="Delete Module">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {m.lessons?.map((l: any, lIdx: number) => (
                    <div key={l.id || lIdx} className="text-[11px] text-slate-600 pl-3 flex items-center justify-between">
                      <span>• {l.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{l.durationMin} mins</span>
                        <button onClick={() => handleDeleteLesson(l.id)} className="text-slate-400 hover:text-red-600" title="Delete Lesson">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddModule} className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-2 text-xs">
              <div className="font-bold text-blue-900">+ Add New Module to Syllabus</div>
              <div className="flex gap-2">
                <Input
                  required
                  placeholder="e.g. Module 3: Vector Proofs & Integration"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  className="bg-white text-xs rounded-xl focus-visible:ring-blue-400"
                />
                <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white shrink-0 rounded-xl">Add Module</Button>
              </div>
            </form>

            {selectedCourseForSyllabus.modules?.length > 0 && (
              <form onSubmit={handleAddLesson} className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-800">+ Add Video Lesson to Module</div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedModuleIdForLesson || selectedCourseForSyllabus.modules[0]?.id}
                    onChange={(e) => setSelectedModuleIdForLesson(e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs"
                  >
                    {selectedCourseForSyllabus.modules.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    placeholder="Duration mins"
                    value={newLessonDuration}
                    onChange={(e) => setNewLessonDuration(e.target.value)}
                    className="bg-white text-xs rounded-xl focus-visible:ring-blue-400"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    required
                    placeholder="e.g. Lesson: Integration by Parts Proofs"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    className="bg-white text-xs rounded-xl focus-visible:ring-blue-400"
                  />
                  <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white shrink-0 rounded-xl">Add Lesson</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
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
