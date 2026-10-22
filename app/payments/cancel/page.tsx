"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle, ArrowLeft, RefreshCw, Sparkles, BookOpen } from "lucide-react";

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6"
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        backgroundImage: "radial-gradient(at 50% 0%, rgba(12, 36, 97, 0.05) 0px, transparent 60%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Brand Header */}
      <div
        className="mb-5 flex items-center justify-center gap-2"
        style={{
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <span
          className="text-xs font-black uppercase tracking-wider text-[#0c2461] bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs flex items-center gap-1.5"
          style={{
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#0c2461",
            backgroundColor: "#ffffff",
            padding: "6px 14px",
            borderRadius: "9999px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" style={{ width: 14, height: 14, color: "#2563eb" }} />
          <span>PulseEDU Global • Checkout Session</span>
        </span>
      </div>

      <div
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-8 text-center relative overflow-hidden"
        style={{
          maxWidth: "480px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          boxShadow: "0 20px 25px -5px rgba(12, 36, 97, 0.08), 0 8px 10px -6px rgba(12, 36, 97, 0.04)",
          border: "1px solid #e2e8f0",
          padding: "32px 28px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-8 ring-amber-50/70 shadow-sm"
          style={{
            width: "64px",
            height: "64px",
            backgroundColor: "#fffbeb",
            color: "#d97706",
            borderRadius: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px auto",
            boxShadow: "0 0 0 8px rgba(254, 243, 199, 0.7)",
          }}
        >
          <XCircle className="w-8 h-8 text-amber-600" style={{ width: 34, height: 34, color: "#d97706" }} />
        </div>

        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 700,
            color: "#92400e",
            backgroundColor: "#fffbeb",
            padding: "4px 12px",
            borderRadius: "9999px",
            border: "1px solid #fde68a",
          }}
        >
          Checkout Incomplete
        </span>

        <h1
          className="text-2xl font-black text-slate-900 mt-3.5 tracking-tight"
          style={{
            fontSize: "24px",
            fontWeight: 900,
            color: "#0f172a",
            marginTop: "14px",
            letterSpacing: "-0.025em",
          }}
        >
          Checkout Was Cancelled
        </h1>

        <p
          className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed"
          style={{
            fontSize: "13px",
            color: "#475569",
            marginTop: "8px",
            lineHeight: 1.6,
          }}
        >
          No payment was charged to your card or account. You can return to your student dashboard or retry your purchase anytime.
        </p>

        {reference && (
          <div
            className="my-5 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-500 border border-slate-200"
            style={{
              margin: "20px 0",
              padding: "10px 14px",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              fontSize: "11px",
              fontFamily: "monospace",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            Session Reference: {reference}
          </div>
        )}

        <div
          className="space-y-2.5 pt-2"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            paddingTop: "8px",
          }}
        >
          <Link
            href="/dashboard"
            className="w-full py-3.5 px-6 rounded-2xl bg-[#0c2461] hover:bg-[#103080] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: "16px",
              backgroundColor: "#0c2461",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "14px",
              textDecoration: "none",
              boxShadow: "0 4px 6px -1px rgba(12, 36, 97, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxSizing: "border-box",
            }}
          >
            <RefreshCw className="w-4 h-4 text-white" style={{ width: 16, height: 16, color: "#ffffff" }} />
            <span>Return to Student Dashboard</span>
          </Link>

          <Link
            href="/classes"
            className="w-full py-3 px-6 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            style={{
              width: "100%",
              padding: "12px 24px",
              borderRadius: "16px",
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontWeight: 700,
              fontSize: "12px",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxSizing: "border-box",
            }}
          >
            <BookOpen className="w-4 h-4 text-slate-600" style={{ width: 16, height: 16, color: "#475569" }} />
            <span>Browse Individual Classes</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center bg-slate-50"
          style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}
        >
          <div style={{ textAlign: "center", color: "#64748b" }}>Loading session...</div>
        </div>
      }
    >
      <PaymentCancelContent />
    </Suspense>
  );
}
