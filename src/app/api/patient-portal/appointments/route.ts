/**
 * Patient Portal — Appointments API
 * CRUD operations for patient appointments
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { db } from "@/db";
import { appointments, patients, users } from "@/db/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

// GET /api/patient-portal/appointments — List appointments
export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const upcoming = searchParams.get("upcoming");

    const conditions = [];
    if (patientId) conditions.push(eq(appointments.patientId, parseInt(patientId)));
    if (status) conditions.push(eq(appointments.status, status as any));
    if (from) conditions.push(gte(appointments.scheduledAt, new Date(from)));
    if (to) conditions.push(lte(appointments.scheduledAt, new Date(to)));
    if (upcoming === "true") conditions.push(gte(appointments.scheduledAt, new Date()));

    const results = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        physicianId: appointments.physicianId,
        physicianName: users.name,
        scheduledAt: appointments.scheduledAt,
        duration: appointments.duration,
        appointmentType: appointments.appointmentType,
        status: appointments.status,
        reason: appointments.reason,
        notes: appointments.notes,
        bookedBy: appointments.bookedBy,
        bookedVia: appointments.bookedVia,
        reminderSent: appointments.reminderSent,
        createdAt: appointments.createdAt,
      })
      .from(appointments)
      .leftJoin(users, eq(appointments.physicianId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(upcoming === "true" ? asc(appointments.scheduledAt) : desc(appointments.scheduledAt))
      .limit(50);

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/patient-portal/appointments — Create new appointment
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { patientId, physicianId, scheduledAt, duration, appointmentType, reason, bookedBy, bookedVia } = body;

    if (!patientId || !physicianId || !scheduledAt) {
      return NextResponse.json(
        { success: false, error: "patientId, physicianId, and scheduledAt are required" },
        { status: 400 }
      );
    }

    // Check for scheduling conflicts
    const scheduledDate = new Date(scheduledAt);
    const endTime = new Date(scheduledDate.getTime() + (duration || 30) * 60000);

    const conflicts = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.physicianId, physicianId),
          gte(appointments.scheduledAt, scheduledDate),
          lte(appointments.scheduledAt, endTime),
          eq(appointments.status, "scheduled")
        )
      );

    if (conflicts.length > 0) {
      return NextResponse.json(
        { success: false, error: "Time slot conflict. Please choose another time." },
        { status: 409 }
      );
    }

    const [newAppointment] = await db
      .insert(appointments)
      .values({
        patientId,
        physicianId,
        scheduledAt: scheduledDate,
        duration: duration || 30,
        appointmentType: appointmentType || "consultation",
        reason,
        bookedBy: bookedBy || "patient",
        bookedVia: bookedVia || "portal",
      })
      .returning();

    return NextResponse.json({ success: true, data: newAppointment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/patient-portal/appointments — Update appointment status
export async function PATCH(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { id, status, cancellationReason, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Appointment ID required" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    if (status === "cancelled") {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = cancellationReason || "Cancelled by patient";
    }
    if (status === "confirmed") {
      updateData.confirmedAt = new Date();
    }

    const [updated] = await db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
