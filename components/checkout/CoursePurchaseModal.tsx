"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  CreditCard,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Zap,
  FileText,
  PlayCircle,
  Award,
  Video,
  Loader2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    category?: string;
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

  const [paymentMethod, setPaymentMethod] = useState<"card" | "instant">("card");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("888");
  const [cardName, setCardName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !course) return null;

  const price = Number(course.price) || 95;

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setProcessing(true);

    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(course.slug)}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          amount: price,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setErrorMessage("Please sign in or register to complete your course purchase.");
        setTimeout(() => {
          router.push(`/login?redirect=${encodeURIComponent(`/courses/${course.slug}`)}`);
        }, 1500);
        return;
      }

      if (res.ok) {
        setPurchaseSuccess(true);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setErrorMessage(data.error || "Payment processing failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Purchase error:", err);
      setErrorMessage("Network error occurred during checkout. Please try again.");
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 my-8">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0c2461] text-white flex items-center justify-center shadow-md shrink-0">
              <CreditCard className="w-5 h-5 text-blue-200" />
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
                Your payment of <strong className="text-slate-900">${price}.00</strong> was successful. All verified study handbooks, formula sheets, video lectures, and live classroom sessions are now unlocked.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left space-y-2 text-xs">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
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
          /* Checkout Form */
          <form onSubmit={handlePurchase} className="space-y-4 text-xs">
            {/* Course Summary Item */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h4 className="font-extrabold text-sm text-slate-900 leading-snug truncate">
                  {course.title}
                </h4>
                {course.instructor && (
                  <div className="flex items-center gap-2">
                    <Avatar className="w-5 h-5 ring-1 ring-slate-200">
                      <AvatarImage src={course.instructor.avatar} />
                      <AvatarFallback>{course.instructor.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] text-slate-600 font-medium">
                      Taught by {course.instructor.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5">
                  <Coins className="w-5 h-5 text-amber-500" />
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

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 block">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === "card"
                      ? "border-blue-600 bg-blue-50/70 text-blue-950 shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Credit / Debit Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("instant")}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === "instant"
                      ? "border-blue-600 bg-blue-50/70 text-blue-950 shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>1-Click Student Grant</span>
                </button>
              </div>
            </div>

            {/* Card Inputs */}
            {paymentMethod === "card" ? (
              <div className="space-y-3 p-4 rounded-2xl bg-white border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Cardholder Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. Alex Morgan"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <Input
                      required
                      placeholder="•••• •••• •••• ••••"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="h-9 text-xs rounded-xl font-mono pr-10"
                    />
                    <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Expiration Date
                    </label>
                    <Input
                      required
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Security Code (CVC)
                    </label>
                    <Input
                      required
                      type="password"
                      maxLength={4}
                      placeholder="CVC"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Instant Academic Access Pass</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Fast-track enrollment using your registered student profile. This immediately attaches the course to your account and generates your study access keys.
                </p>
              </div>
            )}

            {/* Price Breakdown */}
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
              <span>256-Bit SSL Encrypted • 30-Day Academic Guarantee</span>
            </div>

            {/* Submit Action */}
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

              <Button
                type="submit"
                disabled={processing}
                className="bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs h-10 px-6 rounded-xl shadow-md cursor-pointer gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-3.5 h-3.5 text-amber-300" />
                    <span>Confirm Enrollment ({price} Tokens)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
