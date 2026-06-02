import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { db } from "@/db";
import { patientEvents } from "@/db/schema";
import { and, desc, eq, isNull, gte, lte, inArray } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/patient-events?patientId=X&category=Y&source=Z&limit=50&offset=0&from=&to=
 * Query patient events with optional filters.
 */
export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const patientId = parseInt(searchParams.get("patientId") ?? "0", 10);
  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const category = searchParams.get("category");
  const source = searchParams.get("source");
  const eventType = searchParams.get("eventType");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const conditions = [
      eq(patientEvents.patientId, patientId),
      isNull(patientEvents.deletedAt),
    ];

    if (category) {
      conditions.push(eq(patientEvents.category, category as any));
    }
    if (source) {
      conditions.push(eq(patientEvents.source, source));
    }
    if (eventType) {
      conditions.push(eq(patientEvents.eventType, eventType));
    }
    if (from) {
      conditions.push(gte(patientEvents.eventDate, new Date(from)));
    }
    if (to) {
      conditions.push(lte(patientEvents.eventDate, new Date(to)));
    }

    const events = await db
      .select()
      .from(patientEvents)
      .where(and(...conditions))
      .orderBy(desc(patientEvents.eventDate))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      events,
      count: events.length,
      hasMore: events.length === limit,
    });
  } catch (err) {
    console.error("[patient-events] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

/**
 * POST /api/patient-events
 * Record one or more patient events.
 * Body: { events: Array<NewPatientEvent> } or single event object
 */
export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const eventsToInsert = Array.isArray(body.events) ? body.events : [body];

    // Validate required fields
    for (const evt of eventsToInsert) {
      if (!evt.patientId || !evt.category || !evt.eventType || !evt.source || !evt.title) {
        return NextResponse.json(
          { error: "Each event requires: patientId, category, eventType, source, title" },
          { status: 400 }
        );
      }
    }

    // Add recordedById from session
    const enriched = eventsToInsert.map((evt: any) => ({
      ...evt,
      recordedById: evt.recordedById || auth.user.id,
      eventDate: evt.eventDate ? new Date(evt.eventDate) : new Date(),
    }));

    const inserted = await db.insert(patientEvents).values(enriched).returning();

    return NextResponse.json({
      success: true,
      count: inserted.length,
      events: inserted,
    });
  } catch (err) {
    console.error("[patient-events] POST error:", err);
    return NextResponse.json({ error: "Failed to record events" }, { status: 500 });
  }
}
