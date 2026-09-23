"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Users,
} from "lucide-react";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { PhoneInputWithCountry } from "@/components/ui/PhoneInputWithCountry";
import { Country } from "@/lib/countries";
import { TermsAndPolicyModal } from "@/components/legal/TermsAndPolicyModal";
import { Scale, Ban } from "lucide-react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [qualification, setQualification] = useState("London A/L (IAL)");
  const [country, setCountry] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Parent / Guardian Details
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("Parent");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianCountryCode, setGuardianCountryCode] = useState("");

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsModalTab, setTermsModalTab] = useState<"terms" | "refund">("terms");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleCountryChange = (selectedCountryName: string, selectedCountry?: Country) => {
    setCountry(selectedCountryName);
    if (selectedCountry?.dialCode) {
      setCountryCode(selectedCountry.dialCode);
      if (!guardianCountryCode) {
        setGuardianCountryCode(selectedCountry.dialCode);
      }
    }
  };

  const handleCountryCodeChange = (code: string, selectedCountry?: Country) => {
    setCountryCode(code);
    if (!guardianCountryCode) {
      setGuardianCountryCode(code);
    }
    if (selectedCountry && !country) {
      setCountry(selectedCountry.name);
    }
  };

  const handleGuardianCountryCodeChange = (code: string) => {
    setGuardianCountryCode(code);
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanDigits = phone.replace(/[^\d]/g, "");
    if (!cleanDigits || cleanDigits.length < 5) {
      setErrorMsg("Please enter a valid student contact phone number.");
      return;
    }

    if (!countryCode && !phone.trim().startsWith("+")) {
      setErrorMsg("Please select your country dial code for the student phone number.");
      return;
    }

    if (!guardianName.trim()) {
      setErrorMsg("Please provide Parent / Guardian Full Name.");
      return;
    }

    const cleanGuardianDigits = guardianPhone.replace(/[^\d]/g, "");
    if (!cleanGuardianDigits || cleanGuardianDigits.length < 5) {
      setErrorMsg("Please enter a valid Parent / Guardian WhatsApp contact number.");
      return;
    }

    if (!guardianCountryCode && !guardianPhone.trim().startsWith("+")) {
      setErrorMsg("Please select the country dial code for the Parent / Guardian WhatsApp number.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter your password.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters in length.");
      return;
    }

    if (!agreedToTerms) {
      setErrorMsg("You must read and agree to the Terms & Conditions and No-Refund Policy to register.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmedRegister = async () => {
    setLoading(true);
    try {
      const fullPhoneNumber = phone.trim().startsWith("+")
        ? phone.trim()
        : countryCode
          ? `${countryCode} ${phone.trim()}`
          : phone.trim();

      const fullGuardianPhone = guardianPhone.trim().startsWith("+")
        ? guardianPhone.trim()
        : guardianCountryCode
          ? `${guardianCountryCode} ${guardianPhone.trim()}`
          : guardianPhone.trim();

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: fullPhoneNumber,
          guardianName: guardianName.trim(),
          guardianRelationship: guardianRelationship.trim(),
          guardianPhone: fullGuardianPhone,
          password,
          qualification,
          country,
          agreedToTerms: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Student registration failed.");
        setLoading(false);
        return;
      }

      let targetRedirect = data.redirectTo || "/dashboard";
      if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
        if (targetRedirect.includes("?")) {
          targetRedirect += `&redirect=${encodeURIComponent(redirectParam)}`;
        } else {
          targetRedirect += `?redirect=${encodeURIComponent(redirectParam)}`;
        }
      }

      router.push(targetRedirect);
    } catch (err) {
      console.error("Register error:", err);
      setErrorMsg("Unable to connect to student registration server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-8 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/logo-wide.png"
              alt="EduPulse Global"
              className="h-11 sm:h-13 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          <Link
            href={`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`}
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
          >
            Existing Member? Log In
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="p-6 sm:p-10 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Student Registration
              </h1>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create your student account to access your classes and dashboard.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePreSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Student Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      required
                      placeholder="Enter full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 h-11 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="email"
                      required
                      placeholder="Enter email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-11 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Contact / WhatsApp Number
                  </label>
                  <PhoneInputWithCountry
                    value={phone}
                    countryCode={countryCode}
                    onPhoneChange={setPhone}
                    onCountryCodeChange={handleCountryCodeChange}
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Country of Residence
                  </label>
                  <CountrySelector
                    value={country}
                    onChange={handleCountryChange}
                    placeholder="Select country..."
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Qualification Program
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-semibold focus:ring-blue-600"
                  >
                    <option value="London A/L (IAL)">London A/L (IAL AS & A2)</option>
                    <option value="London O/L (IGCSE)">London O/L (IGCSE Foundation)</option>
                  </select>
                </div>
              </div>

              {/* Parent / Guardian Information Section */}
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
                      Required for student coordination, progress reports, and academy updates.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Parent / Guardian Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        required
                        placeholder="e.g. Tariq Al-Mansoor"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        className="pl-9 h-11 text-xs border-slate-200 bg-white rounded-xl focus-visible:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Relationship to Student *
                    </label>
                    <select
                      value={guardianRelationship}
                      onChange={(e) => setGuardianRelationship(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-semibold focus:ring-blue-600"
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
                  <label className="text-xs font-bold text-slate-700 block">
                    Parent / Guardian WhatsApp Number *
                  </label>
                  <PhoneInputWithCountry
                    value={guardianPhone}
                    countryCode={guardianCountryCode || countryCode}
                    onPhoneChange={setGuardianPhone}
                    onCountryCodeChange={handleGuardianCountryCodeChange}
                    placeholder="Enter guardian WhatsApp number"
                    required
                  />
                  <p className="text-[10px] text-slate-500">
                    Official announcements and attendance notices will be shared via this number.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Min 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9 h-11 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 pr-9 h-11 text-xs border-slate-200 rounded-xl focus-visible:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Terms & Conditions and No-Refund Policy Checkbox */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    required
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-[#0c2461]"
                  />
                  <label htmlFor="terms-checkbox" className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
                    I have read, understood, and explicitly agree to the{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTermsModalTab("terms");
                        setShowTermsModal(true);
                      }}
                      className="font-bold text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      Terms & Conditions
                    </button>{" "}
                    and the strict{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTermsModalTab("refund");
                        setShowTermsModal(true);
                      }}
                      className="font-bold text-blue-700 hover:text-blue-800 underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      No-Refund Policy
                    </button>
                    . I understand that all digital course enrollments, individual classes, and token packages are final and non-refundable.
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white font-bold text-xs shadow-md shadow-blue-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <span>Create Student Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
              Already have an academic account?{" "}
              <Link
                href={`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`}
                className="font-bold text-blue-600 hover:text-blue-800"
              >
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PulseEDU Global</span>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/terms" className="hover:text-blue-600 transition-colors">
              Terms & Conditions
            </Link>
            <Link href="/terms#refund-policy" className="hover:text-blue-600 transition-colors">
              No-Refund Policy
            </Link>
          </div>
        </div>
      </footer>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedRegister}
        title="Confirm Student Registration"
        description={`You are registering as a ${qualification} student${country ? ` from ${country}` : ""}. Student Contact: ${phone.trim().startsWith("+") ? phone.trim() : countryCode ? `${countryCode} ${phone.trim()}` : phone.trim()}. Parent/Guardian: ${guardianName} (${guardianRelationship}, WhatsApp: ${guardianPhone.trim().startsWith("+") ? guardianPhone.trim() : guardianCountryCode ? `${guardianCountryCode} ${guardianPhone.trim()}` : guardianPhone.trim()}). Your official student profile will be registered with the academy.`}
        confirmText="Confirm & Enter LMS"
        cancelText="Review Details"
        variant="success"
        requireConsentText="I confirm that all student and guardian details are accurate and explicitly agree to the Academic Honor Code, Terms & Conditions, and No-Refund Policy."
      />

      <TermsAndPolicyModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        initialTab={termsModalTab}
        onAccept={() => setAgreedToTerms(true)}
      />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
