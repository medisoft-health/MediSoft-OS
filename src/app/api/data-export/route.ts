import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { exportPatientData } from "@/lib/data-export";

export const runtime = "nodejs";

const exportSchema = z.object({
  patientId: z.number().int().positive(),
  format: z.enum(["fhir_json", "csv", "pdf"]),
  deidentify: z.boolean().default(false),
  locale: z.string().optional(),
  sections: z
    .array(
      z.enum([
        "demographics",
        "encounters",
        "prescriptions",
        "labs",
        "vitals",
        "scans",
      ]),
    )
    .optional(),
});

export async function POST(request: Request) {
  // 1. Authenticate
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  // 2. Check admin role
  if (auth.user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admin access required for data export." },
      { status: 403 },
    );
  }

  // 3. Parse request body
  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = exportSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { patientId, format, deidentify, locale, sections } = parsed.data;

  // 4. Execute export
  const result = await exportPatientData(patientId, {
    format,
    deidentify,
    locale,
    sections,
  });

  // 5. Audit trail
  void logAudit({
    actorId: auth.user.id,
    action: "patient.view",
    resourceType: "patient",
    resourceId: patientId,
    patientId,
    metadata: {
      operation: "data_export",
      format,
      deidentify,
      sections: sections ?? "all",
      success: result.success,
    },
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Export failed.", detail: typeof result.data === "string" ? result.data : undefined },
      { status: 500 },
    );
  }

  // 6. Return appropriate response
  if (format === "fhir_json") {
    return NextResponse.json(JSON.parse(result.data as string), {
      headers: {
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  }

  // CSV or PDF — file download
  const responseBody: BodyInit = typeof result.data === "string"
    ? result.data
    : new Uint8Array(result.data as Buffer);
  return new Response(responseBody, {
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
