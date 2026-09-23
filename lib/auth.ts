import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.AUTH_SECRET ||
  "edupulse_academic_secure_session_secret_key_v1_2026";

export const SESSION_COOKIE_NAME = "edupulse_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Validate secret on startup
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET && !process.env.AUTH_SECRET) {
  console.warn("⚠️ SECURITY WARNING: SESSION_SECRET or AUTH_SECRET is not set in environment variables!");
}

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

  if (!sessionCookie) {
    return { error: "Unauthorized: Active session required", status: 401 };
  }

  const sessionPayload = verifySessionToken(sessionCookie);
  if (!sessionPayload) {
    return { error: "Unauthorized: Invalid or expired session", status: 401 };
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
  const isProd = process.env.NODE_ENV === "production";

  // 1. Session Token (HTTP-only) - Must match path, sameSite, secure, and httpOnly to ensure RFC 6265 browser deletion
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
  });

  // 2. Client role sync cookie
  response.cookies.delete("edupulse_user_role");
  response.cookies.set("edupulse_user_role", "", {
    path: "/",
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
  });

  // 3. Client email sync cookie
  response.cookies.delete("edupulse_user_email");
  response.cookies.set("edupulse_user_email", "", {
    path: "/",
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
  });
}

// ==========================================
// 5. Automatic .env Admin Synchronization
// ==========================================

let lastSyncTimestamp = 0;
const SYNC_COOLDOWN_MS = 2000; // Throttle DB lookups to at most once per 2 seconds

/**
 * Automatically synchronizes the default admin user in the database
 * whenever DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, or DEFAULT_ADMIN_NAME
 * are updated in .env / environment variables.
 */
export async function syncDefaultAdminFromEnv(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastSyncTimestamp < SYNC_COOLDOWN_MS) {
    return;
  }
  lastSyncTimestamp = now;

  const envEmail = process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const envName = process.env.DEFAULT_ADMIN_NAME?.trim();

  if (!envEmail || !envPassword) {
    return;
  }

  try {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: envEmail },
    });

    if (existingByEmail) {
      const isPasswordValid = verifyPassword(envPassword, existingByEmail.passwordHash);
      const isNameMismatch = envName ? existingByEmail.name !== envName : false;
      const isRoleMismatch = existingByEmail.role !== Role.ADMIN;
      const isUnverified = !existingByEmail.emailVerified;

      if (!isPasswordValid || isNameMismatch || isRoleMismatch || isUnverified) {
        await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            ...(!isPasswordValid ? { passwordHash: hashPassword(envPassword) } : {}),
            ...(isNameMismatch ? { name: envName } : {}),
            ...(isRoleMismatch ? { role: Role.ADMIN } : {}),
            ...(isUnverified ? { emailVerified: new Date() } : {}),
          },
        });
      }
      return;
    }

    // If no user exists with this specific email, check if an existing primary ADMIN exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: Role.ADMIN },
      orderBy: { createdAt: "asc" },
    });

    if (existingAdmin) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          email: envEmail,
          passwordHash: hashPassword(envPassword),
          ...(envName ? { name: envName } : {}),
          emailVerified: existingAdmin.emailVerified || new Date(),
        },
      });
      return;
    }

    // If no admin exists at all in the database, create one
    await prisma.user.create({
      data: {
        email: envEmail,
        name: envName || "System Administrator",
        passwordHash: hashPassword(envPassword),
        role: Role.ADMIN,
        emailVerified: new Date(),
        headline: "System Administrator",
        bio: "Managing EduPulse platform curriculum, courses, users, and operations.",
        avatar: null,
      },
    });
  } catch (error) {
    console.error("Failed to sync default admin from environment:", error);
  }
}

