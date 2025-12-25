// src/pages/auth/Login.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthShell from "@/components/AuthShell";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();   // no need to read user here

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const me = await login(email, password);   // ✅ get user from context

      toast({
        title: 'Welcome back',
        description: 'You are now signed in to Lexy.',
      });

      if (me && me.onboarding_completed === false) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast({
        title: 'Login failed',
        description: err?.message || 'Check your email and password and try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Welcome back" description="Sign in to continue your contracts.">
      <Card className="w-full max-w-xl mx-auto bg-card/70 border-white/10 shadow-2xl shadow-black/30 backdrop-blur">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl">Sign in to Lexy</CardTitle>
          <CardDescription>AI-powered contract review with zero hallucinations.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={showPassword ? "your-password" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-gold text-gold-foreground hover:bg-gold/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/30 focus-visible:translate-y-0"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export default Login;
