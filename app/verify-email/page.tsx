"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  ArrowRight,
  Mail,
  AlertCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  Send,
  Edit2,
  Check,
} from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tokenParam = searchParams.get("token");
  const emailParam = searchParams.get("email") || "";
  const redirectParam = searchParams.get("redirect");

  const [token] = useState<string | null>(tokenParam);
  const [email, setEmail] = useState<string>(emailParam);
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
  const [editedEmail, setEditedEmail] = useState<string>(emailParam);

  // Verification states (when token is present)
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "verifying" | "success" | "expired" | "error"
  >(tokenParam ? "verifying" : "idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [redirectCountdown, setRedirectCountdown] = useState<number>(3);
  const [redirectPath, setRedirectPath] = useState(
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/dashboard"
  );

  // Resend states
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Token auto-verification effect
  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    async function verifyToken() {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.success) {
          setVerificationStatus("success");
          setStatusMessage(data.message || "Your academic email has been verified successfully!");
          const defaultTarget = data.redirectTo || (data.user?.role === "TUTOR" ? "/tutor" : "/dashboard");
          const safeTarget =
            redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
              ? redirectParam
              : defaultTarget;
          setRedirectPath(safeTarget);
        } else if (data.expired) {
          setVerificationStatus("expired");
          setStatusMessage(
            data.error || "This verification link has expired. Please request a new verification email."
          );
          if (data.email) {
            setEmail(data.email);
            setEditedEmail(data.email);
          }
        } else {
          setVerificationStatus("error");
          setStatusMessage(
            data.error || "Invalid or already used verification link. Please check your account or log in."
          );
        }
      } catch (err) {
        if (!isMounted) return;
        setVerificationStatus("error");
        setStatusMessage("Failed to reach verification server. Please check your internet connection.");
      }
    }

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Auto-redirect to dashboard when verification is successful
  useEffect(() => {
    if (verificationStatus !== "success") return;

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(redirectPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [verificationStatus, redirectPath, router]);

  // Handle resending verification email
  const handleResend = async () => {
    const targetEmail = (isEditingEmail ? editedEmail : email).trim().toLowerCase();
    if (!targetEmail) {
      setResendError("Please enter a valid student email address.");
      return;
    }

    setResendLoading(true);
    setResendSuccess(null);
    setResendError(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResendError(data.error || "Failed to dispatch verification email.");
      } else {
        if (data.alreadyVerified) {
          setResendSuccess("Your email is already verified! You can log in directly.");
          setTimeout(() => router.push("/login"), 1500);
        } else {
          setEmail(targetEmail);
          setIsEditingEmail(false);
          setResendSuccess(data.message || `A fresh verification link was dispatched to ${targetEmail}`);
          setCooldown(60); // 60-second cooldown
        }
      }
    } catch (err) {
      console.error("Resend error:", err);
      setResendError("Network error while attempting to resend verification email.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSaveEditedEmail = () => {
    if (editedEmail.trim()) {
      setEmail(editedEmail.trim());
      setIsEditingEmail(false);
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
              alt="PulseEDU Global"
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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* SCENARIO 1: Verifying Token */}
          {verificationStatus === "verifying" && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-sm animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Verifying Your Academic Account...
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  Please wait while we validate your academic credentials and configure your LMS access.
                </p>
              </div>
            </div>
          )}

          {/* SCENARIO 2: Verification Successful */}
          {verificationStatus === "success" && (
            <div className="text-center space-y-6 py-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Account Verified</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Email Verified Successfully!
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                  {statusMessage}
                </p>
                <p className="text-xs text-slate-400">
                  Redirecting to your student dashboard in{" "}
                  <span className="font-bold text-slate-700">{redirectCountdown}s</span>...
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#0c2461] hover:bg-blue-900 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>Go to Dashboard Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* SCENARIO 3: Expired Token */}
          {verificationStatus === "expired" && (
            <div className="text-center space-y-6 py-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                <Clock className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Verification Link Expired
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                  Verification links are valid for 24 hours for academic security. You can request a fresh verification link below.
                </p>
              </div>

              {resendSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{resendSuccess}</span>
                </div>
              )}

              {resendError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resendError}</span>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-left">
                <label className="text-xs font-bold text-slate-700 block">
                  Registered Email Address
                </label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="h-10 text-xs rounded-xl bg-white"
                  />
                  <Button
                    onClick={handleResend}
                    disabled={resendLoading || cooldown > 0 || !email}
                    className="h-10 px-4 rounded-xl bg-[#0c2461] hover:bg-blue-900 text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    {resendLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : cooldown > 0 ? (
                      `Wait ${cooldown}s`
                    ) : (
                      "Send New Link"
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-2 text-center border-t border-slate-100">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  &larr; Return to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* SCENARIO 4: General Token Error / Invalid */}
          {verificationStatus === "error" && (
            <div className="text-center space-y-6 py-2">
              <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-sm">
                <AlertCircle className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Verification Link Invalid
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                  {statusMessage || "This link is either broken, expired, or has already been used."}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={() => setVerificationStatus("idle")}
                  variant="outline"
                  className="w-full sm:w-auto h-11 px-6 rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  <span>Request Resend</span>
                </Button>
                <Button
                  onClick={() => router.push("/login")}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#0c2461] hover:bg-blue-900 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* SCENARIO 5: Landing View (No token or requesting resend) */}
          {verificationStatus === "idle" && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mx-auto shadow-sm">
                  <Mail className="w-8 h-8" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Verify Your Academic Email
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  We have dispatched a verification link to activate your student account:
                </p>
              </div>

              {/* Email display / edit box */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
                  {isEditingEmail ? (
                    <Input
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      className="h-9 text-xs bg-white border-blue-200 rounded-lg flex-1"
                      placeholder="Enter correct email"
                      autoFocus
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {email || "your registered email"}
                    </span>
                  )}
                </div>

                {isEditingEmail ? (
                  <button
                    type="button"
                    onClick={handleSaveEditedEmail}
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs transition-colors shrink-0"
                    title="Save email"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedEmail(email);
                      setIsEditingEmail(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-blue-100/70 text-blue-700 text-xs transition-colors shrink-0"
                    title="Edit email"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Instructions steps */}
              <div className="space-y-3 bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-600">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Next Steps:
                </div>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Check your inbox (and spam or junk folder) for an email from{" "}
                      <strong className="text-slate-800">EduPulse Academy</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Click the <strong className="text-slate-800">&quot;Verify My Email Address&quot;</strong> button inside the message.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      You will be automatically logged into your student dashboard.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Alert Feedback */}
              {resendSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{resendSuccess}</span>
                </div>
              )}

              {resendError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resendError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-1 space-y-3">
                <Button
                  onClick={handleResend}
                  disabled={resendLoading || cooldown > 0 || (!email && !editedEmail)}
                  className="w-full h-11 rounded-xl bg-[#0c2461] hover:bg-blue-900 text-white font-bold text-xs shadow-md shadow-blue-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {resendLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Dispatching Email...</span>
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>Resend available in {cooldown}s</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Resend Verification Email</span>
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between pt-2">
                  <Link
                    href="/login"
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                  >
                    Already verified? Sign In &rarr;
                  </Link>
                  <Link
                    href="/"
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Return to Home
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} EduPulse Academy London A/L &amp; O/L LMS. All rights reserved.
      </footer>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading verification portal...</span>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
