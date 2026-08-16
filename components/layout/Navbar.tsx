"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Lock,
  Menu,
  X,
  UserPlus,
  ShieldCheck,
  Globe,
} from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full z-40 bg-white/95 backdrop-blur-md text-slate-800 shadow-xs relative border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between min-h-[72px] px-4 sm:px-6 lg:px-8">
        {/* Left Brand */}
        <Link href="/" className="flex items-center gap-2.5 group py-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-base tracking-tight text-slate-900 leading-none">
              EduPulse
            </span>
            <span className="text-[9px] font-bold tracking-wider text-blue-600 uppercase">
              London A/L & O/L Academy
            </span>
          </div>
        </Link>

        {/* Center Navigation Links in Modern Slate / Royal Navy */}
        <nav className="hidden lg:flex items-center gap-8 text-xs font-bold tracking-widest uppercase">
          <Link
            href="#courses"
            className="text-blue-700 hover:text-blue-800 transition-colors py-1 border-b-2 border-blue-600 font-black"
          >
            COURSES
          </Link>
          <Link
            href="#about"
            className="text-slate-600 hover:text-blue-700 transition-colors py-1"
          >
            ABOUT
          </Link>
          <Link
            href="#roles"
            className="text-slate-600 hover:text-blue-700 transition-colors py-1"
          >
            GUIDE
          </Link>
          <Link
            href="#faq"
            className="text-slate-600 hover:text-blue-700 transition-colors py-1"
          >
            FAQ
          </Link>
        </nav>

        {/* Right Action Portal Buttons (Crisp Light / Royal Navy Layout) */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-800 hover:bg-blue-50/80 border border-slate-300 transition-all flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>Register</span>
          </Link>

          <Link
            href="/login"
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0c2461] hover:bg-[#12366b] text-white shadow-sm shadow-blue-950/20 transition-all flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-sky-300" />
            <span>Portal Login</span>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0c2461] text-white"
          >
            Login
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-700 hover:text-slate-900 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-6 py-4 space-y-4 animate-in slide-in-from-top-2 shadow-lg">
          <div className="flex flex-col gap-3 text-xs font-bold tracking-wider uppercase">
            <Link
              href="#courses"
              onClick={() => setMobileMenuOpen(false)}
              className="text-blue-700 py-1"
            >
              COURSES
            </Link>
            <Link
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-700 hover:text-blue-700 py-1"
            >
              ABOUT
            </Link>
            <Link
              href="#roles"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-700 hover:text-blue-700 py-1"
            >
              GUIDE
            </Link>
            <Link
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-700 hover:text-blue-700 py-1"
            >
              FAQ
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-2">
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 text-center flex items-center justify-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Register</span>
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0c2461] text-white text-center flex items-center justify-center gap-1"
            >
              <Lock className="w-3.5 h-3.5 text-sky-300" />
              <span>Portal Login</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
