import { NextResponse } from "next/server";
import { getAccessTokenForScopes, fetchWithRetry } from "@/lib/google-health/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const GCS_SCOPE = "https://www.googleapis.com/auth/devstorage.read_write";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    let decoded: string;
    try {
      decoded = Buffer.from(token, "base64url").toString("utf-8");
    } catch {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    const parts = decoded.split("|");
    if (parts.length < 2) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
    }

    const expires = parseInt(parts[0], 10);
    const storageKey = parts.slice(1).join("|");

    if (isNaN(expires) || Date.now() / 1000 > expires) {
      return NextResponse.json({ error: "Token has expired" }, { status: 401 });
    }

    const bucket = process.env.GCS_BUCKET_NAME;
    if (!bucket) {
      return NextResponse.json({ error: "Storage bucket not configured" }, { status: 500 });
    }

    const accessToken = await getAccessTokenForScopes(GCS_SCOPE);
    const gcsUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(storageKey)}?alt=media`;

    const gcsRes = await fetchWithRetry(gcsUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeoutMs: 20000,
    });

    if (!gcsRes.ok) {
      if (gcsRes.status === 404) {
        return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
      }
      const errText = await gcsRes.text();
      return NextResponse.json({ error: `GCS retrieval failed: ${errText}` }, { status: 502 });
    }

    // Set appropriate headers and stream response back
    const contentType = gcsRes.headers.get("content-type") || "application/octet-stream";
    const contentLength = gcsRes.headers.get("content-length");
    
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }
    // Cache control matching original authenticated image serving (short-lived private cache)
    headers.set("Cache-Control", "private, max-age=600");

    return new Response(gcsRes.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("[mediscan/file] Error serving file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
