// src/config/mail.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  apiKey: process.env.RESEND_API_KEY!,
  from: process.env.MAIL_FROM ?? 'Lexy Support <no-reply@lexy.app>',
  appBaseUrl: process.env.APP_BASE_URL,
}));
