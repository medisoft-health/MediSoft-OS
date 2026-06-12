/**
 * Twilio Status Callback — Receives delivery status updates
 * URL: /api/twilio/status
 * Configure this URL in Twilio Console → Phone Numbers → Status Callback
 */

import { NextRequest, NextResponse } from "next/server";

// POST /api/twilio/status — Twilio sends status updates here
export async function POST(req: NextRequest) {
  try {
    // Twilio sends application/x-www-form-urlencoded. Parse defensively so a
    // malformed/unexpected body never returns 5xx (which would make Twilio retry).
    let messageSid = "";
    let messageStatus = "";
    let errorCode = "";
    let errorMessage = "";
    try {
      const formData = await req.formData();
      messageSid = (formData.get("MessageSid") as string) || "";
      messageStatus = (formData.get("MessageStatus") as string) || "";
      errorCode = (formData.get("ErrorCode") as string) || "";
      errorMessage = (formData.get("ErrorMessage") as string) || "";
    } catch {
      // Non-form body (e.g. health probe / unexpected content-type) — acknowledge and exit.
      return new NextResponse("OK", { status: 200 });
    }

    console.log(`[Twilio Status] SID: ${messageSid}, Status: ${messageStatus}`);

    if (errorCode) {
      console.error(`[Twilio Error] Code: ${errorCode}, Message: ${errorMessage}`);
    }

    // Return 200 OK to acknowledge receipt
    return new NextResponse("OK", { status: 200 });
  } catch (error: any) {
    console.error("Twilio status callback error:", error);
    // Webhooks should not return 5xx for transient parse issues; acknowledge.
    return new NextResponse("OK", { status: 200 });
  }
}

// GET /api/twilio/status — Health check
export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "MediSoft Twilio Status Callback",
  });
}
