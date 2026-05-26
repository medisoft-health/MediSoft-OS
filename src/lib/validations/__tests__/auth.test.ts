import { describe, expect, it } from "vitest";
import {
  loginSchema,
  signupSchema,
  SPECIALTY_OPTIONS,
} from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("accepts a valid email/password", () => {
    const r = loginSchema.safeParse({
      email: "sarah@medisoft.health",
      password: "12-char-min-x",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(
      loginSchema.safeParse({ email: "bad", password: "12-char-min-x" }).success,
    ).toBe(false);
  });

  it("requires password >= 12 chars", () => {
    expect(
      loginSchema.safeParse({
        email: "ok@medisoft.health",
        password: "tooshort",
      }).success,
    ).toBe(false);
  });
});

describe("signupSchema", () => {
  const base = {
    name: "Dr Sarah",
    email: "sarah@medisoft.health",
    password: "12-char-min-x",
    confirmPassword: "12-char-min-x",
    specialty: "Cardiology" as const,
    licenseNumber: "",
  };

  it("accepts a valid signup", () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const r = signupSchema.safeParse({
      ...base,
      confirmPassword: "different-pass-12",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const onConfirm = r.error.issues.find(
        (i) => i.path[0] === "confirmPassword",
      );
      expect(onConfirm).toBeDefined();
    }
  });

  it("requires name >= 2 chars", () => {
    expect(signupSchema.safeParse({ ...base, name: "A" }).success).toBe(false);
  });

  it("requires password >= 12 chars", () => {
    expect(
      signupSchema.safeParse({
        ...base,
        password: "11charsxx",
        confirmPassword: "11charsxx",
      }).success,
    ).toBe(false);
  });

  it("rejects password > 128 chars", () => {
    const long = "x".repeat(129);
    expect(
      signupSchema.safeParse({
        ...base,
        password: long,
        confirmPassword: long,
      }).success,
    ).toBe(false);
  });

  it("rejects unknown specialty", () => {
    expect(
      signupSchema.safeParse({
        ...base,
        // safeParse accepts unknown; we intentionally pass a bad value.
        specialty: "Time Travel" as unknown as (typeof SPECIALTY_OPTIONS)[number],
      }).success,
    ).toBe(false);
  });

  it("accepts every documented specialty", () => {
    for (const s of SPECIALTY_OPTIONS) {
      expect(
        signupSchema.safeParse({ ...base, specialty: s }).success,
      ).toBe(true);
    }
  });

  it("makes specialty optional", () => {
    const r = signupSchema.safeParse({ ...base, specialty: undefined });
    expect(r.success).toBe(true);
  });
});
