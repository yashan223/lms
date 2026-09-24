"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  X,
  GraduationCap,
  RefreshCw,
  BookOpen,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RegionalTimezoneSelector } from "@/components/ui/RegionalTimezoneSelector";
import {
  getUserBrowserTimezone,
  getRegionalTimezone,
  DEFAULT_TIMEZONE,
  format24hTo12h,
} from "@/lib/timezones";

interface StudentAvailabilitySlot {
  id: string;
  studentId: string;
  dayOfWeek?: number | null;
  specificDate?: string | null;
  startTime: string;
  endTime: string;
  timezone?: string | null;
  isRecurring: boolean;
  isActive: boolean;
  title?: string | null;
  notes?: string | null;
}

interface StudentAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onUpdated?: () => void;
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

export function StudentAvailabilityModal({
  isOpen,
  onClose,
  currentUser,
  onUpdated,
}: StudentAvailabilityModalProps) {
  const [loading, setLoading] = useState(true);
  const [availabilities, setAvailabilities] = useState<StudentAvailabilitySlot[]>([]);

  // Form states
  const [scheduleMode, setScheduleMode] = useState<"RECURRING" | "SPECIFIC">("RECURRING");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [specificDate, setSpecificDate] = useState("");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("20:00");
  const [title, setTitle] = useState("After-School Study & Mentoring Hours");

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    currentUser?.timezone || DEFAULT_TIMEZONE
  );

  useEffect(() => {
    if (typeof window !== "undefined" && !currentUser?.timezone) {
      setSelectedTimezone(getUserBrowserTimezone());
    }
  }, [currentUser?.timezone]);

  const fetchStudentAvailability = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/availability");
      const data = await res.json();
      if (res.ok) {
        setAvailabilities(data.availabilities || []);
        if (data.timezone) {
          setSelectedTimezone(data.timezone);
        }
      }
    } catch (err) {
      console.error("Failed to load student availability:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimezoneChange = async (newTz: string) => {
    setSelectedTimezone(newTz);
    try {
      await fetch("/api/student/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_timezone", timezone: newTz }),
      });
      setStatusMsg({
        type: "success",
        text: `Study hours regional timezone set to ${newTz}.`,
      });
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchStudentAvailability();
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleDay = (dayVal: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal]
    );
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      setStatusMsg({ type: "error", text: "Please provide start and end times." });
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
          setStatusMsg({ type: "error", text: "Please select at least one day." });
          setSaving(false);
          return;
        }
        for (const d of selectedDays) {
          slotsToCreate.push({
            dayOfWeek: d,
            startTime,
            endTime,
            timezone: selectedTimezone,
            isRecurring: true,
            title: title.trim() || "Preferred Study Window",
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
          timezone: selectedTimezone,
          isRecurring: false,
          title: title.trim() || "Specific Available Date",
        });
      }

      const res = await fetch("/api/student/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_availability",
          slots: slotsToCreate,
          timezone: selectedTimezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save study availability.");

      setStatusMsg({
        type: "success",
        text: `Saved ${slotsToCreate.length} study availability window(s). Tutors can now see your open hours!`,
      });

      fetchStudentAvailability();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to update study hours." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      const res = await fetch("/api/student/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_availability",
          id,
        }),
      });
      if (res.ok) {
        setAvailabilities((prev) => prev.filter((s) => s.id !== id));
        if (onUpdated) onUpdated();
      }
    } catch (err) {
      console.error("Delete study slot error:", err);
    }
  };

  const handleApplyPreset = async (preset: "WEEKDAY_EVENINGS" | "WEEKEND_STUDY" | "ALL_WEEK") => {
    try {
      setSaving(true);
      setStatusMsg(null);
      const res = await fetch("/api/student/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_preset",
          preset,
          timezone: selectedTimezone,
          replaceExisting: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: data.message });
        fetchStudentAvailability();
        if (onUpdated) onUpdated();
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex">
      <div className="bg-white w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-8 py-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0c2461] text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-slate-900">
                  My Study Hours &amp; Availability
                </h3>
                <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                  Shared with Tutors
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Let tutors know when you are available for 1-on-1 private mentoring and consultation sessions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — two-column layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT COLUMN: form */}
          <div className="flex-1 flex flex-col overflow-y-auto px-8 py-6 space-y-5 border-r border-slate-100">

          {/* Regional Timezone Setting */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-sky-950">
              <span>Your Study Hours Regional Timezone</span>
              <span className="text-[11px] font-normal text-sky-700">Tutors see your hours converted to their time</span>
            </div>
            <RegionalTimezoneSelector
              selectedTimezone={selectedTimezone}
              onChange={(tz) => handleTimezoneChange(tz)}
              showDualNotice={false}
              compact
            />
          </div>

          {/* Informative Alert */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
            <GraduationCap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-bold">How Tutor Matching Works:</span> When tutors schedule
              or reschedule a 1-on-1 mentoring class or free trial session with you, your available hours will be
              clearly shown to them, helping you both find a mutual time that fits.
            </div>
          </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
              statusMsg.type === "success"
                ? "bg-blue-50 border-blue-200 text-blue-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Quick Study Presets
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset("WEEKDAY_EVENINGS")}
              disabled={saving}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              Weekdays (4:00 PM – 8:00 PM)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("WEEKEND_STUDY")}
              disabled={saving}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              Weekend Study (10:00 AM – 4:00 PM)
            </button>
          </div>
        </div>

        {/* Add Availability Form */}
        <form onSubmit={handleSaveAvailability} className="space-y-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="font-extrabold text-xs text-slate-900 flex items-center justify-between">
            <span>Add Available Study Times</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setScheduleMode("RECURRING")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                  scheduleMode === "RECURRING" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500"
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode("SPECIFIC")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                  scheduleMode === "SPECIFIC" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500"
                }`}
              >
                Specific Date
              </button>
            </div>
          </div>

          {scheduleMode === "RECURRING" ? (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Select Days of the Week</label>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = selectedDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`py-2 px-1 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? "bg-[#0c2461] border-[#0c2461] text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span>{d.short}</span>
                      {isSelected && <Check className="w-2.5 h-2.5 mt-0.5 text-blue-200" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Specific Date</label>
              <Input
                type="date"
                required
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="bg-white rounded-xl h-9 text-xs"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Start Time</span>
                {startTime && <span className="text-[11px] font-bold text-blue-600 font-sans">({format24hTo12h(startTime)})</span>}
              </label>
              <Input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-white rounded-xl h-9 text-xs font-mono font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>End Time</span>
                {endTime && <span className="text-[11px] font-bold text-blue-600 font-sans">({format24hTo12h(endTime)})</span>}
              </label>
              <Input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-white rounded-xl h-9 text-xs font-mono font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Label / Activity Name</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. After-School Revision, Physics Past Paper Drill"
              className="bg-white rounded-xl h-9 text-xs"
            />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl h-9.5 gap-1.5 shadow-xs cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Study Hours...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Save Available Study Times</span>
              </>
            )}
          </Button>
        </form>

          </div>{/* end LEFT COLUMN */}

          {/* RIGHT COLUMN: current slots */}
          <div className="w-[400px] shrink-0 flex flex-col overflow-hidden px-8 py-6 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-800">
                Current Study Hours
              </span>
              <Badge className="bg-slate-200 text-slate-700 font-bold text-[10px]">
                {availabilities.length} {availabilities.length === 1 ? "slot" : "slots"}
              </Badge>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : availabilities.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-400 flex items-center justify-center">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-600">No study hours yet</p>
                  <p className="text-xs text-slate-400 max-w-[220px]">
                    Use the form on the left to add your available study windows.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {availabilities.map((av) => {
                  const dayObj =
                    av.dayOfWeek !== null && av.dayOfWeek !== undefined
                      ? DAYS_OF_WEEK.find((d) => d.value === av.dayOfWeek)
                      : null;
                  return (
                    <div
                      key={av.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 text-xs shadow-sm hover:border-blue-300 transition-colors"
                    >
                      <div>
                        <div className="font-extrabold text-slate-900">
                          {dayObj ? `Every ${dayObj.label}` : av.specificDate?.slice(0, 10) || "Date"}
                        </div>
                        <div className="text-[11px] font-mono text-blue-700 font-bold flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-blue-500" />
                          <span>{format24hTo12h(av.startTime)} – {format24hTo12h(av.endTime)}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">
                          {av.title || "Study hours"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(av.id)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                        title="Delete slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>{/* end RIGHT COLUMN */}

        </div>{/* end body */}

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-200 flex items-center justify-end shrink-0">
          <Button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl px-6 h-10"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
