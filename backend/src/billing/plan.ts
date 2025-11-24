// src/billing/plan.ts

// Billing tier keys for Stripe + internal logic
export type BillingTier =
  | 'free'
  | 'pro_monthly'
  | 'pro_yearly'
  | 'business_monthly'
  | 'business_yearly';

export type PaidBillingTier = Exclude<BillingTier, 'free'>;
export type PlanKey = PaidBillingTier;

// What limits each tier has – adapt for Lexy
export interface PlanLimits {
  contractsPerMonth: number;
  watermarkExports: boolean;   // Add watermark to PDF/DOCX
  libraryAccess: 'limited' | 'full';
  priorityAi: boolean;
  teamFeatures: boolean;
}

// --- Stripe price IDs (backend only) ---------------------------
// These must be present in env & config.validation.ts

export const STRIPE_PRICE_IDS: Record<PaidBillingTier, string> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY!,
  business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY!,
};

export const STRIPE_PLAN_KEY_TO_PRICE_ID: Record<PlanKey, string> =
  STRIPE_PRICE_IDS;

export const STRIPE_PRICE_TO_TIER: Record<string, BillingTier> =
  Object.fromEntries(
    Object.entries(STRIPE_PRICE_IDS).map(([tier, priceId]) => [
      priceId,
      tier as BillingTier,
    ]),
  ) as Record<string, BillingTier>;

// --- Normal usage limits ---------------------------------------

export const PLAN_LIMITS: Record<BillingTier, PlanLimits> = {
  free: {
    contractsPerMonth: 3,
    watermarkExports: true,
    libraryAccess: 'limited',
    priorityAi: false,
    teamFeatures: false,
  },
  pro_monthly: {
    contractsPerMonth: 9999,
    watermarkExports: false,
    libraryAccess: 'full',
    priorityAi: true,
    teamFeatures: false,
  },
  pro_yearly: {
    contractsPerMonth: 9999,
    watermarkExports: false,
    libraryAccess: 'full',
    priorityAi: true,
    teamFeatures: false,
  },
  business_monthly: {
    contractsPerMonth: 9999,
    watermarkExports: false,
    libraryAccess: 'full',
    priorityAi: true,
    teamFeatures: true,
  },
  business_yearly: {
    contractsPerMonth: 9999,
    watermarkExports: false,
    libraryAccess: 'full',
    priorityAi: true,
    teamFeatures: true,
  },
};

// --- Trial limits (e.g. 7-day trials) --------------------------

export const TRIAL_LIMITS: Record<PaidBillingTier, PlanLimits> = {
  pro_monthly: {
    contractsPerMonth: 5,
    watermarkExports: false,
    libraryAccess: 'full',
    priorityAi: true,
    teamFeatures: false,
  },
  pro_yearly: {
    contractsPerMonth: 5,
    watermarkExports: false,
    libraryAccess: 'full',
    priorityAi: true,
    teamFeatures: false,
  },
  business_monthly: {
    contractsPerMonth: 5,
    watermarkExports: false,
    libraryAccess: 'full',
    priorityAi: true,
    teamFeatures: true,
  },
  business_yearly: {
    contractsPerMonth: 5,
    watermarkExports: false,
    libraryAccess: 'full',
    priorityAi: true,
    teamFeatures: true,
  },
};
