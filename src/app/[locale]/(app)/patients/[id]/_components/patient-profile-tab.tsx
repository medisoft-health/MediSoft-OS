"use client";

import * as React from "react";
import { PatientProfileEditor } from "@/components/patient-context";
import { Loader2 } from "lucide-react";

interface Props {
  patientId: number;
  patientName: string;
}

export function PatientProfileTab({ patientId, patientName }: Props) {
  const [patient, setPatient] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/patient-360?patientId=${patientId}&action=profile`);
        if (res.ok) {
          const data = await res.json();
          setPatient(data.profile || data);
        }
      } catch (err) {
        console.error("Failed to fetch patient profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [patientId]);

  const handleSave = async (data: Record<string, unknown>) => {
    const res = await fetch("/api/patient-360", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        action: "update_profile",
        data,
      }),
    });
    if (!res.ok) throw new Error("Failed to save profile");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="mr-2 text-sm text-gray-500">جاري تحميل الملف الشامل...</span>
      </div>
    );
  }

  // Build a default patient object if not loaded from API
  const patientData = patient || {
    id: patientId,
    firstName: patientName.split(" ")[0] || "",
    lastName: patientName.split(" ").slice(1).join(" ") || "",
    mrn: `MRN-${String(patientId).padStart(6, "0")}`,
    dateOfBirth: "",
    sex: "unknown",
    bloodType: "unknown",
    phone: "",
    email: "",
    nationality: "",
    nationalId: "",
    maritalStatus: "",
    occupation: "",
    address: {},
    emergencyContacts: [],
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    surgicalHistory: [],
    immunizations: [],
    familyHistory: "",
    socialHistory: "",
    lifestyle: {},
    insuranceProvider: "",
    insuranceId: "",
    profileCompleteness: 0,
  };

  return (
    <PatientProfileEditor
      patient={patientData as any}
      onSave={handleSave}
    />
  );
}
