"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import {
  Zap,
  Shield,
  Activity,
  Moon,
  Droplets,
  Utensils,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Target,
  Brain,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types (matching the API response) ───────────────────────────────────────

interface PerformancePrediction {
  overallReadiness: number;
  readinessLabel: string;
  readinessLabelEn: string;
  predictedPerformance: number;
  injuryRisk: {
    overallRisk: number;
    riskLevel: string;
    riskLabel: string;
    riskLabelEn: string;
    vulnerableAreas: Array<{
      area: string;
      areaEn: string;
      risk: number;
      reason: string;
      reasonEn: string;
      preventionTip: string;
      preventionTipEn: string;
    }>;
    contributingFactors: Array<{
      factor: string;
      factorEn: string;
      impact: string;
      description: string;
      descriptionEn: string;
    }>;
  };
  acwr: {
    currentACWR: number;
    zone: string;
    zoneLabel: string;
    zoneLabelEn: string;
    acuteLoad: number;
    chronicLoad: number;
    recommendation: string;
    recommendationEn: string;
    weeklyTrend: Array<{ week: string; acwr: number }>;
  };
  recoveryPlan: {
    todayPlan: string;
    todayPlanEn: string;
    sleepRecommendation: string;
    sleepRecommendationEn: string;
    hydration: string;
    hydrationEn: string;
    activities: Array<{
      activity: string;
      activityEn: string;
      duration: string;
      timing: string;
      timingEn: string;
    }>;
    estimatedFullRecovery: string;
    estimatedFullRecoveryEn: string;
  };
  nutritionRecommendations: {
    dailyCalories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    hydrationLiters: number;
    supplements: Array<{
      name: string;
      nameEn: string;
      dose: string;
      reason: string;
      reasonEn: string;
    }>;
    mealTiming: Array<{
      time: string;
      meal: string;
      mealEn: string;
      focus: string;
      focusEn: string;
    }>;
  };
  labInsights: Array<{
    testName: string;
    testNameEn: string;
    value: number;
    unit: string;
    status: string;
    athleteInterpretation: string;
    athleteInterpretationEn: string;
    performanceImpact: string;
    performanceImpactEn: string;
    recommendation: string;
    recommendationEn: string;
  }>;
  weeklyForecast: Array<{
    day: string;
    dayEn: string;
    recommendedActivity: string;
    recommendedActivityEn: string;
    intensity: number;
    focus: string;
    focusEn: string;
    estimatedReadiness: number;
  }>;
  aiAnalysis: string;
  aiAnalysisEn: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AthletePredictionPanel() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [prediction, setPrediction] = useState<PerformancePrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("readiness");

  const runPrediction = async () => {
    setLoading(true);
    try {
      // Demo athlete profile — in production this would come from the patient record
      const demoProfile = {
        name: "أحمد محمد",
        sport: "Football",
        position: "Midfielder",
        age: 25,
        weight: 75,
        height: 178,
        trainingYears: 8,
        injuryHistory: [
          { type: "Hamstring strain", location: "Left hamstring", date: "2025-12-15", recoveryDays: 21, severity: "moderate", recurrent: false },
        ],
        currentTrainingLoad: generateDemoTrainingData(),
        labResults: [
          { testName: "Vitamin D", value: 28, unit: "ng/mL", date: "2026-05-20", athleteNormalRange: { min: 40, max: 80 } },
          { testName: "Ferritin", value: 45, unit: "ng/mL", date: "2026-05-20", athleteNormalRange: { min: 50, max: 200 } },
          { testName: "Testosterone", value: 650, unit: "ng/dL", date: "2026-05-20", athleteNormalRange: { min: 400, max: 900 } },
          { testName: "CRP", value: 0.8, unit: "mg/L", date: "2026-05-20", athleteNormalRange: { min: 0, max: 1.0 } },
          { testName: "Hemoglobin", value: 15.2, unit: "g/dL", date: "2026-05-20", athleteNormalRange: { min: 14, max: 17 } },
        ],
        sleepData: [
          { date: "2026-06-01", duration: 7.5, quality: 7, deepSleepPercent: 22 },
          { date: "2026-06-02", duration: 6.5, quality: 6, deepSleepPercent: 18 },
          { date: "2026-06-03", duration: 8.0, quality: 8, deepSleepPercent: 25 },
          { date: "2026-06-04", duration: 7.0, quality: 7, deepSleepPercent: 20 },
        ],
        bodyComposition: {
          muscleMass: 38.5,
          fatPercentage: 11.2,
          bmi: 23.7,
          waterPercentage: 62,
          visceralFat: 4,
          metabolicAge: 22,
        },
      };

      const res = await fetch("/api/athlete-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demoProfile),
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
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!prediction) {
    return (
      <div className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900">
            <Zap className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">
              {isAr ? "التنبؤ بالأداء الرياضي" : "Performance Prediction"}
            </h3>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              {isAr
                ? "تحليل ACWR + خطر الإصابة + خطة التعافي + التغذية"
                : "ACWR Analysis + Injury Risk + Recovery Plan + Nutrition"}
            </p>
          </div>
        </div>
        <button
          onClick={runPrediction}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Activity className="h-4 w-4 animate-spin" />
              {isAr ? "جارٍ التحليل..." : "Analyzing..."}
            </span>
          ) : (
            <span>{isAr ? "🚀 ابدأ تحليل الأداء" : "🚀 Start Performance Analysis"}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Readiness Score Hero ── */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-500 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">{isAr ? "جاهزية الأداء" : "Performance Readiness"}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-5xl font-bold">{prediction.overallReadiness}%</span>
            </div>
            <p className="text-sm mt-1 opacity-90">
              {isAr ? prediction.readinessLabel : prediction.readinessLabelEn}
            </p>
          </div>
          <div className="text-center">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="8"
                  strokeDasharray={`${(prediction.overallReadiness / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                />
              </svg>
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6" />
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        {(prediction.aiAnalysis || prediction.aiAnalysisEn) && (
          <div className="mt-4 p-3 rounded-lg bg-white/10 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-yellow-200" />
              <span className="text-xs font-medium text-yellow-200">{isAr ? "تحليل ذكي" : "AI Analysis"}</span>
            </div>
            <p className="text-sm opacity-90 leading-relaxed">
              {isAr ? prediction.aiAnalysis : prediction.aiAnalysisEn}
            </p>
          </div>
        )}
      </div>

      {/* ── ACWR Section ── */}
      <CollapsibleSection
        title={isAr ? "نسبة الحمل الحاد/المزمن (ACWR)" : "Acute:Chronic Workload Ratio"}
        icon={<Activity className="h-5 w-5 text-blue-600" />}
        isOpen={expandedSection === "acwr"}
        onToggle={() => toggleSection("acwr")}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {prediction.acwr.currentACWR.toFixed(2)}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              prediction.acwr.zone === "sweet_spot" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
              prediction.acwr.zone === "undertraining" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
              prediction.acwr.zone === "danger" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
              "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
            }`}>
              {isAr ? prediction.acwr.zoneLabel : prediction.acwr.zoneLabelEn}
            </span>
          </div>
          {/* ACWR Gauge */}
          <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
            <div className="absolute inset-0 flex">
              <div className="w-[30%] bg-blue-300" />
              <div className="w-[20%] bg-green-400" />
              <div className="w-[20%] bg-amber-400" />
              <div className="w-[30%] bg-red-400" />
            </div>
            <div
              className="absolute top-0 h-full w-1 bg-gray-900 dark:bg-white rounded"
              style={{ left: `${Math.min(95, (prediction.acwr.currentACWR / 2) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>0.5</span>
            <span>0.8</span>
            <span>1.3</span>
            <span>1.5</span>
            <span>2.0</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {isAr ? prediction.acwr.recommendation : prediction.acwr.recommendationEn}
          </p>
        </div>
      </CollapsibleSection>

      {/* ── Injury Risk Section ── */}
      <CollapsibleSection
        title={isAr ? "تقييم خطر الإصابة" : "Injury Risk Assessment"}
        icon={<Shield className="h-5 w-5 text-red-600" />}
        isOpen={expandedSection === "injury"}
        onToggle={() => toggleSection("injury")}
        badge={
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            prediction.injuryRisk.riskLevel === "minimal" || prediction.injuryRisk.riskLevel === "low"
              ? "bg-green-100 text-green-700" :
            prediction.injuryRisk.riskLevel === "moderate"
              ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
          }`}>
            {prediction.injuryRisk.overallRisk}%
          </span>
        }
      >
        <div className="space-y-3">
          {prediction.injuryRisk.vulnerableAreas.map((area, i) => (
            <div key={i} className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-red-800 dark:text-red-200">{isAr ? area.area : area.areaEn}</span>
                <span className="text-xs text-red-600">{area.risk}%</span>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">{isAr ? area.preventionTip : area.preventionTipEn}</p>
            </div>
          ))}
          {prediction.injuryRisk.contributingFactors.map((factor, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <AlertTriangle className={`h-4 w-4 ${
                factor.impact === "high" ? "text-red-500" : factor.impact === "medium" ? "text-amber-500" : "text-blue-500"
              }`} />
              <span className="text-gray-700 dark:text-gray-300">{isAr ? factor.factor : factor.factorEn}</span>
              <span className="text-xs text-gray-500">({isAr ? factor.description : factor.descriptionEn})</span>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* ── Recovery Plan ── */}
      <CollapsibleSection
        title={isAr ? "خطة التعافي" : "Recovery Plan"}
        icon={<Moon className="h-5 w-5 text-indigo-600" />}
        isOpen={expandedSection === "recovery"}
        onToggle={() => toggleSection("recovery")}
      >
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/20">
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
              {isAr ? "📋 خطة اليوم:" : "📋 Today's Plan:"}
            </p>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
              {isAr ? prediction.recoveryPlan.todayPlan : prediction.recoveryPlan.todayPlanEn}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <Moon className="h-4 w-4 text-purple-500 mb-1" />
              <p className="text-xs text-purple-700 dark:text-purple-300">
                {isAr ? prediction.recoveryPlan.sleepRecommendation : prediction.recoveryPlan.sleepRecommendationEn}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/20">
              <Droplets className="h-4 w-4 text-cyan-500 mb-1" />
              <p className="text-xs text-cyan-700 dark:text-cyan-300">
                {isAr ? prediction.recoveryPlan.hydration : prediction.recoveryPlan.hydrationEn}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {prediction.recoveryPlan.activities.map((act, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-sm text-gray-700 dark:text-gray-300">{isAr ? act.activity : act.activityEn}</span>
                <div className="text-xs text-gray-500">
                  {act.duration} • {isAr ? act.timing : act.timingEn}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Nutrition Plan ── */}
      <CollapsibleSection
        title={isAr ? "خطة التغذية" : "Nutrition Plan"}
        icon={<Utensils className="h-5 w-5 text-green-600" />}
        isOpen={expandedSection === "nutrition"}
        onToggle={() => toggleSection("nutrition")}
      >
        <div className="space-y-3">
          {/* Macros */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MacroCard label={isAr ? "سعرات" : "Calories"} value={prediction.nutritionRecommendations.dailyCalories} unit="kcal" color="orange" />
            <MacroCard label={isAr ? "بروتين" : "Protein"} value={prediction.nutritionRecommendations.proteinGrams} unit="g" color="red" />
            <MacroCard label={isAr ? "كربوهيدرات" : "Carbs"} value={prediction.nutritionRecommendations.carbsGrams} unit="g" color="blue" />
            <MacroCard label={isAr ? "دهون" : "Fat"} value={prediction.nutritionRecommendations.fatGrams} unit="g" color="yellow" />
          </div>
          {/* Supplements */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500">{isAr ? "المكملات المقترحة:" : "Suggested Supplements:"}</p>
            {prediction.nutritionRecommendations.supplements.map((sup, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-gray-50 dark:bg-gray-800">
                <span className="text-gray-700 dark:text-gray-300">{isAr ? sup.name : sup.nameEn}</span>
                <span className="text-xs text-gray-500">{sup.dose} — {isAr ? sup.reason : sup.reasonEn}</span>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Weekly Forecast ── */}
      <CollapsibleSection
        title={isAr ? "خطة الأسبوع" : "Weekly Forecast"}
        icon={<Calendar className="h-5 w-5 text-purple-600" />}
        isOpen={expandedSection === "forecast"}
        onToggle={() => toggleSection("forecast")}
      >
        <div className="space-y-2">
          {prediction.weeklyForecast.map((day, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="text-xs font-medium text-gray-500 w-12">{isAr ? day.day : day.dayEn}</span>
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {isAr ? day.recommendedActivity : day.recommendedActivityEn}
                </p>
                <p className="text-xs text-gray-500">{isAr ? day.focus : day.focusEn}</p>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }).map((_, j) => (
                  <div
                    key={j}
                    className={`w-1.5 h-3 rounded-full ${
                      j < day.intensity
                        ? day.intensity <= 3 ? "bg-green-400" : day.intensity <= 6 ? "bg-amber-400" : "bg-red-400"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                ))}
              </div>
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
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
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
          {badge}
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function MacroCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  const colorMap: Record<string, string> = {
    orange: "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300",
    red: "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300",
    blue: "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300",
    yellow: "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300",
  };

  return (
    <div className={`p-2 rounded-lg text-center ${colorMap[color]}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px]">{unit}</p>
      <p className="text-[10px] opacity-70">{label}</p>
    </div>
  );
}

// ─── Demo Data Generator ─────────────────────────────────────────────────────

function generateDemoTrainingData() {
  const data = [];
  const now = new Date();
  for (let i = 28; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayOfWeek = date.getDay();
    const isRest = dayOfWeek === 5; // Friday rest
    const isMatch = dayOfWeek === 6; // Saturday match

    if (isRest) {
      data.push({ date: date.toISOString().split("T")[0], duration: 0, intensity: 1, type: "rest" as const, load: 0 });
    } else if (isMatch) {
      data.push({ date: date.toISOString().split("T")[0], duration: 90, intensity: 9, type: "match" as const, load: 810 });
    } else {
      const intensity = 5 + Math.floor(Math.random() * 3);
      const duration = 60 + Math.floor(Math.random() * 30);
      data.push({ date: date.toISOString().split("T")[0], duration, intensity, type: "training" as const, load: duration * intensity });
    }
  }
  return data;
}
