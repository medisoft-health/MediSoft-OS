import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  sportFoodLogs,
  sportActivities,
  sportBioAgeRecords,
  sportPrograms,
  sportMedicalConsents,
  sportCoachClients,
  sportProfiles,
  sportBodyMeasurements,
  sportLabResults,
  sportNotifications,
  users,
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

      // --- Coach views their trainees ---
      case "my-clients": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const rows = await db
          .select({
            linkId: sportCoachClients.id,
            status: sportCoachClients.status,
            notes: sportCoachClients.notes,
            createdAt: sportCoachClients.createdAt,
            traineeId: users.id,
            traineeName: users.name,
            traineeEmail: users.email,
          })
          .from(sportCoachClients)
          .innerJoin(users, eq(users.id, sportCoachClients.traineeId))
          .where(eq(sportCoachClients.coachId, auth.user.id))
          .orderBy(desc(sportCoachClients.createdAt));
        return NextResponse.json({ success: true, data: rows });
      }

      // --- Coach views ONE trainee's real progress snapshot (Phase 6) ---
      case "client-progress": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const traineeId = searchParams.get("traineeId") || "";
        if (!traineeId) {
          return NextResponse.json({ success: false, error: "Missing traineeId" }, { status: 400 });
        }
        // Authorization: ensure this coach is actively linked to the trainee.
        const [link] = await db
          .select({ id: sportCoachClients.id })
          .from(sportCoachClients)
          .where(
            and(
              eq(sportCoachClients.coachId, auth.user.id),
              eq(sportCoachClients.traineeId, traineeId),
              eq(sportCoachClients.status, "active")
            )
          )
          .limit(1);
        if (!link) {
          return NextResponse.json({ success: false, error: "not_linked" }, { status: 403 });
        }
        // Latest body measurement
        const [body0] = await db
          .select()
          .from(sportBodyMeasurements)
          .where(eq(sportBodyMeasurements.userId, traineeId))
          .orderBy(desc(sportBodyMeasurements.measuredAt))
          .limit(1);
        // Latest bio-age record
        const [bio0] = await db
          .select()
          .from(sportBioAgeRecords)
          .where(eq(sportBioAgeRecords.userId, traineeId))
          .orderBy(desc(sportBioAgeRecords.createdAt))
          .limit(1);
        // Activity + food counts (last 7 days)
        const sinceDate = new Date(Date.now() - 7 * 86400000);
        const sinceStr = sinceDate.toISOString().slice(0, 10);
        const activities = await db
          .select({ id: sportActivities.id })
          .from(sportActivities)
          .where(and(eq(sportActivities.userId, traineeId), gte(sportActivities.startedAt, sinceDate)));
        const foods = await db
          .select({ id: sportFoodLogs.id })
          .from(sportFoodLogs)
          .where(and(eq(sportFoodLogs.userId, traineeId), gte(sportFoodLogs.logDate, sinceStr)));
        const [lastLab] = await db
          .select({ id: sportLabResults.id, title: sportLabResults.title, reportDate: sportLabResults.reportDate })
          .from(sportLabResults)
          .where(eq(sportLabResults.userId, traineeId))
          .orderBy(desc(sportLabResults.reportDate))
          .limit(1);
        return NextResponse.json({
          success: true,
          data: {
            latestBody: body0 || null,
            latestBioAge: bio0 || null,
            activities7d: activities.length,
            foodLogs7d: foods.length,
            latestLab: lastLab || null,
          },
        });
      }

      // --- Body composition history + first/last comparison ---
      case "my-body-measurements": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const rows = await db
          .select()
          .from(sportBodyMeasurements)
          .where(eq(sportBodyMeasurements.userId, auth.user.id))
          .orderBy(sportBodyMeasurements.measuredAt);
        const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
        let comparison: Record<string, unknown> | null = null;
        if (rows.length >= 2) {
          const first = rows[0];
          const last = rows[rows.length - 1];
          const delta = (a: unknown, b: unknown) => {
            const na = num(a);
            const nb = num(b);
            if (na === null || nb === null) return null;
            return Math.round((nb - na) * 10) / 10;
          };
          comparison = {
            from: first.measuredAt,
            to: last.measuredAt,
            weightKg: delta(first.weightKg, last.weightKg),
            bodyFatPct: delta(first.bodyFatPct, last.bodyFatPct),
            muscleMassKg: delta(first.muscleMassKg, last.muscleMassKg),
            waistCm: delta(first.waistCm, last.waistCm),
          };
        }
        return NextResponse.json({ success: true, data: rows, comparison });
      }

      // --- Athlete lab results history + comparison (Phase 6) ---
      case "my-lab-results": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const rows = await db
          .select()
          .from(sportLabResults)
          .where(eq(sportLabResults.userId, auth.user.id))
          .orderBy(sportLabResults.reportDate);

        // Build per-marker comparison between the first and latest report.
        type Marker = { name: string; category: string; value: number; unit: string; athleteMin?: number; athleteMax?: number };
        let comparison: Array<{ name: string; category: string; unit: string; from: number; to: number; delta: number; inRange: boolean | null }> | null = null;
        if (rows.length >= 2) {
          const first = rows[0].markers as Marker[];
          const last = rows[rows.length - 1].markers as Marker[];
          const lastByName = new Map(last.map((m) => [m.name, m]));
          comparison = first
            .filter((m) => lastByName.has(m.name))
            .map((m) => {
              const l = lastByName.get(m.name)!;
              const inRange =
                l.athleteMin !== undefined && l.athleteMax !== undefined
                  ? l.value >= l.athleteMin && l.value <= l.athleteMax
                  : null;
              return {
                name: m.name,
                category: m.category,
                unit: m.unit,
                from: m.value,
                to: l.value,
                delta: Math.round((l.value - m.value) * 100) / 100,
                inRange,
              };
            });
        }
        return NextResponse.json({ success: true, data: rows, comparison });
      }

      // --- Trainee views their coach ---
      case "my-coach": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const rows = await db
          .select({
            linkId: sportCoachClients.id,
            status: sportCoachClients.status,
            createdAt: sportCoachClients.createdAt,
            coachId: users.id,
            coachName: users.name,
            coachEmail: users.email,
          })
          .from(sportCoachClients)
          .innerJoin(users, eq(users.id, sportCoachClients.coachId))
          .where(
            and(
              eq(sportCoachClients.traineeId, auth.user.id),
              eq(sportCoachClients.status, "active")
            )
          )
          .limit(1);
        return NextResponse.json({ success: true, data: rows[0] || null });
      }

      // --- Coach notifications feed ---
      case "my-notifications": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const onlyUnread = searchParams.get("unread") === "1";
        const where = onlyUnread
          ? and(eq(sportNotifications.userId, auth.user.id), eq(sportNotifications.isRead, false))
          : eq(sportNotifications.userId, auth.user.id);
        const rows = await db
          .select()
          .from(sportNotifications)
          .where(where)
          .orderBy(desc(sportNotifications.createdAt))
          .limit(50);
        const unreadCount = rows.filter((r) => !r.isRead).length;
        return NextResponse.json({ success: true, data: rows, unreadCount });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              "Unknown action. Available GET: food-search, food-category, food-all, food-nutrition, exercise-search, program-templates, wada-search, lessons, my-food-logs, my-activities, my-bio-age, my-programs, my-consent, my-clients, my-coach, my-body-measurements, my-lab-results, my-notifications",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[MediSport API] GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Create a notification for the active coach of a trainee, if any.
 * Looks up the trainee's coach via sport_coach_clients and inserts a row.
 * Best-effort: never throws into the request flow.
 */
async function notifyCoach(
  traineeId: string,
  type: string,
  title: string,
  bodyText: string,
  link: string
) {
  try {
    const link_ = await db
      .select({ coachId: sportCoachClients.coachId })
      .from(sportCoachClients)
      .where(
        and(
          eq(sportCoachClients.traineeId, traineeId),
          eq(sportCoachClients.status, "active")
        )
      )
      .limit(1);
    if (!link_[0]?.coachId) return;
    await db.insert(sportNotifications).values({
      userId: link_[0].coachId,
      actorId: traineeId,
      type,
      title,
      body: bodyText,
      link,
    });
  } catch (e) {
    console.error("[MediSport API] notifyCoach failed:", e);
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

      // --- Save a body composition measurement ---
      case "body-measurement": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const m = body.measurement || body;
        const numOrNull = (v: unknown) =>
          v === undefined || v === null || v === "" ? null : String(v);
        const [saved] = await db
          .insert(sportBodyMeasurements)
          .values({
            userId: auth.user.id,
            measuredAt: m.measuredAt ? String(m.measuredAt) : todayStr(),
            weightKg: numOrNull(m.weightKg),
            bodyFatPct: numOrNull(m.bodyFatPct),
            muscleMassKg: numOrNull(m.muscleMassKg),
            waterPct: numOrNull(m.waterPct),
            boneMassKg: numOrNull(m.boneMassKg),
            visceralFat: numOrNull(m.visceralFat),
            bmrKcal: m.bmrKcal ? Number(m.bmrKcal) : null,
            waistCm: numOrNull(m.waistCm),
            hipCm: numOrNull(m.hipCm),
            chestCm: numOrNull(m.chestCm),
            armCm: numOrNull(m.armCm),
            thighCm: numOrNull(m.thighCm),
            source: m.source ? String(m.source) : "manual",
            note: m.note ? String(m.note) : null,
          })
          .returning({ id: sportBodyMeasurements.id });
        await notifyCoach(
          auth.user.id,
          "body-measurement",
          auth.user.name || "Trainee",
          m.weightKg ? `Weight: ${m.weightKg} kg` : "New body measurement logged",
          "/coach"
        );
        return NextResponse.json({ success: true, data: { id: saved?.id }, persisted: true });
      }

      // --- Coach links a trainee by email ---
      case "coach-add-client": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const email = String(body.email || "").trim().toLowerCase();
        const notes = body.notes ? String(body.notes) : null;
        if (!email) {
          return NextResponse.json({ success: false, error: "Missing trainee email" }, { status: 400 });
        }
        // Find the trainee user by email
        const [trainee] = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (!trainee) {
          return NextResponse.json(
            { success: false, error: "no_user", message: "No MediSport user found with this email." },
            { status: 404 }
          );
        }
        if (trainee.id === auth.user.id) {
          return NextResponse.json({ success: false, error: "self_link" }, { status: 400 });
        }
        // Ensure the current user is registered as a coach profile
        await db
          .insert(sportProfiles)
          .values({ userId: auth.user.id, role: "coach" })
          .onConflictDoNothing({ target: sportProfiles.userId });
        // Create / reactivate the link (idempotent on unique coach+trainee)
        const [link] = await db
          .insert(sportCoachClients)
          .values({ coachId: auth.user.id, traineeId: trainee.id, notes, status: "active" })
          .onConflictDoUpdate({
            target: [sportCoachClients.coachId, sportCoachClients.traineeId],
            set: { status: "active", notes },
          })
          .returning();
        return NextResponse.json({
          success: true,
          data: { linkId: link.id, traineeId: trainee.id, traineeName: trainee.name, traineeEmail: trainee.email, status: link.status },
        });
      }

      // --- Save an athlete lab report (Phase 6) ---
      case "lab-result": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const r = body.report || body;
        const title = String(r.title || "").trim();
        if (!title) {
          return NextResponse.json({ success: false, error: "Missing report title" }, { status: 400 });
        }
        const markers = Array.isArray(r.markers) ? r.markers : [];
        const [saved] = await db
          .insert(sportLabResults)
          .values({
            userId: auth.user.id,
            title,
            reportDate: r.reportDate ? String(r.reportDate) : todayStr(),
            seasonPhase: r.seasonPhase ? String(r.seasonPhase) : null,
            markers,
            note: r.note ? String(r.note) : null,
          })
          .returning({ id: sportLabResults.id });
        await notifyCoach(
          auth.user.id,
          "lab-result",
          auth.user.name || "Trainee",
          `New lab report: ${title}`,
          "/coach"
        );
        return NextResponse.json({ success: true, data: { id: saved?.id }, persisted: true });
      }

      // --- Coach ends a trainee relationship ---
      case "coach-remove-client": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const traineeId = String(body.traineeId || "");
        if (!traineeId) {
          return NextResponse.json({ success: false, error: "Missing traineeId" }, { status: 400 });
        }
        await db
          .update(sportCoachClients)
          .set({ status: "ended" })
          .where(
            and(
              eq(sportCoachClients.coachId, auth.user.id),
              eq(sportCoachClients.traineeId, traineeId)
            )
          );
        return NextResponse.json({ success: true });
      }

      // --- Coach marks notification(s) read ---
      case "mark-notifications-read": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const id = body.id ? String(body.id) : null;
        if (id) {
          await db
            .update(sportNotifications)
            .set({ isRead: true })
            .where(and(eq(sportNotifications.id, id), eq(sportNotifications.userId, auth.user.id)));
        } else {
          await db
            .update(sportNotifications)
            .set({ isRead: true })
            .where(eq(sportNotifications.userId, auth.user.id));
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              "Unknown action. Available POST: bio-age, food-log, activity-log, coach-plan, program-save, medical-bridge-link, medical-bridge-consent, coach-add-client, coach-remove-client, body-measurement, lab-result, mark-notifications-read",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[MediSport API] POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
