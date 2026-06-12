import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { uploadCoachDoc } from "@/lib/storage/coach-docs";

/**
 * POST /api/sport/upload
 * multipart/form-data: file=<File>, kind=cv|cert|id|avatar
 * Uploads a coach verification document and returns its URL.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionApi();
    if ("response" in auth) return auth.response;

    const form = await request.formData();
    const file = form.get("file");
    const kindRaw = String(form.get("kind") || "cert");
    const kind = (["cv", "cert", "id", "avatar"].includes(kindRaw) ? kindRaw : "cert") as
      | "cv"
      | "cert"
      | "id"
      | "avatar";

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "no_file" }, { status: 400 });
    }

    const result = await uploadCoachDoc({ userId: auth.user.id, kind, file });
    if (!result.ok) {
      const status = result.error === "too_large" ? 413 : 400;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }
    return NextResponse.json({ success: true, data: { url: result.url } });
  } catch (error) {
    console.error("[MediSport upload] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
