import { describe, expect, it } from "vitest";
import {
  buildPasswordResetEmail,
  buildVerificationEmail,
} from "@/lib/email";

describe("buildVerificationEmail", () => {
  it("addresses the recipient by name when provided", () => {
    const msg = buildVerificationEmail({
      toName: "Sarah",
      toEmail: "sarah@medisoft.health",
      url: "https://medisoft.health/verify?token=x",
    });
    expect(msg.to).toBe("sarah@medisoft.health");
    expect(msg.text).toContain("Hi Sarah");
    expect(msg.text).toContain("https://medisoft.health/verify?token=x");
  });

  it("falls back to 'there' when name is missing or blank", () => {
    const a = buildVerificationEmail({
      toName: null,
      toEmail: "x@y.com",
      url: "https://x",
    });
    const b = buildVerificationEmail({
      toName: "   ",
      toEmail: "x@y.com",
      url: "https://x",
    });
    expect(a.text).toContain("Hi there");
    expect(b.text).toContain("Hi there");
  });

  it("uses a clear subject line", () => {
    const msg = buildVerificationEmail({
      toName: null,
      toEmail: "x@y.com",
      url: "https://x",
    });
    expect(msg.subject).toMatch(/verify/i);
    expect(msg.subject).toMatch(/medisoft/i);
  });
});

describe("buildPasswordResetEmail", () => {
  it("includes the reset URL", () => {
    const msg = buildPasswordResetEmail({
      toName: "Ahmed",
      toEmail: "ahmed@x.com",
      url: "https://medisoft.health/reset?t=abc",
    });
    expect(msg.text).toContain("https://medisoft.health/reset?t=abc");
    expect(msg.subject).toMatch(/reset/i);
  });
});
