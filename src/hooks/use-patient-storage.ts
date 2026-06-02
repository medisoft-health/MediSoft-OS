"use client";

import * as React from "react";
import { usePatientContext } from "@/components/patient-context";

/**
 * Patient-aware localStorage hook.
 * Automatically prefixes storage keys with patient ID when a patient is selected.
 * This ensures data isolation between patients.
 *
 * Usage:
 *   const [data, setData] = usePatientStorage<MyType>("medisport_food", defaultValue);
 *
 * Behavior:
 *   - Patient mode: key becomes "medisport_food_p123"
 *   - Self mode: key becomes "medisport_food_self"
 *   - Guest mode: key stays "medisport_food"
 */
export function usePatientStorage<T>(
  baseKey: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, string] {
  const { mode, patient } = usePatientContext();

  // Compute the actual storage key based on patient context
  const storageKey = React.useMemo(() => {
    if (mode === "patient" && patient) return `${baseKey}_p${patient.id}`;
    if (mode === "self") return `${baseKey}_self`;
    return baseKey;
  }, [baseKey, mode, patient]);

  const [value, setValue] = React.useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // Re-read from storage when key changes (patient switch)
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setValue(JSON.parse(stored));
      } else {
        setValue(defaultValue);
      }
    } catch {
      setValue(defaultValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist to storage on change
  const setValueAndPersist = React.useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof newValue === "function"
          ? (newValue as (prev: T) => T)(prev)
          : newValue;
        try {
          localStorage.setItem(storageKey, JSON.stringify(resolved));
        } catch {
          // Storage full
        }
        return resolved;
      });
    },
    [storageKey]
  );

  return [value, setValueAndPersist, storageKey];
}
