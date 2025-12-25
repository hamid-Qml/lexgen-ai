// src/pages/auth/Signup.tsx (or wherever it lives)
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import AuthShell from "@/components/AuthShell";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { signup } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await signup({ email, password, full_name: fullName });

      toast({
        title: 'Account created',
        description: 'Welcome to Lexy. Let’s set up your company profile.',
      });

      // For now, always go to onboarding after signup
      navigate('/onboarding');
    } catch (err: any) {
      toast({
        title: 'Sign up failed',
        description: err?.message || 'Something went wrong while creating your account.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your Lexy account"
      description="Start generating professional, AI-assisted contracts in minutes."
    >
      <Card className="w-full max-w-xl mx-auto bg-card/70 border-white/10 shadow-2xl shadow-black/30 backdrop-blur">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl">Join Lexy</CardTitle>
          <CardDescription>Build faster with trusted, cited answers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gold text-gold-foreground hover:bg-gold/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/30 focus-visible:translate-y-0"
              disabled={submitting}
            >
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export default Signup;
