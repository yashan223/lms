"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  CalendarCheck,
  Clock,
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
  BookOpen,
  CalendarClock,
  ArrowRight,
  Sun,
  Moon,
  CalendarDays,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { RegionalTimezoneSelector } from "@/components/ui/RegionalTimezoneSelector";
import {
  getUserBrowserTimezone,
  getRegionalTimezone,
  DEFAULT_TIMEZONE,
  formatTimeInTimezone,
  formatDateInTimezone,
  formatForUser,
  formatForDateTimeInput,
  parseDateTimeInputInTimezone,
  getDualTimeDisplay,
  getTimezoneAbbr,
} from "@/lib/timezones";

interface TrialRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourseId?: string;
  initialTutorId?: string;
  allCourses?: Array<{
    id: string;
    title: string;
    slug?: string;
    subjectCode?: string | null;
    tutorId?: string;
    tutor?: {
      id: string;
      name: string;
      headline?: string | null;
      avatar?: string | null;
    } | null;
    instructor?: {
      id: string;
      name: string;
      headline?: string | null;
      avatar?: string | null;
    } | null;
  }>;
  currentUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  onSuccess?: (trial: any) => void;
}

export function TrialRequestModal({
  isOpen,
  onClose,
  initialCourseId,
  initialTutorId,
  allCourses = [],
  currentUser,
  onSuccess,
}: TrialRequestModalProps) {
  const [step, setStep] = useState<"SETUP_AVAILABILITY" | "REQUEST_TRIAL">("REQUEST_TRIAL");
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [studentAvailabilities, setStudentAvailabilities] = useState<any[]>([]);
  const [availSuccessMsg, setAvailSuccessMsg] = useState<string | null>(null);

  const [trialStats, setTrialStats] = useState<{
    totalUsed: number;
    maxAllowed: number;
    remaining: number;
    bookedTutorIds: string[];
    isMaxReached: boolean;
  } | null>(null);

  const [courseId, setCourseId] = useState(initialCourseId || "");
  const [preferredDate, setPreferredDate] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTrial, setCreatedTrial] = useState<any | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [tutorBaseTimezone, setTutorBaseTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [openSlots, setOpenSlots] = useState<
    Array<{
      startTime: string;
      timeDisplay: string;
      tutorTimeDisplay?: string;
      dateLabel: string;
      matchesStudent?: boolean;
      dualTime?: any;
    }>
  >([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSelectedTimezone(getUserBrowserTimezone());
    }
  }, []);

  // Fetch tutor slots helper
  const fetchTutorSlots = (
    tutorIdParam?: string,
    courseIdParam?: string,
    studentIdParam?: string,
    tzOverride?: string
  ) => {
    const targetTutorId =
      tutorIdParam ||
      initialTutorId ||
      allCourses.find((c) => c.id === (courseIdParam || courseId))?.instructor?.id;
    const targetCourseId = courseIdParam || initialCourseId || courseId;
    const tz = tzOverride || selectedTimezone;
    const params = new URLSearchParams();
    if (targetTutorId) params.set("tutorId", targetTutorId);
    if (targetCourseId) params.set("courseId", targetCourseId);
    if (studentIdParam || currentUser?.id)
      params.set("studentId", studentIdParam || currentUser?.id || "");
    params.set("timezone", tz);
    params.set("days", "7");

    fetch(`/api/tutor/availability?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.tutorTimezone) {
          setTutorBaseTimezone(d.tutorTimezone);
        }
        if (d.days) {
          const collected: Array<{
            startTime: string;
            timeDisplay: string;
            tutorTimeDisplay?: string;
            dateLabel: string;
            matchesStudent?: boolean;
            dualTime?: any;
          }> = [];
          for (const day of d.days) {
            for (const s of day.slots || []) {
              if (s.isAvailable && collected.length < 8) {
                collected.push({
                  startTime: s.startTime,
                  timeDisplay: s.timeDisplay,
                  tutorTimeDisplay: s.tutorTimeDisplay,
                  dateLabel: day.dateLabel,
                  matchesStudent: Boolean(s.matchesStudentAvailability),
                  dualTime: s.dualTime,
                });
              }
            }
          }
          setOpenSlots(collected);
        }
      })
      .catch(() => {});
  };

  // Check student availability & load initial data
  useEffect(() => {
    if (isOpen) {
      if (initialCourseId) {
        setCourseId(initialCourseId);
      } else if (allCourses.length > 0 && !courseId) {
        setCourseId(allCourses[0].id);
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setPreferredDate(formatForDateTimeInput(tomorrow, selectedTimezone));

      setError(null);
      setCreatedTrial(null);
      setAvailSuccessMsg(null);

      // Check student study availability
      setCheckingAvailability(true);
      const studentQuery = currentUser?.id ? `?studentId=${currentUser.id}` : "";
      fetch(`/api/student/availability${studentQuery}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.availabilities && Array.isArray(data.availabilities)) {
            setStudentAvailabilities(data.availabilities);
            if (data.availabilities.length === 0) {
              setStep("SETUP_AVAILABILITY");
            } else {
              setStep("REQUEST_TRIAL");
            }
          } else {
            setStep("SETUP_AVAILABILITY");
          }
        })
        .catch(() => {
          // If check fails, default to request trial but handle 428 on submit
          setStep("REQUEST_TRIAL");
        })
        .finally(() => {
          setCheckingAvailability(false);
          fetchTutorSlots();
        });

      // Check student trial stats & booked tutors
      const trialsQuery = currentUser?.id ? `?studentId=${currentUser.id}` : "";
      fetch(`/api/trials${trialsQuery}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.trialStats) {
            setTrialStats(d.trialStats);
          } else if (Array.isArray(d.trials)) {
            const active = d.trials.filter(
              (t: any) => t.status !== "CANCELLED" && t.status !== "REJECTED"
            );
            const booked = Array.from(
              new Set(
                active
                  .map((t: any) => t.tutorId || t.course?.tutorId || t.course?.tutor?.id || t.course?.instructor?.id)
                  .filter(Boolean)
              )
            ) as string[];
            setTrialStats({
              totalUsed: active.length,
              maxAllowed: 5,
              remaining: Math.max(0, 5 - active.length),
              bookedTutorIds: booked,
              isMaxReached: active.length >= 5,
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialCourseId, allCourses, courseId, initialTutorId, currentUser]);

  // Quick preset apply handler
  const handleApplyPreset = async (presetType: string) => {
    try {
      setSavingAvailability(true);
      setError(null);

      const res = await fetch("/api/student/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_preset",
          preset: presetType,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save study availability.");
      }

      // Re-fetch student availability to verify
      const studentQuery = currentUser?.id ? `?studentId=${currentUser.id}` : "";
      const checkRes = await fetch(`/api/student/availability${studentQuery}`);
      const checkData = await checkRes.json();
      if (checkData.availabilities) {
        setStudentAvailabilities(checkData.availabilities);
      }

      setAvailSuccessMsg("Your study availability has been configured! Matching tutor slots are highlighted below.");
      setStep("REQUEST_TRIAL");
      fetchTutorSlots();
    } catch (err: any) {
      console.error("Availability save error:", err);
      setError(err.message || "Could not configure study availability. Please try again.");
    } finally {
      setSavingAvailability(false);
    }
  };

  if (!isOpen) return null;

  const selectedCourse = allCourses.find((c) => c.id === courseId);
  const currentTutorId =
    initialTutorId ||
    selectedCourse?.instructor?.id ||
    (selectedCourse as any)?.tutorId ||
    (selectedCourse as any)?.tutor?.id;
  const currentTutorName =
    selectedCourse?.instructor?.name ||
    (selectedCourse as any)?.tutor?.name ||
    "this tutor";

  const isCurrentTutorBooked = Boolean(
    currentTutorId && trialStats?.bookedTutorIds?.includes(currentTutorId)
  );
  const isMaxTrialsReached = Boolean(
    trialStats?.isMaxReached || (trialStats && trialStats.totalUsed >= 5)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMaxTrialsReached) {
      setError("You have reached your maximum limit of 5 free trial sessions across different tutors.");
      return;
    }

    if (isCurrentTutorBooked) {
      setError(`You have already requested a free trial session with ${currentTutorName}. Each student can book up to 5 trials, but only 1 trial per tutor.`);
      return;
    }

    if (!preferredDate) {
      setError("Please select a preferred date and time for your free trial session.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const parsedUtcDate = parseDateTimeInputInTimezone(preferredDate, selectedTimezone);

      const res = await fetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_trial",
          courseId: courseId || null,
          tutorId: currentTutorId || null,
          studentId: currentUser?.id || null,
          studentName: currentUser?.name || null,
          studentEmail: currentUser?.email || null,
          preferredDate: parsedUtcDate.toISOString(),
          timezone: selectedTimezone,
          topic: topic?.trim() || "30-Min Free Trial & Syllabus Overview",
          notes: notes?.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        if (res.status === 428 || data.requiresAvailabilitySetup || data.code === "STUDY_AVAILABILITY_REQUIRED") {
          setStep("SETUP_AVAILABILITY");
          setError(data.error || "Please set up your study availability before requesting a trial session.");
          return;
        }
        throw new Error(data.error || "Failed to book trial session.");
      }

      setCreatedTrial(data.trial);
      setTrialStats((prev) => {
        if (!prev) return null;
        const newBooked = currentTutorId ? Array.from(new Set([...prev.bookedTutorIds, currentTutorId])) : prev.bookedTutorIds;
        const newUsed = prev.totalUsed + 1;
        return {
          totalUsed: newUsed,
          maxAllowed: 5,
          remaining: Math.max(0, 5 - newUsed),
          bookedTutorIds: newBooked,
          isMaxReached: newUsed >= 5,
        };
      });
      if (onSuccess) {
        onSuccess(data.trial);
      }
    } catch (err: any) {
      console.error("Trial request error:", err);
      setError(err.message || "Failed to book your trial. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0c2461] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  {step === "SETUP_AVAILABILITY" ? "Configure Your Study Hours" : "Request a 30-Min Free Trial"}
                </h3>
                {step === "SETUP_AVAILABILITY" ? (
                  <Badge className="bg-blue-100 text-blue-800 text-[10px] font-extrabold border-blue-200">
                    Step 1 of 2
                  </Badge>
                ) : isMaxTrialsReached ? (
                  <Badge className="bg-red-100 text-red-800 text-[10px] font-extrabold border-red-200">
                    5 of 5 Used
                  </Badge>
                ) : trialStats ? (
                  <Badge className="bg-blue-100 text-blue-800 text-[10px] font-extrabold border-blue-200">
                    Trial {trialStats.totalUsed + 1} of 5
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800 text-[10px] font-extrabold border-blue-200">
                    100% Free
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {step === "SETUP_AVAILABILITY"
                  ? "Required before booking consultations or classes"
                  : isMaxTrialsReached
                  ? "Maximum limit reached • 5 free trials per student"
                  : "Up to 5 free trials across different tutors (1 per tutor)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {checkingAvailability ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Checking academic availability...</p>
          </div>
        ) : step === "SETUP_AVAILABILITY" ? (
          <div className="space-y-3.5 animate-in fade-in duration-200 text-xs">
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-blue-950">
                    Step 1: Set Up Your Study Hours First
                  </h4>
                  <p className="text-[11px] text-blue-900/80 leading-relaxed">
                    Tutors schedule 1-on-1 individual classes and trials around your routine. Choose when you are free to study to immediately unlock trial booking!
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Select a 1-Click Quick Study Schedule:
              </span>

              {/* Preset 1: Weekday Evenings */}
              <div className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between gap-3 bg-white shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800">Weekday Evenings</div>
                    <div className="text-[10px] text-slate-500">Mon – Fri • 04:00 PM – 08:00 PM (After-School)</div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={savingAvailability}
                  onClick={() => handleApplyPreset("WEEKDAY_EVENINGS")}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg px-3.5 py-1.5 cursor-pointer shrink-0"
                >
                  {savingAvailability ? <Loader2 className="w-3 h-3 animate-spin" /> : "Use Schedule"}
                </Button>
              </div>

              {/* Preset 2: Weekend Intensives */}
              <div className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between gap-3 bg-white shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800">Weekend Study Intensives</div>
                    <div className="text-[10px] text-slate-500">Sat &amp; Sun • 10:00 AM – 03:00 PM (Past Paper Practice)</div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={savingAvailability}
                  onClick={() => handleApplyPreset("WEEKEND_STUDY")}
                  className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-lg px-3.5 py-1.5 cursor-pointer shrink-0"
                >
                  {savingAvailability ? <Loader2 className="w-3 h-3 animate-spin" /> : "Use Schedule"}
                </Button>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>💡 You can fine-tune specific days & times anytime in your Dashboard.</span>
              {studentAvailabilities.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStep("REQUEST_TRIAL")}
                  className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  Skip to Trial
                </button>
              )}
            </div>
          </div>
        ) : createdTrial ? (
          <div className="space-y-4 py-2 text-center animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-slate-900">
                Trial Request Submitted!
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Your 30-minute 1-on-1 trial request has been sent to your instructor. Your tutor will review and confirm the session date & time shortly.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Subject / Individual Class:</span>
                <span className="font-bold text-slate-900">
                  {createdTrial.course?.title || selectedCourse?.title || "London A/L Individual Class"}
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-slate-500">Requested Time:</span>
                <div className="text-right">
                  <span className="font-bold text-blue-800 flex items-center gap-1 justify-end">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    {formatForUser(createdTrial.preferredDate, selectedTimezone, {
                      includeDate: true,
                      includeTime: true,
                      includeAbbr: true,
                    })}
                    {" "}(30 mins)
                  </span>
                  {tutorBaseTimezone && tutorBaseTimezone !== selectedTimezone && (
                    <div className="text-[10px] text-slate-500 font-medium">
                      Tutor&apos;s time: {formatTimeInTimezone(createdTrial.preferredDate, tutorBaseTimezone, { includeAbbr: true })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Status:</span>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[11px] font-bold">
                  ⏳ Pending Tutor Confirmation
                </Badge>
              </div>
            </div>

            {trialStats && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Trial {trialStats.totalUsed} of 5 Booked
                </span>
                <span className="text-[11px] text-blue-800 font-bold">
                  {trialStats.remaining} trial{trialStats.remaining === 1 ? "" : "s"} left with other tutors
                </span>
              </div>
            )}

            <p className="text-[11px] text-slate-500 bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-left">
              💡 <strong>Next Step:</strong> As soon as your tutor accepts or confirms the time, you will receive an in-app notification and the Google Meet room link will appear on your Academic Dashboard.
            </p>

            <div className="pt-2">
              <Button
                onClick={onClose}
                className="w-full bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl py-2.5 shadow-xs cursor-pointer"
              >
                Got It, Return to Class
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {availSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{availSuccessMsg}</span>
              </div>
            )}

            {/* Availability Status Badge */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">
                  Your Study Availability is Set
                </span>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">
                  {studentAvailabilities.length} active window{studentAvailabilities.length > 1 ? "s" : ""}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setStep("SETUP_AVAILABILITY")}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
              >
                Edit Hours
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Trial Limit Notice Banners */}
            {isMaxTrialsReached ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Maximum 5 Free Trials Used</span>
                </div>
                <p className="text-[11px] text-red-700 leading-relaxed">
                  You have already used all 5 of your free trial sessions across different tutors. To book more 1-on-1 classes, you can enroll or purchase session token packages.
                </p>
              </div>
            ) : isCurrentTutorBooked ? (
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>1 Trial Per Tutor Limit</span>
                </div>
                <p className="text-[11px] text-blue-800/90 leading-relaxed">
                  You have already requested a free trial with <strong>{currentTutorName}</strong>. Students can request up to 5 free trials, but each trial must be with a different tutor. {allCourses.length > 1 ? "Please select a different class or tutor below." : "Please select another tutor from the individual classes directory."}
                </p>
              </div>
            ) : trialStats && (
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/70 flex items-center justify-between text-xs text-blue-900">
                <span className="font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Free Trial <strong>{trialStats.totalUsed + 1} of 5</strong>
                </span>
                <span className="text-[11px] text-blue-700 font-bold">
                  {trialStats.remaining} remaining • 1 per tutor
                </span>
              </div>
            )}

            {/* Subject / Individual Class Selection or Display */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>Selected Subject / Individual Class</span>
                </span>
                {allCourses.length > 1 && (
                  <span className="text-[10px] text-blue-600 font-semibold">Change Subject</span>
                )}
              </div>
              {allCourses.length > 1 ? (
                <select
                  value={courseId}
                  onChange={(e) => {
                    const newCourseId = e.target.value;
                    setCourseId(newCourseId);
                    const newCourse = allCourses.find((c) => c.id === newCourseId);
                    const newTutorId = newCourse?.instructor?.id || (newCourse as any)?.tutorId || (newCourse as any)?.tutor?.id;
                    fetchTutorSlots(newTutorId, newCourseId);
                  }}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {allCourses.map((c) => {
                    const cTutorId = c.instructor?.id || (c as any)?.tutorId || (c as any)?.tutor?.id;
                    const cTutorName = c.instructor?.name || (c as any)?.tutor?.name || "Tutor";
                    const isBooked = cTutorId && trialStats?.bookedTutorIds?.includes(cTutorId);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.title} — {cTutorName} {isBooked ? " (Trial Already Booked)" : ""}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="font-extrabold text-xs text-slate-900 leading-snug">
                    {selectedCourse?.title || (allCourses.length > 0 ? allCourses[0].title : "London A/L Tutorial Individual Class")}
                  </div>
                  {selectedCourse?.subjectCode && (
                    <Badge variant="outline" className="text-[10px] font-bold bg-white text-blue-700 border-blue-200 shrink-0">
                      {selectedCourse.subjectCode}
                    </Badge>
                  )}
                </div>
              )}
              {currentTutorName && (
                <div className="text-[11px] text-slate-500 pt-0.5 flex items-center justify-between">
                  <span>
                    Tutor: <span className="font-semibold text-slate-700">{currentTutorName}</span>
                  </span>
                  {isCurrentTutorBooked && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">
                      Already Booked
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Regional Timezone Selector */}
            <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200/80 space-y-1.5">
              <div className="text-[10px] font-bold text-sky-900 uppercase tracking-wider flex items-center justify-between">
                <span>Your Regional Timezone</span>
                <span className="text-[10px] text-sky-700 font-medium">Slots adjust automatically</span>
              </div>
              <RegionalTimezoneSelector
                selectedTimezone={selectedTimezone}
                onChange={(tz) => {
                  setSelectedTimezone(tz);
                  fetchTutorSlots(undefined, undefined, undefined, tz);
                }}
                tutorBaseTimezone={tutorBaseTimezone}
                compact
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 block">
                  Preferred Date &amp; Time <span className="text-red-500">*</span>
                </label>
                {preferredDate ? (
                  <span className="text-[11px] font-bold text-blue-700 font-sans">
                    {formatTimeInTimezone(new Date(preferredDate), selectedTimezone, { includeAbbr: true })}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Verified against class schedule</span>
                )}
              </div>

              {openSlots.length > 0 && (
                <div className="mb-2 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Quick Available Tutor Slots:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {openSlots.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPreferredDate(formatForDateTimeInput(s.startTime, selectedTimezone));
                        }}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                          s.matchesStudent
                            ? "bg-blue-100 hover:bg-blue-200/80 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-300/60"
                            : "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800"
                        }`}
                      >
                        <Clock className={`w-2.5 h-2.5 ${s.matchesStudent ? "text-blue-700" : "text-blue-600"}`} />
                        <span>{s.dateLabel.split(",")[0]}: {s.timeDisplay}</span>
                        {s.tutorTimeDisplay && s.tutorTimeDisplay !== s.timeDisplay && (
                          <span className="text-[9px] text-slate-500 font-medium">
                            ({s.tutorTimeDisplay} LK)
                          </span>
                        )}
                        {s.matchesStudent && <span className="text-[9px] text-blue-800 font-extrabold">🌟 Mutual Match</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <input
                type="datetime-local"
                required
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Topic or Questions of Interest
              </label>
              <input
                type="text"
                placeholder="Mention any specific syllabus modules or questions (optional)..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Additional Notes / Target Exam
              </label>
              <input
                type="text"
                placeholder="E.g. Target May/June 2026 series, Edexcel P2..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>30-Minute Live Online Interactive Consultation</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Connect directly with our subject tutors over video for syllabus diagnostics, problem-solving, and a tailored study plan.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || isMaxTrialsReached || isCurrentTutorBooked || !preferredDate}
                className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-5 gap-1.5 shadow-md shadow-blue-900/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Reserving Session...</span>
                  </>
                ) : isMaxTrialsReached ? (
                  <span>5 of 5 Free Trials Used</span>
                ) : isCurrentTutorBooked ? (
                  <span>Already Booked With Tutor</span>
                ) : (
                  <>
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Confirm 30-Min Free Trial</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
