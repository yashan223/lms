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
  PlayCircle,
  UserCheck,
  Mail,
  Phone,
  RefreshCw,
  Layers,
  Globe,
  Settings,
  Check,
  Upload,
  Camera,
  Sparkles,
  School,
  Briefcase,
  Share2,
  History,
  Coins,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { EncryptedChatDrawer } from "@/components/chat/EncryptedChatDrawer";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Footer } from "@/components/layout/Footer";
import { getSafeMeetingLink, normalizeGoogleMeetLink } from "@/lib/utils";
import { TutorAvailabilityManager } from "@/components/tutor/TutorAvailabilityManager";

const formatForDateTimeInput = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

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
  modules?: any[];
  materials?: any[];
  enrollments?: any[];
}

interface ScheduledClassEvent {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  type: string;
  status?: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED" | string;
  meetingLink?: string | null;
  startedAt?: string | Date | null;
  endedAt?: string | Date | null;
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
  } | null;
}

function TutorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [tutor, setTutor] = useState<any>(null);
  const [courses, setCourses] = useState<TutorCourse[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [events, setEvents] = useState<ScheduledClassEvent[]>([]);
  const [trials, setTrials] = useState<any[]>([]);

  const [navCoursesOpen, setNavCoursesOpen] = useState(true);

  const [courseSearch, setCourseSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState<"ALL" | "LIVE" | "SCHEDULED" | "COMPLETED">("ALL");

  const [centerTab, setCenterTab] = useState<
    "courses" | "classes" | "history" | "students" | "trials" | "earnings" | "profile" | "availability"
  >("courses");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "CLASSES" | "STUDENTS">("ALL");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile") {
      router.push("/tutor/profile");
      return;
    }
    if (
      tab === "courses" ||
      tab === "classes" ||
      tab === "history" ||
      tab === "students" ||
      tab === "trials" ||
      tab === "earnings" ||
      tab === "availability"
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

    const classMins = events.length * 90;
    const trialMins = trials.length * 30;
    return classMins + trialMins;
  }, [events, trials]);

  const totalTeachingHours = useMemo(() => {
    return (totalTeachingMinutes / 60).toFixed(1);
  }, [totalTeachingMinutes]);

  const completedTeachingHours = useMemo(() => {
    const completedClasses = events.filter((e) => e.status === "COMPLETED" || Boolean(e.endedAt)).length;
    return ((completedClasses * 90) / 60).toFixed(1);
  }, [events]);

  const completedSessions = useMemo(() => {
    return events.filter((e) => e.status === "COMPLETED" || Boolean(e.endedAt));
  }, [events]);

  const filteredHistory = useMemo(() => {
    return completedSessions.filter((ev) => {
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

  const effectiveHourlyRate = useMemo(() => {
    const hrs = Number(totalTeachingHours);
    if (hrs > 0 && tutorShareEarnings > 0) {
      return (tutorShareEarnings / hrs).toFixed(2);
    }
    return "65.00";
  }, [totalTeachingHours, tutorShareEarnings]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"COURSE" | "STUDENT">("COURSE");
  const [newClassStudentId, setNewClassStudentId] = useState("");
  const [newClassTitle, setNewClassTitle] = useState("");
  const [newClassCourseId, setNewClassCourseId] = useState("");
  const [newClassDate, setNewClassDate] = useState("");
  const [newClassMeetingLink, setNewClassMeetingLink] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [newClassType, setNewClassType] = useState("LIVE_SEMINAR");
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
    setNewClassDate(formatForDateTimeInput(target));
  };

  const scheduleClassConflict = useMemo(() => {
    if (!newClassDate) return null;
    const targetStart = new Date(newClassDate);
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

  const [showStartClassModal, setShowStartClassModal] = useState(false);
  const [startClassTargetEvent, setStartClassTargetEvent] = useState<ScheduledClassEvent | null>(null);
  const [startClassMeetLink, setStartClassMeetLink] = useState("");

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

  const [trialFilter, setTrialFilter] = useState<"ALL" | "PENDING" | "CONFIRMED" | "CANCELLED">("ALL");
  const [showConfirmTrialModal, setShowConfirmTrialModal] = useState(false);
  const [confirmingTrial, setConfirmingTrial] = useState<any | null>(null);
  const [confirmDate, setConfirmDate] = useState("");
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
  const [profileDegrees, setProfileDegrees] = useState<AcademicDegree[]>([
    {
      id: "deg-1",
      degree: "B.Sc. (Hons) in Pure Mathematics",
      institution: "Imperial College London",
      year: "2016",
      honors: "First Class Honours",
    },
    {
      id: "deg-2",
      degree: "M.Sc. in Applied Mathematics & Mechanics",
      institution: "University of Cambridge",
      year: "2018",
      honors: "Distinction",
    },
  ]);
  const [profileSpecs, setProfileSpecs] = useState<string[]>([
    "Pure Mathematics (P1-P4)",
    "Further Mechanics (M1-M3)",
    "Differential Equations & Calculus",
    "Pearson Edexcel IAL",
    "Cambridge International A/L",
  ]);
  const [profileCerts, setProfileCerts] = useState<AcademicCertification[]>([
    {
      id: "cert-1",
      title: "Certified Lead Examiner & Assessment Specialist",
      authority: "Pearson Edexcel International",
      year: "2021",
    },
    {
      id: "cert-2",
      title: "Fellow of the Higher Education Academy (FHEA)",
      authority: "Advance HE",
      year: "2019",
    },
  ]);
  const [profileExp, setProfileExp] = useState("10+ Years");
  const [profileRate, setProfileRate] = useState("65");
  const [profileHours, setProfileHours] = useState("Mon - Fri: 4:00 PM - 8:00 PM GMT");
  const [profileLinkedin, setProfileLinkedin] = useState("https://linkedin.com");
  const [profileResearchGate, setProfileResearchGate] = useState("https://researchgate.net");
  const [profileWebsite, setProfileWebsite] = useState("https://edupulse.uk");

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
      const res = await fetch("/api/tutor");
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
        setProfileHeadline(data.tutor.headline || "Senior Faculty Lecturer");
        setProfilePhone(data.tutor.phone || "");
        setProfileAvatar(data.tutor.avatar || "");

        let parsedAbout = "Senior Faculty Educator specializing in London A/L & O/L Pearson Edexcel and Cambridge curriculum with a focus on deep conceptual proofs, problem sets, and examination masterclasses.";
        let parsedDegrees: AcademicDegree[] = [
          {
            id: "deg-1",
            degree: "B.Sc. (Hons) in Pure Mathematics",
            institution: "Imperial College London",
            year: "2016",
            honors: "First Class Honours",
          },
          {
            id: "deg-2",
            degree: "M.Sc. in Applied Mathematics & Mechanics",
            institution: "University of Cambridge",
            year: "2018",
            honors: "Distinction",
          },
        ];
        let parsedSpecs: string[] = [
          "Pure Mathematics (P1-P4)",
          "Further Mechanics (M1-M3)",
          "Differential Equations & Calculus",
          "Pearson Edexcel IAL",
          "Cambridge International A/L",
        ];
        let parsedCerts: AcademicCertification[] = [
          {
            id: "cert-1",
            title: "Certified Lead Examiner & Assessment Specialist",
            authority: "Pearson Edexcel International",
            year: "2021",
          },
          {
            id: "cert-2",
            title: "Fellow of the Higher Education Academy (FHEA)",
            authority: "Advance HE",
            year: "2019",
          },
        ];
        let parsedExp = "10+ Years";
        let parsedRate = "65";
        let parsedHours = "Mon - Fri: 4:00 PM - 8:00 PM GMT";
        let parsedLinkedin = "https://linkedin.com";
        let parsedResearchGate = "https://researchgate.net";
        let parsedWebsite = "https://edupulse.uk";

        if (data.tutor.bio) {
          try {
            if (data.tutor.bio.trim().startsWith("{") && data.tutor.bio.trim().endsWith("}")) {
              const parsed = JSON.parse(data.tutor.bio);
              if (parsed.about) parsedAbout = parsed.about;
              if (Array.isArray(parsed.degrees) && parsed.degrees.length > 0) {
                parsedDegrees = parsed.degrees;
              }
              if (Array.isArray(parsed.specializations) && parsed.specializations.length > 0) {
                parsedSpecs = parsed.specializations;
              }
              if (Array.isArray(parsed.certifications) && parsed.certifications.length > 0) {
                parsedCerts = parsed.certifications;
              }
              if (parsed.experienceYears) parsedExp = parsed.experienceYears;
              if (parsed.hourlyRate) parsedRate = parsed.hourlyRate;
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
        setProfileHours(parsedHours);
        setProfileLinkedin(parsedLinkedin);
        setProfileResearchGate(parsedResearchGate);
        setProfileWebsite(parsedWebsite);
      }
      setCourses(data.courses || []);
      setStudents(data.students || []);
      setEvents(data.events || []);
      setTrials(data.trials || []);

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
      title: "Remove Student from Course",
      description: `Are you sure you want to remove ${studentName} from "${courseTitle}"? They will no longer have access to this course's syllabus and live classes.`,
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

  useEffect(() => {
    fetchTutorData(true);
  }, []);

  useRealtimeSync({
    events: ["COURSES_CHANGED", "ENROLLMENTS_CHANGED", "EVENTS_CHANGED", "USERS_CHANGED", "TRIALS_CHANGED"],
    onSync: () => {
      fetchTutorData(false);
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
          const isEnded = ev.status === "COMPLETED" || ev.status === "CANCELLED" || !!ev.endedAt;
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
        const isEnded = ev.status === "COMPLETED" || ev.status === "CANCELLED" || !!ev.endedAt;
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
      const isEnded = ev.status === "COMPLETED" || ev.status === "CANCELLED" || !!ev.endedAt;
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

        if (ev.status === "COMPLETED" || ev.status === "CANCELLED" || ev.endedAt) return false;

        if (ev.status === "LIVE") return true;

        return (ev.status === "SCHEDULED" || !ev.status) && new Date(ev.dueDate).getTime() >= now;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [events]);

  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassTitle.trim() || !newClassDate) return;

    try {
      setSchedulingClass(true);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule_class",
          title: newClassTitle.trim(),
          description: newClassDesc.trim(),
          meetingLink: newClassMeetingLink.trim(),
          scheduledDate: newClassDate,
          courseId: scheduleMode === "COURSE" ? newClassCourseId : null,
          studentId: scheduleMode === "STUDENT" ? newClassStudentId : null,
          tutorId: tutor?.id,
          type: newClassType,
        }),
      });

      if (res.ok) {
        setShowScheduleModal(false);
        setNewClassTitle("");
        setNewClassDesc("");
        setNewClassMeetingLink("");
        setNewClassDate("");
        fetchTutorData();
      }
    } catch (error) {
      console.error("Failed to schedule class:", error);
    } finally {
      setSchedulingClass(false);
    }
  };

  const triggerStartClassFlow = (ev: ScheduledClassEvent) => {
    const rawLink = ev.meetingLink?.trim() || "";
    if (rawLink && rawLink.startsWith("https://meet.google.com/") && !rawLink.endsWith("/new") && !rawLink.includes("edp-")) {
      handleStartClass(ev.id, rawLink);
    } else {
      setStartClassTargetEvent(ev);
      setStartClassMeetLink(rawLink && !rawLink.endsWith("/new") && !rawLink.includes("edp-") ? rawLink : "https://meet.google.com/new");
      setShowStartClassModal(true);
    }
  };

  const handleStartClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startClassTargetEvent) return;
    const finalLink = normalizeGoogleMeetLink(startClassMeetLink);
    setShowStartClassModal(false);
    await handleStartClass(startClassTargetEvent.id, finalLink);
  };

  const handleStartClass = async (eventId: string, existingMeetingLink?: string | null) => {
    try {
      setStartingClassId(eventId);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_class",
          eventId,
          meetingLink: existingMeetingLink,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchTutorData();
        if (data.meetingLink) {
          window.open(data.meetingLink, "_blank", "noopener,noreferrer");
        }
      }
    } catch (error) {
      console.error("Failed to start class:", error);
    } finally {
      setStartingClassId(null);
    }
  };

  const handleEndClass = async (eventId: string) => {
    try {
      setEndingClassId(eventId);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_class",
          eventId,
        }),
      });
      if (res.ok) {
        fetchTutorData();
      }
    } catch (error) {
      console.error("Failed to end class:", error);
    } finally {
      setEndingClassId(null);
    }
  };

  const handleDeleteClass = async (eventId: string) => {
    setConfirmModalData({
      isOpen: true,
      title: "Cancel & Delete Class Session?",
      description: "This will remove the scheduled live class from all enrolled student calendars.",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/tutor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete_class",
              eventId,
            }),
          });
          if (res.ok) {
            fetchTutorData();
          }
        } catch (error) {
          console.error("Failed to delete class:", error);
        } finally {
          setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setProfileStatusMsg({
        type: "error",
        text: "Image file is too large. Please upload an image under 5MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setProfileAvatar(base64);
      setProfileStatusMsg({
        type: "success",
        text: "Profile photo uploaded! Click 'Save Profile Changes' to apply.",
      });
    };
    reader.readAsDataURL(file);
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
    setNewClassDate(formatForDateTimeInput(d));
    setShowScheduleModal(true);
  };

  const openRescheduleForClass = (event: ScheduledClassEvent) => {
    setRescheduleTargetEvent(event);
    setRescheduleTargetTrial(null);
    setRescheduleDate(formatForDateTimeInput(new Date(event.dueDate)));
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

      if (rescheduleTargetEvent) {
        const res = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reschedule_class",
            eventId: rescheduleTargetEvent.id,
            scheduledDate: rescheduleDate,
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
            preferredDate: rescheduleDate,
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
    setConfirmDate(formatForDateTimeInput(new Date(trial.preferredDate)));
    setConfirmMeetLink(trial.meetingLink || "https://meet.google.com/new");
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
          meetingLink: normalizeGoogleMeetLink(confirmMeetLink),
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

  const tutorName = tutor?.name || "Senior Faculty Lecturer";

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col font-sans text-slate-800">

      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 py-1">
              <img
                src="/logo-wide.png"
                alt="EduPulse London A/L & O/L Academy"
                className="h-11 sm:h-12 w-auto object-contain transition-transform hover:scale-[1.02]"
              />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="roleTutor" className="text-[11px] px-2.5 py-1 font-bold">
              Tutor
            </Badge>


            <NotificationBell userRole="TUTOR" />

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2 pl-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide hidden md:block">
                {tutorName}
              </span>
              <div className="w-8 h-8 rounded-full bg-[#0c2461] text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden">
                {tutor?.avatar ? (
                  <img src={tutor.avatar} alt={tutorName} className="w-full h-full object-cover" />
                ) : (
                  tutorName.charAt(0)
                )}
              </div>
            </div>

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

      <main className="max-w-[1480px] mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 flex-1">

        {/* Mobile Horizontal Quick Tab Bar */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { id: "courses", label: "Courses", icon: BookOpen, count: courses.length },
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
                Faculty Tools
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
                    <span>My Courses & Syllabus</span>
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
                    <Video className="w-3.5 h-3.5 text-purple-600" />
                    <span>Live Classes</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-bold">
                    {events.filter((e) => e.status !== "COMPLETED" && e.status !== "CANCELLED" && !e.endedAt).length}
                  </span>
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
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Session History & Logs</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-bold">
                    {completedSessions.length}
                  </span>
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
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
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
                    <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>1-on-1 Trial Bookings</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                    {trials.length}
                  </span>
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
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center gap-1">
                    <span>New Page</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </button>

                <button
                  onClick={() => router.push("/tutor/profile")}
                  className="w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Instructor Profile & Credentials</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center gap-1">
                    <span>Studio Page</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </button>
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
                            isToday ? "bg-amber-300 ring-1 ring-amber-400/50" : "bg-blue-600 ring-1 ring-blue-400/50"
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

            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-2.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Studio Statistics
              </h3>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="font-bold text-slate-900 text-sm">{students.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Students</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="font-bold text-slate-900 text-sm">{courses.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Courses</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="font-bold text-slate-900 text-sm">{events.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Classes</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="font-bold text-slate-900 text-sm">{trials.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Trials</div>
                </div>
              </div>
            </div>

          </aside>

          <div className="lg:col-span-6 space-y-4 order-1 lg:order-2">

            <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-2xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCenterTab("courses")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  centerTab === "courses"
                    ? "bg-[#0c2461] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>My Courses ({courses.length})</span>
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
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
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
                    <span>Effective hourly rate</span>
                    <span>${effectiveHourlyRate}/h</span>
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
                  <h3 className="text-xs font-medium text-slate-600 mb-3">Revenue by course</h3>
                  <div className="space-y-3">
                    {courses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No courses assigned yet.</p>
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
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      Assigned Curriculum Courses
                    </h3>

                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search courses..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {filteredCourses.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 italic">
                      No courses match your search.
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
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                {c.subjectCode || "LONDON A/L"}
                              </span>
                              <span className="text-xs font-bold text-amber-600 font-mono flex items-center gap-1">
                                <Coins className="w-3 h-3" />
                                {c.price} Tokens
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
                              href={`/courses/${c.slug}`}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <span>Open Syllabus</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>

                            <button
                              onClick={() => {
                                setScheduleMode("COURSE");
                                setNewClassCourseId(c.id);
                                setNewClassTitle(`Live Class: ${c.title}`);
                                setShowScheduleModal(true);
                              }}
                              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-md"
                            >
                              + Schedule
                            </button>
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
                    <div className="space-y-3">
                      {filteredEvents.map((ev) => {
                        const isLive = ev.status === "LIVE";
                        const isCompleted = ev.status === "COMPLETED";
                        const isPendingApproval = ev.status === "PENDING_APPROVAL";
                        const isRejected = ev.status === "REJECTED";

                        return (
                          <div
                            key={ev.id}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isLive
                                ? "bg-red-50/50 border-red-200"
                                : isPendingApproval
                                ? "bg-amber-50/40 border-amber-200"
                                : isRejected
                                ? "bg-red-50/40 border-red-200"
                                : "bg-white border-slate-200 hover:border-blue-200"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-slate-900">
                                  {ev.title}
                                </span>
                                {isPendingApproval && (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[9px] flex items-center gap-1">
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
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[9px]">
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
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {new Date(ev.dueDate).toLocaleDateString("en-US", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {ev.meetingLink && (
                                  <a
                                    href={getSafeMeetingLink(ev.meetingLink)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline truncate max-w-[180px]"
                                  >
                                    {ev.meetingLink}
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {isLive ? (
                                <>
                                  <a
                                    href={getSafeMeetingLink(ev.meetingLink)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                                  >
                                    Join Room
                                  </a>
                                  <button
                                    onClick={() => handleEndClass(ev.id)}
                                    disabled={endingClassId === ev.id}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50"
                                  >
                                    End
                                  </button>
                                </>
                              ) : isCompleted ? (
                                <button
                                  onClick={() => handleDeleteClass(ev.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Delete Ended Session"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : isPendingApproval ? (
                                <>
                                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 flex items-center gap-1">
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
                                  <button
                                    onClick={() => handleDeleteClass(ev.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                    title="Cancel Class"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
                                  <button
                                    onClick={() => handleDeleteClass(ev.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                    title="Delete Request"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => triggerStartClassFlow(ev)}
                                    disabled={startingClassId === ev.id}
                                    className="px-3 py-1.5 rounded-lg bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold cursor-pointer"
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
                                  <button
                                    onClick={() => handleDeleteClass(ev.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                    title="Delete Class"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
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
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-600" />
                        <span>Online Session History & Duration Logs</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Comprehensive faculty audit log of all completed online classes, recorded start & end times, and duration analytics.
                      </p>
                    </div>

                    <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
                      {(["ALL", "CLASSES", "STUDENTS"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setHistoryFilter(f)}
                          className={`px-2.5 py-1 font-bold rounded-md transition-all cursor-pointer ${
                            historyFilter === f
                              ? "bg-white text-indigo-700 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {f === "ALL" && `All Ended (${completedSessions.length})`}
                          {f === "CLASSES" && `Courses (${completedSessions.filter((e) => Boolean(e.courseId)).length})`}
                          {f === "STUDENTS" && `1-on-1 (${completedSessions.filter((e) => Boolean(e.userId)).length})`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Sessions Completed</span>
                      <span className="text-lg font-black text-slate-900">{completedSessions.length}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Logged Teaching Hours</span>
                      <span className="text-lg font-black text-indigo-950">{completedTeachingHours} hrs</span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Completed 1-on-1 Sessions</span>
                      <span className="text-lg font-black text-emerald-950">{completedSessions.filter((e) => Boolean(e.userId)).length}</span>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search session history by title, course, or topic..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
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
                      {filteredHistory.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-all space-y-3 shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-slate-900">
                                  {ev.title}
                                </span>
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  ✓ Completed
                                </Badge>
                                {ev.course?.subjectCode && (
                                  <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">
                                    {ev.course.subjectCode}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>
                                  Scheduled: {new Date(ev.dueDate).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>

                            {ev.meetingLink && (
                              <a
                                href={getSafeMeetingLink(ev.meetingLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] font-semibold flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                              >
                                <Video className="w-3 h-3 text-slate-500" />
                                <span className="truncate max-w-[140px]">{ev.meetingLink.replace(/^https?:\/\//, "")}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                              </a>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Started:</span>
                              <span className="font-mono text-[11px] font-semibold text-slate-700">
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

                            <span className="text-slate-200 hidden sm:inline">•</span>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ended:</span>
                              <span className="font-mono text-[11px] font-semibold text-slate-700">
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

                            <span className="text-slate-200 hidden sm:inline">•</span>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration:</span>
                              <span className="font-mono text-[11px] font-semibold text-slate-800">
                                {formatSessionDuration(ev.startedAt, ev.endedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                        <option value="ALL">All Courses</option>
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
                                <h4 className="font-bold text-xs text-slate-900">{st.name}</h4>
                                <p className="text-[10px] text-slate-500">{st.email}</p>
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
                  {/* Header & Filter Tabs */}
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
                          Review incoming student requests, set/confirm official session dates, and launch 1-on-1 Google Meet trial sessions.
                        </p>
                      </div>
                    </div>

                    {/* Filter Pills with clean flex-wrap (no horizontal scrollbar / cutoffs) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {[
                        { key: "ALL", label: "All Bookings", count: trials.length },
                        { key: "PENDING", label: "⏳ Needs Date", count: trials.filter((t) => t.status === "PENDING").length },
                        { key: "CONFIRMED", label: "✓ Confirmed", count: trials.filter((t) => t.status === "CONFIRMED").length },
                        { key: "CANCELLED", label: "Declined / Cancelled", count: trials.filter((t) => t.status === "CANCELLED" || t.status === "REJECTED").length },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setTrialFilter(tab.key as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            trialFilter === tab.key
                              ? "bg-[#0c2461] text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                              trialFilter === tab.key ? "bg-white/25 text-white" : "bg-slate-200/80 text-slate-700"
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {trials.filter((t) => trialFilter === "ALL" || t.status === trialFilter || (trialFilter === "CANCELLED" && (t.status === "CANCELLED" || t.status === "REJECTED"))).length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <span>No trial bookings found under &quot;{trialFilter.toLowerCase()}&quot; filter.</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trials
                        .filter((t) => trialFilter === "ALL" || t.status === trialFilter || (trialFilter === "CANCELLED" && (t.status === "CANCELLED" || t.status === "REJECTED")))
                        .map((tr) => {
                          const isPending = tr.status === "PENDING";
                          const isConfirmed = tr.status === "CONFIRMED";
                          const isCancelled = tr.status === "CANCELLED" || tr.status === "REJECTED";

                          const slotDate = new Date(tr.preferredDate);
                          const dateFormatted = slotDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                          const timeFormatted = slotDate.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          });

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
                                isPending
                                  ? "bg-amber-50/30 border-amber-200"
                                  : isConfirmed
                                  ? "bg-white border-slate-200 hover:border-blue-300"
                                  : "bg-slate-50 border-slate-200 opacity-70"
                              }`}
                            >
                              {/* Top Row: Student Avatar, Name, Course, & Status Badge */}
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
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                                      <span className="flex items-center gap-1">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{tr.studentEmail}</span>
                                      </span>
                                      {tr.studentPhone && (
                                        <span className="flex items-center gap-1 font-mono">
                                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                                          <span>{tr.studentPhone}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0 self-start sm:self-center">
                                  {isPending && (
                                    <Badge className="bg-amber-500 text-white font-bold text-xs px-3 py-1 animate-pulse">
                                      ⏳ Action Needed: Set Date
                                    </Badge>
                                  )}
                                  {isConfirmed && (
                                    <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 flex items-center gap-1.5 shadow-2xs">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Confirmed &amp; Scheduled</span>
                                    </Badge>
                                  )}
                                  {isCancelled && (
                                    <Badge className="bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1">
                                      Declined / Cancelled
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Middle Row: Confirmed / Requested Timeslot Highlight Banner */}
                              <div
                                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isConfirmed
                                    ? "bg-blue-50/70 border-blue-200/80 text-blue-950"
                                    : isPending
                                    ? "bg-amber-50/80 border-amber-200 text-amber-950"
                                    : "bg-slate-50 border-slate-200 text-slate-800"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                      isConfirmed
                                        ? "bg-blue-100 text-blue-700"
                                        : isPending
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-slate-200 text-slate-700"
                                    }`}
                                  >
                                    <Clock className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div
                                      className={`text-[10px] font-extrabold uppercase tracking-wider ${
                                        isConfirmed ? "text-blue-700" : isPending ? "text-amber-700" : "text-slate-500"
                                      }`}
                                    >
                                      {isPending ? "Student Requested Slot" : "Confirmed Consultation Slot"}
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-1.5 mt-0.5">
                                      <span>{dateFormatted}</span>
                                      <span className="text-slate-400">•</span>
                                      <span className="font-mono text-blue-700 font-extrabold">{timeFormatted}</span>
                                      <span className="text-xs font-semibold text-slate-500">(30 mins)</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Topic & Notes (if available) */}
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

                              {/* Admin Rejection Reason (if rejected) */}
                              {(tr as any).rejectionReason && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="font-bold">Admin Feedback:</strong>{" "}
                                    <span>{(tr as any).rejectionReason}</span>
                                  </div>
                                </div>
                              )}

                              {/* Action Toolbar */}
                              <div className="border-t border-slate-100 pt-3.5 flex flex-wrap items-center justify-end gap-2.5">
                                {isPending ? (
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
                                    {tr.meetingLink && (
                                      <a
                                        href={tr.meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
                                      >
                                        <Video className="w-3.5 h-3.5" />
                                        <span>Google Meet</span>
                                      </a>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => router.push(`/trials/reschedule?trialId=${tr.id}`)}
                                      className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                      title="Reschedule session on dedicated page"
                                    >
                                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Reschedule</span>
                                    </button>

                                    <a
                                      href={buildGoogleCalendarUrl({
                                        title: `30-Min Trial: ${tr.studentName}`,
                                        description: `1-on-1 Consultation for ${tr.course?.title || "London A/L"}\nMeet: ${tr.meetingLink || ""}`,
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
                                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1.5">
                                    <X className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Declined / Cancelled</span>
                                  </span>
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
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-purple-950">Dedicated Profile Customization Studio Available</h4>
                      <p className="text-xs text-purple-700">Open the full-width standalone studio with real-time public student preview card and live completeness checklist.</p>
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
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs"
                          : "bg-red-50 text-red-900 border border-red-200 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {profileStatusMsg.type === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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
                        <div className="w-28 h-28 rounded-2xl bg-slate-900 overflow-hidden border-2 border-slate-200 shadow-lg ring-4 ring-blue-500/10">
                          <img
                            src={
                              profileAvatar ||
                              "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80"
                            }
                            alt="Profile Avatar"
                            className="w-full h-full object-cover"
                          />
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
                            className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Photo from Device</span>
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
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 block">
                            Or Enter Direct Image URL
                          </label>
                          <Input
                            placeholder="https://images.unsplash.com/..."
                            value={profileAvatar}
                            onChange={(e) => setProfileAvatar(e.target.value)}
                            className="rounded-xl h-8 text-xs font-mono"
                          />
                        </div>

                        <p className="text-[11px] text-slate-400">
                          Supports PNG, JPG, JPEG, and WEBP formats up to 5MB. Photo is automatically cropped and optimized.
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
                          placeholder="e.g. Dr. Arthur Pendelton"
                          className="rounded-xl h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-xs text-slate-700 block">
                          Phone / WhatsApp Number
                        </label>
                        <Input
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          placeholder="e.g. +1 (555) 234-5678"
                          className="rounded-xl h-9 text-xs"
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
                        placeholder="e.g. Senior Lead Lecturer & Certified Lead Examiner (London A/L Pure Mathematics)"
                        className="rounded-xl h-9 text-xs"
                      />
                      <p className="text-[10px] text-slate-400">
                        This appears right underneath your name on all course pages and search cards.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="font-bold text-xs text-slate-700 block">
                          Teaching Experience
                        </label>
                        <Input
                          value={profileExp}
                          onChange={(e) => setProfileExp(e.target.value)}
                          placeholder="e.g. 12+ Years Lead Faculty"
                          className="rounded-xl h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-xs text-slate-700 block">
                          Hourly Rate ($ / hr)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                          <Input
                            value={profileRate}
                            onChange={(e) => setProfileRate(e.target.value)}
                            placeholder="65"
                            className="rounded-xl h-9 text-xs pl-7"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-xs text-slate-700 block">
                          Office / Availability Hours
                        </label>
                        <Input
                          value={profileHours}
                          onChange={(e) => setProfileHours(e.target.value)}
                          placeholder="e.g. Mon - Fri: 4:00 PM - 8:00 PM GMT"
                          className="rounded-xl h-9 text-xs"
                        />
                      </div>
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
                                <School className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{deg.institution}</span>
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                              <span className="font-mono text-slate-500">Graduation: {deg.year}</span>
                              {deg.honors && (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
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
                            placeholder="e.g. B.Sc. (Hons) in Pure Mathematics"
                            value={newDegreeTitle}
                            onChange={(e) => setNewDegreeTitle(e.target.value)}
                            className="bg-white rounded-xl h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Institution / University *</label>
                          <Input
                            required
                            placeholder="e.g. Imperial College London"
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
                            placeholder="e.g. 2018"
                            value={newDegreeYear}
                            onChange={(e) => setNewDegreeYear(e.target.value)}
                            className="bg-white rounded-xl h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Honors / Distinctions (Optional)</label>
                          <Input
                            placeholder="e.g. First Class Honours, Dean's List"
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
                        placeholder="Add custom specialization (e.g. Further Pure FP2, Mechanics M2)..."
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
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Examiner Certifications & Teaching Accreditations</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Credentials and assessment examiner appointments from Pearson, Cambridge, or international boards.
                        </p>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-800 text-[11px] font-bold">
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
                            className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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

                    <form onSubmit={handleAddCert} className="p-4 rounded-xl bg-emerald-50/30 border border-emerald-100 space-y-3">
                      <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Add Examiner Accreditation</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Certification Title *</label>
                          <Input
                            required
                            placeholder="e.g. Pearson Edexcel Certified Senior Lead Examiner"
                            value={newCertTitle}
                            onChange={(e) => setNewCertTitle(e.target.value)}
                            className="bg-white rounded-xl h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Issuing Authority / Board</label>
                          <Input
                            placeholder="e.g. Pearson Edexcel International"
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
                            placeholder="e.g. 2021"
                            value={newCertYear}
                            onChange={(e) => setNewCertYear(e.target.value)}
                            className="bg-white rounded-xl h-8 text-xs"
                          />
                        </div>

                        <Button
                          type="submit"
                          size="sm"
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl px-4 gap-1.5 cursor-pointer mt-4"
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
                        Describe your academic background, student pass rate accomplishments, error-checking methods, and lecture format.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <textarea
                        rows={6}
                        value={profileAbout}
                        onChange={(e) => setProfileAbout(e.target.value)}
                        placeholder="Write an engaging introduction about your teaching style, past student A* scores, masterclass structure, and passion for mathematics and sciences..."
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
                        <Sparkles className="w-4 h-4 text-amber-400" />
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
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Instructor Profile
                </h3>
                <button
                  onClick={() => router.push("/tutor/profile")}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Profile</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-950 text-white overflow-hidden border border-slate-200 shrink-0">
                  <img
                    src={
                      profileAvatar ||
                      tutor?.avatar ||
                      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                    }
                    alt={tutorName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 truncate">{profileName || tutorName}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{profileHeadline || tutor?.headline || "Subject Lead"}</p>
                  <span className="text-[10px] text-emerald-700 font-bold">● Active Online</span>
                </div>
              </div>

              {profileDegrees.length > 0 && (
                <div className="space-y-1 border-t border-slate-100 pt-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-blue-600" />
                    <span>Academic Degrees:</span>
                  </div>
                  <div className="space-y-1">
                    {profileDegrees.slice(0, 2).map((deg) => (
                      <div key={deg.id} className="text-[11px] text-slate-700 font-medium truncate flex items-center justify-between">
                        <span className="truncate">{deg.degree}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">{deg.year}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed border-t border-slate-100 pt-2">
                {profileAbout || "Faculty Educator specializing in London A/L & O/L Pearson Edexcel and Cambridge curriculum."}
              </p>

              <button
                onClick={() => router.push("/tutor/profile")}
                className="w-full py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Customize Full Profile</span>
                <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
              </button>
            </div>

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
                        <span className="text-blue-600 font-semibold">Live Seminar</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <CalendarCheck className="w-3 h-3 text-blue-600" />
                  <span>Synced with Faculty Schedule</span>
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

      {showStartClassModal && startClassTargetEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Start Google Meet Session</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[240px]">{startClassTargetEvent.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowStartClassModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-2">
                <span className="font-bold text-blue-950 block">Step 1: Open Google Meet to create room</span>
                <button
                  type="button"
                  onClick={() => window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer")}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open meet.google.com/new</span>
                </button>
                <p className="text-[11px] text-blue-800 leading-snug">
                  Google will create your meeting room. Copy the room link from your browser address bar.
                </p>
              </div>

              <form onSubmit={handleStartClassSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 block">
                      Step 2: Paste Google Meet Link
                    </label>
                    <button
                      type="button"
                      onClick={() => window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer")}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Create on Google Meet</span>
                    </button>
                  </div>
                  <Input
                    placeholder="https://meet.google.com/xxx-yyyy-zzz"
                    value={startClassMeetLink}
                    onChange={(e) => setStartClassMeetLink(e.target.value)}
                    className="rounded-xl h-9 text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-400">
                    All students will immediately receive this exact Google Meet link to join together.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStartClassModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={startingClassId === startClassTargetEvent.id}
                    className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-5 gap-1.5 cursor-pointer shadow-md"
                  >
                    {startingClassId === startClassTargetEvent.id ? "Starting..." : "Start & Notify Students"}
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
                    Broadcast a Google Meet interactive seminar to students
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
                    <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
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
                    <div className="mt-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-purple-600" />
                          <span>Student&apos;s Preferred Study Hours</span>
                        </span>
                        {selectedStudentAvailabilities.length > 0 && (
                          <span className="text-[10px] text-purple-700 font-semibold">Click slot to auto-fill</span>
                        )}
                      </div>

                      {selectedStudentAvailabilities.length === 0 ? (
                        <div className="text-[11px] text-purple-800/80 italic">
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
                                className="px-2 py-1 rounded-lg bg-white hover:bg-purple-100 border border-purple-200 text-[10px] font-bold text-purple-900 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
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
                  Class Topic / Title <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Pure Mathematics Unit 4 Differential Calculus Past Papers"
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
                    Google Meet URL (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer")}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open meet.google.com/new</span>
                  </button>
                </div>
                <Input
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
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
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {rescheduleStatusMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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
                  {rescheduleTargetEvent?.course?.title || rescheduleTargetTrial?.course?.title || "London A/L Masterclass"}
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
                    Google Meet / Zoom URL (Optional)
                  </label>
                  <Input
                    placeholder="https://meet.google.com/..."
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
                  placeholder="e.g. Session moved by 1 hour due to student schedule adjustment..."
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
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
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedStudentForModal.name}
                  </h3>
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
                  <span className="text-slate-500 font-medium">Email:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedStudentForModal.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Phone:</span>
                  <span className="font-bold text-slate-800">{selectedStudentForModal.phone}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-slate-700">Enrolled Courses ({selectedStudentForModal.enrolledCourses.length}):</div>
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

      {/* Confirm & Set Date Trial Modal */}
      {showConfirmTrialModal && confirmingTrial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Set Date &amp; Confirm Trial Session
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set the confirmed date and Google Meet link for this student's free trial
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmTrialModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {confirmTrialStatusMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  confirmTrialStatusMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {confirmTrialStatusMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{confirmTrialStatusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleConfirmTrialSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 text-xs">
                    {confirmingTrial.studentName}
                  </span>
                  <span className="text-[11px] text-blue-700 font-semibold font-mono">
                    {confirmingTrial.studentEmail}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Course: <strong>{confirmingTrial.course?.title || "London A/L Masterclass"}</strong>
                </div>
                {confirmingTrial.topic && (
                  <div className="text-[11px] text-slate-600">
                    Topic: {confirmingTrial.topic}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Confirmed Session Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={confirmDate}
                  onChange={(e) => setConfirmDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  You can keep the student&apos;s requested slot or adjust to your availability.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 block">
                    Google Meet Classroom Link (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer")}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Create on Google Meet</span>
                  </button>
                </div>
                <Input
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
                  value={confirmMeetLink}
                  onChange={(e) => setConfirmMeetLink(e.target.value)}
                  className="rounded-xl h-10 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Faculty Preparation Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please have your Unit 3 past paper ready with questions marked."
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmTrialModal(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingConfirmTrial}
                  className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-5 gap-1.5 cursor-pointer shadow-md"
                >
                  {isSubmittingConfirmTrial ? "Confirming..." : "✓ Confirm & Schedule Session"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decline Trial Modal */}
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
                  placeholder="e.g. Schedule fully booked on requested day. Please request next week."
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
            email: "faculty@edupulse.uk",
            role: "INSTRUCTOR",
          }
        }
        initialRecipientId={activeChatRecipientId}
      />

      <Footer />
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
