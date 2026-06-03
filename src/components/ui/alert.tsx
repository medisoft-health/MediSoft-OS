import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Alert banner for inline warnings, success messages, and informational
 * callouts. Compose with <AlertTitle> + <AlertDescription> children.
 */
type AlertVariant = "default" | "info" | "success" | "warning" | "destructive" | "critical";

const variantStyles: Record<AlertVariant, string> = {
  default:
    "border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-foreground)]",
  info: "border-blue-200 bg-blue-50 text-blue-900 [&_svg]:text-blue-500",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 [&_svg]:text-emerald-600",
  warning: "border-amber-200 bg-amber-50 text-amber-900 [&_svg]:text-amber-600",
  destructive: "border-rose-200 bg-rose-50 text-rose-900 [&_svg]:text-rose-600",
  critical:
    "border-red-300 bg-red-100 text-red-900 [&_svg]:text-red-700 font-medium",
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { className, variant = "default", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-xl border px-4 py-3 text-sm",
        "[&>svg]:absolute [&>svg]:start-4 [&>svg]:top-3.5 [&>svg]:size-4",
        "[&>svg~*]:ps-7",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
});

export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(function AlertTitle({ className, ...props }, ref) {
  return (
    <h5
      ref={ref}
      className={cn("mb-1 font-semibold leading-tight tracking-tight", className)}
      {...props}
    />
  );
});

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function AlertDescription({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("text-sm leading-relaxed [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
});
