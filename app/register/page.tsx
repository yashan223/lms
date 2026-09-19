"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { PhoneInputWithCountry } from "@/components/ui/PhoneInputWithCountry";
import { Country } from "@/lib/countries";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [qualification, setQualification] = useState("London A/L (IAL)");
  const [country, setCountry] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleCountryChange = (selectedCountryName: string, selectedCountry?: Country) => {
    setCountry(selectedCountryName);
    if (selectedCountry?.dialCode) {
      setCountryCode(selectedCountry.dialCode);
    }
  };

  const handleCountryCodeChange = (code: string, selectedCountry?: Country) => {
    setCountryCode(code);
    if (selectedCountry && !country) {
      setCountry(selectedCountry.name);
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanDigits = phone.replace(/[^\d]/g, "");
    if (!cleanDigits || cleanDigits.length < 5) {
      setErrorMsg("Please enter a valid contact phone number.");
      return;
    }

    if (!countryCode && !phone.trim().startsWith("+")) {
      setErrorMsg("Please select your country dial code for the phone number.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter your password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters in length.");
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

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: fullPhoneNumber,
          password,
          qualification,
          country,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Student registration failed.");
        setLoading(false);
        return;
      }

      router.push(data.redirectTo || "/dashboard");
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
            href="/login"
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
                      placeholder="Min 6 characters"
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
              <Link href="/login" className="font-bold text-blue-600 hover:text-blue-800">
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        PulseEDU Global
      </footer>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedRegister}
        title="Confirm Student Registration"
        description={`You are registering as a ${qualification} student${country ? ` from ${country}` : ""}. Contact: ${phone.trim().startsWith("+") ? phone.trim() : countryCode ? `${countryCode} ${phone.trim()}` : phone.trim()}. Your official student profile will be registered with the academy.`}
        confirmText="Confirm & Enter LMS"
        cancelText="Review Details"
        variant="success"
        requireConsentText="I confirm that all student details are accurate and agree to the academic honor code."
      />
    </div>
  );
}
