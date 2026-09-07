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
    phone?: string | null;
  } | null;
  onSuccess?: (trial: any) => void;
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

export function TrialRequestModal({
  isOpen,
  onClose,
  initialCourseId,
  initialTutorId,
  allCourses = [],
  currentUser,
  onSuccess,
}: TrialRequestModalProps) {
  const [courseId, setCourseId] = useState(initialCourseId || "");
  const [preferredDate, setPreferredDate] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTrial, setCreatedTrial] = useState<any | null>(null);

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
    }
  }, [isOpen, initialCourseId, allCourses, courseId]);

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
                  Request a 30-Min Free Trial
                </h3>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border-emerald-200">
                  100% Free
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                1-on-1 Online Consultation &amp; Syllabus Masterclass
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdTrial ? (
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
              <label className="font-bold text-slate-700 block mb-1">
                Preferred Date &amp; Time <span className="text-red-500">*</span>
              </label>
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
