import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookies, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete("edupulse_user_role");
    cookieStore.delete("edupulse_user_email");
  } catch (err) {
    console.error("Logout POST cookieStore error:", err);
  }

  const response = NextResponse.json({ success: true, message: "Logged out" });
  clearSessionCookies(response);
  return response;
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete("edupulse_user_role");
    cookieStore.delete("edupulse_user_email");
  } catch (err) {
    console.error("Logout GET cookieStore error:", err);
  }

  const url = new URL(request.url);
  const targetUrl = new URL("/login", url.origin);
  const response = NextResponse.redirect(targetUrl);
  clearSessionCookies(response);
  return response;
}


