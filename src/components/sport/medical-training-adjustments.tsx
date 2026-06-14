"use client";

import * as React from "react";
import {
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Info,
  RefreshCw,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

interface Adjustment {
  marker: string;
  value: number;
  unit: string;
  status: "low" | "high";
  condition: string;
  conditionAr: string;
  impact: string;
  impactAr: string;
  recommendation: string;
  recommendationAr: string;
  severity: "critical" | "warning" | "info";
  adjustments: {
    maxIntensity?: number;
    increaseRestBy?: number;
    reduceSetsBy?: number;
    maxDaysPerWeek?: number;
    avoidExerciseTypes?: string[];
    preferExerciseTypes?: string[];
  };
}

interface Summary {
  totalAdjustments: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  overallMaxIntensity: number;
  avoidExerciseTypes: string[];
  preferExerciseTypes: string[];
}

interface MedicalAdjustmentsData {
  adjustments: Adjustment[];
  activePlanId: string | null;
  labResultsCount: number;
  lastLabDate: string | null;
  summary: Summary;
}

interface Props {
  locale?: string;
  showApplyButton?: boolean;
  compact?: boolean;
}

export function MedicalTrainingAdjustments({ locale = "ar", showApplyButton = true, compact = false }: Props) {
  const isRTL = locale === "ar";
  const [data, setData] = React.useState<MedicalAdjustmentsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [applying, setApplying] = React.useState(false);
  const [applied, setApplied] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    fetchAdjustments();
  }, []);

  const fetchAdjustments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sport?action=medical-training-adjustments");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError(isRTL ? "فشل في تحميل التعديلات الطبية" : "Failed to load medical adjustments");
      }
    } catch {
      setError(isRTL ? "خطأ في الاتصال" : "Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!data?.activePlanId) return;
    setApplying(true);
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply-medical-adjustments", planId: data.activePlanId }),
      });
      if (res.ok) {
        setApplied(true);
        setTimeout(() => setApplied(false), 3000);
      }
    } catch {
      /* silent */
    } finally {
      setApplying(false);
    }
  };

  const severityConfig = {
    critical: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
      badge: "bg-red-100 text-red-700",
      label: isRTL ? "حرج" : "Critical",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
      badge: "bg-amber-100 text-amber-700",
      label: isRTL ? "تحذير" : "Warning",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: <Info className="h-4 w-4 text-blue-600" />,
      badge: "bg-blue-100 text-blue-700",
      label: isRTL ? "معلومة" : "Info",
    },
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-20 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={fetchAdjustments} className="mt-2 text-xs text-red-700 underline">
          {isRTL ? "إعادة المحاولة" : "Retry"}
        </button>
      </div>
    );
  }

  if (!data || data.adjustments.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
        <h3 className="font-medium text-emerald-800 text-sm">
          {isRTL ? "لا توجد تعديلات طبية مطلوبة" : "No Medical Adjustments Required"}
        </h3>
        <p className="text-xs text-emerald-600 mt-1">
          {isRTL
            ? "تحاليلك ضمن المعدل الطبيعي. استمر في خطتك الحالية."
            : "Your lab results are within normal range. Continue with your current plan."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="h-5 w-5 text-emerald-400" />
          <h3 className="font-bold text-sm">
            {isRTL ? "الذكاء الطبي — تعديلات التدريب" : "Medical Intelligence — Training Adjustments"}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{data.summary.overallMaxIntensity}%</div>
            <div className="text-[10px] text-gray-400">{isRTL ? "أقصى شدة" : "Max Intensity"}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{data.summary.totalAdjustments}</div>
            <div className="text-[10px] text-gray-400">{isRTL ? "تعديلات" : "Adjustments"}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{data.summary.criticalCount}</div>
            <div className="text-[10px] text-gray-400">{isRTL ? "حرجة" : "Critical"}</div>
          </div>
        </div>
        {data.lastLabDate && (
          <p className="text-[10px] text-gray-400">
            {isRTL ? "آخر تحليل:" : "Last lab:"} {new Date(data.lastLabDate).toLocaleDateString(isRTL ? "ar-SA" : "en-US")}
          </p>
        )}
      </div>

      {/* Adjustments List */}
      {!compact && (
        <div className="space-y-3">
          {data.adjustments.map((adj, i) => {
            const config = severityConfig[adj.severity];
            return (
              <div key={i} className={`${config.bg} border ${config.border} rounded-xl p-4`}>
                <div className="flex items-start gap-3">
                  {config.icon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm text-gray-900">
                        {isRTL ? adj.conditionAr : adj.condition}
                      </h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${config.badge}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono text-gray-600">
                        {adj.marker}: {adj.value} {adj.unit}
                      </span>
                      {adj.status === "low" ? (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      ) : (
                        <TrendingUp className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      <strong>{isRTL ? "التأثير:" : "Impact:"}</strong>{" "}
                      {isRTL ? adj.impactAr : adj.impact}
                    </p>
                    <p className="text-xs text-gray-700 mt-1 bg-white/60 rounded-lg p-2">
                      <strong>{isRTL ? "التوصية:" : "Recommendation:"}</strong>{" "}
                      {isRTL ? adj.recommendationAr : adj.recommendation}
                    </p>
                    {/* Specific adjustments */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {adj.adjustments.maxIntensity && (
                        <span className="text-[10px] bg-white/80 border border-gray-200 rounded-full px-2 py-0.5">
                          {isRTL ? `شدة ≤ ${adj.adjustments.maxIntensity}%` : `Intensity ≤ ${adj.adjustments.maxIntensity}%`}
                        </span>
                      )}
                      {adj.adjustments.increaseRestBy && (
                        <span className="text-[10px] bg-white/80 border border-gray-200 rounded-full px-2 py-0.5">
                          {isRTL ? `+${adj.adjustments.increaseRestBy}ث راحة` : `+${adj.adjustments.increaseRestBy}s rest`}
                        </span>
                      )}
                      {adj.adjustments.reduceSetsBy && (
                        <span className="text-[10px] bg-white/80 border border-gray-200 rounded-full px-2 py-0.5">
                          {isRTL ? `-${adj.adjustments.reduceSetsBy}% مجموعات` : `-${adj.adjustments.reduceSetsBy}% sets`}
                        </span>
                      )}
                      {adj.adjustments.maxDaysPerWeek && (
                        <span className="text-[10px] bg-white/80 border border-gray-200 rounded-full px-2 py-0.5">
                          {isRTL ? `≤ ${adj.adjustments.maxDaysPerWeek} أيام/أسبوع` : `≤ ${adj.adjustments.maxDaysPerWeek} days/week`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Avoid/Prefer Exercise Types */}
      {!compact && (data.summary.avoidExerciseTypes.length > 0 || data.summary.preferExerciseTypes.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          {data.summary.avoidExerciseTypes.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-red-700 flex items-center gap-1.5 mb-1.5">
                <ArrowDownRight className="h-3 w-3" />
                {isRTL ? "تجنب هذه الأنواع" : "Avoid These Types"}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.summary.avoidExerciseTypes.map((t, i) => (
                  <span key={i} className="text-[10px] bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
                    {t.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.summary.preferExerciseTypes.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-emerald-700 flex items-center gap-1.5 mb-1.5">
                <ArrowUpRight className="h-3 w-3" />
                {isRTL ? "يُفضّل هذه الأنواع" : "Prefer These Types"}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.summary.preferExerciseTypes.map((t, i) => (
                  <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                    {t.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Apply Button */}
      {showApplyButton && data.activePlanId && (
        <button
          onClick={handleApply}
          disabled={applying || applied}
          className={`w-full py-3.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            applied
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
          }`}
        >
          {applying ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : applied ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              {isRTL ? "تم تطبيق التعديلات على خطتك" : "Adjustments Applied to Your Plan"}
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              {isRTL ? "تطبيق التعديلات على خطة التدريب" : "Apply Adjustments to Training Plan"}
            </>
          )}
        </button>
      )}
    </div>
  );
}
