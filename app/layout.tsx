import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "../public/fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../public/fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  title: "PulseEDU | Global",
  description:
    "Unified multi-role learning platform with accredited individual classes, interactive tutor curriculum studio, and system administrator control center.",
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
    "Accredited Individual Classes",
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
