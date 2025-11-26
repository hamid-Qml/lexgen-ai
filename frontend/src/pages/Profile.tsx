// src/pages/Profile.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/services/userService';

type ProfileForm = {
  full_name: string;
  email: string;
  company_name: string;
  primary_jurisdiction: string;
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshMe } = useAuth();
  const [formData, setFormData] = useState<ProfileForm>({
    full_name: '',
    email: '',
    company_name: '',
    primary_jurisdiction: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name ?? '',
        email: user.email,
        company_name: (user as any).company_name ?? '',
        primary_jurisdiction: (user as any).primary_jurisdiction ?? '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await userService.updateMe({
        full_name: formData.full_name || null,
        company_name: formData.company_name || null,
        primary_jurisdiction: formData.primary_jurisdiction || null,
      });

      // refresh auth context + local cache
      await refreshMe();

      toast.success('Profile updated successfully!');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
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
            <span className="text-xl font-bold text-foreground">Profile Settings</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your account details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, full_name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="opacity-80 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, company_name: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_jurisdiction">Primary Jurisdiction</Label>
              <Input
                id="primary_jurisdiction"
                value={formData.primary_jurisdiction}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    primary_jurisdiction: e.target.value,
                  }))
                }
                placeholder="e.g., AU-NSW or New South Wales"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gold hover:bg-gold/90 text-background"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Subscription Plan</span>
              <span className="font-medium capitalize">
                {(user as any)?.subscription_tier ?? 'free'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Onboarding Status</span>
              <span className="font-medium">
                {(user as any)?.onboarding_completed ? 'Completed' : 'Incomplete'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="font-medium">
                {(user as any)?.created_at
                  ? new Date((user as any).created_at).toLocaleDateString()
                  : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
