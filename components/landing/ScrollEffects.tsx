"use client";

import React, { useEffect, useState, useRef } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Slim scroll progress bar at the very top of the viewport
 */
export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (totalHeight > 0) {
            const currentProgress = (window.scrollY / totalHeight) * 100;
            setProgress(Math.min(100, Math.max(0, currentProgress)));
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[3.5px] z-[9999] pointer-events-none bg-blue-100/30">
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600 transition-[width] duration-75 ease-out shadow-[0_0_12px_rgba(37,99,235,0.7)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/**
 * Floating Back-to-Top Button with circular scroll progress ring
 */
export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          setIsVisible(scrollY > 280);
          if (totalHeight > 0) {
            setScrollPercentage(Math.min(100, Math.max(0, (scrollY / totalHeight) * 100)));
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // SVG circular progress calculation (radius = 18, circumference = 2 * PI * 18 ≈ 113.1)
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollPercentage / 100) * circumference;

  return (
    <div
      className={`fixed bottom-7 right-7 z-50 transition-all duration-300 ${
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll back to top"
        className="relative group w-12 h-12 rounded-full bg-white/95 backdrop-blur-md border border-blue-200/90 shadow-lg shadow-blue-900/10 hover:shadow-xl hover:shadow-blue-600/25 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
      >
        {/* SVG Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-1">
          <circle
            cx="20"
            cy="20"
            r={radius}
            className="text-blue-100"
            strokeWidth="2.5"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="20"
            cy="20"
            r={radius}
            className="text-blue-600 transition-all duration-100"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>

        <ArrowUp className="w-4 h-4 text-blue-600 group-hover:-translate-y-0.5 transition-transform" />
      </button>
    </div>
  );
}

interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: "fade-up" | "fade-left" | "fade-right" | "zoom-in" | "fade";
  delay?: number; // ms
  duration?: number; // ms
  className?: string;
  threshold?: number;
}

/**
 * Reusable scroll reveal component with customizable animations and stagger delays
 */
export function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 700,
  className = "",
  threshold = 0.12,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasAppeared, setHasAppeared] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check if IntersectionObserver is available
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setHasAppeared(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setHasAppeared(true);
          observer.unobserve(el);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  const getAnimationClasses = () => {
    if (hasAppeared) {
      return "opacity-100 translate-x-0 translate-y-0 scale-100";
    }

    switch (animation) {
      case "fade-left":
        return "opacity-0 -translate-x-10";
      case "fade-right":
        return "opacity-0 translate-x-10";
      case "zoom-in":
        return "opacity-0 scale-95";
      case "fade":
        return "opacity-0";
      case "fade-up":
      default:
        return "opacity-0 translate-y-8";
    }
  };

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={`transition-all ${getAnimationClasses()} ${className}`}
    >
      {children}
    </div>
  );
}

interface AnimatedCounterProps {
  value: string; // e.g. "25,000+", "150+", "80+", "99.4%"
  duration?: number; // ms
  className?: string;
}

/**
 * Smooth animated counter on scroll into view
 */
export function AnimatedCounter({
  value,
  duration = 1600,
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState("0");
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setDisplayed(value);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  useEffect(() => {
    if (!hasStarted) return;

    // Parse value: e.g. "25,000+", "99.4%", "150+"
    const cleanNum = parseFloat(value.replace(/[^0-9.]/g, ""));
    const isDecimal = value.includes(".");
    const suffix = value.replace(/[0-9.,]/g, ""); // e.g. "+", "%"
    const hasComma = value.includes(",");

    if (isNaN(cleanNum)) {
      setDisplayed(value);
      return;
    }

    let startTime: number | null = null;
    let animFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * cleanNum;

      let formatted = isDecimal ? current.toFixed(1) : Math.floor(current).toString();
      if (hasComma && !isDecimal) {
        formatted = Math.floor(current).toLocaleString();
      }

      setDisplayed(`${formatted}${suffix}`);

      if (progress < 1) {
        animFrame = requestAnimationFrame(animate);
      } else {
        setDisplayed(value);
      }
    };

    animFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animFrame);
  }, [hasStarted, value, duration]);

  return (
    <span ref={ref} className={className}>
      {hasStarted ? displayed : "0"}
    </span>
  );
}
