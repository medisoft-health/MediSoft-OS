import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";

/**
 * Supabase Storage helper — lazy-initialized, returns null when env vars
 * are missing so the rest of the app can degrade gracefully.
 *
 * Buckets used by MediSoft:
 *   - `scans` (private)    — PR-7 imaging
 *   - `documents` (private) — future PR for patient documents
 *
 * We use the **anon key** for client-side uploads with signed URLs, and
 * the same client server-side for now. A future hardening PR can switch
 * to the service-role key for server uploads + RLS-enforced reads from
 * the client.
 */

const BUCKET = "scans";

let client: SupabaseClient | null | undefined;

export function isSupabaseStorageConfigured(): boolean {
  return !!(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!isSupabaseStorageConfigured()) {
    client = null;
    return null;
  }
  client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  return client;
}

export type UploadResult =
  | { ok: true; storageKey: string; publicUrl: string | null }
  | { ok: false; error: string; reason: "not_configured" | "upload_failed" };

/**
 * Upload a scan image to the `scans` bucket. Returns the storage key
 * (e.g. `scans/2026/05/<uuid>.jpg`) that goes into `scans.imageStorageKey`.
 */
export async function uploadScanImage(input: {
  patientId: number;
  file: File;
}): Promise<UploadResult> {
  const c = getClient();
  if (!c) {
    return {
      ok: false,
      error:
        "Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable scan persistence.",
      reason: "not_configured",
    };
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const safeExt = (input.file.name.split(".").pop() ?? "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8) || "bin";
  const uuid = crypto.randomUUID();
  const key = `scans/${input.patientId}/${yyyy}/${mm}/${uuid}.${safeExt}`;

  const { error } = await c.storage.from(BUCKET).upload(key, input.file, {
    contentType: input.file.type || "application/octet-stream",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    return {
      ok: false,
      error: error.message,
      reason: "upload_failed",
    };
  }

  // Public URL (bucket should be private; we'll use signed URLs for reads
  // in the detail page). For now expose the canonical path.
  return { ok: true, storageKey: key, publicUrl: null };
}

/**
 * Generate a short-lived signed URL for displaying a stored scan image.
 * Returns null when Storage isn't configured or the file is missing.
 */
export async function getSignedScanUrl(
  storageKey: string,
  expiresSeconds = 60 * 10,
): Promise<string | null> {
  const c = getClient();
  if (!c || !storageKey) return null;
  try {
    const { data, error } = await c.storage
      .from(BUCKET)
      .createSignedUrl(storageKey, expiresSeconds);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
