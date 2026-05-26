import type {
  Annotation,
  ScanCreateInput,
} from "@/lib/validations/scan";
import type {
  SoapNoteInput,
  EncounterCreateInput,
} from "@/lib/validations/encounter";
import type {
  PatientCreateInput,
  PatientListFilters,
} from "@/lib/validations/patient";
import type { LabResultItemInput } from "@/lib/validations/lab";
import { emptySoapNote } from "@/lib/encounter-soap";

/**
 * Shared test factories.
 *
 * Each factory returns a "good defaults" object that any test can
 * override field-by-field. Keeps tests focused on the property under
 * test rather than re-stating the whole shape.
 */

export function makePatient(overrides: Partial<PatientCreateInput> = {}): PatientCreateInput {
  return {
    firstName: "Sarah",
    lastName: "Mansour",
    firstNameAr: "",
    lastNameAr: "",
    dateOfBirth: "1985-04-12",
    sex: "female",
    bloodType: "unknown",
    saudiId: "",
    mrn: "",
    phone: "",
    email: "",
    insuranceProvider: "",
    insuranceId: "",
    allergies: [],
    chronicConditions: [],
    medicalHistory: "",
    familyHistory: "",
    socialHistory: "",
    ...overrides,
  };
}

export function makePatientFilters(
  overrides: Partial<PatientListFilters> = {},
): PatientListFilters {
  return {
    q: undefined,
    sex: undefined,
    bloodType: undefined,
    sort: "recent",
    view: "grid",
    page: 1,
    ...overrides,
  };
}

export function makeSoapNote(overrides: Partial<SoapNoteInput> = {}): SoapNoteInput {
  const base = emptySoapNote();
  return {
    subjective: { ...base.subjective, ...(overrides.subjective ?? {}) },
    objective: { ...base.objective, ...(overrides.objective ?? {}) },
    assessment: {
      diagnoses: overrides.assessment?.diagnoses ?? [],
      differentialDiagnosis: overrides.assessment?.differentialDiagnosis ?? "",
      clinicalReasoning: overrides.assessment?.clinicalReasoning ?? "",
    },
    plan: { ...base.plan, ...(overrides.plan ?? {}) },
  };
}

export function makeEncounter(
  overrides: Partial<EncounterCreateInput> = {},
): EncounterCreateInput {
  return {
    patientId: 1,
    encounterType: "outpatient",
    rawTranscript: "",
    correctedTranscript: "",
    soapNote: makeSoapNote(),
    sign: false,
    ...overrides,
  };
}

export function makeAnnotation(
  overrides: Partial<Annotation> = {},
): Annotation {
  return {
    id: "test-ann",
    kind: "rect",
    x: 0.1,
    y: 0.1,
    w: 0.2,
    h: 0.2,
    color: "#E84A8A",
    ...overrides,
  };
}

export function makeScan(overrides: Partial<ScanCreateInput> = {}): ScanCreateInput {
  return {
    patientId: 1,
    scanType: "xray",
    bodyPart: "Chest",
    modality: "",
    studyInstanceUid: "",
    studyDate: "",
    imageStorageKey: "scans/1/2026/01/test-uuid.jpg",
    imageStorageUrl: "",
    mimeType: "image/jpeg",
    fileSizeBytes: 1024,
    findings: [],
    annotations: [],
    aiReport: "",
    aiImpression: "",
    aiDifferentialDiagnosis: "",
    aiRecommendations: "",
    aiPatientSummary: "",
    technicalQuality: undefined,
    disclaimer:
      "AI-assisted analysis is a clinical decision-support tool. It does NOT replace radiologist or physician review. All findings require human verification before use in patient care.",
    ...overrides,
  };
}

export function makeLabResultItem(
  overrides: Partial<LabResultItemInput> = {},
): LabResultItemInput {
  return {
    testName: "Hemoglobin",
    loincCode: "718-7",
    value: 13.2,
    unit: "g/dL",
    referenceLow: 13.5,
    referenceHigh: 17.5,
    flag: undefined,
    interpretation: "",
    ...overrides,
  };
}
