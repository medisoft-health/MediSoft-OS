"use client";

import * as React from "react";
import { Pill, Search, Loader2, X } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchDrug } from "@/lib/pharmax/client";
import type { RxNormCandidate } from "@/lib/ai/rxnorm";
import { cn } from "@/lib/utils";

interface Props {
  onPick: (candidate: RxNormCandidate) => void;
  disabled?: boolean;
}

/**
 * Inline drug picker — debounced RxNorm autocomplete.
 *
 * Mirrors the patient picker pattern from MediScript: small AbortController-
 * managed fetch loop, keyboard navigation, clear empty state.
 */
export function DrugPicker({ onPick, disabled }: Props) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<RxNormCandidate[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await searchDrug(q);
        setResults(r);
        setHighlight(0);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  function pick(c: RxNormCandidate) {
    onPick(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = results[highlight];
      if (c) pick(c);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <Label htmlFor="drug-search">Add drug</Label>
      <div className="relative mt-1.5">
        {loading ? (
          <Loader2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-[color:var(--color-muted-foreground)]" />
        ) : (
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
        )}
        <Input
          id="drug-search"
          placeholder="Type a drug name (e.g. amoxicillin, lisinopril)…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="pl-9 pr-8"
          disabled={disabled}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
            aria-label="Clear"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-1 shadow-xl">
          {results.length === 0 && !loading ? (
            <div className="px-3 py-4 text-center text-xs text-[color:var(--color-muted-foreground)]">
              No RxNorm matches. You can still add the drug as free text below.
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.rxcui}
                type="button"
                onClick={() => pick(r)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                  i === highlight && "bg-[color:var(--color-brand-pink)]/10",
                )}
              >
                <Pill className="size-4 text-[color:var(--color-brand-magenta)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[color:var(--color-muted-foreground)]">
                    <span className="font-mono">RxCUI {r.rxcui}</span>
                    <Badge variant="outline" className="text-[9px]">
                      {r.tty}
                    </Badge>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* "Add as free text" escape hatch */}
      {query.trim().length >= 2 && !open && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-1"
          disabled={disabled}
          onClick={() =>
            pick({
              rxcui: "",
              name: query.trim(),
              tty: "free-text",
              score: 0,
            })
          }
        >
          + Add &ldquo;{query.trim()}&rdquo; as free text
        </Button>
      )}
    </div>
  );
}
