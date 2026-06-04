import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientReadings, patientAlerts } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { requireSessionApi } from "@/lib/auth-helpers";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────
//  Alert Thresholds Configuration
// ─────────────────────────────────────────────────────────────────
const ALERT_THRESHOLDS: Record<string, { critical_high?: number; high?: number; low?: number; critical_low?: number }> = {
  blood_pressure_systolic: { critical_high: 180, high: 140, low: 90, critical_low: 70 },
  blood_pressure_diastolic: { critical_high: 120, high: 90, low: 60, critical_low: 40 },
  heart_rate: { critical_high: 150, high: 100, low: 60, critical_low: 40 },
  temperature: { critical_high: 39.5, high: 37.8, low: 36.0, critical_low: 35.0 },
  spo2: { critical_low: 90, low: 95 },
  blood_sugar: { critical_high: 300, high: 126, low: 70, critical_low: 54 },
  weight: {},
};

// ─────────────────────────────────────────────────────────────────
//  POST: Record a new reading
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const {
      patientId,
      readingType,
      valuePrimary,
      valueSecondary,
      unit,
      context,
      source,
      deviceName,
      deviceId,
      notes,
      recordedAt,
    } = body;

    if (!patientId || !readingType || valuePrimary === undefined) {
      return NextResponse.json(
        { error: "patientId, readingType, and valuePrimary are required" },
        { status: 400 }
      );
    }

    // Evaluate if abnormal
    const isAbnormal = checkIfAbnormal(readingType, Number(valuePrimary), valueSecondary ? Number(valueSecondary) : null);

    // Insert the reading
    const [reading] = await db
      .insert(patientReadings)
      .values({
        patientId: Number(patientId),
        recordedById: auth.user.id,
        readingType,
        valuePrimary: String(valuePrimary),
        valueSecondary: valueSecondary ? String(valueSecondary) : null,
        unit: unit || getDefaultUnit(readingType),
        context: context || null,
        source: source || "manual",
        deviceName: deviceName || null,
        deviceId: deviceId || null,
        notes: notes || null,
        isAbnormal,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      })
      .returning();

    // Generate alerts if abnormal
    const alerts: Array<{ severity: string; title: string; titleAr: string; message: string; messageAr: string }> = [];

    if (isAbnormal) {
      const alertData = generateAlertData(readingType, Number(valuePrimary), valueSecondary ? Number(valueSecondary) : null);
      if (alertData) {
        alerts.push(alertData);
        // Insert alert
        await db.insert(patientAlerts).values({
          patientId: Number(patientId),
          alertType: "abnormal_reading",
          severity: alertData.severity,
          title: alertData.title,
          titleAr: alertData.titleAr,
          message: alertData.message,
          messageAr: alertData.messageAr,
          notifyPatient: true,
          notifyPhysician: alertData.severity === "critical",
          readingId: reading.id,
          metadata: { readingType, value: valuePrimary, unit },
        });

        // Mark reading as alert sent
        await db.update(patientReadings)
          .set({ alertSent: true, alertSentAt: new Date() })
          .where(eq(patientReadings.id, reading.id));
      }
    }

    return NextResponse.json({
      reading,
      alerts: alerts.length > 0 ? alerts : null,
      message: "تم تسجيل القراءة بنجاح",
    });
  } catch (error) {
    console.error("Error recording reading:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────
//  GET: Fetch readings for a patient
// ─────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const type = searchParams.get("type");
  const period = searchParams.get("period") || "30d";
  const action = searchParams.get("action") || "readings";

  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  try {
    if (action === "alerts") {
      // Fetch active (unresolved) alerts
      const alerts = await db
        .select()
        .from(patientAlerts)
        .where(
          and(
            eq(patientAlerts.patientId, Number(patientId)),
            eq(patientAlerts.resolved, false)
          )
        )
        .orderBy(desc(patientAlerts.createdAt))
        .limit(50);

      return NextResponse.json({ alerts });
    }

    if (action === "latest") {
      // Fetch latest reading of each type
      const types = ["blood_pressure", "heart_rate", "temperature", "spo2", "blood_sugar", "weight"];
      const latest: Record<string, unknown> = {};

      for (const t of types) {
        const [reading] = await db
          .select()
          .from(patientReadings)
          .where(
            and(
              eq(patientReadings.patientId, Number(patientId)),
              eq(patientReadings.readingType, t)
            )
          )
          .orderBy(desc(patientReadings.recordedAt))
          .limit(1);

        if (reading) {
          latest[t] = reading;
        }
      }

      return NextResponse.json({ latest });
    }

    // Default: fetch readings with optional type filter and period
    const periodDays = parsePeriod(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const conditions = [
      eq(patientReadings.patientId, Number(patientId)),
      gte(patientReadings.recordedAt, startDate),
    ];

    if (type) {
      conditions.push(eq(patientReadings.readingType, type));
    }

    const readings = await db
      .select()
      .from(patientReadings)
      .where(and(...conditions))
      .orderBy(desc(patientReadings.recordedAt))
      .limit(500);

    return NextResponse.json({ readings, period, count: readings.length });
  } catch (error) {
    console.error("Error fetching readings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────
//  Helper Functions
// ─────────────────────────────────────────────────────────────────
function getDefaultUnit(readingType: string): string {
  const units: Record<string, string> = {
    blood_pressure: "mmHg",
    heart_rate: "bpm",
    temperature: "°C",
    spo2: "%",
    blood_sugar: "mg/dL",
    weight: "kg",
    steps: "steps",
    sleep: "hours",
  };
  return units[readingType] || "";
}

function parsePeriod(period: string): number {
  const match = period.match(/^(\d+)([dwmy])$/);
  if (!match) return 30;
  const [, num, unit] = match;
  const n = parseInt(num);
  switch (unit) {
    case "d": return n;
    case "w": return n * 7;
    case "m": return n * 30;
    case "y": return n * 365;
    default: return 30;
  }
}

function checkIfAbnormal(readingType: string, value: number, secondary: number | null): boolean {
  // For blood pressure, check systolic (primary) and diastolic (secondary)
  if (readingType === "blood_pressure") {
    const sysThresh = ALERT_THRESHOLDS["blood_pressure_systolic"];
    const diaThresh = ALERT_THRESHOLDS["blood_pressure_diastolic"];
    const sysAbnormal = value > (sysThresh.high ?? 999) || value < (sysThresh.low ?? 0);
    const diaAbnormal = secondary ? (secondary > (diaThresh.high ?? 999) || secondary < (diaThresh.low ?? 0)) : false;
    return sysAbnormal || diaAbnormal;
  }

  const thresh = ALERT_THRESHOLDS[readingType];
  if (!thresh) return false;

  if (thresh.critical_high && value >= thresh.critical_high) return true;
  if (thresh.high && value >= thresh.high) return true;
  if (thresh.critical_low && value <= thresh.critical_low) return true;
  if (thresh.low && value <= thresh.low) return true;

  return false;
}

function generateAlertData(readingType: string, value: number, secondary: number | null) {
  const typeLabels: Record<string, { en: string; ar: string }> = {
    blood_pressure: { en: "Blood Pressure", ar: "ضغط الدم" },
    heart_rate: { en: "Heart Rate", ar: "معدل ضربات القلب" },
    temperature: { en: "Temperature", ar: "درجة الحرارة" },
    spo2: { en: "Oxygen Saturation", ar: "تشبع الأكسجين" },
    blood_sugar: { en: "Blood Sugar", ar: "سكر الدم" },
    weight: { en: "Weight", ar: "الوزن" },
  };

  const label = typeLabels[readingType] || { en: readingType, ar: readingType };
  const unit = getDefaultUnit(readingType);
  const displayValue = readingType === "blood_pressure" && secondary
    ? `${value}/${secondary} ${unit}`
    : `${value} ${unit}`;

  // Determine severity
  let severity = "warning";
  if (readingType === "blood_pressure") {
    const sysThresh = ALERT_THRESHOLDS["blood_pressure_systolic"];
    if (value >= (sysThresh.critical_high ?? 999) || value <= (sysThresh.critical_low ?? 0)) {
      severity = "critical";
    }
  } else {
    const thresh = ALERT_THRESHOLDS[readingType];
    if (thresh) {
      if ((thresh.critical_high && value >= thresh.critical_high) || (thresh.critical_low && value <= thresh.critical_low)) {
        severity = "critical";
      }
    }
  }

  return {
    severity,
    title: `Abnormal ${label.en}: ${displayValue}`,
    titleAr: `قراءة غير طبيعية — ${label.ar}: ${displayValue}`,
    message: `Patient recorded an abnormal ${label.en} reading of ${displayValue}. Immediate attention may be required.`,
    messageAr: `سجل المريض قراءة غير طبيعية لـ${label.ar} بقيمة ${displayValue}. قد يتطلب الأمر تدخلاً فورياً.`,
  };
}
