"use client";

import React from "react";
import { Users, BookOpen, GraduationCap, Award } from "lucide-react";
import { ScrollReveal, AnimatedCounter } from "@/components/landing/ScrollEffects";

export function MetricsStrip() {
  const metrics = [
    {
      value: "25,000+",
      label: "Active Students",
      desc: "Enrolled in live & syllabus classes",
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
    {
      value: "150+",
      label: "Quality Classes",
      desc: "Cambridge & Edexcel modules",
      icon: BookOpen,
      color: "text-blue-700 bg-blue-50/80",
    },
    {
      value: "80+",
      label: "Expert Instructors",
      desc: "Certified syllabus specialists",
      icon: GraduationCap,
      color: "text-[#0c2461] bg-blue-100/60",
    },
    {
      value: "99.4%",
      label: "Satisfaction Rate",
      desc: "Verified student & parent ratings",
      icon: Award,
      color: "text-sky-600 bg-sky-50",
    },
  ];

  return (
    <section className="py-14 bg-white border-b border-slate-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {metrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <ScrollReveal
                key={idx}
                animation="fade-up"
                delay={idx * 120}
                className="h-full"
              >
                <div className="h-full p-6 rounded-2xl bg-[#f8f8f8] border border-slate-200/80 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-600/5 transition-all flex flex-col items-center text-center group">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${item.color}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-heading text-[#0c2461] tracking-tight mb-1">
                    <AnimatedCounter value={item.value} duration={1500} />
                  </div>
                  <div className="text-sm font-bold text-[#0c2461] mb-1">
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.desc}
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
