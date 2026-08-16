"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RolePreviewModal } from "@/components/landing/RolePreviewModal";
import { UserRole } from "@/lib/types";
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export function Footer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<UserRole>("ADMIN");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const openModal = (role: UserRole) => {
    setModalRole(role);
    setIsModalOpen(true);
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
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
                Empowering scholars, faculty educators, and institutional deans with accredited interactive curriculum, automated grading rubrics, and university-wide governance.
              </p>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Campus Network: All Systems Operational</span>
              </div>

              {/* Social Icons */}
              <div className="flex items-center gap-2 pt-2 text-slate-400">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
                  aria-label="LinkedIn"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
                  aria-label="Twitter"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
                  aria-label="YouTube"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* 3 User Roles Column */}
            <div className="space-y-3 text-xs sm:text-sm">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Role Portals
              </h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => openModal("STUDENT")}
                    className="hover:text-blue-600 transition-colors text-left flex items-center gap-1.5"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    Student Learning Hub
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openModal("INSTRUCTOR")}
                    className="hover:text-blue-600 transition-colors text-left flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Faculty Studio
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openModal("ADMIN")}
                    className="hover:text-blue-600 transition-colors text-left flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Dean & Admin Console
                  </button>
                </li>
                <li>
                  <Link href="#courses" className="hover:text-blue-600 transition-colors">
                    Course Catalog (4.2k+)
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-blue-600 transition-colors">
                    Institutional Tiers
                  </Link>
                </li>
              </ul>
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
                Receive weekly scholarship digests, new course releases, and educator resources.
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

      {/* Role Preview Modal */}
      <RolePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultRole={modalRole}
      />
    </>
  );
}
