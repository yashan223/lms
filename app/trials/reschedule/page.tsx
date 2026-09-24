"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  User,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  CalendarClock,
  Phone,
  Mail,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StudentAvailabilityModal } from "@/components/student/StudentAvailabilityModal";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { RegionalTimezoneSelector } from "@/components/ui/RegionalTimezoneSelector";
import {
  getUserBrowserTimezone,
  getRegionalTimezone,
  DEFAULT_TIMEZONE,
  format24hTo12h,
} from "@/lib/timezones";

interface TutorAvailabilitySlot {
  startTime: string;
  endTime: string;
  timeDisplay: string;
  tutorTimeDisplay?: string;
  isAvailable: boolean;
  isPast: boolean;
  matchesStudentAvailability?: boolean;
  dualTime?: any;
  conflict?: {
    type: "CLASS" | "TRIAL";
    id: string;
    title: string;
    courseTitle?: string;
    start: string;
    end: string;
  } | null;
  windowTitle?: string;
}

interface DayAvailability {
  date: string;
  dateLabel: string;
  dayOfWeek: number;
  hasAvailableSlots: boolean;
  totalSlots: number;
  availableSlotsCount: number;
  conflictSlotsCount: number;
  slots: TutorAvailabilitySlot[];
}

interface ScheduledClassSummary {
  id: string;
  title: string;
  dueDate: string;
  durationMin: number;
  course?: {
    id: string;
    title: string;
    subjectCode?: string | null;
  } | null;
}

interface TrialDetail {
  id: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string | null;
  preferredDate: string;
  topic?: string | null;
  status: string;
  meetingLink?: string | null;
  notes?: string | null;
  tutorId?: string | null;
  studentId?: string | null;
  courseId?: string | null;
  course?: {
    id: string;
    title: string;
    slug?: string;
    subjectCode?: string | null;
    tutor?: {
      id: string;
      name: string;
      headline?: string | null;
      avatar?: string | null;
      email?: string;
      phone?: string | null;
    } | null;
  } | null;
  tutor?: {
    id: string;
    name: string;
    headline?: string | null;
    avatar?: string | null;
    email?: string;
    phone?: string | null;
  } | null;
  student?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    phone?: string | null;
  } | null;
}

const formatForDateTimeInput = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

function RescheduleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const trialId = searchParams.get("trialId") || searchParams.get("id");

  const [viewerTimezone, setViewerTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [tutorTimezone, setTutorTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [loading, setLoading] = useState(true);
  const [trial, setTrial] = useState<TrialDetail | null>(null);
  const [allTrials, setAllTrials] = useState<TrialDetail[]>([]);
  const [availabilityDays, setAvailabilityDays] = useState<DayAvailability[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClassSummary[]>([]);
  const [studentStudySlots, setStudentStudySlots] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>(""); // ISO string
  const [customDateTime, setCustomDateTime] = useState<string>("");
  const [meetingLink, setMeetingLink] = useState<string>("");
  const [rescheduleNotes, setRescheduleNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setViewerTimezone(getUserBrowserTimezone());
    }
  }, []);

  // Helper to load availability for a target trial session
  const loadTrialAvailability = async (targetTrial: TrialDetail, tzOverride?: string) => {
    setTrial(targetTrial);
    setMeetingLink(targetTrial.meetingLink || "");
    setRescheduleNotes(targetTrial.notes || "");

    const activeTz = tzOverride || viewerTimezone;
    const tutorId = targetTrial.tutorId || targetTrial.course?.tutor?.id || "";
    const availUrl = `/api/tutor/availability?trialId=${encodeURIComponent(targetTrial.id)}${
      tutorId ? `&tutorId=${encodeURIComponent(tutorId)}` : ""
    }&timezone=${encodeURIComponent(activeTz)}&days=14`;

    const availRes = await fetch(availUrl);
    const availData = await availRes.json();
    if (availRes.ok && availData.days) {
      if (availData.tutorTimezone) {
        setTutorTimezone(availData.tutorTimezone);
      }
      setAvailabilityDays(availData.days);
      setScheduledClasses(availData.scheduledClasses || []);
      if (availData.student?.availabilities) {
        setStudentStudySlots(availData.student.availabilities);
      }
      const firstWithSlots = availData.days.find((d: DayAvailability) => d.hasAvailableSlots);
      if (firstWithSlots) {
        setSelectedDate(firstWithSlots.date);
      } else if (availData.days.length > 0) {
        setSelectedDate(availData.days[0].date);
      }
    }
  };

  const handleSwitchTrial = async (targetId: string) => {
    const chosen = allTrials.find((t) => t.id === targetId);
    if (!chosen) return;
    try {
      setLoading(true);
      setError(null);
      setStatusMsg(null);
      await loadTrialAvailability(chosen);
      router.replace(`/trials/reschedule?trialId=${encodeURIComponent(targetId)}`);
    } catch (e: any) {
      setError(e.message || "Failed to switch trial session.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Fetch Trial & Tutor Availability
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch user's trials list
        const res = await fetch("/api/trials");
        const data = await res.json();
        const trialsList: TrialDetail[] = res.ok && Array.isArray(data.trials) ? data.trials : [];
        setAllTrials(trialsList);

        let targetTrial: TrialDetail | null = null;
        if (trialId) {
          targetTrial = trialsList.find((t) => t.id === trialId) || null;
          if (!targetTrial) {
            const singleRes = await fetch(`/api/trials?id=${encodeURIComponent(trialId)}`);
            const singleData = await singleRes.json();
            if (singleRes.ok && singleData.trial) {
              targetTrial = singleData.trial;
            }
          }
        } else if (trialsList.length > 0) {
          // Directly open: automatically select the trial session
          targetTrial = trialsList[0];
        }

        if (targetTrial) {
          await loadTrialAvailability(targetTrial);
        }
      } catch (err: any) {
        console.error("Failed to load reschedule data:", err);
        setError(err.message || "Failed to load session details.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [trialId]);

  useRealtimeSync({
    events: ["TRIALS_CHANGED", "EVENTS_CHANGED", "TUTOR_AVAILABILITY_CHANGED"],
    onSync: () => {
      if (trial) {
        loadTrialAvailability(trial);
      }
    },
  });

  // Selected Day Slots
  const currentDayData = useMemo(() => {
    return availabilityDays.find((d) => d.date === selectedDate) || null;
  }, [availabilityDays, selectedDate]);

  // Real-time conflict checker for chosen date/time
  const activeConflict = useMemo(() => {
    const targetIso = selectedSlotTime || (customDateTime ? new Date(customDateTime).toISOString() : "");
    if (!targetIso) return null;

    const targetStart = new Date(targetIso);
    if (isNaN(targetStart.getTime())) return null;
    const targetEnd = new Date(targetStart.getTime() + 30 * 60 * 1000); // 30 min session

    for (const cls of scheduledClasses) {
      const clsStart = new Date(cls.dueDate);
      const clsEnd = new Date(clsStart.getTime() + (cls.durationMin || 60) * 60 * 1000);

      // Overlap: targetStart < clsEnd && targetEnd > clsStart
      if (targetStart.getTime() < clsEnd.getTime() && targetEnd.getTime() > clsStart.getTime()) {
        return {
          id: cls.id,
          title: cls.title,
          start: clsStart,
          end: clsEnd,
          courseTitle: cls.course?.title,
        };
      }
    }
    return null;
  }, [selectedSlotTime, customDateTime, scheduledClasses]);

  // Handle slot selection
  const handleSelectSlot = (slot: TutorAvailabilitySlot) => {
    if (!slot.isAvailable) return;
    setSelectedSlotTime(slot.startTime);
    const dateObj = new Date(slot.startTime);
    setCustomDateTime(formatForDateTimeInput(dateObj));
  };

  // Handle custom date/time change
  const handleCustomDateChange = (val: string) => {
    setCustomDateTime(val);
    if (val) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        setSelectedSlotTime(d.toISOString());
        setSelectedDate(d.toISOString().split("T")[0]);
      }
    } else {
      setSelectedSlotTime("");
    }
  };

  // Handle form submission
  const handleSubmitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDateIso = selectedSlotTime || (customDateTime ? new Date(customDateTime).toISOString() : "");

    if (!finalDateIso) {
      setStatusMsg({
        type: "error",
        text: "Please select an available time slot or specify a valid date and time.",
      });
      return;
    }

    if (studentStudySlots.length === 0) {
      setShowAvailabilityModal(true);
      setStatusMsg({
        type: "error",
        text: "Please configure your study availability first so tutors know your preferred study hours.",
      });
      return;
    }

    if (activeConflict) {
      setStatusMsg({
        type: "error",
        text: `Cannot reschedule: This slot conflicts with scheduled class "${activeConflict.title}". Please choose an available time slot.`,
      });
      return;
    }

    try {
      setSubmitting(true);
      setStatusMsg(null);

      const res = await fetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule_trial",
          trialId: trial?.id,
          scheduledDate: finalDateIso,
          timezone: viewerTimezone,
          meetingLink: meetingLink.trim(),
          notes: rescheduleNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 428 || data.code === "STUDY_AVAILABILITY_REQUIRED") {
          setShowAvailabilityModal(true);
        }
        throw new Error(data.error || "Failed to reschedule trial session.");
      }

      setStatusMsg({
        type: "success",
        text: "🎉 Free trial session has been successfully rescheduled and updated on the calendar!",
      });

      setTrial(data.trial);

      // Refresh availability
      const tutorId = trial?.tutorId || trial?.course?.tutor?.id || "";
      const availRes = await fetch(
        `/api/tutor/availability?trialId=${encodeURIComponent(trial?.id || "")}&tutorId=${encodeURIComponent(tutorId)}&timezone=${encodeURIComponent(viewerTimezone)}&days=14`
      );
      const availData = await availRes.json();
      if (availRes.ok && availData.days) {
        setAvailabilityDays(availData.days);
      }
    } catch (err: any) {
      console.error("Reschedule submit error:", err);
      setStatusMsg({
        type: "error",
        text: err.message || "Failed to confirm reschedule. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#0c2461] text-white flex items-center justify-center shadow-lg shadow-blue-950/20 mb-4 animate-bounce">
          <CalendarCheck className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-base mb-1">Loading Consultation Details...</h3>
        <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Synchronizing tutor calendar &amp; scheduled classes...</span>
        </p>
      </div>
    );
  }

  // Fallback: If no trial could be found on the account
  if (!trial) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-900">No Active Trial Requests Found</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            There are currently no free trial sessions awaiting rescheduling on your account.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <Link href="/dashboard">
              <Button className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tutorInfo = trial.tutor || trial.course?.tutor;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="w-full max-w-[1560px] mx-auto px-4 sm:px-8 xl:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Return"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-slate-900">
                  Reschedule Free Trial Consultation
                </h1>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-extrabold">
                  Dedicated Reschedule Desk
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                View real-time tutor availability and avoid overlapping with scheduled academy classes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="text-xs font-semibold rounded-xl">
                Student Portal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-[1560px] mx-auto px-4 sm:px-8 xl:px-12 pt-6 space-y-6">
        {/* Status Alerts */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-in slide-in-from-top-2 duration-200 ${
              statusMsg.type === "success"
                ? "bg-blue-50 border-blue-200 text-blue-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold text-sm">
                {statusMsg.type === "success" ? "Session Rescheduled!" : "Reschedule Notice"}
              </div>
              <p className="text-xs leading-relaxed">{statusMsg.text}</p>
            </div>
          </div>
        )}

        {studentStudySlots.length === 0 && (
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                  Study Availability Required
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                    Step Required
                  </span>
                </h4>
                <p className="text-[11px] text-blue-900/90 leading-relaxed">
                  Please configure your study availability so tutors can coordinate your session times without schedule clashes.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setShowAvailabilityModal(true)}
              className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-4 py-2 shrink-0 cursor-pointer shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              Set Study Availability
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Trial & Tutor Summary */}
          <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 space-y-5">
            {/* Consultation Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Target Consultation
                </span>
                <Badge
                  className={`text-[10px] font-bold ${
                    trial.status === "CONFIRMED"
                      ? "bg-blue-100 text-blue-800 border-blue-200"
                      : "bg-slate-100 text-slate-800 border-slate-200"
                  }`}
                >
                  {trial.status}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-blue-600 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{trial.course?.subjectCode || "LONDON A/L"}</span>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                  {trial.course?.title || "London A/L Individual Class"}
                </h3>
                {trial.topic && (
                  <p className="text-xs text-slate-500 italic pt-1">
                    &ldquo;{trial.topic}&rdquo;
                  </p>
                )}
              </div>

              {/* Session Switcher if multiple trials exist */}
              {allTrials.length > 1 && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Switch Session ({allTrials.length} active)
                  </label>
                  <select
                    value={trial.id}
                    onChange={(e) => handleSwitchTrial(e.target.value)}
                    aria-label="Switch trial session"
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {allTrials.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.course?.title || "London A/L Individual Class"} (
                        {new Date(tr.preferredDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Current Scheduled Time Highlight */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                  Current Scheduled Time
                </span>
                <div className="font-extrabold text-xs text-blue-950 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    {new Date(trial.preferredDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(trial.preferredDate).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
                <div className="text-[10px] text-blue-700">30-Minute 1-on-1 Free Trial</div>
              </div>

              {/* Student Details */}
              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Student Details
                </div>
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{trial.studentName}</span>
                </div>
                <div className="text-slate-500 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{trial.studentEmail}</span>
                </div>
                {trial.studentPhone && (
                  <div className="text-slate-500 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{trial.studentPhone}</span>
                  </div>
                )}

                {/* Student's Configured Study Hours */}
                {studentStudySlots.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1 mt-2">
                    <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>Student&apos;s Preferred Study Hours</span>
                    </div>
                    <div className="space-y-0.5 text-[11px] text-blue-950">
                      {studentStudySlots.map((av: any, idx: number) => {
                        const daysMap: Record<number, string> = {
                          0: "Sunday",
                          1: "Monday",
                          2: "Tuesday",
                          3: "Wednesday",
                          4: "Thursday",
                          5: "Friday",
                          6: "Saturday",
                        };
                        const dayLabel =
                          av.dayOfWeek !== null && av.dayOfWeek !== undefined
                            ? daysMap[Number(av.dayOfWeek)]
                            : av.specificDate?.slice(0, 10);
                        return (
                          <div key={idx} className="flex items-center justify-between font-semibold">
                            <span>{dayLabel}:</span>
                            <span className="font-mono text-blue-800">{format24hTo12h(av.startTime)} – {format24hTo12h(av.endTime)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Tutor Card */}
              {tutorInfo && (
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Tutor
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0c2461] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-xs">
                      {tutorInfo.avatar ? (
                        <img
                          src={tutorInfo.avatar}
                          alt={tutorInfo.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        tutorInfo.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {tutorInfo.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {tutorInfo.headline || "Senior Tutor Lead"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Availability Picker & Reschedule Form */}
          <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 space-y-5">
            <form onSubmit={handleSubmitReschedule} className="space-y-5">
              {/* Date & Slots Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Select Date &amp; Available Time Slot</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Choose an open time slot from tutor office hours and seminar schedules
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <RegionalTimezoneSelector
                      selectedTimezone={viewerTimezone}
                      onChange={(tz) => {
                        setViewerTimezone(tz);
                        if (trial) {
                          loadTrialAvailability(trial, tz);
                        }
                      }}
                      tutorBaseTimezone={tutorTimezone}
                      compact
                    />
                    <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[11px] font-bold self-start md:self-center shrink-0">
                      Next 14 Days
                    </Badge>
                  </div>
                </div>

                {/* Horizontal Date Picker */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Available Dates
                  </label>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                    {availabilityDays.map((day) => {
                      const isSelected = day.date === selectedDate;
                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => {
                            setSelectedDate(day.date);
                            setSelectedSlotTime("");
                          }}
                          className={`shrink-0 px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center min-w-[90px] flex-1 sm:flex-initial ${
                            isSelected
                              ? "bg-[#0c2461] border-[#0c2461] text-white shadow-md shadow-blue-950/20"
                              : day.hasAvailableSlots
                              ? "bg-white border-slate-200 hover:border-blue-300 text-slate-700 hover:bg-blue-50/50"
                              : "bg-slate-50 border-slate-200/80 text-slate-400 opacity-60"
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              isSelected ? "text-blue-200" : "text-slate-400"
                            }`}
                          >
                            {day.dateLabel.split(",")[0]}
                          </span>
                          <span className="font-extrabold text-sm my-0.5">
                            {day.dateLabel.split(",")[1]?.trim() || day.date.slice(5)}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : day.hasAvailableSlots
                                ? "bg-blue-50 text-blue-700 font-extrabold"
                                : "bg-slate-200/60 text-slate-500"
                            }`}
                          >
                            {day.availableSlotsCount > 0
                              ? `${day.availableSlotsCount} Open`
                              : "Busy"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Slots Grid */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        Time Slots for{" "}
                        <strong className="text-slate-900">
                          {currentDayData?.dateLabel || selectedDate}
                        </strong>
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {currentDayData?.slots.length || 0} Slots Evaluated
                    </span>
                  </div>

                  {!currentDayData || currentDayData.slots.length === 0 ? (
                    <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 space-y-1">
                      <div className="font-bold text-slate-700">No time slots for this date</div>
                      <p className="text-[11px]">
                        The tutor has no consultation hours or scheduled openings on this day. Please select another date.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                      {currentDayData.slots.map((slot, idx) => {
                        const isSelected = selectedSlotTime === slot.startTime;

                        if (!slot.isAvailable) {
                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-xl border border-red-200/80 bg-red-50/60 flex flex-col justify-between text-left space-y-1 relative group cursor-not-allowed select-none"
                              title={
                                slot.conflict
                                  ? `Class Conflict: ${slot.conflict.title}`
                                  : "Slot unavailable / in past"
                              }
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-red-950 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-red-500" />
                                  {slot.timeDisplay}
                                </span>
                                <Badge className="bg-red-100 text-red-800 border-red-200 text-[9px] font-bold px-1.5 py-0">
                                  Class Busy
                                </Badge>
                              </div>
                              <div className="text-[10px] text-red-700/90 truncate font-medium">
                                {slot.conflict ? (
                                  <span>{slot.conflict.title}</span>
                                ) : (
                                  <span>Past Slot</span>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSlot(slot)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                              isSelected
                                ? "bg-blue-600 border-blue-700 text-white shadow-md shadow-blue-700/20 ring-2 ring-blue-400"
                                : "bg-white border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 text-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-xs flex items-center gap-1">
                                <Clock
                                  className={`w-3 h-3 ${
                                    isSelected ? "text-white" : "text-blue-600"
                                  }`}
                                />
                                {slot.timeDisplay}
                              </span>
                              <div className="flex items-center gap-1">
                                {slot.matchesStudentAvailability && (
                                  <span
                                    className={`text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                                      isSelected
                                        ? "bg-blue-300 text-blue-950"
                                        : "bg-blue-100 text-blue-900 border border-blue-300"
                                    }`}
                                    title="Matches student's preferred study hours!"
                                  >
                                    <Zap className="w-2.5 h-2.5 text-blue-600 fill-blue-500" />
                                    Mutual Match
                                  </span>
                                )}
                                <Badge
                                  className={`text-[9px] font-bold px-1.5 py-0 ${
                                    isSelected
                                      ? "bg-white/20 text-white"
                                      : "bg-blue-100 text-blue-800 border-blue-200"
                                  }`}
                                >
                                  Available
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-1 text-[10px] pt-0.5">
                              <span
                                className={`truncate ${
                                  isSelected ? "text-blue-100" : "text-slate-500"
                                }`}
                              >
                                {slot.windowTitle || "30-Min 1-on-1 Consultation"}
                              </span>
                              {slot.tutorTimeDisplay && slot.tutorTimeDisplay !== slot.timeDisplay && (
                                <span
                                  className={`text-[9px] font-semibold shrink-0 ${
                                    isSelected
                                      ? "text-blue-200"
                                      : "text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200/60"
                                  }`}
                                  title={`Tutor base time: ${slot.tutorTimeDisplay} Sri Lanka`}
                                >
                                  🇱🇰 {slot.tutorTimeDisplay}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Custom Date-Time Picker Override */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Custom Date &amp; Time Selection</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Auto-updates when choosing a slot above
                    </span>
                  </div>
                  <input
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(e) => handleCustomDateChange(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />

                  {/* Real-time Conflict Alert Banner */}
                  {activeConflict ? (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5 animate-in shake">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold text-red-950">
                          ⚠️ Schedule Conflict Detected!
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Tutor already has{" "}
                          <strong className="underline">{activeConflict.title}</strong> scheduled
                          between{" "}
                          {activeConflict.start.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          and{" "}
                          {activeConflict.end.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          . Please pick an open, green-flagged time slot.
                        </p>
                      </div>
                    </div>
                  ) : selectedSlotTime || customDateTime ? (
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-[11px] font-semibold">
                        ✅ Selected slot is conflict-free and verified against all scheduled classes!
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Submission CTA */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500 text-center sm:text-left">
                    Notifications will be sent automatically to both student and tutor upon confirmation.
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="text-xs font-semibold rounded-xl w-full sm:w-auto cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || Boolean(activeConflict) || (!selectedSlotTime && !customDateTime)}
                      className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-6 h-10 gap-2 cursor-pointer shadow-md shadow-blue-950/20 w-full sm:w-auto"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Rescheduling Session...</span>
                        </>
                      ) : (
                        <>
                          <CalendarCheck className="w-4 h-4" />
                          <span>Confirm &amp; Lock New Session Time</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        <StudentAvailabilityModal
          isOpen={showAvailabilityModal}
          onClose={() => setShowAvailabilityModal(false)}
          currentUser={trial?.student || (trial?.studentId ? { id: trial.studentId } : undefined)}
          onUpdated={() => {
            const tutorId = trial?.tutorId || trial?.course?.tutor?.id || "";
            fetch(`/api/tutor/availability?trialId=${encodeURIComponent(trial?.id || "")}&tutorId=${encodeURIComponent(tutorId)}&days=14`)
              .then((r) => r.json())
              .then((d) => {
                if (d.days) setAvailabilityDays(d.days);
                if (d.student?.availabilities) setStudentStudySlots(d.student.availabilities);
              })
              .catch(() => {});
          }}
        />
      </main>
    </div>
  );
}

export default function RescheduleTrialPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      }
    >
      <RescheduleContent />
    </Suspense>
  );
}
