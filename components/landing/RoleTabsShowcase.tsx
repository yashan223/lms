"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/lib/types";
import {
  GraduationCap,
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

  return (
    <section id="roles" className="py-20 bg-slate-50/50 border-b border-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            One Unified Platform.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">
              Three Dedicated Portals.
            </span>
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            EduPulse delivers specialized workspaces designed specifically for students, tutors, and system administrators.
          </p>
        </div>

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
                className="gap-2 px-5 py-2.5 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Student Hub</span>
              </TabsTrigger>

              <TabsTrigger
                value="TUTOR"
                className="gap-2 px-5 py-2.5 rounded-xl data-[state=active]:bg-[#0c2461] data-[state=active]:text-white font-bold"
              >
                <BookOpen className="w-4 h-4" />
                <span>Tutor Studio</span>
              </TabsTrigger>

              <TabsTrigger
                value="ADMIN"
                className="gap-2 px-5 py-2.5 rounded-xl data-[state=active]:bg-blue-700 data-[state=active]:text-white font-bold"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>System Admin Console</span>
              </TabsTrigger>
            </TabsList>
          </div>

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
                    Designed to maximize academic retention. Students receive synchronized video playback, structured study notes, in-class bookmarks, and instant conceptual answers.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        title: "HD Video Class Player with Auto-Resume",
                        desc: "Seamlessly continue across tablet, smartphone, and desktop.",
                      },
                      {
                        title: "24/7 Academic Tutor & Token Hours",
                        desc: "Book 1-on-1 hours with expert tutors and manage learning credits.",
                      },
                      {
                        title: "Accredited Verifiable Credentials",
                        desc: "Digitally certified accreditation shareable on LinkedIn and academic portfolios.",
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
                    <Link
                      href="/classes"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
                    >
                      <span>Explore Individual Classes</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-inner">
                  <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden shadow-md flex items-center justify-center group cursor-pointer">
                    <img
                      src="https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&auto=format&fit=crop&q=80"
                      alt="Class Preview"
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <span className="font-semibold truncate mr-2">
                        Class 14: Carbon Accounting & International Treaties
                      </span>
                      <span className="bg-black/50 px-2 py-0.5 rounded text-[11px] font-mono">
                        14:22 / 28:00
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        Academic Notes
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Synchronized class transcript and highlighted bibliography.
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-blue-600" />
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

          <TabsContent value="TUTOR">
            <div className="bg-white rounded-3xl border border-blue-100 p-6 sm:p-10 shadow-xl shadow-blue-500/5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <Badge variant="roleTutor">Tutor Studio</Badge>
                    <span className="text-xs text-slate-500">Tutor Workspace</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Design, publish, and teach world-class curriculum with ease.
                  </h3>

                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    A comprehensive academic workspace that allows tutors to curate syllabus modules, host live video classes, manage 1-on-1 consultations, and track student mastery.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        title: "Interactive Syllabus & Curriculum Builder",
                        desc: "Easily organize class modules, reading materials, and worked solution packs.",
                      },
                      {
                        title: "Material & Handbook Publisher",
                        desc: "Easily distribute formula sheets, class handouts, and practice sets.",
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
                    <Link
                      href="/classes"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
                    >
                      <span>Explore Academic Curriculum</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-inner">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          EP
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Class Studio: Climate Economics
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Status: Published • 48 Lessons
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
                        <span className="text-slate-400 text-[11px]">8 Lessons</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-blue-600" />
                          Module 2: Carbon Markets & Strategic Finance
                        </span>
                        <span className="text-slate-400 text-[11px]">12 Lessons</span>
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
                      <p className="text-[10px] text-blue-600 font-semibold">+22% this term</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-600" />
                        Active Students
                      </div>
                      <div className="text-lg font-black text-slate-900">38,400+</div>
                      <p className="text-[10px] text-slate-500">Across all qualifications</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ADMIN">
            <div className="bg-white rounded-3xl border border-blue-100 p-6 sm:p-10 shadow-xl shadow-blue-500/5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <Badge variant="roleAdmin">System Admin Console</Badge>
                    <span className="text-xs text-slate-500">Governance & Quality</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Total institutional governance and multi-campus accreditation.
                  </h3>

                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    Empower system administrators and institutional leaders with role-based access control (RBAC), multi-campus student records sync, class quality accreditation pipelines, and audit logs.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        title: "Role-Based Access Control (RBAC)",
                        desc: "Granular permissions for professors, teaching assistants, and department chairs.",
                      },
                      {
                        title: "Class QA & Academic Accreditation Queue",
                        desc: "Review syllabus standards, academic citations, and compliance before publishing.",
                      },
                      {
                        title: "Institutional Analytics & SIS Synchronization",
                        desc: "Full integration with campus learning records and student information systems.",
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
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold shadow-md shadow-blue-900/25 transition-all"
                    >
                      <span>Join as Institutional Partner</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-inner">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
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
                      <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100 text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          Platform Administrator
                        </span>
                        <span className="text-blue-700 font-mono text-[11px]">admin@edupulse.uk</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-blue-600" />
                          Institutional Accreditation
                        </span>
                        <span className="text-blue-600 font-semibold text-[11px]">Verified Active</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-600" />
                        Active Tutors
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
                      <p className="text-[10px] text-blue-600 font-semibold">Zero incidents</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
