import { describe, expect, it } from "vitest";
import {
  prescriptionDrugSchema,
  prescriptionCreateSchema,
  drugSafetyAnalysisRequestSchema,
} from "@/lib/validations/prescription";

const validDrug = {
  drugName: "Amoxicillin",
  brandName: "",
  rxcui: "723",
  atcCode: "",
  dose: "500 mg",
  frequency: "TID",
  route: "oral",
  duration: "7 days",
  instructions: "",
  refills: 0,
};

describe("prescriptionDrugSchema", () => {
  it("accepts a complete drug entry", () => {
    expect(prescriptionDrugSchema.safeParse(validDrug).success).toBe(true);
  });

  it("requires drugName, dose, frequency, route", () => {
    for (const field of ["drugName", "dose", "frequency", "route"] as const) {
      const bad = prescriptionDrugSchema.safeParse({ ...validDrug, [field]: "" });
      expect(bad.success).toBe(false);
    }
  });

  it("coerces refills from string", () => {
    const r = prescriptionDrugSchema.parse({ ...validDrug, refills: "3" });
    expect(r.refills).toBe(3);
  });

  it("rejects negative refills", () => {
    expect(
      prescriptionDrugSchema.safeParse({ ...validDrug, refills: -1 }).success,
    ).toBe(false);
  });

  it("rejects refills > 99", () => {
    expect(
      prescriptionDrugSchema.safeParse({ ...validDrug, refills: 100 }).success,
    ).toBe(false);
  });

  it("rejects non-positive quantity", () => {
    expect(
      prescriptionDrugSchema.safeParse({ ...validDrug, quantity: 0 }).success,
    ).toBe(false);
  });
});

describe("prescriptionCreateSchema", () => {
  it("requires at least one drug", () => {
    const bad = prescriptionCreateSchema.safeParse({ patientId: 1, drugs: [] });
    expect(bad.success).toBe(false);
  });

  it("caps drugs at 20 per prescription", () => {
    const tooMany = Array.from({ length: 21 }, () => ({ ...validDrug }));
    const bad = prescriptionCreateSchema.safeParse({
      patientId: 1,
      drugs: tooMany,
    });
    expect(bad.success).toBe(false);
  });

  it("requires a positive integer patientId", () => {
    expect(
      prescriptionCreateSchema.safeParse({ patientId: 0, drugs: [validDrug] }).success,
    ).toBe(false);
    expect(
      prescriptionCreateSchema.safeParse({ patientId: -1, drugs: [validDrug] }).success,
    ).toBe(false);
  });

  it("defaults finalize=false", () => {
    const r = prescriptionCreateSchema.parse({
      patientId: 1,
      drugs: [validDrug],
    });
    expect(r.finalize).toBe(false);
  });
});

describe("drugSafetyAnalysisRequestSchema", () => {
  it("requires at least one drug", () => {
    expect(
      drugSafetyAnalysisRequestSchema.safeParse({ drugs: [] }).success,
    ).toBe(false);
  });

  it("accepts minimal drug entries", () => {
    expect(
      drugSafetyAnalysisRequestSchema.safeParse({
        drugs: [{ drugName: "Lisinopril" }],
      }).success,
    ).toBe(true);
  });

  it("rejects more than 20 drugs", () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => ({
      drugName: `drug-${i}`,
    }));
    expect(
      drugSafetyAnalysisRequestSchema.safeParse({ drugs: tooMany }).success,
    ).toBe(false);
  });
});
