"use client";

import * as React from "react";
import { PatientPicker, type PickedPatient } from "@/components/clinical/patient-picker";
import { DifferentialDiagnosisPanel } from "@/app/[locale]/(app)/medilab/[id]/_components/differential-diagnosis-panel";

/**
 * Standalone differential diagnosis page with patient selector.
 * Allows doctors to run DDx for ANY patient without being on a lab page.
 */
export function DiagnosisPageClient() {
  const [patient, setPatient] = React.useState<PickedPatient | null>(null);

  return (
    <div className="space-y-4">
      {/* Patient selector */}
      <div className="max-w-md">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          اختر المريض
        </label>
        <PatientPicker value={patient} onChange={setPatient} />
      </div>

      {/* DDx Panel — only show when patient is selected */}
      {patient ? (
        <DifferentialDiagnosisPanel patientId={patient.id} />
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="text-sm text-gray-500">اختر مريضاً أولاً لبدء التشخيص التفريقي</p>
        </div>
      )}
    </div>
  );
}
