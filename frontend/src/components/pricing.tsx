import { Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For getting started with core features.",
    features: [
      "3 contracts per month",
      "Core contract library",
      "Standard support",
      "Watermarked downloads",
    ],
  },
  {
    name: "Professional",
    price: "$449",
    period: "per month",
    badge: "Most Popular",
    description: "For founders and in-house counsel.",
    features: [
      "20 contracts per month",
      "Expanded contract library",
      "Priority support",
      "DOCX & PDF exports",
    ],
  },
  {
    name: "Business",
    price: "$799",
    period: "per month",
    badge: "For teams",
    description: "For growing teams with higher volume.",
    features: [
      "Unlimited contracts",
      "Team-ready workflows",
      "Everything in Professional",
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <section className="flex flex-col items-center px-12 py-24 gap-12">
      <div className="flex flex-col items-center text-center gap-4 max-w-[900px]">
        <h2 className="text-[48px] font-medium text-white">Pricing</h2>
        <p className="text-[18px] text-white/60">
          Straightforward plans with clear limits and transparent monthly
          pricing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-[1200px]">
        {PLANS.map((plan) => {
          const isPro = plan.name === "Professional";
          return (
            <div
              key={plan.name}
              className={`relative rounded-[28px] border-[1px] bg-card border-card-border p-6 flex flex-col gap-6 ${
                isPro ? "shadow-lg shadow-primary/20 border-primary/50" : ""
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-background px-4 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                  {isPro && <Crown className="h-3 w-3" />}
                  {plan.badge}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <p className="text-white text-2xl font-semibold">{plan.name}</p>
                <p className="text-white/60 text-sm">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-white text-5xl font-semibold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-white/50 text-sm">{plan.period}</span>
              </div>

              <div className="flex flex-col gap-3 text-sm text-white/80">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                className={`mt-2 w-full ${
                  isPro
                    ? "bg-gold text-background hover:bg-gold/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                }`}
                onClick={() => navigate("/signup")}
              >
                Get started
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
