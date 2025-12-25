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

export interface PlanLimits {
  contractsPerMonth: number;
  watermarkExports: boolean;
  libraryAccess: 'limited' | 'full';
  priorityAi: boolean;
  teamFeatures: boolean;
}

// --- Stripe price IDs (backend only) ---------------------------

export const STRIPE_PRICE_IDS: Record<PaidBillingTier, string> = {
  pro_monthly: '',
  pro_yearly: '',
  business_monthly: '',
  business_yearly: '',
};

// PlanKey -> priceId
export let STRIPE_PLAN_KEY_TO_PRICE_ID: Record<PlanKey, string> =
  STRIPE_PRICE_IDS;

// priceId -> BillingTier
export let STRIPE_PRICE_TO_TIER: Record<string, BillingTier> = {};

// Called once from BillingService constructor
export function initStripePrices(prices: {
  PRO_MONTHLY: string;
  PRO_YEARLY: string;
  BUSINESS_MONTHLY: string;
  BUSINESS_YEARLY: string;
}) {
  const entries = Object.entries(prices);
  const missing = entries.filter(
    ([, value]) => typeof value !== 'string' || value.trim() === '',
  );
  if (missing.length) {
    throw new Error(
      `Missing Stripe price IDs: ${missing.map(([key]) => key).join(', ')}`,
    );
  }
  const values = entries.map(([, value]) => value.trim());
  const unique = new Set(values);
  if (unique.size !== values.length) {
    throw new Error('Stripe price IDs must be unique');
  }

  STRIPE_PRICE_IDS.pro_monthly = prices.PRO_MONTHLY;
  STRIPE_PRICE_IDS.pro_yearly = prices.PRO_YEARLY;
  STRIPE_PRICE_IDS.business_monthly = prices.BUSINESS_MONTHLY;
  STRIPE_PRICE_IDS.business_yearly = prices.BUSINESS_YEARLY;

  STRIPE_PLAN_KEY_TO_PRICE_ID = { ...STRIPE_PRICE_IDS };

  STRIPE_PRICE_TO_TIER = Object.fromEntries(
    Object.entries(STRIPE_PRICE_IDS).map(([tier, priceId]) => [
      priceId,
      tier as BillingTier,
    ]),
  ) as Record<string, BillingTier>;
}

// --- Normal usage limits (unchanged) ---------------------------
export const PLAN_LIMITS: Record<BillingTier, PlanLimits> = {
  free: {
    contractsPerMonth: 3,
    watermarkExports: true,
    libraryAccess: 'limited',
    priorityAi: false,
    teamFeatures: false,
  },
  pro_monthly: {
    contractsPerMonth: 20,
    watermarkExports: false,
    libraryAccess: 'full',
    priorityAi: true,
    teamFeatures: false,
  },
  pro_yearly: {
    contractsPerMonth: 20,
    watermarkExports: false,
    libraryAccess: 'full',
    priorityAi: true,
    teamFeatures: false,
  },
  business_monthly: {
    contractsPerMonth: 1_000_000, // effectively unlimited
    watermarkExports: false,
    libraryAccess: 'full',
    priorityAi: true,
    teamFeatures: true,
  },
  business_yearly: {
    contractsPerMonth: 1_000_000, // effectively unlimited
    watermarkExports: false,
    libraryAccess: 'full',
    priorityAi: true,
    teamFeatures: true,
  },
};

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
