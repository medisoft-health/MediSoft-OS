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
  sportCoachCertifications,
  sportCoachReviews,
  sportCoachRequests,
  sportCoachScoreHistory,
  sportTrainingPlans,
  sportWorkouts,
  sportWorkoutSessions,
  sportSessionExercises,
  sportSessionSets,
  sportPersonalRecords,
  sportExerciseProgress,
  users,
} from "@/db/schema";
import { and, desc, eq, gte, sql, inArray } from "drizzle-orm";
import { requireSessionApi } from "@/lib/auth-helpers";
import { isPlatformAdmin } from "@/lib/sport/admin-guard";
import { sendEmail, buildCoachDecisionEmail } from "@/lib/email";
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
import {
  calculateCoachScore,
  type CoachScoreInput,
} from "@/lib/sport/coach-scoring";

/**
 * Recompute a coach's verification score from their profile + certs +
 * performance signals, and persist coachScore/coachTier/scoreBreakdown.
 * Best-effort; returns the result or null on error.
 */
async function recomputeCoachScore(coachId: string, reason: string = "recompute") {
  try {
    const [p] = await db
      .select()
      .from(sportProfiles)
      .where(eq(sportProfiles.userId, coachId))
      .limit(1);
    if (!p) return null;
    const certs = await db
      .select()
      .from(sportCoachCertifications)
      .where(eq(sportCoachCertifications.coachId, coachId));
    const input: CoachScoreInput = {
      highestDegree: p.highestDegree as string | null,
      studyField: p.studyField,
      yearsExperience: p.yearsExperience,
      certifications: certs.map((c) => ({
        issuer: c.issuer,
        recognized: c.verified ? true : undefined,
        expiryDate: c.expiryDate as string | null,
      })),
      hasAvatar: !!p.avatarUrl,
      bioLength: (p.bio || "").length,
      languagesCount: Array.isArray(p.languages) ? (p.languages as unknown[]).length : 0,
      hasProfessionalLinks:
        Array.isArray(p.professionalLinks) && (p.professionalLinks as unknown[]).length > 0,
      hasCv: !!p.cvUrl,
      adminScore: p.adminScore,
      ratingAvg: p.ratingAvg ? Number(p.ratingAvg) : 0,
      ratingCount: p.ratingCount ?? 0,
    };
    const result = calculateCoachScore(input);
    await db
      .update(sportProfiles)
      .set({
        coachScore: String(result.total),
        coachTier: result.tier,
        scoreBreakdown: result.breakdown,
      })
      .where(eq(sportProfiles.userId, coachId));
    // Append a time-series snapshot so the coach analytics dashboard can
    // chart score/rating progression. Best-effort; never blocks the recompute.
    try {
      await db.insert(sportCoachScoreHistory).values({
        coachId,
        total: String(result.total),
        tier: result.tier,
        breakdown: result.breakdown,
        ratingAvg: p.ratingAvg ? String(p.ratingAvg) : "0",
        ratingCount: p.ratingCount ?? 0,
        reason,
      });
    } catch (e) {
      console.error("[MediSport API] score-history snapshot failed:", e);
    }
    return result;
  } catch (e) {
    console.error("[MediSport API] recomputeCoachScore failed:", e);
    return null;
  }
}

/**
 * Apply a single admin verification decision to one coach. Shared by the
 * single (`admin-verify-decision`) and bulk (`admin-bulk-decision`) actions
 * so both paths produce identical side effects: optional cert verification,
 * optional discretionary score, score recompute + history snapshot, status
 * transition, in-app notification, and best-effort decision email.
 */
async function applyCoachDecision(opts: {
  coachId: string;
  decision: "approve" | "reject" | "request_info";
  adminId: string;
  adminScore?: number | null;
  note?: string | null;
  verifiedCertIds?: string[] | null;
}): Promise<{ status: string; score: number | null }> {
  const { coachId, decision, adminId } = opts;
  const note = opts.note ?? null;
  if (opts.verifiedCertIds && opts.verifiedCertIds.length) {
    await db
      .update(sportCoachCertifications)
      .set({ verified: true })
      .where(
        and(
          eq(sportCoachCertifications.coachId, coachId),
          inArray(sportCoachCertifications.id, opts.verifiedCertIds.map(String))
        )
      );
  }
  if (opts.adminScore != null) {
    const clamped = Math.max(0, Math.min(15, Number(opts.adminScore)));
    await db.update(sportProfiles).set({ adminScore: clamped }).where(eq(sportProfiles.userId, coachId));
  }
  const scored = await recomputeCoachScore(coachId, "admin");
  let newStatus = "under_review";
  let notifyTitle = "";
  let notifyBody = "";
  if (decision === "approve") {
    newStatus = "verified";
    notifyTitle = "تم اعتماد حسابك كمدرب";
    notifyBody = `تهانينا! تم اعتمادك بتقييم ${scored?.total ?? ""}/100.`;
    await db
      .update(sportProfiles)
      .set({ verificationStatus: "verified", verifiedAt: new Date(), adminNote: note, rejectionReason: null })
      .where(eq(sportProfiles.userId, coachId));
  } else if (decision === "reject") {
    newStatus = "rejected";
    notifyTitle = "تحديث طلب الاعتماد";
    notifyBody = note || "لم يتم اعتماد الطلب حاليًا.";
    await db
      .update(sportProfiles)
      .set({ verificationStatus: "rejected", adminNote: note, rejectionReason: note })
      .where(eq(sportProfiles.userId, coachId));
  } else {
    newStatus = "needs_more_info";
    notifyTitle = "مطلوب معلومات إضافية";
    notifyBody = note || "يرجى تزويدنا بمعلومات إضافية لإكمال الاعتماد.";
    await db
      .update(sportProfiles)
      .set({ verificationStatus: "needs_more_info", adminNote: note })
      .where(eq(sportProfiles.userId, coachId));
  }
  await db.insert(sportNotifications).values({
    userId: coachId,
    actorId: adminId,
    type: "coach-verification",
    title: notifyTitle,
    body: notifyBody,
    link: "/coach/verification",
  });
  try {
    const [coachUser] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, coachId))
      .limit(1);
    if (coachUser?.email) {
      const base = process.env.NEXT_PUBLIC_APP_URL || "https://app.medisofthealth.com";
      await sendEmail(
        buildCoachDecisionEmail({
          toName: coachUser.name,
          toEmail: coachUser.email,
          decision,
          score: scored?.total ?? null,
          tier: scored?.tier ?? null,
          note,
          ctaUrl: `${base}/ar/coach`,
        })
      );
    }
  } catch (e) {
    console.error("[MediSport API] coach decision email failed:", e);
  }
  return { status: newStatus, score: scored?.total ?? null };
}

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

      // ===================== Coach Verification (Phase 8) =====================

      // --- Coach reads their own verification profile + certs ---
      case "my-coach-profile": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const [profile] = await db
          .select()
          .from(sportProfiles)
          .where(eq(sportProfiles.userId, auth.user.id))
          .limit(1);
        const certs = await db
          .select()
          .from(sportCoachCertifications)
          .where(eq(sportCoachCertifications.coachId, auth.user.id))
          .orderBy(desc(sportCoachCertifications.createdAt));
        return NextResponse.json({ success: true, data: { profile: profile || null, certifications: certs } });
      }

      // --- Coach analytics: score/rating progression + reviews summary ---
      case "coach-analytics": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const coachId = auth.user.id;

        // Current profile snapshot
        const [profile] = await db
          .select({
            coachScore: sportProfiles.coachScore,
            coachTier: sportProfiles.coachTier,
            scoreBreakdown: sportProfiles.scoreBreakdown,
            ratingAvg: sportProfiles.ratingAvg,
            ratingCount: sportProfiles.ratingCount,
            verificationStatus: sportProfiles.verificationStatus,
          })
          .from(sportProfiles)
          .where(eq(sportProfiles.userId, coachId))
          .limit(1);

        // Time-series history (oldest → newest, last 60 points)
        const historyRaw = await db
          .select()
          .from(sportCoachScoreHistory)
          .where(eq(sportCoachScoreHistory.coachId, coachId))
          .orderBy(desc(sportCoachScoreHistory.createdAt))
          .limit(60);
        const history = historyRaw
          .map((h) => ({
            date: h.createdAt,
            total: h.total != null ? Number(h.total) : 0,
            tier: h.tier,
            ratingAvg: h.ratingAvg != null ? Number(h.ratingAvg) : 0,
            ratingCount: h.ratingCount ?? 0,
            reason: h.reason,
          }))
          .reverse();

        // Star distribution + averages for sub-criteria
        const reviews = await db
          .select()
          .from(sportCoachReviews)
          .where(eq(sportCoachReviews.coachId, coachId))
          .orderBy(desc(sportCoachReviews.createdAt));
        const dist = [0, 0, 0, 0, 0]; // index 0 → 1-star … index 4 → 5-star
        let commSum = 0, commCnt = 0, resSum = 0, resCnt = 0;
        for (const r of reviews) {
          const s = Math.max(1, Math.min(5, r.stars));
          dist[s - 1] += 1;
          if (r.communication != null) { commSum += r.communication; commCnt += 1; }
          if (r.results != null) { resSum += r.results; resCnt += 1; }
        }
        const recentReviews = reviews.slice(0, 5).map((r) => ({
          stars: r.stars,
          comment: r.comment,
          communication: r.communication,
          results: r.results,
          createdAt: r.createdAt,
        }));

        // Client/request counts
        const [reqAgg] = await db
          .select({
            accepted: sql<number>`count(*) filter (where ${sportCoachRequests.status} = 'accepted')`,
            pending: sql<number>`count(*) filter (where ${sportCoachRequests.status} = 'pending')`,
          })
          .from(sportCoachRequests)
          .where(eq(sportCoachRequests.coachId, coachId));

        return NextResponse.json({
          success: true,
          data: {
            current: profile
              ? {
                  score: profile.coachScore != null ? Number(profile.coachScore) : 0,
                  tier: profile.coachTier,
                  breakdown: profile.scoreBreakdown,
                  ratingAvg: profile.ratingAvg != null ? Number(profile.ratingAvg) : 0,
                  ratingCount: profile.ratingCount ?? 0,
                  verificationStatus: profile.verificationStatus,
                }
              : null,
            history,
            reviews: {
              total: reviews.length,
              distribution: dist,
              avgCommunication: commCnt ? Math.round((commSum / commCnt) * 10) / 10 : null,
              avgResults: resCnt ? Math.round((resSum / resCnt) * 10) / 10 : null,
              recent: recentReviews,
            },
            clients: {
              active: reqAgg?.accepted ? Number(reqAgg.accepted) : 0,
              pending: reqAgg?.pending ? Number(reqAgg.pending) : 0,
            },
          },
        });
      }

      // --- Admin: verification queue (pending reviews) ---
      case "admin-verification-queue": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        if (!isPlatformAdmin(auth.user)) {
          return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
        }
        const statusFilter = searchParams.get("status");
        const statuses = statusFilter
          ? [statusFilter]
          : ["submitted", "under_review", "needs_more_info"];
        const rows = await db
          .select({
            userId: sportProfiles.userId,
            name: users.name,
            email: users.email,
            verificationStatus: sportProfiles.verificationStatus,
            coachScore: sportProfiles.coachScore,
            coachTier: sportProfiles.coachTier,
            scoreBreakdown: sportProfiles.scoreBreakdown,
            adminScore: sportProfiles.adminScore,
            highestDegree: sportProfiles.highestDegree,
            studyField: sportProfiles.studyField,
            university: sportProfiles.university,
            graduationYear: sportProfiles.graduationYear,
            yearsExperience: sportProfiles.yearsExperience,
            specialties: sportProfiles.specialties,
            bio: sportProfiles.bio,
            cvUrl: sportProfiles.cvUrl,
            idDocUrl: sportProfiles.idDocUrl,
            professionalLinks: sportProfiles.professionalLinks,
            submittedAt: sportProfiles.submittedAt,
          })
          .from(sportProfiles)
          .innerJoin(users, eq(users.id, sportProfiles.userId))
          .where(
            and(
              eq(sportProfiles.role, "coach"),
              inArray(sportProfiles.verificationStatus, statuses)
            )
          )
          .orderBy(desc(sportProfiles.submittedAt));
        // Attach each coach's certifications
        const ids = rows.map((r) => r.userId);
        const certs = ids.length
          ? await db
              .select()
              .from(sportCoachCertifications)
              .where(inArray(sportCoachCertifications.coachId, ids))
          : [];
        const certsByCoach = new Map<string, typeof certs>();
        for (const c of certs) {
          const list = certsByCoach.get(c.coachId) || [];
          list.push(c);
          certsByCoach.set(c.coachId, list);
        }
        const data = rows.map((r) => ({ ...r, certifications: certsByCoach.get(r.userId) || [] }));
        return NextResponse.json({ success: true, data });
      }

      // --- Public coach directory (verified coaches, ranked) ---
      case "coach-directory": {
        const specialty = searchParams.get("specialty");
        const q = (searchParams.get("q") || "").trim().toLowerCase();
        const rows = await db
          .select({
            userId: sportProfiles.userId,
            name: users.name,
            displayName: sportProfiles.displayName,
            avatarUrl: sportProfiles.avatarUrl,
            bio: sportProfiles.bio,
            specialties: sportProfiles.specialties,
            city: sportProfiles.city,
            country: sportProfiles.country,
            yearsExperience: sportProfiles.yearsExperience,
            coachScore: sportProfiles.coachScore,
            coachTier: sportProfiles.coachTier,
            ratingAvg: sportProfiles.ratingAvg,
            ratingCount: sportProfiles.ratingCount,
            activeClients: sportProfiles.activeClients,
          })
          .from(sportProfiles)
          .innerJoin(users, eq(users.id, sportProfiles.userId))
          .where(
            and(
              eq(sportProfiles.role, "coach"),
              eq(sportProfiles.verificationStatus, "verified")
            )
          )
          .orderBy(desc(sportProfiles.coachScore));
        let data = rows;
        if (specialty) {
          data = data.filter(
            (r) => Array.isArray(r.specialties) && (r.specialties as string[]).includes(specialty)
          );
        }
        if (q) {
          data = data.filter(
            (r) =>
              (r.displayName || r.name || "").toLowerCase().includes(q) ||
              (r.bio || "").toLowerCase().includes(q)
          );
        }
        return NextResponse.json({ success: true, data });
      }

      // --- Public coach profile (verified) + reviews ---
      case "coach-public-profile": {
        const coachId = searchParams.get("coachId");
        if (!coachId) {
          return NextResponse.json({ success: false, error: "Missing coachId" }, { status: 400 });
        }
        const [profile] = await db
          .select({
            userId: sportProfiles.userId,
            name: users.name,
            displayName: sportProfiles.displayName,
            avatarUrl: sportProfiles.avatarUrl,
            bio: sportProfiles.bio,
            specialties: sportProfiles.specialties,
            languages: sportProfiles.languages,
            city: sportProfiles.city,
            country: sportProfiles.country,
            highestDegree: sportProfiles.highestDegree,
            studyField: sportProfiles.studyField,
            university: sportProfiles.university,
            yearsExperience: sportProfiles.yearsExperience,
            coachScore: sportProfiles.coachScore,
            coachTier: sportProfiles.coachTier,
            ratingAvg: sportProfiles.ratingAvg,
            ratingCount: sportProfiles.ratingCount,
            activeClients: sportProfiles.activeClients,
            verificationStatus: sportProfiles.verificationStatus,
          })
          .from(sportProfiles)
          .innerJoin(users, eq(users.id, sportProfiles.userId))
          .where(eq(sportProfiles.userId, coachId))
          .limit(1);
        if (!profile || profile.verificationStatus !== "verified") {
          return NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
        }
        const certs = await db
          .select({
            name: sportCoachCertifications.name,
            issuer: sportCoachCertifications.issuer,
            verified: sportCoachCertifications.verified,
          })
          .from(sportCoachCertifications)
          .where(eq(sportCoachCertifications.coachId, coachId));
        const reviews = await db
          .select({
            stars: sportCoachReviews.stars,
            comment: sportCoachReviews.comment,
            createdAt: sportCoachReviews.createdAt,
            traineeName: users.name,
          })
          .from(sportCoachReviews)
          .innerJoin(users, eq(users.id, sportCoachReviews.traineeId))
          .where(eq(sportCoachReviews.coachId, coachId))
          .orderBy(desc(sportCoachReviews.createdAt))
          .limit(20);
        return NextResponse.json({ success: true, data: { profile, certifications: certs, reviews } });
      }

      // --- Coach: connection requests addressed to me ---
      case "my-coach-requests": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const rows = await db
          .select({
            id: sportCoachRequests.id,
            traineeId: sportCoachRequests.traineeId,
            traineeName: users.name,
            traineeEmail: users.email,
            status: sportCoachRequests.status,
            message: sportCoachRequests.message,
            initiator: sportCoachRequests.initiator,
            createdAt: sportCoachRequests.createdAt,
          })
          .from(sportCoachRequests)
          .innerJoin(users, eq(users.id, sportCoachRequests.traineeId))
          .where(
            and(
              eq(sportCoachRequests.coachId, auth.user.id),
              eq(sportCoachRequests.status, "pending")
            )
          )
          .orderBy(desc(sportCoachRequests.createdAt));
        return NextResponse.json({ success: true, data: rows });
      }

      // --- Trainee: my outgoing requests / link status ---
      case "my-trainee-requests": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const rows = await db
          .select({
            id: sportCoachRequests.id,
            coachId: sportCoachRequests.coachId,
            coachName: users.name,
            status: sportCoachRequests.status,
            createdAt: sportCoachRequests.createdAt,
          })
          .from(sportCoachRequests)
          .innerJoin(users, eq(users.id, sportCoachRequests.coachId))
          .where(eq(sportCoachRequests.traineeId, auth.user.id))
          .orderBy(desc(sportCoachRequests.createdAt));
        return NextResponse.json({ success: true, data: rows });
      }

      // --- Trainee/Coach full profile with completion % ---
      case "my-sport-profile": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const [profile] = await db
          .select()
          .from(sportProfiles)
          .where(eq(sportProfiles.userId, auth.user.id))
          .limit(1);
        if (!profile) {
          return NextResponse.json({ success: true, data: null, completion: 0 });
        }
        // Calculate profile completion %
        const traineeFields = [
          profile.displayName, profile.sex, profile.birthDate,
          profile.heightCm, profile.weightKg, profile.goal,
          profile.activityLevel, profile.avatarUrl, profile.fitnessLevel,
          profile.equipmentAccess, profile.daysPerWeek, profile.phone,
          profile.bodyFatPct, profile.muscleMassKg, profile.preferredTrainingTime,
        ];
        const medicalFields = [
          (profile.injuries as unknown[])?.length > 0 ? "filled" : null,
          (profile.medicalConditions as unknown[])?.length > 0 ? "filled" : null,
          (profile.medications as unknown[])?.length > 0 ? "filled" : null,
          (profile.emergencyContact as Record<string, unknown>)?.name ? "filled" : null,
        ];
        const allFields = [...traineeFields, ...medicalFields];
        const filled = allFields.filter((f) => f !== null && f !== undefined && f !== "").length;
        const completion = Math.round((filled / allFields.length) * 100);
        // Update stored completion
        if (completion !== profile.profileCompletion) {
          await db.update(sportProfiles).set({ profileCompletion: completion }).where(eq(sportProfiles.userId, auth.user.id));
        }
        return NextResponse.json({ success: true, data: { ...profile, profileCompletion: completion }, completion });
      }

      case "my-training-plan": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const plans = await db
          .select()
          .from(sportTrainingPlans)
          .where(and(eq(sportTrainingPlans.userId, auth.user.id), eq(sportTrainingPlans.status, "active")))
          .limit(1);
        if (!plans[0]) {
          return NextResponse.json({ success: true, plan: null });
        }
        const plan = plans[0];
        const structure = plan.planStructure as any;
        const today = new Date();
        const dayOfWeek = today.getDay();
        const workouts = await db
          .select()
          .from(sportWorkouts)
          .where(and(eq(sportWorkouts.planId, plan.id), eq(sportWorkouts.weekNumber, plan.currentWeek)))
          .orderBy(sportWorkouts.dayNumber);
        const todayWorkout = workouts.find(w => w.dayNumber === (dayOfWeek === 0 ? 7 : dayOfWeek));
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayNamesAr = ["\u0627\u0644\u0623\u062d\u062f", "\u0627\u0644\u0625\u062b\u0646\u064a\u0646", "\u0627\u0644\u062b\u0644\u0627\u062b\u0627\u0621", "\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621", "\u0627\u0644\u062e\u0645\u064a\u0633", "\u0627\u0644\u062c\u0645\u0639\u0629", "\u0627\u0644\u0633\u0628\u062a"];
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const wk = workouts.find(w => w.dayNumber === (i === 0 ? 7 : i));
          return {
            dayNumber: i,
            dayName: dayNames[i],
            dayNameAr: dayNamesAr[i],
            isToday: i === dayOfWeek,
            isCompleted: wk?.status === "completed",
            isRest: !wk,
            workoutTitle: wk?.title,
            workoutTitleAr: wk?.title,
          };
        });
        const sessions = await db
          .select()
          .from(sportWorkoutSessions)
          .where(eq(sportWorkoutSessions.userId, auth.user.id))
          .orderBy(desc(sportWorkoutSessions.startedAt))
          .limit(20);
        const history = sessions.map(s => ({
          id: s.id,
          date: s.startedAt?.toISOString() || "",
          workoutTitle: "Workout",
          workoutTitleAr: "\u062a\u0645\u0631\u064a\u0646",
          durationMinutes: Math.round((s.durationSeconds || 0) / 60),
          totalVolume: parseFloat(s.totalVolume || "0"),
          totalSets: s.totalSets || 0,
          personalRecords: 0,
          moodRating: s.moodRating || 3,
        }));
        const medAdj = (plan.medicalAdjustments as any) || [];
        return NextResponse.json({
          success: true,
          plan: {
            id: plan.id,
            title: plan.title,
            titleAr: plan.title,
            goal: plan.goal,
            durationWeeks: plan.durationWeeks,
            currentWeek: plan.currentWeek,
            daysPerWeek: plan.daysPerWeek,
            splitName: structure?.splitName || "Custom",
            splitNameAr: structure?.splitNameAr || "\u0645\u062e\u0635\u0635",
            phases: structure?.phases || [],
            medicalAdjustments: Array.isArray(medAdj) ? medAdj : [],
          },
          todayWorkout: todayWorkout ? {
            dayNumber: todayWorkout.dayNumber,
            title: todayWorkout.title,
            titleAr: todayWorkout.title,
            targetMuscles: todayWorkout.targetMuscles || [],
            exercises: (todayWorkout.exercises as any[]) || [],
            estimatedDuration: ((todayWorkout.exercises as any[]) || []).length * 5,
          } : null,
          weekDays,
          history,
          progressionTips: [],
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              "Unknown action. Available GET: food-search, food-category, food-all, food-nutrition, exercise-search, program-templates, wada-search, lessons, my-food-logs, my-activities, my-bio-age, my-programs, my-consent, my-clients, my-coach, my-body-measurements, my-lab-results, my-notifications, my-coach-profile, admin-verification-queue, coach-directory, coach-public-profile, my-coach-requests, my-trainee-requests, my-sport-profile, my-training-plan",
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

      // ===================== Coach Verification (Phase 8) =====================

      // --- Coach saves/updates their verification profile (draft) ---
      case "coach-profile-save": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const p = body.profile || {};
        const set: Record<string, unknown> = {
          role: "coach",
          displayName: p.displayName ?? null,
          bio: p.bio ?? null,
          highestDegree: p.highestDegree ?? null,
          studyField: p.studyField ?? null,
          university: p.university ?? null,
          graduationYear: p.graduationYear ?? null,
          yearsExperience: p.yearsExperience ?? null,
          specialties: Array.isArray(p.specialties) ? p.specialties : null,
          languages: Array.isArray(p.languages) ? p.languages : null,
          city: p.city ?? null,
          country: p.country ?? null,
          cvUrl: p.cvUrl ?? null,
          idDocUrl: p.idDocUrl ?? null,
          avatarUrl: p.avatarUrl ?? null,
          professionalLinks: Array.isArray(p.professionalLinks) ? p.professionalLinks : null,
        };
        // Don't overwrite a verified status with a draft save.
        await db
          .insert(sportProfiles)
          .values({ userId: auth.user.id, ...set } as typeof sportProfiles.$inferInsert)
          .onConflictDoUpdate({ target: sportProfiles.userId, set });
        const result = await recomputeCoachScore(auth.user.id);
        return NextResponse.json({ success: true, data: { score: result } });
      }

      // --- Coach adds a certification ---
      case "coach-cert-add": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const c = body.certification || {};
        const name = String(c.name || "").trim();
        if (!name) {
          return NextResponse.json({ success: false, error: "Missing certification name" }, { status: 400 });
        }
        const [saved] = await db
          .insert(sportCoachCertifications)
          .values({
            coachId: auth.user.id,
            name,
            issuer: c.issuer ? String(c.issuer) : null,
            credentialNo: c.credentialNo ? String(c.credentialNo) : null,
            issueDate: c.issueDate ? String(c.issueDate) : null,
            expiryDate: c.expiryDate ? String(c.expiryDate) : null,
            fileUrl: c.fileUrl ? String(c.fileUrl) : null,
          })
          .returning({ id: sportCoachCertifications.id });
        await recomputeCoachScore(auth.user.id);
        return NextResponse.json({ success: true, data: { id: saved?.id } });
      }

      // --- Coach removes a certification ---
      case "coach-cert-remove": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
        await db
          .delete(sportCoachCertifications)
          .where(and(eq(sportCoachCertifications.id, id), eq(sportCoachCertifications.coachId, auth.user.id)));
        await recomputeCoachScore(auth.user.id);
        return NextResponse.json({ success: true });
      }

      // --- Coach submits profile for verification ---
      case "coach-submit-verification": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const [profile] = await db
          .select()
          .from(sportProfiles)
          .where(eq(sportProfiles.userId, auth.user.id))
          .limit(1);
        if (!profile) {
          return NextResponse.json({ success: false, error: "no_profile" }, { status: 400 });
        }
        if (profile.verificationStatus === "verified") {
          return NextResponse.json({ success: false, error: "already_verified" }, { status: 400 });
        }
        // Minimum bar: a degree OR at least one certification, plus experience set.
        const certCount = (
          await db
            .select({ id: sportCoachCertifications.id })
            .from(sportCoachCertifications)
            .where(eq(sportCoachCertifications.coachId, auth.user.id))
        ).length;
        if (!profile.highestDegree && certCount === 0) {
          return NextResponse.json(
            { success: false, error: "insufficient", message: "Add a degree or at least one certification before submitting." },
            { status: 400 }
          );
        }
        await recomputeCoachScore(auth.user.id);
        await db
          .update(sportProfiles)
          .set({ verificationStatus: "submitted", submittedAt: new Date(), rejectionReason: null })
          .where(eq(sportProfiles.userId, auth.user.id));
        // Notify all admins
        const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
        if (admins.length) {
          await db.insert(sportNotifications).values(
            admins.map((a) => ({
              userId: a.id,
              actorId: auth.user.id,
              type: "coach-verification",
              title: auth.user.name || "Coach",
              body: "New coach verification request submitted",
              link: "/console-x7k2/coaches",
            }))
          );
        }
        return NextResponse.json({ success: true });
      }

      // --- Admin: decide on a verification request ---
      case "admin-verify-decision": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        if (!isPlatformAdmin(auth.user)) {
          return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
        }
        const coachId = String(body.coachId || "");
        const decision = String(body.decision || ""); // approve|reject|request_info
        if (!coachId || !decision) {
          return NextResponse.json({ success: false, error: "Missing coachId/decision" }, { status: 400 });
        }
        const adminScore = body.adminScore != null ? Number(body.adminScore) : null;
        const note = body.note ? String(body.note) : null;
        const verifiedCertIds = Array.isArray(body.verifiedCertIds)
          ? body.verifiedCertIds.map(String)
          : null;
        const out = await applyCoachDecision({
          coachId,
          decision: decision as "approve" | "reject" | "request_info",
          adminId: auth.user.id,
          adminScore,
          note,
          verifiedCertIds,
        });
        return NextResponse.json({ success: true, data: { status: out.status, score: out.score } });
      }

      // --- Admin: bulk decision on many coaches at once ---
      case "admin-bulk-decision": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        if (!isPlatformAdmin(auth.user)) {
          return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
        }
        const decision = String(body.decision || "");
        const rawIds: string[] = Array.isArray(body.coachIds)
          ? (body.coachIds as unknown[]).map((x) => String(x))
          : [];
        const coachIds: string[] = Array.from(new Set<string>(rawIds)).filter(
          (s) => s.length > 0
        );
        const note = body.note ? String(body.note) : null;
        if (!decision || !coachIds.length) {
          return NextResponse.json({ success: false, error: "Missing decision/coachIds" }, { status: 400 });
        }
        if (!["approve", "reject", "request_info"].includes(decision)) {
          return NextResponse.json({ success: false, error: "Invalid decision" }, { status: 400 });
        }
        if (coachIds.length > 100) {
          return NextResponse.json({ success: false, error: "Too many (max 100)" }, { status: 400 });
        }
        // Process sequentially to keep DB load predictable; collect outcomes.
        const results: Array<{ coachId: string; ok: boolean; status?: string; error?: string }> = [];
        for (const id of coachIds) {
          try {
            const out = await applyCoachDecision({
              coachId: id,
              decision: decision as "approve" | "reject" | "request_info",
              adminId: auth.user.id,
              note,
            });
            results.push({ coachId: id, ok: true, status: out.status });
          } catch (e) {
            console.error("[MediSport API] bulk decision failed for", id, e);
            results.push({ coachId: id, ok: false, error: "failed" });
          }
        }
        const succeeded = results.filter((r) => r.ok).length;
        return NextResponse.json({
          success: true,
          data: { total: coachIds.length, succeeded, failed: coachIds.length - succeeded, results },
        });
      }

      // --- Trainee requests to connect with a verified coach ---
      case "request-coach": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const coachId = String(body.coachId || "");
        const message = body.message ? String(body.message) : null;
        if (!coachId) return NextResponse.json({ success: false, error: "Missing coachId" }, { status: 400 });
        if (coachId === auth.user.id) {
          return NextResponse.json({ success: false, error: "self_link" }, { status: 400 });
        }
        const [coach] = await db
          .select({ status: sportProfiles.verificationStatus })
          .from(sportProfiles)
          .where(eq(sportProfiles.userId, coachId))
          .limit(1);
        if (!coach || coach.status !== "verified") {
          return NextResponse.json({ success: false, error: "coach_not_verified" }, { status: 400 });
        }
        await db
          .insert(sportCoachRequests)
          .values({ traineeId: auth.user.id, coachId, initiator: "trainee", message, status: "pending" })
          .onConflictDoUpdate({
            target: [sportCoachRequests.traineeId, sportCoachRequests.coachId],
            set: { status: "pending", message, initiator: "trainee", respondedAt: null },
          });
        await db.insert(sportNotifications).values({
          userId: coachId,
          actorId: auth.user.id,
          type: "coach-request",
          title: auth.user.name || "Trainee",
          body: "طلب تدريب جديد",
          link: "/coach",
        });
        return NextResponse.json({ success: true });
      }

      // --- Coach responds to a trainee request ---
      case "respond-coach-request": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const requestId = String(body.requestId || "");
        const accept = !!body.accept;
        if (!requestId) return NextResponse.json({ success: false, error: "Missing requestId" }, { status: 400 });
        const [reqRow] = await db
          .select()
          .from(sportCoachRequests)
          .where(and(eq(sportCoachRequests.id, requestId), eq(sportCoachRequests.coachId, auth.user.id)))
          .limit(1);
        if (!reqRow) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
        await db
          .update(sportCoachRequests)
          .set({ status: accept ? "accepted" : "declined", respondedAt: new Date() })
          .where(eq(sportCoachRequests.id, requestId));
        if (accept) {
          await db
            .insert(sportCoachClients)
            .values({ coachId: auth.user.id, traineeId: reqRow.traineeId, status: "active" })
            .onConflictDoUpdate({
              target: [sportCoachClients.coachId, sportCoachClients.traineeId],
              set: { status: "active" },
            });
          // Refresh active client count
          const cnt = (
            await db
              .select({ id: sportCoachClients.id })
              .from(sportCoachClients)
              .where(and(eq(sportCoachClients.coachId, auth.user.id), eq(sportCoachClients.status, "active")))
          ).length;
          await db.update(sportProfiles).set({ activeClients: cnt }).where(eq(sportProfiles.userId, auth.user.id));
        }
        await db.insert(sportNotifications).values({
          userId: reqRow.traineeId,
          actorId: auth.user.id,
          type: "coach-request",
          title: accept ? "تم قبول طلبك" : "تحديث طلب التدريب",
          body: accept ? "وافق المدرب على تدريبك" : "لم يتم قبول الطلب حاليًا",
          link: "/trainee",
        });
        return NextResponse.json({ success: true });
      }

      // --- Trainee submits a review for their coach ---
      case "coach-review": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const coachId = String(body.coachId || "");
        const stars = Math.max(1, Math.min(5, Number(body.stars || 0)));
        if (!coachId || !stars) {
          return NextResponse.json({ success: false, error: "Missing coachId/stars" }, { status: 400 });
        }
        // Must have an active link with this coach
        const [link] = await db
          .select({ id: sportCoachClients.id })
          .from(sportCoachClients)
          .where(
            and(
              eq(sportCoachClients.coachId, coachId),
              eq(sportCoachClients.traineeId, auth.user.id),
              eq(sportCoachClients.status, "active")
            )
          )
          .limit(1);
        if (!link) {
          return NextResponse.json({ success: false, error: "not_linked" }, { status: 403 });
        }
        await db
          .insert(sportCoachReviews)
          .values({
            coachId,
            traineeId: auth.user.id,
            stars,
            communication: body.communication != null ? Number(body.communication) : null,
            results: body.results != null ? Number(body.results) : null,
            comment: body.comment ? String(body.comment) : null,
          })
          .onConflictDoUpdate({
            target: [sportCoachReviews.coachId, sportCoachReviews.traineeId],
            set: {
              stars,
              communication: body.communication != null ? Number(body.communication) : null,
              results: body.results != null ? Number(body.results) : null,
              comment: body.comment ? String(body.comment) : null,
            },
          });
        // Recompute aggregate rating
        const agg = await db
          .select({
            avg: sql<number>`avg(${sportCoachReviews.stars})`,
            cnt: sql<number>`count(*)`,
          })
          .from(sportCoachReviews)
          .where(eq(sportCoachReviews.coachId, coachId));
        const avg = agg[0]?.avg ? Number(agg[0].avg) : 0;
        const cnt = agg[0]?.cnt ? Number(agg[0].cnt) : 0;
        await db
          .update(sportProfiles)
          .set({ ratingAvg: String(Math.round(avg * 100) / 100), ratingCount: cnt })
          .where(eq(sportProfiles.userId, coachId));
        await recomputeCoachScore(coachId, "review");
        return NextResponse.json({ success: true, data: { ratingAvg: avg, ratingCount: cnt } });
      }

      // --- Trainee profile save (onboarding + profile updates) ---
      case "trainee-profile-save": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const p = body.profile || {};
        const set: Record<string, unknown> = {
          role: "trainee",
          displayName: p.displayName ?? null,
          sex: p.sex ?? null,
          birthDate: p.birthDate ?? null,
          heightCm: p.heightCm ?? null,
          weightKg: p.weightKg ?? null,
          goal: p.goal ?? null,
          activityLevel: p.activityLevel ?? null,
          bio: p.bio ?? null,
          avatarUrl: p.avatarUrl ?? null,
          onboardingComplete: true,
        };
        await db
          .insert(sportProfiles)
          .values({ userId: auth.user.id, ...set } as typeof sportProfiles.$inferInsert)
          .onConflictDoUpdate({ target: sportProfiles.userId, set });
        return NextResponse.json({ success: true });
      }

      // --- Update full sport profile (trainee comprehensive) ---
      case "update-sport-profile": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const p = body.profile || {};
        const set: Record<string, unknown> = {};
        // Basic info
        if (p.displayName !== undefined) set.displayName = p.displayName || null;
        if (p.sex !== undefined) set.sex = p.sex || null;
        if (p.birthDate !== undefined) set.birthDate = p.birthDate || null;
        if (p.heightCm !== undefined) set.heightCm = p.heightCm || null;
        if (p.weightKg !== undefined) set.weightKg = p.weightKg || null;
        if (p.goal !== undefined) set.goal = p.goal || null;
        if (p.activityLevel !== undefined) set.activityLevel = p.activityLevel || null;
        if (p.bio !== undefined) set.bio = p.bio || null;
        if (p.avatarUrl !== undefined) set.avatarUrl = p.avatarUrl || null;
        // Trainee-specific fields
        if (p.fitnessLevel !== undefined) set.fitnessLevel = p.fitnessLevel || "beginner";
        if (p.equipmentAccess !== undefined) set.equipmentAccess = p.equipmentAccess || "full_gym";
        if (p.daysPerWeek !== undefined) set.daysPerWeek = Number(p.daysPerWeek) || 4;
        if (p.injuries !== undefined) set.injuries = Array.isArray(p.injuries) ? p.injuries : [];
        if (p.medicalConditions !== undefined) set.medicalConditions = Array.isArray(p.medicalConditions) ? p.medicalConditions : [];
        if (p.medications !== undefined) set.medications = Array.isArray(p.medications) ? p.medications : [];
        if (p.emergencyContact !== undefined) set.emergencyContact = p.emergencyContact || {};
        if (p.phone !== undefined) set.phone = p.phone || null;
        if (p.bodyFatPct !== undefined) set.bodyFatPct = p.bodyFatPct ? String(p.bodyFatPct) : null;
        if (p.muscleMassKg !== undefined) set.muscleMassKg = p.muscleMassKg ? String(p.muscleMassKg) : null;
        if (p.preferredTrainingTime !== undefined) set.preferredTrainingTime = p.preferredTrainingTime || null;
        // Upsert
        await db
          .insert(sportProfiles)
          .values({ userId: auth.user.id, role: "trainee", ...set } as typeof sportProfiles.$inferInsert)
          .onConflictDoUpdate({ target: sportProfiles.userId, set });
        // Recalculate completion
        const [updated] = await db.select().from(sportProfiles).where(eq(sportProfiles.userId, auth.user.id)).limit(1);
        const traineeFields = [
          updated.displayName, updated.sex, updated.birthDate,
          updated.heightCm, updated.weightKg, updated.goal,
          updated.activityLevel, updated.avatarUrl, updated.fitnessLevel,
          updated.equipmentAccess, updated.daysPerWeek, updated.phone,
          updated.bodyFatPct, updated.muscleMassKg, updated.preferredTrainingTime,
        ];
        const medicalFields = [
          (updated.injuries as unknown[])?.length > 0 ? "filled" : null,
          (updated.medicalConditions as unknown[])?.length > 0 ? "filled" : null,
          (updated.medications as unknown[])?.length > 0 ? "filled" : null,
          (updated.emergencyContact as Record<string, unknown>)?.name ? "filled" : null,
        ];
        const allFields = [...traineeFields, ...medicalFields];
        const filled = allFields.filter((f) => f !== null && f !== undefined && f !== "").length;
        const completion = Math.round((filled / allFields.length) * 100);
        await db.update(sportProfiles).set({ profileCompletion: completion }).where(eq(sportProfiles.userId, auth.user.id));
        return NextResponse.json({ success: true, completion, data: { ...updated, profileCompletion: completion } });
      }

      case "generate-training-plan": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const { goal, fitnessLevel, daysPerWeek, equipmentAccess, heightCm, weightKg, age, sex } = body;
        // Import training plan engine
        const { generateTrainingPlan } = await import("@/lib/sport/training-plan-engine");
        // Check for medical data from sport_lab_results
        const labResults = await db
          .select()
          .from(sportLabResults)
          .where(eq(sportLabResults.userId, auth.user.id))
          .orderBy(desc(sportLabResults.createdAt))
          .limit(5);
        // Build medical context
        const medicalContext: any[] = [];
        for (const lab of labResults) {
          const results = lab.results as any;
          if (results?.hemoglobin && parseFloat(results.hemoglobin) < 12) {
            medicalContext.push({ condition: "Low Iron/Hemoglobin", conditionAr: "\u0646\u0642\u0635 \u0627\u0644\u062d\u062f\u064a\u062f", severity: "moderate", adjustment: "Reduce high-intensity endurance", adjustmentAr: "\u062a\u0642\u0644\u064a\u0644 \u062a\u0645\u0627\u0631\u064a\u0646 \u0627\u0644\u062a\u062d\u0645\u0644 \u0627\u0644\u0645\u0643\u062b\u0641\u0629" });
          }
          if (results?.vitaminD && parseFloat(results.vitaminD) < 20) {
            medicalContext.push({ condition: "Vitamin D Deficiency", conditionAr: "\u0646\u0642\u0635 \u0641\u064a\u062a\u0627\u0645\u064a\u0646 \u062f", severity: "moderate", adjustment: "Focus on joint strengthening, reduce heavy loads", adjustmentAr: "\u0627\u0644\u062a\u0631\u0643\u064a\u0632 \u0639\u0644\u0649 \u062a\u0642\u0648\u064a\u0629 \u0627\u0644\u0645\u0641\u0627\u0635\u0644 \u0648\u062a\u062e\u0641\u064a\u0641 \u0627\u0644\u0623\u0648\u0632\u0627\u0646" });
          }
        }
        // Generate plan
        const planResult = generateTrainingPlan({
          goal: goal || "general_fitness",
          fitnessLevel: fitnessLevel || "beginner",
          daysPerWeek: daysPerWeek || 4,
          equipmentAccess: equipmentAccess || "full_gym",
          sex: sex || "male",
          age: age || 25,
          weightKg: weightKg || 75,
          heightCm: heightCm || 175,
        });
        // Save plan to DB
        const [newPlan] = await db.insert(sportTrainingPlans).values({
          userId: auth.user.id,
          title: planResult.title,
          goal: goal || "general_fitness",
          durationWeeks: planResult.durationWeeks,
          daysPerWeek: planResult.daysPerWeek,
          equipmentAccess: equipmentAccess || "full_gym",
          currentWeek: 1,
          status: "active",
          medicalAdjustments: [...medicalContext, ...planResult.medicalAdjustments],
          planStructure: {
            splitName: planResult.split.name,
            splitNameAr: planResult.split.nameAr,
            phases: planResult.phases,
            fitnessLevel,
            sex,
          },
        }).returning();
        // Generate workouts for all weeks of the plan
        const workoutInserts: any[] = [];
        for (let week = 1; week <= planResult.durationWeeks; week++) {
          for (const day of planResult.weeklySchedule) {
            workoutInserts.push({
              planId: newPlan.id,
              userId: auth.user.id,
              weekNumber: week,
              dayNumber: day.dayNumber,
              title: day.title,
              targetMuscles: day.targetMuscles,
              exercises: day.exercises,
              status: "pending",
            });
          }
        }
        if (workoutInserts.length > 0) {
          // Insert in batches of 50 to avoid oversized queries
          for (let i = 0; i < workoutInserts.length; i += 50) {
            await db.insert(sportWorkouts).values(workoutInserts.slice(i, i + 50));
          }
        }
        return NextResponse.json({ success: true, planId: newPlan.id });
      }

      case "save-training-session": {
        const auth = await requireSessionApi();
        if ("response" in auth) return auth.response;
        const { workoutId, exercises, durationSeconds, moodRating, totalVolume, totalSets, caloriesBurned } = body;
        // Create session record
        const [session] = await db.insert(sportWorkoutSessions).values({
          workoutId: workoutId || null,
          userId: auth.user.id,
          durationSeconds: durationSeconds || 0,
          totalVolume: String(totalVolume || 0),
          totalSets: totalSets || 0,
          caloriesBurned: caloriesBurned || 0,
          moodRating: moodRating || 3,
          status: "completed",
          endedAt: new Date(),
        }).returning();
        // Save exercise logs and sets
        if (exercises && Array.isArray(exercises)) {
          for (const ex of exercises) {
            const [exLog] = await db.insert(sportSessionExercises).values({
              sessionId: session.id,
              exerciseName: ex.name || "Unknown",
              exerciseOrder: ex.order || 0,
            }).returning();
            if (ex.sets && Array.isArray(ex.sets)) {
              for (const set of ex.sets) {
                await db.insert(sportSessionSets).values({
                  sessionExerciseId: exLog.id,
                  setNumber: set.setNumber || 1,
                  weightKg: set.weightKg ? String(set.weightKg) : null,
                  reps: set.reps || 0,
                  rpe: set.rpe || null,
                  restTakenSeconds: set.restTaken || null,
                  completed: set.completed !== false,
                });
              }
            }
          }
        }
        // Mark workout as completed if workoutId provided
        if (workoutId) {
          await db.update(sportWorkouts).set({ status: "completed", completedAt: new Date() }).where(eq(sportWorkouts.id, workoutId));
        }
        return NextResponse.json({ success: true, sessionId: session.id });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              "Unknown action. Available POST: bio-age, food-log, activity-log, coach-plan, program-save, medical-bridge-link, medical-bridge-consent, coach-add-client, coach-remove-client, body-measurement, lab-result, mark-notifications-read, coach-profile-save, coach-cert-add, coach-cert-remove, coach-submit-verification, admin-verify-decision, request-coach, respond-coach-request, coach-review, trainee-profile-save, update-sport-profile, generate-training-plan, save-training-session",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[MediSport API] POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
