"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Coins,
  CheckCircle2,
  ShieldCheck,
  FileText,
  PlayCircle,
  Award,
  Video,
  Loader2,
  ArrowRight,
  Unlock,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CoursePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    slug: string;
    price: number;
    subjectCode?: string;
    level?: string;
    tutor?: {
      name: string;
      avatar?: string;
      headline?: string;
      roleTitle?: string;
    };
    instructor?: {
      name: string;
      avatar?: string;
      headline?: string;
      roleTitle?: string;
    };
  } | null;
  onSuccess?: () => void;
}

export function CoursePurchaseModal({
  isOpen,
  onClose,
  course,
  onSuccess,
}: CoursePurchaseModalProps) {
  const router = useRouter();

  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const price = Number(course?.price) || 3;

  // Fetch student's real-time token wallet when modal opens
  useEffect(() => {
    if (!isOpen || !course) return;

    let isMounted = true;
    setLoadingWallet(true);
    setErrorMessage(null);

    fetch("/api/tokens")
      .then(async (res) => {
        if (!isMounted) return;
        if (res.status === 401) {
          setIsLoggedIn(false);
          setTokenBalance(null);
        } else if (res.ok) {
          const data = await res.json();
          setIsLoggedIn(true);
          setTokenBalance(Number(data.balance) || 0);
        } else {
          setIsLoggedIn(true);
          setTokenBalance(0);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to fetch token balance:", err);
        setIsLoggedIn(false);
      })
      .finally(() => {
        if (isMounted) setLoadingWallet(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, course]);

  if (!isOpen || !course) return null;

  const hasSufficientTokens =
    tokenBalance !== null && tokenBalance >= price;

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setProcessing(true);

    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(course.slug)}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: price,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setErrorMessage("Please sign in or register to complete your course enrollment.");
        setTimeout(() => {
          router.push(`/login?redirect=${encodeURIComponent(`/courses/${course.slug}`)}`);
        }, 1200);
        return;
      }

      if (res.ok) {
        setPurchaseSuccess(true);
        if (tokenBalance !== null) {
          setTokenBalance(Math.max(0, tokenBalance - price));
        }
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setErrorMessage(data.error || "Enrollment processing failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Purchase error:", err);
      setErrorMessage("Network error occurred during enrollment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleFinish = () => {
    setPurchaseSuccess(false);
    setErrorMessage(null);
    onClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 my-8">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Coins className="w-6 h-6 text-amber-100 fill-amber-200/30" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                  {course.subjectCode || "ACADEMIC SPECIFICATION"}
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {course.level || "London A/L"}
                </span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 mt-0.5 leading-snug">
                {purchaseSuccess ? "Enrollment Complete!" : `Course Enrollment (${price} Tokens)`}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={purchaseSuccess ? handleFinish : onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {purchaseSuccess ? (
          /* Success Screen */
          <div className="py-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            <div className="space-y-1.5">
              <h4 className="font-black text-xl text-slate-900">
                You&apos;re Enrolled in {course.title}!
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                You have successfully allocated <strong className="text-slate-900">{price} Tokens</strong> to enroll. All verified study handbooks, formula sheets, video lessons, and live tuition sessions are now unlocked.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left space-y-2 text-xs">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Unlock className="w-4 h-4 text-emerald-600" />
                <span>Everything Now Unlocked:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Download all study materials</span>
                </div>
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Full syllabus video lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Google Meet live classes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Official course certificate</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleFinish}
                className="w-full bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs h-11 rounded-xl shadow-md cursor-pointer gap-2"
              >
                <span>Access Course Materials & Lessons</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* Enrollment Form with Academic Tokens */
          <form onSubmit={handlePurchase} className="space-y-4 text-xs">
            {/* Course Summary Item */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h4 className="font-extrabold text-sm text-slate-900 leading-snug truncate">
                  {course.title}
                </h4>
                {(course.tutor || course.instructor) && (
                  <div className="flex items-center gap-2">
                    <Avatar className="w-5 h-5 ring-1 ring-slate-200">
                      <AvatarImage src={course.tutor?.avatar || course.instructor?.avatar} />
                      <AvatarFallback>{(course.tutor?.name || course.instructor?.name || "T").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] text-slate-600 font-medium">
                      Taught by {course.tutor?.name || course.instructor?.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5">
                  <Coins className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                  <span className="text-2xl font-black text-slate-900">{price}</span>
                  <span className="text-xs font-bold text-slate-500 uppercase">Tokens</span>
                </div>
                <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                  Lifetime Access
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Student Token Wallet Ledger */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <span>Academic Token Wallet</span>
                </div>
                <div>
                  {loadingWallet ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Checking balance...</span>
                    </div>
                  ) : isLoggedIn ? (
                    <span className="text-xs font-black text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                      {tokenBalance ?? 0} Tokens Available
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500">
                      Guest Session
                    </span>
                  )}
                </div>
              </div>

              {/* Wallet Computation Rows */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Current Available Balance</span>
                  <span className="font-semibold text-slate-900">
                    {loadingWallet ? "..." : isLoggedIn ? `${tokenBalance ?? 0} Tokens` : "Sign In Required"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Course Enrollment Fee</span>
                  <span className="font-bold text-amber-600">-{price} Tokens</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-bold">
                  <span className="text-slate-800">Remaining Balance After Enrollment</span>
                  {loadingWallet ? (
                    <span className="text-slate-400">...</span>
                  ) : isLoggedIn ? (
                    <span
                      className={
                        hasSufficientTokens
                          ? "text-emerald-700 font-black"
                          : "text-red-600 font-black"
                      }
                    >
                      {hasSufficientTokens
                        ? `${(tokenBalance ?? 0) - price} Tokens`
                        : `Need ${price - (tokenBalance ?? 0)} more Tokens`}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>

              {/* Status Notice */}
              {loadingWallet ? null : !isLoggedIn ? (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-[11px] text-blue-900">
                      Sign in to your student account to enroll with tokens.
                    </span>
                  </div>
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/courses/${course.slug}`)}`}
                    className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 shrink-0"
                  >
                    Sign In
                  </Link>
                </div>
              ) : !hasSufficientTokens ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-[11px] text-amber-900">
                      Insufficient tokens. You need <strong>{price - (tokenBalance ?? 0)} more tokens</strong>.
                    </span>
                  </div>
                  <Link
                    href="/dashboard"
                    className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 shrink-0 flex items-center gap-1"
                  >
                    <Coins className="w-3 h-3 fill-amber-300 text-amber-300" />
                    <span>Top Up</span>
                  </Link>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] text-emerald-900 font-medium">
                    Sufficient token balance. Tokens will be deducted automatically from your wallet upon confirmation.
                  </span>
                </div>
              )}
            </div>

            {/* Price Breakdown Specification */}
            <div className="space-y-1.5 pt-1 text-slate-600 text-xs">
              <div className="flex items-center justify-between">
                <span>Course Tuition Specification</span>
                <span className="font-semibold text-slate-900">{price} Tokens</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Platform & Registration Fee</span>
                <span className="font-bold text-emerald-700">FREE (0 Tokens)</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
                <span>Total Tokens Required</span>
                <span className="text-[#0c2461] flex items-center gap-1 font-black">
                  <Coins className="w-4 h-4 text-amber-500" />
                  {price} Tokens
                </span>
              </div>
            </div>

            {/* Security Guarantee */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Instant Digital Access • 30-Day Academic Guarantee • Zero Processing Fees</span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={processing}
                className="rounded-xl cursor-pointer text-xs"
              >
                Cancel
              </Button>

              {!isLoggedIn ? (
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/courses/${course.slug}`)}`}
                  className="bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs h-10 px-6 rounded-xl shadow-md flex items-center gap-2 transition-colors"
                >
                  <span>Sign In to Enroll</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : hasSufficientTokens ? (
                <Button
                  type="submit"
                  disabled={processing}
                  className="bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs h-10 px-5 rounded-xl shadow-md cursor-pointer gap-1.5"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-3.5 h-3.5 text-amber-300" />
                      <span>Spend {price} Tokens</span>
                    </>
                  )}
                </Button>
              ) : (
                <Link
                  href="/dashboard"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Coins className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>Top Up Wallet</span>
                </Link>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
