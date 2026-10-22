"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Clock,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Printer,
  Sparkles,
} from "lucide-react";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("ref");

  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);

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

  const handleCopyRef = () => {
    const textToCopy = paymentInfo?.reference || reference || "";
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedAmount = paymentInfo
    ? paymentInfo.currency === "USD"
      ? `$${(paymentInfo.amountCents / 100).toFixed(2)} USD`
      : `Rs. ${(paymentInfo.amountCents / 100).toLocaleString("en-LK")} LKR`
    : "";

  const formattedDate = paymentInfo?.createdAt
    ? new Date(paymentInfo.createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });

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
          <span>PulseEDU Global • Official Tuition Receipt</span>
        </span>
      </div>

      {/* Main Receipt Card */}
      <div
        className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-8 text-center relative overflow-hidden"
        style={{
          maxWidth: "520px",
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
        {/* Top Decorative Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"
          style={{
            position: "absolute",
            top: "-96px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "288px",
            height: "288px",
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            borderRadius: "9999px",
            filter: "blur(48px)",
            pointerEvents: "none",
          }}
        />

        {/* Success Icon Seal */}
        <div
          className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/70 shadow-sm"
          style={{
            width: "64px",
            height: "64px",
            backgroundColor: "#ecfdf5",
            color: "#059669",
            borderRadius: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px auto",
            boxShadow: "0 0 0 8px rgba(236, 253, 245, 0.8)",
          }}
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-600" style={{ width: 34, height: 34, color: "#059669" }} />
        </div>

        {/* Status Pill */}
        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 700,
            color: "#047857",
            backgroundColor: "#ecfdf5",
            padding: "4px 12px",
            borderRadius: "9999px",
            border: "1px solid #a7f3d0",
          }}
        >
          <span
            className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
            style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10b981" }}
          />
          Payment Confirmed &amp; Credited
        </span>

        {/* Headline */}
        <h1
          className="text-2xl sm:text-3xl font-black text-slate-900 mt-3.5 tracking-tight"
          style={{
            fontSize: "26px",
            fontWeight: 900,
            color: "#0f172a",
            marginTop: "14px",
            letterSpacing: "-0.025em",
            lineHeight: 1.25,
          }}
        >
          Thank You for Your Order!
        </h1>

        {/* Description */}
        <p
          className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed"
          style={{
            fontSize: "13px",
            color: "#475569",
            marginTop: "8px",
            lineHeight: 1.6,
          }}
        >
          Your payment has been securely cleared via <strong>Payments.lk</strong>. All purchased learning hours and academic privileges have been immediately unlocked in your student account.
        </p>

        {/* Transaction Receipt Box */}
        {loading ? (
          <div
            className="my-6 p-5 bg-slate-50 rounded-2xl flex items-center justify-center gap-3 text-xs text-slate-500 border border-slate-100"
            style={{
              margin: "24px 0",
              padding: "20px",
              backgroundColor: "#f8fafc",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              fontSize: "12px",
              color: "#64748b",
              border: "1px solid #f1f5f9",
            }}
          >
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" style={{ width: 18, height: 18, color: "#2563eb" }} />
            <span>Confirming wallet balance and learning hours...</span>
          </div>
        ) : (
          <div
            className="my-6 p-4 sm:p-5 bg-slate-50/90 rounded-2xl border border-slate-200/80 text-left space-y-3 text-xs"
            style={{
              margin: "22px 0",
              padding: "18px 20px",
              backgroundColor: "#f8fafc",
              borderRadius: "18px",
              border: "1px solid #e2e8f0",
              textAlign: "left",
              fontSize: "12px",
            }}
          >
            {/* Row 1: Item Package */}
            <div
              className="flex justify-between items-center text-slate-600 pb-2.5 border-b border-slate-200/60"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "10px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span className="font-semibold text-slate-500" style={{ fontWeight: 600, color: "#64748b" }}>
                Package / Item
              </span>
              <span className="font-extrabold text-slate-900" style={{ fontWeight: 800, color: "#0f172a" }}>
                {paymentInfo?.itemTitle || "Learning Hours Pack"}
              </span>
            </div>

            {/* Row 2: Tokens / Hours Credited */}
            {paymentInfo?.tokens ? (
              <div
                className="flex justify-between items-center text-slate-600 pb-2.5 border-b border-slate-200/60"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "10px",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <span className="font-semibold text-slate-500 flex items-center gap-1.5" style={{ fontWeight: 600, color: "#64748b", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Clock className="w-3.5 h-3.5 text-emerald-600" style={{ width: 14, height: 14, color: "#059669" }} />
                  <span>Hours Credited</span>
                </span>
                <span
                  className="font-extrabold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-mono text-xs"
                  style={{
                    fontWeight: 800,
                    color: "#047857",
                    backgroundColor: "rgba(209, 250, 229, 0.7)",
                    border: "1px solid #a7f3d0",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                >
                  +{paymentInfo.tokens} Tokens ({paymentInfo.tokens} Hour{paymentInfo.tokens > 1 ? "s" : ""})
                </span>
              </div>
            ) : null}

            {/* Row 3: Amount Paid */}
            <div
              className="flex justify-between items-center text-slate-600 pb-2.5 border-b border-slate-200/60"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "10px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span className="font-semibold text-slate-500" style={{ fontWeight: 600, color: "#64748b" }}>
                Amount Paid
              </span>
              <span className="font-black text-slate-900 text-sm" style={{ fontWeight: 900, color: "#0f172a", fontSize: "14px" }}>
                {formattedAmount || "Paid"}
              </span>
            </div>

            {/* Row 4: Transaction Reference with Copy Button */}
            <div
              className="flex justify-between items-center text-slate-600 pb-2.5 border-b border-slate-200/60"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "10px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span className="font-semibold text-slate-500" style={{ fontWeight: 600, color: "#64748b" }}>
                Reference ID
              </span>
              <div
                className="flex items-center gap-1.5"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <span
                  className="font-mono text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200"
                  style={{
                    fontFamily: "monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#334155",
                    backgroundColor: "#ffffff",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {paymentInfo?.reference || reference || "N/A"}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Copy reference code"
                  style={{
                    padding: "4px",
                    borderRadius: "4px",
                    color: copied ? "#059669" : "#64748b",
                    backgroundColor: copied ? "#ecfdf5" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" style={{ width: 14, height: 14 }} />
                  ) : (
                    <Copy className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                  )}
                </button>
              </div>
            </div>

            {/* Row 5: Gateway Clearance */}
            <div
              className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "11px",
                color: "#64748b",
                paddingTop: "4px",
              }}
            >
              <span className="flex items-center gap-1" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" style={{ width: 14, height: 14, color: "#2563eb" }} />
                <span>Cleared via Payments.lk</span>
              </span>
              <span>{formattedDate}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          className="space-y-2.5 pt-1"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            paddingTop: "6px",
          }}
        >
          {/* Primary CTA */}
          <Link
            href="/dashboard"
            className="w-full py-3.5 px-6 rounded-2xl bg-[#0c2461] hover:bg-[#103080] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
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
            <span>Open Student Dashboard</span>
            <ArrowRight className="w-4 h-4 text-white" style={{ width: 16, height: 16, color: "#ffffff" }} />
          </Link>

          {/* Secondary CTA */}
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
            <span>Browse Individual Classes &amp; Timetable</span>
          </Link>

          {/* Print Receipt Link */}
          <button
            type="button"
            onClick={() => window.print()}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 inline-flex items-center justify-center gap-1.5 pt-1 cursor-pointer transition-colors"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#94a3b8",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              paddingTop: "6px",
            }}
          >
            <Printer className="w-3 h-3" style={{ width: 12, height: 12 }} />
            <span>Print or Save Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center bg-slate-50"
          style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}
        >
          <div style={{ textAlign: "center", color: "#64748b", fontFamily: "sans-serif" }}>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" style={{ width: 32, height: 32, margin: "0 auto 12px auto", color: "#2563eb" }} />
            <p style={{ fontSize: "14px", fontWeight: 600 }}>Loading transaction confirmation...</p>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
