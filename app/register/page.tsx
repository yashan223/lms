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
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [qualification, setQualification] = useState("London A/L (IAL)");
  const [examBoard, setExamBoard] = useState("Pearson Edexcel");
  const [targetSeries, setTargetSeries] = useState("May/June 2026");

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
          examBoard,
          targetSeries,
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
    <div className="min-h-screen bg-[#f0f4f9] text-slate-800 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Academic Header */}
      <header className="bg-[#0a1e3f] text-white border-b border-white/10 py-3.5 px-4 sm:px-8 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight leading-none text-white">
                EduPulse
              </span>
              <span className="text-[9px] font-bold tracking-wider text-sky-400 uppercase">
                London A/L & O/L Academy
              </span>
            </div>
          </Link>

          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
          >
            Existing Student? Log In
          </Link>
        </div>
      </header>

      {/* Main Registration Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-gradient-to-r from-[#0a1e3f] to-[#12366b] text-white p-6 sm:p-8 text-center relative overflow-hidden">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 text-sky-300 flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-white">
                Student Enrollment & Registration
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto">
                Enroll for London A/L (IAL) or London O/L (IGCSE) Masterclasses
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePreSubmit} className="space-y-4 text-xs">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Student Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    required
                    placeholder="e.g. Tariq Al-Mansoor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-10 text-xs border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Academic Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    required
                    placeholder="student@edupulse.uk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 text-xs border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Qualification & Board */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Qualification Level</label>
                  <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-semibold"
                  >
                    <option value="London A/L (IAL)">London A/L (IAL AS & A2)</option>
                    <option value="London O/L (IGCSE)">London O/L (IGCSE Foundation)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Exam Board</label>
                  <select
                    value={examBoard}
                    onChange={(e) => setExamBoard(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-semibold"
                  >
                    <option value="Pearson Edexcel">Pearson Edexcel</option>
                    <option value="Cambridge (CAIE)">Cambridge (CAIE)</option>
                  </select>
                </div>
              </div>

              {/* Target Exam Series */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Target Examination Series</label>
                <select
                  value={targetSeries}
                  onChange={(e) => setTargetSeries(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-semibold"
                >
                  <option value="May/June 2026">May / June 2026 Examination Series</option>
                  <option value="Oct/Nov 2026">Oct / Nov 2026 Examination Series</option>
                  <option value="Jan 2027">January 2027 Examination Series</option>
                </select>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Create Password</label>
                  <Input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 text-xs border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Confirm Password</label>
                  <Input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 text-xs border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-[#0c2461] hover:bg-[#103080] text-white font-bold text-xs shadow-md gap-2"
                >
                  <span>Review & Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>

            <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
              Already have an academic account?{" "}
              <Link href="/login" className="font-bold text-blue-700 hover:underline">
                Log in here
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-200/60">
        London International Examination Academy • Pearson Edexcel & CAIE Center #UK-92810
      </footer>

      {/* CONFIRMATION MODAL BEFORE REGISTRATION */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedRegister}
        title="Confirm Student Enrollment"
        description={`You are enrolling as a ${qualification} student for the ${targetSeries} academic term. Your account will be created and saved directly to the database.`}
        confirmText="Confirm & Enter LMS"
        cancelText="Review Details"
        variant="success"
        requireConsentText="I confirm that all student details are accurate and agree to the academic honor code."
      />
    </div>
  );
}
