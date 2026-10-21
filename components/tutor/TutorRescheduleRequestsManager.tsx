"use client";

import React, { useState } from "react";
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  User,
  BookOpen,
  MessageSquare,
  Loader2,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatForUser } from "@/lib/timezones";

interface RescheduleRequestItem {
  id: string;
  eventId: string;
  courseId?: string | null;
  studentId: string;
  tutorId: string;
  originalDate: string;
  requestedDate: string;
  studentReason?: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  createdAt: string;
  event?: {
    id: string;
    title: string;
    dueDate: string;
    meetingLink?: string | null;
  } | null;
  course?: {
    id: string;
    title: string;
    subjectCode?: string | null;
  } | null;
  student?: {
    id: string;
    name: string | null;
    email: string;
    avatar?: string | null;
    timezone?: string | null;
  } | null;
}

interface Props {
  requests: RescheduleRequestItem[];
  tutorTimezone: string;
  onRefresh: () => void;
}

export function TutorRescheduleRequestsManager({
  requests,
  tutorTimezone,
  onRefresh,
}: Props) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Decline modal state
  const [decliningRequest, setDecliningRequest] = useState<RescheduleRequestItem | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  if (!requests || requests.length === 0) {
    return null;
  }

  const handleAccept = async (req: RescheduleRequestItem) => {
    try {
      setProcessingId(req.id);
      setFeedbackMsg(null);

      const res = await fetch("/api/classes/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept_reschedule",
          requestId: req.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to accept reschedule request.");
      }

      setFeedbackMsg({
        type: "success",
        text: `✅ Accepted! "${req.event?.title || "Class"}" has been rescheduled to the new time and the student was notified.`,
      });
      onRefresh();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err.message || "Failed to accept request.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenDeclineModal = (req: RescheduleRequestItem) => {
    setDecliningRequest(req);
    setDeclineReason("");
  };

  const handleConfirmDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decliningRequest) return;

    try {
      setIsSubmittingDecline(true);
      setFeedbackMsg(null);

      const res = await fetch("/api/classes/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decline_reschedule",
          requestId: decliningRequest.id,
          responseNote: declineReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to decline reschedule request.");
      }

      setFeedbackMsg({
        type: "success",
        text: `Reschedule declined. The class remains at its original scheduled time.`,
      });
      setDecliningRequest(null);
      onRefresh();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to decline reschedule request.");
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                  Student Class Reschedule Requests
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                  {requests.length} Pending Review
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Students must request reschedules at least 24 hours in advance (max 2/month). If you accept, the class moves to the new slot. If you decline, the original time remains unchanged.
              </p>
            </div>
          </div>
        </div>

        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              feedbackMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        <div className="space-y-3">
          {requests.map((req) => {
            const isProcessing = processingId === req.id;
            const origDateStr = formatForUser(req.originalDate, tutorTimezone, {
              weekday: "short",
              month: "short",
            });
            const reqDateStr = formatForUser(req.requestedDate, tutorTimezone, {
              weekday: "short",
              month: "short",
            });

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-amber-200/80 p-4 shadow-2xs space-y-3 hover:border-amber-300 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-900">
                        {req.event?.title || "Class Session"}
                      </span>
                      {req.course?.title && (
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {req.course.title}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1 font-semibold text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.student?.name || "Student"}</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-400">{req.student?.email}</span>
                    </div>
                  </div>

                  {/* Time Comparison Box */}
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs shrink-0">
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Original Time
                      </span>
                      <span className="font-semibold text-slate-700 line-through text-[11px]">
                        {origDateStr}
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />

                    <div>
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">
                        Proposed New Time
                      </span>
                      <span className="font-black text-emerald-700 text-xs">
                        {reqDateStr}
                      </span>
                    </div>
                  </div>
                </div>

                {req.studentReason && (
                  <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-100 text-xs text-amber-900 flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[11px] text-amber-950">Student's Reason: </span>
                      <span className="italic">&ldquo;{req.studentReason}&rdquo;</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-400">
                    Submitted: {new Date(req.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDeclineModal(req)}
                      disabled={isProcessing}
                      className="h-8 text-xs font-bold text-rose-700 border-rose-200 hover:bg-rose-50 gap-1.5 rounded-lg cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Decline (Keep Original)</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleAccept(req)}
                      disabled={isProcessing}
                      className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-lg shadow-xs cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept & Move Class</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decline Reason Modal */}
      {decliningRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Decline Reschedule Request</h3>
                  <p className="text-[11px] text-slate-500">The class will remain at its original scheduled time.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmDecline} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800">{decliningRequest.event?.title}</div>
                <div className="text-slate-500 text-[11px]">
                  Original Time: {formatForUser(decliningRequest.originalDate, tutorTimezone, { weekday: "short", month: "short" })}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Requested: {formatForUser(decliningRequest.requestedDate, tutorTimezone, { weekday: "short", month: "short" })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Optional Reason / Note to Student
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g., I have an in-person conflict during that proposed hour. Please propose another time slot or attend the original session."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDecliningRequest(null)}
                  disabled={isSubmittingDecline}
                  className="text-xs font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingDecline}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl gap-1.5"
                >
                  {isSubmittingDecline ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Declining...</span>
                    </>
                  ) : (
                    <span>Confirm Decline</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
