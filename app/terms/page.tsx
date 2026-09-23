"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import {
  Scale,
  Ban,
  ShieldCheck,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Lock,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState<"terms" | "refund">("terms");

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800">
      <Navbar />

      <main className="flex-1 bg-slate-50/60 pb-16">
        {/* Header Hero */}
        <section className="bg-gradient-to-b from-[#0c2461] to-[#12366b] text-white py-14 px-4 sm:px-6 lg:px-8 shadow-inner">
          <div className="max-w-4xl mx-auto space-y-4 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-blue-200">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Legal & Policies</span>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white backdrop-blur-md text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>Academic Governance & Legal Terms</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Terms & Conditions & No-Refund Policy
              </h1>
              <p className="text-sm sm:text-base text-blue-100/90 max-w-2xl leading-relaxed">
                Clear academic guidelines, honor codes, intellectual property protections, and
                strict non-refundable enrollment policies governing PulseEDU Global.
              </p>
            </div>
          </div>
        </section>

        {/* Content Container */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          {/* Navigation Pill Bar */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-md flex items-center gap-2 mb-8">
            <a
              href="#terms"
              onClick={() => setActiveSection("terms")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                activeSection === "terms"
                  ? "bg-[#0c2461] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Terms & Conditions</span>
            </a>

            <a
              href="#refund-policy"
              onClick={() => setActiveSection("refund")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                activeSection === "refund"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-amber-800 hover:bg-amber-50"
              }`}
            >
              <Ban className="w-4 h-4" />
              <span>Strict No-Refund Policy</span>
            </a>
          </div>

          <div className="space-y-8">
            {/* SECTION 1: TERMS & CONDITIONS */}
            <section
              id="terms"
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Academic Terms & Conditions
                  </h2>
                  <p className="text-xs text-slate-500">
                    Governing student enrollments, faculty interactions, and platform usage
                  </p>
                </div>
              </div>

              <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-mono text-xs flex items-center justify-center font-bold">
                      1
                    </span>
                    Student Registration & Account Integrity
                  </h3>
                  <p className="text-xs sm:text-sm">
                    All students registering on PulseEDU Global must provide verifiable and truthful
                    information, including legal name, authentic contact details (phone/WhatsApp),
                    country of residence, and current qualification target (e.g., London A/L or London
                    O/L). Account credentials may not be shared, rented, or transferred. Multiple accounts
                    by the same individual to bypass trial quotas are strictly prohibited.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-mono text-xs flex items-center justify-center font-bold">
                      2
                    </span>
                    Academic Honor Code & Code of Conduct
                  </h3>
                  <p className="text-xs sm:text-sm">
                    PulseEDU Global fosters a respectful, collaborative academic environment. Any
                    disruptive behavior, harassment, impersonation, or academic dishonesty—including
                    submitting work not one's own or misusing live tutor sessions for unauthorized
                    examination assistance—is subject to immediate review, suspension, and potential
                    revocation of access without compensation.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-mono text-xs flex items-center justify-center font-bold">
                      3
                    </span>
                    Intellectual Property Rights
                  </h3>
                  <p className="text-xs sm:text-sm">
                    All course syllabi, video lectures, live seminar recordings, formula sheets, mock
                    exam papers, and pedagogical materials available on PulseEDU Global are proprietary
                    works protected by international copyright laws. Students are granted a personal,
                    non-exclusive, non-transferable license to view and review materials solely for their
                    individual academic preparation. Unauthorized recording, redistributing, or
                    reselling materials is strictly forbidden and punishable by law.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-mono text-xs flex items-center justify-center font-bold">
                      4
                    </span>
                    Tutoring Sessions & 1-on-1 Class Policy
                  </h3>
                  <p className="text-xs sm:text-sm">
                    Students may request up to 5 free 30-minute trials across distinct tutors (limit 1
                    trial per tutor). Once enrolled in paid individual classes or 1-on-1 sessions,
                    session bookings consume credit from the student's token wallet. Rescheduling must be
                    requested at least 12 hours before the scheduled time. Missed sessions without
                    timely notification forfeit the allocated tokens.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-mono text-xs flex items-center justify-center font-bold">
                      5
                    </span>
                    Token Wallet & Academic Credits
                  </h3>
                  <p className="text-xs sm:text-sm">
                    1 Token represents 1 credit hour of learning. Tokens can be redeemed for 1-on-1
                    private tutoring, individual class enrollments, and live past paper walkthroughs.
                    Tokens are strictly non-transferable between accounts and cannot be exchanged for
                    cash.
                  </p>
                </div>
              </div>
            </section>

            {/* SECTION 2: NO-REFUND POLICY */}
            <section
              id="refund-policy"
              className="bg-white rounded-3xl border border-amber-200 p-6 sm:p-10 shadow-xs space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-amber-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Strict No-Refund Policy
                  </h2>
                  <p className="text-xs text-amber-800 font-semibold">
                    All sales, token purchases, and course enrollments are final and non-refundable
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                    Mandatory Registration & Purchase Agreement
                  </h4>
                  <p className="text-xs leading-relaxed text-amber-900/90">
                    By registering an account, purchasing token packs, or enrolling in any individual
                    class on PulseEDU Global, you expressly acknowledge and agree that <strong>all
                    transactions are 100% final, irrevocable, and non-refundable</strong> under any
                    circumstances.
                  </p>
                </div>
              </div>

              <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-mono text-xs flex items-center justify-center font-bold">
                      1
                    </span>
                    Immediate Digital Delivery & Intellectual Property Access
                  </h3>
                  <p className="text-xs sm:text-sm">
                    Because PulseEDU Global provisions immediate, real-time access to digital course
                    materials, tutor availability calendars, encrypted lesson modules, and intellectual
                    property upon purchase, fees paid cannot be cancelled or reversed once an order or
                    token purchase is completed.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-mono text-xs flex items-center justify-center font-bold">
                      2
                    </span>
                    Complimentary 30-Min Trials Before Purchase
                  </h3>
                  <p className="text-xs sm:text-sm">
                    To eliminate uncertainty, PulseEDU Global offers <strong>up to 5 free 30-minute
                    1-on-1 trial classes</strong> with our accredited faculty tutors before students
                    make any financial commitment. Students are expected to use these free trial
                    opportunities to evaluate teaching style, course compatibility, and platform
                    features prior to purchasing token packages.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-mono text-xs flex items-center justify-center font-bold">
                      3
                    </span>
                    Tutor Cancellation Credit Protection
                  </h3>
                  <p className="text-xs sm:text-sm">
                    In the rare event that an instructor is unable to conduct a scheduled 1-on-1
                    session due to verified technical issues or emergency, the consumed tokens are
                    immediately credited back to the student's digital wallet balance for re-booking.
                    Cash refunds are not issued.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-mono text-xs flex items-center justify-center font-bold">
                      4
                    </span>
                    Chargeback Policy & Fraud Prevention
                  </h3>
                  <p className="text-xs sm:text-sm">
                    Filing an unauthorized chargeback or payment reversal claim with your payment card
                    provider or banking institution is a material breach of these terms. Any student
                    who initiates an unauthorized dispute will face immediate account closure,
                    forfeiture of all remaining token wallet balances, and may be restricted from
                    future academic enrollment.
                  </p>
                </div>
              </div>
            </section>

            {/* Bottom Registration CTA */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-lg font-bold">Ready to Start Learning?</h3>
                <p className="text-xs text-slate-400">
                  Register your student profile today and book your first 30-minute free trial class.
                </p>
              </div>

              <Link
                href="/register"
                className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-2 transition-all shrink-0 shadow-md"
              >
                <span>Proceed to Registration</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
