import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY not found in environment. Simulated email delivery.");
    return { success: true };
  }

  let sender = fromEmail.includes("<") ? fromEmail : `EduPulse Academy <${fromEmail}>`;

  try {
    let result = await resend.emails.send({
      from: sender,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    // If custom domain is not verified, auto-fallback to onboarding@resend.dev
    if (result.error && (result.error.message?.includes("not verified") || result.error.name === "validation_error")) {
      console.warn("⚠️ Custom domain not verified on Resend. Automatically falling back to onboarding@resend.dev");
      sender = "EduPulse Academy <onboarding@resend.dev>";
      result = await resend.emails.send({
        from: sender,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
    }

    if (result.error) {
      console.error("Resend API Dispatch Error:", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Resend email dispatch exception:", error);
    return { success: false, error: error?.message || "Failed to send email" };
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
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;

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

  return await dispatchResendEmail({
    to: email,
    subject: "EduPulse — Verify Your Academic Email",
    html: htmlContent,
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
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

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

  return await dispatchResendEmail({
    to: email,
    subject: "EduPulse — Password Reset Request",
    html: htmlContent,
  });
}
