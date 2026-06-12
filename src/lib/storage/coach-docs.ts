import "server-only";
import { promises as fs } from "fs";
import path from "path";
import {
  getAccessTokenForScopes,
  fetchWithRetry,
  getCredentialsPath,
} from "@/lib/google-health/auth";

/**
 * Storage helper for MediSport coach verification documents
 * (CV, certification files, ID document, avatar).
 *
 * Strategy:
 *  - If Google Cloud Storage is configured, upload to the bucket under
 *    `coach-docs/<userId>/...` and serve via a token URL through
 *    `/api/sport/coach-doc`.
 *  - Otherwise, fall back to a guaranteed local public folder
 *    `public/uploads/coach-docs/<userId>/...` and return a direct path.
 *
 * This guarantees uploads always work even when GCS is not provisioned.
 */

const GCS_SCOPE = "https://www.googleapis.com/auth/devstorage.read_write";
const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx"];

function gcsConfigured(): boolean {
  try {
    return !!process.env.GCS_BUCKET_NAME && !!getCredentialsPath();
  } catch {
    return false;
  }
}

function safeExt(name: string): string {
  const ext = (name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return ALLOWED_EXT.includes(ext) ? ext : "bin";
}

export type CoachDocUploadResult =
  | { ok: true; url: string; storageKey: string }
  | { ok: false; error: string };

/**
 * Upload a coach document. `kind` is one of cv|cert|id|avatar (used in path only).
 * Returns a URL suitable for storing in sport_profiles / sport_coach_certifications.
 */
export async function uploadCoachDoc(input: {
  userId: string;
  kind: "cv" | "cert" | "id" | "avatar";
  file: File;
}): Promise<CoachDocUploadResult> {
  const { userId, kind, file } = input;

  if (!ALLOWED_EXT.includes(safeExt(file.name))) {
    return { ok: false, error: "unsupported_type" };
  }
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const uuid = crypto.randomUUID();
  const fileName = `${kind}-${uuid}.${safeExt(file.name)}`;
  const key = `coach-docs/${userId}/${fileName}`;

  // --- Try GCS first ---
  if (gcsConfigured()) {
    try {
      const bucket = process.env.GCS_BUCKET_NAME!;
      const accessToken = await getAccessTokenForScopes(GCS_SCOPE);
      const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(key)}`;
      const res = await fetchWithRetry(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: Buffer.from(bytes),
        timeoutMs: 30000,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`GCS upload failed (${res.status}): ${t}`);
      }
      const token = Buffer.from(`${Math.floor(Date.now() / 1000) + 31536000}|${key}`).toString("base64url");
      return { ok: true, url: `/api/sport/coach-doc?token=${token}`, storageKey: key };
    } catch (err) {
      console.error("[coach-docs] GCS upload error, falling back to local:", err);
      // fall through to local
    }
  }

  // --- Local fallback ---
  try {
    const dir = path.join(process.cwd(), "public", "uploads", "coach-docs", userId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), Buffer.from(bytes));
    return { ok: true, url: `/uploads/coach-docs/${userId}/${fileName}`, storageKey: key };
  } catch (err) {
    console.error("[coach-docs] local upload error:", err);
    return { ok: false, error: "upload_failed" };
  }
}

/**
 * Resolve a GCS-stored coach doc from its time-limited token and stream bytes.
 * Returns the bytes + content type, or null if invalid/expired.
 */
export async function resolveCoachDocToken(
  token: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [expStr, key] = decoded.split("|");
    const exp = Number(expStr);
    if (!key || !exp || Date.now() / 1000 > exp) return null;
    if (!gcsConfigured()) return null;
    const bucket = process.env.GCS_BUCKET_NAME!;
    const accessToken = await getAccessTokenForScopes(GCS_SCOPE);
    const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(key)}?alt=media`;
    const res = await fetchWithRetry(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      timeoutMs: 30000,
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    return { bytes: buf, contentType };
  } catch (err) {
    console.error("[coach-docs] resolve token error:", err);
    return null;
  }
}
