"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GraduationCap,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Loader2,
} from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setUnverifiedEmail(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Invalid email or password. Please check your credentials.");
        if (data.requiresVerification) {
          setUnverifiedEmail(data.email || email.trim().toLowerCase());
        }
        setLoading(false);
        return;
      }

      // Safe redirect check
      const safeRedirect =
        redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
          ? redirectParam
          : data.redirectTo || "/dashboard";

      router.push(safeRedirect);
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("Unable to connect to the authentication server.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-8 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/logo-wide.png"
              alt="EduPulse Global"
              className="h-11 sm:h-13 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          <Link
            href={`/register${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`}
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
          >
            New Student? Register here
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Academic Member Sign In
              </h1>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Enter your email address and password to access your dashboard.
              </p>
            </div>

            {errorMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs space-y-2 animate-in fade-in ${
                  unverifiedEmail
                    ? "bg-blue-50 border border-blue-200 text-blue-900"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      unverifiedEmail ? "text-blue-600" : "text-red-600"
                    }`}
                  />
                  <div className="space-y-2 flex-1">
                    <span className="font-medium leading-relaxed block">{errorMsg}</span>
                    {unverifiedEmail && (
                      <div>
                        <Link
                          href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c2461] hover:bg-blue-900 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Verify Email / Resend Link</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-11 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 h-11 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600">Remember my session</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs shadow-md shadow-blue-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                Select Account to Log In:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("student@edupulse.uk");
                    setPassword("StudentPass123!");
                  }}
                  className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("tutor@edupulse.uk");
                    setPassword("TutorPass123!");
                  }}
                  className="p-2 rounded-xl bg-blue-100 hover:bg-blue-200 border border-blue-200 text-blue-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Tutor</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@edupulse.uk");
                    setPassword("AdminPass123!");
                  }}
                  className="p-2 rounded-xl bg-[#0c2461]/10 hover:bg-[#0c2461]/15 border border-blue-300 text-[#0c2461] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0c2461] shrink-0" />
                  <span>Admin</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        PulseEDU Global
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
