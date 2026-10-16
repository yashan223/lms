import { Resend } from "resend";
import nodemailer from "nodemailer";
import { JWT } from "google-auth-library";

export interface SendVerificationEmailParams {
  email: string;
  name: string;
  token: string;
}

export interface SendPasswordResetEmailParams {
  email: string;
  name: string;
  token: string;
}

export interface EmailDispatchParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  directUrl?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  provider?: "google_workspace_smtp" | "google_workspace_api" | "resend";
  error?: string;
  fallbackUsed?: boolean;
}

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/$/, "");
  }
  return "https://pulseedu.online";
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getResendFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
}

// ==========================================
// 1. Google Workspace Configurations & Senders
// ==========================================

export function isGoogleWorkspaceSmtpConfigured(): boolean {
  const user =
    process.env.GMAIL_USER?.trim() ||
    process.env.GOOGLE_WORKSPACE_EMAIL?.trim() ||
    process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim();

  const pass =
    process.env.GMAIL_APP_PASSWORD?.trim() ||
    process.env.GOOGLE_WORKSPACE_APP_PASSWORD?.trim() ||
    process.env.GOOGLE_SMTP_PASS?.trim();

  return Boolean(user && pass);
}

export function isGoogleWorkspaceServiceAccountConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() &&
    process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim()
  );
}

export function isGoogleWorkspaceConfigured(): boolean {
  return isGoogleWorkspaceSmtpConfigured() || isGoogleWorkspaceServiceAccountConfigured();
}

function getGoogleSender(userFallback: string): { sender: string; replyTo: string } {
  const senderEmail =
    process.env.GOOGLE_WORKSPACE_FROM_EMAIL?.trim() ||
    process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim() ||
    userFallback;

  const sender = senderEmail.includes("<")
    ? senderEmail
    : `PulseEDU Global <${senderEmail}>`;

  const replyTo =
    process.env.RESEND_REPLY_TO?.trim() ||
    process.env.GOOGLE_WORKSPACE_REPLY_TO?.trim() ||
    (senderEmail.match(/<([^>]+)>/)?.[1] ?? senderEmail);

  return { sender, replyTo };
}

// ==========================================
// 2. Google Workspace Dispatch Engines
// ==========================================

/**
 * Primary Google Workspace Method 1:
 * SMTP via nodemailer using a Google Workspace Account or App Password.
 */
async function dispatchGoogleWorkspaceSmtp(
  params: EmailDispatchParams
): Promise<{ success: boolean; error?: string }> {
  const user =
    process.env.GMAIL_USER?.trim() ||
    process.env.GOOGLE_WORKSPACE_EMAIL?.trim() ||
    process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim();

  const rawPass =
    process.env.GMAIL_APP_PASSWORD?.trim() ||
    process.env.GOOGLE_WORKSPACE_APP_PASSWORD?.trim() ||
    process.env.GOOGLE_SMTP_PASS?.trim();

  if (!user || !rawPass) {
    return { success: false, error: "Google Workspace SMTP credentials not configured" };
  }

  const pass = rawPass.replace(/\s+/g, ""); // Strip any spaces from 16-character App Passwords
  const host = process.env.GOOGLE_SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = parseInt(process.env.GOOGLE_SMTP_PORT || "465", 10);
  const secure = (process.env.GOOGLE_SMTP_SECURE ?? "true") === "true" || port === 465;

  const { sender, replyTo } = getGoogleSender(user);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  const info = await transporter.sendMail({
    from: sender,
    to: params.to,
    replyTo: replyTo,
    subject: params.subject,
    html: params.html,
    text: params.text,
    headers: {
      "X-Entity-Ref-ID": Date.now().toString(),
      "Auto-Submitted": "auto-generated",
      "X-Auto-Response-Suppress": "All",
      "Precedence": "bulk",
    },
  });

  return { success: true };
}

/**
 * Primary Google Workspace Method 2:
 * Gmail REST API via Service Account Domain-Wide Delegation.
 */
async function dispatchGoogleWorkspaceGmailApi(
  params: EmailDispatchParams
): Promise<{ success: boolean; error?: string }> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim();

  if (!clientEmail || !privateKey || !adminEmail) {
    return { success: false, error: "Google Workspace Service Account credentials not configured" };
  }

  privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new JWT({
    email: clientEmail,
    key: privateKey,
    subject: adminEmail,
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
  });

  const { sender, replyTo } = getGoogleSender(adminEmail);
  const boundary = `__pulseedu_boundary_${Date.now()}__`;
  const subjectEncoded = `=?UTF-8?B?${Buffer.from(params.subject, "utf-8").toString("base64")}?=`;

  const headers = [
    `From: ${sender}`,
    `To: ${params.to}`,
    replyTo ? `Reply-To: ${replyTo}` : "",
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `X-Entity-Ref-ID: ${Date.now()}`,
    `Auto-Submitted: auto-generated`,
  ].filter(Boolean);

  const bodyParts = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    "",
    Buffer.from(params.text || "", "utf-8").toString("base64"),
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    "",
    Buffer.from(params.html, "utf-8").toString("base64"),
    "",
    `--${boundary}--`,
  ];

  const rawMessage = headers.concat("", bodyParts).join("\r\n");
  const rawBase64Url = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const authHeaders = await auth.getRequestHeaders();
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(adminEmail)}/messages/send`,
    {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawBase64Url }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail API send failed (${res.status}): ${errText}`);
  }

  return { success: true };
}

// ==========================================
// 3. Fallback: Resend Dispatch Engine
// ==========================================

async function dispatchResendEmail(
  params: EmailDispatchParams
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  const fromEmail = getResendFromEmail();

  if (!resend) {
    return {
      success: false,
      error: "Resend fallback service is not configured (missing RESEND_API_KEY).",
    };
  }

  let sender = fromEmail.includes("<") ? fromEmail : `PulseEDU Global <${fromEmail}>`;
  const replyTo = process.env.RESEND_REPLY_TO || (fromEmail.match(/<([^>]+)>/)?.[1] ?? fromEmail);

  try {
    let result = await resend.emails.send({
      from: sender,
      to: params.to,
      replyTo: replyTo,
      subject: params.subject,
      html: params.html,
      text: params.text,
      headers: {
        "X-Entity-Ref-ID": Date.now().toString(),
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "All",
        "Precedence": "bulk",
      },
    });

    if (
      result.error &&
      (result.error.message?.includes("not verified") || result.error.name === "validation_error")
    ) {
      console.warn("⚠️ Resend notice: " + (result.error.message || "Domain unverified"));
      if (sender !== "PulseEDU Global <onboarding@resend.dev>") {
        sender = "PulseEDU Global <onboarding@resend.dev>";
        result = await resend.emails.send({
          from: sender,
          to: params.to,
          replyTo: replyTo,
          subject: params.subject,
          html: params.html,
          text: params.text,
          headers: {
            "X-Entity-Ref-ID": Date.now().toString(),
            "Auto-Submitted": "auto-generated",
            "X-Auto-Response-Suppress": "All",
          },
        });
      }
    }

    if (result.error) {
      let userFriendlyError = result.error.message;
      if (
        result.error.message?.includes("only send testing emails to your own email address") ||
        result.error.name === "validation_error"
      ) {
        userFriendlyError =
          "Resend test sandbox restriction: onboarding@resend.dev can only deliver emails to your registered Resend email address. To send to all students, please verify your custom domain in your Resend dashboard (resend.com/domains) and set RESEND_FROM_EMAIL.";
      }
      return { success: false, error: userFriendlyError };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to deliver email via Resend" };
  }
}

// ==========================================
// 4. Unified Dispatcher (Google Workspace -> Resend Fallback)
// ==========================================

export async function dispatchAcademicEmail(
  params: EmailDispatchParams
): Promise<EmailDispatchResult> {
  const hasWorkspaceSmtp = isGoogleWorkspaceSmtpConfigured();
  const hasWorkspaceSa = isGoogleWorkspaceServiceAccountConfigured();
  let googleError: string | null = null;

  // Step 1: Attempt Google Workspace (Primary)
  if (hasWorkspaceSmtp || hasWorkspaceSa) {
    const preferredMethod = hasWorkspaceSmtp ? "SMTP" : "Gmail API";
    console.log(`\n🚀 [EMAIL DISPATCH] Attempting primary delivery via Google Workspace (${preferredMethod}) to: ${params.to}`);

    try {
      if (hasWorkspaceSmtp) {
        const smtpRes = await dispatchGoogleWorkspaceSmtp(params);
        if (smtpRes.success) {
          console.log(`✅ [EMAIL SUCCESS] Delivered via Google Workspace SMTP to: ${params.to}\n`);
          return { success: true, provider: "google_workspace_smtp" };
        }
        googleError = smtpRes.error || "Google Workspace SMTP failed";
      } else if (hasWorkspaceSa) {
        const apiRes = await dispatchGoogleWorkspaceGmailApi(params);
        if (apiRes.success) {
          console.log(`✅ [EMAIL SUCCESS] Delivered via Google Workspace Gmail API to: ${params.to}\n`);
          return { success: true, provider: "google_workspace_api" };
        }
        googleError = apiRes.error || "Google Workspace Gmail API failed";
      }
    } catch (err: any) {
      googleError = err?.message || String(err);
    }

    console.warn(`⚠️ [Google Workspace Failed] Reason: ${googleError}`);
    console.warn(`🔄 [FALLBACK TRIGGERED] Switching to Resend email delivery...\n`);
  } else {
    console.log(`ℹ️ [EMAIL DISPATCH] Google Workspace not configured. Proceeding with Resend for: ${params.to}`);
  }

  // Step 2: Attempt Resend (Secondary / Fallback)
  const resendResult = await dispatchResendEmail(params);
  if (resendResult.success) {
    const isFallback = Boolean(hasWorkspaceSmtp || hasWorkspaceSa);
    console.log(
      `✅ [EMAIL SUCCESS] Delivered via Resend to: ${params.to}${isFallback ? " (Fallback from Google Workspace)" : ""}\n`
    );
    return {
      success: true,
      provider: "resend",
      fallbackUsed: isFallback,
    };
  }

  // Both engines failed or were unavailable
  const failureSummary = googleError
    ? `Google Workspace failed (${googleError}), and Resend fallback also failed: ${resendResult.error}`
    : `Resend email dispatch failed: ${resendResult.error}`;

  console.error(`❌ [EMAIL DELIVERY FAILED] ${failureSummary}\n`);
  return { success: false, error: failureSummary };
}

// ==========================================
// 5. Verification & Password Reset Emails
// ==========================================

export async function sendVerificationEmail({
  email,
  name,
  token,
}: SendVerificationEmailParams): Promise<{ success: boolean; error?: string; provider?: string }> {
  const verificationUrl = `${getAppUrl()}/verify-email?token=${token}`;

  console.log(`\n========================================`);
  console.log(`📧 [EMAIL VERIFICATION] To: ${email}`);
  console.log(`🔗 Verification Link: ${verificationUrl}`);
  console.log(`========================================\n`);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Academic Email — PulseEDU Global</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0">
          
          <!-- Header Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #0c2461 0%, #1e3799 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">PulseEDU Global</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #93c5fd; font-weight: 500;">London A/L &amp; O/L Academic Excellence</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 28px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Verify Your Academic Email</h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hello <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Welcome to PulseEDU Global! Please verify your email address to activate your academic account and access your live classes, past papers, and course study materials.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}" style="display: inline-block; background-color: #0c2461; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 4px 12px rgba(12, 36, 97, 0.25);">
                      Verify My Email Address &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Button not working? Copy and paste this URL into your browser:
              </p>
              <p style="margin: 0 0 24px 0; font-size: 12px; color: #2563eb; word-break: break-all;">
                <a href="${verificationUrl}" style="color: #2563eb; text-decoration: underline;">${verificationUrl}</a>
              </p>

              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 12px 16px; margin-top: 24px; border-left: 4px solid #0c2461;">
                <p style="margin: 0; font-size: 12px; color: #475569;">
                  ⏰ <strong>Notice:</strong> This verification link will expire in <strong>24 hours</strong>. If you did not register on PulseEDU Global, please safely ignore this message.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; 2026 PulseEDU Global • London A/L &amp; O/L LMS. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
Hello ${name},

Welcome to PulseEDU Global! Please verify your email address to activate your academic account.

Click the following link to verify your email address:
${verificationUrl}

This verification link will expire in 24 hours.

If you did not create an account on PulseEDU Global, please safely ignore this email.

—
PulseEDU Global • London A/L & O/L LMS
`.trim();

  return await dispatchAcademicEmail({
    to: email,
    subject: "PulseEDU Global — Verify Your Academic Email",
    html: htmlContent,
    text: textContent,
    directUrl: verificationUrl,
  });
}

export async function sendPasswordResetEmail({
  email,
  name,
  token,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; error?: string; provider?: string }> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  console.log(`\n========================================`);
  console.log(`📧 [PASSWORD RESET] To: ${email}`);
  console.log(`🔗 Reset Link: ${resetUrl}`);
  console.log(`========================================\n`);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request — PulseEDU Global</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0">
          
          <tr>
            <td style="background: linear-gradient(135deg, #0c2461 0%, #1e3799 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">PulseEDU Global</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #93c5fd; font-weight: 500;">Password Recovery Security Service</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 28px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Password Reset Request</h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hi <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                We received a request to reset your password for your PulseEDU Global account. Click the button below to choose a new password.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #0c2461; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 4px 12px rgba(12, 36, 97, 0.25);">
                      Reset My Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 12px 16px; margin-top: 24px; border-left: 4px solid #0c2461;">
                <p style="margin: 0; font-size: 12px; color: #475569;">
                  ⏰ <strong>Security Notice:</strong> This link expires in <strong>1 hour</strong>. If you did not request this change, your account remains secure and no action is required.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; 2026 PulseEDU Global • London A/L &amp; O/L LMS. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
Hello ${name},

We received a request to reset your password for your PulseEDU Global account.

Click the following link to choose a new password:
${resetUrl}

This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.

—
PulseEDU Global • London A/L & O/L LMS
`.trim();

  return await dispatchAcademicEmail({
    to: email,
    subject: "PulseEDU Global — Password Reset Request",
    html: htmlContent,
    text: textContent,
    directUrl: resetUrl,
  });
}
