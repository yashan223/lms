"use client";

import React from "react";
import { FAQ_ITEMS } from "@/lib/constants";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollEffects";

export function FaqSection() {
  return (
    <section id="faq" className="py-20 lg:py-24 bg-white border-t border-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <ScrollReveal animation="fade-up" duration={700}>
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black font-heading text-[#0c2461] tracking-tight leading-tight">
              Frequently Asked Questions.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              Everything you need to know about Cambridge &amp; Edexcel syllabi, BigBlueButton live rooms, and escrow-backed tokens.
            </p>
          </div>
        </ScrollReveal>

        {/* Accordion Container */}
        <ScrollReveal animation="fade-up" delay={150} duration={800}>
          <div className="bg-[#f8f8f8] p-4 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
            <Accordion type="single" collapsible defaultValue="faq-1" className="w-full space-y-3">
              {FAQ_ITEMS.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="bg-white rounded-2xl px-5 py-2 border border-slate-200/80 hover:border-blue-600 transition-colors"
                >
                  <AccordionTrigger className="text-sm sm:text-base font-bold font-heading text-[#0c2461] hover:text-blue-600 transition-colors py-3 text-left">
                    <span className="flex items-center gap-3">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
                        {faq.category}
                      </span>
                      <span>{faq.question}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-2 pb-3">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
