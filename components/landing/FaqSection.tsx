"use client";

import React from "react";
import Link from "next/link";
import { FAQ_ITEMS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { BookOpen, GraduationCap } from "lucide-react";

export function FaqSection() {
  return (
    <section id="faq" className="py-20 bg-slate-50/60 border-t border-blue-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Everything you need to know about our academic programs, study materials, and curriculum.
          </p>
        </div>

        <Accordion type="single" collapsible defaultValue="faq-1" className="w-full">
          {FAQ_ITEMS.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="text-sm sm:text-base font-bold text-slate-800">
                <span className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-800 shrink-0">
                    {faq.category}
                  </span>
                  <span>{faq.question}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-2">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-16 rounded-3xl bg-gradient-to-r from-[#081845] via-[#0c2461] to-[#142d6d] p-8 sm:p-12 text-white shadow-2xl shadow-[#0c2461]/30 border border-blue-900/50 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 blur-3xl rounded-full pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Ready to excel in your London A/L & O/L studies?
            </h3>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
              Explore syllabus units, download study handbooks, and join live individual classes led by senior tutors.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center justify-center text-[#0c2461] font-bold gap-2 text-sm h-12 px-6 rounded-xl bg-white hover:bg-slate-100 shadow-md transition-all"
              >
                <BookOpen className="w-4 h-4 text-[#0c2461]" />
                <span>Explore Individual Classes & Syllabus</span>
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center text-white font-bold gap-2 text-sm h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-xs shadow-md transition-all"
              >
                <GraduationCap className="w-4 h-4 text-sky-300" />
                <span>Get Started</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
