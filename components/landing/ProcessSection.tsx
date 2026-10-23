"use client";

import React from "react";
import { Search, UserCheck, Video, Award, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/landing/ScrollEffects";

export function ProcessSection() {
  const steps = [
    {
      number: "01.",
      title: "Search Subject & Skill",
      desc: "Find the perfect syllabus module with ease. Browse certified Cambridge & Edexcel O/L and A/L classes.",
      icon: Search,
      accent: "text-blue-600 bg-blue-50 border-blue-200/80",
    },
    {
      number: "02.",
      title: "Choose Class & Tutor",
      desc: "Select the educator that fits your goals. Review tutor bios, official rates, and book a free 30-min trial.",
      icon: UserCheck,
      accent: "text-blue-700 bg-blue-50 border-blue-200/80",
    },
    {
      number: "03.",
      title: "Learn at Your Pace",
      desc: "Join live 1-on-1 BigBlueButton interactive sessions with escrow protection and automated cloud recordings.",
      icon: Video,
      accent: "text-[#0c2461] bg-blue-100/60 border-blue-200/80",
    },
    {
      number: "04.",
      title: "Excel in Your Exams",
      desc: "Access revision notes, practice past papers, and secure top A* grades in your London O/L and A/L exams.",
      icon: Award,
      accent: "text-sky-600 bg-sky-50 border-sky-200/80",
    },
  ];

  return (
    <section className="py-20 lg:py-24 bg-white relative border-b border-slate-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <ScrollReveal animation="fade-up" duration={700}>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80 mb-3">
              <span>Career paths</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black font-heading text-[#0c2461] tracking-tight leading-tight">
              Structured Paths for Future Careers
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3">
              Step-by-step guidance designed to take you from foundational concepts to examination mastery.
            </p>
          </div>
        </ScrollReveal>

        {/* 4 Process Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            return (
              <ScrollReveal
                key={idx}
                animation="fade-up"
                delay={idx * 100}
                className="h-full"
              >
                <div className="h-full relative p-7 rounded-3xl bg-[#f8f8f8] border border-slate-200/90 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 transition-all duration-300 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-3xl font-black font-heading text-slate-300 group-hover:text-blue-600 transition-colors">
                        {st.number}
                      </span>
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-110 ${st.accent}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>

                    <h3 className="text-lg font-bold font-heading text-[#0c2461] group-hover:text-blue-600 transition-colors mb-2">
                      {st.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {st.desc}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-200/60 flex items-center gap-1.5 text-xs font-bold text-[#0c2461] group-hover:text-blue-600 transition-colors">
                    <span>Explore pathway</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

      </div>
    </section>
  );
}
