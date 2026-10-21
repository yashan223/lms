"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Lock,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  User,
  GraduationCap,
  CalendarClock,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CountryFlag } from "@/components/ui/CountryFlag";
import {
  DEFAULT_TIMEZONE,
  format24hTo12h,
  getRegionalTimezone,
  getTimezoneOffsetString,
} from "@/lib/timezones";
import { mergeConsecutiveSlots } from "@/lib/scheduling";

interface SlotItem {
  startTime: string;
  endTime: string;
  timeDisplay: string;
  tutorTimeDisplay?: string;
  isAvailable: boolean;
  isPast: boolean;
  matchesStudentAvailability?: boolean;
  dualTime?: any;
  conflict?: {
    type: string;
    id: string;
    title: string;
    courseTitle?: string;
    conflictParty?: "TUTOR" | "STUDENT";
    start: string;
    end: string;
  } | null;
  windowTitle?: string;
}

interface DayItem {
  date: string;
  dateLabel: string;
  dayOfWeek: number;
  hasAvailableSlots: boolean;
  totalSlots: number;
  availableSlotsCount: number;
  conflictSlotsCount: number;
  slots: SlotItem[];
}

interface PermanentEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    slug?: string;
    subjectCode?: string | null;
    price?: number;
    olPrice?: number | null;
    tutorId?: string;
    tutor?: {
      id?: string;
      name: string;
      avatar?: string | null;
      headline?: string | null;
      timezone?: string;
    } | null;
  } | null;
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
    timezone?: string | null;
  } | null;
  onSuccess?: (request: any) => void;
}

export function PermanentEnrollmentModal({
  isOpen,
  onClose,
  course,
  currentUser,
  onSuccess,
}: PermanentEnrollmentModalProps) {
  const [classType, setClassType] = useState<string>("Theory and Paper mix");
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(2);
  const [duration, setDuration] = useState<string>("Repeat for 1 month");
  const [notes, setNotes] = useState<string>("");

  const [selectedSlots, setSelectedSlots] = useState<SlotItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [days, setDays] = useState<DayItem[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const resolveAccountTimezone = (tz?: string | null): string | null => {
    if (!tz) return null;
    try {
      return getRegionalTimezone(tz).id;
    } catch {
      return tz;
    }
  };

  const [userTimezone, setUserTimezone] = useState<string>(() => {
    const accTz = resolveAccountTimezone(currentUser?.timezone);
    return accTz || DEFAULT_TIMEZONE;
  });
  const [tutorTimezone, setTutorTimezone] = useState<string>(DEFAULT_TIMEZONE);

  useEffect(() => {
    const accTz = resolveAccountTimezone(currentUser?.timezone);
    if (accTz) {
      setUserTimezone(accTz);
    }
  }, [currentUser?.timezone]);

  useEffect(() => {
    if (isOpen) {
      const accTz = resolveAccountTimezone(currentUser?.timezone);
      if (accTz) {
        setUserTimezone(accTz);
      } else {
        const studentQuery = currentUser?.id ? `?studentId=${currentUser.id}` : "";
        fetch(`/api/student/availability${studentQuery}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.timezone) {
              const fetchedTz = resolveAccountTimezone(data.timezone);
              if (fetchedTz) {
                setUserTimezone(fetchedTz);
                return;
              }
            }
            return fetch("/api/dashboard")
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => {
                if (d?.user?.timezone) {
                  const dashTz = resolveAccountTimezone(d.user.timezone);
                  if (dashTz) setUserTimezone(dashTz);
                }
              });
          })
          .catch(() => {});
      }
    }
  }, [isOpen, currentUser?.timezone, currentUser?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch 1-hour matched availability
  useEffect(() => {
    if (!isOpen || !course?.id) return;

    let isMounted = true;
    setLoadingAvailability(true);
    setError(null);
    setSuccessData(null);
    setSelectedSlots([]);

    const tutorIdParam = course.tutor?.id || course.tutorId || "";
    const studentIdParam = currentUser?.id || "";
    const params = new URLSearchParams();
    params.set("courseId", course.id);
    params.set("slotMinutes", "60");
    params.set("days", "14");
    params.set("timezone", userTimezone);
    if (tutorIdParam) params.set("tutorId", tutorIdParam);
    if (studentIdParam) params.set("studentId", studentIdParam);

    fetch(`/api/tutor/availability?${params.toString()}`)
      .then(async (res) => {
        if (!isMounted) return;
        const data = await res.json();
        if (res.ok && data.days) {
          setDays(data.days);
          if (data.tutorTimezone) setTutorTimezone(data.tutorTimezone);

          // Select first day with available/matched slots
          const firstWithMatch = data.days.find((d: DayItem) =>
            d.slots.some((s) => s.isAvailable && s.matchesStudentAvailability)
          );
          const firstWithAvail = data.days.find((d: DayItem) => d.hasAvailableSlots);
          if (firstWithMatch) {
            setSelectedDate(firstWithMatch.date);
          } else if (firstWithAvail) {
            setSelectedDate(firstWithAvail.date);
          } else if (data.days.length > 0) {
            setSelectedDate(data.days[0].date);
          }
        } else {
          setError(data.error || "Failed to load tutor availability.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to connect to availability service.");
      })
      .finally(() => {
        if (isMounted) setLoadingAvailability(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, course?.id, userTimezone, currentUser?.id]);

  const userRegion = useMemo(() => getRegionalTimezone(userTimezone), [userTimezone]);
  const userRegionOffset = useMemo(
    () => getTimezoneOffsetString(new Date(), userRegion.id),
    [userRegion.id]
  );

  const activeDay = useMemo(() => {
    return days.find((d) => d.date === selectedDate) || days[0] || null;
  }, [days, selectedDate]);

  const totalMatchedSlotsCount = useMemo(() => {
    return days.reduce(
      (acc, d) =>
        acc + d.slots.filter((s) => s.isAvailable && s.matchesStudentAvailability).length,
      0
    );
  }, [days]);

  const mergedSelectedSlotGroups = useMemo(() => {
    return mergeConsecutiveSlots(selectedSlots, userTimezone);
  }, [selectedSlots, userTimezone]);

  const hasMergedSlots = useMemo(() => {
    return mergedSelectedSlotGroups.some((g) => g.isMerged);
  }, [mergedSelectedSlotGroups]);

  const toggleSlotSelection = (slot: SlotItem) => {
    if (!slot.isAvailable) return;

    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.startTime === slot.startTime);
      if (exists) {
        return prev.filter((s) => s.startTime !== slot.startTime);
      } else {
        return [...prev, slot];
      }
    });
  };

  const isSlotSelected = (slot: SlotItem) => {
    return selectedSlots.some((s) => s.startTime === slot.startTime);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    if (selectedSlots.length < hoursPerWeek) {
      setError(
        `Please select at least ${hoursPerWeek} favorable 1-hour slot(s) for your ${hoursPerWeek} hour/week commitment.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        courseId: course.id,
        tutorId: course.tutor?.id || course.tutorId,
        classType,
        hoursPerWeek,
        duration,
        selectedSlots: selectedSlots.map((s) => ({
          startTime: s.startTime,
          endTime: s.endTime,
          timeDisplay: s.timeDisplay,
          dualTime: s.dualTime,
          tutorTimeDisplay: s.tutorTimeDisplay,
        })),
        notes: notes.trim(),
      };

      const res = await fetch("/api/enrollment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit enrollment request.");
      }

      setSuccessData(data.request);
      if (onSuccess) {
        onSuccess(data.request);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 w-full h-full overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full h-full bg-slate-50 flex flex-col overflow-hidden">
        
        {/* Floating Top Right Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="fixed top-4 right-5 z-50 p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 shadow-md border border-slate-200 backdrop-blur-xs transition-all cursor-pointer"
          aria-label="Close"
          title="Close modal (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Area */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative">
            
            {/* Header with Title & Close Button */}
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-800 tracking-wide uppercase">
                    <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                    Permanent Class Enrollment
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">• 1-Hour Recurring Slots</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{course.title}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Tutor: <strong className="text-slate-800">{course.tutor?.name || "Senior Academic Tutor"}</strong>
                  </span>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono font-bold">
                    {course.subjectCode || `CLS-${course.id?.slice(-6).toUpperCase()}`}
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md font-semibold flex items-center gap-1">
                    {totalMatchedSlotsCount} Mutual Availability Matches
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          {successData ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Enrollment Request Successfully Submitted!
              </h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Your scheduling preferences ({hoursPerWeek} hrs/week, {duration}) and {selectedSlots.length} favorable time slots have been routed to <strong>{course.tutor?.name || "your tutor"}</strong>.
              </p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Class Format:</span>
                  <span className="font-bold text-slate-800">{classType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Weekly Hours:</span>
                  <span className="font-bold text-slate-800">{hoursPerWeek} Hours / Week</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Recurrence Track:</span>
                  <span className="font-bold text-slate-800">{duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Offered Slots:</span>
                  <span className="font-bold text-blue-700">
                    {selectedSlots.length} Slots {hasMergedSlots ? "(Includes 2-Hour Class)" : "(1-Hour Options)"}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <Button
                  onClick={onClose}
                  className="bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs rounded-xl px-6 h-10 shadow-xs"
                >
                  Done & Go to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Preferences Header Card */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Step 1: Permanent Class Preferences
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">All sessions are 1 hour</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Class Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Class Type</span>
                      <span className="text-[10px] text-blue-600 font-semibold">Format</span>
                    </label>
                    <select
                      value={classType}
                      onChange={(e) => setClassType(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    >
                      <option value="Theory only">Theory only</option>
                      <option value="Paper only">Paper only</option>
                      <option value="Theory and Paper mix">Theory and Paper mix</option>
                    </select>
                  </div>

                  {/* Hours Per Week */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Hours Per Week</span>
                      <span className="text-[10px] text-blue-600 font-semibold">1-Hr Slots</span>
                    </label>
                    <select
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(parseInt(e.target.value, 10))}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    >
                      <option value={1}>1 hour / week (1 slot)</option>
                      <option value={2}>2 hours / week (2 slots)</option>
                      <option value={3}>3 hours / week (3 slots)</option>
                      <option value={4}>4 hours / week (4 slots)</option>
                      <option value={5}>5 hours / week (5 slots)</option>
                    </select>
                  </div>

                  {/* Recurrence / Duration */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Recurrence Duration</span>
                      <span className="text-[10px] text-blue-600 font-semibold">Timeline</span>
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    >
                      <option value="Repeat for 1 month">Repeat for 1 month (4 wks)</option>
                      <option value="Repeat for 2 months">Repeat for 2 months (8 wks)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Matched Availability Calendar */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/70 p-3 sm:p-4 rounded-xl border border-blue-200">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-950 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-700" />
                      Step 2: Select Favorable 1-Hour Slots
                    </h3>
                    <p className="text-xs text-blue-900/80">
                      Pick at least <strong>{hoursPerWeek} slots</strong>. Select more than {hoursPerWeek} to give your tutor flexible options to accept.
                    </p>
                  </div>

                  {/* Slot Counter Badge */}
                  <div className="shrink-0 flex items-center gap-2">
                    <Badge
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                        selectedSlots.length >= hoursPerWeek
                          ? "bg-emerald-600 text-white border-emerald-700"
                          : "bg-amber-100 text-amber-900 border-amber-300"
                      }`}
                    >
                      {selectedSlots.length >= hoursPerWeek ? (
                        <span className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          {selectedSlots.length} Favorable Slots Selected (Ready)
                        </span>
                      ) : (
                        <span>
                          Selected {selectedSlots.length} of {hoursPerWeek} minimum
                        </span>
                      )}
                    </Badge>
                  </div>
                </div>

                {/* Legend & Timezone Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Legend:</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Matched Free Time
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-blue-800 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      Tutor Available
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-rose-800 font-semibold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      Booked / Conflict
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50/70 text-xs shadow-2xs">
                    <CountryFlag countryCode={userRegion.countryCode} flagEmoji={userRegion.flag} size="sm" />
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-900 truncate">
                        {userRegion.region}
                      </span>
                      <span className="text-[11px] font-mono font-medium text-sky-700 bg-sky-100/90 px-1.5 py-0.2 rounded shrink-0">
                        {userRegionOffset}
                      </span>
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-100/80 border border-blue-200 px-1.5 py-0.2 rounded-full whitespace-nowrap shrink-0">
                        Account Timezone
                      </span>
                    </div>
                  </div>
                </div>

                {loadingAvailability ? (
                  <div className="py-16 text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="text-xs text-slate-500 font-semibold">
                      Cross-matching your study schedule with tutor availability...
                    </p>
                  </div>
                ) : days.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 border border-dashed rounded-xl">
                    No availability slots found for this tutor.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Day selector tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {days.map((day) => {
                        const isSelected = day.date === selectedDate;
                        const hasMatch = day.slots.some(
                          (s) => s.isAvailable && s.matchesStudentAvailability
                        );
                        const hasSelected = day.slots.some((s) => isSlotSelected(s));

                        return (
                          <button
                            key={day.date}
                            type="button"
                            onClick={() => setSelectedDate(day.date)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex flex-col items-center gap-1 cursor-pointer border ${
                              isSelected
                                ? "bg-[#0c2461] text-white border-[#0c2461] shadow-xs"
                                : hasSelected
                                ? "bg-blue-50 text-blue-900 border-blue-300 font-extrabold"
                                : hasMatch
                                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span>{day.dateLabel}</span>
                            <div className="flex items-center gap-1">
                              {hasMatch && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? "bg-emerald-400" : "bg-emerald-600"
                                  }`}
                                  title="Has mutually matched slots"
                                />
                              )}
                              <span
                                className={`text-[10px] font-mono ${
                                  isSelected ? "text-blue-200" : "text-slate-500"
                                }`}
                              >
                                {day.availableSlotsCount} free
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Day Slots Grid */}
                    {activeDay ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>
                            Available 1-Hour Slots for <strong>{activeDay.dateLabel}</strong>
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Strict 60-Minute Class Increments
                          </span>
                        </div>

                        {activeDay.slots.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border">
                            No slots configured for this date.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {activeDay.slots.map((slot) => {
                              const selected = isSlotSelected(slot);
                              const isMatched = slot.isAvailable && slot.matchesStudentAvailability;
                              const isConflict = Boolean(slot.conflict);
                              const disabled = !slot.isAvailable || slot.isPast;
                              const isPartMerged = selected && mergedSelectedSlotGroups.some(
                                (g) => g.isMerged && g.originalSlots.some((s) => s.startTime === slot.startTime)
                              );

                              return (
                                <button
                                  key={slot.startTime}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => toggleSlotSelection(slot)}
                                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                                    disabled
                                      ? "bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed"
                                      : selected
                                      ? "bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400"
                                      : isMatched
                                      ? "bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-300 text-slate-900 shadow-2xs"
                                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900"
                                  }`}
                                >
                                  {/* Slot Top Row: Time and Badge */}
                                  <div className="flex items-center justify-between gap-1 w-full mb-1">
                                    <span
                                      className={`text-xs font-black font-mono ${
                                        selected ? "text-white" : "text-slate-900"
                                      }`}
                                    >
                                      {slot.timeDisplay} -{" "}
                                      {format24hTo12h(
                                        new Date(slot.endTime).toLocaleTimeString("en-US", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: false,
                                          timeZone: userTimezone,
                                        })
                                      )}
                                    </span>

                                    {selected ? (
                                      <span className="bg-white text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase flex items-center gap-1 shadow-2xs">
                                        <Check className="w-3 h-3" /> {isPartMerged ? "Merged 2h" : "Selected"}
                                      </span>
                                    ) : isConflict ? (
                                      <span className="bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                                        <Lock className="w-2.5 h-2.5" /> Booked
                                      </span>
                                    ) : isMatched ? (
                                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[9px] font-bold">
                                        Mutual Match
                                      </span>
                                    ) : slot.isAvailable ? (
                                      <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                        Available
                                      </span>
                                    ) : (
                                      <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                        Unavailable
                                      </span>
                                    )}
                                  </div>

                                  {/* Conflict or Tutor Dual Time Display */}
                                  <div className="text-[10px] pt-1 border-t border-slate-200/50 mt-1 flex items-center justify-between">
                                    {isConflict ? (
                                      <span className="text-rose-700 font-semibold truncate">
                                        {slot.conflict?.conflictParty === "STUDENT"
                                          ? "Conflict on your schedule"
                                          : "Tutor already booked"}
                                      </span>
                                    ) : (
                                      <span
                                        className={
                                          selected
                                            ? "text-blue-100"
                                            : isMatched
                                            ? "text-emerald-800 font-semibold"
                                            : "text-slate-500"
                                        }
                                      >
                                        {slot.tutorTimeDisplay
                                          ? `Tutor: ${slot.tutorTimeDisplay}`
                                          : "1 Hour Session"}
                                      </span>
                                    )}

                                    {isMatched && !selected && (
                                      <span className="text-emerald-700 font-bold text-[10px]">
                                        Fits Your Study Time
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Consecutive 2-Hour Class Notice */}
              {hasMergedSlots && (
                <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs text-blue-950 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-blue-900">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>2-Hour Continuous Class Detected</span>
                  </div>
                  <p className="text-blue-800 text-[11px] leading-relaxed">
                    You selected consecutive 1-hour slots next to each other (
                    {mergedSelectedSlotGroups
                      .filter((g) => g.isMerged)
                      .map((g) => g.timeDisplay)
                      .join(", ")}
                    ). These will be scheduled together as a single <strong>2-hour class session</strong>.
                    Upon completion of each 2-hour class, <strong>2 tokens</strong> will be deducted from your wallet, and your tutor will be paid for 2 teaching hours.
                  </p>
                </div>
              )}

              {/* Optional Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Notes or Study Goals for Tutor (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Focus on past papers 2021-2024, or clarifying organic chemistry concepts..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-600">
                  Selected: <strong>{selectedSlots.length}</strong> favorable slot(s) for a{" "}
                  <strong>{hoursPerWeek} hour/week</strong> requirement.
                  {hasMergedSlots && (
                    <span className="text-blue-700 font-bold block sm:inline sm:ml-1">
                      • Merged into 2-Hour continuous class
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="text-xs font-bold rounded-xl h-10 px-4 border-slate-300 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || selectedSlots.length < hoursPerWeek}
                    className="bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs rounded-xl h-10 px-6 gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <CalendarClock className="w-4 h-4 text-blue-200" />
                        <span>Submit Enrollment Request</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
