"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Calendar,
  ExternalLink,
  Globe,
  Loader2,
  Check,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_TIMEZONE,
  getRegionalTimezone,
  format24hTo12h,
} from "@/lib/timezones";

interface TutorFirstTimeAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: any;
  onSuccess?: () => void;
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

export function TutorFirstTimeAvailabilityModal({
  isOpen,
  onClose,
  tutor,
  onSuccess,
}: TutorFirstTimeAvailabilityModalProps) {
  const router = useRouter();

  const [mode, setMode] = useState<"CUSTOM" | "PRESET">("CUSTOM");

  // Custom schedule state
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("18:00");
  const [slotType, setSlotType] = useState<"ALL" | "CLASS" | "TRIAL">("ALL");
  const [slotTitle, setSlotTitle] = useState("Regular Teaching Hours");

  // Preset schedule state
  const [selectedPreset, setSelectedPreset] = useState<"WEEKDAYS" | "FULL_SCHEDULE" | "WEEKENDS">("WEEKDAYS");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const tutorTz = tutor?.timezone || DEFAULT_TIMEZONE;
  const regionalTz = getRegionalTimezone(tutorTz);

  const toggleDay = (dayVal: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal]
    );
  };

  const handleSelectPresetDays = (preset: "ALL" | "WEEKDAYS" | "WEEKENDS") => {
    if (preset === "ALL") {
      setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
    } else if (preset === "WEEKDAYS") {
      setSelectedDays([1, 2, 3, 4, 5]);
    } else if (preset === "WEEKENDS") {
      setSelectedDays([6, 0]);
    }
  };

  const handleApplyTimePreset = (start: string, end: string, title: string) => {
    setStartTime(start);
    setEndTime(end);
    setSlotTitle(title);
  };

  const handleSaveSlots = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === "CUSTOM") {
      if (selectedDays.length === 0) {
        setErrorMsg("Please select at least one day of the week.");
        return;
      }
      if (!startTime || !endTime) {
        setErrorMsg("Please provide both start and end times.");
        return;
      }
      if (startTime >= endTime) {
        setErrorMsg("End time must be later than start time.");
        return;
      }

      try {
        setSaving(true);
        const slotsToCreate = selectedDays.map((day) => ({
          dayOfWeek: day,
          startTime,
          endTime,
          timezone: tutorTz,
          isRecurring: true,
          title: slotTitle.trim() || "Regular Teaching Hours",
          slotType,
        }));

        const res = await fetch("/api/tutor/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_availability",
            slots: slotsToCreate,
            timezone: tutorTz,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to save availability slots.");
        }

        setSuccessMsg(`Successfully configured ${slotsToCreate.length} weekly available time slot(s)!`);
        if (typeof window !== "undefined" && tutor?.id) {
          localStorage.setItem(`tutor_availability_modal_shown_${tutor.id}`, "true");
        }

        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } catch (err: any) {
        console.error("Save availability error:", err);
        setErrorMsg(err.message || "Failed to save availability slots.");
      } finally {
        setSaving(false);
      }
    } else {
      // PRESET mode
      try {
        setSaving(true);
        const res = await fetch("/api/tutor/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "apply_preset",
            preset: selectedPreset,
            replaceExisting: true,
            timezone: tutorTz,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to apply schedule preset.");
        }

        setSuccessMsg(data.message || "Schedule preset successfully applied!");
        if (typeof window !== "undefined" && tutor?.id) {
          localStorage.setItem(`tutor_availability_modal_shown_${tutor.id}`, "true");
        }

        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } catch (err: any) {
        console.error("Apply preset error:", err);
        setErrorMsg(err.message || "Failed to apply schedule preset.");
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#0c2461] via-[#103080] to-[#1e3c72] text-white p-5 sm:p-6 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-900 flex items-center gap-1 shadow-xs">
              <Sparkles className="w-3 h-3" />
              <span>1st Time Tutor Setup</span>
            </span>
            <span className="text-white/60 text-xs">•</span>
            <span className="text-blue-200 text-xs font-semibold">Action Required</span>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <CalendarClock className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                Set Your Teaching Time Slots
              </h3>
              <p className="text-blue-100/90 text-xs mt-1 leading-relaxed">
                Welcome to your Tutor Studio! To begin receiving student trial bookings and scheduled class sessions, set up your weekly available hours.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="font-bold">{successMsg}</div>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setMode("CUSTOM")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                mode === "CUSTOM"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Custom Weekly Schedule
            </button>
            <button
              type="button"
              onClick={() => setMode("PRESET")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                mode === "PRESET"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              1-Click Schedule Presets
            </button>
          </div>

          {mode === "CUSTOM" ? (
            <div className="space-y-4">
              {/* Day Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Select Teaching Days</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSelectPresetDays("WEEKDAYS")}
                      className="text-[10px] text-blue-700 font-bold hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      Weekdays
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectPresetDays("WEEKENDS")}
                      className="text-[10px] text-blue-700 font-bold hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      Weekends
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectPresetDays("ALL")}
                      className="text-[10px] text-blue-700 font-bold hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      All Days
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = selectedDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`h-11 rounded-xl flex flex-col items-center justify-center font-bold text-xs transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-[#0c2461] border-[#0c2461] text-white shadow-xs scale-[1.02]"
                            : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{day.short}</span>
                        {isSelected && <span className="text-[10px] leading-none mt-0.5 font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Range */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Daily Teaching Hours</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono font-medium">
                    {format24hTo12h(startTime)} – {format24hTo12h(endTime)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Start Time</label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="rounded-xl h-10 text-xs font-mono font-bold focus-visible:ring-blue-400 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">End Time</label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="rounded-xl h-10 text-xs font-mono font-bold focus-visible:ring-blue-400 bg-white"
                    />
                  </div>
                </div>

                {/* Quick hour chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Times:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyTimePreset("09:00", "12:00", "Morning Class Session")}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sun className="w-3 h-3 text-amber-500" />
                    <span>Morning (09:00 – 12:00)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTimePreset("14:00", "18:00", "Afternoon Teaching Window")}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sunset className="w-3 h-3 text-orange-500" />
                    <span>Afternoon (14:00 – 18:00)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTimePreset("18:00", "21:00", "Evening Classes")}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Moon className="w-3 h-3 text-indigo-500" />
                    <span>Evening (18:00 – 21:00)</span>
                  </button>
                </div>
              </div>

              {/* Slot Type */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 text-xs block">
                  Accepted Session Types
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSlotType("ALL")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      slotType === "ALL"
                        ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400 text-blue-900"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>Classes &amp; Trials</span>
                      {slotType === "ALL" && <Check className="w-3 h-3 text-blue-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Recommended
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotType("CLASS")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      slotType === "CLASS"
                        ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400 text-blue-900"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>Classes Only</span>
                      {slotType === "CLASS" && <Check className="w-3 h-3 text-blue-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Regular curriculum
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotType("TRIAL")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      slotType === "TRIAL"
                        ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400 text-blue-900"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>Trials Only</span>
                      {slotType === "TRIAL" && <Check className="w-3 h-3 text-blue-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      1-on-1 consultations
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* PRESET MODE */
            <div className="space-y-3">
              <p className="text-slate-600 text-xs">
                Choose a ready-to-use teaching schedule to configure your weekly availability in one click:
              </p>

              <div
                onClick={() => setSelectedPreset("WEEKDAYS")}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedPreset === "WEEKDAYS"
                    ? "bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">
                        Standard Weekdays Schedule
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                        Most Popular
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Monday to Friday • 10:00 AM – 12:00 PM &amp; 02:00 PM – 05:00 PM
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedPreset === "WEEKDAYS" ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"
                  }`}>
                    {selectedPreset === "WEEKDAYS" && <Check className="w-3 h-3" />}
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedPreset("FULL_SCHEDULE")}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedPreset === "FULL_SCHEDULE"
                    ? "bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">
                        Full Schedule (Weekdays + Saturday)
                      </span>
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Mon–Fri (Morning + Afternoon) &amp; Saturday morning (09:30 AM – 01:30 PM)
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedPreset === "FULL_SCHEDULE" ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"
                  }`}>
                    {selectedPreset === "FULL_SCHEDULE" && <Check className="w-3 h-3" />}
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedPreset("WEEKENDS")}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedPreset === "WEEKENDS"
                    ? "bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="font-extrabold text-xs text-slate-900 block">
                      Weekend Dedicated Window
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Saturday mornings (09:30 AM – 01:30 PM)
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedPreset === "WEEKENDS" ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"
                  }`}>
                    {selectedPreset === "WEEKENDS" && <Check className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timezone Information Box */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 text-slate-600">
              <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Operating in your regional timezone:{" "}
                <strong className="text-slate-800">
                  {regionalTz.flag} {regionalTz.city} ({regionalTz.standardOffset})
                </strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push("/tutor/availability");
              }}
              className="text-blue-600 hover:text-blue-800 font-bold shrink-0 hover:underline cursor-pointer"
            >
              Change ↗
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/tutor/availability");
            }}
            className="text-slate-500 hover:text-blue-700 text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Open Advanced Studio Page</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl h-10 px-4 text-xs font-bold flex-1 sm:flex-none cursor-pointer"
            >
              Remind Me Later
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveSlots}
              disabled={saving}
              className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-extrabold rounded-xl h-10 px-5 gap-1.5 shadow-md flex-1 sm:flex-none cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save &amp; Activate Time Slots</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
