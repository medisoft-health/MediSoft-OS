"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Heart,
  Lightbulb,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Target,
  Droplets,
  Activity,
  Brain,
  Shield,
  Apple,
  Moon,
  Dumbbell,
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface LabResult {
  testName: string;
  value: number | string;
  unit?: string;
  referenceLow?: number | string;
  referenceHigh?: number | string;
  flag?: string;
}

interface SimplifiedResult {
  name: string;
  nameAr: string;
  emoji: string;
  status: "excellent" | "good" | "attention" | "urgent";
  whatItMeans: string;
  actionTip: string;
  value: string;
  unit: string;
}

interface SimpleSummary {
  overallMessage: string;
  healthEmoji: string;
  goodNews: string[];
  needsAttention: string[];
  topActions: Array<{
    icon: string;
    action: string;
    reason: string;
    category: "nutrition" | "exercise" | "sleep" | "medical" | "lifestyle";
  }>;
  results: SimplifiedResult[];
  encouragement: string;
}

interface Props {
  labResultId: string;
  results: LabResult[];
  patientName: string;
}

// ─────────────────────────────────────────────────────────────────
// Category Icons
// ─────────────────────────────────────────────────────────────────
const categoryIcons: Record<string, React.ReactNode> = {
  nutrition: <Apple className="size-4 text-green-600" />,
  exercise: <Dumbbell className="size-4 text-blue-600" />,
  sleep: <Moon className="size-4 text-indigo-600" />,
  medical: <Shield className="size-4 text-rose-600" />,
  lifestyle: <Heart className="size-4 text-pink-600" />,
};

const statusConfig = {
  excellent: {
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle2 className="size-4 text-emerald-600" />,
    label: "ممتاز",
  },
  good: {
    color: "bg-blue-50 border-blue-200 text-blue-800",
    badge: "bg-blue-100 text-blue-700",
    icon: <CheckCircle2 className="size-4 text-blue-600" />,
    label: "جيد",
  },
  attention: {
    color: "bg-amber-50 border-amber-200 text-amber-800",
    badge: "bg-amber-100 text-amber-700",
    icon: <AlertTriangle className="size-4 text-amber-600" />,
    label: "يحتاج انتباه",
  },
  urgent: {
    color: "bg-rose-50 border-rose-200 text-rose-800",
    badge: "bg-rose-100 text-rose-700",
    icon: <AlertTriangle className="size-4 text-rose-600" />,
    label: "مهم",
  },
};

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
export function PatientSimpleSummary({ labResultId, results, patientName }: Props) {
  const [summary, setSummary] = React.useState<SimpleSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [showAllResults, setShowAllResults] = React.useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/medilab/patient-simple-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labResultId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "فشل في توليد الملخص");
      }
      const data = await res.json();
      setSummary(data);
      setExpanded(true);
    } catch (e: any) {
      setError(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate on mount
  React.useEffect(() => {
    if (!summary && !loading) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Card className="border-2 border-dashed border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="relative">
            <Loader2 className="size-10 animate-spin text-sky-500" />
            <Sparkles className="absolute -top-1 -right-1 size-4 text-amber-400 animate-pulse" />
          </div>
          <p className="mt-4 text-sm font-medium text-sky-700">
            جاري تحليل نتائجك بلغة بسيطة...
          </p>
          <p className="mt-1 text-xs text-sky-500">
            الذكاء الطبي يقرأ تحاليلك ويجهز ملخص سهل الفهم
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4">
          <p className="text-sm text-amber-700">{error}</p>
          <Button size="sm" variant="outline" onClick={generate} className="mt-2">
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const attentionResults = summary.results.filter(
    (r) => r.status === "attention" || r.status === "urgent"
  );
  const goodResults = summary.results.filter(
    (r) => r.status === "excellent" || r.status === "good"
  );

  return (
    <Card className="overflow-hidden border-2 border-sky-200 bg-gradient-to-br from-white to-sky-50/30">
      {/* Header with health emoji and overall message */}
      <CardHeader className="bg-gradient-to-l from-sky-100/50 to-transparent pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm text-2xl">
              {summary.healthEmoji}
            </div>
            <div>
              <CardTitle className="text-base font-bold text-sky-900">
                ماذا تعني نتائجك بالنسبة لك؟
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs text-sky-600">
                ملخص مبسط لتحاليلك — بدون مصطلحات طبية معقدة
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-sky-600"
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>

        {/* Overall message */}
        <div className="mt-3 rounded-xl bg-white/80 p-3 text-sm leading-relaxed text-gray-800 shadow-sm">
          <span className="font-semibold text-sky-800">{patientName}، </span>
          {summary.overallMessage}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 pt-2">
          {/* Good News Section */}
          {summary.goodNews.length > 0 && (
            <div className="rounded-xl bg-emerald-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 className="size-4" />
                أخبار جيدة ✨
              </div>
              <ul className="space-y-1.5">
                {summary.goodNews.map((news, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-emerald-700">
                    <span className="mt-0.5 text-emerald-500">●</span>
                    {news}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Needs Attention Section */}
          {summary.needsAttention.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
                <AlertTriangle className="size-4" />
                يحتاج انتباهك
              </div>
              <ul className="space-y-1.5">
                {summary.needsAttention.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                    <span className="mt-0.5 text-amber-500">●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top Actions — What to do */}
          {summary.topActions.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                <Lightbulb className="size-4 text-amber-500" />
                ماذا أفعل الآن؟
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {summary.topActions.map((action, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                  >
                    <div className="mt-0.5">
                      {categoryIcons[action.category] || <Target className="size-4 text-gray-500" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{action.action}</p>
                      <p className="mt-0.5 text-[10px] text-gray-500">{action.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Results (expandable) */}
          <div>
            <button
              onClick={() => setShowAllResults(!showAllResults)}
              className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Activity className="size-4" />
                تفاصيل كل تحليل ({summary.results.length} تحليل)
              </span>
              {showAllResults ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {showAllResults && (
              <div className="mt-3 space-y-2">
                {/* Attention items first */}
                {attentionResults.length > 0 && (
                  <div className="space-y-2">
                    {attentionResults.map((result, i) => (
                      <ResultCard key={`att-${i}`} result={result} />
                    ))}
                  </div>
                )}
                {/* Good items */}
                {goodResults.length > 0 && (
                  <div className="space-y-2">
                    {goodResults.map((result, i) => (
                      <ResultCard key={`good-${i}`} result={result} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Encouragement */}
          <div className="rounded-xl bg-gradient-to-l from-sky-100 to-indigo-100 p-4 text-center">
            <p className="text-sm font-medium text-sky-800">
              {summary.encouragement}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Result Card
// ─────────────────────────────────────────────────────────────────
function ResultCard({ result }: { result: SimplifiedResult }) {
  const config = statusConfig[result.status];

  return (
    <div className={cn("rounded-xl border p-3", config.color)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{result.emoji}</span>
          <div>
            <span className="text-xs font-bold">{result.nameAr}</span>
            <span className="mr-2 text-[10px] text-gray-500">({result.name})</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold">
            {result.value} {result.unit}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", config.badge)}>
            {config.label}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed">{result.whatItMeans}</p>
      {result.actionTip && (
        <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold">
          <Lightbulb className="size-3" />
          {result.actionTip}
        </p>
      )}
    </div>
  );
}
