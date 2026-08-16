"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Calendar,
  AlertCircle,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [qualification, setQualification] = useState("London A/L (IAL)");
  const [academicTerm, setAcademicTerm] = useState("Spring / Summer 2026");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter your password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters in length.");
      return;
    }

    // Open confirmation modal
    setShowConfirmModal(true);
  };

  const handleConfirmedRegister = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          qualification,
          targetSeries: academicTerm,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Student registration failed.");
        setLoading(false);
        return;
      }

      router.push(data.redirectTo || "/dashboard");
    } catch (err) {
      console.error("Register error:", err);
      setErrorMsg("Unable to connect to student registration server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Academic Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 sm:px-10 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-xs group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight leading-none text-slate-900">
                EduPulse
              </span>
              <span className="text-[10px] font-bold tracking-wider text-blue-600 uppercase">
                London A/L & O/L Academy
              </span>
            </div>
          </Link>

          <Link
            href="/login"
            className="px-4 py-2 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-all"
          >
            Existing Member? Log In
          </Link>
        </div>
      </header>

      {/* Main Registration Form - BIGGER & WIDER */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="max-w-3xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 text-white p-8 sm:p-10 text-center relative overflow-hidden">
            <div className="space-y-2.5 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-900/30">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Student Scholar Enrollment
              </h1>
              <p className="text-sm text-blue-100 max-w-lg mx-auto leading-relaxed">
                Join the accredited London A/L & O/L academic platform. Access interactive syllabus modules, unit proofs, and coursework.
              </p>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-8 sm:p-10 md:p-12 space-y-6">
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePreSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Student Full Name <span className="text-blue-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <Input
                      required
                      placeholder="e.g. Tariq Al-Mansoor"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-11 h-12 text-sm border-slate-200 rounded-2xl focus-visible:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Student Email Address <span className="text-blue-600">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <Input
                      type="email"
                      required
                      placeholder="student@edupulse.uk"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 text-sm border-slate-200 rounded-2xl focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Qualification & Academic Term */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Qualification Program <span className="text-blue-600">*</span>
                  </label>
                  <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full h-12 rounded-2xl border border-slate-200 px-4 bg-white text-sm font-semibold text-slate-800 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="London A/L (IAL)">London A/L (IAL AS & A2)</option>
                    <option value="London O/L (IGCSE)">London O/L (IGCSE Foundation)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Academic Term <span className="text-blue-600">*</span>
                  </label>
                  <select
                    value={academicTerm}
                    onChange={(e) => setAcademicTerm(e.target.value)}
                    className="w-full h-12 rounded-2xl border border-slate-200 px-4 bg-white text-sm font-semibold text-slate-800 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Spring / Summer 2026">Spring / Summer 2026</option>
                    <option value="Autumn / Winter 2026">Autumn / Winter 2026</option>
                    <option value="Spring 2027">Spring 2027</option>
                  </select>
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Create Password <span className="text-blue-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <Input
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 h-12 text-sm border-slate-200 rounded-2xl font-mono focus-visible:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Confirm Password <span className="text-blue-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <Input
                      type="password"
                      required
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11 h-12 text-sm border-slate-200 rounded-2xl font-mono focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Academic Highlights Strip */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 grid grid-cols-1 sm:grid-cols-3 gap-2 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Interactive Syllabus</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Coursework & Timeline</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Direct PostgreSQL Sync</span>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-13 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 gap-2.5 cursor-pointer transition-all"
                >
                  {loading ? (
                    <span>Registering Account...</span>
                  ) : (
                    <>
                      <span>Complete Student Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="text-center pt-4 border-t border-slate-100 text-xs text-slate-500">
              Already have an academic account?{" "}
              <Link href="/login" className="font-bold text-blue-600 hover:underline">
                Sign in to your portal
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-xs text-slate-500 border-t border-slate-200/70">
        EduPulse London A/L & O/L Academy • Authorized Academic Center #UK-92810
      </footer>

      {/* CONFIRMATION MODAL BEFORE REGISTRATION */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedRegister}
        title="Confirm Student Registration"
        description={`You are registering as a ${qualification} student scholar for the ${academicTerm} term. Your account will be created and saved directly to the database.`}
        confirmText="Confirm & Enter Student LMS"
        cancelText="Review Details"
        variant="success"
        requireConsentText="I confirm that all student details are accurate and agree to the academic honor code."
      />
    </div>
  );
}
