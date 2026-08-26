"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  Loader2,
} from "lucide-react";

export type ConfirmationVariant = "danger" | "warning" | "info" | "success";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  requireConsentText?: string;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
  requireConsentText,
  isLoading: externalLoading = false,
}: ConfirmationModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const isLoading = externalLoading || internalLoading;

  const variantConfig = {
    danger: {
      icon: ShieldAlert,
      iconColor: "text-red-600",
      iconBg: "bg-red-50 border-red-200",
      btnClass: "bg-red-600 hover:bg-red-700 text-white",
      badgeText: "High Risk Action",
      badgeClass: "bg-red-100 text-red-800",
    },
    warning: {
      icon: AlertTriangle,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50 border-amber-200",
      btnClass: "bg-amber-600 hover:bg-amber-700 text-white",
      badgeText: "Confirmation Required",
      badgeClass: "bg-amber-100 text-amber-800",
    },
    info: {
      icon: Info,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50 border-blue-200",
      btnClass: "bg-[#0c2461] hover:bg-[#103080] text-white",
      badgeText: "Academy Notice",
      badgeClass: "bg-blue-100 text-blue-800",
    },
    success: {
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50 border-emerald-200",
      btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
      badgeText: "Verified Action",
      badgeClass: "bg-emerald-100 text-emerald-800",
    },
  };

  const config = variantConfig[variant];
  const IconComponent = config.icon;

  const handleConfirm = async () => {
    if (requireConsentText && !consentChecked) return;

    try {
      setInternalLoading(true);
      await onConfirm();
    } catch (err) {
      console.error("Confirmation error:", err);
    } finally {
      setInternalLoading(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border border-slate-200 shadow-2xl bg-white animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs shrink-0 ${config.iconBg} ${config.iconColor}`}
            >
              <IconComponent className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${config.badgeClass}`}
                >
                  {config.badgeText}
                </span>
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {title}
              </DialogTitle>
            </div>
          </div>

          <DialogDescription className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-0.5">
            {description}
          </DialogDescription>

          {requireConsentText && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 mt-2">
              <input
                id="modal-consent-checkbox"
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="modal-consent-checkbox"
                className="text-xs text-slate-700 font-medium leading-snug cursor-pointer select-none"
              >
                {requireConsentText}
              </label>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={onClose}
              className="text-xs font-semibold text-slate-700 h-9 px-4 rounded-xl border-slate-200"
            >
              {cancelText}
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isLoading || (Boolean(requireConsentText) && !consentChecked)}
              onClick={handleConfirm}
              className={`text-xs font-bold h-9 px-5 rounded-xl shadow-xs transition-all flex items-center gap-2 ${config.btnClass}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
