import { describe, expect, it } from "vitest";
import {
  annotationSchema,
  REQUIRED_DISCLAIMER,
  scanCreateSchema,
} from "@/lib/validations/scan";
import { makeAnnotation, makeScan } from "@/test/factories";

describe("annotationSchema", () => {
  it("accepts a rectangle annotation", () => {
    expect(annotationSchema.safeParse(makeAnnotation()).success).toBe(true);
  });

  it("rejects coordinates outside [0,1]", () => {
    expect(
      annotationSchema.safeParse(makeAnnotation({ x: 1.5 })).success,
    ).toBe(false);
    expect(
      annotationSchema.safeParse(makeAnnotation({ y: -0.1 })).success,
    ).toBe(false);
  });

  it("accepts arrow annotations with x2/y2", () => {
    expect(
      annotationSchema.safeParse(
        makeAnnotation({ kind: "arrow", x2: 0.5, y2: 0.5, w: undefined, h: undefined }),
      ).success,
    ).toBe(true);
  });

  it("accepts label annotations with text", () => {
    expect(
      annotationSchema.safeParse(
        makeAnnotation({ kind: "label", text: "Possible nodule" }),
      ).success,
    ).toBe(true);
  });

  it("rejects an unknown kind", () => {
    expect(
      annotationSchema.safeParse(
        makeAnnotation({ kind: "freehand" as unknown as "rect" }),
      ).success,
    ).toBe(false);
  });

  it("defaults color when not provided", () => {
    const r = annotationSchema.parse({
      id: "a",
      kind: "rect",
      x: 0.1,
      y: 0.1,
      w: 0.1,
      h: 0.1,
    });
    expect(r.color).toBe("#E84A8A");
  });
});

describe("scanCreateSchema", () => {
  it("accepts a minimal valid scan", () => {
    expect(scanCreateSchema.safeParse(makeScan()).success).toBe(true);
  });

  it("requires the disclaimer", () => {
    const r = scanCreateSchema.safeParse(makeScan({ disclaimer: "" }));
    expect(r.success).toBe(false);
  });

  it("requires imageStorageKey", () => {
    const r = scanCreateSchema.safeParse(makeScan({ imageStorageKey: "" }));
    expect(r.success).toBe(false);
  });

  it("requires bodyPart", () => {
    const r = scanCreateSchema.safeParse(makeScan({ bodyPart: "" }));
    expect(r.success).toBe(false);
  });

  it("rejects an unknown scanType", () => {
    const r = scanCreateSchema.safeParse(
      makeScan({ scanType: "ECG" as unknown as "xray" }),
    );
    expect(r.success).toBe(false);
  });

  it("rejects a disclaimer that is too short", () => {
    const r = scanCreateSchema.safeParse(makeScan({ disclaimer: "Short." }));
    expect(r.success).toBe(false);
  });

  it("REQUIRED_DISCLAIMER passes the schema's minimum length check", () => {
    expect(REQUIRED_DISCLAIMER.length).toBeGreaterThanOrEqual(20);
    const r = scanCreateSchema.safeParse(
      makeScan({ disclaimer: REQUIRED_DISCLAIMER }),
    );
    expect(r.success).toBe(true);
  });

  it("defaults findings, annotations to empty arrays", () => {
    const r = scanCreateSchema.parse({
      patientId: 1,
      scanType: "xray",
      bodyPart: "Chest",
      imageStorageKey: "x",
      disclaimer: REQUIRED_DISCLAIMER,
    });
    expect(r.findings).toEqual([]);
    expect(r.annotations).toEqual([]);
  });
});
