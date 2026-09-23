"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Ban,
  Clock,
  Coins,
  GraduationCap,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TermsAndPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "terms" | "refund";
  onAccept?: () => void;
}

export function TermsAndPolicyModal({
  isOpen,
  onClose,
  initialTab = "terms",
  onAccept,
}: TermsAndPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<"terms" | "refund">(initialTab);

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                activeTab === "refund"
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}
            >
              {activeTab === "refund" ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {activeTab === "refund"
                  ? "Strict No-Refund Policy"
                  : "Academic Terms & Conditions"}
              </h2>
              <p className="text-[11px] text-slate-500">
                PulseEDU Global • Effective Academic Year 2026
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-1 border-b border-slate-100 bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("terms")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "terms"
                ? "bg-[#0c2461] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Terms & Conditions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("refund")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "refund"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>No-Refund Policy</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-600 leading-relaxed">
          {activeTab === "terms" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-blue-900 flex items-start gap-2.5">
                <GraduationCap className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  By registering an academic account on PulseEDU Global, you enter into a binding
                  educational agreement and agree to uphold rigorous academic integrity standards.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  1. Student Eligibility & Account Authenticity
                </h3>
                <p>
                  You agree that all personal details, including your full legal name, official
                  qualification program (London A/L or London O/L), contact phone/WhatsApp number,
                  and country of residence, are genuine and accurate. Impersonation, falsification
                  of educational records, or multi-accounting is strictly prohibited.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  2. Academic Integrity & Code of Conduct
                </h3>
                <p>
                  PulseEDU operates under a zero-tolerance policy regarding academic dishonesty.
                  Students must not use platform resources, live tutor sessions, or automated
                  assistants to commit examination malpractice, submit plagiarized assignments, or
                  distribute proprietary examination assessment materials.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  3. Intellectual Property & Material Rights
                </h3>
                <p>
                  All curriculum materials, live class stream recordings, topical revision notes,
                  worked past paper walkthroughs, and downloadable documents hosted on the platform
                  are the exclusive intellectual property of PulseEDU Global and its certified
                  faculty tutors. Downloading for redistribution, re-recording, screen sharing to
                  unauthorized parties, or public dissemination is illegal and will result in
                  immediate account termination and legal action.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  4. 1-on-1 Sessions, Rescheduling & Free Trials
                </h3>
                <p>
                  Each registered student is granted a quota of up to 5 free 30-minute trial
                  sessions across different faculty tutors (maximum 1 free trial per individual tutor).
                  For scheduled 1-on-1 tutoring sessions, rescheduling requests must be submitted at
                  least 12 hours prior to the session start time. Unattended sessions without prior notice
                  forfeit the allocated booking tokens.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  5. Digital Token Wallet & Credit System
                </h3>
                <p>
                  The platform operates a token-based credit balance where 1 Token equals 1 Hour of
                  academic learning credit. Tokens can be utilized across 1-on-1 private tutoring,
                  individual class syllabus enrollments, and live past paper seminars. Tokens remain
                  valid for the duration of the student's active academic enrollment.
                </p>
              </div>
            </div>
          )}

          {activeTab === "refund" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                    Important Notice: Strictly All Sales Are Final
                  </h4>
                  <p className="text-[11px] leading-relaxed text-amber-900/90">
                    PulseEDU Global maintains a strict <strong>NO-REFUND POLICY</strong> on all
                    digital token package purchases, course enrollments, individual class purchases,
                    and subscription payments. Please review this policy carefully before registering.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  1. Immediate Digital Delivery & Resource Allocation
                </h3>
                <p>
                  Upon purchasing tokens or completing class enrollment, students receive immediate,
                  unrestricted access to proprietary curriculum content, recorded video libraries,
                  faculty scheduling slots, and academic infrastructure. Because these digital
                  assets and instructor reservations are provisioned instantly, fees paid cannot be
                  reversed, refunded, or credited back to original payment methods.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  2. Free 30-Minute Trial Sessions Before Financial Commitment
                </h3>
                <p>
                  To ensure complete satisfaction and instructional alignment, PulseEDU Global
                  provides students with <strong>up to 5 free 30-minute 1-on-1 trial classes</strong>{" "}
                  with our accredited faculty tutors prior to purchasing tokens. Students are strongly
                  encouraged to utilize these complimentary trials to experience tutor methodology
                  and curriculum depth before committing funds.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  3. Token Balances Non-Redeemable for Cash
                </h3>
                <p>
                  Tokens purchased within the digital wallet are non-refundable, non-transferable
                  between student accounts, and cannot be redeemed for fiat currency or cash
                  equivalents. If a scheduled class is cancelled by an instructor, the consumed
                  tokens are credited back to the student's token wallet balance for future class
                  bookings.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  4. Chargebacks and Payment Disputes
                </h3>
                <p>
                  Initiating an unauthorized chargeback or payment reversal through your card issuer
                  or bank constitutes a direct violation of this agreement. Any fraudulent chargeback
                  or payment dispute will result in the immediate and permanent suspension of the
                  student's academic account, forfeiture of all wallet tokens and study materials, and
                  may be referred for legal recovery.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href="/terms"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Open Full Policy Document</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onAccept && (
              <Button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="flex-1 sm:flex-none h-9 px-4 rounded-xl bg-[#0c2461] hover:bg-[#12366b] text-white text-xs font-bold"
              >
                I Understand & Accept
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-none h-9 px-4 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
