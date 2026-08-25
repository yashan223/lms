"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Video,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
  BookOpen,
  User,
  Mail,
  Phone,
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
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTrial, setCreatedTrial] = useState<any | null>(null);

  // Initialize form defaults
  useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        setStudentName(currentUser.name || "");
        setStudentEmail(currentUser.email || "");
        setStudentPhone(currentUser.phone || "");
      }
      if (initialCourseId) {
        setCourseId(initialCourseId);
      } else if (allCourses.length > 0 && !courseId) {
        setCourseId(allCourses[0].id);
      }

      // Default date to tomorrow at 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setPreferredDate(formatForDateTimeInput(tomorrow));

      setError(null);
      setCreatedTrial(null);
    }
  }, [isOpen, currentUser, initialCourseId, allCourses]);

  if (!isOpen) return null;

  const selectedCourse = allCourses.find((c) => c.id === courseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentEmail.trim() || !preferredDate) {
      setError("Please complete all required fields.");
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
          studentName: studentName.trim(),
          studentEmail: studentEmail.trim().toLowerCase(),
          studentPhone: studentPhone.trim() || null,
          courseId: courseId || null,
          tutorId: initialTutorId || selectedCourse?.instructor?.id || null,
          studentId: currentUser?.id || null,
          preferredDate: new Date(preferredDate).toISOString(),
          topic: topic.trim() || "30-Min Free Trial & Syllabus Overview",
          notes: notes.trim() || null,
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
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
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
                1-on-1 Online Consultation & Syllabus Masterclass
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

        {/* Success Confirmation View */}
        {createdTrial ? (
          <div className="space-y-4 py-2 text-center animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-slate-900">
                Free Trial Session Reserved!
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Your 30-minute 1-on-1 online session has been scheduled and added to both your Academic Calendar and your tutor’s schedule.
              </p>
            </div>

            {/* Session Details Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Subject / Course:</span>
                <span className="font-bold text-slate-900">
                  {createdTrial.course?.title || selectedCourse?.title || "London A/L Masterclass"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Scheduled Date & Time:</span>
                <span className="font-bold text-blue-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(createdTrial.preferredDate).toLocaleString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" "}(30 mins)
                </span>
              </div>
              {createdTrial.meetingLink && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  <span className="text-slate-500">Online Classroom:</span>
                  <a
                    href={createdTrial.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-bold truncate max-w-[200px] flex items-center gap-1"
                  >
                    <span>{createdTrial.meetingLink}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <a
                href={buildGoogleCalendarUrl({
                  title: `30-Min Free Trial: ${createdTrial.course?.title || "London A/L Tutorial"} (${createdTrial.studentName})`,
                  description: `30-Minute 1-on-1 Online Trial Session with Faculty.\nTopic: ${createdTrial.topic}\nOnline Classroom: ${createdTrial.meetingLink}`,
                  dueDate: createdTrial.preferredDate,
                  courseTitle: createdTrial.course?.title,
                  location: createdTrial.meetingLink,
                  durationMinutes: 30,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Add 30-Min Trial to Google Calendar</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <Button
                variant="outline"
                onClick={onClose}
                className="w-full text-xs font-semibold rounded-xl"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Course Selector */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Select Subject / Course <span className="text-red-500">*</span>
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {allCourses.length > 0 ? (
                  allCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.subjectCode ? `(${c.subjectCode})` : ""}
                    </option>
                  ))
                ) : (
                  <option value="">London A/L General Tutorial</option>
                )}
              </select>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Preferred Date & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Preferred Date & Time <span className="text-red-500">*</span>
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
                  WhatsApp / Phone (Optional)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Topic / Focus */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Topic or Questions of Interest
              </label>
              <input
                type="text"
                placeholder="Mention any specific topics, exam boards, or requirements..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Feature Note Banner */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>30-Minute Live Online Interactive Session</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Connect directly with our subject faculty over video for syllabus diagnostics, problem-solving, and a tailored study plan. Linked directly to Google Calendar.
              </p>
            </div>

            {/* Form Actions */}
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
                disabled={loading || !studentName.trim() || !studentEmail.trim()}
                className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-5 gap-1.5 shadow-md shadow-blue-900/10 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Reserving Session...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
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
