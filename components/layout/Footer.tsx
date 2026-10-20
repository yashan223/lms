"use client";

import React from "react";
import Link from "next/link";
import { Globe, Video } from "lucide-react";

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    href: "https://facebook.com",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    hoverClass: "hover:text-[#1877F2] hover:border-[#1877F2]/40 hover:bg-blue-50/50",
  },
  {
    name: "Instagram",
    href: "https://instagram.com",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    ),
    hoverClass: "hover:text-[#E4405F] hover:border-[#E4405F]/40 hover:bg-pink-50/50",
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    ),
    hoverClass: "hover:text-[#0A66C2] hover:border-[#0A66C2]/40 hover:bg-blue-50/50",
  },
  {
    name: "X (Twitter)",
    href: "https://x.com",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    hoverClass: "hover:text-slate-900 hover:border-slate-400 hover:bg-slate-100/60",
  },
  {
    name: "YouTube",
    href: "https://youtube.com",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    hoverClass: "hover:text-[#FF0000] hover:border-[#FF0000]/40 hover:bg-red-50/50",
  },
  {
    name: "WhatsApp",
    href: "https://wa.me",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.89-9.884 9.89m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    hoverClass: "hover:text-[#25D366] hover:border-[#25D366]/40 hover:bg-emerald-50/50",
  },
];

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-md">
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
            {/* Social media links */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Follow Us:</span>
              {SOCIAL_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center transition-all shadow-2xs hover:scale-105 ${item.hoverClass}`}
                    aria-label={item.name}
                    title={item.name}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-5 flex-wrap">
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

            <div className="flex items-center gap-2 text-slate-400">
              <a
                href="https://edupulse.uk"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-2xs hover:scale-105"
                aria-label="Global Network"
                title="Global Academic Network"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/classes"
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-2xs hover:scale-105"
                aria-label="Courses"
                title="Accredited Classes"
              >
                <Video className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} EduPulse LMS Inc. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Global Academic Network &amp; Learning Platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
