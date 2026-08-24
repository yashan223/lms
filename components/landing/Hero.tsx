"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RolePreviewModal } from "@/components/landing/RolePreviewModal";
import { UserRole } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Atom,
  TrendingUp,
  Calculator,
  FileCheck2,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedDiamond, setSelectedDiamond] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewRole, setPreviewRole] = useState<UserRole>("ADMIN");

  const slides = [
    {
      image: "/images/campus_students_hero.jpg",
      title: "London A/L & O/L Academy",
      subtitle: "Comprehensive curriculum coverage. Unit-by-unit topic masterclasses, downloadable study materials, and past paper video vaults.",
    },
    {
      image: "/images/campus_library_study.jpg",
      title: "Academic Subject Excellence",
      subtitle: "Master Pure Mathematics (P1-P4), Physics Units 1-6, Chemistry, Biology, and Economics with Senior UK Faculty Lecturers.",
    },
  ];

  const diamondPrograms = [
    {
      id: "ial",
      code: "IAL",
      name: "London A/L (AS & A2)",
      colorBg: "bg-purple-600",
      colorText: "text-purple-600",
      icon: GraduationCap,
      description: "Pearson Edexcel International Advanced Level (Units 1-6, Pure Maths P1-P4, Mechanics & Stats)",
    },
    {
      id: "igcse",
      code: "IGCSE",
      name: "London O/L (IGCSE)",
      colorBg: "bg-cyan-500",
      colorText: "text-cyan-600",
      icon: BookOpen,
      description: "Pearson Edexcel & Cambridge IGCSE / GCSE Grade 9/8 (A*) targeted curriculum",
    },
    {
      id: "math",
      code: "MATH",
      name: "Pure Maths & Mechanics",
      colorBg: "bg-lime-500",
      colorText: "text-lime-600",
      icon: Calculator,
      description: "Edexcel P1, P2, P3, P4, Mechanics M1, and Statistics S1 comprehensive paper solving",
    },
    {
      id: "sci",
      code: "SCI",
      name: "Physics & Chemistry Labs",
      colorBg: "bg-pink-500",
      colorText: "text-pink-600",
      icon: Atom,
      description: "Units 1-6 theory & Alternative to Practical (Unit 3/6) video laboratory masterclasses",
    },
    {
      id: "comm",
      code: "COMM",
      name: "Economics & Business",
      colorBg: "bg-amber-700",
      colorText: "text-amber-700",
      icon: TrendingUp,
      description: "Edexcel Units 1-4 20/25 mark evaluation essay structure & macroeconomic data response",
    },
    {
      id: "bio",
      code: "BIO",
      name: "Biology & Sciences",
      colorBg: "bg-indigo-600",
      colorText: "text-indigo-600",
      icon: BookOpen,
      description: "Human physiology, cellular genetics, biochemistry & environmental systems",
    },
  ];

  const bottomCategoryTabs = [
    { label: "London A/L (IAL)", color: "bg-purple-700", href: "#courses" },
    { label: "London O/L (IGCSE)", color: "bg-cyan-600", href: "#courses" },
    { label: "Pure Mathematics", color: "bg-lime-600", href: "#courses" },
    { label: "Physics & Chemistry", color: "bg-pink-600", href: "#courses" },
    { label: "Economics & Business", color: "bg-amber-700", href: "#courses" },
    { label: "Biology & Life Sciences", color: "bg-indigo-700", href: "#courses" },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const activeSlide = slides[currentSlide];

  const openDemoModal = (role: UserRole) => {
    setPreviewRole(role);
    setIsModalOpen(true);
  };

  return (
    <section className="relative w-full overflow-hidden bg-white border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto min-h-[560px] lg:min-h-[620px] grid grid-cols-1 lg:grid-cols-12 relative items-center">
        {/* Left Side: Campus Photograph with Brush Edge */}
        <div className="lg:col-span-6 relative w-full h-[360px] sm:h-[420px] lg:h-[620px] overflow-hidden bg-slate-900">
          <img
            src={activeSlide.image}
            alt="London A/L and O/L Students"
            className="w-full h-full object-cover object-center transition-all duration-700 ease-in-out"
          />

          {/* Jagged Brush / Feathered Edge (Desktop) */}
          <div className="hidden lg:block absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent via-white/70 to-white pointer-events-none" />

          {/* Slider Prev Arrow */}
          <button
            onClick={prevSlide}
            aria-label="Previous Slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-md z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Mobile Bottom Fade */}
          <div className="lg:hidden absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
        </div>

        {/* Right Side: Headline & Diamond Program Badges */}
        <div className="lg:col-span-6 px-6 sm:px-10 lg:px-12 py-10 sm:py-14 flex flex-col justify-center relative z-10 bg-white">
          {/* Slider Next Arrow */}
          <button
            onClick={nextSlide}
            aria-label="Next Slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 hidden xl:flex w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 items-center justify-center transition-all shadow-sm z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Main Hero Headline */}
          <div className="text-center space-y-3 mb-8">


            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black text-[#0c2461] tracking-tight leading-[1.1]">
              {activeSlide.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
              {activeSlide.subtitle}
            </p>
          </div>

          {/* Diamond Grid of London A/L & O/L Badges */}
          <div className="relative py-6 max-w-lg mx-auto w-full flex items-center justify-center">
            {/* Background Thin Connecting Lines */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-72 h-40 border border-slate-300 transform rotate-45" />
            </div>

            {/* Diamond Badges Container */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 relative z-10">
              {diamondPrograms.map((prog) => {
                const Icon = prog.icon;
                const isSelected = selectedDiamond === prog.id;

                return (
                  <div
                    key={prog.id}
                    onClick={() => setSelectedDiamond(isSelected ? null : prog.id)}
                    className="group cursor-pointer flex flex-col items-center"
                  >
                    {/* The Rotated Diamond Square */}
                    <div
                      className={`w-18 h-18 sm:w-22 sm:h-22 ${prog.colorBg} rounded-2xl flex items-center justify-center shadow-lg transform rotate-45 group-hover:scale-110 group-hover:rotate-45 transition-all duration-300 border-2 border-white/90 ring-2 ring-slate-100`}
                    >
                      {/* Counter-Rotated Content */}
                      <div className="transform -rotate-45 flex flex-col items-center justify-center text-white text-center p-1">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 drop-shadow-sm" />
                        <span className="font-black text-[10px] sm:text-[11px] tracking-wider uppercase drop-shadow-sm">
                          {prog.code}
                        </span>
                      </div>
                    </div>

                    {/* Program Label */}
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 text-center mt-3 max-w-[85px] leading-tight group-hover:text-blue-700 transition-colors">
                      {prog.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Diamond Detail Toast */}
          {selectedDiamond && (
            <div className="mt-4 p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="text-xs font-bold text-blue-900">
                {diamondPrograms.find((d) => d.id === selectedDiamond)?.name} ({diamondPrograms.find((d) => d.id === selectedDiamond)?.code})
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                {diamondPrograms.find((d) => d.id === selectedDiamond)?.description}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <Link
                  href="#courses"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                >
                  <span>Explore Subject Units & Past Papers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Quick CTA Links */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#courses"
              className="px-6 py-2.5 rounded-xl bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold shadow-md shadow-blue-900/20 flex items-center gap-2 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explore London A/L & O/L Courses</span>
            </Link>

            <Link
              href="/admin"
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Open Admin Command Center</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Color-Coded Academic Faculty Strip */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-t border-slate-200">
        {bottomCategoryTabs.map((tab, idx) => (
          <Link
            key={idx}
            href={tab.href}
            className={`${tab.color} text-white py-3 px-3 text-center text-xs font-bold tracking-wide hover:brightness-110 transition-all flex items-center justify-center border-r border-white/20 last:border-r-0`}
          >
            <span className="truncate">{tab.label}</span>
          </Link>
        ))}
      </div>

      {/* Role Demo Modal */}
      <RolePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultRole={previewRole}
      />
    </section>
  );
}
