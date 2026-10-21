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
  Award,
  Trophy,
  Target,
  Flame,
  ChevronRight,
  Zap,
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
  bonusAmountLkr?: number;
  bonusTier?: string | null;
  status: "PAYABLE" | "PAID";
  archivedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface BonusTierInfo {
  id: string;
  name: string;
  minHours: number;
  maxHours: number | null;
  bonusLkr: number;
  achieved: boolean;
  active: boolean;
}

interface MonthlyBonusData {
  totalHours: number;
  unlockedBonusLkr: number;
  currentTier: "Tier 1" | "Tier 2" | "Tier 3" | null;
  nextTier: "Tier 1" | "Tier 2" | "Tier 3" | null;
  nextTierMinHours: number;
  hoursToNextTier: number;
  progressPercent: number;
  tiers: BonusTierInfo[];
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
    bonus?: MonthlyBonusData;
    totalEstimatedPayoutLkr?: number;
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
  const bonus = current?.bonus;
  const unlockedBonusLkr = bonus?.unlockedBonusLkr || 0;
  const baseEarningsLkr = current?.totalAmountLkr || 0;
  const totalEstimatedPayoutLkr = current?.totalEstimatedPayoutLkr ?? (baseEarningsLkr + unlockedBonusLkr);
  const totalHours = current?.totalHours || 0;

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
      <div className="bg-gradient-to-r from-slate-900 via-[#0c2461] to-slate-900 rounded-3xl p-6 text-white shadow-lg space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-blue-300" />
                {current?.monthLabel || "Current Month"}
              </span>
              {bonus?.currentTier && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  {bonus.currentTier} Unlocked (+{formatLkr(unlockedBonusLkr)})
                </span>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                Total Estimated Monthly Payout (Hourly + Performance Bonus)
              </span>
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  {formatLkr(totalEstimatedPayoutLkr)}
                </h2>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg">
                    Base Hourly: {formatLkr(baseEarningsLkr)}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg border ${
                    unlockedBonusLkr > 0
                      ? "bg-amber-400/20 text-amber-300 border-amber-400/30 font-black"
                      : "bg-white/5 text-slate-400 border-white/10"
                  }`}>
                    Bonus: {unlockedBonusLkr > 0 ? `+${formatLkr(unlockedBonusLkr)} (${bonus?.currentTier})` : "Rs. 0 (Need 50h)"}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Real-time converted earnings for this calendar month. Standard hourly earnings accumulate per completed token (1 token = 1 hour), and performance bonuses unlock dynamically as monthly hours increase.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-xs space-y-2 shrink-0">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Monthly Reset & Payout Cycle</span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-1.5">
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
            {totalHours} <span className="text-sm font-semibold text-slate-400">Hours</span>
          </div>
          <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />
            <span>{totalHours} Tokens Deducted (1 Token = 1 Hr)</span>
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

        {/* Unlocked Performance Bonus Card */}
        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-2xs space-y-2 bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Unlocked Bonus
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-900 tracking-tight flex items-center gap-1.5">
            <span>{formatLkr(unlockedBonusLkr)}</span>
          </div>
          <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
            {bonus?.currentTier ? (
              <span>👑 {bonus.currentTier} Awarded (Non-Stacking)</span>
            ) : (
              <span>{bonus?.hoursToNextTier ?? 50} more hrs to Tier 1 (+5,000 LKR)</span>
            )}
          </div>
        </div>
      </div>

      {/* Gamified Performance Bonus Milestone Tracker */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-white flex items-center justify-center shadow-xs">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="font-black text-base text-slate-900">
                Monthly Performance Bonus Tracker
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                Non-Stacking • Highest Tier Wins
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Bonuses do not stack: at the end of the calendar month, you receive the single highest achieved tier amount.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Cycle resets in 00:00 on 1st</span>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              Current Hours: <strong className="text-blue-900 font-black text-sm">{totalHours} Hours</strong>
            </span>
            <span className="text-slate-500 font-medium">
              Target: <strong>100+ Hours (Tier 3)</strong>
            </span>
          </div>

          {/* Graphical Progress Bar with Milestone Pins */}
          <div className="relative pt-6 pb-2">
            {/* Background track */}
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(4, (totalHours / 100) * 100))}%` }}
              />
            </div>

            {/* Milestone Markers */}
            <div className="relative w-full">
              {/* Start (0h) */}
              <div className="absolute left-0 -top-10 -translate-x-1/2 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400">0h</span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
              </div>

              {/* Tier 1 (50h) */}
              <div
                className="absolute -top-10 -translate-x-1/2 flex flex-col items-center"
                style={{ left: "50%" }}
              >
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                  totalHours >= 50
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  50h (Tier 1)
                </span>
                <span className={`w-3.5 h-3.5 rounded-full ring-4 ring-white mt-0.5 ${
                  totalHours >= 50 ? "bg-emerald-500" : "bg-slate-300"
                }`} />
              </div>

              {/* Tier 2 (75h) */}
              <div
                className="absolute -top-10 -translate-x-1/2 flex flex-col items-center"
                style={{ left: "75%" }}
              >
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                  totalHours >= 75
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  75h (Tier 2)
                </span>
                <span className={`w-3.5 h-3.5 rounded-full ring-4 ring-white mt-0.5 ${
                  totalHours >= 75 ? "bg-emerald-500" : "bg-slate-300"
                }`} />
              </div>

              {/* Tier 3 (100h) */}
              <div
                className="absolute -top-10 -translate-x-full flex flex-col items-end"
                style={{ left: "100%" }}
              >
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                  totalHours >= 100
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  100h+ (Tier 3)
                </span>
                <span className={`w-3.5 h-3.5 rounded-full ring-4 ring-white mt-0.5 ${
                  totalHours >= 100 ? "bg-amber-500" : "bg-slate-300"
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* 3 Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Tier 1 */}
          <div className={`p-4 rounded-2xl border transition-all ${
            bonus?.currentTier === "Tier 1"
              ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
              : totalHours >= 50
              ? "bg-slate-50 border-slate-200 opacity-80"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Tier 1</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                bonus?.currentTier === "Tier 1"
                  ? "bg-blue-600 text-white"
                  : totalHours >= 50
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {bonus?.currentTier === "Tier 1" ? "Active Tier" : totalHours >= 50 ? "Achieved" : "Locked"}
              </span>
            </div>
            <div className="text-xl font-black text-slate-900">
              5,000 <span className="text-xs font-bold text-slate-500">LKR</span>
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-1">
              Requirement: 50 to 74 completed hours
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px]">
              {totalHours >= 50 ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Unlocked (+5,000 LKR)
                </span>
              ) : (
                <span className="text-slate-500">
                  Need <strong>{50 - totalHours}</strong> more hours
                </span>
              )}
            </div>
          </div>

          {/* Tier 2 */}
          <div className={`p-4 rounded-2xl border transition-all ${
            bonus?.currentTier === "Tier 2"
              ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
              : totalHours >= 75
              ? "bg-slate-50 border-slate-200 opacity-80"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Tier 2</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                bonus?.currentTier === "Tier 2"
                  ? "bg-indigo-600 text-white"
                  : totalHours >= 75
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {bonus?.currentTier === "Tier 2" ? "Active Tier" : totalHours >= 75 ? "Achieved" : "Locked"}
              </span>
            </div>
            <div className="text-xl font-black text-slate-900">
              7,500 <span className="text-xs font-bold text-slate-500">LKR</span>
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-1">
              Requirement: 75 to 99 completed hours
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px]">
              {totalHours >= 75 ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Unlocked (+7,500 LKR)
                </span>
              ) : (
                <span className="text-slate-500">
                  Need <strong>{75 - totalHours}</strong> more hours
                </span>
              )}
            </div>
          </div>

          {/* Tier 3 */}
          <div className={`p-4 rounded-2xl border transition-all ${
            bonus?.currentTier === "Tier 3"
              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                Tier 3 (Max)
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                bonus?.currentTier === "Tier 3"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {bonus?.currentTier === "Tier 3" ? "👑 Max Achieved!" : "Locked"}
              </span>
            </div>
            <div className="text-xl font-black text-amber-900">
              10,000 <span className="text-xs font-bold text-slate-500">LKR</span>
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-1">
              Requirement: 100+ completed hours
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px]">
              {totalHours >= 100 ? (
                <span className="text-amber-800 font-black flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Max Bonus Unlocked (+10,000 LKR)
                </span>
              ) : (
                <span className="text-slate-500">
                  Need <strong>{100 - totalHours}</strong> more hours
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Motivational Banner Callout */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-2xs flex items-center justify-center shrink-0 text-blue-600">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">
                {totalHours >= 100
                  ? "🎉 Outstanding Work! Maximum Tier 3 Performance Bonus Unlocked!"
                  : totalHours >= 75
                  ? "🔥 Tier 2 Unlocked (+7,500 LKR)! Just " + (100 - totalHours) + " hours left to hit Tier 3 (+10,000 LKR)!"
                  : totalHours >= 50
                  ? "👏 Tier 1 Unlocked (+5,000 LKR)! Complete " + (75 - totalHours) + " more hours to upgrade to Tier 2 (+7,500 LKR)!"
                  : "💡 You're on your way! Log " + (50 - totalHours) + " more completed hours this month to unlock the Tier 1 Bonus (+5,000 LKR)!"}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                The bonus is dynamically previewed in your estimated monthly payout. On the 1st of next month, your highest achieved bonus locks in for final payout.
              </div>
            </div>
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
