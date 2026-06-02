"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useAdaptiveContext } from "./adaptive-context";
import { cn } from "@/lib/utils";

/**
 * Smart Dark Mode Toggle — Switches between light/dark/auto modes.
 * Auto mode activates dark theme after 8 PM for night shifts
 * and always activates for radiology context (MediScan).
 */
export function DarkModeToggle({ className }: { className?: string }) {
  const { isDarkMode, toggleDarkMode, autoNightMode, setAutoNightMode } =
    useAdaptiveContext();

  const mode = autoNightMode ? "auto" : isDarkMode ? "dark" : "light";

  const cycleMode = () => {
    if (mode === "light") {
      // light -> dark
      toggleDarkMode();
    } else if (mode === "dark") {
      // dark -> auto
      setAutoNightMode(true);
    } else {
      // auto -> light
      setAutoNightMode(false);
      if (isDarkMode) toggleDarkMode();
    }
  };

  return (
    <button
      onClick={cycleMode}
      className={cn(
        "relative flex items-center justify-center size-9 rounded-lg",
        "border border-slate-200 dark:border-slate-700",
        "bg-white dark:bg-slate-800",
        "hover:bg-slate-100 dark:hover:bg-slate-700",
        "transition-all duration-200",
        "group",
        className
      )}
      title={
        mode === "auto"
          ? "Auto (Night Mode)"
          : mode === "dark"
            ? "Dark Mode"
            : "Light Mode"
      }
    >
      {mode === "light" && (
        <Sun className="size-4 text-amber-500 transition-transform group-hover:rotate-45" />
      )}
      {mode === "dark" && (
        <Moon className="size-4 text-indigo-400 transition-transform group-hover:-rotate-12" />
      )}
      {mode === "auto" && (
        <Monitor className="size-4 text-emerald-500 transition-transform group-hover:scale-110" />
      )}

      {/* Auto indicator dot */}
      {mode === "auto" && (
        <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
      )}
    </button>
  );
}
