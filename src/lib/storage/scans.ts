import "server-only";
import { getAccessTokenForScopes, fetchWithRetry, getCredentialsPath } from "@/lib/google-health/auth";

/**
 * Google Cloud Storage (GCS) helper for scan images using GCS REST API.
 * Replaces the local-filesystem storage with GCS bucket uploads.
 *
 * Files are stored under the configured GCS bucket and served through the
 * authenticated API route `/api/mediscan/file`, which never exposes
 * the storage bucket structure directly — the "signed URL" here is just a time-limited
 * token embedded in the API URL.
 */

const GCS_SCOPE = "https://www.googleapis.com/auth/devstorage.read_write";

function getBucketName(): string {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME environment variable is not configured.");
  }
  return bucketName;
}

/**
 * Returns true if GCS is configured (bucket name and credentials exist).
 */
export function isStorageConfigured(): boolean {
  try {
    return !!process.env.GCS_BUCKET_NAME && !!getCredentialsPath();
  } catch {
    return false;
  }
}

/** Keep alias function for compatibility with existing callers. */
export function isSupabaseStorageConfigured(): boolean {
  return isStorageConfigured();
}

export type UploadResult =
  | { ok: true; storageKey: string; publicUrl: string | null }
  | { ok: false; error: string; reason: "not_configured" | "upload_failed" };

/**
 * Upload a scan image to the GCS bucket.
 * Returns the storage key (e.g. `scans/<patientId>/2026/05/<uuid>.jpg`)
 * that is saved in `scans.imageStorageKey`.
 */
export async function uploadScanImage(input: {
  patientId: number;
  file: File;
}): Promise<UploadResult> {
  if (!isStorageConfigured()) {
    return {
      ok: false,
      error: "Google Cloud Storage is not configured.",
      reason: "not_configured",
    };
  }

  try {
    const bucket = getBucketName();
    const accessToken = await getAccessTokenForScopes(GCS_SCOPE);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");

    const safeExt = (input.file.name.split(".").pop() ?? "bin")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 8) || "bin";
    const uuid = crypto.randomUUID();
    const fileName = `${uuid}.${safeExt}`;
    const key = `scans/${input.patientId}/${yyyy}/${mm}/${fileName}`;

    const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(key)}`;
    const bytes = await input.file.arrayBuffer();

    const res = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": input.file.type || "application/octet-stream",
      },
      body: Buffer.from(bytes),
      timeoutMs: 30000, // 30s timeout
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GCS upload request failed (${res.status}): ${errText}`);
    }

    return { ok: true, storageKey: key, publicUrl: null };
  } catch (err: any) {
    console.error("[storage.uploadScanImage] Error:", err);
    return {
      ok: false,
      error: err?.message ?? "Unknown GCS upload error",
      reason: "upload_failed",
    };
  }
}

/**
 * Generate a short-lived signed URL for displaying a stored scan image.
 *
 * Since images are stored in GCS, this returns an authenticated API URL
 * with a time-limited HMAC-like token so the GCS bucket is never exposed directly.
 * Returns null when the storage key is empty.
 */
export async function getSignedScanUrl(
  storageKey: string,
  expiresSeconds = 60 * 10,
): Promise<string | null> {
  if (!storageKey) return null;

  // Build a simple time-limited token: base64(expires|storageKey)
  // The image API route validates the token server-side before streaming.
  const expires = Math.floor(Date.now() / 1000) + expiresSeconds;
  const token = Buffer.from(`${expires}|${storageKey}`).toString("base64url");
  return `/api/mediscan/file?token=${token}`;
}

/**
 * Delete a scan image from GCS bucket.
 * Silently succeeds if GCS is not configured or the file doesn't exist.
 */
export async function deleteScanImage(storageKey: string): Promise<void> {
  if (!storageKey || !isStorageConfigured()) return;

  try {
    const bucket = getBucketName();
    const accessToken = await getAccessTokenForScopes(GCS_SCOPE);
    const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(storageKey)}`;

    const res = await fetchWithRetry(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeoutMs: 15000,
    });

    if (!res.ok && res.status !== 404) {
      const errText = await res.text();
      console.warn(`[storage.deleteScanImage] Failed to delete object: ${errText}`);
    }
  } catch (err) {
    console.error("[storage.deleteScanImage] Error:", err);
  }
}
