"use client";

import React from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, ArrowRight, Heart } from "lucide-react";

interface SocialLink {
  name: string;
  href: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    name: "Facebook",
    href: "https://facebook.com",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3V2.5h-3.415a4.585 4.585 0 0 0-4.585 4.585v2.425H7v3.98h2.198v8.01z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://instagram.com",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://youtube.com",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://tiktok.com",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68a6.34 6.34 0 0 0 10.86 4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-2.92-1.54 4.79 4.79 0 0 1-1.12-3z" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="bg-[#0c1b33] text-slate-300 relative overflow-hidden border-t border-blue-950">
      {/* Top subtle blue glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-16">
          
          {/* Brand & Mission Column (Col 4) */}
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="inline-block">
              <img
                src="/logo-wide.png"
                alt="EduPulse Global"
                className="h-10 sm:h-12 w-auto object-contain brightness-0 invert"
              />
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              The premier online education LMS empowering Cambridge &amp; Edexcel London O/L and A/L students with elite verified tutors, interactive virtual rooms, and escrow-backed token security.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-2.5 pt-2">
              {SOCIAL_LINKS.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:border-blue-400 hover:bg-blue-600 hover:text-white text-slate-300 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                    aria-label={s.name}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Academic Programs Column (Col 3) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
              Academic Programs
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
              <li>
                <a href="#courses" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-400" /> London A/L (IAL AS &amp; A2)
                </a>
              </li>
              <li>
                <a href="#courses" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-400" /> London O/L (IGCSE)
                </a>
              </li>
              <li>
                <a href="#courses" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-400" /> Pure Mathematics &amp; Mechanics
                </a>
              </li>
              <li>
                <a href="#courses" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-400" /> Physics &amp; Chemistry Labs
                </a>
              </li>
              <li>
                <a href="#courses" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-400" /> Computing &amp; Python Algorithms
                </a>
              </li>
              <li>
                <a href="#courses" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-400" /> Economics &amp; Business Studies
                </a>
              </li>
            </ul>
          </div>

          {/* Platform & Resources Column (Col 2) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
              Resources
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
              <li>
                <a href="#about" className="hover:text-blue-400 transition-colors">
                  About Platform
                </a>
              </li>
              <li>
                <a href="#tutors" className="hover:text-blue-400 transition-colors">
                  Tutor Directory
                </a>
              </li>
              <li>
                <a href="#courses" className="hover:text-blue-400 transition-colors">
                  Explore Classes
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-blue-400 transition-colors">
                  FAQs &amp; Help
                </a>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-blue-400 transition-colors">
                  Refund &amp; Escrow
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support Column (Col 3) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
              Contact &amp; Support
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Have questions regarding syllabus enrollment, token top-up, or trial scheduling?
            </p>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <a href="mailto:support@pulseedu.online" className="hover:text-white transition-colors">
                  support@pulseedu.online
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Colombo, Western Province, Sri Lanka</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Mon - Sat: 8:00 AM - 9:00 PM</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright & Legal */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © 2026 <strong className="text-white">EduPulse LMS</strong>. All rights reserved.
          </div>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="hover:text-blue-400 transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/refund-policy" className="hover:text-blue-400 transition-colors">
              Refund Policy
            </Link>
            <a href="#about" className="hover:text-blue-400 transition-colors">
              Accreditation
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
