"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PRICING_PLANS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Award } from "lucide-react";

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="py-20 bg-white border-t border-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Invest in Your Future with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">
              No Hidden Fees
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-8">
            Tailored tiers for solo learners, independent educators, and university campuses.
          </p>

          <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-blue-50/80 border border-blue-100 shadow-sm">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                !isAnnual
                  ? "bg-white text-blue-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly Billing
            </button>

            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                isAnnual
                  ? "bg-blue-600 text-white shadow-sm font-bold shadow-blue-500/25"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] bg-sky-300 text-blue-900 font-bold px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {PRICING_PLANS.map((plan) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                  plan.popular
                    ? "bg-gradient-to-b from-blue-50/50 via-white to-sky-50/30 border-2 border-blue-600 shadow-xl shadow-blue-500/10 scale-105 z-10"
                    : "bg-white border border-blue-100/90 shadow-sm hover:shadow-lg hover:border-blue-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge
                      variant="default"
                      className="bg-gradient-to-r from-blue-600 to-sky-600 text-white font-bold text-xs py-1 px-4 shadow-md shadow-blue-500/30 flex items-center gap-1"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{plan.badge || "Most Popular"}</span>
                    </Badge>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      {plan.roleTarget}
                    </span>
                    {!plan.popular && plan.badge && (
                      <Badge variant="secondary" className="text-[10px]">
                        {plan.badge}
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-2">
                    {plan.name}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    {plan.description}
                  </p>

                  <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-slate-100">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                      ${price}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      / month {isAnnual && "(billed annually)"}
                    </span>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Included in this plan:
                    </div>
                    {plan.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-700 font-medium">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href="/register"
                  className={`w-full text-sm font-bold h-12 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30"
                      : "border border-blue-200 text-slate-800 hover:bg-blue-50 bg-white"
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
