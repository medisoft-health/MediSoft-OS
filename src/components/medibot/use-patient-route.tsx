"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useMediBot, type PatientContext } from "./medibot-provider";

/**
 * Hook that auto-detects patient context from the current URL.
 * When user navigates to /patients/[id], it fetches patient data
 * and updates MediBot's patient context automatically.
 */
export function useMediBotPatientRoute() {
  const pathname = usePathname();
  const { setPatientContext } = useMediBot();
  const lastPatientId = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Match /patients/[id] pattern (with optional locale prefix)
    const match = pathname.match(/\/patients\/(\d+)/);
    const patientId = match?.[1] ?? null;

    // Clear context when leaving patient pages
    if (!patientId) {
      if (lastPatientId.current) {
        setPatientContext(null);
        lastPatientId.current = null;
      }
      return;
    }

    // Skip if same patient
    if (patientId === lastPatientId.current) return;
    lastPatientId.current = patientId;

    // Fetch patient context
    async function fetchPatient() {
      try {
        const res = await fetch(`/api/patients/${patientId}/dashboard`);
        if (!res.ok) return;
        const data = await res.json();

        const ctx: PatientContext = {
          id: data.patient.id,
          firstName: data.patient.firstName,
          lastName: data.patient.lastName,
          age: data.patient.age,
          sex: data.patient.sex,
          conditions: data.conditions || [],
          medications: data.medications || [],
          allergies: data.allergies || [],
        };
        setPatientContext(ctx);
      } catch {
        // Silently fail — MediBot will work without patient context
      }
    }

    fetchPatient();
  }, [pathname, setPatientContext]);
}

/**
 * Invisible component that runs the patient route detection hook.
 * Include this inside the MediBotProvider tree.
 */
export function MediBotPatientDetector() {
  useMediBotPatientRoute();
  return null;
}
