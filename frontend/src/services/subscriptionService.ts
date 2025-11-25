// src/services/subscriptionService.ts
import { api } from "@/services/api";

export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type SubscriptionSummary = {
  tier: string; // "free", "creator_monthly", etc.
  status: SubscriptionStatus;
  current_period_end: string | null; // ISO date string or null
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export const subscriptionService = {
  // Start a checkout session and get the redirect URL
  // Now takes a *plan key* instead of a Stripe price ID.
  async startCheckout(planKey: string) {
    return api<{ url: string }>("/subscriptions/checkout-session", {
      method: "POST",
      body: { planKey },
    });
  },

  // Create customer portal session and get URL
  async openPortal() {
    return api<{ url: string }>("/subscriptions/portal", {
      method: "GET",
    });
  },

  // Get current user's subscription summary
  async getMySubscription() {
    return api<SubscriptionSummary>("/subscriptions/me");
  },
};
