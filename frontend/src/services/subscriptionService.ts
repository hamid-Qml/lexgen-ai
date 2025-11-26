// src/services/subscriptionService.ts
import { api } from "@/services/api";

export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type SubscriptionSummary = {
  tier: string; // "free", "pro_monthly", "business_yearly", etc.
  status: SubscriptionStatus;
  current_period_end: string | null; // ISO string or null
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export const subscriptionService = {
  /**
   * Start a checkout session for the given plan key.
   * Backend: POST /billing/checkout-session
   * Body: { planKey: string }
   */
  async startCheckout(planKey: string) {
    return api<{ url: string }>("/billing/checkout-session", {
      method: "POST",
      body: { planKey },
    });
  },

  /**
   * Open Stripe customer billing portal.
   * Backend: GET /billing/portal
   */
  async openPortal() {
    return api<{ url: string }>("/billing/portal", {
      method: "GET",
    });
  },

  /**
   * Get current user's subscription summary.
   * Backend: GET /billing/me
   * Used by Subscriptions page (and can be used anywhere else).
   */
  async getMySubscription() {
    return api<SubscriptionSummary>("/billing/me", {
      method: "GET",
    });
  },
};
