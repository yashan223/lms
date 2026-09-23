"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowLeft,
  Loader2,
  Lock,
} from "lucide-react";
import Link from "next/link";

const TEST_CARDS = [
  {
    name: "Visa Test Card",
    number: "4508 7500 1574 1019",
    scheme: "visa",
    cvv: "100",
  },
  {
    name: "Mastercard Test Card 1",
    number: "5123 4500 0000 0008",
    scheme: "mastercard",
    cvv: "100",
  },
  {
    name: "Mastercard Test Card 2",
    number: "2223 0000 0000 0007",
    scheme: "mastercard",
    cvv: "100",
  },
  {
    name: "American Express",
    number: "3718 812455 60002",
    scheme: "amex",
    cvv: "1000",
  },
];

function SandboxCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Card form state
  const [selectedCardIdx, setSelectedCardIdx] = useState(0);
  const [expiryOption, setExpiryOption] = useState<"APPROVED" | "DECLINED" | "EXPIRED">("APPROVED");
  const [cardHolder, setCardHolder] = useState("Alex Perera");
  const [paymentMethodTab, setPaymentMethodTab] = useState<"CARD" | "LANKAQR">("CARD");

  useEffect(() => {
    if (!reference) {
      setError("No payment reference found.");
      setLoading(false);
      return;
    }

    async function loadPayment() {
      try {
        const res = await fetch(`/api/checkout/status?reference=${encodeURIComponent(reference || "")}`);
        if (!res.ok) {
          throw new Error("Unable to locate payment session.");
        }
        const data = await res.json();
        setPaymentData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load checkout.");
      } finally {
        setLoading(false);
      }
    }

    loadPayment();
  }, [reference]);

  const handleAuthorize = async () => {
    if (!reference) return;
    setSubmitting(true);
    setError(null);

    const card = TEST_CARDS[selectedCardIdx];

    try {
      const outcome = expiryOption === "APPROVED" ? "APPROVED" : "DECLINED";

      const res = await fetch("/api/checkout/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          outcome,
          cardScheme: card.scheme,
          last4: card.number.slice(-4),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Payment authorization failed");
      }

      // Redirect to outcome page
      router.push(result.redirectUrl);
    } catch (err: any) {
      setError(err.message || "Transaction authorization failed.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-400" />
          <p className="text-sm font-medium text-slate-400">Loading Payments.lk Checkout...</p>
        </div>
      </div>
    );
  }

  if (error && !paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center space-y-4 text-white">
          <AlertCircle className="w-12 h-12 text-blue-400 mx-auto" />
          <h2 className="text-lg font-bold">Checkout Unavailable</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isUsd = paymentData?.currency === "USD";
  const formattedPrice = paymentData
    ? isUsd
      ? `$${(paymentData.amountCents / 100).toFixed(2)} USD`
      : `Rs. ${(paymentData.amountCents / 100).toLocaleString("en-LK")}`
    : "0.00";
  const selectedCard = TEST_CARDS[selectedCardIdx];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Payments.lk Header Banner */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded font-mono font-semibold">
              PAYMENTS.LK SANDBOX
            </span>
            <span className="text-slate-400 hidden sm:inline">
              3D Secure Hosted Checkout (Payable Licensed Rails)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-sky-400 font-medium">PCI-DSS Level 1 Encrypted</span>
          </div>
        </div>
      </header>

      {/* Main Checkout Modal Container */}
      <main className="max-w-3xl w-full mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur">
          {/* Order Summary Ribbon */}
          <div className="p-6 bg-gradient-to-r from-blue-900/40 via-sky-900/20 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                Order Summary
              </span>
              <h1 className="text-xl font-bold text-white mt-0.5">
                {paymentData?.itemTitle || "PulseEDU Learning Package"}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Ref: {reference}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400">Total to Authorise</span>
              <div className="text-3xl font-black text-white tracking-tight">
                {formattedPrice}
              </div>
            </div>
          </div>

          {/* Payment Method Switcher Tabs */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex gap-2 border-b border-slate-800 pb-4">
              <button
                type="button"
                onClick={() => setPaymentMethodTab("CARD")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  paymentMethodTab === "CARD"
                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <CreditCard className="w-4 h-4" /> Credit / Debit Card (Visa / MC / Amex)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethodTab("LANKAQR")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  paymentMethodTab === "LANKAQR"
                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <QrCode className="w-4 h-4" /> LankaQR / LankaPay
              </button>
            </div>

            {paymentMethodTab === "CARD" ? (
              <div className="space-y-6">
                {/* Official Test Card Preset Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Select Payments.lk Test Card
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {TEST_CARDS.map((tc, idx) => (
                      <button
                        key={tc.number}
                        type="button"
                        onClick={() => setSelectedCardIdx(idx)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                          selectedCardIdx === idx
                            ? "border-sky-500 bg-sky-500/10 text-white"
                            : "border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-200">{tc.name}</div>
                          <div className="text-xs font-mono text-slate-400 mt-0.5">{tc.number}</div>
                        </div>
                        {selectedCardIdx === idx && (
                          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Fields Form Preview */}
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-sky-400 font-semibold uppercase">
                      Card Details
                    </span>
                    <span className="text-[11px] text-slate-500">
                      CVV: {selectedCard.cvv}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Expiry Date Simulator
                      </label>
                      <select
                        value={expiryOption}
                        onChange={(e) => setExpiryOption(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="APPROVED">01/39 - Authorised & Approved</option>
                        <option value="DECLINED">05/39 - Card Declined</option>
                        <option value="EXPIRED">04/27 - Card Expired</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Security Code</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedCard.cvv}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-400 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Simulated 3D Secure / Authorisation Note */}
                <div className="p-4 bg-sky-950/30 border border-sky-800/40 rounded-2xl flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 leading-relaxed">
                    <strong>Sandbox Mode:</strong> Testing Payments.lk REST API & signed webhooks. No real money moves. Clicking Authorize triggers the official <code>payment.succeeded</code> webhook payload to credit student hours.
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleAuthorize}
                    className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing 3D Secure...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>
                          {expiryOption === "APPROVED"
                            ? `Authorize Payment (${formattedPrice})`
                            : `Simulate Decline (${formattedPrice})`}
                        </span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/payments/cancel?reference=${encodeURIComponent(reference || "")}`}
                    className="w-full sm:w-auto px-5 py-3.5 text-center text-xs font-semibold text-slate-400 hover:text-white transition"
                  >
                    Cancel Transaction
                  </Link>
                </div>
              </div>
            ) : (
              /* LankaQR Simulator Tab */
              <div className="space-y-6 text-center py-4">
                <div className="bg-white p-6 rounded-2xl inline-block shadow-lg">
                  <div className="w-44 h-44 bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl relative">
                    <QrCode className="w-32 h-32 text-slate-800" />
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs rounded-xl">
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-1 rounded">
                        LANKAQR 0.99%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="max-w-sm mx-auto space-y-2">
                  <h3 className="font-bold text-white text-sm">Scan with any Sri Lankan Banking App</h3>
                  <p className="text-xs text-slate-400">
                    Commercial Bank, BOC, Sampath Vishwa, HNB SOLO, FriMi, or SeylanPay.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleAuthorize}
                  className="w-full max-w-sm mx-auto py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simulate LankaQR Payment ({formattedPrice})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-500">
        Payments powered by <a href="https://payments.lk" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Payments.lk</a> · A Payable Company
      </footer>
    </div>
  );
}

export default function SandboxCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-8">Loading...</div>}>
      <SandboxCheckoutContent />
    </Suspense>
  );
}
