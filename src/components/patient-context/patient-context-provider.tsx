"use client";

import * as React from "react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// Patient 360° — Global Context Provider
// ═══════════════════════════════════════════════════════════════════════════════
//
// This provider manages the "active patient" state across the entire application.
// Every module (MediScript, PharmaX, MediLab, MediScan, MediSport, etc.) uses
// this context to know WHO the data belongs to.
//
// Three modes:
//   1. Patient Mode   — A specific patient is selected (data saved to DB)
//   2. Self-Tracking  — Logged-in user tracking their own data (saved to DB under user)
//   3. Guest Mode     — No patient selected, no login (localStorage only, with warning)
//
// ═══════════════════════════════════════════════════════════════════════════════

export type PatientMode = "patient" | "self" | "guest";

export interface SelectedPatient {
  id: number;
  firstName: string;
  lastName: string;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  age: number;
  sex: string;
  mrn?: string | null;
  bloodType?: string | null;
  allergies?: Array<{ substance: string; reaction?: string; severity?: string }>;
  chronicConditions?: Array<{ description: string; icdCode?: string }>;
  insuranceProvider?: string | null;
}

export interface PatientContextValue {
  // Current state
  mode: PatientMode;
  patient: SelectedPatient | null;
  isLoading: boolean;

  // Actions
  selectPatient: (patient: SelectedPatient) => void;
  clearPatient: () => void;
  setSelfTracking: () => void;

  // Helpers
  getDisplayName: () => string;
  getStatusLabel: () => string;
  canSaveToDb: () => boolean;
}

const PatientContext = React.createContext<PatientContextValue | null>(null);

// Storage key for persisting selected patient across page navigations
const STORAGE_KEY = "medisoft_active_patient";

export function PatientContextProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<PatientMode>("guest");
  const [patient, setPatient] = React.useState<SelectedPatient | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Restore from sessionStorage on mount
  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.mode === "patient" && parsed.patient) {
          setMode("patient");
          setPatient(parsed.patient);
        } else if (parsed.mode === "self") {
          setMode("self");
          setPatient(null);
        }
      }
    } catch {
      // Silently fail — start fresh
    }
  }, []);

  // Persist to sessionStorage on change
  React.useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, patient }));
    } catch {
      // Storage full or unavailable
    }
  }, [mode, patient]);

  const selectPatient = React.useCallback((p: SelectedPatient) => {
    setPatient(p);
    setMode("patient");
    toast.success(`تم اختيار المريض: ${p.firstNameAr || p.firstName} ${p.lastNameAr || p.lastName}`, {
      description: p.mrn ? `رقم الملف: ${p.mrn}` : undefined,
    });
  }, []);

  const clearPatient = React.useCallback(() => {
    setPatient(null);
    setMode("guest");
    toast.info("تم إلغاء اختيار المريض — الوضع التجريبي");
  }, []);

  const setSelfTracking = React.useCallback(() => {
    setPatient(null);
    setMode("self");
    toast.info("وضع التتبع الشخصي — البيانات محفوظة على حسابك");
  }, []);

  const getDisplayName = React.useCallback(() => {
    if (mode === "patient" && patient) {
      return `${patient.firstNameAr || patient.firstName} ${patient.lastNameAr || patient.lastName}`;
    }
    if (mode === "self") return "تتبع شخصي";
    return "وضع تجريبي";
  }, [mode, patient]);

  const getStatusLabel = React.useCallback(() => {
    if (mode === "patient") return "مريض محدد";
    if (mode === "self") return "تتبع شخصي";
    return "تجريبي";
  }, [mode]);

  const canSaveToDb = React.useCallback(() => {
    return mode === "patient" || mode === "self";
  }, [mode]);

  const value: PatientContextValue = React.useMemo(
    () => ({
      mode,
      patient,
      isLoading,
      selectPatient,
      clearPatient,
      setSelfTracking,
      getDisplayName,
      getStatusLabel,
      canSaveToDb,
    }),
    [mode, patient, isLoading, selectPatient, clearPatient, setSelfTracking, getDisplayName, getStatusLabel, canSaveToDb]
  );

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
}

/**
 * Hook to access the global patient context from any component.
 */
export function usePatientContext(): PatientContextValue {
  const ctx = React.useContext(PatientContext);
  if (!ctx) {
    throw new Error("usePatientContext must be used within a PatientContextProvider");
  }
  return ctx;
}
