"use client";

import React from "react";
import { MOCK_METRICS } from "@/lib/mock-data";
import {
  Users,
  Award,
  CheckCircle,
  Building2,
  TrendingUp,
} from "lucide-react";

export function MetricsStrip() {
  const metricIcons = [Users, Award, CheckCircle, Building2];

  const partners = [
    { name: "Oxford Academic", tag: "Research Partner" },
    { name: "Cambridge Guild", tag: "Curriculum Sponsor" },
    { name: "Earth Sciences Inst.", tag: "Accredited Faculty" },
    { name: "Harvard Faculty Net", tag: "Academic Partner" },
    { name: "Sorbonne Alliance", tag: "Fellowship Network" },
    { name: "Stanford Research", tag: "Global Partner" },
  ];

  return (
    <section className="py-12 bg-white border-y border-blue-100/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {MOCK_METRICS.map((metric, idx) => {
            const Icon = metricIcons[idx % metricIcons.length];
            return (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-50/40 via-white to-slate-50 border border-blue-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {metric.growth}
                  </span>
                </div>

                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
                  {metric.value}
                </div>
                <div className="text-sm font-bold text-slate-800 mb-0.5">
                  {metric.label}
                </div>
                <div className="text-xs text-slate-500">
                  {metric.subtext}
                </div>
              </div>
            );
          })}
        </div>

        {/* Institutional Partners Banner */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
            Partnered with leading universities & academic faculties worldwide
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center justify-items-center">
            {partners.map((partner, index) => (
              <div
                key={index}
                className="px-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 w-full text-center hover:bg-blue-50/60 hover:border-blue-200 transition-colors"
              >
                <div className="font-extrabold text-sm text-slate-700 tracking-tight">
                  {partner.name}
                </div>
                <div className="text-[10px] text-blue-600 font-medium">
                  {partner.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
