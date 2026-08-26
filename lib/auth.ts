import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.AUTH_SECRET ||
  "edupulse_academic_secure_session_secret_key_v1_2026";

const SESSION_COOKIE_NAME = "edupulse_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ==========================================
// 1. Cryptographic Password Hashing (scrypt)
// ==========================================

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith("scrypt:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) return false;

    const salt = parts[1];
    const originalHashHex = parts[2];
    const originalHash = Buffer.from(originalHashHex, "hex");

    try {
      const derivedKey = crypto.scryptSync(password, salt, 64);
      return crypto.timingSafeEqual(originalHash, derivedKey);
    } catch {
      return false;
    }
  }

  // Legacy comparison for seeded/initial plain text passwords
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(storedHash);
    if (a.length !== b.length) {
      return password === storedHash;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return password === storedHash;
  }
}

export function isLegacyPasswordHash(storedHash: string): boolean {
  return !storedHash || !storedHash.startsWith("scrypt:");
}

// ==========================================
// 2. Tamper-Proof HMAC Session Tokens
// ==========================================

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

export function createSessionToken(user: { id: string; email: string; role: Role }): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email.toLowerCase(),
    role: user.role,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadBase64)
    .digest("base64url");

  return `${payloadBase64}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadBase64)
    .digest("base64url");

  try {
    const a = Buffer.from(signature, "utf-8");
    const b = Buffer.from(expectedSignature, "utf-8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload: SessionPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

// ==========================================
// 3. Centralized RBAC Authentication Guard
// ==========================================

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
  headline: string | null;
  bio: string | null;
  phone: string | null;
  createdAt: Date;
};

export type AuthResult =
  | { user: AuthUser; payload: SessionPayload; error?: never; status?: never }
  | { user?: never; payload?: never; error: string; status: 401 | 403 };

const USER_SELECT_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  headline: true,
  bio: true,
  phone: true,
  createdAt: true,
} as const;

export async function getAuthenticatedUser(
  request: NextRequest,
  allowedRoles?: Role[]
): Promise<AuthResult> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let sessionPayload: SessionPayload | null = null;

  if (sessionCookie) {
    sessionPayload = verifySessionToken(sessionCookie);
  }

  // Fallback check for transition / cookie migration if needed
  if (!sessionPayload) {
    const emailCookie = request.cookies.get("edupulse_user_email")?.value;

    if (emailCookie) {
      const dbUser = await prisma.user.findUnique({
        where: { email: emailCookie.toLowerCase() },
        select: USER_SELECT_FIELDS,
      });

      if (dbUser) {
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(dbUser.role)) {
          return { error: "Forbidden: Insufficient privileges", status: 403 };
        }

        return {
          user: dbUser,
          payload: {
            userId: dbUser.id,
            email: dbUser.email,
            role: dbUser.role,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
          },
        };
      }
    }

    return { error: "Unauthorized: Active session required", status: 401 };
  }

  // Verify user still exists in DB
  const dbUser = await prisma.user.findUnique({
    where: { id: sessionPayload.userId },
    select: USER_SELECT_FIELDS,
  });

  if (!dbUser) {
    return { error: "Unauthorized: User account not found or deleted", status: 401 };
  }

  // Verify Role match
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(dbUser.role)) {
    return { error: "Forbidden: Access denied for role", status: 403 };
  }

  return {
    user: dbUser,
    payload: sessionPayload,
  };
}

// ==========================================
// 4. Session Cookie Helpers
// ==========================================

export function attachSessionCookies(
  response: NextResponse,
  user: { id: string; email: string; role: Role }
): void {
  const token = createSessionToken(user);
  const isProd = process.env.NODE_ENV === "production";

  // Secure HttpOnly session cookie
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  // Client-readable non-sensitive UI sync cookies
  response.cookies.set("edupulse_user_role", user.role, {
    path: "/",
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  response.cookies.set("edupulse_user_email", user.email.toLowerCase(), {
    path: "/",
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  response.cookies.set("edupulse_user_role", "", { path: "/", maxAge: 0 });
  response.cookies.set("edupulse_user_email", "", { path: "/", maxAge: 0 });
}
