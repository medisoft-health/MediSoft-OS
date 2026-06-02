import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  generatePatient360Summary,
  getPatientTrends,
  compareLabResults,
  predictPatientRisks,
  generateSmartAlerts,
  generateCumulativeInsights,
} from "@/lib/patient-360";

export const runtime = "nodejs";

/**
 * Patient 360° Intelligence API
 *
 * GET  /api/patient-360?patientId=X&action=summary|trends|comparison|risk|alerts|insights
 * POST /api/patient-360 — For patient self-reporting (food, exercise, symptoms, mood)
 */

export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const { searchParams } = req.nextUrl;
  const patientId = Number(searchParams.get("patientId"));
  const action = searchParams.get("action") ?? "summary";

  if (!patientId || isNaN(patientId)) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  try {
    switch (action) {
      case "summary": {
        const summary = await generatePatient360Summary(patientId);
        if (!summary) {
          return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: summary });
      }

      case "trends": {
        const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
        const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;
        const categories = searchParams.get("categories")?.split(",") ?? undefined;
        const trends = await getPatientTrends(patientId, { from, to, categories });
        return NextResponse.json({ success: true, data: trends });
      }

      case "comparison": {
        const currentLabId = searchParams.get("currentLabId") ?? undefined;
        const previousLabId = searchParams.get("previousLabId") ?? undefined;
        const comparisons = await compareLabResults(patientId, currentLabId, previousLabId);
        return NextResponse.json({ success: true, data: comparisons });
      }

      case "risk": {
        const risks = await predictPatientRisks(patientId);
        if (!risks) {
          return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: risks });
      }

      case "alerts": {
        const alerts = await generateSmartAlerts(patientId);
        return NextResponse.json({ success: true, data: alerts });
      }

      case "insights": {
        const insights = await generateCumulativeInsights(patientId);
        return NextResponse.json({ success: true, data: insights });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid: summary, trends, comparison, risk, alerts, insights` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error(`[Patient360 API] Error (action=${action}):`, err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { action, patientId, data } = body;

    if (!patientId || !action) {
      return NextResponse.json(
        { error: "patientId and action are required" },
        { status: 400 }
      );
    }

    // Patient self-reporting actions
    switch (action) {
      case "report_symptom": {
        const { recordPatientEvent } = await import("@/lib/patient-events-recorder");
        await recordPatientEvent({
          patientId,
          category: "clinical",
          eventType: "symptom_report",
          source: "patient-portal",
          title: `أعراض: ${data.symptom}`,
          titleEn: `Symptoms: ${data.symptomEn || data.symptom}`,
          description: data.description,
          data: {
            symptom: data.symptom,
            severity: data.severity,
            duration: data.duration,
            location: data.location,
            selfReported: true,
          },
          recordedById: auth.user.id,
        });
        return NextResponse.json({ success: true, message: "تم تسجيل الأعراض" });
      }

      case "report_mood": {
        const { recordPatientEvent } = await import("@/lib/patient-events-recorder");
        await recordPatientEvent({
          patientId,
          category: "wellness",
          eventType: "mood_report",
          source: "patient-portal",
          title: `الحالة المزاجية: ${data.mood}`,
          titleEn: `Mood: ${data.moodEn || data.mood}`,
          description: data.notes,
          data: {
            mood: data.mood,
            score: data.score,
            sleepQuality: data.sleepQuality,
            stressLevel: data.stressLevel,
            selfReported: true,
          },
          numericValue: data.score,
          numericUnit: "mood_score",
          recordedById: auth.user.id,
        });
        return NextResponse.json({ success: true, message: "تم تسجيل الحالة المزاجية" });
      }

      case "report_food": {
        const { recordPatientEvent } = await import("@/lib/patient-events-recorder");
        await recordPatientEvent({
          patientId,
          category: "nutrition",
          eventType: "food_log",
          source: "patient-portal",
          title: `وجبة: ${data.mealType} — ${data.description}`,
          titleEn: `Meal: ${data.mealTypeEn || data.mealType} — ${data.descriptionEn || data.description}`,
          description: data.notes,
          data: {
            mealType: data.mealType,
            description: data.description,
            calories: data.calories,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
            water: data.water,
            fasting: data.fasting,
            selfReported: true,
          },
          numericValue: data.calories,
          numericUnit: "kcal",
          recordedById: auth.user.id,
        });
        return NextResponse.json({ success: true, message: "تم تسجيل الوجبة" });
      }

      case "report_exercise": {
        const { recordPatientEvent } = await import("@/lib/patient-events-recorder");
        await recordPatientEvent({
          patientId,
          category: "exercise",
          eventType: "workout",
          source: "patient-portal",
          title: `تمرين: ${data.exerciseType}`,
          titleEn: `Exercise: ${data.exerciseTypeEn || data.exerciseType}`,
          description: data.notes,
          data: {
            exerciseType: data.exerciseType,
            duration: data.duration,
            intensity: data.intensity,
            caloriesBurned: data.caloriesBurned,
            heartRateAvg: data.heartRateAvg,
            selfReported: true,
          },
          numericValue: data.duration,
          numericUnit: "minutes",
          recordedById: auth.user.id,
        });
        return NextResponse.json({ success: true, message: "تم تسجيل التمرين" });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("[Patient360 API] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
