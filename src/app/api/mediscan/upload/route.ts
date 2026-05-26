import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  isSupabaseStorageConfigured,
  uploadScanImage,
} from "@/lib/storage/scans";

/**
 * POST /api/mediscan/upload
 *
 * Body: multipart/form-data
 *   - image: File
 *   - patientId: number
 *
 * Returns { storageKey, publicUrl } or 503 when Supabase Storage is not configured.
 *
 * The client uploads via this endpoint to keep the Supabase client server-side
 * and avoid leaking bucket structure to the browser.
 */
export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable scan persistence.",
        reason: "not_configured",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const file = form.get("image");
  const patientIdRaw = form.get("patientId");
  const patientId =
    typeof patientIdRaw === "string" ? Number(patientIdRaw) : NaN;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 });
  }
  if (!Number.isInteger(patientId) || patientId <= 0) {
    return NextResponse.json({ error: "Invalid patientId" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds 20 MB limit` },
      { status: 413 },
    );
  }

  const result = await uploadScanImage({ patientId, file });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, reason: result.reason },
      { status: result.reason === "not_configured" ? 503 : 500 },
    );
  }
  return NextResponse.json({
    storageKey: result.storageKey,
    publicUrl: result.publicUrl,
  });
}
