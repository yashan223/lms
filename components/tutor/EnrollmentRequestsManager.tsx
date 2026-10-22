"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  User,
  BookOpen,
  Calendar,
  Sparkles,
  Check,
  ChevronRight,
  Send,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { mergeConsecutiveSlots } from "@/lib/scheduling";

interface EnrollmentRequestItem {
  id: string;
  studentId: string;
  tutorId: string;
  courseId: string;
  classType: string;
  hoursPerWeek: number;
  duration: string;
  tokensInEscrow?: number;
  recurrenceDurationWeeks?: number;
  selectedSlots: Array<{
    startTime: string;
    endTime: string;
    timeDisplay: string;
    dualTime?: any;
    tutorTimeDisplay?: string;
  }>;
  acceptedSlots?: Array<{
    startTime: string;
    endTime: string;
    timeDisplay: string;
  }> | null;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  notes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  student: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    phone?: string | null;
    timezone?: string | null;
  };
  course: {
    id: string;
    title: string;
    slug: string;
    subjectCode?: string | null;
    thumbnail?: string | null;
    price: number;
    olPrice?: number | null;
  };
}

interface EnrollmentRequestsManagerProps {
  tutorId: string;
  tutorTimezone: string;
}

export function EnrollmentRequestsManager({
  tutorId,
  tutorTimezone,
}: EnrollmentRequestsManagerProps) {
  const [requests, setRequests] = useState<EnrollmentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "CONFIRMED" | "REJECTED">("PENDING");

  // Selection state for accepting a request: requestId -> array of slot objects
  const [chosenSlotsByRequest, setChosenSlotsByRequest] = useState<Record<string, any[]>>({});
  const [submittingRequestId, setSubmittingRequestId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<{ id: string; msg: string } | null>(null);

  // Decline modal state
  const [decliningRequest, setDecliningRequest] = useState<EnrollmentRequestItem | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/enrollment-requests", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.requests)) {
        setRequests(data.requests);
      } else {
        throw new Error(data.error || "Failed to fetch enrollment requests.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [tutorId]);

  useRealtimeSync({
    events: ["ENROLLMENT_REQUESTS_CHANGED", "EVENTS_CHANGED", "NOTIFICATIONS_CHANGED"],
    onSync: () => {
      fetchRequests();
    },
  });

  const toggleSlotForRequest = (req: EnrollmentRequestItem, slot: any) => {
    setChosenSlotsByRequest((prev) => {
      const current = prev[req.id] || [];
      const exists = current.some((s) => s.startTime === slot.startTime);
      if (exists) {
        return {
          ...prev,
          [req.id]: current.filter((s) => s.startTime !== slot.startTime),
        };
      } else {
        if (current.length >= req.hoursPerWeek) {
          // At capacity: replace or prevent
          return {
            ...prev,
            [req.id]: [...current.slice(1), slot],
          };
        }
        return {
          ...prev,
          [req.id]: [...current, slot],
        };
      }
    });
  };

  const handleAcceptRequest = async (req: EnrollmentRequestItem) => {
    const selected = chosenSlotsByRequest[req.id] || [];
    if (selected.length !== req.hoursPerWeek) {
      setActionError({
        id: req.id,
        msg: `Please select exactly ${req.hoursPerWeek} slot(s) to match the student's weekly commitment (currently selected: ${selected.length}).`,
      });
      return;
    }

    try {
      setSubmittingRequestId(req.id);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch("/api/enrollment-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          requestId: req.id,
          acceptedSlots: selected,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to accept enrollment request.");
      }

      setActionSuccess({
        id: req.id,
        msg: data.message || `Successfully accepted! ${data.eventsCount || ""} sessions generated on schedule.`,
      });
      await fetchRequests();
    } catch (err: any) {
      setActionError({ id: req.id, msg: err.message || "Failed to accept request." });
    } finally {
      setSubmittingRequestId(null);
    }
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decliningRequest) return;

    try {
      setSubmittingRequestId(decliningRequest.id);
      const res = await fetch("/api/enrollment-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          requestId: decliningRequest.id,
          rejectionReason: declineReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to decline request.");
      }

      setDecliningRequest(null);
      setDeclineReason("");
      await fetchRequests();
    } catch (err: any) {
      alert(err.message || "Failed to decline request.");
    } finally {
      setSubmittingRequestId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === "ALL") return true;
    return r.status === filter;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const confirmedCount = requests.filter((r) => r.status === "CONFIRMED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3.5">
          <span className="p-2.5 rounded-xl bg-blue-50 text-[#0c2461] border border-blue-200 shrink-0 mt-0.5">
            <CalendarClock className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Class Enrollment &amp; Permanent Scheduling
              </h2>
              {pendingCount > 0 && (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-xs shrink-0">
                  {pendingCount} Action Required
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Review incoming permanent class requests from students. Select the exact number of weekly 1-hour slots requested to automatically populate recurring sessions across both calendars.
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          {[
            { key: "PENDING", label: "Pending Review", count: pendingCount },
            { key: "CONFIRMED", label: "Finalized", count: confirmedCount },
            { key: "REJECTED", label: "Declined", count: rejectedCount },
            { key: "ALL", label: "All Requests", count: requests.length },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === f.key
                  ? "bg-[#0c2461] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                  filter === f.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading student enrollment requests...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 rounded-2xl border border-red-200 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-xs font-bold text-red-700">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchRequests}
            className="text-xs font-bold rounded-xl"
          >
            Retry
          </Button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">
            No enrollment requests currently found under &quot;{filter.toLowerCase()}&quot; filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isPending = req.status === "PENDING";
            const isConfirmed = req.status === "CONFIRMED";
            const isRejected = req.status === "REJECTED";

            const chosenSlots = chosenSlotsByRequest[req.id] || [];
            const hasExactSlots = chosenSlots.length === req.hoursPerWeek;
            const isSubmitting = submittingRequestId === req.id;

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border transition-all p-5 sm:p-6 shadow-xs space-y-5 ${
                  isPending
                    ? "border-amber-200 ring-2 ring-amber-100"
                    : isConfirmed
                    ? "border-emerald-200"
                    : "border-slate-200 opacity-75"
                }`}
              >
                {/* Request Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0c2461] to-[#1e3799] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      {req.student.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">{req.student.name}</h4>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-medium">{req.student.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-blue-700">{req.course.title}</span>
                        {req.course.subjectCode && (
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] font-mono">
                            {req.course.subjectCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Timing */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(req.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isPending ? (
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-xs">
                        ⏳ Needs Schedule Acceptance
                      </Badge>
                    ) : isConfirmed ? (
                      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-xs">
                        ✓ Permanent Schedule Finalized
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-bold text-xs">
                        Declined
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Request Specs Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Class Format
                    </span>
                    <span className="font-bold text-slate-800">{req.classType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Hours Required
                    </span>
                    <span className="font-black text-blue-700">{req.hoursPerWeek} Hours / Week</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Recurrence Track
                    </span>
                    <span className="font-bold text-slate-800">{req.duration}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Offered Slots
                    </span>
                    <span className="font-bold text-slate-700">
                      {req.selectedSlots.length} 1-Hour Options
                    </span>
                  </div>
                </div>

                {/* Upfront Escrow Protection Badge */}
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs flex flex-wrap items-center justify-between gap-1 text-blue-900">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span>🛡️ Upfront Escrow:</span>
                    <strong className="text-blue-950 font-black font-mono">
                      {req.tokensInEscrow || req.hoursPerWeek * (req.duration?.includes("2 month") ? 8 : 4)} Tokens Frozen
                    </strong>
                  </span>
                  <span className="text-[11px] text-blue-700 font-medium">
                    Permanently consumed upon schedule acceptance
                  </span>
                </div>

                {req.notes && (
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900">
                    <span className="font-bold">Student Study Notes: </span>
                    {req.notes}
                  </div>
                )}

                {/* Tutor Selection Interface for Pending Requests */}
                {isPending && (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs text-slate-700 font-bold">
                        Please review student&apos;s favorable slots and accept{" "}
                        <span className="text-blue-700 font-black">
                          exactly {req.hoursPerWeek} slot{req.hoursPerWeek > 1 ? "s" : ""}
                        </span>:
                      </div>

                      {/* Live Counter */}
                      <div className="text-xs font-bold">
                        <span
                          className={
                            hasExactSlots
                              ? "text-emerald-700 font-extrabold"
                              : "text-amber-700 font-semibold"
                          }
                        >
                          Selected: {chosenSlots.length} of {req.hoursPerWeek} required
                        </span>
                      </div>
                    </div>

                    {/* Merged 2-Hour Continuous Class Notice */}
                    {(() => {
                      const mergedChosenGroups = mergeConsecutiveSlots(chosenSlots, undefined, tutorTimezone);
                      const hasMergedChosen = mergedChosenGroups.some((g) => g.isMerged);
                      if (!hasMergedChosen) return null;
                      return (
                        <div className="p-3 rounded-xl bg-blue-50/90 border border-blue-200 text-xs text-blue-950 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-blue-900">
                            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>2-Hour Continuous Class Detected</span>
                          </div>
                          <p className="text-[11px] text-blue-800 leading-relaxed">
                            You selected consecutive slots next to each other (
                            {mergedChosenGroups
                              .filter((g) => g.isMerged)
                              .map((g) => g.tutorTimeDisplay || g.timeDisplay)
                              .join(", ")}
                            ). These will be scheduled together as a single <strong>2-hour continuous class session</strong>.
                            You will be credited for <strong>2 teaching hours</strong> (2 × hourly rate) and 2 tokens will be deducted from the student upon completion.
                          </p>
                        </div>
                      );
                    })()}

                    {/* Slots Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {req.selectedSlots.map((slot, idx) => {
                        const isChosen = chosenSlots.some((s) => s.startTime === slot.startTime);
                        const slotDate = new Date(slot.startTime);
                        const mergedChosenGroups = mergeConsecutiveSlots(chosenSlots, undefined, tutorTimezone);
                        const isPartMerged = isChosen && mergedChosenGroups.some(
                          (g) => g.isMerged && g.originalSlots.some((s) => s.startTime === slot.startTime)
                        );

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleSlotForRequest(req, slot)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isChosen
                                ? "bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span className="text-xs font-black font-mono">
                                {slotDate.toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  timeZone: tutorTimezone,
                                })}
                              </span>
                              {isChosen ? (
                                <span className="bg-white text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
                                  <Check className="w-3 h-3" /> {isPartMerged ? "Merged 2h" : "Selected"}
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  Click to Select
                                </span>
                              )}
                            </div>

                            <div className="text-xs font-bold">
                              {slot.tutorTimeDisplay || slot.timeDisplay}
                            </div>
                            <div
                              className={`text-[10px] mt-1 ${
                                isChosen ? "text-blue-100" : "text-slate-400"
                              }`}
                            >
                              {isPartMerged ? "Merged 2-Hour Class (2 Tokens • 2h Payout)" : "1-Hour Weekly Slot"}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Action Feedbacks */}
                    {actionError && actionError.id === req.id && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{actionError.msg}</span>
                      </div>
                    )}

                    {actionSuccess && actionSuccess.id === req.id && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{actionSuccess.msg}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDecliningRequest(req);
                          setDeclineReason("");
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-xl cursor-pointer"
                      >
                        Decline Request
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        disabled={!hasExactSlots || isSubmitting}
                        onClick={() => handleAcceptRequest(req)}
                        className={`text-xs font-bold rounded-xl px-5 h-9 gap-1.5 shadow-xs cursor-pointer ${
                          hasExactSlots
                            ? "bg-[#0c2461] hover:bg-[#12366b] text-white"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Scheduling Sessions...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              {hasExactSlots
                                ? "Accept & Finalize Permanent Schedule"
                                : `Select ${req.hoursPerWeek} Slot(s) to Finalize`}
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Finalized slots review for confirmed requests */}
                {isConfirmed && req.acceptedSlots && (() => {
                  const confirmedGroups = mergeConsecutiveSlots(req.acceptedSlots, undefined, tutorTimezone);
                  return (
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                      <span className="font-bold text-emerald-900 block">
                        Confirmed Weekly Schedule:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {confirmedGroups.map((g, gIdx) => {
                          const sDate = new Date(g.startTime);
                          return (
                            <span
                              key={gIdx}
                              className="bg-white border border-emerald-300 text-emerald-900 px-3 py-1 rounded-lg font-bold font-mono text-xs flex items-center gap-1.5 shadow-2xs"
                            >
                              <CalendarClock className="w-3.5 h-3.5 text-emerald-600" />
                              {sDate.toLocaleDateString("en-US", {
                                weekday: "short",
                                timeZone: tutorTimezone,
                              })}{" "}
                              at {g.tutorTimeDisplay || g.timeDisplay}
                              {g.isMerged && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-sans font-bold">
                                  2-Hour Class (2 Tokens • 2h Payout)
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {isRejected && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    <span className="font-bold">Declined: </span>
                    {req.rejectionReason || "Schedule conflict."}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decline Dialog Modal */}
      {decliningRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-slate-900">
                Decline Enrollment Request?
              </h3>
              <button
                onClick={() => setDecliningRequest(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to decline {decliningRequest.student.name}&apos;s enrollment
              request for <strong>{decliningRequest.course.title}</strong>? They will be notified so they can pick alternative times.
            </p>

            <form onSubmit={handleDeclineSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Reason for Student (Optional)
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Schedule currently full on weekdays, please request weekend slots..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDecliningRequest(null)}
                  className="text-xs font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingRequestId === decliningRequest.id}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"
                >
                  Confirm Decline
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
