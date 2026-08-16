"use client";

import React from "react";
import { MOCK_TESTIMONIALS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote, CheckCircle2 } from "lucide-react";

export function Testimonials() {
  const roleBadges = {
    STUDENT: { label: "Verified Student", variant: "roleStudent" as const },
    INSTRUCTOR: { label: "Verified Instructor", variant: "roleInstructor" as const },
    ADMIN: { label: "University Admin", variant: "roleAdmin" as const },
  };

  return (
    <section className="py-20 bg-slate-50/50 border-t border-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-3 font-semibold">
            Social Proof & Reviews
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Loved by Students, Instructors & Deans
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Real stories from members of our 140,000+ global learning community.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {MOCK_TESTIMONIALS.map((testimonial) => {
            const roleInfo = roleBadges[testimonial.userType];
            return (
              <div
                key={testimonial.id}
                className="p-8 rounded-3xl bg-white border border-blue-100/90 shadow-sm hover:shadow-xl hover:border-blue-200/90 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Top Quote & Rating */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex text-amber-400">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <Badge variant={roleInfo.variant} className="text-[10px]">
                      {roleInfo.label}
                    </Badge>
                  </div>

                  {/* Testimonial Content */}
                  <p className="text-slate-700 text-sm leading-relaxed mb-6 italic">
                    &quot;{testimonial.content}&quot;
                  </p>
                </div>

                {/* Author Info */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  <Avatar className="w-11 h-11 ring-2 ring-blue-100">
                    <AvatarImage
                      src={testimonial.avatar}
                      alt={testimonial.name}
                    />
                    <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">
                      {testimonial.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {testimonial.role}
                    </div>
                    <div className="text-[11px] text-blue-600 font-medium truncate">
                      {testimonial.affiliation}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
