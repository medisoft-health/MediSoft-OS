import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ModulePlaceholderProps {
  module: string;
  subtitle: string;
  description: string;
  phase: number;
  features: string[];
  tech: string[];
}

/**
 * Phase-1 placeholder for each clinical module.
 * Replaced by the real module UI in later phases.
 */
export function ModulePlaceholder({
  module,
  subtitle,
  description,
  phase,
  features,
  tech,
}: ModulePlaceholderProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
            {subtitle}
          </div>
          <h1 className="mt-1 text-4xl font-black tracking-tight">
            <span className="grad-text">{module}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[color:var(--color-muted-foreground)]">
            {description}
          </p>
        </div>
        <Badge variant="info" className="gap-1.5">
          <Sparkles className="size-3" />
          Phase {phase}
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <div className="h-1.5 grad-brand" aria-hidden />
        <CardContent className="space-y-6 p-8">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
              Planned features
            </div>
            <ul className="space-y-2">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <span
                    aria-hidden
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[color:var(--color-brand-pink)]"
                  />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
              Technology
            </div>
            <div className="flex flex-wrap gap-2">
              {tech.map((t) => (
                <Badge key={t} variant="outline" className="font-[family-name:var(--font-mono)]">
                  {t}
                </Badge>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[color:var(--color-muted)] p-4 text-sm text-[color:var(--color-muted-foreground)]">
            <strong className="text-[color:var(--color-foreground)]">Status:</strong> This
            module is scheduled for Phase {phase}. The database schema and brand shell
            are already in place — module UI and AI pipeline will be implemented next.
          </div>

          <Button variant="brand" disabled className="cursor-not-allowed">
            Coming in Phase {phase}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
