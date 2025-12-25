// src/pages/Subscriptions.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Crown } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
  subscriptionService,
  type SubscriptionSummary,
} from "@/services/subscriptionService";

// Fallbacks match backend BillingTier keys
const PLAN_KEYS = {
  PRO_MONTHLY: import.meta.env.VITE_PLAN_PRO_MONTHLY ?? "pro_monthly",
  PRO_YEARLY: import.meta.env.VITE_PLAN_PRO_YEARLY ?? "pro_yearly",
  BUSINESS_MONTHLY:
    import.meta.env.VITE_PLAN_BUSINESS_MONTHLY ?? "business_monthly",
  BUSINESS_YEARLY:
    import.meta.env.VITE_PLAN_BUSINESS_YEARLY ?? "business_yearly",
};

type UiPlanId = "free" | "pro" | "business";

const PLANS: {
  id: UiPlanId;
  name: string;
  price: string;
  period: string;
  badge?: string;
  planKey?: string;
  features: string[];
}[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "3 contracts per month",
      "Limited contract types",
      "Standard support",
      "Watermarked PDF downloads",
    ],
  },
  {
    id: "pro",
    name: "Professional",
    price: "$449",
    period: "per month",
    badge: "Most Popular",
    planKey: PLAN_KEYS.PRO_MONTHLY,
    features: [
      "20 contracts per month",
      "All 170+ contract types",
      "Priority support",
      "PDF & DOCX downloads (no watermark)",
      "Advanced AI assistance",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "$799",
    period: "per month",
    badge: "For teams",
    planKey: PLAN_KEYS.BUSINESS_MONTHLY,
    features: [
      "Unlimited contracts",
      "Everything in the Pro plan",
    ],
  },
];

export default function Subscriptions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveTier = summary?.tier ?? "free"; // matches BillingTier
  const currentPlanId: UiPlanId = effectiveTier.startsWith("business")
    ? "business"
    : effectiveTier.startsWith("pro")
    ? "pro"
    : "free";

  const loadSummary = async () => {
    try {
      const s = await subscriptionService.getMySubscription();
      setSummary(s);
    } catch (e: any) {
      console.error("Failed to load subscription summary", e);
      toast.error("Could not load subscription details.");
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handlePlanCheckout = async (planKey: string, planLabel: string) => {
    setLoading(true);
    try {
      const res = await subscriptionService.startCheckout(planKey);

      if (res.action === "checkout") {
        if (!res.url) throw new Error("No checkout URL returned");
        window.location.href = res.url;
        return;
      }

      if (res.action === "portal") {
        if (!res.url) throw new Error("No portal URL returned");
        toast(res.message ?? "Opening billing portal...");
        window.location.href = res.url;
        return;
      }

      if (res.action === "updated") {
        toast.success(res.message ?? `${planLabel} activated`);
        await loadSummary();
        return;
      }

      throw new Error("Unexpected billing response");
    } catch (e: any) {
      console.error("Upgrade checkout failed", e);
      toast.error(e?.message || "Failed to update subscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    setLoading(true);
    try {
      const { url } = await subscriptionService.openPortal();
      if (!url) throw new Error("No portal URL returned");
      window.location.href = url;
    } catch (e: any) {
      console.error("Open portal failed", e);
      toast.error(e?.message || "Failed to open billing portal.");
    } finally {
      setLoading(false);
    }
  };

  const isPaidTier = currentPlanId !== "free";

  const isCurrentForPlan = (planId: UiPlanId) => {
    return currentPlanId === planId;
  };

  const renderPlanButton = (plan: (typeof PLANS)[number]) => {
    const isCurrent = isCurrentForPlan(plan.id);

    if (plan.id === "free") {
      if (isCurrent) {
        return (
          <Button className="w-full" variant="outline" disabled>
            Current Plan
          </Button>
        );
      }
      if (isPaidTier) {
        return (
          <Button
            className="w-full"
            variant="outline"
            disabled={loading}
            onClick={handleOpenPortal}
          >
            Manage in Billing Portal
          </Button>
        );
      }
      // unreachable: free & not current is odd, but handle gracefully
      return (
        <Button className="w-full" variant="outline" disabled>
          Included
        </Button>
      );
    }

    if (isCurrent) {
      return (
        <Button
          className="w-full bg-gold/90 hover:bg-gold text-background"
          disabled={loading}
          onClick={handleOpenPortal}
        >
          Manage Billing
        </Button>
      );
    }

    if (!plan.planKey) return null;

    const label =
      plan.id === "business"
        ? "Upgrade to Business"
        : currentPlanId === "business"
        ? "Switch to Pro"
        : "Upgrade to Pro";

    return (
      <Button
        className="w-full bg-gold hover:bg-gold/90 text-background"
        disabled={loading}
        onClick={() => handlePlanCheckout(plan.planKey!, plan.name)}
      >
        {label}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-xl font-semibold tracking-wide text-foreground">
              Subscriptions & Billing
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-3">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Upgrade to unlock unlimited contracts, full library access, and
            priority AI assistance.
          </p>
          {user && (
            <p className="mt-3 text-xs text-muted-foreground">
              Signed in as <span className="font-medium">{user.email}</span>
              {summary && (
                <>
                  {" — "}
                  Current tier:{" "}
                  <span className="font-medium capitalize">
                    {effectiveTier.replace("_", " ")}
                  </span>
                  {summary.status !== "inactive" && (
                    <span className="ml-1 text-[11px] uppercase tracking-wide">
                      ({summary.status})
                    </span>
                  )}
                </>
              )}
            </p>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {PLANS.map((plan) => {
            const isPro = plan.id === "pro";
            const isCurrent = isCurrentForPlan(plan.id);

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  isPro ? "border-primary/60 shadow-lg shadow-primary/15" : ""
                }`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gold text-background px-4 py-1 flex items-center gap-1 text-xs">
                      <Crown className="h-3 w-3" />
                      {plan.badge ?? "Most Popular"}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-7 pt-6">
                  <CardTitle className="text-2xl font-semibold mb-2">
                    {plan.name}
                  </CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-semibold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      {plan.period}
                    </span>
                  </div>
                  {isCurrent && (
                    <Badge variant="outline" className="mx-auto text-xs">
                      Current Plan
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {renderPlanButton(plan)}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 text-sm">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Can I cancel anytime?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Yes. You can cancel your subscription at any time from the
                  billing portal. You&apos;ll retain access until the end of
                  your current billing period.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  How do I update my payment details?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Click &quot;Manage Billing&quot; on your current plan to open
                  the secure Stripe billing portal. From there you can update
                  cards, invoices, and receipts.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Is there a free plan?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Yes. The Free plan is available forever with limited monthly
                  contracts and library access. Pro unlocks the full Lexy
                  experience.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
