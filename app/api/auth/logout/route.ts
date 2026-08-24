import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.set("edupulse_user_email", "", { path: "/", maxAge: 0 });
  response.cookies.set("edupulse_user_role", "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  response.cookies.set("edupulse_user_email", "", { path: "/", maxAge: 0 });
  response.cookies.set("edupulse_user_role", "", { path: "/", maxAge: 0 });
  return response;
}
