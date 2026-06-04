import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { db } from "@/db";
import { patients, patientVoiceRecords } from "@/db/schema";
import { eq } from "drizzle-orm";
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
 * GET  /api/patient-360?patientId=X&action=summary|trends|comparison|risk|alerts|insights|profile
 * POST /api/patient-360 — For patient self-reporting, profile updates, voice intake
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

      case "profile": {
        // Fetch full patient profile for the Profile Editor
        const [patient] = await db
          .select()
          .from(patients)
          .where(eq(patients.id, patientId))
          .limit(1);

        if (!patient) {
          return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }

        // Calculate profile completeness
        const fields = [
          patient.firstName, patient.lastName, patient.dateOfBirth, patient.sex,
          patient.phone, patient.email, patient.bloodType,
          patient.nationality, patient.saudiId, patient.maritalStatus,
          patient.occupation, patient.photoUrl,
          patient.address && Object.keys(patient.address as object).length > 0 ? "yes" : null,
          patient.emergencyContact && Object.keys(patient.emergencyContact as object).length > 0 ? "yes" : null,
          patient.allergies && (patient.allergies as unknown[]).length > 0 ? "yes" : null,
          patient.chronicConditions && (patient.chronicConditions as unknown[]).length > 0 ? "yes" : null,
          patient.currentMedications && (patient.currentMedications as unknown[]).length > 0 ? "yes" : null,
          patient.surgicalHistory && (patient.surgicalHistory as unknown[]).length > 0 ? "yes" : null,
          patient.insuranceProvider,
          patient.familyHistory,
          patient.socialHistory,
        ];
        const filled = fields.filter((f) => f && f !== "unknown" && f !== "").length;
        const completeness = Math.round((filled / fields.length) * 100);

        return NextResponse.json({
          success: true,
          profile: {
            ...patient,
            profileCompleteness: completeness,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid: summary, trends, comparison, risk, alerts, insights, profile` },
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

    switch (action) {
      // ─── Profile Update ───────────────────────────────────────
      case "update_profile": {
        // Update patient record with provided fields
        const updateData: Record<string, unknown> = {};

        // Map flat fields
        const directFields = [
          "firstName", "lastName", "firstNameAr", "lastNameAr",
          "middleName", "middleNameAr",
          "dateOfBirth", "sex", "bloodType", "phone", "email",
          "nationality", "saudiId", "maritalStatus", "occupation", "occupationAr",
          "insuranceProvider", "insuranceId",
          "photoUrl", "familyHistory", "socialHistory", "medicalHistory",
          "secondaryPhone", "preferredLanguage",
          "city", "region", "country",
          "smokingStatus", "alcoholStatus", "exerciseFrequency", "dietType",
          "disabilityNotes",
        ];

        for (const field of directFields) {
          if (data[field] !== undefined) {
            updateData[field] = data[field];
          }
        }

        // Map JSON fields
        const jsonFields = [
          "address", "emergencyContact", "allergies", "chronicConditions",
          "currentMedications", "surgicalHistory", "immunizations",
        ];

        for (const field of jsonFields) {
          if (data[field] !== undefined) {
            updateData[field] = data[field];
          }
        }

        if (Object.keys(updateData).length === 0) {
          return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        updateData.updatedAt = new Date();

        await db
          .update(patients)
          .set(updateData)
          .where(eq(patients.id, patientId));

        // Log the update
        const { recordPatientEvent } = await import("@/lib/patient-events-recorder");
        await recordPatientEvent({
          patientId,
          category: "clinical",
          eventType: "profile_updated",
          source: "medi360",
          title: "تحديث الملف الشامل",
          titleEn: "Profile Updated",
          description: `Updated fields: ${Object.keys(updateData).filter(k => k !== "updatedAt").join(", ")}`,
          data: { updatedFields: Object.keys(updateData).filter(k => k !== "updatedAt") },
          recordedById: auth.user.id,
        });

        return NextResponse.json({ success: true, message: "تم تحديث الملف بنجاح" });
      }

      // ─── Voice Intake Save ────────────────────────────────────
      case "save_voice_intake": {
        // Save extracted data from voice intake to patient profile
        const extractedData = data;

        const updateData: Record<string, unknown> = { updatedAt: new Date() };

        // Merge allergies
        if (extractedData.allergies && extractedData.allergies.length > 0) {
          const [existing] = await db.select({ allergies: patients.allergies }).from(patients).where(eq(patients.id, patientId));
          const currentAllergies = (existing?.allergies as unknown[] || []);
          const merged = [...currentAllergies, ...extractedData.allergies];
          // Deduplicate by substance
          const unique = merged.filter((a: any, i: number, arr: any[]) =>
            arr.findIndex((b: any) => b.substance === a.substance) === i
          );
          updateData.allergies = unique;
        }

        // Merge chronic conditions
        if (extractedData.chronicConditions && extractedData.chronicConditions.length > 0) {
          const [existing] = await db.select({ chronicConditions: patients.chronicConditions }).from(patients).where(eq(patients.id, patientId));
          const current = (existing?.chronicConditions as unknown[] || []);
          const merged = [...current, ...extractedData.chronicConditions];
          const unique = merged.filter((a: any, i: number, arr: any[]) =>
            arr.findIndex((b: any) => b.description === a.description) === i
          );
          updateData.chronicConditions = unique;
        }

        // Merge medications
        if (extractedData.currentMedications && extractedData.currentMedications.length > 0) {
          const [existing] = await db.select({ currentMedications: patients.currentMedications }).from(patients).where(eq(patients.id, patientId));
          const current = (existing?.currentMedications as unknown[] || []);
          const merged = [...current, ...extractedData.currentMedications];
          const unique = merged.filter((a: any, i: number, arr: any[]) =>
            arr.findIndex((b: any) => b.name === a.name) === i
          );
          updateData.currentMedications = unique;
        }

        // Merge surgical history
        if (extractedData.surgicalHistory && extractedData.surgicalHistory.length > 0) {
          const [existing] = await db.select({ surgicalHistory: patients.surgicalHistory }).from(patients).where(eq(patients.id, patientId));
          const current = (existing?.surgicalHistory as unknown[] || []);
          const merged = [...current, ...extractedData.surgicalHistory];
          updateData.surgicalHistory = merged;
        }

        // Family history (append)
        if (extractedData.familyHistory) {
          const [existing] = await db.select({ familyHistory: patients.familyHistory }).from(patients).where(eq(patients.id, patientId));
          const current = existing?.familyHistory || "";
          updateData.familyHistory = current ? `${current}\n${extractedData.familyHistory}` : extractedData.familyHistory;
        }

        // Social history (append)
        if (extractedData.socialHistory) {
          const [existing] = await db.select({ socialHistory: patients.socialHistory }).from(patients).where(eq(patients.id, patientId));
          const current = existing?.socialHistory || "";
          updateData.socialHistory = current ? `${current}\n${extractedData.socialHistory}` : extractedData.socialHistory;
        }

        // Save to database
        if (Object.keys(updateData).length > 1) {
          await db.update(patients).set(updateData).where(eq(patients.id, patientId));
        }

        // Also save the voice record reference
        if (extractedData.transcript) {
          await db.insert(patientVoiceRecords).values({
            patientId,
            recordedById: auth.user.id,
            purpose: "intake",
            title: "تسجيل صوتي — استقبال المريض",
            durationMs: (extractedData.durationSeconds || 0) * 1000,
            transcript: extractedData.transcript,
            transcriptLanguage: extractedData.language || "ar",
            aiExtractedData: extractedData,
            aiSummary: extractedData.summary || null,
            aiProcessedAt: new Date(),
            status: "completed",
            appliedToProfile: true,
            appliedAt: new Date(),
          });
        }

        // Log the event
        const { recordPatientEvent } = await import("@/lib/patient-events-recorder");
        await recordPatientEvent({
          patientId,
          category: "clinical",
          eventType: "voice_intake_completed",
          source: "medi360",
          title: "تسجيل صوتي — استقبال المريض",
          titleEn: "Voice Intake Completed",
          description: `Extracted: ${Object.keys(extractedData).filter(k => k !== "transcript" && k !== "durationSeconds").join(", ")}`,
          data: { extractedFields: Object.keys(extractedData) },
          recordedById: auth.user.id,
        });

        return NextResponse.json({ success: true, message: "تم حفظ البيانات المستخرجة من التسجيل الصوتي" });
      }

      // ─── Self-Reporting Actions ───────────────────────────────
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
