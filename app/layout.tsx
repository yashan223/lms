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
  title: "EduPulse | London A/L & O/L Academy",
  description:
    "Unified multi-role learning platform with accredited courses, interactive faculty curriculum studio, and system administrator control center.",
  icons: {
    icon: [
      { url: "/favicon.png?v=2", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
      { url: "/logo-square.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.png?v=2",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/logo-square.png", sizes: "180x180", type: "image/png" },
    ],
  },
  keywords: [
    "LMS",
    "Learning Management System",
    "Accredited Courses",
    "University Education",
    "Academic Governance",
    "Instructor Studio",
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
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
