"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Award,
  Globe,
  BookOpen,
  CheckCircle2,
  Users,
  ShieldCheck,
  ArrowRight,
  School,
} from "lucide-react";

export function AboutSection() {
  const pillars = [
    {
      icon: Award,
      title: "Accredited UK Curriculum",
      description: "100% specification alignment for London A/L (IAL AS & A2) and London O/L (IGCSE) Pearson Edexcel and Cambridge syllabi.",
      badge: "UK Standards",
      badgeColor: "bg-blue-100 text-blue-800",
    },
    {
      icon: Users,
      title: "Senior Lead Lecturers",
      description: "Learn directly from active UK university and college faculty who structure course content, author study materials, and guide scholars.",
      badge: "Expert Faculty",
      badgeColor: "bg-purple-100 text-purple-800",
    },
    {
      icon: School,
      title: "Blended Practical Labs",
      description: "Full laboratory video walkthroughs with error analysis, experimental methods, and graph plotting masterclasses.",
      badge: "Practical Mastery",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
  ];

  const highlights = [
    "Comprehensive 10-Year past topic proofs and step-by-step video solutions",
    "Downloadable lecture handbooks, unit formula sheets, and practical notes",
    "24/7 AI-powered academic question and formula assistance",
    "Structured syllabus progress tracking and lecture schedule alerts",
    "Recognized academic standards partnered with global learning institutions",
  ];

  return (
    <section id="about" className="py-20 bg-slate-50 border-b border-slate-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Academy Narrative & Features */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 text-blue-800 text-xs font-bold border border-blue-200">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>About EduPulse Academy</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-[#0c2461] tracking-tight leading-[1.15]">
              World-Class London A/L & O/L Academic Excellence
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              EduPulse is a premier international learning platform dedicated to London A/L and London O/L scholars. We bridge digital interactive lectures, comprehensive topic walkthroughs, and certified lecturer evaluations to ensure students achieve academic mastery.
            </p>

            {/* Checklist items */}
            <div className="space-y-2.5 pt-2">
              {highlights.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* CTA row */}
            <div className="pt-4 flex flex-wrap items-center gap-3">
              <Link
                href="#courses"
                className="px-6 py-3 rounded-xl bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold shadow-md shadow-blue-950/20 flex items-center gap-2 transition-all"
              >
                <BookOpen className="w-4 h-4" />
                <span>Browse Accredited Courses</span>
              </Link>

              <Link
                href="/register"
                className="px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 transition-all flex items-center gap-1.5"
              >
                <span>Register as Student</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Photo & Academic Stats Cards */}
          <div className="lg:col-span-5 space-y-4">
            {/* Campus Visual Card */}
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-900 aspect-[4/3]">
              <img
                src="/images/campus_library_study.jpg"
                alt="Academy Library Study"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                  International Academic Accreditation
                </div>
                <div className="text-sm sm:text-base font-extrabold leading-snug">
                  Academy #UK-92810 • 140+ Partner Learning Institutions
                </div>
              </div>
            </div>

            {/* 3 Pillar Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {pillars.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-2">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 leading-snug">
                      {p.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
