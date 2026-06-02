"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Activity,
  Calendar,
  ChevronDown,
  Droplets,
  Heart,
  Loader2,
  Sparkles,
  Target,
  Waves,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  fetchRiskAssessment,
  type RiskAssessmentResult,
  type RiskCategory,
} from "@/lib/medilab/client";
import { cn } from "@/lib/utils";

interface Props {
  patientId: number;
}

const LEVEL_CONFIG = {
  low: { color: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500", border: "border-emerald-200", label: "منخفض", labelEn: "LOW" },
  moderate: { color: "text-amber-700", bg: "bg-amber-50", bar: "bg-amber-500", border: "border-amber-200", label: "متوسط", labelEn: "MODERATE" },
  high: { color: "text-orange-700", bg: "bg-orange-50", bar: "bg-orange-500", border: "border-orange-200", label: "عالي", labelEn: "HIGH" },
  very_high: { color: "text-red-700", bg: "bg-red-50", bar: "bg-red-600", border: "border-red-200", label: "عالي جداً", labelEn: "VERY HIGH" },
};

const ICON_MAP: Record<string, React.ElementType> = {
  Droplets: Droplets,
  Heart: Heart,
  Bean: Activity,
  Waves: Waves,
  Activity: Activity,
};

const CATEGORY_EMOJI: Record<string, string> = {
  diabetes: "🩸",
  cardiovascular: "❤️",
  kidney: "🫘",
  liver: "🫁",
  anemia: "💉",
};

const PRIORITY_CONFIG = {
  immediate: { color: "text-red-700", bg: "bg-red-100", icon: "🔴" },
  short_term: { color: "text-amber-700", bg: "bg-amber-100", icon: "🟡" },
  long_term: { color: "text-emerald-700", bg: "bg-emerald-100", icon: "🟢" },
};

export function RiskAssessmentPanel({ patientId }: Props) {
  const [data, setData] = React.useState<RiskAssessmentResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [aiLoading, setAiLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await fetchRiskAssessment(patientId);
      if (!cancelled && result) setData(result);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [patientId]);

  async function handleAIInsight() {
    setAiLoading(true);
    const result = await fetchRiskAssessment(patientId, true);
    if (result?.aiInsight) {
      setData(result);
      toast.success("Clinical insight generated");
    }
    setAiLoading(false);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 justify-center text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          جاري حساب المخاطر الصحية...
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const healthColor = data.overallHealthScore >= 75 ? "text-emerald-600" : data.overallHealthScore >= 50 ? "text-amber-600" : "text-red-600";
  const healthBar = data.overallHealthScore >= 75 ? "bg-emerald-500" : data.overallHealthScore >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="size-5 text-[color:var(--color-brand-magenta)]" />
            تقييم المخاطر الصحية
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {new Date(data.assessmentDate).toLocaleDateString("ar-SA")}
          </Badge>
        </div>
        <CardDescription>تحليل تنبؤي لـ 5 فئات صحية بناءً على التحاليل والبيانات السريرية</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Overall Health Score */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">مؤشر الصحة العام</span>
            <span className={cn("text-2xl font-black tabular-nums", healthColor)}>{data.overallHealthScore}/100</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div className={cn("h-full rounded-full transition-all duration-1000", healthBar)} style={{ width: `${data.overallHealthScore}%` }} />
          </div>
          {data.topConcern && (
            <p className="mt-2 text-xs text-gray-600">{"⚠️ "}{data.topConcern}</p>
          )}
        </div>

        {/* 5 Risk Cards Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.risks.map((risk) => (
            <MiniRiskCard key={risk.id} risk={risk} />
          ))}
        </div>

        {/* Expanded details for high-risk categories */}
        {data.risks.filter((r) => r.score >= 26).sort((a, b) => b.score - a.score).map((risk) => (
          <ExpandedRiskCard key={`detail-${risk.id}`} risk={risk} />
        ))}

        {/* AI Insight */}
        {data.aiInsight ? (
          <div className="rounded-xl border border-[color:var(--color-brand-pink)]/20 bg-[color:var(--color-brand-pink)]/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
              <Sparkles className="size-4 text-[color:var(--color-brand-magenta)]" />
              رأي الذكاء الاصطناعي
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700" dir="rtl">{data.aiInsight}</p>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleAIInsight} disabled={aiLoading} className="gap-1.5">
            {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {aiLoading ? "جاري التحليل..." : "تحليل AI للمخاطر"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function MiniRiskCard({ risk }: { risk: RiskCategory }) {
  const config = LEVEL_CONFIG[risk.level];
  const emoji = CATEGORY_EMOJI[risk.id] ?? "📊";

  return (
    <div className={cn("rounded-xl border p-3 text-center transition-all hover:shadow-sm", config.border, config.bg)}>
      <span className="text-2xl">{emoji}</span>
      <div className="mt-1 text-xs font-semibold text-gray-800">{risk.name}</div>
      <div className="mt-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div className={cn("h-full rounded-full transition-all duration-700", config.bar)} style={{ width: `${risk.score}%` }} />
        </div>
      </div>
      <div className={cn("mt-1 text-lg font-black tabular-nums", config.color)}>{risk.score}</div>
      <Badge variant={risk.level === "very_high" ? "destructive" : risk.level === "high" ? "warning" : risk.level === "moderate" ? "warning" : "success"} className="text-[9px] mt-1">
        {config.labelEn}
      </Badge>
    </div>
  );
}

function ExpandedRiskCard({ risk }: { risk: RiskCategory }) {
  const [expanded, setExpanded] = React.useState(risk.score >= 50);
  const config = LEVEL_CONFIG[risk.level];
  const emoji = CATEGORY_EMOJI[risk.id] ?? "📊";

  return (
    <div className={cn("rounded-xl border overflow-hidden", config.border)}>
      <div className={cn("flex items-center justify-between p-3 cursor-pointer", config.bg)} onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <span className={cn("text-sm font-bold", config.color)}>{risk.nameEn} — {config.labelEn} ({risk.score}/100)</span>
            <div className="text-xs text-gray-600">{risk.name}</div>
          </div>
        </div>
        <ChevronDown className={cn("size-4 text-gray-500 transition-transform", expanded && "rotate-180")} />
      </div>

      <div className={cn("overflow-hidden transition-all duration-300", expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0")}>
        <div className="p-3 space-y-3 bg-white">
          {/* Contributing Factors */}
          {risk.contributingFactors.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase text-gray-500 mb-1">عوامل المخاطر</div>
              <ul className="space-y-1">
                {risk.contributingFactors.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-800">{"• "}{f.factor}</span>
                    <Badge variant="outline" className="text-[9px] tabular-nums">+{f.points}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preventive Actions */}
          {risk.preventiveActions.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase text-gray-500 mb-1">الإجراءات الوقائية</div>
              <ul className="space-y-1">
                {risk.preventiveActions.map((a, i) => {
                  const p = PRIORITY_CONFIG[a.priority];
                  return (
                    <li key={i} className="text-xs text-gray-700">
                      <span>{p.icon} </span>{a.action}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Next Test */}
          {risk.nextTestDate && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
              <Calendar className="size-3.5" />
              <span>{"📅 "}{risk.nextTestReason} — {risk.nextTestDate}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
