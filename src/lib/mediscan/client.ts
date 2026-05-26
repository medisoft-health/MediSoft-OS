"use client";

import type { VisionOutput } from "@/lib/mediscan/vision";
import type { ScanType } from "@/lib/validations/scan";

/**
 * MediScan client helpers — image upload + Gemini analysis from the
 * browser. Both endpoints expect multipart/form-data.
 */

// ─────────────────────────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────────────────────────
export type UploadClientResult =
  | { kind: "ok"; storageKey: string; publicUrl: string | null }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

export async function uploadScanImage(args: {
  patientId: number;
  file: File;
}): Promise<UploadClientResult> {
  const form = new FormData();
  form.append("image", args.file);
  form.append("patientId", String(args.patientId));

  let res: Response;
  try {
    res = await fetch("/api/mediscan/upload", { method: "POST", body: form });
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }
  let body: {
    storageKey?: string;
    publicUrl?: string | null;
    error?: string;
    reason?: string;
  } = {};
  try {
    body = await res.json();
  } catch {
    return { kind: "error", message: `Unexpected ${res.status} response` };
  }
  if (res.status === 503 && body.reason === "not_configured") {
    return {
      kind: "not_configured",
      message: body.error ?? "Supabase Storage not configured.",
    };
  }
  if (!res.ok || !body.storageKey) {
    return {
      kind: "error",
      message: body.error ?? `Upload failed (HTTP ${res.status}).`,
    };
  }
  return {
    kind: "ok",
    storageKey: body.storageKey,
    publicUrl: body.publicUrl ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────
// Analyze
// ─────────────────────────────────────────────────────────────────
export type AnalyzeClientResult =
  | { kind: "ok"; data: VisionOutput }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

export async function analyzeScanImage(args: {
  file: File;
  scanType: ScanType;
  bodyPart: string;
  patientId?: number;
  clinicalQuestion?: string;
}): Promise<AnalyzeClientResult> {
  const form = new FormData();
  form.append("image", args.file);
  form.append("scanType", args.scanType);
  form.append("bodyPart", args.bodyPart);
  if (args.patientId) form.append("patientId", String(args.patientId));
  if (args.clinicalQuestion)
    form.append("clinicalQuestion", args.clinicalQuestion);

  let res: Response;
  try {
    res = await fetch("/api/mediscan/analyze", { method: "POST", body: form });
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }
  let body: (Partial<VisionOutput> & { error?: string; reason?: string }) = {};
  try {
    body = await res.json();
  } catch {
    return { kind: "error", message: `Unexpected ${res.status} response` };
  }
  if (res.status === 503 && body.reason === "not_configured") {
    return {
      kind: "not_configured",
      message: body.error ?? "Gemini not configured.",
    };
  }
  if (!res.ok) {
    return {
      kind: "error",
      message: body.error ?? `Analysis failed (HTTP ${res.status}).`,
    };
  }
  // Best-effort cast: route returns VisionOutput as the response shape.
  return { kind: "ok", data: body as VisionOutput };
}

// ─────────────────────────────────────────────────────────────────
// Image signed-URL fetch
// ─────────────────────────────────────────────────────────────────
export async function getScanImageUrl(scanId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/mediscan/image/${scanId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  } catch {
    return null;
  }
}
