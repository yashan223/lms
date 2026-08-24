"use client";

import React, { useState } from "react";
import { FAQ_ITEMS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { RolePreviewModal } from "@/components/landing/RolePreviewModal";
import { HelpCircle, ArrowRight, ShieldCheck, Sparkles, GraduationCap } from "lucide-react";

export function FaqSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section id="faq" className="py-20 bg-slate-50/60 border-t border-blue-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-3 font-semibold">
            Common Questions
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Everything you need to know about our academic programs, study materials, and curriculum.
          </p>
        </div>

        {/* Accordion List */}
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

        {/* Bottom CTA Card */}
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8 sm:p-12 text-white shadow-xl shadow-blue-600/20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 blur-3xl rounded-full pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Ready to experience modern education?
            </h3>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
              Explore the platform today as an Admin, Instructor, or Student with our interactive live demo environment.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                variant="white"
                onClick={() => setIsModalOpen(true)}
                className="text-blue-700 font-bold gap-2 text-sm h-12 px-6"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Launch Role Portal Demo</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Role Preview Modal */}
      <RolePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultRole="ADMIN"
      />
    </section>
  );
}
