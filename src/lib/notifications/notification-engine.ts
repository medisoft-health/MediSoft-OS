import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { clinicalNotifications } from "@/db/schema";

/**
 * Clinical Notification Engine.
 *
 * CRUD operations + trigger functions that create notifications
 * from various clinical events.
 */

export interface NotificationInput {
  physicianId: string;
  patientId?: number;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface NotificationRow {
  id: string;
  physicianId: string;
  patientId: number | null;
  type: string;
  severity: string;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  read: boolean;
  dismissed: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  expiresAt: Date | null;
}

// ─────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────

export async function createNotification(input: NotificationInput): Promise<void> {
  await db.insert(clinicalNotifications).values({
    physicianId: input.physicianId,
    patientId: input.patientId ?? null,
    type: input.type,
    severity: input.severity,
    title: input.title,
    message: input.message,
    actionUrl: input.actionUrl ?? null,
    actionLabel: input.actionLabel ?? null,
    metadata: input.metadata ?? null,
    expiresAt: input.expiresAt ?? null,
  });
}

export async function getNotifications(
  physicianId: string,
  options?: { unreadOnly?: boolean; limit?: number; type?: string },
): Promise<NotificationRow[]> {
  const limit = options?.limit ?? 20;
  const conditions = [eq(clinicalNotifications.physicianId, physicianId), eq(clinicalNotifications.dismissed, false)];
  if (options?.unreadOnly) conditions.push(eq(clinicalNotifications.read, false));

  const rows = await db
    .select()
    .from(clinicalNotifications)
    .where(and(...conditions))
    .orderBy(desc(clinicalNotifications.createdAt))
    .limit(limit);

  return rows as NotificationRow[];
}

export async function getUnreadCount(physicianId: string): Promise<number> {
  const rows = await db
    .select({ id: clinicalNotifications.id })
    .from(clinicalNotifications)
    .where(and(
      eq(clinicalNotifications.physicianId, physicianId),
      eq(clinicalNotifications.read, false),
      eq(clinicalNotifications.dismissed, false),
    ));
  return rows.length;
}

export async function markAsRead(notificationId: string): Promise<void> {
  await db.update(clinicalNotifications)
    .set({ read: true })
    .where(eq(clinicalNotifications.id, notificationId));
}

export async function markAllAsRead(physicianId: string): Promise<void> {
  await db.update(clinicalNotifications)
    .set({ read: true })
    .where(and(eq(clinicalNotifications.physicianId, physicianId), eq(clinicalNotifications.read, false)));
}

export async function dismissNotification(notificationId: string): Promise<void> {
  await db.update(clinicalNotifications)
    .set({ dismissed: true })
    .where(eq(clinicalNotifications.id, notificationId));
}

// ─────────────────────────────────────────────────────────────────
// TRIGGER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

export async function triggerLabCriticalAlert(
  physicianId: string,
  patientId: number,
  labResultId: string,
  criticalTests: Array<{ testName: string; value: string; flag: string }>,
): Promise<void> {
  const testNames = criticalTests.map((t) => `${t.testName}: ${t.value}`).join(", ");
  await createNotification({
    physicianId,
    patientId,
    type: "lab_critical",
    severity: "critical",
    title: `قيم حرجة في تحاليل المريض`,
    message: `${criticalTests.length} نتائج حرجة: ${testNames}`,
    actionUrl: `/medilab/${labResultId}`,
    actionLabel: "عرض النتائج",
    metadata: { labResultId, criticalTests },
  });
}

export async function triggerFollowUpReminder(
  physicianId: string,
  patientId: number,
  followUpDate: Date,
  reason: string,
): Promise<void> {
  await createNotification({
    physicianId,
    patientId,
    type: "follow_up_due",
    severity: "medium",
    title: `موعد متابعة قادم`,
    message: `${reason} — التاريخ: ${followUpDate.toISOString().slice(0, 10)}`,
    actionUrl: `/patients/${patientId}`,
    actionLabel: "عرض المريض",
    metadata: { followUpDate: followUpDate.toISOString(), reason },
    expiresAt: followUpDate,
  });
}

export async function triggerRiskEscalation(
  physicianId: string,
  patientId: number,
  riskCategory: string,
  previousScore: number,
  newScore: number,
): Promise<void> {
  const severity = newScore >= 75 ? "high" as const : "medium" as const;
  await createNotification({
    physicianId,
    patientId,
    type: "risk_escalation",
    severity,
    title: `ارتفاع مخاطر: ${riskCategory}`,
    message: `تغيّر مؤشر ${riskCategory} من ${previousScore} إلى ${newScore}/100`,
    actionUrl: `/patients/${patientId}`,
    actionLabel: "عرض التقييم",
    metadata: { riskCategory, previousScore, newScore },
  });
}

export async function triggerNewLabResult(
  physicianId: string,
  patientId: number,
  labResultId: string,
  panelName: string,
): Promise<void> {
  await createNotification({
    physicianId,
    patientId,
    type: "new_result",
    severity: "low",
    title: `نتائج تحاليل جديدة`,
    message: `تحليل ${panelName} جاهز للمراجعة`,
    actionUrl: `/medilab/${labResultId}`,
    actionLabel: "عرض النتائج",
    metadata: { labResultId, panelName },
  });
}
