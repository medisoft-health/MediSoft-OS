"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Detect errors caused by stale Server Action IDs after a deployment.
 * When users have a cached page, Next.js Server Action IDs change on the new
 * build, leading to "Failed to find Server Action" errors. We catch this and
 * show a simple "please refresh" message instead of a confusing crash.
 */
function isStaleServerActionError(error: Error & { digest?: string }): boolean {
  return (
    error.message?.includes("Server Action") ||
    error.message?.includes("Failed to find Server Action") ||
    !!error.digest?.includes("NEXT_NOT_FOUND")
  );
}

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
  const t = useTranslations("Errors");
  const isStaleAction = isStaleServerActionError(error);

  React.useEffect(() => {
    console.error("[app:error-boundary]", error);
  }, [error]);

  if (isStaleAction) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-[color:var(--color-warning)]/10 text-[color:var(--color-warning)]">
              <RefreshCw className="size-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black tracking-tight">
                {t("appUpdated")}
              </h2>
              <p className="max-w-md text-sm text-[color:var(--color-muted-foreground)]">
                {t("pleaseRefresh")}
              </p>
            </div>
            <Button
              variant="brand"
              size="md"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="size-4" />
              {t("refreshPage")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-12">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-[color:var(--color-destructive)]/10 text-[color:var(--color-destructive)]">
            <AlertTriangle className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black tracking-tight">
              {t("somethingWentWrong")}
            </h2>
            <p className="max-w-md text-sm text-[color:var(--color-muted-foreground)]">
              {t("unexpectedIssue")}
            </p>
            {error.digest && (
              <p className="text-[11px] font-mono text-[color:var(--color-muted-foreground)]">
                {t("reference")}: {error.digest}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="brand" size="md" onClick={reset}>
              <RefreshCw className="size-4" />
              {t("tryAgain")}
            </Button>
            <Link href="/">
              <Button variant="outline" size="md">
                <Home className="size-4" />
                {t("goToDashboard")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
