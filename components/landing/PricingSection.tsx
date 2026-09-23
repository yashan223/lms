"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TokenBundle, DEFAULT_BUNDLES } from "@/lib/bundle-types";
import { formatStudentPrice, isSriLankanStudent, getStudentAcademicLevel } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Award, Lock } from "lucide-react";

interface PricingSectionProps {
  initialBundles?: TokenBundle[];
  initialCountry?: string | null;
  initialIsSriLanka?: boolean;
  initialIsLoggedIn?: boolean;
}

export function PricingSection({
  initialBundles,
  initialCountry,
  initialIsSriLanka,
  initialIsLoggedIn,
}: PricingSectionProps) {
  const [bundles, setBundles] = useState<TokenBundle[]>(
    initialBundles && initialBundles.length > 0 ? initialBundles : DEFAULT_BUNDLES
  );
  const [studentCountry, setStudentCountry] = useState<string | null>(
    initialCountry || (initialIsSriLanka ? "Sri Lanka" : null)
  );
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(Boolean(initialIsLoggedIn));
  const [studentLevel, setStudentLevel] = useState<"OL" | "AL">("AL");

  useEffect(() => {
    async function loadBundles() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlCountry = urlParams.get("country");
        const bundlesUrl = urlCountry ? `/api/bundles?country=${encodeURIComponent(urlCountry)}` : "/api/bundles";

        const [bundlesRes, dashboardRes] = await Promise.all([
          fetch(bundlesUrl),
          fetch("/api/dashboard").catch(() => null),
        ]);

        let authenticated = false;

        if (dashboardRes && dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          if (dashboardData.user) {
            authenticated = true;
            if (dashboardData.user.country) {
              setStudentCountry(dashboardData.user.country);
            }
            setStudentLevel(getStudentAcademicLevel(dashboardData.user));
          }
        }

        if (bundlesRes.ok) {
          const data = await bundlesRes.json();
          if (data.isLoggedIn) {
            authenticated = true;
          }
          if (data.bundles && Array.isArray(data.bundles) && data.bundles.length > 0) {
            setBundles(data.bundles);
          }
          if (data.country) {
            setStudentCountry(data.country);
          }
          if (data.academicLevel) {
            setStudentLevel(data.academicLevel);
          }
        }

        setIsLoggedIn(authenticated);
      } catch (err) {
        console.error("Failed to load dynamic bundles in PricingSection:", err);
        setIsLoggedIn(false);
      }
    }
    loadBundles();
  }, []);

  // Do not render pricing section for users who are not logged in
  if (!isLoggedIn) {
    return null;
  }

  const displayPlans = bundles.length > 0 ? bundles : DEFAULT_BUNDLES;

  return (
    <section id="pricing" className="py-20 bg-white border-t border-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Flexible Learning Hours with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">
              Zero Hidden Constraints
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-6 max-w-2xl mx-auto">
            Purchase token packs based on your study goals. <strong>1 Token = 1 Hour</strong> of learning credit. You decide how to spend your hours across 1-on-1 private tutoring, interactive individual classes, and past paper clinics.
          </p>

          {/* Academic Track Switcher */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 shadow-inner max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setStudentLevel("AL")}
              className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                studentLevel === "AL"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🎓 London A/L (IAL)</span>
              {studentLevel === "AL" && (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-extrabold hidden sm:inline">Selected</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStudentLevel("OL")}
              className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                studentLevel === "OL"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📘 London O/L (IGCSE)</span>
              {studentLevel === "OL" && (
                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-extrabold hidden sm:inline">Tailored</span>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {displayPlans.map((plan) => {
            const price = plan.price;
            const roleTarget = plan.roleTarget || `${plan.tokens} Tokens (${plan.hours} Hours Tutoring)`;
            const ctaText = plan.ctaText || `Get ${plan.hours} Hours Pack`;
            const features = plan.features && plan.features.length > 0
              ? plan.features
              : [
                  `${plan.tokens} tokens (1 token = 1 hour learning credit)`,
                  "Book 1-on-1 private tutoring with Senior Tutors",
                  "Join live interactive syllabus individual classes",
                  "Instant token crediting to student wallet",
                  "Full flexibility: student decides when & how to spend",
                  "Access to class materials & study notes",
                ];

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
                      {roleTarget}
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

                  {!isLoggedIn ? (
                    <div className="mb-6 pb-6 border-b border-slate-100">
                      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-900 mb-2">
                        <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold">Sign in to view student pricing</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Tailored pricing for London A/L &amp; O/L students unlocked after creating an account.
                      </p>
                    </div>
                  ) : (
                    <div className="mb-6 pb-6 border-b border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                          {formatStudentPrice(price, studentCountry, plan.lkrPrice, studentLevel, plan.olPrice, plan.olLkrPrice)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          / package
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            studentLevel === "OL"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {studentLevel === "OL" ? "📘 London O/L (IGCSE) Rate" : "🎓 London A/L (IAL) Rate"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 mb-8">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Included in this plan:
                    </div>
                    {features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-700 font-medium">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {!isLoggedIn ? (
                  <div className="space-y-2">
                    <Link
                      href="/register"
                      className="w-full text-xs font-bold h-11 rounded-xl flex items-center justify-center gap-2 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25"
                    >
                      <span>Create Account to View Pricing</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <div className="text-center">
                      <Link href="/login" className="text-[11px] text-slate-500 hover:text-blue-600 font-semibold underline">
                        Already have an account? Sign In
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/dashboard?buyBundle=${encodeURIComponent(plan.id)}`}
                    className={`w-full text-sm font-bold h-12 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      plan.popular
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30"
                        : "border border-blue-200 text-slate-800 hover:bg-blue-50 bg-white"
                    }`}
                  >
                    <span>{ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
