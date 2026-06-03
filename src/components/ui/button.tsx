import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "brand" | "link";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] hover:bg-[color:var(--color-primary)]/85",
  secondary:
    "bg-[color:var(--color-secondary)] text-[color:var(--color-secondary-foreground)] hover:bg-[color:var(--color-secondary)]/85",
  outline:
    "border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
  ghost:
    "bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
  destructive:
    "bg-[color:var(--color-destructive)] text-[color:var(--color-destructive-foreground)] hover:bg-[color:var(--color-destructive)]/85",
  brand:
    "grad-pink-navy text-white shadow-[0_8px_20px_-8px_rgba(232,74,138,0.6)] hover:shadow-[0_12px_28px_-8px_rgba(232,74,138,0.8)] hover:-translate-y-px",
  link:
    "bg-transparent text-[color:var(--color-brand-magenta)] underline-offset-4 hover:underline p-0 h-auto font-medium",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-md [&_svg]:size-3.5",
  md: "h-10 px-4 text-sm rounded-lg [&_svg]:size-4",
  lg: "h-12 px-6 text-base rounded-xl [&_svg]:size-[18px]",
  icon: "h-10 w-10 rounded-lg [&_svg]:size-4",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render as a child component (e.g. Link) instead of <button> */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "md", type = "button", asChild, ...props },
  ref
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "active:scale-[0.98]",
        "[&_svg]:shrink-0",
        variantStyles[variant],
        variant !== "link" && sizeStyles[size],
        className
      )}
      {...props}
    />
  );
});
