/**
 * Twilio Webhook — Receives incoming SMS/WhatsApp messages
 * URL: /api/twilio/webhook
 * Configure this URL in Twilio Console → Phone Numbers → Messaging → Webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, communicationLog, patients } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

// POST /api/twilio/webhook — Twilio sends incoming messages here
export async function POST(req: NextRequest) {
  try {
    // Twilio sends form-encoded data
    const formData = await req.formData();
    const from = formData.get("From") as string; // e.g., "whatsapp:+966501234567" or "+966501234567"
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;
    const numMedia = parseInt(formData.get("NumMedia") as string || "0");

    if (!from || !body) {
      return new NextResponse(generateTwiML("Sorry, I couldn't process your message."), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Determine channel
    const isWhatsApp = from.startsWith("whatsapp:");
    const channel = isWhatsApp ? "whatsapp" : "sms";
    const cleanNumber = from.replace("whatsapp:", "");

    // Step 1: Identify patient by phone number
    let patient = null;
    try {
      const [p] = await db.select().from(patients).where(eq(patients.phone, cleanNumber));
      patient = p;
    } catch {
      // Patient not found, continue as unknown
    }

    // Step 2: Use AI to understand intent and generate response
    const intentPrompt = `You are an AI medical receptionist for MediSoft clinic. You handle patient inquiries via ${channel}.
    
Patient message: "${body}"
${patient ? `Patient: ${patient.firstName} ${patient.lastName}` : "Unknown patient (phone: " + cleanNumber + ")"}
Channel: ${channel}

Clinic hours: Sunday-Thursday 8:00 AM - 8:00 PM, Saturday 9:00 AM - 2:00 PM, Friday closed.
Available services: General consultation, Follow-up visits, Lab tests, Imaging, Chronic disease management.

Respond in JSON:
{
  "intent": "book_appointment" | "cancel_appointment" | "reschedule" | "inquiry" | "emergency" | "prescription_refill" | "lab_results" | "general",
  "urgency": "low" | "medium" | "high" | "emergency",
  "extractedInfo": {
    "preferredDate": "ISO date if mentioned",
    "preferredTime": "time if mentioned",
    "reason": "reason for visit if mentioned"
  },
  "suggestedResponse": "A professional, warm response in the SAME LANGUAGE as the patient message. Keep it concise for ${channel}. Max 160 chars for SMS, 500 for WhatsApp."
}`;

    const aiResult = await getGeminiClient()!.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: intentPrompt }] }],
      config: { temperature: 0.3 },
    });
    const aiText = aiResult.text ?? "";

    let aiParsed;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      aiParsed = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { intent: "general", urgency: "low", suggestedResponse: "Thank you for contacting MediSoft. How can we help you?" };
    } catch {
      aiParsed = { intent: "general", urgency: "low", suggestedResponse: "Thank you for contacting MediSoft. How can we help you?" };
    }

    // Step 3: Handle booking intent
    let actionTaken = "responded";
    if (aiParsed.intent === "book_appointment" && patient) {
      try {
        const nextSlot = getNextAvailableSlot();
        const [physician] = await db.select().from(
          sql`(SELECT id, name FROM users WHERE role = 'physician' AND is_active = true LIMIT 1)`
        );

        if (physician) {
          await db.insert(appointments).values({
            patientId: patient.id,
            physicianId: (physician as any).id,
            scheduledAt: nextSlot,
            duration: 30,
            appointmentType: "consultation",
            reason: aiParsed.extractedInfo?.reason || body,
            bookedBy: "ai_receptionist",
            bookedVia: channel,
          });
          actionTaken = "appointment_booked";
        }
      } catch (e) {
        console.error("Auto-booking failed:", e);
      }
    }

    if (aiParsed.urgency === "emergency") {
      actionTaken = "emergency_escalated";
    }

    // Step 4: Log the communication
    await db.insert(communicationLog).values({
      patientId: patient?.id || null,
      direction: "inbound",
      channel,
      fromNumber: cleanNumber,
      toNumber: isWhatsApp ? TWILIO_WHATSAPP_NUMBER : TWILIO_PHONE_NUMBER,
      body,
      aiResponse: aiParsed.suggestedResponse,
      intent: aiParsed.intent,
      sentiment: aiParsed.urgency,
      status: actionTaken === "emergency_escalated" ? "escalated" : "resolved",
      handledBy: "ai_receptionist",
    });

    // Step 5: Respond via TwiML (Twilio Markup Language)
    const responseText = aiParsed.suggestedResponse;
    const twiml = generateTwiML(responseText);

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("Twilio webhook error:", error);
    return new NextResponse(
      generateTwiML("We're experiencing technical difficulties. Please call the clinic directly."),
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}

// GET /api/twilio/webhook — Health check for Twilio
export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "MediSoft AI Receptionist - Twilio Webhook",
    channels: ["sms", "whatsapp"],
    configured: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN),
  });
}

// Helper: Generate TwiML response
function generateTwiML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;
}

// Helper: Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Helper: Get next available slot
function getNextAvailableSlot(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  // Skip Friday (5) and Saturday afternoon
  while (next.getDay() === 5) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(9, 0, 0, 0);
  return next;
}
