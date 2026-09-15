import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY || "re_MSjYqKHq_DSn9cGST1Cc9owYERFQ2BiXP";
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
}

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

async function dispatchResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  directUrl?: string;
}): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  const resend = getResendClient();
  const fromEmail = getFromEmail();

  if (!resend) {
    console.error("❌ RESEND_API_KEY is not configured.");
    return {
      success: false,
      error: "Email service is not configured. Please add RESEND_API_KEY to your environment variables.",
    };
  }

  let sender = fromEmail.includes("<") ? fromEmail : `EduPulse Academy <${fromEmail}>`;

  try {
    let result = await resend.emails.send({
      from: sender,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      headers: {
        "X-Entity-Ref-ID": Date.now().toString(),
      },
    });

    // If custom domain is not verified, auto-fallback to onboarding@resend.dev
    if (result.error && (result.error.message?.includes("not verified") || result.error.name === "validation_error")) {
      console.warn("⚠️ Resend notice: " + (result.error.message || "Domain unverified"));
      if (sender !== "EduPulse Academy <onboarding@resend.dev>") {
        sender = "EduPulse Academy <onboarding@resend.dev>";
        result = await resend.emails.send({
          from: sender,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          headers: {
            "X-Entity-Ref-ID": Date.now().toString(),
          },
        });
      }
    }

    if (result.error) {
      console.error("❌ Resend dispatch limitation:", result.error.message);
      let userFriendlyError = result.error.message;
      if (
        result.error.message?.includes("only send testing emails to your own email address") ||
        result.error.name === "validation_error"
      ) {
        userFriendlyError =
          "Resend test sandbox restriction: onboarding@resend.dev can only deliver emails to your registered Resend email address (yashanpererax200302@gmail.com). To send to all students, please verify your custom domain in your Resend dashboard (resend.com/domains) and set RESEND_FROM_EMAIL.";
      }
      return { success: false, error: userFriendlyError };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Resend email dispatch exception:", error?.message || error);
    return { success: false, error: error?.message || "Failed to deliver email" };
  }
}

/**
 * Sends an email verification link to a newly registered student via Resend.
 */
export async function sendVerificationEmail({
  email,
  name,
  token,
}: SendVerificationEmailParams): Promise<{ success: boolean; error?: string }> {
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
  <title>Verify Your Academic Email — EduPulse Academy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0">
          
          <!-- Header Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #0c2461 0%, #1e3799 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">EduPulse Academy</h1>
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
                Welcome to EduPulse Academy! Please verify your email address to activate your student account and access your live classes, past papers, and faculty lecture materials.
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
                  ⏰ <strong>Notice:</strong> This verification link will expire in <strong>24 hours</strong>. If you did not register on EduPulse, please safely ignore this message.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; 2026 EduPulse Academy London A/L &amp; O/L LMS. All rights reserved.
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

Welcome to EduPulse Academy! Please verify your email address to activate your student account.

Click the following link to verify your email address:
${verificationUrl}

This verification link will expire in 24 hours.

If you did not create an account on EduPulse Academy, please safely ignore this email.

—
EduPulse Academy London A/L & O/L LMS
`.trim();

  return await dispatchResendEmail({
    to: email,
    subject: "EduPulse — Verify Your Academic Email",
    html: htmlContent,
    text: textContent,
    directUrl: verificationUrl,
  });
}

/**
 * Sends a password reset email via Resend.
 */
export async function sendPasswordResetEmail({
  email,
  name,
  token,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;

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
  <title>Password Reset Request — EduPulse Academy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0">
          
          <tr>
            <td style="background: linear-gradient(135deg, #0c2461 0%, #1e3799 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">EduPulse Academy</h1>
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
                We received a request to reset your password for your EduPulse account. Click the button below to choose a new password.
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
                &copy; 2026 EduPulse Academy London A/L &amp; O/L LMS. All rights reserved.
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

We received a request to reset your password for your EduPulse account.

Click the following link to choose a new password:
${resetUrl}

This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.

—
EduPulse Academy London A/L & O/L LMS
`.trim();

  return await dispatchResendEmail({
    to: email,
    subject: "EduPulse — Password Reset Request",
    html: htmlContent,
    text: textContent,
    directUrl: resetUrl,
  });
}
