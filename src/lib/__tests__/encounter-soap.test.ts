import { describe, expect, it } from "vitest";
import {
  emptySoapNote,
  isSoapNoteNonEmpty,
} from "@/lib/encounter-soap";
import { makeSoapNote } from "@/test/factories";

describe("emptySoapNote", () => {
  it("returns all four top-level sections", () => {
    const n = emptySoapNote();
    expect(n.subjective).toBeDefined();
    expect(n.objective).toBeDefined();
    expect(n.assessment).toBeDefined();
    expect(n.plan).toBeDefined();
  });

  it("has an empty diagnoses array", () => {
    expect(emptySoapNote().assessment.diagnoses).toEqual([]);
  });

  it("has empty strings (not undefined) for free-text fields", () => {
    const n = emptySoapNote();
    expect(n.subjective.chiefComplaint).toBe("");
    expect(n.plan.followUp).toBe("");
  });
});

describe("isSoapNoteNonEmpty", () => {
  it("returns false for a fresh template", () => {
    expect(isSoapNoteNonEmpty(emptySoapNote())).toBe(false);
  });

  it("returns true when any free-text field has content", () => {
    const n = makeSoapNote({
      subjective: { chiefComplaint: "headache" },
    });
    expect(isSoapNoteNonEmpty(n)).toBe(true);
  });

  it("returns true when assessment has at least one diagnosis", () => {
    const n = makeSoapNote({
      assessment: {
        diagnoses: [{ description: "Acute pharyngitis" }],
        differentialDiagnosis: "",
        clinicalReasoning: "",
      },
    });
    expect(isSoapNoteNonEmpty(n)).toBe(true);
  });

  it("treats whitespace-only strings as empty", () => {
    const n = makeSoapNote({
      subjective: { chiefComplaint: "   " },
    });
    expect(isSoapNoteNonEmpty(n)).toBe(false);
  });

  it("returns true if only the plan section is filled", () => {
    const n = makeSoapNote({
      plan: { therapeuticPlan: "Amoxicillin 500 mg TID for 7 days" },
    });
    expect(isSoapNoteNonEmpty(n)).toBe(true);
  });
});
