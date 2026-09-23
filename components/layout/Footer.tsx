"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  ArrowRight,
  Globe,
  Share2,
  Video,
} from "lucide-react";

export function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setNewsletterEmail("");
    }
  };

  return (
    <>
      <footer className="bg-slate-50 border-t border-blue-100 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-2 space-y-4">
              <Link href="/" className="inline-flex items-center gap-2 group py-1">
                <img
                  src="/logo-wide.png"
                  alt="PulseEDU Global"
                  className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                />
              </Link>

              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm">
                Empowering students, tutors, and system administrators with accredited interactive curriculum, automated grading rubrics, and university-wide governance.
              </p>

              <div className="flex items-center gap-2 pt-2 text-slate-400">
                <a
                  href="https://edupulse.uk"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
                  aria-label="Global Network"
                  title="Global Academic Network"
                >
                  <Globe className="w-4 h-4" />
                </a>
                <a
                  href="#share"
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
                  aria-label="Community"
                  title="Academic Community"
                >
                  <Share2 className="w-4 h-4" />
                </a>
                <a
                  href="#courses"
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
                  aria-label="Video Hub"
                  title="Video Class Hub"
                >
                  <Video className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Subjects
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/classes" className="hover:text-blue-600 transition-colors">
                    Pure Mathematics (P1–P4)
                  </Link>
                </li>
                <li>
                  <Link href="/classes" className="hover:text-blue-600 transition-colors">
                    Mechanics & Physics (M1/PHY)
                  </Link>
                </li>
                <li>
                  <Link href="/classes" className="hover:text-blue-600 transition-colors">
                    Chemistry & Biology
                  </Link>
                </li>
                <li>
                  <Link href="/classes" className="hover:text-blue-600 transition-colors">
                    Economics & Business Studies
                  </Link>
                </li>
                <li>
                  <Link href="/classes" className="hover:text-blue-600 transition-colors">
                    Computer Science & ICT
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Academic Newsletter
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receive weekly student digests, new individual class releases, and educator resources.
              </p>

              <form onSubmit={handleSubscribe} className="space-y-2">
                <Input
                  type="email"
                  placeholder="Enter your academic email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="bg-white text-xs h-10 border-blue-200"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  className="w-full h-10 text-xs shadow-sm shadow-blue-500/25 gap-1.5"
                >
                  <span>Subscribe Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
                {subscribed && (
                  <p className="text-[11px] text-blue-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Thank you for subscribing!
                  </p>
                )}
              </form>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} EduPulse LMS Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="hover:text-blue-600 transition-colors">
                Academic Integrity & Terms
              </Link>
              <Link href="/terms#refund-policy" className="hover:text-blue-600 transition-colors font-medium">
                No-Refund Policy
              </Link>
              <Link href="/classes" className="hover:text-blue-600 transition-colors">
                Accredited Curriculum
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
