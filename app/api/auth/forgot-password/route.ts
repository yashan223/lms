import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || user.role === "ADMIN") {
      return NextResponse.json({ success: true });
    }

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, used: false },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: user.email,
      subject: "EduPulse — Password Reset Request",
      html: `<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:40px 20px;"><div style="background:white;border-radius:16px;padding:40px;border:1px solid #e2e8f0;"><div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#0c2461;margin:0 0 6px;">EduPulse Academy</h1><p style="color:#64748b;font-size:12px;margin:0;">London A/L &amp; O/L Academy Portal</p></div><h2 style="font-size:18px;font-weight:700;color:#1e293b;margin:0 0 8px;">Password Reset Request</h2><p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">Hi <strong>${user.name}</strong>, click below to set a new password. This link expires in <strong>1 hour</strong>.</p><div style="text-align:center;margin:28px 0;"><a href="${resetUrl}" style="display:inline-block;background:#0c2461;color:white;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">Reset My Password →</a></div><p style="color:#94a3b8;font-size:12px;border-top:1px solid #f1f5f9;padding-top:20px;">If you did not request this, ignore this email — your account is safe.</p></div></div>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 });
  }
}
