"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  GraduationCap,
  Lock,
  Menu,
  X,
  UserPlus,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  BookOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

export function Navbar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [confirmLogoutModalOpen, setConfirmLogoutModalOpen] = useState(false);
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showNavLogo, setShowNavLogo] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 24);

      if (pathname === "/") {
        const heroEl = document.getElementById("hero");
        if (heroEl) {
          const heroRect = heroEl.getBoundingClientRect();
          // Hide top nav logo while hero section is in view
          setShowNavLogo(heroRect.bottom <= 120);
        } else {
          setShowNavLogo(scrollY > 380);
        }
      } else {
        // On non-home routes, always display the nav logo
        setShowNavLogo(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  useEffect(() => {
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

    if (typeof window !== "undefined") {
      const sanitizeHash = () => {
        const rawHash = window.location.hash;
        if (rawHash && (rawHash.match(/#/g) || []).length > 1) {
          const parts = rawHash.split("#").filter(Boolean);
          const validId = parts[0] || "";
          if (validId) {
            window.history.replaceState(null, "", `${window.location.pathname}#${validId}`);
            const el = document.getElementById(validId);
            if (el) {
              setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 50);
            }
          }
        }
      };

      sanitizeHash();
      window.addEventListener("hashchange", sanitizeHash);
      return () => window.removeEventListener("hashchange", sanitizeHash);
    }
  }, []);

  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      e.preventDefault();
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      window.history.replaceState(null, "", `/#${targetId}`);
      setMobileMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Sign out error:", err);
    }
    document.cookie = "edupulse_user_role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "edupulse_user_email=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "edupulse_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setUserRole(null);
    setUserEmail(null);
    setConfirmLogoutModalOpen(false);
    window.location.href = "/";
  };

  return (
    <>
      {/* ─── Main Navigation Header (Dynamic Elevation on Scroll) ─── */}
      <header
        className={`sticky top-0 w-full z-40 transition-all duration-300 relative ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-md shadow-blue-900/5 border-b border-blue-200/60"
            : "bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200/80"
        }`}
      >
        <div
          className={`max-w-[1440px] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
            isScrolled ? "min-h-[68px]" : "min-h-[76px]"
          }`}
        >
          
          {/* Brand Logo (hidden when on hero section) */}
          <Link
            href="/"
            className={`flex items-center gap-2 group py-1.5 sm:py-2 transition-all duration-300 ${
              showNavLogo
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
            aria-label="PulseEdu Home"
          >
            <img
              src="/logo-wide.png"
              alt="PulseEdu"
              className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          {/* Center Navigation Links (Edunex Style) */}
          <nav className="hidden xl:flex items-center gap-7 text-xs sm:text-sm font-bold font-heading text-[#0c2461]">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 transition-colors py-1 font-extrabold"
            >
              Home
            </Link>
            <Link
              href="/#courses"
              onClick={(e) => handleAnchorClick(e, "courses")}
              className="text-[#0c2461] hover:text-blue-600 transition-colors py-1"
            >
              Classes
            </Link>
            <Link
              href="/#tutors"
              onClick={(e) => handleAnchorClick(e, "tutors")}
              className="text-[#0c2461] hover:text-blue-600 transition-colors py-1"
            >
              Tutors
            </Link>
            <Link
              href="/#about"
              onClick={(e) => handleAnchorClick(e, "about")}
              className="text-[#0c2461] hover:text-blue-600 transition-colors py-1"
            >
              About Us
            </Link>
            <Link
              href="/#faq"
              onClick={(e) => handleAnchorClick(e, "faq")}
              className="text-[#0c2461] hover:text-blue-600 transition-colors py-1"
            >
              FAQs
            </Link>
          </nav>

          {/* Right Action Area */}
          <div className="hidden lg:flex items-center gap-3">
            {userRole ? (
              <div className="flex items-center gap-2.5">
                {userRole === "ADMIN" ? (
                  <Link
                    href="/admin"
                    title="Admin Command Console"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 hover:border-blue-300 text-blue-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs group"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-600 transition-transform group-hover:scale-110" />
                    <span>Admin Console</span>
                  </Link>
                ) : userRole === "TUTOR" || userRole === "INSTRUCTOR" ? (
                  <Link
                    href="/tutor"
                    title="Tutor Studio"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 hover:border-blue-300 text-blue-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs group"
                  >
                    <GraduationCap className="w-4 h-4 text-blue-600 transition-transform group-hover:scale-110" />
                    <span>Tutor Studio</span>
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    title="My Dashboard"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs group"
                  >
                    <LayoutDashboard className="w-4 h-4 text-blue-600 transition-transform group-hover:scale-110" />
                    <span>Dashboard</span>
                  </Link>
                )}

                <button
                  onClick={() => setConfirmLogoutModalOpen(true)}
                  title="Sign Out"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 text-xs font-bold transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500 transition-transform group-hover:scale-110" />
                  <span className="hidden xl:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-[#0c2461] hover:text-blue-600 transition-colors"
                >
                  Log in
                </Link>

                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all hover:scale-105 group"
                >
                  <span>Register</span>
                  <span className="w-6 h-6 rounded-full bg-white text-blue-600 flex items-center justify-center group-hover:translate-x-0.5 transition-transform shadow-xs">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex lg:hidden items-center gap-2">
            <Link
              href={userRole === "ADMIN" ? "/admin" : (userRole === "TUTOR" || userRole === "INSTRUCTOR") ? "/tutor" : userRole ? "/dashboard" : "/login"}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs whitespace-nowrap"
            >
              {userRole === "ADMIN" ? "Admin" : (userRole === "TUTOR" || userRole === "INSTRUCTOR") ? "Studio" : userRole ? "Dashboard" : "Log In"}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:text-slate-900 focus:outline-none cursor-pointer"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 px-5 py-4 space-y-4 animate-in slide-in-from-top-2 shadow-lg">
            <nav className="flex flex-col space-y-2.5 text-sm font-bold font-heading text-[#0c2461]">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-blue-600 py-1"
              >
                Home
              </Link>
              <Link
                href="/#courses"
                onClick={(e) => handleAnchorClick(e, "courses")}
                className="hover:text-blue-600 py-1"
              >
                Classes
              </Link>
              <Link
                href="/#tutors"
                onClick={(e) => handleAnchorClick(e, "tutors")}
                className="hover:text-blue-600 py-1"
              >
                Tutors
              </Link>
              <Link
                href="/#about"
                onClick={(e) => handleAnchorClick(e, "about")}
                className="hover:text-blue-600 py-1"
              >
                About Us
              </Link>
              <Link
                href="/#faq"
                onClick={(e) => handleAnchorClick(e, "faq")}
                className="hover:text-blue-600 py-1"
              >
                FAQs
              </Link>
            </nav>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {!userRole ? (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 text-center text-xs font-bold text-[#0c2461] border border-slate-200 rounded-full"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 text-center text-xs font-bold bg-blue-600 text-white rounded-full shadow-sm"
                  >
                    Register
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setConfirmLogoutModalOpen(true);
                  }}
                  className="w-full py-2 text-center text-xs font-bold text-red-600 bg-red-50 rounded-full"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmLogoutModalOpen}
        title="Sign Out"
        description="Are you sure you want to sign out of your EduPulse account?"
        confirmText="Sign Out"
        cancelText="Stay Signed In"
        variant="danger"
        onConfirm={handleSignOut}
        onClose={() => setConfirmLogoutModalOpen(false)}
      />
    </>
  );
}
