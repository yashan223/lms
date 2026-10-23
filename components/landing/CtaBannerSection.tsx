"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollEffects";

export function CtaBannerSection() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setEmail("");
    }
  };

  return (
    <section className="py-20 bg-white relative">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Curved Gradient CTA Banner Box */}
        <ScrollReveal animation="zoom-in" duration={850}>
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#0c1b33] via-[#102e5c] to-[#0c1b33] text-white p-8 sm:p-12 lg:p-16 shadow-2xl">
            
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-blue-300 border border-white/10 mb-4 backdrop-blur-md">
                <span>Start Your Journey</span>
              </div>

              {/* Title */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading tracking-tight leading-tight mb-5">
                Transform Future Using Online.
              </h2>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed mb-8 max-w-xl">
                Take the first step toward top Cambridge &amp; Edexcel examination marks with personalized 1-on-1 tuition and escrow-protected tokens.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
                <a
                  href="#courses"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-7 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/40 flex items-center gap-3 transition-all hover:scale-105 group cursor-pointer"
                >
                  <span>Find tutor</span>
                  <span className="w-6 h-6 rounded-full bg-white text-blue-600 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </a>

                <a
                  href="#courses"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-bold flex items-center gap-3 transition-all hover:scale-105 group"
                >
                  <span>Explore classes</span>
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </a>
              </div>

              {/* Newsletter Subscription Bar */}
              <div className="w-full max-w-xl pt-8 border-t border-white/10">
                <h3 className="text-base sm:text-lg font-bold font-heading mb-4">
                  Subscribe for Latest Learning Updates.
                </h3>

                {subscribed ? (
                  <div className="p-3.5 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>Thank you! You are now subscribed to EduPulse updates.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address..."
                        required
                        className="w-full pl-11 pr-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-blue-400 transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-7 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shrink-0 transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      <span>Subscribe</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </form>
                )}

                <p className="text-[11px] text-slate-400 mt-3">
                  By subscribing, you agree to our <Link href="/terms" className="text-white hover:underline">Terms &amp; Conditions</Link> and Privacy Policy.
                </p>
              </div>

            </div>

          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
