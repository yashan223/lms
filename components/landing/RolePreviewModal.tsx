"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/lib/types";
import {
  ShieldCheck,
  GraduationCap,
  Sparkles,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  UserCheck,
} from "lucide-react";

interface RolePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
}

export function RolePreviewModal({
  isOpen,
  onClose,
  defaultRole = "ADMIN",
}: RolePreviewModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [copied, setCopied] = useState<string | null>(null);

  const roleDetails = {
    ADMIN: {
      title: "System Administrator Console",
      badge: "Institutional Governance",
      badgeVariant: "roleAdmin" as const,
      icon: ShieldCheck,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
      email: "admin@edupulse.uk",
      password: "AdminPass123!",
      credentialLabel: "Institutional Admin Account",
      description:
        "Manage multi-campus university institutions, oversee faculty accreditation, review course syllabus submissions, and manage RBAC permissions.",
      features: [
        "Multi-Campus University Oversight",
        "Curriculum QA & Accreditation Queue",
        "Institutional Learning Analytics",
        "Role-Based Access Control (RBAC)",
      ],
      statSummary: "180+ Partner Campuses • 4,200 Courses Active",
    },
    INSTRUCTOR: {
      title: "Faculty & Educator Studio",
      badge: "Curriculum Creator",
      badgeVariant: "roleInstructor" as const,
      icon: Sparkles,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      email: "tutor@edupulse.uk",
      password: "InstructorPass123!",
      credentialLabel: "Faculty Educator Account",
      description:
        "Upload high-definition lecture modules, configure automated grading rubrics, monitor student completion heatmaps, and track monthly honorarium payouts.",
      features: [
        "Interactive Syllabus & Module Builder",
        "Automated Rubrics & Assignment Grading",
        "Student Comprehension & Progress Matrices",
        "Honorarium & Compensation Dashboard",
      ],
      statSummary: "38.4k Scholars Enrolled • 4.96 Avg Rating",
    },
    STUDENT: {
      title: "Scholar & Student Experience",
      badge: "Interactive Learning",
      badgeVariant: "roleStudent" as const,
      icon: GraduationCap,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      email: "student@edupulse.uk",
      password: "StudentPass123!",
      credentialLabel: "Student Account",
      description:
        "Experience seamless video lecture streaming, participate in seminar discussions, get 24/7 assistance from the AI Study Tutor, and earn verifiable credentials.",
      features: [
        "Full-Screen Interactive Lecture Player",
        "24/7 AI Academic Study Tutor",
        "Synchronized Note-Taking & Discussion Boards",
        "Verifiable LinkedIn Shareable Certificates",
      ],
      statSummary: "6 Enrolled Courses • 4 Certificates Earned",
    },
  };

  const current = roleDetails[selectedRole];
  const IconComponent = current.icon;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-blue-100 shadow-2xl bg-white">
        {/* Header with Role Selector */}
        <div className="bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50 p-6 border-b border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Role Portal Switcher & Demo
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Experience EduPulse through any of the 3 dedicated roles
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* 3 Role Switcher Pills */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80">
            {(["ADMIN", "INSTRUCTOR", "STUDENT"] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  selectedRole === role
                    ? "bg-white text-blue-700 shadow-sm border border-blue-100 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                {role === "ADMIN" && <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />}
                {role === "INSTRUCTOR" && <Sparkles className="w-3.5 h-3.5 text-blue-600" />}
                {role === "STUDENT" && <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />}
                {role.charAt(0) + role.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-5 bg-white">
          {/* Active Role Banner */}
          <div
            className={`p-4 rounded-2xl border ${current.borderColor} ${current.bgColor} flex items-start gap-4`}
          >
            <div className={`p-2.5 rounded-xl bg-white shadow-sm ${current.color}`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-slate-900 text-sm">
                  {current.title}
                </h4>
                <Badge variant={current.badgeVariant}>{current.badge}</Badge>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                {current.description}
              </p>
              <div className="text-[11px] font-semibold text-slate-700 bg-white/70 px-2.5 py-1 rounded-md inline-block border border-slate-200/50">
                📊 {current.statSummary}
              </div>
            </div>
          </div>

          {/* Capabilities List */}
          <div>
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Role Capabilities & Modules:
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {current.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Demo Credentials Box */}
          <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                {current.credentialLabel}
              </span>
              <span className="text-[10px] text-blue-600 font-medium">
                Demo Access
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-blue-100">
                <span className="text-slate-500 truncate mr-2">{current.email}</span>
                <button
                  onClick={() => copyToClipboard(current.email, "email")}
                  className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold shrink-0"
                >
                  {copied === "email" ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-blue-100">
                <span className="text-slate-500 font-mono truncate mr-2">
                  {current.password}
                </span>
                <button
                  onClick={() => copyToClipboard(current.password, "password")}
                  className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold shrink-0"
                >
                  {copied === "password" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close Preview
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                onClose();
                if (selectedRole === "ADMIN") {
                  window.location.href = "/admin";
                } else {
                  window.location.href = "/dashboard";
                }
              }}
              className="gap-1.5"
            >
              <span>Launch {selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()} Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
