import React from "react";
import { headers, cookies } from "next/headers";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/landing/Hero";
import { CourseGrid } from "@/components/landing/CourseGrid";
import { AboutSection } from "@/components/landing/AboutSection";
import { InstructorsSection } from "@/components/landing/InstructorsSection";
import { Testimonials } from "@/components/landing/Testimonials";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { Footer } from "@/components/layout/Footer";
import { BackToTopButton } from "@/components/landing/ScrollEffects";
import { getBundles } from "@/lib/bundles";
import { resolveGeoLocation } from "@/lib/geo";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentAcademicLevel } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const reqHeaders = await headers();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionPayload = sessionToken ? verifySessionToken(sessionToken) : null;
  const hasSession = !!sessionPayload;

  const [bundles, geo, dbUser] = await Promise.all([
    hasSession ? getBundles() : Promise.resolve([]),
    resolveGeoLocation(reqHeaders),
    sessionPayload?.userId
      ? prisma.user
          .findUnique({
            where: { id: sessionPayload.userId },
            select: { academicLevel: true, headline: true, role: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const userAcademicLevel = dbUser ? getStudentAcademicLevel(dbUser) : null;
  const isTutor = dbUser ? (dbUser.role === "TUTOR" || dbUser.role === "INSTRUCTOR" || dbUser.role === "ADMIN") : false;

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900 font-body relative">
      <Navbar />

      <main className="flex-1 min-h-[calc(100vh-4rem)]">
        {/* 1. Edunex Signature Hero Banner */}
        <Hero />

        {/* 2. Explore Classes (Both Classes & Tutors) */}
        <CourseGrid initialAcademicLevel={userAcademicLevel} />

        {/* 3. Learn From Our Expert Tutors */}
        <InstructorsSection />

        {/* 4. About Platform: Transforming Knowledge into Career Opportunities */}
        <AboutSection />

        {/* 5. Students & Users Feedback Testimonials */}
        <Testimonials />

        {/* 9. Pricing & Escrow Token Bundles (when session is active) */}
        {hasSession && (
          <PricingSection
            initialBundles={bundles}
            initialCountry={geo.country}
            initialIsSriLanka={geo.isSriLanka}
            initialIsLoggedIn={true}
            initialAcademicLevel={userAcademicLevel}
            isTutor={isTutor}
          />
        )}

        {/* 12. Frequently Asked Questions */}
        <FaqSection />
      </main>

      {/* 14. Modern Edunex 4-Column Footer */}
      <Footer />

      {/* Floating Back To Top Progress Button */}
      <BackToTopButton />
    </div>
  );
}
