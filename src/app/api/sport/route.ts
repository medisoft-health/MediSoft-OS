import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  sportFoodLogs,
  sportActivities,
  sportBioAgeRecords,
  sportPrograms,
  sportMedicalConsents,
} from "@/db/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  calculateBioAge,
  type BioAgeInputs,
} from "@/lib/sport/bio-age-calculator";
import {
  searchFood,
  getFoodByCategory,
  calculateNutrition,
  FOOD_DATABASE,
  type FoodCategory,
} from "@/lib/sport/food-database";
import {
  EXERCISE_LIBRARY,
  PROGRAM_TEMPLATES,
  searchExercises,
  getExercisesByMuscleGroup,
  type MuscleGroup,
} from "@/lib/sport/exercise-library";
import {
  generateCoachPlan,
  type CoachInput,
} from "@/lib/sport/personal-coach";
import { searchWada, WADA_SUBSTANCES } from "@/lib/sport/wada-database";

/**
 * MediSport Standalone API — Phase 4 (DB-backed persistence)
 *
 * Reference data actions (food/exercise/wada catalogs) remain stateless.
 * User-data actions (food-log, activity-log, bio-age save, program-save,
 * medical-bridge) now persist to PostgreSQL keyed on the authenticated user.
 *
 * GET reference: food-search, food-category, food-all, food-nutrition,
 *                exercise-search, program-templates, wada-search, lessons
 * GET user data: my-food-logs, my-activities, my-bio-age, my-programs, my-consent
 * POST: bio-age, food-log, activity-log, coach-plan, program-save,
 *       medical-bridge-link, medical-bridge-consent
 */

const todayStr = () => new Date().toISOString().slice(0, 10);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "food-search": {
        const query = searchParams.get("q") || "";
        const locale = (searchParams.get("locale") || "en") as "ar" | "en";
        const results = searchFood(query, locale);
        return NextResponse.json({ success: true, data: results, count: results.length });
      }

      case "food-category": {
        const category = searchParams.get("category") as FoodCategory;
        if (!category) {
          return NextResponse.json(
            { success: false, error: "Missing category parameter" },
            { status: 400 }
          );
        }
        const results = getFoodByCategory(category);
        return NextResponse.json({ success: true, data: results, count: results.length });
      }

      case "food-all": {
        return NextResponse.json({ success: true, data: FOOD_DATABASE, count: FOOD_DATABASE.length });
      }

      case "food-nutrition": {
        const foodId = searchParams.get("id");
        const grams = Number(searchParams.get("grams") || "100");
        const food = FOOD_DATABASE.find((f) => f.id === foodId);
        if (!food) {
          return NextResponse.json({ success: false, error: "Food item not found" }, { status: 404 });
        }
        const nutrition = calculateNutrition(food, grams);
        return NextResponse.json({ success: true, data: { food, grams, nutrition } });
      }

      case "exercise-search": {
        const query = searchParams.get("q") || "";
        const locale = (searchParams.get("locale") || "en") as "ar" | "en";
        const group = searchParams.get("group") as MuscleGroup | null;
        let results = query ? searchExercises(query, locale) : EXERCISE_LIBRARY;
        if (group) results = getExercisesByMuscleGroup(group);
        return NextResponse.json({ success: true, data: results, count: results.length });
      }

      case "program-templates": {
        return NextResponse.json({ success: true, data: PROGRAM_TEMPLATES, count: PROGRAM_TEMPLATES.length });
      }

      case "wada-search": {
        const query = searchParams.get("q") || "";
        const results = query ? searchWada(query) : WADA_SUBSTANCES;
        return NextResponse.json({ success: true, data: results, count: results.length });
      }

      case "lessons": {
        return NextResponse.json({
          success: true,
          data: {
            categories: ["nutrition", "training", "recovery", "mindset", "injury_prevention"],
            totalLessons: 8,
          },
        });
      }

      // ── User-scoped reads ─────────────────────────────────────
      case "my-food-logs": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const date = searchParams.get("date") || todayStr();
        const rows = await db
          .select()
          .from(sportFoodLogs)
          .where(and(eq(sportFoodLogs.userId, auth.user.id), eq(sportFoodLogs.logDate, date)))
          .orderBy(desc(sportFoodLogs.createdAt));
        return NextResponse.json({ success: true, data: rows, count: rows.length });
      }

      case "my-activities": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const rows = await db
          .select()
          .from(sportActivities)
          .where(eq(sportActivities.userId, auth.user.id))
          .orderBy(desc(sportActivities.startedAt))
          .limit(50);
        return NextResponse.json({ success: true, data: rows, count: rows.length });
      }

      case "my-bio-age": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const rows = await db
          .select()
          .from(sportBioAgeRecords)
          .where(eq(sportBioAgeRecords.userId, auth.user.id))
          .orderBy(desc(sportBioAgeRecords.createdAt))
          .limit(20);
        return NextResponse.json({ success: true, data: rows, count: rows.length });
      }

      case "my-programs": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const rows = await db
          .select()
          .from(sportPrograms)
          .where(eq(sportPrograms.coachId, auth.user.id))
          .orderBy(desc(sportPrograms.updatedAt));
        return NextResponse.json({ success: true, data: rows, count: rows.length });
      }

      case "my-consent": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const rows = await db
          .select()
          .from(sportMedicalConsents)
          .where(eq(sportMedicalConsents.userId, auth.user.id))
          .limit(1);
        return NextResponse.json({ success: true, data: rows[0] || null });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              "Unknown action. Available GET: food-search, food-category, food-all, food-nutrition, exercise-search, program-templates, wada-search, lessons, my-food-logs, my-activities, my-bio-age, my-programs, my-consent",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[MediSport API] GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "bio-age": {
        const inputs = body.inputs as BioAgeInputs;
        if (!inputs) {
          return NextResponse.json({ success: false, error: "Missing inputs object" }, { status: 400 });
        }
        const requiredFields: (keyof BioAgeInputs)[] = [
          "chronologicalAge", "sex", "height", "weight",
          "bodyFatPercentage", "muscleMass", "waistCircumference",
          "restingHeartRate", "systolicBP", "diastolicBP", "vo2Max",
          "fastingGlucose", "hba1c", "totalCholesterol",
          "sleepHours", "exerciseMinutesPerWeek",
        ];
        for (const field of requiredFields) {
          if (inputs[field] === undefined || inputs[field] === null) {
            return NextResponse.json({ success: false, error: `Missing required field: ${field}` }, { status: 400 });
          }
        }
        const result = calculateBioAge(inputs);

        // Persist if authenticated (anonymous calc still works)
        const auth = await requireSessionApi();
        if (!("response" in auth)) {
          try {
            const [saved] = await db
              .insert(sportBioAgeRecords)
              .values({
                userId: auth.user.id,
                chronologicalAge: String(inputs.chronologicalAge),
                biologicalAge: String(result.biologicalAge),
                ageDelta: String(result.ageDifference),
                percentile: result.percentile ?? null,
                classification: result.category ?? null,
                inputs: inputs as unknown as object,
                domainScores: (result.breakdown ?? null) as unknown as object,
                recommendations: (result.recommendations ?? null) as unknown as object,
              })
              .returning({ id: sportBioAgeRecords.id });
            return NextResponse.json({ success: true, data: result, recordId: saved?.id, persisted: true });
          } catch (e) {
            console.error("[MediSport] bio-age persist failed:", e);
          }
        }
        return NextResponse.json({ success: true, data: result, persisted: false });
      }

      case "food-log": {
        const { foodId, grams, mealType, date } = body;
        if (!foodId || !grams || !mealType) {
          return NextResponse.json(
            { success: false, error: "Missing required fields: foodId, grams, mealType" },
            { status: 400 }
          );
        }
        const food = FOOD_DATABASE.find((f) => f.id === foodId);
        if (!food) {
          return NextResponse.json({ success: false, error: "Food item not found" }, { status: 404 });
        }
        const nutrition = calculateNutrition(food, grams);

        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;

        const [saved] = await db
          .insert(sportFoodLogs)
          .values({
            userId: auth.user.id,
            logDate: date || todayStr(),
            mealType,
            foodId,
            foodNameAr: food.nameAr ?? null,
            foodNameEn: food.nameEn ?? null,
            grams: String(grams),
            calories: String(nutrition.calories),
            protein: String(nutrition.protein),
            carbs: String(nutrition.carbs),
            fat: String(nutrition.fat),
          })
          .returning();

        return NextResponse.json({ success: true, data: saved, persisted: true });
      }

      case "activity-log": {
        const { type, duration, distance, calories, route, avgPace, avgHeartRate, startedAt } = body;
        if (!type || !duration) {
          return NextResponse.json(
            { success: false, error: "Missing required fields: type, duration" },
            { status: 400 }
          );
        }
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;

        const [saved] = await db
          .insert(sportActivities)
          .values({
            userId: auth.user.id,
            activityType: type,
            startedAt: startedAt ? new Date(startedAt) : new Date(),
            durationSec: Number(duration),
            distanceMeters: String(distance || 0),
            caloriesBurned: String(calories || 0),
            avgPace: avgPace != null ? String(avgPace) : null,
            avgHeartRate: avgHeartRate != null ? Number(avgHeartRate) : null,
            routeGeojson: (route ?? null) as unknown as object,
          })
          .returning();

        return NextResponse.json({ success: true, data: saved, persisted: true });
      }

      case "coach-plan": {
        const input = body.input as CoachInput;
        if (!input || !input.sex || !input.height || !input.weight || !input.age) {
          return NextResponse.json({ success: false, error: "Missing required coach input fields" }, { status: 400 });
        }
        const plan = generateCoachPlan(input);
        return NextResponse.json({ success: true, data: plan });
      }

      case "program-save": {
        const { name, nameEn, exercises, goal, durationWeeks, daysPerWeek, assignedTraineeId, status } = body;
        if (!name || !Array.isArray(exercises) || exercises.length === 0) {
          return NextResponse.json(
            { success: false, error: "Missing required fields: name, exercises[]" },
            { status: 400 }
          );
        }
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;

        const [saved] = await db
          .insert(sportPrograms)
          .values({
            coachId: auth.user.id,
            assignedTraineeId: assignedTraineeId || null,
            nameAr: name,
            nameEn: nameEn || null,
            goal: goal || null,
            durationWeeks: Number(durationWeeks) || 4,
            daysPerWeek: Number(daysPerWeek) || 3,
            structure: { exercises } as unknown as object,
            status: status || "draft",
          })
          .returning();

        return NextResponse.json({ success: true, data: saved, persisted: true });
      }

      case "medical-bridge-link": {
        const { mrn, consents } = body;
        if (!mrn) {
          return NextResponse.json({ success: false, error: "Missing required field: mrn" }, { status: 400 });
        }
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;

        const c = consents || {};
        const values = {
          userId: auth.user.id,
          mrn,
          shareLabResults: !!c.labResults,
          shareVitals: !!c.vitals,
          shareBodyComposition: !!c.bodyComposition,
          shareMedicalHistory: !!c.medicalHistory,
          shareClinicalNotes: !!c.clinicalNotes,
          consentGivenAt: new Date(),
          revokedAt: null,
        };

        const [saved] = await db
          .insert(sportMedicalConsents)
          .values(values)
          .onConflictDoUpdate({
            target: sportMedicalConsents.userId,
            set: { ...values, updatedAt: new Date() },
          })
          .returning();

        return NextResponse.json({ success: true, data: saved, persisted: true });
      }

      case "medical-bridge-consent": {
        const { consents } = body;
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;

        const c = consents || {};
        const [saved] = await db
          .update(sportMedicalConsents)
          .set({
            shareLabResults: !!c.labResults,
            shareVitals: !!c.vitals,
            shareBodyComposition: !!c.bodyComposition,
            shareMedicalHistory: !!c.medicalHistory,
            shareClinicalNotes: !!c.clinicalNotes,
            updatedAt: new Date(),
          })
          .where(eq(sportMedicalConsents.userId, auth.user.id))
          .returning();

        return NextResponse.json({ success: true, data: saved || null, persisted: !!saved });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              "Unknown action. Available POST: bio-age, food-log, activity-log, coach-plan, program-save, medical-bridge-link, medical-bridge-consent",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[MediSport API] POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
