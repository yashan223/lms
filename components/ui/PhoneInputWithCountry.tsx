"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { COUNTRIES, Country, findCountry, findCountryByDialCode } from "@/lib/countries";
import { ChevronDown, Search, Phone, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PhoneInputWithCountryProps {
  value: string;
  countryCode: string;
  onPhoneChange: (val: string) => void;
  onCountryCodeChange: (code: string, country?: Country) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function PhoneInputWithCountry({
  value,
  countryCode,
  onPhoneChange,
  onCountryCodeChange,
  placeholder = "e.g. 7700 900142",
  required = false,
  disabled = false,
  className = "",
  id,
}: PhoneInputWithCountryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active country matching the dial code
  const selectedCountry = useMemo(() => {
    return (
      COUNTRIES.find((c) => c.dialCode === countryCode) ||
      findCountryByDialCode(countryCode) ||
      COUNTRIES[0] // Default to UK (+44)
    );
  }, [countryCode]);

  // Outside click handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Filter countries for the dial code dropdown
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;

    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q)
    );
  }, [searchQuery]);

  const handleSelectCountry = (country: Country) => {
    onCountryCodeChange(country.dialCode, country);
    setIsOpen(false);
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // If user pastes or types a full number starting with +, parse dial code
    if (raw.startsWith("+")) {
      const match = COUNTRIES.find((c) => raw.startsWith(c.dialCode));
      if (match) {
        onCountryCodeChange(match.dialCode, match);
        raw = raw.slice(match.dialCode.length).trim();
      }
    }

    onPhoneChange(raw);
  };

  return (
    <div className={`relative flex items-center ${className}`} ref={dropdownRef}>
      {/* Dial Code Dropdown Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="h-11 px-2.5 sm:px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:z-10"
      >
        <span className="text-base leading-none">{selectedCountry.flag}</span>
        <span className="font-mono text-slate-700">{selectedCountry.dialCode}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Main Phone Input Field */}
      <div className="relative flex-1">
        <Input
          id={id}
          type="tel"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={handleNumberInput}
          className="h-11 pl-3 pr-3 text-xs border-slate-200 rounded-l-none rounded-r-xl focus-visible:ring-blue-600 font-mono tracking-wide"
        />
      </div>

      {/* Dropdown Menu for Dial Codes */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 w-72 sm:w-80 max-h-72 flex flex-col">
          {/* Search Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/60 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code (+44, Sri Lanka)..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* List of Countries with Dial Codes */}
          <ul role="listbox" className="overflow-y-auto flex-1 p-1 space-y-0.5 text-xs">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry.code && c.dialCode === selectedCountry.dialCode;
                return (
                  <li key={`${c.code}-${c.dialCode}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 text-blue-900 font-bold"
                          : "text-slate-700 hover:bg-slate-100 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        <span className="text-base leading-none shrink-0">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-slate-500 font-bold">{c.dialCode}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="py-6 text-center text-xs text-slate-400 font-medium">
                No matching country code found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
