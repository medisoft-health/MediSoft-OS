"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for the authenticated app group. Catches uncaught errors
 * in any of the child routes and renders a friendly recovery page.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surface for the SRE / observability pipeline.
    console.error("[app:error-boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl p-12">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-[color:var(--color-destructive)]/10 text-[color:var(--color-destructive)]">
            <AlertTriangle className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black tracking-tight">
              Something went wrong
            </h2>
            <p className="max-w-md text-sm text-[color:var(--color-muted-foreground)]">
              We hit an unexpected issue while loading this page. Try again, or
              head back to the dashboard.
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
            <Link href="/">
              <Button variant="outline" size="md">
                <Home className="size-4" />
                Go to dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
