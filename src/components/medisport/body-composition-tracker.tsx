"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BodyCompositionHistory } from "@/components/sport/body-composition-history";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Loader2,
  Minus,
  Plus,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface BodyCompRecord {
  id: string;
  date: string;
  method: "dexa" | "bia" | "skinfold" | "mri";
  weight: number;
  bodyFatPercent: number;
  leanMassKg: number;
  boneMineralDensity?: number;
  visceralFatArea?: number;
  waterPercent?: number;
  bmi?: number;
  segmental?: {
    leftArm: { fatPercent: number; leanMassKg: number };
    rightArm: { fatPercent: number; leanMassKg: number };
    leftLeg: { fatPercent: number; leanMassKg: number };
    rightLeg: { fatPercent: number; leanMassKg: number };
    trunk: { fatPercent: number; leanMassKg: number };
  };
}

interface AIAnalysis {
  summary: string;
  recommendations: string[];
  riskFactors: string[];
  progressScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const METHODS = [
  { id: "dexa", name: "DEXA Scan", accuracy: "Gold Standard" },
  { id: "bia", name: "BIA (Bioimpedance)", accuracy: "Good" },
  { id: "skinfold", name: "Skinfold Caliper", accuracy: "Moderate" },
  { id: "mri", name: "MRI", accuracy: "Excellent" },
];

// Reference ranges by sport category
const BODY_FAT_RANGES = {
  male: {
    professional: { ideal: [6, 13], acceptable: [5, 15] },
    gym: { ideal: [8, 15], acceptable: [6, 18] },
    amateur: { ideal: [10, 18], acceptable: [8, 22] },
    healthy: { ideal: [14, 24], acceptable: [10, 28] },
  },
  female: {
    professional: { ideal: [14, 20], acceptable: [12, 24] },
    gym: { ideal: [16, 23], acceptable: [14, 26] },
    amateur: { ideal: [18, 25], acceptable: [16, 28] },
    healthy: { ideal: [20, 30], acceptable: [18, 33] },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Storage helpers
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "medisport-body-comp-records";

function loadRecords(): BodyCompRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: BodyCompRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function BodyCompositionTracker({
  category = "professional",
  sex = "male",
}: {
  category?: "professional" | "gym" | "amateur" | "healthy";
  sex?: "male" | "female";
}) {
  const [records, setRecords] = React.useState<BodyCompRecord[]>([]);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [aiAnalysis, setAiAnalysis] = React.useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");

  React.useEffect(() => {
    setRecords(loadRecords());
  }, []);

  const latestRecord = records[0];
  const previousRecord = records[1];
  const ranges = BODY_FAT_RANGES[sex][category];

  const handleAddRecord = (record: Omit<BodyCompRecord, "id">) => {
    const newRecord: BodyCompRecord = {
      ...record,
      id: crypto.randomUUID(),
    };
    const updated = [newRecord, ...records].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setRecords(updated);
    saveRecords(updated);
    setShowAddForm(false);
    toast.success("تم حفظ القياس الجديد");
  };

  const handleAnalyze = async () => {
    if (records.length < 2) {
      toast.error("يجب إضافة قياسين على الأقل للتحليل");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/medisport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze-body-composition",
          data: {
            current: {
              athleteId: 1,
              scanDate: records[0].date,
              method: records[0].method,
              bodyFatPercent: records[0].bodyFatPercent,
              leanMassKg: records[0].leanMassKg,
              boneMineralDensity: records[0].boneMineralDensity,
              visceralFatArea: records[0].visceralFatArea,
              hydrationPercent: records[0].waterPercent,
              bmi: records[0].bmi,
              segmental: records[0].segmental,
            },
            history: records.slice(1).map((r) => ({
              athleteId: 1,
              scanDate: r.date,
              method: r.method,
              bodyFatPercent: r.bodyFatPercent,
              leanMassKg: r.leanMassKg,
              boneMineralDensity: r.boneMineralDensity,
              visceralFatArea: r.visceralFatArea,
              hydrationPercent: r.waterPercent,
              bmi: r.bmi,
              segmental: r.segmental,
            })),
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis({
          summary: data.results?.summary || "تحليل مكتمل",
          recommendations: data.results?.recommendations || [],
          riskFactors: data.results?.riskFactors || [],
          progressScore: data.results?.progressScore || 75,
        });
      } else {
        // Fallback local analysis
        const fatDelta = records[0].bodyFatPercent - records[1].bodyFatPercent;
        const muscleDelta = records[0].leanMassKg - records[1].leanMassKg;
        setAiAnalysis({
          summary: `تحليل التغيرات: الدهون ${fatDelta > 0 ? "زادت" : "نقصت"} بنسبة ${Math.abs(fatDelta).toFixed(1)}%، الكتلة العضلية ${muscleDelta > 0 ? "زادت" : "نقصت"} بمقدار ${Math.abs(muscleDelta).toFixed(1)} كجم.`,
          recommendations: [
            muscleDelta < 0 ? "زيادة البروتين إلى 2.2 جم/كجم يومياً" : "استمر على البرنامج الحالي",
            fatDelta > 0 ? "مراجعة السعرات الحرارية وزيادة الكارديو" : "نسبة الدهون في تحسن مستمر",
            "إجراء قياس جديد بعد 4-6 أسابيع",
          ],
          riskFactors: fatDelta > 3 ? ["زيادة سريعة في الدهون — مراجعة النظام الغذائي"] : [],
          progressScore: fatDelta <= 0 && muscleDelta >= 0 ? 85 : 65,
        });
      }
    } catch {
      toast.error("خطأ في التحليل");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="border-indigo-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-5 w-5 text-indigo-600" />
            تتبع تكوين الجسم
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            قياس جديد
          </Button>
        </div>
        <CardDescription className="text-xs">
          تتبع الكتلة العضلية ونسبة الدهون والتغيرات الجسدية بمرور الوقت
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Record Form */}
        {showAddForm && (
          <AddRecordForm onSubmit={handleAddRecord} onCancel={() => setShowAddForm(false)} />
        )}

        {/* Tabs */}
        {records.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="text-[11px]">نظرة عامة</TabsTrigger>
              <TabsTrigger value="comparison" className="text-[11px]">مقارنة</TabsTrigger>
              <TabsTrigger value="segmental" className="text-[11px]">تحليل قطاعي</TabsTrigger>
              <TabsTrigger value="saved" className="text-[11px]">السجل المحفوظ</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-3 space-y-3">
              {/* Current Stats */}
              {latestRecord && (
                <div className="grid grid-cols-3 gap-2">
                  <StatCard
                    label="الوزن"
                    value={`${latestRecord.weight}`}
                    unit="كجم"
                    delta={previousRecord ? latestRecord.weight - previousRecord.weight : undefined}
                    deltaGood="down"
                    color="blue"
                  />
                  <StatCard
                    label="كتلة عضلية"
                    value={`${latestRecord.leanMassKg}`}
                    unit="كجم"
                    delta={previousRecord ? latestRecord.leanMassKg - previousRecord.leanMassKg : undefined}
                    deltaGood="up"
                    color="indigo"
                  />
                  <StatCard
                    label="نسبة الدهون"
                    value={`${latestRecord.bodyFatPercent}`}
                    unit="%"
                    delta={previousRecord ? latestRecord.bodyFatPercent - previousRecord.bodyFatPercent : undefined}
                    deltaGood="down"
                    color="orange"
                  />
                </div>
              )}

              {/* Body Fat Zone Indicator */}
              {latestRecord && (
                <BodyFatZone
                  value={latestRecord.bodyFatPercent}
                  ranges={ranges}
                />
              )}

              {/* History Timeline */}
              {records.length > 1 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground">السجل</h4>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {records.slice(0, 8).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{new Date(r.date).toLocaleDateString("ar-SA")}</span>
                          <Badge variant="outline" className="text-[9px] px-1">
                            {METHODS.find((m) => m.id === r.method)?.name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-blue-600 font-medium">{r.leanMassKg}kg</span>
                          <span className="text-orange-600 font-medium">{r.bodyFatPercent}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Comparison Tab */}
            <TabsContent value="comparison" className="mt-3 space-y-3">
              {records.length >= 2 ? (
                <ComparisonView records={records} />
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  أضف قياسين على الأقل لعرض المقارنة
                </div>
              )}
            </TabsContent>

            {/* Saved (DB-backed, mirrored with standalone) Tab */}
            <TabsContent value="saved" className="mt-3">
              <BodyCompositionHistory />
            </TabsContent>

            {/* Segmental Tab */}
            <TabsContent value="segmental" className="mt-3 space-y-3">
              {latestRecord?.segmental ? (
                <SegmentalView record={latestRecord} />
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                  <p>لا يوجد تحليل قطاعي</p>
                  <p className="text-[10px] mt-1">يتوفر مع قياسات DEXA أو BIA المتقدمة</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {records.length === 0 && !showAddForm && (
          <div className="text-center py-8">
            <Scale className="h-12 w-12 mx-auto text-indigo-200 mb-3" />
            <p className="text-sm font-medium">لا توجد قياسات بعد</p>
            <p className="text-xs text-muted-foreground mt-1">
              أضف أول قياس لتتبع تكوين جسمك
            </p>
            <Button
              size="sm"
              className="mt-3 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              إضافة قياس
            </Button>
          </div>
        )}

        {/* AI Analysis Button */}
        {records.length >= 2 && (
          <div className="space-y-3">
            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              size="sm"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              تحليل ذكي بالذكاء الطبي
            </Button>

            {/* AI Analysis Results */}
            {aiAnalysis && (
              <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900">تحليل الذكاء الطبي</span>
                  <Badge className="bg-purple-600 text-[10px]">
                    {aiAnalysis.progressScore}/100
                  </Badge>
                </div>
                <p className="text-xs text-purple-800 leading-relaxed">{aiAnalysis.summary}</p>
                {aiAnalysis.recommendations.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-purple-700">التوصيات:</p>
                    {aiAnalysis.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-purple-800">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
                {aiAnalysis.riskFactors.length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-2 space-y-1">
                    <p className="text-[10px] font-semibold text-red-700">تنبيهات:</p>
                    {aiAnalysis.riskFactors.map((risk, i) => (
                      <p key={i} className="text-[11px] text-red-700">⚠️ {risk}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  unit,
  delta,
  deltaGood,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  delta?: number;
  deltaGood: "up" | "down";
  color: "blue" | "indigo" | "orange";
}) {
  const colorMap = {
    blue: "border-blue-200 bg-blue-50",
    indigo: "border-indigo-200 bg-indigo-50",
    orange: "border-orange-200 bg-orange-50",
  };
  const textMap = {
    blue: "text-blue-700",
    indigo: "text-indigo-700",
    orange: "text-orange-700",
  };

  const isGood =
    delta !== undefined &&
    ((deltaGood === "up" && delta > 0) || (deltaGood === "down" && delta < 0));

  return (
    <div className={`text-center rounded-xl border-2 p-3 ${colorMap[color]}`}>
      <p className={`text-2xl font-bold ${textMap[color]}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label} ({unit})</p>
      {delta !== undefined && delta !== 0 && (
        <p className={`text-[10px] mt-1 flex items-center justify-center gap-0.5 ${isGood ? "text-green-600" : "text-red-500"}`}>
          {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}
        </p>
      )}
    </div>
  );
}

function BodyFatZone({
  value,
  ranges,
}: {
  value: number;
  ranges: { ideal: number[]; acceptable: number[] };
}) {
  const isIdeal = value >= ranges.ideal[0] && value <= ranges.ideal[1];
  const isAcceptable = value >= ranges.acceptable[0] && value <= ranges.acceptable[1];
  const zone = isIdeal ? "ideal" : isAcceptable ? "acceptable" : "outside";

  const zoneConfig = {
    ideal: { label: "مثالي", color: "bg-green-100 border-green-300 text-green-800", icon: "🎯" },
    acceptable: { label: "مقبول", color: "bg-yellow-100 border-yellow-300 text-yellow-800", icon: "⚡" },
    outside: { label: "خارج النطاق", color: "bg-red-100 border-red-300 text-red-800", icon: "⚠️" },
  };

  const config = zoneConfig[zone];

  // Calculate position on the bar (0-100%)
  const barMin = Math.max(0, ranges.acceptable[0] - 5);
  const barMax = ranges.acceptable[1] + 10;
  const position = Math.min(100, Math.max(0, ((value - barMin) / (barMax - barMin)) * 100));

  return (
    <div className={`rounded-lg border p-3 ${config.color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">{config.icon} نسبة الدهون: {config.label}</span>
        <span className="text-xs">{value}%</span>
      </div>
      {/* Visual bar */}
      <div className="relative h-3 rounded-full bg-gradient-to-r from-green-300 via-yellow-300 to-red-300 overflow-hidden">
        {/* Ideal zone highlight */}
        <div
          className="absolute top-0 h-full bg-green-500/30 border-x-2 border-green-600"
          style={{
            left: `${((ranges.ideal[0] - barMin) / (barMax - barMin)) * 100}%`,
            width: `${((ranges.ideal[1] - ranges.ideal[0]) / (barMax - barMin)) * 100}%`,
          }}
        />
        {/* Current position marker */}
        <div
          className="absolute top-0 h-full w-1 bg-slate-900 rounded-full"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
        <span>{barMin}%</span>
        <span>المثالي: {ranges.ideal[0]}-{ranges.ideal[1]}%</span>
        <span>{barMax}%</span>
      </div>
    </div>
  );
}

function ComparisonView({ records }: { records: BodyCompRecord[] }) {
  const [compareIdx, setCompareIdx] = React.useState(1);
  const latest = records[0];
  const compare = records[Math.min(compareIdx, records.length - 1)];

  if (!latest || !compare) return null;

  const metrics = [
    { label: "الوزن", key: "weight" as const, unit: "كجم", goodDir: "down" as const },
    { label: "الكتلة العضلية", key: "leanMassKg" as const, unit: "كجم", goodDir: "up" as const },
    { label: "نسبة الدهون", key: "bodyFatPercent" as const, unit: "%", goodDir: "down" as const },
    { label: "BMI", key: "bmi" as const, unit: "", goodDir: "down" as const },
  ];

  return (
    <div className="space-y-3">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">مقارنة مع:</span>
        <Select value={String(compareIdx)} onValueChange={(v) => setCompareIdx(Number(v))}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {records.slice(1).map((r, i) => (
              <SelectItem key={r.id} value={String(i + 1)} className="text-xs">
                {new Date(r.date).toLocaleDateString("ar-SA")} ({METHODS.find(m => m.id === r.method)?.name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Comparison Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-4 gap-0 bg-slate-100 px-3 py-2 text-[10px] font-semibold text-muted-foreground">
          <span>المؤشر</span>
          <span className="text-center">السابق</span>
          <span className="text-center">الحالي</span>
          <span className="text-center">التغيير</span>
        </div>
        {metrics.map((m) => {
          const prev = (compare as any)[m.key] as number | undefined;
          const curr = (latest as any)[m.key] as number | undefined;
          if (prev == null || curr == null) return null;
          const delta = curr - prev;
          const isGood = (m.goodDir === "up" && delta > 0) || (m.goodDir === "down" && delta < 0);
          return (
            <div key={m.key} className="grid grid-cols-4 gap-0 border-t px-3 py-2.5 text-xs">
              <span className="font-medium">{m.label}</span>
              <span className="text-center text-muted-foreground">{prev.toFixed(1)} {m.unit}</span>
              <span className="text-center font-semibold">{curr.toFixed(1)} {m.unit}</span>
              <span className={`text-center font-semibold flex items-center justify-center gap-0.5 ${isGood ? "text-green-600" : delta === 0 ? "text-slate-500" : "text-red-500"}`}>
                {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {delta > 0 ? "+" : ""}{delta.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Visual Progress Bars */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold">التقدم البصري</h4>
        <ProgressBar
          label="كتلة عضلية"
          current={latest.leanMassKg}
          previous={compare.leanMassKg}
          max={latest.weight}
          color="indigo"
        />
        <ProgressBar
          label="نسبة الدهون"
          current={latest.bodyFatPercent}
          previous={compare.bodyFatPercent}
          max={50}
          color="orange"
          inverted
        />
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  current,
  previous,
  max,
  color,
  inverted = false,
}: {
  label: string;
  current: number;
  previous: number;
  max: number;
  color: "indigo" | "orange";
  inverted?: boolean;
}) {
  const currPct = (current / max) * 100;
  const prevPct = (previous / max) * 100;
  const delta = current - previous;
  const isGood = inverted ? delta < 0 : delta > 0;

  const barColor = color === "indigo" ? "bg-indigo-500" : "bg-orange-500";
  const prevColor = "bg-slate-300";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-medium">{label}</span>
        <span className={isGood ? "text-green-600" : "text-red-500"}>
          {delta > 0 ? "+" : ""}{delta.toFixed(1)} ({isGood ? "تحسن" : "تراجع"})
        </span>
      </div>
      <div className="relative h-4 rounded-full bg-slate-100 overflow-hidden">
        {/* Previous */}
        <div className={`absolute top-0 h-full ${prevColor} opacity-50 rounded-full`} style={{ width: `${prevPct}%` }} />
        {/* Current */}
        <div className={`absolute top-0 h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${currPct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>السابق: {previous.toFixed(1)}</span>
        <span>الحالي: {current.toFixed(1)}</span>
      </div>
    </div>
  );
}

function SegmentalView({ record }: { record: BodyCompRecord }) {
  if (!record.segmental) return null;

  const segments = [
    { key: "leftArm", label: "الذراع الأيسر", icon: "💪" },
    { key: "rightArm", label: "الذراع الأيمن", icon: "💪" },
    { key: "trunk", label: "الجذع", icon: "🫁" },
    { key: "leftLeg", label: "الساق اليسرى", icon: "🦵" },
    { key: "rightLeg", label: "الساق اليمنى", icon: "🦵" },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold flex items-center gap-1.5">
        <User className="h-4 w-4 text-indigo-600" />
        التحليل القطاعي للجسم
      </h4>

      {/* Body Diagram - Simplified */}
      <div className="grid grid-cols-1 gap-2">
        {segments.map((seg) => {
          const data = (record.segmental as any)[seg.key];
          if (!data) return null;
          return (
            <div key={seg.key} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{seg.icon}</span>
                <span className="text-xs font-medium">{seg.label}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs font-bold text-indigo-600">{data.leanMassKg} كجم</p>
                  <p className="text-[9px] text-muted-foreground">عضلات</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-orange-600">{data.fatPercent}%</p>
                  <p className="text-[9px] text-muted-foreground">دهون</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Symmetry Check */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-xs font-semibold text-blue-800 mb-1">🔄 فحص التماثل</p>
        <div className="space-y-1 text-[11px] text-blue-700">
          <SymmetryRow
            label="الذراعين"
            left={record.segmental.leftArm.leanMassKg}
            right={record.segmental.rightArm.leanMassKg}
          />
          <SymmetryRow
            label="الساقين"
            left={record.segmental.leftLeg.leanMassKg}
            right={record.segmental.rightLeg.leanMassKg}
          />
        </div>
      </div>
    </div>
  );
}

function SymmetryRow({ label, left, right }: { label: string; left: number; right: number }) {
  const diff = Math.abs(left - right);
  const pct = ((diff / Math.max(left, right)) * 100).toFixed(1);
  const isBalanced = diff < 0.5;

  return (
    <div className="flex items-center justify-between">
      <span>{label}: يسار {left} / يمين {right}</span>
      <Badge variant="outline" className={`text-[9px] ${isBalanced ? "border-green-300 text-green-700" : "border-amber-300 text-amber-700"}`}>
        {isBalanced ? "متوازن ✓" : `فرق ${pct}%`}
      </Badge>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Add Record Form
// ═══════════════════════════════════════════════════════════════════════════════

function AddRecordForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (record: Omit<BodyCompRecord, "id">) => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = React.useState<string>("bia");
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [weight, setWeight] = React.useState("");
  const [bodyFat, setBodyFat] = React.useState("");
  const [leanMass, setLeanMass] = React.useState("");
  const [waterPct, setWaterPct] = React.useState("");
  const [showSegmental, setShowSegmental] = React.useState(false);
  const [segmental, setSegmental] = React.useState({
    leftArm: { fatPercent: "", leanMassKg: "" },
    rightArm: { fatPercent: "", leanMassKg: "" },
    leftLeg: { fatPercent: "", leanMassKg: "" },
    rightLeg: { fatPercent: "", leanMassKg: "" },
    trunk: { fatPercent: "", leanMassKg: "" },
  });

  // Auto-calculate lean mass if weight and body fat are provided
  React.useEffect(() => {
    if (weight && bodyFat && !leanMass) {
      const w = parseFloat(weight);
      const bf = parseFloat(bodyFat);
      if (!isNaN(w) && !isNaN(bf)) {
        setLeanMass((w * (1 - bf / 100)).toFixed(1));
      }
    }
  }, [weight, bodyFat, leanMass]);

  const handleSubmit = () => {
    if (!weight || !bodyFat) {
      toast.error("الوزن ونسبة الدهون مطلوبان");
      return;
    }

    const w = parseFloat(weight);
    const bf = parseFloat(bodyFat);
    const lm = leanMass ? parseFloat(leanMass) : w * (1 - bf / 100);
    const bmi = w / Math.pow(parseFloat(weight) > 100 ? 1.75 : 1.75, 2); // default height

    const record: Omit<BodyCompRecord, "id"> = {
      date,
      method: method as BodyCompRecord["method"],
      weight: w,
      bodyFatPercent: bf,
      leanMassKg: parseFloat(lm.toFixed(1)),
      waterPercent: waterPct ? parseFloat(waterPct) : undefined,
      bmi: parseFloat(bmi.toFixed(1)),
    };

    if (showSegmental) {
      const seg: any = {};
      let hasData = false;
      for (const [key, val] of Object.entries(segmental)) {
        if (val.fatPercent && val.leanMassKg) {
          seg[key] = {
            fatPercent: parseFloat(val.fatPercent),
            leanMassKg: parseFloat(val.leanMassKg),
          };
          hasData = true;
        }
      }
      if (hasData) record.segmental = seg;
    }

    onSubmit(record);
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-4 space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Plus className="h-4 w-4 text-indigo-600" />
        إضافة قياس جديد
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">التاريخ</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-xs" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">طريقة القياس</label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {METHODS.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.name} ({m.accuracy})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">الوزن (كجم) *</label>
          <Input type="number" step="0.1" placeholder="75" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-9 text-xs" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">دهون (%) *</label>
          <Input type="number" step="0.1" placeholder="15" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} className="h-9 text-xs" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">عضلات (كجم)</label>
          <Input type="number" step="0.1" placeholder="auto" value={leanMass} onChange={(e) => setLeanMass(e.target.value)} className="h-9 text-xs" />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground mb-1 block">نسبة الماء (%)</label>
        <Input type="number" step="0.1" placeholder="60" value={waterPct} onChange={(e) => setWaterPct(e.target.value)} className="h-9 text-xs w-1/3" />
      </div>

      {/* Segmental Toggle */}
      <button
        onClick={() => setShowSegmental(!showSegmental)}
        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
      >
        {showSegmental ? "▼ إخفاء التحليل القطاعي" : "▶ إضافة تحليل قطاعي (اختياري)"}
      </button>

      {showSegmental && (
        <div className="space-y-2 rounded-lg border p-3 bg-white">
          {[
            { key: "leftArm", label: "الذراع الأيسر" },
            { key: "rightArm", label: "الذراع الأيمن" },
            { key: "trunk", label: "الجذع" },
            { key: "leftLeg", label: "الساق اليسرى" },
            { key: "rightLeg", label: "الساق اليمنى" },
          ].map((seg) => (
            <div key={seg.key} className="grid grid-cols-3 gap-2 items-center">
              <span className="text-[10px] font-medium">{seg.label}</span>
              <Input
                type="number"
                step="0.1"
                placeholder="عضلات (كجم)"
                className="h-7 text-[10px]"
                value={(segmental as any)[seg.key].leanMassKg}
                onChange={(e) =>
                  setSegmental((s) => ({
                    ...s,
                    [seg.key]: { ...s[seg.key as keyof typeof s], leanMassKg: e.target.value },
                  }))
                }
              />
              <Input
                type="number"
                step="0.1"
                placeholder="دهون (%)"
                className="h-7 text-[10px]"
                value={(segmental as any)[seg.key].fatPercent}
                onChange={(e) =>
                  setSegmental((s) => ({
                    ...s,
                    [seg.key]: { ...s[seg.key as keyof typeof s], fatPercent: e.target.value },
                  }))
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleSubmit} size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700">
          حفظ القياس
        </Button>
        <Button onClick={onCancel} size="sm" variant="outline" className="flex-1">
          إلغاء
        </Button>
      </div>
    </div>
  );
}
