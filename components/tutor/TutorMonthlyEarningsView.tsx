"use client";

import React, { useState } from "react";
import {
  Coins,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Wallet,
  FileText,
  Lock,
  Info,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  CalendarDays,
} from "lucide-react";

interface EarningRecord {
  id: string;
  eventId: string;
  courseId?: string | null;
  studentId?: string | null;
  tier: "IGCSE" | "IAL_IAS";
  amountLkr: number;
  tokenCount: number;
  description: string;
  monthKey: string;
  year: number;
  month: number;
  createdAt: string;
  student?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  course?: {
    id: string;
    title: string;
    subjectCode?: string | null;
  } | null;
}

interface MonthlyPayoutArchive {
  id: string;
  tutorId: string;
  monthKey: string;
  totalAmountLkr: number;
  totalHours: number;
  igcseHours: number;
  ialHours: number;
  status: "PAYABLE" | "PAID";
  archivedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface MonthlyEarningsData {
  currentMonth: {
    monthKey: string;
    monthLabel: string;
    totalAmountLkr: number;
    totalHours: number;
    igcseHours: number;
    igcseEarningsLkr: number;
    ialHours: number;
    ialEarningsLkr: number;
    records: EarningRecord[];
  };
  archivedMonths: MonthlyPayoutArchive[];
}

interface Props {
  earnings: MonthlyEarningsData | null;
  loading?: boolean;
}

export function TutorMonthlyEarningsView({ earnings, loading }: Props) {
  const [activeLedgerTab, setActiveLedgerTab] = useState<"current" | "archives">("current");

  const current = earnings?.currentMonth;
  const archives = earnings?.archivedMonths || [];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading tutor monthly earnings ledger...</p>
      </div>
    );
  }

  const formatLkr = (num: number = 0) => {
    return `Rs. ${num.toLocaleString("en-LK")} LKR`;
  };

  const formatMonthLabel = (key: string) => {
    try {
      const [yearStr, monthStr] = key.split("-");
      const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch {
      return key;
    }
  };

  return (
    <div className="space-y-6">
      {/* Monthly Cycle Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0c2461] to-slate-900 rounded-3xl p-6 text-white shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Calendar Cycle
              </span>
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-blue-300" />
                {current?.monthLabel || "Current Month"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {formatLkr(current?.totalAmountLkr || 0)}
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Real-time converted earnings for this calendar month. Automatically credited as 1-hour classes are marked completed and student tokens are deducted.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-xs space-y-2 shrink-0">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Monthly Reset & Payout Cycle</span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Cycle Window:</span>
                <span className="font-semibold text-white">1st day – Last day</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Next Reset:</span>
                <span className="font-semibold text-emerald-300">00:00 on 1st of next month</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Archive Policy:</span>
                <span className="font-semibold text-white">Auto-locks as Final Payable</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Hero Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hours */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Hours Logged
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {current?.totalHours || 0} <span className="text-sm font-semibold text-slate-400">Hours</span>
          </div>
          <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />
            <span>{current?.totalHours || 0} Tokens Deducted (1 Token = 1 Hr)</span>
          </div>
        </div>

        {/* IGCSE Hours & Earnings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              IGCSE Level (O/L)
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
              750 LKR / hr
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight">
            {formatLkr(current?.igcseEarningsLkr || 0)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {current?.igcseHours || 0} hours completed this month
          </div>
        </div>

        {/* IAL & IAS Hours & Earnings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              IAL & IAS (A-Level)
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
              850 LKR / hr
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight">
            {formatLkr(current?.ialEarningsLkr || 0)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {current?.ialHours || 0} hours completed this month
          </div>
        </div>

        {/* Monthly Payout Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Payout Ledger Cycle
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700 tracking-tight flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Accumulating</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {archives.length} previous archived cycles
          </div>
        </div>
      </div>

      {/* Tabs: Current Month Class Ledger vs Archived Monthly Payouts */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              onClick={() => setActiveLedgerTab("current")}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeLedgerTab === "current"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Current Month Class Ledger ({current?.records?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveLedgerTab("archives")}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeLedgerTab === "archives"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Archived Monthly Cycles ({archives.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Earnings credit instantly when class is marked "Done / Completed"</span>
          </div>
        </div>

        {/* Tab 1: Current Month Live Ledger */}
        {activeLedgerTab === "current" && (
          <div className="p-5 space-y-4">
            {(!current?.records || current.records.length === 0) ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Coins className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">No Class Sessions Logged for {current?.monthLabel || "This Month"}</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When you complete a scheduled 1-hour class session, 1 token is subtracted from the student and the converted local currency (750 LKR for IGCSE, 850 LKR for IAL/IAS) will appear here instantly.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pl-2">Class Session</th>
                      <th className="pb-3">Academic Tier</th>
                      <th className="pb-3">Student</th>
                      <th className="pb-3">Completed At</th>
                      <th className="pb-3">Token Deduction</th>
                      <th className="pb-3 pr-2 text-right">Credited Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {current.records.map((r) => {
                      const isIgcse = r.tier === "IGCSE";
                      const dateObj = new Date(r.createdAt);
                      const formattedDate = dateObj.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                      const formattedTime = dateObj.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 pl-2">
                            <div className="font-bold text-slate-900">{r.description || "1-Hour Class Session"}</div>
                            {r.course?.title && (
                              <div className="text-[11px] text-slate-500">{r.course.title}</div>
                            )}
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                isIgcse
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              }`}
                            >
                              {isIgcse ? "IGCSE Level (750 LKR)" : "IAL & IAS Level (850 LKR)"}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-700">
                            <div>{r.student?.name || "Student"}</div>
                            <div className="text-[10.5px] text-slate-400">{r.student?.email}</div>
                          </td>
                          <td className="py-3.5 text-slate-600 whitespace-nowrap">
                            <div>{formattedDate}</div>
                            <div className="text-[10.5px] text-slate-400">{formattedTime}</div>
                          </td>
                          <td className="py-3.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              -1 Token (Done)
                            </span>
                          </td>
                          <td className="py-3.5 pr-2 text-right">
                            <span className="font-black text-sm text-emerald-700">
                              + {formatLkr(r.amountLkr)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Archived Monthly Cycles */}
        {activeLedgerTab === "archives" && (
          <div className="p-5 space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-3">
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Monthly Archive & Payout Cycles</span>
                <p className="text-[11.5px] text-slate-500 mt-0.5">
                  At 00:00 on the 1st of every month, the accumulated counter from the preceding month resets to zero for the fresh cycle. The prior month’s earnings are permanently archived here as the final payable amount for that payout cycle.
                </p>
              </div>
            </div>

            {archives.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No Past Archived Cycles Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When the current calendar month concludes at 00:00 on the 1st, its final total will be automatically archived and displayed here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pl-2">Payout Cycle Month</th>
                      <th className="pb-3">Total Completed Hours</th>
                      <th className="pb-3">Tier Breakdown</th>
                      <th className="pb-3">Archived Timestamp</th>
                      <th className="pb-3">Payout Status</th>
                      <th className="pb-3 pr-2 text-right">Final Payable Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {archives.map((a) => {
                      const archiveDate = new Date(a.archivedAt || a.createdAt);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 pl-2 font-bold text-slate-900">
                            {formatMonthLabel(a.monthKey)}
                          </td>
                          <td className="py-3.5 text-slate-700">
                            <span className="font-black text-slate-900">{a.totalHours}</span> Hours
                          </td>
                          <td className="py-3.5 text-slate-600 text-[11px]">
                            <span className="font-semibold text-blue-700">{a.igcseHours} IGCSE</span> (750 LKR) +{" "}
                            <span className="font-semibold text-indigo-700">{a.ialHours} IAL</span> (850 LKR)
                          </td>
                          <td className="py-3.5 text-slate-500 text-[11px]">
                            {archiveDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                                a.status === "PAID"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {a.status === "PAID" ? "PAID OUT" : "FINAL PAYABLE"}
                            </span>
                          </td>
                          <td className="py-3.5 pr-2 text-right font-black text-sm text-slate-900">
                            {formatLkr(a.totalAmountLkr)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
