// src/services/onboardingService.ts
import { api } from "@/services/api";

export type OnboardingStatus = {
  onboarding_completed: boolean;
  primary_jurisdiction: string | null;
  contract_categories_of_interest: string[] | null;
  intended_usage: "personal" | "business" | "legal_practitioner" | null;
};

export type CompleteOnboardingPayload = {
  full_name?: string;
  company_name?: string;
  abn_acn?: string;
  company_address?: string;
  industry?: string;
  primary_jurisdiction: string;
  contract_categories_of_interest: string[];
  intended_usage: "personal" | "business" | "legal_practitioner";
  accepted_terms: boolean;
  accepted_disclaimer: boolean;
};

export const onboardingService = {
  async getStatus() {
    return api<OnboardingStatus>("/onboarding/me", {
      method: "GET",
    });
  },

  async complete(payload: CompleteOnboardingPayload) {
    return api<{ ok: true }>("/onboarding/complete", {
      method: "POST",
      body: payload,
    });
  },
};
