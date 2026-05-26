import { describe, expect, it } from "vitest";
import {
  patientCreateSchema,
  patientListFiltersSchema,
  PATIENT_SORT_OPTIONS,
} from "@/lib/validations/patient";
import { makePatient, makePatientFilters } from "@/test/factories";

describe("patientCreateSchema", () => {
  it("accepts a minimal valid patient", () => {
    const result = patientCreateSchema.safeParse(makePatient());
    expect(result.success).toBe(true);
  });

  it("requires first and last name", () => {
    const r1 = patientCreateSchema.safeParse(makePatient({ firstName: "" }));
    expect(r1.success).toBe(false);
    const r2 = patientCreateSchema.safeParse(makePatient({ lastName: "" }));
    expect(r2.success).toBe(false);
  });

  it("requires dateOfBirth in YYYY-MM-DD format", () => {
    const bad = patientCreateSchema.safeParse(
      makePatient({ dateOfBirth: "12/04/1985" }),
    );
    expect(bad.success).toBe(false);
  });

  it("rejects future date of birth", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const isoFuture = future.toISOString().slice(0, 10);
    const bad = patientCreateSchema.safeParse(
      makePatient({ dateOfBirth: isoFuture }),
    );
    expect(bad.success).toBe(false);
  });

  it("rejects an invalid email when one is supplied", () => {
    const bad = patientCreateSchema.safeParse(
      makePatient({ email: "not-an-email" }),
    );
    expect(bad.success).toBe(false);
  });

  it("accepts an empty email (optional)", () => {
    const ok = patientCreateSchema.safeParse(makePatient({ email: "" }));
    expect(ok.success).toBe(true);
  });

  it("rejects invalid blood type values", () => {
    const bad = patientCreateSchema.safeParse(
      makePatient({ bloodType: "X+" as unknown as "A+" }),
    );
    expect(bad.success).toBe(false);
  });

  it("defaults allergies and chronicConditions to empty arrays", () => {
    const result = patientCreateSchema.parse(makePatient());
    expect(result.allergies).toEqual([]);
    expect(result.chronicConditions).toEqual([]);
  });
});

describe("patientListFiltersSchema", () => {
  it("defaults to sort=recent, view=grid, page=1", () => {
    const result = patientListFiltersSchema.parse({});
    expect(result.sort).toBe("recent");
    expect(result.view).toBe("grid");
    expect(result.page).toBe(1);
  });

  it("coerces a numeric string page to a number", () => {
    const result = patientListFiltersSchema.parse({ page: "3" });
    expect(result.page).toBe(3);
  });

  it("clamps page to a positive integer (rejects 0)", () => {
    const r = patientListFiltersSchema.safeParse({ page: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects unknown sort values", () => {
    const r = patientListFiltersSchema.safeParse({ sort: "alphabetical" });
    expect(r.success).toBe(false);
  });

  it("accepts every documented sort option", () => {
    for (const s of PATIENT_SORT_OPTIONS) {
      expect(
        patientListFiltersSchema.safeParse(
          makePatientFilters({ sort: s }),
        ).success,
      ).toBe(true);
    }
  });
});
