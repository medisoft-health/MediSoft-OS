/**
 * End-to-end smoke test.
 *
 * Walks a complete clinical workflow through every pure-logic layer:
 *   1. Validate a patient signup
 *   2. Validate a patient creation payload
 *   3. Validate + classify a vitals reading
 *   4. Build + validate a SOAP note from the SoapForm contract
 *   5. Validate a prescription with multiple drugs
 *   6. Validate a lab panel + classify each result against the curated library
 *   7. Validate a scan record + an annotation
 *
 * No DB, no AI, no network. The point is: if any *contract* between the
 * UI and the actions drifts, this test breaks immediately.
 *
 * This is the "ship-readiness check" — keep it green and the data layer
 * is sound regardless of which UI feature changes.
 */

import { describe, expect, it } from "vitest";
import {
  makePatient,
  makeEncounter,
  makeSoapNote,
  makeAnnotation,
  makeScan,
  makeLabResultItem,
} from "@/test/factories";
import { patientCreateSchema } from "@/lib/validations/patient";
import { signupSchema, loginSchema } from "@/lib/validations/auth";
import {
  vitalsCreateSchema,
  classifyBP,
  classifyHR,
  classifyTemp,
  computeBMI,
} from "@/lib/validations/vitals";
import {
  encounterCreateSchema,
  soapNoteSchema,
} from "@/lib/validations/encounter";
import { isSoapNoteNonEmpty } from "@/lib/encounter-soap";
import {
  prescriptionCreateSchema,
  drugSafetyAnalysisRequestSchema,
} from "@/lib/validations/prescription";
import {
  labCreateSchema,
  labResultItemSchema,
} from "@/lib/validations/lab";
import { classifyResult } from "@/lib/medilab/classify";
import {
  REQUIRED_DISCLAIMER,
  scanCreateSchema,
  annotationSchema,
} from "@/lib/validations/scan";

describe("E2E smoke — physician signup → patient flow", () => {
  it("validates a complete signup payload", () => {
    const payload = {
      name: "Dr Sarah Mansour",
      email: "sarah.mansour@medisoft.health",
      password: "abc-12char-pass",
      confirmPassword: "abc-12char-pass",
      specialty: "Cardiology" as const,
      licenseNumber: "SCFHS-12345",
    };
    expect(signupSchema.safeParse(payload).success).toBe(true);
    // And later the same physician can sign in:
    expect(
      loginSchema.safeParse({
        email: payload.email,
        password: payload.password,
      }).success,
    ).toBe(true);
  });

  it("validates a new-patient submission with allergies and a chronic condition", () => {
    const patient = makePatient({
      firstName: "Ahmed",
      lastName: "Mostafa",
      firstNameAr: "أحمد",
      lastNameAr: "مصطفى",
      dateOfBirth: "1965-08-14",
      sex: "male",
      bloodType: "O+",
      saudiId: "1234567890",
      phone: "+966500000000",
      allergies: [
        { substance: "Penicillin", reaction: "Rash", severity: "moderate" },
      ],
      chronicConditions: [
        {
          description: "Type 2 diabetes mellitus",
          icdCode: "5A11",
          onsetDate: "2018-03-01",
        },
      ],
    });
    const parsed = patientCreateSchema.safeParse(patient);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.allergies).toHaveLength(1);
      expect(parsed.data.chronicConditions[0]?.icdCode).toBe("5A11");
    }
  });
});

describe("E2E smoke — vitals capture + classification", () => {
  it("validates a normal vitals reading and classifies each parameter", () => {
    const reading = {
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      heartRate: 72,
      respiratoryRate: 16,
      temperature: 36.8,
      spO2: 98,
      weightKg: 78,
      heightCm: 178,
    };

    expect(vitalsCreateSchema.safeParse(reading).success).toBe(true);

    expect(classifyBP(120, 80)?.flag).toBe("borderline"); // AHA elevated
    expect(classifyHR(72)?.flag).toBe("normal");
    expect(classifyTemp(36.8)?.flag).toBe("normal");

    const bmi = computeBMI(78, 178);
    expect(bmi).toBe(24.6);
  });

  it("flags a hypertensive crisis as critical", () => {
    expect(classifyBP(190, 130)?.flag).toBe("critical");
  });
});

describe("E2E smoke — encounter SOAP note creation", () => {
  it("rejects an empty SOAP note", () => {
    const empty = makeSoapNote();
    expect(isSoapNoteNonEmpty(empty)).toBe(false);
  });

  it("validates a filled SOAP note with one ICD-coded diagnosis", () => {
    const soap = makeSoapNote({
      subjective: {
        chiefComplaint: "Polyuria and fatigue for two weeks",
        historyOfPresentIllness:
          "65-year-old male with known T2DM presents with worsening polyuria.",
      },
      objective: {
        vitalSigns: "BP 140/85, HR 78, T 37.0",
      },
      assessment: {
        diagnoses: [
          {
            description: "Uncontrolled type 2 diabetes mellitus",
            icdCode: "5A11",
            verified: true,
          },
        ],
        differentialDiagnosis: "",
        clinicalReasoning: "Elevated random glucose; awaiting HbA1c.",
      },
      plan: {
        therapeuticPlan: "Increase metformin to 1000 mg BID; recheck HbA1c in 6 weeks.",
        followUp: "Endocrinology referral.",
      },
    });

    expect(soapNoteSchema.safeParse(soap).success).toBe(true);
    expect(isSoapNoteNonEmpty(soap)).toBe(true);

    const encounter = makeEncounter({
      patientId: 42,
      encounterType: "outpatient",
      soapNote: soap,
      sign: true,
    });
    expect(encounterCreateSchema.safeParse(encounter).success).toBe(true);
  });
});

describe("E2E smoke — multi-drug prescription", () => {
  const metformin = {
    drugName: "Metformin",
    brandName: "",
    rxcui: "6809",
    atcCode: "",
    dose: "1000 mg",
    frequency: "BID (twice daily)",
    route: "oral",
    duration: "",
    instructions: "Take with meals.",
    refills: 3,
  };
  const lisinopril = {
    drugName: "Lisinopril",
    brandName: "",
    rxcui: "29046",
    atcCode: "",
    dose: "10 mg",
    frequency: "Once daily",
    route: "oral",
    duration: "",
    instructions: "",
    refills: 3,
  };

  it("validates a two-drug prescription as a draft", () => {
    const result = prescriptionCreateSchema.safeParse({
      patientId: 42,
      drugs: [metformin, lisinopril],
      finalize: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.drugs).toHaveLength(2);
      expect(result.data.finalize).toBe(false);
    }
  });

  it("validates the corresponding safety-analysis request", () => {
    const req = drugSafetyAnalysisRequestSchema.safeParse({
      drugs: [
        { drugName: "Metformin", rxcui: "6809" },
        { drugName: "Lisinopril", rxcui: "29046" },
      ],
      patientId: 42,
    });
    expect(req.success).toBe(true);
  });
});

describe("E2E smoke — lab panel entry and classification", () => {
  it("classifies a typical CBC + BMP panel correctly", () => {
    const hemoglobin = makeLabResultItem({
      testName: "Hemoglobin",
      value: 11.0, // below male range 13.5–17.5
      unit: "g/dL",
    });
    const glucose = makeLabResultItem({
      testName: "Glucose",
      value: 220, // above fasting 70–99
      unit: "mg/dL",
      referenceLow: 70,
      referenceHigh: 99,
    });
    const potassium = makeLabResultItem({
      testName: "Potassium",
      value: 4.1, // normal 3.5–5.0
      unit: "mmol/L",
    });

    for (const r of [hemoglobin, glucose, potassium]) {
      expect(labResultItemSchema.safeParse(r).success).toBe(true);
    }

    // Run classifier the same way the action does on insert.
    const hgbCls = classifyResult({
      testName: "Hemoglobin",
      value: 11.0,
      sex: "male",
    });
    expect(hgbCls.flag).toBe("low");

    const gluCls = classifyResult({
      testName: "Glucose",
      value: 220,
      referenceLow: 70,
      referenceHigh: 99,
    });
    expect(gluCls.flag).toBe("high");

    const kCls = classifyResult({ testName: "Potassium", value: 4.1 });
    expect(kCls.flag).toBe("normal");

    const panel = labCreateSchema.safeParse({
      patientId: 42,
      panelName: "BMP + CBC excerpt",
      results: [hemoglobin, glucose, potassium],
    });
    expect(panel.success).toBe(true);
  });
});

describe("E2E smoke — scan record with annotation", () => {
  it("validates a scan record with one rectangle annotation", () => {
    const annotation = makeAnnotation({
      kind: "rect",
      x: 0.3,
      y: 0.25,
      w: 0.2,
      h: 0.15,
      color: "#E84A8A",
    });
    expect(annotationSchema.safeParse(annotation).success).toBe(true);

    const scan = makeScan({
      patientId: 42,
      scanType: "xray",
      bodyPart: "Chest PA",
      modality: "CR",
      imageStorageKey: "scans/42/2026/05/xyz.jpg",
      annotations: [annotation],
      findings: [
        { description: "Right upper lobe opacity, 3 cm", severity: "moderate" },
      ],
      aiReport: "PA chest radiograph...",
      aiPatientSummary: "We see a small spot in the upper right area of your lung.",
      technicalQuality: "adequate",
      disclaimer: REQUIRED_DISCLAIMER,
    });

    const parsed = scanCreateSchema.safeParse(scan);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.annotations).toHaveLength(1);
      expect(parsed.data.findings).toHaveLength(1);
      expect(parsed.data.disclaimer).toBe(REQUIRED_DISCLAIMER);
    }
  });

  it("rejects a scan without the mandatory disclaimer", () => {
    expect(
      scanCreateSchema.safeParse(makeScan({ disclaimer: "" })).success,
    ).toBe(false);
  });
});

describe("E2E smoke — contracts are coherent end-to-end", () => {
  it("a SOAP note built by the factory survives Zod validation", () => {
    const soap = makeSoapNote({
      subjective: { chiefComplaint: "x" },
    });
    const parsed = soapNoteSchema.safeParse(soap);
    expect(parsed.success).toBe(true);
  });

  it("an encounter built by the factory survives Zod validation", () => {
    const enc = makeEncounter();
    const parsed = encounterCreateSchema.safeParse(enc);
    expect(parsed.success).toBe(true);
  });

  it("a scan built by the factory survives Zod validation (including disclaimer length)", () => {
    const scan = makeScan();
    const parsed = scanCreateSchema.safeParse(scan);
    expect(parsed.success).toBe(true);
  });
});
