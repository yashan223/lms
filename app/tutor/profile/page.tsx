"use client";

import React, { useState, useEffect, useRef, ChangeEvent, FormEvent, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Award,
  Globe,
  Phone,
  Mail,
  Lock,
  User,
  Users,
  Save,
  Check,
  Copy,
  AlertTriangle,
  X,
  Plus,
  Building2,
  FileText,
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [tutor, setTutor] = useState<any>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("United Kingdom");
  const [avatar, setAvatar] = useState<string>("");

  const [degrees, setDegrees] = useState<AcademicDegree[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<AcademicCertification[]>([]);
  const [linkedin, setLinkedin] = useState("");
  const [researchGate, setResearchGate] = useState("");
  const [website, setWebsite] = useState("");

  const [newDegreeTitle, setNewDegreeTitle] = useState("");
  const [newDegreeInst, setNewDegreeInst] = useState("");
  const [newDegreeYear, setNewDegreeYear] = useState(new Date().getFullYear().toString());
  const [newDegreeHonors, setNewDegreeHonors] = useState("");
  const [newSpecTag, setNewSpecTag] = useState("");
  const [newCertTitle, setNewCertTitle] = useState("");
  const [newCertAuth, setNewCertAuth] = useState("");
  const [newCertYear, setNewCertYear] = useState(new Date().getFullYear().toString());

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyTutorId = (idStr: string) => {
    if (!idStr) return;
    navigator.clipboard.writeText(idStr);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tutor/profile");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login?redirect=/tutor/profile");
          return;
        }
        throw new Error("Failed to load profile.");
      }
      const data = await res.json();
      if (data.tutor) {
        setTutor(data.tutor);
        setName(data.tutor.name || "");
        setEmail(data.tutor.email || "");
        setHeadline(data.tutor.headline || "Senior Tutor");
        setPhone(data.tutor.phone || "");
        setCountry(data.tutor.country || "United Kingdom");
        setAvatar(data.tutor.avatar || "");

        let parsedAbout = "";
        let parsedDegrees: AcademicDegree[] = [];
        let parsedSpecs: string[] = [];
        let parsedCerts: AcademicCertification[] = [];
        let parsedLinkedin = "";
        let parsedResearchGate = "";
        let parsedWebsite = "";

        if (data.tutor.bio) {
          try {
            const parsed = JSON.parse(data.tutor.bio);
            if (typeof parsed === "object" && parsed !== null) {
              if (parsed.about) parsedAbout = parsed.about;
              if (Array.isArray(parsed.degrees)) parsedDegrees = parsed.degrees;
              if (Array.isArray(parsed.specializations)) parsedSpecs = parsed.specializations;
              if (Array.isArray(parsed.certifications)) parsedCerts = parsed.certifications;
              if (parsed.linkedin) parsedLinkedin = parsed.linkedin;
              if (parsed.researchGate) parsedResearchGate = parsed.researchGate;
              if (parsed.website) parsedWebsite = parsed.website;
            } else {
              parsedAbout = data.tutor.bio;
            }
          } catch {
            parsedAbout = data.tutor.bio;
          }
        }

        setAbout(parsedAbout);
        setDegrees(parsedDegrees);
        setSpecializations(parsedSpecs);
        setCertifications(parsedCerts);
        setLinkedin(parsedLinkedin);
        setResearchGate(parsedResearchGate);
        setWebsite(parsedWebsite);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: err.message || "Failed to load instructor profile." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMsg({ type: "error", text: "Please select a valid image file (JPEG, PNG, or WebP)." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatusMsg({ type: "error", text: "Image file size exceeds the 5MB limit." });
      return;
    }

    try {
      setUploadingAvatar(true);
      setStatusMsg(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "avatar");
      formData.append("isPrivate", "false");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.file?.fileUrl) {
        throw new Error(data.error || "Failed to upload image.");
      }

      const uploadedUrl = data.file.fileUrl;
      setAvatar(uploadedUrl);

      await fetch("/api/tutor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: uploadedUrl }),
      });

      setStatusMsg({ type: "success", text: "Profile picture uploaded and saved successfully!" });
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      setStatusMsg({ type: "error", text: err.message || "Could not upload profile picture." });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploadingAvatar(true);
      setAvatar("");

      await fetch("/api/tutor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: "" }),
      });

      setStatusMsg({ type: "success", text: "Profile picture removed. Default avatar will be used." });
    } catch (err: any) {
      console.error("Avatar removal failed:", err);
      setStatusMsg({ type: "error", text: "Failed to remove avatar." });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const buildBioPayload = () => {
    return JSON.stringify({
      about: about.trim(),
      degrees,
      specializations,
      certifications,
      linkedin: linkedin.trim(),
      researchGate: researchGate.trim(),
      website: website.trim(),
    });
  };

  const handleSaveProfile = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setStatusMsg({ type: "error", text: "Full name cannot be blank." });
      return;
    }

    try {
      setSaving(true);
      setStatusMsg(null);

      const res = await fetch("/api/tutor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          headline: headline.trim(),
          phone: phone.trim(),
          country: country.trim(),
          bio: buildBioPayload(),
          avatar: avatar || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setTutor(data.tutor);
      setStatusMsg({ type: "success", text: "Your instructor profile has been saved successfully!" });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: err.message || "Failed to save profile." });
    } finally {
      setSaving(false);
    }
  };

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

  const handleDeleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError("Please enter your current password to confirm deletion.");
      return;
    }
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/tutor/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account.");
      }
      window.location.href = "/login?deleted=true";
    } catch (err: any) {
      setDeleteError(err.message || "An unexpected error occurred.");
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-700">
        <Loader2 className="w-10 h-10 animate-spin text-[#0c2461] mb-3" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading instructor profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/tutor"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Tutor Studio</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#0c2461]" />
              <h1 className="font-extrabold text-sm sm:text-base text-slate-900">Instructor Profile &amp; Settings</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-[#0c2461] text-white font-bold text-[11px] px-2.5 py-0.5">
              London O/L &amp; A/L Faculty
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in ${
              statusMsg.type === "success"
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-slate-600 font-bold px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-semibold">Official Tutor ID</div>
                <div className="text-sm sm:text-base font-black font-mono text-[#0c2461] tracking-wide truncate">
                  {tutor?.tutorId || "—"}
                </div>
              </div>
            </div>
            {tutor?.tutorId && (
              <button
                type="button"
                onClick={() => handleCopyTutorId(tutor.tutorId)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-700 transition-colors cursor-pointer shrink-0"
                title="Copy Tutor ID"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Classes Offered</div>
              <div className="text-lg font-black text-slate-900">{tutor?.coursesCount || 0} Modules</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Students Taught</div>
              <div className="text-lg font-black text-slate-900">{tutor?.studentsCount || 0} Enrolled</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Account Status</div>
              <div className="text-xs font-bold text-blue-700 flex items-center gap-1 mt-0.5">
                <Check className="w-3.5 h-3.5" />
                {tutor?.emailVerified ? "Verified Faculty" : "Active Faculty"}
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              <span>Instructor Profile Photo</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Upload a clear professional portrait. Students and parents will see this on class pages, search results, and 1-on-1 consultations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <div className="relative group shrink-0">
              <div className="w-32 h-32 rounded-3xl bg-[#0c2461] text-white overflow-hidden border-4 border-slate-100 shadow-md ring-4 ring-blue-500/10 flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt={name || "Tutor Avatar"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-extrabold text-white">
                    {(name || "T").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex flex-col items-center justify-center text-xs font-bold gap-1 cursor-pointer disabled:opacity-0"
              >
                <Camera className="w-6 h-6" />
                <span>Change Photo</span>
              </button>
            </div>

            <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="bg-[#0c2461] hover:bg-[#1e3799] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>{uploadingAvatar ? "Uploading Photo..." : "Browse Photo File"}</span>
                </Button>

                {avatar && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </Button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarFileChange}
                className="hidden"
              />

              <p className="text-[11px] text-slate-400">
                Supports JPEG, PNG, and WebP format. Maximum file size is 5MB. Images are hosted securely on our private storage server.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Academic Details &amp; Personal Info</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Personalize your official instructor name, headline, contact channels, and academic philosophy.
            </p>
          </div>

          {tutor?.tutorId && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-slate-50 to-indigo-50/40 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0c2461] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  <ShieldCheck className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider block">
                    Verified Tutor ID
                  </span>
                  <span className="font-mono font-black text-sm sm:text-base text-[#0c2461] tracking-wider select-all">
                    {tutor.tutorId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyTutorId(tutor.tutorId)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold font-mono transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                title="Copy Tutor ID"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-sans">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-sans">Copy ID</span>
                  </>
                )}
              </button>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Full Legal / Display Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs h-10 bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Academic Headline &amp; Title *</label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Cambridge & Pearson Edexcel Chemistry Lead"
                  className="rounded-xl border-slate-200 text-xs h-10 bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Registered Email Address</span>
                  {tutor?.emailVerified ? (
                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500">Active Faculty</span>
                  )}
                </label>
                <div className="relative">
                  <Input
                    value={email}
                    disabled
                    className="rounded-xl border-slate-200 text-xs h-10 bg-slate-50 text-slate-500 pl-9"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Contact Phone / WhatsApp</label>
                <div className="relative">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+94 77 123 4567 or +44 7911 123456"
                    className="rounded-xl border-slate-200 text-xs h-10 bg-white pl-9"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Country of Residence</label>
              <div className="relative">
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country or region of residence"
                  className="rounded-xl border-slate-200 text-xs h-10 bg-white pl-9"
                />
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Comprehensive Biography &amp; Teaching Philosophy</label>
              <textarea
                rows={4}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Share your teaching approach, past paper mastery methods, academic achievements, and coaching style..."
                className="w-full rounded-2xl border border-slate-200 p-4 text-xs font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0c2461] bg-white resize-y"
              />
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-700">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Academic Degrees</h3>
                    <p className="text-[11px] text-slate-500">University and collegiate qualifications</p>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">
                  {degrees.length} Added
                </Badge>
              </div>

              {degrees.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {degrees.map((deg) => (
                    <div
                      key={deg.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">{deg.degree}</div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{deg.institution} ({deg.year})</span>
                          {deg.honors && <span className="font-semibold text-blue-600">• {deg.honors}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDegree(deg.id)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Remove Degree"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <Input
                  placeholder="Degree Title (e.g. B.Sc. Mathematics)"
                  value={newDegreeTitle}
                  onChange={(e) => setNewDegreeTitle(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs h-9 bg-white"
                />
                <Input
                  placeholder="Institution (e.g. University of London)"
                  value={newDegreeInst}
                  onChange={(e) => setNewDegreeInst(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs h-9 bg-white"
                />
              </div>

              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Grad Year"
                    value={newDegreeYear}
                    onChange={(e) => setNewDegreeYear(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs h-9 bg-white w-24"
                  />
                  <Input
                    placeholder="Honors (e.g. First Class)"
                    value={newDegreeHonors}
                    onChange={(e) => setNewDegreeHonors(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs h-9 bg-white w-44"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddDegree}
                  size="sm"
                  className="bg-[#0c2461] hover:bg-[#1e3799] text-white text-xs font-bold rounded-xl px-3 h-9 gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Degree</span>
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-700">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Subject Specializations</h3>
                    <p className="text-[11px] text-slate-500">Modules and exam boards you cover</p>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">
                  {specializations.length} Tags
                </Badge>
              </div>

              {specializations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {specializations.map((spec, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-white border border-blue-200 text-blue-900 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>{spec}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(spec)}
                        className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add custom specialization module..."
                  value={newSpecTag}
                  onChange={(e) => setNewSpecTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSpec();
                    }
                  }}
                  className="rounded-xl border-slate-200 text-xs h-9 bg-white"
                />
                <Button
                  type="button"
                  onClick={() => handleAddSpec()}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl px-4 h-9 cursor-pointer shrink-0"
                >
                  + Add Tag
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Examiner Accreditations</h3>
                    <p className="text-[11px] text-slate-500">Board certifications and official examiner appointments</p>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">
                  {certifications.length} Certified
                </Badge>
              </div>

              {certifications.length > 0 && (
                <div className="space-y-2">
                  {certifications.map((cert) => (
                    <div
                      key={cert.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">{cert.title}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {cert.authority} • {cert.year}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCert(cert.id)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Remove Certification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <Input
                  placeholder="Certification Title"
                  value={newCertTitle}
                  onChange={(e) => setNewCertTitle(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs h-9 bg-white"
                />
                <Input
                  placeholder="Issuing Authority (e.g. Pearson / Cambridge)"
                  value={newCertAuth}
                  onChange={(e) => setNewCertAuth(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs h-9 bg-white"
                />
              </div>

              <div className="flex items-center justify-between gap-2.5">
                <Input
                  placeholder="Year Awarded"
                  value={newCertYear}
                  onChange={(e) => setNewCertYear(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs h-9 bg-white w-32"
                />
                <Button
                  type="button"
                  onClick={handleAddCert}
                  size="sm"
                  className="bg-[#0c2461] hover:bg-[#1e3799] text-white text-xs font-bold rounded-xl px-3 h-9 gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Accreditation</span>
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-700">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Professional Links</h3>
                  <p className="text-[11px] text-slate-500">Public academic portfolio and research profiles</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">LinkedIn Profile</label>
                  <Input
                    placeholder="https://linkedin.com/in/..."
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs h-9 bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">ResearchGate / ORCID</label>
                  <Input
                    placeholder="https://researchgate.net/..."
                    value={researchGate}
                    onChange={(e) => setResearchGate(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs h-9 bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Personal Website</label>
                  <Input
                    placeholder="https://..."
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs h-9 bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#0c2461] hover:bg-[#1e3799] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? "Saving Changes..." : "Save Profile Details"}</span>
              </Button>
            </div>
          </form>
        </section>

        <section className="bg-white rounded-3xl border border-red-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="border-b border-red-100 pb-4">
            <h2 className="text-base font-extrabold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Danger Zone</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Irreversible account actions. Please proceed with caution.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-red-50/50 border border-red-100">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-xs font-bold text-red-950">Delete Tutor Account</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Permanently delete your instructor profile, class schedules, syllabus materials, trial bookings, and teaching history. This cannot be undone.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteError(null);
                setDeletePassword("");
              }}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-xs px-4 py-2 rounded-xl shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account</span>
            </Button>
          </div>
        </section>

        {showDeleteModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-red-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 text-red-600">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Delete Account</h3>
                    <p className="text-[11px] text-slate-500">Permanent and irreversible</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deletingAccount}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <p>
                  Are you absolutely sure you want to delete your instructor account? All your published classes, lesson resources, student enrollments, and teaching records will be permanently removed.
                </p>

                {deleteError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <form onSubmit={handleDeleteAccount} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 text-xs block">
                      Confirm your password to proceed *
                    </label>
                    <Input
                      type="password"
                      required
                      placeholder="Enter your current password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="rounded-xl border-slate-200 text-xs h-10 bg-white"
                      disabled={deletingAccount}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDeleteModal(false)}
                      disabled={deletingAccount}
                      className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={deletingAccount || !deletePassword}
                      className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      {deletingAccount ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Deleting Account...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Permanently Delete</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TutorProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0c2461]" />
        </div>
      }
    >
      <TutorProfileContent />
    </Suspense>
  );
}
