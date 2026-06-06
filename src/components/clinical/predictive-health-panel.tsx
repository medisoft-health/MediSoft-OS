"use client";

import { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import {
  Heart,
  Brain,
  TrendingDown,
  TrendingUp,
  Shield,
  Activity,
  Moon,
  Utensils,
  Target,
  Calendar,
  Watch,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Flame,
  Footprints,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HealthPrediction {
  overallHealthScore: number;
  healthAge: number;
  chronologicalAge: number;
  riskPredictions: Array<{
    condition: string;
    conditionEn: string;
    currentRisk: number;
    fiveYearRisk: number;
    tenYearRisk: number;
    riskLevel: string;
    contributingFactors: Array<{
      factor: string;
      factorEn: string;
      impact: number;
      modifiable: boolean;
    }>;
    preventionPotential: number;
  }>;
  preventionPlan: {
    priority: string;
    priorityEn: string;
    goals: Array<{
      goal: string;
      goalEn: string;
      metric: string;
      currentValue: string;
      targetValue: string;
      timeframe: string;
      timeframeEn: string;
      impact: string;
      impactEn: string;
    }>;
    dailyHabits: Array<{
      habit: string;
      habitEn: string;
      timing: string;
      timingEn: string;
      duration: string;
      benefit: string;
      benefitEn: string;
    }>;
    mentalHealth: {
      stressManagement: string;
      stressManagementEn: string;
      sleepHygiene: string;
      sleepHygieneEn: string;
    };
  };
  lifestyleImpact: {
    currentTrajectory: {
      healthScoreIn5Years: number;
      majorRisks: string[];
      majorRisksEn: string[];
    };
    optimizedTrajectory: {
      healthScoreIn5Years: number;
      risksReduced: string[];
      risksReducedEn: string[];
      yearsGained: number;
    };
    keyChanges: Array<{
      change: string;
      changeEn: string;
      impact: string;
      impactEn: string;
      difficulty: string;
      priority: number;
    }>;
  };
  screeningSchedule: Array<{
    test: string;
    testEn: string;
    frequency: string;
    frequencyEn: string;
    nextDue: string;
    urgency: string;
  }>;
  wearableGoals: Array<{
    metric: string;
    metricEn: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    rationale: string;
    rationaleEn: string;
  }>;
  aiNarrative: string;
  aiNarrativeEn: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PredictiveHealthPanel({ patientId }: { patientId?: number }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [prediction, setPrediction] = useState<HealthPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("risks");

  const runPrediction = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/predictive-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patientId || 1,
          demographics: { age: 42, sex: "male", bmi: 27.5, weight: 82, height: 173 },
          familyHistory: [
            { condition: "Type 2 Diabetes", relation: "parent", ageOfOnset: 55 },
            { condition: "Hypertension", relation: "parent", ageOfOnset: 50 },
          ],
          lifestyle: {
            smokingStatus: "never",
            alcoholUse: "none",
            exerciseMinutesPerWeek: 90,
            dietQuality: "average",
            sleepHoursPerNight: 6.5,
            stressLevel: "high",
          },
          recentLabs: [
            { test: "HbA1c", value: 5.9, unit: "%", date: "2026-05-01" },
            { test: "Total Cholesterol", value: 215, unit: "mg/dL", date: "2026-05-01" },
            { test: "Vitamin D", value: 22, unit: "ng/mL", date: "2026-05-01" },
          ],
          wearableData: {
            averageHeartRate: 78,
            restingHeartRate: 72,
            stepsPerDay: 5500,
            sleepScore: 62,
            hrv: 35,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPrediction(data);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!prediction) {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900">
            <Heart className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
              {isAr ? "محرك الصحة التنبؤية" : "Predictive Health Engine"}
            </h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              {isAr
                ? "تنبؤ بالمخاطر الصحية المستقبلية + خطة وقائية مخصصة"
                : "Predict future health risks + personalized prevention plan"}
            </p>
          </div>
        </div>
        <button
          onClick={runPrediction}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Activity className="h-4 w-4 animate-spin" />
              {isAr ? "جارٍ التحليل..." : "Analyzing..."}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {isAr ? "تحليل المخاطر الصحية" : "Analyze Health Risks"}
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero: Health Score + Health Age */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">{isAr ? "النقاط الصحية" : "Health Score"}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-5xl font-bold">{prediction.overallHealthScore}</span>
              <span className="text-lg opacity-60">/100</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-70">{isAr ? "العمر الصحي" : "Health Age"}</p>
            <p className="text-3xl font-bold">{prediction.healthAge}</p>
            <p className="text-xs opacity-60">
              {isAr ? `(العمر الفعلي: ${prediction.chronologicalAge})` : `(Actual: ${prediction.chronologicalAge})`}
            </p>
            {prediction.healthAge > prediction.chronologicalAge ? (
              <TrendingDown className="h-4 w-4 text-red-300 mx-auto mt-1" />
            ) : (
              <TrendingUp className="h-4 w-4 text-green-300 mx-auto mt-1" />
            )}
          </div>
        </div>

        {/* AI Narrative */}
        {(prediction.aiNarrative || prediction.aiNarrativeEn) && (
          <div className="mt-4 p-3 rounded-lg bg-white/10 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-cyan-200" />
              <span className="text-xs font-medium text-cyan-200">{isAr ? "تحليل ذكي" : "AI Insight"}</span>
            </div>
            <p className="text-sm opacity-90 leading-relaxed">
              {isAr ? prediction.aiNarrative : prediction.aiNarrativeEn}
            </p>
          </div>
        )}
      </div>

      {/* Lifestyle Impact — Before/After */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
          {isAr ? "أنت اليوم vs أنت المحسّن" : "You Today vs Optimized You"}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 font-medium">{isAr ? "المسار الحالي (5 سنوات)" : "Current Path (5yr)"}</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{prediction.lifestyleImpact.currentTrajectory.healthScoreIn5Years}</p>
            <TrendingDown className="h-4 w-4 text-red-400 mt-1" />
          </div>
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-600 font-medium">{isAr ? "المسار المحسّن (5 سنوات)" : "Optimized Path (5yr)"}</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{prediction.lifestyleImpact.optimizedTrajectory.healthScoreIn5Years}</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs text-green-600">+{prediction.lifestyleImpact.optimizedTrajectory.yearsGained} {isAr ? "سنوات" : "years"}</span>
            </div>
          </div>
        </div>
        {/* Key Changes */}
        <div className="mt-3 space-y-2">
          {prediction.lifestyleImpact.keyChanges.map((change, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className={`w-2 h-2 rounded-full ${
                change.difficulty === "easy" ? "bg-green-400" : change.difficulty === "moderate" ? "bg-amber-400" : "bg-red-400"
              }`} />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{isAr ? change.change : change.changeEn}</span>
              <span className="text-xs text-gray-500">{isAr ? change.impact : change.impactEn}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Predictions */}
      <CollapsibleSection
        title={isAr ? "تقييم المخاطر الصحية" : "Health Risk Assessment"}
        icon={<Shield className="h-5 w-5 text-red-600" />}
        isOpen={expandedSection === "risks"}
        onToggle={() => toggleSection("risks")}
      >
        <div className="space-y-3">
          {prediction.riskPredictions.map((risk, i) => (
            <div key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {isAr ? risk.condition : risk.conditionEn}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  risk.riskLevel === "low" || risk.riskLevel === "minimal" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                  risk.riskLevel === "moderate" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
                  "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                }`}>
                  {risk.fiveYearRisk}% ({isAr ? "5 سنوات" : "5yr"})
                </span>
              </div>
              {/* Risk bar */}
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    risk.riskLevel === "low" || risk.riskLevel === "minimal" ? "bg-green-400" :
                    risk.riskLevel === "moderate" ? "bg-amber-400" : "bg-red-400"
                  }`}
                  style={{ width: `${Math.min(100, risk.fiveYearRisk)}%` }}
                />
              </div>
              {/* Prevention potential */}
              <div className="flex items-center gap-1 mt-2">
                <Shield className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">
                  {isAr ? `يمكن تقليله ${risk.preventionPotential}% بالوقاية` : `${risk.preventionPotential}% preventable`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Prevention Plan */}
      <CollapsibleSection
        title={isAr ? "خطة الوقاية المخصصة" : "Personalized Prevention Plan"}
        icon={<Target className="h-5 w-5 text-emerald-600" />}
        isOpen={expandedSection === "prevention"}
        onToggle={() => toggleSection("prevention")}
      >
        <div className="space-y-3">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
            🎯 {isAr ? prediction.preventionPlan.priority : prediction.preventionPlan.priorityEn}
          </p>
          {prediction.preventionPlan.goals.map((goal, i) => (
            <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{isAr ? goal.goal : goal.goalEn}</span>
                <span className="text-xs text-gray-500">{isAr ? goal.timeframe : goal.timeframeEn}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-red-500">{goal.currentValue}</span>
                <span className="text-xs text-gray-400">→</span>
                <span className="text-xs text-green-500">{goal.targetValue} {goal.metric}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{isAr ? goal.impact : goal.impactEn}</p>
            </div>
          ))}
          {/* Daily Habits */}
          <p className="text-xs font-medium text-gray-500 mt-2">{isAr ? "عادات يومية مقترحة:" : "Suggested Daily Habits:"}</p>
          {prediction.preventionPlan.dailyHabits.map((habit, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              {i === 0 ? <Footprints className="h-4 w-4 text-blue-500 shrink-0" /> :
               i === 1 ? <Moon className="h-4 w-4 text-indigo-500 shrink-0" /> :
               <Flame className="h-4 w-4 text-orange-500 shrink-0" />}
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">{isAr ? habit.habit : habit.habitEn}</p>
                <p className="text-xs text-gray-500">{habit.duration} • {isAr ? habit.timing : habit.timingEn}</p>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Wearable Goals */}
      <CollapsibleSection
        title={isAr ? "أهداف الأجهزة القابلة للارتداء" : "Wearable Device Goals"}
        icon={<Watch className="h-5 w-5 text-blue-600" />}
        isOpen={expandedSection === "wearable"}
        onToggle={() => toggleSection("wearable")}
      >
        <div className="space-y-3">
          {prediction.wearableGoals.map((goal, i) => (
            <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{isAr ? goal.metric : goal.metricEn}</span>
                <span className="text-xs text-gray-500">{goal.unit}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-500">{goal.currentValue}</span>
                <span className="text-gray-400">→</span>
                <span className="text-lg font-bold text-green-500">{goal.targetValue}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-green-400"
                  style={{ width: `${Math.min(100, (goal.currentValue / goal.targetValue) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{isAr ? goal.rationale : goal.rationaleEn}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Screening Schedule */}
      <CollapsibleSection
        title={isAr ? "جدول الفحوصات الدورية" : "Screening Schedule"}
        icon={<Calendar className="h-5 w-5 text-purple-600" />}
        isOpen={expandedSection === "screening"}
        onToggle={() => toggleSection("screening")}
      >
        <div className="space-y-2">
          {prediction.screeningSchedule.map((screening, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{isAr ? screening.test : screening.testEn}</p>
                <p className="text-xs text-gray-500">{isAr ? screening.frequency : screening.frequencyEn}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                screening.urgency === "overdue" ? "bg-red-100 text-red-700" :
                screening.urgency === "soon" ? "bg-amber-100 text-amber-700" :
                "bg-green-100 text-green-700"
              }`}>
                {screening.nextDue}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  children,
  isOpen,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
