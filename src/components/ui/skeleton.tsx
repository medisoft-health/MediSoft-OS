import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Loading placeholder. Animates a subtle pulse on a muted surface.
 *
 * Usage:
 *   <Skeleton className="h-4 w-32" />
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[color:var(--color-muted)]",
        className,
      )}
      {...props}
    />
  );
}
