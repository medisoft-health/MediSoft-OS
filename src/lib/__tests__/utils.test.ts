import { describe, expect, it } from "vitest";
import {
  calculateAge,
  cn,
  formatClinicalDate,
  formatPatientId,
  getInitials,
} from "@/lib/utils";

describe("cn", () => {
  it("merges plain class strings", () => {
    expect(cn("px-2 py-1", "bg-pink-500")).toBe("px-2 py-1 bg-pink-500");
  });

  it("resolves Tailwind conflicts in favor of the later value", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("filters out falsy values", () => {
    expect(cn("p-2", false, undefined, null, "")).toBe("p-2");
  });
});

describe("formatClinicalDate", () => {
  it("formats an ISO date string in en-GB style", () => {
    const out = formatClinicalDate("2024-03-15T00:00:00Z");
    // Locale renders e.g. "15 Mar 2024".
    expect(out).toMatch(/^\d{1,2} \w{3} \d{4}$/);
  });

  it("accepts a Date instance", () => {
    const out = formatClinicalDate(new Date("2020-12-31"));
    expect(out).toContain("Dec");
    expect(out).toContain("2020");
  });

  it("accepts a numeric timestamp", () => {
    const ts = new Date("2018-06-01").getTime();
    expect(formatClinicalDate(ts)).toContain("Jun");
  });
});

describe("formatPatientId", () => {
  it("zero-pads to 6 digits", () => {
    expect(formatPatientId(1)).toBe("MS-000001");
    expect(formatPatientId(42)).toBe("MS-000042");
    expect(formatPatientId(123456)).toBe("MS-123456");
  });

  it("accepts string ids and preserves padding", () => {
    expect(formatPatientId("7")).toBe("MS-000007");
  });

  it("does not truncate ids longer than 6 digits", () => {
    expect(formatPatientId(1234567)).toBe("MS-1234567");
  });
});

describe("calculateAge", () => {
  it("computes a positive integer age for an adult", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 30);
    expect(calculateAge(dob)).toBe(30);
  });

  it("accounts for birthdays later in the year (still age N, not N+1)", () => {
    const today = new Date();
    const dob = new Date(today);
    dob.setFullYear(dob.getFullYear() - 30);
    // Push birthday into next month — should be 29, not 30.
    dob.setMonth(today.getMonth() + 1);
    expect(calculateAge(dob)).toBe(29);
  });

  it("treats a same-day birthday today as the new age", () => {
    const today = new Date();
    const dob = new Date(today);
    dob.setFullYear(dob.getFullYear() - 25);
    expect(calculateAge(dob)).toBe(25);
  });

  it("accepts a date string", () => {
    expect(calculateAge("1990-01-01")).toBeGreaterThan(30);
  });
});

describe("getInitials", () => {
  it("returns first letter of up to two name parts", () => {
    expect(getInitials("Sarah Mansour")).toBe("SM");
    expect(getInitials("Ahmed Bin Khalid Mostafa")).toBe("AB");
  });

  it("uppercases", () => {
    expect(getInitials("layla hassan")).toBe("LH");
  });

  it("handles single names", () => {
    expect(getInitials("Cher")).toBe("C");
  });

  it("handles empty strings", () => {
    expect(getInitials("")).toBe("");
  });

  it("ignores extra whitespace", () => {
    expect(getInitials("  Omar    Khalil  ")).toBe("OK");
  });
});
