/**
 * MediSport Journey Engine
 * Core business logic for: check-ins, streaks, XP/levels, achievements, emergency mode, weekly reports
 */

// ─── XP & Level System ───────────────────────────────────────────────
export const XP_REWARDS = {
  checkin: 20,
  workout_complete: 50,
  food_log: 15,
  body_measurement: 30,
  lab_upload: 100,
  goal_achieved: 500,
  streak_7: 200,
  streak_30: 500,
  streak_90: 1500,
  pr_broken: 75,
  post_created: 10,
  challenge_joined: 25,
} as const;

export const LEVELS = [
  { level: 1, title: 'rookie', titleAr: 'مبتدئ', titleEn: 'Rookie', minXp: 0 },
  { level: 2, title: 'beginner', titleAr: 'متعلم', titleEn: 'Beginner', minXp: 200 },
  { level: 3, title: 'regular', titleAr: 'منتظم', titleEn: 'Regular', minXp: 500 },
  { level: 4, title: 'dedicated', titleAr: 'ملتزم', titleEn: 'Dedicated', minXp: 1000 },
  { level: 5, title: 'warrior', titleAr: 'محارب', titleEn: 'Warrior', minXp: 2000 },
  { level: 6, title: 'athlete', titleAr: 'رياضي', titleEn: 'Athlete', minXp: 4000 },
  { level: 7, title: 'champion', titleAr: 'بطل', titleEn: 'Champion', minXp: 7000 },
  { level: 8, title: 'elite', titleAr: 'نخبة', titleEn: 'Elite', minXp: 12000 },
  { level: 9, title: 'master', titleAr: 'أسطورة', titleEn: 'Master', minXp: 20000 },
  { level: 10, title: 'legend', titleAr: 'خالد', titleEn: 'Legend', minXp: 35000 },
] as const;

export function getLevelForXp(totalXp: number) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXp >= lvl.minXp) current = lvl;
    else break;
  }
  const nextLevel = LEVELS.find(l => l.level === current.level + 1);
  const xpForNext = nextLevel ? nextLevel.minXp - totalXp : 0;
  const progressPct = nextLevel
    ? Math.round(((totalXp - current.minXp) / (nextLevel.minXp - current.minXp)) * 100)
    : 100;
  return { ...current, totalXp, xpForNext, progressPct, nextLevel: nextLevel || null };
}

// ─── Emergency Thresholds ────────────────────────────────────────────
export const EMERGENCY_THRESHOLDS = {
  systolic_bp: { warning: 140, critical: 160, emergency: 180 },
  diastolic_bp: { warning: 90, critical: 100, emergency: 110 },
  heart_rate_rest: { warning: 100, critical: 120, emergency: 150 },
  blood_glucose: { warning: 200, critical: 300, emergency: 400 },
  blood_glucose_low: { warning: 60, critical: 50, emergency: 40 },
  temperature: { warning: 38.5, critical: 39.5, emergency: 40.5 },
} as const;

export interface EmergencyCheck {
  marker: string;
  value: number;
  severity: 'warning' | 'critical' | 'emergency';
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  blockTraining: boolean;
}

export function checkEmergencyConditions(data: Record<string, number>): EmergencyCheck[] {
  const alerts: EmergencyCheck[] = [];

  if (data.systolic_bp) {
    const v = data.systolic_bp;
    if (v >= EMERGENCY_THRESHOLDS.systolic_bp.emergency) {
      alerts.push({ marker: 'systolic_bp', value: v, severity: 'emergency', titleAr: 'ضغط دم مرتفع جداً', titleEn: 'Dangerously High Blood Pressure', messageAr: 'ضغط الدم الانقباضي وصل لمستوى خطير. توقف عن أي نشاط فوراً واتصل بالطوارئ.', messageEn: 'Systolic BP at dangerous level. Stop all activity immediately and contact emergency services.', blockTraining: true });
    } else if (v >= EMERGENCY_THRESHOLDS.systolic_bp.critical) {
      alerts.push({ marker: 'systolic_bp', value: v, severity: 'critical', titleAr: 'ضغط دم مرتفع', titleEn: 'High Blood Pressure', messageAr: 'ضغط الدم مرتفع بشكل ملحوظ. لا تتمرن حتى تستشير طبيبك.', messageEn: 'Blood pressure significantly elevated. Do not exercise until consulting your doctor.', blockTraining: true });
    } else if (v >= EMERGENCY_THRESHOLDS.systolic_bp.warning) {
      alerts.push({ marker: 'systolic_bp', value: v, severity: 'warning', titleAr: 'ضغط دم مرتفع قليلاً', titleEn: 'Slightly Elevated BP', messageAr: 'ضغط الدم أعلى من الطبيعي. تمارين خفيفة فقط.', messageEn: 'Blood pressure above normal. Light exercises only.', blockTraining: false });
    }
  }

  if (data.blood_glucose) {
    const v = data.blood_glucose;
    if (v >= EMERGENCY_THRESHOLDS.blood_glucose.emergency) {
      alerts.push({ marker: 'blood_glucose', value: v, severity: 'emergency', titleAr: 'سكر مرتفع جداً', titleEn: 'Dangerously High Blood Sugar', messageAr: 'مستوى السكر في الدم خطير. توقف فوراً واطلب المساعدة الطبية.', messageEn: 'Blood glucose at dangerous level. Stop immediately and seek medical help.', blockTraining: true });
    } else if (v >= EMERGENCY_THRESHOLDS.blood_glucose.critical) {
      alerts.push({ marker: 'blood_glucose', value: v, severity: 'critical', titleAr: 'سكر مرتفع', titleEn: 'High Blood Sugar', messageAr: 'مستوى السكر مرتفع. لا تتمرن بشدة عالية.', messageEn: 'Blood glucose elevated. Avoid high-intensity exercise.', blockTraining: true });
    }
    if (v <= EMERGENCY_THRESHOLDS.blood_glucose_low.emergency && v > 0) {
      alerts.push({ marker: 'blood_glucose_low', value: v, severity: 'emergency', titleAr: 'انخفاض حاد في السكر', titleEn: 'Severe Hypoglycemia', messageAr: 'مستوى السكر منخفض جداً. تناول سكريات فوراً واطلب المساعدة.', messageEn: 'Blood glucose critically low. Consume sugar immediately and seek help.', blockTraining: true });
    } else if (v <= EMERGENCY_THRESHOLDS.blood_glucose_low.critical && v > 0) {
      alerts.push({ marker: 'blood_glucose_low', value: v, severity: 'critical', titleAr: 'سكر منخفض', titleEn: 'Low Blood Sugar', messageAr: 'مستوى السكر منخفض. تناول وجبة خفيفة قبل التمرين.', messageEn: 'Blood glucose low. Have a snack before exercising.', blockTraining: true });
    }
  }

  if (data.heart_rate_rest) {
    const v = data.heart_rate_rest;
    if (v >= EMERGENCY_THRESHOLDS.heart_rate_rest.emergency) {
      alerts.push({ marker: 'heart_rate_rest', value: v, severity: 'emergency', titleAr: 'نبض قلب سريع جداً', titleEn: 'Dangerously High Resting Heart Rate', messageAr: 'نبض القلب أثناء الراحة مرتفع جداً. استشر طبيبك فوراً.', messageEn: 'Resting heart rate dangerously high. Consult your doctor immediately.', blockTraining: true });
    } else if (v >= EMERGENCY_THRESHOLDS.heart_rate_rest.critical) {
      alerts.push({ marker: 'heart_rate_rest', value: v, severity: 'critical', titleAr: 'نبض قلب سريع', titleEn: 'High Resting Heart Rate', messageAr: 'نبض القلب مرتفع أثناء الراحة. تجنب التمارين المكثفة.', messageEn: 'Resting heart rate elevated. Avoid intense exercise.', blockTraining: true });
    }
  }

  if (data.temperature) {
    const v = data.temperature;
    if (v >= EMERGENCY_THRESHOLDS.temperature.emergency) {
      alerts.push({ marker: 'temperature', value: v, severity: 'emergency', titleAr: 'حرارة مرتفعة جداً', titleEn: 'Dangerously High Temperature', messageAr: 'درجة الحرارة خطيرة. اطلب المساعدة الطبية فوراً.', messageEn: 'Temperature at dangerous level. Seek medical help immediately.', blockTraining: true });
    } else if (v >= EMERGENCY_THRESHOLDS.temperature.critical) {
      alerts.push({ marker: 'temperature', value: v, severity: 'critical', titleAr: 'حمّى', titleEn: 'Fever', messageAr: 'لديك حمّى. لا تتمرن حتى تنخفض الحرارة.', messageEn: 'You have a fever. Do not exercise until temperature drops.', blockTraining: true });
    }
  }

  return alerts;
}

// ─── Streak Logic ────────────────────────────────────────────────────
export function calculateStreakUpdate(lastActiveDate: string | null, currentCount: number, longestCount: number, today: string) {
  if (!lastActiveDate) {
    return { currentCount: 1, longestCount: Math.max(1, longestCount), continued: false };
  }
  const last = new Date(lastActiveDate);
  const now = new Date(today);
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Same day — no change
    return { currentCount, longestCount, continued: true };
  } else if (diffDays === 1) {
    // Consecutive day
    const newCount = currentCount + 1;
    return { currentCount: newCount, longestCount: Math.max(newCount, longestCount), continued: true };
  } else {
    // Streak broken
    return { currentCount: 1, longestCount, continued: false };
  }
}

// ─── Check-in Adaptive Plan ──────────────────────────────────────────
export type Mood = 'energetic' | 'normal' | 'tired' | 'injured';
export type Readiness = 'yes' | 'no' | 'half';

export interface DayAdaptation {
  intensityMultiplier: number; // 0.0 to 1.5
  suggestedActivity: string;
  suggestedActivityAr: string;
  messageAr: string;
  messageEn: string;
}

export function getAdaptation(mood: Mood, sleepQuality: number, readiness: Readiness): DayAdaptation {
  // Injured — full stop
  if (mood === 'injured') {
    return {
      intensityMultiplier: 0,
      suggestedActivity: 'rest',
      suggestedActivityAr: 'راحة تامة',
      messageAr: 'جسمك يحتاج راحة. ركّز على التعافي والتمدد الخفيف فقط.',
      messageEn: 'Your body needs rest. Focus on recovery and light stretching only.',
    };
  }

  // Tired + bad sleep + not ready
  if (mood === 'tired' && sleepQuality <= 4 && readiness === 'no') {
    return {
      intensityMultiplier: 0.3,
      suggestedActivity: 'light_stretching',
      suggestedActivityAr: 'تمدد خفيف + مشي',
      messageAr: 'يوم خفيف اليوم. تمدد ومشي فقط — بكرة هنرجع أقوى.',
      messageEn: 'Light day today. Stretching and walking only — tomorrow we come back stronger.',
    };
  }

  // Tired but somewhat ready
  if (mood === 'tired') {
    return {
      intensityMultiplier: 0.5,
      suggestedActivity: 'light_workout',
      suggestedActivityAr: 'تمرين خفيف',
      messageAr: 'تمرين خفيف اليوم. خفّف الأوزان وزوّد الراحة بين المجموعات.',
      messageEn: 'Light workout today. Reduce weights and increase rest between sets.',
    };
  }

  // Normal mood
  if (mood === 'normal') {
    if (readiness === 'yes' && sleepQuality >= 7) {
      return {
        intensityMultiplier: 1.0,
        suggestedActivity: 'full_workout',
        suggestedActivityAr: 'تمرين كامل',
        messageAr: 'يوم ممتاز! جاهز للتمرين الكامل. يلا نبدأ!',
        messageEn: 'Great day! Ready for full workout. Let\'s go!',
      };
    }
    return {
      intensityMultiplier: 0.8,
      suggestedActivity: 'moderate_workout',
      suggestedActivityAr: 'تمرين متوسط',
      messageAr: 'تمرين متوسط اليوم. حافظ على الأداء الجيد.',
      messageEn: 'Moderate workout today. Maintain good form.',
    };
  }

  // Energetic!
  if (readiness === 'yes' && sleepQuality >= 8) {
    return {
      intensityMultiplier: 1.2,
      suggestedActivity: 'push_harder',
      suggestedActivityAr: 'ادفع أكثر! 🔥',
      messageAr: 'طاقتك عالية اليوم! وقت نكسر رقم شخصي جديد!',
      messageEn: 'Energy is high today! Time to break a new PR!',
    };
  }
  return {
    intensityMultiplier: 1.0,
    suggestedActivity: 'full_workout',
    suggestedActivityAr: 'تمرين كامل',
    messageAr: 'جاهز ومستعد! يلا نبدأ التمرين.',
    messageEn: 'Ready and set! Let\'s start the workout.',
  };
}

// ─── Medical Prescription Generator ─────────────────────────────────
export interface LabMarkerInput {
  name: string;
  value: number;
  unit: string;
}

export interface PrescriptionItem {
  marker: string;
  value: number;
  status: 'low' | 'high' | 'critical_low' | 'critical_high' | 'normal';
  recommendationAr: string;
  recommendationEn: string;
}

const MARKER_RANGES: Record<string, { low: number; high: number; criticalLow?: number; criticalHigh?: number; unit: string }> = {
  hemoglobin: { low: 12, high: 17, criticalLow: 8, criticalHigh: 20, unit: 'g/dL' },
  ferritin: { low: 30, high: 300, criticalLow: 10, unit: 'ng/mL' },
  'vitamin d': { low: 30, high: 100, criticalLow: 10, unit: 'ng/mL' },
  testosterone: { low: 300, high: 1000, criticalLow: 150, unit: 'ng/dL' },
  cortisol: { low: 5, high: 25, criticalHigh: 40, unit: 'µg/dL' },
  crp: { low: 0, high: 3, criticalHigh: 10, unit: 'mg/L' },
  hba1c: { low: 4, high: 5.7, criticalHigh: 9, unit: '%' },
  cholesterol: { low: 0, high: 200, criticalHigh: 300, unit: 'mg/dL' },
  ldl: { low: 0, high: 130, criticalHigh: 190, unit: 'mg/dL' },
  tsh: { low: 0.4, high: 4.0, criticalLow: 0.1, criticalHigh: 10, unit: 'mIU/L' },
  iron: { low: 60, high: 170, criticalLow: 30, unit: 'µg/dL' },
  b12: { low: 200, high: 900, criticalLow: 100, unit: 'pg/mL' },
  potassium: { low: 3.5, high: 5.0, criticalLow: 2.5, criticalHigh: 6.5, unit: 'mEq/L' },
  sodium: { low: 136, high: 145, criticalLow: 120, criticalHigh: 160, unit: 'mEq/L' },
  calcium: { low: 8.5, high: 10.5, criticalLow: 7.0, criticalHigh: 12.0, unit: 'mg/dL' },
};

const MARKER_RECOMMENDATIONS: Record<string, { lowAr: string; lowEn: string; highAr: string; highEn: string }> = {
  hemoglobin: { lowAr: 'تقليل شدة تمارين التحمل. زيادة الأطعمة الغنية بالحديد. فحص مصدر النقص.', lowEn: 'Reduce endurance intensity. Increase iron-rich foods. Investigate deficiency source.', highAr: 'زيادة شرب الماء. مراقبة مستوى الأكسجين أثناء التمرين.', highEn: 'Increase hydration. Monitor oxygen levels during exercise.' },
  ferritin: { lowAr: 'تقليل حجم تمارين التحمل 20%. إضافة مكملات الحديد مع فيتامين C.', lowEn: 'Reduce endurance volume by 20%. Add iron supplements with Vitamin C.', highAr: 'تجنب مكملات الحديد. فحص أسباب الارتفاع.', highEn: 'Avoid iron supplements. Investigate causes of elevation.' },
  'vitamin d': { lowAr: '20 دقيقة مشي في الشمس يومياً. مكمل فيتامين D3 (2000-5000 IU).', lowEn: '20 minutes of sun exposure daily. Vitamin D3 supplement (2000-5000 IU).', highAr: 'إيقاف مكملات فيتامين D. مراجعة الطبيب.', highEn: 'Stop Vitamin D supplements. Consult doctor.' },
  testosterone: { lowAr: 'تمارين مقاومة ثقيلة (compound). نوم 7-9 ساعات. تقليل التوتر.', lowEn: 'Heavy compound resistance training. Sleep 7-9 hours. Reduce stress.', highAr: 'مراجعة الطبيب. فحص الغدة الكظرية.', highEn: 'Consult doctor. Check adrenal function.' },
  cortisol: { lowAr: 'مراجعة الطبيب. تقليل شدة التمارين مؤقتاً.', lowEn: 'Consult doctor. Temporarily reduce exercise intensity.', highAr: 'تقليل HIIT. زيادة Yoga والتأمل. تحسين النوم.', highEn: 'Reduce HIIT. Increase Yoga and meditation. Improve sleep.' },
  crp: { lowAr: 'مؤشر جيد — لا التهاب.', lowEn: 'Good indicator — no inflammation.', highAr: 'تقليل شدة التمارين. زيادة أيام الراحة. أطعمة مضادة للالتهاب.', highEn: 'Reduce exercise intensity. Increase rest days. Anti-inflammatory foods.' },
  hba1c: { lowAr: 'مراقبة السكر أثناء التمرين. وجبة قبل التمرين.', lowEn: 'Monitor glucose during exercise. Pre-workout meal.', highAr: 'تمارين هوائية 150 دقيقة/أسبوع. تقليل الكربوهيدرات المكررة.', highEn: '150 min/week aerobic exercise. Reduce refined carbs.' },
  cholesterol: { lowAr: 'مستوى طبيعي.', lowEn: 'Normal level.', highAr: '150 دقيقة/أسبوع تمارين هوائية. تقليل الدهون المشبعة.', highEn: '150 min/week aerobic exercise. Reduce saturated fats.' },
  ldl: { lowAr: 'مستوى طبيعي.', lowEn: 'Normal level.', highAr: 'زيادة تمارين Cardio. تقليل الدهون المشبعة والمقلية.', highEn: 'Increase cardio. Reduce saturated and fried fats.' },
};

export function generateMedicalPrescription(markers: LabMarkerInput[]): PrescriptionItem[] {
  const items: PrescriptionItem[] = [];
  for (const m of markers) {
    const key = m.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const range = MARKER_RANGES[key];
    const recs = MARKER_RECOMMENDATIONS[key];
    if (!range || !recs) continue;

    let status: PrescriptionItem['status'] = 'normal';
    if (range.criticalLow && m.value <= range.criticalLow) status = 'critical_low';
    else if (m.value < range.low) status = 'low';
    else if (range.criticalHigh && m.value >= range.criticalHigh) status = 'critical_high';
    else if (m.value > range.high) status = 'high';

    if (status === 'normal') continue;

    const isLow = status === 'low' || status === 'critical_low';
    items.push({
      marker: m.name,
      value: m.value,
      status,
      recommendationAr: isLow ? recs.lowAr : recs.highAr,
      recommendationEn: isLow ? recs.lowEn : recs.highEn,
    });
  }
  return items;
}

// ─── Weekly Report Generator ─────────────────────────────────────────
export interface WeeklyReportInput {
  workoutsCount: number;
  avgCaloriesDaily: number;
  avgSleepQuality: number;
  totalVolumeKg: number;
  streakDays: number;
  xpEarned: number;
  prevWeek?: {
    workoutsCount: number;
    avgCaloriesDaily: number;
    avgSleepQuality: number;
    totalVolumeKg: number;
  };
}

export function generateWeeklyHighlights(input: WeeklyReportInput) {
  const highlights: { type: string; textAr: string; textEn: string }[] = [];
  const recommendations: { textAr: string; textEn: string; priority: 'high' | 'medium' | 'low' }[] = [];

  // Highlights
  if (input.workoutsCount >= 5) {
    highlights.push({ type: 'training', textAr: `أسبوع ممتاز! ${input.workoutsCount} جلسات تدريب`, textEn: `Excellent week! ${input.workoutsCount} training sessions` });
  }
  if (input.streakDays >= 7) {
    highlights.push({ type: 'streak', textAr: `🔥 ${input.streakDays} أيام متتالية!`, textEn: `🔥 ${input.streakDays} day streak!` });
  }
  if (input.prevWeek && input.totalVolumeKg > input.prevWeek.totalVolumeKg) {
    const diff = Math.round(input.totalVolumeKg - input.prevWeek.totalVolumeKg);
    highlights.push({ type: 'progress', textAr: `حجم التدريب زاد ${diff} كجم عن الأسبوع الماضي`, textEn: `Training volume increased by ${diff}kg vs last week` });
  }

  // Recommendations
  if (input.workoutsCount < 3) {
    recommendations.push({ textAr: 'حاول تتمرن 3 مرات على الأقل الأسبوع الجاي', textEn: 'Try to train at least 3 times next week', priority: 'high' });
  }
  if (input.avgSleepQuality < 6) {
    recommendations.push({ textAr: 'جودة النوم منخفضة — حاول تنام أبكر', textEn: 'Sleep quality is low — try sleeping earlier', priority: 'high' });
  }
  if (input.avgCaloriesDaily > 0 && input.avgCaloriesDaily < 1500) {
    recommendations.push({ textAr: 'السعرات قليلة جداً — تأكد إنك تاكل كفاية', textEn: 'Calories too low — make sure you are eating enough', priority: 'medium' });
  }

  const compliancePct = Math.min(100, Math.round((input.workoutsCount / 5) * 60 + (input.streakDays / 7) * 40));

  return { highlights, recommendations, compliancePct };
}
