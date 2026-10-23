"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Video,
  ShieldCheck,
  Award,
  Users,
  GraduationCap,
  Clock,
} from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollEffects";

export function AboutSection() {
  const highlights = [
    {
      title: "Interactive BigBlueButton Classrooms",
      desc: "Multi-user interactive whiteboard, real-time screen sharing, and high-definition video built specifically for 1-on-1 education.",
    },
    {
      title: "Automated Cloud Class Recordings",
      desc: "Every live session is automatically processed and synced to the student dashboard for unlimited revision before exams.",
    },
    {
      title: "Escrow-Protected Token Wallet",
      desc: "Your learning tokens stay frozen in escrow until your tutor accepts your class schedule. Full instant refund if declined.",
    },
    {
      title: "Free 30-Minute 1-on-1 Trial Consultation",
      desc: "Connect directly with your chosen Cambridge or Edexcel specialist before committing to recurring classes.",
    },
  ];

  return (
    <section id="about" className="py-20 lg:py-28 bg-[#f8f8f8] relative overflow-hidden border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: 4 Clean Platform Pillars (Zero Gimmicks) */}
          <div className="lg:col-span-6">
            <ScrollReveal animation="fade-right" duration={700}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    <Video className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black font-heading text-[#0c2461] mb-1.5">
                    1-on-1 Virtual Classrooms
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Interactive BigBlueButton sessions with high-definition digital whiteboards, audio, and live screen sharing.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black font-heading text-[#0c2461] mb-1.5">
                    100% Escrow Protection
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Your tokens are held securely in escrow and only released to the tutor after the lesson is satisfactorily completed.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black font-heading text-[#0c2461] mb-1.5">
                    Cambridge &amp; Edexcel Verified
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Every tutor is vetted for mastery in Pearson Edexcel (IAL/IGCSE) and Cambridge International specifications.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black font-heading text-[#0c2461] mb-1.5">
                    Automated Recordings
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Re-watch any lesson at any time. All recordings and whiteboard notes are automatically saved to your dashboard.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column: Platform Value Content */}
          <div className="lg:col-span-6 flex flex-col items-start">
            <ScrollReveal animation="fade-left" duration={800} className="w-full">
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black font-heading text-[#0c2461] tracking-tight leading-[1.15] mb-6">
                Transforming knowledge into career opportunities through{" "}
                <span className="text-blue-600">EduPulse</span>.
              </h2>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8">
                We empower students taking Cambridge and Pearson Edexcel exams with an elite network of vetted tutors. With integrated BigBlueButton virtual classrooms, instant automated recordings, and transparent token escrow, students gain the exact personalized coaching required to secure top grades.
              </p>

              {/* 4 Feature Points with Cascading Reveal */}
              <div className="space-y-4 mb-8 w-full">
                {highlights.map((item, idx) => (
                  <ScrollReveal key={idx} animation="fade-up" delay={idx * 70}>
                    <div className="flex items-start gap-3.5">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#0c2461]">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              {/* Bottom Actions & Stats */}
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-200/80 w-full">
                <Link
                  href="/register"
                  className="px-7 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-3 transition-all hover:scale-105 group"
                >
                  <span>Learn more about us</span>
                  <span className="w-6 h-6 rounded-full bg-white text-blue-600 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>

                <div className="flex items-center gap-6 text-xs font-bold text-[#0c2461]">
                  <div className="border-l-2 border-blue-600 pl-3">
                    <div className="text-lg font-black font-heading text-[#0c2461]">99.2%</div>
                    <div className="text-slate-500 font-normal">Exam Pass Rate</div>
                  </div>
                  <div className="border-l-2 border-sky-500 pl-3">
                    <div className="text-lg font-black font-heading text-[#0c2461]">1-on-1</div>
                    <div className="text-slate-500 font-normal">Live Mentorship</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

        </div>
      </div>
    </section>
  );
}
