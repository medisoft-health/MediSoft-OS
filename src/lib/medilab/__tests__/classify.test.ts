import { describe, expect, it } from "vitest";
import { classifyResult } from "@/lib/medilab/classify";

describe("classifyResult — numeric extraction", () => {
  it("flags a normal value as 'normal'", () => {
    const r = classifyResult({
      testName: "Hemoglobin",
      value: 14.0,
      sex: "male",
    });
    expect(r.flag).toBe("normal");
    expect(r.numericValue).toBe(14.0);
  });

  it("flags below-range as 'low'", () => {
    // Male Hgb 13.5–17.5
    const r = classifyResult({
      testName: "Hemoglobin",
      value: 12.0,
      sex: "male",
    });
    expect(r.flag).toBe("low");
  });

  it("flags above-range as 'high'", () => {
    const r = classifyResult({
      testName: "Hemoglobin",
      value: 18.0,
      sex: "male",
    });
    expect(r.flag).toBe("high");
  });

  it("flags critical_low when below the critical threshold", () => {
    // Hgb criticalLow = 7
    const r = classifyResult({
      testName: "Hemoglobin",
      value: 6.0,
      sex: "male",
    });
    expect(r.flag).toBe("critical_low");
  });

  it("flags critical_high when at/above the critical threshold", () => {
    const r = classifyResult({
      testName: "Sodium",
      value: 165,
    });
    expect(r.flag).toBe("critical_high");
  });

  it("returns null flag and numericValue when value is non-numeric", () => {
    const r = classifyResult({
      testName: "Urine Glucose",
      value: "trace",
    });
    expect(r.numericValue).toBeNull();
    expect(r.flag).toBeNull();
  });

  it("parses numeric strings (commas stripped)", () => {
    const r = classifyResult({
      testName: "Platelets",
      value: "1,200",
    });
    // Platelets criticalHigh = 1000 → 1200 is critical_high
    expect(r.numericValue).toBe(1200);
    expect(r.flag).toBe("critical_high");
  });
});

describe("classifyResult — override vs library", () => {
  it("uses override ranges when provided", () => {
    const r = classifyResult({
      testName: "Hemoglobin",
      value: 12.5,
      referenceLow: 12,
      referenceHigh: 18,
      sex: "male",
    });
    // With override 12-18, 12.5 is normal even though library says low for male.
    expect(r.flag).toBe("normal");
    expect(r.low).toBe(12);
    expect(r.high).toBe(18);
  });

  it("falls back to library when overrides are empty strings", () => {
    const r = classifyResult({
      testName: "Hemoglobin",
      value: 14,
      referenceLow: "",
      referenceHigh: "",
      sex: "male",
    });
    expect(r.flag).toBe("normal");
    expect(r.low).toBe(13.5);
    expect(r.high).toBe(17.5);
  });

  it("returns null flag when no library entry AND no override exist", () => {
    const r = classifyResult({
      testName: "TotallyUnknownBiomarker",
      value: 42,
    });
    expect(r.flag).toBeNull();
    expect(r.numericValue).toBe(42);
    expect(r.low).toBeNull();
    expect(r.high).toBeNull();
  });
});

describe("classifyResult — band position", () => {
  it("returns 0..1 within the reference band", () => {
    const r = classifyResult({
      testName: "Sodium",
      value: 140, // middle of 135-145
    });
    expect(r.bandPosition).toBeCloseTo(0.5, 1);
  });

  it("returns 0 at the lower bound", () => {
    const r = classifyResult({
      testName: "Sodium",
      value: 135,
    });
    expect(r.bandPosition).toBe(0);
  });

  it("clips below -0.2 and above 1.2", () => {
    const veryLow = classifyResult({
      testName: "Sodium",
      value: 50,
    });
    expect(veryLow.bandPosition).toBe(-0.2);

    const veryHigh = classifyResult({
      testName: "Sodium",
      value: 500,
    });
    expect(veryHigh.bandPosition).toBe(1.2);
  });

  it("returns null bandPosition when no range is available", () => {
    const r = classifyResult({ testName: "Unknown", value: 10 });
    expect(r.bandPosition).toBeNull();
  });
});

describe("classifyResult — sex-specific ranges", () => {
  it("uses different cutoffs for male vs female", () => {
    const m = classifyResult({
      testName: "Hemoglobin",
      value: 13.0,
      sex: "male",
    });
    const f = classifyResult({
      testName: "Hemoglobin",
      value: 13.0,
      sex: "female",
    });
    // Male range 13.5–17.5, so 13.0 is low.
    // Female range 12.0–15.5, so 13.0 is normal.
    expect(m.flag).toBe("low");
    expect(f.flag).toBe("normal");
  });
});
