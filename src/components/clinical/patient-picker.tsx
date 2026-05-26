"use client";

import * as React from "react";
import { Search, User as UserIcon, X, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, getInitials } from "@/lib/utils";

export interface PickedPatient {
  id: number;
  label: string;
  sublabel: string;
}

interface Props {
  value: PickedPatient | null;
  onChange: (next: PickedPatient | null) => void;
  disabled?: boolean;
}

interface SearchResult {
  type: "patient";
  id: number;
  label: string;
  sublabel: string;
  href: string;
}

/**
 * Inline patient picker — debounced autocomplete that uses the shared
 * `/api/search` endpoint built in PR-3d.
 *
 * Used by the MediScript "start session" step. When a patient is selected,
 * shows a confirmation card and clears the search box.
 */
export function PatientPicker({ value, onChange, disabled }: Props) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  // Close on outside click.
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced fetch.
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
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results ?? []);
        setHighlight(0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[patient-picker] search failed", err);
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  function select(r: SearchResult) {
    onChange({ id: r.id, label: r.label, sublabel: r.sublabel });
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
      const r = results[highlight];
      if (r) select(r);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-brand-pink)]/30 bg-[color:var(--color-brand-pink)]/5 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarFallback className="text-xs">
              {getInitials(value.label)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-bold">{value.label}</div>
            <div className="text-[11px] text-[color:var(--color-muted-foreground)]">
              {value.sublabel}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          disabled={disabled}
          aria-label="Change patient"
        >
          <X className="size-4" />
          Change
        </Button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <Label htmlFor="patient-search">Patient</Label>
      <div className="relative mt-1.5">
        {loading ? (
          <Loader2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-[color:var(--color-muted-foreground)]" />
        ) : (
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
        )}
        <Input
          id="patient-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Type to search by name, ID, MRN, or phone…"
          className="pl-9"
          disabled={disabled}
          autoComplete="off"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-1 shadow-xl">
          {results.length === 0 && !loading ? (
            <div className="px-3 py-4 text-center text-xs text-[color:var(--color-muted-foreground)]">
              No matches. Try a different name or ID.
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => select(r)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                  i === highlight && "bg-[color:var(--color-brand-pink)]/10",
                )}
              >
                <UserIcon className="size-4 text-[color:var(--color-brand-magenta)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.label}</div>
                  <div className="truncate text-[11px] text-[color:var(--color-muted-foreground)]">
                    {r.sublabel}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
