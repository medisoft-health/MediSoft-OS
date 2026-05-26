import { describe, expect, it } from "vitest";
import { formatPatientCode, parsePatientCode } from "@/lib/patient-id";

describe("formatPatientCode", () => {
  it("pads to 6 digits", () => {
    expect(formatPatientCode(1)).toBe("MS-000001");
    expect(formatPatientCode(999)).toBe("MS-000999");
  });
});

describe("parsePatientCode", () => {
  it("parses a canonical code", () => {
    expect(parsePatientCode("MS-000001")).toBe(1);
    expect(parsePatientCode("MS-123456")).toBe(123456);
  });

  it("is case-insensitive on the prefix", () => {
    expect(parsePatientCode("ms-000001")).toBe(1);
    expect(parsePatientCode("Ms-000010")).toBe(10);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parsePatientCode("  MS-000007  ")).toBe(7);
  });

  it("returns null for unrelated strings", () => {
    expect(parsePatientCode("ahmed")).toBeNull();
    expect(parsePatientCode("MR-000001")).toBeNull();
    expect(parsePatientCode("")).toBeNull();
  });

  it("returns null for non-positive ids", () => {
    expect(parsePatientCode("MS-000000")).toBeNull();
  });

  it("is symmetric with formatPatientCode", () => {
    for (const id of [1, 42, 999, 100_000]) {
      const parsed = parsePatientCode(formatPatientCode(id));
      expect(parsed).toBe(id);
    }
  });
});
