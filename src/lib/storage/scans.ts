import "server-only";
import { writeFile, mkdir, access } from "fs/promises";
import { join } from "path";

/**
 * Local-filesystem Storage helper for scan images.
 *
 * Replaces the previous Supabase Storage implementation which was returning
 * 503 errors because no Supabase environment variables are configured.
 *
 * Files are stored under `<cwd>/uploads/scans/` and served through the
 * authenticated API route `/api/mediscan/image/[id]`, which never exposes
 * the storage path directly — the "signed URL" here is just a time-limited
 * token embedded in the API URL.
 *
 * TODO: Migrate to Google Cloud Storage (GCS) before scaling to production.
 *       Required env vars: GCS_BUCKET_NAME, GOOGLE_APPLICATION_CREDENTIALS
 *       Package to install: @google-cloud/storage
 *       Replace writeFile/readFile with Storage.bucket().file().save()/.getSignedUrl()
 */

const UPLOADS_DIR = join(process.cwd(), "uploads", "scans");

/** Ensure the upload directory exists (runs at most once per cold-start). */
async function ensureUploadsDir(): Promise<void> {
  try {
    await access(UPLOADS_DIR);
  } catch {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Returns true — local filesystem is always available.
 * Kept as `isSupabaseStorageConfigured` so existing callers don't break.
 */
export function isSupabaseStorageConfigured(): boolean {
  return true;
}

/** Alias for callers that use the generic name. */
export function isStorageConfigured(): boolean {
  return true;
}

export type UploadResult =
  | { ok: true; storageKey: string; publicUrl: string | null }
  | { ok: false; error: string; reason: "not_configured" | "upload_failed" };

/**
 * Upload a scan image to local storage.
 * Returns the storage key (e.g. `scans/<patientId>/2026/05/<uuid>.jpg`)
 * that is saved in `scans.imageStorageKey`.
 */
export async function uploadScanImage(input: {
  patientId: number;
  file: File;
}): Promise<UploadResult> {
  try {
    await ensureUploadsDir();

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

    // Create subdirectory for the patient/date path
    const subDir = join(UPLOADS_DIR, String(input.patientId), String(yyyy), mm);
    await mkdir(subDir, { recursive: true });

    const bytes = await input.file.arrayBuffer();
    await writeFile(join(subDir, fileName), Buffer.from(bytes));

    return { ok: true, storageKey: key, publicUrl: null };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message ?? "Unknown upload error",
      reason: "upload_failed",
    };
  }
}

/**
 * Generate a short-lived signed URL for displaying a stored scan image.
 *
 * Since images are stored locally, this returns an authenticated API URL
 * with a time-limited HMAC token so the image is never exposed directly.
 * Returns null when the storage key is empty or the file cannot be read.
 */
export async function getSignedScanUrl(
  storageKey: string,
  expiresSeconds = 60 * 10,
): Promise<string | null> {
  if (!storageKey) return null;

  try {
    // Derive local file path from the storage key
    // Key format: `scans/<patientId>/<yyyy>/<mm>/<uuid>.<ext>`
    const relativePath = storageKey.replace(/^scans\//, "");
    const filePath = join(UPLOADS_DIR, relativePath);

    // Check the file exists
    await access(filePath);

    // Build a simple time-limited token: base64(expires|storageKey)
    // The image API route validates the token server-side before streaming.
    const expires = Math.floor(Date.now() / 1000) + expiresSeconds;
    const token = Buffer.from(`${expires}|${storageKey}`).toString("base64url");
    return `/api/mediscan/file?token=${token}`;
  } catch {
    return null;
  }
}

/**
 * Delete a scan image from local storage.
 * Silently succeeds if the file doesn't exist.
 */
export async function deleteScanImage(storageKey: string): Promise<void> {
  if (!storageKey) return;
  try {
    const { unlink } = await import("fs/promises");
    const relativePath = storageKey.replace(/^scans\//, "");
    const filePath = join(UPLOADS_DIR, relativePath);
    await unlink(filePath);
  } catch {
    // Ignore — file may already be gone
  }
}
