import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getLevelForXp,
  XP_REWARDS,
  calculateStreakUpdate,
  getAdaptation,
  checkEmergencyConditions,
  generateMedicalPrescription,
  generateWeeklyHighlights,
  type Mood,
  type Readiness,
  type LabMarkerInput,
} from "@/lib/sport/journey-engine";

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user || null;
}

// ─── GET ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  switch (action) {
    // ─── Daily Check-in Status ───────────────────────────────────────
    case "today-checkin": {
      const [row] = await db.execute(sql`
        SELECT * FROM sport_daily_checkins 
        WHERE user_id = ${user.id} AND check_date = CURRENT_DATE
      `);
      return NextResponse.json({ checkin: row || null });
    }

    // ─── Streaks ─────────────────────────────────────────────────────
    case "my-streaks": {
      const rows = await db.execute(sql`
        SELECT * FROM sport_streaks WHERE user_id = ${user.id}
      `);
      return NextResponse.json({ streaks: rows });
    }

    // ─── XP & Level ──────────────────────────────────────────────────
    case "my-level": {
      const [row] = await db.execute(sql`
        SELECT * FROM sport_user_xp WHERE user_id = ${user.id}
      `);
      if (!row) {
        const level = getLevelForXp(0);
        return NextResponse.json({ level });
      }
      const level = getLevelForXp((row as any).total_xp || 0);
      return NextResponse.json({ level, xpHistory: (row as any).xp_history || [] });
    }

    // ─── Achievements ────────────────────────────────────────────────
    case "my-achievements": {
      const earned = await db.execute(sql`
        SELECT a.*, ua.earned_at FROM sport_achievements a
        INNER JOIN sport_user_achievements ua ON ua.achievement_id = a.id
        WHERE ua.user_id = ${user.id}
        ORDER BY ua.earned_at DESC
      `);
      const all = await db.execute(sql`
        SELECT * FROM sport_achievements ORDER BY category, tier
      `);
      return NextResponse.json({ earned, all });
    }

    // ─── Journey Timeline ────────────────────────────────────────────
    case "timeline": {
      const page = parseInt(searchParams.get("page") || "1");
      const limit = 20;
      const offset = (page - 1) * limit;
      const events = await db.execute(sql`
        SELECT * FROM sport_journey_events 
        WHERE user_id = ${user.id}
        ORDER BY event_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      const [countRow] = await db.execute(sql`
        SELECT COUNT(*) as total FROM sport_journey_events WHERE user_id = ${user.id}
      `);
      return NextResponse.json({ events, total: (countRow as any)?.total || 0, page });
    }

    // ─── Journey Goals ───────────────────────────────────────────────
    case "my-goals": {
      const goals = await db.execute(sql`
        SELECT * FROM sport_journey_goals 
        WHERE user_id = ${user.id} AND status = 'active'
        ORDER BY created_at DESC
      `);
      return NextResponse.json({ goals });
    }

    // ─── Weekly Reports ──────────────────────────────────────────────
    case "weekly-reports": {
      const reports = await db.execute(sql`
        SELECT * FROM sport_weekly_reports 
        WHERE user_id = ${user.id}
        ORDER BY week_start DESC
        LIMIT 12
      `);
      return NextResponse.json({ reports });
    }

    // ─── Emergency Alerts ────────────────────────────────────────────
    case "active-alerts": {
      const alerts = await db.execute(sql`
        SELECT * FROM sport_emergency_alerts 
        WHERE user_id = ${user.id} AND resolved_at IS NULL
        ORDER BY created_at DESC
      `);
      return NextResponse.json({ alerts });
    }

    // ─── Medical Prescriptions ───────────────────────────────────────
    case "my-prescriptions": {
      const prescriptions = await db.execute(sql`
        SELECT * FROM sport_medical_prescriptions 
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 10
      `);
      return NextResponse.json({ prescriptions });
    }

    // ─── Quick Notes ─────────────────────────────────────────────────
    case "my-notes": {
      const notes = await db.execute(sql`
        SELECT * FROM sport_quick_notes 
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 50
      `);
      return NextResponse.json({ notes });
    }

    // ─── Journey Summary (Dashboard) ─────────────────────────────────
    case "journey-summary": {
      const [xpRow] = await db.execute(sql`
        SELECT * FROM sport_user_xp WHERE user_id = ${user.id}
      `);
      const [checkinRow] = await db.execute(sql`
        SELECT * FROM sport_daily_checkins 
        WHERE user_id = ${user.id} AND check_date = CURRENT_DATE
      `);
      const streaks = await db.execute(sql`
        SELECT * FROM sport_streaks WHERE user_id = ${user.id}
      `);
      const [alertCount] = await db.execute(sql`
        SELECT COUNT(*) as count FROM sport_emergency_alerts 
        WHERE user_id = ${user.id} AND resolved_at IS NULL AND training_blocked = true
      `);
      const recentAchievements = await db.execute(sql`
        SELECT a.* FROM sport_achievements a
        INNER JOIN sport_user_achievements ua ON ua.achievement_id = a.id
        WHERE ua.user_id = ${user.id}
        ORDER BY ua.earned_at DESC LIMIT 3
      `);
      const goals = await db.execute(sql`
        SELECT * FROM sport_journey_goals 
        WHERE user_id = ${user.id} AND status = 'active'
        ORDER BY created_at DESC LIMIT 3
      `);

      const totalXp = (xpRow as any)?.total_xp || 0;
      const level = getLevelForXp(totalXp);
      const trainingBlocked = parseInt((alertCount as any)?.count || '0') > 0;

      return NextResponse.json({
        level,
        todayCheckin: checkinRow || null,
        streaks,
        trainingBlocked,
        recentAchievements,
        goals,
      });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = body.action;

  switch (action) {
    // ─── Daily Check-in ──────────────────────────────────────────────
    case "checkin": {
      const { mood, sleepQuality, readiness, energyLevel, stressLevel, sorenessAreas, notes } = body;
      if (!mood || !sleepQuality || !readiness) {
        return NextResponse.json({ error: "mood, sleepQuality, readiness required" }, { status: 400 });
      }

      // Upsert check-in
      await db.execute(sql`
        INSERT INTO sport_daily_checkins (user_id, mood, sleep_quality, readiness, energy_level, stress_level, soreness_areas, notes)
        VALUES (${user.id}, ${mood}, ${sleepQuality}, ${readiness}, ${energyLevel || null}, ${stressLevel || null}, ${JSON.stringify(sorenessAreas || [])}, ${notes || null})
        ON CONFLICT (user_id, check_date) DO UPDATE SET
          mood = EXCLUDED.mood, sleep_quality = EXCLUDED.sleep_quality, readiness = EXCLUDED.readiness,
          energy_level = EXCLUDED.energy_level, stress_level = EXCLUDED.stress_level,
          soreness_areas = EXCLUDED.soreness_areas, notes = EXCLUDED.notes
      `);

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      const [streak] = await db.execute(sql`
        SELECT * FROM sport_streaks WHERE user_id = ${user.id} AND streak_type = 'checkin'
      `);
      if (streak) {
        const update = calculateStreakUpdate((streak as any).last_active_date, (streak as any).current_count, (streak as any).longest_count, today);
        await db.execute(sql`
          UPDATE sport_streaks SET current_count = ${update.currentCount}, longest_count = ${update.longestCount}, last_active_date = ${today}, updated_at = NOW()
          WHERE user_id = ${user.id} AND streak_type = 'checkin'
        `);
      } else {
        await db.execute(sql`
          INSERT INTO sport_streaks (user_id, streak_type, current_count, longest_count, last_active_date, started_at)
          VALUES (${user.id}, 'checkin', 1, 1, ${today}, ${today})
        `);
      }

      // Award XP
      await awardXp(user.id, XP_REWARDS.checkin, 'checkin');

      // Add timeline event
      await db.execute(sql`
        INSERT INTO sport_journey_events (user_id, event_type, title_ar, title_en, description_ar, description_en, icon, color, metadata)
        VALUES (${user.id}, 'checkin', 'تسجيل يومي', 'Daily Check-in', ${`الحالة: ${mood} | النوم: ${sleepQuality}/10`}, ${`Mood: ${mood} | Sleep: ${sleepQuality}/10`}, '🌅', '#10b981', ${JSON.stringify({ mood, sleepQuality, readiness })})
      `);

      // Check achievements
      await checkAndAwardAchievements(user.id);

      // Get day adaptation
      const adaptation = getAdaptation(mood as Mood, sleepQuality, readiness as Readiness);

      return NextResponse.json({ success: true, adaptation });
    }

    // ─── Add Journey Goal ────────────────────────────────────────────
    case "add-goal": {
      const { goalType, targetValue, currentValue, unit, targetDate, notes } = body;
      if (!goalType) return NextResponse.json({ error: "goalType required" }, { status: 400 });

      await db.execute(sql`
        INSERT INTO sport_journey_goals (user_id, goal_type, target_value, current_value, start_value, unit, target_date, notes)
        VALUES (${user.id}, ${goalType}, ${targetValue || null}, ${currentValue || null}, ${currentValue || null}, ${unit || null}, ${targetDate || null}, ${notes || null})
      `);
      return NextResponse.json({ success: true });
    }

    // ─── Update Goal Progress ────────────────────────────────────────
    case "update-goal": {
      const { goalId, currentValue } = body;
      if (!goalId) return NextResponse.json({ error: "goalId required" }, { status: 400 });

      const [goal] = await db.execute(sql`
        SELECT * FROM sport_journey_goals WHERE id = ${goalId} AND user_id = ${user.id}
      `);
      if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

      const g = goal as any;
      const progressPct = g.target_value
        ? Math.min(100, Math.round(Math.abs((currentValue - g.start_value) / (g.target_value - g.start_value)) * 100))
        : 0;
      const status = progressPct >= 100 ? 'achieved' : 'active';

      await db.execute(sql`
        UPDATE sport_journey_goals SET current_value = ${currentValue}, progress_pct = ${progressPct}, status = ${status}, updated_at = NOW()
        WHERE id = ${goalId} AND user_id = ${user.id}
      `);

      if (status === 'achieved') {
        await awardXp(user.id, XP_REWARDS.goal_achieved, 'goal_achieved');
        await db.execute(sql`
          INSERT INTO sport_journey_events (user_id, event_type, title_ar, title_en, icon, color, is_milestone, metadata)
          VALUES (${user.id}, 'milestone', 'هدف محقق! 🎉', 'Goal Achieved! 🎉', '🏆', '#f59e0b', true, ${JSON.stringify({ goalType: g.goal_type, targetValue: g.target_value })})
        `);
      }

      return NextResponse.json({ success: true, progressPct, status });
    }

    // ─── Quick Note ──────────────────────────────────────────────────
    case "quick-note": {
      const { noteType, content } = body;
      if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

      await db.execute(sql`
        INSERT INTO sport_quick_notes (user_id, note_type, content)
        VALUES (${user.id}, ${noteType || 'general'}, ${content})
      `);
      return NextResponse.json({ success: true });
    }

    // ─── Emergency Check ─────────────────────────────────────────────
    case "emergency-check": {
      const { readings } = body; // {systolic_bp: 180, blood_glucose: 400, ...}
      if (!readings) return NextResponse.json({ error: "readings required" }, { status: 400 });

      const alerts = checkEmergencyConditions(readings);
      for (const alert of alerts) {
        await db.execute(sql`
          INSERT INTO sport_emergency_alerts (user_id, alert_type, severity, title_ar, title_en, message_ar, message_en, trigger_data, training_blocked)
          VALUES (${user.id}, ${alert.marker}, ${alert.severity}, ${alert.titleAr}, ${alert.titleEn}, ${alert.messageAr}, ${alert.messageEn}, ${JSON.stringify({ [alert.marker]: alert.value })}, ${alert.blockTraining})
        `);
      }

      const trainingBlocked = alerts.some(a => a.blockTraining);
      return NextResponse.json({ alerts, trainingBlocked });
    }

    // ─── Resolve Emergency Alert ─────────────────────────────────────
    case "resolve-alert": {
      const { alertId, actionTaken } = body;
      await db.execute(sql`
        UPDATE sport_emergency_alerts SET resolved_at = NOW(), action_taken = ${actionTaken || 'acknowledged'}
        WHERE id = ${alertId} AND user_id = ${user.id}
      `);
      return NextResponse.json({ success: true });
    }

    // ─── Generate Medical Prescription ───────────────────────────────
    case "generate-prescription": {
      const { labResultId, markers } = body as { labResultId?: string; markers: LabMarkerInput[] };
      if (!markers || !markers.length) return NextResponse.json({ error: "markers required" }, { status: 400 });

      const conditions = generateMedicalPrescription(markers);
      if (conditions.length === 0) {
        return NextResponse.json({ message: "All markers within normal range", prescription: null });
      }

      // Calculate restrictions
      const hasAnyCritical = conditions.some(c => c.status === 'critical_low' || c.status === 'critical_high');
      const maxIntensity = hasAnyCritical ? 50 : conditions.length > 3 ? 70 : 85;
      const maxDays = hasAnyCritical ? 3 : conditions.length > 3 ? 4 : 6;

      await db.execute(sql`
        INSERT INTO sport_medical_prescriptions (user_id, lab_result_id, conditions, max_intensity_pct, max_days_per_week)
        VALUES (${user.id}, ${labResultId || null}, ${JSON.stringify(conditions)}, ${maxIntensity}, ${maxDays})
      `);

      // Add timeline event
      await db.execute(sql`
        INSERT INTO sport_journey_events (user_id, event_type, title_ar, title_en, icon, color, is_milestone, metadata)
        VALUES (${user.id}, 'medical_rx', 'وصفة رياضية جديدة', 'New Sport Prescription', '📋', '#ef4444', true, ${JSON.stringify({ conditions: conditions.length, maxIntensity })})
      `);

      return NextResponse.json({
        prescription: { conditions, maxIntensity, maxDays },
      });
    }

    // ─── Generate Weekly Report ──────────────────────────────────────
    case "generate-weekly-report": {
      const weekStart = body.weekStart || getLastSunday();
      const weekEnd = body.weekEnd || getNextSaturday(weekStart);

      // Gather data for the week
      const [workouts] = await db.execute(sql`
        SELECT COUNT(*) as count FROM sport_workout_sessions 
        WHERE user_id = ${user.id} AND started_at >= ${weekStart} AND started_at <= ${weekEnd}
      `);
      const [foodAvg] = await db.execute(sql`
        SELECT AVG(calories) as avg_cal FROM sport_food_logs 
        WHERE user_id = ${user.id} AND logged_at >= ${weekStart} AND logged_at <= ${weekEnd}
      `);
      const [sleepAvg] = await db.execute(sql`
        SELECT AVG(sleep_quality) as avg_sleep FROM sport_daily_checkins 
        WHERE user_id = ${user.id} AND check_date >= ${weekStart} AND check_date <= ${weekEnd}
      `);
      const [streakRow] = await db.execute(sql`
        SELECT current_count FROM sport_streaks WHERE user_id = ${user.id} AND streak_type = 'overall'
      `);

      const input = {
        workoutsCount: parseInt((workouts as any)?.count || '0'),
        avgCaloriesDaily: Math.round(parseFloat((foodAvg as any)?.avg_cal || '0')),
        avgSleepQuality: parseFloat((sleepAvg as any)?.avg_sleep || '0'),
        totalVolumeKg: 0,
        streakDays: (streakRow as any)?.current_count || 0,
        xpEarned: 0,
      };

      const { highlights, recommendations, compliancePct } = generateWeeklyHighlights(input);

      await db.execute(sql`
        INSERT INTO sport_weekly_reports (user_id, week_start, week_end, workouts_count, avg_calories_daily, avg_sleep_quality, streak_days, compliance_pct, highlights, recommendations)
        VALUES (${user.id}, ${weekStart}, ${weekEnd}, ${input.workoutsCount}, ${input.avgCaloriesDaily}, ${input.avgSleepQuality}, ${input.streakDays}, ${compliancePct}, ${JSON.stringify(highlights)}, ${JSON.stringify(recommendations)})
        ON CONFLICT (user_id, week_start) DO UPDATE SET
          workouts_count = EXCLUDED.workouts_count, avg_calories_daily = EXCLUDED.avg_calories_daily,
          avg_sleep_quality = EXCLUDED.avg_sleep_quality, compliance_pct = EXCLUDED.compliance_pct,
          highlights = EXCLUDED.highlights, recommendations = EXCLUDED.recommendations, generated_at = NOW()
      `);

      return NextResponse.json({ report: { ...input, highlights, recommendations, compliancePct } });
    }

    // ─── Award XP (manual trigger for external events) ───────────────
    case "award-xp": {
      const { amount, reason } = body;
      if (!amount || !reason) return NextResponse.json({ error: "amount and reason required" }, { status: 400 });
      await awardXp(user.id, amount, reason);
      const [xpRow] = await db.execute(sql`SELECT * FROM sport_user_xp WHERE user_id = ${user.id}`);
      const level = getLevelForXp((xpRow as any)?.total_xp || 0);
      return NextResponse.json({ success: true, level });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// ─── Helper: Award XP ────────────────────────────────────────────────
async function awardXp(userId: string, amount: number, reason: string) {
  const today = new Date().toISOString().split('T')[0];
  await db.execute(sql`
    INSERT INTO sport_user_xp (user_id, total_xp, xp_history)
    VALUES (${userId}, ${amount}, ${JSON.stringify([{ date: today, amount, reason }])})
    ON CONFLICT (user_id) DO UPDATE SET
      total_xp = sport_user_xp.total_xp + ${amount},
      xp_history = (
        CASE 
          WHEN jsonb_array_length(sport_user_xp.xp_history) > 50 
          THEN sport_user_xp.xp_history - 0 
          ELSE sport_user_xp.xp_history 
        END
      ) || ${JSON.stringify([{ date: today, amount, reason }])}::jsonb,
      updated_at = NOW()
  `);

  // Check level up
  const [row] = await db.execute(sql`SELECT total_xp FROM sport_user_xp WHERE user_id = ${userId}`);
  const totalXp = (row as any)?.total_xp || 0;
  const level = getLevelForXp(totalXp);
  await db.execute(sql`
    UPDATE sport_user_xp SET current_level = ${level.level}, level_title = ${level.title} WHERE user_id = ${userId}
  `);
}

// ─── Helper: Check & Award Achievements ──────────────────────────────
async function checkAndAwardAchievements(userId: string) {
  // Get user's current stats
  const [checkinStreak] = await db.execute(sql`
    SELECT current_count FROM sport_streaks WHERE user_id = ${userId} AND streak_type = 'checkin'
  `);
  const [checkinCount] = await db.execute(sql`
    SELECT COUNT(*) as count FROM sport_daily_checkins WHERE user_id = ${userId}
  `);

  const streakCount = (checkinStreak as any)?.current_count || 0;
  const totalCheckins = parseInt((checkinCount as any)?.count || '0');

  // Check streak-based achievements
  const streakAchievements = [
    { code: 'first_checkin', threshold: 1, type: 'count', value: totalCheckins },
    { code: 'week_warrior', threshold: 7, type: 'streak', value: streakCount },
    { code: 'iron_will', threshold: 30, type: 'streak', value: streakCount },
    { code: 'unstoppable', threshold: 90, type: 'streak', value: streakCount },
  ];

  for (const sa of streakAchievements) {
    if (sa.value >= sa.threshold) {
      // Check if not already earned
      const [existing] = await db.execute(sql`
        SELECT 1 FROM sport_user_achievements ua
        INNER JOIN sport_achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = ${userId} AND a.code = ${sa.code}
      `);
      if (!existing) {
        const [achievement] = await db.execute(sql`
          SELECT id, xp_reward FROM sport_achievements WHERE code = ${sa.code}
        `);
        if (achievement) {
          await db.execute(sql`
            INSERT INTO sport_user_achievements (user_id, achievement_id) VALUES (${userId}, ${(achievement as any).id})
            ON CONFLICT DO NOTHING
          `);
          // Award achievement XP
          if ((achievement as any).xp_reward > 0) {
            await awardXp(userId, (achievement as any).xp_reward, `achievement_${sa.code}`);
          }
        }
      }
    }
  }
}

// ─── Helper: Date Utils ──────────────────────────────────────────────
function getLastSunday() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

function getNextSaturday(sundayStr: string) {
  const d = new Date(sundayStr);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}
