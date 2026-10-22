"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  BarChart3,
  GraduationCap,
  Users,
  BookOpen,
  FileCheck2,
  TrendingUp,
  Search,
  Plus,
  ArrowLeft,
  Calendar,
  CalendarCheck,
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
  EyeOff,
  Sliders,
  Menu,
  X,
  Maximize2,
  Minimize2,
  LogOut,
  UserCheck,
  KeyRound,
  Play,
  PlayCircle,
  FolderPlus,
  Phone,
  Upload,
  Loader2,
  RefreshCw,
  Video,
  Radio,
  Coins,
  Zap,
  ArrowRight,
  PlusCircle,
  Copy,
  Check,
  Filter,
  MessageSquare,
  MessageSquareLock,
  Lock,
  Building2,
  ArrowUp,
  ArrowDown,
  Globe,
  RotateCcw,
  Trophy,
  Target,
} from "lucide-react";
import { DEFAULT_BUNDLES, TokenBundle } from "@/lib/bundle-types";
import { AcademicSchool, DEFAULT_SCHOOLS } from "@/lib/subjects";
import { deriveConversationKey, decryptMessage } from "@/lib/crypto";
import { formatStudentPrice } from "@/lib/currency";
import { parseTutorBio } from "@/lib/utils";
import { RegionalTimezoneSelector } from "@/components/ui/RegionalTimezoneSelector";
import { UserProfileHistoryModal } from "@/components/admin/UserProfileHistoryModal";
import { AdminAttendanceTracker } from "@/components/attendance/AdminAttendanceTracker";
import { BigBlueButtonAnalyticsModal } from "@/components/admin/BigBlueButtonAnalyticsModal";
import {
  getRegionalTimezone,
  DEFAULT_TIMEZONE,
  formatTimeInTimezone,
  formatDateInTimezone,
  formatForUser,
  getUserBrowserTimezone,
} from "@/lib/timezones";
import { COUNTRY_DIAL_CODES, DEFAULT_DIAL_CODE, formatSubscriberPhone } from "@/lib/country-codes";
import { findCountry } from "@/lib/countries";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { CountryFlag } from "@/components/ui/CountryFlag";

function formatSessionDuration(startedAt?: string | Date | null, endedAt?: string | Date | null) {
  if (!startedAt) return "—";
  if (!endedAt) return "In Progress";
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const diffMs = end - start;
  if (diffMs <= 0) return "< 1 min";
  const diffMins = Math.round(diffMs / (1000 * 60));
  if (diffMins < 60) return `${diffMins} mins`;
  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hrs}h ${mins}m`;
}

function getRelativeTimeString(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 45) return "Just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const AUDIT_ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  create_user: { label: "Create User Account", icon: UserPlus, color: "text-blue-600 bg-blue-50 border-blue-200" },
  create_candidate: { label: "Register Candidate", icon: UserPlus, color: "text-blue-600 bg-blue-50 border-blue-200" },
  update_user: { label: "Update User Account", icon: Edit3, color: "text-blue-600 bg-blue-50 border-blue-200" },
  delete_user: { label: "Delete User Account", icon: Trash2, color: "text-red-600 bg-red-50 border-red-200" },
  delete_candidate: { label: "Delete Candidate", icon: Trash2, color: "text-red-600 bg-red-50 border-red-200" },
  grant_tokens: { label: "Grant Learning Credit", icon: Coins, color: "text-blue-700 bg-blue-50 border-blue-200" },
  give_credit: { label: "Grant Learning Credit", icon: Coins, color: "text-blue-700 bg-blue-50 border-blue-200" },
  adjust_tokens: { label: "Adjust Token Balance", icon: Coins, color: "text-blue-700 bg-blue-50 border-blue-200" },
  enroll_user: { label: "Enroll Student in Individual Class", icon: UserCheck, color: "text-blue-600 bg-blue-50 border-blue-200" },
  unenroll_user: { label: "Unenroll Student", icon: Users, color: "text-blue-700 bg-blue-50 border-blue-200" },
  create_course: { label: "Create Individual Class", icon: PlusCircle, color: "text-blue-600 bg-blue-50 border-blue-200" },
  update_course: { label: "Update Individual Class", icon: Edit3, color: "text-blue-600 bg-blue-50 border-blue-200" },
  delete_course: { label: "Delete Individual Class", icon: Trash2, color: "text-red-600 bg-red-50 border-red-200" },
  add_module: { label: "Add Syllabus Module", icon: FolderPlus, color: "text-blue-600 bg-blue-50 border-blue-200" },
  delete_module: { label: "Delete Syllabus Module", icon: Trash2, color: "text-red-600 bg-red-50 border-red-200" },
  add_lesson: { label: "Add Lesson Video", icon: PlayCircle, color: "text-blue-600 bg-blue-50 border-blue-200" },
  delete_lesson: { label: "Delete Lesson Video", icon: Trash2, color: "text-red-600 bg-red-50 border-red-200" },
  add_course_material: { label: "Upload Resource / Material", icon: Upload, color: "text-blue-600 bg-blue-50 border-blue-200" },
  delete_course_material: { label: "Delete Class Material", icon: Trash2, color: "text-red-600 bg-red-50 border-red-200" },
  schedule_class: { label: "Schedule Live BigBlueButton Class", icon: Video, color: "text-blue-700 bg-blue-50 border-blue-200" },
  start_class: { label: "Launch Live Class Room", icon: Radio, color: "text-red-600 bg-red-50 border-red-200" },
  end_class: { label: "Conclude Live Class", icon: CheckCircle2, color: "text-slate-600 bg-slate-50 border-slate-200" },
  approve_class: { label: "Approve Live Class Proposal", icon: CheckCircle2, color: "text-blue-600 bg-blue-50 border-blue-200" },
  reject_class: { label: "Decline Live Class Proposal", icon: X, color: "text-red-600 bg-red-50 border-red-200" },
  approve_trial: { label: "Approve 1-on-1 Free Trial", icon: CalendarCheck, color: "text-blue-600 bg-blue-50 border-blue-200" },
  reject_trial: { label: "Decline Free Trial Request", icon: X, color: "text-red-600 bg-red-50 border-red-200" },
  approve_course: { label: "Publish Individual Class", icon: ShieldCheck, color: "text-blue-600 bg-blue-50 border-blue-200" },
  reject_course: { label: "Return Class to Draft", icon: AlertCircle, color: "text-blue-700 bg-blue-50 border-blue-200" },
  update_bundles: { label: "Update Pricing Packages", icon: Coins, color: "text-blue-600 bg-blue-50 border-blue-200" },
  clear_all_data: { label: "Wipe LMS Platform Data", icon: Trash2, color: "text-blue-700 bg-blue-50 border-blue-200" },
  system_test: { label: "System Health Audit Check", icon: ShieldCheck, color: "text-slate-600 bg-slate-50 border-slate-200" },
};

const AUDIT_CATEGORY_CONFIG: Record<string, { label: string; icon: any; badge: string; bg: string; text: string }> = {
  ALL: { label: "All Operations", icon: Layers, badge: "bg-[#0c2461] text-white", bg: "bg-slate-50", text: "text-slate-900" },
  USER: { label: "Users & Accounts", icon: Users, badge: "bg-blue-100 text-blue-800 border border-blue-200", bg: "bg-blue-50", text: "text-blue-600" },
  COURSE: { label: "Curriculum & Syllabi", icon: BookOpen, badge: "bg-blue-100 text-blue-800 border border-blue-200", bg: "bg-blue-50", text: "text-blue-600" },
  CLASS: { label: "Live Classes", icon: Video, badge: "bg-blue-100 text-blue-800 border border-blue-200", bg: "bg-blue-50", text: "text-blue-700" },
  TRIAL: { label: "1-on-1 Trials", icon: CalendarCheck, badge: "bg-blue-100 text-blue-800 border border-blue-200", bg: "bg-blue-50", text: "text-blue-700" },
  FINANCE: { label: "Tuition & Credit", icon: DollarSign, badge: "bg-blue-100 text-blue-800 border border-blue-200", bg: "bg-blue-50", text: "text-blue-800" },
  PRICING: { label: "Token Bundles", icon: Coins, badge: "bg-blue-100 text-blue-800 border border-blue-200", bg: "bg-blue-50", text: "text-blue-600" },
  GENERAL: { label: "System General", icon: ShieldCheck, badge: "bg-slate-100 text-slate-800 border border-slate-200", bg: "bg-slate-50", text: "text-slate-600" },
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "overview" | "live_classes" | "attendance" | "users" | "courses" | "subjects" | "schools" | "chats" | "finances" | "approvals" | "pricing" | "audit_log"
  >("overview");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [tutorList, setTutorList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [adminName, setAdminName] = useState<string>(
    process.env.DEFAULT_ADMIN_NAME || "Administrator"
  );
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [copiedAdminId, setCopiedAdminId] = useState(false);

  const handleCopyAdminId = (idStr: string) => {
    if (!idStr) return;
    navigator.clipboard.writeText(idStr);
    setCopiedAdminId(true);
    setTimeout(() => setCopiedAdminId(false), 2000);
  };

  const getAdminInitials = (nameStr: string) => {
    const parts = (nameStr || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "AD";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const adminTimezone = typeof window !== "undefined" ? getUserBrowserTimezone() : DEFAULT_TIMEZONE;
  const [pendingClassesList, setPendingClassesList] = useState<any[]>([]);
  const [pendingTrialsList, setPendingTrialsList] = useState<any[]>([]);
  const [allTrialsList, setAllTrialsList] = useState<any[]>([]);
  const [showStudentTrialsModal, setShowStudentTrialsModal] = useState<boolean>(false);
  const [selectedStudentForTrials, setSelectedStudentForTrials] = useState<any | null>(null);
  const [isResettingTrialId, setIsResettingTrialId] = useState<string | null>(null);
  const [isResettingAllTrials, setIsResettingAllTrials] = useState<boolean>(false);
  const [trialsSubViewMode, setTrialsSubViewMode] = useState<"PENDING" | "ALL">("PENDING");
  const [allTrialsSearch, setAllTrialsSearch] = useState<string>("");
  const [allTrialsStatusFilter, setAllTrialsStatusFilter] = useState<string>("ALL");
  const [pendingCoursesList, setPendingCoursesList] = useState<any[]>([]);
  const [totalPendingApprovals, setTotalPendingApprovals] = useState<number>(0);
  const [approvalSubTab, setApprovalSubTab] = useState<"ALL" | "CLASSES" | "TRIALS" | "COURSES">("ALL");
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);

  const [rejectionModalData, setRejectionModalData] = useState<{
    isOpen: boolean;
    type: "CLASS" | "TRIAL" | "COURSE";
    id: string;
    title: string;
    tutorName?: string;
  }>({
    isOpen: false,
    type: "CLASS",
    id: "",
    title: "",
  });
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const [liveClassFilter, setLiveClassFilter] = useState<"ALL" | "LIVE" | "SCHEDULED" | "COMPLETED" | "RECORDINGS" | "ATTENDANCE">("ALL");
  const [isDeletingRecording, setIsDeletingRecording] = useState<string | null>(null);
  const [liveClassSearch, setLiveClassSearch] = useState("");
  const [endingClassId, setEndingClassId] = useState<string | null>(null);
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseCourseFilter, setPurchaseCourseFilter] = useState("ALL");

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [isAddUserFullScreen, setIsAddUserFullScreen] = useState(true);
  const [isEditUserFullScreen, setIsEditUserFullScreen] = useState(true);
  const [showEnrollUserModal, setShowEnrollUserModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<any | null>(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  const handleOpenUserProfile = (user: any) => {
    setSelectedUserForProfile(user);
    setShowUserProfileModal(true);
  };

  const [formUserName, setFormUserName] = useState("");
  const [formUserEmail, setFormUserEmail] = useState("");
  const [formUserPhone, setFormUserPhone] = useState("");
  const [formUserCountry, setFormUserCountry] = useState("Sri Lanka");
  const [formUserCountryDial, setFormUserCountryDial] = useState(DEFAULT_DIAL_CODE);
  const [formUserPassword, setFormUserPassword] = useState("");
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [formUserRole, setFormUserRole] = useState("TUTOR");
  const [formUserHeadline, setFormUserHeadline] = useState("");
  const [formUserBio, setFormUserBio] = useState("");
  const [formUserHourlyRate, setFormUserHourlyRate] = useState("5000");
  const [formUserHourlyRateAL, setFormUserHourlyRateAL] = useState("5000");
  const [formUserHourlyRateOL, setFormUserHourlyRateOL] = useState("3500");
  const [formUserIsALTutor, setFormUserIsALTutor] = useState(true);
  const [formUserIsOLTutor, setFormUserIsOLTutor] = useState(true);
  const [formUserTimezone, setFormUserTimezone] = useState(DEFAULT_TIMEZONE);
  const [selectedCourseToEnroll, setSelectedCourseToEnroll] = useState("");
  const [showUserCreatedSuccessModal, setShowUserCreatedSuccessModal] = useState(false);
  const [createdUserSuccess, setCreatedUserSuccess] = useState<{
    name: string;
    email: string;
    country?: string | null;
    password?: string;
    role: string;
    tutorId?: string | null;
    adminId?: string | null;
    message?: string;
  } | null>(null);
  const [copiedSuccessEmail, setCopiedSuccessEmail] = useState(false);
  const [copiedSuccessPassword, setCopiedSuccessPassword] = useState(false);
  const [copiedSuccessTutorId, setCopiedSuccessTutorId] = useState(false);
  const [copiedSuccessAdminId, setCopiedSuccessAdminId] = useState(false);
  const [showSuccessPassword, setShowSuccessPassword] = useState(false);

  const [showGrantTokensModal, setShowGrantTokensModal] = useState(false);
  const [selectedStudentForTokens, setSelectedStudentForTokens] = useState<any>(null);
  const [grantTokensAmount, setGrantTokensAmount] = useState<number>(6);
  const [grantTokensReason, setGrantTokensReason] = useState<string>("Free Trial Consultation Grant");
  const [grantTokensMode, setGrantTokensMode] = useState<"ADD" | "SET">("ADD");
  const [isGrantingTokens, setIsGrantingTokens] = useState(false);
  const [grantFeedbackMsg, setGrantFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [bundlesList, setBundlesList] = useState<TokenBundle[]>([]);
  const [showBundleEditorModal, setShowBundleEditorModal] = useState(false);
  const [editingBundles, setEditingBundles] = useState<TokenBundle[]>([]);
  const [selectedBundleIndex, setSelectedBundleIndex] = useState<number>(0);
  const [newFeatureInput, setNewFeatureInput] = useState<string>("");
  const [isSavingBundles, setIsSavingBundles] = useState(false);
  const [bundleSaveMsg, setBundleSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [payGrades, setPayGrades] = useState<{
    igcseRateLkr: number;
    ialRateLkr: number;
    tier1MinHours: number;
    tier1BonusLkr: number;
    tier2MinHours: number;
    tier2BonusLkr: number;
    tier3MinHours: number;
    tier3BonusLkr: number;
  }>({
    igcseRateLkr: 750,
    ialRateLkr: 850,
    tier1MinHours: 50,
    tier1BonusLkr: 5000,
    tier2MinHours: 75,
    tier2BonusLkr: 7500,
    tier3MinHours: 100,
    tier3BonusLkr: 10000,
  });
  const [payGradesInput, setPayGradesInput] = useState<{
    igcse: string;
    ial: string;
    tier1MinHours: string;
    tier1BonusLkr: string;
    tier2MinHours: string;
    tier2BonusLkr: string;
    tier3MinHours: string;
    tier3BonusLkr: string;
  }>({
    igcse: "750",
    ial: "850",
    tier1MinHours: "50",
    tier1BonusLkr: "5000",
    tier2MinHours: "75",
    tier2BonusLkr: "7500",
    tier3MinHours: "100",
    tier3BonusLkr: "10000",
  });
  const [isSavingPayGrades, setIsSavingPayGrades] = useState(false);
  const [payGradesSaveMsg, setPayGradesSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tutorPayoutOverview, setTutorPayoutOverview] = useState<any>(null);
  const [tutorPayoutSearch, setTutorPayoutSearch] = useState<string>("");

  const [schoolsList, setSchoolsList] = useState<AcademicSchool[]>([]);
  const [showAddSchoolModal, setShowAddSchoolModal] = useState(false);
  const [showEditSchoolModal, setShowEditSchoolModal] = useState(false);
  const [showDeleteSchoolModal, setShowDeleteSchoolModal] = useState(false);
  const [selectedSchoolForEdit, setSelectedSchoolForEdit] = useState<AcademicSchool | null>(null);
  const [selectedSchoolForDelete, setSelectedSchoolForDelete] = useState<AcademicSchool | null>(null);
  const [schoolFormName, setSchoolFormName] = useState("");
  const [schoolFormDesc, setSchoolFormDesc] = useState("");
  const [schoolFormActive, setSchoolFormActive] = useState(true);
  const [deleteReassignTarget, setDeleteReassignTarget] = useState("");
  const [isSavingSchool, setIsSavingSchool] = useState(false);
  const [schoolActionMsg, setSchoolActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [adminCourseViewMode, setAdminCourseViewMode] = useState<"masterclasses" | "tutors">("masterclasses");
  const [courseSearch, setCourseSearch] = useState("");
  const [courseCatFilter, setCourseCatFilter] = useState("ALL");
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [showManageSyllabusModal, setShowManageSyllabusModal] = useState(false);
  const [selectedCourseForEdit, setSelectedCourseForEdit] = useState<any>(null);
  const [selectedCourseForSyllabus, setSelectedCourseForSyllabus] = useState<any>(null);

  const [courseFormTitle, setCourseFormTitle] = useState("");
  const [courseFormCode, setCourseFormCode] = useState("");
  const [courseFormCategory, setCourseFormCategory] = useState("Mathematics & Computing");
  const [courseFormPrice, setCourseFormPrice] = useState("0");
  const [courseFormLevel, setCourseFormLevel] = useState("ADVANCED");
  const [courseFormStatus, setCourseFormStatus] = useState("PUBLISHED");
  const [courseFormSubtitle, setCourseFormSubtitle] = useState("");
  const [courseFormInstructorId, setCourseFormInstructorId] = useState("");

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDuration, setNewLessonDuration] = useState("30");
  const [selectedModuleIdForLesson, setSelectedModuleIdForLesson] = useState("");

  const [showManageMaterialsModal, setShowManageMaterialsModal] = useState(false);
  const [selectedCourseForMaterials, setSelectedCourseForMaterials] = useState<any>(null);
  const [matFormTitle, setMatFormTitle] = useState("");
  const [matFormCategory, setMatFormCategory] = useState("HANDOUT");
  const [matFormDesc, setMatFormDesc] = useState("");
  const [selectedMatUploadFile, setSelectedMatUploadFile] = useState<File | null>(null);
  const [uploadingCourseMaterial, setUploadingCourseMaterial] = useState(false);
  const [materialStatusMsg, setMaterialStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [matSearchQuery, setMatSearchQuery] = useState("");

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
      document.cookie = "edupulse_user_role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "edupulse_user_email=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "edupulse_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.href = "/login";
    }
  };

  const [fetchError, setFetchError] = useState<string | null>(null);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);
  const [auditLogSearch, setAuditLogSearch] = useState("");
  const [auditLogCategory, setAuditLogCategory] = useState("ALL");
  const [auditLogPage, setAuditLogPage] = useState(1);
  const [auditLogTotalPages, setAuditLogTotalPages] = useState(1);
  const [auditLogTotalCount, setAuditLogTotalCount] = useState(0);
  const [auditLogStats, setAuditLogStats] = useState({
    last24hCount: 0,
    userCount: 0,
    courseCount: 0,
    classTrialCount: 0,
    financePricingCount: 0,
  });
  const [selectedLogForModal, setSelectedLogForModal] = useState<any | null>(null);
  const [copiedLogJson, setCopiedLogJson] = useState(false);

  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearDataConfirmInput, setClearDataConfirmInput] = useState("");
  const [isClearingAllData, setIsClearingAllData] = useState(false);
  const [clearDataSuccessMsg, setClearDataSuccessMsg] = useState<string | null>(null);
  const [clearDataErrorMsg, setClearDataErrorMsg] = useState<string | null>(null);

  const handleOpenClearDataModal = () => {
    setClearDataConfirmInput("");
    setClearDataErrorMsg(null);
    setClearDataSuccessMsg(null);
    setShowClearDataModal(true);
  };

  const handleExecuteClearAllData = async () => {
    if (clearDataConfirmInput.trim().toUpperCase() !== "CLEAR DATA") {
      setClearDataErrorMsg("Please type 'CLEAR DATA' exactly to confirm.");
      return;
    }

    try {
      setIsClearingAllData(true);
      setClearDataErrorMsg(null);
      setClearDataSuccessMsg(null);

      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all_data" }),
      });

      const data = await res.json();
      if (res.ok) {
        setClearDataSuccessMsg(data.message || "All platform data has been cleared. Admin login preserved.");
        await fetchAdminData(false);
        if (activeTab === "audit_log") {
          fetchAuditLogs(1, "", "ALL");
        }
        setTimeout(() => {
          setShowClearDataModal(false);
          setClearDataConfirmInput("");
          setClearDataSuccessMsg(null);
        }, 2200);
      } else {
        setClearDataErrorMsg(data.error || "Failed to clear platform data.");
      }
    } catch (err: any) {
      console.error("Error clearing platform data:", err);
      setClearDataErrorMsg(err?.message || "An unexpected error occurred while clearing data.");
    } finally {
      setIsClearingAllData(false);
    }
  };

  const [adminConversations, setAdminConversations] = useState<any[]>([]);
  const [adminChatsLoading, setAdminChatsLoading] = useState(false);
  const [adminChatsSearch, setAdminChatsSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [loadingConversationMessages, setLoadingConversationMessages] = useState(false);
  const [decryptedAdminMessages, setDecryptedAdminMessages] = useState<Record<string, string>>({});
  const [adminChatStats, setAdminChatStats] = useState({ totalConversations: 0, totalMessages: 0 });
  const [activeAdminCryptoKey, setActiveAdminCryptoKey] = useState<CryptoKey | null>(null);
  const [chatMessageSearch, setChatMessageSearch] = useState("");
  const [isDeletingMessageId, setIsDeletingMessageId] = useState<string | null>(null);
  const [isDeletingConvId, setIsDeletingConvId] = useState<string | null>(null);

  const fetchAdminChats = async (search = adminChatsSearch) => {
    try {
      setAdminChatsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/chats?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAdminConversations(data.conversations || []);
        if (data.stats) {
          setAdminChatStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Error fetching admin conversations:", err);
    } finally {
      setAdminChatsLoading(false);
    }
  };

  const handleSelectConversation = async (conv: any) => {
    setSelectedConversationId(conv.id);
    setSelectedConversation(conv);
    setLoadingConversationMessages(true);
    setConversationMessages([]);
    setDecryptedAdminMessages({});
    setChatMessageSearch("");

    try {
      let key: CryptoKey | null = null;
      try {
        if (typeof window !== "undefined" && conv.participantAId && conv.participantBId) {
          key = await deriveConversationKey(conv.participantAId, conv.participantBId);
          setActiveAdminCryptoKey(key);
        }
      } catch (keyErr) {
        console.warn("Failed to derive E2EE key for conversation:", keyErr);
      }

      const res = await fetch(`/api/admin/chats?conversationId=${conv.id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || [];
        setConversationMessages(msgs);

        const decrypted: Record<string, string> = {};
        for (const m of msgs) {
          if (m.encryptedContent && m.iv && key) {
            try {
              const plain = await decryptMessage(m.encryptedContent, m.iv, key);
              decrypted[m.id] = plain;
            } catch {
              decrypted[m.id] = m.encryptedContent;
            }
          } else {
            decrypted[m.id] = m.encryptedContent || "";
          }
        }
        setDecryptedAdminMessages(decrypted);
      }
    } catch (err) {
      console.error("Error loading conversation messages:", err);
    } finally {
      setLoadingConversationMessages(false);
    }
  };

  const handleDeleteChatMessage = (messageId: string) => {
    setConfirmModalData({
      isOpen: true,
      title: "Delete Chat Message?",
      description: "This will permanently remove this message from the conversation for both participants.",
      variant: "danger",
      onConfirm: async () => {
        try {
          setIsDeletingMessageId(messageId);
          const res = await fetch(`/api/admin/chats?messageId=${messageId}`, { method: "DELETE" });
          if (res.ok) {
            setConversationMessages((prev) => prev.filter((m) => m.id !== messageId));
            fetchAdminChats();
          }
        } catch (err) {
          console.error("Error deleting message:", err);
        } finally {
          setIsDeletingMessageId(null);
          setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteConversation = (convId: string) => {
    setConfirmModalData({
      isOpen: true,
      title: "Delete Entire Conversation?",
      description: "This will permanently delete this conversation and all associated messages between the participants.",
      variant: "danger",
      onConfirm: async () => {
        try {
          setIsDeletingConvId(convId);
          const res = await fetch(`/api/admin/chats?conversationId=${convId}`, { method: "DELETE" });
          if (res.ok) {
            if (selectedConversationId === convId) {
              setSelectedConversationId(null);
              setSelectedConversation(null);
              setConversationMessages([]);
            }
            fetchAdminChats();
          }
        } catch (err) {
          console.error("Error deleting conversation:", err);
        } finally {
          setIsDeletingConvId(null);
          setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const fetchAuditLogs = async (page = 1, search = auditLogSearch, category = auditLogCategory) => {
    try {
      setAuditLogsLoading(true);
      setAuditLogsError(null);
      const params = new URLSearchParams({ page: String(page), pageSize: "50", search, category });
      const res = await fetch(`/api/admin/audit-log?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setAuditLogPage(data.page || 1);
        setAuditLogTotalPages(data.totalPages || 1);
        setAuditLogTotalCount(data.totalCount || 0);
        if (data.stats) {
          setAuditLogStats(data.stats);
        }
      } else {
        setAuditLogsError("Failed to load audit logs from the server.");
      }
    } catch (err: any) {
      setAuditLogsError(err.message || "Network error fetching audit logs.");
    } finally {
      setAuditLogsLoading(false);
    }
  };

  const handleExportAuditLogCSV = () => {
    if (auditLogs.length === 0) return;
    const headers = "Timestamp,ISO Date,Admin Email,Admin ID,Action Code,Category,Target Label,Target ID,IP Address,Details\n";
    const rows = auditLogs
      .map((l) => {
        const detailsStr = l.details ? JSON.stringify(l.details).replace(/"/g, '""') : "";
        const targetStr = (l.targetLabel || "").replace(/"/g, '""');
        return `"${new Date(l.createdAt).toLocaleString()}","${l.createdAt}","${l.adminEmail}","${l.adminId}","${l.action}","${l.category}","${targetStr}","${l.targetId || ""}","${l.ipAddress || ""}","${detailsStr}"`;
      })
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `edupulse_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const prevTabRef = React.useRef<string>("");
  React.useEffect(() => {
    if (activeTab === "audit_log" && prevTabRef.current !== "audit_log") {
      fetchAuditLogs(1, "", "ALL");
    }
    if (activeTab === "chats" && prevTabRef.current !== "chats") {
      fetchAdminChats();
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  const fetchAdminData = async (isInitial?: any) => {
    try {
      if (isInitial === true && coursesList.length === 0) {
        setLoading(true);
      }
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
        setTutorList(data.tutors || data.faculty || []);
        setEventsList(data.events || []);
        setPendingClassesList(data.pendingClasses || []);
        setPendingTrialsList(data.pendingTrials || []);
        setAllTrialsList(data.allTrials || []);
        setPendingCoursesList(data.pendingCourses || []);
        setTotalPendingApprovals(data.totalPendingApprovals || 0);
        if (data.bundles && data.bundles.length > 0) {
          setBundlesList(data.bundles);
        }
        if (data.payGrades) {
          setPayGrades(data.payGrades);
          setPayGradesInput({
            igcse: String(data.payGrades.igcseRateLkr ?? 750),
            ial: String(data.payGrades.ialRateLkr ?? 850),
            tier1MinHours: String(data.payGrades.tier1MinHours ?? 50),
            tier1BonusLkr: String(data.payGrades.tier1BonusLkr ?? 5000),
            tier2MinHours: String(data.payGrades.tier2MinHours ?? 75),
            tier2BonusLkr: String(data.payGrades.tier2BonusLkr ?? 7500),
            tier3MinHours: String(data.payGrades.tier3MinHours ?? 100),
            tier3BonusLkr: String(data.payGrades.tier3BonusLkr ?? 10000),
          });
        }
        if (data.tutorPayoutOverview) {
          setTutorPayoutOverview(data.tutorPayoutOverview);
        }
        const incomingSubjects = data.subjects || data.schools;
        if (incomingSubjects && Array.isArray(incomingSubjects)) {
          setSchoolsList(incomingSubjects);
        }
        if (data.adminProfile) {
          if (data.adminProfile.name) {
            setAdminName(data.adminProfile.name);
          }
          if (data.adminProfile.avatar) {
            setAdminAvatar(data.adminProfile.avatar);
          }
          if (data.adminProfile.adminId) {
            setAdminId(data.adminProfile.adminId);
          }
        }
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
    fetchAdminData(true);
  }, []);

  useRealtimeSync({
    onSync: () => {
      fetchAdminData(false);
      if (activeTab === "audit_log") {
        fetchAuditLogs(auditLogPage, auditLogSearch, auditLogCategory);
      }
      if (activeTab === "chats") {
        fetchAdminChats();
        if (selectedConversationId && activeAdminCryptoKey) {
          fetch(`/api/admin/chats?conversationId=${selectedConversationId}`, { cache: "no-store" })
            .then((r) => r.json())
            .then(async (d) => {
              if (d.messages) {
                setConversationMessages(d.messages);
                const decrypted: Record<string, string> = {};
                for (const m of d.messages) {
                  if (m.encryptedContent && m.iv) {
                    try {
                      decrypted[m.id] = await decryptMessage(m.encryptedContent, m.iv, activeAdminCryptoKey);
                    } catch {
                      decrypted[m.id] = m.encryptedContent;
                    }
                  } else {
                    decrypted[m.id] = m.encryptedContent || "";
                  }
                }
                setDecryptedAdminMessages(decrypted);
              }
            })
            .catch(() => {});
        }
      }
    },
  });

  const filteredUsers = useMemo(() => {
    return allUsersList.filter((u) => {
      const q = userSearch.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.studentId && u.studentId.toLowerCase().includes(q)) ||
        (u.tutorId && u.tutorId.toLowerCase().includes(q)) ||
        (u.adminId && u.adminId.toLowerCase().includes(q)) ||
        (u.headline && u.headline.toLowerCase().includes(q)) ||
        (u.country && u.country.toLowerCase().includes(q));
      const matchesRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [allUsersList, userSearch, userRoleFilter]);

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

  const totalEnrollmentsCount = useMemo(() => {
    return coursesList.reduce((acc, c) => acc + (c.enrollments?.length || 0), 0);
  }, [coursesList]);

  const totalCalculatedRevenue = useMemo(() => {
    return coursesList.reduce((acc, c) => {
      const count = c.enrollments?.length || 0;
      return acc + count * (c.price ?? 0);
    }, 0);
  }, [coursesList]);

  const getUserRates = (user: any): { alRate: string; olRate: string; isAL: boolean; isOL: boolean } => {
    if (!user?.bio) return { alRate: "5000", olRate: "3500", isAL: true, isOL: true };
    try {
      const parsed = typeof user.bio === "string" && user.bio.trim().startsWith("{") ? JSON.parse(user.bio) : null;
      const base = parsed?.hourlyRate ? String(parsed.hourlyRate) : "5000";
      const al = parsed?.hourlyRateAL ? String(parsed.hourlyRateAL) : base;
      const ol = parsed?.hourlyRateOL ? String(parsed.hourlyRateOL) : (Number(base) > 0 ? String(Math.round(Number(base) * 0.75)) : "3500");
      const isAL = parsed?.isALTutor !== undefined ? Boolean(parsed.isALTutor) : true;
      const isOL = parsed?.isOLTutor !== undefined ? Boolean(parsed.isOLTutor) : true;
      return { alRate: al, olRate: ol, isAL, isOL };
    } catch {
      return { alRate: "5000", olRate: "3500", isAL: true, isOL: true };
    }
  };

  const getUserHourlyRate = (user: any): string => {
    return getUserRates(user).alRate;
  };

  const handleOpenAddUser = () => {
    setFormUserName("");
    setFormUserEmail("");
    setFormUserPhone("");
    setFormUserCountry("Sri Lanka");
    setFormUserCountryDial(DEFAULT_DIAL_CODE);
    setFormUserPassword("");
    setShowUserPassword(false);
    setFormUserRole("TUTOR");
    setFormUserHeadline("");
    setFormUserBio("");
    setFormUserHourlyRate("5000");
    setFormUserHourlyRateAL("5000");
    setFormUserHourlyRateOL("3500");
    setFormUserIsALTutor(true);
    setFormUserIsOLTutor(true);
    setFormUserTimezone(DEFAULT_TIMEZONE);
    setIsAddUserFullScreen(true);
    setShowAddUserModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let resolvedEmail = formUserEmail.trim().toLowerCase();

      if (!resolvedEmail || !resolvedEmail.includes("@")) {
        alert("Please enter a valid email address.");
        return;
      }

      let fullPhoneNumber = formUserPhone.trim();
      if (fullPhoneNumber) {
        if (!fullPhoneNumber.startsWith("+")) {
          const digits = fullPhoneNumber.replace(/^0+/, "").replace(/[\s\-\(\)]/g, "");
          fullPhoneNumber = digits ? `${formUserCountryDial}${digits}` : "";
        }
      }

      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_user",
          name: formUserName,
          email: resolvedEmail,
          phone: fullPhoneNumber || undefined,
          country: formUserCountry.trim() || undefined,
          password: formUserPassword,
          role: formUserRole,
          headline: formUserHeadline,
          bio: formUserBio,
          hourlyRate: formUserHourlyRateAL,
          hourlyRateAL: formUserHourlyRateAL,
          hourlyRateOL: formUserHourlyRateOL,
          isALTutor: formUserIsALTutor,
          isOLTutor: formUserIsOLTutor,
          timezone: formUserTimezone,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowAddUserModal(false);
        fetchAdminData();
        setCreatedUserSuccess({
          name: formUserName,
          email: resolvedEmail,
          country: formUserCountry.trim() || null,
          password: formUserPassword,
          role: formUserRole,
          tutorId: data.user?.tutorId || null,
          adminId: data.user?.adminId || null,
          message: data.message || "Tutor account created successfully. The verification email will be dispatched when the tutor logs in for the first time.",
        });
        setCopiedSuccessEmail(false);
        setCopiedSuccessPassword(false);
        setShowSuccessPassword(false);
        setShowUserCreatedSuccessModal(true);
      } else {
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
    const userCountry = user.country || "Sri Lanka";
    setFormUserCountry(userCountry);
    let initialDial = DEFAULT_DIAL_CODE;
    const matchedCountry = findCountry(userCountry);
    if (matchedCountry?.dialCode) {
      initialDial = matchedCountry.dialCode;
    }
    let rawPhone = (user.phone || "").trim();
    if (rawPhone.startsWith("+")) {
      const matchedDial = COUNTRY_DIAL_CODES.find((c) => rawPhone.startsWith(c.dial));
      if (matchedDial) {
        initialDial = matchedDial.dial;
        rawPhone = rawPhone.slice(matchedDial.dial.length).trim();
      }
    }
    setFormUserCountryDial(initialDial);
    setFormUserPhone(formatSubscriberPhone(rawPhone));
    setFormUserRole(user.role);
    setFormUserHeadline(user.headline || "");
    setFormUserBio(user.bio || "");
    setFormUserTimezone(user.timezone || DEFAULT_TIMEZONE);
    const rates = getUserRates(user);
    setFormUserHourlyRate(rates.alRate);
    setFormUserHourlyRateAL(rates.alRate);
    setFormUserHourlyRateOL(rates.olRate);
    setFormUserIsALTutor(rates.isAL);
    setFormUserIsOLTutor(rates.isOL);
    setIsEditUserFullScreen(true);
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    try {
      let fullPhoneNumber = formUserPhone.trim();
      if (fullPhoneNumber) {
        if (!fullPhoneNumber.startsWith("+")) {
          const digits = fullPhoneNumber.replace(/^0+/, "").replace(/[\s\-\(\)]/g, "");
          fullPhoneNumber = digits ? `${formUserCountryDial}${digits}` : "";
        }
      }

      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_user",
          userId: selectedUserForEdit.id,
          name: formUserName,
          email: formUserEmail,
          phone: fullPhoneNumber || null,
          country: formUserCountry.trim() || null,
          role: formUserRole,
          headline: formUserHeadline,
          bio: formUserBio,
          hourlyRate: formUserHourlyRateAL,
          hourlyRateAL: formUserHourlyRateAL,
          hourlyRateOL: formUserHourlyRateOL,
          isALTutor: formUserIsALTutor,
          isOLTutor: formUserIsOLTutor,
          timezone: formUserTimezone,
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

  const handleOpenGrantTokens = (student?: any) => {
    if (student) {
      setSelectedStudentForTokens(student);
    } else {
      const firstStudent = allUsersList.find((u) => u.role === "STUDENT") || null;
      setSelectedStudentForTokens(firstStudent);
    }
    setGrantTokensAmount(6);
    setGrantTokensReason("Free Trial Consultation Grant");
    setGrantTokensMode("ADD");
    setGrantFeedbackMsg(null);
    setShowGrantTokensModal(true);
  };

  const handleGrantTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForTokens) {
      setGrantFeedbackMsg({ type: "error", text: "Please select a student." });
      return;
    }
    if (grantTokensAmount <= 0) {
      setGrantFeedbackMsg({ type: "error", text: "Please enter a valid credit amount (> 0)." });
      return;
    }

    try {
      setIsGrantingTokens(true);
      setGrantFeedbackMsg(null);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_tokens",
          userId: selectedStudentForTokens.id,
          amount: grantTokensAmount,
          reason: grantTokensReason,
          mode: grantTokensMode,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setGrantFeedbackMsg({
          type: "success",
          text: data.message || `Successfully credited ${grantTokensAmount} free hours to ${selectedStudentForTokens.name}!`,
        });
        await fetchAdminData(false);
        setTimeout(() => {
          setShowGrantTokensModal(false);
          setGrantFeedbackMsg(null);
        }, 1300);
      } else {
        setGrantFeedbackMsg({
          type: "error",
          text: data.error || "Failed to grant credit to student.",
        });
      }
    } catch (err: any) {
      console.error("Grant credit error:", err);
      setGrantFeedbackMsg({
        type: "error",
        text: err.message || "Network error connecting to server.",
      });
    } finally {
      setIsGrantingTokens(false);
    }
  };

  const trialsForSelectedStudent = useMemo(() => {
    if (!selectedStudentForTrials) return [];
    return allTrialsList.filter(
      (t) =>
        t.studentId === selectedStudentForTrials.id ||
        (t.studentEmail && t.studentEmail.toLowerCase() === selectedStudentForTrials.email.toLowerCase())
    );
  }, [allTrialsList, selectedStudentForTrials]);

  const filteredAllTrials = useMemo(() => {
    return allTrialsList.filter((tr) => {
      const tutorName = tr.tutor?.name || tr.course?.tutor?.name || "";
      const matchesSearch =
        !allTrialsSearch.trim() ||
        tr.studentName?.toLowerCase().includes(allTrialsSearch.toLowerCase()) ||
        tr.studentEmail?.toLowerCase().includes(allTrialsSearch.toLowerCase()) ||
        tutorName.toLowerCase().includes(allTrialsSearch.toLowerCase()) ||
        tr.course?.title?.toLowerCase().includes(allTrialsSearch.toLowerCase());

      const matchesStatus =
        allTrialsStatusFilter === "ALL" ||
        (allTrialsStatusFilter === "PENDING" && (tr.status === "PENDING" || tr.status === "PENDING_APPROVAL")) ||
        tr.status === allTrialsStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allTrialsList, allTrialsSearch, allTrialsStatusFilter]);

  const handleOpenStudentTrials = (student: any) => {
    setSelectedStudentForTrials(student);
    setShowStudentTrialsModal(true);
  };

  const handleResetTrial = async (trialId: string, tutorName?: string) => {
    const confirmMsg = tutorName
      ? `Reset this trial session with ${tutorName}? This will cancel the previous trial booking and allow the student to request a free trial with ${tutorName} again.`
      : "Reset this trial session? This will cancel the previous booking and allow the student to request this tutor again.";

    if (!confirm(confirmMsg)) return;

    setIsResettingTrialId(trialId);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_student_trial",
          trialId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchAdminData(false);
      } else {
        alert(data.error || "Failed to reset trial session.");
      }
    } catch (err) {
      console.error("Error resetting trial:", err);
      alert("Network error while resetting trial.");
    } finally {
      setIsResettingTrialId(null);
    }
  };

  const handleResetAllStudentTrials = async (studentId: string, studentName?: string) => {
    const confirmMsg = studentName
      ? `Are you sure you want to reset ALL trial restrictions for ${studentName}? The student will be eligible to request free trial sessions with any tutor again.`
      : "Are you sure you want to reset all trial restrictions for this student?";

    if (!confirm(confirmMsg)) return;

    setIsResettingAllTrials(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_student_trials",
          studentId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchAdminData(false);
      } else {
        alert(data.error || "Failed to reset student trials.");
      }
    } catch (err) {
      console.error("Error resetting all trials:", err);
      alert("Network error while resetting student trials.");
    } finally {
      setIsResettingAllTrials(false);
    }
  };

  const handleDeleteTrial = async (trialId: string) => {
    if (!confirm("Permanently delete this trial record from the database?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_trial", trialId }),
      });
      if (res.ok) {
        await fetchAdminData(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete trial.");
      }
    } catch (err) {
      console.error("Error deleting trial:", err);
    }
  };

  const handleOpenBundleEditor = (targetIndex?: any) => {
    const source = (bundlesList.length > 0 ? bundlesList : DEFAULT_BUNDLES).map((b) => ({
      ...b,
      features: Array.isArray(b.features) ? [...b.features] : [],
    }));
    setEditingBundles(source);
    setSelectedBundleIndex(typeof targetIndex === "number" ? targetIndex : 0);
    setNewFeatureInput("");
    setBundleSaveMsg(null);
    setShowBundleEditorModal(true);
  };

  const handleSaveBundles = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSavingBundles(true);
      setBundleSaveMsg(null);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_bundles", bundles: editingBundles }),
      });
      const data = await res.json();
      if (res.ok) {
        setBundleSaveMsg({ type: "success", text: data.message || "Packages updated successfully!" });
        setBundlesList(data.bundles || editingBundles);
        setTimeout(() => {
          setShowBundleEditorModal(false);
          setBundleSaveMsg(null);
        }, 1200);
      } else {
        setBundleSaveMsg({ type: "error", text: data.error || "Failed to save packages." });
      }
    } catch (err: any) {
      setBundleSaveMsg({ type: "error", text: err.message || "Network error." });
    } finally {
      setIsSavingBundles(false);
    }
  };

  const handleSavePayGrades = async () => {
    try {
      setIsSavingPayGrades(true);
      setPayGradesSaveMsg(null);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_pay_grades",
          igcseRateLkr: Number(payGradesInput.igcse),
          ialRateLkr: Number(payGradesInput.ial),
          tier1MinHours: Number(payGradesInput.tier1MinHours),
          tier1BonusLkr: Number(payGradesInput.tier1BonusLkr),
          tier2MinHours: Number(payGradesInput.tier2MinHours),
          tier2BonusLkr: Number(payGradesInput.tier2BonusLkr),
          tier3MinHours: Number(payGradesInput.tier3MinHours),
          tier3BonusLkr: Number(payGradesInput.tier3BonusLkr),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update pay grades and bonus tiers.");
      if (data.payGrades) {
        setPayGrades(data.payGrades);
        setPayGradesInput({
          igcse: String(data.payGrades.igcseRateLkr),
          ial: String(data.payGrades.ialRateLkr),
          tier1MinHours: String(data.payGrades.tier1MinHours),
          tier1BonusLkr: String(data.payGrades.tier1BonusLkr),
          tier2MinHours: String(data.payGrades.tier2MinHours),
          tier2BonusLkr: String(data.payGrades.tier2BonusLkr),
          tier3MinHours: String(data.payGrades.tier3MinHours),
          tier3BonusLkr: String(data.payGrades.tier3BonusLkr),
        });
      }
      setPayGradesSaveMsg({ type: "success", text: "Pay grades and bonus tier settings saved successfully!" });
      setTimeout(() => setPayGradesSaveMsg(null), 3500);
      fetchAdminData();
    } catch (err: any) {
      setPayGradesSaveMsg({ type: "error", text: err.message || "Failed to save settings." });
    } finally {
      setIsSavingPayGrades(false);
    }
  };

  const handleResetStandardPayGrades = () => {
    setPayGradesInput({
      igcse: "750",
      ial: "850",
      tier1MinHours: "50",
      tier1BonusLkr: "5000",
      tier2MinHours: "75",
      tier2BonusLkr: "7500",
      tier3MinHours: "100",
      tier3BonusLkr: "10000",
    });
  };

  const handleResetBundlesToDefault = async () => {
    if (!confirm("Reset all token packages to official academy defaults?")) return;
    try {
      setIsSavingBundles(true);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_bundles", bundles: DEFAULT_BUNDLES }),
      });
      const data = await res.json();
      if (res.ok) {
        setBundlesList(data.bundles || DEFAULT_BUNDLES);
        setEditingBundles(DEFAULT_BUNDLES.map((b) => ({ ...b, features: [...b.features] })));
      }
    } catch (err) {
      console.error("Failed to reset bundles:", err);
    } finally {
      setIsSavingBundles(false);
    }
  };

  const handleAddNewBundle = () => {
    const newHours = 30;
    const newPack: TokenBundle = {
      id: `pack-${Date.now()}`,
      name: `${newHours} Hours Advanced Pack`,
      hours: newHours,
      tokens: newHours,
      price: 99,
      lkrPrice: 29700,
      olPrice: 79,
      olLkrPrice: 23700,
      popular: false,
      badge: "Extended",
      description: `${newHours} hours of comprehensive tutoring tokens for extensive revision and dedicated exam prep.`,
      roleTarget: `${newHours} Tokens (${newHours} Hours Tutoring)`,
      ctaText: `Get ${newHours} Hours Pack`,
      features: [
        `${newHours} tokens (1 token = 1 hour learning credit)`,
        "Flexible 1-on-1 private tutoring with Tutors",
        "Access to all live syllabus interactive classes",
        "Instant wallet crediting with zero expiration",
        "Full syllabus and past paper walkthrough clinics",
      ],
    };
    const updated = [...editingBundles, newPack];
    setEditingBundles(updated);
    setSelectedBundleIndex(updated.length - 1);
  };

  const handleDeleteBundle = (indexToDelete: number) => {
    if (editingBundles.length <= 1) {
      alert("You must keep at least one token bundle package.");
      return;
    }
    const updated = editingBundles.filter((_, idx) => idx !== indexToDelete);
    setEditingBundles(updated);
    setSelectedBundleIndex(Math.max(0, indexToDelete - 1));
  };

  const handleAddFeatureToBundle = (bundleIndex: number) => {
    const text = newFeatureInput.trim();
    if (!text) return;
    const updated = [...editingBundles];
    const target = updated[bundleIndex];
    if (target) {
      target.features = [...(target.features || []), text];
      setEditingBundles(updated);
      setNewFeatureInput("");
    }
  };

  const handleRemoveFeatureFromBundle = (bundleIndex: number, featureIndex: number) => {
    const updated = [...editingBundles];
    const target = updated[bundleIndex];
    if (target && target.features) {
      target.features = target.features.filter((_, idx) => idx !== featureIndex);
      setEditingBundles(updated);
    }
  };

  const handleUpdateFeatureInBundle = (bundleIndex: number, featureIndex: number, text: string) => {
    const updated = [...editingBundles];
    const target = updated[bundleIndex];
    if (target && target.features) {
      target.features[featureIndex] = text;
      setEditingBundles(updated);
    }
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

  const handleUnenrollUser = async (userId: string, courseId: string, enrollmentId?: string) => {
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unenroll_user",
          enrollmentId,
          userId,
          courseId,
        }),
      });
      await fetchAdminData();
      if (selectedUserForEdit && selectedUserForEdit.id === userId) {
        setSelectedUserForEdit((prev: any) => {
          if (!prev) return null;
          return {
            ...prev,
            enrollments: (prev.enrollments || []).filter((e: any) =>
              enrollmentId ? e.id !== enrollmentId : e.courseId !== courseId
            ),
          };
        });
      }
    } catch (err) {
      console.error("Error unenrolling user:", err);
    }
  };

  const handleOpenAddCourse = () => {
    router.push("/admin/courses/new");
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
        const data = await res.json().catch(() => ({}));
        setShowAddCourseModal(false);
        fetchAdminData();
        if (data.course?.id) {
          router.push(`/admin/courses/${data.course.id}/edit`);
        }
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
      title: `Delete Class: ${course.title}?`,
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

      const saveRes = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_course_material",
          courseId: selectedCourseForMaterials.id,
          title: matFormTitle.trim(),
          description: matFormDesc.trim() || null,
          fileUrl: uploadData.fileUrl || uploadData.file?.fileUrl,
          fileSize: uploadData.fileSize || uploadData.file?.fileSize || "1.0 MB",
          fileType: uploadData.fileType || uploadData.mimeType || uploadData.file?.fileType || "application/pdf",
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

  const [syncingEventId, setSyncingEventId] = useState<string | null>(null);
  const [syncingTrialId, setSyncingTrialId] = useState<string | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [recordingModalTarget, setRecordingModalTarget] = useState<{
    eventId?: string;
    trialId?: string;
    title: string;
    currentUrl?: string | null;
  } | null>(null);
  const [recordingInputUrl, setRecordingInputUrl] = useState("");
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [isAutoSyncingInModal, setIsAutoSyncingInModal] = useState(false);

  const [analyticsModalTarget, setAnalyticsModalTarget] = useState<{
    eventId?: string | null;
    trialId?: string | null;
    title?: string;
  } | null>(null);

  const handleOpenAnalyticsModal = (opts: {
    eventId?: string | null;
    trialId?: string | null;
    title?: string;
  }) => {
    setAnalyticsModalTarget(opts);
  };

  const handleSyncMeeting = async (eventId?: string, trialId?: string) => {
    try {
      if (eventId) setSyncingEventId(eventId);
      if (trialId) setSyncingTrialId(trialId);
      const res = await fetch("/api/meetings/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, trialId }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchAdminData();
        const found = data?.event?.recordingUrl || data?.trial?.recordingUrl;
        if (found) {
          alert("✅ BigBlueButton recording found & synced successfully!");
        } else {
          alert("Synced meeting details with BigBlueButton. No recording published yet (processing may take a few minutes). You can also click 'Attach Recording' to paste a link manually.");
        }
      } else {
        alert(data.error || "Failed to sync with BigBlueButton.");
      }
    } catch (err) {
      console.error("Error syncing meeting:", err);
    } finally {
      setSyncingEventId(null);
      setSyncingTrialId(null);
    }
  };

  const handleOpenRecordingModal = (opts: {
    eventId?: string;
    trialId?: string;
    title: string;
    currentUrl?: string | null;
  }) => {
    setRecordingModalTarget(opts);
    setRecordingInputUrl(opts.currentUrl || "");
    setShowRecordingModal(true);
  };

  const handleSaveRecording = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!recordingModalTarget) return;

    try {
      setIsSavingRecording(true);
      const res = await fetch("/api/meetings/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: recordingModalTarget.eventId,
          trialId: recordingModalTarget.trialId,
          manualRecordingUrl: recordingInputUrl.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowRecordingModal(false);
        await fetchAdminData();
      } else {
        alert(data.error || "Failed to save recording link.");
      }
    } catch {
      alert("Network error updating recording.");
    } finally {
      setIsSavingRecording(false);
    }
  };

  const handleAdminDeleteRecording = async (opts: { eventId?: string; trialId?: string; title: string }) => {
    if (!confirm(`Are you sure you want to permanently delete the BigBlueButton recording for "${opts.title}"?\n\nThis will remove the playback recording from the database and BigBlueButton server. Only administrators can perform this action.`)) {
      return;
    }

    try {
      const idKey = opts.eventId || opts.trialId || "rec";
      setIsDeletingRecording(idKey);

      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_recording",
          eventId: opts.eventId,
          trialId: opts.trialId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (showRecordingModal) {
          setShowRecordingModal(false);
        }
        await fetchAdminData();
      } else {
        alert(data.error || "Failed to delete recording.");
      }
    } catch {
      alert("Network error deleting recording.");
    } finally {
      setIsDeletingRecording(null);
    }
  };

  const handleRemoveRecording = async () => {
    if (!recordingModalTarget) return;
    await handleAdminDeleteRecording({
      eventId: recordingModalTarget.eventId,
      trialId: recordingModalTarget.trialId,
      title: recordingModalTarget.title,
    });
  };

  const handleAutoSyncInModal = async () => {
    if (!recordingModalTarget) return;
    try {
      setIsAutoSyncingInModal(true);
      const res = await fetch("/api/meetings/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: recordingModalTarget.eventId,
          trialId: recordingModalTarget.trialId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const foundUrl = data?.event?.recordingUrl || data?.trial?.recordingUrl;
        if (foundUrl) {
          setRecordingInputUrl(foundUrl);
          await fetchAdminData();
          alert("Recording successfully found and synced from BigBlueButton!");
          setShowRecordingModal(false);
        } else {
          alert("Auto-sync completed, but no recording file was published yet in BigBlueButton. BigBlueButton takes a few minutes after ending a session to process recordings. You can also paste a link manually.");
        }
      } else {
        alert(data.error || "Sync attempt failed.");
      }
    } catch {
      alert("Network error attempting sync.");
    } finally {
      setIsAutoSyncingInModal(false);
    }
  };

  const handleDeleteLiveClass = (event: any) => {
    setConfirmModalData({
      isOpen: true,
      title: `Cancel Class: ${event.title}?`,
      description: `This will cancel this live classroom session and remove it from tutor and student calendars.`,
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

  const handleApproveClass = async (eventId: string) => {
    try {
      setProcessingApprovalId(eventId);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_class", eventId }),
      });
      if (res.ok) {
        await fetchAdminData();
      }
    } catch (err) {
      console.error("Error approving class:", err);
    } finally {
      setProcessingApprovalId(null);
    }
  };

  const handleApproveTrial = async (trialId: string) => {
    try {
      setProcessingApprovalId(trialId);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_trial", trialId }),
      });
      if (res.ok) {
        await fetchAdminData();
      }
    } catch (err) {
      console.error("Error approving trial:", err);
    } finally {
      setProcessingApprovalId(null);
    }
  };

  const handleApproveCourse = async (courseId: string) => {
    try {
      setProcessingApprovalId(courseId);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_course", courseId }),
      });
      if (res.ok) {
        await fetchAdminData();
      }
    } catch (err) {
      console.error("Error approving course:", err);
    } finally {
      setProcessingApprovalId(null);
    }
  };

  const handleOpenRejectModal = (type: "CLASS" | "TRIAL" | "COURSE", id: string, title: string, tutorName?: string) => {
    setRejectionModalData({ isOpen: true, type, id, title, tutorName });
    setRejectionReasonInput("");
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalData.id) return;
    try {
      setIsSubmittingReject(true);
      let action = "reject_class";
      let payload: any = { reason: rejectionReasonInput.trim() };
      if (rejectionModalData.type === "CLASS") {
        action = "reject_class";
        payload.eventId = rejectionModalData.id;
      } else if (rejectionModalData.type === "TRIAL") {
        action = "reject_trial";
        payload.trialId = rejectionModalData.id;
      } else if (rejectionModalData.type === "COURSE") {
        action = "reject_course";
        payload.courseId = rejectionModalData.id;
      }

      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });

      if (res.ok) {
        setRejectionModalData((prev) => ({ ...prev, isOpen: false }));
        await fetchAdminData();
      }
    } catch (err) {
      console.error("Error rejecting item:", err);
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleOpenAddSchool = () => {
    setSchoolFormName("");
    setSchoolFormDesc("");
    setSchoolFormActive(true);
    setSchoolActionMsg(null);
    setShowAddSchoolModal(true);
  };

  const handleOpenEditSchool = (school: AcademicSchool) => {
    setSelectedSchoolForEdit(school);
    setSchoolFormName(school.name);
    setSchoolFormDesc(school.description || "");
    setSchoolFormActive(school.isActive);
    setSchoolActionMsg(null);
    setShowEditSchoolModal(true);
  };

  const handleOpenDeleteSchool = (school: AcademicSchool) => {
    setSelectedSchoolForDelete(school);
    const otherSchools = schoolsList.filter((s) => s.id !== school.id);
    setDeleteReassignTarget(otherSchools[0]?.name || "");
    setSchoolActionMsg(null);
    setShowDeleteSchoolModal(true);
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolFormName.trim()) return;
    try {
      setIsSavingSchool(true);
      setSchoolActionMsg(null);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_subject",
          name: schoolFormName.trim(),
          description: schoolFormDesc.trim(),
          isActive: schoolFormActive,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSchoolsList(data.subjects || data.schools || []);
        setSchoolActionMsg({ type: "success", text: data.message || "Subject created successfully." });
        setTimeout(() => {
          setShowAddSchoolModal(false);
          setSchoolActionMsg(null);
        }, 1200);
      } else {
        setSchoolActionMsg({ type: "error", text: data.error || "Failed to create subject." });
      }
    } catch (err: any) {
      setSchoolActionMsg({ type: "error", text: err.message || "Network error." });
    } finally {
      setIsSavingSchool(false);
    }
  };

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolForEdit || !schoolFormName.trim()) return;
    try {
      setIsSavingSchool(true);
      setSchoolActionMsg(null);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_subject",
          id: selectedSchoolForEdit.id,
          name: schoolFormName.trim(),
          description: schoolFormDesc.trim(),
          isActive: schoolFormActive,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSchoolsList(data.subjects || data.schools || []);
        if (data.coursesMigrated > 0) {
          fetchAdminData(false);
        }
        setSchoolActionMsg({ type: "success", text: data.message || "Subject updated successfully." });
        setTimeout(() => {
          setShowEditSchoolModal(false);
          setSchoolActionMsg(null);
        }, 1200);
      } else {
        setSchoolActionMsg({ type: "error", text: data.error || "Failed to update subject." });
      }
    } catch (err: any) {
      setSchoolActionMsg({ type: "error", text: err.message || "Network error." });
    } finally {
      setIsSavingSchool(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (!selectedSchoolForDelete) return;
    try {
      setIsSavingSchool(true);
      setSchoolActionMsg(null);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_subject",
          id: selectedSchoolForDelete.id,
          reassignToCategory: (selectedSchoolForDelete.classCount || 0) > 0 ? deleteReassignTarget : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSchoolsList(data.subjects || data.schools || []);
        fetchAdminData(false);
        setShowDeleteSchoolModal(false);
      } else {
        setSchoolActionMsg({ type: "error", text: data.error || "Failed to delete subject." });
      }
    } catch (err: any) {
      setSchoolActionMsg({ type: "error", text: err.message || "Network error." });
    } finally {
      setIsSavingSchool(false);
    }
  };

  const handleMoveSchool = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= schoolsList.length) return;
    const newList = [...schoolsList];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;
    setSchoolsList(newList);

    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder_subjects",
          orderedIds: newList.map((s) => s.id),
        }),
      });
    } catch (err) {
      console.error("Failed to persist subject reorder:", err);
    }
  };

  const handleResetSchools = async () => {
    if (!confirm("Are you sure you want to reset academic subjects to the default list?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_subjects" }),
      });
      const data = await res.json();
      if (res.ok && (data.subjects || data.schools)) {
        setSchoolsList(data.subjects || data.schools);
      }
    } catch (err) {
      console.error("Failed to reset subjects:", err);
    }
  };

  const purchasesList = useMemo(() => {
    const allPurchases: any[] = [];
    coursesList.forEach((c) => {
      (c.enrollments || []).forEach((enr: any) => {
        const student = enr.user || allUsersList.find((u) => u.id === enr.userId);
        allPurchases.push({
          id: enr.id,
          enrollmentId: enr.id,
          userId: student?.id || enr.userId,
          studentId: student?.studentId || null,
          studentName: student?.name || "Enrolled Student",
          studentEmail: student?.email || "student@edupulse.uk",
          studentPhone: student?.phone || null,
          studentAvatar: student?.avatar || null,
          courseId: c.id,
          courseTitle: c.title,
          courseSlug: c.slug,
          courseSubjectCode: c.subjectCode || "LONDON-AL",
          courseCategory: c.category,
          price: Number.isFinite(Number(c.price)) ? Number(c.price) : 0,
          enrolledAt: enr.enrolledAt,
        });
      });
    });

    allPurchases.sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());

    return allPurchases.filter((p) => {
      const matchSearch =
        !purchaseSearch ||
        p.studentName.toLowerCase().includes(purchaseSearch.toLowerCase()) ||
        p.studentEmail.toLowerCase().includes(purchaseSearch.toLowerCase()) ||
        (p.studentId && p.studentId.toLowerCase().includes(purchaseSearch.toLowerCase())) ||
        p.courseTitle.toLowerCase().includes(purchaseSearch.toLowerCase()) ||
        p.courseSubjectCode.toLowerCase().includes(purchaseSearch.toLowerCase());

      const matchCourse = purchaseCourseFilter === "ALL" || p.courseId === purchaseCourseFilter;
      return matchSearch && matchCourse;
    });
  }, [coursesList, allUsersList, purchaseSearch, purchaseCourseFilter]);

  const uniquePayingStudentsCount = useMemo(() => {
    const userIds = new Set<string>();
    coursesList.forEach((c) => {
      (c.enrollments || []).forEach((enr: any) => {
        if (enr.userId) userIds.add(enr.userId);
        if (enr.user?.id) userIds.add(enr.user.id);
      });
    });
    return userIds.size;
  }, [coursesList]);

  const liveClassesList = useMemo(() => {
    return eventsList.filter((ev) => {
      const matchSearch =
        ev.title.toLowerCase().includes(liveClassSearch.toLowerCase()) ||
        (ev.course?.title && ev.course.title.toLowerCase().includes(liveClassSearch.toLowerCase())) ||
        (ev.user?.name && ev.user.name.toLowerCase().includes(liveClassSearch.toLowerCase())) ||
        (ev.course?.instructor?.name && ev.course.instructor.name.toLowerCase().includes(liveClassSearch.toLowerCase()));

      let matchFilter = true;
      const isEnded = ev.status === "COMPLETED" || ev.status === "CANCELLED" || !!ev.endedAt;
      if (liveClassFilter === "ALL") {
        matchFilter = !isEnded;
      } else if (liveClassFilter === "LIVE") {
        matchFilter = ev.status === "LIVE" && !isEnded;
      } else if (liveClassFilter === "SCHEDULED") {
        matchFilter = !isEnded && (ev.status === "SCHEDULED" || !ev.status) && new Date(ev.dueDate) >= new Date();
      } else if (liveClassFilter === "COMPLETED") {
        matchFilter = isEnded;
      } else if (liveClassFilter === "RECORDINGS") {
        matchFilter = Boolean(ev.recordingUrl);
      }

      return matchSearch && matchFilter;
    });
  }, [eventsList, liveClassSearch, liveClassFilter]);

  const activeLiveClassesCount = eventsList.filter((e) => e.status !== "COMPLETED" && e.status !== "CANCELLED" && !e.endedAt).length;
  const liveNowCount = eventsList.filter((e) => e.status === "LIVE" && !e.endedAt).length;
  const upcomingCount = eventsList.filter((e) => {
    const isEnded = e.status === "COMPLETED" || e.status === "CANCELLED" || !!e.endedAt;
    return !isEnded && (e.status === "SCHEDULED" || !e.status) && new Date(e.dueDate) >= new Date();
  }).length;
  const completedCount = eventsList.filter((e) => e.status === "COMPLETED" || !!e.endedAt).length;

  const recordedEvents = useMemo(() => {
    return eventsList.filter((e) => Boolean(e.recordingUrl));
  }, [eventsList]);

  const recordedTrials = useMemo(() => {
    return allTrialsList.filter((t) => Boolean(t.recordingUrl));
  }, [allTrialsList]);

  const allRecordings = useMemo(() => {
    const evs = recordedEvents.map((e) => ({
      id: e.id,
      type: "CLASS" as const,
      title: e.title,
      courseTitle: e.course?.title || "Academic Class",
      subjectCode: e.course?.subjectCode || "CLASS",
      tutorName: e.user?.name || e.course?.tutor?.name || "Tutor",
      tutorAvatar: e.user?.avatar || e.course?.tutor?.avatar,
      date: e.dueDate || e.endedAt || e.createdAt,
      recordingUrl: e.recordingUrl as string,
      meetingId: e.meetingSpaceId || (e as any).meetingId || `class-${e.id}`,
      eventId: e.id as string | undefined,
      trialId: undefined as string | undefined,
    }));
    const trs = recordedTrials.map((t) => ({
      id: t.id,
      type: "TRIAL" as const,
      title: `1-on-1 Trial: ${t.studentName || t.student?.name || "Student"}`,
      courseTitle: t.course?.title || "Trial Consultation Session",
      subjectCode: t.course?.subjectCode || "1-ON-1",
      tutorName: t.tutor?.name || "Tutor",
      tutorAvatar: t.tutor?.avatar,
      date: t.preferredDate || t.updatedAt || t.createdAt,
      recordingUrl: t.recordingUrl as string,
      meetingId: t.meetingSpaceId || (t as any).meetingId || `trial-${t.id}`,
      eventId: undefined as string | undefined,
      trialId: t.id as string | undefined,
    }));
    return [...evs, ...trs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [recordedEvents, recordedTrials]);

  const filteredRecordings = useMemo(() => {
    if (!liveClassSearch.trim()) return allRecordings;
    const q = liveClassSearch.toLowerCase();
    return allRecordings.filter((rec) =>
      rec.title.toLowerCase().includes(q) ||
      rec.courseTitle.toLowerCase().includes(q) ||
      rec.subjectCode.toLowerCase().includes(q) ||
      rec.tutorName.toLowerCase().includes(q)
    );
  }, [allRecordings, liveClassSearch]);

  const navMenuItems = [
    { id: "overview", label: "Executive Overview", icon: Layers },
    { id: "approvals", label: "Tutor Approvals", icon: ShieldCheck },
    { id: "live_classes", label: "Live Classes & Meets", icon: Video },
    { id: "attendance", label: "Attendance Tracker", icon: Users },
    { id: "users", label: "User Management", icon: Users },
    { id: "courses", label: "Class Management", icon: BookOpen },
    { id: "subjects", label: "Academic Subjects", icon: GraduationCap },
    { id: "chats", label: "Chat Conversations", icon: MessageSquareLock },
    { id: "finances", label: "Class Purchases & Revenue", icon: DollarSign },
    { id: "pricing", label: "Pricing & Token Bundles", icon: Coins },
    { id: "audit_log", label: "Audit Log & History", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white text-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-slate-200 shadow-2xs lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div
          className="w-full p-4 border-b border-slate-200 flex items-center justify-center text-center relative"
          style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}
        >
          <Link
            href="/"
            className="w-full flex items-center justify-center text-center mx-auto group"
            style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto" }}
          >
            <img
              src="/logo-wide.png"
              alt="PulseEDU Global"
              className="h-10 sm:h-12 w-auto max-w-[200px] mx-auto block object-contain transition-transform group-hover:scale-[1.02]"
              style={{ margin: "0 auto", display: "block" }}
            />
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto scrollbar-none">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
            Administration Hub
          </div>

          {navMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === "subjects" && activeTab === "schools");
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setSidebarOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 group ${
                  isActive
                    ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-blue-500 group-hover:text-blue-600"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3.5 border-t border-slate-200 space-y-3 bg-slate-50/70">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <Avatar className="w-8 h-8 ring-1 ring-blue-200 shrink-0">
              {adminAvatar && <AvatarImage src={adminAvatar} alt={adminName} />}
              <AvatarFallback className="bg-[#0c2461] text-white font-bold text-xs">
                {getAdminInitials(adminName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">{adminName}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-blue-500 font-semibold truncate">System Admin</span>
              </div>
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
                  {activeTab === "approvals"
                    ? "Tutor Approvals & Academic Verification"
                    : activeTab === "live_classes"
                    ? "Live Classes & BigBlueButton Operations"
                    : activeTab === "users"
                    ? "User Management"
                    : activeTab === "courses"
                    ? "Course Management"
                    : activeTab === "subjects" || activeTab === "schools"
                    ? "Academic Subjects & Categories"
                    : activeTab === "chats"
                    ? "Chat Monitoring & Direct Conversations"
                    : activeTab === "finances"
                    ? "Financials & Tuition"
                    : activeTab === "pricing"
                    ? "Token & Pricing Packages Management"
                    : activeTab === "audit_log"
                    ? "Audit Log & Full Action History"
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
                onClick={() => {
                  fetchAdminData();
                  if (activeTab === "audit_log") {
                    fetchAuditLogs(auditLogPage, auditLogSearch, auditLogCategory);
                  }
                }}
                disabled={loading}
                className="text-xs font-bold text-slate-700 h-9 rounded-xl border-slate-200 hover:bg-slate-50 gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh Data</span>
              </Button>

              {activeTab === "overview" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenClearDataModal}
                  disabled={loading || isClearingAllData}
                  className="text-xs font-bold text-slate-600 hover:text-slate-700 hover:bg-slate-50 border-slate-200 hover:border-slate-300 h-9 rounded-xl gap-1.5 cursor-pointer shadow-2xs transition-all"
                  title="Clear all LMS data except admin login"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Clear All Data</span>
                </Button>
              )}

              {activeTab === "courses" && (
                <Button
                  size="sm"
                  onClick={handleOpenAddCourse}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs shadow-blue-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-100" />
                  <span>+ Create Individual Class</span>
                </Button>
              )}

              {(activeTab === "subjects" || activeTab === "schools") && (
                <Button
                  size="sm"
                  onClick={handleOpenAddSchool}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs shadow-blue-600/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>+ Add New Subject</span>
                </Button>
              )}

              {activeTab === "pricing" && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetBundlesToDefault}
                    className="text-xs font-bold text-slate-700 h-9 rounded-xl border-slate-200 hover:bg-slate-50 gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Reset Defaults</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenBundleEditor()}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs shadow-blue-600/20 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-100" />
                    <span>Edit Packages</span>
                  </Button>
                </div>
              )}

              {activeTab === "audit_log" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportAuditLogCSV}
                  disabled={auditLogs.length === 0}
                  className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold gap-1.5 h-9 rounded-xl border-slate-200 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Export CSV Statement</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] w-full mx-auto min-h-[calc(100vh-4rem)]">
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

          {loading && allUsersList.length === 0 && !fetchError && (
            <div className="py-24 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <div className="text-sm font-bold text-slate-800">Loading Institutional Records...</div>
              <p className="text-xs text-slate-400">Synchronizing students, tutors, and curriculum.</p>
            </div>
          )}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Total Accounts</span>
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">{allUsersList.length} Active</div>
                  <div className="text-[11px] text-slate-500">{allUsersList.filter(u => u.role === "STUDENT").length} Students • {tutorList.length} Tutors</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-600">Active Syllabi</span>
                    <BookOpen className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">{coursesList.length} Individual Classes</div>
                  <div className="text-[11px] text-blue-600 font-semibold">{coursesList.reduce((acc, c) => acc + (c.modules?.length || 0), 0)} Total Modules</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-600">Course Enrollments</span>
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">{totalEnrollmentsCount} Enrollments</div>
                  <div className="text-[11px] text-blue-600 font-semibold">Verified Enrollment Records</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-700">Gross Tuition Volume</span>
                    <DollarSign className="w-4 h-4 text-blue-700" />
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">${totalCalculatedRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                  <div className="text-[11px] text-slate-500">Calculated from enrollments</div>
                </div>
              </div>

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
                        <th className="py-3 px-4">Enrolled Classes</th>
                        <th className="py-3 px-4">Registered Date</th>
                        <th className="py-3 px-4 text-right">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allUsersList.slice(0, 5).map((u) => (
                        <tr key={u.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-4">
                            <div
                              onClick={() => handleOpenUserProfile(u)}
                              className="cursor-pointer group flex items-center gap-2"
                              title="Click to view full profile & complete history"
                            >
                              <div>
                                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5 flex-wrap">
                                  <span>{u.name}</span>
                                  {u.role === "STUDENT" && u.studentId && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200" title="Official Student ID">
                                      {u.studentId}
                                    </span>
                                  )}
                                  {(u.role === "TUTOR" || (u.role as any) === "INSTRUCTOR") && u.tutorId && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-900 border border-indigo-200" title="Official Tutor ID">
                                      {u.tutorId}
                                    </span>
                                  )}
                                  {u.role === "ADMIN" && u.adminId && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-900 border border-rose-200" title="Official Admin ID">
                                      {u.adminId}
                                    </span>
                                  )}
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                                </div>
                                <div className="text-[11px] text-slate-400">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{u.headline || "Enrolled Student"}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{u.enrollments?.length || 0} Classes</td>
                          <td className="py-3 px-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString("en-US")}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenUserProfile(u)}
                              className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Inspect User Profile & History"
                            >
                              <Eye className="w-3 h-3 text-blue-600" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "live_classes" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <div className="text-[11px] text-slate-500 font-medium">BigBlueButton Real-time Rooms</div>
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
                  <div className="text-[11px] text-slate-500 font-medium">Classes & Sessions</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600">Completed Sessions</span>
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {completedCount} Delivered
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Archive & Logs</div>
                </div>

                <div
                  onClick={() => setLiveClassFilter("RECORDINGS")}
                  className={`p-4 rounded-2xl bg-white border shadow-2xs space-y-1 cursor-pointer transition-all hover:border-purple-300 ${
                    liveClassFilter === "RECORDINGS" ? "border-purple-300 ring-2 ring-purple-500/20" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
                      BBB Recordings
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      Admin Access
                    </span>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {allRecordings.length} Recorded
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Click to manage &amp; delete</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700">Authorized Tutors</span>
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {tutorList.length} Tutors
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Certified Tutors</div>
                </div>
              </div>

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
                      { id: "ALL", label: `All Active (${activeLiveClassesCount})`, icon: Video },
                      { id: "LIVE", label: `Live Now (${liveNowCount})`, icon: Radio },
                      { id: "SCHEDULED", label: `Scheduled (${upcomingCount})`, icon: Calendar },
                      { id: "COMPLETED", label: `Completed (${completedCount})`, icon: CheckCircle2 },
                      { id: "RECORDINGS", label: `BBB Recordings (${allRecordings.length})`, icon: Play },
                      { id: "ATTENDANCE", label: `Attendance Tracker`, icon: Users },
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

              </div>

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
                          Active BigBlueButton classrooms with students & tutors connected
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

                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="w-7 h-7 ring-1 ring-slate-200">
                                  <AvatarImage src={ev.course?.instructor?.avatar || ev.user?.avatar} />
                                  <AvatarFallback>TL</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-800 truncate text-[11px]">
                                    {ev.course?.instructor?.name || ev.user?.name || "Senior Tutor"}
                                  </div>
                                  <div className="text-[10px] text-slate-400">Class Instructor</div>
                                </div>
                              </div>

                              <div className="text-right text-[11px]">
                                <span className="font-bold text-slate-700">
                                  {ev.course?.enrollments?.length || 1} Students Enrolled
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            {ev.meetingLink ? (
                              <a
                                href={ev.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Join Classroom</span>
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

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-0">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {liveClassFilter === "RECORDINGS"
                        ? "BigBlueButton Playback Recordings Directory"
                        : liveClassFilter === "ATTENDANCE"
                        ? "Online Class Attendance Tracker"
                        : "Academic Class Schedule & BigBlueButton Directory"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {liveClassFilter === "RECORDINGS"
                        ? `Showing ${filteredRecordings.length} BigBlueButton recordings (Classes & 1-on-1 Sessions)`
                        : liveClassFilter === "ATTENDANCE"
                        ? "Real-time attendance tracking for students and tutors across all online sessions"
                        : `Showing ${liveClassesList.length} classes matching current filter`}
                    </p>
                  </div>
                  {liveClassFilter === "RECORDINGS" && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5 w-fit">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                      <span>Admin Exclusive: Deletion & Management</span>
                    </span>
                  )}
                </div>

                {liveClassFilter === "ATTENDANCE" ? (
                  <div className="p-4 sm:p-5">
                    <AdminAttendanceTracker
                      onOpenAnalytics={(evId, title) => handleOpenAnalyticsModal({ eventId: evId, title })}
                    />
                  </div>
                ) : liveClassFilter === "RECORDINGS" ? (
                  filteredRecordings.length > 0 ? (
                    <div className="max-h-[620px] overflow-y-auto overscroll-contain divide-y divide-slate-100">
                      {filteredRecordings.map((rec) => {
                        const isTrial = rec.type === "TRIAL";
                        const isDeleting = isDeletingRecording === (rec.eventId || rec.trialId);

                        return (
                          <div
                            key={`${rec.type}-${rec.id}`}
                            className="p-4 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                <Play className="w-5 h-5 fill-purple-600 text-purple-600" />
                              </div>

                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                                    {rec.title}
                                  </h4>
                                  <Badge className={isTrial ? "bg-amber-100 text-amber-900 border-amber-200 text-[9px] font-bold" : "bg-blue-100 text-blue-900 border-blue-200 text-[9px] font-bold"}>
                                    {isTrial ? "1-on-1 Trial Session" : "Academic Class"}
                                  </Badge>
                                  <Badge className="bg-purple-50 text-purple-800 border border-purple-200 text-[9px] font-bold flex items-center gap-1">
                                    <Video className="w-2.5 h-2.5 text-purple-600" />
                                    <span>BBB Recording Available</span>
                                  </Badge>
                                </div>

                                <p className="text-xs text-purple-900/80 font-semibold truncate">
                                  {rec.courseTitle} {rec.subjectCode ? `(${rec.subjectCode})` : ""}
                                </p>

                                <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
                                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    {formatForUser(rec.date, adminTimezone, {
                                      includeDate: true,
                                      includeTime: true,
                                      includeAbbr: true,
                                    })}
                                  </span>

                                  <span className="text-slate-500">
                                    Instructor / Tutor:{" "}
                                    <strong className="text-slate-800">{rec.tutorName}</strong>
                                  </span>

                                  {rec.meetingId && (
                                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      Room: {rec.meetingId}
                                    </span>
                                  )}
                                </div>

                                <div className="pt-1">
                                  <a
                                    href={rec.recordingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-[11px] transition-colors"
                                  >
                                    <Play className="w-3 h-3 fill-purple-700 shrink-0" />
                                    <span>Recording Link</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                                  </a>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end lg:self-center shrink-0 flex-wrap">
                              <a
                                href={rec.recordingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Watch Recording</span>
                              </a>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAnalyticsModal({ eventId: rec.eventId, trialId: rec.trialId, title: rec.title })}
                                className="text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl h-8 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                                title="View BigBlueButton Learning Analytics Dashboard"
                              >
                                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Analytics</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRecordingModal({
                                  eventId: rec.eventId,
                                  trialId: rec.trialId,
                                  title: rec.title,
                                  currentUrl: rec.recordingUrl,
                                })}
                                className="text-xs font-semibold text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-xl h-8 flex items-center gap-1 cursor-pointer transition-all"
                                title="Edit recording URL or re-sync with BigBlueButton"
                              >
                                <Video className="w-3.5 h-3.5 text-purple-600" />
                                <span>Edit Link</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAdminDeleteRecording({
                                  eventId: rec.eventId,
                                  trialId: rec.trialId,
                                  title: rec.title,
                                })}
                                disabled={isDeleting}
                                className="text-xs font-bold text-red-600 border-red-200 bg-red-50 hover:bg-red-100 rounded-xl h-8 flex items-center gap-1 cursor-pointer transition-all"
                                title="Permanently delete recording (Admin Only)"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                )}
                                <span>{isDeleting ? "Deleting..." : "Delete Recording"}</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-3">
                      <Play className="w-10 h-10 text-purple-300 mx-auto" />
                      <h4 className="font-bold text-xs text-slate-700">No BigBlueButton Recordings Found</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        No playback recordings match your search or have been attached yet. Completed classes and 1-on-1 trials will automatically appear here once BigBlueButton finishes processing.
                      </p>
                    </div>
                  )
                ) : (
                  liveClassesList.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {liveClassesList.map((ev) => {
                        const isLive = ev.status === "LIVE";
                        const isCompleted = ev.status === "COMPLETED";
                        const meetLink = ev.meetingLink || (ev.description?.match(/https?:\/\/[^\s]+/i)?.[0]);

                        return (
                          <div
                            key={ev.id}
                            className={`p-4 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                              isLive ? "bg-red-50/30" : "hover:bg-slate-50/70"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                  isLive
                                    ? "bg-red-100 text-red-700 animate-pulse"
                                    : isCompleted
                                    ? "bg-blue-100 text-blue-800"
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
                                    <Badge className="bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
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
                                    {formatForUser(ev.dueDate, adminTimezone, {
                                      includeDate: true,
                                      includeTime: true,
                                      includeAbbr: true,
                                    })}
                                  </span>

                                  <span className="text-slate-500">
                                    Instructor:{" "}
                                    <strong className="text-slate-800">
                                      {ev.course?.instructor?.name || ev.user?.name || "Senior Tutor"}
                                    </strong>
                                  </span>

                                  {meetLink && (
                                    <a
                                      href={meetLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs shadow-2xs transition-all"
                                      title={meetLink}
                                    >
                                      <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      <span>Join Room</span>
                                      <ExternalLink className="w-3 h-3 text-blue-400 shrink-0" />
                                    </a>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 mt-1 border-t border-slate-100 text-xs text-slate-600">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Started:</span>
                                    <span className="font-mono text-[11px] font-semibold text-slate-700">
                                      {ev.startedAt
                                        ? formatForUser(ev.startedAt, adminTimezone, {
                                            includeDate: true,
                                            includeTime: true,
                                            includeAbbr: true,
                                          })
                                        : "Not started yet"}
                                    </span>
                                  </div>

                                  <span className="text-slate-200 hidden sm:inline">•</span>

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ended:</span>
                                    <span className={`font-mono text-[11px] font-semibold ${isLive ? "text-blue-600 font-bold" : "text-slate-700"}`}>
                                      {ev.endedAt
                                        ? formatForUser(ev.endedAt, adminTimezone, {
                                            includeDate: true,
                                            includeTime: true,
                                            includeAbbr: true,
                                          })
                                        : isLive
                                        ? "● Live in Session"
                                        : "—"}
                                    </span>
                                  </div>

                                  <span className="text-slate-200 hidden sm:inline">•</span>

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration:</span>
                                    <span className="font-mono text-[11px] font-semibold text-slate-800">
                                      {formatSessionDuration(ev.startedAt, ev.endedAt)}
                                    </span>
                                  </div>

                                  {ev.actualStartTime && ev.actualEndTime && (
                                    <>
                                      <span className="text-slate-200 hidden sm:inline">•</span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Meet Verified:</span>
                                        <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                          {formatTimeInTimezone(ev.actualStartTime, adminTimezone)} - {formatTimeInTimezone(ev.actualEndTime, adminTimezone, { includeAbbr: true })}
                                          {ev.attendanceCount ? ` (${ev.attendanceCount} attended)` : ""}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

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
                                <div className="flex items-center gap-2">
                                  {ev.recordingUrl && (
                                    <>
                                      <a
                                        href={ev.recordingUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        <span>Recording</span>
                                      </a>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleAdminDeleteRecording({ eventId: ev.id, title: ev.title })}
                                        disabled={isDeletingRecording === ev.id}
                                        className="text-xs font-semibold text-red-600 border-red-200 bg-red-50 hover:bg-red-100 rounded-xl h-8 flex items-center gap-1 cursor-pointer transition-all"
                                        title="Delete BigBlueButton recording (Admin Only)"
                                      >
                                        {isDeletingRecording === ev.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                        )}
                                        <span>Delete Rec</span>
                                      </Button>
                                    </>
                                  )}
                                  {isCompleted && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenAnalyticsModal({ eventId: ev.id, title: ev.title })}
                                        className="text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl h-8 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                                        title="View BigBlueButton Learning Analytics Dashboard"
                                      >
                                        <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Analytics</span>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenRecordingModal({ eventId: ev.id, title: ev.title, currentUrl: ev.recordingUrl })}
                                        className="text-xs font-semibold text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-xl h-8 flex items-center gap-1 cursor-pointer transition-all"
                                        title="Add or edit video recording link"
                                      >
                                        <Video className="w-3.5 h-3.5 text-purple-600" />
                                        <span>{ev.recordingUrl ? "Edit Link" : "Attach Recording"}</span>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleSyncMeeting(ev.id)}
                                        disabled={syncingEventId === ev.id}
                                        className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl h-8 flex items-center gap-1 cursor-pointer"
                                        title="Fetch verified times and BigBlueButton recording"
                                      >
                                        <RefreshCw className={`w-3.5 h-3.5 ${syncingEventId === ev.id ? "animate-spin text-blue-600" : "text-slate-500"}`} />
                                        <span>{syncingEventId === ev.id ? "Syncing..." : "Sync BBB"}</span>
                                      </Button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleDeleteLiveClass(ev)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Cancel / Delete Class"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
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
                        No live classes match the selected filter.
                      </p>
                    </div>
                  )
                )}
              </div>

            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <AdminAttendanceTracker />
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-slate-500">Total Accounts</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">{allUsersList.length} Users</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-blue-600">Students</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">
                    {allUsersList.filter((u) => u.role === "STUDENT").length} Students
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-blue-600">Student Credit Pool</span>
                  <div className="text-2xl font-semibold tracking-tight text-blue-950 font-mono flex items-center gap-1.5">
                    <Coins className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>{allUsersList.filter((u) => u.role === "STUDENT").reduce((acc, u) => acc + (u.tokenWallet?.balance || 0), 0)} Hrs</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-blue-700">Tutors & Admins</span>
                  <div className="text-2xl font-semibold tracking-tight text-slate-800">
                    {allUsersList.filter((u) => u.role !== "STUDENT").length} Staff
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search user by name, student ID, email, or role..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 h-10 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                    {[
                      { id: "ALL", label: "All Users" },
                      { id: "STUDENT", label: "Students" },
                      { id: "TUTOR", label: "Tutors" },
                      { id: "ADMIN", label: "Admins" },
                    ].map((rf) => (
                      <button
                        key={rf.id}
                        onClick={() => setUserRoleFilter(rf.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                          userRoleFilter === rf.id
                            ? "bg-[#0c2461] text-white shadow-xs shadow-blue-500/20"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {rf.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Button
                    onClick={() => handleOpenGrantTokens()}
                    className="w-full sm:w-auto text-xs font-bold bg-[#0c2461] hover:bg-[#103080] text-white gap-1.5 h-10 rounded-xl shadow-xs shadow-blue-950/20 cursor-pointer"
                  >
                    <Coins className="w-4 h-4 text-blue-200" />
                    <span>+ Grant Free Credit</span>
                  </Button>
                  <Button
                    onClick={handleOpenAddUser}
                    className="w-full sm:w-auto text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white gap-1.5 h-10 rounded-xl shadow-xs shadow-blue-500/20 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-blue-100" />
                    <span>+ Add Tutor / Admin</span>
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4">User Member</th>
                        <th className="py-3.5 px-4">System Role</th>
                        <th className="py-3.5 px-4">Credit / Rate</th>
                        <th className="py-3.5 px-4">Academic Title / Headline</th>
                        <th className="py-3.5 px-4">Enrolled / Taught Classes</th>
                        <th className="py-3.5 px-4">Registration Date</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div
                              onClick={() => handleOpenUserProfile(u)}
                              className="flex items-center gap-3 cursor-pointer group"
                              title="Click to view full profile & complete history"
                            >
                              <Avatar className="w-8 h-8 ring-1 ring-slate-200 group-hover:ring-blue-400 group-hover:shadow-xs transition-all">
                                <AvatarImage src={u.avatar || undefined} />
                                <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5 flex-wrap">
                                  <span>{u.name}</span>
                                  {u.role === "STUDENT" && u.studentId && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200" title="Official Student ID">
                                      {u.studentId}
                                    </span>
                                  )}
                                  {(u.role === "TUTOR" || (u.role as any) === "INSTRUCTOR") && u.tutorId && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-900 border border-indigo-200" title="Official Tutor ID">
                                      {u.tutorId}
                                    </span>
                                  )}
                                  {u.role === "ADMIN" && u.adminId && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-900 border border-rose-200" title="Official Admin ID">
                                      {u.adminId}
                                    </span>
                                  )}
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                                </div>
                                <div className="text-[11px] text-slate-500">{u.email}</div>

                                {u.phone && (
                                  <div className="text-[10px] text-blue-600 font-mono flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3" />
                                    <span>{u.phone}</span>
                                  </div>
                                )}
                                {u.country && (
                                  <div className="text-[10px] text-slate-600 font-medium flex items-center gap-1 mt-0.5" title={`Country: ${u.country}`}>
                                    <CountryFlag countryCode={findCountry(u.country)?.code} flagEmoji={findCountry(u.country)?.flag} size="xs" />
                                    <span>{u.country}</span>
                                  </div>
                                )}
                                {u.timezone && (
                                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5" title={`Operating Regional Timezone: ${u.timezone}`}>
                                    <Globe className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span>{getRegionalTimezone(u.timezone).flag} {getRegionalTimezone(u.timezone).city} ({getRegionalTimezone(u.timezone).abbr || getRegionalTimezone(u.timezone).standardOffset})</span>
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
                                  : u.role === "TUTOR" || (u.role as any) === "INSTRUCTOR"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {u.role === "INSTRUCTOR" ? "TUTOR" : u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {u.role === "STUDENT" ? (
                              <button
                                onClick={() => handleOpenGrantTokens(u)}
                                className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition-colors cursor-pointer group whitespace-nowrap shadow-2xs"
                                title="Click to Grant / Adjust Student Credit"
                              >
                                <Coins className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                                <span className="font-mono">{u.tokenWallet?.balance ?? 0} Hrs</span>
                                <Plus className="w-3 h-3 text-blue-700 opacity-60 group-hover:opacity-100" />
                              </button>
                            ) : u.role === "TUTOR" || (u.role as any) === "INSTRUCTOR" ? (
                              <div className="flex flex-col gap-1 text-[11px] font-mono whitespace-nowrap">
                                {getUserRates(u).isAL && (
                                  <span
                                    className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                                    title="London A/L Hourly Rate"
                                  >
                                    <span className="font-sans text-[10px] text-blue-900 font-extrabold uppercase">A/L:</span>
                                    LKR {Number(getUserRates(u).alRate).toLocaleString()}/hr
                                  </span>
                                )}
                                {getUserRates(u).isOL && (
                                  <span
                                    className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"
                                    title="London O/L Hourly Rate"
                                  >
                                    <span className="font-sans text-[10px] text-slate-600 font-extrabold uppercase">O/L:</span>
                                    LKR {Number(getUserRates(u).olRate).toLocaleString()}/hr
                                  </span>
                                )}
                                {!getUserRates(u).isAL && !getUserRates(u).isOL && (
                                  <span className="text-slate-400 text-[10px] font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Rates Inactive</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs font-mono">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {u.headline || "Active Member"}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {u.role === "STUDENT"
                              ? `${u.enrollments?.length || 0} Classes Enrolled`
                              : `${u.createdCourses?.length || 0} Classes Assigned`}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString("en-US")}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenUserProfile(u)}
                                className="h-7 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-[11px] inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-2xs"
                                title="View Full Profile & Complete History"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>Profile</span>
                              </button>
                              {u.role === "STUDENT" && (
                                <>
                                  <button
                                    onClick={() => handleOpenStudentTrials(u)}
                                    className="h-7 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[11px] inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-2xs"
                                    title="Manage & Reset Free Trial Sessions"
                                  >
                                    <RotateCcw className="w-3 h-3 text-purple-600 shrink-0" />
                                    <span>Trials</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenGrantTokens(u)}
                                    className="h-7 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-[11px] inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-2xs"
                                    title="Grant Free Credit / Hours"
                                  >
                                    <Coins className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span>+ Credit</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenEnrollUser(u)}
                                    className="h-7 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-2xs"
                                    title="Enroll in Course"
                                  >
                                    <BookOpen className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span>Enroll</span>
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="h-7 w-7 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                title="Edit User"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
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

          {activeTab === "courses" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-slate-500">Total Individual Classes</span>
                  <div className="text-2xl font-black tracking-tight text-slate-900">{coursesList.length} Units</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-blue-600">Published Status</span>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {coursesList.filter((c) => c.status === "PUBLISHED").length} Active
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-blue-600">Curriculum Modules</span>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {coursesList.reduce((acc, c) => acc + (c.modules?.length || 0), 0)} Modules
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-medium text-blue-600">Tutors Conducting Classes</span>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {tutorList.length} Tutors
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Conducting Individual Classes</div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <button
                  onClick={() => setAdminCourseViewMode("masterclasses")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    adminCourseViewMode === "masterclasses"
                      ? "bg-[#0c2461] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Individual Classes Grid ({filteredCourses.length})</span>
                </button>

                <button
                  onClick={() => setAdminCourseViewMode("tutors")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    adminCourseViewMode === "tutors"
                      ? "bg-[#0c2461] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tutors Conducting Classes ({tutorList.length})</span>
                </button>
              </div>

              {adminCourseViewMode === "masterclasses" && (
                <>
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Search class title, code, or category..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="pl-9 h-10 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-400"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      <select
                        value={courseCatFilter}
                        onChange={(e) => setCourseCatFilter(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="ALL">All Academic Subjects</option>
                        {schoolsList.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>

                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("subjects")}
                        className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 h-10 rounded-xl cursor-pointer"
                        title="Manage Academic Subjects & Category Pills"
                      >
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span className="hidden sm:inline">Subjects ({schoolsList.length})</span>
                      </Button>

                      <Button
                        onClick={handleOpenAddCourse}
                        className="text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white gap-1.5 h-10 rounded-xl shadow-xs shadow-blue-500/20 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-blue-100" />
                        <span>+ Create Individual Class</span>
                      </Button>
                    </div>
                  </div>

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
                            <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                              {course.status}
                            </Badge>
                          </div>

                          <h4 className="font-bold text-slate-900 text-sm leading-snug">
                            {course.title}
                          </h4>

                          <p className="text-xs text-slate-500 line-clamp-2">
                            {course.subtitle || course.description}
                          </p>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <Avatar className="w-6 h-6 border border-slate-200 shrink-0">
                              <AvatarImage src={course.tutor?.avatar} />
                              <AvatarFallback className="text-[9px] bg-blue-50 text-blue-700 font-bold">
                                {(course.tutor?.name || "T")[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-slate-800 truncate block">
                                {course.tutor?.name || "Unassigned Tutor"}
                              </span>
                              {course.tutor?.headline && (
                                <span className="text-[10px] text-slate-400 truncate block">
                                  {course.tutor.headline}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                            <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> {course.modules?.length || 0} Modules</span>
                            <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-slate-400" /> {course.materials?.length || 0} Files</span>
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> {course.enrollments?.length || 0} Enrolled</span>
                            <span className="font-bold text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                              <Coins className="w-3.5 h-3.5" />
                              {course.price} Tokens
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <Link
                            href={`/admin/courses/${course.id}/edit`}
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 h-8 rounded-xl flex-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Class & Content</span>
                          </Link>

                          <Link
                            href={`/classes/${course.slug}`}
                            target="_blank"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                            title="Preview Public Class Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => handleDeleteCourse(course)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Delete Class"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {adminCourseViewMode === "tutors" && (
                <>
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Search tutor name, email, specialty..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="pl-9 h-10 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-400"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href="/admin/courses/new"
                        className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-10 px-4 rounded-xl shadow-xs shadow-blue-500/20 inline-flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-blue-100" />
                        <span>+ Assign New Individual Class</span>
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {tutorList
                      .filter((tutor) => {
                        const q = courseSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          tutor.name?.toLowerCase().includes(q) ||
                          tutor.email?.toLowerCase().includes(q) ||
                          tutor.headline?.toLowerCase().includes(q) ||
                          tutor.bio?.toLowerCase().includes(q)
                        );
                      })
                      .map((tutor) => {
                        const tutorCourses = coursesList.filter(
                          (c) => c.tutorId === tutor.id || c.tutor?.id === tutor.id
                        );
                        const tutorLiveClasses = eventsList.filter(
                          (e) => e.userId === tutor.id || e.course?.tutorId === tutor.id
                        );

                        return (
                          <div
                            key={tutor.id}
                            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <Avatar className="w-12 h-12 rounded-xl border border-slate-200 shrink-0">
                                  <AvatarImage src={tutor.avatar} alt={tutor.name} />
                                  <AvatarFallback className="text-sm font-bold bg-[#0c2461] text-white">
                                    {tutor.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="font-bold text-slate-900 text-sm truncate">
                                      {tutor.name}
                                    </h4>
                                    <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold py-0.5">
                                      Tutor
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-blue-700 font-semibold truncate">
                                    {tutor.headline || "Expert Tutor"}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono truncate">
                                    {tutor.email}
                                  </p>
                                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                    {tutor.country && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md" title={`Country: ${tutor.country}`}>
                                        <CountryFlag countryCode={findCountry(tutor.country)?.code} flagEmoji={findCountry(tutor.country)?.flag} size="xs" />
                                        <span>{tutor.country}</span>
                                      </span>
                                    )}
                                    {tutor.timezone && (
                                      <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md" title={`Operating Regional Timezone: ${tutor.timezone}`}>
                                        <Globe className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                                        <span>{getRegionalTimezone(tutor.timezone).flag} {getRegionalTimezone(tutor.timezone).city} ({getRegionalTimezone(tutor.timezone).standardOffset})</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {tutor.bio && (
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                    {parseTutorBio(tutor.bio)}
                                  </p>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-center">
                                <div className="p-2 rounded-xl bg-blue-50/50 border border-blue-100">
                                  <div className="text-sm font-black text-blue-900">{tutorCourses.length}</div>
                                  <div className="text-[10px] text-blue-700 font-medium">Classes</div>
                                </div>
                                <div className="p-2 rounded-xl bg-blue-50/50 border border-blue-100">
                                  <div className="text-sm font-black text-blue-900">{tutorLiveClasses.length}</div>
                                  <div className="text-[10px] text-blue-700 font-medium">Live Sessions</div>
                                </div>
                              </div>

                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Individual Classes Taught:
                                </span>
                                {tutorCourses.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {tutorCourses.map((c) => (
                                      <Link
                                        key={c.id}
                                        href={`/admin/courses/${c.id}/edit`}
                                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 text-[10px] font-medium border border-slate-200 transition-colors flex items-center gap-1"
                                      >
                                        <span className="font-mono font-bold text-blue-700">{c.subjectCode || "MC"}</span>
                                        <span className="truncate max-w-[120px]">{c.title}</span>
                                      </Link>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic">No classes created yet.</p>
                                )}
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                              <button
                                onClick={() => handleOpenUserProfile(tutor)}
                                className="h-8 px-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                title="View Tutor Full Profile & Complete History"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                <span>Profile</span>
                              </button>

                              <Link
                                href="/admin/courses/new"
                                className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 h-8 rounded-xl cursor-pointer transition-colors shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ New Class</span>
                              </Link>

                              <button
                                onClick={() => {
                                  setActiveTab("live_classes");
                                  setLiveClassSearch(tutor.name);
                                }}
                                className="px-3 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                                title="View tutor's live classes"
                              >
                                View Classes
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          )}

          {(activeTab === "subjects" || activeTab === "schools") && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Total Academic Subjects</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {schoolsList.length} Subjects
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Configured in LMS Academy</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Live on Public Filters</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {schoolsList.filter((s) => s.isActive).length} Public
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold">
                    Visible on Homepage & Classes Pills
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Assigned Classes</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {schoolsList.reduce((acc, s) => acc + (s.classCount || 0), 0)} Units
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold">
                    Total classes across all subjects
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Instant Publishing</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    Synchronized
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold">
                    Realtime DB & Homepage Sync
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-lg text-slate-900">
                        Academic Subjects & Category Filter Pills
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Live Filter Tabs
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                      These subjects are displayed as category pill buttons on the public homepage and classes page. You can add new subjects, rename existing ones, reorder them, or adjust their visibility.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetSchools}
                      className="rounded-xl text-xs font-semibold border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Reset Defaults
                    </Button>
                    <Button
                      onClick={handleOpenAddSchool}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm shadow-blue-600/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Subject</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {schoolsList.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <GraduationCap className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">No subjects configured yet</p>
                      <Button onClick={handleOpenAddSchool} size="sm" className="rounded-xl text-xs cursor-pointer">
                        + Add Your First Subject
                      </Button>
                    </div>
                  ) : (
                    schoolsList.map((school, index) => (
                      <div
                        key={school.id}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div className="flex flex-col gap-0.5 shrink-0 pt-0.5 sm:pt-0">
                            <button
                              onClick={() => handleMoveSchool(index, "up")}
                              disabled={index === 0}
                              className={`p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${
                                index === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                              }`}
                              title="Move Up"
                              aria-label="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveSchool(index, "down")}
                              disabled={index === schoolsList.length - 1}
                              className={`p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${
                                index === schoolsList.length - 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                              }`}
                              title="Move Down"
                              aria-label="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            #{index + 1}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                                {school.name}
                              </h4>
                              {school.isActive ? (
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                                  Live on Homepage
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold">
                                  Hidden
                                </Badge>
                              )}
                              <Badge className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-semibold">
                                {school.classCount || 0} {school.classCount === 1 ? "Class" : "Classes"}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {school.description || "No description provided."}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditSchool(school)}
                            className="rounded-xl text-xs font-semibold h-8.5 px-3 border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            <span>Edit</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDeleteSchool(school)}
                            className="rounded-xl text-xs font-semibold h-8.5 px-3 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "chats" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Active Direct Conversations</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {adminChatStats.totalConversations} Threads
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Active 1-on-1 Academic Conversations
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Total Transmitted Messages</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {adminChatStats.totalMessages} Messages
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold">
                    Encrypted Ledger History
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-600">Institutional Governance</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Live Decrypted Inspection</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Safeguarding & Academic Compliance Audit
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col h-[650px]">
                  <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquareLock className="w-4 h-4 text-blue-600" />
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                          Conversations Directory
                        </h3>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 text-[10px] font-mono">
                        {adminConversations.length} Active
                      </Badge>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Search student or tutor..."
                        value={adminChatsSearch}
                        onChange={(e) => {
                          setAdminChatsSearch(e.target.value);
                          fetchAdminChats(e.target.value);
                        }}
                        className="pl-8 h-9 text-xs rounded-xl border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-50">
                    {adminChatsLoading && adminConversations.length === 0 ? (
                      <div className="py-20 text-center space-y-2">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                        <p className="text-xs text-slate-400">Loading conversation threads...</p>
                      </div>
                    ) : adminConversations.length === 0 ? (
                      <div className="py-20 text-center space-y-2 px-4">
                        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                        <div className="font-bold text-xs text-slate-700">No Chat Conversations Found</div>
                        <p className="text-[11px] text-slate-400">
                          {adminChatsSearch
                            ? "No conversation matched your search criteria."
                            : "Direct conversations between students and tutors will appear here."}
                        </p>
                      </div>
                    ) : (
                      adminConversations.map((conv) => {
                        const isSelected = selectedConversationId === conv.id;
                        const partA = conv.participantA;
                        const partB = conv.participantB;
                        const msgCount = conv._count?.messages ?? 0;

                        return (
                          <div
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            className={`p-3 rounded-xl transition-all cursor-pointer border group relative ${
                              isSelected
                                ? "bg-blue-50/90 border-blue-200 shadow-2xs"
                                : "bg-white hover:bg-slate-50 border-transparent hover:border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex -space-x-2 shrink-0">
                                  <Avatar className="w-7 h-7 ring-2 ring-white">
                                    {partA?.avatar && <AvatarImage src={partA.avatar} />}
                                    <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px] font-bold">
                                      {partA?.name?.charAt(0) || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <Avatar className="w-7 h-7 ring-2 ring-white">
                                    {partB?.avatar && <AvatarImage src={partB.avatar} />}
                                    <AvatarFallback className="bg-sky-100 text-sky-700 text-[10px] font-bold">
                                      {partB?.name?.charAt(0) || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-slate-900 truncate">
                                    {partA?.name || "User A"} <span className="text-slate-400 font-normal">&</span> {partB?.name || "User B"}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
                                    <span className={`px-1.5 py-0.2 rounded font-semibold ${partA?.role === "STUDENT" ? "bg-blue-50 text-blue-700" : "bg-sky-50 text-sky-700"}`}>
                                      {partA?.role || "USER"}
                                    </span>
                                    <span>•</span>
                                    <span className={`px-1.5 py-0.2 rounded font-semibold ${partB?.role === "STUDENT" ? "bg-blue-50 text-blue-700" : "bg-sky-50 text-sky-700"}`}>
                                      {partB?.role || "USER"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0 space-y-0.5">
                                <div className="text-[10px] text-slate-400">
                                  {conv.lastMessageAt ? getRelativeTimeString(conv.lastMessageAt) : "Recent"}
                                </div>
                                <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">
                                  {msgCount} {msgCount === 1 ? "msg" : "msgs"}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conv.id);
                              }}
                              className="absolute right-2.5 bottom-2.5 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete conversation thread"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col h-[650px]">
                  {!selectedConversation ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-50/30">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs">
                        <MessageSquareLock className="w-7 h-7" />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <h4 className="font-bold text-sm text-slate-900">Institutional Chat Monitoring</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Select any direct message conversation from the directory on the left to inspect transcripts, timestamps, and safeguarding records.
                        </p>
                      </div>
                      <div className="pt-2 flex items-center gap-1.5 text-[11px] text-slate-400 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>All E2EE messages are verified & decrypted for academic compliance</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex -space-x-2 shrink-0">
                            <Avatar className="w-8 h-8 ring-2 ring-white">
                              {selectedConversation.participantA?.avatar && (
                                <AvatarImage src={selectedConversation.participantA.avatar} />
                              )}
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                                {selectedConversation.participantA?.name?.charAt(0) || "A"}
                              </AvatarFallback>
                            </Avatar>
                            <Avatar className="w-8 h-8 ring-2 ring-white">
                              {selectedConversation.participantB?.avatar && (
                                <AvatarImage src={selectedConversation.participantB.avatar} />
                              )}
                              <AvatarFallback className="bg-sky-100 text-sky-700 text-xs font-bold">
                                {selectedConversation.participantB?.name?.charAt(0) || "B"}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                              <span>{selectedConversation.participantA?.name}</span>
                              <span className="text-slate-400">&</span>
                              <span>{selectedConversation.participantB?.name}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-blue-700 font-semibold mt-0.5">
                              <Lock className="w-3 h-3 text-blue-600" />
                              <span>E2EE Transcript Decrypted</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 font-normal">
                                {conversationMessages.length} total messages
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="relative w-36 sm:w-44">
                            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <Input
                              placeholder="Search transcript..."
                              value={chatMessageSearch}
                              onChange={(e) => setChatMessageSearch(e.target.value)}
                              className="pl-7 h-8 text-[11px] rounded-lg border-slate-200 bg-white"
                            />
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectConversation(selectedConversation)}
                            disabled={loadingConversationMessages}
                            className="h-8 px-2.5 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-xs cursor-pointer shadow-2xs"
                            title="Refresh messages"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingConversationMessages ? "animate-spin text-blue-600" : ""}`} />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteConversation(selectedConversation.id)}
                            className="h-8 px-2.5 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-xs cursor-pointer shadow-2xs"
                            title="Delete entire thread"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/30">
                        {loadingConversationMessages ? (
                          <div className="py-24 text-center space-y-2">
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                            <p className="text-xs text-slate-400">Decrypting and loading messages...</p>
                          </div>
                        ) : conversationMessages.length === 0 ? (
                          <div className="py-24 text-center space-y-2">
                            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="text-xs text-slate-500 font-semibold">No messages in this conversation yet</p>
                          </div>
                        ) : (
                          conversationMessages
                            .filter((m) => {
                              if (!chatMessageSearch.trim()) return true;
                              const content = decryptedAdminMessages[m.id] || m.encryptedContent || "";
                              return content.toLowerCase().includes(chatMessageSearch.toLowerCase());
                            })
                            .map((msg) => {
                              const isFromPartA = msg.senderId === selectedConversation.participantAId;
                              const sender = isFromPartA ? selectedConversation.participantA : selectedConversation.participantB;
                              const decryptedText = decryptedAdminMessages[msg.id] || msg.encryptedContent;
                              const isDeleting = isDeletingMessageId === msg.id;

                              return (
                                <div
                                  key={msg.id}
                                  className={`flex items-start gap-2.5 group ${isFromPartA ? "justify-start" : "justify-end"}`}
                                >
                                  {isFromPartA && (
                                    <Avatar className="w-7 h-7 ring-1 ring-slate-200 shrink-0 mt-0.5">
                                      {sender?.avatar && <AvatarImage src={sender.avatar} />}
                                      <AvatarFallback className="bg-blue-100 text-blue-800 text-[10px] font-bold">
                                        {sender?.name?.charAt(0) || "A"}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}

                                  <div className={`max-w-[78%] space-y-1 ${isFromPartA ? "items-start" : "items-end text-right"}`}>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                                      <span className="font-bold text-slate-700">{sender?.name || "Participant"}</span>
                                      <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                        sender?.role === "STUDENT" ? "bg-blue-50 text-blue-700" : "bg-sky-50 text-sky-700"
                                      }`}>
                                        {sender?.role || "USER"}
                                      </span>
                                      <span>•</span>
                                      <span>{getRelativeTimeString(msg.createdAt)}</span>
                                    </div>

                                    <div className="relative group/bubble flex items-center gap-1.5">
                                      {!isFromPartA && (
                                        <button
                                          onClick={() => handleDeleteChatMessage(msg.id)}
                                          disabled={isDeleting}
                                          className="opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                          title="Delete message"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}

                                      <div
                                        className={`p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                                          isFromPartA
                                            ? "bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs"
                                            : "bg-blue-600 text-white rounded-tr-xs"
                                        }`}
                                      >
                                        <p className="whitespace-pre-wrap break-words">{decryptedText}</p>
                                      </div>

                                      {isFromPartA && (
                                        <button
                                          onClick={() => handleDeleteChatMessage(msg.id)}
                                          disabled={isDeleting}
                                          className="opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                          title="Delete message"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {!isFromPartA && (
                                    <Avatar className="w-7 h-7 ring-1 ring-slate-200 shrink-0 mt-0.5">
                                      {sender?.avatar && <AvatarImage src={sender.avatar} />}
                                      <AvatarFallback className="bg-sky-100 text-sky-800 text-[10px] font-bold">
                                        {sender?.name?.charAt(0) || "B"}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                              );
                            })
                        )}
                      </div>

                      <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-blue-600" />
                          <span>Administrative Compliance Inspection • Messages are decrypted client-side for safety</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">Zero-Knowledge Relay</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "finances" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Gross Course Revenue</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    ${totalCalculatedRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>100% Cleared Student Tuition</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Total Course Purchases</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {totalEnrollmentsCount} {totalEnrollmentsCount === 1 ? "Purchase" : "Purchases"}
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold">
                    Across {coursesList.length} Published Classes
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Active Paying Students</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {uniquePayingStudentsCount} Students
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Enrolled with Full Material Access
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Tutor Honorarium Pool</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    ${(totalCalculatedRevenue * 0.3).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold">
                    30% Pool for Certified Tutors
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Course Purchases & Student Enrollments</h3>
                    <p className="text-xs text-slate-500">
                      Live transaction ledger of verified student course purchases and unlocked study materials
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const headers = "Student Name,Student Email,Course Title,Subject Code,Tuition Fee,Payment Status,Purchase Date\n";
                      const rows = purchasesList
                        .map(
                          (p) =>
                            `"${p.studentName}","${p.studentEmail}","${p.courseTitle}","${p.courseSubjectCode}",$${p.price},PAID,"${new Date(p.enrolledAt).toLocaleString()}"`
                        )
                        .join("\n");
                      const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.setAttribute("download", `edupulse_course_purchases_${new Date().toISOString().slice(0, 10)}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-xs font-bold text-slate-700 h-9 rounded-xl gap-1.5 cursor-pointer shadow-2xs border-slate-200 hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export CSV Statement</span>
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search student, email, course..."
                      value={purchaseSearch}
                      onChange={(e) => setPurchaseSearch(e.target.value)}
                      className="pl-8 h-9 text-xs rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={purchaseCourseFilter}
                      onChange={(e) => setPurchaseCourseFilter(e.target.value)}
                      className="w-full sm:w-auto h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="ALL">All Classes ({purchasesList.length} Purchases)</option>
                      {coursesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.enrollments?.length || 0} enrolled)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {purchasesList.length === 0 ? (
                  <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No Course Purchases Found</p>
                    <p className="text-[11px] text-slate-400">
                      {purchaseSearch || purchaseCourseFilter !== "ALL"
                        ? "Try clearing your search query or course filter."
                        : "New student course purchases will appear here in real-time."}
                    </p>
                    {(purchaseSearch || purchaseCourseFilter !== "ALL") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPurchaseSearch("");
                          setPurchaseCourseFilter("ALL");
                        }}
                        className="text-xs font-bold rounded-xl mt-2"
                      >
                        Reset Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Student / Buyer</th>
                          <th className="py-3 px-4">Course Purchased</th>
                          <th className="py-3 px-4">Tuition Fee</th>
                          <th className="py-3 px-4">Payment & Access</th>
                          <th className="py-3 px-4">Purchase Date</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {purchasesList.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-8 h-8 ring-1 ring-slate-200">
                                  {tx.studentAvatar && <AvatarImage src={tx.studentAvatar} />}
                                  <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                                    {tx.studentName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                    <span>{tx.studentName}</span>
                                    {tx.studentId && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200" title="Official Student ID">
                                        {tx.studentId}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate">{tx.studentEmail}</div>
                                  {tx.studentPhone && (
                                    <div className="text-[10px] text-slate-400">{tx.studentPhone}</div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="space-y-0.5">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                                  {tx.courseSubjectCode}
                                </span>
                                <div className="font-bold text-slate-900 line-clamp-1">{tx.courseTitle}</div>
                                <div className="text-[10px] text-slate-400">{tx.courseCategory}</div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="text-sm font-black text-slate-900">${tx.price}</span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                <span>PAID & UNLOCKED</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                              <div>{new Date(tx.enrolledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(tx.enrolledAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    const studentUser = allUsersList.find((u) => u.id === tx.userId) || {
                                      id: tx.userId,
                                      name: tx.studentName,
                                      email: tx.studentEmail,
                                      phone: tx.studentPhone,
                                      role: "STUDENT",
                                    };
                                    handleOpenUserProfile(studentUser);
                                  }}
                                  className="h-7 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-[11px] inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-2xs"
                                  title="View Student Full Profile & Complete History"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Profile</span>
                                </button>
                                <Link
                                  href={`/classes/${tx.courseSlug}`}
                                  target="_blank"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="View Class Syllabus & Materials"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>

                                <button
                                  onClick={() => {
                                    setConfirmModalData({
                                      isOpen: true,
                                      title: `Revoke Class Access?`,
                                      description: `Are you sure you want to remove ${tx.studentName} from "${tx.courseTitle}"? Their enrollment will be cancelled and material access will be locked.`,
                                      variant: "danger",
                                      onConfirm: async () => {
                                        await handleUnenrollUser(tx.userId, tx.courseId, tx.id);
                                      },
                                    });
                                  }}
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 border border-red-200/80 transition-colors cursor-pointer"
                                  title="Revoke student course access"
                                >
                                  Revoke
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900">Revenue Breakdown by Course</h3>
                  <p className="text-xs text-slate-500">
                    Gross performance and tuition collection volume per syllabus unit
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coursesList.map((c) => {
                    const enrCount = c.enrollments?.length || 0;
                    const cRevenue = enrCount * (Number.isFinite(Number(c.price)) ? Number(c.price) : 0);
                    const percentOfTotal = totalCalculatedRevenue > 0 ? (cRevenue / totalCalculatedRevenue) * 100 : 0;

                    return (
                      <div key={c.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                              {c.subjectCode || "LONDON-AL"}
                            </span>
                            <h4 className="font-bold text-xs text-slate-900 truncate mt-1">{c.title}</h4>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-black text-sm text-slate-900">${cRevenue.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-500">{c.price ?? 0} Tokens / seat</div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                            <span>{enrCount} {enrCount === 1 ? "Student" : "Students"} Enrolled</span>
                            <span>{percentOfTotal.toFixed(1)}% Share</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all duration-500"
                              style={{ width: `${percentOfTotal}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Active Pricing Tiers</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Coins className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {bundlesList.length > 0 ? bundlesList.length : DEFAULT_BUNDLES.length} Packages
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Live on Public Homepage & Wallet</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Featured / Most Popular</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-lg font-black tracking-tight text-slate-900 truncate">
                    {(bundlesList.length > 0 ? bundlesList : DEFAULT_BUNDLES).find((b) => b.popular)?.name || "16 Hours Standard"}
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold">
                    Highlighted with Featured Badge
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Lowest Hourly Rate</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    ${Math.min(
                      ...(bundlesList.length > 0 ? bundlesList : DEFAULT_BUNDLES).map(
                        (b) => b.price / (b.hours || b.tokens || 1)
                      )
                    ).toFixed(2)}
                    <span className="text-xs font-semibold text-slate-400">/hr</span>
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold">
                    Best Value Student Rate
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Instant Publishing</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    Synchronized
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold">
                    Realtime DB & Client Sync
                  </div>
                </div>
              </div>

              {/* Tutor Hourly Pay Grades & Token Conversion Settings */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <h3 className="font-black text-lg text-slate-900">
                        Tutor Hourly Pay Grades & Token Conversion
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Active Pay Rates
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                      Define the hourly pay rates for each academic tier. When a completed 1-hour class session deducts 1 token from a student, the tutor's internal earnings ledger is instantly credited with the corresponding monetary equivalent (LKR).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResetStandardPayGrades}
                      disabled={isSavingPayGrades}
                      className="text-xs font-bold h-9 rounded-xl border-slate-200 hover:bg-slate-50 gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reset Standard Defaults</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePayGrades}
                      disabled={isSavingPayGrades}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs shadow-emerald-600/20 cursor-pointer"
                    >
                      {isSavingPayGrades ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Settings...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Save Pay Grades & Bonus Tiers</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {payGradesSaveMsg && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      payGradesSaveMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {payGradesSaveMsg.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    )}
                    <span>{payGradesSaveMsg.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* IGCSE Level Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="text-sm font-black text-slate-900">IGCSE Level (O/L)</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        Standard: 750 LKR/hr
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Hourly Rate per Token Deducted (LKR)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                          Rs.
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={payGradesInput.igcse}
                          onChange={(e) =>
                            setPayGradesInput((prev) => ({ ...prev, igcse: e.target.value }))
                          }
                          className="w-full pl-10 pr-16 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                          placeholder="750"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          LKR / hr
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Currently Active:</span>
                        <span className="font-black text-blue-700">Rs. {payGrades.igcseRateLkr.toLocaleString()} LKR</span>
                      </div>
                      <p className="text-slate-500 text-[10.5px]">
                        Applied to all O/L, IGCSE, GCSE course sessions and beginner/intermediate curriculum classes.
                      </p>
                    </div>
                  </div>

                  {/* IAL & IAS Level Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span className="text-sm font-black text-slate-900">IAL & IAS (A-Level)</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                        Standard: 850 LKR/hr
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Hourly Rate per Token Deducted (LKR)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                          Rs.
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={payGradesInput.ial}
                          onChange={(e) =>
                            setPayGradesInput((prev) => ({ ...prev, ial: e.target.value }))
                          }
                          className="w-full pl-10 pr-16 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                          placeholder="850"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          LKR / hr
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Currently Active:</span>
                        <span className="font-black text-indigo-700">Rs. {payGrades.ialRateLkr.toLocaleString()} LKR</span>
                      </div>
                      <p className="text-slate-500 text-[10.5px]">
                        Applied to all International A-Level (IAL & IAS / A2) syllabus courses and advanced curriculum sessions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance-Based Tutor Bonus System Configuration */}
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <h4 className="font-black text-sm text-slate-900">
                          Performance-Based Monthly Bonus Tiers (Dynamic Controls)
                        </h4>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                          Non-Stacking
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                        Adjust the hour requirements and monetary values awarded at month-end. The system strictly evaluates the final total of completed hours at the end of the month and awards only the value of the highest achieved tier.
                      </p>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      Default: 50h (5,000 LKR) • 75h (7,500 LKR) • 100h (10,000 LKR)
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tier 1 Configuration */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">Tier 1 Bonus</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                          Baseline Milestone
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">
                            Min Hours Required
                          </label>
                          <div className="relative mt-1">
                            <input
                              type="number"
                              min="1"
                              value={payGradesInput.tier1MinHours}
                              onChange={(e) =>
                                setPayGradesInput((prev) => ({ ...prev, tier1MinHours: e.target.value }))
                              }
                              className="w-full pl-3 pr-12 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                              placeholder="50"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                              Hours
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">
                            Monetary Bonus Award (LKR)
                          </label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                              Rs.
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={payGradesInput.tier1BonusLkr}
                              onChange={(e) =>
                                setPayGradesInput((prev) => ({ ...prev, tier1BonusLkr: e.target.value }))
                              }
                              className="w-full pl-9 pr-12 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                              placeholder="5000"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                              LKR
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 bg-white/90 rounded-xl border border-slate-200/80 text-[10.5px] text-slate-600 flex items-center justify-between">
                        <span className="font-semibold">Active:</span>
                        <span className="font-black text-blue-700">
                          {payGrades.tier1MinHours}h - {Number(payGrades.tier2MinHours) - 1}h = Rs. {payGrades.tier1BonusLkr.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Tier 2 Configuration */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">Tier 2 Bonus</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                          Intermediate Milestone
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">
                            Min Hours Required
                          </label>
                          <div className="relative mt-1">
                            <input
                              type="number"
                              min="1"
                              value={payGradesInput.tier2MinHours}
                              onChange={(e) =>
                                setPayGradesInput((prev) => ({ ...prev, tier2MinHours: e.target.value }))
                              }
                              className="w-full pl-3 pr-12 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                              placeholder="75"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                              Hours
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">
                            Monetary Bonus Award (LKR)
                          </label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                              Rs.
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={payGradesInput.tier2BonusLkr}
                              onChange={(e) =>
                                setPayGradesInput((prev) => ({ ...prev, tier2BonusLkr: e.target.value }))
                              }
                              className="w-full pl-9 pr-12 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                              placeholder="7500"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                              LKR
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 bg-white/90 rounded-xl border border-slate-200/80 text-[10.5px] text-slate-600 flex items-center justify-between">
                        <span className="font-semibold">Active:</span>
                        <span className="font-black text-indigo-700">
                          {payGrades.tier2MinHours}h - {Number(payGrades.tier3MinHours) - 1}h = Rs. {payGrades.tier2BonusLkr.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Tier 3 Configuration */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50/40 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">Tier 3 Bonus</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          Max Top Performer
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">
                            Min Hours Required
                          </label>
                          <div className="relative mt-1">
                            <input
                              type="number"
                              min="1"
                              value={payGradesInput.tier3MinHours}
                              onChange={(e) =>
                                setPayGradesInput((prev) => ({ ...prev, tier3MinHours: e.target.value }))
                              }
                              className="w-full pl-3 pr-12 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                              placeholder="100"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                              Hours
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">
                            Monetary Bonus Award (LKR)
                          </label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                              Rs.
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={payGradesInput.tier3BonusLkr}
                              onChange={(e) =>
                                setPayGradesInput((prev) => ({ ...prev, tier3BonusLkr: e.target.value }))
                              }
                              className="w-full pl-9 pr-12 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                              placeholder="10000"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                              LKR
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 bg-white/90 rounded-xl border border-slate-200/80 text-[10.5px] text-slate-600 flex items-center justify-between">
                        <span className="font-semibold">Active:</span>
                        <span className="font-black text-amber-700">
                          {payGrades.tier3MinHours}h+ = Rs. {payGrades.tier3BonusLkr.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tutor Payout & Performance Bonus Overview Table */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </div>
                      <h3 className="font-black text-lg text-slate-900">
                        Tutor Payout & Performance Bonus Overview
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {tutorPayoutOverview?.monthLabel || "Current Month"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                      Comprehensive admin ledger tracking each tutor's subject tier, hourly conversion rate, completed monthly hours, active unlocked bonuses, and estimated total payable amount.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const tutors = tutorPayoutOverview?.tutors || [];
                        const headers = "Tutor Name,Email,Tutor ID,Subject Tier,Hourly Pay Grade,Total Hours This Month,Base Earnings LKR,Current Unlocked Bonus LKR,Bonus Tier,Total Estimated Payout LKR\n";
                        const rows = tutors
                          .map(
                            (t: any) =>
                              `"${t.name}","${t.email}","${t.tutorId || ""}","${t.subjectTier}","${t.hourlyPayGrade}",${t.totalHoursThisMonth},${t.baseEarningsLkr},${t.unlockedBonusLkr},"${t.bonusTierName || "None"}",${t.totalEstimatedPayoutLkr}`
                          )
                          .join("\n");
                        const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.setAttribute("download", `tutor_payouts_overview_${tutorPayoutOverview?.monthKey || "current"}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="text-xs font-bold text-slate-700 h-9 rounded-xl gap-1.5 cursor-pointer shadow-2xs border-slate-200 hover:bg-slate-50"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Export Payouts CSV</span>
                    </Button>
                  </div>
                </div>

                {/* Filter and Stats Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search tutor by name, email, or ID..."
                      value={tutorPayoutSearch}
                      onChange={(e) => setTutorPayoutSearch(e.target.value)}
                      className="pl-8 h-9 text-xs rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                    <span>
                      Total Tutors: <strong>{tutorPayoutOverview?.tutors?.length || 0}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Hours Logged: <strong>{tutorPayoutOverview?.tutors?.reduce((s: number, t: any) => s + (t.totalHoursThisMonth || 0), 0) || 0} hrs</strong>
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700">
                      Total Payout: <strong>Rs. {(tutorPayoutOverview?.tutors?.reduce((s: number, t: any) => s + (t.totalEstimatedPayoutLkr || 0), 0) || 0).toLocaleString()} LKR</strong>
                    </span>
                  </div>
                </div>

                {/* Overview Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Tutor Name</th>
                        <th className="py-3 px-4">Subject Tier</th>
                        <th className="py-3 px-4">Hourly Pay Grade</th>
                        <th className="py-3 px-4">Total Hours This Month</th>
                        <th className="py-3 px-4">Current Unlocked Bonus</th>
                        <th className="py-3 px-4 text-right">Total Estimated Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(tutorPayoutOverview?.tutors || [])
                        .filter((t: any) => {
                          if (!tutorPayoutSearch.trim()) return true;
                          const q = tutorPayoutSearch.toLowerCase();
                          return (
                            t.name.toLowerCase().includes(q) ||
                            t.email.toLowerCase().includes(q) ||
                            (t.tutorId && t.tutorId.toLowerCase().includes(q))
                          );
                        })
                        .map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Tutor Name */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-7 h-7 ring-1 ring-slate-200">
                                  <AvatarFallback className="text-[11px] font-bold bg-blue-100 text-blue-800">
                                    {t.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{t.name}</span>
                                    {t.tutorId && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                                        {t.tutorId}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400">{t.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Subject Tier */}
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                t.subjectTier === "IAL_IAS"
                                  ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                  : t.subjectTier === "Both (IGCSE & IAL/IAS)"
                                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                                  : "bg-blue-100 text-blue-800 border border-blue-200"
                              }`}>
                                {t.subjectTier === "IAL_IAS"
                                  ? "IAL & IAS (A-Level)"
                                  : t.subjectTier === "Both (IGCSE & IAL/IAS)"
                                  ? "Both (O/L & A/L)"
                                  : "IGCSE Level (O/L)"}
                              </span>
                            </td>

                            {/* Hourly Pay Grade */}
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                              {t.hourlyPayGrade}
                            </td>

                            {/* Total Hours This Month */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <span className="font-mono font-black text-slate-900 text-xs">
                                  {t.totalHoursThisMonth} Hours
                                </span>
                                <div className="text-[10.5px] text-slate-400">
                                  {t.igcseHours > 0 && `${t.igcseHours}h IGCSE`}
                                  {t.igcseHours > 0 && t.ialHours > 0 && " • "}
                                  {t.ialHours > 0 && `${t.ialHours}h IAL`}
                                  {t.totalHoursThisMonth === 0 && "0 tokens deducted"}
                                </div>
                              </div>
                            </td>

                            {/* Current Unlocked Bonus */}
                            <td className="py-3.5 px-4">
                              {t.unlockedBonusLkr > 0 ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                    <Trophy className="w-3 h-3 text-amber-600" />
                                    <span>+{t.unlockedBonusLkr.toLocaleString()} LKR ({t.bonusTierName})</span>
                                  </span>
                                  <div className="text-[10px] text-slate-400 font-semibold">
                                    Highest tier unlocked (non-stacking)
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    Rs. 0 LKR
                                  </span>
                                  <div className="text-[10px] text-slate-400">
                                    Need {t.nextTierHoursRemaining ?? 50} more hrs for Tier 1
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Total Estimated Payout */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="space-y-0.5">
                                <span className="font-mono font-black text-sm text-emerald-700">
                                  Rs. {t.totalEstimatedPayoutLkr.toLocaleString()} LKR
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  Base: Rs. {t.baseEarningsLkr.toLocaleString()}
                                  {t.unlockedBonusLkr > 0 && ` + Bonus: Rs. ${t.unlockedBonusLkr.toLocaleString()}`}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}

                      {(!tutorPayoutOverview?.tutors || tutorPayoutOverview.tutors.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                            No active certified tutors registered yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-lg text-slate-900">
                        Public Landing Page & Student Pricing Cards
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Live Preview
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                      These cards are identical to what prospective students and parents see on the public homepage. Click <strong>Edit Package</strong> on any card to modify prices, descriptions, bulleted features, or badges.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleOpenBundleEditor();
                        handleAddNewBundle();
                      }}
                      className="text-xs font-bold h-9 rounded-xl border-slate-200 hover:bg-slate-50 gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>Add New Package</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleOpenBundleEditor()}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs shadow-blue-600/20 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit All Packages</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  {(bundlesList.length > 0 ? bundlesList : DEFAULT_BUNDLES).map((plan, planIdx) => {
                    const price = plan.price;
                    const roleTarget = plan.roleTarget || `${plan.tokens} Tokens (${plan.hours} Hours Tutoring)`;
                    const ctaText = plan.ctaText || `Get ${plan.hours} Hours Pack`;
                    const features = plan.features && plan.features.length > 0
                      ? plan.features
                      : [
                          `${plan.tokens} tokens (1 token = 1 hour learning credit)`,
                          "Book 1-on-1 private tutoring with Senior Tutors",
                          "Join live interactive syllabus individual classes",
                          "Instant token crediting to student wallet",
                          "Full flexibility: student decides when & how to spend",
                          "Access to course materials & study notes",
                        ];

                    return (
                      <div
                        key={plan.id}
                        className={`rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 relative border-2 ${
                          plan.popular
                            ? "bg-gradient-to-b from-blue-50/50 via-white to-sky-50/30 border-blue-600 shadow-xl shadow-blue-500/10 scale-[1.02] z-10"
                            : "bg-white border-slate-200 hover:border-blue-300 shadow-sm"
                        }`}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                            <Badge
                              variant="default"
                              className="bg-gradient-to-r from-blue-600 to-sky-600 text-white font-bold text-xs py-1 px-4 shadow-md shadow-blue-500/30 flex items-center gap-1"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>{plan.badge || "Most Popular"}</span>
                            </Badge>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                              {roleTarget}
                            </span>
                            {!plan.popular && plan.badge && (
                              <Badge variant="secondary" className="text-[10px] font-bold">
                                {plan.badge}
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-xl font-black text-slate-900 mb-1.5">
                            {plan.name}
                          </h3>

                          <p className="text-xs text-slate-500 leading-relaxed mb-5 min-h-[36px]">
                            {plan.description}
                          </p>

                          <div className="space-y-2 mb-5 pb-5 border-b border-slate-100">
                            <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/60">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                                  London A/L Rate
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-500">
                                  ${(price / (plan.hours || plan.tokens || 1)).toFixed(2)}/hr
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                  {formatStudentPrice(price, null, plan.lkrPrice, "AL")}
                                </span>
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  {formatStudentPrice(price, "Sri Lanka", plan.lkrPrice, "AL")}
                                </span>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/60">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                                  London O/L Rate
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-500">
                                  ${((plan.olPrice && plan.olPrice > 0 ? plan.olPrice : price) / (plan.hours || plan.tokens || 1)).toFixed(2)}/hr
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                  {formatStudentPrice(price, null, plan.lkrPrice, "OL", plan.olPrice, plan.olLkrPrice)}
                                </span>
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  {formatStudentPrice(price, "Sri Lanka", plan.lkrPrice, "OL", plan.olPrice, plan.olLkrPrice)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2.5 mb-6">
                            <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                              Included in this plan:
                            </div>
                            {features.map((feature, fIdx) => (
                              <div key={fIdx} className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                <span className="text-xs text-slate-700 font-medium leading-tight">
                                  {feature}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2.5 pt-4 border-t border-slate-100">
                          <div
                            className={`w-full text-xs font-bold h-10 rounded-xl flex items-center justify-center gap-2 select-none opacity-80 ${
                              plan.popular
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                : "border border-blue-200 text-slate-700 bg-blue-50/50"
                            }`}
                          >
                            <span>{ctaText}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleOpenBundleEditor(planIdx)}
                              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-9 gap-1.5 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-blue-300" />
                              <span>Edit Package</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const updated = (bundlesList.length > 0 ? bundlesList : DEFAULT_BUNDLES).map(
                                  (b, i) => ({
                                    ...b,
                                    popular: i === planIdx ? !b.popular : false,
                                  })
                                );
                                setEditingBundles(updated);
                                fetch("/api/admin", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "update_bundles", bundles: updated }),
                                })
                                  .then((r) => r.json())
                                  .then((d) => {
                                    if (d.bundles) setBundlesList(d.bundles);
                                  });
                              }}
                              className="text-xs h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                              title="Toggle Most Popular status"
                            >
                              {plan.popular ? "⭐ Featured" : "Feature"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "approvals" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-5 rounded-2xl bg-white border shadow-2xs space-y-1 ${totalPendingApprovals > 0 ? "border-blue-300 ring-2 ring-blue-500/20" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      Total Awaiting Review
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {totalPendingApprovals} Pending
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Tutor actions requiring sign-off</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                      <Video className="w-4 h-4" />
                      Live Classes
                    </span>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {pendingClassesList.length} Sessions
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Scheduled / Rescheduled</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                      <CalendarCheck className="w-4 h-4" />
                      Trial Consultations
                    </span>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {pendingTrialsList.length} Requests
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">1-on-1 Student bookings</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      Classes & Syllabi
                    </span>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {pendingCoursesList.length} In Review
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Syllabus unit submissions</div>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setApprovalSubTab("ALL")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    approvalSubTab === "ALL"
                      ? "bg-[#0c2461] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All Requests ({totalPendingApprovals})
                </button>
                <button
                  onClick={() => setApprovalSubTab("CLASSES")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    approvalSubTab === "CLASSES"
                      ? "bg-[#0c2461] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Live Classes ({pendingClassesList.length})
                </button>
                <button
                  onClick={() => setApprovalSubTab("TRIALS")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    approvalSubTab === "TRIALS"
                      ? "bg-[#0c2461] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Trials & Consultations ({pendingTrialsList.length})
                </button>
                <button
                  onClick={() => setApprovalSubTab("COURSES")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    approvalSubTab === "COURSES"
                      ? "bg-[#0c2461] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Classes ({pendingCoursesList.length})
                </button>
              </div>

              {approvalSubTab === "TRIALS" && (
                <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 w-full md:w-auto">
                    <button
                      onClick={() => setTrialsSubViewMode("PENDING")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        trialsSubViewMode === "PENDING"
                          ? "bg-[#0c2461] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Awaiting Sign-Off ({pendingTrialsList.length})
                    </button>
                    <button
                      onClick={() => setTrialsSubViewMode("ALL")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        trialsSubViewMode === "ALL"
                          ? "bg-[#0c2461] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      All Academy Trials ({allTrialsList.length})
                    </button>
                  </div>

                  {trialsSubViewMode === "ALL" && (
                    <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
                      <div className="relative flex-1 sm:w-60">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <Input
                          placeholder="Search student, email, tutor..."
                          value={allTrialsSearch}
                          onChange={(e) => setAllTrialsSearch(e.target.value)}
                          className="pl-8 h-8.5 text-xs border-slate-200 rounded-xl"
                        />
                      </div>
                      <select
                        value={allTrialsStatusFilter}
                        onChange={(e) => setAllTrialsStatusFilter(e.target.value)}
                        className="h-8.5 px-2.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold cursor-pointer"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="PENDING">Pending Review</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Reset / Cancelled</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {approvalSubTab === "TRIALS" && trialsSubViewMode === "ALL" ? (
                <div className="space-y-4">
                  {filteredAllTrials.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2 shadow-2xs">
                      <p className="text-xs text-slate-400 italic">No trial sessions match the selected filters.</p>
                    </div>
                  ) : (
                    filteredAllTrials.map((tr) => {
                      const tutorName = tr.tutor?.name || tr.course?.tutor?.name || "Assigned Tutor";
                      const isReset = tr.status === "CANCELLED";
                      const isRejected = tr.status === "REJECTED";
                      const isLive = tr.status === "LIVE";
                      const isConfirmed = tr.status === "CONFIRMED";
                      const isPending = tr.status === "PENDING" || tr.status === "PENDING_APPROVAL";
                      const isCompleted = tr.status === "COMPLETED";

                      return (
                        <div
                          key={tr.id}
                          className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-4 transition-all ${
                            isReset ? "border-slate-200 bg-slate-50/50" : isConfirmed ? "border-emerald-200" : "border-blue-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
                                <CalendarCheck className="w-5 h-5" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-sm text-slate-900">
                                    30-Min Trial: {tr.studentName}
                                  </span>
                                  {isReset ? (
                                    <Badge className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold">
                                      ✓ Reset / Re-request Allowed
                                    </Badge>
                                  ) : isLive ? (
                                    <Badge className="bg-red-600 text-white text-[10px] font-bold animate-pulse">
                                      ● Live Now
                                    </Badge>
                                  ) : isConfirmed ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                      Confirmed
                                    </Badge>
                                  ) : isPending ? (
                                    <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold">
                                      Pending Review
                                    </Badge>
                                  ) : isCompleted ? (
                                    <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                                      Completed
                                    </Badge>
                                  ) : isRejected ? (
                                    <Badge className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold">
                                      Declined
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="text-xs text-slate-500">
                                  Course: <strong>{tr.course?.title || "London A/L"}</strong> {tr.topic ? `• Topic: ${tr.topic}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="text-right sm:shrink-0 text-xs">
                              <span className="font-bold text-slate-700 block">
                                {formatDateInTimezone(tr.preferredDate, adminTimezone, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              <span className="text-purple-700 font-mono font-bold">
                                {formatTimeInTimezone(tr.preferredDate, adminTimezone, { includeAbbr: true })}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-[11px] font-medium text-slate-400 block">Student:</span>
                              <span className="font-bold text-slate-800">{tr.studentName}</span>
                              <span className="text-[10px] text-slate-500 font-mono block">{tr.studentEmail}</span>
                            </div>
                            <div>
                              <span className="text-[11px] font-medium text-slate-400 block">Tutor:</span>
                              <span className="font-bold text-slate-800">{tutorName}</span>
                            </div>
                            <div>
                              <span className="text-[11px] font-medium text-slate-400 block mb-1">Meeting Room:</span>
                              {tr.meetingLink ? (
                                <a
                                  href={tr.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition-colors"
                                  title={tr.meetingLink}
                                >
                                  <Video className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                                  <span>Join Room</span>
                                  <ExternalLink className="w-3 h-3 shrink-0 text-blue-400" />
                                </a>
                              ) : (
                                <span className="text-slate-400 font-mono text-[11px] block">—</span>
                              )}
                            </div>
                            {tr.notes && (
                              <div className="sm:col-span-3 pt-1 border-t border-slate-200/50">
                                <span className="text-[11px] font-medium text-slate-400 block">Notes:</span>
                                <p className="text-slate-600 mt-0.5">{tr.notes}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-2.5 pt-1 flex-wrap">
                            {isCompleted && (
                              <>
                                {tr.recordingUrl && (
                                  <>
                                    <a
                                      href={tr.recordingUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="h-8.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-current" />
                                      <span>Watch</span>
                                    </a>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAdminDeleteRecording({ trialId: tr.id, title: `1-on-1 Trial: ${tr.studentName || "Student"}` })}
                                      disabled={isDeletingRecording === tr.id}
                                      className="h-8.5 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                                      title="Delete BigBlueButton recording (Admin Only)"
                                    >
                                      {isDeletingRecording === tr.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                      )}
                                      <span>Delete Rec</span>
                                    </Button>
                                  </>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenAnalyticsModal({ trialId: tr.id, title: `1-on-1 Trial: ${tr.studentName || "Student"}` })}
                                  className="h-8.5 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                                  title="View BigBlueButton Learning Analytics Dashboard"
                                >
                                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Analytics</span>
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenRecordingModal({ trialId: tr.id, title: `1-on-1 Trial: ${tr.studentName || "Student"}`, currentUrl: tr.recordingUrl })}
                                  className="h-8.5 px-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                                  title="Add or edit video recording link"
                                >
                                  <Video className="w-3.5 h-3.5 text-purple-600" />
                                  <span>{tr.recordingUrl ? "Edit Link" : "Attach Recording"}</span>
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSyncMeeting(undefined, tr.id)}
                                  disabled={syncingTrialId === tr.id}
                                  className="h-8.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                                  title="Sync recording from BigBlueButton"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${syncingTrialId === tr.id ? "animate-spin" : ""}`} />
                                  <span>{syncingTrialId === tr.id ? "Syncing..." : "Sync BBB"}</span>
                                </Button>
                              </>
                            )}
                            {!isReset && !isRejected ? (
                              <Button
                                type="button"
                                size="sm"
                                disabled={isResettingTrialId === tr.id}
                                onClick={() => handleResetTrial(tr.id, tutorName)}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl h-8.5 px-3.5 gap-1.5 cursor-pointer shadow-xs"
                                title="Reset this trial so the student can request this tutor again"
                              >
                                <RotateCcw className={`w-3.5 h-3.5 ${isResettingTrialId === tr.id ? "animate-spin" : ""}`} />
                                <span>Reset Trial (Allow Re-request)</span>
                              </Button>
                            ) : isReset ? (
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                                ✓ Unlocked: Student can book this tutor
                              </span>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => handleDeleteTrial(tr.id)}
                              className="h-8.5 w-8.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 inline-flex items-center justify-center cursor-pointer transition-colors"
                              title="Permanently Delete Trial Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : totalPendingApprovals === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">All Tutor Actions Verified & Approved</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      No tutor live class proposals, session reschedules, or trial bookings are pending admin sign-off at this time.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {(approvalSubTab === "ALL" || approvalSubTab === "CLASSES") && pendingClassesList.map((cls) => {
                    const tutorName = cls.course?.tutor?.name || cls.user?.name || "Senior Tutor";
                    const isProcessing = processingApprovalId === cls.id;

                    return (
                      <div
                        key={cls.id}
                        className="bg-white rounded-2xl border border-blue-200/90 p-5 shadow-2xs space-y-4 hover:border-blue-300 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                              <Video className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 uppercase tracking-wide">
                                  ⏳ Live Class Proposal
                                </span>
                                {cls.course?.subjectCode && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 font-mono">
                                    {cls.course.subjectCode}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-sm text-slate-900">{cls.title}</h4>
                              <p className="text-xs text-slate-500">
                                Course: <strong>{cls.course?.title || "London A/L Tutorial Individual Class"}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="text-right sm:shrink-0 text-xs">
                            <span className="font-bold text-slate-700 block">
                              {formatDateInTimezone(cls.dueDate, adminTimezone, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-blue-600 font-mono font-bold">
                              {formatTimeInTimezone(cls.dueDate, adminTimezone, {
                                includeAbbr: true,
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[11px] font-medium text-slate-400 block">Proposed By Tutor:</span>
                            <span className="font-bold text-slate-800">{tutorName}</span>
                          </div>
                          {cls.meetingLink && (
                            <div className="min-w-0">
                              <span className="text-[11px] font-medium text-slate-400 block">Classroom Link:</span>
                              <a
                                href={cls.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition-colors mt-0.5"
                                title={cls.meetingLink}
                              >
                                <Video className="w-3.5 h-3.5 shrink-0" />
                                Open Classroom
                                <ExternalLink className="w-3 h-3 shrink-0 text-blue-400" />
                              </a>
                            </div>
                          )}
                          {cls.description && (
                            <div className="md:col-span-2 pt-1 border-t border-slate-200/50">
                              <span className="text-[11px] font-medium text-slate-400 block">Session Notes / Agenda:</span>
                              <p className="text-slate-600 whitespace-pre-line mt-0.5">{cls.description}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleOpenRejectModal("CLASS", cls.id, cls.title, tutorName)}
                            className="text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-700 text-xs font-bold rounded-xl h-8.5 px-3.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline / Request Revision</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleApproveClass(cls.id)}
                            className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl h-8.5 px-4 gap-1.5 shadow-sm cursor-pointer"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Approve & Publish to Students</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {(approvalSubTab === "ALL" || approvalSubTab === "TRIALS") && pendingTrialsList.map((trial) => {
                    const tutorName = trial.tutor?.name || trial.course?.tutor?.name || "Assigned Tutor";
                    const isProcessing = processingApprovalId === trial.id;

                    return (
                      <div
                        key={trial.id}
                        className="bg-white rounded-2xl border border-blue-200 p-5 shadow-2xs space-y-4 hover:border-blue-300 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                              <CalendarCheck className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 uppercase tracking-wide">
                                  ⏳ 1-on-1 Consultation Confirmation
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-slate-900">
                                30-Min Free Trial: {trial.studentName}
                              </h4>
                              <p className="text-xs text-slate-500">
                                Course: <strong>{trial.course?.title || "London A/L"}</strong> {trial.topic ? `• Topic: ${trial.topic}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="text-right sm:shrink-0 text-xs">
                            <span className="font-bold text-slate-700 block">
                              {formatDateInTimezone(trial.preferredDate, adminTimezone, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-blue-600 font-mono font-bold">
                              {formatTimeInTimezone(trial.preferredDate, adminTimezone, {
                                includeAbbr: true,
                              })}
                            </span>
                            {trial.timezone && trial.timezone !== adminTimezone && (
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                Student: {formatTimeInTimezone(trial.preferredDate, trial.timezone, { includeAbbr: true })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[11px] font-medium text-slate-400 block">Student:</span>
                            <span className="font-bold text-slate-800">{trial.studentName}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">{trial.studentEmail}</span>
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-slate-400 block">Confirmed Tutor:</span>
                            <span className="font-bold text-slate-800">{tutorName}</span>
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-slate-400 block mb-1">Meeting Room:</span>
                            {trial.meetingLink && !trial.meetingLink.includes("/new") ? (
                              <a
                                href={trial.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition-colors"
                                title={trial.meetingLink}
                              >
                                <Video className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                                <span>Join Room</span>
                                <ExternalLink className="w-3 h-3 shrink-0 text-blue-400" />
                              </a>
                            ) : (
                              <span className="text-blue-600 font-mono text-[11px] truncate block">
                                ✨ Auto-generated on approval
                              </span>
                            )}
                          </div>
                          {trial.notes && (
                            <div className="sm:col-span-3 pt-1 border-t border-slate-200/50">
                              <span className="text-[11px] font-medium text-slate-400 block">Tutor Notes:</span>
                              <p className="text-slate-600 mt-0.5">{trial.notes}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleOpenRejectModal("TRIAL", trial.id, `Trial for ${trial.studentName}`, tutorName)}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-xs font-bold rounded-xl h-8.5 px-3.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isProcessing || isResettingTrialId === trial.id}
                            onClick={() => handleResetTrial(trial.id, tutorName)}
                            className="text-purple-700 border-purple-200 hover:bg-purple-50 hover:text-purple-800 text-xs font-bold rounded-xl h-8.5 px-3.5 cursor-pointer gap-1"
                            title="Reset this trial so the student can request this tutor again"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${isResettingTrialId === trial.id ? "animate-spin" : ""}`} />
                            <span>Reset &amp; Unlock</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleApproveTrial(trial.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-8.5 px-4 gap-1.5 shadow-sm cursor-pointer"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Approve & Add to Student Calendar</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {(approvalSubTab === "ALL" || approvalSubTab === "COURSES") && pendingCoursesList.map((course) => {
                    const tutorName = course.tutor?.name || "Senior Tutor";
                    const isProcessing = processingApprovalId === course.id;

                    return (
                      <div
                        key={course.id}
                        className="bg-white rounded-2xl border border-blue-200 p-5 shadow-2xs space-y-4 hover:border-blue-300 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 uppercase tracking-wide">
                                  ⏳ Class Review Required
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                                  {course.subjectCode || "LONDON-AL"}
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-slate-900">{course.title}</h4>
                              <p className="text-xs text-slate-500">{course.subtitle || course.category}</p>
                            </div>
                          </div>

                          <div className="text-right sm:shrink-0 text-xs">
                            {course.price > 0 ? (
                              <>
                                <span className="font-black text-sm text-blue-600 block">{course.price} Tokens</span>
                                <span className="text-[10px] text-slate-400 font-medium">Admin Configured</span>
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-xs text-amber-600 block">⚠️ Tokens Not Set</span>
                                <span className="text-[10px] text-slate-400 font-medium">Requires Admin Pricing</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[11px] font-medium text-slate-400 block">Submitted By Tutor:</span>
                            <span className="font-bold text-slate-800">{tutorName}</span>
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-slate-400 block">Category:</span>
                            <span className="font-semibold text-slate-700">{course.category}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleOpenEditCourse(course)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs font-bold rounded-xl h-8.5 px-3.5 cursor-pointer gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Set Tokens & Details</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleOpenRejectModal("COURSE", course.id, course.title, tutorName)}
                            className="text-slate-600 border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl h-8.5 px-3.5 cursor-pointer"
                          >
                            <span>Return to Draft</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleApproveCourse(course.id)}
                            className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl h-8.5 px-4 gap-1.5 shadow-sm cursor-pointer"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Approve & Publish Class</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "audit_log" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Total Audit Events</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {auditLogTotalCount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Immutable records saved in DB</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Recent Activity (24h)</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {auditLogStats.last24hCount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold">
                    Administrative actions in past 24h
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">User & Account Changes</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {auditLogStats.userCount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold">
                    Creations, updates, and enrollments
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Classes & Curriculum</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {(auditLogStats.courseCount + auditLogStats.classTrialCount).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold">
                    Classes, sessions & trial approvals
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search action code, admin email, or target record..."
                      value={auditLogSearch}
                      onChange={(e) => setAuditLogSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") fetchAuditLogs(1, auditLogSearch, auditLogCategory);
                      }}
                      className="pl-10 pr-9 h-10 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-400"
                    />
                    {auditLogSearch && (
                      <button
                        onClick={() => {
                          setAuditLogSearch("");
                          fetchAuditLogs(1, "", auditLogCategory);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchAuditLogs(auditLogPage, auditLogSearch, auditLogCategory)}
                      disabled={auditLogsLoading}
                      className="h-10 text-xs font-bold rounded-xl border-slate-200 hover:bg-slate-50 gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${auditLogsLoading ? "animate-spin" : ""}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportAuditLogCSV}
                      disabled={auditLogs.length === 0}
                      className="h-10 text-xs font-bold rounded-xl border-slate-200 hover:bg-slate-50 gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                    <Filter className="w-3 h-3 text-slate-400" />
                    <span>Filter:</span>
                  </span>

                  {(["ALL", "USER", "COURSE", "CLASS", "TRIAL", "FINANCE", "PRICING", "GENERAL"] as const).map((cat) => {
                    const conf = AUDIT_CATEGORY_CONFIG[cat] || AUDIT_CATEGORY_CONFIG.GENERAL;
                    const Icon = conf.icon;
                    const isActive = auditLogCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setAuditLogCategory(cat);
                          fetchAuditLogs(1, auditLogSearch, cat);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-600 text-white shadow-xs shadow-blue-600/20"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-500"}`} />
                        <span>{conf.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Recorded Activity Ledger</h3>
                    <p className="text-xs text-slate-500">
                      Chronological history of all admin modifications, security events, and approvals
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-slate-400">
                    {auditLogTotalCount.toLocaleString()} Total Records
                  </div>
                </div>

                {auditLogsError && (
                  <div className="p-6 text-center text-sm text-red-600 font-semibold bg-red-50/50 border-b border-red-100">
                    <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-2" />
                    <span>{auditLogsError}</span>
                    <button
                      onClick={() => fetchAuditLogs(1)}
                      className="ml-3 underline text-blue-600 hover:text-blue-700 font-bold"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {auditLogsLoading && auditLogs.length === 0 && (
                  <div className="py-20 text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <div className="text-sm font-bold text-slate-800">Synchronizing Audit Records...</div>
                    <p className="text-xs text-slate-400">Fetching immutable history logs from database.</p>
                  </div>
                )}

                {!auditLogsLoading && !auditLogsError && auditLogs.length === 0 && (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-800">No matching audit events found</div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {auditLogSearch || auditLogCategory !== "ALL"
                        ? "Try clearing your search query or selecting a different category filter."
                        : "Any administrative operation performed in the LMS will be recorded and displayed here automatically."}
                    </p>
                    {(auditLogSearch || auditLogCategory !== "ALL") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAuditLogSearch("");
                          setAuditLogCategory("ALL");
                          fetchAuditLogs(1, "", "ALL");
                        }}
                        className="rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Reset All Filters
                      </Button>
                    )}
                  </div>
                )}

                {auditLogs.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-4">Operation & Action</th>
                          <th className="py-3.5 px-4">Category</th>
                          <th className="py-3.5 px-4">Target Record</th>
                          <th className="py-3.5 px-4">Administrator</th>
                          <th className="py-3.5 px-4">Timestamp</th>
                          <th className="py-3.5 px-4 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditLogs.map((log) => {
                          const actionConfig = AUDIT_ACTION_CONFIG[log.action] || {
                            label: log.action.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
                            icon: ShieldCheck,
                            color: "text-slate-600 bg-slate-50 border-slate-200",
                          };
                          const ActionIcon = actionConfig.icon;
                          const categoryConfig = AUDIT_CATEGORY_CONFIG[log.category] || AUDIT_CATEGORY_CONFIG.GENERAL;

                          return (
                            <tr key={log.id} className="hover:bg-blue-50/20 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${actionConfig.color}`}>
                                    <ActionIcon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 truncate">
                                      {actionConfig.label}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <code className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                                        {log.action}
                                      </code>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${categoryConfig.badge}`}>
                                  <span>{log.category}</span>
                                </span>
                              </td>

                              <td className="py-3.5 px-4 max-w-[220px]">
                                {log.targetLabel ? (
                                  <div>
                                    <div className="font-bold text-slate-900 truncate" title={log.targetLabel}>
                                      {log.targetLabel}
                                    </div>
                                    {log.targetId && (
                                      <div className="text-[10px] text-slate-400 font-mono truncate" title={log.targetId}>
                                        ID: {log.targetId}
                                      </div>
                                    )}
                                  </div>
                                ) : log.targetId ? (
                                  <div className="text-[11px] text-slate-600 font-mono truncate" title={log.targetId}>
                                    ID: {log.targetId}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-medium">—</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6 ring-1 ring-slate-200">
                                    <AvatarFallback className="text-[10px] font-bold bg-slate-100 text-slate-700">
                                      {(log.adminEmail || "A").slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 text-xs truncate max-w-[170px]" title={log.adminEmail}>
                                      {log.adminEmail}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {log.ipAddress ? `IP: ${log.ipAddress}` : "System Execution"}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-bold text-slate-800 text-xs">
                                  {getRelativeTimeString(log.createdAt)}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(log.createdAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}{" "}
                                  •{" "}
                                  {new Date(log.createdAt).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedLogForModal(log)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 font-semibold text-xs transition-all cursor-pointer shadow-2xs"
                                  title="Inspect full event context"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600" />
                                  <span>Inspect</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {auditLogTotalPages > 1 && (
                  <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
                    <span className="text-xs text-slate-500 font-medium">
                      Showing {(auditLogPage - 1) * 50 + 1} – {Math.min(auditLogPage * 50, auditLogTotalCount)} of{" "}
                      <strong>{auditLogTotalCount.toLocaleString()}</strong> events
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={auditLogPage <= 1 || auditLogsLoading}
                        onClick={() => fetchAuditLogs(auditLogPage - 1)}
                        className="h-8 rounded-xl text-xs font-bold cursor-pointer border-slate-200"
                      >
                        ← Previous
                      </Button>
                      <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700">
                        {auditLogPage} / {auditLogTotalPages}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={auditLogPage >= auditLogTotalPages || auditLogsLoading}
                        onClick={() => fetchAuditLogs(auditLogPage + 1)}
                        className="h-8 rounded-xl text-xs font-bold cursor-pointer border-slate-200"
                      >
                        Next →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div
            className={`bg-white rounded-3xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
              isAddUserFullScreen
                ? "fixed inset-0 sm:inset-3 md:inset-5 rounded-2xl md:rounded-3xl"
                : "max-w-3xl w-full my-auto max-h-[92vh]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <span>Add New Tutor / Admin</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create a tutor or administrator account with custom regional settings and official credentials.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddUserFullScreen(!isAddUserFullScreen)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  title={isAddUserFullScreen ? "Exit Full Screen" : "Full Screen"}
                  aria-label={isAddUserFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                  {isAddUserFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700">Full Name</label>
                  <Input
                    required
                    placeholder="Enter full name"
                    value={formUserName}
                    onChange={(e) => setFormUserName(e.target.value)}
                    className="rounded-xl focus-visible:ring-blue-400 h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700">Email Address</label>
                  <Input
                    required
                    type="email"
                    placeholder="Enter email address"
                    value={formUserEmail}
                    onChange={(e) => setFormUserEmail(e.target.value)}
                    className="rounded-xl focus-visible:ring-blue-400 h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700">Role</label>
                  <select
                    value={formUserRole}
                    onChange={(e) => setFormUserRole(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="TUTOR">Tutor</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700">
                    Country of Residence
                  </label>
                  <CountrySelector
                    value={formUserCountry}
                    onChange={(countryName, countryObj) => {
                      setFormUserCountry(countryName);
                      if (countryObj?.dialCode) {
                        setFormUserCountryDial(countryObj.dialCode);
                      }
                      if (countryObj?.code) {
                        const matchedTz = getRegionalTimezone(countryObj.code);
                        if (matchedTz?.id) {
                          setFormUserTimezone(matchedTz.id);
                        }
                      }
                    }}
                    placeholder="Select tutor's country..."
                    inputClassName="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700">Contact Number</label>
                  <div className="flex items-center">
                    <select
                      value={formUserCountryDial}
                      onChange={(e) => setFormUserCountryDial(e.target.value)}
                      className="h-10 px-2.5 rounded-l-xl rounded-r-none border border-r-0 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-400 focus:z-10 shrink-0 cursor-pointer outline-none"
                    >
                      {COUNTRY_DIAL_CODES.map((c) => (
                        <option key={`${c.code}-${c.dial}`} value={c.dial}>
                          {c.flag} {c.dial} ({c.name})
                        </option>
                      ))}
                    </select>
                    <Input
                      type="tel"
                      placeholder="77 123 4567"
                      maxLength={14}
                      value={formUserPhone}
                      onChange={(e) =>
                        setFormUserPhone(
                          formatSubscriberPhone(e.target.value, (dial) => setFormUserCountryDial(dial))
                        )
                      }
                      className="rounded-l-none rounded-r-xl focus-visible:ring-blue-400 h-10 text-xs flex-1 font-mono tracking-wide"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700">Initial Password</label>
                  <div className="relative">
                    <Input
                      required
                      type={showUserPassword ? "text" : "password"}
                      placeholder="Enter initial password"
                      value={formUserPassword}
                      onChange={(e) => setFormUserPassword(e.target.value)}
                      className="rounded-xl focus-visible:ring-blue-400 h-10 text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
                      title={showUserPassword ? "Hide password" : "Show password"}
                      aria-label={showUserPassword ? "Hide password" : "Show password"}
                    >
                      {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1.5 text-slate-700">Academic Title / Headline</label>
                <Input placeholder="Academic title or specialization" value={formUserHeadline} onChange={(e) => setFormUserHeadline(e.target.value)} className="rounded-xl focus-visible:ring-blue-400 h-10 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold block text-slate-700">
                  Operating Regional Timezone
                  {formUserRole === "TUTOR" && (
                    <span className="text-blue-600 font-normal ml-1">
                      (Tutor availability & trial slots operate in this timezone)
                    </span>
                  )}
                </label>
                <RegionalTimezoneSelector
                  selectedTimezone={formUserTimezone}
                  onChange={(tz) => setFormUserTimezone(tz)}
                  compact={false}
                  showDualNotice={false}
                />
              </div>

              {(formUserRole === "TUTOR" || (formUserRole as any) === "INSTRUCTOR") && (
                <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/50 border border-blue-200/80 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-blue-100">
                    <div>
                      <label className="font-bold text-slate-900 text-sm block">
                        Tutor Teaching Levels & Official Hourly Rates
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Tick the syllabus level(s) this tutor is approved to teach. Only ticked levels will enable configuring their official hourly rate.
                      </p>
                    </div>
                    <span className="self-start sm:self-center text-[10px] text-blue-700 font-extrabold bg-blue-100/90 border border-blue-200 px-2.5 py-1 rounded-md shrink-0">
                      Admin Only
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border transition-all ${
                      formUserIsALTutor
                        ? "bg-white border-blue-300 shadow-sm ring-1 ring-blue-400/20"
                        : "bg-slate-50/80 border-slate-200 opacity-75"
                    }`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={formUserIsALTutor}
                            onChange={(e) => setFormUserIsALTutor(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">
                              London A/L Tutor
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Approved for London Advanced Level classes
                            </span>
                          </div>
                        </label>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          formUserIsALTutor ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                        }`}>
                          {formUserIsALTutor ? "Active A/L" : "Disabled"}
                        </span>
                      </div>

                      <div>
                        <label className="font-bold block mb-1 text-[11px] text-slate-700">
                          London A/L Hourly Rate (LKR / hr)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold font-mono">
                            LKR
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            disabled={!formUserIsALTutor}
                            placeholder={formUserIsALTutor ? "5000" : "A/L Tutoring Inactive"}
                            value={formUserHourlyRateAL}
                            onChange={(e) => setFormUserHourlyRateAL(e.target.value)}
                            className={`rounded-xl pl-11 font-mono text-xs ${
                              formUserIsALTutor
                                ? "bg-white focus-visible:ring-blue-400 text-slate-900"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                            }`}
                          />
                        </div>
                        {!formUserIsALTutor && (
                          <p className="text-[10px] text-amber-600 mt-1 font-medium">
                            Tick the box above to enable setting the London A/L hourly rate.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${
                      formUserIsOLTutor
                        ? "bg-white border-blue-300 shadow-sm ring-1 ring-blue-400/20"
                        : "bg-slate-50/80 border-slate-200 opacity-75"
                    }`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={formUserIsOLTutor}
                            onChange={(e) => setFormUserIsOLTutor(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">
                              London O/L (IGCSE) Tutor
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Approved for London Ordinary Level classes
                            </span>
                          </div>
                        </label>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          formUserIsOLTutor ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                        }`}>
                          {formUserIsOLTutor ? "Active O/L" : "Disabled"}
                        </span>
                      </div>

                      <div>
                        <label className="font-bold block mb-1 text-[11px] text-slate-700">
                          London O/L Hourly Rate (LKR / hr)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold font-mono">
                            LKR
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            disabled={!formUserIsOLTutor}
                            placeholder={formUserIsOLTutor ? "3500" : "O/L Tutoring Inactive"}
                            value={formUserHourlyRateOL}
                            onChange={(e) => setFormUserHourlyRateOL(e.target.value)}
                            className={`rounded-xl pl-11 font-mono text-xs ${
                              formUserIsOLTutor
                                ? "bg-white focus-visible:ring-blue-400 text-slate-900"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                            }`}
                          />
                        </div>
                        {!formUserIsOLTutor && (
                          <p className="text-[10px] text-amber-600 mt-1 font-medium">
                            Tick the box above to enable setting the London O/L hourly rate.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    💡 Tutors conducting both A/L and O/L classes will be credited according to the respective syllabus level.
                  </p>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddUserModal(false)} className="rounded-xl h-9 px-4 cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-9 px-5 cursor-pointer shadow-sm">
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserCreatedSuccessModal && createdUserSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 border border-slate-100 relative">
            <button
              type="button"
              onClick={() => {
                setShowUserCreatedSuccessModal(false);
                setCreatedUserSuccess(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-50">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">
                  {createdUserSuccess.role === "TUTOR"
                    ? "Tutor Account Created Successfully"
                    : "Account Created Successfully"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  The account is provisioned and ready for LMS operations.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-amber-900 text-xs">Verification Email Notice</div>
                <div className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  The verification email will be dispatched when the tutor logs in for the first time.
                </div>
              </div>
            </div>

            <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 text-[11px]">User Member</span>
                <span className="font-bold text-slate-800">{createdUserSuccess.name}</span>
              </div>

              {createdUserSuccess.country && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 text-[11px]">Country</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CountryFlag countryCode={findCountry(createdUserSuccess.country)?.code} flagEmoji={findCountry(createdUserSuccess.country)?.flag} size="xs" />
                    <span>{createdUserSuccess.country}</span>
                  </span>
                </div>
              )}

              {createdUserSuccess.tutorId && (
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 text-[11px] shrink-0">Official Tutor ID</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px] truncate">
                      {createdUserSuccess.tutorId}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdUserSuccess.tutorId || "");
                        setCopiedSuccessTutorId(true);
                        setTimeout(() => setCopiedSuccessTutorId(false), 2000);
                      }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer shrink-0"
                      title="Copy Tutor ID"
                    >
                      {copiedSuccessTutorId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {createdUserSuccess.adminId && (
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 text-[11px] shrink-0">Official Admin ID</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px] truncate">
                      {createdUserSuccess.adminId}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdUserSuccess.adminId || "");
                        setCopiedSuccessAdminId(true);
                        setTimeout(() => setCopiedSuccessAdminId(false), 2000);
                      }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer shrink-0"
                      title="Copy Admin ID"
                    >
                      {copiedSuccessAdminId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 text-[11px] shrink-0">Tutor Email</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] truncate">
                    {createdUserSuccess.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdUserSuccess.email);
                      setCopiedSuccessEmail(true);
                      setTimeout(() => setCopiedSuccessEmail(false), 2000);
                    }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer shrink-0"
                    title="Copy email"
                  >
                    {copiedSuccessEmail ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {createdUserSuccess.password && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 text-[11px] shrink-0">Initial Password</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                      {showSuccessPassword ? createdUserSuccess.password : "••••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSuccessPassword(!showSuccessPassword)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer"
                      title={showSuccessPassword ? "Hide password" : "Show password"}
                    >
                      {showSuccessPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdUserSuccess.password || "");
                        setCopiedSuccessPassword(true);
                        setTimeout(() => setCopiedSuccessPassword(false), 2000);
                      }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer"
                      title="Copy password"
                    >
                      {copiedSuccessPassword ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={() => {
                setShowUserCreatedSuccessModal(false);
                setCreatedUserSuccess(null);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 cursor-pointer shadow-md shadow-blue-500/20"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {showEditUserModal && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div
            className={`bg-white rounded-3xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
              isEditUserFullScreen
                ? "fixed inset-0 sm:inset-3 md:inset-5 rounded-2xl md:rounded-3xl"
                : "max-w-3xl w-full my-auto max-h-[92vh]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  <span>Edit User Details</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update personal profile, operating timezone, and teaching levels / rate limits for {selectedUserForEdit.name}.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditUserFullScreen(!isEditUserFullScreen)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  title={isEditUserFullScreen ? "Exit Full Screen" : "Full Screen"}
                  aria-label={isEditUserFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                  {isEditUserFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700">Full Name</label>
                  <Input required placeholder="Enter full name" value={formUserName} onChange={(e) => setFormUserName(e.target.value)} className="rounded-xl focus-visible:ring-blue-400 h-10 text-xs" />
                </div>
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700">Email Address</label>
                  <Input required type="email" placeholder="Enter email address" value={formUserEmail} onChange={(e) => setFormUserEmail(e.target.value)} className="rounded-xl focus-visible:ring-blue-400 h-10 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700">Role</label>
                  <select value={formUserRole} onChange={(e) => setFormUserRole(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-400">
                    <option value="STUDENT">Student</option>
                    <option value="TUTOR">Tutor</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700">Country of Residence</label>
                  <CountrySelector
                    value={formUserCountry}
                    onChange={(countryName, countryObj) => {
                      setFormUserCountry(countryName);
                      if (countryObj?.code) {
                        const matchedTz = getRegionalTimezone(countryObj.code);
                        if (matchedTz?.id && (!formUserTimezone || formUserTimezone === DEFAULT_TIMEZONE)) {
                          setFormUserTimezone(matchedTz.id);
                        }
                      }
                    }}
                    placeholder="Select country..."
                    inputClassName="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700">Contact Number</label>
                  <div className="flex items-center">
                    <select
                      value={formUserCountryDial}
                      onChange={(e) => setFormUserCountryDial(e.target.value)}
                      className="h-10 px-2.5 rounded-l-xl rounded-r-none border border-r-0 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-400 focus:z-10 shrink-0 cursor-pointer outline-none"
                    >
                      {COUNTRY_DIAL_CODES.map((c) => (
                        <option key={`${c.code}-${c.dial}`} value={c.dial}>
                          {c.flag} {c.dial} ({c.name})
                        </option>
                      ))}
                    </select>
                    <Input
                      type="tel"
                      placeholder="77 123 4567"
                      maxLength={14}
                      value={formUserPhone}
                      onChange={(e) =>
                        setFormUserPhone(
                          formatSubscriberPhone(e.target.value, (dial) => setFormUserCountryDial(dial))
                        )
                      }
                      className="rounded-l-none rounded-r-xl focus-visible:ring-blue-400 h-10 text-xs flex-1 font-mono tracking-wide"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700">Academic Title</label>
                  <Input placeholder="Academic title or specialization" value={formUserHeadline} onChange={(e) => setFormUserHeadline(e.target.value)} className="rounded-xl focus-visible:ring-blue-400 h-10 text-xs" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold block text-slate-700">
                  Operating Regional Timezone
                  {formUserRole === "TUTOR" && (
                    <span className="text-blue-600 font-normal ml-1">
                      (Tutor availability & trial slots operate in this timezone)
                    </span>
                  )}
                </label>
                <RegionalTimezoneSelector
                  selectedTimezone={formUserTimezone}
                  onChange={(tz) => setFormUserTimezone(tz)}
                  compact={false}
                  showDualNotice={false}
                />
              </div>

              {(formUserRole === "TUTOR" || (formUserRole as any) === "INSTRUCTOR") && (
                <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/50 border border-blue-200/80 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-blue-100">
                    <div>
                      <label className="font-bold text-slate-900 text-sm block">
                        Tutor Teaching Levels & Official Hourly Rates
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Tick the syllabus level(s) this tutor is approved to teach. Only ticked levels will enable configuring their official hourly rate.
                      </p>
                    </div>
                    <span className="self-start sm:self-center text-[10px] text-blue-700 font-extrabold bg-blue-100/90 border border-blue-200 px-2.5 py-1 rounded-md shrink-0">
                      Admin Only
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border transition-all ${
                      formUserIsALTutor
                        ? "bg-white border-blue-300 shadow-sm ring-1 ring-blue-400/20"
                        : "bg-slate-50/80 border-slate-200 opacity-75"
                    }`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={formUserIsALTutor}
                            onChange={(e) => setFormUserIsALTutor(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">
                              London A/L Tutor
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Approved for London Advanced Level classes
                            </span>
                          </div>
                        </label>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          formUserIsALTutor ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                        }`}>
                          {formUserIsALTutor ? "Active A/L" : "Disabled"}
                        </span>
                      </div>

                      <div>
                        <label className="font-bold block mb-1 text-[11px] text-slate-700">
                          London A/L Hourly Rate (LKR / hr)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold font-mono">
                            LKR
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            disabled={!formUserIsALTutor}
                            placeholder={formUserIsALTutor ? "5000" : "A/L Tutoring Inactive"}
                            value={formUserHourlyRateAL}
                            onChange={(e) => setFormUserHourlyRateAL(e.target.value)}
                            className={`rounded-xl pl-11 font-mono text-xs ${
                              formUserIsALTutor
                                ? "bg-white focus-visible:ring-blue-400 text-slate-900"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                            }`}
                          />
                        </div>
                        {!formUserIsALTutor && (
                          <p className="text-[10px] text-amber-600 mt-1 font-medium">
                            Tick the box above to enable setting the London A/L hourly rate.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${
                      formUserIsOLTutor
                        ? "bg-white border-blue-300 shadow-sm ring-1 ring-blue-400/20"
                        : "bg-slate-50/80 border-slate-200 opacity-75"
                    }`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={formUserIsOLTutor}
                            onChange={(e) => setFormUserIsOLTutor(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">
                              London O/L (IGCSE) Tutor
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Approved for London Ordinary Level classes
                            </span>
                          </div>
                        </label>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          formUserIsOLTutor ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                        }`}>
                          {formUserIsOLTutor ? "Active O/L" : "Disabled"}
                        </span>
                      </div>

                      <div>
                        <label className="font-bold block mb-1 text-[11px] text-slate-700">
                          London O/L Hourly Rate (LKR / hr)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold font-mono">
                            LKR
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            disabled={!formUserIsOLTutor}
                            placeholder={formUserIsOLTutor ? "3500" : "O/L Tutoring Inactive"}
                            value={formUserHourlyRateOL}
                            onChange={(e) => setFormUserHourlyRateOL(e.target.value)}
                            className={`rounded-xl pl-11 font-mono text-xs ${
                              formUserIsOLTutor
                                ? "bg-white focus-visible:ring-blue-400 text-slate-900"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                            }`}
                          />
                        </div>
                        {!formUserIsOLTutor && (
                          <p className="text-[10px] text-amber-600 mt-1 font-medium">
                            Tick the box above to enable setting the London O/L hourly rate.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    💡 Tutors conducting both A/L and O/L classes will be credited according to the respective syllabus level.
                  </p>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEditUserModal(false)} className="rounded-xl h-9 px-4 cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-9 px-5 cursor-pointer shadow-sm">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEnrollUserModal && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Manage Course Enrollments</h3>
                <p className="text-xs text-slate-500">{selectedUserForEdit.name} ({selectedUserForEdit.email})</p>
              </div>
              <button onClick={() => setShowEnrollUserModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-xs text-slate-700 block">
                Current Active Enrollments ({selectedUserForEdit.enrollments?.length || 0})
              </label>

              {selectedUserForEdit.enrollments && selectedUserForEdit.enrollments.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedUserForEdit.enrollments.map((enr: any) => {
                    const matchedCourse = coursesList.find((c) => c.id === enr.courseId) || enr.course;
                    return (
                      <div
                        key={enr.id || enr.courseId}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {matchedCourse?.title || "Enrolled Class"}
                          </div>
                          {matchedCourse?.subjectCode && (
                            <span className="text-[10px] font-mono text-blue-600">
                              {matchedCourse.subjectCode}
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnenrollUser(selectedUserForEdit.id, enr.courseId, enr.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-bold text-xs h-7 rounded-lg shrink-0 cursor-pointer"
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs italic text-center">
                  This student is not currently enrolled in any classes.
                </div>
              )}
            </div>

            <form onSubmit={handleEnrollUserSubmit} className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="font-bold block mb-1">Enroll in Additional Class</label>
                <select
                  value={selectedCourseToEnroll}
                  onChange={(e) => setSelectedCourseToEnroll(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-semibold"
                >
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.subjectCode || c.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEnrollUserModal(false)} className="rounded-xl cursor-pointer">Done</Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer">
                  + Enroll Student
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Create New Individual Class</h3>
              <button onClick={() => setShowAddCourseModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Individual Class Title</label>
                <Input required placeholder="Enter class title" value={courseFormTitle} onChange={(e) => setCourseFormTitle(e.target.value)} className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Subject Code</label>
                  <Input placeholder="Subject code" value={courseFormCode} onChange={(e) => setCourseFormCode(e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Tokens Required (Tokens)</label>
                  <Input type="text" inputMode="numeric" required placeholder="10" value={courseFormPrice} onChange={(e) => setCourseFormPrice(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Academic Subject / Category</label>
                <select value={courseFormCategory} onChange={(e) => setCourseFormCategory(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                  {schoolsList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
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
                  <label className="font-bold block mb-1">Lead Tutor</label>
                  <select value={courseFormInstructorId} onChange={(e) => setCourseFormInstructorId(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                    {tutorList.map((f) => (
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
                <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl cursor-pointer">Create Individual Class</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditCourseModal && selectedCourseForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Edit Individual Class Details</h3>
              <button onClick={() => setShowEditCourseModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleUpdateCourse} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Individual Class Title</label>
                <Input required value={courseFormTitle} onChange={(e) => setCourseFormTitle(e.target.value)} className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Subject Code</label>
                  <Input value={courseFormCode} onChange={(e) => setCourseFormCode(e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Tokens Required (Tokens)</label>
                  <Input type="text" inputMode="numeric" required placeholder="10" value={courseFormPrice} onChange={(e) => setCourseFormPrice(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Academic Subject / Category</label>
                <select value={courseFormCategory} onChange={(e) => setCourseFormCategory(e.target.value)} className="w-full h-9 rounded-xl border border-slate-200 px-2 bg-white text-xs">
                  {schoolsList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
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

            <form onSubmit={handleAddModule} className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 flex gap-2">
              <Input
                required
                placeholder="Enter new module title..."
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                className="bg-white text-xs rounded-xl"
              />
              <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer">
                + Add Module
              </Button>
            </form>

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
                          type="text"
                          inputMode="numeric"
                          placeholder="Mins"
                          value={newLessonDuration}
                          onChange={(e) => setNewLessonDuration(e.target.value)}
                          className="bg-white text-xs h-8 w-16 rounded-lg font-mono"
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

      {showManageMaterialsModal && selectedCourseForMaterials && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedCourseForMaterials.subjectCode || "COURSE-FILE-HUB"}
                  </span>
                  <h3 className="font-bold text-base text-slate-900">
                    Class Files & Study Materials
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

            <form
              onSubmit={handleUploadCourseMaterial}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  Upload Class Study Material
                </span>
                <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Academy Resource Repository
                </span>
              </div>

              {materialStatusMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    materialStatusMsg.type === "success"
                      ? "bg-blue-50 text-blue-800 border border-blue-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {materialStatusMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
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
                    placeholder="Enter document title"
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
                    <option value="PRACTICE_SET">Practice Handbook & Solutions</option>
                    <option value="LAB_GUIDE">Practical Lab Guide</option>
                    <option value="SLIDES">Class Slides</option>
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
                      <span>Publish to Class Files</span>
                    </>
                  )}
                </Button>
              </div>
            </form>

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
                    Use the form above to attach class slides, formula booklets, handouts, and problem sets to this syllabus unit.
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

      {rejectionModalData.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shadow-xs">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Decline & Request Revisions</h3>
                  <p className="text-[11px] text-slate-500">Provide feedback reason to the tutor</p>
                </div>
              </div>
              <button
                onClick={() => setRejectionModalData((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3.5 text-xs">
              <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl space-y-0.5">
                <div className="font-bold text-red-950 text-xs">{rejectionModalData.title}</div>
                {rejectionModalData.tutorName && (
                  <div className="text-[11px] text-red-700">Tutor: {rejectionModalData.tutorName}</div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Reason for Declining / Revision Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Reason for declining or revision notes..."
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectionModalData((prev) => ({ ...prev, isOpen: false }))}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingReject || !rejectionReasonInput.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer gap-1.5"
                >
                  {isSubmittingReject ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Confirm Decline</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {AUDIT_ACTION_CONFIG[selectedLogForModal.action]?.label || selectedLogForModal.action}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recorded event details and payload parameters
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedLogForModal(null);
                  setCopiedLogJson(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Administrator
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {selectedLogForModal.adminEmail}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  ID: {selectedLogForModal.adminId}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  IP: {selectedLogForModal.ipAddress || "Internal / Local"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Target Entity
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {selectedLogForModal.targetLabel || "—"}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  Target ID: {selectedLogForModal.targetId || "—"}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold">
                  Category: {selectedLogForModal.category}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Action Code
                </div>
                <code className="text-xs font-bold text-blue-700 font-mono block truncate">
                  {selectedLogForModal.action}
                </code>
                <div className="text-[10px] text-slate-500">
                  Event ID: <span className="font-mono">{selectedLogForModal.id}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Timestamp
                </div>
                <div className="text-xs font-bold text-slate-900">
                  {new Date(selectedLogForModal.createdAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  ISO: {selectedLogForModal.createdAt}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Recorded Payload & Parameters
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const jsonStr = JSON.stringify(selectedLogForModal.details || {}, null, 2);
                    navigator.clipboard.writeText(jsonStr);
                    setCopiedLogJson(true);
                    setTimeout(() => setCopiedLogJson(false), 2000);
                  }}
                  className="h-7 text-[11px] rounded-lg border-slate-200 gap-1.5 cursor-pointer"
                >
                  {copiedLogJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-blue-700 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-60 border border-slate-800 shadow-inner">
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(selectedLogForModal.details || { message: "No extra payload recorded for this operation" }, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <Button
                size="sm"
                onClick={() => {
                  setSelectedLogForModal(null);
                  setCopiedLogJson(false);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl px-5 h-9 cursor-pointer"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAddSchoolModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Add Academic Subject</h3>
                  <p className="text-[11px] text-slate-500">Creates a new academic subject and homepage filter pill</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddSchoolModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {schoolActionMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  schoolActionMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {schoolActionMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{schoolActionMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateSchool} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold block mb-1 text-slate-700">
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Subject name"
                  value={schoolFormName}
                  onChange={(e) => setSchoolFormName(e.target.value)}
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700">
                  Academic Focus & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Academic focus and description"
                  value={schoolFormDesc}
                  onChange={(e) => setSchoolFormDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="font-bold text-slate-900">Live on Public Homepage</div>
                  <div className="text-[11px] text-slate-500">
                    Display as a category pill in the filter bar
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={schoolFormActive}
                  onChange={(e) => setSchoolFormActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddSchoolModal(false)}
                  className="rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingSchool}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer font-bold gap-1.5"
                >
                  {isSavingSchool ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create Subject</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditSchoolModal && selectedSchoolForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Edit Academic Subject</h3>
                  <p className="text-[11px] text-slate-500">Update subject details and homepage visibility</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditSchoolModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {schoolActionMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  schoolActionMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {schoolActionMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{schoolActionMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSchool} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold block mb-1 text-slate-700">
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={schoolFormName}
                  onChange={(e) => setSchoolFormName(e.target.value)}
                  className="rounded-xl border-slate-200"
                />
                {schoolFormName.trim() !== selectedSchoolForEdit.name && (selectedSchoolForEdit.classCount || 0) > 0 && (
                  <p className="text-[11px] text-blue-600 mt-1.5 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Renaming will automatically re-categorize all {selectedSchoolForEdit.classCount} currently assigned classes.
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700">
                  Academic Focus & Description
                </label>
                <textarea
                  rows={3}
                  value={schoolFormDesc}
                  onChange={(e) => setSchoolFormDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="font-bold text-slate-900">Live on Public Homepage</div>
                  <div className="text-[11px] text-slate-500">
                    Display as a category pill in the filter bar
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={schoolFormActive}
                  onChange={(e) => setSchoolFormActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditSchoolModal(false)}
                  className="rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingSchool}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer font-bold gap-1.5"
                >
                  {isSavingSchool ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteSchoolModal && selectedSchoolForDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Delete Academic Subject</h3>
                  <p className="text-[11px] text-slate-500">Remove subject from academy</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteSchoolModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {schoolActionMsg && (
              <div className="p-3 rounded-xl text-xs flex items-center gap-2 bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{schoolActionMsg.text}</span>
              </div>
            )}

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Are you sure you want to remove <span className="font-bold text-slate-900">"{selectedSchoolForDelete.name}"</span>?
              </p>

              {(selectedSchoolForDelete.classCount || 0) > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Active Classes Detected ({selectedSchoolForDelete.classCount})</span>
                  </div>
                  <p className="text-[11px]">
                    Select a target subject to reassign these {selectedSchoolForDelete.classCount} classes to:
                  </p>
                  <select
                    value={deleteReassignTarget}
                    onChange={(e) => setDeleteReassignTarget(e.target.value)}
                    className="w-full h-9 rounded-xl border border-amber-300 bg-white px-2 text-xs font-semibold"
                  >
                    {schoolsList
                      .filter((s) => s.id !== selectedSchoolForDelete.id)
                      .map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteSchoolModal(false)}
                className="rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSavingSchool || ((selectedSchoolForDelete.classCount || 0) > 0 && !deleteReassignTarget)}
                onClick={handleDeleteSchool}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer font-bold gap-1.5"
              >
                {isSavingSchool ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Subject</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {showBundleEditorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Token & Pricing Packages Manager</h3>
                  <p className="text-xs text-slate-500">
                    Configure package pricing, hours, bulleted inclusions, and marketing copy for students
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBundleEditorModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bundleSaveMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in ${
                  bundleSaveMsg.type === "success"
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {bundleSaveMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-semibold">{bundleSaveMsg.text}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
              {editingBundles.map((b, idx) => (
                <button
                  key={b.id || idx}
                  type="button"
                  onClick={() => setSelectedBundleIndex(idx)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    selectedBundleIndex === idx
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {b.popular && <span>⭐</span>}
                  <span>{b.name || `Package #${idx + 1}`}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={handleAddNewBundle}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Pack</span>
              </button>
            </div>

            {editingBundles[selectedBundleIndex] && (() => {
              const curBundle = editingBundles[selectedBundleIndex];
              return (
                <form onSubmit={handleSaveBundles} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7 space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-xs font-bold text-slate-700">Most Popular / Featured Card</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingBundles.map((b, i) => ({
                                ...b,
                                popular: i === selectedBundleIndex ? !b.popular : false,
                              }));
                              setEditingBundles(updated);
                            }}
                            className={`w-10 h-5 rounded-full relative transition-colors ${curBundle.popular ? "bg-blue-600" : "bg-slate-300"}`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${curBundle.popular ? "translate-x-5" : "translate-x-0.5"}`}
                            />
                          </button>
                        </label>

                        {editingBundles.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBundle(selectedBundleIndex)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold h-8 px-2 gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Pack</span>
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="font-bold text-slate-700 text-xs block mb-1">Package Name <span className="text-red-500">*</span></label>
                          <Input
                            required
                            value={curBundle.name}
                            onChange={(e) => {
                              const updated = [...editingBundles];
                              updated[selectedBundleIndex] = { ...curBundle, name: e.target.value };
                              setEditingBundles(updated);
                            }}
                            className="h-9 text-xs rounded-xl"
                            placeholder="Package title"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 text-xs block mb-1">Header / Role Target</label>
                          <Input
                            value={curBundle.roleTarget || ""}
                            onChange={(e) => {
                              const updated = [...editingBundles];
                              updated[selectedBundleIndex] = { ...curBundle, roleTarget: e.target.value };
                              setEditingBundles(updated);
                            }}
                            className="h-9 text-xs rounded-xl"
                            placeholder="Package subtitle / role target"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 text-xs block mb-1">Badge Text</label>
                          <Input
                            value={curBundle.badge || ""}
                            onChange={(e) => {
                              const updated = [...editingBundles];
                              updated[selectedBundleIndex] = { ...curBundle, badge: e.target.value };
                              setEditingBundles(updated);
                            }}
                            className="h-9 text-xs rounded-xl"
                            placeholder="Badge text (optional)"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 text-xs block mb-1">Hours / Credit Tokens <span className="text-red-500">*</span></label>
                          <Input
                            required
                            type="number"
                            min="1"
                            max="999"
                            value={curBundle.hours}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 1;
                              const updated = [...editingBundles];
                              updated[selectedBundleIndex] = { ...curBundle, hours: val, tokens: val };
                              setEditingBundles(updated);
                            }}
                            className="h-9 text-xs rounded-xl font-mono"
                            placeholder="16"
                          />
                        </div>

                        <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                              <h5 className="text-xs font-black text-blue-950 uppercase tracking-wider">
                                London A/L (IAL) Rates
                              </h5>
                            </div>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                              Standard Candidate Tier
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="font-bold text-slate-700 text-xs block mb-1">
                                A/L Price (USD) <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                                <Input
                                  required
                                  type="number"
                                  min="1"
                                  step="0.01"
                                  value={curBundle.price}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = [...editingBundles];
                                    updated[selectedBundleIndex] = { ...curBundle, price: val };
                                    setEditingBundles(updated);
                                  }}
                                  className="pl-7 h-9 text-xs rounded-xl font-mono bg-white"
                                  placeholder="58"
                                />
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                ≈ ${curBundle.hours > 0 ? (curBundle.price / curBundle.hours).toFixed(2) : "0.00"}/hr
                              </div>
                            </div>
                            <div>
                              <label className="font-bold text-slate-700 text-xs block mb-1">
                                A/L Price (LKR) <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">LKR</span>
                                <Input
                                  required
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={curBundle.lkrPrice}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = [...editingBundles];
                                    updated[selectedBundleIndex] = { ...curBundle, lkrPrice: val };
                                    setEditingBundles(updated);
                                  }}
                                  className="pl-12 h-9 text-xs rounded-xl font-mono bg-white"
                                  placeholder="17400"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                London O/L (IGCSE) Rates
                              </h5>
                            </div>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                              Tailored O/L Student Tier
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="font-bold text-slate-700 text-xs block mb-1">
                                O/L Price (USD) <span className="text-slate-400 font-normal">(optional, falls back to A/L)</span>
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={curBundle.olPrice ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                    const updated = [...editingBundles];
                                    updated[selectedBundleIndex] = { ...curBundle, olPrice: val };
                                    setEditingBundles(updated);
                                  }}
                                  className="pl-7 h-9 text-xs rounded-xl font-mono bg-white"
                                  placeholder="44"
                                />
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                ≈ ${(curBundle.olPrice ? curBundle.olPrice / curBundle.hours : curBundle.price / curBundle.hours).toFixed(2)}/hr
                              </div>
                            </div>
                            <div>
                              <label className="font-bold text-slate-700 text-xs block mb-1">
                                O/L Price (LKR) <span className="text-slate-400 font-normal">(optional, falls back to A/L)</span>
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">LKR</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={curBundle.olLkrPrice ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                    const updated = [...editingBundles];
                                    updated[selectedBundleIndex] = { ...curBundle, olLkrPrice: val };
                                    setEditingBundles(updated);
                                  }}
                                  className="pl-12 h-9 text-xs rounded-xl font-mono bg-white"
                                  placeholder="13200"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="font-bold text-slate-700 text-xs block mb-1">Button CTA Text</label>
                          <Input
                            value={curBundle.ctaText || ""}
                            onChange={(e) => {
                              const updated = [...editingBundles];
                              updated[selectedBundleIndex] = { ...curBundle, ctaText: e.target.value };
                              setEditingBundles(updated);
                            }}
                            className="h-9 text-xs rounded-xl"
                            placeholder="Button CTA text"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="font-bold text-slate-700 text-xs block mb-1">Description</label>
                          <textarea
                            rows={2}
                            value={curBundle.description}
                            onChange={(e) => {
                              const updated = [...editingBundles];
                              updated[selectedBundleIndex] = { ...curBundle, description: e.target.value };
                              setEditingBundles(updated);
                            }}
                            className="w-full text-xs rounded-xl border border-slate-200 p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Short description shown to students"
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-3 border-t border-slate-100">
                        <label className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Included in this plan ({curBundle.features?.length || 0} Perks)</span>
                        </label>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {(curBundle.features || []).map((feature, fIdx) => (
                            <div key={fIdx} className="flex items-center gap-2">
                              <span className="text-blue-600 shrink-0 text-xs font-bold">✓</span>
                              <Input
                                value={feature}
                                onChange={(e) => handleUpdateFeatureInBundle(selectedBundleIndex, fIdx, e.target.value)}
                                className="h-8 text-xs rounded-lg flex-1"
                                placeholder="Perk description"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveFeatureFromBundle(selectedBundleIndex, fIdx)}
                                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                                title="Delete perk"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Input
                            value={newFeatureInput}
                            onChange={(e) => setNewFeatureInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddFeatureToBundle(selectedBundleIndex);
                              }
                            }}
                            placeholder="Add another perk / feature bullet point..."
                            className="h-8 text-xs rounded-lg flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddFeatureToBundle(selectedBundleIndex)}
                            className="h-8 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg cursor-pointer"
                          >
                            + Add Perk
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center justify-between">
                          <span>Live Card Preview</span>
                          {curBundle.popular && <span className="text-blue-600 font-bold">⭐ Featured</span>}
                        </div>

                        <div
                          className={`rounded-2xl p-5 bg-white border transition-all ${
                            curBundle.popular
                              ? "border-blue-600 shadow-md ring-1 ring-blue-500/20"
                              : "border-slate-200 shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                              {curBundle.roleTarget || `${curBundle.tokens} Tokens (${curBundle.hours} Hours Tutoring)`}
                            </span>
                            {curBundle.badge && (
                              <Badge variant={curBundle.popular ? "default" : "secondary"} className="text-[9px] font-bold">
                                {curBundle.badge}
                              </Badge>
                            )}
                          </div>

                          <h4 className="text-base font-black text-slate-900 mb-1">
                            {curBundle.name || "Package Name"}
                          </h4>

                          <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">
                            {curBundle.description || "Package description..."}
                          </p>

                          <div className="flex items-baseline gap-1 mb-3 pb-3 border-b border-slate-100">
                            <span className="text-2xl font-black text-slate-900">${curBundle.price}</span>
                            <span className="text-[10px] text-slate-500">/ package (one-time)</span>
                          </div>

                          <div className="space-y-1.5 mb-4">
                            <div className="text-[10px] font-bold text-slate-700 uppercase">Included in this plan:</div>
                            {(curBundle.features || []).slice(0, 5).map((f, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{f}</span>
                              </div>
                            ))}
                            {(curBundle.features?.length || 0) > 5 && (
                              <div className="text-[10px] text-slate-400 italic">
                                + {curBundle.features.length - 5} more perks...
                              </div>
                            )}
                          </div>

                          <div
                            className={`w-full text-xs font-bold h-9 rounded-xl flex items-center justify-center gap-1.5 ${
                              curBundle.popular ? "bg-blue-600 text-white" : "border border-blue-200 text-slate-700 bg-blue-50/50"
                            }`}
                          >
                            <span>{curBundle.ctaText || `Get ${curBundle.hours} Hours Pack`}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 text-center pt-3">
                        Updates live as you type. Click "Save All Changes" to publish.
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetBundlesToDefault}
                      className="rounded-xl text-xs text-slate-600 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>Reset Academy Defaults</span>
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBundleEditorModal(false)}
                        className="rounded-xl text-xs cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isSavingBundles}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs shadow-blue-600/20 cursor-pointer gap-1.5 h-9 px-4"
                      >
                        {isSavingBundles ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Packages...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Save All Changes</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {showGrantTokensModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Grant Free Learning Credit
                  </h3>
                  <p className="text-xs text-slate-500">
                    Allocate free tokens/learning hours directly to student wallets
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGrantTokensModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {grantFeedbackMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in ${
                  grantFeedbackMsg.type === "success"
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {grantFeedbackMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span className="font-medium">{grantFeedbackMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleGrantTokens} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Select Student <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedStudentForTokens?.id || ""}
                  onChange={(e) => {
                    const found = allUsersList.find((u) => u.id === e.target.value);
                    setSelectedStudentForTokens(found || null);
                  }}
                  required
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="" disabled>Choose a student...</option>
                  {allUsersList
                    .filter((u) => u.role === "STUDENT")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email}) — Current Balance: {s.tokenWallet?.balance ?? 0} Hrs
                      </option>
                    ))}
                </select>
              </div>

              {selectedStudentForTokens && (
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-9 h-9 ring-1 ring-blue-300 shrink-0">
                      <AvatarImage src={selectedStudentForTokens.avatar || undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-900 font-bold text-xs">
                        {selectedStudentForTokens.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {selectedStudentForTokens.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {selectedStudentForTokens.email}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                      Current Wallet
                    </span>
                    <span className="font-mono text-sm font-black text-blue-950">
                      {selectedStudentForTokens.tokenWallet?.balance ?? 0} Hours
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Allocation Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGrantTokensMode("ADD")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      grantTokensMode === "ADD"
                        ? "bg-[#0c2461] text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add / Grant Free Hours</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrantTokensMode("SET")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      grantTokensMode === "SET"
                        ? "bg-[#0c2461] text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Set Exact Balance</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Quick Amount Presets (Hours / Tokens)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { amount: 2, label: "+2 Hrs (Trial)" },
                    { amount: 6, label: "+6 Hrs (Starter)" },
                    { amount: 10, label: "+10 Hrs" },
                    { amount: 16, label: "+16 Hrs (Bundle)" },
                    { amount: 24, label: "+24 Hrs (Vault)" },
                  ].map((preset) => (
                    <button
                      key={preset.amount}
                      type="button"
                      onClick={() => setGrantTokensAmount(preset.amount)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        grantTokensAmount === preset.amount
                          ? "bg-[#0c2461] text-white ring-2 ring-blue-400/40 shadow-xs"
                          : "bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/80"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Credit Amount (Hours / Tokens) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    required
                    placeholder="Enter number of hours"
                    value={grantTokensAmount}
                    onChange={(e) => setGrantTokensAmount(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="pl-9 h-10 text-xs rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Reason / Administrative Note <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1.5">
                  <Input
                    required
                    placeholder="Reason or administrative note"
                    value={grantTokensReason}
                    onChange={(e) => setGrantTokensReason(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[
                      "Free Trial Consultation Grant",
                      "Academic Scholarship & Financial Aid",
                      "Welcome Promotional Gift",
                      "Session Rescheduling Compensation",
                    ].map((reasonChip) => (
                      <button
                        key={reasonChip}
                        type="button"
                        onClick={() => setGrantTokensReason(reasonChip)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium cursor-pointer transition-colors"
                      >
                        {reasonChip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {selectedStudentForTokens && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Updated Wallet Balance:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                    <span className="text-slate-400">{selectedStudentForTokens.tokenWallet?.balance ?? 0} Hrs</span>
                    <span className="text-blue-600 font-bold">&rarr;</span>
                    <span className="text-blue-700 font-black text-sm">
                      {grantTokensMode === "ADD"
                        ? (selectedStudentForTokens.tokenWallet?.balance ?? 0) + grantTokensAmount
                        : grantTokensAmount}{" "}
                      Hours
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGrantTokensModal(false)}
                  className="rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isGrantingTokens || !selectedStudentForTokens || grantTokensAmount <= 0}
                  className="bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs rounded-xl shadow-xs shadow-blue-900/20 cursor-pointer gap-1.5 h-9 px-4"
                >
                  {isGrantingTokens ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Crediting Student...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-3.5 h-3.5" />
                      <span>Grant Free Credit</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStudentTrialsModal && selectedStudentForTrials && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shadow-xs shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>Manage Free Trials: {selectedStudentForTrials.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedStudentForTrials.email} • Reset trial bookings so the student can re-request the same tutor
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowStudentTrialsModal(false);
                  setSelectedStudentForTrials(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quota & Reset All Bar */}
            {(() => {
              const activeTrials = trialsForSelectedStudent.filter(
                (t: any) => t.status !== "CANCELLED" && t.status !== "REJECTED"
              );
              return (
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-purple-950 flex items-center gap-2">
                      <span>Active Free Trials: {activeTrials.length} / 5 Max</span>
                      <span className="text-slate-400 font-normal">•</span>
                      <span className="text-purple-700 font-normal">
                        {Math.max(0, 5 - activeTrials.length)} slot{5 - activeTrials.length === 1 ? "" : "s"} remaining
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800/80">
                      Resetting a trial cancels the previous booking lock, immediately allowing the student to request that same tutor again.
                    </p>
                  </div>
                  {activeTrials.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleResetAllStudentTrials(selectedStudentForTrials.id, selectedStudentForTrials.name)}
                      disabled={isResettingAllTrials}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl h-8.5 px-3.5 gap-1.5 shrink-0 cursor-pointer shadow-xs"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isResettingAllTrials ? "animate-spin" : ""}`} />
                      <span>{isResettingAllTrials ? "Resetting All..." : "Reset All Trials"}</span>
                    </Button>
                  )}
                </div>
              );
            })()}

            {/* Trials List */}
            <div className="space-y-3">
              {trialsForSelectedStudent.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                  No trial session bookings found for this student.
                </div>
              ) : (
                [...trialsForSelectedStudent]
                  .sort((a: any, b: any) => new Date(b.createdAt || b.preferredDate || 0).getTime() - new Date(a.createdAt || a.preferredDate || 0).getTime())
                  .map((tr: any) => {
                  const tutorName = tr.tutor?.name || tr.course?.tutor?.name || "Assigned Tutor";
                  const isReset = tr.status === "CANCELLED";
                  const isRejected = tr.status === "REJECTED";
                  const isLive = tr.status === "LIVE";
                  const isConfirmed = tr.status === "CONFIRMED";
                  const isPending = tr.status === "PENDING" || tr.status === "PENDING_APPROVAL";
                  const isCompleted = tr.status === "COMPLETED";

                  return (
                    <div
                      key={tr.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isReset
                          ? "bg-slate-50/70 border-slate-200 opacity-80"
                          : isLive
                          ? "bg-red-50/40 border-red-200"
                          : isConfirmed
                          ? "bg-emerald-50/40 border-emerald-200"
                          : "bg-white border-slate-200 hover:border-purple-200"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10 rounded-xl ring-1 ring-slate-200 shrink-0">
                            <AvatarImage src={tr.tutor?.avatar} />
                            <AvatarFallback>{tutorName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900">{tutorName}</span>
                              {tr.course?.subjectCode && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                                  {tr.course.subjectCode}
                                </span>
                              )}
                              {isReset ? (
                                <Badge className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold">
                                  ✓ Reset / Re-request Allowed
                                </Badge>
                              ) : isLive ? (
                                <Badge className="bg-red-600 text-white text-[10px] font-bold animate-pulse">
                                  ● Live Now
                                </Badge>
                              ) : isConfirmed ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                  Confirmed
                                </Badge>
                              ) : isPending ? (
                                <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold">
                                  Pending Review
                                </Badge>
                              ) : isCompleted ? (
                                <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                                  Completed
                                </Badge>
                              ) : isRejected ? (
                                <Badge className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold">
                                  Declined
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-600">
                              Course: <strong>{tr.course?.title || "London A/L"}</strong>
                              {tr.topic ? ` • Topic: ${tr.topic}` : ""}
                            </p>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                {formatDateInTimezone(tr.preferredDate, adminTimezone, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })} • {formatTimeInTimezone(tr.preferredDate, adminTimezone, { includeAbbr: true })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                          {isCompleted && (
                            <>
                              {tr.recordingUrl && (
                                <>
                                  <a
                                    href={tr.recordingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="h-8 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-2xs transition-all"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Watch</span>
                                  </a>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAdminDeleteRecording({ trialId: tr.id, title: `1-on-1 Trial: ${tr.studentName || "Student"}` })}
                                    disabled={isDeletingRecording === tr.id}
                                    className="h-8 px-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all"
                                    title="Delete BigBlueButton recording (Admin Only)"
                                  >
                                    {isDeletingRecording === tr.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin text-red-600" />
                                    ) : (
                                      <Trash2 className="w-3 h-3 text-red-600" />
                                    )}
                                    <span>Delete</span>
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAnalyticsModal({ trialId: tr.id, title: `1-on-1 Trial: ${tr.studentName || "Student"}` })}
                                className="h-8 px-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center gap-1 cursor-pointer shadow-2xs transition-all"
                                title="View BigBlueButton Learning Analytics Dashboard"
                              >
                                <BarChart3 className="w-3 h-3 text-blue-600" />
                                <span>Analytics</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRecordingModal({ trialId: tr.id, title: `1-on-1 Trial: ${tr.studentName || "Student"}`, currentUrl: tr.recordingUrl })}
                                className="h-8 px-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                                title="Attach or edit recording link"
                              >
                                <Video className="w-3 h-3 text-purple-600" />
                                <span>{tr.recordingUrl ? "Edit Link" : "Attach Recording"}</span>
                              </Button>
                            </>
                          )}
                          {!isReset && !isRejected ? (
                            <Button
                              size="sm"
                              onClick={() => handleResetTrial(tr.id, tutorName)}
                              disabled={isResettingTrialId === tr.id}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl h-8 px-3 gap-1.5 cursor-pointer shadow-2xs"
                              title="Reset this trial so the student can request this tutor again"
                            >
                              <RotateCcw className={`w-3 h-3 ${isResettingTrialId === tr.id ? "animate-spin" : ""}`} />
                              <span>{isResettingTrialId === tr.id ? "Resetting..." : "Reset Trial (Allow Re-request)"}</span>
                            </Button>
                          ) : isReset ? (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                              ✓ Unlocked: Can Re-book
                            </span>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleDeleteTrial(tr.id)}
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 inline-flex items-center justify-center cursor-pointer transition-colors"
                            title="Permanently Delete Trial Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {tr.notes && (
                        <div className="text-[11px] text-slate-500 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                          <strong>Notes:</strong> {tr.notes}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowStudentTrialsModal(false);
                  setSelectedStudentForTrials(null);
                }}
                className="text-xs font-bold rounded-xl h-9 px-4 cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showClearDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-slate-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                    Irreversible Operation
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Clear All Platform Data
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reset the LMS database to empty state while preserving administrator login access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isClearingAllData && setShowClearDataModal(false)}
                disabled={isClearingAllData}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {clearDataSuccessMsg ? (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                  <span className="font-semibold">{clearDataSuccessMsg}</span>
                </div>
              ) : (
                <>
                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-slate-600" />
                        <span>This will permanently delete:</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-700">
                        <li>All student accounts, tutors, and profiles</li>
                        <li>All individual class courses, modules, lessons & materials</li>
                        <li>All course enrollments, student progress & certificates</li>
                        <li>All live classroom events, schedules & bookings</li>
                        <li>All 1-on-1 trial consultation requests</li>
                        <li>All end-to-end encrypted chat messages</li>
                        <li>All student token wallets & credit transaction logs</li>
                        <li>All uploaded course handout & document files</li>
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="text-[11px] text-blue-800 font-semibold leading-tight">
                        <strong>Administrator accounts are protected:</strong> Your admin email and password login will remain intact.
                      </div>
                    </div>
                  </div>

                  {clearDataErrorMsg && (
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>{clearDataErrorMsg}</span>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      To confirm, type <span className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-bold">CLEAR DATA</span> below:
                    </label>
                    <Input
                      placeholder="CLEAR DATA"
                      value={clearDataConfirmInput}
                      onChange={(e) => {
                        setClearDataConfirmInput(e.target.value);
                        if (clearDataErrorMsg) setClearDataErrorMsg(null);
                      }}
                      disabled={isClearingAllData}
                      className="h-10 text-xs font-mono border-slate-200 rounded-xl focus-visible:ring-slate-400"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowClearDataModal(false)}
                disabled={isClearingAllData}
                className="text-xs font-semibold text-slate-700 h-9 px-4 rounded-xl border-slate-200"
              >
                Cancel
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleExecuteClearAllData}
                disabled={
                  isClearingAllData ||
                  clearDataConfirmInput.trim().toUpperCase() !== "CLEAR DATA" ||
                  Boolean(clearDataSuccessMsg)
                }
                className="text-xs font-bold bg-[#0c2461] hover:bg-[#103080] text-white h-9 px-5 rounded-xl shadow-xs shadow-blue-900/20 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                {isClearingAllData ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging Platform Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Wipe Platform Data</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRecordingModal && recordingModalTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {recordingModalTarget.currentUrl ? "Edit Session Recording" : "Attach Session Recording"}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-[220px]">
                    {recordingModalTarget.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRecordingModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecording} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">
                  Recording Playback URL (BigBlueButton / YouTube / Cloud Storage)
                </label>
                <Input
                  placeholder="https://.../playback or https://youtu.be/..."
                  value={recordingInputUrl}
                  onChange={(e) => setRecordingInputUrl(e.target.value)}
                  className="rounded-xl h-10 text-xs font-mono"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Enrolled students will immediately see a &quot;Watch Recording&quot; button on their dashboard and calendars.
                </p>
              </div>

              {/* Helper box explaining BigBlueButton recording storage */}
              <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 space-y-2 text-slate-700">
                <div className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
                  <AlertCircle className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>BigBlueButton Recording Information</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-purple-900/90 list-disc list-inside">
                  <li>
                    <strong>Automatic Recording:</strong> BigBlueButton classrooms are recorded on the server when active.
                  </li>
                  <li>
                    <strong>Processing:</strong> BigBlueButton processes playback recordings within a few minutes after the live session ends.
                  </li>
                  <li>
                    <strong>Auto-Sync:</strong> Click <em>Auto-sync Recording</em> below or wait for automatic background sync to attach the playback URL.
                  </li>
                  <li>
                    <strong>Custom Link:</strong> You can also paste any external video or cloud recording link directly above.
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleAutoSyncInModal}
                    disabled={isAutoSyncingInModal}
                    className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                    title="Attempt to fetch recording automatically from BigBlueButton"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isAutoSyncingInModal ? "animate-spin" : ""}`} />
                    <span>{isAutoSyncingInModal ? "Syncing BBB..." : "Auto-sync Recording"}</span>
                  </button>
                  {recordingModalTarget.currentUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveRecording}
                      disabled={isSavingRecording || isDeletingRecording !== null}
                      className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto transition-colors"
                      title="Permanently delete recording from BigBlueButton server and database"
                    >
                      {isDeletingRecording ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      )}
                      <span>{isDeletingRecording ? "Deleting..." : "Delete Recording (Admin Only)"}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRecordingModal(false)}
                    className="rounded-xl h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingRecording || !recordingInputUrl.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl px-4 h-9 shadow-xs"
                  >
                    {isSavingRecording ? "Saving..." : "Save Recording"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModalData.isOpen}
        onClose={() => setConfirmModalData((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalData.onConfirm}
        title={confirmModalData.title}
        description={confirmModalData.description}
        variant={confirmModalData.variant}
      />

      <UserProfileHistoryModal
        isOpen={showUserProfileModal}
        onClose={() => {
          setShowUserProfileModal(false);
          setSelectedUserForProfile(null);
        }}
        user={selectedUserForProfile}
        onGrantTokens={(u) => {
          setShowUserProfileModal(false);
          handleOpenGrantTokens(u);
        }}
        onEnrollUser={(u) => {
          setShowUserProfileModal(false);
          handleOpenEnrollUser(u);
        }}
        onManageTrials={(u) => {
          setShowUserProfileModal(false);
          handleOpenStudentTrials(u);
        }}
        onEditUser={(u) => {
          setShowUserProfileModal(false);
          handleOpenEditUser(u);
        }}
      />

      <BigBlueButtonAnalyticsModal
        isOpen={Boolean(analyticsModalTarget)}
        onClose={() => setAnalyticsModalTarget(null)}
        eventId={analyticsModalTarget?.eventId}
        trialId={analyticsModalTarget?.trialId}
        title={analyticsModalTarget?.title}
        adminTimezone={adminTimezone}
      />
    </div>
  );
}
