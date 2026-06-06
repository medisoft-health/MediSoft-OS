"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import {
  AlertTriangle,
  Activity,
  Calendar,
  Shield,
  Pill,
  FlaskConical,
  Heart,
  TrendingDown,
  ChevronRight,
  Sparkles,
  X,
  RefreshCw,
  Brain,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClinicalInsight {
  id: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  actionLabel: string;
  actionLabelEn: string;
  actionRoute?: string;
  icon: string;
  color: string;
  evidence: string;
  evidenceEn: string;
  generatedAt: string;
  dismissed?: boolean;
}

interface ZeroClickReport {
  patientId: number;
  patientName: string;
  insights: ClinicalInsight[];
  healthScore: number;
  riskLevel: "critical" | "high" | "moderate" | "low" | "optimal";
  lastAnalyzed: string;
  nextRecommendedVisit: string | null;
  aiSummary: string;
  aiSummaryEn: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ZeroClickInsights({ patientId }: { patientId: number }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [report, setReport] = useState<ZeroClickReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/zero-click-intelligence?patientId=${patientId}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setReport(data);
    } catch {
      setError(isAr ? "فشل في تحميل التنبيهات الذكية" : "Failed to load smart alerts");
    } finally {
      setLoading(false);
    }
  }, [patientId, isAr]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const dismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const visibleInsights =
    report?.insights.filter((i) => !dismissedIds.has(i.id)) || [];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "overdue_screening":
        return <FlaskConical className="h-4 w-4" />;
      case "medication_response":
        return <Pill className="h-4 w-4" />;
      case "insurance_alert":
        return <Shield className="h-4 w-4" />;
      case "vital_trend":
        return <Heart className="h-4 w-4" />;
      case "lab_trend":
        return <TrendingDown className="h-4 w-4" />;
      case "appointment_gap":
        return <Calendar className="h-4 w-4" />;
      case "preventive_care":
        return <Activity className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "critical":
        return "border-red-500 bg-red-50 dark:bg-red-950/30";
      case "high":
        return "border-orange-500 bg-orange-50 dark:bg-orange-950/30";
      case "medium":
        return "border-amber-500 bg-amber-50 dark:bg-amber-950/30";
      case "low":
        return "border-blue-500 bg-blue-50 dark:bg-blue-950/30";
      default:
        return "border-gray-300 bg-gray-50 dark:bg-gray-900/30";
    }
  };

  const getPriorityBadge = (priority: string) => {
    const labels: Record<string, { ar: string; en: string; cls: string }> = {
      critical: { ar: "حرج", en: "Critical", cls: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      high: { ar: "مرتفع", en: "High", cls: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
      medium: { ar: "متوسط", en: "Medium", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
      low: { ar: "منخفض", en: "Low", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    };
    const l = labels[priority] || labels.low;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.cls}`}>
        {isAr ? l.ar : l.en}
      </span>
    );
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "text-red-600";
      case "high":
        return "text-orange-600";
      case "moderate":
        return "text-amber-600";
      case "low":
        return "text-green-600";
      case "optimal":
        return "text-emerald-600";
      default:
        return "text-gray-600";
    }
  };

  // ─── Loading State ──
  if (loading) {
    return (
      <div className="rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 animate-pulse">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-indigo-500 animate-spin" />
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {isAr ? "جارٍ تحليل بيانات المريض..." : "Analyzing patient data..."}
          </span>
        </div>
      </div>
    );
  }

  // ─── Error State ──
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          <button
            onClick={fetchInsights}
            className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            {isAr ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  // ─── No Insights ──
  if (!report || visibleInsights.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {isAr
              ? "لا توجد ملاحظات سريرية عاجلة — المريض في حالة مستقرة"
              : "No urgent clinical insights — patient is stable"}
          </span>
        </div>
      </div>
    );
  }

  // ─── Main Render ──
  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-white to-indigo-50/30 dark:from-gray-900 dark:to-indigo-950/20 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-800 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900">
            <Brain className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
              {isAr ? "الذكاء السريري الاستباقي" : "Proactive Clinical Intelligence"}
            </h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">
              {isAr
                ? `${visibleInsights.length} ملاحظة • نقاط الصحة: ${report.healthScore}/100`
                : `${visibleInsights.length} insights • Health Score: ${report.healthScore}/100`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold ${getRiskLevelColor(report.riskLevel)}`}
          >
            {report.riskLevel.toUpperCase()}
          </span>
          <ChevronRight
            className={`h-4 w-4 text-indigo-400 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* AI Summary */}
          {(report.aiSummary || report.aiSummaryEn) && (
            <div className="px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800">
              <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
                {isAr ? report.aiSummary : report.aiSummaryEn}
              </p>
            </div>
          )}

          {/* Insights List */}
          <div className="space-y-2">
            {visibleInsights.slice(0, 6).map((insight) => (
              <div
                key={insight.id}
                className={`relative rounded-lg border-l-4 p-3 transition-all hover:shadow-sm ${getPriorityStyles(
                  insight.priority
                )}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="mt-0.5 text-gray-600 dark:text-gray-400">
                      {getCategoryIcon(insight.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {isAr ? insight.title : insight.titleEn}
                        </p>
                        {getPriorityBadge(insight.priority)}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {isAr ? insight.description : insight.descriptionEn}
                      </p>
                      {insight.actionRoute && (
                        <a
                          href={`/${locale}${insight.actionRoute}`}
                          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                        >
                          {isAr ? insight.actionLabel : insight.actionLabelEn}
                          <ChevronRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(insight.id);
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                    title={isAr ? "تجاهل" : "Dismiss"}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-indigo-100 dark:border-indigo-800">
            <span className="text-[10px] text-gray-400">
              {isAr ? "آخر تحليل: " : "Last analyzed: "}
              {new Date(report.lastAnalyzed).toLocaleTimeString(
                isAr ? "ar-EG" : "en-US",
                { hour: "2-digit", minute: "2-digit" }
              )}
            </span>
            <button
              onClick={fetchInsights}
              className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              {isAr ? "تحديث" : "Refresh"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
