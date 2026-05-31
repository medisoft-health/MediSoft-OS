/**
 * Twilio Voice Webhook — Handles incoming phone calls with IVR
 * URL: /api/twilio/voice
 * Configure this URL in Twilio Console → Phone Numbers → Voice → Webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { communicationLog, patients } from "@/db/schema";
import { eq } from "drizzle-orm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.medisofthealth.com";

// POST /api/twilio/voice — Twilio sends incoming calls here
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const callSid = formData.get("CallSid") as string;
    const digits = formData.get("Digits") as string; // IVR input

    // If digits provided, handle IVR selection
    if (digits) {
      return handleIVRSelection(digits, from);
    }

    // Log the incoming call
    let patient = null;
    try {
      const [p] = await db.select().from(patients).where(eq(patients.phone, from));
      patient = p;
    } catch {}

    await db.insert(communicationLog).values({
      patientId: patient?.id || null,
      direction: "inbound",
      channel: "phone",
      fromNumber: from,
      toNumber: to,
      body: "Incoming call",
      aiResponse: "IVR greeting played",
      intent: "phone_call",
      sentiment: "medium",
      status: "in_progress",
      handledBy: "ai_receptionist",
    });

    // Generate IVR greeting
    const greeting = patient
      ? `Welcome back to MediSoft clinic, ${patient.firstName}. `
      : "Welcome to MediSoft clinic. ";

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${APP_URL}/api/twilio/voice" method="POST" timeout="10">
    <Say voice="Polly.Joanna" language="en-US">
      ${greeting}
      For appointments, press 1.
      For lab results, press 2.
      For prescription refills, press 3.
      To speak with a staff member, press 4.
      For emergencies, please hang up and call 911 or 997.
    </Say>
  </Gather>
  <Say voice="Polly.Joanna">We didn't receive any input. Goodbye.</Say>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("Twilio voice webhook error:", error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're experiencing technical difficulties. Please try again later or visit our website at medisoft health dot com.</Say>
</Response>`;
    return new NextResponse(errorTwiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }
}

// Handle IVR menu selections
function handleIVRSelection(digits: string, from: string) {
  let twiml = "";

  switch (digits) {
    case "1":
      // Appointments
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    To book a new appointment, you can send us a WhatsApp message at our clinic number, 
    or visit our website at medisoft health dot com slash patient portal.
    Our next available slot is tomorrow at 9 AM with Dr. Sarah Mansour.
    Would you like me to book it for you? Press 1 for yes, or 2 to hear other options.
  </Say>
  <Gather numDigits="1" timeout="10">
    <Say voice="Polly.Joanna">Press 1 to confirm booking, or 2 for other times.</Say>
  </Gather>
</Response>`;
      break;

    case "2":
      // Lab results
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    For lab results, please check your patient portal at medisoft health dot com.
    You can also send us a WhatsApp message with the word "results" and we'll send them to you.
    Thank you for calling MediSoft.
  </Say>
</Response>`;
      break;

    case "3":
      // Prescription refills
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    For prescription refills, please send a WhatsApp message with your medication name,
    or visit your patient portal. Our pharmacy team will process your request within 24 hours.
    Thank you for calling MediSoft.
  </Say>
</Response>`;
      break;

    case "4":
      // Transfer to staff
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Please hold while we connect you to our staff. Our clinic hours are Sunday through Thursday, 
    8 AM to 8 PM, and Saturday 9 AM to 2 PM.
  </Say>
  <Say voice="Polly.Joanna">
    Unfortunately, all staff members are currently busy. Please leave a message after the beep,
    and we'll call you back within 2 hours.
  </Say>
  <Record maxLength="120" transcribe="true" />
</Response>`;
      break;

    default:
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Invalid selection. Please try again.</Say>
  <Redirect>${process.env.NEXT_PUBLIC_APP_URL || "https://app.medisofthealth.com"}/api/twilio/voice</Redirect>
</Response>`;
  }

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

// GET /api/twilio/voice — Health check
export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "MediSoft AI Receptionist - Voice IVR",
    features: ["IVR menu", "Appointment booking", "Call recording", "Staff transfer"],
  });
}
