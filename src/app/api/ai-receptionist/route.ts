/**
 * AI Receptionist — Backend API
 * Handles incoming calls/messages, auto-scheduling, and patient intake
 * Integrates with Twilio for WhatsApp/SMS and uses Gemini for NLU
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { db } from "@/db";
import { appointments, communicationLog, patients } from "@/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

// GET /api/ai-receptionist — Get receptionist stats and recent interactions
export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";

    const fromDate = new Date();
    if (period === "today") fromDate.setHours(0, 0, 0, 0);
    else if (period === "week") fromDate.setDate(fromDate.getDate() - 7);
    else if (period === "month") fromDate.setMonth(fromDate.getMonth() - 1);

    // Get communication stats
    const recentComms = await db
      .select()
      .from(communicationLog)
      .where(gte(communicationLog.createdAt, fromDate))
      .orderBy(desc(communicationLog.createdAt))
      .limit(50);

    // Get appointment stats
    const recentAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.createdAt, fromDate),
          eq(appointments.bookedBy, "ai_receptionist")
        )
      );

    const stats = {
      totalInteractions: recentComms.length,
      callsHandled: recentComms.filter(c => c.channel === "phone").length,
      whatsappMessages: recentComms.filter(c => c.channel === "whatsapp").length,
      smsMessages: recentComms.filter(c => c.channel === "sms").length,
      appointmentsBooked: recentAppointments.length,
      avgResponseTime: "< 3s",
      resolutionRate: recentComms.length > 0
        ? Math.round((recentComms.filter(c => c.status === "resolved").length / recentComms.length) * 100)
        : 0,
      recentInteractions: recentComms.slice(0, 10),
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/ai-receptionist — Process incoming message/call
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { channel, fromNumber, message, patientId } = body;

    if (!channel || !message) {
      return NextResponse.json(
        { success: false, error: "channel and message are required" },
        { status: 400 }
      );
    }

    // Step 1: Identify patient by phone number
    let patient = null;
    if (patientId) {
      const [p] = await db.select().from(patients).where(eq(patients.id, patientId));
      patient = p;
    } else if (fromNumber) {
      const [p] = await db.select().from(patients).where(eq(patients.phone, fromNumber));
      patient = p;
    }

    // Step 2: Use AI to understand intent
    const intentPrompt = `You are an AI medical receptionist for MediSoft clinic. Analyze this patient message and determine the intent.

Patient message: "${message}"
${patient ? `Patient name: ${patient.firstName} ${patient.lastName}` : "Unknown patient"}

Respond in JSON format:
{
  "intent": "book_appointment" | "cancel_appointment" | "reschedule" | "inquiry" | "emergency" | "prescription_refill" | "lab_results" | "general",
  "urgency": "low" | "medium" | "high" | "emergency",
  "extractedInfo": {
    "preferredDate": "ISO date if mentioned",
    "preferredTime": "time if mentioned",
    "reason": "reason for visit if mentioned",
    "doctorPreference": "doctor name if mentioned"
  },
  "suggestedResponse": "A professional, warm response in the same language as the patient message (Arabic or English)"
}`;

    const aiResult = await getGeminiClient()!.models.generateContent({ model: GEMINI_MODEL, contents: [{ role: "user", parts: [{ text: intentPrompt }] }], config: { temperature: 0.3 } });
    const aiText = aiResult.text ?? "";
    
    let aiParsed;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      aiParsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { intent: "general", suggestedResponse: "Thank you for contacting us. How can I help?" };
    } catch {
      aiParsed = { intent: "general", suggestedResponse: "Thank you for contacting us. How can I help?" };
    }

    // Step 3: Handle intent
    let actionTaken = "responded";
    let appointmentCreated = null;

    if (aiParsed.intent === "book_appointment" && patient) {
      // Auto-schedule appointment
      let preferredDate: Date;
      try {
        const parsed = aiParsed.extractedInfo?.preferredDate ? new Date(aiParsed.extractedInfo.preferredDate) : null;
        preferredDate = (parsed && !isNaN(parsed.getTime())) ? parsed : getNextAvailableSlot();
      } catch {
        preferredDate = getNextAvailableSlot();
      }

      // Find available physician
      const [physician] = await db.select().from(
        // Use first available physician
        sql`(SELECT id, name FROM users WHERE role = 'physician' AND is_active = true LIMIT 1)`
      );

      if (physician) {
        const [newAppt] = await db
          .insert(appointments)
          .values({
            patientId: patient.id,
            physicianId: (physician as any).id,
            scheduledAt: preferredDate,
            duration: 30,
            appointmentType: "consultation",
            reason: aiParsed.extractedInfo?.reason || message,
            bookedBy: "ai_receptionist",
            bookedVia: channel,
          })
          .returning();

        appointmentCreated = newAppt;
        actionTaken = "appointment_booked";
      }
    }

    if (aiParsed.urgency === "emergency") {
      actionTaken = "emergency_escalated";
    }

    // Step 4: Log the communication
    const [logEntry] = await db
      .insert(communicationLog)
      .values({
        patientId: patient?.id || null,
        direction: "inbound",
        channel,
        fromNumber: fromNumber || null,
        toNumber: TWILIO_PHONE_NUMBER || null,
        body: message,
        aiResponse: aiParsed.suggestedResponse,
        intent: aiParsed.intent,
        sentiment: aiParsed.urgency,
        status: actionTaken === "emergency_escalated" ? "escalated" : "resolved",
        handledBy: "ai_receptionist",
      })
      .returning();

    // Step 5: Send response via Twilio (if configured)
    let twilioSent = false;
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && fromNumber) {
      try {
        await sendTwilioMessage(channel, fromNumber, aiParsed.suggestedResponse);
        twilioSent = true;
      } catch (e) {
        console.error("Twilio send failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        intent: aiParsed.intent,
        urgency: aiParsed.urgency,
        response: aiParsed.suggestedResponse,
        actionTaken,
        appointmentCreated,
        communicationLogId: logEntry.id,
        twilioSent,
        patientIdentified: !!patient,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper: Get next available slot (next business day at 9 AM)
function getNextAvailableSlot(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  // Skip weekends
  while (next.getDay() === 5 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(9, 0, 0, 0);
  return next;
}

// Helper: Send message via Twilio
async function sendTwilioMessage(channel: string, to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return;

  const fromNumber = channel === "whatsapp"
    ? `whatsapp:${TWILIO_WHATSAPP_NUMBER}`
    : TWILIO_PHONE_NUMBER;
  const toNumber = channel === "whatsapp" ? `whatsapp:${to}` : to;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      },
      body: new URLSearchParams({ From: fromNumber!, To: toNumber, Body: body }),
    }
  );

  if (!response.ok) {
    throw new Error(`Twilio API error: ${response.status}`);
  }

  return response.json();
}
