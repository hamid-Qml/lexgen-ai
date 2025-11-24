// src/mailer/mailer.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import mailConfig from 'src/config/mail.config';
import { type ConfigType } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

type SendContractShareEmailParams = {
  to: string;
  ownerName: string;
  ownerEmail: string;
  contractTitle: string;
  documentPath: string; // absolute path to PDF/DOCX on disk
  message?: string;
};

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly resend: Resend;

  constructor(
    @Inject(mailConfig.KEY) private cfg: ConfigType<typeof mailConfig>,
  ) {
    this.resend = new Resend(this.cfg.apiKey);
  }

  /**
   * Send a password reset code email for Lexy.
   */
  async sendPasswordResetEmail(to: string, code: string) {
    const appUrl = this.cfg.appBaseUrl;

    const text = [
      'You requested to reset your Lexy password.',
      '',
      `Your reset code is: ${code}`,
      '',
      'Enter this code on the reset screen to choose a new password.',
      'If you did not request this, you can safely ignore this email.',
      '',
      `Lexy – ${appUrl}`,
    ].join('\n');

    const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Reset your password</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #020617;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #e5e7eb;
      }
      .card {
        background: #020617;
        border-radius: 16px;
        border: 1px solid #1f2937;
        max-width: 520px;
        margin: 32px auto;
        padding: 0;
        overflow: hidden;
        box-shadow: 0 22px 45px rgba(15, 23, 42, 0.65);
      }
      .header-bar {
        background: #020617;
        padding: 20px 0;
        text-align: center;
        border-bottom: 1px solid #1f2937;
      }
      .brand {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #facc15;
      }
      .content {
        padding: 28px 32px 32px;
      }
      .title {
        font-size: 22px;
        font-weight: 600;
        margin: 0 0 12px;
        color: #f9fafb;
      }
      .subtitle {
        font-size: 13px;
        color: #9ca3af;
        margin: 0 0 20px;
      }
      .text {
        font-size: 14px;
        line-height: 1.7;
        margin-bottom: 18px;
        color: #d1d5db;
      }
      .code-box {
        background: #0b1120;
        border-radius: 14px;
        border: 1px solid #facc15;
        text-align: center;
        padding: 18px 0;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 0.18em;
        color: #facc15;
        margin-bottom: 22px;
      }
      .cta-btn {
        display: inline-block;
        margin-top: 4px;
        padding: 10px 20px;
        border-radius: 999px;
        background: #facc15;
        color: #111827 !important;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        color: #6b7280;
        margin-top: 24px;
      }
      .footer a {
        color: #facc15;
        text-decoration: none;
      }
    </style>
  </head>

  <body>
    <div class="card">
      <div class="header-bar">
        <div class="brand">LEXY</div>
      </div>

      <div class="content">
        <h1 class="title">Reset your password</h1>
        <p class="subtitle">
          You requested to reset your Lexy account password. Use the code below to complete the reset.
        </p>

        <div class="code-box">${code}</div>

        <p class="text">
          Enter this code on the password reset screen in the Lexy app or on the website.
        </p>

        <p class="text" style="font-size: 13px; color: #9ca3af;">
          If you did not request this, you can safely ignore this email. Your password will remain unchanged.
        </p>

        <a class="cta-btn" href="${appUrl}">Open Lexy</a>
      </div>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} Lexy. All rights reserved.
      <br />
     <a href="${appUrl}">${appUrl?.replace(/^https?:\/\//, "")}</a>
    </div>
  </body>
</html>`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.cfg.from,
        to,
        subject: 'Lexy – Your password reset code',
        text,
        html,
      });

      if (error) {
        this.logger.error('Failed to send password reset email', error);
        throw error;
      }

      this.logger.log(`Password reset email sent to ${to}`);
      return data;
    } catch (err) {
      this.logger.error('Error sending password reset email', err as Error);
      throw err;
    }
  }

  /**
   * Send a "share contract" email with a PDF/DOCX attachment.
   * This is optional for MVP but wired so you can easily use it later.
   */
  async sendContractShareEmail(params: SendContractShareEmailParams) {
    const {
      to,
      ownerName,
      ownerEmail,
      contractTitle,
      documentPath,
      message,
    } = params;

    const appUrl = this.cfg.appBaseUrl;

    // Read document and convert to base64 for Resend attachment
    let attachment: string;
    let filename = 'lexy-contract.pdf';

    try {
      const buf = fs.readFileSync(documentPath);
      attachment = buf.toString('base64');
      const base = path.basename(documentPath);
      if (base) filename = base;
    } catch (err) {
      this.logger.error(
        `Failed to read contract document at ${documentPath} for share email`,
        err as Error,
      );
      throw err;
    }

    const subject = `Contract from ${ownerName} via Lexy`;

    const introMsg =
      message && message.trim().length
        ? message.trim()
        : `${ownerName} has shared a contract generated with Lexy and would like your review.`;

    const textLines = [
      `${ownerName} (${ownerEmail}) shared a Lexy-generated contract with you.`,
      '',
      `Contract: ${contractTitle}`,
      '',
      introMsg,
      '',
      'The full document is attached as a PDF/DOCX.',
      '',
      `You can create your own contracts with Lexy here: ${appUrl}`,
    ];
    const text = textLines.join('\n');

    const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${subject}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #020617;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #e5e7eb;
      }
      .card {
        background: #020617;
        border-radius: 16px;
        border: 1px solid #1f2937;
        max-width: 520px;
        margin: 32px auto;
        padding: 0;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.65);
      }
      .header-bar {
        background: #020617;
        padding: 20px 0;
        text-align: center;
        border-bottom: 1px solid #1f2937;
      }
      .brand {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #facc15;
      }
      .content {
        padding: 28px 32px 32px;
      }
      .title {
        font-size: 22px;
        font-weight: 600;
        margin: 0 0 12px;
        color: #f9fafb;
      }
      .text {
        font-size: 14px;
        line-height: 1.7;
        margin-bottom: 14px;
        color: #d1d5db;
      }
      .pill {
        display: inline-block;
        border-radius: 999px;
        padding: 4px 12px;
        font-size: 11px;
        font-weight: 500;
        margin-right: 8px;
        margin-bottom: 4px;
        background: #0b1120;
        color: #e5e7eb;
        border: 1px solid #1f2937;
      }
      .cta-btn {
        display: inline-block;
        padding: 10px 18px;
        border-radius: 999px;
        background: #facc15;
        color: #111827 !important;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        margin-top: 12px;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        color: #6b7280;
        margin-top: 24px;
      }
      .footer a {
        color: #facc15;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header-bar">
        <div class="brand">LEXY</div>
      </div>

      <div class="content">
        <h1 class="title">A contract from ${ownerName}</h1>

        <p class="text">
          <strong>${ownerName}</strong>
          (<span style="color:#e5e7eb;">${ownerEmail}</span>)
          has shared a contract generated with Lexy.
        </p>

        <p class="text">
          <span class="pill">Contract: ${contractTitle}</span>
        </p>

        <p class="text">
          ${introMsg}
        </p>

        <p class="text">
          The full document is attached to this email as a PDF or DOCX file.
        </p>

        <p class="text">
          Want to generate your own contracts in minutes? Start with one of Lexy’s templates tailored to Australian law.
        </p>

        <a class="cta-btn" href="${appUrl}">
          Open Lexy
        </a>
      </div>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} Lexy. All rights reserved.
      <br />
      <a href="${appUrl}">${appUrl?.replace(/^https?:\/\//, "")}</a>
    </div>
  </body>
</html>`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.cfg.from,
        to,
        subject,
        text,
        html,
        attachments: [
          {
            filename,
            content: attachment,
          },
        ],
      });

      if (error) {
        this.logger.error('Failed to send contract share email', error);
        throw error;
      }

      this.logger.log(`Contract share email sent to ${to}`);
      return data;
    } catch (err) {
      this.logger.error('Error sending contract share email', err as Error);
      throw err;
    }
  }
}
