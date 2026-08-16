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
      {/* Sticky Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1">
        {/* 1. Hero Section */}
        <Hero />

        {/* 2. Dedicated About Section with id="about" */}
        <AboutSection />

        {/* 4. Trending & Filterable Course Catalog (id="courses") */}
        <CourseGrid />

        {/* 6. Platform Capabilities Bento Grid (id="features") */}
        <BentoFeatures />

        {/* 8. Role-Oriented Pricing with Annual Discount */}
        <PricingSection />

        {/* 9. Frequently Asked Questions (id="faq") */}
        <FaqSection />
      </main>

      {/* Multi-Column Footer */}
      <Footer />
    </div>
  );
}
