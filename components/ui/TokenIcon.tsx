import React from "react";
import { Coins, Sparkles, Clock, Zap, Gem } from "lucide-react";

interface TokenIconProps {
  className?: string;
  variant?: "coins" | "gem" | "zap" | "clock" | "sparkles";
  size?: "xs" | "sm" | "md" | "lg";
}

export function TokenIcon({
  className = "w-4 h-4",
  variant = "coins",
  size,
}: TokenIconProps) {
  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const finalClass = size ? sizeClasses[size] : className;

  if (variant === "gem") {
    return <Gem className={finalClass} />;
  }

  if (variant === "zap") {
    return <Zap className={finalClass} />;
  }

  if (variant === "clock") {
    return <Clock className={finalClass} />;
  }

  if (variant === "sparkles") {
    return <Sparkles className={finalClass} />;
  }

  return <Coins className={finalClass} />;
}

export function TokenPill({
  amount,
  label = "Hours",
  className = "",
}: {
  amount: number | string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs ${className}`}
    >
      <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center text-[10px]">
        <Coins className="w-2.5 h-2.5 text-amber-700 fill-amber-500/30" />
      </span>
      <span>
        {amount} {label}
      </span>
    </span>
  );
}
