"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  Sparkles,
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
import { RegionalTimezoneSelector } from "@/components/ui/RegionalTimezoneSelector";
import {
  getUserBrowserTimezone,
  DEFAULT_TIMEZONE,
  format24hTo12h,
} from "@/lib/timezones";

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
  onSuccess?: (request: any) => void;
}

export function PermanentEnrollmentModal({
  isOpen,
  onClose,
  course,
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

  const [userTimezone, setUserTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [tutorTimezone, setTutorTimezone] = useState<string>(DEFAULT_TIMEZONE);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserTimezone(getUserBrowserTimezone());
    }
  }, []);

  // Fetch 1-hour matched availability
  useEffect(() => {
    if (!isOpen || !course?.id) return;

    let isMounted = true;
    setLoadingAvailability(true);
    setError(null);
    setSuccessData(null);
    setSelectedSlots([]);

    const tutorIdParam = course.tutor?.id || course.tutorId || "";
    const url = `/api/tutor/availability?courseId=${encodeURIComponent(
      course.id
    )}&slotMinutes=60&days=14&timezone=${encodeURIComponent(
      userTimezone
    )}${tutorIdParam ? `&tutorId=${encodeURIComponent(tutorIdParam)}` : ""}`;

    fetch(url)
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
  }, [isOpen, course?.id, userTimezone]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0c2461] to-[#1e3799] p-5 sm:p-6 text-white shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-bold tracking-wide uppercase">
              <CalendarClock className="w-3.5 h-3.5 text-blue-200" />
              Permanent Class Enrollment
            </span>
            <span className="text-xs text-blue-200 font-semibold">• 1-Hour Recurring Slots</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">{course.title}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-blue-100 font-medium">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-200" />
              Tutor: <strong>{course.tutor?.name || "Senior Academic Tutor"}</strong>
            </span>
            {course.subjectCode && (
              <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-mono">
                {course.subjectCode}
              </span>
            )}
            <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {totalMatchedSlotsCount} Mutual Availability Matches
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
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
                  <span className="font-bold text-blue-700">{selectedSlots.length} 1-Hour Options</span>
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
                      <option value="Continuous">Continuous (Weekly Ongoing)</option>
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

                  <div className="w-full sm:w-auto">
                    <RegionalTimezoneSelector
                      selectedTimezone={userTimezone}
                      onChange={(tz) => setUserTimezone(tz)}
                      className="text-xs h-8"
                    />
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
                                      <span className="bg-white text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Selected
                                      </span>
                                    ) : isConflict ? (
                                      <span className="bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                                        <Lock className="w-2.5 h-2.5" /> Booked
                                      </span>
                                    ) : isMatched ? (
                                      <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                                        <Sparkles className="w-2.5 h-2.5" /> Mutual Match
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
  );
}
