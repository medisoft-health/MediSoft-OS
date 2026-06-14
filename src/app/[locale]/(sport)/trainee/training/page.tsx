"use client";

/**
 * MediSport — Trainee Training Dashboard
 * 
 * Main training hub for the virtual coach experience:
 * - Current plan overview (phases, progress)
 * - Today's workout with "Start Session" button
 * - Weekly calendar view
 * - Session history with stats
 * - Medical adjustments display
 * - Progressive overload suggestions
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth-client";
import LiveSession, { type SessionSummary } from "@/components/sport/live-session";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface TrainingPlan {
  id: string;
  title: string;
  titleAr: string;
  goal: string;
  durationWeeks: number;
  currentWeek: number;
  daysPerWeek: number;
  splitName: string;
  splitNameAr: string;
  phases: { name: string; nameAr: string; weeks: [number, number]; intensity: number }[];
  medicalAdjustments: { condition: string; conditionAr: string; severity: string; adjustmentAr: string }[];
}

interface TodayWorkout {
  dayNumber: number;
  title: string;
  titleAr: string;
  targetMuscles: string[];
  exercises: {
    id?: string;
    name: string;
    nameAr?: string;
    gifUrl?: string;
    videoUrl?: string;
    sets: number;
    repMin: number;
    repMax: number;
    restSeconds: number;
    order: number;
    previousBest?: { weight: number; reps: number }[];
  }[];
  estimatedDuration: number; // minutes
}

interface SessionHistory {
  id: string;
  date: string;
  workoutTitle: string;
  workoutTitleAr: string;
  durationMinutes: number;
  totalVolume: number;
  totalSets: number;
  personalRecords: number;
  moodRating: number;
}

interface WeekDay {
  dayNumber: number;
  dayName: string;
  dayNameAr: string;
  isToday: boolean;
  isCompleted: boolean;
  isRest: boolean;
  workoutTitle?: string;
  workoutTitleAr?: string;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const t = useTranslations("SportTraining");
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [locale, setLocale] = useState("ar");
  const isRTL = locale === "ar";

  // State
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<TodayWorkout | null>(null);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "plan" | "history">("today");
  const [inSession, setInSession] = useState(false);
  const [showPlanCreation, setShowPlanCreation] = useState(false);
  const [progressionTips, setProgressionTips] = useState<{ exercise: string; tip: string; tipAr: string }[]>([]);

  // Detect locale from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      setLocale(path.includes("/ar/") ? "ar" : "en");
    }
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace(`/${locale}/auth`);
    }
  }, [isPending, session, locale, router]);

  // Fetch training data
  useEffect(() => {
    if (session?.user) {
      fetchTrainingData();
    }
  }, [session]);

  const fetchTrainingData = async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/sport?action=my-training-plan");
      if (res.ok) {
        const data = await res.json();
        if (data.plan) {
          setPlan(data.plan);
          setTodayWorkout(data.todayWorkout);
          setWeekDays(data.weekDays || []);
          setHistory(data.history || []);
          setProgressionTips(data.progressionTips || []);
        } else {
          setShowPlanCreation(true);
        }
      } else {
        setShowPlanCreation(true);
      }
    } catch (err) {
      console.error("Failed to fetch training data:", err);
      setShowPlanCreation(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch previous best data for exercises before starting session
  const startSession = useCallback(async () => {
    if (!todayWorkout) return;
    // Fetch previous best for each exercise
    try {
      const exerciseNames = todayWorkout.exercises.map(e => e.name).join(",");
      const res = await fetch(`/api/sport?action=workout-previous-best&exercises=${encodeURIComponent(exerciseNames)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.previousBests) {
          // Attach previousBest to each exercise
          const enriched = todayWorkout.exercises.map(ex => ({
            ...ex,
            previousBest: data.previousBests[ex.name] || undefined,
          }));
          setTodayWorkout({ ...todayWorkout, exercises: enriched });
        }
      }
    } catch (err) {
      console.error("Failed to fetch previous bests:", err);
    }
    setInSession(true);
  }, [todayWorkout]);

  // Handle session complete
  const handleSessionComplete = useCallback(async (summary: SessionSummary) => {
    setInSession(false);
    // Save session to API
    try {
      await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-training-session", ...summary }),
      });
      // Update progressive overload for each exercise
      for (const exLog of summary.exerciseLogs) {
        const completedSets = exLog.sets.filter(s => s.completed);
        if (completedSets.length > 0) {
          const avgReps = Math.round(completedSets.reduce((sum, s) => sum + (s.reps || 0), 0) / completedSets.length);
          const maxWeight = Math.max(...completedSets.map(s => s.weightKg || 0));
          await fetch("/api/sport", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update-progressive-overload",
              exerciseName: exLog.exerciseName,
              weightKg: maxWeight,
              reps: avgReps,
              sets: completedSets.length,
            }),
          });
        }
      }
      // Refresh data
      fetchTrainingData();
    } catch (err) {
      console.error("Failed to save session:", err);
    }
  }, []);

  // ─── Live Session Mode ───
  if (inSession && todayWorkout) {
    return (
      <LiveSession
        workoutTitle={todayWorkout.title}
        workoutTitleAr={todayWorkout.titleAr}
        exercises={todayWorkout.exercises}
        onSessionComplete={handleSessionComplete}
        onSessionAbandon={() => setInSession(false)}
        locale={locale}
      />
    );
  }

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500">{isRTL ? "جارٍ تحميل خطتك التدريبية..." : "Loading your training plan..."}</p>
        </div>
      </div>
    );
  }

  // ─── No Plan — Show Creation Flow ───
  if (showPlanCreation) {
    return <PlanCreationFlow locale={locale} onPlanCreated={fetchTrainingData} />;
  }

  // ─── Main Dashboard ───
  return (
    <div className="min-h-screen pb-24" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {isRTL ? "التدريب" : "Training"}
        </h1>
        {plan && (
          <p className="text-sm text-gray-500 mt-1">
            {isRTL ? plan.titleAr : plan.title} — {isRTL ? "الأسبوع" : "Week"} {plan.currentWeek}/{plan.durationWeeks}
          </p>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="px-4 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(["today", "plan", "history"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "today" && (isRTL ? "اليوم" : "Today")}
              {tab === "plan" && (isRTL ? "الخطة" : "Plan")}
              {tab === "history" && (isRTL ? "السجل" : "History")}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Today Tab ─── */}
      {activeTab === "today" && (
        <div className="px-4 space-y-4">
          {/* Medical Adjustments Banner */}
          {plan?.medicalAdjustments && plan.medicalAdjustments.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-600">⚕️</span>
                <h3 className="font-medium text-amber-800 text-sm">
                  {isRTL ? "تعديلات طبية مُطبّقة" : "Medical Adjustments Applied"}
                </h3>
              </div>
              <div className="space-y-1">
                {plan.medicalAdjustments.map((adj, i) => (
                  <p key={i} className="text-xs text-amber-700">
                    • {isRTL ? adj.conditionAr : adj.condition}: {isRTL ? adj.adjustmentAr : adj.condition}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Today's Workout Card */}
          {todayWorkout ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-xs">{isRTL ? "تمرين اليوم" : "Today's Workout"}</p>
                    <h2 className="text-xl font-bold mt-1">
                      {isRTL ? todayWorkout.titleAr : todayWorkout.title}
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{todayWorkout.exercises.length}</div>
                    <div className="text-xs text-emerald-100">{isRTL ? "تمرين" : "exercises"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-emerald-100">
                  <span>⏱ ~{todayWorkout.estimatedDuration} {isRTL ? "دقيقة" : "min"}</span>
                  <span>💪 {todayWorkout.targetMuscles.length} {isRTL ? "عضلات" : "muscles"}</span>
                </div>
              </div>

              {/* Exercise list preview */}
              <div className="p-4 space-y-3">
                {todayWorkout.exercises.slice(0, 5).map((ex, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {ex.gifUrl ? (
                        <img src={ex.gifUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">🏋️</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {isRTL ? ex.nameAr || ex.name : ex.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ex.sets} × {ex.repMin}-{ex.repMax}
                      </p>
                    </div>
                  </div>
                ))}
                {todayWorkout.exercises.length > 5 && (
                  <p className="text-xs text-gray-400 text-center">
                    +{todayWorkout.exercises.length - 5} {isRTL ? "تمارين أخرى" : "more exercises"}
                  </p>
                )}
              </div>

              {/* Start Session Button */}
              <div className="p-4 pt-0">
                <button
                  onClick={startSession}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  {isRTL ? "🚀 ابدأ الجلسة" : "🚀 Start Session"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="font-bold text-gray-900">{isRTL ? "يوم راحة!" : "Rest Day!"}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {isRTL ? "جسمك يحتاج التعافي. استمتع بيومك." : "Your body needs recovery. Enjoy your day."}
              </p>
            </div>
          )}

          {/* Weekly Calendar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-medium text-gray-900 mb-3">{isRTL ? "هذا الأسبوع" : "This Week"}</h3>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day, i) => (
                <div
                  key={i}
                  className={`text-center p-2 rounded-lg ${
                    day.isToday
                      ? "bg-emerald-100 border-2 border-emerald-500"
                      : day.isCompleted
                      ? "bg-emerald-50"
                      : day.isRest
                      ? "bg-gray-50"
                      : "bg-white"
                  }`}
                >
                  <div className="text-[10px] text-gray-500">{isRTL ? day.dayNameAr : day.dayName}</div>
                  <div className={`text-lg mt-0.5 ${day.isCompleted ? "" : "opacity-30"}`}>
                    {day.isCompleted ? "✅" : day.isRest ? "😴" : "⚪"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progression Tips */}
          {progressionTips.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span>📈</span>
                {isRTL ? "توصيات التطور" : "Progression Tips"}
              </h3>
              <div className="space-y-2">
                {progressionTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-emerald-500 mt-0.5">↑</span>
                    <div>
                      <span className="font-medium">{tip.exercise}:</span>{" "}
                      <span className="text-gray-600">{isRTL ? tip.tipAr : tip.tip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Plan Tab ─── */}
      {activeTab === "plan" && plan && (
        <div className="px-4 space-y-4">
          {/* Plan overview card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-gray-900">{isRTL ? plan.titleAr : plan.title}</h2>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                {isRTL ? plan.splitNameAr : plan.splitName}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{isRTL ? "التقدم" : "Progress"}</span>
                <span>{Math.round((plan.currentWeek / plan.durationWeeks) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                  style={{ width: `${(plan.currentWeek / plan.durationWeeks) * 100}%` }}
                />
              </div>
            </div>

            {/* Phases timeline */}
            <div className="space-y-2">
              {plan.phases.map((phase, i) => {
                const isCurrent = plan.currentWeek >= phase.weeks[0] && plan.currentWeek <= phase.weeks[1];
                const isPast = plan.currentWeek > phase.weeks[1];
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isCurrent ? "bg-emerald-50 border border-emerald-200" : isPast ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${
                      isCurrent ? "bg-emerald-500 animate-pulse" : isPast ? "bg-emerald-300" : "bg-gray-300"
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isCurrent ? "text-emerald-800" : "text-gray-700"}`}>
                        {isRTL ? phase.nameAr : phase.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isRTL ? "الأسابيع" : "Weeks"} {phase.weeks[0]}-{phase.weeks[1]} • {phase.intensity}% {isRTL ? "شدة" : "intensity"}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                        {isRTL ? "الآن" : "Now"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{plan.daysPerWeek}</div>
              <div className="text-xs text-gray-500">{isRTL ? "أيام/أسبوع" : "days/week"}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{plan.durationWeeks}</div>
              <div className="text-xs text-gray-500">{isRTL ? "أسبوع" : "weeks"}</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── History Tab ─── */}
      {activeTab === "history" && (
        <div className="px-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-500">{isRTL ? "لا توجد جلسات سابقة بعد" : "No sessions yet"}</p>
              <p className="text-xs text-gray-400 mt-1">{isRTL ? "ابدأ أول جلسة تدريبية!" : "Start your first workout!"}</p>
            </div>
          ) : (
            history.map((session, i) => (
              <div key={session.id || i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {isRTL ? session.workoutTitleAr : session.workoutTitle}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(session.date).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}</p>
                  </div>
                  <div className="text-lg">{["😫", "😕", "😐", "😊", "🔥"][session.moodRating - 1] || "😐"}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-sm font-bold text-gray-900">{session.durationMinutes}m</div>
                    <div className="text-[10px] text-gray-400">{isRTL ? "المدة" : "Duration"}</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{(session.totalVolume / 1000).toFixed(1)}t</div>
                    <div className="text-[10px] text-gray-400">{isRTL ? "الحجم" : "Volume"}</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-yellow-600">{session.personalRecords}</div>
                    <div className="text-[10px] text-gray-400">{isRTL ? "أرقام قياسية" : "PRs"}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Plan Creation Flow (inline component)
// ─────────────────────────────────────────────────────────────────

function PlanCreationFlow({ locale, onPlanCreated }: { locale: string; onPlanCreated: () => void }) {
  const isRTL = locale === "ar";
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    goal: "",
    fitnessLevel: "",
    daysPerWeek: 4,
    equipmentAccess: "",
    heightCm: "",
    weightKg: "",
    age: "",
    sex: "",
    injuries: [] as string[],
  });

  const goals = [
    { id: "muscle_gain", icon: "💪", label: "Muscle Building", labelAr: "بناء العضلات" },
    { id: "weight_loss", icon: "🔥", label: "Fat Loss", labelAr: "حرق الدهون" },
    { id: "strength", icon: "🏋️", label: "Strength", labelAr: "القوة" },
    { id: "endurance", icon: "🏃", label: "Endurance", labelAr: "التحمل" },
    { id: "general_fitness", icon: "⚡", label: "General Fitness", labelAr: "لياقة عامة" },
  ];

  const levels = [
    { id: "beginner", icon: "🌱", label: "Beginner", labelAr: "مبتدئ", desc: "< 6 months", descAr: "أقل من 6 أشهر" },
    { id: "intermediate", icon: "🌿", label: "Intermediate", labelAr: "متوسط", desc: "6-24 months", descAr: "6-24 شهراً" },
    { id: "advanced", icon: "🌳", label: "Advanced", labelAr: "متقدم", desc: "2+ years", descAr: "أكثر من سنتين" },
  ];

  const equipment = [
    { id: "full_gym", icon: "🏢", label: "Full Gym", labelAr: "نادي رياضي كامل" },
    { id: "home_gym", icon: "🏠", label: "Home Gym", labelAr: "معدات منزلية" },
    { id: "bodyweight", icon: "🤸", label: "No Equipment", labelAr: "بدون معدات" },
  ];

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-training-plan",
          ...formData,
          heightCm: parseInt(formData.heightCm),
          weightKg: parseInt(formData.weightKg),
          age: parseInt(formData.age),
        }),
      });
      if (res.ok) {
        onPlanCreated();
      }
    } catch (err) {
      console.error("Failed to create plan:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? "bg-emerald-500" : "bg-gray-200"}`} />
        ))}
      </div>

      {/* Step 1: Goal */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{isRTL ? "ما هدفك؟" : "What's your goal?"}</h2>
            <p className="text-sm text-gray-500 mt-1">{isRTL ? "اختر هدفك الرئيسي" : "Choose your primary goal"}</p>
          </div>
          <div className="space-y-3">
            {goals.map(g => (
              <button
                key={g.id}
                onClick={() => { setFormData(prev => ({ ...prev, goal: g.id })); setStep(2); }}
                className={`w-full p-4 rounded-xl border-2 text-start flex items-center gap-4 transition-all ${
                  formData.goal === g.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-3xl">{g.icon}</span>
                <span className="font-medium text-gray-900">{isRTL ? g.labelAr : g.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Level + Equipment */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{isRTL ? "مستوى خبرتك" : "Your Experience"}</h2>
          </div>
          <div className="space-y-3">
            {levels.map(l => (
              <button
                key={l.id}
                onClick={() => setFormData(prev => ({ ...prev, fitnessLevel: l.id }))}
                className={`w-full p-4 rounded-xl border-2 text-start flex items-center gap-4 transition-all ${
                  formData.fitnessLevel === l.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">{l.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{isRTL ? l.labelAr : l.label}</p>
                  <p className="text-xs text-gray-500">{isRTL ? l.descAr : l.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="pt-4">
            <h3 className="font-medium text-gray-900 mb-3">{isRTL ? "المعدات المتاحة" : "Available Equipment"}</h3>
            <div className="space-y-3">
              {equipment.map(e => (
                <button
                  key={e.id}
                  onClick={() => setFormData(prev => ({ ...prev, equipmentAccess: e.id }))}
                  className={`w-full p-4 rounded-xl border-2 text-start flex items-center gap-4 transition-all ${
                    formData.equipmentAccess === e.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{e.icon}</span>
                  <span className="font-medium text-gray-900">{isRTL ? e.labelAr : e.label}</span>
                </button>
              ))}
            </div>
          </div>

          {formData.fitnessLevel && formData.equipmentAccess && (
            <button
              onClick={() => setStep(3)}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium"
            >
              {isRTL ? "التالي" : "Next"}
            </button>
          )}
        </div>
      )}

      {/* Step 3: Days + Body Info */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{isRTL ? "معلوماتك" : "Your Info"}</h2>
          </div>

          {/* Days per week */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {isRTL ? "أيام التدريب أسبوعياً" : "Training days per week"}
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map(d => (
                <button
                  key={d}
                  onClick={() => setFormData(prev => ({ ...prev, daysPerWeek: d }))}
                  className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${
                    formData.daysPerWeek === d
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Sex */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">{isRTL ? "الجنس" : "Sex"}</label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormData(prev => ({ ...prev, sex: "male" }))}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  formData.sex === "male" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {isRTL ? "ذكر" : "Male"}
              </button>
              <button
                onClick={() => setFormData(prev => ({ ...prev, sex: "female" }))}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  formData.sex === "female" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {isRTL ? "أنثى" : "Female"}
              </button>
            </div>
          </div>

          {/* Body info inputs */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{isRTL ? "العمر" : "Age"}</label>
              <input
                type="number"
                value={formData.age}
                onChange={e => setFormData(prev => ({ ...prev, age: e.target.value }))}
                placeholder="25"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-center font-medium focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{isRTL ? "الطول (سم)" : "Height (cm)"}</label>
              <input
                type="number"
                value={formData.heightCm}
                onChange={e => setFormData(prev => ({ ...prev, heightCm: e.target.value }))}
                placeholder="175"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-center font-medium focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{isRTL ? "الوزن (كجم)" : "Weight (kg)"}</label>
              <input
                type="number"
                value={formData.weightKg}
                onChange={e => setFormData(prev => ({ ...prev, weightKg: e.target.value }))}
                placeholder="75"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-center font-medium focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {formData.sex && formData.age && formData.heightCm && formData.weightKg && (
            <button
              onClick={() => setStep(4)}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium"
            >
              {isRTL ? "التالي" : "Next"}
            </button>
          )}
        </div>
      )}

      {/* Step 4: Summary + Create */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{isRTL ? "ملخص خطتك" : "Plan Summary"}</h2>
            <p className="text-sm text-gray-500 mt-1">{isRTL ? "راجع بياناتك قبل إنشاء الخطة" : "Review before creating your plan"}</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">{isRTL ? "الهدف" : "Goal"}</span>
              <span className="font-medium">{goals.find(g => g.id === formData.goal)?.[isRTL ? "labelAr" : "label"]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{isRTL ? "المستوى" : "Level"}</span>
              <span className="font-medium">{levels.find(l => l.id === formData.fitnessLevel)?.[isRTL ? "labelAr" : "label"]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{isRTL ? "المعدات" : "Equipment"}</span>
              <span className="font-medium">{equipment.find(e => e.id === formData.equipmentAccess)?.[isRTL ? "labelAr" : "label"]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{isRTL ? "الأيام" : "Days/week"}</span>
              <span className="font-medium">{formData.daysPerWeek}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{isRTL ? "البيانات" : "Body"}</span>
              <span className="font-medium">{formData.age}y • {formData.heightCm}cm • {formData.weightKg}kg</span>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <p className="text-sm text-emerald-800">
              {isRTL
                ? "⚕️ سيتم ربط خطتك ببياناتك الطبية من MediSoft (إن وُجدت) لتعديل الشدة والتمارين تلقائياً."
                : "⚕️ Your plan will be linked to your MediSoft medical data (if available) to automatically adjust intensity and exercises."}
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 text-white rounded-xl font-bold text-lg transition-all"
          >
            {creating
              ? (isRTL ? "جارٍ إنشاء خطتك..." : "Creating your plan...")
              : (isRTL ? "🚀 أنشئ خطتي التدريبية" : "🚀 Create My Training Plan")}
          </button>
        </div>
      )}

      {/* Back button */}
      {step > 1 && (
        <button
          onClick={() => setStep(prev => prev - 1)}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← {isRTL ? "رجوع" : "Back"}
        </button>
      )}
    </div>
  );
}
