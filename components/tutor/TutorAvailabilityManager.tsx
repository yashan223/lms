"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  CalendarCheck,
  Video,
  BookOpen,
  Filter,
  Check,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface TutorAvailabilitySlot {
  id: string;
  tutorId: string;
  courseId?: string | null;
  dayOfWeek?: number | null;
  specificDate?: string | null;
  startTime: string;
  endTime: string;
  slotType: string;
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

interface TutorAvailabilityManagerProps {
  tutor: any;
  courses: any[];
  events: any[];
  trials: any[];
  onRefresh?: () => void;
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

export function TutorAvailabilityManager({
  tutor,
  courses = [],
  events = [],
  trials = [],
  onRefresh,
}: TutorAvailabilityManagerProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [availabilities, setAvailabilities] = useState<TutorAvailabilitySlot[]>([]);
  const [daySlotsPreview, setDaySlotsPreview] = useState<any[]>([]);

  // Form State for Adding Available Times
  const [scheduleMode, setScheduleMode] = useState<"RECURRING" | "SPECIFIC">("RECURRING");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Default: Mon, Wed, Fri
  const [specificDate, setSpecificDate] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotTitle, setSlotTitle] = useState("Afternoon Class & Consultation Hours");
  const [targetCourseId, setTargetCourseId] = useState("ALL");
  const [slotType, setSlotType] = useState<"ALL" | "CLASS" | "TRIAL">("ALL");

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch tutor's configured availability
  const fetchAvailability = async () => {
    if (!tutor?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/tutor/availability?tutorId=${tutor.id}&days=7`);
      const data = await res.json();
      if (res.ok) {
        setAvailabilities(data.availabilities || []);
        setDaySlotsPreview(data.days || []);
      }
    } catch (err) {
      console.error("Failed to load availability:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [tutor?.id]);

  // Toggle Day selection for multi-day batch addition
  const toggleDaySelection = (dayVal: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal]
    );
  };

  // Submit Multiple Available Times
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

      const slotsToCreate = [];

      if (scheduleMode === "RECURRING") {
        if (selectedDays.length === 0) {
          setStatusMsg({ type: "error", text: "Please select at least one day of the week." });
          setSaving(false);
          return;
        }

        for (const day of selectedDays) {
          slotsToCreate.push({
            dayOfWeek: day,
            startTime,
            endTime,
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

      fetchAvailability();
      if (onRefresh) onRefresh();
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

  // Delete single availability slot
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
        fetchAvailability();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Delete slot error:", err);
    }
  };

  // Apply Quick Preset
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
          replaceExisting: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({
          type: "success",
          text: data.message || `Applied ${preset} preset schedule.`,
        });
        fetchAvailability();
        if (onRefresh) onRefresh();
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
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Class Availability &amp; Consultation Timeslots
            </h2>
            <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
              Multi-Slot Manager
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Configure your available teaching times for live seminars, masterclasses, and 1-on-1 free trial
            consultations. The LMS cross-references all your scheduled classes to ensure you are never double-booked.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAvailability}
            disabled={loading}
            className="text-xs font-semibold rounded-xl gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            statusMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Multi-Slot Creator (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Set Multiple Available Times</span>
              </h3>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                Batch Config
              </Badge>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Quick Schedule Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset("WEEKDAYS")}
                  disabled={saving}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-bold border border-slate-200 transition-all cursor-pointer"
                >
                  ⚡ Weekdays (14:00 - 17:00)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("WEEKENDS")}
                  disabled={saving}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 text-[11px] font-bold border border-slate-200 transition-all cursor-pointer"
                >
                  ⚡ Saturday Mornings
                </button>
              </div>
            </div>

            <form onSubmit={handleAddAvailableTimes} className="space-y-4 text-xs">
              {/* Recurrence Switcher */}
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
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Specific Calendar Date</span>
                  </button>
                </div>
              </div>

              {/* Days Multi-Select (for Recurring Mode) */}
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
                          {isSelected && <Check className="w-2.5 h-2.5 mt-0.5 text-emerald-400" />}
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

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="rounded-xl h-9 text-xs font-mono font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="rounded-xl h-9 text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Title / Label */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Timeslot Label / Focus
                </label>
                <Input
                  placeholder="e.g. Masterclass & Free Trial Hours"
                  value={slotTitle}
                  onChange={(e) => setSlotTitle(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              {/* Course & Slot Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Course Target</label>
                  <select
                    value={targetCourseId}
                    onChange={(e) => setTargetCourseId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-2.5 bg-white text-xs font-medium"
                  >
                    <option value="ALL">All Courses (General)</option>
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
                disabled={saving}
                className="w-full bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl h-10 gap-1.5 cursor-pointer shadow-md shadow-blue-950/20"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Availability Times...</span>
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

        {/* Right Column: Configured Slots & Scheduled Class Cross-Reference (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Configured Slots List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
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
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="font-bold text-slate-700">No custom available times configured yet</div>
                <p className="text-[11px] max-w-sm mx-auto">
                  The system is currently using default academic consultation hours (Mon-Fri 09:00 - 18:00).
                  Use the form on the left or quick presets to define your custom availability!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
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
                            {av.startTime} – {av.endTime}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(av.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500 truncate max-w-[120px]">
                          {av.title || (av.slotType === "ALL" ? "Classes & Trials" : av.slotType)}
                        </span>
                        <Badge
                          className={`text-[9px] font-bold px-1.5 py-0 ${
                            av.isActive
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
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

          {/* Real-time Conflict Cross-Reference against Scheduled Classes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-purple-600" />
                  <span>Classes &amp; Trials Currently Scheduled in the System</span>
                </h3>
                <p className="text-xs text-slate-500">
                  These live sessions automatically occupy your time slots and trigger conflict warnings
                </p>
              </div>
              <Badge className="bg-purple-50 text-purple-800 border-purple-200 text-xs font-bold">
                {events.length} Classes &amp; {trials.length} Trials
              </Badge>
            </div>

            {events.length === 0 && trials.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                No active classes or trials scheduled at this moment.
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
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
                      className="p-3 rounded-xl border border-amber-200/90 bg-amber-50/40 hover:bg-white flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-bold text-amber-950 truncate flex items-center gap-1.5">
                          <span>1-on-1 Trial: {tr.studentName}</span>
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-bold">
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
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3 text-amber-600" />
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
    </div>
  );
}
