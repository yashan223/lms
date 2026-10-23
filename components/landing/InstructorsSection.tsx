"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Star,
  ArrowRight,
} from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollEffects";
import { FacultyTutor, formatDbTutors } from "@/lib/faculty-tutors";
import { TrialRequestModal } from "@/components/trials/TrialRequestModal";

function getTutorPhoto(tutor: FacultyTutor): string {
  if (tutor.avatar && (tutor.avatar.startsWith("http") || tutor.avatar.startsWith("/"))) {
    return tutor.avatar;
  }
  const nameLower = (tutor.name || "").toLowerCase();
  if (nameLower.includes("yashan")) {
    return "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80";
  }
  if (nameLower.includes("enigma") || nameLower.includes("science")) {
    return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80";
}

export function InstructorsSection() {
  const [tutors, setTutors] = useState<FacultyTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedTrialTutorId, setSelectedTrialTutorId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tutors", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.tutors && Array.isArray(data.tutors)) {
          setTutors(formatDbTutors(data.tutors));
        }
      })
      .catch((err) => console.error("Failed to load tutors:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="tutors" className="py-20 lg:py-24 bg-white relative border-b border-slate-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <ScrollReveal animation="fade-up" duration={700}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black font-heading text-[#0c2461] tracking-tight leading-tight">
                Learn From Our Expert Tutors.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl">
                Vetted subject specialists holding top academic credentials and proven exam track records.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/classes?tab=tutors"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-600 text-[#0c2461] hover:text-blue-600 text-xs font-bold whitespace-nowrap transition-all shadow-xs"
              >
                <span>See all tutors</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* Real Tutors Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-96 rounded-3xl bg-slate-50 border border-slate-100 animate-pulse p-5" />
            ))}
          </div>
        ) : tutors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tutors.map((tutor, idx) => (
              <ScrollReveal
                key={tutor.id}
                animation="fade-up"
                delay={idx * 100}
                className="h-full"
              >
                <div className="h-full bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 transition-all duration-300 flex flex-col justify-between group">
                  <div>
                    {/* Photo */}
                    <div className="relative rounded-2xl overflow-hidden aspect-[4/4.2] mb-4 bg-slate-100">
                      <img
                        src={getTutorPhoto(tutor)}
                        alt={tutor.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {tutor.country && (
                        <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-[#0c2461] backdrop-blur-md shadow-xs">
                          {tutor.country}
                        </span>
                      )}
                    </div>

                    {/* Name & Role */}
                    <h3 className="text-lg font-bold font-heading text-[#0c2461] group-hover:text-blue-600 transition-colors mb-1 truncate">
                      {tutor.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1 mb-4">
                      {tutor.headline || tutor.levelLabel}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center mb-4">
                      <div>
                        <div className="text-xs font-bold text-[#0c2461]">
                          {tutor.classesCount || 1}+
                        </div>
                        <div className="text-[10px] text-slate-500">Classes</div>
                      </div>
                      <div className="border-x border-slate-100">
                        <div className="text-xs font-bold text-[#0c2461] truncate px-0.5">
                          {tutor.level === "OL"
                            ? "IGCSE & OL"
                            : tutor.level === "AL"
                            ? "AS & A2"
                            : "O/L & A/L"}
                        </div>
                        <div className="text-[10px] text-slate-500">Track</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-xs font-bold text-[#0c2461]">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{tutor.rating || 5.0}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Rating</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => {
                      setSelectedTrialTutorId(tutor.id);
                      setShowTrialModal(true);
                    }}
                    className="w-full py-2.5 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 group/btn cursor-pointer"
                  >
                    <span>Book Free Trial</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200">
            <p className="text-slate-500 text-sm">No tutors available at the moment.</p>
          </div>
        )}

        <TrialRequestModal
          isOpen={showTrialModal}
          onClose={() => {
            setShowTrialModal(false);
            setSelectedTrialTutorId(null);
          }}
          initialTutorId={selectedTrialTutorId || undefined}
        />

      </div>
    </section>
  );
}
