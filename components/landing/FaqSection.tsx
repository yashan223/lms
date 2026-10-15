"use client";

import React from "react";
import { FAQ_ITEMS } from "@/lib/constants";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

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
      </div>
    </section>
  );
}
