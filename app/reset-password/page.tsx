"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { GraduationCap, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setTokenError("No reset token found. Please request a new password reset link.");
      return;
    }
    fetch(`/api/auth/reset-password?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        setTokenValid(data.valid);
        if (!data.valid) setTokenError(data.error || "Invalid or expired link.");
      })
      .catch(() => {
        setTokenValid(false);
        setTokenError("Unable to validate link. Please try again.");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-emerald-500"];

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Set New Password</h1>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">Choose a strong password for your EduPulse account.</p>
      </div>

      {tokenValid === null && (
        <div className="flex items-center justify-center gap-2 py-6 text-slate-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Validating your reset link...</span>
        </div>
      )}

      {tokenValid === false && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <div className="text-sm font-bold text-red-800">Link Invalid or Expired</div>
          <p className="text-xs text-red-600">{tokenError}</p>
          <Link href="/forgot-password" className="inline-block text-xs font-bold text-blue-700 hover:underline mt-1">
            Request a new reset link →
          </Link>
        </div>
      )}

      {tokenValid === true && !success && (
        <>
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 h-11 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-600"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strengthColor[strength]}`}
                      style={{ width: `${(strength / 3) * 100}%` }} />
                  </div>
                  <span className={`text-[10px] font-bold ${strength === 1 ? "text-red-500" : strength === 2 ? "text-amber-500" : "text-emerald-600"}`}>
                    {strengthLabel[strength]}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-9 h-11 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-600 ${confirmPassword && confirmPassword !== password ? "border-red-300 focus-visible:ring-red-400" : ""}`}
                />
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[11px] text-red-500 font-medium">Passwords do not match</p>
              )}
            </div>

            <Button type="submit" disabled={loading}
              className="w-full h-11 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Saving...</span></>
              ) : (
                <><span>Save New Password</span><ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>
        </>
      )}

      {success && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <div className="text-sm font-bold text-emerald-900">Password Updated!</div>
          <p className="text-xs text-emerald-700">Your password has been reset successfully. Redirecting you to sign in...</p>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-8 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight leading-none text-slate-900">EduPulse</span>
              <span className="text-[9px] font-bold tracking-wider text-blue-600 uppercase">London A/L &amp; O/L Academy</span>
            </div>
          </Link>
          <Link href="/login" className="text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors">Back to Sign In</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        EduPulse London A/L &amp; O/L Academy • Authorized Assessment Center #UK-92810
      </footer>
    </div>
  );
}
