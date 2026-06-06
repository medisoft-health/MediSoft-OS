"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Pill,
  Shield,
  Globe,
  RefreshCw,
  Brain,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CollectiveIntelligenceReport {
  generatedAt: string;
  totalPatientsAnalyzed: number;
  totalEncountersAnalyzed: number;
  populationInsights: Array<{
    id: string;
    type: string;
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
    severity: "info" | "warning" | "alert";
    affectedPercentage: number;
    recommendation: string;
    recommendationEn: string;
  }>;
  treatmentPatterns: Array<{
    condition: string;
    conditionEn: string;
    topMedications: Array<{
      medication: string;
      prescriptionCount: number;
      percentOfDoctors: number;
    }>;
    sampleSize: number;
  }>;
  clinicBenchmarks: Array<{
    metric: string;
    metricEn: string;
    yourValue: number;
    averageValue: number;
    topPerformerValue: number;
    unit: string;
    percentile: number;
    interpretation: string;
    interpretationEn: string;
  }>;
  outbreakAlerts: Array<{
    id: string;
    condition: string;
    conditionEn: string;
    region: string;
    regionEn: string;
    currentCases: number;
    baselineCases: number;
    increasePercent: number;
    severity: string;
    recommendation: string;
    recommendationEn: string;
  }>;
  topConditionsThisWeek: Array<{
    condition: string;
    conditionEn: string;
    count: number;
    changeFromLastWeek: number;
  }>;
  aiAnalysis: string;
  aiAnalysisEn: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CollectiveIntelligenceDashboard() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [report, setReport] = useState<CollectiveIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/collective-intelligence");
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isAr ? "الذكاء الطبي الجماعي" : "Collective Medical Intelligence"}
              </h2>
              <p className="text-sm opacity-70">
                {isAr
                  ? `تحليل مجهول لـ ${report.totalPatientsAnalyzed} مريض و ${report.totalEncountersAnalyzed} زيارة`
                  : `Anonymized analysis of ${report.totalPatientsAnalyzed} patients & ${report.totalEncountersAnalyzed} encounters`}
              </p>
            </div>
          </div>
          <button onClick={fetchData} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* AI Analysis */}
        {(report.aiAnalysis || report.aiAnalysisEn) && (
          <div className="mt-4 p-3 rounded-lg bg-white/10 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-purple-300" />
              <span className="text-xs font-medium text-purple-300">
                {isAr ? "تحليل ذكي" : "AI Analysis"}
              </span>
            </div>
            <p className="text-sm opacity-90 leading-relaxed">
              {isAr ? report.aiAnalysis : report.aiAnalysisEn}
            </p>
          </div>
        )}
      </div>

      {/* Outbreak Alerts */}
      {report.outbreakAlerts.length > 0 && (
        <div className="rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-bold text-red-800 dark:text-red-200">
              {isAr ? "تنبيهات وبائية" : "Outbreak Alerts"}
            </h3>
          </div>
          {report.outbreakAlerts.map((alert) => (
            <div key={alert.id} className="p-3 rounded-lg bg-white dark:bg-gray-800 mb-2 last:mb-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {isAr ? alert.condition : alert.conditionEn}
                </span>
                <span className="text-xs font-bold text-red-600">
                  +{alert.increasePercent}%
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {isAr ? alert.recommendation : alert.recommendationEn}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Top Conditions This Week */}
      {report.topConditionsThisWeek.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isAr ? "أكثر الحالات هذا الأسبوع" : "Top Conditions This Week"}
            </h3>
          </div>
          <div className="space-y-2">
            {report.topConditionsThisWeek.slice(0, 6).map((cond, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {isAr ? cond.condition : cond.conditionEn}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {cond.count}
                  </span>
                  {cond.changeFromLastWeek > 0 ? (
                    <span className="flex items-center text-xs text-red-500">
                      <ArrowUpRight className="h-3 w-3" />
                      {cond.changeFromLastWeek}%
                    </span>
                  ) : cond.changeFromLastWeek < 0 ? (
                    <span className="flex items-center text-xs text-green-500">
                      <ArrowDownRight className="h-3 w-3" />
                      {Math.abs(cond.changeFromLastWeek)}%
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Treatment Patterns */}
      {report.treatmentPatterns.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="h-5 w-5 text-teal-600" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isAr ? "أنماط العلاج الشائعة" : "Common Treatment Patterns"}
            </h3>
          </div>
          <div className="space-y-3">
            {report.treatmentPatterns.slice(0, 4).map((pattern, i) => (
              <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {isAr ? pattern.condition : pattern.conditionEn}
                  </span>
                  <span className="text-xs text-gray-500">
                    n={pattern.sampleSize}
                  </span>
                </div>
                <div className="space-y-1">
                  {pattern.topMedications.map((med, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${med.percentOfDoctors}%`, maxWidth: "60%" }}
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {med.medication} ({med.percentOfDoctors}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinic Benchmarks */}
      {report.clinicBenchmarks.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isAr ? "مقارنة أداء عيادتك" : "Your Clinic Benchmarks"}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.clinicBenchmarks.map((bench, i) => (
              <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <p className="text-xs text-gray-500 mb-1">
                  {isAr ? bench.metric : bench.metricEn}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {bench.yourValue}
                  </span>
                  <span className="text-xs text-gray-500">{bench.unit}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{ width: `${bench.percentile}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {isAr ? bench.interpretation : bench.interpretationEn}
                  {" • "}
                  {isAr ? `المرتبة ${bench.percentile}%` : `${bench.percentile}th percentile`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Population Insights */}
      {report.populationInsights.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isAr ? "رؤى سكانية" : "Population Insights"}
            </h3>
          </div>
          <div className="space-y-2">
            {report.populationInsights.map((insight) => (
              <div
                key={insight.id}
                className={`p-3 rounded-lg border-l-4 ${
                  insight.severity === "alert"
                    ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                    : insight.severity === "warning"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                      : "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                }`}
              >
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {isAr ? insight.title : insight.titleEn}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {isAr ? insight.description : insight.descriptionEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
