"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, BookOpen, Clock, Loader2 } from "lucide-react";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("ref");

  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      return;
    }

    let pollCount = 0;
    const maxPolls = 10;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/checkout/status?reference=${encodeURIComponent(reference || "")}`);
        if (res.ok) {
          const data = await res.json();
          setPaymentInfo(data);
          if (data.status === "SUCCEEDED" || pollCount >= maxPolls) {
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Error polling payment status:", err);
      }

      pollCount++;
      if (pollCount < maxPolls) {
        setTimeout(checkStatus, 1500);
      } else {
        setLoading(false);
      }
    }

    checkStatus();
  }, [reference]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/40 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-blue-100 p-8 sm:p-10 text-center relative overflow-hidden">
        {/* Top Celebration Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-blue-50/60">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold text-blue-600 tracking-wider uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
          Payment Confirmed
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-4 tracking-tight">
          Thank You for Your Order!
        </h1>

        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Your payment has been securely cleared via Payments.lk. All learning hours and academic privileges are now unlocked in your account.
        </p>

        {loading ? (
          <div className="my-6 p-4 bg-slate-50 rounded-2xl flex items-center justify-center gap-3 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Confirming wallet credit with gateway...</span>
          </div>
        ) : paymentInfo ? (
          <div className="my-6 p-5 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span className="font-medium">Item</span>
              <span className="font-bold text-slate-900">{paymentInfo.itemTitle}</span>
            </div>
            {paymentInfo.tokens ? (
              <div className="flex justify-between text-slate-600">
                <span className="font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Hours Credited
                </span>
                <span className="font-bold text-blue-700 font-mono">
                  +{paymentInfo.tokens} Tokens
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-slate-600">
              <span className="font-medium">Amount Paid</span>
              <span className="font-bold text-slate-900">
                {paymentInfo.currency === "USD"
                  ? `$${(paymentInfo.amountCents / 100).toFixed(2)} USD`
                  : `Rs. ${(paymentInfo.amountCents / 100).toLocaleString("en-LK")}`}
              </span>
            </div>
            <div className="flex justify-between text-slate-400 font-mono text-[11px] pt-1 border-t border-slate-200">
              <span>Reference</span>
              <span>{paymentInfo.reference}</span>
            </div>
          </div>
        ) : null}

        <div className="space-y-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition"
          >
            <span>Open Student Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/classes"
            className="w-full py-3 px-6 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <BookOpen className="w-4 h-4" />
            <span>Browse Individual Classes</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading confirmation...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
