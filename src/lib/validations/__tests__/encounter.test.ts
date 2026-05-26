import { describe, expect, it } from "vitest";
import {
  encounterCreateSchema,
  soapNoteSchema,
} from "@/lib/validations/encounter";
import { makeEncounter, makeSoapNote } from "@/test/factories";

describe("soapNoteSchema", () => {
  it("accepts the empty template (all sections present)", () => {
    expect(soapNoteSchema.safeParse(makeSoapNote()).success).toBe(true);
  });

  it("requires all four top-level sections", () => {
    // safeParse accepts unknown; pass a structurally wrong shape.
    const bad = soapNoteSchema.safeParse({
      subjective: {},
      objective: {},
    } as unknown);
    expect(bad.success).toBe(false);
  });

  it("validates a diagnosis without ICD code", () => {
    const r = soapNoteSchema.safeParse(
      makeSoapNote({
        assessment: {
          diagnoses: [{ description: "Acute pharyngitis" }],
          differentialDiagnosis: "",
          clinicalReasoning: "",
        },
      }),
    );
    expect(r.success).toBe(true);
  });

  it("rejects a diagnosis with empty description", () => {
    const r = soapNoteSchema.safeParse(
      makeSoapNote({
        assessment: {
          diagnoses: [{ description: "" }],
          differentialDiagnosis: "",
          clinicalReasoning: "",
        },
      }),
    );
    expect(r.success).toBe(false);
  });
});

describe("encounterCreateSchema", () => {
  it("accepts a minimal encounter", () => {
    expect(encounterCreateSchema.safeParse(makeEncounter()).success).toBe(true);
  });

  it("requires patientId", () => {
    const enc = makeEncounter();
    // Build a copy without patientId
    const { patientId: _ignored, ...rest } = enc;
    expect(encounterCreateSchema.safeParse(rest).success).toBe(false);
  });

  it("defaults encounterType to outpatient", () => {
    const parsed = encounterCreateSchema.parse({
      patientId: 1,
      soapNote: makeSoapNote(),
    });
    expect(parsed.encounterType).toBe("outpatient");
  });

  it("rejects an unknown encounterType", () => {
    const bad = encounterCreateSchema.safeParse({
      ...makeEncounter(),
      encounterType: "drive-thru" as unknown as "outpatient",
    });
    expect(bad.success).toBe(false);
  });

  it("defaults sign=false", () => {
    const r = encounterCreateSchema.parse(makeEncounter());
    expect(r.sign).toBe(false);
  });
});
