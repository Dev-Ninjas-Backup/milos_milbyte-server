import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.fromAddress = process.env.SMTP_FROM || user || 'no-reply@localhost';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    } else {
      this.logger.warn(
        'SMTP environment variables are incomplete. Subscription emails will be logged instead of sent.',
      );
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  async sendSubscriptionEmail(params: {
    to: string;
    name: string;
    action: 'created' | 'upgraded' | 'renewed' | 'failed' | 'cancelled';
    planName: string;
    previousPlanName?: string | null;
    periodEnd?: Date | null;
  }) {
    const subjectMap: Record<typeof params.action, string> = {
      created: `Your subscription to ${params.planName} is active`,
      upgraded: `Your subscription was upgraded to ${params.planName}`,
      renewed: `Your subscription to ${params.planName} was renewed`,
      failed: `Payment failed for your ${params.planName} subscription`,
      cancelled: `Your subscription to ${params.planName} was cancelled`,
    };

    const bodyLines = [
      `Hello ${params.name},`,
      '',
      this.buildActionLine(
        params.action,
        params.planName,
        params.previousPlanName,
      ),
      params.periodEnd
        ? `Current billing period ends on ${params.periodEnd.toISOString()}.`
        : null,
      '',
      'If you did not expect this change, please contact support.',
    ].filter((line): line is string => Boolean(line));

    const text = bodyLines.join('\n');

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: params.to,
        subject: subjectMap[params.action],
        text,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send subscription email to ${params.to}`,
        error,
      );
      throw error;
    }
  }

  private buildActionLine(
    action: 'created' | 'upgraded' | 'renewed' | 'failed' | 'cancelled',
    planName: string,
    previousPlanName?: string | null,
  ) {
    switch (action) {
      case 'created':
        return `Your subscription to ${planName} is now active.`;
      case 'upgraded':
        return previousPlanName
          ? `Your subscription has been upgraded from ${previousPlanName} to ${planName}.`
          : `Your subscription has been upgraded to ${planName}.`;
      case 'renewed':
        return `Your ${planName} subscription payment was successful and your plan is active.`;
      case 'failed':
        return `We could not process the latest payment for your ${planName} subscription.`;
      case 'cancelled':
        return `Your ${planName} subscription has been cancelled.`;
    }
  }

  // ================= TWO FACTOR AUTH OTP =================
  async sendTwoFactorOtpEmail(params: { to: string; name: string; otp: string }) {
    const subject = 'Your Two-Factor Authentication Code';

    // Plain-text fallback
    const text = [
      `Hello ${params.name},`,
      '',
      `Your two-factor authentication (2FA) code is: ${params.otp}`,
      '',
      'This code is valid for 10 minutes. Do not share it with anyone.',
      '',
      'If you did not attempt to log in, please secure your account immediately.',
    ].join('\n');

    // Beautiful HTML email
    const otpDigits = params.otp
      .split('')
      .map(
        (d) =>
          `<span style="
            display:inline-flex;
            align-items:center;
            justify-content:center;
            width:52px;
            height:64px;
            margin:0 4px;
            border-radius:12px;
            background:linear-gradient(145deg,#1e1e3a,#2a2a4a);
            border:1px solid rgba(99,102,241,0.4);
            color:#a5b4fc;
            font-size:32px;
            font-weight:700;
            font-family:'Courier New',monospace;
            letter-spacing:0;
            box-shadow:0 4px 15px rgba(99,102,241,0.2),inset 0 1px 0 rgba(255,255,255,0.05);
          ">${d}</span>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Your 2FA Code</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:48px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" style="max-width:560px;border-radius:24px;overflow:hidden;
          background:linear-gradient(160deg,#141428 0%,#1a1a35 50%,#141428 100%);
          border:1px solid rgba(99,102,241,0.25);
          box-shadow:0 24px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(99,102,241,0.1);">

          <!-- Top accent bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899,#8b5cf6,#6366f1);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 40px 24px;">
              <!-- Shield icon -->
              <div style="
                width:72px;height:72px;border-radius:50%;
                background:linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2));
                border:1px solid rgba(99,102,241,0.35);
                display:inline-flex;align-items:center;justify-content:center;
                margin-bottom:20px;
                box-shadow:0 8px 32px rgba(99,102,241,0.25);
              ">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L3 7V12C3 16.97 7.02 21.61 12 23C16.98 21.61 21 16.97 21 12V7L12 2Z"
                    fill="url(#shieldGrad)" stroke="rgba(165,180,252,0.6)" stroke-width="0.5"/>
                  <path d="M9 12L11 14L15 10" stroke="#a5b4fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <defs>
                    <linearGradient id="shieldGrad" x1="3" y1="2" x2="21" y2="23" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.6"/>
                      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.4"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#f1f5f9;letter-spacing:-0.5px;">
                Two-Factor Authentication
              </h1>
              <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.5;">
                Hi <strong style="color:#a5b4fc;">${params.name}</strong>, here is your secure login code.
              </p>
            </td>
          </tr>

          <!-- OTP Section -->
          <tr>
            <td align="center" style="padding:8px 40px 32px;">
              <div style="
                background:linear-gradient(145deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05));
                border:1px solid rgba(99,102,241,0.2);
                border-radius:16px;
                padding:28px 24px;
              ">
                <p style="margin:0 0 20px;font-size:12px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:2px;">
                  Your Verification Code
                </p>
                <div style="display:flex;justify-content:center;gap:0;">
                  ${otpDigits}
                </div>
                <!-- Timer bar -->
                <div style="margin-top:24px;display:flex;align-items:center;justify-content:center;gap:8px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#6366f1" stroke-width="2"/>
                    <path d="M12 7V12L15 15" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  <span style="font-size:13px;color:#64748b;">
                    Expires in <strong style="color:#8b5cf6;">10 minutes</strong>
                  </span>
                </div>
              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.2),transparent);"></div>
            </td>
          </tr>

          <!-- Warning section -->
          <tr>
            <td style="padding:24px 40px;">
              <div style="
                background:rgba(239,68,68,0.07);
                border:1px solid rgba(239,68,68,0.2);
                border-left:3px solid #ef4444;
                border-radius:10px;
                padding:16px 18px;
                display:flex;align-items:flex-start;gap:12px;
              ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;margin-top:1px;">
                  <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 003.54 21H20.46A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z"
                    stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div>
                  <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f87171;">
                    Never share this code
                  </p>
                  <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
                    If you didn't attempt to sign in, your account may be at risk.
                    Please <a href="#" style="color:#f87171;text-decoration:underline;">secure your account</a> immediately.
                  </p>
                </div>
              </div>
            </td>
          </tr>

          <!-- Security tips -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding:6px 6px 6px 0;">
                    <div style="
                      background:rgba(255,255,255,0.02);
                      border:1px solid rgba(255,255,255,0.06);
                      border-radius:10px;
                      padding:14px;
                    ">
                      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M12 22s8-4 8-10V5L12 2 4 5v7c0 6 8 10 8 10z" stroke="#6366f1" stroke-width="2"/>
                        </svg>
                        <span style="font-size:11px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:1px;">Single Use</span>
                      </div>
                      <p style="margin:0;font-size:12px;color:#64748b;line-height:1.4;">
                        This code can only be used once and expires automatically.
                      </p>
                    </div>
                  </td>
                  <td width="50%" style="padding:6px 0 6px 6px;">
                    <div style="
                      background:rgba(255,255,255,0.02);
                      border:1px solid rgba(255,255,255,0.06);
                      border-radius:10px;
                      padding:14px;
                    ">
                      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="11" width="18" height="11" rx="2" stroke="#8b5cf6" stroke-width="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#8b5cf6" stroke-width="2"/>
                        </svg>
                        <span style="font-size:11px;font-weight:600;color:#8b5cf6;text-transform:uppercase;letter-spacing:1px;">Stay Safe</span>
                      </div>
                      <p style="margin:0;font-size:12px;color:#64748b;line-height:1.4;">
                        We will never ask for this code via email or phone.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom accent bar -->
          <tr>
            <td style="height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.15),transparent);"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 40px;">
              <p style="margin:0 0 8px;font-size:12px;color:#334155;">
                This is an automated security email. Please do not reply.
              </p>
              <p style="margin:0;font-size:11px;color:#1e293b;">
                © ${new Date().getFullYear()} Your Company. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- End card -->

      </td>
    </tr>
  </table>

</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: params.to,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send 2FA OTP email to ${params.to}`,
        error,
      );
      throw error;
    }
  }
}

