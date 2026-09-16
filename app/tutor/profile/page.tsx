"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserCheck,
  Camera,
  Upload,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
  School,
  BookOpen,
  ShieldCheck,
  Award,
  FileText,
  Globe,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Eye,
  Phone,
  Mail,
  DollarSign,
  Clock,
  Briefcase,
  Share2,
  Check,
  RefreshCw,
  BadgeCheck,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface AcademicDegree {
  id: string;
  degree: string;
  institution: string;
  year: string;
  honors?: string;
}

interface AcademicCertification {
  id: string;
  title: string;
  authority: string;
  year: string;
}

function TutorProfileContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tutor, setTutor] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile Form States
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [degrees, setDegrees] = useState<AcademicDegree[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<AcademicCertification[]>([]);
  const [experienceYears, setExperienceYears] = useState("10+ Years");
  const [hourlyRate, setHourlyRate] = useState("65");
  const [officeHours, setOfficeHours] = useState("Mon - Fri: 4:00 PM - 8:00 PM GMT");
  const [linkedin, setLinkedin] = useState("https://linkedin.com");
  const [researchGate, setResearchGate] = useState("https://researchgate.net");
  const [website, setWebsite] = useState("https://edupulse.uk");

  // Temporary Form Inputs for adding items
  const [newDegreeTitle, setNewDegreeTitle] = useState("");
  const [newDegreeInst, setNewDegreeInst] = useState("");
  const [newDegreeYear, setNewDegreeYear] = useState(new Date().getFullYear().toString());
  const [newDegreeHonors, setNewDegreeHonors] = useState("");

  const [newSpecTag, setNewSpecTag] = useState("");

  const [newCertTitle, setNewCertTitle] = useState("");
  const [newCertAuth, setNewCertAuth] = useState("");
  const [newCertYear, setNewCertYear] = useState(new Date().getFullYear().toString());

  // Load Tutor Profile
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tutor");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load tutor profile");
      }
      const data = await res.json();
      if (data.tutor) {
        setTutor(data.tutor);
        setName(data.tutor.name || "");
        setHeadline(data.tutor.headline || "Senior Faculty Lecturer");
        setPhone(data.tutor.phone || "");
        setAvatar(data.tutor.avatar || "");

        let parsedAbout = "Senior Faculty Educator specializing in London A/L & O/L specifications.";
        let parsedDegrees: AcademicDegree[] = [
          {
            id: "deg-1",
            degree: "M.Sc. in Pure Mathematics & Mathematical Physics",
            institution: "Imperial College London",
            year: "2016",
            honors: "First Class Distinction",
          },
          {
            id: "deg-2",
            degree: "B.Sc. (Hons) in Pure Mathematics & Statistics",
            institution: "University of Warwick",
            year: "2013",
            honors: "First Class Honours",
          },
        ];
        let parsedSpecs: string[] = [
          "Pure Mathematics (P1, P2, P3, P4)",
          "Mechanics (M1, M2)",
          "Statistics (S1, S2)",
          "Further Pure (FP1, FP2)",
          "Edexcel International A/L",
          "Cambridge CIE A/L",
        ];
        let parsedCerts: AcademicCertification[] = [
          {
            id: "cert-1",
            title: "Pearson Edexcel Certified Senior Lead Examiner",
            authority: "Pearson Education Ltd (UK)",
            year: "2019",
          },
          {
            id: "cert-2",
            title: "Cambridge Assessment International Education Registered Examiner",
            authority: "Cambridge University Press & Assessment",
            year: "2021",
          },
        ];
        let parsedExp = "10+ Years";
        let parsedRate = "65";
        let parsedHours = "Mon - Fri: 4:00 PM - 8:00 PM GMT";
        let parsedLinkedin = "https://linkedin.com";
        let parsedResearchGate = "https://researchgate.net";
        let parsedWebsite = "https://edupulse.uk";

        if (data.tutor.bio) {
          try {
            const parsed = JSON.parse(data.tutor.bio);
            if (typeof parsed === "object" && parsed !== null) {
              if (parsed.about) parsedAbout = parsed.about;
              if (Array.isArray(parsed.degrees) && parsed.degrees.length > 0) {
                parsedDegrees = parsed.degrees;
              }
              if (Array.isArray(parsed.specializations) && parsed.specializations.length > 0) {
                parsedSpecs = parsed.specializations;
              }
              if (Array.isArray(parsed.certifications) && parsed.certifications.length > 0) {
                parsedCerts = parsed.certifications;
              }
              if (parsed.experienceYears) parsedExp = parsed.experienceYears;
              if (parsed.hourlyRate) parsedRate = parsed.hourlyRate;
              if (parsed.officeHours) parsedHours = parsed.officeHours;
              if (parsed.linkedin) parsedLinkedin = parsed.linkedin;
              if (parsed.researchGate) parsedResearchGate = parsed.researchGate;
              if (parsed.website) parsedWebsite = parsed.website;
            } else {
              parsedAbout = data.tutor.bio;
            }
          } catch (e) {
            parsedAbout = data.tutor.bio;
          }
        }

        setAbout(parsedAbout);
        setDegrees(parsedDegrees);
        setSpecializations(parsedSpecs);
        setCertifications(parsedCerts);
        setExperienceYears(parsedExp);
        setHourlyRate(parsedRate);
        setOfficeHours(parsedHours);
        setLinkedin(parsedLinkedin);
        setResearchGate(parsedResearchGate);
        setWebsite(parsedWebsite);
      }
    } catch (err: any) {
      console.error("Failed to load profile data:", err);
      setStatusMsg({ type: "error", text: "Failed to load instructor profile." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Photo Upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatusMsg({
        type: "error",
        text: "Selected file exceeds 5MB limit. Please upload a smaller photo.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAvatar(base64);
      setStatusMsg({
        type: "success",
        text: "Profile photo uploaded! Click 'Save Profile Changes' to commit.",
      });
    };
    reader.readAsDataURL(file);
  };

  // Degrees Management
  const handleAddDegree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDegreeTitle.trim() || !newDegreeInst.trim()) return;

    const newDeg: AcademicDegree = {
      id: "deg-" + Date.now(),
      degree: newDegreeTitle.trim(),
      institution: newDegreeInst.trim(),
      year: newDegreeYear.trim() || new Date().getFullYear().toString(),
      honors: newDegreeHonors.trim() || undefined,
    };

    setDegrees((prev) => [...prev, newDeg]);
    setNewDegreeTitle("");
    setNewDegreeInst("");
    setNewDegreeHonors("");
  };

  const handleRemoveDegree = (id: string) => {
    setDegrees((prev) => prev.filter((d) => d.id !== id));
  };

  // Specializations Management
  const handleAddSpec = (valToAdd?: string) => {
    const val = (valToAdd || newSpecTag).trim();
    if (!val) return;
    if (!specializations.includes(val)) {
      setSpecializations((prev) => [...prev, val]);
    }
    setNewSpecTag("");
  };

  const handleRemoveSpec = (spec: string) => {
    setSpecializations((prev) => prev.filter((s) => s !== spec));
  };

  // Certifications Management
  const handleAddCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCertTitle.trim()) return;

    const newCert: AcademicCertification = {
      id: "cert-" + Date.now(),
      title: newCertTitle.trim(),
      authority: newCertAuth.trim() || "Pearson / Cambridge Assessment",
      year: newCertYear.trim() || new Date().getFullYear().toString(),
    };

    setCertifications((prev) => [...prev, newCert]);
    setNewCertTitle("");
    setNewCertAuth("");
  };

  const handleRemoveCert = (id: string) => {
    setCertifications((prev) => prev.filter((c) => c.id !== id));
  };

  // Save Profile Changes
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tutor?.id) return;

    try {
      setSaving(true);
      setStatusMsg(null);

      const bioPayload = JSON.stringify({
        about,
        degrees,
        specializations,
        certifications,
        experienceYears,
        hourlyRate,
        officeHours,
        linkedin,
        researchGate,
        website,
      });

      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          tutorId: tutor.id,
          name,
          headline,
          bio: bioPayload,
          phone,
          avatar,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg({
          type: "success",
          text: "🎉 Faculty profile, academic degrees, and credentials saved successfully!",
        });
        setTutor(data.tutor);
      } else {
        setStatusMsg({
          type: "error",
          text: data.error || "Failed to update profile.",
        });
      }
    } catch (err: any) {
      console.error("Save profile error:", err);
      setStatusMsg({
        type: "error",
        text: err.message || "Failed to save profile changes. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#0c2461] text-white flex items-center justify-center shadow-lg shadow-blue-950/20 mb-4 animate-bounce">
          <UserCheck className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-base mb-1">Loading Faculty Studio Profile...</h3>
        <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Synchronizing credentials, degrees &amp; examiner accreditations...</span>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="w-full max-w-[1560px] mx-auto px-4 sm:px-8 xl:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/tutor"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Return to Faculty Studio"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                  Instructor Profile &amp; Studio Customization
                </h1>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-extrabold hidden sm:inline-flex">
                  Public Directory View
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Personalize your official instructor identity, verified academic degrees, examiner accreditations, and bio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/tutor">
              <Button variant="outline" size="sm" className="text-xs font-semibold rounded-xl">
                Faculty Studio
              </Button>
            </Link>
            <Button
              onClick={() => handleSaveProfile()}
              disabled={saving}
              className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-5 h-9 gap-1.5 shadow-md shadow-blue-950/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-[1560px] mx-auto px-4 sm:px-8 xl:px-12 pt-6 space-y-6">
        {/* Status Alerts */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200 shadow-2xs ${
              statusMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="font-bold text-xs">
                  {statusMsg.type === "success" ? "Profile Updated!" : "Update Notice"}
                </div>
                <p className="text-xs leading-relaxed">{statusMsg.text}</p>
              </div>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Real-Time Live Preview (4 cols) */}
          <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 space-y-5">
            {/* Live Preview Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 sticky top-24">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Live Public Preview
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>

              {/* Tutor Hero Preview */}
              <div className="flex items-start gap-3.5">
                <div className="w-16 h-16 rounded-2xl bg-[#0c2461] text-white flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden border-2 border-slate-200 shadow-md">
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    name.charAt(0) || "T"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm text-slate-900 truncate">
                      {name || "Dr. Faculty Lecturer"}
                    </h3>
                    <span title="Verified Faculty">
                      <BadgeCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                    {headline || "Senior Lead Lecturer in London A/L Pure Mathematics"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 flex-wrap">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      ${hourlyRate || "65"}/hr
                    </span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                      {experienceYears || "10+ Years"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Degrees Preview Snippet */}
              {degrees.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-blue-600" />
                    <span>Academic Qualifications ({degrees.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {degrees.slice(0, 2).map((deg) => (
                      <div key={deg.id} className="text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                        <div className="font-bold text-slate-900 truncate">{deg.degree}</div>
                        <div className="text-[10px] text-slate-500 flex items-center justify-between">
                          <span className="truncate">{deg.institution}</span>
                          <span className="font-mono text-slate-400">{deg.year}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Specializations Preview */}
              {specializations.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-indigo-600" />
                    <span>Syllabus Modules</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {specializations.slice(0, 4).map((spec, i) => (
                      <span
                        key={i}
                        className="text-[9px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 truncate max-w-[140px]"
                      >
                        {spec}
                      </span>
                    ))}
                    {specializations.length > 4 && (
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                        +{specializations.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Bio Preview */}
              <div className="pt-3 border-t border-slate-100 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Teaching Philosophy Preview
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                  {about || "Experienced faculty lecturer focused on exam methodology and structured student mastery."}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Customization Forms (8 cols) */}
          <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 space-y-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Section 1: Photo & Avatar Customization */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span>1. Profile Photo &amp; Visual Identity</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Upload a high-resolution professional portrait. Students and parents will see this on course syllabi.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative group shrink-0">
                    <div className="w-28 h-28 rounded-2xl bg-slate-900 overflow-hidden border-2 border-slate-200 shadow-lg ring-4 ring-blue-500/10">
                      <img
                        src={
                          avatar ||
                          "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80"
                        }
                        alt="Profile Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-xs font-bold gap-1 cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Change</span>
                    </button>
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-[#0c2461] hover:bg-blue-900 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Browse &amp; Upload Photo from Device</span>
                      </button>

                      {avatar && (
                        <button
                          type="button"
                          onClick={() => {
                            setAvatar("");
                            setStatusMsg({
                              type: "success",
                              text: "Photo removed. Default avatar placeholder will be used.",
                            });
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-semibold border border-slate-200 hover:border-red-200 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Photo</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Select a photo directly from your device files. Supports PNG, JPG, JPEG, and WEBP formats up to 5MB. Photo is automatically framed and optimized.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Basic Identity & Academic Designation */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>2. Basic Identity &amp; Designation</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Official instructor name, academic headline, teaching rates, and contact numbers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-xs text-slate-700 block">
                      Full Legal / Display Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Arthur Pendelton"
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-xs text-slate-700 block">
                      Phone / WhatsApp Number
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +44 7911 123456"
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-xs text-slate-700 block">
                    Academic Headline &amp; Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Senior Lead Lecturer & Certified Examiner (London A/L Pure Mathematics)"
                    className="rounded-xl h-9 text-xs"
                  />
                  <p className="text-[10px] text-slate-400">
                    This appears prominently underneath your name on all course pages, search results, and booking forms.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="font-bold text-xs text-slate-700 block">
                      Teaching Experience
                    </label>
                    <Input
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      placeholder="e.g. 12+ Years Lead Faculty"
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-xs text-slate-700 block">
                        Hourly Rate ($ / hr)
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Lock className="w-2.5 h-2.5" />
                        Set by Admin
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                      <Input
                        value={hourlyRate}
                        disabled
                        readOnly
                        placeholder="65"
                        className="rounded-xl h-9 text-xs pl-7 bg-slate-100/90 text-slate-700 font-semibold cursor-not-allowed border-dashed"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Tutor hourly rates are managed by academy administration.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-xs text-slate-700 block">
                      Consultation / Office Hours
                    </label>
                    <Input
                      value={officeHours}
                      onChange={(e) => setOfficeHours(e.target.value)}
                      placeholder="e.g. Mon - Fri: 4:00 PM - 8:00 PM GMT"
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Academic Degrees & Educational Credentials */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span>3. Academic Degrees &amp; Educational Credentials</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Add university bachelor&apos;s, master&apos;s, and doctoral qualifications with graduation honors.
                    </p>
                  </div>
                  <Badge className="bg-blue-50 text-blue-800 text-[11px] font-bold self-start sm:self-center">
                    {degrees.length} {degrees.length === 1 ? "Degree" : "Degrees"} Listed
                  </Badge>
                </div>

                {degrees.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 italic">
                    No academic degrees added yet. Use the form below to add your educational background.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {degrees.map((deg) => (
                      <div
                        key={deg.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-200 transition-all flex flex-col justify-between space-y-2 shadow-2xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs text-slate-900 leading-tight">
                              {deg.degree}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDegree(deg.id)}
                              className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer shrink-0"
                              title="Remove Degree"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-600 flex items-center gap-1.5">
                            <School className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{deg.institution}</span>
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                          <span className="font-mono text-slate-500">Year: {deg.year}</span>
                          {deg.honors && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {deg.honors}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Degree Form */}
                <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 space-y-3">
                  <div className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Add New Academic Degree</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">Degree Title *</label>
                      <Input
                        placeholder="e.g. B.Sc. (Hons) in Pure Mathematics"
                        value={newDegreeTitle}
                        onChange={(e) => setNewDegreeTitle(e.target.value)}
                        className="bg-white rounded-xl h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">Institution / University *</label>
                      <Input
                        placeholder="e.g. Imperial College London"
                        value={newDegreeInst}
                        onChange={(e) => setNewDegreeInst(e.target.value)}
                        className="bg-white rounded-xl h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">Graduation Year</label>
                      <Input
                        placeholder="e.g. 2018"
                        value={newDegreeYear}
                        onChange={(e) => setNewDegreeYear(e.target.value)}
                        className="bg-white rounded-xl h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">Honors / Distinctions (Optional)</label>
                      <Input
                        placeholder="e.g. First Class Honours, Dean's List"
                        value={newDegreeHonors}
                        onChange={(e) => setNewDegreeHonors(e.target.value)}
                        className="bg-white rounded-xl h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleAddDegree}
                      size="sm"
                      className="bg-[#0c2461] hover:bg-[#103080] text-white text-xs font-bold rounded-xl px-4 gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Degree to Profile</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Section 4: Subject Specializations & Syllabus Expertise */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>4. Subject Specializations &amp; Syllabus Expertise</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Highlight specific curriculum units, exam boards, and advanced focus topics you teach.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {specializations.map((spec, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>{spec}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(spec)}
                        className="text-blue-500 hover:text-red-600 p-0.5 rounded-full cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add custom specialization (e.g. Further Pure FP2, Mechanics M2)..."
                    value={newSpecTag}
                    onChange={(e) => setNewSpecTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSpec();
                      }
                    }}
                    className="rounded-xl h-9 text-xs"
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddSpec()}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl px-4 cursor-pointer shrink-0"
                  >
                    + Add Tag
                  </Button>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Quick Add Common Subjects:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Pure Mathematics (P1-P4)",
                      "Further Mechanics (FM1-FM2)",
                      "Statistics (S1-S2)",
                      "Further Pure (FP1-FP3)",
                      "Physics AS/A2 (Unit 1-6)",
                      "Chemistry AS/A2",
                      "Economics & Quantitative Methods",
                      "Cambridge IGCSE O/L",
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddSpec(preset)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[11px] font-semibold transition-all border border-slate-200 cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 5: Examiner Certifications & Teaching Accreditations */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>5. Examiner Certifications &amp; Accreditations</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Examiner appointments and credentials from Pearson, Cambridge, or international assessment boards.
                    </p>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                    {certifications.length} Certified
                  </Badge>
                </div>

                {certifications.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 italic">
                    No certifications added yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {certifications.map((cert) => (
                      <div
                        key={cert.id}
                        className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{cert.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center gap-2">
                            <span>{cert.authority}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-500">{cert.year}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCert(cert.id)}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                          title="Remove Certification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Cert Form */}
                <div className="p-4 rounded-xl bg-emerald-50/30 border border-emerald-100 space-y-3">
                  <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add Examiner Accreditation</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">Certification Title *</label>
                      <Input
                        placeholder="e.g. Pearson Edexcel Certified Senior Lead Examiner"
                        value={newCertTitle}
                        onChange={(e) => setNewCertTitle(e.target.value)}
                        className="bg-white rounded-xl h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">Issuing Authority / Board</label>
                      <Input
                        placeholder="e.g. Pearson Edexcel International"
                        value={newCertAuth}
                        onChange={(e) => setNewCertAuth(e.target.value)}
                        className="bg-white rounded-xl h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="w-36 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">Year Awarded</label>
                      <Input
                        placeholder="e.g. 2021"
                        value={newCertYear}
                        onChange={(e) => setNewCertYear(e.target.value)}
                        className="bg-white rounded-xl h-8 text-xs"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleAddCert}
                      size="sm"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl px-4 gap-1.5 cursor-pointer mt-4"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Certification</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Section 6: Biography & Teaching Philosophy */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>6. Comprehensive Biography &amp; Teaching Philosophy</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Describe your academic background, student A* accomplishments, error-checking methods, and lecture structure.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <textarea
                    rows={6}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Write an engaging introduction about your teaching style, past student A* scores, syllabus mastery, and passion for London A/L..."
                    className="w-full p-3.5 rounded-xl border border-slate-200 text-xs leading-relaxed resize-y focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Markdown supported</span>
                    <span>{about.length} characters</span>
                  </div>
                </div>
              </div>

              {/* Section 7: Professional & Research Links */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span>7. Professional &amp; Research Links</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Connect your verified external academic profiles, LinkedIn, and personal portfolio.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">LinkedIn Profile</label>
                    <Input
                      placeholder="https://linkedin.com/in/..."
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className="rounded-xl h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">ResearchGate / ORCID</label>
                    <Input
                      placeholder="https://researchgate.net/profile/..."
                      value={researchGate}
                      onChange={(e) => setResearchGate(e.target.value)}
                      className="rounded-xl h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Personal Academic Website</label>
                    <Input
                      placeholder="https://yourname.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="rounded-xl h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950 via-[#0c2461] to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Ready to publish your updated credentials?</span>
                  </h4>
                  <p className="text-xs text-blue-200">
                    Saved changes immediately synchronize to your course pages, consultation booking desks, and student directories.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link href="/tutor">
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent border-white/20 hover:bg-white/10 text-white text-xs font-bold rounded-xl"
                    >
                      Return to Studio
                    </Button>
                  </Link>

                  <Button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-black shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Saving Profile...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TutorProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <TutorProfileContent />
    </Suspense>
  );
}
