import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/landing/Hero";
import { AboutSection } from "@/components/landing/AboutSection";
import { CourseGrid } from "@/components/landing/CourseGrid";
import { BentoFeatures } from "@/components/landing/BentoFeatures";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { Footer } from "@/components/layout/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main className="flex-1">
        <Hero />

        <AboutSection />

        <CourseGrid />

        <BentoFeatures />

        <PricingSection />

        <FaqSection />
      </main>

      <Footer />
    </div>
  );
}
