import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  clearSessionCookies(response);
  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  clearSessionCookies(response);
  return response;
}

