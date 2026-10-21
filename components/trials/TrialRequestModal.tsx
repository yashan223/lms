"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Award,
  Globe,
  Lock,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { CountryFlag } from "@/components/ui/CountryFlag";
import {
  getRegionalTimezone,
  DEFAULT_TIMEZONE,
  getTimezoneOffsetString,
  formatTimeInTimezone,
  formatDateInTimezone,
  formatForUser,
  formatForDateTimeInput,
  parseDateTimeInputInTimezone,
  getDualTimeDisplay,
  getTimezoneAbbr,
  getDatePartsInTimezone,
  createDateFromTimezoneParts,
} from "@/lib/timezones";
import { getStudentAcademicLevel, isCourseOL, isCourseAL } from "@/lib/currency";

interface TrialRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourseId?: string;
  initialTutorId?: string;
  allCourses?: Array<{
    id: string;
    title: string;
    slug?: string;
    level?: string | null;
    subjectCode?: string | null;
    tutorId?: string;
    tutor?: {
      id: string;
      name: string;
      headline?: string | null;
      avatar?: string | null;
      timezone?: string | null;
      country?: string | null;
    } | null;
    instructor?: {
      id: string;
      name: string;
      headline?: string | null;
      avatar?: string | null;
      timezone?: string | null;
      country?: string | null;
    } | null;
  }>;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    academicLevel?: string | null;
    headline?: string | null;
    timezone?: string | null;
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
  const [preferredDate1, setPreferredDate1] = useState("");
  const [preferredDate2, setPreferredDate2] = useState("");
  const [preferredDate3, setPreferredDate3] = useState("");
  const [activeSlotTarget, setActiveSlotTarget] = useState<1 | 2 | 3>(1);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTrial, setCreatedTrial] = useState<any | null>(null);
  const resolveAccountTimezone = (tz?: string | null): string | null => {
    if (!tz) return null;
    try {
      return getRegionalTimezone(tz).id;
    } catch {
      return tz;
    }
  };

  const [selectedTimezone, setSelectedTimezone] = useState<string>(() => {
    const accTz = resolveAccountTimezone(currentUser?.timezone);
    return accTz || DEFAULT_TIMEZONE;
  });

  const userAcademicTrack = currentUser ? getStudentAcademicLevel(currentUser) : null;
  const trackCourses = useMemo(() => {
    if (!userAcademicTrack) return allCourses;
    const filtered = allCourses.filter((c) =>
      userAcademicTrack === "OL" ? isCourseOL(c) : isCourseAL(c)
    );
    return filtered.length > 0 ? filtered : allCourses;
  }, [allCourses, userAcademicTrack]);

  const currentSelectedCourse = useMemo(() => {
    return (
      allCourses.find((c) => c.id === (courseId || initialCourseId)) ||
      trackCourses[0] ||
      allCourses[0]
    );
  }, [allCourses, courseId, initialCourseId, trackCourses]);

  const currentCourseTutor = useMemo(() => {
    return currentSelectedCourse?.tutor || currentSelectedCourse?.instructor;
  }, [currentSelectedCourse]);

  const initialResolvedTutorTimezone = useMemo(() => {
    if (currentCourseTutor?.timezone) return currentCourseTutor.timezone;
    if (currentCourseTutor?.country) {
      try {
        return getRegionalTimezone(currentCourseTutor.country).id;
      } catch {}
    }
    return DEFAULT_TIMEZONE;
  }, [currentCourseTutor]);

  const [tutorBaseTimezone, setTutorBaseTimezone] = useState<string>(() => initialResolvedTutorTimezone);

  useEffect(() => {
    if (initialResolvedTutorTimezone && initialResolvedTutorTimezone !== DEFAULT_TIMEZONE) {
      setTutorBaseTimezone(initialResolvedTutorTimezone);
    }
  }, [initialResolvedTutorTimezone]);

  const currentRegion = useMemo(
    () => getRegionalTimezone(selectedTimezone),
    [selectedTimezone]
  );
  const baseRegion = useMemo(
    () => getRegionalTimezone(tutorBaseTimezone),
    [tutorBaseTimezone]
  );
  const liveOffset = useMemo(
    () => getTimezoneOffsetString(new Date(), currentRegion.id),
    [currentRegion.id]
  );
  const isDifferentFromBase = currentRegion.id !== baseRegion.id;

  const [openSlots, setOpenSlots] = useState<
    Array<{
      startTime: string;
      timeDisplay: string;
      tutorTimeDisplay?: string;
      dateLabel: string;
      date?: string;
      matchesStudent?: boolean;
      isMutualMatch?: boolean;
      isAvailable?: boolean;
      isLocked?: boolean;
      conflict?: {
        type?: string;
        title?: string;
        conflictParty?: "TUTOR" | "STUDENT";
      } | null;
      dualTime?: any;
    }>
  >([]);

  const [availabilityDays, setAvailabilityDays] = useState<any[]>([]);
  const [selectedDayKey, setSelectedDayKey] = useState<string>("RECOMMENDED");
  const [showAllMatches, setShowAllMatches] = useState(false);

  useEffect(() => {
    const accTz = resolveAccountTimezone(currentUser?.timezone);
    if (accTz) {
      setSelectedTimezone(accTz);
    }
  }, [currentUser?.timezone]);

  const handleAutoFillBest = () => {
    const allMatches = openSlots.filter((s) => s.isMutualMatch && !s.isLocked);
    const pool =
      allMatches.length >= 3
        ? allMatches
        : [...allMatches, ...openSlots.filter((s) => s.isAvailable && !s.isLocked)];
    if (pool[0]) setPreferredDate1(formatForDateTimeInput(pool[0].startTime, selectedTimezone));
    if (pool[1]) setPreferredDate2(formatForDateTimeInput(pool[1].startTime, selectedTimezone));
    if (pool[2]) setPreferredDate3(formatForDateTimeInput(pool[2].startTime, selectedTimezone));
    setError(null);
  };

  const daysWithSlots = useMemo(() => {
    return availabilityDays.filter((d: any) => Array.isArray(d.slots) && d.slots.some((s: any) => !s.isPast));
  }, [availabilityDays]);

  const allMutualMatches = useMemo(() => {
    return openSlots.filter((s) => s.isMutualMatch && !s.isLocked);
  }, [openSlots]);

  const currentDisplaySlots = useMemo(() => {
    if (selectedDayKey === "RECOMMENDED") {
      if (allMutualMatches.length > 0) {
        return showAllMatches ? allMutualMatches : allMutualMatches.slice(0, 8);
      }
      const availableOnly = openSlots.filter((s) => s.isAvailable && !s.isLocked);
      return availableOnly.slice(0, 8);
    }
    const day = availabilityDays.find((d: any) => d.date === selectedDayKey);
    if (!day || !day.slots) return [];
    return day.slots
      .filter((s: any) => !s.isPast)
      .map((s: any) => {
        const isLocked = Boolean(s.conflict);
        const isMutual = Boolean(!isLocked && (s.matchesStudentAvailability || s.isMutualMatch));
        const isAvail = Boolean(s.isAvailable && !isLocked);
        return {
          startTime: s.startTime,
          timeDisplay: s.timeDisplay,
          tutorTimeDisplay: s.tutorTimeDisplay,
          dateLabel: day.dateLabel,
          date: day.date,
          matchesStudent: isMutual,
          isMutualMatch: isMutual,
          isAvailable: isAvail,
          isLocked,
          conflict: s.conflict || null,
          dualTime: s.dualTime,
        };
      });
  }, [selectedDayKey, allMutualMatches, showAllMatches, openSlots, availabilityDays]);

  const fetchTutorSlots = (
    tutorIdParam?: string,
    courseIdParam?: string,
    studentIdParam?: string,
    tzOverride?: string
  ) => {
    const targetTutorId =
      tutorIdParam ||
      initialTutorId ||
      trackCourses.find((c) => c.id === (courseIdParam || courseId))?.instructor?.id;
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
          setAvailabilityDays(d.days);
          const mutualMatchSlots: any[] = [];
          const availableSlots: any[] = [];
          const lockedSlots: any[] = [];

          for (const day of d.days) {
            for (const s of day.slots || []) {
              if (s.isPast) continue;

              const isLocked = Boolean(s.conflict);
              const isMutual = Boolean(!isLocked && (s.matchesStudentAvailability || s.isMutualMatch));
              const isAvail = Boolean(s.isAvailable && !isLocked);

              const slotObj = {
                startTime: s.startTime,
                timeDisplay: s.timeDisplay,
                tutorTimeDisplay: s.tutorTimeDisplay,
                dateLabel: day.dateLabel,
                date: day.date,
                matchesStudent: isMutual,
                isMutualMatch: isMutual,
                isAvailable: isAvail,
                isLocked,
                conflict: s.conflict || null,
                dualTime: s.dualTime,
              };

              if (isLocked) {
                lockedSlots.push(slotObj);
              } else if (isMutual) {
                mutualMatchSlots.push(slotObj);
              } else if (isAvail) {
                availableSlots.push(slotObj);
              }
            }
          }

          const prioritizedSlots = [
            ...mutualMatchSlots,
            ...availableSlots,
            ...lockedSlots,
          ];

          setOpenSlots(prioritizedSlots);

          // Priority for pre-filling Choice 1, 2, 3:
          // 1. Take mutual matches where both tutor and student can attend
          // 2. If fewer than 3 mutual matches, fill remaining with probable available times within tutor's availability
          const choicesToFill: string[] = [];
          for (const m of mutualMatchSlots) {
            if (choicesToFill.length < 3) choicesToFill.push(m.startTime);
          }
          for (const a of availableSlots) {
            if (choicesToFill.length < 3) choicesToFill.push(a.startTime);
          }

          if (choicesToFill[0]) {
            setPreferredDate1(formatForDateTimeInput(choicesToFill[0], tz));
          }
          if (choicesToFill[1]) {
            setPreferredDate2(formatForDateTimeInput(choicesToFill[1], tz));
          }
          if (choicesToFill[2]) {
            setPreferredDate3(formatForDateTimeInput(choicesToFill[2], tz));
          }
        }
      })
      .catch(() => {});
  };

  const applyTutorSlot = (slotStartTime: string) => {
    const targetSlot = openSlots.find((s) => s.startTime === slotStartTime);
    if (targetSlot?.isLocked || targetSlot?.conflict) {
      setError("This time slot is locked because a session is already scheduled. Please choose an available time.");
      return;
    }
    setError(null);
    const formatted = formatForDateTimeInput(slotStartTime, selectedTimezone);
    if (activeSlotTarget === 1) {
      setPreferredDate1(formatted);
      setActiveSlotTarget(2);
    } else if (activeSlotTarget === 2) {
      setPreferredDate2(formatted);
      setActiveSlotTarget(3);
    } else {
      setPreferredDate3(formatted);
      setActiveSlotTarget(1);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialCourseId) {
        setCourseId(initialCourseId);
      } else if (trackCourses.length > 0 && !courseId) {
        setCourseId(trackCourses[0].id);
      }

      // Default to account timezone if known
      const accTz = resolveAccountTimezone(currentUser?.timezone);
      const activeTz = accTz || selectedTimezone;
      if (accTz && accTz !== selectedTimezone) {
        setSelectedTimezone(accTz);
      }

      const activeTutorTz = initialResolvedTutorTimezone || tutorBaseTimezone;

      // Base default slot times strictly in the TUTOR'S region (10:00, 14:00, 11:00) then convert to student's account timezone
      const now = new Date();
      const tomorrowTutor = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tutorParts = getDatePartsInTimezone(tomorrowTutor, activeTutorTz);
      const defaultSlot1 = createDateFromTimezoneParts(tutorParts.dateStr, "10:00", activeTutorTz);
      const defaultSlot2 = createDateFromTimezoneParts(tutorParts.dateStr, "14:00", activeTutorTz);
      const dayAfterTutor = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const dayAfterParts = getDatePartsInTimezone(dayAfterTutor, activeTutorTz);
      const defaultSlot3 = createDateFromTimezoneParts(dayAfterParts.dateStr, "11:00", activeTutorTz);

      setPreferredDate1(formatForDateTimeInput(defaultSlot1, activeTz));
      setPreferredDate2(formatForDateTimeInput(defaultSlot2, activeTz));
      setPreferredDate3(formatForDateTimeInput(defaultSlot3, activeTz));

      setError(null);
      setCreatedTrial(null);
      setAvailSuccessMsg(null);

      setCheckingAvailability(true);
      const studentQuery = currentUser?.id ? `?studentId=${currentUser.id}` : "";
      fetch(`/api/student/availability${studentQuery}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.timezone) {
            const fetchedAccTz = resolveAccountTimezone(data.timezone);
            if (fetchedAccTz) {
              setSelectedTimezone(fetchedAccTz);
              fetchTutorSlots(undefined, undefined, undefined, fetchedAccTz);
            }
          }
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
          setStep("REQUEST_TRIAL");
        })
        .finally(() => {
          setCheckingAvailability(false);
          fetchTutorSlots();
        });

      if (!accTz) {
        fetch("/api/dashboard")
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.user?.timezone) {
              const dashAccTz = resolveAccountTimezone(d.user.timezone);
              if (dashAccTz) {
                setSelectedTimezone(dashAccTz);
                fetchTutorSlots(undefined, undefined, undefined, dashAccTz);
              }
            }
          })
          .catch(() => {});
      }

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
  }, [isOpen, initialCourseId, allCourses, trackCourses, courseId, initialTutorId, currentUser]);

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
          timezone: selectedTimezone,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save study availability.");
      }

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

  const selectedCourse = trackCourses.find((c) => c.id === courseId) || allCourses.find((c) => c.id === courseId);
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

    if (!preferredDate1 || !preferredDate2 || !preferredDate3) {
      setError("Please select all 3 preferred dates & times for your class session so your tutor can review and confirm the best matching time.");
      return;
    }

    // Check if any of the preferred dates match a locked slot
    const selectedDates = [preferredDate1, preferredDate2, preferredDate3];
    for (let i = 0; i < selectedDates.length; i++) {
      const d = selectedDates[i];
      const lockedMatch = openSlots.find(
        (s) => s.isLocked && formatForDateTimeInput(s.startTime, selectedTimezone) === d
      );
      if (lockedMatch) {
        setError(`Choice ${i + 1} conflicts with a locked session (${lockedMatch.conflict?.conflictParty === 'TUTOR' ? 'Tutor is busy' : 'You are busy'}). Please pick an available time slot.`);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const parsedUtc1 = parseDateTimeInputInTimezone(preferredDate1, selectedTimezone);
      const parsedUtc2 = parseDateTimeInputInTimezone(preferredDate2, selectedTimezone);
      const parsedUtc3 = parseDateTimeInputInTimezone(preferredDate3, selectedTimezone);

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
          preferredDate: parsedUtc1.toISOString(),
          preferredDates: [
            parsedUtc1.toISOString(),
            parsedUtc2.toISOString(),
            parsedUtc3.toISOString(),
          ],
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
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex">
      <div className="bg-slate-50 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
        <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0c2461] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
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
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {checkingAvailability ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Checking academic availability...</p>
          </div>
        ) : step === "SETUP_AVAILABILITY" ? (
          <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
            <div className="max-w-2xl mx-auto space-y-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-blue-950">
                      Step 1: Set Up Your Study Hours First
                    </h4>
                    <p className="text-xs text-blue-900/80 leading-relaxed">
                      Tutors schedule 1-on-1 individual classes and trials around your routine. Choose when you are free to study to immediately unlock trial booking!
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Select a 1-Click Quick Study Schedule:
                </span>

                <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between gap-4 bg-white shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800">Weekday Evenings</div>
                      <div className="text-xs text-slate-500">Mon – Fri • 04:00 PM – 08:00 PM (After-School)</div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingAvailability}
                    onClick={() => handleApplyPreset("WEEKDAY_EVENINGS")}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl px-4 py-2 cursor-pointer shrink-0"
                  >
                    {savingAvailability ? <Loader2 className="w-4 h-4 animate-spin" /> : "Use Schedule"}
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between gap-4 bg-white shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800">Weekend Study Intensives</div>
                      <div className="text-xs text-slate-500">Sat &amp; Sun • 10:00 AM – 03:00 PM (Past Paper Practice)</div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingAvailability}
                    onClick={() => handleApplyPreset("WEEKEND_STUDY")}
                    className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-4 py-2 cursor-pointer shrink-0"
                  >
                    {savingAvailability ? <Loader2 className="w-4 h-4 animate-spin" /> : "Use Schedule"}
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
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

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="text-xs font-semibold rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : createdTrial ? (
          <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
            <div className="max-w-2xl mx-auto space-y-4 py-2 text-center animate-in fade-in duration-200 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-sm">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-base sm:text-lg text-slate-900">
                  Trial Request Submitted!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                  Your 30-minute 1-on-1 trial request has been sent to your instructor. Your tutor will review and confirm the session date & time shortly.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Subject / Individual Class:</span>
                  <span className="font-bold text-slate-900">
                    {createdTrial.course?.title || selectedCourse?.title || "London A/L Individual Class"}
                  </span>
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 font-bold block text-xs">3 Requested Time Options:</span>
                  <div className="space-y-1.5">
                    {(Array.isArray(createdTrial.preferredDates) && createdTrial.preferredDates.length > 0
                      ? createdTrial.preferredDates
                      : [createdTrial.preferredDate]
                    ).map((dStr: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-white px-3.5 py-2 rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold inline-flex items-center justify-center">{idx + 1}</span>
                          <span>Choice {idx + 1}</span>
                        </span>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <span className="font-mono text-blue-800 font-bold text-xs inline-flex items-center gap-1.5">
                            <span>
                              {formatForUser(dStr, selectedTimezone, {
                                includeDate: true,
                                includeTime: true,
                                includeAbbr: false,
                              })}
                            </span>
                            <CountryFlag countryCode={getRegionalTimezone(selectedTimezone).countryCode} flagEmoji={getRegionalTimezone(selectedTimezone).flag} size="xs" />
                          </span>
                          {isDifferentFromBase && (
                            <span className="text-[10px] text-slate-500 font-normal inline-flex items-center gap-1">
                              <span>(Tutor: {formatTimeInTimezone(dStr, tutorBaseTimezone)}</span>
                              <CountryFlag countryCode={baseRegion.countryCode} flagEmoji={baseRegion.flag} size="xs" />
                              <span>)</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    Your tutor will review these 3 options and confirm only 1 matching time slot.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500">Status:</span>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-bold">
                    ⏳ Pending Tutor Selection
                  </Badge>
                </div>
              </div>

              {trialStats && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-blue-600" />
                    Trial {trialStats.totalUsed} of 5 Booked
                  </span>
                  <span className="text-xs text-blue-800 font-bold">
                    {trialStats.remaining} trial{trialStats.remaining === 1 ? "" : "s"} left with other tutors
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-500 bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-left">
                💡 <strong>Next Step:</strong> As soon as your tutor accepts or confirms the time, you will receive an in-app notification and the live classroom link will appear on your Academic Dashboard.
              </p>

              <div className="pt-2">
                <Button
                  onClick={onClose}
                  className="w-full bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl py-3 shadow-xs cursor-pointer"
                >
                  Got It, Return to Class
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
              <div className="max-w-4xl mx-auto space-y-4">
                {availSuccessMsg && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{availSuccessMsg}</span>
                  </div>
                )}


                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {isMaxTrialsReached ? (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-red-800">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Maximum 5 Free Trials Used</span>
                    </div>
                    <p className="text-[11px] text-red-700 leading-relaxed">
                      You have already used all 5 of your free trial sessions across different tutors. To book more 1-on-1 classes, you can enroll or purchase session token packages.
                    </p>
                  </div>
                ) : isCurrentTutorBooked ? (
                  <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-blue-800">
                      <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>1 Trial Per Tutor Limit</span>
                    </div>
                    <p className="text-[11px] text-blue-800/90 leading-relaxed">
                      You have already requested a free trial with <strong>{currentTutorName}</strong>. Students can request up to 5 free trials, but each trial must be with a different tutor. {trackCourses.length > 1 ? "Please select a different class or tutor below." : "Please select another tutor from the individual classes directory."}
                    </p>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>Selected Subject / Individual Class</span>
                      </span>
                      {trackCourses.length > 1 && (
                        <span className="text-[10px] text-blue-600 font-semibold">Change Subject</span>
                      )}
                    </div>
                    {trackCourses.length > 1 ? (
                      <select
                        value={courseId}
                        onChange={(e) => {
                          const newCourseId = e.target.value;
                          setCourseId(newCourseId);
                          const newCourse = trackCourses.find((c) => c.id === newCourseId);
                          const newTutorId = newCourse?.instructor?.id || (newCourse as any)?.tutorId || (newCourse as any)?.tutor?.id;
                          fetchTutorSlots(newTutorId, newCourseId);
                        }}
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {trackCourses.map((c) => {
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
                        <div className="font-extrabold text-sm text-slate-900 leading-snug">
                          {selectedCourse?.title || (trackCourses.length > 0 ? trackCourses[0].title : "London A/L Tutorial Individual Class")}
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

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <div className="text-[10px] font-bold text-sky-900 uppercase tracking-wider flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span>Your Regional Timezone</span>
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                          Account Default
                        </span>
                      </div>
                      <span className="text-[10px] text-sky-700 font-medium shrink-0">Slots adjust automatically</span>
                    </div>

                    <div className="flex items-center justify-between gap-2.5 rounded-xl border border-sky-200 bg-white/95 px-3.5 py-2 text-xs shadow-xs">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <CountryFlag countryCode={currentRegion.countryCode} flagEmoji={currentRegion.flag} size="sm" />
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-slate-900 truncate">
                            {currentRegion.region}
                          </span>
                          <span className="text-[11px] font-mono font-medium text-sky-700 bg-sky-100/80 px-1.5 py-0.5 rounded shrink-0">
                            {liveOffset}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isDifferentFromBase && (
                      <div className="mt-1 flex items-center gap-1.5 px-0.5 text-[11px] text-amber-800">
                        <Globe className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          <span>Slots converted to your account time. Tutor base:</span>
                          <strong className="font-medium text-slate-800 inline-flex items-center gap-1">
                            <CountryFlag countryCode={baseRegion.countryCode} flagEmoji={baseRegion.flag} size="xs" />
                            <span>{baseRegion.region}</span>
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <label className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>Select 3 Preferred Class Times</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Provide 3 convenient time options. Your tutor will confirm <strong>only 1</strong> matching time slot.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200 shrink-0">
                      3 Slots Required
                    </span>
                  </div>

                  {openSlots.length > 0 && (
                    <div className="space-y-3 p-3.5 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-200">
                      {/* Navigation & Action Header */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            <span>Quick Slots</span>
                          </span>
                          {allMutualMatches.length > 0 && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span>{allMutualMatches.length} Mutual Matches</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                            Clicking fills Choice {activeSlotTarget}
                          </span>
                          {openSlots.some((s) => s.isAvailable && !s.isLocked) && (
                            <button
                              type="button"
                              onClick={handleAutoFillBest}
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Automatically fills 1st, 2nd, and 3rd choices with the best mutual matching slots"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span>Auto-fill 3</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Day Tabs */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        <button
                          type="button"
                          onClick={() => setSelectedDayKey("RECOMMENDED")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                            selectedDayKey === "RECOMMENDED"
                              ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                              : "bg-white text-emerald-900 hover:bg-emerald-50 border-emerald-200"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Best Matches</span>
                          {allMutualMatches.length > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              selectedDayKey === "RECOMMENDED" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {allMutualMatches.length}
                            </span>
                          )}
                        </button>

                        {daysWithSlots.map((d: any) => {
                          const isSelected = selectedDayKey === d.date;
                          const mutualCount = d.slots.filter((s: any) => !s.isPast && !s.conflict && (s.isMutualMatch || s.matchesStudentAvailability)).length;
                          const [dayName, ...restDate] = d.dateLabel.split(",");
                          const dateSub = restDate.join(",").trim();

                          return (
                            <button
                              key={d.date}
                              type="button"
                              onClick={() => setSelectedDayKey(d.date)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                              }`}
                            >
                              <span>{dayName}</span>
                              {dateSub && (
                                <span className={`text-[10px] ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                                  {dateSub}
                                </span>
                              )}
                              {mutualCount > 0 && (
                                <span
                                  title={`${mutualCount} mutual matches`}
                                  className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-emerald-300 ring-1 ring-white/50" : "bg-emerald-500"}`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Grid of Slots */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                        {currentDisplaySlots.map((s: any, idx: number) => {
                          const isLocked = Boolean(s.isLocked || s.conflict);
                          const isMutual = Boolean(s.isMutualMatch || s.matchesStudent);
                          const slotIsoFormatted = formatForDateTimeInput(s.startTime, selectedTimezone);
                          const isChoice1 = preferredDate1 === slotIsoFormatted;
                          const isChoice2 = preferredDate2 === slotIsoFormatted;
                          const isChoice3 = preferredDate3 === slotIsoFormatted;
                          const choiceNum = isChoice1 ? 1 : isChoice2 ? 2 : isChoice3 ? 3 : null;

                          if (isLocked) {
                            const party = s.conflict?.conflictParty === "TUTOR" ? "Tutor Busy" : "Student Busy";
                            return (
                              <div
                                key={idx}
                                title={`Locked: ${s.conflict?.title || "Session scheduled"} (${party}). Unavailable.`}
                                className="px-2.5 py-2 rounded-xl border border-red-200/80 bg-red-50/70 text-red-700 text-xs font-medium cursor-not-allowed flex items-center justify-between gap-1.5 opacity-80 select-none shadow-2xs"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                  <span className="font-mono text-xs line-through decoration-red-400 truncate">
                                    {selectedDayKey === "RECOMMENDED" ? `${s.dateLabel.split(",")[0]} ` : ""}{s.timeDisplay}
                                  </span>
                                </div>
                                <span className="text-[9px] font-bold text-red-700 bg-red-100/90 border border-red-200 px-1 py-0.2 rounded shrink-0">
                                  Locked
                                </span>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => applyTutorSlot(s.startTime)}
                              className={`group px-2.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-1.5 text-left ${
                                choiceNum !== null
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/30 font-bold"
                                  : isMutual
                                  ? "bg-emerald-50/80 hover:bg-emerald-100/90 border-emerald-300 hover:border-emerald-400 text-emerald-950 font-bold shadow-2xs"
                                  : "bg-white hover:bg-blue-50/80 border-slate-200 hover:border-blue-300 text-slate-700 shadow-2xs"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <Clock className={`w-3.5 h-3.5 shrink-0 ${choiceNum ? "text-white" : isMutual ? "text-emerald-700" : "text-blue-600"}`} />
                                <div className="flex flex-col min-w-0 leading-tight">
                                  <span className="font-mono truncate">
                                    {selectedDayKey === "RECOMMENDED" ? `${s.dateLabel.split(",")[0]} ` : ""}{s.timeDisplay}
                                  </span>
                                  {s.tutorTimeDisplay && s.tutorTimeDisplay !== s.timeDisplay && (
                                    <span className={`text-[10px] font-normal truncate inline-flex items-center gap-0.5 ${
                                      choiceNum ? "text-blue-100" : "text-slate-500"
                                    }`}>
                                      <span>{s.tutorTimeDisplay}</span>
                                      <CountryFlag countryCode={baseRegion.countryCode} flagEmoji={baseRegion.flag} size="xs" />
                                    </span>
                                  )}
                                </div>
                              </div>

                              {choiceNum !== null ? (
                                <span className="text-[9px] font-extrabold bg-white text-blue-700 px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                                  #{choiceNum}
                                </span>
                              ) : isMutual ? (
                                <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-200/90 border border-emerald-300 px-1.5 py-0.2 rounded-full shrink-0">
                                  ★ Match
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      {/* Toggle show all matches if in RECOMMENDED mode */}
                      {selectedDayKey === "RECOMMENDED" && allMutualMatches.length > 8 && (
                        <div className="text-center pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAllMatches(!showAllMatches)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>{showAllMatches ? "Show Fewer Matches" : `View All ${allMutualMatches.length} Mutual Matches`}</span>
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAllMatches ? "-rotate-90" : "rotate-90"}`} />
                          </button>
                        </div>
                      )}

                      {/* Legend Footer */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-semibold text-emerald-900">★ Mutual Match</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-300 border border-slate-400" />
                            <span>Tutor Available</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-400" />
                            <span>🔒 Locked</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 italic">
                          Times adjust to your account timezone
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        activeSlotTarget === 1 ? "bg-blue-50/20 border-blue-500 ring-2 ring-blue-500/10 shadow-xs" : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setActiveSlotTarget(1)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-extrabold inline-flex items-center justify-center">1</span>
                          <span>1st Choice (Primary) <span className="text-red-500">*</span></span>
                        </span>
                      </div>
                      <input
                        type="datetime-local"
                        required
                        value={preferredDate1}
                        onFocus={() => setActiveSlotTarget(1)}
                        onChange={(e) => setPreferredDate1(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        activeSlotTarget === 2 ? "bg-blue-50/20 border-blue-500 ring-2 ring-blue-500/10 shadow-xs" : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setActiveSlotTarget(2)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-extrabold inline-flex items-center justify-center">2</span>
                          <span>2nd Choice (Alternative) <span className="text-red-500">*</span></span>
                        </span>
                      </div>
                      <input
                        type="datetime-local"
                        required
                        value={preferredDate2}
                        onFocus={() => setActiveSlotTarget(2)}
                        onChange={(e) => setPreferredDate2(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        activeSlotTarget === 3 ? "bg-blue-50/20 border-blue-500 ring-2 ring-blue-500/10 shadow-xs" : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setActiveSlotTarget(3)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-extrabold inline-flex items-center justify-center">3</span>
                          <span>3rd Choice (Alternative) <span className="text-red-500">*</span></span>
                        </span>
                      </div>
                      <input
                        type="datetime-local"
                        required
                        value={preferredDate3}
                        onFocus={() => setActiveSlotTarget(3)}
                        onChange={(e) => setPreferredDate3(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <label className="font-bold text-xs text-slate-700 block mb-1.5">
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

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <label className="font-bold text-xs text-slate-700 block mb-1.5">
                      Additional Notes / Target Exam
                    </label>
                    <input
                      type="text"
                      placeholder="Target exam series, syllabus units, or coaching goals..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>30-Minute Live Online Interactive Consultation</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Connect directly with our subject tutors over video for syllabus diagnostics, problem-solving, and a tailored study plan.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border-t border-slate-200 px-6 sm:px-8 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
              <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-600" />
                <span>30-Min Live 1-on-1 Consultation • Direct Video Session with Tutor</span>
              </div>
              <div className="flex items-center gap-2.5 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="text-xs font-semibold rounded-xl h-9 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || isMaxTrialsReached || isCurrentTutorBooked || !preferredDate1 || !preferredDate2 || !preferredDate3}
                  className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-5 h-9 gap-1.5 shadow-md shadow-blue-900/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
