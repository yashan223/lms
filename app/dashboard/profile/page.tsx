"use client";

import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
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
  Clock,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Users,
  Save,
  Check,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function StudentProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Student Profile Data
  const [student, setStudent] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("United Kingdom");
  const [academicLevel, setAcademicLevel] = useState<"AL" | "OL">("AL");
  const [avatar, setAvatar] = useState<string>("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("Parent");
  const [guardianPhone, setGuardianPhone] = useState("");

  // Password Update Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/profile");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login?redirect=/dashboard/profile");
          return;
        }
        throw new Error("Failed to load profile.");
      }
      const data = await res.json();
      if (data.student) {
        setStudent(data.student);
        setName(data.student.name || "");
        setEmail(data.student.email || "");
        setHeadline(data.student.headline || "");
        setBio(data.student.bio || "");
        setPhone(data.student.phone || "");
        setCountry(data.student.country || "United Kingdom");
        setAcademicLevel(data.student.academicLevel === "OL" ? "OL" : "AL");
        setAvatar(data.student.avatar || "");
        setGuardianName(data.student.guardianName || "");
        setGuardianRelationship(data.student.guardianRelationship || "Parent");
        setGuardianPhone(data.student.guardianPhone || "");
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: err.message || "Failed to load profile data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Handle avatar file upload via /api/upload
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

      setAvatar(data.file.fileUrl);

      // Auto-save the new avatar to the student profile
      await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: data.file.fileUrl }),
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

  // Remove profile picture
  const handleRemoveAvatar = async () => {
    try {
      setUploadingAvatar(true);
      setAvatar("");

      await fetch("/api/student/profile", {
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

  // Save profile information
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMsg({ type: "error", text: "Full name cannot be blank." });
      return;
    }

    try {
      setSaving(true);
      setStatusMsg(null);

      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          headline: headline.trim(),
          bio: bio.trim(),
          phone: phone.trim(),
          country: country.trim(),
          academicLevel,
          avatar: avatar || null,
          guardianName: guardianName.trim(),
          guardianRelationship: guardianRelationship.trim(),
          guardianPhone: guardianPhone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setStudent(data.student);
      setStatusMsg({ type: "success", text: "Your profile has been saved successfully!" });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: err.message || "Failed to save profile." });
    } finally {
      setSaving(false);
    }
  };

  // Update password
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (!currentPassword) {
      setPassMsg({ type: "error", text: "Please enter your current password." });
      return;
    }

    if (newPassword.length < 8) {
      setPassMsg({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    try {
      setSavingPassword(true);
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Password update failed.");
      }

      setPassMsg({ type: "success", text: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPassMsg({ type: "error", text: err.message || "Failed to change password." });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-700">
        <Loader2 className="w-10 h-10 animate-spin text-[#0c2461] mb-3" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading student profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#0c2461]" />
              <h1 className="font-extrabold text-sm sm:text-base text-slate-900">Student Profile &amp; Settings</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-[#0c2461] text-white font-bold text-[11px] px-2.5 py-0.5">
              {academicLevel === "AL" ? "London A/L Candidate" : "London O/L Candidate"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Toast / Notification Banner */}
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

        {/* Academic Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Learning Wallet</div>
              <div className="text-lg font-black text-slate-900">{student?.walletBalance || 0} Hours</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Enrolled Classes</div>
              <div className="text-lg font-black text-slate-900">{student?.enrollmentsCount || 0}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Badges Awarded</div>
              <div className="text-lg font-black text-slate-900">{student?.badgesCount || 0}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Account Status</div>
              <div className="text-xs font-bold text-blue-700 flex items-center gap-1 mt-0.5">
                <Check className="w-3.5 h-3.5" />
                {student?.emailVerified ? "Verified" : "Active"}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Profile Photo & Visual Identity */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              <span>Student Profile Photo</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Upload a clear photo or portrait. Your tutors and faculty leads will see this on class rosters and 1-on-1 consultations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <div className="relative group shrink-0">
              <div className="w-32 h-32 rounded-3xl bg-[#0c2461] text-white overflow-hidden border-4 border-slate-100 shadow-md ring-4 ring-blue-500/10 flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt={name || "Student Avatar"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-extrabold text-white">
                    {(name || "S").charAt(0).toUpperCase()}
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

              {/* Hidden file input for strictly file-browsing image upload */}
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

        {/* Section 2: General Student Details Form */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Academic Details &amp; Personal Info</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Keep your syllabus track and contact details current so your tutors can tailor their lesson walkthroughs.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Qualification Level Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Current Qualification Track</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAcademicLevel("AL")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                    academicLevel === "AL"
                      ? "border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      academicLevel === "AL" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                    }`}
                  >
                    {academicLevel === "AL" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">London A/L (International Advanced Level)</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Edexcel / Cambridge IAL Units P1–P4, S1–S2, M1–M2, Chemistry, Biology, Physics, and Business.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAcademicLevel("OL")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                    academicLevel === "OL"
                      ? "border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      academicLevel === "OL" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                    }`}
                  >
                    {academicLevel === "OL" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">London O/L (IGCSE / Ordinary Level)</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Edexcel &amp; Cambridge IGCSE foundation curricula, past paper walkthroughs, and exam mastery.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Name & Headline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs h-10 bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Academic Headline</label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Edexcel IAL Mathematics & Physics Candidate (2026/2027)"
                  className="rounded-xl border-slate-200 text-xs h-10 bg-white"
                />
              </div>
            </div>

            {/* Email (Readonly) & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Registered Email Address</span>
                  {student?.emailVerified ? (
                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500">Pending Verification</span>
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

            {/* Country */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Country of Residence</label>
              <div className="relative">
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. United Kingdom, Sri Lanka, UAE, Singapore..."
                  className="rounded-xl border-slate-200 text-xs h-10 bg-white pl-9"
                />
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Parent / Guardian Information */}
            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-700">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Parent / Guardian Information
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Used for progress reporting, class schedules, and student coordination.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Parent / Guardian Name</label>
                  <Input
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs h-10 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Relationship to Student</label>
                  <select
                    value={guardianRelationship}
                    onChange={(e) => setGuardianRelationship(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-semibold focus:ring-blue-600"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Parent">Parent</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Parent / Guardian WhatsApp Number</label>
                <div className="relative">
                  <Input
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="+94 77 123 4567 or +44 7911 123456"
                    className="rounded-xl border-slate-200 text-xs h-10 bg-white pl-9"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[10px] text-slate-500">
                  Official progress notifications and attendance alerts are delivered via this WhatsApp number.
                </p>
              </div>
            </div>

            {/* Academic Bio / Goals */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Academic Goals &amp; Exam Targets</label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your target universities, upcoming exam series (e.g. Summer 2026), syllabus units you want to master, or specific areas where you need individual coaching..."
                className="w-full rounded-2xl border border-slate-200 p-4 text-xs font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0c2461] bg-white resize-y"
              />
            </div>

            {/* Save Button */}
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

        {/* Section 3: Security & Password Update */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              <span>Security &amp; Password</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ensure your account is protected with a secure password of at least 8 characters.
            </p>
          </div>

          {passMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                passMsg.type === "success"
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {passMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{passMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Current Password *</label>
              <div className="relative">
                <Input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="rounded-xl border-slate-200 text-xs h-10 pr-10 bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">New Password (Min 8 Characters) *</label>
              <div className="relative">
                <Input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="rounded-xl border-slate-200 text-xs h-10 pr-10 bg-white"
                  minLength={8}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Confirm New Password *</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="rounded-xl border-slate-200 text-xs h-10 bg-white"
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={savingPassword}
                variant="outline"
                className="border-slate-300 text-slate-800 hover:bg-slate-50 font-bold text-xs px-5 py-2 rounded-xl cursor-pointer flex items-center gap-2"
              >
                {savingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>{savingPassword ? "Updating Password..." : "Update Password"}</span>
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
