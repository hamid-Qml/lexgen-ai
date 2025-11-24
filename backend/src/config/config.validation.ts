// src/config/config.validation.ts
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(8000),

  DATABASE_URL: Joi.string().uri().required(),

  // Auth
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  BCRYPT_SALT_ROUNDS: Joi.number().min(10).default(12),

  // Mail (Resend or similar)
  RESEND_API_KEY: Joi.string().required(),
  MAIL_FROM: Joi.string().default('Lexy Support <no-reply@lexy.app>'),
  APP_BASE_URL: Joi.string().uri().required(),

  // Stripe core
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().required(),
  STRIPE_MODE: Joi.string().valid('test', 'live').default('test'),

  // Stripe price IDs – Lexy
  STRIPE_PRICE_PRO_MONTHLY: Joi.string().required(),
  STRIPE_PRICE_PRO_YEARLY: Joi.string().required(),
  STRIPE_PRICE_BUSINESS_MONTHLY: Joi.string().required(),
  STRIPE_PRICE_BUSINESS_YEARLY: Joi.string().required(),
});
