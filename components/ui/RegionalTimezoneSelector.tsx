"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Globe,
  ChevronDown,
  Check,
  Search,
  Clock,
  MapPin,
  X,
} from "lucide-react";
import {
  REGIONAL_TIMEZONES,
  RegionalTimezone,
  getRegionalTimezone,
  getUserBrowserTimezone,
  getTimezoneOffsetString,
  DEFAULT_TIMEZONE,
} from "@/lib/timezones";

interface RegionalTimezoneSelectorProps {
  selectedTimezone: string;
  onChange: (timezone: string, regionalTz: RegionalTimezone) => void;
  tutorBaseTimezone?: string;
  compact?: boolean;
  className?: string;
  showDualNotice?: boolean;
  dropdownPlacement?: "auto" | "up" | "down";
}

export function RegionalTimezoneSelector({
  selectedTimezone,
  onChange,
  tutorBaseTimezone = DEFAULT_TIMEZONE,
  compact = false,
  className = "",
  showDualNotice = true,
  dropdownPlacement = "auto",
}: RegionalTimezoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentRegion = useMemo(
    () => getRegionalTimezone(selectedTimezone),
    [selectedTimezone]
  );

  const baseRegion = useMemo(
    () => getRegionalTimezone(tutorBaseTimezone),
    [tutorBaseTimezone]
  );

  const isDifferentFromBase = currentRegion.id !== baseRegion.id;

  const calculatePlacement = () => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const estimatedHeight = 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (dropdownPlacement === "up") {
      setOpenUpwards(true);
    } else if (dropdownPlacement === "down") {
      setOpenUpwards(false);
    } else {
      setOpenUpwards(spaceBelow < estimatedHeight && spaceAbove > spaceBelow);
    }

    if (compact) {
      const estimatedWidth = 360;
      const spaceRight = window.innerWidth - rect.left;
      setAlignRight(spaceRight < estimatedWidth);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      calculatePlacement();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    calculatePlacement();
    window.addEventListener("resize", calculatePlacement);
    window.addEventListener("scroll", calculatePlacement, true);
    return () => {
      window.removeEventListener("resize", calculatePlacement);
      window.removeEventListener("scroll", calculatePlacement, true);
    };
  }, [isOpen, dropdownPlacement, compact]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const filteredRegions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return REGIONAL_TIMEZONES;
    return REGIONAL_TIMEZONES.filter(
      (r) =>
        r.region.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.countryCode.toLowerCase().includes(q) ||
        r.abbr.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelect = (tz: RegionalTimezone) => {
    onChange(tz.id, tz);
    setIsOpen(false);
  };

  const handleAutoDetect = (e: React.MouseEvent) => {
    e.stopPropagation();
    const detectedTz = getUserBrowserTimezone();
    const resolved = getRegionalTimezone(detectedTz);
    onChange(resolved.id, resolved);
    setIsOpen(false);
  };

  const liveOffset = useMemo(
    () => getTimezoneOffsetString(new Date(), currentRegion.id),
    [currentRegion.id]
  );

  return (
    <div className={`relative ${compact ? "" : "w-full"} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center justify-between gap-2.5 rounded-xl border border-sky-200 bg-white/95 px-3.5 py-2 text-left shadow-sm transition-all hover:border-sky-400 hover:bg-sky-50/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
          compact ? "text-xs py-1.5 px-3" : "text-sm w-full"
        }`}
        title={`Current Region: ${currentRegion.region} (${currentRegion.id})`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none select-none">{currentRegion.flag}</span>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-800 truncate">
                {currentRegion.region}
              </span>
              <span className="text-[11px] font-medium text-sky-700 bg-sky-100/80 px-1.5 py-0.5 rounded">
                {liveOffset}
              </span>
            </div>
            {!compact && (
              <span className="text-[11px] text-slate-500 truncate">
                {currentRegion.city} ({currentRegion.abbr})
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-sky-600" : ""
          }`}
        />
      </button>

      {showDualNotice && isDifferentFromBase && !isOpen && (
        <div className="mt-1.5 flex items-center gap-1.5 px-1 text-[11px] text-amber-800">
          <Globe className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>
            Slots converted to your local time. Tutor base:{" "}
            <strong className="font-medium text-slate-800">
              {baseRegion.flag} {baseRegion.region} ({baseRegion.abbr})
            </strong>
          </span>
        </div>
      )}

      {isOpen && (
        <div
          className={`absolute z-50 ${
            openUpwards ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } ${
            compact
              ? `w-80 sm:w-96 ${alignRight ? "right-0" : "left-0"}`
              : "w-full left-0 right-0 min-w-[280px]"
          } max-h-[min(26rem,calc(100vh-120px))] flex flex-col rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95`}
        >
          <div className="shrink-0 mb-2 flex items-center justify-between border-b border-slate-100 pb-2 px-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Globe className="h-3.5 w-3.5 text-sky-600" />
              <span>Select Your Region / Timezone</span>
            </div>

            <button
              type="button"
              onClick={handleAutoDetect}
              className="flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 transition hover:bg-sky-100 hover:text-sky-800"
              title="Detect timezone from browser"
            >
              <Globe className="h-3 w-3 text-sky-600" />
              <span>Auto-detect</span>
            </button>
          </div>

          <div className="shrink-0 relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search region, city, country..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {!searchQuery && (
            <div className="shrink-0 mb-2 border-b border-slate-100 pb-2 px-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Popular Student & Tutor Hubs
              </div>
              <div className="flex flex-wrap gap-1">
                {REGIONAL_TIMEZONES.slice(0, 6).map((pop) => (
                  <button
                    key={pop.id}
                    type="button"
                    onClick={() => handleSelect(pop)}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition ${
                      currentRegion.id === pop.id
                        ? "bg-sky-600 text-white font-medium"
                        : "bg-slate-100 text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                    }`}
                  >
                    <span>{pop.flag}</span>
                    <span>{pop.region.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-[120px] max-h-52 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
            {filteredRegions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No matching regions found for &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredRegions.map((region) => {
                const isSelected = currentRegion.id === region.id;
                const offset = getTimezoneOffsetString(new Date(), region.id);

                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => handleSelect(region)}
                    className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                      isSelected
                        ? "bg-sky-50 text-sky-900 font-medium"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg leading-none select-none shrink-0">
                        {region.flag}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 truncate">
                            {region.region}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            • {region.city}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">
                          {region.id} ({region.abbr})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 group-hover:bg-sky-100/60 px-1.5 py-0.5 rounded">
                        {offset}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-sky-600 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
