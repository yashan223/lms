"use client";

import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RolePreviewModal } from "@/components/landing/RolePreviewModal";
import { UserRole } from "@/lib/types";
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Play,
  Award,
  Video,
  BookOpen,
  BarChart3,
  Users,
  Settings,
  ArrowRight,
  School,
} from "lucide-react";

export function RoleTabsShowcase() {
  const [activeTab, setActiveTab] = useState<UserRole>("STUDENT");
  const [modalRole, setModalRole] = useState<UserRole>("STUDENT");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = (role: UserRole) => {
    setModalRole(role);
    setIsModalOpen(true);
  };

  return (
    <section id="roles" className="py-20 bg-slate-50/50 border-b border-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-3 font-semibold">
            Architected for Every Stakeholder
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            One Unified Platform.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">
              Three Dedicated Portals.
            </span>
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            EduPulse delivers specialized workspaces designed specifically for scholars, faculty educators, and institutional deans.
          </p>
        </div>

        {/* Interactive Tabs */}
        <Tabs
          defaultValue="STUDENT"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as UserRole)}
          className="w-full"
        >
          <div className="flex justify-center mb-8">
            <TabsList className="bg-white border border-blue-200/80 p-1.5 shadow-sm rounded-2xl">
              <TabsTrigger
                value="STUDENT"
                className="gap-2 px-5 py-2.5 rounded-xl data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-bold"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Student Hub</span>
              </TabsTrigger>

              <TabsTrigger
                value="INSTRUCTOR"
                className="gap-2 px-5 py-2.5 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold"
              >
                <Sparkles className="w-4 h-4" />
                <span>Faculty Studio</span>
              </TabsTrigger>

              <TabsTrigger
                value="ADMIN"
                className="gap-2 px-5 py-2.5 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Dean & Admin Console</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 1. STUDENT TAB CONTENT */}
          <TabsContent value="STUDENT">
            <div className="bg-white rounded-3xl border border-blue-100 p-6 sm:p-10 shadow-xl shadow-blue-500/5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <Badge variant="roleStudent">Student Portal</Badge>
                    <span className="text-xs text-slate-500">Learner-first Experience</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Immersive, distraction-free learning with an intelligent study tutor.
                  </h3>

                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    Designed to maximize academic retention. Scholars receive synchronized video playback, structured study notes, in-lecture bookmarks, and instant conceptual answers.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        title: "HD Video Lecture Player with Auto-Resume",
                        desc: "Seamlessly continue across tablet, smartphone, and desktop.",
                      },
                      {
                        title: "24/7 AI Academic Tutor",
                        desc: "Get instant conceptual summaries and guided study notes in real-time.",
                      },
                      {
                        title: "Accredited Verifiable Credentials",
                        desc: "Digitally certified accreditation shareable on LinkedIn and academic portfolios.",
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <Button
                      variant="default"
                      onClick={() => handleOpenModal("STUDENT")}
                      className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25"
                    >
                      <span>Explore Student Portal Demo</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>

                {/* Visual Mockup for Student */}
                <div className="lg:col-span-6 bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-inner">
                  {/* Video player simulation */}
                  <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden shadow-md flex items-center justify-center group cursor-pointer">
                    <img
                      src="https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&auto=format&fit=crop&q=80"
                      alt="Lecture Preview"
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <div className="absolute w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <span className="font-semibold truncate mr-2">
                        Lecture 14: Carbon Accounting & International Treaties
                      </span>
                      <span className="bg-black/50 px-2 py-0.5 rounded text-[11px] font-mono">
                        14:22 / 28:00
                      </span>
                    </div>
                  </div>

                  {/* Student Quick Tabs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        Academic Notes
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Synchronized lecture transcript and highlighted bibliography.
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        Skill Milestone
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Environmental Economics Certificate prerequisite completed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 2. INSTRUCTOR TAB CONTENT */}
          <TabsContent value="INSTRUCTOR">
            <div className="bg-white rounded-3xl border border-blue-100 p-6 sm:p-10 shadow-xl shadow-blue-500/5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <Badge variant="roleInstructor">Faculty Studio</Badge>
                    <span className="text-xs text-slate-500">Educator Workspace</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Design, publish, and evaluate world-class curriculum with ease.
                  </h3>

                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    A comprehensive academic workspace that allows faculty to upload lecture modules, configure automated grading rubrics, broadcast live seminars, and monitor student engagement.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        title: "Interactive Syllabus & Curriculum Builder",
                        desc: "Easily organize lecture modules, reading materials, and homework assignments.",
                      },
                      {
                        title: "Automated Rubrics & Exam Evaluator",
                        desc: "Save hours of manual grading with instant structured student evaluations.",
                      },
                      {
                        title: "Honorarium Tracking & Student Analytics",
                        desc: "Monitor academic progress graphs, student retention, and monthly honorarium payouts.",
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <Button
                      variant="default"
                      onClick={() => handleOpenModal("INSTRUCTOR")}
                      className="bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
                    >
                      <span>Explore Faculty Studio Demo</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>

                {/* Visual Mockup for Instructor */}
                <div className="lg:col-span-6 bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-inner">
                  {/* Instructor Studio Dashboard Preview */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          EP
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Course Studio: Climate Economics
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Status: Published • 48 Lectures
                          </div>
                        </div>
                      </div>
                      <Badge variant="success">Active Enrollment</Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-blue-600" />
                          Module 1: Foundations of Global Ecological Policy
                        </span>
                        <span className="text-slate-400 text-[11px]">8 Lectures</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-blue-600" />
                          Module 2: Carbon Markets & Strategic Finance
                        </span>
                        <span className="text-slate-400 text-[11px]">12 Lectures</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        Monthly Honorarium
                      </div>
                      <div className="text-lg font-black text-slate-900">$14,850</div>
                      <p className="text-[10px] text-emerald-600 font-semibold">+22% this term</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        Active Scholars
                      </div>
                      <div className="text-lg font-black text-slate-900">38,400+</div>
                      <p className="text-[10px] text-slate-500">4.96 ⭐ student rating</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 3. ADMIN TAB CONTENT */}
          <TabsContent value="ADMIN">
            <div className="bg-white rounded-3xl border border-blue-100 p-6 sm:p-10 shadow-xl shadow-blue-500/5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <Badge variant="roleAdmin">Admin & Dean Console</Badge>
                    <span className="text-xs text-slate-500">Governance & Quality</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Total institutional governance and multi-campus accreditation.
                  </h3>

                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    Empower institutional leaders and deans with role-based access control (RBAC), multi-campus student records sync, course quality accreditation pipelines, and audit logs.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        title: "Role-Based Access Control (RBAC)",
                        desc: "Granular permissions for professors, teaching assistants, and department chairs.",
                      },
                      {
                        title: "Course QA & Academic Accreditation Queue",
                        desc: "Review syllabus standards, academic citations, and compliance before publishing.",
                      },
                      {
                        title: "Institutional Analytics & SIS Synchronization",
                        desc: "Full integration with campus learning records and student information systems.",
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <Button
                      variant="default"
                      onClick={() => handleOpenModal("ADMIN")}
                      className="bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25"
                    >
                      <span>Explore Admin Console Demo</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>

                {/* Visual Mockup for Admin */}
                <div className="lg:col-span-6 bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-inner">
                  {/* Admin Command Console Preview */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          ADM
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Academic Governance Console
                          </div>
                          <div className="text-[10px] text-slate-500">
                            180 Partner Campuses • SIS Synchronized
                          </div>
                        </div>
                      </div>
                      <Badge variant="roleAdmin">SOC2 Compliant</Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Platform Administrator
                        </span>
                        <span className="text-indigo-700 font-mono text-[11px]">admin@edupulse.io</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-blue-600" />
                          Institutional Accreditation
                        </span>
                        <span className="text-emerald-600 font-semibold text-[11px]">Verified Active</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        Faculty Chairs
                      </div>
                      <div className="text-lg font-black text-slate-900">185 Active</div>
                      <p className="text-[10px] text-slate-500">4 QA pending</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Settings className="w-4 h-4 text-slate-600" />
                        System Reliability
                      </div>
                      <div className="text-lg font-black text-slate-900">99.99%</div>
                      <p className="text-[10px] text-emerald-600 font-semibold">Zero incidents</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Role Preview Modal */}
      <RolePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultRole={modalRole}
      />
    </section>
  );
}
