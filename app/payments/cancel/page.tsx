"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 text-center">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-8 ring-amber-50/60">
          <XCircle className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold text-amber-600 tracking-wider uppercase bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
          Payment Incomplete
        </span>

        <h1 className="text-2xl font-black text-slate-900 mt-4">
          Checkout Was Cancelled
        </h1>

        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          No charge was made to your card or account. You can return to your dashboard or re-attempt checkout whenever you are ready.
        </p>

        {reference && (
          <div className="my-5 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-500 border border-slate-100">
            Session Ref: {reference}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again from Dashboard</span>
          </Link>

          <Link
            href="/"
            className="w-full py-3 px-6 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PaymentCancelContent />
    </Suspense>
  );
}
