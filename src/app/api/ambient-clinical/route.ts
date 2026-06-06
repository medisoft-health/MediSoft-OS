import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { processAmbientSession, processAudioChunk } from "@/lib/ambient-clinical";

export const dynamic = "force-dynamic";

/**
 * POST /api/ambient-clinical
 * Body: { action: "process_session" | "process_chunk", ... }
 * Processes clinical encounter transcripts into structured documentation
 */
export async function POST(request: NextRequest) {
  const session = await requireSessionApi();
  if ("response" in session) {
    return session.response;
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "process_session") {
      const { transcript, patientContext } = body;
      if (!transcript || !Array.isArray(transcript)) {
        return NextResponse.json(
          { error: "transcript array is required" },
          { status: 400 }
        );
      }

      const result = await processAmbientSession(transcript, patientContext);
      return NextResponse.json(result);
    }

    if (action === "process_chunk") {
      const { audioText, context } = body;
      if (!audioText) {
        return NextResponse.json(
          { error: "audioText is required" },
          { status: 400 }
        );
      }

      const result = await processAudioChunk(audioText, context || { previousSegments: [] });
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'process_session' or 'process_chunk'" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("[Ambient Clinical] Error:", error);
    return NextResponse.json(
      { error: "Failed to process clinical session" },
      { status: 500 }
    );
  }
}
