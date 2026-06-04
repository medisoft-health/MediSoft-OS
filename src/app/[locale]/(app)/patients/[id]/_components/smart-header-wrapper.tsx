"use client";

import * as React from "react";
import { SmartPatientHeader } from "@/components/patient-context";
import type { PatientHeaderData } from "@/components/patient-context/smart-patient-header";
import type { SelectedPatient } from "@/components/patient-context";

interface Props {
  patientId: number;
  patient: SelectedPatient;
}

export function SmartPatientHeaderWrapper({ patientId, patient }: Props) {
  const [headerData, setHeaderData] = React.useState<PatientHeaderData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchHeaderData() {
      try {
        // Fetch latest readings for the header
        const res = await fetch(`/api/patient-360/readings?patientId=${patientId}&action=latest`);
        let latestVitals: PatientHeaderData["latestVitals"] = null;

        if (res.ok) {
          const data = await res.json();
          const latest = data.latest || {};
          latestVitals = {};

          if (latest.blood_pressure) {
            latestVitals.bloodPressure = {
              systolic: latest.blood_pressure.value,
              diastolic: latest.blood_pressure.secondaryValue || 0,
              date: latest.blood_pressure.measuredAt,
            };
          }
          if (latest.heart_rate) {
            latestVitals.heartRate = { value: latest.heart_rate.value, date: latest.heart_rate.measuredAt };
          }
          if (latest.temperature) {
            latestVitals.temperature = { value: latest.temperature.value, date: latest.temperature.measuredAt };
          }
          if (latest.spo2) {
            latestVitals.spo2 = { value: latest.spo2.value, date: latest.spo2.measuredAt };
          }
          if (latest.weight) {
            latestVitals.weight = { value: latest.weight.value, date: latest.weight.measuredAt };
          }
          if (latest.blood_sugar) {
            latestVitals.bloodSugar = {
              value: latest.blood_sugar.value,
              context: latest.blood_sugar.context || undefined,
              date: latest.blood_sugar.measuredAt,
            };
          }
        }

        // Build PatientHeaderData from SelectedPatient + fetched vitals
        const data: PatientHeaderData = {
          id: patient.id,
          mrn: patient.mrn || `MRN-${String(patient.id).padStart(6, "0")}`,
          firstName: patient.firstName,
          lastName: patient.lastName,
          firstNameAr: patient.firstNameAr,
          lastNameAr: patient.lastNameAr,
          dateOfBirth: "", // Not available in SelectedPatient, will use age
          sex: patient.sex,
          bloodType: patient.bloodType,
          insuranceProvider: patient.insuranceProvider,
          allergies: patient.allergies,
          chronicConditions: patient.chronicConditions,
          latestVitals,
        };

        setHeaderData(data);
      } catch (err) {
        console.error("Failed to fetch header data:", err);
        // Still show header with basic data
        setHeaderData({
          id: patient.id,
          mrn: patient.mrn || `MRN-${String(patient.id).padStart(6, "0")}`,
          firstName: patient.firstName,
          lastName: patient.lastName,
          firstNameAr: patient.firstNameAr,
          lastNameAr: patient.lastNameAr,
          dateOfBirth: "",
          sex: patient.sex,
          bloodType: patient.bloodType,
          insuranceProvider: patient.insuranceProvider,
          allergies: patient.allergies,
          chronicConditions: patient.chronicConditions,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchHeaderData();
  }, [patientId, patient]);

  if (loading || !headerData) return null;

  return <SmartPatientHeader patient={headerData} compact />;
}
