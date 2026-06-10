"use client";

import * as React from "react";

/**
 * Adaptive UI Context — Changes interface layout based on clinical context.
 *
 * Contexts:
 * - "emergency" → Highlights vitals, allergies, critical meds prominently
 * - "routine" → Shows timeline, past labs, disease progression
 * - "sport" → Focuses on body composition, performance metrics, comparisons
 * - "radiology" → Dark mode optimized for image viewing (MediScan)
 * - "default" → Standard balanced layout
 *
 * Dark Mode Logic:
 * - Manual toggle overrides auto
 * - Auto mode: dark between 8 PM and 6 AM
 * - Radiology context forces dark (restores on exit)
 * - Persists user preference in localStorage
 */

export type ClinicalContext =
  | "default"
  | "emergency"
  | "routine"
  | "sport"
  | "radiology";

interface AdaptiveContextValue {
  context: ClinicalContext;
  setContext: (ctx: ClinicalContext) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  autoNightMode: boolean;
  setAutoNightMode: (v: boolean) => void;
}

const AdaptiveContext = React.createContext<AdaptiveContextValue>({
  context: "default",
  setContext: () => {},
  isDarkMode: false,
  toggleDarkMode: () => {},
  autoNightMode: false,
  setAutoNightMode: () => {},
});

export function AdaptiveProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = React.useState<ClinicalContext>("default");
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [autoNightMode, setAutoNightMode] = React.useState(false);
  const [radiologyForced, setRadiologyForced] = React.useState(false);
  const prevDarkRef = React.useRef(false);

  // Load persisted preferences
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("medisoft-dark-mode");
      const savedAuto = localStorage.getItem("medisoft-auto-night");
      if (saved !== null) setIsDarkMode(saved === "true");
      if (savedAuto !== null) setAutoNightMode(savedAuto === "true");
    } catch {}
  }, []);

  // Auto night mode: switch to dark between 8 PM and 6 AM
  React.useEffect(() => {
    if (!autoNightMode || radiologyForced) return;

    const checkTime = () => {
      const hour = new Date().getHours();
      const shouldBeDark = hour >= 20 || hour < 6;
      setIsDarkMode(shouldBeDark);
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [autoNightMode, radiologyForced]);

  // Radiology context: force dark, restore on exit
  React.useEffect(() => {
    if (context === "radiology") {
      prevDarkRef.current = isDarkMode;
      setIsDarkMode(true);
      setRadiologyForced(true);
    } else if (radiologyForced) {
      // Restore previous state when leaving radiology
      setIsDarkMode(prevDarkRef.current);
      setRadiologyForced(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  // Apply dark mode class to document
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleDarkMode = React.useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("medisoft-dark-mode", String(next));
      } catch {}
      return next;
    });
    setAutoNightMode(false);
    try {
      localStorage.setItem("medisoft-auto-night", "false");
    } catch {}
  }, []);

  const handleSetAutoNightMode = React.useCallback((v: boolean) => {
    setAutoNightMode(v);
    try {
      localStorage.setItem("medisoft-auto-night", String(v));
    } catch {}
  }, []);

  return (
    <AdaptiveContext.Provider
      value={{
        context,
        setContext,
        isDarkMode,
        toggleDarkMode,
        autoNightMode,
        setAutoNightMode: handleSetAutoNightMode,
      }}
    >
      {children}
    </AdaptiveContext.Provider>
  );
}

export function useAdaptiveContext() {
  return React.useContext(AdaptiveContext);
}
