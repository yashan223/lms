"use client";

import React from "react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  ArrowRight,
  Calendar,
  Video,
} from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollEffects";

export function UpcomingEventsSection() {
  const events = [
    {
      id: 1,
      category: "Academic Masterclass",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      title: "Cambridge & Edexcel London A/L Pure Maths Masterclass",
      desc: "Live walkthrough of complex integration, vectors, and mechanics past paper questions with real-time tutor Q&A.",
      location: "BigBlueButton Virtual Studio",
      time: "10:00am - 12:00pm (GMT+5:30)",
      day: "03",
      month: "December",
    },
    {
      id: 2,
      category: "Career & Tech",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      title: "Generative AI & Python Bootcamp: From Logic to Deployment",
      desc: "Hands-on coding session covering neural networks, OpenAI API integrations, and modern full-stack workflows.",
      location: "Interactive Cloud Lab",
      time: "02:00pm - 04:30pm (GMT+5:30)",
      day: "12",
      month: "December",
    },
    {
      id: 3,
      category: "Exam Strategy",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      title: "Pearson Edexcel IGCSE Physics: Conquering Paper 1 & 2",
      desc: "Comprehensive review of experimental physics, formulae derivation, and top examiner mark scheme secrets.",
      location: "BigBlueButton Virtual Room",
      time: "06:00pm - 08:00pm (GMT+5:30)",
      day: "20",
      month: "December",
    },
  ];

  return (
    <section id="events" className="py-20 lg:py-24 bg-[#f8f8f8] relative border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <ScrollReveal animation="fade-up" duration={700}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80 mb-3">
                <span>Live &amp; Upcoming</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black font-heading text-[#0c2461] tracking-tight leading-tight">
                Upcoming Events For Career Growth.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl">
                Join interactive live workshops led by premier educators and industry specialists.
              </p>
            </div>

            <div>
              <Link
                href="/register"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-105 group"
              >
                <span>Explore all events</span>
                <span className="w-6 h-6 rounded-full bg-white text-blue-600 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* 3 Event Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {events.map((ev, idx) => (
            <ScrollReveal
              key={ev.id}
              animation="fade-up"
              delay={idx * 120}
              className="h-full"
            >
              <div className="h-full bg-white rounded-3xl p-7 border border-slate-200/90 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  {/* Top: Category Badge & Date Badge */}
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${ev.badgeColor}`}>
                      {ev.category}
                    </span>

                    {/* Date Box */}
                    <div className="px-3 py-1.5 rounded-xl bg-[#0c2461] text-white text-center leading-none">
                      <span className="block text-base font-black font-heading text-blue-400">
                        {ev.day}
                      </span>
                      <span className="block text-[9px] uppercase tracking-wider text-slate-300 mt-0.5">
                        {ev.month.slice(0, 3)}
                      </span>
                    </div>
                  </div>

                  {/* Event Title */}
                  <h3 className="text-lg font-bold font-heading text-[#0c2461] group-hover:text-blue-600 transition-colors leading-snug mb-3">
                    {ev.title}
                  </h3>

                  {/* Event Description */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    {ev.desc}
                  </p>

                  {/* Location & Time */}
                  <div className="space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{ev.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{ev.time}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-6 mt-6 border-t border-slate-100">
                  <Link
                    href="/register"
                    className="w-full py-3 rounded-full bg-slate-100 hover:bg-blue-600 text-[#0c2461] hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    <span>Book seat now</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  );
}
