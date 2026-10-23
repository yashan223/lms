"use client";

import React, { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollEffects";

/**
 * Interactive Education Canvas
 * Renders floating academic symbols: mortarboard caps, open books, atom orbits,
 * math & science glyphs (π, ∑, √x, ∞, A+, ∫, e=mc²), and achievement sparkles
 * with gentle upward drift, interactive deflection, and connecting knowledge paths.
 */
function HeroEducationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", onResize);

    const MATH_GLYPHS = ["π", "∑", "√x", "∞", "A+", "∫", "Δ", "e=mc²", "θ", "λ", "d/dx"];
    const TYPES = ["cap", "book", "atom", "math", "glyph", "particle"] as const;
    type SymbolType = (typeof TYPES)[number];

    const count = Math.min(Math.floor(width / 34), 45);
    const symbols = Array.from({ length: count }, (_, idx) => {
      const type: SymbolType =
        idx % 6 === 0
          ? "cap"
          : idx % 6 === 1
          ? "book"
          : idx % 6 === 2
          ? "atom"
          : idx % 6 === 3
          ? "glyph"
          : idx % 6 === 4
          ? "math"
          : "particle";

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(Math.random() * 0.45 + 0.22), // Gentle upward atmospheric drift
        size:
          type === "cap"
            ? 19
            : type === "book"
            ? 17
            : type === "atom"
            ? 17
            : 14,
        rotation: (Math.random() - 0.5) * 0.5,
        vRot: (Math.random() - 0.5) * 0.012,
        baseAlpha: Math.random() * 0.3 + 0.18,
        glyph: MATH_GLYPHS[Math.floor(Math.random() * MATH_GLYPHS.length)],
        isCyan: Math.random() > 0.45,
        type,
      };
    });

    let mouseX = -1000;
    let mouseY = -1000;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // Drawing helper: Graduation Mortarboard Cap
    const drawCap = (c: CanvasRenderingContext2D, size: number) => {
      // Diamond mortarboard top
      c.beginPath();
      c.moveTo(0, -size * 0.42);
      c.lineTo(size * 0.88, 0);
      c.lineTo(0, size * 0.42);
      c.lineTo(-size * 0.88, 0);
      c.closePath();
      c.stroke();
      c.fill();

      // Skullcap arch below
      c.beginPath();
      c.moveTo(-size * 0.45, size * 0.16);
      c.quadraticCurveTo(0, size * 0.62, size * 0.45, size * 0.16);
      c.lineTo(size * 0.45, size * 0.36);
      c.quadraticCurveTo(0, size * 0.82, -size * 0.45, size * 0.36);
      c.closePath();
      c.stroke();

      // Tassel button and hanging cord
      c.beginPath();
      c.arc(0, 0, size * 0.08, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(size * 0.65, size * 0.28);
      c.lineTo(size * 0.7, size * 0.68);
      c.stroke();
    };

    // Drawing helper: Open Textbook with fluttering pages
    const drawBook = (c: CanvasRenderingContext2D, size: number) => {
      const w = size * 0.85;
      const h = size * 0.58;
      // Left page curve
      c.beginPath();
      c.moveTo(0, h * 0.65);
      c.quadraticCurveTo(-w * 0.5, h * 0.35, -w, h * 0.55);
      c.lineTo(-w, -h * 0.55);
      c.quadraticCurveTo(-w * 0.5, -h * 0.75, 0, -h * 0.5);
      c.closePath();
      c.stroke();
      c.fill();

      // Right page curve
      c.beginPath();
      c.moveTo(0, h * 0.65);
      c.quadraticCurveTo(w * 0.5, h * 0.35, w, h * 0.55);
      c.lineTo(w, -h * 0.55);
      c.quadraticCurveTo(w * 0.5, -h * 0.75, 0, -h * 0.5);
      c.closePath();
      c.stroke();
      c.fill();

      // Spine divider
      c.beginPath();
      c.moveTo(0, -h * 0.5);
      c.lineTo(0, h * 0.65);
      c.stroke();
    };

    // Drawing helper: Science Atom Orbital
    const drawAtom = (c: CanvasRenderingContext2D, size: number, rot: number) => {
      // Nucleus
      c.beginPath();
      c.arc(0, 0, size * 0.16, 0, Math.PI * 2);
      c.fill();

      // Elliptical Orbits
      c.beginPath();
      c.ellipse(0, 0, size * 0.85, size * 0.32, Math.PI / 4, 0, Math.PI * 2);
      c.stroke();

      c.beginPath();
      c.ellipse(0, 0, size * 0.85, size * 0.32, -Math.PI / 4, 0, Math.PI * 2);
      c.stroke();

      // Orbiting electron dot
      const eX =
        Math.cos(rot * 2.8) * size * 0.85 * Math.cos(Math.PI / 4) -
        Math.sin(rot * 2.8) * size * 0.32 * Math.sin(Math.PI / 4);
      const eY =
        Math.cos(rot * 2.8) * size * 0.85 * Math.sin(Math.PI / 4) +
        Math.sin(rot * 2.8) * size * 0.32 * Math.cos(Math.PI / 4);
      c.beginPath();
      c.arc(eX, eY, size * 0.1, 0, Math.PI * 2);
      c.fill();
    };

    let tick = 0;
    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < symbols.length; i++) {
        const s = symbols[i];
        s.x += s.vx;
        s.y += s.vy;
        s.rotation += s.vRot;

        // Wrap around vertically & horizontally
        if (s.y < -35) {
          s.y = height + 25;
          s.x = Math.random() * width;
        }
        if (s.x < -35) s.x = width + 25;
        if (s.x > width + 35) s.x = -25;

        // Interactive mouse evasion
        const dx = mouseX - s.x;
        const dy = mouseY - s.y;
        const dist = Math.hypot(dx, dy);
        let alphaBoost = 0;
        if (dist < 140) {
          s.x -= (dx / dist) * 1.1;
          s.y -= (dy / dist) * 1.1;
          alphaBoost = 0.28 * (1 - dist / 140);
        }

        const alpha = Math.min(s.baseAlpha + alphaBoost, 0.75);
        const strokeColor = s.isCyan
          ? `rgba(14, 165, 233, ${alpha})`
          : `rgba(37, 99, 235, ${alpha})`;
        const fillColor = s.isCyan
          ? `rgba(56, 189, 248, ${alpha * 0.25})`
          : `rgba(37, 99, 235, ${alpha * 0.2})`;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;
        ctx.lineWidth = 1.25;

        if (s.type === "cap") {
          drawCap(ctx, s.size);
        } else if (s.type === "book") {
          drawBook(ctx, s.size);
        } else if (s.type === "atom") {
          drawAtom(ctx, s.size, tick * 0.02 + i);
        } else if (s.type === "math" || s.type === "glyph") {
          ctx.fillStyle = strokeColor;
          ctx.font = `700 ${Math.round(s.size * 1.1)}px ui-sans-serif, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(s.glyph, 0, 0);
        } else {
          // Knowledge particle node
          ctx.beginPath();
          ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = strokeColor;
          ctx.fill();
        }

        ctx.restore();

        // Connect neighboring educational nodes with subtle chalk-like knowledge paths
        for (let j = i + 1; j < symbols.length; j++) {
          const s2 = symbols[j];
          const cDist = Math.hypot(s.x - s2.x, s.y - s2.y);
          if (cDist < 115) {
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s2.x, s2.y);
            ctx.strokeStyle = `rgba(37, 99, 235, ${0.12 * (1 - cDist / 115)})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}

export function Hero() {
  const handleScrollToTutors = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById("tutors") || document.getElementById("courses");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollToClasses = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("edupulse:switch-tab", { detail: "classes" }));
    }
    const element = document.getElementById("courses") || document.getElementById("categories");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="hero" className="relative w-full overflow-hidden bg-gradient-to-b from-sky-50/70 via-white to-blue-50/30 pt-8 pb-14 lg:pt-14 lg:pb-20 border-b border-slate-100">
      {/* ─── 1. Interactive Education Canvas Animation ─── */}
      <HeroEducationCanvas />

      {/* ─── 2. Floating Luminous Ambient Blobs ─── */}
      <div className="absolute -top-24 right-0 w-[620px] h-[520px] bg-gradient-to-bl from-sky-200/50 via-cyan-100/35 to-transparent rounded-full blur-3xl pointer-events-none z-0 animate-blob" />
      <div className="absolute -bottom-20 -left-20 w-[540px] h-[440px] bg-gradient-to-tr from-blue-200/45 via-sky-100/35 to-transparent rounded-full blur-3xl pointer-events-none z-0 animate-blob-delayed" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[480px] h-[360px] bg-cyan-100/30 rounded-full blur-3xl pointer-events-none z-0 animate-pulse-subtle" />

      {/* ─── 3. Subtle Dynamic Tech Grid Pattern Overlay ─── */}
      <div className="absolute inset-0 bg-grid-blue-pattern opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_80%)] pointer-events-none z-0" />

      {/* ─── 4. Floating Sparkle Nodes ─── */}
      <div className="absolute top-28 right-1/3 w-3 h-3 rounded-full bg-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.7)] pointer-events-none z-0 animate-float-badge" />
      <div className="absolute bottom-28 left-12 w-2.5 h-2.5 rounded-full bg-blue-500/70 shadow-[0_0_10px_rgba(37,99,235,0.7)] pointer-events-none animate-float-badge-delayed z-0" />

      {/* ─── Main Hero Content ─── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Actions & Trust Proof */}
          <div className="lg:col-span-7 xl:col-span-6 flex flex-col items-start">
            <ScrollReveal animation="fade-up" duration={750} className="w-full">
              
              {/* PulseEdu Logo (Bigger & Prominent) */}
              <div className="mb-5 sm:mb-6">
                <img
                  src="/logo-wide.png"
                  alt="PulseEdu"
                  className="h-20 sm:h-24 lg:h-28 xl:h-32 w-auto object-contain select-none drop-shadow-sm -ml-1 sm:-ml-1.5"
                />
              </div>

              {/* Main Headline (Single Solid Color) */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black font-heading text-[#0c2461] tracking-tight leading-[1.14] mb-8">
                Elevate Your Learning Journey.{" "}
                <span className="block text-[#0c2461] mt-1 sm:mt-1.5">
                  The Smarter Way to Learn &amp; Grow.
                </span>
              </h1>

              {/* Signature Capsule Action Buttons (Both Crisp White) */}
              <div className="flex flex-wrap items-center gap-3.5 mb-10 w-full sm:w-auto">
                <a
                  href="#courses"
                  onClick={handleScrollToTutors}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white hover:bg-blue-50/50 text-[#0c163b] hover:text-blue-600 border border-slate-200 hover:border-blue-300 text-sm font-bold shadow-xs flex items-center justify-center gap-3 transition-all hover:scale-[1.02] group cursor-pointer"
                >
                  <span>View Tutors</span>
                  <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center group-hover:translate-x-0.5 transition-all shadow-xs">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </a>

                <a
                  href="#courses"
                  onClick={handleScrollToClasses}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white hover:bg-blue-50/50 text-[#0c163b] hover:text-blue-600 border border-slate-200 hover:border-blue-300 text-sm font-bold shadow-xs flex items-center justify-center gap-3 transition-all hover:scale-[1.02] group cursor-pointer"
                >
                  <span>Find Classes</span>
                  <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center group-hover:translate-x-0.5 transition-all shadow-xs">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </a>
              </div>

              {/* Social Proof Badges & Metric */}
              <div className="flex items-center gap-3.5 pt-1">
                <img
                  src="/images/hero_trust_badges_3d.png"
                  alt="Global Learning Trust Badges"
                  className="h-9 sm:h-10 w-auto object-contain shrink-0 select-none"
                />
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-bold text-[#0c163b] leading-tight">
                    Transforming careers
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    in 120+ countries
                  </span>
                </div>
              </div>

            </ScrollReveal>
          </div>

          {/* Right Column: 3D Platform Dashboard Visual (Larger & Elevated) */}
          <div className="lg:col-span-5 xl:col-span-6 relative flex justify-center items-center mt-6 lg:-mt-10 xl:-mt-14">
            <ScrollReveal animation="fade-left" delay={150} duration={800} className="w-full max-w-[640px] lg:max-w-[720px] xl:max-w-[780px]">
              <div className="relative w-full flex justify-center">
                <img
                  src="/images/dashbord.png"
                  alt="Interactive Learning Dashboard Platform"
                  className="w-full h-auto max-h-[560px] lg:max-h-[640px] object-contain drop-shadow-2xl select-none transform hover:scale-[1.02] transition-transform duration-300"
                />
              </div>
            </ScrollReveal>
          </div>

        </div>
      </div>
    </section>
  );
}
