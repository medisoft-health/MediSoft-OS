"use client";
/**
 * MediSport — Auth Guard Component
 *
 * Wraps protected pages (trainee/coach dashboards) and redirects
 * unauthenticated users to the auth page. Also checks that the user
 * has the correct sport_profile role for the page they're accessing.
 *
 * Usage:
 *   <SportAuthGuard requiredRole="trainee">
 *     <TraineeDashboardContent />
 *   </SportAuthGuard>
 */
import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useSession } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

interface SportAuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "trainee" | "coach";
}

export function SportAuthGuard({ children, requiredRole }: SportAuthGuardProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const [profileChecked, setProfileChecked] = React.useState(false);
  const [hasAccess, setHasAccess] = React.useState(false);

  React.useEffect(() => {
    // Still loading session — wait
    if (isPending) return;

    // Not logged in — redirect to auth
    if (!session?.user) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/${locale}/auth?returnTo=${returnUrl}`);
      return;
    }

    // If no specific role required, just being logged in is enough
    if (!requiredRole) {
      setHasAccess(true);
      setProfileChecked(true);
      return;
    }

    // Check if user has a sport profile with the correct role
    const checkProfile = async () => {
      try {
        const res = await fetch(`/api/sport?action=my-coach-profile`);
        if (res.ok) {
          const data = await res.json();
          // API returns: { success: true, data: { profile: {...} | null, certifications: [...] } }
          const profile = data?.data?.profile;
          const profileRole = profile?.role;

          if (!profile) {
            // No sport profile yet — user just registered
            // Allow access to the dashboard (they can still browse)
            // The dashboard itself will prompt them to complete onboarding
            setHasAccess(true);
          } else if (profileRole === requiredRole) {
            setHasAccess(true);
          } else if (profileRole) {
            // User has a profile but wrong role — redirect to correct dashboard
            router.replace(`/${locale}/${profileRole}`);
            return;
          } else {
            // Profile exists but no role field — allow access
            setHasAccess(true);
          }
        } else if (res.status === 401) {
          // Session expired — redirect to auth
          const returnUrl = encodeURIComponent(pathname);
          router.replace(`/${locale}/auth?returnTo=${returnUrl}`);
          return;
        } else {
          // Other errors (404, 500) — allow access gracefully
          setHasAccess(true);
        }
      } catch {
        // On network error, allow access (graceful degradation)
        setHasAccess(true);
      }
      setProfileChecked(true);
    };

    checkProfile();
  }, [session, isPending, requiredRole, router, locale, pathname]);

  // Loading state
  if (isPending || (!profileChecked && requiredRole)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full bg-emerald-100 animate-pulse" />
            <Loader2 className="absolute inset-0 m-auto h-6 w-6 text-emerald-600 animate-spin" />
          </div>
          <p className="text-sm text-slate-500 animate-pulse">
            {locale === "ar" ? "جارٍ التحقق..." : "Verifying access..."}
          </p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
