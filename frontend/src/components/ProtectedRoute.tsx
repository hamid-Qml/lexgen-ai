// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type Props = {
  children: React.ReactNode;
  requireOnboarding?: boolean;
};

const ProtectedRoute = ({ children, requireOnboarding = true }: Props) => {
  const { status, user, token } = useAuth();

  // 1. No token? Not logged in → login page
  if (!token) return <Navigate to="/login" replace />;

  // 2. Still booting from localStorage or fetching /auth/me
  if (status === "loading" || status === "idle") {
    return (
      <div className="w-full flex items-center justify-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  // 3. Failed to authenticate (invalid token)
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  // 4. Authenticated but onboarding incomplete
  if (requireOnboarding && user?.onboarding_complete === false) {
    return <Navigate to="/onboarding" replace />;
  }

  // 5. All good → render route
  return <>{children}</>;
};

export default ProtectedRoute;
