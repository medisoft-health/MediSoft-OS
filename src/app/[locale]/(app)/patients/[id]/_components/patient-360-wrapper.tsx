"use client";

import * as React from "react";
import { PatientContextProvider, type SelectedPatient } from "@/components/patient-context/patient-context-provider";
import { usePatientContext } from "@/components/patient-context/patient-context-provider";

/**
 * Patient360Wrapper — Client boundary that wraps Patient 360° components
 * with the PatientContextProvider, seeding it with the server-fetched patient data.
 *
 * This solves the architectural gap where the patient detail page is a server component
 * but the Patient360Record/PatientSelfReport components require client-side patient context.
 */

interface Patient360WrapperProps {
  patient: SelectedPatient;
  children: React.ReactNode;
}

function AutoSelectPatient({ patient, children }: Patient360WrapperProps) {
  const { selectPatient, patient: currentPatient } = usePatientContext();

  React.useEffect(() => {
    // Auto-select the patient from server data if not already selected or if different patient
    if (!currentPatient || currentPatient.id !== patient.id) {
      selectPatient(patient);
    }
  }, [patient, currentPatient, selectPatient]);

  return <>{children}</>;
}

export function Patient360Wrapper({ patient, children }: Patient360WrapperProps) {
  return (
    <PatientContextProvider>
      <AutoSelectPatient patient={patient}>
        {children}
      </AutoSelectPatient>
    </PatientContextProvider>
  );
}
