import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getCurrentUser, saveUser } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { onboardingService } from "@/services/onboardingService";
import AuthShell from "@/components/AuthShell";

const CATEGORIES = ["Commercial", "Employment", "Technology", "Family Law", "Real Estate"];

// Map display labels → backend enum values
const CATEGORY_MAP: Record<string, string> = {
  Commercial: "commercial",
  Employment: "employment",
  Technology: "technology",
  "Family Law": "family_law",
  // For now, map Real Estate to commercial (or adjust backend enum later)
  "Real Estate": "commercial",
};

const Onboarding = () => {
  const currentUser = getCurrentUser();
  const [companyName, setCompanyName] = useState(currentUser?.company_name ?? "");
  const [jurisdiction, setJurisdiction] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [intendedUsage, setIntendedUsage] = useState<"personal" | "business" | "legal_practitioner">("business");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
  }, [currentUser, navigate]);

  // Prefill from backend status if available
  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        const status = await onboardingService.getStatus();
        if (status.onboarding_completed) {
          navigate("/dashboard");
          return;
        }

        if (status.primary_jurisdiction) {
          setJurisdiction(status.primary_jurisdiction);
        }
        if (status.contract_categories_of_interest?.length) {
          const selected = CATEGORIES.filter((label) =>
            status.contract_categories_of_interest!.includes(CATEGORY_MAP[label]),
          );
          setSelectedCategories(selected);
        }
        if (status.intended_usage) {
          setIntendedUsage(status.intended_usage);
        }
      } catch (e) {
        console.error("Failed to load onboarding status", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser, navigate]);

  if (!currentUser) {
    return null;
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  const handleComplete = async () => {
    if (!jurisdiction || selectedCategories.length === 0) return;
    if (!acceptedTerms || !acceptedDisclaimer) return;

    const backendCategories = selectedCategories.map((label) => CATEGORY_MAP[label]).filter(Boolean);

    try {
      const result = await onboardingService.complete({
        full_name: currentUser.full_name ?? undefined,
        company_name: companyName || undefined,
        primary_jurisdiction: jurisdiction,
        contract_categories_of_interest: backendCategories,
        intended_usage: intendedUsage,
        accepted_terms: acceptedTerms,
        accepted_disclaimer: acceptedDisclaimer,
      });

      saveUser(result.user);
      toast({
        title: "Onboarding complete",
        description: "Your workspace is tailored to your needs.",
      });
      navigate("/dashboard");
    } catch (e: any) {
      toast({
        title: "Could not complete onboarding",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthShell
      eyebrow="Onboarding"
      title="Tell us about your company"
      description="We’ll tailor templates, recommendations, and guardrails to your needs."
    >
      {loading ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <p className="text-muted-foreground">Loading your setup…</p>
        </div>
      ) : (
        <div className="grid gap-6">
          <Card className="bg-card/70 border border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle>Company basics</CardTitle>
              <CardDescription>Share your company details to personalize your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input
                    id="companyName"
                    placeholder="Lexy Pty Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jurisdiction">Primary jurisdiction</Label>
                  <Select value={jurisdiction} onValueChange={setJurisdiction}>
                    <SelectTrigger id="jurisdiction">
                      <SelectValue placeholder="Select jurisdiction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NSW">NSW</SelectItem>
                      <SelectItem value="VIC">VIC</SelectItem>
                      <SelectItem value="QLD">QLD</SelectItem>
                      <SelectItem value="WA">WA</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="TAS">TAS</SelectItem>
                      <SelectItem value="NT">NT</SelectItem>
                      <SelectItem value="ACT">ACT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Intended usage</Label>
                <RadioGroup
                  value={intendedUsage}
                  onValueChange={(val: any) => setIntendedUsage(val)}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  <label className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2">
                    <RadioGroupItem id="usage-personal" value="personal" />
                    <span>Personal</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2">
                    <RadioGroupItem id="usage-business" value="business" />
                    <span>Business</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2">
                    <RadioGroupItem id="usage-legal" value="legal_practitioner" />
                    <span>Legal practitioner</span>
                  </label>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle>Contract focus</CardTitle>
              <CardDescription>Select the contract categories you care about most.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-3 rounded-md border border-border bg-background/60 px-3 py-2 cursor-pointer hover:border-primary/60 transition"
                  >
                    <Checkbox
                      checked={selectedCategories.includes(cat)}
                      onCheckedChange={() => handleCategoryToggle(cat)}
                      id={`cat-${cat}`}
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle>Agreements</CardTitle>
              <CardDescription>Please confirm before continuing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
                />
                <div className="space-y-1">
                  <span className="font-medium">I agree to the Terms of Service</span>
                  <p className="text-sm text-muted-foreground">
                    You can read the terms in the Settings page after onboarding.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <Checkbox
                  id="disclaimer"
                  checked={acceptedDisclaimer}
                  onCheckedChange={(checked) => setAcceptedDisclaimer(!!checked)}
                />
                <div className="space-y-1">
                  <span className="font-medium">I understand Lexy is not a law firm</span>
                  <p className="text-sm text-muted-foreground">
                    Lexy provides AI assistance; it does not replace professional legal advice.
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>

          <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="text-sm text-muted-foreground">Need help? Email support@lexgen.co</div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Skip for now
              </Button>
              <Button
                className="bg-gold text-gold-foreground hover:bg-gold/90"
                onClick={handleComplete}
                disabled={
                  !jurisdiction ||
                  selectedCategories.length === 0 ||
                  !acceptedTerms ||
                  !acceptedDisclaimer
                }
              >
                Complete setup
              </Button>
            </div>
          </footer>
        </div>
      )}
    </AuthShell>
  );
};

export default Onboarding;
