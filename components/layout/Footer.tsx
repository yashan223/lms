"use client";

import React from "react";
import Link from "next/link";
import { Globe, Video } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-md">
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
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-300 transition-colors shadow-2xs"
                aria-label="Global Network"
                title="Global Academic Network"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/classes"
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-300 transition-colors shadow-2xs"
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
        </div>
      </div>
    </footer>
  );
}
