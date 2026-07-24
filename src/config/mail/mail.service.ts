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

  // ─────────────────────────────────────────────────────────────
  //  SHARED HTML WRAPPER — used by all email types
  // ─────────────────────────────────────────────────────────────
  private buildEmailHtml(opts: {
    title: string;
    iconSvg: string;
    iconGradientStart: string;
    iconGradientEnd: string;
    heading: string;
    subheading: string;
    bodyHtml: string;
    footerNote?: string;
  }): string {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:48px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" style="max-width:560px;border-radius:24px;overflow:hidden;
          background:linear-gradient(160deg,#141428 0%,#1a1a35 50%,#141428 100%);
          border:1px solid rgba(99,102,241,0.25);
          box-shadow:0 24px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(99,102,241,0.1);">

          <!-- Rainbow top bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899,#8b5cf6,#6366f1);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 40px 28px;">
              <div style="
                width:72px;height:72px;border-radius:50%;
                background:linear-gradient(135deg,${opts.iconGradientStart},${opts.iconGradientEnd});
                border:1px solid rgba(99,102,241,0.35);
                display:inline-flex;align-items:center;justify-content:center;
                margin-bottom:20px;
                box-shadow:0 8px 32px rgba(99,102,241,0.3);
              ">
                ${opts.iconSvg}
              </div>

              <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#f1f5f9;letter-spacing:-0.5px;">
                ${opts.heading}
              </h1>
              <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.6;">
                ${opts.subheading}
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.2),transparent);"></div>
            </td>
          </tr>

          <!-- Dynamic body -->
          <tr>
            <td style="padding:28px 40px 8px;">
              ${opts.bodyHtml}
            </td>
          </tr>

          <!-- Bottom accent -->
          <tr>
            <td style="padding:0 40px 0;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.15),transparent);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 40px 32px;">
              ${opts.footerNote ? `<p style="margin:0 0 6px;font-size:13px;color:#475569;">${opts.footerNote}</p>` : ''}
              <p style="margin:0 0 4px;font-size:12px;color:#334155;">
                This is an automated email. Please do not reply.
              </p>
              <p style="margin:0;font-size:11px;color:#1e293b;">
                © ${year} Your Company. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
  }

  // ─────────────────────────────────────────────────────────────
  //  SUBSCRIPTION EMAIL
  // ─────────────────────────────────────────────────────────────
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

    // Per-action icon & color config
    const actionMeta: Record<
      typeof params.action,
      {
        iconSvg: string;
        gradStart: string;
        gradEnd: string;
        badgeColor: string;
        badgeText: string;
        badgeBg: string;
        badgeBorder: string;
      }
    > = {
      created: {
        iconSvg: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="url(#createdGrad)" stroke="rgba(165,180,252,0.5)" stroke-width="0.5"/>
          <path d="M9 12l2 2 4-4" stroke="#a5b4fc" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          <defs><linearGradient id="createdGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="#22c55e" stop-opacity="0.5"/>
          </linearGradient></defs>
        </svg>`,
        gradStart: 'rgba(99,102,241,0.2)',
        gradEnd: 'rgba(34,197,94,0.15)',
        badgeColor: '#86efac',
        badgeText: 'Active',
        badgeBg: 'rgba(34,197,94,0.1)',
        badgeBorder: 'rgba(34,197,94,0.25)',
      },
      upgraded: {
        iconSvg: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="url(#upgradeGrad)" stroke="rgba(165,180,252,0.5)" stroke-width="0.5"/>
          <path d="M12 7v10M8 11l4-4 4 4" stroke="#a5b4fc" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          <defs><linearGradient id="upgradeGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.5"/>
          </linearGradient></defs>
        </svg>`,
        gradStart: 'rgba(99,102,241,0.2)',
        gradEnd: 'rgba(139,92,246,0.2)',
        badgeColor: '#c4b5fd',
        badgeText: 'Upgraded',
        badgeBg: 'rgba(139,92,246,0.1)',
        badgeBorder: 'rgba(139,92,246,0.25)',
      },
      renewed: {
        iconSvg: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="url(#renewGrad)" stroke="rgba(165,180,252,0.5)" stroke-width="0.5"/>
          <path d="M12 8v4l3 3" stroke="#a5b4fc" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M7 12A5 5 0 0 1 12 7" stroke="#a5b4fc" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 2"/>
          <defs><linearGradient id="renewGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0.5"/>
          </linearGradient></defs>
        </svg>`,
        gradStart: 'rgba(14,165,233,0.2)',
        gradEnd: 'rgba(99,102,241,0.15)',
        badgeColor: '#7dd3fc',
        badgeText: 'Renewed',
        badgeBg: 'rgba(14,165,233,0.1)',
        badgeBorder: 'rgba(14,165,233,0.25)',
      },
      failed: {
        iconSvg: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="url(#failGrad)" stroke="rgba(252,165,165,0.5)" stroke-width="0.5"/>
          <path d="M12 8v5M12 16h.01" stroke="#fca5a5" stroke-width="2.2" stroke-linecap="round"/>
          <defs><linearGradient id="failGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ef4444" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#f97316" stop-opacity="0.4"/>
          </linearGradient></defs>
        </svg>`,
        gradStart: 'rgba(239,68,68,0.2)',
        gradEnd: 'rgba(249,115,22,0.15)',
        badgeColor: '#fca5a5',
        badgeText: 'Payment Failed',
        badgeBg: 'rgba(239,68,68,0.1)',
        badgeBorder: 'rgba(239,68,68,0.3)',
      },
      cancelled: {
        iconSvg: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="url(#cancelGrad)" stroke="rgba(203,213,225,0.3)" stroke-width="0.5"/>
          <path d="M8 8l8 8M16 8l-8 8" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round"/>
          <defs><linearGradient id="cancelGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#475569" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="#334155" stop-opacity="0.5"/>
          </linearGradient></defs>
        </svg>`,
        gradStart: 'rgba(71,85,105,0.25)',
        gradEnd: 'rgba(51,65,85,0.2)',
        badgeColor: '#94a3b8',
        badgeText: 'Cancelled',
        badgeBg: 'rgba(71,85,105,0.2)',
        badgeBorder: 'rgba(71,85,105,0.35)',
      },
    };

    const meta = actionMeta[params.action];
    const actionLine = this.buildActionLine(params.action, params.planName, params.previousPlanName);

    // Plain-text fallback
    const text = [
      `Hello ${params.name},`,
      '',
      actionLine,
      params.periodEnd
        ? `Current billing period ends on ${params.periodEnd.toISOString()}.`
        : null,
      '',
      'If you did not expect this change, please contact support.',
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n');

    // Info table rows
    const infoRows: string[] = [
      `<tr>
        <td style="padding:6px 0;font-size:13px;color:#64748b;border-bottom:1px solid rgba(255,255,255,0.04);">Plan</td>
        <td style="padding:6px 0;font-size:13px;color:#e2e8f0;font-weight:600;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04);">${params.planName}</td>
      </tr>`,
    ];
    if (params.previousPlanName && params.action === 'upgraded') {
      infoRows.push(`<tr>
        <td style="padding:6px 0;font-size:13px;color:#64748b;border-bottom:1px solid rgba(255,255,255,0.04);">Previous Plan</td>
        <td style="padding:6px 0;font-size:13px;color:#94a3b8;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04);">${params.previousPlanName}</td>
      </tr>`);
    }
    if (params.periodEnd) {
      infoRows.push(`<tr>
        <td style="padding:6px 0;font-size:13px;color:#64748b;">Billing Period Ends</td>
        <td style="padding:6px 0;font-size:13px;color:#e2e8f0;text-align:right;">${params.periodEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
      </tr>`);
    }

    const bodyHtml = `
      <!-- Status badge -->
      <div style="text-align:center;margin-bottom:22px;">
        <span style="
          display:inline-block;
          padding:6px 20px;
          border-radius:999px;
          background:${meta.badgeBg};
          border:1px solid ${meta.badgeBorder};
          color:${meta.badgeColor};
          font-size:11px;
          font-weight:700;
          text-transform:uppercase;
          letter-spacing:2px;
        ">${meta.badgeText}</span>
      </div>

      <!-- Message card -->
      <div style="
        background:linear-gradient(145deg,rgba(99,102,241,0.07),rgba(139,92,246,0.04));
        border:1px solid rgba(99,102,241,0.18);
        border-radius:14px;
        padding:20px 22px;
        margin-bottom:18px;
      ">
        <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.7;">${actionLine}</p>
      </div>

      <!-- Info table -->
      <div style="
        background:rgba(255,255,255,0.02);
        border:1px solid rgba(255,255,255,0.06);
        border-radius:14px;
        padding:16px 20px;
        margin-bottom:18px;
      ">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRows.join('')}
        </table>
      </div>

      ${params.action === 'failed'
        ? `<div style="
          background:rgba(239,68,68,0.07);
          border:1px solid rgba(239,68,68,0.2);
          border-left:3px solid #ef4444;
          border-radius:10px;
          padding:14px 18px;
          margin-bottom:18px;
          display:flex;align-items:flex-start;gap:10px;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;margin-top:2px;">
            <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 003.54 21H20.46A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z"
              stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
            Please update your payment method to avoid interruption to your service.
          </p>
        </div>`
        : `<div style="
          background:rgba(255,255,255,0.02);
          border:1px solid rgba(255,255,255,0.06);
          border-left:3px solid rgba(99,102,241,0.5);
          border-radius:10px;
          padding:14px 18px;
          margin-bottom:18px;
        ">
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">
            If you did not expect this change, please
            <a href="#" style="color:#a5b4fc;text-decoration:underline;">contact support</a>.
          </p>
        </div>`
      }
    `;

    const html = this.buildEmailHtml({
      title: subjectMap[params.action],
      iconSvg: meta.iconSvg,
      iconGradientStart: meta.gradStart,
      iconGradientEnd: meta.gradEnd,
      heading: 'Subscription Update',
      subheading: `Hi <strong style="color:#a5b4fc;">${params.name}</strong>, here's an update about your plan.`,
      bodyHtml,
      footerNote: 'You are receiving this email because you have an active account with us.',
    });

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: params.to,
        subject: subjectMap[params.action],
        text,
        html,
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

  // ─────────────────────────────────────────────────────────────
  //  TWO FACTOR AUTH OTP EMAIL
  // ─────────────────────────────────────────────────────────────
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

    // OTP digit boxes
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

    const bodyHtml = `
      <!-- OTP card -->
      <div style="
        background:linear-gradient(145deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05));
        border:1px solid rgba(99,102,241,0.2);
        border-radius:16px;
        padding:28px 24px;
        text-align:center;
        margin-bottom:20px;
      ">
        <p style="margin:0 0 20px;font-size:12px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:2px;">
          Your Verification Code
        </p>
        <div style="display:inline-flex;justify-content:center;flex-wrap:nowrap;">
          ${otpDigits}
        </div>
        <div style="margin-top:22px;display:flex;align-items:center;justify-content:center;gap:8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#6366f1" stroke-width="2"/>
            <path d="M12 7V12L15 15" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span style="font-size:13px;color:#64748b;">
            Expires in <strong style="color:#8b5cf6;">10 minutes</strong>
          </span>
        </div>
      </div>

      <!-- Warning -->
      <div style="
        background:rgba(239,68,68,0.07);
        border:1px solid rgba(239,68,68,0.2);
        border-left:3px solid #ef4444;
        border-radius:10px;
        padding:14px 18px;
        margin-bottom:20px;
        display:flex;align-items:flex-start;gap:10px;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;margin-top:2px;">
          <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 003.54 21H20.46A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z"
            stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div>
          <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#f87171;">Never share this code</p>
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
            If you didn't attempt to sign in, your account may be at risk.
            Please <a href="#" style="color:#f87171;text-decoration:underline;">secure your account</a> immediately.
          </p>
        </div>
      </div>

      <!-- Security tip cards -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding:0 6px 0 0;">
            <div style="
              background:rgba(255,255,255,0.02);
              border:1px solid rgba(255,255,255,0.06);
              border-radius:10px;
              padding:14px;
            ">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-10V5L12 2 4 5v7c0 6 8 10 8 10z" stroke="#6366f1" stroke-width="2"/>
                </svg>
                <span style="font-size:11px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:1px;">Single Use</span>
              </div>
              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.4;">
                This code can only be used once and expires automatically.
              </p>
            </div>
          </td>
          <td width="50%" style="padding:0 0 0 6px;">
            <div style="
              background:rgba(255,255,255,0.02);
              border:1px solid rgba(255,255,255,0.06);
              border-radius:10px;
              padding:14px;
            ">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
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
    `;

    const iconSvg = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 7V12C3 16.97 7.02 21.61 12 23C16.98 21.61 21 16.97 21 12V7L12 2Z"
        fill="url(#shieldGrad)" stroke="rgba(165,180,252,0.6)" stroke-width="0.5"/>
      <path d="M9 12L11 14L15 10" stroke="#a5b4fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <defs>
        <linearGradient id="shieldGrad" x1="3" y1="2" x2="21" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.4"/>
        </linearGradient>
      </defs>
    </svg>`;

    const html = this.buildEmailHtml({
      title: 'Your 2FA Code',
      iconSvg,
      iconGradientStart: 'rgba(99,102,241,0.2)',
      iconGradientEnd: 'rgba(139,92,246,0.2)',
      heading: 'Two-Factor Authentication',
      subheading: `Hi <strong style="color:#a5b4fc;">${params.name}</strong>, here is your secure login code.`,
      bodyHtml,
    });

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

  // ─────────────────────────────────────────────────────────────
  //  FORGOT PASSWORD OTP EMAIL
  // ─────────────────────────────────────────────────────────────
  async sendForgotPasswordEmail(params: { to: string; name: string; otp: string }) {
    const subject = 'Reset Your Password — OTP Code';

    // Plain-text fallback
    const text = [
      `Hello ${params.name},`,
      '',
      `Your password reset OTP is: ${params.otp}`,
      '',
      'This code is valid for 10 minutes.',
      '',
      'If you did not request a password reset, please ignore this email or contact support.',
    ].join('\n');

    // OTP digit boxes (same style as 2FA)
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

    const bodyHtml = `
      <!-- OTP card -->
      <div style="
        background:linear-gradient(145deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05));
        border:1px solid rgba(99,102,241,0.2);
        border-radius:16px;
        padding:28px 24px;
        text-align:center;
        margin-bottom:20px;
      ">
        <p style="margin:0 0 20px;font-size:12px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:2px;">
          Password Reset Code
        </p>
        <div style="display:inline-flex;justify-content:center;flex-wrap:nowrap;">
          ${otpDigits}
        </div>
        <div style="margin-top:22px;display:flex;align-items:center;justify-content:center;gap:8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#6366f1" stroke-width="2"/>
            <path d="M12 7V12L15 15" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span style="font-size:13px;color:#64748b;">
            Expires in <strong style="color:#8b5cf6;">10 minutes</strong>
          </span>
        </div>
      </div>

      <!-- Steps info -->
      <div style="
        background:rgba(255,255,255,0.02);
        border:1px solid rgba(255,255,255,0.06);
        border-radius:14px;
        padding:16px 20px;
        margin-bottom:20px;
      ">
        <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:1.5px;">How to reset</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:5px 0;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="
                  display:inline-flex;align-items:center;justify-content:center;
                  width:22px;height:22px;border-radius:50%;
                  background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);
                  font-size:11px;font-weight:700;color:#a5b4fc;flex-shrink:0;
                ">1</span>
                <span style="font-size:13px;color:#94a3b8;">Enter the OTP code above</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:5px 0;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="
                  display:inline-flex;align-items:center;justify-content:center;
                  width:22px;height:22px;border-radius:50%;
                  background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);
                  font-size:11px;font-weight:700;color:#a5b4fc;flex-shrink:0;
                ">2</span>
                <span style="font-size:13px;color:#94a3b8;">Choose a strong new password</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:5px 0;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="
                  display:inline-flex;align-items:center;justify-content:center;
                  width:22px;height:22px;border-radius:50%;
                  background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);
                  font-size:11px;font-weight:700;color:#a5b4fc;flex-shrink:0;
                ">3</span>
                <span style="font-size:13px;color:#94a3b8;">Sign in with your new password</span>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Security notice -->
      <div style="
        background:rgba(239,68,68,0.07);
        border:1px solid rgba(239,68,68,0.2);
        border-left:3px solid #ef4444;
        border-radius:10px;
        padding:14px 18px;
        margin-bottom:20px;
        display:flex;align-items:flex-start;gap:10px;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;margin-top:2px;">
          <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 003.54 21H20.46A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z"
            stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
          Didn't request this? <strong style="color:#f87171;">Ignore this email</strong> — your password will remain unchanged.
          If you're concerned, <a href="#" style="color:#f87171;text-decoration:underline;">contact support</a>.
        </p>
      </div>
    `;

    const iconSvg = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2" fill="url(#lockGrad)" stroke="rgba(165,180,252,0.5)" stroke-width="0.5"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#a5b4fc" stroke-width="2" stroke-linecap="round"/>
      <circle cx="12" cy="16" r="1.5" fill="#a5b4fc"/>
      <defs>
        <linearGradient id="lockGrad" x1="5" y1="11" x2="19" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.5"/>
        </linearGradient>
      </defs>
    </svg>`;

    const html = this.buildEmailHtml({
      title: 'Reset Your Password',
      iconSvg,
      iconGradientStart: 'rgba(99,102,241,0.2)',
      iconGradientEnd: 'rgba(139,92,246,0.2)',
      heading: 'Reset Your Password',
      subheading: `Hi <strong style="color:#a5b4fc;">${params.name}</strong>, use the code below to reset your password.`,
      bodyHtml,
    });

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
        `Failed to send forgot password email to ${params.to}`,
        error,
      );
      throw error;
    }
  }
}
