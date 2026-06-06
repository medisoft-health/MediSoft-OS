"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Target,
  Lightbulb,
  BarChart3,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Circle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HealthMetricCard {
  id: string;
  label: string;
  labelEn: string;
  currentValue: number | string;
  previousValue: number | string | null;
  unit: string;
  status: "excellent" | "good" | "attention" | "critical";
  trend: "improving" | "stable" | "worsening" | "new";
  changePercent: number | null;
  explanation: string;
  explanationEn: string;
  recommendation: string;
  recommendationEn: string;
  icon: string;
  color: string;
}

interface BeforeAfterComparison {
  timeframe: string;
  timeframeEn: string;
  metrics: Array<{
    name: string;
    nameEn: string;
    before: number | string;
    after: number | string;
    unit: string;
    improved: boolean;
    changeText: string;
    changeTextEn: string;
  }>;
  overallProgress: number;
  motivationalMessage: string;
  motivationalMessageEn: string;
}

interface MonthlyHealthSummary {
  month: string;
  monthEn: string;
  healthScore: number;
  previousHealthScore: number;
  highlights: Array<{
    emoji: string;
    text: string;
    textEn: string;
    type: string;
  }>;
  topAchievement: string;
  topAchievementEn: string;
  nextGoal: string;
  nextGoalEn: string;
  visitCount: number;
  labsCompleted: number;
  medicationAdherence: number;
}

interface PatientHealthReport {
  patientId: number;
  patientName: string;
  generatedAt: string;
  healthScore: number;
  healthScoreLabel: string;
  healthScoreLabelEn: string;
  metricCards: HealthMetricCard[];
  beforeAfter: BeforeAfterComparison;
  monthlySummary: MonthlyHealthSummary;
  trafficLightSummary: Array<{
    name: string;
    nameEn: string;
    status: "green" | "yellow" | "red";
    value: string;
    explanation: string;
    explanationEn: string;
  }>;
  personalizedTips: Array<{
    tip: string;
    tipEn: string;
    category: string;
    priority: number;
  }>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PatientHealthReportView({ patientId }: { patientId: number }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [report, setReport] = useState<PatientHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patient-empowerment?patientId=${patientId}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setReport(data);
    } catch {
      setError(isAr ? "فشل في تحميل التقرير الصحي" : "Failed to load health report");
    } finally {
      setLoading(false);
    }
  }, [patientId, isAr]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-8 animate-pulse">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-purple-500 animate-bounce" />
          <span className="text-lg font-medium text-purple-700 dark:text-purple-300">
            {isAr ? "جارٍ إعداد تقريرك الصحي..." : "Preparing your health report..."}
          </span>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-800 p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button onClick={fetchReport} className="mt-2 text-sm text-indigo-600 hover:underline flex items-center gap-1 mx-auto">
          <RefreshCw className="h-3 w-3" /> {isAr ? "إعادة المحاولة" : "Retry"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Health Score Hero ── */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">
              {isAr ? "نقاط صحتك" : "Your Health Score"}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-5xl font-bold">{report.healthScore}</span>
              <span className="text-lg opacity-70">/100</span>
            </div>
            <p className="text-sm mt-2 opacity-90">
              {isAr ? report.healthScoreLabel : report.healthScoreLabelEn}
            </p>
          </div>
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="8"
                strokeDasharray={`${(report.healthScore / 100) * 251.2} 251.2`}
                strokeLinecap="round"
              />
            </svg>
            <Heart className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* ── Traffic Light Summary ── */}
      {report.trafficLightSummary.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {isAr ? "ملخص سريع" : "Quick Summary"}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {report.trafficLightSummary.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <Circle
                  className={`h-3 w-3 fill-current ${
                    item.status === "green"
                      ? "text-green-500"
                      : item.status === "yellow"
                        ? "text-amber-500"
                        : "text-red-500"
                  }`}
                />
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {isAr ? item.name : item.nameEn}
                  </p>
                  <p className="text-[10px] text-gray-500">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Metric Cards ── */}
      {report.metricCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.metricCards.map((card) => (
            <div
              key={card.id}
              className={`rounded-xl border p-4 transition-all hover:shadow-md ${
                card.status === "excellent"
                  ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : card.status === "good"
                    ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                    : card.status === "attention"
                      ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
                      : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isAr ? card.label : card.labelEn}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {card.currentValue}
                    </span>
                    <span className="text-xs text-gray-500">{card.unit}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg">{card.icon}</span>
                  {card.trend === "improving" && (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                  {card.trend === "worsening" && (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  {card.trend === "stable" && (
                    <Minus className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                {isAr ? card.explanation : card.explanationEn}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                {isAr ? card.recommendation : card.recommendationEn}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Before/After Comparison ── */}
      {report.beforeAfter.metrics.length > 0 && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
              {isAr ? `أنت قبل 6 أشهر vs أنت اليوم` : "You 6 months ago vs You today"}
            </h3>
          </div>
          <div className="space-y-3">
            {report.beforeAfter.metrics.map((m, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-500">{isAr ? "قبل" : "Before"}</p>
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {m.before} <span className="text-xs font-normal">{m.unit}</span>
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-indigo-400" />
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-500">{isAr ? "الآن" : "Now"}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {m.after} <span className="text-xs font-normal">{m.unit}</span>
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    m.improved
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                  }`}
                >
                  {isAr ? m.changeText : m.changeTextEn}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-4 font-medium text-center">
            {isAr
              ? report.beforeAfter.motivationalMessage
              : report.beforeAfter.motivationalMessageEn}
          </p>
        </div>
      )}

      {/* ── Monthly Highlights ── */}
      {report.monthlySummary.highlights.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isAr ? `أبرز أحداث ${report.monthlySummary.month}` : `${report.monthlySummary.monthEn} Highlights`}
            </h3>
          </div>
          <div className="space-y-2">
            {report.monthlySummary.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span>{h.emoji}</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {isAr ? h.text : h.textEn}
                </span>
              </div>
            ))}
          </div>
          {report.monthlySummary.topAchievement && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                🏆 {isAr ? report.monthlySummary.topAchievement : report.monthlySummary.topAchievementEn}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Personalized Tips ── */}
      {report.personalizedTips.length > 0 && (
        <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-teal-600" />
            <h3 className="text-sm font-semibold text-teal-800 dark:text-teal-200">
              {isAr ? "نصائح مخصصة لك" : "Personalized Tips for You"}
            </h3>
          </div>
          <div className="space-y-2">
            {report.personalizedTips.slice(0, 4).map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Target className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  {isAr ? tip.tip : tip.tipEn}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
