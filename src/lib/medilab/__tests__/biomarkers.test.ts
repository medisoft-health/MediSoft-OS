import { describe, expect, it } from "vitest";
import {
  findBiomarkerByName,
  pickRange,
  PANELS,
  PANEL_BY_ID,
} from "@/lib/medilab/biomarkers";

describe("PANELS", () => {
  it("exports at least 5 panels", () => {
    expect(PANELS.length).toBeGreaterThanOrEqual(5);
  });

  it("every panel has at least one biomarker", () => {
    for (const p of PANELS) {
      expect(p.biomarkers.length).toBeGreaterThan(0);
    }
  });

  it("PANEL_BY_ID maps each panel by id", () => {
    for (const p of PANELS) {
      expect(PANEL_BY_ID[p.id]).toBe(p);
    }
  });

  it("every biomarker has at least one range", () => {
    for (const p of PANELS) {
      for (const b of p.biomarkers) {
        expect(b.ranges.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("findBiomarkerByName", () => {
  it("finds a known biomarker by exact name", () => {
    expect(findBiomarkerByName("Hemoglobin")?.loinc).toBe("718-7");
    expect(findBiomarkerByName("HbA1c")?.loinc).toBe("4548-4");
  });

  it("is case-insensitive", () => {
    expect(findBiomarkerByName("hemoglobin")?.name).toBe("Hemoglobin");
    expect(findBiomarkerByName("CREATININE")?.name).toBe("Creatinine");
  });

  it("matches the long name when provided", () => {
    expect(findBiomarkerByName("White Blood Cell count")?.name).toBe("WBC");
  });

  it("returns null for unknown names", () => {
    expect(findBiomarkerByName("Nonexistent panel marker")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(findBiomarkerByName("")).toBeNull();
    expect(findBiomarkerByName("   ")).toBeNull();
  });
});

describe("pickRange", () => {
  it("prefers sex-specific over generic ranges", () => {
    const spec = findBiomarkerByName("Hemoglobin")!;
    const male = pickRange(spec, "male");
    const female = pickRange(spec, "female");
    expect(male?.sex).toBe("male");
    expect(female?.sex).toBe("female");
    expect(male!.low).not.toBe(female!.low);
  });

  it("falls back to the first range when sex doesn't match any", () => {
    const spec = findBiomarkerByName("Hemoglobin")!;
    // Pass `any` — none of Hemoglobin's ranges are "any" so it should
    // still return *some* range rather than null.
    expect(pickRange(spec, "any")).not.toBeNull();
  });

  it("returns the single range for biomarkers without sex split", () => {
    const spec = findBiomarkerByName("Sodium")!;
    expect(pickRange(spec, "male")?.sex).toBe("any");
    expect(pickRange(spec, "female")?.sex).toBe("any");
  });

  it("returns null when the biomarker has no ranges (defensive)", () => {
    // Construct a synthetic spec with no ranges; pickRange handles it.
    const spec = { name: "x", loinc: "", unit: "", ranges: [] };
    expect(pickRange(spec)).toBeNull();
  });
});
