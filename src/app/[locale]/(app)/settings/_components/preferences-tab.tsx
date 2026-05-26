"use client";

import * as React from "react";
import { Moon, Sun, Monitor, Globe } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LocaleSwitcher } from "@/components/clinical/locale-switcher";
import { THEME_OPTIONS, type ThemePreference } from "@/lib/validations/settings";
import { cn } from "@/lib/utils";

const THEME_META: Record<
  ThemePreference,
  { label: string; description: string; icon: typeof Sun }
> = {
  light: {
    label: "Light",
    description: "Always use light mode",
    icon: Sun,
  },
  dark: {
    label: "Dark",
    description: "Always use dark mode",
    icon: Moon,
  },
  system: {
    label: "System",
    description: "Follow your OS preference",
    icon: Monitor,
  },
};

/**
 * Preferences tab — theme + language.
 *
 * Theme is stored in localStorage and applied via a `<html>` class.
 * Language uses the LocaleSwitcher which changes the URL prefix.
 *
 * Note: this is a client-side-only preference. No server round-trip
 * is needed because theme doesn't affect server-rendered content
 * (our CSS tokens work in both modes via CSS variables).
 */
export function PreferencesTab() {
  const [theme, setThemeState] = React.useState<ThemePreference>("system");

  React.useEffect(() => {
    const stored = localStorage.getItem("medisoft-theme") as ThemePreference | null;
    if (stored && THEME_OPTIONS.includes(stored as ThemePreference)) {
      setThemeState(stored as ThemePreference);
    }
  }, []);

  function applyTheme(pref: ThemePreference) {
    setThemeState(pref);
    localStorage.setItem("medisoft-theme", pref);

    const root = document.documentElement;
    if (pref === "dark") {
      root.classList.add("dark");
    } else if (pref === "light") {
      root.classList.remove("dark");
    } else {
      // system
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", isDark);
    }
  }

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>
            Choose your visual theme. This preference is stored locally and
            does not sync across devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {THEME_OPTIONS.map((t) => {
              const { label, description, icon: Icon } = THEME_META[t];
              const active = theme === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => applyTheme(t)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
                    active
                      ? "border-[color:var(--color-brand-pink)] bg-[color:var(--color-brand-pink)]/5"
                      : "border-[color:var(--color-border)] hover:border-[color:var(--color-brand-pink)]/50",
                  )}
                >
                  <div
                    className={cn(
                      "grid size-10 place-items-center rounded-xl",
                      active
                        ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]"
                        : "bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)]",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-[11px] text-[color:var(--color-muted-foreground)]">
                    {description}
                  </div>
                  {active && (
                    <Badge variant="success" className="text-[10px]">
                      Active
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4 text-[color:var(--color-brand-magenta)]" />
            Language
          </CardTitle>
          <CardDescription>
            Switch between English and Arabic. The entire UI direction flips
            for Arabic (RTL). Translations are being added progressively.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              Use the globe icon to switch languages. Your preference is
              reflected in the URL (<code>/en/...</code> or{" "}
              <code>/ar/...</code>).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Future preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>
            Email and in-app notification preferences. Coming in a future
            update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" disabled>
            Configure notifications (coming soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
