"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Lock,
  Menu,
  X,
  UserPlus,
  ShieldCheck,
  User,
  LayoutDashboard,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    // Read session cookies
    if (typeof document !== "undefined") {
      const matchRole = document.cookie.match(/edupulse_user_role=([^;]+)/);
      const matchEmail = document.cookie.match(/edupulse_user_email=([^;]+)/);
      if (matchRole) {
        setUserRole(decodeURIComponent(matchRole[1]));
      }
      if (matchEmail) {
        setUserEmail(decodeURIComponent(matchEmail[1]));
      }
    }
  }, []);

  const handleSignOut = () => {
    document.cookie = "edupulse_user_role=; path=/; max-age=0";
    document.cookie = "edupulse_user_email=; path=/; max-age=0";
    setUserRole(null);
    setUserEmail(null);
    setUserDropdownOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="w-full z-40 bg-white/95 backdrop-blur-md text-slate-800 shadow-2xs relative border-b border-slate-200">
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

        {/* Center Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-xs font-bold tracking-widest uppercase">
          <Link
            href="/courses"
            className="text-blue-700 hover:text-blue-800 transition-colors py-1 font-black"
          >
            COURSES
          </Link>
          <Link
            href="/#about"
            className="text-slate-600 hover:text-blue-700 transition-colors py-1"
          >
            ABOUT
          </Link>
          <Link
            href="/dashboard"
            className="text-slate-600 hover:text-blue-700 transition-colors py-1"
          >
            DASHBOARD
          </Link>
          <Link
            href="/#faq"
            className="text-slate-600 hover:text-blue-700 transition-colors py-1"
          >
            FAQ
          </Link>
        </nav>

        {/* Right Action Portal Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {userRole ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-xs font-bold text-slate-800 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {userRole.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="leading-tight text-slate-900">{userEmail?.split("@")[0] || "Account"}</div>
                  <div className="text-[10px] text-blue-600 font-semibold">{userRole}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Signed in as</span>
                    <p className="text-xs font-bold text-slate-800 truncate">{userEmail || userRole}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-blue-600" />
                    <span>My Dashboard</span>
                  </Link>
                  {userRole === "ADMIN" && (
                    <Link
                      href="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Admin Console</span>
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer border-t border-slate-100"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/register"
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-800 hover:bg-blue-50/80 border border-slate-300 transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>Register</span>
              </Link>

              <Link
                href="/login"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-white" />
                <span>Sign In</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          <Link
            href={userRole ? "/dashboard" : "/login"}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white"
          >
            {userRole ? "Dashboard" : "Sign In"}
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
              href="/courses"
              onClick={() => setMobileMenuOpen(false)}
              className="text-blue-700 py-1"
            >
              COURSES
            </Link>
            <Link
              href="/#about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-700 hover:text-blue-700 py-1"
            >
              ABOUT
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-700 hover:text-blue-700 py-1"
            >
              DASHBOARD
            </Link>
            {userRole === "ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-700 hover:text-blue-700 py-1"
              >
                ADMIN CONSOLE
              </Link>
            )}
            <Link
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-700 hover:text-blue-700 py-1"
            >
              FAQ
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-2">
            {userRole ? (
              <button
                onClick={handleSignOut}
                className="col-span-2 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-700 text-center flex items-center justify-center gap-1 border border-red-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <>
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
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white text-center flex items-center justify-center gap-1"
                >
                  <Lock className="w-3.5 h-3.5 text-white" />
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
