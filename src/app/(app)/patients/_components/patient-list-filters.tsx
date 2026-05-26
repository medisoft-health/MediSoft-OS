"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, LayoutGrid, List as ListIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BLOOD_TYPE_OPTIONS,
  PATIENT_SORT_OPTIONS,
  SEX_OPTIONS,
  type PatientSort,
  type PatientView,
} from "@/lib/validations/patient";
import { cn } from "@/lib/utils";

interface FiltersProps {
  q: string;
  sex?: string;
  bloodType?: string;
  sort: PatientSort;
  view: PatientView;
}

/**
 * Client-side filter bar — writes to URL search params. The server
 * component on the page re-runs with the new params on each change.
 */
export function PatientListFilters({
  q,
  sex,
  bloodType,
  sort,
  view,
}: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [searchValue, setSearchValue] = React.useState(q);
  const [pending, startTransition] = React.useTransition();

  // Debounce search input updates to the URL.
  React.useEffect(() => {
    if (searchValue === q) return;
    const t = setTimeout(() => {
      updateParams({ q: searchValue || null, page: null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const updateParams = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  const hasFilters = Boolean(sex || bloodType || q);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]",
              pending && "animate-pulse",
            )}
          />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by name, ID, MRN, or phone…"
            className="pl-9"
            aria-label="Search patients"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => setSearchValue("")}
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Sex */}
        <Select
          value={sex ?? "all"}
          onValueChange={(v) => updateParams({ sex: v === "all" ? null : v, page: null })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sex" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any sex</SelectItem>
            {SEX_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Blood type */}
        <Select
          value={bloodType ?? "all"}
          onValueChange={(v) =>
            updateParams({ bloodType: v === "all" ? null : v, page: null })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Blood type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any blood type</SelectItem>
            {BLOOD_TYPE_OPTIONS.map((bt) => (
              <SelectItem key={bt} value={bt}>
                {bt === "unknown" ? "Unknown" : bt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={sort}
          onValueChange={(v) => updateParams({ sort: v, page: null })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {PATIENT_SORT_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "recent" ? "Recently updated" : s === "name" ? "Name (A→Z)" : "Oldest first"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div
          role="group"
          aria-label="View"
          className="ml-auto inline-flex overflow-hidden rounded-lg border border-[color:var(--color-border)]"
        >
          <button
            type="button"
            onClick={() => updateParams({ view: "grid" })}
            className={cn(
              "grid h-9 w-9 place-items-center transition-colors",
              view === "grid"
                ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]",
            )}
            aria-pressed={view === "grid"}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => updateParams({ view: "list" })}
            className={cn(
              "grid h-9 w-9 place-items-center transition-colors",
              view === "list"
                ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]",
            )}
            aria-pressed={view === "list"}
            aria-label="List view"
          >
            <ListIcon className="size-4" />
          </button>
        </div>
      </div>

      {hasFilters && (
        <div className="flex items-center gap-2 text-xs text-[color:var(--color-muted-foreground)]">
          <span>Active filters applied</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setSearchValue("");
              updateParams({ q: null, sex: null, bloodType: null, page: null });
            }}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
