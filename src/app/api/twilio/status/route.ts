/**
 * Twilio Status Callback — Receives delivery status updates
 * URL: /api/twilio/status
 * Configure this URL in Twilio Console → Phone Numbers → Status Callback
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { communicationLog } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST /api/twilio/status — Twilio sends status updates here
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const messageSid = formData.get("MessageSid") as string;
    const messageStatus = formData.get("MessageStatus") as string; // queued, sent, delivered, read, failed, undelivered
    const errorCode = formData.get("ErrorCode") as string;
    const errorMessage = formData.get("ErrorMessage") as string;

    console.log(`[Twilio Status] SID: ${messageSid}, Status: ${messageStatus}`);

    if (errorCode) {
      console.error(`[Twilio Error] Code: ${errorCode}, Message: ${errorMessage}`);
    }

    // Return 200 OK to acknowledge receipt
    return new NextResponse("OK", { status: 200 });
  } catch (error: any) {
    console.error("Twilio status callback error:", error);
    return new NextResponse("Error", { status: 500 });
  }
}

// GET /api/twilio/status — Health check
export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "MediSoft Twilio Status Callback",
  });
}
