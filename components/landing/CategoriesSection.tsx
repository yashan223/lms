"use client";

import React from "react";
import Link from "next/link";
import {
  Palette,
  Code2,
  Megaphone,
  Cpu,
  TrendingUp,
  LineChart,
  FileText,
  Database,
  ArrowRight,
} from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollEffects";

export function CategoriesSection() {
  const categories = [
    {
      id: "math",
      title: "Mathematics & Mechanics",
      count: "14 classes",
      icon: LineChart,
      bgColor: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      tag: "Pure Maths, Stats & Mechanics",
    },
    {
      id: "computing",
      title: "Web & Software Development",
      count: "18 classes",
      icon: Code2,
      bgColor: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      tag: "Python, Web & Algorithms",
    },
    {
      id: "ai",
      title: "AI and Machine Learning",
      count: "09 classes",
      icon: Cpu,
      bgColor: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      tag: "GenAI, Neural Networks",
    },
    {
      id: "business",
      title: "Business & Economics",
      count: "12 classes",
      icon: TrendingUp,
      bgColor: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      tag: "Edexcel & Cambridge IAL",
    },
    {
      id: "design",
      title: "Graphic & UI/UX Design",
      count: "08 classes",
      icon: Palette,
      bgColor: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      tag: "Figma, Design Systems",
    },
    {
      id: "data",
      title: "Data Science & Analytics",
      count: "11 classes",
      icon: Database,
      bgColor: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      tag: "Big Data & Visualization",
    },
    {
      id: "marketing",
      title: "Digital Marketing & Growth",
      count: "07 classes",
      icon: Megaphone,
      bgColor: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      tag: "SEO, Performance Ads",
    },
    {
      id: "writing",
      title: "Content Writing & Research",
      count: "06 classes",
      icon: FileText,
      bgColor: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      tag: "Academic Papers & English",
    },
  ];

  return (
    <section id="categories" className="py-20 bg-white relative">
      {/* ─── Categories Heading Area ─── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up" duration={700}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80 mb-3">
                <span>Choose categories</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-black font-heading text-[#0c2461] tracking-tight leading-tight">
                Browse Categories.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl">
                Choose from structured syllabi and targeted modules across high-demand academic disciplines.
              </p>
            </div>

            <div>
              <a
                href="#courses"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-105 group cursor-pointer"
              >
                <span>Find tutor</span>
                <span className="w-6 h-6 rounded-full bg-white text-blue-600 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </a>
            </div>
          </div>
        </ScrollReveal>

        {/* ─── 8 Interactive Category Cards with Staggered Cascading Reveal ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <ScrollReveal
                key={cat.id}
                animation="fade-up"
                delay={idx * 60}
                className="h-full"
              >
                <a
                  href="#courses"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="group h-full p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${cat.bgColor}`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                        {cat.count}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold font-heading text-[#0c2461] group-hover:text-blue-600 transition-colors mb-1">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-slate-500">{cat.tag}</p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0c2461] group-hover:text-blue-600 transition-colors">
                    <span>Start learning</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </a>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
