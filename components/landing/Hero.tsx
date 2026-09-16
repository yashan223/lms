"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  Atom,
  TrendingUp,
  Calculator,
  BookOpen,
} from "lucide-react";

export function Hero() {

  const diamondPrograms = [
    {
      id: "ial",
      code: "IAL",
      name: "London A/L (AS & A2)",
      colorBg: "bg-purple-600",
      colorText: "text-purple-600",
      icon: GraduationCap,
    },
    {
      id: "igcse",
      code: "IGCSE",
      name: "London O/L (IGCSE)",
      colorBg: "bg-cyan-500",
      colorText: "text-cyan-600",
      icon: BookOpen,
    },
    {
      id: "math",
      code: "MATH",
      name: "Pure Maths & Mechanics",
      colorBg: "bg-lime-500",
      colorText: "text-lime-600",
      icon: Calculator,
    },
    {
      id: "sci",
      code: "SCI",
      name: "Physics & Chemistry Labs",
      colorBg: "bg-pink-500",
      colorText: "text-pink-600",
      icon: Atom,
    },
    {
      id: "comm",
      code: "COMM",
      name: "Economics & Business",
      colorBg: "bg-amber-700",
      colorText: "text-amber-700",
      icon: TrendingUp,
    },
    {
      id: "bio",
      code: "BIO",
      name: "Biology & Sciences",
      colorBg: "bg-indigo-600",
      colorText: "text-indigo-600",
      icon: BookOpen,
    },
  ];


  return (
    <section className="relative w-full overflow-hidden bg-white border-b border-slate-200">
      <div className="w-full h-[560px] lg:h-[680px] grid grid-cols-1 lg:grid-cols-12 relative items-stretch overflow-hidden">
        <div className="lg:col-span-6 relative w-full h-full overflow-hidden bg-slate-900 self-stretch">
          <img
            src="/images/campus_students_hero.jpg"
            alt="London A/L and O/L Students"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          <div className="hidden lg:block absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent via-white/70 to-white pointer-events-none" />

          <div className="lg:hidden absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
        </div>

        <div className="lg:col-span-6 px-6 sm:px-10 lg:px-12 xl:px-16 py-10 sm:py-14 flex flex-col justify-center items-center relative z-10 bg-white overflow-hidden">
          <div className="max-w-xl w-full flex flex-col items-center">
            <div className="text-center space-y-3 mb-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black text-[#0c2461] tracking-tight leading-[1.1]">
                London A/L & O/L Academy
              </h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
                Comprehensive curriculum coverage. Unit-by-unit topic masterclasses, downloadable study materials, and past paper video vaults.
              </p>
            </div>

            <div className="relative py-6 max-w-lg mx-auto w-full flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <div className="w-72 h-40 border border-slate-300 transform rotate-45" />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 relative z-10">
                {diamondPrograms.map((prog) => {
                  const Icon = prog.icon;

                  return (
                    <Link
                      key={prog.id}
                      href="#courses"
                      className="group cursor-pointer flex flex-col items-center"
                    >
                      <div
                        className={`w-18 h-18 sm:w-22 sm:h-22 ${prog.colorBg} rounded-2xl flex items-center justify-center shadow-lg transform rotate-45 transition-all duration-300 border-2 border-white/90 ring-2 ring-slate-100 group-hover:scale-105 group-hover:shadow-xl`}
                      >
                        <div className="transform -rotate-45 flex flex-col items-center justify-center text-white text-center p-1">
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 drop-shadow-sm" />
                          <span className="font-black text-[10px] sm:text-[11px] tracking-wider uppercase drop-shadow-sm">
                            {prog.code}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 text-center mt-3 max-w-[85px] leading-tight group-hover:text-blue-700 transition-colors">
                        {prog.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

    </section>
  );
}
