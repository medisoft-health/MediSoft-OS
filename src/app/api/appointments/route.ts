import { NextResponse } from "next/server";
import { and, eq, gte, lte, desc, sql, or, count } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients, users } from "@/db/schema";
import { requireSessionApi } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────
//  GET: List appointments with filters
// ─────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const physicianId = searchParams.get("physicianId");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    const conditions: ReturnType<typeof eq>[] = [];

    // Filter by specific date (full day range)
    if (dateParam) {
      const dayStart = new Date(dateParam);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateParam);
      dayEnd.setHours(23, 59, 59, 999);
      conditions.push(gte(appointments.scheduledAt, dayStart));
      conditions.push(lte(appointments.scheduledAt, dayEnd));
    }

    // Filter by date range
    if (from) {
      conditions.push(gte(appointments.scheduledAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(appointments.scheduledAt, new Date(to)));
    }

    // Filter by physician
    if (physicianId) {
      conditions.push(eq(appointments.physicianId, physicianId));
    }

    // Filter by status
    if (status) {
      conditions.push(eq(appointments.status, status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Main query with patient join
    const rows = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
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
        confirmedAt: appointments.confirmedAt,
        cancelledAt: appointments.cancelledAt,
        cancellationReason: appointments.cancellationReason,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(users, eq(appointments.physicianId, users.id))
      .where(whereClause)
      .orderBy(desc(appointments.scheduledAt))
      .limit(limit)
      .offset(offset);

    // Total count for pagination
    const [totalRow] = await db
      .select({ total: count() })
      .from(appointments)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: rows,
      total: totalRow?.total ?? 0,
    });
  } catch (err) {
    console.error("[appointments] GET error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch appointments" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────
//  POST: Create appointment
// ─────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const {
    patientId,
    physicianId,
    scheduledAt,
    duration,
    appointmentType,
    reason,
    notes,
  } = body as {
    patientId?: number;
    physicianId?: string;
    scheduledAt?: string;
    duration?: number;
    appointmentType?: string;
    reason?: string;
    notes?: string;
  };

  // Validation
  if (!patientId || !physicianId || !scheduledAt) {
    return NextResponse.json(
      { success: false, error: "patientId, physicianId, and scheduledAt are required" },
      { status: 400 },
    );
  }

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json(
      { success: false, error: "Invalid scheduledAt date" },
      { status: 400 },
    );
  }

  const durationMin = duration ?? 30;

  try {
    // ── Conflict check: overlapping appointments for the same physician ──
    const apptEnd = new Date(scheduledDate.getTime() + durationMin * 60_000);

    const conflicts = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.physicianId, physicianId),
          // Exclude cancelled / no_show
          sql`${appointments.status} NOT IN ('cancelled', 'no_show')`,
          // Overlap: existing.start < new.end AND existing.end > new.start
          sql`${appointments.scheduledAt} < ${apptEnd}`,
          sql`(${appointments.scheduledAt} + (${appointments.duration} || ' minutes')::interval) > ${scheduledDate}`,
        ),
      )
      .limit(1);

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Time conflict: the physician already has an appointment in this time slot",
          conflictingId: conflicts[0].id,
        },
        { status: 409 },
      );
    }

    // ── Insert ──
    const [created] = await db
      .insert(appointments)
      .values({
        patientId,
        physicianId,
        scheduledAt: scheduledDate,
        duration: durationMin,
        appointmentType: appointmentType ?? "consultation",
        reason: reason ?? null,
        notes: notes ?? null,
        bookedBy: "manual",
        bookedVia: "web",
      })
      .returning();

    // ── Audit ──
    void logAudit({
      actorId: auth.user.id,
      action: "encounter.create",
      resourceType: "patient",
      resourceId: created.id,
      patientId,
      metadata: {
        appointmentType: created.appointmentType,
        scheduledAt: created.scheduledAt.toISOString(),
        action: "appointment.create",
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error("[appointments] POST error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create appointment" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────
//  PATCH: Update appointment status
// ─────────────────────────────────────────────────────────────────
export async function PATCH(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { id, status, notes } = body as {
    id?: string;
    status?: string;
    notes?: string;
  };

  if (!id) {
    return NextResponse.json(
      { success: false, error: "id is required" },
      { status: 400 },
    );
  }

  try {
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    // Set confirmedAt / cancelledAt based on status transitions
    if (status === "confirmed") {
      updates.confirmedAt = new Date();
    } else if (status === "cancelled") {
      updates.cancelledAt = new Date();
    }

    const [updated] = await db
      .update(appointments)
      .set(updates)
      .where(eq(appointments.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }

    void logAudit({
      actorId: auth.user.id,
      action: "encounter.update",
      resourceType: "patient",
      resourceId: id,
      patientId: updated.patientId,
      metadata: {
        newStatus: status,
        action: "appointment.update",
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[appointments] PATCH error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update appointment" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────
//  DELETE: Cancel appointment (soft — sets status to "cancelled")
// ─────────────────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "id query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const [cancelled] = await db
      .update(appointments)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();

    if (!cancelled) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }

    void logAudit({
      actorId: auth.user.id,
      action: "encounter.update",
      resourceType: "patient",
      resourceId: id,
      patientId: cancelled.patientId,
      metadata: { action: "appointment.cancel" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[appointments] DELETE error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to cancel appointment" },
      { status: 500 },
    );
  }
}
