/**
 * AI Nurse — Backend API
 * Post-visit follow-up, medication reminders, chronic disease management, triage
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { followUpTasks, patients, prescriptions, encounters, communicationLog } from "@/db/schema";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// GET /api/ai-nurse — Get follow-up tasks, patient adherence stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    // Get dashboard stats
    if (action === "dashboard") {
      const allTasks = await db.select().from(followUpTasks);
      const activePrescriptions = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.status, "active"));

      const stats = {
        totalFollowUps: allTasks.length,
        pendingTasks: allTasks.filter(t => t.status === "pending").length,
        completedTasks: allTasks.filter(t => t.status === "completed").length,
        escalatedTasks: allTasks.filter(t => t.status === "escalated").length,
        activeMedications: activePrescriptions.length,
        overdueTasks: allTasks.filter(t => t.status === "pending" && new Date(t.scheduledAt) < new Date()).length,
        adherenceRate: calculateAdherenceRate(allTasks),
      };

      return NextResponse.json({ success: true, data: stats });
    }

    // Get patient-specific follow-ups
    if (action === "patient_tasks" && patientId) {
      const tasks = await db
        .select()
        .from(followUpTasks)
        .where(eq(followUpTasks.patientId, parseInt(patientId)))
        .orderBy(desc(followUpTasks.scheduledAt));

      return NextResponse.json({ success: true, data: tasks });
    }

    // List all tasks with optional filters
    const conditions = [];
    if (patientId) conditions.push(eq(followUpTasks.patientId, parseInt(patientId)));
    if (status) conditions.push(eq(followUpTasks.status, status as any));

    const tasks = await db
      .select({
        id: followUpTasks.id,
        patientId: followUpTasks.patientId,
        physicianId: followUpTasks.physicianId,
        taskType: followUpTasks.taskType,
        title: followUpTasks.title,
        description: followUpTasks.description,
        priority: followUpTasks.priority,
        scheduledAt: followUpTasks.scheduledAt,
        completedAt: followUpTasks.completedAt,
        channel: followUpTasks.channel,
        status: followUpTasks.status,
        attempts: followUpTasks.attempts,
        patientResponse: followUpTasks.patientResponse,
        aiNotes: followUpTasks.aiNotes,
        createdAt: followUpTasks.createdAt,
      })
      .from(followUpTasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(followUpTasks.scheduledAt))
      .limit(100);

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/ai-nurse — Create follow-up tasks, send reminders, or run triage
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Generate follow-up tasks for a patient after encounter
    if (action === "generate_followups") {
      const { encounterId, patientId, physicianId } = body;

      // Get encounter and patient data
      const [encounter] = await db.select().from(encounters).where(eq(encounters.id, encounterId));
      const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));
      const patientRx = await db.select().from(prescriptions)
        .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.status, "active")));

      if (!encounter || !patient) {
        return NextResponse.json({ success: false, error: "Encounter or patient not found" }, { status: 404 });
      }

      // Use AI to generate follow-up plan
      const followUpPrompt = `You are an AI nurse assistant. Based on this clinical encounter, generate a follow-up care plan.

Patient: ${patient.firstName} ${patient.lastName}, Age: ${calculateAge(patient.dateOfBirth)}
Chronic Conditions: ${JSON.stringify(patient.chronicConditions || [])}
Active Medications: ${patientRx.map(rx => `${rx.drugName} ${rx.dose} ${rx.frequency}`).join(", ")}
SOAP Note: ${JSON.stringify(encounter.soapNote)}
ICD Codes: ${JSON.stringify(encounter.icdCodes)}

Generate follow-up tasks in JSON format:
{
  "tasks": [
    {
      "taskType": "medication_reminder" | "symptom_check" | "appointment_reminder" | "lab_followup" | "vital_check" | "education",
      "title": "Brief task title",
      "description": "Detailed description",
      "priority": "low" | "normal" | "high" | "urgent",
      "scheduleDaysFromNow": 1,
      "channel": "sms" | "whatsapp" | "call",
      "messageTemplate": "Message to send to patient in Arabic"
    }
  ]
}`;

      const aiResult = await getGeminiClient()!.models.generateContent({ model: GEMINI_MODEL, contents: [{ role: "user", parts: [{ text: followUpPrompt }] }], config: { temperature: 0.3 } });
      const aiText = aiResult.text ?? "";

      let followUpPlan;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        followUpPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : { tasks: [] };
      } catch {
        followUpPlan = { tasks: [] };
      }

      // Create tasks in database
      const createdTasks = [];
      for (const task of followUpPlan.tasks) {
        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + (task.scheduleDaysFromNow || 1));

        const [newTask] = await db
          .insert(followUpTasks)
          .values({
            patientId,
            physicianId,
            encounterId,
            taskType: task.taskType,
            title: task.title,
            description: task.description,
            priority: task.priority || "normal",
            scheduledAt,
            channel: task.channel || "sms",
            messageSent: task.messageTemplate,
            aiGenerated: true,
            aiNotes: `Generated from encounter ${encounterId}`,
          })
          .returning();

        createdTasks.push(newTask);
      }

      return NextResponse.json({
        success: true,
        data: { tasksCreated: createdTasks.length, tasks: createdTasks },
      });
    }

    // Send medication reminder
    if (action === "send_reminder") {
      const { taskId } = body;

      const [task] = await db.select().from(followUpTasks).where(eq(followUpTasks.id, taskId));
      if (!task) {
        return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
      }

      const [patient] = await db.select().from(patients).where(eq(patients.id, task.patientId));
      if (!patient || !patient.phone) {
        return NextResponse.json({ success: false, error: "Patient phone not found" }, { status: 404 });
      }

      // Send via Twilio
      let sent = false;
      if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && patient.phone) {
        try {
          await sendSMS(patient.phone, task.messageSent || task.title);
          sent = true;
        } catch (e) {
          console.error("SMS send failed:", e);
        }
      }

      // Update task
      await db
        .update(followUpTasks)
        .set({
          status: "sent",
          attempts: (task.attempts || 0) + 1,
          lastAttemptAt: new Date(),
        })
        .where(eq(followUpTasks.id, taskId));

      // Log communication
      await db.insert(communicationLog).values({
        patientId: task.patientId,
        direction: "outbound",
        channel: task.channel || "sms",
        toNumber: patient.phone,
        body: task.messageSent || task.title,
        status: sent ? "sent" : "failed",
        handledBy: "ai_nurse",
        intent: task.taskType,
      });

      return NextResponse.json({ success: true, data: { sent, taskId } });
    }

    // AI Triage — assess patient symptoms
    if (action === "triage") {
      const { symptoms, patientId: triagePatientId } = body;

      let patientContext = "";
      if (triagePatientId) {
        const [patient] = await db.select().from(patients).where(eq(patients.id, triagePatientId));
        if (patient) {
          patientContext = `Patient: ${patient.firstName} ${patient.lastName}, Age: ${calculateAge(patient.dateOfBirth)}, Chronic: ${JSON.stringify(patient.chronicConditions || [])}`;
        }
      }

      const triagePrompt = `You are an AI triage nurse. Assess these symptoms and provide a triage level.

${patientContext}
Symptoms reported: ${symptoms}

Respond in JSON:
{
  "triageLevel": "emergency" | "urgent" | "semi_urgent" | "non_urgent" | "self_care",
  "assessment": "Brief clinical assessment",
  "recommendations": ["List of recommendations"],
  "shouldSeeDoctor": true/false,
  "timeframe": "immediately" | "within_24h" | "within_week" | "routine",
  "redFlags": ["Any red flag symptoms detected"]
}`;

      const aiResult = await getGeminiClient()!.models.generateContent({ model: GEMINI_MODEL, contents: [{ role: "user", parts: [{ text: triagePrompt }] }], config: { temperature: 0.3 } });
      const aiText = aiResult.text ?? "";

      let triageResult;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        triageResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        triageResult = { triageLevel: "non_urgent", assessment: "Unable to assess. Please consult a physician." };
      }

      return NextResponse.json({ success: true, data: triageResult });
    }

    // Process pending tasks (cron-like batch processing)
    if (action === "process_pending") {
      const now = new Date();
      const pendingTasks = await db
        .select()
        .from(followUpTasks)
        .where(
          and(
            eq(followUpTasks.status, "pending"),
            lte(followUpTasks.scheduledAt, now)
          )
        )
        .limit(20);

      let processed = 0;
      for (const task of pendingTasks) {
        const [patient] = await db.select().from(patients).where(eq(patients.id, task.patientId));
        if (patient?.phone && TWILIO_ACCOUNT_SID) {
          try {
            await sendSMS(patient.phone, task.messageSent || task.title);
            await db.update(followUpTasks).set({
              status: "sent",
              attempts: (task.attempts || 0) + 1,
              lastAttemptAt: now,
            }).where(eq(followUpTasks.id, task.id));
            processed++;
          } catch (e) {
            // Mark as escalated if max attempts reached
            if ((task.attempts || 0) >= (task.maxAttempts || 3)) {
              await db.update(followUpTasks).set({
                status: "escalated",
                escalationReason: "Max delivery attempts reached",
              }).where(eq(followUpTasks.id, task.id));
            }
          }
        }
      }

      return NextResponse.json({ success: true, data: { processed, total: pendingTasks.length } });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/ai-nurse — Update task status (patient responded, completed, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, status, patientResponse } = body;

    if (!taskId) {
      return NextResponse.json({ success: false, error: "taskId required" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (patientResponse) updateData.patientResponse = patientResponse;
    if (status === "completed") updateData.completedAt = new Date();

    const [updated] = await db
      .update(followUpTasks)
      .set(updateData)
      .where(eq(followUpTasks.id, taskId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helpers
function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function calculateAdherenceRate(tasks: any[]): number {
  const completedOrAcknowledged = tasks.filter(t => t.status === "completed" || t.status === "acknowledged").length;
  const total = tasks.filter(t => t.status !== "pending" && t.status !== "cancelled").length;
  return total > 0 ? Math.round((completedOrAcknowledged / total) * 100) : 0;
}

async function sendSMS(to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) return;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      },
      body: new URLSearchParams({ From: TWILIO_PHONE_NUMBER, To: to, Body: body }),
    }
  );

  if (!response.ok) throw new Error(`Twilio error: ${response.status}`);
  return response.json();
}
