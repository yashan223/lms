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
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildGoogleCalendarUrl } from "@/lib/calendar";

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

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const formatForDateTimeInput = (date: Date) => {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

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

  const [courseId, setCourseId] = useState(initialCourseId || "");
  const [preferredDate, setPreferredDate] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTrial, setCreatedTrial] = useState<any | null>(null);
  const [openSlots, setOpenSlots] = useState<Array<{ startTime: string; timeDisplay: string; dateLabel: string; matchesStudent?: boolean }>>([]);

  // Fetch tutor slots helper
  const fetchTutorSlots = (tutorIdParam?: string, courseIdParam?: string, studentIdParam?: string) => {
    const targetTutorId = tutorIdParam || initialTutorId || allCourses.find((c) => c.id === (courseIdParam || courseId))?.instructor?.id;
    const targetCourseId = courseIdParam || initialCourseId || courseId;
    const params = new URLSearchParams();
    if (targetTutorId) params.set("tutorId", targetTutorId);
    if (targetCourseId) params.set("courseId", targetCourseId);
    if (studentIdParam || currentUser?.id) params.set("studentId", studentIdParam || currentUser?.id || "");
    params.set("days", "7");

    fetch(`/api/tutor/availability?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.days) {
          const collected: Array<{ startTime: string; timeDisplay: string; dateLabel: string; matchesStudent?: boolean }> = [];
          for (const day of d.days) {
            for (const s of day.slots || []) {
              if (s.isAvailable && collected.length < 6) {
                collected.push({
                  startTime: s.startTime,
                  timeDisplay: s.timeDisplay,
                  dateLabel: day.dateLabel,
                  matchesStudent: Boolean(s.matchesStudentAvailability),
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
      setPreferredDate(formatForDateTimeInput(tomorrow));

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

      setAvailSuccessMsg("Your study availability has been configured! Matching faculty slots are highlighted below.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!preferredDate) {
      setError("Please select a preferred date and time for your free trial session.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_trial",
          courseId: courseId || null,
          tutorId: initialTutorId || selectedCourse?.instructor?.id || null,
          studentId: currentUser?.id || null,
          studentName: currentUser?.name || null,
          studentEmail: currentUser?.email || null,
          preferredDate: new Date(preferredDate).toISOString(),
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  {step === "SETUP_AVAILABILITY" ? "Configure Your Study Hours" : "Request a 30-Min Free Trial"}
                </h3>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border-emerald-200">
                  {step === "SETUP_AVAILABILITY" ? "Step 1 of 2" : "100% Free"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {step === "SETUP_AVAILABILITY"
                  ? "Required before booking consultations or classes"
                  : "1-on-1 Online Consultation & Syllabus Masterclass"}
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
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-200/90">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-amber-950">
                    Step 1: Set Up Your Study Hours First
                  </h4>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Faculty instructors schedule 1-on-1 masterclasses and trials around your routine. Choose when you are free to study to immediately unlock trial booking!
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
              <div className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-center justify-between gap-3 bg-white shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg px-3.5 py-1.5 cursor-pointer shrink-0"
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
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
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
                <span className="text-slate-500">Subject / Course:</span>
                <span className="font-bold text-slate-900">
                  {createdTrial.course?.title || selectedCourse?.title || "London A/L Masterclass"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Requested Time:</span>
                <span className="font-bold text-amber-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  {new Date(createdTrial.preferredDate).toLocaleString("en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" "}(30 mins)
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Status:</span>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[11px] font-bold">
                  ⏳ Pending Tutor Confirmation
                </Badge>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-left">
              💡 <strong>Next Step:</strong> As soon as your tutor accepts or confirms the time, you will receive an in-app notification and the Google Meet room link will appear on your Academic Dashboard.
            </p>

            <div className="pt-2">
              <Button
                onClick={onClose}
                className="w-full bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl py-2.5 shadow-xs cursor-pointer"
              >
                Got It, Return to Course
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {availSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{availSuccessMsg}</span>
              </div>
            )}

            {/* Availability Status Badge */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">
                  Your Study Availability is Set
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
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

            {/* Exact Selected Subject / Course Display */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Selected Subject / Course</span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="font-extrabold text-xs text-slate-900 leading-snug">
                  {selectedCourse?.title || (allCourses.length > 0 ? allCourses[0].title : "London A/L Tutorial Masterclass")}
                </div>
                {selectedCourse?.subjectCode && (
                  <Badge variant="outline" className="text-[10px] font-bold bg-white text-blue-700 border-blue-200 shrink-0">
                    {selectedCourse.subjectCode}
                  </Badge>
                )}
              </div>
              {(selectedCourse?.instructor?.name || initialTutorId) && (
                <div className="text-[11px] text-slate-500 pt-0.5">
                  Faculty: <span className="font-semibold text-slate-700">{selectedCourse?.instructor?.name || "Senior Faculty Instructor"}</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 block">
                  Preferred Date &amp; Time <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">Verified against class schedule</span>
              </div>

              {openSlots.length > 0 && (
                <div className="mb-2 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Quick Available Faculty Slots:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {openSlots.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const d = new Date(s.startTime);
                          setPreferredDate(formatForDateTimeInput(d));
                        }}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                          s.matchesStudent
                            ? "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 shadow-xs ring-1 ring-amber-300/60"
                            : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800"
                        }`}
                      >
                        <Clock className={`w-2.5 h-2.5 ${s.matchesStudent ? "text-amber-600" : "text-emerald-600"}`} />
                        <span>{s.dateLabel.split(",")[0]}: {s.timeDisplay}</span>
                        {s.matchesStudent && <span className="text-[9px] text-amber-800 font-extrabold">🌟 Mutual Match</span>}
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
                Connect directly with our subject faculty over video for syllabus diagnostics, problem-solving, and a tailored study plan.
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
                disabled={loading || !preferredDate}
                className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-5 gap-1.5 shadow-md shadow-blue-900/10 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Reserving Session...</span>
                  </>
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
