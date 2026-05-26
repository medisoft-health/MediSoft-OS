import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "destructive"
  | "critical"
  | "info";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)]",
  secondary:
    "bg-[color:var(--color-secondary)]/15 text-[color:var(--color-secondary)] border border-[color:var(--color-secondary)]/30",
  outline: "border border-[color:var(--color-border)] text-[color:var(--color-foreground)]",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  destructive: "bg-rose-50 text-rose-700 border border-rose-200",
  critical: "bg-red-100 text-red-800 border border-red-300 font-bold",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
