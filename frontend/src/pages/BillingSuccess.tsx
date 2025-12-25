import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";

export default function BillingSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  // TODO: Optionally hit backend to refresh subscription based on sessionId.
  useEffect(() => {
    if (sessionId) {
      // Placeholder: subscription state should already be updated via webhook.
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="flex flex-col items-center gap-3 pt-8">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <CardTitle className="text-2xl text-center">
            Payment successful!
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Your subscription has been activated. You can jump back into Lexy or
            review your billing details anytime.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-8">
          <Button className="w-full" onClick={() => navigate("/dashboard")}>
            <ArrowRight className="h-4 w-4" />
            Go to Dashboard
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => navigate("/subscriptions")}
          >
            <ArrowLeft className="h-4 w-4" />
            Manage Billing
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
