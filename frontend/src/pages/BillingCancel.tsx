import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="flex flex-col items-center gap-3 pt-8">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <CardTitle className="text-2xl text-center">
            Checkout canceled
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            No charges were made. You can restart checkout anytime or go back to
            review plans.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-8">
          <Button className="w-full" onClick={() => navigate("/subscriptions")}>
            <RefreshCw className="h-4 w-4" />
            Restart Checkout
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
