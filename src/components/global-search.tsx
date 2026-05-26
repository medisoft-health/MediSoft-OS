"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Search,
  User as UserIcon,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

interface SearchResult {
  type: "patient";
  id: number;
  label: string;
  sublabel: string;
  href: string;
}

// ─────────────────────────────────────────────────────────────────
// Context — lets any component open the palette
// ─────────────────────────────────────────────────────────────────
interface SearchContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  openSearch: () => void;
}

const SearchContext = React.createContext<SearchContextValue | null>(null);

export function useGlobalSearch() {
  const ctx = React.useContext(SearchContext);
  if (!ctx) {
    throw new Error(
      "useGlobalSearch must be used within a <GlobalSearchProvider>",
    );
  }
  return ctx;
}

/**
 * Wraps the authenticated layout. Mounts the palette and registers the
 * Cmd+K / Ctrl+K keyboard shortcut.
 */
export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const openSearch = React.useCallback(() => setOpen(true), []);

  // Global keyboard shortcut: Cmd/Ctrl + K
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      // Allow / to focus too, when not inside an input/textarea.
      if (e.key === "/") {
        const t = e.target as HTMLElement | null;
        if (
          t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.tagName === "SELECT" ||
            t.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = React.useMemo(
    () => ({ open, setOpen, openSearch }),
    [open, openSearch],
  );

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchPalette open={open} onOpenChange={setOpen} />
    </SearchContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────────
const RECENT_KEY = "medisoft.recent-searches";
const MAX_RECENTS = 5;

interface PaletteProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

function SearchPalette({ open, onOpenChange }: PaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recents, setRecents] = React.useState<SearchResult[]>([]);

  // Load recents from localStorage on mount.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecents(JSON.parse(raw));
    } catch {
      // ignore corrupt data
    }
  }, []);

  // Reset state when palette closes (keep recents).
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, [open]);

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
          setLoading(false);
          return;
        }
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[GlobalSearch] fetch failed", err);
          setResults([]);
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

  const recordRecent = React.useCallback((item: SearchResult) => {
    if (typeof window === "undefined") return;
    setRecents((prev) => {
      const filtered = prev.filter(
        (r) => !(r.type === item.type && r.id === item.id),
      );
      const next = [item, ...filtered].slice(0, MAX_RECENTS);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const handleSelect = (item: SearchResult) => {
    recordRecent(item);
    onOpenChange(false);
    router.push(item.href);
  };

  const showRecents = query.trim().length < 2 && recents.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search patients by name, ID, MRN, or phone…"
        value={query}
        onValueChange={setQuery}
        autoFocus
      />
      <CommandList>
        {/* Empty state */}
        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-1">
              <Search className="size-5 opacity-40" />
              <span>No matches for &ldquo;{query.trim()}&rdquo;</span>
              <span className="text-[11px]">Try a different name, ID, or phone number.</span>
            </div>
          </CommandEmpty>
        )}

        {/* Initial state — hint */}
        {!loading && query.trim().length < 2 && !showRecents && (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-[color:var(--color-muted-foreground)]">
            <Search className="size-5 opacity-40" />
            <span>Type at least 2 characters to search</span>
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <kbd className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-1.5 py-0.5 font-mono">
                ↑ ↓
              </kbd>
              <span>navigate</span>
              <kbd className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-1.5 py-0.5 font-mono">
                ↵
              </kbd>
              <span>open</span>
              <kbd className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-1.5 py-0.5 font-mono">
                Esc
              </kbd>
              <span>close</span>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-[color:var(--color-muted-foreground)]">
            <Loader2 className="size-4 animate-spin" />
            Searching…
          </div>
        )}

        {/* Recents */}
        {showRecents && (
          <CommandGroup heading="Recent">
            {recents.map((r) => (
              <CommandItem
                key={`recent-${r.type}-${r.id}`}
                value={`recent-${r.id}-${r.label}`}
                onSelect={() => handleSelect(r)}
              >
                <UserIcon className="text-[color:var(--color-muted-foreground)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.label}</div>
                  <div className="truncate text-[11px] text-[color:var(--color-muted-foreground)]">
                    {r.sublabel}
                  </div>
                </div>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Results — grouped by type */}
        {results.length > 0 && (
          <CommandGroup heading={`${results.length} patient${results.length === 1 ? "" : "s"}`}>
            {results.map((r) => (
              <CommandItem
                key={`${r.type}-${r.id}`}
                value={`${r.label} ${r.sublabel}`}
                onSelect={() => handleSelect(r)}
              >
                <UserIcon className="text-[color:var(--color-brand-magenta)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.label}</div>
                  <div className="truncate text-[11px] text-[color:var(--color-muted-foreground)]">
                    {r.sublabel}
                  </div>
                </div>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
