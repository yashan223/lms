"use client";

import React, { useState } from "react";

interface CountryFlagProps {
  countryCode?: string;
  flagEmoji?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  title?: string;
}

function extractCountryCodeFromEmoji(emoji?: string): string {
  if (!emoji) return "";
  try {
    const chars = [...emoji];
    if (chars.length >= 2) {
      const p1 = chars[0].codePointAt(0);
      const p2 = chars[1].codePointAt(0);
      if (p1 && p2 && p1 >= 127462 && p1 <= 127487 && p2 >= 127462 && p2 <= 127487) {
        return (
          String.fromCharCode(p1 - 127397) + String.fromCharCode(p2 - 127397)
        ).toLowerCase();
      }
    }
  } catch {}
  return "";
}

export function CountryFlag({
  countryCode,
  flagEmoji,
  className = "",
  size = "sm",
  title,
}: CountryFlagProps) {
  const [hasError, setHasError] = useState(false);

  let rawCode = (countryCode || "").toLowerCase().trim();
  if (!rawCode && flagEmoji) {
    rawCode = extractCountryCodeFromEmoji(flagEmoji);
  }

  // Handle common alias
  if (rawCode === "uk") rawCode = "gb";

  const sizeMap = {
    xs: "w-4 h-2.5",
    sm: "w-5 h-3.5",
    md: "w-6 h-4",
    lg: "w-7 h-5",
  };

  const dimensionClass = sizeMap[size] || sizeMap.sm;

  if (!rawCode || rawCode === "gl" || rawCode === "globe" || rawCode === "aq" || hasError) {
    if (flagEmoji && flagEmoji !== "🌐") {
      return (
        <span className={`inline-block select-none leading-none ${className}`}>
          {flagEmoji}
        </span>
      );
    }
    return (
      <span className={`inline-block select-none text-sm leading-none ${className}`}>
        🌐
      </span>
    );
  }

  const upperCode = rawCode.toUpperCase();

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 leading-none select-none ${className}`}
      title={title || upperCode}
    >
      <img
        src={`https://flagcdn.com/w40/${rawCode}.png`}
        srcSet={`https://flagcdn.com/w80/${rawCode}.png 2x`}
        alt={upperCode}
        loading="lazy"
        onError={() => setHasError(true)}
        className={`${dimensionClass} object-cover rounded-xs border border-slate-300/80 shadow-2xs inline-block align-middle`}
      />
    </span>
  );
}

