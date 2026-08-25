"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  MessageSquareLock,
  Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { EncryptedChatDrawer } from "@/components/chat/EncryptedChatDrawer";

export function Navbar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name?: string; email?: string; role?: string } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [confirmLogoutModalOpen, setConfirmLogoutModalOpen] = useState(false);

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

  useEffect(() => {
    if (userEmail || userRole) {
      fetch("/api/dashboard")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            setCurrentUser(data.user);
          }
        })
        .catch(() => {});
    }
  }, [userEmail, userRole]);

  const handleSignOut = () => {
    document.cookie = "edupulse_user_role=; path=/; max-age=0";
    document.cookie = "edupulse_user_email=; path=/; max-age=0";
    setUserRole(null);
    setUserEmail(null);
    setConfirmLogoutModalOpen(false);
    router.push("/");
    router.refresh();
  };

  const displayName = useMemo(() => {
    if (!userEmail) {
      return userRole ? `${userRole.charAt(0) + userRole.slice(1).toLowerCase()}` : "Account";
    }
    const username = userEmail.split("@")[0];
    return username
      .split(/[._-]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }, [userEmail, userRole]);

  const roleConfig = useMemo(() => {
    switch (userRole?.toUpperCase()) {
      case "ADMIN":
        return {
          label: "System Admin",
          shortRole: "Admin",
          badgeVariant: "roleAdmin" as const,
          avatarGradient: "from-indigo-600 via-purple-600 to-pink-600",
          icon: ShieldCheck,
        };
      case "INSTRUCTOR":
        return {
          label: "Faculty Instructor",
          shortRole: "Instructor",
          badgeVariant: "roleInstructor" as const,
          avatarGradient: "from-blue-600 via-indigo-600 to-blue-700",
          icon: BookOpen,
        };
      case "STUDENT":
      default:
        return {
          label: "Student",
          shortRole: "Student",
          badgeVariant: "roleStudent" as const,
          avatarGradient: "from-emerald-500 via-teal-600 to-cyan-700",
          icon: GraduationCap,
        };
    }
  }, [userRole]);

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
            href="/#faq"
            className="text-slate-600 hover:text-blue-700 transition-colors py-1"
          >
            FAQ
          </Link>
        </nav>

        {/* Right Action Portal Buttons */}
        <div className="hidden md:flex items-center gap-2.5">
          {userRole ? (
            <div className="flex items-center gap-2">
              {/* Quick Action Icons */}
              {userRole === "ADMIN" ? (
                <Link
                  href="/admin"
                  title="Admin Command Console"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50/80 hover:bg-purple-100 hover:border-purple-300 text-purple-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs group"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600 transition-transform group-hover:scale-110" />
                  <span>Admin Console</span>
                </Link>
              ) : userRole === "INSTRUCTOR" ? (
                <Link
                  href="/tutor"
                  title="Faculty Tutor Studio"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 hover:border-blue-300 text-blue-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs group"
                >
                  <GraduationCap className="w-4 h-4 text-blue-600 transition-transform group-hover:scale-110" />
                  <span>Tutor Studio</span>
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  title="My Dashboard"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs group"
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-600 transition-transform group-hover:scale-110" />
                  <span className="hidden xl:inline">Dashboard</span>
                </Link>
              )}

              {/* Notifications Center */}
              <NotificationBell userRole={userRole || undefined} />

              {/* End-to-End Encrypted Chat Launcher */}
              <button
                onClick={() => setIsChatOpen(true)}
                title="End-to-End Encrypted Academic Chat"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
              >
                <MessageSquareLock className="w-4 h-4 text-indigo-600 transition-transform group-hover:scale-110" />
                <span className="hidden xl:inline">Messages</span>
              </button>

              {/* Sign Out Icon Button */}
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
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs"
          >
            {userRole ? "Dashboard" : "Sign In"}
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-700 hover:text-slate-900 focus:outline-none cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-5 py-4 space-y-4 animate-in slide-in-from-top-2 shadow-lg">
          {/* Mobile User Profile Header if logged in */}
          {userRole && (
            <Link
              href={userRole === "ADMIN" ? "/admin" : "/dashboard"}
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 border border-slate-200/80 flex items-center gap-3 hover:border-blue-300 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${roleConfig.avatarGradient} text-white flex items-center justify-center text-sm font-black shadow-xs ring-2 ring-white shrink-0`}
              >
                {userEmail ? userEmail.charAt(0).toUpperCase() : (userRole?.charAt(0) || "U")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {displayName}
                  </span>
                  <Badge variant={roleConfig.badgeVariant} className="text-[9px] px-1.5 py-0 font-bold">
                    {roleConfig.shortRole}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {userEmail || `${userRole?.toLowerCase()}@edupulse.uk`}
                </p>
              </div>
            </Link>
          )}

          <div className="flex flex-col gap-2 text-xs font-bold tracking-wider uppercase">
            {userRole && (
              <Link
                href={userRole === "ADMIN" ? "/admin" : "/dashboard"}
                onClick={() => setMobileMenuOpen(false)}
                className="text-purple-700 hover:text-purple-800 py-1.5 px-2 rounded-lg hover:bg-purple-50/50 font-black"
              >
                {userRole === "ADMIN" ? "ADMIN COMMAND CONSOLE" : "MY DASHBOARD"}
              </Link>
            )}
            <Link
              href="/courses"
              onClick={() => setMobileMenuOpen(false)}
              className="text-blue-700 hover:text-blue-800 py-1.5 px-2 rounded-lg hover:bg-blue-50/50"
            >
              COURSES
            </Link>
            <Link
              href="/#about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-700 hover:text-blue-700 py-1.5 px-2 rounded-lg hover:bg-slate-50"
            >
              ABOUT
            </Link>
            <Link
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-700 hover:text-blue-700 py-1.5 px-2 rounded-lg hover:bg-slate-50"
            >
              FAQ
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-2">
            {userRole ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsChatOpen(true);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-center flex items-center justify-center gap-2 border border-indigo-200 cursor-pointer transition-colors"
                >
                  <MessageSquareLock className="w-4 h-4 text-indigo-600" />
                  <span>Encrypted Messages</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setConfirmLogoutModalOpen(true);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100/80 text-center flex items-center justify-center gap-2 border border-red-200 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 text-center flex items-center justify-center gap-1.5 hover:bg-slate-50"
                >
                  <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Register</span>
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white text-center flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5 text-white" />
                  <span>Sign In</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmLogoutModalOpen}
        onClose={() => setConfirmLogoutModalOpen(false)}
        onConfirm={handleSignOut}
        variant="danger"
        title="Sign Out of EduPulse?"
        description="Are you sure you want to end your session? You will need to sign in again to access your active course materials, syllabus vaults, and study guides."
        confirmText="Sign Out"
        cancelText="Stay Signed In"
      />

      {/* End-to-End Encrypted Chat Drawer */}
      {currentUser && (
        <EncryptedChatDrawer
          currentUser={currentUser}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </header>
  );
}
