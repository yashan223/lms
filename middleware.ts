import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "edupulse_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.AUTH_SECRET ||
  "edupulse_academic_secure_session_secret_key_v1_2026";

interface SessionPayload {
  userId: string;
  email: string;
  role: "ADMIN" | "TUTOR" | "STUDENT";
  iat: number;
  exp: number;
}

// Allowed CORS origins for pulseedu.online, subdomains, and local dev
const ALLOWED_ORIGIN_REGEX =
  /^(https?:\/\/(?:[a-z0-9-]+\.)*pulseedu\.online(:[0-9]+)?|https?:\/\/(?:[a-z0-9-]+\.)*xoxod33p\.tech(:[0-9]+)?|http:\/\/localhost:[0-9]+|http:\/\/127\.0\.0\.1:[0-9]+)$/i;

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed =
    origin &&
    (ALLOWED_ORIGIN_REGEX.test(origin) ||
      origin === "https://pulseedu.online" ||
      origin === "http://pulseedu.online");

  const allowOrigin = isAllowed ? origin : "https://pulseedu.online";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
    "Access-Control-Allow-Headers":
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Range, edupulse_session",
    "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
    "Access-Control-Max-Age": "86400",
  };
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifySessionTokenEdge(token: string): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadBase64, signatureBase64] = parts;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const data = encoder.encode(payloadBase64);
    const signatureBytes = base64UrlToUint8Array(signatureBase64);

    const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes as unknown as BufferSource, data);
    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(payloadBase64));
    const payload: SessionPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // ── 0. Handle CORS preflight OPTIONS requests for API routes ──────────────
  if (pathname.startsWith("/api/")) {
    const corsHeaders = getCorsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // For other API requests, process downstream and attach CORS headers
    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionTokenEdge(sessionCookie) : null;

  // 1. Protect /admin routes
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "ADMIN") {
      const dest = session.role === "TUTOR" ? "/tutor" : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  // 2. Protect /tutor routes
  if (pathname.startsWith("/tutor")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "TUTOR" && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // 3. Protect /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Redirect already authenticated users away from auth pages
  if (pathname === "/login" || pathname === "/register") {
    if (request.nextUrl.searchParams.has("logout")) {
      const cleanUrl = new URL(pathname, request.url);
      cleanUrl.searchParams.delete("logout");
      const response = NextResponse.redirect(cleanUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      response.cookies.delete("edupulse_user_role");
      response.cookies.delete("edupulse_user_email");
      return response;
    }

    if (session) {
      if (session.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else if (session.role === "TUTOR") {
        return NextResponse.redirect(new URL("/tutor", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/tutor/:path*",
    "/dashboard/:path*",
    "/login",
    "/register",
  ],
};
