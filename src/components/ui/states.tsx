import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Standard "couldn't load / nothing here" state used across pages, tabs,
 * and inline panels. Two callers:
 *
 *   1) <EmptyState> — neutral / informational ("No patients yet")
 *   2) <ErrorState>  — failure / recovery ("Couldn't load …" + retry)
 *
 * Both share the same shell so the visual language is consistent — what
 * varies is icon tint and the action treatment.
 */
type Tone = "neutral" | "error" | "success" | "info";

interface BaseProps {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary call-to-action button. */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    /** Renders the action as a brand button when true (default), else outline. */
    primary?: boolean;
  };
  /** Optional secondary action shown alongside the primary one. */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Tone drives icon background color. */
  tone?: Tone;
  /** Renders inside a dashed card by default; pass false for inline use. */
  card?: boolean;
  className?: string;
}

const toneBg: Record<Tone, string> = {
  neutral: "bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)]",
  error:
    "bg-[color:var(--color-destructive)]/10 text-[color:var(--color-destructive)]",
  success: "bg-emerald-50 text-emerald-700",
  info: "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]",
};

function Inner({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  tone = "neutral",
  className,
}: BaseProps) {
  const renderAction = (
    a: { label: string; onClick?: () => void; href?: string; primary?: boolean },
    isPrimary: boolean,
  ) => {
    const variant: "brand" | "outline" = isPrimary ? "brand" : "outline";
    const button = (
      <Button variant={variant} size="md" onClick={a.onClick}>
        {a.label}
      </Button>
    );
    if (a.href) {
      // Use <a> rather than next/link to keep this component dependency-free.
      // The caller can swap to <Link> if they need prefetching.
      return (
        <a key={a.label} href={a.href}>
          {button}
        </a>
      );
    }
    return <React.Fragment key={a.label}>{button}</React.Fragment>;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 py-12 text-center",
        className,
      )}
      role="status"
    >
      <div
        className={cn(
          "grid size-14 place-items-center rounded-2xl",
          toneBg[tone],
        )}
        aria-hidden
      >
        <Icon className="size-6" />
      </div>
      <div className="max-w-md space-y-1.5">
        <h3 className="text-base font-bold tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action && renderAction(action, action.primary !== false)}
          {secondaryAction && renderAction(secondaryAction, false)}
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  card = true,
  ...rest
}: BaseProps) {
  const content = <Inner {...rest} />;
  if (!card) return content;
  return (
    <Card className="border-dashed">
      <CardContent>{content}</CardContent>
    </Card>
  );
}

export function ErrorState({
  card = true,
  tone = "error",
  ...rest
}: BaseProps) {
  const content = <Inner {...rest} tone={tone} />;
  if (!card) return content;
  return (
    <Card className="border-dashed">
      <CardContent>{content}</CardContent>
    </Card>
  );
}
