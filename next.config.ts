import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Auto-sync Google Workspace Service Account credentials into process.env from JSON
try {
  const jsonPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "pulseedu-lms-2553918dfc26.json";
  const fullJsonPath = path.isAbsolute(jsonPath) ? jsonPath : path.join(process.cwd(), jsonPath);
  if (fs.existsSync(fullJsonPath)) {
    const parsed = JSON.parse(fs.readFileSync(fullJsonPath, "utf8"));
    if (parsed.client_email) process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = parsed.client_email;
    if (parsed.private_key) process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = parsed.private_key;
    if (parsed.project_id) process.env.GOOGLE_PROJECT_ID = parsed.project_id;
  }
} catch {}

const nextConfig: NextConfig = {
  env: {
    DEFAULT_ADMIN_NAME: process.env.DEFAULT_ADMIN_NAME || "Administrator",
  },
  allowedDevOrigins: [
    "pulseedu.online",
    "*.pulseedu.online",
    "54.169.4.38",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "https://pulseedu.online",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT,HEAD",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Range, edupulse_session",
          },
          {
            key: "Access-Control-Expose-Headers",
            value: "Content-Range, Accept-Ranges, Content-Length",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self 'https://meet.google.com'), microphone=(self 'https://meet.google.com'), geolocation=(), payment=(self)",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pulseedu.online",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/courses",
        destination: "/classes",
        permanent: true,
      },
      {
        source: "/courses/:slug*",
        destination: "/classes/:slug*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
