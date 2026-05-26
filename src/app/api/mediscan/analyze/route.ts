import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import { db } from "@/db";
import { patients } from "@/db/schema";
import {
  SCAN_TYPE_OPTIONS,
  type ScanType,
} from "@/lib/validations/scan";
import { analyzeImage } from "@/lib/mediscan/vision";

/**
 * POST /api/mediscan/analyze
 *
 * Body: multipart/form-data
 *   - image: File (jpeg/png/webp/etc.)
 *   - scanType: enum
 *   - bodyPart: string
 *   - patientId?: number
 *   - clinicalQuestion?: string
 *
 * Returns VisionOutput JSON, with status 429/503/502 on failure modes.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const rl = await enforceRateLimit(auth.user, POLICIES.AI_GEMINI);
  if (!rl.ok) return rl.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const image = form.get("image");
  const scanTypeRaw = String(form.get("scanType") ?? "").trim();
  const bodyPart = String(form.get("bodyPart") ?? "").trim();
  const clinicalQuestion =
    (form.get("clinicalQuestion") as string | null)?.trim() || undefined;
  const patientIdRaw = form.get("patientId");
  const patientId =
    typeof patientIdRaw === "string" && patientIdRaw.length > 0
      ? Number(patientIdRaw)
      : null;

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "Missing image file." },
      { status: 400 },
    );
  }
  if (image.size === 0) {
    return NextResponse.json({ error: "Image is empty." }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      {
        error: `Image exceeds 15 MB limit (got ${(image.size / 1024 / 1024).toFixed(1)} MB).`,
      },
      { status: 413 },
    );
  }
  if (!image.type.startsWith("image/")) {
    return NextResponse.json(
      { error: `Unsupported file type: ${image.type || "unknown"}` },
      { status: 415 },
    );
  }
  if (!(SCAN_TYPE_OPTIONS as readonly string[]).includes(scanTypeRaw)) {
    return NextResponse.json(
      { error: "Invalid scanType." },
      { status: 400 },
    );
  }
  if (!bodyPart) {
    return NextResponse.json(
      { error: "bodyPart is required." },
      { status: 400 },
    );
  }

  // Patient context (optional)
  let patient;
  if (patientId && Number.isInteger(patientId) && patientId > 0) {
    const [p] = await db
      .select({
        dateOfBirth: patients.dateOfBirth,
        sex: patients.sex,
        chronicConditions: patients.chronicConditions,
        deletedAt: patients.deletedAt,
      })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    if (p && !p.deletedAt) {
      patient = {
        age: p.dateOfBirth
          ? new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()
          : undefined,
        sex: p.sex,
        chronicConditions: Array.isArray(p.chronicConditions)
          ? (p.chronicConditions as { description?: string }[])
              .map((c) => c.description)
              .filter((s): s is string => !!s)
          : [],
        clinicalQuestion,
      };
    }
  } else if (clinicalQuestion) {
    patient = { clinicalQuestion };
  }

  // Encode image as base64 (Gemini inlineData expects base64 string)
  const bytes = new Uint8Array(await image.arrayBuffer());
  const base64 = Buffer.from(bytes).toString("base64");

  const result = await analyzeImage({
    imageBase64: base64,
    mimeType: image.type,
    scanType: scanTypeRaw as ScanType,
    bodyPart,
    patient,
  });

  if (result.kind === "not_configured") {
    return NextResponse.json(
      { error: result.message, reason: "not_configured" },
      { status: 503 },
    );
  }
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }
  return NextResponse.json(result.data, {
    headers: { ...rl.headers, "Cache-Control": "private, no-store" },
  });
}
