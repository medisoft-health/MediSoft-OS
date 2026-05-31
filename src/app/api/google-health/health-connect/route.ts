import { NextRequest, NextResponse } from "next/server";
import {
  getHealthConnectAuthUrl,
  generateHealthSummary,
  HEALTH_CONNECT_SCOPES,
} from "@/lib/google-health/health-connect";

/**
 * GET /api/google-health/health-connect
 * Returns Health Connect status and OAuth URL
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const action = searchParams.get("action");

  if (action === "auth-url") {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.medisofthealth.com"}/api/google-health/health-connect/callback`;
    const state = patientId || "unknown";
    const authUrl = getHealthConnectAuthUrl(redirectUri, state);

    return NextResponse.json({
      authUrl,
      scopes: HEALTH_CONNECT_SCOPES,
    });
  }

  return NextResponse.json({
    status: "active",
    capabilities: [
      "heart_rate",
      "blood_pressure",
      "oxygen_saturation",
      "body_temperature",
      "steps",
      "sleep",
      "weight",
    ],
    scopes: HEALTH_CONNECT_SCOPES,
    connected: false, // TODO: Check patient's connection status from DB
  });
}

/**
 * POST /api/google-health/health-connect
 * Fetch health data for a connected patient
 *
 * Body: { patientId, accessToken, days? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, accessToken, days = 7 } = body;

    if (!patientId || !accessToken) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, accessToken" },
        { status: 400 },
      );
    }

    const summary = await generateHealthSummary(accessToken, patientId, days);

    return NextResponse.json({
      status: "success",
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "HEALTH_CONNECT_AUTH_EXPIRED") {
      return NextResponse.json(
        { error: "Health Connect authorization expired. Patient needs to reconnect." },
        { status: 401 },
      );
    }

    console.error("[api/google-health/health-connect] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch health data" },
      { status: 500 },
    );
  }
}
