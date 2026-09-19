import React from "react";
import { headers, cookies } from "next/headers";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/landing/Hero";
import { AboutSection } from "@/components/landing/AboutSection";
import { CourseGrid } from "@/components/landing/CourseGrid";
import { BentoFeatures } from "@/components/landing/BentoFeatures";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { Footer } from "@/components/layout/Footer";
import { getBundles } from "@/lib/bundles";
import { resolveGeoLocation } from "@/lib/geo";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const reqHeaders = await headers();
  const cookieStore = await cookies();
  const hasSession =
    !!cookieStore.get(SESSION_COOKIE_NAME)?.value ||
    !!cookieStore.get("edupulse_user_role")?.value;

  const [bundles, geo] = await Promise.all([
    getBundles(),
    resolveGeoLocation(reqHeaders),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main className="flex-1">
        <Hero />

        <AboutSection />

        <CourseGrid />

        <BentoFeatures />

        <PricingSection
          initialBundles={bundles}
          initialCountry={geo.country}
          initialIsSriLanka={geo.isSriLanka}
          initialIsLoggedIn={hasSession}
        />

        <FaqSection />
      </main>

      <Footer />
    </div>
  );
}
