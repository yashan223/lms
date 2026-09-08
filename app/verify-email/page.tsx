"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertCircle,
  Mail,
  Loader2,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const initialEmail = searchParams.get("email") || "";
  const isJustSent = searchParams.get("sent") === "true";

  const [emailInput, setEmailInput] = useState(initialEmail);
  const [verifying, setVerifying] = useState(Boolean(token));
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccessMsg, setResendSuccessMsg] = useState<string | null>(
    isJustSent ? "Verification link has been sent to your email address." : null
  );
  const [countdown, setCountdown] = useState<number>(0);
  const [autoRedirectSecs, setAutoRedirectSecs] = useState<number | null>(null);

  // Handle Token Verification
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      return;
    }

    let isMounted = true;
    setVerifying(true);
    setErrorMessage(null);

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!isMounted) return;

        if (res.ok && (data.success || data.alreadyVerified)) {
          setVerificationSuccess(true);
          setAutoRedirectSecs(3);
        } else {
          setErrorMessage(data.error || "Failed to verify email address. The link may be expired.");
          if (data.email) {
            setEmailInput(data.email);
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Token verification error:", err);
        setErrorMessage("Network connection error. Please try again.");
      })
      .finally(() => {
        setVerifying(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Auto redirect countdown on success
  useEffect(() => {
    if (autoRedirectSecs === null) return;

    if (autoRedirectSecs <= 0) {
      router.push("/dashboard");
      return;
    }

    const timer = setTimeout(() => {
      setAutoRedirectSecs((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoRedirectSecs, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput || countdown > 0 || resending) return;

    setResending(true);
    setErrorMessage(null);
    setResendSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Unable to dispatch verification link.");
      } else {
        setResendSuccessMsg(data.message || `A fresh link has been dispatched to ${emailInput}.`);
        setCountdown(60); // 60s cooldown
      }
    } catch (err) {
      console.error("Resend error:", err);
      setErrorMessage("Network error sending verification email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-8 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/logo-wide.png"
              alt="EduPulse London A/L & O/L Academy"
              className="h-11 sm:h-13 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          <Link
            href="/login"
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
          >
            Sign In to Portal
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="p-6 sm:p-10 space-y-6">
            {/* 1. Verifying Token State */}
            {verifying && (
              <div className="text-center py-8 space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-xl font-bold text-slate-900">
                    Verifying Academic Email
                  </h1>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Authenticating your verification token with EduPulse security services...
                  </p>
                </div>
              </div>
            )}

            {/* 2. Verification Success State */}
            {!verifying && verificationSuccess && (
              <div className="text-center py-6 space-y-5 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm animate-bounce">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Email Verified</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Academic Account Activated!
                  </h1>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                    Your London A/L &amp; O/L student account has been verified. You now have full access to faculty live streams and materials.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full bg-[#0c2461] hover:bg-blue-900 text-white font-bold h-11 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Student Dashboard</span>
                    {autoRedirectSecs !== null && autoRedirectSecs > 0 ? (
                      <span className="text-[11px] opacity-80">({autoRedirectSecs}s)</span>
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* 3. Waiting for Email / Resend State */}
            {!verifying && !verificationSuccess && (
              <div className="space-y-6">
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                    <Mail className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Check Your Inbox
                    </h1>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      We sent a verification link to your academic email address. Click the link in the email to activate your account.
                    </p>
                  </div>

                  {emailInput && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      <span>{emailInput}</span>
                    </div>
                  )}
                </div>

                {/* Status Messages */}
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-snug">{errorMessage}</span>
                  </div>
                )}

                {resendSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span className="leading-snug">{resendSuccessMsg}</span>
                  </div>
                )}

                {/* Resend Action Form */}
                <form onSubmit={handleResend} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Didn&apos;t receive the email?
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Enter your email to resend"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={resending || countdown > 0 || !emailInput}
                    className="w-full bg-[#0c2461] hover:bg-blue-900 text-white font-bold h-11 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Link via Resend...</span>
                      </>
                    ) : countdown > 0 ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-300" />
                        <span>Resend available in {countdown}s</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Resend Verification Email</span>
                      </>
                    )}
                  </Button>
                </form>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed space-y-1">
                  <p className="font-semibold text-slate-700">💡 Helpful Tips:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Check your junk/spam or promotions folder.</li>
                    <li>Verification links remain valid for 24 hours.</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="pt-2 text-center border-t border-slate-100">
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                &larr; Return to Sign In
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400">
        &copy; 2026 EduPulse Academy London A/L &amp; O/L LMS. All rights reserved.
      </footer>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
