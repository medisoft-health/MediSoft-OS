import { describe, expect, it } from "vitest";
import {
  labCreateSchema,
  labResultItemSchema,
} from "@/lib/validations/lab";
import { makeLabResultItem } from "@/test/factories";

describe("labResultItemSchema", () => {
  it("accepts numeric value", () => {
    expect(labResultItemSchema.safeParse(makeLabResultItem()).success).toBe(true);
  });

  it("accepts string value (e.g. 'trace')", () => {
    expect(
      labResultItemSchema.safeParse(
        makeLabResultItem({ value: "trace" }),
      ).success,
    ).toBe(true);
  });

  it("rejects empty test name", () => {
    expect(
      labResultItemSchema.safeParse(makeLabResultItem({ testName: "" })).success,
    ).toBe(false);
  });

  it("rejects empty string value", () => {
    expect(
      labResultItemSchema.safeParse(makeLabResultItem({ value: "" })).success,
    ).toBe(false);
  });
});

describe("labCreateSchema", () => {
  const base = {
    patientId: 1,
    panelName: "CBC",
    results: [makeLabResultItem()],
  };

  it("accepts a minimal panel", () => {
    expect(labCreateSchema.safeParse(base).success).toBe(true);
  });

  it("requires at least one result", () => {
    expect(
      labCreateSchema.safeParse({ ...base, results: [] }).success,
    ).toBe(false);
  });

  it("requires a panel name", () => {
    expect(
      labCreateSchema.safeParse({ ...base, panelName: "" }).success,
    ).toBe(false);
  });

  it("requires a positive patientId", () => {
    expect(labCreateSchema.safeParse({ ...base, patientId: 0 }).success).toBe(
      false,
    );
  });
});
