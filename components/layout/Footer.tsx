"use client";

import React from "react";
import Link from "next/link";
import { Globe } from "lucide-react";

interface SocialLink {
  name: string;
  href: string;
  hoverClass: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    name: "Facebook",
    href: "https://facebook.com",
    hoverClass: "hover:text-[#1877F2] hover:border-[#1877F2]/40 hover:bg-blue-50/50",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3V2.5h-3.415a4.585 4.585 0 0 0-4.585 4.585v2.425H7v3.98h2.198v8.01z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://instagram.com",
    hoverClass: "hover:text-[#E4405F] hover:border-[#E4405F]/40 hover:bg-pink-50/50",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://tiktok.com",
    hoverClass: "hover:text-[#000000] hover:border-slate-400 hover:bg-slate-100/60",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68a6.34 6.34 0 0 0 10.86 4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-2.92-1.54 4.79 4.79 0 0 1-1.12-3z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://youtube.com",
    hoverClass: "hover:text-[#FF0000] hover:border-[#FF0000]/40 hover:bg-red-50/50",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          {/* Brand & Mission Column */}
          <div className="space-y-3 max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <img
                src="/logo-wide.png"
                alt="PulseEDU Global"
                className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              />
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed">
              Empowering students, tutors, and system administrators with accredited interactive curriculum, automated grading rubrics, and university-wide governance.
            </p>
          </div>

          {/* Social Media Column (With Names and Icons) */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Follow &amp; Connect
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              {SOCIAL_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`h-8 px-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center gap-1.5 text-xs font-medium transition-all shadow-2xs hover:scale-105 cursor-pointer ${item.hoverClass}`}
                    aria-label={item.name}
                    title={item.name}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Navigation Links Column */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Academic Resources
            </h4>
            <div className="flex flex-col space-y-1.5 text-xs text-slate-500">
              <Link href="/terms" className="hover:text-blue-600 transition-colors">
                Academic Integrity &amp; Terms
              </Link>
              <Link href="/terms#refund-policy" className="hover:text-blue-600 transition-colors font-medium">
                No-Refund Policy
              </Link>
              <Link href="/classes" className="hover:text-blue-600 transition-colors">
                Accredited Curriculum Directory
              </Link>
              <a
                href="https://edupulse.uk"
                target="_blank"
                rel="noreferrer"
                className="hover:text-blue-600 transition-colors inline-flex items-center gap-1 text-slate-500"
              >
                <Globe className="w-3 h-3" />
                <span>Global Academic Network</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} EduPulse LMS Inc. All rights reserved.</p>
          <span className="text-[10px] text-slate-400">Global Academic Network &amp; Learning Platform</span>
        </div>
      </div>
    </footer>
  );
}
