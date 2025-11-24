// src/config/stripe.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  mode: process.env.STRIPE_MODE ?? 'test',
  prices: {
    PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY!,
    BUSINESS_MONTHLY: process.env.STRIPE_PRICE_BUSINESS_MONTHLY!,
    BUSINESS_YEARLY: process.env.STRIPE_PRICE_BUSINESS_YEARLY!,
  },
}));
