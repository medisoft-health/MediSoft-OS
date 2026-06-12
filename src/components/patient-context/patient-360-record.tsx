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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  AlertTriangle,
  Apple,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  Calendar,
  ChevronDown,
  Dumbbell,
  FileText,
  Filter,
  GitCompare,
  Heart,
  HeartPulse,
  Loader2,
  Minus,
  Pill,
  RefreshCw,
  ScanLine,
  Shield,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { usePatientContext } from "./patient-context-provider";
import Image from "next/image";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface PatientEvent {
  id: number;
  patientId: number;
  category: string;
  eventType: string;
  source: string;
  title: string;
  titleEn?: string;
  description?: string;
  data?: Record<string, unknown>;
  numericValue?: string;
  numericUnit?: string;
  eventDate: string;
  createdAt: string;
}

interface Patient360Summary {
  executiveSummary: string;
  executiveSummaryEn: string;
  healthScore: number;
  healthScoreLabel: string;
  keyFindings: Array<{
    category: string;
    finding: string;
    findingEn: string;
    severity: "info" | "warning" | "critical";
    recommendation: string;
    recommendationEn: string;
  }>;
  activeProblems: string[];
  currentMedications: string[];
  recentActivity: {
    lastVisit: string | null;
    totalEncounters: number;
    totalLabs: number;
    totalScans: number;
    totalEvents: number;
  };
  patientProfile: {
    age: number;
    sex: string;
    bloodType: string;
    allergies: string[];
    chronicConditions: string[];
  };
  generatedAt: string;
}

interface TrendSeries {
  id: string;
  name: string;
  nameEn: string;
  unit: string;
  category: string;
  data: Array<{ date: string; value: number; unit: string; isAbnormal?: boolean }>;
  normalRange?: { min: number; max: number };
  trend: "improving" | "stable" | "worsening" | "insufficient_data";
  latestValue: number | null;
  changePercent: number | null;
}

interface LabComparison {
  panelName: string;
  tests: Array<{
    testName: string;
    unit: string;
    previousValue: number | null;
    previousDate: string | null;
    currentValue: number | null;
    currentDate: string | null;
    change: number | null;
    changePercent: number | null;
    direction: "up" | "down" | "stable" | "new";
    isAbnormal: boolean;
    normalRange: { min: number; max: number } | null;
    interpretation: string;
    interpretationEn: string;
  }>;
  aiAnalysis: string;
  aiAnalysisEn: string;
}

interface RiskPrediction {
  overallRisk: "low" | "moderate" | "high" | "critical";
  overallScore: number;
  risks: Array<{
    id: string;
    name: string;
    nameEn: string;
    category: string;
    score: number;
    level: "low" | "moderate" | "high" | "critical";
    factors: string[];
    factorsEn: string[];
    recommendation: string;
    recommendationEn: string;
    timeframe: string;
    evidence: string[];
  }>;
  protectiveFactors: Array<{
    factor: string;
    factorEn: string;
    impact: string;
  }>;
  generatedAt: string;
}

interface SmartAlert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  actionRequired: boolean;
  suggestedAction: string;
  suggestedActionEn: string;
  relatedEventIds: number[];
  createdAt: string;
}

interface CumulativeInsight {
  id: string;
  type: "correlation" | "prediction" | "recommendation" | "pattern";
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  confidence: number;
  evidence: string[];
  relatedCategories: string[];
  actionable: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Category Config
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_CONFIG: Record<
  string,
  { icon: typeof Activity; color: string; bgColor: string; label: string }
> = {
  clinical: { icon: Stethoscope, color: "text-purple-700", bgColor: "bg-purple-100", label: "سريري" },
  medication: { icon: Pill, color: "text-pink-700", bgColor: "bg-pink-100", label: "أدوية" },
  lab: { icon: FileText, color: "text-blue-700", bgColor: "bg-blue-100", label: "تحاليل" },
  imaging: { icon: ScanLine, color: "text-cyan-700", bgColor: "bg-cyan-100", label: "أشعة" },
  vitals: { icon: HeartPulse, color: "text-rose-700", bgColor: "bg-rose-100", label: "علامات حيوية" },
  nutrition: { icon: Apple, color: "text-green-700", bgColor: "bg-green-100", label: "تغذية" },
  exercise: { icon: Dumbbell, color: "text-orange-700", bgColor: "bg-orange-100", label: "تمارين" },
  wellness: { icon: Heart, color: "text-red-700", bgColor: "bg-red-100", label: "صحة عامة" },
  social: { icon: Users, color: "text-indigo-700", bgColor: "bg-indigo-100", label: "اجتماعي" },
  education: { icon: BookOpen, color: "text-amber-700", bgColor: "bg-amber-100", label: "تعليم" },
  system: { icon: Sparkles, color: "text-slate-700", bgColor: "bg-slate-100", label: "نظام" },
};

const SOURCE_LABELS: Record<string, string> = {
  medisport: "MediSport",
  mediscript: "MediScript",
  pharmax: "PharmaX",
  medilab: "MediLab",
  mediscan: "MediScan",
  vitals: "العلامات الحيوية",
  system: "النظام",
  "patient-portal": "بوابة المريض",
};

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Components: AI Summary
// ═══════════════════════════════════════════════════════════════════════════════

function AISummaryPanel({ summary, loading, onRefresh }: {
  summary: Patient360Summary | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
          <span className="text-sm text-muted-foreground">جاري تحليل السجل الطبي بالذكاء الطبي...</span>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const getScoreColor = (s: number) => {
    if (s >= 85) return "text-green-600";
    if (s >= 70) return "text-blue-600";
    if (s >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (s: number) => {
    if (s >= 85) return "from-green-500/10 to-green-500/5";
    if (s >= 70) return "from-blue-500/10 to-blue-500/5";
    if (s >= 50) return "from-amber-500/10 to-amber-500/5";
    return "from-red-500/10 to-red-500/5";
  };

  return (
    <div className="space-y-4">
      {/* Health Score + Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Score */}
        <Card className={`relative overflow-hidden bg-gradient-to-br ${getScoreBg(summary.healthScore)}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">مؤشر الصحة العام</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-4xl font-bold ${getScoreColor(summary.healthScore)}`}>
                    {summary.healthScore}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <Badge variant="outline" className={`mt-2 ${getScoreColor(summary.healthScore)}`}>
                  {summary.healthScoreLabel}
                </Badge>
              </div>
              <div className="relative size-20">
                <svg className="size-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeDasharray={`${summary.healthScore}, 100`}
                    className={getScoreColor(summary.healthScore)} strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className={`size-6 ${getScoreColor(summary.healthScore)}`} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Executive Summary */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                الملخص التنفيذي — الذكاء الطبي
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onRefresh} className="h-7">
                <RefreshCw className="w-3 h-3 mr-1" />
                تحديث
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground">
              {summary.executiveSummary}
            </p>
            {summary.activeProblems.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {summary.activeProblems.map((problem, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {problem}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Findings */}
      {summary.keyFindings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              النتائج الرئيسية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.keyFindings.map((finding, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    finding.severity === "critical"
                      ? "border-red-200 bg-red-50"
                      : finding.severity === "warning"
                        ? "border-amber-200 bg-amber-50"
                        : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className={`mt-0.5 ${
                    finding.severity === "critical" ? "text-red-600" :
                    finding.severity === "warning" ? "text-amber-600" : "text-blue-600"
                  }`}>
                    {finding.severity === "critical" ? <AlertTriangle className="w-4 h-4" /> :
                     finding.severity === "warning" ? <Bell className="w-4 h-4" /> :
                     <Activity className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{finding.finding}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{finding.recommendation}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    {finding.category}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "الزيارات", value: summary.recentActivity.totalEncounters, icon: Stethoscope, color: "text-purple-600" },
          { label: "التحاليل", value: summary.recentActivity.totalLabs, icon: FileText, color: "text-blue-600" },
          { label: "الأشعة", value: summary.recentActivity.totalScans, icon: ScanLine, color: "text-cyan-600" },
          { label: "الأدوية", value: summary.currentMedications.length, icon: Pill, color: "text-pink-600" },
          { label: "إجمالي الأحداث", value: summary.recentActivity.totalEvents, icon: Activity, color: "text-slate-600" },
        ].map((item) => (
          <Card key={item.label} className="p-3">
            <div className="flex items-center gap-2">
              <div className={`grid size-8 place-items-center rounded-lg bg-muted ${item.color}`}>
                <item.icon className="size-4" />
              </div>
              <div>
                <p className="text-lg font-bold">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Components: Trend Charts
// ═══════════════════════════════════════════════════════════════════════════════

function TrendChartsPanel({ trends, loading }: { trends: TrendSeries[]; loading: boolean }) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
          <span className="text-sm text-muted-foreground">جاري تحميل الرسوم البيانية...</span>
        </CardContent>
      </Card>
    );
  }

  if (trends.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">لا توجد بيانات كافية لعرض الرسوم البيانية</p>
          <p className="text-xs text-muted-foreground mt-1">سيتم عرض الاتجاهات عند توفر قراءات متعددة</p>
        </CardContent>
      </Card>
    );
  }

  const categories = ["all", ...new Set(trends.map(t => t.category))];
  const filteredTrends = selectedCategory === "all" ? trends : trends.filter(t => t.category === selectedCategory);

  const categoryLabels: Record<string, string> = {
    all: "الكل",
    vitals: "علامات حيوية",
    lab: "تحاليل",
    body_composition: "تكوين الجسم",
    exercise: "تمارين",
    nutrition: "تغذية",
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return <TrendingUp className="w-3 h-3 text-green-600" />;
      case "worsening": return <TrendingDown className="w-3 h-3 text-red-600" />;
      case "stable": return <Minus className="w-3 h-3 text-blue-600" />;
      default: return <Activity className="w-3 h-3 text-gray-400" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case "improving": return "تحسن";
      case "worsening": return "تراجع";
      case "stable": return "مستقر";
      default: return "بيانات غير كافية";
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedCategory(cat)}
          >
            {categoryLabels[cat] || cat}
          </Button>
        ))}
      </div>

      {/* Trend Cards with Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTrends.map((series) => (
          <Card key={series.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {series.name}
                  <span className="text-xs text-muted-foreground">({series.unit})</span>
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  {getTrendIcon(series.trend)}
                  <span className="text-[10px] text-muted-foreground">{getTrendLabel(series.trend)}</span>
                  {series.changePercent !== null && (
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        series.changePercent > 0 ? "text-green-600" : series.changePercent < 0 ? "text-red-600" : ""
                      }`}
                    >
                      {series.changePercent > 0 ? "+" : ""}{series.changePercent}%
                    </Badge>
                  )}
                </div>
              </div>
              {series.latestValue !== null && (
                <p className="text-lg font-bold mt-1">
                  {series.latestValue} <span className="text-xs text-muted-foreground">{series.unit}</span>
                </p>
              )}
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series.data.map(d => ({
                    ...d,
                    date: new Date(d.date).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
                  }))}>
                    <defs>
                      <linearGradient id={`gradient-${series.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, direction: "rtl" }}
                      labelStyle={{ fontSize: 10 }}
                    />
                    {series.normalRange && (
                      <>
                        <ReferenceLine y={series.normalRange.max} stroke="#ef4444" strokeDasharray="3 3" />
                        <ReferenceLine y={series.normalRange.min} stroke="#ef4444" strokeDasharray="3 3" />
                      </>
                    )}
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill={`url(#gradient-${series.id})`}
                      strokeWidth={2}
                      dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Components: Lab Comparison
// ═══════════════════════════════════════════════════════════════════════════════

function LabComparisonPanel({ comparisons, loading }: { comparisons: LabComparison[]; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
          <span className="text-sm text-muted-foreground">جاري مقارنة التحاليل...</span>
        </CardContent>
      </Card>
    );
  }

  if (comparisons.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <GitCompare className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">لا توجد تحاليل كافية للمقارنة</p>
          <p className="text-xs text-muted-foreground mt-1">يلزم تحليلان على الأقل من نفس النوع</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {comparisons.map((comp, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-blue-600" />
              {comp.panelName}
            </CardTitle>
            {comp.aiAnalysis && (
              <CardDescription className="text-xs mt-1 leading-relaxed bg-blue-50 p-2 rounded-md border border-blue-100">
                <Brain className="w-3 h-3 inline mr-1 text-blue-600" />
                {comp.aiAnalysis}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2 pr-2 font-medium">التحليل</th>
                    <th className="text-center py-2 font-medium">السابق</th>
                    <th className="text-center py-2 font-medium">الحالي</th>
                    <th className="text-center py-2 font-medium">التغيير</th>
                    <th className="text-center py-2 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {comp.tests.map((test, i) => (
                    <tr key={i} className={`border-b last:border-0 ${test.isAbnormal ? "bg-red-50/50" : ""}`}>
                      <td className="py-2 pr-2 font-medium">{test.testName}</td>
                      <td className="text-center py-2 text-muted-foreground">
                        {test.previousValue !== null ? `${test.previousValue} ${test.unit}` : "—"}
                      </td>
                      <td className="text-center py-2 font-medium">
                        {test.currentValue !== null ? `${test.currentValue} ${test.unit}` : "—"}
                      </td>
                      <td className="text-center py-2">
                        {test.direction === "up" && (
                          <span className="inline-flex items-center gap-0.5 text-red-600">
                            <ArrowUp className="w-3 h-3" />
                            {test.changePercent !== null ? `${Math.abs(test.changePercent)}%` : ""}
                          </span>
                        )}
                        {test.direction === "down" && (
                          <span className="inline-flex items-center gap-0.5 text-green-600">
                            <ArrowDown className="w-3 h-3" />
                            {test.changePercent !== null ? `${Math.abs(test.changePercent)}%` : ""}
                          </span>
                        )}
                        {test.direction === "stable" && (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {test.direction === "new" && (
                          <Badge variant="secondary" className="text-[9px]">جديد</Badge>
                        )}
                      </td>
                      <td className="text-center py-2">
                        <Badge
                          variant={test.isAbnormal ? "destructive" : "secondary"}
                          className="text-[9px]"
                        >
                          {test.isAbnormal ? "غير طبيعي" : "طبيعي"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Components: Risk Prediction
// ═══════════════════════════════════════════════════════════════════════════════

function RiskPredictionPanel({ risk, loading }: { risk: RiskPrediction | null; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
          <span className="text-sm text-muted-foreground">جاري تقييم المخاطر...</span>
        </CardContent>
      </Card>
    );
  }

  if (!risk) return null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical": return "text-red-600 bg-red-50 border-red-200";
      case "high": return "text-orange-600 bg-orange-50 border-orange-200";
      case "moderate": return "text-amber-600 bg-amber-50 border-amber-200";
      default: return "text-green-600 bg-green-50 border-green-200";
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "critical": return "حرج";
      case "high": return "مرتفع";
      case "moderate": return "متوسط";
      default: return "منخفض";
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Risk */}
      <Card className={`border ${getRiskColor(risk.overallRisk)}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6" />
              <div>
                <p className="text-sm font-medium">مستوى الخطر العام</p>
                <p className="text-2xl font-bold">{getRiskLabel(risk.overallRisk)}</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-3xl font-bold">{risk.overallScore}</p>
              <p className="text-[10px] text-muted-foreground">/ 100</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Risks */}
      {risk.risks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {risk.risks.map((r) => (
            <Card key={r.id} className={`border ${getRiskColor(r.level)}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium">{r.name}</p>
                  <Badge variant="outline" className="text-[9px]">
                    {getRiskLabel(r.level)} ({r.score}%)
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        r.level === "critical" ? "bg-red-500" :
                        r.level === "high" ? "bg-orange-500" :
                        r.level === "moderate" ? "bg-amber-500" : "bg-green-500"
                      }`}
                      style={{ width: `${r.score}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    العوامل: {r.factors.join("، ")}
                  </p>
                  <p className="text-[10px] font-medium mt-1">
                    التوصية: {r.recommendation}
                  </p>
                  <Badge variant="secondary" className="text-[9px] mt-1">
                    الإطار الزمني: {r.timeframe}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Protective Factors */}
      {risk.protectiveFactors.length > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-green-700">
              <Shield className="w-4 h-4" />
              عوامل الحماية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {risk.protectiveFactors.map((pf, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-xs">{pf.factor}</span>
                  <span className="text-[10px] text-muted-foreground">— {pf.impact}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Components: Smart Alerts
// ═══════════════════════════════════════════════════════════════════════════════

function SmartAlertsPanel({ alerts, loading }: { alerts: SmartAlert[]; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">جاري فحص التنبيهات...</span>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardContent className="flex items-center gap-3 py-4">
          <Shield className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-700">لا توجد تنبيهات — الحالة مستقرة</p>
        </CardContent>
      </Card>
    );
  }

  const criticalAlerts = alerts.filter(a => a.severity === "critical");
  const warningAlerts = alerts.filter(a => a.severity === "warning");
  const infoAlerts = alerts.filter(a => a.severity === "info");

  return (
    <div className="space-y-3">
      {criticalAlerts.map(alert => (
        <Card key={alert.id} className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{alert.title}</p>
                <p className="text-xs text-red-700 mt-0.5">{alert.description}</p>
                {alert.actionRequired && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="destructive" className="text-[9px]">إجراء مطلوب</Badge>
                    <span className="text-[10px] text-red-600">{alert.suggestedAction}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {warningAlerts.map(alert => (
        <Card key={alert.id} className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">{alert.title}</p>
                <p className="text-xs text-amber-700 mt-0.5">{alert.description}</p>
                <p className="text-[10px] text-amber-600 mt-1">{alert.suggestedAction}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {infoAlerts.map(alert => (
        <Card key={alert.id} className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Activity className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">{alert.title}</p>
                <p className="text-xs text-blue-700 mt-0.5">{alert.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Components: Cumulative Intelligence
// ═══════════════════════════════════════════════════════════════════════════════

function CumulativeInsightsPanel({ insights, loading }: { insights: CumulativeInsight[]; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
          <span className="text-sm text-muted-foreground">جاري تحليل الأنماط التراكمية...</span>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Brain className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">لا توجد أنماط مكتشفة بعد</p>
          <p className="text-xs text-muted-foreground mt-1">كلما زادت البيانات المسجلة، أصبح النظام أذكى في اكتشاف الأنماط</p>
        </CardContent>
      </Card>
    );
  }

  const typeIcons: Record<string, typeof Activity> = {
    correlation: GitCompare,
    prediction: TrendingUp,
    recommendation: Sparkles,
    pattern: Brain,
  };

  const typeLabels: Record<string, string> = {
    correlation: "ارتباط",
    prediction: "تنبؤ",
    recommendation: "توصية",
    pattern: "نمط",
  };

  return (
    <div className="space-y-3">
      {insights.map((insight) => {
        const Icon = typeIcons[insight.type] || Brain;
        return (
          <Card key={insight.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <Badge variant="outline" className="text-[9px]">{typeLabels[insight.type]}</Badge>
                    {insight.actionable && (
                      <Badge variant="secondary" className="text-[9px] bg-green-100 text-green-700">قابل للتنفيذ</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      الثقة: {Math.round(insight.confidence * 100)}%
                    </span>
                    <div className="flex gap-1">
                      {insight.relatedCategories.map(cat => (
                        <Badge key={cat} variant="outline" className="text-[8px] h-4">
                          {CATEGORY_CONFIG[cat]?.label || cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Components: Timeline (Enhanced)
// ═══════════════════════════════════════════════════════════════════════════════

function EnhancedTimeline({
  events,
  loading,
  hasMore,
  onLoadMore,
  selectedCategory,
  onCategoryChange,
}: {
  events: PatientEvent[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  selectedCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
}) {
  const groupedEvents = React.useMemo(() => {
    const groups: Record<string, PatientEvent[]> = {};
    for (const event of events) {
      const date = new Date(event.eventDate).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    }
    return groups;
  }, [events]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            الخط الزمني الشامل
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {events.length} حدث
          </Badge>
        </div>
        <div className="flex gap-1.5 flex-wrap mt-3">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm" className="h-7 text-xs"
            onClick={() => onCategoryChange(null)}
          >
            <Filter className="w-3 h-3 mr-1" />
            الكل
          </Button>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? "default" : "outline"}
              size="sm" className="h-7 text-xs"
              onClick={() => onCategoryChange(key)}
            >
              <config.icon className="w-3 h-3 mr-1" />
              {config.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            لا توجد أحداث مسجلة بعد. ابدأ باستخدام أي Module لتسجيل البيانات.
          </div>
        )}
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([date, dateEvents]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{date}</span>
                <Badge variant="secondary" className="text-[9px] h-4">{dateEvents.length}</Badge>
                <div className="flex-1 h-px bg-border" />
              </div>
              <ol className="relative space-y-3 border-r-2 border-border pr-6 mr-2">
                {dateEvents.map((event) => {
                  const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.system;
                  const Icon = config.icon;
                  return (
                    <li key={event.id} className="relative">
                      <span className={`absolute -right-[29px] grid size-7 place-items-center rounded-full ring-4 ring-background ${config.bgColor}`}>
                        <Icon className={`size-3.5 ${config.color}`} />
                      </span>
                      <div className="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{event.title}</p>
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {new Date(event.eventDate).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {event.numericValue && (
                              <Badge variant="secondary" className="text-[10px] h-4">
                                {event.numericValue} {event.numericUnit}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] h-4">
                            {SOURCE_LABELS[event.source] || event.source}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] h-4">{config.label}</Badge>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
              تحميل المزيد
            </Button>
          </div>
        )}
        {loading && events.length === 0 && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function Patient360Record() {
  const { patient, mode } = usePatientContext();
  const [activeTab, setActiveTab] = React.useState("summary");

  // Timeline state
  const [events, setEvents] = React.useState<PatientEvent[]>([]);
  const [eventsLoading, setEventsLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  // AI Summary state
  const [summary, setSummary] = React.useState<Patient360Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = React.useState(false);

  // Trends state
  const [trends, setTrends] = React.useState<TrendSeries[]>([]);
  const [trendsLoading, setTrendsLoading] = React.useState(false);

  // Comparison state
  const [comparisons, setComparisons] = React.useState<LabComparison[]>([]);
  const [comparisonLoading, setComparisonLoading] = React.useState(false);

  // Risk state
  const [risk, setRisk] = React.useState<RiskPrediction | null>(null);
  const [riskLoading, setRiskLoading] = React.useState(false);

  // Alerts state
  const [alerts, setAlerts] = React.useState<SmartAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = React.useState(false);

  // Insights state
  const [insights, setInsights] = React.useState<CumulativeInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = React.useState(false);

  // Fetch functions
  const fetchSummary = React.useCallback(async () => {
    if (!patient) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/patient-360?patientId=${patient.id}&action=summary`);
      if (res.ok) {
        const { data } = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    } finally {
      setSummaryLoading(false);
    }
  }, [patient]);

  const fetchTrends = React.useCallback(async () => {
    if (!patient) return;
    setTrendsLoading(true);
    try {
      const res = await fetch(`/api/patient-360?patientId=${patient.id}&action=trends`);
      if (res.ok) {
        const { data } = await res.json();
        setTrends(data);
      }
    } catch (err) {
      console.error("Failed to fetch trends:", err);
    } finally {
      setTrendsLoading(false);
    }
  }, [patient]);

  const fetchComparisons = React.useCallback(async () => {
    if (!patient) return;
    setComparisonLoading(true);
    try {
      const res = await fetch(`/api/patient-360?patientId=${patient.id}&action=comparison`);
      if (res.ok) {
        const { data } = await res.json();
        setComparisons(data);
      }
    } catch (err) {
      console.error("Failed to fetch comparisons:", err);
    } finally {
      setComparisonLoading(false);
    }
  }, [patient]);

  const fetchRisk = React.useCallback(async () => {
    if (!patient) return;
    setRiskLoading(true);
    try {
      const res = await fetch(`/api/patient-360?patientId=${patient.id}&action=risk`);
      if (res.ok) {
        const { data } = await res.json();
        setRisk(data);
      }
    } catch (err) {
      console.error("Failed to fetch risk:", err);
    } finally {
      setRiskLoading(false);
    }
  }, [patient]);

  const fetchAlerts = React.useCallback(async () => {
    if (!patient) return;
    setAlertsLoading(true);
    try {
      const res = await fetch(`/api/patient-360?patientId=${patient.id}&action=alerts`);
      if (res.ok) {
        const { data } = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setAlertsLoading(false);
    }
  }, [patient]);

  const fetchInsights = React.useCallback(async () => {
    if (!patient) return;
    setInsightsLoading(true);
    try {
      const res = await fetch(`/api/patient-360?patientId=${patient.id}&action=insights`);
      if (res.ok) {
        const { data } = await res.json();
        setInsights(data);
      }
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  }, [patient]);

  const fetchEvents = React.useCallback(
    async (reset = false) => {
      if (!patient) return;
      setEventsLoading(true);
      try {
        const params = new URLSearchParams({
          patientId: patient.id.toString(),
          limit: "50",
          offset: reset ? "0" : offset.toString(),
        });
        if (selectedCategory) params.set("category", selectedCategory);
        const res = await fetch(`/api/patient-events?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (reset) {
            setEvents(data.events);
            setOffset(data.events.length);
          } else {
            setEvents((prev) => [...prev, ...data.events]);
            setOffset((prev) => prev + data.events.length);
          }
          setHasMore(data.hasMore);
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setEventsLoading(false);
      }
    },
    [patient, offset, selectedCategory]
  );

  // Load data on mount and tab change
  React.useEffect(() => {
    if (!patient) return;
    // Always load summary and alerts
    fetchSummary();
    fetchAlerts();
    fetchEvents(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  // Load tab-specific data
  React.useEffect(() => {
    if (!patient) return;
    switch (activeTab) {
      case "trends":
        if (trends.length === 0) fetchTrends();
        break;
      case "comparison":
        if (comparisons.length === 0) fetchComparisons();
        break;
      case "risk":
        if (!risk) fetchRisk();
        break;
      case "insights":
        if (insights.length === 0) fetchInsights();
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, patient?.id]);

  // Reload events when category filter changes
  React.useEffect(() => {
    if (patient) {
      setOffset(0);
      fetchEvents(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  if (mode !== "patient" || !patient) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Image
            src="/images/medi360-logo.png"
            alt="Medi360"
            width={200}
            height={56}
            className="mb-2"
            priority
          />
          <div className="max-w-sm">
            <div className="text-base font-semibold">السجل الطبي الشامل — Universal Patient Profile</div>
            <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
              اختر مريض من الشريط العلوي لعرض السجل الطبي الأكثر شمولاً في العالم.
              كل زيارة، كل تحليل، كل دواء، كل تمرين — كلها في مكان واحد مع تحليل ذكي.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Medi360 Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/images/medi360-icon.png"
            alt="Medi360"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <div>
            <h2 className="text-lg font-bold text-foreground">السجل الطبي الشامل</h2>
            <p className="text-xs text-muted-foreground">Universal Patient Profile — {patient.firstName} {patient.lastName}</p>
          </div>
        </div>
        <Image
          src="/images/medi360-logo.png"
          alt="Medi360"
          width={120}
          height={34}
          className="hidden md:block opacity-80"
        />
      </div>

      {/* Smart Alerts (always visible at top) */}
      {(alertsLoading || alerts.length > 0) && (
        <SmartAlertsPanel alerts={alerts} loading={alertsLoading} />
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="summary">
            <Brain className="size-3.5 mr-1" />
            الملخص الذكي
          </TabsTrigger>
          <TabsTrigger value="trends">
            <BarChart3 className="size-3.5 mr-1" />
            الاتجاهات
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <GitCompare className="size-3.5 mr-1" />
            المقارنة
          </TabsTrigger>
          <TabsTrigger value="risk">
            <ShieldAlert className="size-3.5 mr-1" />
            المخاطر
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Sparkles className="size-3.5 mr-1" />
            الذكاء التراكمي
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Activity className="size-3.5 mr-1" />
            الخط الزمني
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <AISummaryPanel summary={summary} loading={summaryLoading} onRefresh={fetchSummary} />
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <TrendChartsPanel trends={trends} loading={trendsLoading} />
        </TabsContent>

        <TabsContent value="comparison" className="mt-4">
          <LabComparisonPanel comparisons={comparisons} loading={comparisonLoading} />
        </TabsContent>

        <TabsContent value="risk" className="mt-4">
          <RiskPredictionPanel risk={risk} loading={riskLoading} />
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <CumulativeInsightsPanel insights={insights} loading={insightsLoading} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <EnhancedTimeline
            events={events}
            loading={eventsLoading}
            hasMore={hasMore}
            onLoadMore={() => fetchEvents(false)}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
