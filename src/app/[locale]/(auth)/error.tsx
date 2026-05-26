"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Auth-group error boundary. Catches uncaught render/data errors on
 * /login and /signup. Same recovery shape as the (app) boundary but
 * with a "Back to sign-in" affordance instead of "Go to dashboard".
 */
export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[auth:error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-[color:var(--color-destructive)]/10 text-[color:var(--color-destructive)]">
            <AlertTriangle className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight">
              Sign-in is temporarily unavailable
            </h2>
            <p className="max-w-sm text-sm text-[color:var(--color-muted-foreground)]">
              We hit an unexpected error loading this page. Try again, or
              reload your browser if it persists.
            </p>
            {error.digest && (
              <p className="text-[11px] font-mono text-[color:var(--color-muted-foreground)]">
                Reference: {error.digest}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="brand" size="md" onClick={reset}>
              <RefreshCw className="size-4" />
              Try again
            </Button>
            <Link href="/login">
              <Button variant="outline" size="md">
                Back to sign-in
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
