"use client";

import React from "react";
import { Star, Quote } from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollEffects";

export function Testimonials() {
  const testimonials = [
    {
      name: "Brooklyn Simmons",
      role: "Cambridge A/L Pure Maths Candidate",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      content:
        "The 1-on-1 BigBlueButton classes and whiteboard notes made London A/L Mechanics so clear. I jumped from a C grade in mock exams to an A* in the official Cambridge series!",
      rating: 5,
    },
    {
      name: "Cody Fisher",
      role: "Pearson Edexcel IAL Physics Student",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
      content:
        "The automated class recordings synced straight to my dashboard were a game-changer. Whenever I got stuck on past paper derivations, I could re-watch my tutor explain it step-by-step.",
      rating: 5,
    },
    {
      name: "Jenny Wilson",
      role: "London O/L (IGCSE) Scholar",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
      content:
        "The escrow token system gave my parents complete peace of mind. Tokens are only deducted once my tutor confirms the time, and our free trial session helped me pick the right teacher.",
      rating: 5,
    },
    {
      name: "Bessie Cooper",
      role: "Cambridge A2 Chemistry Candidate",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80",
      content:
        "Top-notch educators who truly know the latest mark schemes. My tutor broke down organic synthesis questions with tailored question banks that were identical to real exam papers.",
      rating: 5,
    },
  ];

  return (
    <section className="py-20 lg:py-24 bg-[#f8f8f8] relative border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <ScrollReveal animation="fade-up" duration={700}>
          <div className="max-w-2xl mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black font-heading text-[#0c2461] tracking-tight leading-tight">
              Explore our students users feedback.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              Real success stories from Cambridge &amp; Edexcel candidates learning 1-on-1 with EduPulse tutors.
            </p>
          </div>
        </ScrollReveal>

        {/* 4 Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t, idx) => (
            <ScrollReveal
              key={idx}
              animation="fade-up"
              delay={idx * 90}
              className="h-full"
            >
              <div className="h-full bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  {/* 5 Stars & Quote Icon */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-1">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <Quote className="w-6 h-6 text-slate-200 group-hover:text-blue-600/30 transition-colors" />
                  </div>

                  {/* Quote Text */}
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed mb-6 font-medium italic">
                    “{t.content}”
                  </p>
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-blue-100"
                  />
                  <div>
                    <h4 className="text-sm font-bold font-heading text-[#0c2461] group-hover:text-blue-600 transition-colors">
                      {t.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  );
}
