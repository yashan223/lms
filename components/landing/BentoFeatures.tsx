"use client";

import React from "react";
import {
  Video,
  LineChart,
  Award,
} from "lucide-react";

export function BentoFeatures() {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-white via-blue-50/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Engineered for Academic Excellence &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">
              High Retention
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            From live interactive virtual seminars to comprehensive syllabus tracking and accredited academic evaluations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-3xl bg-white border border-blue-100 p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-6">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Live Interactive Seminars
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                Host real-time tuition classes with synchronized discussion boards, breakout rooms, and live polling.
              </p>
            </div>

            <div className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 inline-block">
              HD Virtual Classroom
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-blue-100 p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Campus Learning Analytics
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                System administrators can monitor campus-wide competencies across departments with real-time academic progress matrices.
              </p>
            </div>

            <div className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 inline-block">
              Departmental Competency Matrix
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-blue-100 p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Accredited Credentials
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                Each certificate is backed by verifiable credential IDs, 1-click LinkedIn embedding, and permanent academic records.
              </p>
            </div>

            <div className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 inline-block">
              1-Click Credential Verification
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
