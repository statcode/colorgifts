import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Loader2 } from "lucide-react";

const clerkAvailable = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Gate a page on a signed-in Clerk user.
 * - While Clerk is loading, shows a spinner.
 * - When signed out, redirects to the homepage.
 * - When Clerk is disabled (no publishable key), renders children as-is.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!clerkAvailable) {
    return <>{children}</>;
  }
  return <RequireAuthInner>{children}</RequireAuthInner>;
}

function RequireAuthInner({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation(`${basePath}/`, { replace: true });
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
