"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GraduationCap,
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
        {/* Main Footer Links */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900">
                    Edu<span className="text-blue-600">Pulse</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Unified Multi-Role Learning Platform
                  </span>
                </div>
              </Link>

              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm">
                Empowering students, faculty educators, and system administrators with accredited interactive curriculum, automated grading rubrics, and university-wide governance.
              </p>

              {/* Social Icons */}
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
                  href="#masterclasses"
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
                  aria-label="Video Hub"
                  title="Video Lecture Hub"
                >
                  <Video className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Academic Disciplines Column */}
            <div className="space-y-3 text-xs sm:text-sm">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Disciplines
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#courses" className="hover:text-blue-600 transition-colors">
                    Environmental Science
                  </Link>
                </li>
                <li>
                  <Link href="#courses" className="hover:text-blue-600 transition-colors">
                    Business & Leadership
                  </Link>
                </li>
                <li>
                  <Link href="#courses" className="hover:text-blue-600 transition-colors">
                    Cognitive Neuroscience
                  </Link>
                </li>
                <li>
                  <Link href="#courses" className="hover:text-blue-600 transition-colors">
                    Architecture & Spatial Design
                  </Link>
                </li>
                <li>
                  <Link href="#courses" className="hover:text-blue-600 transition-colors">
                    Analytics & Decision Science
                  </Link>
                </li>
              </ul>
            </div>

            {/* Newsletter Column */}
            <div className="space-y-3 text-xs sm:text-sm">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Academic Newsletter
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receive weekly student digests, new course releases, and educator resources.
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
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Thank you for subscribing!
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} EduPulse LMS Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="#privacy" className="hover:text-blue-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="#terms" className="hover:text-blue-600 transition-colors">
                Academic Integrity & Terms
              </Link>
              <Link href="#security" className="hover:text-blue-600 transition-colors">
                Accreditation & Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
