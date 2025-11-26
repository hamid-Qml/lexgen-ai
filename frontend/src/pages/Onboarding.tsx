// src/pages/Onboarding.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // if you already have this
import { getCurrentUser, saveUser } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { onboardingService } from '@/services/onboardingService';

const CATEGORIES = ['Commercial', 'Employment', 'Technology', 'Family Law', 'Real Estate'];

// Map display labels → backend enum values
const CATEGORY_MAP: Record<string, string> = {
  Commercial: 'commercial',
  Employment: 'employment',
  Technology: 'technology',
  'Family Law': 'family_law',
  // For now, map Real Estate to commercial (or adjust backend enum later)
  'Real Estate': 'commercial',
};

const Onboarding = () => {
  const currentUser = getCurrentUser();
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState(currentUser?.company_name ?? '');
  const [jurisdiction, setJurisdiction] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [intendedUsage, setIntendedUsage] = useState<'personal' | 'business' | 'legal_practitioner'>('business');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
  }, [currentUser, navigate]);

  // Optionally prefill from backend status (in case user refreshes midway)
  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        const status = await onboardingService.getStatus();
        if (status.onboarding_completed) {
          navigate('/dashboard');
          return;
        }

        if (status.primary_jurisdiction) {
          setJurisdiction(status.primary_jurisdiction);
        }
        if (status.contract_categories_of_interest?.length) {
          // map backend enums back to UI labels where possible
          const selected = CATEGORIES.filter((label) =>
            status.contract_categories_of_interest!.includes(CATEGORY_MAP[label])
          );
          setSelectedCategories(selected);
        }
        if (status.intended_usage) {
          setIntendedUsage(status.intended_usage);
        }
      } catch (e) {
        // silently ignore – first time users will just see empty form
        console.error('Failed to load onboarding status', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser, navigate]);

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading your setup…</p>
      </div>
    );
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleComplete = async () => {
    if (!jurisdiction || selectedCategories.length === 0) return;
    if (!acceptedTerms || !acceptedDisclaimer) return;

    const backendCategories = selectedCategories
      .map((label) => CATEGORY_MAP[label])
      .filter(Boolean);

    try {
      await onboardingService.complete({
        full_name: currentUser.full_name ?? undefined,
        company_name: companyName || undefined,
        primary_jurisdiction: jurisdiction, // backend only validates string, so "New South Wales" is fine for now
        contract_categories_of_interest: backendCategories,
        intended_usage: intendedUsage,
        accepted_terms: acceptedTerms,
        accepted_disclaimer: acceptedDisclaimer,
        // optional fields not collected in this lightweight UI:
        abn_acn: undefined,
        company_address: undefined,
        industry: undefined,
      });

      // Keep local stored user roughly in sync
      const updatedUser = {
        ...currentUser,
        company_name: companyName || currentUser.company_name,
        primary_jurisdiction: jurisdiction,
        contract_categories_of_interest: backendCategories,
        intended_usage: intendedUsage,
        onboarding_completed: true,
      };
      saveUser(updatedUser);

      toast({
        title: 'Setup complete!',
        description: "You're all set to create your first contract.",
      });

      navigate('/dashboard');
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Error saving setup',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const canGoNext = !!jurisdiction;
  const canComplete =
    selectedCategories.length > 0 && acceptedTerms && acceptedDisclaimer;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Let's Get You Started</CardTitle>
          <CardDescription>Step {step} of 2</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name (Optional)</Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Primary Jurisdiction</Label>
                <Select value={jurisdiction} onValueChange={setJurisdiction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Australia">Australia</SelectItem>
                    <SelectItem value="New South Wales">New South Wales</SelectItem>
                    <SelectItem value="Victoria">Victoria</SelectItem>
                    <SelectItem value="Queensland">Queensland</SelectItem>
                    <SelectItem value="South Australia">South Australia</SelectItem>
                    <SelectItem value="Western Australia">Western Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>How will you mainly use Lexy?</Label>
                <RadioGroup
                  value={intendedUsage}
                  onValueChange={(val: any) => setIntendedUsage(val)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id="usage-personal" value="personal" />
                    <Label htmlFor="usage-personal">Personal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id="usage-business" value="business" />
                    <Label htmlFor="usage-business">Business</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      id="usage-legal"
                      value="legal_practitioner"
                    />
                    <Label htmlFor="usage-legal">Legal practitioner</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
                disabled={!canGoNext}
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label>What types of contracts are you interested in?</Label>
                {CATEGORIES.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    />
                    <label
                      htmlFor={category}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {category}
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Confirm</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(v) => setAcceptedTerms(Boolean(v))}
                  />
                  <label htmlFor="terms" className="text-sm">
                    I agree to Lexy&apos;s Terms of Use.
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="disclaimer"
                    checked={acceptedDisclaimer}
                    onCheckedChange={(v) => setAcceptedDisclaimer(Boolean(v))}
                  />
                  <label htmlFor="disclaimer" className="text-sm">
                    I understand this app does not provide legal advice and I
                    should consult a qualified lawyer before relying on any
                    document.
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="w-full">
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
                  disabled={!canComplete}
                >
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
