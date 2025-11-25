import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, saveUser } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = ['Commercial', 'Employment', 'Technology', 'Family Law', 'Real Estate'];

const Onboarding = () => {
  const currentUser = getCurrentUser();
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleComplete = () => {
    const updatedUser = {
      ...currentUser,
      company_name: companyName,
      jurisdiction,
      selected_categories: selectedCategories,
      onboarding_complete: true,
    };
    saveUser(updatedUser);
    toast({
      title: 'Setup complete!',
      description: 'You\'re all set to create your first contract.',
    });
    navigate('/dashboard');
  };

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
              <Button 
                onClick={() => setStep(2)} 
                className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
                disabled={!jurisdiction}
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
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="w-full">
                  Back
                </Button>
                <Button 
                  onClick={handleComplete} 
                  className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
                  disabled={selectedCategories.length === 0}
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
