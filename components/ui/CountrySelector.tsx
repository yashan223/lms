"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { COUNTRIES, Country } from "@/lib/countries";
import { ChevronDown, X, Globe } from "lucide-react";

interface CountrySelectorProps {
  value: string;
  onChange: (countryName: string, country?: Country) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function CountrySelector({
  value,
  onChange,
  required = false,
  placeholder = "Select country...",
  className = "",
  id,
}: CountrySelectorProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync external value
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Outside click listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter countries by typed letters
  const filteredCountries = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return COUNTRIES;

    // Prioritize starts-with over contains
    const startsWith = COUNTRIES.filter(
      (c) => c.name.toLowerCase().startsWith(q) || c.code.toLowerCase().startsWith(q)
    );
    const contains = COUNTRIES.filter(
      (c) =>
        !c.name.toLowerCase().startsWith(q) &&
        !c.code.toLowerCase().startsWith(q) &&
        c.name.toLowerCase().includes(q)
    );
    return [...startsWith, ...contains];
  }, [inputValue]);

  // Determine current active flag shown in the field
  const currentFlag = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return null;

    // 1. Exact match
    const exact = COUNTRIES.find(
      (c) => c.name.toLowerCase() === q || c.code.toLowerCase() === q
    );
    if (exact) return exact.flag;

    // 2. Best matching country from typed letters
    if (filteredCountries.length > 0) {
      return filteredCountries[0].flag;
    }

    return null;
  }, [inputValue, filteredCountries]);

  const handleSelectCountry = (country: Country) => {
    setInputValue(country.name);
    onChange(country.name, country);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
    setHighlightedIndex(0);

    const match = COUNTRIES.find((c) => c.name.toLowerCase() === val.trim().toLowerCase());
    onChange(val, match);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        e.preventDefault();
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredCountries.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCountries.length - 1
      );
    } else if (e.key === "Enter") {
      if (isOpen && filteredCountries[highlightedIndex]) {
        e.preventDefault();
        handleSelectCountry(filteredCountries[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        {/* Dynamic Flag Icon in field when typing letters, or Lucide Globe icon */}
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none select-none z-10 w-5 h-5"
          aria-hidden="true"
        >
          {currentFlag ? (
            <span className="text-lg leading-none transition-transform duration-150 scale-105">
              {currentFlag}
            </span>
          ) : (
            <Globe className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          required={required}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full h-11 pl-10 pr-9 bg-white text-xs text-slate-800 font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs placeholder:text-slate-400"
        />

        {inputValue ? (
          <button
            type="button"
            onClick={() => {
              setInputValue("");
              onChange("", undefined);
              setIsOpen(true);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            aria-label="Clear country selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            aria-label="Open country list"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-60 flex flex-col">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Select Country / Region</span>
            <span>{filteredCountries.length} found</span>
          </div>

          <ul
            ref={listRef}
            role="listbox"
            className="overflow-y-auto divide-y divide-slate-50 py-1 text-xs"
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c, idx) => {
                const isSelected =
                  inputValue.trim().toLowerCase() === c.name.toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={c.code}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectCountry(c);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3.5 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isHighlighted
                        ? "bg-blue-50/80 text-blue-900"
                        : "text-slate-700 hover:bg-slate-50"
                    } ${isSelected ? "font-bold text-blue-700 bg-blue-50" : ""}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base select-none shrink-0 leading-none">
                        {c.flag}
                      </span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0 ml-2">
                      {c.code}
                    </span>
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-6 text-center text-xs text-slate-400">
                <Globe className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                No country found matching &ldquo;{inputValue}&rdquo;
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
