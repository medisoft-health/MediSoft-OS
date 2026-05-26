import { describe, expect, it } from "vitest";
import {
  classifyBMI,
  classifyBP,
  classifyHR,
  classifyPain,
  classifyRR,
  classifySpO2,
  classifyTemp,
  computeBMI,
  toNumber,
  vitalsCreateSchema,
} from "@/lib/validations/vitals";

describe("classifyBP", () => {
  it("returns null when both values are missing", () => {
    expect(classifyBP()).toBeNull();
  });
  it("flags hypertensive crisis at or above 180/120", () => {
    expect(classifyBP(180, 100)?.flag).toBe("critical");
    expect(classifyBP(160, 125)?.flag).toBe("critical");
  });
  it("flags hypotension below 90/60", () => {
    expect(classifyBP(85, 55)?.flag).toBe("low");
  });
  it("flags stage 2 hypertension at 140+ systolic", () => {
    expect(classifyBP(150, 85)?.flag).toBe("high");
  });
  it("flags stage 1 hypertension between 130 and 139 systolic", () => {
    expect(classifyBP(132, 82)?.flag).toBe("borderline");
  });
  it("flags elevated at 120-129/<80", () => {
    expect(classifyBP(125, 75)?.flag).toBe("borderline");
  });
  it("returns normal under 120/80", () => {
    expect(classifyBP(115, 75)?.flag).toBe("normal");
  });
});

describe("classifyHR", () => {
  it("flags severe bradycardia under 40", () => {
    expect(classifyHR(35)?.flag).toBe("critical");
  });
  it("flags severe tachycardia over 130", () => {
    expect(classifyHR(140)?.flag).toBe("critical");
  });
  it("flags normal between 60 and 100", () => {
    expect(classifyHR(72)?.flag).toBe("normal");
  });
  it("flags bradycardia under 60", () => {
    expect(classifyHR(55)?.flag).toBe("low");
  });
  it("flags tachycardia over 100", () => {
    expect(classifyHR(110)?.flag).toBe("high");
  });
});

describe("classifyTemp", () => {
  it("flags hypothermia under 35°C", () => {
    expect(classifyTemp(34.5)?.flag).toBe("critical");
  });
  it("flags hyperpyrexia at 39.5°C+", () => {
    expect(classifyTemp(40)?.flag).toBe("critical");
  });
  it("flags fever at 38°C+", () => {
    expect(classifyTemp(38.5)?.flag).toBe("high");
  });
  it("flags low-grade fever at 37.3 to 37.9", () => {
    expect(classifyTemp(37.5)?.flag).toBe("borderline");
  });
  it("flags normal in 36.0–37.2 range", () => {
    expect(classifyTemp(36.8)?.flag).toBe("normal");
  });
});

describe("classifySpO2", () => {
  it("flags severe hypoxia under 90%", () => {
    expect(classifySpO2(88)?.flag).toBe("critical");
  });
  it("flags mild hypoxia between 90 and 94%", () => {
    expect(classifySpO2(93)?.flag).toBe("low");
  });
  it("flags normal at 95% and above", () => {
    expect(classifySpO2(98)?.flag).toBe("normal");
    expect(classifySpO2(100)?.flag).toBe("normal");
  });
});

describe("classifyRR", () => {
  it("flags severe bradypnea under 8 and severe tachypnea over 30", () => {
    expect(classifyRR(5)?.flag).toBe("critical");
    expect(classifyRR(35)?.flag).toBe("critical");
  });
  it("flags normal in 12-20 range", () => {
    expect(classifyRR(16)?.flag).toBe("normal");
  });
});

describe("classifyBMI", () => {
  it("buckets across all categories", () => {
    expect(classifyBMI(15)?.flag).toBe("critical");
    expect(classifyBMI(17)?.flag).toBe("low");
    expect(classifyBMI(22)?.flag).toBe("normal");
    expect(classifyBMI(27)?.flag).toBe("borderline");
    expect(classifyBMI(32)?.flag).toBe("high");
    expect(classifyBMI(38)?.flag).toBe("critical");
  });
});

describe("classifyPain", () => {
  it("maps the 0-10 scale to severity buckets", () => {
    expect(classifyPain(0)?.flag).toBe("normal");
    expect(classifyPain(3)?.flag).toBe("low");
    expect(classifyPain(5)?.flag).toBe("high");
    expect(classifyPain(8)?.flag).toBe("critical");
  });
});

describe("computeBMI", () => {
  it("computes BMI to 1 decimal", () => {
    // 70 kg / (1.75m)^2 = 22.857... → 22.9
    expect(computeBMI(70, 175)).toBe(22.9);
  });
  it("returns null when height or weight missing", () => {
    expect(computeBMI(null, 170)).toBeNull();
    expect(computeBMI(70, null)).toBeNull();
  });
  it("returns null for zero height", () => {
    expect(computeBMI(70, 0)).toBeNull();
  });
});

describe("toNumber", () => {
  it("returns numeric input unchanged", () => {
    expect(toNumber(42)).toBe(42);
  });
  it("parses string numerics", () => {
    expect(toNumber("3.14")).toBe(3.14);
  });
  it("returns null for non-numeric strings", () => {
    expect(toNumber("hello")).toBeNull();
  });
  it("returns null for empty / whitespace-only strings", () => {
    expect(toNumber("")).toBeNull();
    expect(toNumber("   ")).toBeNull();
  });
  it("returns null for null / undefined", () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
  });
});

describe("vitalsCreateSchema", () => {
  it("accepts a valid blood pressure pair", () => {
    const result = vitalsCreateSchema.safeParse({
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
    });
    expect(result.success).toBe(true);
  });

  it("rejects diastolic >= systolic", () => {
    const result = vitalsCreateSchema.safeParse({
      bloodPressureSystolic: 100,
      bloodPressureDiastolic: 110,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.toLowerCase().includes("diastolic"),
        ),
      ).toBe(true);
    }
  });

  it("rejects an empty submission", () => {
    const result = vitalsCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts a single value (e.g. just HR)", () => {
    const result = vitalsCreateSchema.safeParse({ heartRate: 72 });
    expect(result.success).toBe(true);
  });

  it("rejects out-of-range physiologic values", () => {
    expect(
      vitalsCreateSchema.safeParse({ heartRate: 300 }).success,
    ).toBe(false);
    expect(
      vitalsCreateSchema.safeParse({ temperature: 50 }).success,
    ).toBe(false);
    expect(
      vitalsCreateSchema.safeParse({ spO2: 200 }).success,
    ).toBe(false);
  });
});
