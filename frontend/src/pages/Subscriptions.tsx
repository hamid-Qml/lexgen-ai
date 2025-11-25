import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, saveUser } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Crown } from 'lucide-react';
import { toast } from 'sonner';

export default function Subscriptions() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        '5 contracts per month',
        'Basic contract types',
        'Standard support',
        'PDF downloads',
      ],
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '$49',
      period: 'per month',
      features: [
        'Unlimited contracts',
        'All 170+ contract types',
        'Priority support',
        'PDF & DOCX downloads',
        'Advanced AI assistance',
        'Custom templates',
        'Team collaboration',
        'Version history',
      ],
    },
  ];

  const handleChangePlan = (planId: 'free' | 'pro') => {
    if (!user) return;

    const updatedUser = {
      ...user,
      subscription_tier: planId,
    };

    saveUser(updatedUser);
    setUser(updatedUser);
    toast.success(`Successfully switched to ${planId === 'pro' ? 'Professional' : 'Free'} plan!`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-xl font-bold text-foreground">Subscriptions & Billing</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg">
            Upgrade to unlock all features and unlimited contracts
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = user?.subscription_tier === plan.id;
            const isPro = plan.id === 'pro';

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  isPro
                    ? 'border-primary/60 shadow-lg shadow-primary/20'
                    : ''
                }`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gold text-background px-4 py-1 flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8 pt-6">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">{plan.period}</span>
                  </div>
                  {isCurrentPlan && (
                    <Badge variant="outline" className="mx-auto">
                      Current Plan
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${
                      isPro
                        ? 'bg-gold hover:bg-gold/90 text-background'
                        : ''
                    }`}
                    variant={isPro ? 'default' : 'outline'}
                    disabled={isCurrentPlan}
                    onClick={() => handleChangePlan(plan.id as 'free' | 'pro')}
                  >
                    {isCurrentPlan ? 'Current Plan' : isPro ? 'Upgrade to Pro' : 'Switch to Free'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Yes! You can cancel your subscription at any time. You'll retain access until the end of your billing period.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  We accept all major credit cards, debit cards, and PayPal.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Is there a free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  The free plan is available forever with limited features. Upgrade to Pro for unlimited access.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
