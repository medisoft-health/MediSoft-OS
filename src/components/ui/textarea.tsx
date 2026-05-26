import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Multi-line text input. Matches Input styling for visual consistency.
 */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-[color:var(--color-input)] bg-[color:var(--color-card)] px-3 py-2 text-sm",
        "placeholder:text-[color:var(--color-muted-foreground)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-1 focus-visible:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y",
        className,
      )}
      {...props}
    />
  );
});
