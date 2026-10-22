"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarCheck,
  Video,
  BookOpen,
  Check,
  RefreshCw,
  ArrowLeft,
  CalendarClock,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Zap,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  getUserBrowserTimezone,
  getRegionalTimezone,
  DEFAULT_TIMEZONE,
  format24hTo12h,
} from "@/lib/timezones";

interface TutorAvailabilitySlot {
  id: string;
  tutorId: string;
  courseId?: string | null;
  dayOfWeek?: number | null;
  specificDate?: string | null;
  startTime: string;
  endTime: string;
  slotType: string;
  timezone?: string | null;
  isRecurring: boolean;
  isActive: boolean;
  title?: string | null;
  course?: {
    id: string;
    title: string;
    subjectCode?: string | null;
  } | null;
}

interface ScheduledClassItem {
  id: string;
  title: string;
  dueDate: string;
  type: string;
  meetingLink?: string | null;
  course?: {
    id: string;
    title: string;
    subjectCode?: string | null;
  } | null;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

function TutorAvailabilityContent() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tutor, setTutor] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [events, setEvents] = useState<ScheduledClassItem[]>([]);
  const [trials, setTrials] = useState<any[]>([]);
  const [availabilities, setAvailabilities] = useState<TutorAvailabilitySlot[]>([]);
  const [hasAssignedClasses, setHasAssignedClasses] = useState(false);
  const [assignedClassesCount, setAssignedClassesCount] = useState(0);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [scheduleMode, setScheduleMode] = useState<"RECURRING" | "SPECIFIC">("RECURRING");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);
  const [specificDate, setSpecificDate] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotTitle, setSlotTitle] = useState("Afternoon Class & Consultation Hours");
  const [targetCourseId, setTargetCourseId] = useState("ALL");
  const [slotType, setSlotType] = useState<"ALL" | "CLASS" | "TRIAL">("ALL");

  const [tutorTimezone, setTutorTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [previewTimezone, setPreviewTimezone] = useState<string>(DEFAULT_TIMEZONE);

  const loadData = async (tzOverride?: string) => {
    try {
      setLoading(true);
      const resTutor = await fetch("/api/tutor");
      if (!resTutor.ok) {
        if (resTutor.status === 401 || resTutor.status === 403) {
          router.push("/login");
          return;
        }
      }
      const dataTutor = await resTutor.json();
      if (dataTutor.tutor) {
        setTutor(dataTutor.tutor);
        setCourses(dataTutor.courses || []);
        setEvents(dataTutor.events || []);
        setTrials(dataTutor.trials || []);

        const activeTz = tzOverride || previewTimezone || dataTutor.tutor.timezone || DEFAULT_TIMEZONE;
        const resAvail = await fetch(
          `/api/tutor/availability?tutorId=${dataTutor.tutor.id}&timezone=${encodeURIComponent(activeTz)}&days=14`
        );
        if (resAvail.ok) {
          const dataAvail = await resAvail.json();
          if (dataAvail.tutorTimezone) {
            setTutorTimezone(dataAvail.tutorTimezone);
          }
          setAvailabilities(dataAvail.availabilities || []);
          if (dataAvail.hasAssignedClasses !== undefined) {
            setHasAssignedClasses(Boolean(dataAvail.hasAssignedClasses));
            setAssignedClassesCount(dataAvail.assignedClassesCount || 0);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to load tutor availability page data:", err);
      setStatusMsg({ type: "error", text: "Failed to load studio availability." });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOperatingTimezone = async (newTz: string) => {
    setTutorTimezone(newTz);
    setPreviewTimezone(newTz);
    try {
      await fetch("/api/tutor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_timezone", timezone: newTz }),
      });
      loadData(newTz);
      setStatusMsg({
        type: "success",
        text: `Operating regional timezone set to ${newTz}.`,
      });
    } catch {}
  };

  const handlePreviewTimezoneChange = (newTz: string) => {
    setPreviewTimezone(newTz);
    loadData(newTz);
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealtimeSync({
    events: ["TUTOR_AVAILABILITY_CHANGED", "EVENTS_CHANGED", "TRIALS_CHANGED"],
    onSync: () => {
      loadData();
    },
  });

  const toggleDaySelection = (dayVal: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal]
    );
  };

  const handleAddAvailableTimes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      setStatusMsg({ type: "error", text: "Please provide both start and end times." });
      return;
    }

    if (startTime >= endTime) {
      setStatusMsg({ type: "error", text: "End time must be later than start time." });
      return;
    }

    try {
      setSaving(true);
      setStatusMsg(null);

      const slotsToCreate: any[] = [];

      if (scheduleMode === "RECURRING") {
        if (selectedDays.length === 0) {
          setStatusMsg({ type: "error", text: "Please select at least one day of the week." });
          setSaving(false);
          return;
        }

        for (const dayOfWeek of selectedDays) {
          slotsToCreate.push({
            dayOfWeek,
            startTime,
            endTime,
            timezone: tutorTimezone,
            isRecurring: true,
            title: slotTitle.trim() || undefined,
            courseId: targetCourseId !== "ALL" ? targetCourseId : null,
            slotType,
          });
        }
      } else {
        if (!specificDate) {
          setStatusMsg({ type: "error", text: "Please choose a specific calendar date." });
          setSaving(false);
          return;
        }

        slotsToCreate.push({
          specificDate,
          startTime,
          endTime,
          timezone: tutorTimezone,
          isRecurring: false,
          title: slotTitle.trim() || undefined,
          courseId: targetCourseId !== "ALL" ? targetCourseId : null,
          slotType,
        });
      }

      const res = await fetch("/api/tutor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_availability",
          slots: slotsToCreate,
          timezone: tutorTimezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save available times.");
      }

      setStatusMsg({
        type: "success",
        text: `Successfully added ${slotsToCreate.length} availability slot(s) for your classes and trials.`,
      });

      if (tutor?.id) {
        const resAvail = await fetch(`/api/tutor/availability?tutorId=${tutor.id}&days=14`);
        if (resAvail.ok) {
          const dataAvail = await resAvail.json();
          setAvailabilities(dataAvail.availabilities || []);
        }
      }
    } catch (err: any) {
      console.error("Save availability error:", err);
      setStatusMsg({
        type: "error",
        text: err.message || "Failed to update availability.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      const res = await fetch("/api/tutor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_availability",
          id,
        }),
      });
      if (res.ok) {
        setAvailabilities((prev) => prev.filter((s) => s.id !== id));
        setStatusMsg({ type: "success", text: "Availability slot removed." });
      }
    } catch (err) {
      console.error("Delete slot error:", err);
    }
  };

  const handleApplyPreset = async (preset: "WEEKDAYS" | "WEEKENDS" | "FULL_SCHEDULE") => {
    try {
      setSaving(true);
      setStatusMsg(null);
      const res = await fetch("/api/tutor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_preset",
          preset,
          timezone: tutorTimezone,
          replaceExisting: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({
          type: "success",
          text: data.message || `Applied ${preset} preset schedule.`,
        });
        if (tutor?.id) {
          const resAvail = await fetch(
            `/api/tutor/availability?tutorId=${tutor.id}&timezone=${encodeURIComponent(previewTimezone)}&days=14`
          );
          if (resAvail.ok) {
            const dataAvail = await resAvail.json();
            setAvailabilities(dataAvail.availabilities || []);
          }
        }
      } else {
        throw new Error(data.error || "Failed to apply preset schedule.");
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/tutor"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Back to Studio</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span>/</span>
              <span className="font-semibold text-slate-700">Availability Management</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              disabled={loading}
              className="text-xs font-semibold rounded-xl gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
              <span>Refresh</span>
            </Button>
            <Link
              href="/tutor"
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#0c2461] hover:bg-[#103080] text-white transition-all shadow-xs"
            >
              Studio Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configured Slots</div>
              <div className="text-xl font-extrabold text-slate-900">{availabilities.length} Timeslots</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Classes</div>
              <div className="text-xl font-extrabold text-slate-900">{events.length} Live Classes</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trial Consultations</div>
              <div className="text-xl font-extrabold text-slate-900">{trials.length} Bookings</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Double-Booking Shield</div>
              <div className="text-xs font-extrabold text-blue-700">Active &amp; Synchronized</div>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              statusMsg.type === "success"
                ? "bg-blue-50 border-blue-200 text-blue-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className="font-medium">{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {hasAssignedClasses && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="font-extrabold text-amber-950 flex items-center gap-2">
                <span>Teaching Availability Locked</span>
                <Badge className="bg-amber-200/80 text-amber-900 border-amber-300 text-[10px] font-bold">
                  {assignedClassesCount} Active Class{assignedClassesCount === 1 ? "" : "es"} Assigned
                </Badge>
              </div>
              <p className="text-amber-800 leading-relaxed">
                You already have active or scheduled classes assigned to your schedule. To protect enrolled student timetables and avoid scheduling conflicts, your availability cannot be altered or removed while classes are assigned. Please contact administration if you need to adjust assigned classes.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 sticky top-24">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <CalendarClock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm text-slate-900">
                      Set Multiple Available Times
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Create batch recurring days or specific calendar date slots
                    </p>
                  </div>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                  Batch Config
                </Badge>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Quick Schedule Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("WEEKDAYS")}
                    disabled={saving || hasAssignedClasses}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      hasAssignedClasses
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                        : "bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border-slate-200 cursor-pointer"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Weekdays (14:00 - 17:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("WEEKENDS")}
                    disabled={saving || hasAssignedClasses}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      hasAssignedClasses
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                        : "bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border-slate-200 cursor-pointer"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Saturday Mornings
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddAvailableTimes} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Schedule Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScheduleMode("RECURRING")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        scheduleMode === "RECURRING"
                          ? "bg-blue-50 border-blue-400 text-blue-800 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Weekly Recurring</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleMode("SPECIFIC")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        scheduleMode === "SPECIFIC"
                          ? "bg-blue-50 border-blue-400 text-blue-800 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Specific Calendar Date</span>
                    </button>
                  </div>
                </div>

                {scheduleMode === "RECURRING" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 block">
                        Select Days of the Week <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {selectedDays.length} days selected
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {DAYS_OF_WEEK.map((d) => {
                        const isSelected = selectedDays.includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => toggleDaySelection(d.value)}
                            className={`py-2 px-1 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex flex-col items-center justify-center ${
                              isSelected
                                ? "bg-[#0c2461] border-[#0c2461] text-white shadow-2xs"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <span>{d.short}</span>
                            {isSelected && <Check className="w-2.5 h-2.5 mt-0.5 text-blue-300" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">
                      Specific Calendar Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      required
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="availability-start-time" className="font-bold text-slate-700 flex items-center justify-between cursor-pointer">
                      <span>Start Time <span className="text-red-500">*</span></span>
                      {startTime && <span className="text-[11px] font-bold text-blue-600 font-sans">({format24hTo12h(startTime)})</span>}
                    </label>
                    <Input
                      id="availability-start-time"
                      type="time"
                      required
                      step={1800}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      className="rounded-xl h-9 text-xs font-mono font-semibold cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="availability-end-time" className="font-bold text-slate-700 flex items-center justify-between cursor-pointer">
                      <span>End Time <span className="text-red-500">*</span></span>
                      {endTime && <span className="text-[11px] font-bold text-blue-600 font-sans">({format24hTo12h(endTime)})</span>}
                    </label>
                    <Input
                      id="availability-end-time"
                      type="time"
                      required
                      min={startTime}
                      step={1800}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      className="rounded-xl h-9 text-xs font-mono font-semibold cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">
                    Timeslot Label / Focus
                  </label>
                  <Input
                    placeholder="Timeslot label or focus"
                    value={slotTitle}
                    onChange={(e) => setSlotTitle(e.target.value)}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Class Target</label>
                    <select
                      value={targetCourseId}
                      onChange={(e) => setTargetCourseId(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-200 px-2.5 bg-white text-xs font-medium"
                    >
                      <option value="ALL">All Classes (General)</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.subjectCode ? `[${c.subjectCode}] ` : ""}{c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Available For</label>
                    <select
                      value={slotType}
                      onChange={(e) => setSlotType(e.target.value as any)}
                      className="w-full h-9 rounded-xl border border-slate-200 px-2.5 bg-white text-xs font-medium"
                    >
                      <option value="ALL">Classes &amp; Free Trials</option>
                      <option value="CLASS">Classes Only</option>
                      <option value="TRIAL">Free Trials Only</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={saving || hasAssignedClasses}
                  className={`w-full text-xs font-bold rounded-xl h-10 gap-1.5 shadow-md ${
                    hasAssignedClasses
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                      : "bg-[#0c2461] hover:bg-[#103080] text-white cursor-pointer shadow-blue-950/20"
                  }`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Availability Times...</span>
                    </>
                  ) : hasAssignedClasses ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Locked: Active Classes Assigned</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>
                        Save {scheduleMode === "RECURRING" ? `${selectedDays.length} Available Times` : "Available Time"}
                      </span>
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Configured Available Timeslots</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recurring weekly blocks and special date windows available to students
                  </p>
                </div>
                <Badge className="bg-slate-100 text-slate-700 text-xs font-bold">
                  {availabilities.length} {availabilities.length === 1 ? "Slot" : "Slots"}
                </Badge>
              </div>

              {availabilities.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-700">No custom available times configured yet</div>
                    <p className="text-[11px] max-w-sm mx-auto text-slate-500">
                      The system is currently using default consultation hours. Use the configuration form on the left to set your teaching windows.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                  {availabilities.map((av) => {
                    const dayObj =
                      av.dayOfWeek !== null && av.dayOfWeek !== undefined
                        ? DAYS_OF_WEEK.find((d) => d.value === av.dayOfWeek)
                        : null;

                    return (
                      <div
                        key={av.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-blue-300 transition-all flex flex-col justify-between space-y-2 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-extrabold text-xs text-slate-900 block">
                              {dayObj ? `Every ${dayObj.label}` : av.specificDate?.slice(0, 10) || "Specific Date"}
                            </span>
                            <span className="font-mono text-xs font-bold text-blue-700 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-blue-500" />
                              {format24hTo12h(av.startTime)} – {format24hTo12h(av.endTime)}
                            </span>
                          </div>
                          {hasAssignedClasses ? (
                            <span
                              className="text-slate-300 p-1 rounded-lg cursor-not-allowed shrink-0"
                              title="Locked: Classes already assigned"
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(av.id)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500 truncate max-w-[120px]">
                            {av.title || (av.slotType === "ALL" ? "Classes & Trials" : av.slotType)}
                          </span>
                          <Badge
                            className={`text-[9px] font-bold px-1.5 py-0 ${
                              av.isActive
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {av.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-blue-600" />
                    <span>Classes &amp; Trials Scheduled in System</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live sessions automatically locked to prevent double-booking
                  </p>
                </div>
                <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-xs font-bold">
                  {events.length} Classes • {trials.length} Trials
                </Badge>
              </div>

              {events.length === 0 && trials.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                  No active classes or trials scheduled at this moment.
                </div>
              ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {events.map((ev: any) => {
                    const d = new Date(ev.dueDate);
                    return (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-bold text-slate-900 truncate">
                            {ev.title}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">{ev.course?.title || "London A/L"}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-700">
                              {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at{" "}
                              {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Badge className="bg-red-50 text-red-800 border-red-200 text-[10px] font-bold">
                            Conflict Locked
                          </Badge>
                        </div>
                      </div>
                    );
                  })}

                  {trials.map((tr: any) => {
                    const d = new Date(tr.preferredDate);
                    return (
                      <div
                        key={tr.id}
                        className="p-3 rounded-xl border border-blue-200/90 bg-blue-50/40 hover:bg-white flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-bold text-blue-950 truncate flex items-center gap-1.5">
                            <span>1-on-1 Trial: {tr.studentName}</span>
                            <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-[9px] font-bold">
                              {tr.status}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">{tr.course?.title || "London A/L"}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-700">
                              {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at{" "}
                              {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={() => router.push(`/trials/reschedule?trialId=${tr.id}`)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 text-blue-900 border border-blue-200 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>Reschedule</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TutorAvailabilityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
          <p className="text-sm font-semibold tracking-wider uppercase text-blue-200">
            Loading Tutor Availability Studio...
          </p>
        </div>
      }
    >
      <TutorAvailabilityContent />
    </Suspense>
  );
}
