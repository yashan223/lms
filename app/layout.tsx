import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduPulse | Accredited Learning Platform for Students, Instructors & Admins",
  description:
    "Unified multi-role learning platform with accredited courses, interactive faculty curriculum studio, and institutional dean command center.",
  keywords: [
    "LMS",
    "Learning Management System",
    "Accredited Courses",
    "University Education",
    "Academic Governance",
    "Faculty Studio",
    "Student Learning",
    "Admin Portal",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
