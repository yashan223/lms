"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap,
  Search,
  Bell,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Home,
  FileText,
  Users,
  Calendar,
  Plus,
  ArrowRight,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  SlidersHorizontal,
  Trash2,
  FolderOpen,
  CalendarCheck,
  CalendarClock,
  ShieldCheck,
  Edit3,
  Video,
  FileCheck2,
  DollarSign,
  TrendingUp,
  Download,
  ExternalLink,
  Loader2,
  LogOut,
  X,
  Tag,
  MessageSquareLock,
  Radio,
  Play,
  PlayCircle,
  UserCheck,
  Mail,
  Phone,
  RefreshCw,
  Layers,
  Globe,
  Settings,
  Check,
  Copy,
  Upload,
  Camera,
  BadgeCheck,
  Palette,
  Building2,
  Briefcase,
  Share2,
  History,
  Coins,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { EncryptedChatDrawer } from "@/components/chat/EncryptedChatDrawer";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { getSafeMeetingLink, normalizeMeetingLink, isGenericMeetingLink } from "@/lib/utils";
import { formatClassId } from "@/lib/class-id-client";
import { TutorAvailabilityManager } from "@/components/tutor/TutorAvailabilityManager";
import { TutorFirstTimeAvailabilityModal } from "@/components/tutor/TutorFirstTimeAvailabilityModal";
import { EnrollmentRequestsManager } from "@/components/tutor/EnrollmentRequestsManager";
import { TutorMonthlyEarningsView } from "@/components/tutor/TutorMonthlyEarningsView";
import { TutorRescheduleRequestsManager } from "@/components/tutor/TutorRescheduleRequestsManager";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { formatInternationalPhone } from "@/lib/country-codes";
import {
  getUserBrowserTimezone,
  formatTimeInTimezone,
  formatDateInTimezone,
  formatForUser,
  formatForDateTimeInput,
  parseDateTimeInputInTimezone,
  getDualTimeDisplay,
  getTimezoneAbbr,
  getTimezoneCountryCode,
  DEFAULT_TIMEZONE,
} from "@/lib/timezones";
import { getEventDurationHours, getEventDurationMinutes } from "@/lib/scheduling";

const formatSessionDuration = (startedAt?: string | Date | null, endedAt?: string | Date | null) => {
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
};

interface AcademicDegree {
  id: string;
  degree: string;
  institution: string;
  year: string;
  honors?: string;
}

interface AcademicCertification {
  id: string;
  title: string;
  authority: string;
  year: string;
}

interface EnrolledCourseInfo {
  courseId: string;
  courseTitle: string;
  subjectCode?: string;
  enrolledAt: string;
}

interface StudentRecord {
  id: string;
  studentId?: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  headline: string;
  enrolledCourses: EnrolledCourseInfo[];
  latestEnrollment: string;
}

interface TutorCourse {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  subjectCode?: string;
  category: string;
  price: number;
  status?: string;
  modules?: any[];
  materials?: any[];
  enrollments?: any[];
}

interface ScheduledClassEvent {
  id: string;
  classCode?: string | null;
  title: string;
  description?: string | null;
  dueDate: string;
  type: string;
  status?: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED" | string;
  meetingLink?: string | null;
  meetingSpaceId?: string | null;
  conferenceRecordId?: string | null;
  recordingUrl?: string | null;
  recordingStatus?: string | null;
  actualStartTime?: string | Date | null;
  actualEndTime?: string | Date | null;
  attendanceCount?: number | null;
  startedAt?: string | Date | null;
  endedAt?: string | Date | null;
  tutorJoinTimestamp?: string | Date | null;
  payoutTriggeredAt?: string | Date | null;
  lockedPayoutAmount?: number | null;
  courseId?: string | null;
  userId?: string | null;
  course?: {
    id: string;
    title: string;
    slug: string;
    subjectCode?: string;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    timezone?: string | null;
  } | null;
}

function TutorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [tutor, setTutor] = useState<any>(null);
  const tutorTimezone: string = tutor?.timezone || (typeof window !== "undefined" ? getUserBrowserTimezone() : DEFAULT_TIMEZONE) || DEFAULT_TIMEZONE;
  const [courses, setCourses] = useState<TutorCourse[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [events, setEvents] = useState<ScheduledClassEvent[]>([]);
  const [trials, setTrials] = useState<any[]>([]);

  const [navCoursesOpen, setNavCoursesOpen] = useState(true);

  const [courseSearch, setCourseSearch] = useState("");
  const [showCourseEditor, setShowCourseEditor] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    category: "",
    subjectCode: "",
    level: "ADVANCED",
  });
  const [courseFormError, setCourseFormError] = useState("");
  const [courseFormSaving, setCourseFormSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState<"ALL" | "LIVE" | "SCHEDULED" | "COMPLETED">("ALL");

  const [centerTab, setCenterTab] = useState<
    "courses" | "classes" | "history" | "students" | "trials" | "earnings" | "profile" | "availability" | "enrollments"
  >("courses");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "ENROLLED" | "TRIALS" | "CLASSES" | "STUDENTS">("ALL");
  const [historySubTab, setHistorySubTab] = useState<"earnings" | "logs">("earnings");
  const [monthlyEarnings, setMonthlyEarnings] = useState<any>(null);
  const [pendingEnrollmentsCount, setPendingEnrollmentsCount] = useState(0);
  const [enrollmentsCount, setEnrollmentsCount] = useState(0);
  const [pendingReschedules, setPendingReschedules] = useState<any[]>([]);
  const [hasConfiguredAvailability, setHasConfiguredAvailability] = useState<boolean>(true);
  const [availabilityCount, setAvailabilityCount] = useState<number>(0);
  const [showFirstTimeAvailabilityModal, setShowFirstTimeAvailabilityModal] = useState<boolean>(false);
  const [dismissedAvailabilityBanner, setDismissedAvailabilityBanner] = useState<boolean>(false);

  const fetchEnrollmentCounts = async () => {
    try {
      const res = await fetch("/api/enrollment-requests", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (res.ok && data.counts) {
        setPendingEnrollmentsCount(data.counts.pending || 0);
        setEnrollmentsCount(data.counts.total || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchEnrollmentCounts();
  }, [tutor?.id]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const sessionEnded = searchParams.get("sessionEnded");
    if (sessionEnded === "true") {
      fetchTutorData(false);
      fetchEnrollmentCounts();
    }
    if (tab === "profile") {
      router.push("/tutor/profile");
      return;
    }
    if (tab === "earnings") {
      setCenterTab("history");
      setHistorySubTab("earnings");
      return;
    }
    if (
      tab === "courses" ||
      tab === "classes" ||
      tab === "history" ||
      tab === "students" ||
      tab === "trials" ||
      tab === "availability" ||
      tab === "enrollments"
    ) {
      setCenterTab(tab);
    }
  }, [searchParams, router]);

  const totalEarnings = useMemo(() => {
    return courses.reduce((sum, c) => {
      const price = Number(c.price) || 0;
      const count = c.enrollments?.length || 0;
      return sum + price * count;
    }, 0);
  }, [courses]);

  const tutorShareEarnings = useMemo(() => {
    return totalEarnings * 0.85;
  }, [totalEarnings]);

  const totalTeachingMinutes = useMemo(() => {
    // Enrolled classes can be 1-hour (60 mins) or 2-hour (120 mins); 30-min trial sessions = 30 mins each
    const enrolledClasses = events.filter((e) => !e.title?.toLowerCase().includes("trial") && !e.description?.toLowerCase().includes("trial"));
    const trialEvents = events.filter((e) => e.title?.toLowerCase().includes("trial") || e.description?.toLowerCase().includes("trial"));
    const classMins = enrolledClasses.reduce((sum, e) => sum + getEventDurationMinutes(e.title, e.description), 0);
    const trialMins = (trialEvents.length + trials.length) * 30;
    return classMins + trialMins;
  }, [events, trials]);

  const totalTeachingHours = useMemo(() => {
    return (totalTeachingMinutes / 60).toFixed(1);
  }, [totalTeachingMinutes]);

  const completedTeachingHours = useMemo(() => {
    // Hard rule: Tutors are paid for completed enrolled classes according to duration (1 hour = 1h, 2 hours = 2h).
    // 30-min trial sessions are free (non-billable).
    const completedPaidClasses = events.filter((e) => 
      (e.status === "COMPLETED" || Boolean(e.endedAt)) &&
      !e.title?.toLowerCase().includes("trial") &&
      !e.description?.toLowerCase().includes("trial")
    );
    const totalMinutes = completedPaidClasses.reduce(
      (sum, e) => sum + getEventDurationMinutes(e.title, e.description),
      0
    );
    return (totalMinutes / 60).toFixed(1);
  }, [events]);

  const completedSessions = useMemo(() => {
    return events.filter((e) => e.status === "COMPLETED" || Boolean(e.endedAt));
  }, [events]);

  const filteredHistory = useMemo(() => {
    return completedSessions.filter((ev) => {
      const isTrial = Boolean(
        ev.title?.toLowerCase().includes("trial") ||
        ev.description?.toLowerCase().includes("trial")
      );

      if (historyFilter === "ENROLLED" && isTrial) return false;
      if (historyFilter === "TRIALS" && !isTrial) return false;
      if (historyFilter === "CLASSES" && !ev.courseId) return false;
      if (historyFilter === "STUDENTS" && !ev.userId) return false;

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchesTitle = ev.title?.toLowerCase().includes(q);
        const matchesCourse = ev.course?.title?.toLowerCase().includes(q);
        const matchesDesc = ev.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCourse && !matchesDesc) return false;
      }
      return true;
    });
  }, [completedSessions, historyFilter, historySearch]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"COURSE" | "STUDENT">("COURSE");
  const [newClassStudentId, setNewClassStudentId] = useState("");
  const [newClassTitle, setNewClassTitle] = useState("");
  const [newClassCourseId, setNewClassCourseId] = useState("");
  const [newClassDate, setNewClassDate] = useState("");
  const [newClassMeetingLink, setNewClassMeetingLink] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [newClassType, setNewClassType] = useState("LIVE_SEMINAR");
  const [newClassAcademicLevel, setNewClassAcademicLevel] = useState<"AUTO" | "AL" | "OL">("AUTO");
  const [schedulingClass, setSchedulingClass] = useState(false);
  const [selectedStudentAvailabilities, setSelectedStudentAvailabilities] = useState<any[]>([]);

  useEffect(() => {
    if (newClassStudentId) {
      fetch(`/api/student/availability?studentId=${newClassStudentId}`)
        .then((r) => r.json())
        .then((d) => {
          setSelectedStudentAvailabilities(d.availabilities || []);
        })
        .catch(() => setSelectedStudentAvailabilities([]));
    } else {
      setSelectedStudentAvailabilities([]);
    }
  }, [newClassStudentId]);

  const applyStudentSlotToClassDate = (av: any) => {
    const [hh, mm] = (av.startTime || "16:00").split(":").map(Number);
    const now = new Date();
    let target = new Date();
    if (av.specificDate) {
      target = new Date(av.specificDate);
    } else if (av.dayOfWeek !== null && av.dayOfWeek !== undefined) {
      const targetDay = Number(av.dayOfWeek);
      const currentDay = now.getDay();
      let diff = (targetDay - currentDay + 7) % 7;
      if (diff === 0) diff = 7;
      target.setDate(now.getDate() + diff);
    } else {
      target.setDate(now.getDate() + 1);
    }
    target.setHours(hh, mm, 0, 0);
    setNewClassDate(formatForDateTimeInput(target, tutorTimezone));
  };

  const scheduleClassConflict = useMemo(() => {
    if (!newClassDate) return null;
    const targetStart = parseDateTimeInputInTimezone(newClassDate, tutorTimezone);
    if (isNaN(targetStart.getTime())) return null;
    const targetEnd = new Date(targetStart.getTime() + 60 * 60 * 1000);

    for (const ev of events) {
      if (ev.status === "CANCELLED" || ev.status === "REJECTED") continue;
      const evStart = new Date(ev.dueDate);
      const duration = ev.title.toLowerCase().includes("2h") ? 120 : 60;
      const evEnd = new Date(evStart.getTime() + duration * 60 * 1000);

      if (targetStart.getTime() < evEnd.getTime() && targetEnd.getTime() > evStart.getTime()) {
        return { title: ev.title, start: evStart, end: evEnd };
      }
    }
    return null;
  }, [newClassDate, events]);

  const [startingClassId, setStartingClassId] = useState<string | null>(null);
  const [endingClassId, setEndingClassId] = useState<string | null>(null);

  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [startSessionTarget, setStartSessionTarget] = useState<{
    eventId?: string;
    trialId?: string;
    title: string;
    currentLink?: string;
  } | null>(null);
  const [startSessionMeetLink, setStartSessionMeetLink] = useState("");
  const [isStartingSession, setIsStartingSession] = useState(false);

  const [syncingTrialId, setSyncingTrialId] = useState<string | null>(null);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleTargetEvent, setRescheduleTargetEvent] = useState<ScheduledClassEvent | null>(null);
  const [rescheduleTargetTrial, setRescheduleTargetTrial] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleMeetingLink, setRescheduleMeetingLink] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleStatusMsg, setRescheduleStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentRecord | null>(null);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [activeChatRecipientId, setActiveChatRecipientId] = useState<string | undefined>(undefined);

  const [trialFilter, setTrialFilter] = useState<"ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED">("ALL");
  const [showConfirmTrialModal, setShowConfirmTrialModal] = useState(false);
  const [confirmingTrial, setConfirmingTrial] = useState<any | null>(null);
  const [confirmDate, setConfirmDate] = useState("");
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [confirmMeetLink, setConfirmMeetLink] = useState("");
  const [confirmNotes, setConfirmNotes] = useState("");
  const [isSubmittingConfirmTrial, setIsSubmittingConfirmTrial] = useState(false);
  const [confirmTrialStatusMsg, setConfirmTrialStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDeclineTrialModal, setShowDeclineTrialModal] = useState(false);
  const [decliningTrial, setDecliningTrial] = useState<any | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmittingDeclineTrial, setIsSubmittingDeclineTrial] = useState(false);

  const [profileName, setProfileName] = useState("");
  const [profileHeadline, setProfileHeadline] = useState("");
  const [profileAbout, setProfileAbout] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileDegrees, setProfileDegrees] = useState<AcademicDegree[]>([]);
  const [profileSpecs, setProfileSpecs] = useState<string[]>([]);
  const [profileCerts, setProfileCerts] = useState<AcademicCertification[]>([]);
  const [profileExp, setProfileExp] = useState("");
  const [profileRate, setProfileRate] = useState("5000");
  const [profileRateAL, setProfileRateAL] = useState("5000");
  const [profileRateOL, setProfileRateOL] = useState("3500");
  const [profileHours, setProfileHours] = useState("");
  const [profileLinkedin, setProfileLinkedin] = useState("");
  const [profileResearchGate, setProfileResearchGate] = useState("");
  const [profileWebsite, setProfileWebsite] = useState("");

  const [newDegreeTitle, setNewDegreeTitle] = useState("");
  const [newDegreeInst, setNewDegreeInst] = useState("");
  const [newDegreeYear, setNewDegreeYear] = useState("");
  const [newDegreeHonors, setNewDegreeHonors] = useState("");

  const [newSpecTag, setNewSpecTag] = useState("");

  const [newCertTitle, setNewCertTitle] = useState("");
  const [newCertAuth, setNewCertAuth] = useState("");
  const [newCertYear, setNewCertYear] = useState("");

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatusMsg, setProfileStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [calDate, setCalDate] = useState(() => new Date());

  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "danger" | "warning" | "success";
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "danger",
    onConfirm: async () => {},
  });

  const fetchTutorData = async (isInitial?: any) => {
    try {
      if (isInitial === true && !tutor) {
        setLoading(true);
      }
      const res = await fetch("/api/tutor", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
      }
      const data = await res.json();
      if (data.tutor) {
        setTutor(data.tutor);
        setProfileName(data.tutor.name || "");
        setProfileHeadline(data.tutor.headline || "Senior Tutor");
        setProfilePhone(data.tutor.phone || "");
        setProfileAvatar(data.tutor.avatar || "");

        let parsedAbout = "";
        let parsedDegrees: AcademicDegree[] = [];
        let parsedSpecs: string[] = [];
        let parsedCerts: AcademicCertification[] = [];
        let parsedExp = "";
        let parsedRate = "5000";
        let parsedRateAL = "5000";
        let parsedRateOL = "3500";
        let parsedHours = "";
        let parsedLinkedin = "";
        let parsedResearchGate = "";
        let parsedWebsite = "";

        if (data.tutor.bio) {
          try {
            if (data.tutor.bio.trim().startsWith("{") && data.tutor.bio.trim().endsWith("}")) {
              const parsed = JSON.parse(data.tutor.bio);
              if (parsed.about) parsedAbout = parsed.about;
              if (Array.isArray(parsed.degrees)) {
                parsedDegrees = parsed.degrees;
              }
              if (Array.isArray(parsed.specializations)) {
                parsedSpecs = parsed.specializations;
              }
              if (Array.isArray(parsed.certifications)) {
                parsedCerts = parsed.certifications;
              }
              if (parsed.experienceYears) parsedExp = parsed.experienceYears;
              if (parsed.hourlyRate) parsedRate = parsed.hourlyRate;
              parsedRateAL = parsed.hourlyRateAL ? String(parsed.hourlyRateAL) : parsedRate;
              parsedRateOL = parsed.hourlyRateOL ? String(parsed.hourlyRateOL) : "3500";
              if (parsed.officeHours) parsedHours = parsed.officeHours;
              if (parsed.linkedin) parsedLinkedin = parsed.linkedin;
              if (parsed.researchGate) parsedResearchGate = parsed.researchGate;
              if (parsed.website) parsedWebsite = parsed.website;
            } else {
              parsedAbout = data.tutor.bio;
            }
          } catch (e) {
            parsedAbout = data.tutor.bio;
          }
        }

        setProfileAbout(parsedAbout);
        setProfileDegrees(parsedDegrees);
        setProfileSpecs(parsedSpecs);
        setProfileCerts(parsedCerts);
        setProfileExp(parsedExp);
        setProfileRate(parsedRate);
        setProfileRateAL(parsedRateAL);
        setProfileRateOL(parsedRateOL);
        setProfileHours(parsedHours);
        setProfileLinkedin(parsedLinkedin);
        setProfileResearchGate(parsedResearchGate);
        setProfileWebsite(parsedWebsite);
      }
      setCourses(data.courses || []);
      setStudents(data.students || []);
      setEvents(data.events || []);
      const rawTrials = data.trials || [];
      const sortedTrials = [...rawTrials].sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || a.preferredDate || 0).getTime();
        const timeB = new Date(b.createdAt || b.preferredDate || 0).getTime();
        return timeB - timeA;
      });
      setTrials(sortedTrials);
      if (data.monthlyEarnings) {
        setMonthlyEarnings(data.monthlyEarnings);
      }
      if (data.pendingReschedules) {
        setPendingReschedules(data.pendingReschedules);
      }
      if (data.hasConfiguredAvailability !== undefined) {
        setHasConfiguredAvailability(Boolean(data.hasConfiguredAvailability));
      }
      if (data.availabilityCount !== undefined) {
        setAvailabilityCount(Number(data.availabilityCount));
      }

      // Auto-trigger top popup on 1st time login if availability is not yet configured
      if (data.tutor && data.availabilityCount === 0) {
        const modalShownKey = `tutor_availability_modal_shown_${data.tutor.id}`;
        const hasShownModal = typeof window !== "undefined" ? localStorage.getItem(modalShownKey) : null;
        if (!hasShownModal) {
          setShowFirstTimeAvailabilityModal(true);
        }
      }

      if (data.courses && data.courses.length > 0 && !newClassCourseId) {
        setNewClassCourseId(data.courses[0].id);
      }
    } catch (err) {
      console.error("Failed to load tutor studio data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnenrollStudent = (studentId: string, studentName: string, courseId: string, courseTitle: string) => {
    setConfirmModalData({
      isOpen: true,
      title: "Remove Student from Class",
      description: `Are you sure you want to remove ${studentName} from "${courseTitle}"? They will no longer have access to this individual class's syllabus and live classes.`,
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "unenroll_student",
              studentId,
              courseId,
            }),
          });
          if (res.ok) {
            await fetchTutorData();
            if (selectedStudentForModal && selectedStudentForModal.id === studentId) {
              setSelectedStudentForModal((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  enrolledCourses: prev.enrolledCourses.filter((c) => c.courseId !== courseId),
                };
              });
            }
          }
        } catch (err) {
          console.error("Error unenrolling student:", err);
        } finally {
          setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const openCourseEditor = (course?: TutorCourse) => {
    if (!course) {
      router.push("/tutor/courses/new");
      return;
    }
    router.push(`/tutor/courses/${course.id}/edit`);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCourseFormError("");
    setCourseFormSaving(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingCourseId ? "update_course" : "create_course",
          courseId: editingCourseId,
          ...courseForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit course.");
      setShowCourseEditor(false);
      await fetchTutorData(false);
      if (data.course?.id) {
        router.push(`/tutor/courses/${data.course.id}/edit`);
      }
    } catch (err: any) {
      setCourseFormError(err.message || "Failed to submit course.");
    } finally {
      setCourseFormSaving(false);
    }
  };

  useEffect(() => {
    fetchTutorData(true);
    fetchEnrollmentCounts();
  }, []);

  useRealtimeSync({
    onSync: () => {
      fetchTutorData(false);
      fetchEnrollmentCounts();
    },
  });

  const calendarDays = useMemo(() => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [calDate]);

  const getEventsOnDate = useCallback(
    (date: Date | null) => {
      if (!date) return [];
      const y = date.getFullYear();
      const m = date.getMonth();
      const d = date.getDate();

      const matchedClasses = events
        .filter((ev) => {
          const isEnded = ev.status === "COMPLETED" || ev.status === "CANCELLED" || (Boolean(ev.endedAt) && ev.status !== "SCHEDULED");
          if (isEnded) return false;
          const evDate = new Date(ev.dueDate);
          return (
            evDate.getFullYear() === y &&
            evDate.getMonth() === m &&
            evDate.getDate() === d
          );
        })
        .map((ev) => ({
          id: ev.id,
          title: ev.title,
          dueDate: ev.dueDate,
          type: ev.type || "LIVE_SEMINAR",
          isLive: ev.status === "LIVE",
          courseTitle: ev.course?.title,
        }));

      const matchedTrials = trials
        .filter((tr) => {
          if (tr.status === "COMPLETED" || tr.status === "CANCELLED") return false;
          const trDate = new Date(tr.preferredDate);
          return (
            trDate.getFullYear() === y &&
            trDate.getMonth() === m &&
            trDate.getDate() === d
          );
        })
        .map((tr) => ({
          id: tr.id,
          title: `1-on-1 Trial: ${tr.studentName || tr.student?.name || "Student"}`,
          dueDate: tr.preferredDate,
          type: "TRIAL",
          isLive: false,
          courseTitle: tr.course?.title || tr.topic,
        }));

      return [...matchedClasses, ...matchedTrials];
    },
    [events, trials]
  );

  const hasEventOnDate = useCallback(
    (date: Date | null) => {
      if (!date) return false;
      const y = date.getFullYear();
      const m = date.getMonth();
      const d = date.getDate();
      const hasClass = events.some((ev) => {
        const isEnded = ev.status === "COMPLETED" || ev.status === "CANCELLED" || (Boolean(ev.endedAt) && ev.status !== "SCHEDULED");
        if (isEnded) return false;
        const evDate = new Date(ev.dueDate);
        return (
          evDate.getFullYear() === y &&
          evDate.getMonth() === m &&
          evDate.getDate() === d
        );
      });
      const hasTrial = trials.some((tr) => {
        if (tr.status === "COMPLETED" || tr.status === "CANCELLED") return false;
        const trDate = new Date(tr.preferredDate);
        return (
          trDate.getFullYear() === y &&
          trDate.getMonth() === m &&
          trDate.getDate() === d
        );
      });
      return hasClass || hasTrial;
    },
    [events, trials]
  );

  const prevMonth = () => {
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));
  };
  const goToToday = () => {
    setCalDate(new Date());
  };

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
        (c.subjectCode && c.subjectCode.toLowerCase().includes(courseSearch.toLowerCase())) ||
        (c.category && c.category.toLowerCase().includes(courseSearch.toLowerCase()));
      return matchSearch;
    });
  }, [courses, courseSearch]);

  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      const matchQuery =
        st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        st.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (st.studentId && st.studentId.toLowerCase().includes(studentSearch.toLowerCase())) ||
        (st.phone && st.phone.includes(studentSearch));

      const matchCourse =
        selectedCourseFilter === "ALL" ||
        st.enrolledCourses.some((c) => c.courseId === selectedCourseFilter);

      return matchQuery && matchCourse;
    });
  }, [students, studentSearch, selectedCourseFilter]);

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((ev) => {
      const isEnded = ev.status === "COMPLETED" || ev.status === "CANCELLED" || (Boolean(ev.endedAt) && ev.status !== "SCHEDULED");
      if (classFilter === "ALL") return !isEnded;
      if (classFilter === "LIVE") return ev.status === "LIVE" && !isEnded;
      if (classFilter === "SCHEDULED") {
        return !isEnded && (ev.status === "SCHEDULED" || !ev.status || ev.status === "LIVE") && (ev.status === "LIVE" || new Date(ev.dueDate).getTime() >= now);
      }
      if (classFilter === "COMPLETED") return isEnded;
      return !isEnded;
    });
  }, [events, classFilter]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter((ev) => {

        if (ev.status === "COMPLETED" || ev.status === "CANCELLED" || (Boolean(ev.endedAt) && ev.status !== "SCHEDULED")) return false;

        if (ev.status === "LIVE") return true;

        return (ev.status === "SCHEDULED" || !ev.status) && new Date(ev.dueDate).getTime() >= now;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [events]);

  const ongoingLiveEvent = useMemo(() => {
    return events.find((e) => e.status === "LIVE" && !e.endedAt);
  }, [events]);

  const ongoingLiveTrial = useMemo(() => {
    return trials.find((t) => t.status === "CONFIRMED" && t.actualStartTime && !t.actualEndTime);
  }, [trials]);

  const hasAnyLiveSession = Boolean(ongoingLiveEvent || ongoingLiveTrial);
  const activeSessionTitle = ongoingLiveEvent?.title || (ongoingLiveTrial ? `Trial Consultation with ${ongoingLiveTrial.studentName}` : "Live Session");

  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassTitle.trim() || !newClassDate) return;

    try {
      setSchedulingClass(true);
      const parsedUtcDate = parseDateTimeInputInTimezone(newClassDate, tutorTimezone);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule_class",
          title: newClassTitle.trim(),
          description: newClassDesc.trim(),
          meetingLink: newClassMeetingLink.trim(),
          scheduledDate: parsedUtcDate.toISOString(),
          timezone: tutorTimezone,
          courseId: scheduleMode === "COURSE" ? newClassCourseId : null,
          studentId: scheduleMode === "STUDENT" ? newClassStudentId : null,
          tutorId: tutor?.id,
          type: newClassType,
          academicLevel: newClassAcademicLevel !== "AUTO" ? newClassAcademicLevel : undefined,
        }),
      });

      if (res.ok) {
        setShowScheduleModal(false);
        setNewClassTitle("");
        setNewClassDesc("");
        setNewClassMeetingLink("");
        setNewClassDate("");
        setNewClassAcademicLevel("AUTO");
        fetchTutorData();
      }
    } catch (error) {
      console.error("Failed to schedule class:", error);
    } finally {
      setSchedulingClass(false);
    }
  };

  const [startingTrialId, setStartingTrialId] = useState<string | null>(null);
  const [endingTrialId, setEndingTrialId] = useState<string | null>(null);

  const handleStartClassDirect = async (ev: ScheduledClassEvent) => {
    if (startingClassId) return;
    try {
      setStartingClassId(ev.id);
      const newWin = typeof window !== "undefined" ? window.open("", "_blank") : null;
      if (newWin) {
        newWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Connecting to BigBlueButton...</title></head>
            <body style="font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#f8fafc;">
              <div style="text-align:center;padding:28px 24px;border-radius:16px;background:#1e293b;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);max-width:420px;border:1px solid #334155;">
                <div style="width:38px;height:38px;border:3px solid #38bdf8;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
                <h3 style="margin:0 0 8px;font-size:18px;font-weight:700;">Starting Live Session...</h3>
                <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;line-height:1.5;">Preparing your BigBlueButton live classroom room.<br>You will be redirected automatically.</p>
                <div style="font-size:11px;color:#cbd5e1;background:#0f172a;padding:8px 12px;border-radius:8px;border:1px solid #334155;">
                  🎥 Interactive whiteboard, breakout rooms & automatic recording enabled.
                </div>
                <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
              </div>
            </body>
          </html>
        `);
      }

      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_class",
          eventId: ev.id,
          meetingLink: ev.meetingLink && !isGenericMeetingLink(ev.meetingLink) ? ev.meetingLink : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.meetingLink) {
        if (newWin) {
          newWin.location.href = data.meetingLink;
        } else {
          window.open(data.meetingLink, "_blank", "noopener,noreferrer");
        }
        await fetchTutorData();
      } else {
        if (newWin) newWin.close();
        alert(data.error || "Failed to start live session.");
      }
    } catch (err) {
      console.error("Failed to start class session:", err);
      alert("Failed to start live session. Please try again.");
    } finally {
      setStartingClassId(null);
    }
  };

  const handleStartTrialDirect = async (tr: any) => {
    if (startingTrialId) return;
    try {
      setStartingTrialId(tr.id);
      const newWin = typeof window !== "undefined" ? window.open("", "_blank") : null;
      if (newWin) {
        newWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Connecting to BigBlueButton...</title></head>
            <body style="font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#f8fafc;">
              <div style="text-align:center;padding:28px 24px;border-radius:16px;background:#1e293b;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);max-width:420px;border:1px solid #334155;">
                <div style="width:38px;height:38px;border:3px solid #10b981;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
                <h3 style="margin:0 0 8px;font-size:18px;font-weight:700;">Starting Live Consultation...</h3>
                <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;line-height:1.5;">Preparing your BigBlueButton consultation room.<br>You will be redirected automatically.</p>
                <div style="font-size:11px;color:#cbd5e1;background:#0f172a;padding:8px 12px;border-radius:8px;border:1px solid #334155;">
                  🎥 1-on-1 video consultation with interactive screen sharing.
                </div>
                <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
              </div>
            </body>
          </html>
        `);
      }

      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_class",
          trialId: tr.id,
          meetingLink: tr.meetingLink && !isGenericMeetingLink(tr.meetingLink) ? tr.meetingLink : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.meetingLink) {
        if (newWin) {
          newWin.location.href = data.meetingLink;
        } else {
          window.open(data.meetingLink, "_blank", "noopener,noreferrer");
        }
        await fetchTutorData();
      } else {
        if (newWin) newWin.close();
        alert(data.error || "Failed to start live consultation.");
      }
    } catch (err) {
      console.error("Failed to start trial session:", err);
      alert("Failed to start live consultation. Please try again.");
    } finally {
      setStartingTrialId(null);
    }
  };

  const triggerStartClassFlow = (ev: ScheduledClassEvent) => {
    if (hasAnyLiveSession && ev.id !== ongoingLiveEvent?.id) {
      alert(`Cannot start a new class: You already have an ongoing live session ("${activeSessionTitle}"). Please conclude your active session before starting another class.`);
      return;
    }
    handleStartClassDirect(ev);
  };

  const triggerStartTrialFlow = (tr: any) => {
    if (hasAnyLiveSession && tr.id !== ongoingLiveTrial?.id) {
      alert(`Cannot start a new consultation: You already have an ongoing live session ("${activeSessionTitle}"). Please conclude your active session before starting another consultation.`);
      return;
    }
    handleStartTrialDirect(tr);
  };

  const handleStartClass = (eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    if (hasAnyLiveSession && ev.id !== ongoingLiveEvent?.id) {
      alert(`Cannot start a new class: You already have an ongoing live session ("${activeSessionTitle}"). Please conclude your active session before starting another class.`);
      return;
    }
    handleStartClassDirect(ev);
  };

  const handleStartTrial = (trialId: string) => {
    const tr = trials.find((t) => t.id === trialId);
    if (!tr) return;
    if (hasAnyLiveSession && tr.id !== ongoingLiveTrial?.id) {
      alert(`Cannot start a new consultation: You already have an ongoing live session ("${activeSessionTitle}"). Please conclude your active session before starting another consultation.`);
      return;
    }
    handleStartTrialDirect(tr);
  };

  const handleStartLiveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startSessionTarget) return;

    const normalized = startSessionMeetLink.trim() ? normalizeMeetingLink(startSessionMeetLink) : undefined;

    try {
      setIsStartingSession(true);
      if (startSessionTarget.eventId) {
        setStartingClassId(startSessionTarget.eventId);
      }
      if (startSessionTarget.trialId) {
        setStartingTrialId(startSessionTarget.trialId);
      }

      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_class",
          eventId: startSessionTarget.eventId,
          trialId: startSessionTarget.trialId,
          meetingLink: normalized || (startSessionTarget.currentLink && !isGenericMeetingLink(startSessionTarget.currentLink) ? startSessionTarget.currentLink : undefined),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowStartSessionModal(false);
        fetchTutorData();
        if (data.meetingLink && !isGenericMeetingLink(data.meetingLink)) {
          window.open(data.meetingLink, "_blank", "noopener,noreferrer");
        }
      } else {
        alert(data.error || "Failed to start live session.");
      }
    } catch (err) {
      console.error("Failed to start session:", err);
      alert("Failed to start live session. Please try again.");
    } finally {
      setIsStartingSession(false);
      setStartingClassId(null);
      setStartingTrialId(null);
    }
  };

  const handleEndTrial = async (trialId: string) => {
    try {
      setEndingTrialId(trialId);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_class",
          trialId,
        }),
      });
      if (res.ok) {
        fetchTutorData();
      }
    } catch (error) {
      console.error("Failed to end consultation session:", error);
    } finally {
      setEndingTrialId(null);
    }
  };

  const handleEndClass = async (eventId: string, isNoShow?: boolean) => {
    try {
      setEndingClassId(eventId);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_class",
          eventId,
          isNoShow: Boolean(isNoShow),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to end class.");
      } else {
        if (data.isNoShow) {
          alert("✓ Class ended under Student No-Show Policy. Token deducted from student and your teaching fee was credited to your earnings ledger.");
        }
        fetchTutorData();
      }
    } catch (error) {
      console.error("Failed to end class:", error);
    } finally {
      setEndingClassId(null);
    }
  };

  const promptEndClass = (ev: ScheduledClassEvent) => {
    const isTrial = ev.title?.toLowerCase().includes("trial") || ev.description?.toLowerCase().includes("trial");
    const liveStartTime = ev.tutorJoinTimestamp || ev.actualStartTime || ev.startedAt;
    const elapsedMinutes = liveStartTime
      ? Math.floor((Date.now() - new Date(liveStartTime).getTime()) / 60000)
      : 0;

    if (isTrial) {
      setConfirmModalData({
        isOpen: true,
        title: "End Consultation Session",
        description: "Are you sure you want to conclude this 1-on-1 consultation session?",
        variant: "warning",
        onConfirm: async () => {
          await handleEndClass(ev.id);
        },
      });
      return;
    }

    if (elapsedMinutes < 15) {
      setConfirmModalData({
        isOpen: true,
        title: "End Live Class Session",
        description: `Are you sure you want to end "${ev.title}"? Note: If your student has not attended, LMS policy requires waiting at least 15 minutes in the classroom to qualify as a Student No-Show (waited ${elapsedMinutes} min, ${15 - elapsedMinutes} min remaining). If your student attended, you may end the class now.`,
        variant: "warning",
        onConfirm: async () => {
          await handleEndClass(ev.id);
        },
      });
    } else {
      const payoutMsg = ev.payoutTriggeredAt
        ? ` Your session payment of Rs. ${Number(ev.lockedPayoutAmount || 0).toLocaleString()} LKR was automatically triggered and transferred to your monthly ledger.`
        : "";
      setConfirmModalData({
        isOpen: true,
        title: "End Class Session (15-Minute Policy Met)",
        description: `You have been in the live session for ${elapsedMinutes} minutes.${payoutMsg} If your student did not attend, ending this class will conclude the session under the Student No-Show Policy with full compensation guaranteed.`,
        variant: "success",
        onConfirm: async () => {
          await handleEndClass(ev.id);
        },
      });
    }
  };

  const [syncingEventId, setSyncingEventId] = useState<string | null>(null);

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
        await fetchTutorData();
        const found = data?.event?.recordingUrl || data?.trial?.recordingUrl;
        if (found) {
          alert("✅ BigBlueButton recording found & synced successfully!");
        } else {
          alert("Synced session status with BigBlueButton. BigBlueButton automatically processes and publishes recordings a few minutes after ending a session. Please check back shortly.");
        }
      } else {
        alert(data.error || "Failed to sync with BigBlueButton.");
      }
    } catch (error) {
      console.error("Failed to sync meeting:", error);
    } finally {
      setSyncingEventId(null);
      setSyncingTrialId(null);
    }
  };


  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileStatusMsg({
        type: "error",
        text: "Please select a valid image file (JPEG, PNG, WebP).",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setProfileStatusMsg({
        type: "error",
        text: "Image file is too large. Please upload an image under 10MB.",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "avatar");
      formData.append("isPrivate", "false");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload photo to server.");

      const uploadedUrl = data.fileUrl || data.file?.fileUrl;
      if (!uploadedUrl) throw new Error("Server returned no image URL.");

      setProfileAvatar(uploadedUrl);
      setProfileStatusMsg({
        type: "success",
        text: "Profile photo saved on server! Click 'Save Profile Changes' to apply.",
      });
    } catch (err: any) {
      setProfileStatusMsg({
        type: "error",
        text: err.message || "Failed to upload photo to server.",
      });
    } finally {
      e.target.value = "";
    }
  };

  const handleAddDegree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDegreeTitle.trim() || !newDegreeInst.trim()) return;
    const newDeg: AcademicDegree = {
      id: `deg-${Date.now()}`,
      degree: newDegreeTitle.trim(),
      institution: newDegreeInst.trim(),
      year: newDegreeYear.trim() || new Date().getFullYear().toString(),
      honors: newDegreeHonors.trim() || undefined,
    };
    setProfileDegrees((prev) => [...prev, newDeg]);
    setNewDegreeTitle("");
    setNewDegreeInst("");
    setNewDegreeYear("");
    setNewDegreeHonors("");
  };

  const handleRemoveDegree = (id: string) => {
    setProfileDegrees((prev) => prev.filter((d) => d.id !== id));
  };

  const handleAddSpec = (specToAdd?: string) => {
    const val = (specToAdd || newSpecTag).trim();
    if (!val) return;
    if (!profileSpecs.includes(val)) {
      setProfileSpecs((prev) => [...prev, val]);
    }
    if (!specToAdd) setNewSpecTag("");
  };

  const handleRemoveSpec = (spec: string) => {
    setProfileSpecs((prev) => prev.filter((s) => s !== spec));
  };

  const handleAddCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCertTitle.trim()) return;
    const newCert: AcademicCertification = {
      id: `cert-${Date.now()}`,
      title: newCertTitle.trim(),
      authority: newCertAuth.trim() || "International Assessment Board",
      year: newCertYear.trim() || new Date().getFullYear().toString(),
    };
    setProfileCerts((prev) => [...prev, newCert]);
    setNewCertTitle("");
    setNewCertAuth("");
    setNewCertYear("");
  };

  const handleRemoveCert = (id: string) => {
    setProfileCerts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tutor?.id) return;
    try {
      setProfileSaving(true);
      setProfileStatusMsg(null);

      const bioPayload = JSON.stringify({
        about: profileAbout,
        degrees: profileDegrees,
        specializations: profileSpecs,
        certifications: profileCerts,
        experienceYears: profileExp,
        hourlyRate: profileRate,
        hourlyRateAL: profileRateAL,
        hourlyRateOL: profileRateOL,
        officeHours: profileHours,
        linkedin: profileLinkedin,
        researchGate: profileResearchGate,
        website: profileWebsite,
      });

      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          tutorId: tutor.id,
          name: profileName,
          headline: profileHeadline,
          bio: bioPayload,
          phone: profilePhone,
          avatar: profileAvatar,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileStatusMsg({
          type: "success",
          text: "Tutor profile, academic degrees, and credentials saved successfully!",
        });
        setTutor(data.tutor);
      } else {
        setProfileStatusMsg({
          type: "error",
          text: data.error || "Failed to update profile.",
        });
      }
    } catch (error) {
      setProfileStatusMsg({
        type: "error",
        text: "Network error while saving profile.",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Tutor logout error:", err);
    } finally {
      document.cookie = "edupulse_user_role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "edupulse_user_email=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "edupulse_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.href = "/login";
    }
  };

  const openChatWithStudent = (studentId: string) => {
    setActiveChatRecipientId(studentId);
    setIsChatDrawerOpen(true);
  };

  const openScheduleForStudent = (student: StudentRecord) => {
    setScheduleMode("STUDENT");
    setNewClassStudentId(student.id);
    setNewClassTitle(`1-on-1 Consultation: ${student.name}`);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    setNewClassDate(formatForDateTimeInput(d, tutorTimezone));
    setShowScheduleModal(true);
  };

  const openRescheduleForClass = (event: ScheduledClassEvent) => {
    setRescheduleTargetEvent(event);
    setRescheduleTargetTrial(null);
    setRescheduleDate(formatForDateTimeInput(event.dueDate, tutorTimezone));
    setRescheduleMeetingLink(event.meetingLink || "");
    setRescheduleNotes(event.description || "");
    setRescheduleStatusMsg(null);
    setShowRescheduleModal(true);
  };

  const openRescheduleForTrial = (trial: any) => {
    router.push(`/trials/reschedule?trialId=${trial.id}`);
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate) return;

    try {
      setRescheduling(true);
      setRescheduleStatusMsg(null);
      const parsedRescheduleDate = parseDateTimeInputInTimezone(rescheduleDate, tutorTimezone);

      if (rescheduleTargetEvent) {
        const res = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reschedule_class",
            eventId: rescheduleTargetEvent.id,
            scheduledDate: parsedRescheduleDate.toISOString(),
            timezone: tutorTimezone,
            meetingLink: rescheduleMeetingLink,
            description: rescheduleNotes,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setRescheduleStatusMsg({
            type: "success",
            text: "Class session rescheduled successfully!",
          });
          fetchTutorData();
          setTimeout(() => setShowRescheduleModal(false), 1200);
        } else {
          setRescheduleStatusMsg({
            type: "error",
            text: data.error || "Failed to reschedule class.",
          });
        }
      } else if (rescheduleTargetTrial) {
        const res = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reschedule_trial",
            trialId: rescheduleTargetTrial.id,
            preferredDate: parsedRescheduleDate.toISOString(),
            timezone: tutorTimezone,
            notes: rescheduleNotes,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setRescheduleStatusMsg({
            type: "success",
            text: "1-on-1 consultation rescheduled successfully!",
          });
          fetchTutorData();
          setTimeout(() => setShowRescheduleModal(false), 1200);
        } else {
          setRescheduleStatusMsg({
            type: "error",
            text: data.error || "Failed to reschedule consultation.",
          });
        }
      }
    } catch (err) {
      setRescheduleStatusMsg({
        type: "error",
        text: "Network error while rescheduling session.",
      });
    } finally {
      setRescheduling(false);
    }
  };

  const openConfirmTrialModal = (trial: any) => {
    setConfirmingTrial(trial);
    const slots: string[] = Array.isArray(trial.preferredDates) && trial.preferredDates.length > 0
      ? trial.preferredDates
      : [trial.preferredDate];
    setSelectedSlotIndex(0);
    setConfirmDate(formatForDateTimeInput(new Date(slots[0])));
    const rawLink = trial.meetingLink?.trim();
    setConfirmMeetLink(rawLink && !isGenericMeetingLink(rawLink) ? rawLink : "");
    setConfirmNotes(trial.notes || "");
    setConfirmTrialStatusMsg(null);
    setShowConfirmTrialModal(true);
  };

  const handleConfirmTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingTrial || !confirmDate) return;
    try {
      setIsSubmittingConfirmTrial(true);
      setConfirmTrialStatusMsg(null);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_trial",
          trialId: confirmingTrial.id,
          confirmedDate: new Date(confirmDate).toISOString(),
          meetingLink: confirmMeetLink.trim() && !isGenericMeetingLink(confirmMeetLink)
            ? normalizeMeetingLink(confirmMeetLink)
            : undefined,
          notes: confirmNotes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfirmTrialStatusMsg({ type: "success", text: "Trial session confirmed and scheduled on calendar!" });
        fetchTutorData();
        setTimeout(() => {
          setShowConfirmTrialModal(false);
          setConfirmingTrial(null);
        }, 1200);
      } else {
        setConfirmTrialStatusMsg({ type: "error", text: data.error || "Failed to confirm trial session." });
      }
    } catch (err) {
      setConfirmTrialStatusMsg({ type: "error", text: "Network error while confirming trial." });
    } finally {
      setIsSubmittingConfirmTrial(false);
    }
  };

  const openDeclineTrialModal = (trial: any) => {
    setDecliningTrial(trial);
    setDeclineReason("");
    setShowDeclineTrialModal(true);
  };

  const handleDeclineTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decliningTrial) return;
    try {
      setIsSubmittingDeclineTrial(true);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decline_trial",
          trialId: decliningTrial.id,
          reason: declineReason,
        }),
      });
      if (res.ok) {
        setShowDeclineTrialModal(false);
        setDecliningTrial(null);
        fetchTutorData();
      }
    } catch (err) {
      console.error("Failed to decline trial:", err);
    } finally {
      setIsSubmittingDeclineTrial(false);
    }
  };

  if (loading && !tutor) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
        <p className="text-sm font-semibold tracking-wider uppercase text-blue-200">
          Loading Tutor Studio...
        </p>
      </div>
    );
  }

  const tutorName = tutor?.name || "Senior Tutor";

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col font-sans text-slate-800">

      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 py-1">
              <img
                src="/logo-wide.png"
                alt="PulseEDU Global"
                className="h-11 sm:h-12 w-auto object-contain transition-transform hover:scale-[1.02]"
              />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
              Tutor
            </span>

            <NotificationBell userRole="TUTOR" />

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <Link
              href="/tutor/profile"
              title="View & Edit Profile"
              className="flex items-center gap-2 pl-1 group p-1 -m-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="text-right hidden md:block">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide group-hover:text-blue-700 transition-colors block leading-tight">
                  {tutorName}
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-medium block leading-tight">
                  {tutor?.tutorId ? tutor.tutorId : "Profile & Settings"}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#0c2461] text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden ring-2 ring-transparent group-hover:ring-blue-500 transition-all shrink-0">
                {tutor?.avatar ? (
                  <img src={tutor.avatar} alt={tutorName} className="w-full h-full object-cover" />
                ) : (
                  tutorName.charAt(0)
                )}
              </div>
            </Link>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-[1480px] mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 flex-1 min-h-[calc(100vh-4rem)]">

        {/* Top Popup Banner for 1st Time / Unconfigured Availability */}
        {!hasConfiguredAvailability && !dismissedAvailabilityBanner && (
          <div className="bg-gradient-to-r from-[#0c2461] via-[#103080] to-[#1e3c72] text-white p-3.5 sm:p-4 rounded-2xl shadow-md border border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
                <CalendarClock className="w-5 h-5 animate-pulse text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs sm:text-sm text-white">
                    Action Required: Configure Your Teaching Time Slots
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-amber-400 text-slate-900 shadow-2xs">
                    1st Time Setup
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/90 mt-0.5 max-w-3xl leading-relaxed">
                  Students and academy coordinators cannot book 1-on-1 trial sessions or schedule enrolled classes with you until your weekly availability is set.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Button
                size="sm"
                onClick={() => setShowFirstTimeAvailabilityModal(true)}
                className="bg-white hover:bg-blue-50 text-[#0c2461] hover:text-[#0c2461] font-extrabold text-xs rounded-xl h-8 sm:h-9 px-4 shadow-sm gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-blue-700" />
                <span>Set Time Slots Now</span>
              </Button>
              <button
                type="button"
                onClick={() => setDismissedAvailabilityBanner(true)}
                className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Dismiss reminder"
                aria-label="Dismiss reminder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { id: "courses", label: "Individual Classes", icon: BookOpen, count: courses.length },
            { id: "classes", label: "Live Classes", icon: Video, count: events.filter((e) => e.status !== "COMPLETED" && e.status !== "CANCELLED" && !e.endedAt).length },
            { id: "history", label: "History", icon: History, count: completedSessions.length },
            { id: "students", label: "Students", icon: Users, count: students.length },
            { id: "trials", label: "Trials", icon: CalendarCheck, count: trials.length },
            { id: "profile", label: "Profile", icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = centerTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "profile") {
                    router.push("/tutor/profile");
                  } else {
                    setCenterTab(tab.id as any);
                  }
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#0c2461] text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-blue-600"}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          <aside className="lg:col-span-3 space-y-4 order-2 lg:order-1">

            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Tutor Tools
              </h3>

              <div className="space-y-1.5 text-xs font-medium">
                <button
                  onClick={() => setCenterTab("courses")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                    centerTab === "courses"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>My Classes & Syllabus</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-bold">
                    {courses.length}
                  </span>
                </button>

                <button
                  onClick={() => setCenterTab("classes")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                    centerTab === "classes"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-blue-600" />
                    <span>Live Classes</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {pendingReschedules.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black border border-amber-300 animate-pulse">
                        {pendingReschedules.length} req
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-bold">
                      {events.filter((e) => e.status !== "COMPLETED" && e.status !== "CANCELLED" && !e.endedAt).length}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setCenterTab("history")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                    centerTab === "history"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-blue-600" />
                    <span>Session History & Logs</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {monthlyEarnings?.currentMonth?.totalAmountLkr ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black">
                        Rs. {monthlyEarnings.currentMonth.totalAmountLkr.toLocaleString()}
                      </span>
                    ) : null}
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-bold">
                      {completedSessions.length}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setCenterTab("students")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                    centerTab === "students"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Enrolled Students</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-bold">
                    {students.length}
                  </span>
                </button>

                <button
                  onClick={() => setCenterTab("trials")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                    centerTab === "trials"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>1-on-1 Trial Bookings</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-800 font-bold">
                    {trials.length}
                  </span>
                </button>

                <button
                  onClick={() => setCenterTab("enrollments")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                    centerTab === "enrollments"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Enrollment Requests</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {pendingEnrollmentsCount > 0 ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                        {pendingEnrollmentsCount} new
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-bold">
                        {enrollmentsCount}
                      </span>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => router.push("/tutor/availability")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                    centerTab === "availability"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Availability &amp; Timeslots</span>
                  </span>
                  {!hasConfiguredAvailability ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold uppercase animate-pulse border border-amber-200">
                      Setup Required
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-800 font-bold">
                      {availabilityCount} Slots
                    </span>
                  )}
                </button>

                <Link
                  href="/tutor/profile"
                  className="w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>My Profile & Settings</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-800 font-bold">
                    Edit Profile
                  </span>
                </Link>
              </div>
            </div>


            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {calDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevMonth}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600"
                    title="Next month"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 text-center text-xs">
                {calendarDays.map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} className="p-1" />;
                  const isToday =
                    date.getDate() === new Date().getDate() &&
                    date.getMonth() === new Date().getMonth() &&
                    date.getFullYear() === new Date().getFullYear();
                  const dayEvents = getEventsOnDate(date);
                  const hasEvents = dayEvents.length > 0;
                  const tooltipTitle = hasEvents
                    ? dayEvents
                        .map(
                          (e) =>
                            `${e.title} (${new Date(e.dueDate).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })})`
                        )
                        .join("\n")
                    : undefined;

                  return (
                    <div
                      key={date.toISOString()}
                      title={tooltipTitle}
                      className={`p-1 relative group flex flex-col items-center justify-center rounded-md cursor-pointer transition-all ${
                        isToday
                          ? "bg-[#0c2461] text-white font-bold"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-[11px] leading-tight">{date.getDate()}</span>
                      {hasEvents && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isToday ? "bg-white ring-1 ring-blue-300" : "bg-blue-600 ring-1 ring-blue-400/50"
                          }`}
                        />
                      )}

                      {hasEvents && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col z-50 w-48 sm:w-56 p-2.5 bg-slate-900/95 text-white rounded-xl shadow-xl border border-slate-700/70 backdrop-blur-md pointer-events-none text-left animate-in fade-in zoom-in-95 duration-150">
                          <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider border-b border-slate-700/60 pb-1 flex items-center justify-between">
                            <span>{date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                            <span className="text-[9px] font-normal text-slate-400 font-mono">{dayEvents.length} session{dayEvents.length > 1 ? "s" : ""}</span>
                          </div>
                          <div className="space-y-2 pt-1.5 max-h-40 overflow-y-auto">
                            {dayEvents.map((ev: any) => (
                              <div key={ev.id} className="space-y-0.5">
                                <div className="text-[11px] font-bold text-white leading-tight truncate">
                                  {ev.title}
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-mono text-sky-300">
                                    {new Date(ev.dueDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                    ev.isLive
                                      ? "bg-red-500 text-white animate-pulse"
                                      : "bg-blue-500/20 text-blue-300 border border-blue-400/30"
                                  }`}>
                                    {ev.isLive ? "● LIVE" : ev.type === "TRIAL" ? "1-on-1 Trial" : "Online Session"}
                                  </span>
                                </div>
                                {ev.courseTitle && (
                                  <div className="text-[9px] text-slate-400 truncate">
                                    {ev.courseTitle}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-900" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>


          </aside>

          <div className="lg:col-span-6 space-y-4 order-1 lg:order-2">

            <div className="lg:hidden bg-white rounded-lg border border-slate-200 p-2 shadow-2xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCenterTab("courses")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  centerTab === "courses"
                    ? "bg-[#0c2461] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>My Individual Classes ({courses.length})</span>
              </button>

              <button
                onClick={() => setCenterTab("classes")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  centerTab === "classes"
                    ? "bg-[#0c2461] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Live Classes ({events.filter((e) => e.status !== "COMPLETED" && e.status !== "CANCELLED" && !e.endedAt).length})</span>
              </button>

              <button
                onClick={() => setCenterTab("history")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  centerTab === "history"
                    ? "bg-[#0c2461] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Session History ({completedSessions.length})</span>
              </button>

              <button
                onClick={() => setCenterTab("students")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  centerTab === "students"
                    ? "bg-[#0c2461] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Students Directory ({students.length})</span>
              </button>

              <button
                onClick={() => setCenterTab("trials")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  centerTab === "trials"
                    ? "bg-[#0c2461] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Trials ({trials.length})</span>
              </button>

              <button
                onClick={() => router.push("/tutor/availability")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  centerTab === "availability"
                    ? "bg-[#0c2461] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Availability &amp; Timeslots</span>
                <ExternalLink className="w-3 h-3 text-blue-300 ml-0.5" />
              </button>

              <button
                onClick={() => setCenterTab("earnings")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  centerTab === "earnings"
                    ? "bg-[#0c2461] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Earnings & Hours</span>
              </button>

              <button
                onClick={() => router.push("/tutor/profile")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Instructor Profile Studio</span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              </button>
            </div>

            {centerTab === "earnings" && (
              <div className="space-y-4">

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-700 py-1 border-b border-slate-100">
                    <span>Total earnings (instructor share)</span>
                    <span>${tutorShareEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-700 py-1 border-b border-slate-100">
                    <span>Gross course revenue</span>
                    <span>${totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-700 py-1 border-b border-slate-100">
                    <span>Total scheduled classes</span>
                    <span>{events.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-700 py-1 border-b border-slate-100">
                    <span>Total teaching hours (scheduled)</span>
                    <span>{totalTeachingHours}h</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-700 py-1 border-b border-slate-100">
                    <span>Teaching hours delivered</span>
                    <span>{completedTeachingHours}h</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-700 py-1 border-b border-slate-100">
                    <span>Trial sessions</span>
                    <span>{trials.length} × 30 min = {((trials.length * 30) / 60).toFixed(1)}h</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-700 py-1">
                    <span>Total committed time</span>
                    <span>{totalTeachingHours}h</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                  <h3 className="text-xs font-medium text-slate-600 mb-3">Revenue by class</h3>
                  <div className="space-y-3">
                    {courses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No classes assigned yet.</p>
                    ) : (
                      courses.map((c) => {
                        const price = Number(c.price) || 0;
                        const enrolled = c.enrollments?.length || 0;
                        const revenue = price * enrolled * 0.85;
                        const pct = totalEarnings > 0 ? ((price * enrolled) / totalEarnings) * 100 : 0;
                        return (
                          <div key={c.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-slate-700">
                              <span className="truncate max-w-[65%]">{c.title}</span>
                              <div className="flex items-center gap-3 shrink-0 text-slate-500">
                                <span>{enrolled} students</span>
                                <span>${revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-slate-400 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            )}

            {centerTab === "courses" && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        Assigned Curriculum Classes
                      </h3>
                      <Link
                        href="/tutor/courses/new"
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500" />
                        <span>Add Class</span>
                      </Link>
                    </div>

                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search classes..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {filteredCourses.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 italic">
                      No classes match your search.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredCourses.map((c) => (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all flex flex-col justify-between space-y-3 shadow-2xs"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                  {c.subjectCode || "LONDON A/L"}
                                </span>
                                {c.status === "PUBLISHED" ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Published
                                  </span>
                                ) : c.status === "PENDING_REVIEW" ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    Pending Admin Approval
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                    Draft
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-bold text-blue-700 font-mono flex items-center gap-1">
                                <Coins className="w-3 h-3" />
                                {c.price > 0 ? `${c.price} Tokens` : "Admin Set Tokens"}
                              </span>
                            </div>

                            <h4 className="font-bold text-xs text-slate-900 line-clamp-2">
                              {c.title}
                            </h4>

                            <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-slate-400" />
                                {c.modules?.length || 0} Modules
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3 text-slate-400" />
                                {c.materials?.length || 0} Handbooks
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-slate-400" />
                                {c.enrollments?.length || 0} Students
                              </span>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                            <Link
                              href={`/classes/${c.slug}`}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 whitespace-nowrap"
                              title="Open public syllabus page"
                            >
                              <span>Syllabus</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Link
                                href={`/tutor/courses/${c.id}/edit`}
                                className="text-xs font-medium text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-2 py-1 rounded-md inline-flex items-center gap-1 transition-colors whitespace-nowrap shadow-xs"
                                title="Edit class syllabus and materials"
                              >
                                <Edit3 className="w-3 h-3 text-slate-400" />
                                <span>Edit</span>
                              </Link>
                              <button
                                onClick={() => {
                                  setScheduleMode("COURSE");
                                  setNewClassCourseId(c.id);
                                  setNewClassTitle(`Live Class: ${c.title}`);
                                  setShowScheduleModal(true);
                                }}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2 py-1 rounded-md inline-flex items-center gap-1 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
                                title="Schedule live class session"
                              >
                                <Plus className="w-3 h-3 text-blue-500" />
                                <span>Schedule</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {centerTab === "classes" && (
              <div className="space-y-4">
                <TutorRescheduleRequestsManager
                  requests={pendingReschedules}
                  tutorTimezone={tutorTimezone}
                  onRefresh={() => fetchTutorData(false)}
                />

                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      Live Classroom Sessions
                    </h3>

                    <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
                      {(["ALL", "LIVE", "SCHEDULED", "COMPLETED"] as const).map((f) => {
                        const activeCount = events.filter((e) => e.status !== "COMPLETED" && e.status !== "CANCELLED" && !e.endedAt).length;
                        const liveCount = events.filter((e) => e.status === "LIVE" && !e.endedAt).length;
                        const upcomingCount = upcomingEvents.length;
                        const endedCount = events.filter((e) => e.status === "COMPLETED" || e.status === "CANCELLED" || !!e.endedAt).length;

                        return (
                          <button
                            key={f}
                            onClick={() => setClassFilter(f)}
                            className={`px-2.5 py-1 font-bold rounded-md transition-all cursor-pointer ${
                              classFilter === f
                                ? "bg-white text-blue-700 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {f === "ALL" && `All (${activeCount})`}
                            {f === "LIVE" && `Live Now (${liveCount})`}
                            {f === "SCHEDULED" && `Upcoming (${upcomingCount})`}
                            {f === "COMPLETED" && `Past / Ended (${endedCount})`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 italic">
                      No live sessions found for this filter.
                    </div>
                  ) : (
                    <div className="max-h-[520px] lg:max-h-[calc(100vh-320px)] overflow-y-auto pr-1 space-y-3">
                      {filteredEvents.map((ev) => {
                        const isLive = ev.status === "LIVE";
                        const isCompleted = ev.status === "COMPLETED";
                        const isPendingApproval = ev.status === "PENDING_APPROVAL";
                        const isRejected = ev.status === "REJECTED";

                        return (
                          <div
                            key={ev.id}
                            className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                              isLive
                                ? "bg-red-50/50 border-red-200"
                                : isPendingApproval
                                ? "bg-blue-50/40 border-blue-200"
                                : isRejected
                                ? "bg-red-50/40 border-red-200"
                                : "bg-white border-slate-200 hover:border-blue-200"
                            }`}
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 break-words">
                                  {ev.title}
                                </span>
                                <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0" title="Unique Class Tracking ID">
                                  {ev.classCode || formatClassId(ev)}
                                </span>
                                {isPendingApproval && (
                                  <Badge className="bg-blue-50 text-blue-800 border-blue-200 font-bold text-[9px] flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>⏳ Pending Admin Approval</span>
                                  </Badge>
                                )}
                                {isRejected && (
                                  <Badge className="bg-red-100 text-red-800 border-red-300 font-bold text-[9px] flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    <span>❌ Declined by Admin</span>
                                  </Badge>
                                )}
                                {isLive && (
                                  <Badge className="bg-red-600 text-white font-extrabold text-[9px] animate-pulse">
                                    ● LIVE
                                  </Badge>
                                )}
                                {isCompleted && (
                                  <Badge className="bg-slate-100 text-slate-600 text-[9px]">
                                    Ended
                                  </Badge>
                                )}
                                {!isPendingApproval && !isRejected && !isLive && !isCompleted && (
                                  <Badge className="bg-blue-50 text-blue-800 border-blue-200 font-bold text-[9px]">
                                    ✓ Approved & Live
                                  </Badge>
                                )}
                              </div>

                              {isRejected && (ev as any).rejectionReason && (
                                <div className="p-2 rounded-lg bg-red-100/70 border border-red-200 text-red-800 text-[11px] font-medium">
                                  <strong>Admin Note:</strong> {(ev as any).rejectionReason}
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {formatForUser(ev.dueDate, tutorTimezone, { includeDate: true, includeTime: true, includeAbbr: true })}
                                </span>
                                {ev.user?.timezone && ev.user.timezone !== tutorTimezone && (
                                  <span className="text-[10px] text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded font-sans">
                                    Student: {formatTimeInTimezone(ev.dueDate, ev.user.timezone, { includeAbbr: true })}
                                  </span>
                                )}
                                {ev.actualStartTime && ev.actualEndTime ? (
                                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-emerald-600" />
                                    BigBlueButton: {formatTimeInTimezone(ev.actualStartTime, tutorTimezone)} - {formatTimeInTimezone(ev.actualEndTime, tutorTimezone, { includeAbbr: true })}
                                    {ev.attendanceCount ? ` (${ev.attendanceCount} attended)` : ""}
                                  </span>
                                ) : ev.startedAt && ev.endedAt ? (
                                  <span className="text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    Class: {formatTimeInTimezone(ev.startedAt, tutorTimezone)} - {formatTimeInTimezone(ev.endedAt, tutorTimezone, { includeAbbr: true })}
                                  </span>
                                ) : ev.status === "LIVE" && (ev.actualStartTime || ev.startedAt) ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 animate-pulse">
                                      <Clock className="w-3 h-3 text-red-600" />
                                      Live since {formatTimeInTimezone((ev.actualStartTime || ev.startedAt)!, tutorTimezone, { includeAbbr: true })} (
                                      {Math.floor((Date.now() - new Date((ev.actualStartTime || ev.startedAt)!).getTime()) / 60000)}m)
                                    </span>
                                    {!(ev.title?.toLowerCase().includes("trial") || ev.description?.toLowerCase().includes("trial")) && (
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                          Math.floor((Date.now() - new Date((ev.actualStartTime || ev.startedAt)!).getTime()) / 60000) >= 15
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                            : "bg-amber-50 text-amber-800 border-amber-200"
                                        }`}
                                      >
                                        {Math.floor((Date.now() - new Date((ev.actualStartTime || ev.startedAt)!).getTime()) / 60000) >= 15
                                          ? "✓ 15-Min Policy Met (No-Show Eligible)"
                                          : `Policy Wait: ${Math.floor((Date.now() - new Date((ev.actualStartTime || ev.startedAt)!).getTime()) / 60000)}/15m (${Math.max(1, 15 - Math.floor((Date.now() - new Date((ev.actualStartTime || ev.startedAt)!).getTime()) / 60000))}m remaining)`}
                                      </span>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {isLive ? (
                                <>
                                  <a
                                    href={`/api/meetings/join?eventId=${ev.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                                  >
                                    Join Room
                                  </a>
                                  <button
                                    onClick={() => promptEndClass(ev)}
                                    disabled={endingClassId === ev.id}
                                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                      !(ev.title?.toLowerCase().includes("trial") || ev.description?.toLowerCase().includes("trial")) &&
                                      (ev.actualStartTime || ev.startedAt) &&
                                      Math.floor((Date.now() - new Date((ev.actualStartTime || ev.startedAt)!).getTime()) / 60000) >= 15
                                        ? "bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100"
                                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    {endingClassId === ev.id
                                      ? "Ending..."
                                      : !(ev.title?.toLowerCase().includes("trial") || ev.description?.toLowerCase().includes("trial")) &&
                                        (ev.actualStartTime || ev.startedAt) &&
                                        Math.floor((Date.now() - new Date((ev.actualStartTime || ev.startedAt)!).getTime()) / 60000) >= 15
                                      ? "End (15m Met)"
                                      : "End"}
                                  </button>
                                </>
                              ) : isCompleted ? (
                                <div className="flex items-center gap-1.5">
                                  {ev.recordingUrl && (
                                    <a
                                      href={ev.recordingUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                                      <span>Watch Recording</span>
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleSyncMeeting(ev.id)}
                                    disabled={syncingEventId === ev.id}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                    title="Sync verified timing & recording from BigBlueButton"
                                  >
                                    <RefreshCw className={`w-3 h-3 text-slate-500 ${syncingEventId === ev.id ? "animate-spin" : ""}`} />
                                    <span>{syncingEventId === ev.id ? "Syncing..." : "Sync BBB"}</span>
                                  </button>
                                </div>
                              ) : isPendingApproval ? (
                                <>
                                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>Awaiting Review</span>
                                  </span>
                                  <button
                                    onClick={() => openRescheduleForClass(ev)}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                    title="Edit Schedule"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Edit</span>
                                  </button>
                                </>
                              ) : isRejected ? (
                                <>
                                  <button
                                    onClick={() => openRescheduleForClass(ev)}
                                    className="px-3 py-1.5 rounded-lg bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Resubmit</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => triggerStartClassFlow(ev)}
                                    disabled={startingClassId === ev.id || (hasAnyLiveSession && ev.id !== ongoingLiveEvent?.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                      hasAnyLiveSession && ev.id !== ongoingLiveEvent?.id
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                        : "bg-[#0c2461] hover:bg-[#103080] text-white cursor-pointer shadow-xs"
                                    }`}
                                    title={
                                      hasAnyLiveSession && ev.id !== ongoingLiveEvent?.id
                                        ? `Another session ("${activeSessionTitle}") is currently active. Conclude it first.`
                                        : "Start live class"
                                    }
                                  >
                                    Start
                                  </button>
                                  <button
                                    onClick={() => openRescheduleForClass(ev)}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                    title="Reschedule Class"
                                  >
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Reschedule</span>
                                  </button>
                                  <a
                                    href={buildGoogleCalendarUrl({
                                      title: ev.title,
                                      description: ev.description || "",
                                      dueDate: ev.dueDate,
                                      location: ev.meetingLink || "",
                                    })}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                    title="Add to Google Calendar"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {centerTab === "history" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Sub-Tabs: Monthly Earnings Tracker vs Session History & Duration Logs */}
                <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHistorySubTab("earnings")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        historySubTab === "earnings"
                          ? "bg-[#0c2461] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span>Monthly Earnings</span>
                      {monthlyEarnings?.currentMonth?.totalEstimatedPayoutLkr || monthlyEarnings?.currentMonth?.totalAmountLkr ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black border border-emerald-400/30">
                          Rs. {(monthlyEarnings.currentMonth.totalEstimatedPayoutLkr ?? monthlyEarnings.currentMonth.totalAmountLkr).toLocaleString()}
                        </span>
                      ) : null}
                    </button>

                    <button
                      onClick={() => setHistorySubTab("logs")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        historySubTab === "logs"
                          ? "bg-[#0c2461] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <History className="w-4 h-4 text-blue-400" />
                      <span>Session History & Duration Logs</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-black">
                        {completedSessions.length}
                      </span>
                    </button>
                  </div>
                </div>

                {historySubTab === "earnings" && (
                  <TutorMonthlyEarningsView earnings={monthlyEarnings} />
                )}

                {historySubTab === "logs" && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                        <History className="w-4 h-4 text-blue-600" />
                        <span>Online Session History & Duration Logs</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Comprehensive tutor audit log of all completed online classes, recorded start & end times, and duration analytics.
                      </p>
                    </div>

                    <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
                      {(["ALL", "ENROLLED", "TRIALS", "STUDENTS"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setHistoryFilter(f)}
                          className={`px-2.5 py-1 font-bold rounded-md transition-all cursor-pointer ${
                            historyFilter === f
                              ? "bg-white text-blue-700 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {f === "ALL" && `All Ended (${completedSessions.length})`}
                          {f === "ENROLLED" && `1-Hr Classes (${completedSessions.filter((e) => !e.title?.toLowerCase().includes("trial") && !e.description?.toLowerCase().includes("trial")).length})`}
                          {f === "TRIALS" && `30-Min Trials (${completedSessions.filter((e) => e.title?.toLowerCase().includes("trial") || e.description?.toLowerCase().includes("trial")).length})`}
                          {f === "STUDENTS" && `1-on-1 (${completedSessions.filter((e) => Boolean(e.userId)).length})`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Sessions Completed</span>
                      <span className="text-lg font-black text-slate-900">{completedSessions.length}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Classes & Trials combined</span>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Paid Enrolled Classes</span>
                      <span className="text-lg font-black text-blue-950">
                        {completedSessions.filter((e) => !e.title?.toLowerCase().includes("trial") && !e.description?.toLowerCase().includes("trial")).length}
                      </span>
                      <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">1-Hour Paid Sessions</span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">30-Min Free Trials</span>
                      <span className="text-lg font-black text-amber-950">
                        {completedSessions.filter((e) => e.title?.toLowerCase().includes("trial") || e.description?.toLowerCase().includes("trial")).length}
                      </span>
                      <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">Free (0 Tokens • Unpaid)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Billable Teaching Hours</span>
                      <span className="text-lg font-black text-emerald-950">{completedTeachingHours} hrs</span>
                      <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Tutor Income Eligible</span>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search session history by title, course, or topic..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">No completed sessions in history</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        When you start and end live online sessions, their full timing and duration history will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredHistory.map((ev) => {
                        const isTrial = Boolean(
                          ev.title?.toLowerCase().includes("trial") ||
                          ev.description?.toLowerCase().includes("trial")
                        );

                        return (
                          <div
                            key={ev.id}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 shadow-2xs ${
                              isTrial
                                ? "border-amber-200/80 bg-gradient-to-br from-amber-50/20 via-white to-white hover:border-amber-300"
                                : "border-slate-200 bg-white hover:border-blue-200"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug break-words">
                                  {ev.title}
                                </h4>
                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0" title="Unique Class Tracking ID">
                                  {ev.classCode || formatClassId(ev)}
                                </span>

                                {isTrial ? (
                                  <>
                                    <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold shrink-0">
                                      🎯 30-Min Free Trial
                                    </Badge>
                                    <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium shrink-0">
                                      Free Session (0 Tokens)
                                    </Badge>
                                  </>
                                ) : (
                                  <>
                                    <Badge className="bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-bold shrink-0">
                                      📚 Enrolled {getEventDurationHours(ev.title, ev.description) > 1 ? `${getEventDurationHours(ev.title, ev.description)}-Hour` : "1-Hour"} Class
                                    </Badge>
                                    <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold shrink-0">
                                      💰 Paid Class ({getEventDurationHours(ev.title, ev.description)}h Payout)
                                    </Badge>
                                  </>
                                )}

                                <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold shrink-0">
                                  ✓ Completed
                                </Badge>
                                {ev.course?.subjectCode && (
                                  <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold shrink-0">
                                    {ev.course.subjectCode}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-4 flex-wrap">
                                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>Scheduled:</span>
                                  <strong className="text-slate-800 font-mono">
                                    {new Date(ev.dueDate).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </strong>
                                </span>

                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>Session Type:</span>
                                  <strong className={`font-semibold ${isTrial ? "text-amber-800" : "text-blue-800"}`}>
                                    {isTrial
                                      ? "30 Minutes (Free Consultation)"
                                      : `${getEventDurationMinutes(ev.title, ev.description)} Minutes (${getEventDurationHours(ev.title, ev.description)}-Hour Class)`}
                                  </strong>
                                </span>

                                <span className="flex items-center gap-1.5">
                                  <Coins className={`w-3.5 h-3.5 ${isTrial ? "text-slate-400" : "text-emerald-600"} shrink-0`} />
                                  <span>Tutor Income:</span>
                                  <strong className={`font-bold ${isTrial ? "text-slate-500 font-mono" : "text-emerald-700"}`}>
                                    {isTrial ? "Rs. 0 (Free Trial)" : "Credited to Monthly Ledger"}
                                  </strong>
                                </span>
                              </div>
                            </div>

                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            {ev.recordingUrl && (
                              <a
                                href={ev.recordingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-8.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all whitespace-nowrap"
                              >
                                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                                <span>Watch Recording</span>
                              </a>
                            )}
                            <button
                              onClick={() => handleSyncMeeting(ev.id)}
                              disabled={syncingEventId === ev.id}
                              className="h-8.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                              title="Sync timing & recording from BigBlueButton"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${syncingEventId === ev.id ? "animate-spin" : ""}`} />
                              <span>{syncingEventId === ev.id ? "Syncing..." : "Sync BBB"}</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Started:</span>
                              <span className="font-mono text-xs font-semibold text-slate-800">
                                {ev.startedAt
                                  ? new Date(ev.startedAt).toLocaleString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "Not recorded"}
                              </span>
                            </div>

                            <span className="text-slate-300 hidden sm:inline">•</span>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ended:</span>
                              <span className="font-mono text-xs font-semibold text-slate-800">
                                {ev.endedAt
                                  ? new Date(ev.endedAt).toLocaleString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "Completed"}
                              </span>
                            </div>

                            <span className="text-slate-300 hidden sm:inline">•</span>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration:</span>
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                {formatSessionDuration(ev.startedAt, ev.endedAt)}
                              </span>
                              {isTrial ? (
                                <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  30-Min Free Trial
                                </span>
                              ) : (
                                <span className="text-[10px] text-blue-800 font-semibold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                  {getEventDurationHours(ev.title, ev.description) > 1
                                    ? `${getEventDurationHours(ev.title, ev.description)}-Hour Class`
                                    : "1-Hour Class"}
                                </span>
                              )}
                            </div>

                            {ev.actualStartTime && ev.actualEndTime && (
                              <>
                                <span className="text-slate-300 hidden sm:inline">•</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">BBB Verified:</span>
                                  <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    {new Date(ev.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(ev.actualEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {ev.attendanceCount ? ` (${ev.attendanceCount} attended)` : ""}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>
                )}
              </div>
            )}

            {centerTab === "students" && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      Enrolled Students Directory ({filteredStudents.length})
                    </h3>

                    <div className="flex items-center gap-2">
                      <div className="relative w-full sm:w-44">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search student..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <select
                        value={selectedCourseFilter}
                        onChange={(e) => setSelectedCourseFilter(e.target.value)}
                        className="py-1 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
                      >
                        <option value="ALL">All Classes</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.subjectCode || c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 italic">
                      No students match your query.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredStudents.map((st) => (
                        <div
                          key={st.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-2.5"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                                {st.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-bold text-xs text-slate-900">{st.name}</h4>
                                  {st.studentId && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                      {st.studentId}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500">{st.headline || "Enrolled Student"}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => setSelectedStudentForModal(st)}
                              className="text-slate-400 hover:text-slate-700 p-1"
                              title="View Student Details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {st.enrolledCourses.map((c, idx) => (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-1 text-[10px] pl-2 pr-1 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-900 font-semibold"
                              >
                                <span className="truncate max-w-[130px]" title={c.courseTitle}>
                                  {c.courseTitle}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnenrollStudent(st.id, st.name, c.courseId, c.courseTitle);
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors cursor-pointer"
                                  title={`Remove ${st.name} from ${c.courseTitle}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                            <button
                              onClick={() => openChatWithStudent(st.id)}
                              className="flex-1 py-1 text-center rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold flex items-center justify-center gap-1"
                            >
                              <MessageSquareLock className="w-3 h-3 text-blue-600" />
                              <span>Message</span>
                            </button>

                            <button
                              onClick={() => openScheduleForStudent(st)}
                              className="flex-1 py-1 text-center rounded-md bg-[#0c2461] hover:bg-[#103080] text-white text-[11px] font-bold"
                            >
                              1-on-1 Class
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {centerTab === "trials" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
                  <div className="border-b border-slate-100 pb-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0c2461] flex items-center justify-center font-bold">
                            <CalendarCheck className="w-5 h-5" />
                          </div>
                          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                            <span>Student 1-on-1 Free Trial Bookings</span>
                            <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-xs font-bold font-mono">
                              {trials.length}
                            </Badge>
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                          Review incoming student requests, set/confirm official session dates, and launch 1-on-1 BigBlueButton trial sessions.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 pt-1">
                      {[
                        { key: "ALL", label: "All", count: trials.length },
                        { key: "PENDING", label: "Needs Date", count: trials.filter((t) => t.status === "PENDING").length },
                        { key: "CONFIRMED", label: "Scheduled", count: trials.filter((t) => t.status === "CONFIRMED" && !t.actualEndTime).length },
                        { key: "COMPLETED", label: "Completed", count: trials.filter((t) => t.status === "COMPLETED" || Boolean(t.actualEndTime)).length },
                        { key: "CANCELLED", label: "Declined", count: trials.filter((t) => t.status === "CANCELLED" || t.status === "REJECTED").length },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setTrialFilter(tab.key as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                            trialFilter === tab.key
                              ? "bg-[#0c2461] text-white shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                              trialFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {trials.filter((t) => {
                    if (trialFilter === "ALL") return true;
                    if (trialFilter === "COMPLETED") return t.status === "COMPLETED" || Boolean(t.actualEndTime);
                    if (trialFilter === "CONFIRMED") return t.status === "CONFIRMED" && !t.actualEndTime;
                    if (trialFilter === "CANCELLED") return t.status === "CANCELLED" || t.status === "REJECTED";
                    return t.status === trialFilter;
                  }).length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <span>No trial bookings found under &quot;{trialFilter.toLowerCase()}&quot; filter.</span>
                    </div>
                  ) : (
                    <div className="max-h-[520px] lg:max-h-[calc(100vh-320px)] overflow-y-auto pr-1.5 space-y-4">
                      {trials
                        .filter((t) => {
                          if (trialFilter === "ALL") return true;
                          if (trialFilter === "COMPLETED") return t.status === "COMPLETED" || Boolean(t.actualEndTime);
                          if (trialFilter === "CONFIRMED") return t.status === "CONFIRMED" && !t.actualEndTime;
                          if (trialFilter === "CANCELLED") return t.status === "CANCELLED" || t.status === "REJECTED";
                          return t.status === trialFilter;
                        })
                        .sort((a, b) => {
                          const timeA = new Date(a.createdAt || a.preferredDate || 0).getTime();
                          const timeB = new Date(b.createdAt || b.preferredDate || 0).getTime();
                          return timeB - timeA;
                        })
                        .map((tr) => {
                          const isCompleted = tr.status === "COMPLETED" || Boolean(tr.actualEndTime);
                          const isPending = tr.status === "PENDING";
                          const isConfirmed = tr.status === "CONFIRMED" && !isCompleted;
                          const isCancelled = tr.status === "CANCELLED" || tr.status === "REJECTED";

                          const isTrialLive = events.some(
                            (e) => (e.status === "LIVE" && !e.endedAt) &&
                            (e.description?.includes(tr.id) || (tr.studentId && e.userId === tr.studentId && e.title?.toLowerCase().includes("trial")))
                          ) || (Boolean(tr.actualStartTime) && !tr.actualEndTime && tr.status !== "COMPLETED");

                          const dateFormatted = formatDateInTimezone(tr.preferredDate, tutorTimezone, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                          const timeFormatted = formatTimeInTimezone(tr.preferredDate, tutorTimezone, {
                            includeAbbr: false,
                          });
                          const studentTz = tr.timezone || tr.student?.timezone;

                          const initials = (tr.studentName || "Student")
                            .split(" ")
                            .map((n: string) => n[0])
                            .filter(Boolean)
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();

                          return (
                            <div
                              key={tr.id}
                              className={`rounded-2xl border transition-all p-5 sm:p-6 space-y-4 shadow-xs hover:shadow-sm ${
                                isTrialLive
                                  ? "bg-red-50/40 border-red-300 ring-2 ring-red-400/20"
                                  : isPending
                                  ? "bg-blue-50/30 border-blue-200"
                                  : isConfirmed
                                  ? "bg-white border-slate-200 hover:border-blue-300"
                                  : "bg-slate-50 border-slate-200 opacity-70"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0c2461] to-[#1e3799] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="font-extrabold text-base text-slate-900 leading-snug">
                                        {tr.studentName}
                                      </h4>
                                      <Badge className="bg-blue-50 text-blue-900 border-blue-200 font-bold text-[11px] px-2.5 py-0.5">
                                        {tr.course?.title || "London A/L Tutorial"}
                                      </Badge>
                                    </div>
                                    {studentTz && (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                        <CountryFlag countryCode={getTimezoneCountryCode(studentTz)} size="xs" />
                                        <span className="text-[11px] font-medium text-slate-600">
                                          Student Region: {studentTz.replace(/_/g, " ")}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 self-start sm:self-center">
                                  {isCompleted ? (
                                    <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs px-3 py-1 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>✓ Completed</span>
                                    </Badge>
                                  ) : isTrialLive ? (
                                    <Badge className="bg-red-600 text-white font-extrabold text-xs px-3 py-1 flex items-center gap-1.5 shadow-xs animate-pulse">
                                      <Radio className="w-3.5 h-3.5 text-white" />
                                      <span>● LIVE NOW</span>
                                    </Badge>
                                  ) : isPending ? (
                                    <Badge className="bg-[#0c2461] text-white font-bold text-xs px-3 py-1 animate-pulse">
                                      ⏳ Action Needed: Set Date
                                    </Badge>
                                  ) : isConfirmed ? (
                                    <Badge className="bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs px-3 py-1 flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Scheduled</span>
                                    </Badge>
                                  ) : isCancelled ? (
                                    <Badge className="bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1">
                                      Declined / Cancelled
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>

                              {isPending && Array.isArray(tr.preferredDates) && tr.preferredDates.length > 1 ? (
                                <div className="p-3.5 rounded-xl border bg-blue-50/80 border-blue-200 text-blue-950 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Student&apos;s 3 Preferred Time Options (Select 1 when confirming):</span>
                                    </div>
                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                                      {tr.preferredDates.length} Options
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {tr.preferredDates.map((optStr: string, idx: number) => {
                                      const optDate = formatDateInTimezone(optStr, tutorTimezone, {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                      });
                                      const optTime = formatTimeInTimezone(optStr, tutorTimezone, {
                                        includeAbbr: false,
                                      });
                                      return (
                                        <div
                                          key={idx}
                                          className="p-2.5 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                                              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold inline-flex items-center justify-center">
                                                {idx + 1}
                                              </span>
                                              <span>Choice {idx + 1}</span>
                                            </span>
                                            {idx === 0 && (
                                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded">Primary</span>
                                            )}
                                          </div>
                                          <div className="text-xs font-bold text-slate-900">{optDate}</div>
                                          <div className="text-xs font-mono font-extrabold text-blue-700 flex items-center gap-1.5">
                                            <CountryFlag countryCode={getTimezoneCountryCode(tutorTimezone)} size="xs" />
                                            <span>{optTime}</span>
                                          </div>
                                          {studentTz && studentTz !== tutorTimezone && (
                                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                              <span className="text-slate-400">Student:</span>
                                              <CountryFlag countryCode={getTimezoneCountryCode(studentTz)} size="xs" />
                                              <span className="font-mono">{formatTimeInTimezone(optStr, studentTz, { includeAbbr: false })}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                    isConfirmed
                                      ? "bg-blue-50/70 border-blue-200/80 text-blue-950"
                                      : isPending
                                      ? "bg-blue-50/80 border-blue-200 text-blue-950"
                                      : "bg-slate-50 border-slate-200 text-slate-800"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                        isConfirmed
                                          ? "bg-blue-100 text-blue-700"
                                          : isPending
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-slate-200 text-slate-700"
                                      }`}
                                    >
                                      <Clock className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div
                                        className={`text-[10px] font-extrabold uppercase tracking-wider ${
                                          isConfirmed ? "text-blue-700" : isPending ? "text-blue-700" : "text-slate-500"
                                        }`}
                                      >
                                        {isPending ? "Student Requested Slot" : "Confirmed Consultation Slot"}
                                      </div>
                                      <div className="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-1.5 mt-0.5">
                                        <span>{dateFormatted}</span>
                                        <span className="text-slate-400">•</span>
                                        <span className="inline-flex items-center gap-1.5 font-mono text-blue-700 font-extrabold">
                                          <CountryFlag countryCode={getTimezoneCountryCode(tutorTimezone)} size="xs" />
                                          <span>{timeFormatted}</span>
                                        </span>
                                        <span className="text-xs font-semibold text-slate-500">(30 mins)</span>
                                        {studentTz && studentTz !== tutorTimezone && (
                                          <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1.5">
                                            <span>Student time:</span>
                                            <CountryFlag countryCode={getTimezoneCountryCode(studentTz)} size="xs" />
                                            <strong className="font-mono">{formatTimeInTimezone(tr.preferredDate, studentTz, { includeAbbr: false })}</strong>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {tr.topic && (
                                <div className="text-xs text-slate-700 bg-slate-50/90 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                                  <div>
                                    <strong className="text-slate-900">Topic / Diagnostic Focus:</strong>{" "}
                                    <span className="text-slate-700">{tr.topic}</span>
                                  </div>
                                  {tr.notes && (
                                    <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                                      <strong>Session Notes:</strong> {tr.notes}
                                    </div>
                                  )}
                                </div>
                              )}

                              {(tr as any).rejectionReason && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="font-bold">Admin Feedback:</strong>{" "}
                                    <span>{(tr as any).rejectionReason}</span>
                                  </div>
                                </div>
                              )}

                              <div className="border-t border-slate-100 pt-3.5 flex flex-wrap items-center justify-end gap-2.5">
                                {isCompleted ? (
                                  <>
                                    {tr.recordingUrl && (
                                      <a
                                        href={tr.recordingUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                                        <span>Watch Recording</span>
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleSyncMeeting(undefined, tr.id)}
                                      disabled={syncingTrialId === tr.id}
                                      className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                                      title="Sync timing & recording from BigBlueButton"
                                    >
                                      <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${syncingTrialId === tr.id ? "animate-spin" : ""}`} />
                                      <span>{syncingTrialId === tr.id ? "Syncing..." : "Sync BBB"}</span>
                                    </button>
                                    {tr.studentId && (
                                      <button
                                        type="button"
                                        onClick={() => openChatWithStudent(tr.studentId)}
                                        className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                        title="Open encrypted chat with student"
                                      >
                                        <MessageSquareLock className="w-3.5 h-3.5 text-blue-500" />
                                        <span>Chat with Student</span>
                                      </button>
                                    )}
                                  </>
                                ) : isPending ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openConfirmTrialModal(tr)}
                                      className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                      title="Review and set confirmed date for session"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>Set Date &amp; Confirm</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => openDeclineTrialModal(tr)}
                                      className="h-9 px-3.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Decline</span>
                                    </button>

                                    {tr.studentId && (
                                      <button
                                        type="button"
                                        onClick={() => openChatWithStudent(tr.studentId)}
                                        className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                        title="Open encrypted chat with student"
                                      >
                                        <MessageSquareLock className="w-3.5 h-3.5 text-blue-500" />
                                        <span>Chat with Student</span>
                                      </button>
                                    )}
                                  </>
                                ) : isConfirmed ? (
                                  <>
                                    {isTrialLive ? (
                                      <>
                                        <a
                                          href={`/api/meetings/join?trialId=${tr.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs animate-pulse cursor-pointer"
                                        >
                                          <Video className="w-4 h-4" />
                                          <span>Join Live Room</span>
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() => handleEndTrial(tr.id)}
                                          disabled={endingTrialId === tr.id}
                                          className="h-9 px-3.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          <span>{endingTrialId === tr.id ? "Ending..." : "End Session"}</span>
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => triggerStartTrialFlow(tr)}
                                          disabled={startingTrialId === tr.id || (hasAnyLiveSession && tr.id !== ongoingLiveTrial?.id)}
                                          className={`h-9 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs ${
                                            hasAnyLiveSession && tr.id !== ongoingLiveTrial?.id
                                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                              : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                          }`}
                                          title={
                                            hasAnyLiveSession && tr.id !== ongoingLiveTrial?.id
                                              ? `Another session ("${activeSessionTitle}") is currently active. Conclude it first.`
                                              : "Start live consultation session and open BigBlueButton room"
                                          }
                                        >
                                          <Play className="w-3.5 h-3.5 fill-current" />
                                          <span>{startingTrialId === tr.id ? "Starting..." : "Start Session"}</span>
                                        </button>
                                      </>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => router.push(`/trials/reschedule?trialId=${tr.id}`)}
                                      className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-900 hover:border-blue-300 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                      title="Reschedule session on dedicated page"
                                    >
                                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Reschedule</span>
                                    </button>

                                    <a
                                      href={buildGoogleCalendarUrl({
                                        title: `30-Min Trial: ${tr.studentName}`,
                                        description: `1-on-1 Consultation for ${tr.course?.title || "London A/L"}\nMeeting: ${tr.meetingLink || ""}`,
                                        dueDate: tr.preferredDate,
                                      })}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-9 px-3.5 rounded-xl bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs"
                                    >
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>Google Cal</span>
                                    </a>

                                    {tr.studentId && (
                                      <button
                                        type="button"
                                        onClick={() => openChatWithStudent(tr.studentId)}
                                        className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                        title="Open encrypted chat with student"
                                      >
                                        <MessageSquareLock className="w-3.5 h-3.5 text-blue-500" />
                                        <span>Chat with Student</span>
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1.5">
                                      <X className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Declined / Cancelled</span>
                                    </span>
                                  </>
                                )}

                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {centerTab === "enrollments" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <EnrollmentRequestsManager
                  tutorId={tutor?.id || ""}
                  tutorTimezone={tutorTimezone}
                />
              </div>
            )}

            {centerTab === "availability" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-blue-700 shrink-0" />
                    <div>
                      <span className="font-bold text-blue-900">Dedicated Availability Studio: </span>
                      <span className="text-blue-700">Open the full-screen page to set batch available times and configure clash-free slots.</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => router.push("/tutor/availability")}
                    className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-3.5 py-1.5 gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <span>Open as Full Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <TutorAvailabilityManager
                  tutor={tutor}
                  courses={courses}
                  events={events}
                  trials={trials}
                  onRefresh={fetchTutorData}
                />
              </div>
            )}

            {centerTab === "profile" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0c2461] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Dedicated Profile Customization Studio Available</h4>
                      <p className="text-xs text-blue-700">Open the full-width standalone studio with real-time public student preview card and live completeness checklist.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/tutor/profile")}
                    className="px-4 py-2 bg-[#0c2461] hover:bg-[#103080] text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span>Open Dedicated Studio</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#0c2461] text-white flex items-center justify-center shadow-md shadow-blue-950/20 shrink-0">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                          Instructor Profile & Studio Customization
                        </h2>
                        <p className="text-xs text-slate-500">
                          Personalize your public instructor identity, verified academic degrees, examiner accreditations, and bio.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveProfile()}
                        disabled={profileSaving}
                        className="px-5 py-2.5 rounded-xl bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold shadow-md shadow-blue-950/20 transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {profileSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-blue-200" />
                            <span>Save Profile Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {profileStatusMsg && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-in slide-in-from-top-2 duration-200 ${
                        profileStatusMsg.type === "success"
                          ? "bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs"
                          : "bg-red-50 text-red-900 border border-red-200 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {profileStatusMsg.type === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span>{profileStatusMsg.text}</span>
                      </div>
                      <button
                        onClick={() => setProfileStatusMsg(null)}
                        className="text-slate-400 hover:text-slate-700 p-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Camera className="w-4 h-4 text-blue-600" />
                          <span>Profile Picture & Photo Customization</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Upload a professional high-resolution photo. Students and parents will see this on course syllabi.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative group shrink-0">
                        <div className="w-28 h-28 rounded-2xl bg-blue-950 text-white overflow-hidden border-2 border-slate-200 shadow-lg ring-4 ring-blue-500/10 flex items-center justify-center">
                          {profileAvatar ? (
                            <img
                              src={profileAvatar}
                              alt="Profile Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-extrabold text-white">
                              {(profileName || tutorName || "T").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-xs font-bold gap-1 cursor-pointer"
                        >
                          <Camera className="w-5 h-5" />
                          <span>Change</span>
                        </button>
                      </div>

                      <div className="flex-1 space-y-3 w-full">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageFileChange}
                          accept="image/*"
                          className="hidden"
                        />

                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 rounded-xl bg-[#0c2461] hover:bg-blue-900 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Browse &amp; Upload Photo from Device</span>
                          </button>

                          {profileAvatar && (
                            <button
                              type="button"
                              onClick={() => {
                                setProfileAvatar("");
                                setProfileStatusMsg({
                                  type: "success",
                                  text: "Photo removed. Default avatar will be used.",
                                });
                              }}
                              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-semibold border border-slate-200 hover:border-red-200 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove Photo</span>
                            </button>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500">
                          Select a photo directly from your device files. Supports PNG, JPG, JPEG, and WEBP formats up to 5MB. Photo is automatically cropped and optimized.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span>Basic Identity & Designation</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Official instructor name, headline, and direct student contact numbers.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-bold text-xs text-slate-700 block">
                          Full Legal / Display Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          required
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Enter full legal / display name"
                          className="rounded-xl h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-xs text-slate-700 block">
                          Phone / WhatsApp Number
                        </label>
                        <Input
                          type="tel"
                          maxLength={18}
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(formatInternationalPhone(e.target.value))}
                          placeholder="Enter phone number"
                          className="rounded-xl h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-xs text-slate-700 block">
                        Academic Headline & Title
                      </label>
                      <Input
                        value={profileHeadline}
                        onChange={(e) => setProfileHeadline(e.target.value)}
                        placeholder="Enter academic headline or title"
                        className="rounded-xl h-9 text-xs"
                      />
                      <p className="text-[10px] text-slate-400">
                        This appears right underneath your name on all course pages and search cards.
                      </p>
                    </div>

                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                          <span>Academic Degrees & Educational Credentials</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Add university bachelor&apos;s, master&apos;s, and doctoral degrees with institution and graduation honors.
                        </p>
                      </div>
                      <Badge className="bg-blue-50 text-blue-800 text-[11px] font-bold self-start sm:self-center">
                        {profileDegrees.length} {profileDegrees.length === 1 ? "Degree" : "Degrees"} Listed
                      </Badge>
                    </div>

                    {profileDegrees.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 italic">
                        No academic degrees added yet. Fill out the form below to add your qualifications.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {profileDegrees.map((deg) => (
                          <div
                            key={deg.id}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-200 transition-all flex flex-col justify-between space-y-2 shadow-2xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-xs text-slate-900 leading-tight">
                                  {deg.degree}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDegree(deg.id)}
                                  className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer shrink-0"
                                  title="Remove Degree"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{deg.institution}</span>
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                              <span className="font-mono text-slate-500">Graduation: {deg.year}</span>
                              {deg.honors && (
                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                  {deg.honors}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <form onSubmit={handleAddDegree} className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 space-y-3">
                      <div className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-blue-600" />
                        <span>Add New Academic Degree</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Degree Name *</label>
                          <Input
                            required
                            placeholder="Degree title"
                            value={newDegreeTitle}
                            onChange={(e) => setNewDegreeTitle(e.target.value)}
                            className="bg-white rounded-xl h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Institution / University *</label>
                          <Input
                            required
                            placeholder="Institution / University"
                            value={newDegreeInst}
                            onChange={(e) => setNewDegreeInst(e.target.value)}
                            className="bg-white rounded-xl h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Graduation Year</label>
                          <Input
                            placeholder="Year"
                            value={newDegreeYear}
                            onChange={(e) => setNewDegreeYear(e.target.value)}
                            className="bg-white rounded-xl h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Honors / Distinctions (Optional)</label>
                          <Input
                            placeholder="Honors / Distinctions (Optional)"
                            value={newDegreeHonors}
                            onChange={(e) => setNewDegreeHonors(e.target.value)}
                            className="bg-white rounded-xl h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <Button
                          type="submit"
                          size="sm"
                          className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-4 gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Degree to Profile</span>
                        </Button>
                      </div>
                    </form>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span>Subject Specializations & Syllabus Expertise</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Highlight the specific units, exam boards, and advanced topics you teach.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {profileSpecs.map((spec, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>{spec}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSpec(spec)}
                            className="text-blue-500 hover:text-red-600 p-0.5 rounded-full"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add custom specialization subject or module..."
                        value={newSpecTag}
                        onChange={(e) => setNewSpecTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSpec();
                          }
                        }}
                        className="rounded-xl h-9 text-xs"
                      />
                      <Button
                        type="button"
                        onClick={() => handleAddSpec()}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl px-4 cursor-pointer shrink-0"
                      >
                        + Add Tag
                      </Button>
                    </div>

                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Quick Add Common Subjects:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Pure Mathematics (P1-P4)",
                          "Further Mechanics (FM1-FM2)",
                          "Statistics (S1-S2)",
                          "Further Pure (FP1-FP3)",
                          "Physics AS/A2 (Unit 1-6)",
                          "Chemistry AS/A2",
                          "Economics & Quantitative Methods",
                          "Cambridge IGCSE O/L",
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddSpec(preset)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[11px] font-semibold transition-all border border-slate-200 cursor-pointer"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          <span>Examiner Certifications & Teaching Accreditations</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Credentials and assessment examiner appointments from Pearson, Cambridge, or international boards.
                        </p>
                      </div>
                      <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[11px] font-bold">
                        {profileCerts.length} Certified
                      </Badge>
                    </div>

                    {profileCerts.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 italic">
                        No certifications added yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {profileCerts.map((cert) => (
                          <div
                            key={cert.id}
                            className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>{cert.title}</span>
                              </div>
                              <div className="text-[11px] text-slate-600 flex items-center gap-2">
                                <span>{cert.authority}</span>
                                <span>•</span>
                                <span className="font-mono text-slate-500">{cert.year}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCert(cert.id)}
                              className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                              title="Remove Certification"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <form onSubmit={handleAddCert} className="p-4 rounded-xl bg-blue-50/30 border border-blue-100 space-y-3">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-blue-600" />
                        <span>Add Examiner Accreditation</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Certification Title *</label>
                          <Input
                            required
                            placeholder="Certification title"
                            value={newCertTitle}
                            onChange={(e) => setNewCertTitle(e.target.value)}
                            className="bg-white rounded-xl h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Issuing Authority / Board</label>
                          <Input
                            placeholder="Issuing authority / Board"
                            value={newCertAuth}
                            onChange={(e) => setNewCertAuth(e.target.value)}
                            className="bg-white rounded-xl h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="w-36 space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Year Awarded</label>
                          <Input
                            placeholder="Year"
                            value={newCertYear}
                            onChange={(e) => setNewCertYear(e.target.value)}
                            className="bg-white rounded-xl h-8 text-xs"
                          />
                        </div>

                        <Button
                          type="submit"
                          size="sm"
                          className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-4 gap-1.5 cursor-pointer mt-4"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Certification</span>
                        </Button>
                      </div>
                    </form>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Comprehensive Biography & Teaching Philosophy</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Describe your academic background, student pass rate accomplishments, error-checking methods, and class format.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <textarea
                        rows={6}
                        value={profileAbout}
                        onChange={(e) => setProfileAbout(e.target.value)}
                        placeholder="Describe your academic background, teaching approach, and subject expertise..."
                        className="w-full p-3.5 rounded-xl border border-slate-200 text-xs leading-relaxed resize-y focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Markdown supported</span>
                        <span>{profileAbout.length} characters</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <span>Professional & Research Links</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Connect your verified external academic profiles, LinkedIn, and personal portfolio.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">LinkedIn Profile</label>
                        <Input
                          placeholder="https://linkedin.com/in/..."
                          value={profileLinkedin}
                          onChange={(e) => setProfileLinkedin(e.target.value)}
                          className="rounded-xl h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">ResearchGate / ORCID</label>
                        <Input
                          placeholder="https://researchgate.net/profile/..."
                          value={profileResearchGate}
                          onChange={(e) => setProfileResearchGate(e.target.value)}
                          className="rounded-xl h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">Personal Academic Website</label>
                        <Input
                          placeholder="https://yourname.com"
                          value={profileWebsite}
                          onChange={(e) => setProfileWebsite(e.target.value)}
                          className="rounded-xl h-9 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950 via-[#0c2461] to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-white flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-blue-300" />
                        <span>Ready to update your public credentials?</span>
                      </h4>
                      <p className="text-xs text-blue-200">
                        Saved changes immediately synchronize to your course pages and student directories.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveProfile()}
                        disabled={profileSaving}
                        className="px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-black shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {profileSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            <span>Saving Profile...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            <span>Save Profile Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>

          <aside className="lg:col-span-3 space-y-4 order-3 lg:order-3">
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Upcoming Classes
                </h3>
                <span className="text-[11px] font-bold text-blue-700 font-mono">
                  {upcomingEvents.length} Scheduled
                </span>
              </div>

              <div className="space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    No scheduled sessions.
                  </p>
                ) : (
                  upcomingEvents.slice(0, 4).map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="font-bold text-slate-900 truncate">{ev.title}</div>
                        {ev.status === "LIVE" && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-600 text-white animate-pulse shrink-0">
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                        <span>
                          {new Date(ev.dueDate).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-blue-600 font-semibold">Live Class</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <CalendarCheck className="w-3 h-3 text-blue-600" />
                  <span>Synced with Tutor Schedule</span>
                </span>
                <button
                  onClick={goToToday}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Jump to Today
                </button>
              </div>
            </div>

          </aside>

        </div>

      </main>

      {showStartSessionModal && startSessionTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Start Live Meeting</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[240px]">{startSessionTarget.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowStartSessionModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>BigBlueButton Classroom Connected</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full">Automated</span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  A unique, secure BigBlueButton classroom is automatically created with full moderator controls, whiteboard tools, and automatic server-side recording.
                </p>
                {startSessionTarget.currentLink && !isGenericMeetingLink(startSessionTarget.currentLink) && (
                  <div className="text-[11px] font-mono bg-white/80 p-2 rounded-lg border border-emerald-200 text-emerald-800 truncate">
                    Ready Room: {startSessionTarget.currentLink}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
                <div className="font-bold text-blue-950 text-[11px] flex items-center gap-1">
                  <span>🎥 BigBlueButton Automatic Recording</span>
                </div>
                <p className="text-[10px] text-blue-800 leading-snug">
                  Classes are recorded automatically on the server when active. When the session finishes, BigBlueButton processes the video and EduPulse links the playback to your dashboard.
                </p>
              </div>

              <form onSubmit={handleStartLiveSession} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block text-[11px]">
                    Custom Room URL (Optional override)
                  </label>
                  <Input
                    placeholder="Leave empty to auto-generate BigBlueButton room"
                    value={startSessionMeetLink}
                    onChange={(e) => setStartSessionMeetLink(e.target.value)}
                    className="rounded-xl h-9.5 text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-400">
                    If left blank, a dedicated BigBlueButton classroom will be generated automatically.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStartSessionModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isStartingSession}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-5 gap-1.5 cursor-pointer shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isStartingSession ? "Launching Classroom..." : "Start Session & Open Room"}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#0c2461] text-white">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Schedule Live Classroom Session
                  </h3>
                  <p className="text-xs text-slate-500">
                    Broadcast an interactive live class to students
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleClass} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Class Audience Target
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleMode("COURSE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      scheduleMode === "COURSE"
                        ? "bg-blue-50 border-blue-300 text-blue-700 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Whole Course Cohort</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode("STUDENT")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      scheduleMode === "STUDENT"
                        ? "bg-blue-50 border-blue-300 text-blue-700 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                    <span>1-on-1 Student Mentoring</span>
                  </button>
                </div>
              </div>

              {scheduleMode === "COURSE" ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Select Course Cohort <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newClassCourseId}
                    onChange={(e) => setNewClassCourseId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.subjectCode ? `[${c.subjectCode}] ` : ""}{c.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Select Student <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newClassStudentId}
                    onChange={(e) => setNewClassStudentId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium"
                    required
                  >
                    <option value="">Choose a student...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>

                  {newClassStudentId && (
                    <div className="mt-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>Student&apos;s Preferred Study Hours</span>
                        </span>
                        {selectedStudentAvailabilities.length > 0 && (
                          <span className="text-[10px] text-blue-700 font-semibold">Click slot to auto-fill</span>
                        )}
                      </div>

                      {selectedStudentAvailabilities.length === 0 ? (
                        <div className="text-[11px] text-blue-800/80 italic">
                          This student has not set custom study hours yet.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {selectedStudentAvailabilities.map((av, idx) => {
                            const daysMap: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
                            const dayName = av.dayOfWeek !== null ? daysMap[Number(av.dayOfWeek)] || "Day" : av.specificDate?.slice(0, 10);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => applyStudentSlotToClassDate(av)}
                                className="px-2 py-1 rounded-lg bg-white hover:bg-blue-100 border border-blue-200 text-[10px] font-bold text-blue-900 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                title="Click to auto-schedule on student's study day & time"
                              >
                                <span>{dayName}: {av.startTime} – {av.endTime}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Academic Level / Curriculum Tier
                </label>
                <select
                  value={newClassAcademicLevel}
                  onChange={(e) => setNewClassAcademicLevel(e.target.value as any)}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium"
                >
                  <option value="AUTO">Auto-detect from Course / Student Level</option>
                  <option value="AL">London A/L (IAL &amp; IAS - Rs. 850/hr)</option>
                  <option value="OL">London O/L (IGCSE - Rs. 750/hr)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Class Topic / Title <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Class topic or title"
                  value={newClassTitle}
                  onChange={(e) => setNewClassTitle(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Scheduled Date & Time <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={newClassDate}
                  onChange={(e) => setNewClassDate(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
                {scheduleClassConflict && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2 mt-1.5 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      ⚠️ Conflict: &ldquo;{scheduleClassConflict.title}&rdquo; is already scheduled from{" "}
                      {scheduleClassConflict.start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} to{" "}
                      {scheduleClassConflict.end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">
                    Classroom / Video URL (Optional)
                  </label>
                  <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    ✨ Auto-Generated if blank
                  </span>
                </div>
                <Input
                  placeholder="Leave empty to auto-generate BigBlueButton room or paste custom URL"
                  value={newClassMeetingLink}
                  onChange={(e) => setNewClassMeetingLink(e.target.value)}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Session Notes / Agenda (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Topics to be covered, required formula books, etc."
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={schedulingClass}
                  className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-5 gap-1.5 cursor-pointer shadow-md"
                >
                  {schedulingClass ? "Scheduling..." : "📅 Schedule Live Class"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0c2461] text-white flex items-center justify-center shadow-sm">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {rescheduleTargetEvent ? "Reschedule Live Class Session" : "Reschedule 1-on-1 Consultation"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update scheduled date & time and automatically notify students
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            {rescheduleStatusMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  rescheduleStatusMsg.type === "success"
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {rescheduleStatusMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{rescheduleStatusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleConfirmReschedule} className="space-y-4 text-xs">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1">
                <div className="font-bold text-blue-950 text-xs">
                  {rescheduleTargetEvent?.title || rescheduleTargetTrial?.topic || "Consultation Session"}
                </div>
                <div className="text-[11px] text-slate-600">
                  {rescheduleTargetEvent?.course?.title || rescheduleTargetTrial?.course?.title || "London A/L Individual Class"}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  New Scheduled Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {rescheduleTargetEvent && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">
                    Classroom / Video URL (Optional)
                  </label>
                  <Input
                    placeholder="https://..."
                    value={rescheduleMeetingLink}
                    onChange={(e) => setRescheduleMeetingLink(e.target.value)}
                    className="rounded-xl h-9 text-xs font-mono"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Reschedule Notes / Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Reason for reschedule..."
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2.5">
                {rescheduleTargetEvent && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowRescheduleModal(false);
                      router.push(`/classes/reschedule?eventId=${encodeURIComponent(rescheduleTargetEvent.id)}`);
                    }}
                    className="text-xs text-blue-700 hover:text-blue-800 flex items-center gap-1.5"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>Open Availability Studio</span>
                  </Button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRescheduleModal(false)}
                  >
                    Cancel
                  </Button>
                <Button
                  type="submit"
                  disabled={rescheduling || !rescheduleDate}
                  className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-5 gap-1.5 cursor-pointer shadow-md"
                >
                  {rescheduling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Rescheduling...</span>
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span>Confirm Reschedule</span>
                    </>
                  )}
                </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#0c2461] text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  {selectedStudentForModal.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-sm text-slate-900">
                      {selectedStudentForModal.name}
                    </h3>
                    {selectedStudentForModal.studentId && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        {selectedStudentForModal.studentId}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {selectedStudentForModal.headline || "London A/L Student"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Communication:</span>
                  <span className="font-semibold text-slate-800">Use LMS Encrypted Chat</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-slate-700">Enrolled Classes ({selectedStudentForModal.enrolledCourses.length}):</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedStudentForModal.enrolledCourses.map((c, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-blue-900 truncate block">{c.courseTitle}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Enrolled: {new Date(c.enrolledAt).toLocaleDateString("en-US")}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnenrollStudent(selectedStudentForModal.id, selectedStudentForModal.name, c.courseId, c.courseTitle)}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-bold text-xs h-7 rounded-lg shrink-0 cursor-pointer"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudentForModal(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const s = selectedStudentForModal;
                  setSelectedStudentForModal(null);
                  openChatWithStudent(s.id);
                }}
                className="bg-[#0c2461] hover:bg-[#103080] text-white gap-1.5"
              >
                <MessageSquareLock className="w-3.5 h-3.5" />
                <span>Open Chat</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {showConfirmTrialModal && confirmingTrial && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex">
          <div className="bg-slate-50 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Sticky Header */}
            <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4.5 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#0c2461] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-slate-900">
                      Set Date &amp; Confirm Trial Session
                    </h3>
                    <Badge className="bg-blue-100 text-blue-800 text-[10px] font-extrabold border-blue-200">
                      1-on-1 Trial
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select the student&apos;s preferred time slot, confirm classroom session details, and schedule the session
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmTrialModal(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleConfirmTrialSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-6">
                  {confirmTrialStatusMsg && (
                    <div
                      className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 border shadow-xs ${
                        confirmTrialStatusMsg.type === "success"
                          ? "bg-blue-50 text-blue-900 border-blue-200"
                          : "bg-red-50 text-red-900 border-red-200"
                      }`}
                    >
                      {confirmTrialStatusMsg.type === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                      <span>{confirmTrialStatusMsg.text}</span>
                    </div>
                  )}

                  {/* Student & Course Summary Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                        {confirmingTrial.studentName?.charAt(0)?.toUpperCase() || "S"}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-base text-slate-900">
                            {confirmingTrial.studentName}
                          </h4>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                            Student
                          </span>
                        </div>
                        {(confirmingTrial.timezone || confirmingTrial.student?.timezone) && (
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <CountryFlag countryCode={getTimezoneCountryCode(confirmingTrial.timezone || confirmingTrial.student?.timezone)} size="xs" />
                            <span className="text-[11px] font-medium text-slate-600">Student Region: {(confirmingTrial.timezone || confirmingTrial.student?.timezone).replace(/_/g, " ")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="sm:text-right space-y-1 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <div className="text-xs text-slate-500">
                        Course: <span className="font-bold text-slate-800">{confirmingTrial.course?.title || "London A/L Individual Class"}</span>
                      </div>
                      {confirmingTrial.topic && (
                        <div className="text-xs text-slate-500">
                          Topic: <span className="font-medium text-slate-700">{confirmingTrial.topic}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preferred Time Slots Picker */}
                  {(() => {
                    const requestedSlots: string[] =
                      Array.isArray(confirmingTrial.preferredDates) && confirmingTrial.preferredDates.length > 0
                        ? confirmingTrial.preferredDates
                        : [confirmingTrial.preferredDate];

                    return (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CalendarCheck className="w-5 h-5 text-blue-600" />
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                              Confirm 1 Time Slot (From Student&apos;s Choices)
                            </h4>
                            <span className="text-red-500 font-bold">*</span>
                          </div>
                          <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
                            Pick 1 of {requestedSlots.length}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {requestedSlots.map((slotStr: string, idx: number) => {
                            const isSelected = selectedSlotIndex === idx;
                            const dateFormatted = formatDateInTimezone(slotStr, tutorTimezone, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            });
                            const timeFormatted = formatTimeInTimezone(slotStr, tutorTimezone, {
                              includeAbbr: false,
                            });
                            const tutorFlag = getTimezoneCountryCode(tutorTimezone);
                            const studentTz = confirmingTrial.timezone || confirmingTrial.student?.timezone;
                            const studentFlag = studentTz ? getTimezoneCountryCode(studentTz) : undefined;

                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  setSelectedSlotIndex(idx);
                                  setConfirmDate(formatForDateTimeInput(new Date(slotStr)));
                                }}
                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isSelected
                                    ? "bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/20 shadow-sm"
                                    : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/60"
                                }`}
                              >
                                <div className="flex items-center gap-3.5">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors shadow-xs ${
                                      isSelected
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-100 text-slate-500 border border-slate-200"
                                    }`}
                                  >
                                    {isSelected ? "✓" : idx + 1}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-extrabold text-slate-900">
                                        Choice {idx + 1} {idx === 0 ? "(Student 1st Preference)" : ""}
                                      </span>
                                      {isSelected && (
                                        <Badge className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider">
                                          Confirmed Selection
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2 mt-1">
                                      <span>{dateFormatted}</span>
                                      <span className="text-slate-300">•</span>
                                      <div className="inline-flex items-center gap-1.5 bg-blue-50/80 px-2.5 py-0.5 rounded-lg border border-blue-100">
                                        <CountryFlag countryCode={tutorFlag} size="xs" />
                                        <span className="font-mono text-blue-700 font-extrabold">{timeFormatted}</span>
                                      </div>
                                      <span className="text-xs text-slate-400 font-normal">(30 mins)</span>
                                    </div>
                                  </div>
                                </div>

                                {studentTz && studentTz !== tutorTimezone && (
                                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-xs text-slate-500 shrink-0 bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-xl border border-slate-100 sm:border-0">
                                    <span className="text-slate-400 block text-[11px]">Student time:</span>
                                    <div className="inline-flex items-center gap-1.5 mt-0.5">
                                      <CountryFlag countryCode={studentFlag} size="xs" />
                                      <span className="font-mono font-bold text-slate-800">
                                        {formatTimeInTimezone(slotStr, studentTz, { includeAbbr: false })}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Active Date / Custom override */}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span className="font-bold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              <span>Active Session Time (Tutor Local Time):</span>
                            </span>
                            {confirmDate && (
                              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                <CountryFlag countryCode={getTimezoneCountryCode(tutorTimezone)} size="xs" />
                                <span>{formatTimeInTimezone(new Date(confirmDate), tutorTimezone, { includeAbbr: false })}</span>
                              </div>
                            )}
                          </div>
                          <input
                            type="datetime-local"
                            required
                            value={confirmDate}
                            onChange={(e) => {
                              setConfirmDate(e.target.value);
                              setSelectedSlotIndex(-1);
                            }}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                          />
                          <p className="text-[11px] text-slate-400">
                            Select one of the student&apos;s preferred options above to auto-fill, or manually adjust date/time if needed.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2-Column Grid for BigBlueButton Link and Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800 text-xs flex items-center gap-2">
                          <Video className="w-4 h-4 text-blue-600" />
                          <span>BigBlueButton Classroom Link</span>
                        </label>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ✨ Auto-Generated
                        </span>
                      </div>
                      <Input
                        placeholder="Auto-generated unique room (or paste custom URL)"
                        value={confirmMeetLink}
                        onChange={(e) => setConfirmMeetLink(e.target.value)}
                        className="rounded-xl h-11 text-xs font-mono bg-white border-slate-300"
                      />
                      <p className="text-[11px] text-slate-500">
                        Leave blank to automatically generate a dedicated BigBlueButton classroom for this session, or paste a custom link.
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                      <label className="font-bold text-slate-800 text-xs flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Tutor Preparation Notes (Optional)</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Notes or instructions for student (e.g. please bring past papers or syllabus notes)..."
                        value={confirmNotes}
                        onChange={(e) => setConfirmNotes(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                      />
                      <p className="text-[11px] text-slate-400">
                        These notes will be displayed to the student on their dashboard and confirmation email.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="bg-white border-t border-slate-200 px-6 sm:px-8 py-4 flex items-center justify-between shrink-0 shadow-xs">
                <div className="text-xs text-slate-500 hidden sm:block">
                  Trial session duration is set to <strong className="text-slate-800">30 minutes</strong>.
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowConfirmTrialModal(false)}
                    className="rounded-xl text-xs h-10 px-5 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingConfirmTrial}
                    className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl h-10 px-6 gap-2 cursor-pointer shadow-md"
                  >
                    {isSubmittingConfirmTrial ? "Confirming..." : "✓ Confirm & Schedule Session"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeclineTrialModal && decliningTrial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shadow-sm">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Decline Trial Request
                  </h3>
                  <p className="text-xs text-slate-500">
                    Notify student and cancel request
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeclineTrialModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeclineTrialSubmit} className="space-y-4 text-xs">
              <p className="text-xs text-slate-600">
                Are you sure you want to decline the trial booking from <strong>{decliningTrial.studentName}</strong>?
              </p>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Reason for Declining (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Reason for declining..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeclineTrialModal(false)}
                  className="rounded-xl text-xs"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingDeclineTrial}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl px-5 gap-1.5 cursor-pointer shadow-md"
                >
                  {isSubmittingDeclineTrial ? "Declining..." : "Confirm Decline"}
                </Button>
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

      <EncryptedChatDrawer
        isOpen={isChatDrawerOpen}
        onOpen={() => setIsChatDrawerOpen(true)}
        onClose={() => {
          setIsChatDrawerOpen(false);
          setActiveChatRecipientId(undefined);
        }}
        currentUser={
          tutor || {
            id: "instructor",
            name: tutorName,
            email: "tutor@edupulse.uk",
            role: "INSTRUCTOR",
          }
        }
        initialRecipientId={activeChatRecipientId}
      />

      <TutorFirstTimeAvailabilityModal
        isOpen={showFirstTimeAvailabilityModal}
        onClose={() => setShowFirstTimeAvailabilityModal(false)}
        tutor={tutor}
        onSuccess={() => {
          setHasConfiguredAvailability(true);
          setAvailabilityCount((prev) => prev + 1);
          fetchTutorData();
        }}
      />
    </div>
  );
}

export default function TutorDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
          <p className="text-sm font-semibold tracking-wider uppercase text-blue-200">
            Initializing Tutor Studio...
          </p>
        </div>
      }
    >
      <TutorDashboardContent />
    </Suspense>
  );
}
