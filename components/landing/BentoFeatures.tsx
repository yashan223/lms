"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Video,
  FileCheck,
  LineChart,
  Zap,
  Award,
} from "lucide-react";

export function BentoFeatures() {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-white via-blue-50/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-3 font-semibold">
            Next-Generation Capabilities
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Engineered for Academic Excellence &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">
              High Retention
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            From intelligent academic tutoring to live interactive virtual seminars and university-wide institutional governance.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-6">
          {/* Bento Item 1: AI Study Copilot (Span 7) */}
          <div className="lg:col-span-7 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white p-8 sm:p-10 flex flex-col justify-between shadow-xl shadow-blue-600/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 blur-3xl rounded-full pointer-events-none" />

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-md mb-6 border border-white/20">
                <Bot className="w-3.5 h-3.5 text-sky-300" />
                <span>Intelligent Study Assistant</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 text-white">
                24/7 Academic AI Tutor & Concept Explainer
              </h3>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-lg mb-6">
                Never get stuck on complex theory again. Scholars can highlight any lecture excerpt or formula to receive clear conceptual breakdowns and guided study notes.
              </p>
            </div>

            {/* Micro chat simulation */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-sky-300 text-blue-900 flex items-center justify-center font-bold text-[10px] shrink-0">
                  AI
                </div>
                <div className="text-xs text-blue-50 leading-relaxed">
                  &quot;In environmental economics, Pigouvian taxation internalizes negative externalities by setting the tax equal to marginal social damage at the socially efficient output.&quot;
                </div>
              </div>
            </div>
          </div>

          {/* Bento Item 2: Automated Code Rubrics (Span 5) */}
          <div className="lg:col-span-5 rounded-3xl bg-white border border-blue-100 p-8 sm:p-10 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Automated Rubrics & Assignment Grader
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
                Educators configure structured grading rubrics for essays, quantitative problem sets, and case studies with instant evaluation feedback.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600" />
                Evaluation Speed
              </span>
              <span className="text-emerald-600 font-bold">Instant Feedback</span>
            </div>
          </div>

          {/* Bento Item 3: Live Interactive Classrooms (Span 4) */}
          <div className="lg:col-span-4 rounded-3xl bg-white border border-blue-100 p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-6">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Live Interactive Seminars
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                Host real-time academic lectures with synchronized discussion boards, breakout rooms, and live polling.
              </p>
            </div>

            <div className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 inline-block">
              HD Virtual Classroom
            </div>
          </div>

          {/* Bento Item 4: Institutional Skill Graph (Span 4) */}
          <div className="lg:col-span-4 rounded-3xl bg-white border border-blue-100 p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Campus Learning Analytics
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                System administrators can monitor campus-wide competencies across departments with real-time academic progress matrices.
              </p>
            </div>

            <div className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 inline-block">
              Departmental Competency Matrix
            </div>
          </div>

          {/* Bento Item 5: Verifiable Certifications (Span 4) */}
          <div className="lg:col-span-4 rounded-3xl bg-white border border-blue-100 p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Accredited Credentials
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                Each certificate is backed by verifiable credential IDs, 1-click LinkedIn embedding, and permanent academic records.
              </p>
            </div>

            <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 inline-block">
              1-Click Credential Verification
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
