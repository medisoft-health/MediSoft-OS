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
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { LabResultsHistory } from "@/components/sport/lab-results-history";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface LabReport {
  id: string;
  date: string;
  title: string;
  sport?: string;
  seasonPhase?: "pre-season" | "in-season" | "off-season" | "transition";
  markers: LabMarkerEntry[];
}

interface LabMarkerEntry {
  category: string;
  name: string;
  value: number;
  unit: string;
  athleteRange: { min: number; max: number };
  clinicalRange: { min: number; max: number };
}

interface ComparisonResult {
  marker: string;
  oldValue: number;
  newValue: number;
  unit: string;
  delta: number;
  deltaPercent: number;
  status: "improved" | "stable" | "declined" | "critical";
  athleteRange: { min: number; max: number };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants — Athlete-specific lab reference ranges
// ═══════════════════════════════════════════════════════════════════════════════

const MARKER_CATEGORIES = [
  { id: "muscle_recovery", name: "استشفاء العضلات", icon: "💪" },
  { id: "hormonal", name: "هرمونات", icon: "⚡" },
  { id: "iron_oxygen", name: "حديد وأكسجين", icon: "🩸" },
  { id: "inflammation", name: "التهابات", icon: "🔥" },
  { id: "metabolic", name: "أيض", icon: "⚙️" },
  { id: "bone_joint", name: "عظام ومفاصل", icon: "🦴" },
  { id: "hydration", name: "ترطيب", icon: "💧" },
  { id: "kidney_liver", name: "كلى وكبد", icon: "🫘" },
  { id: "immune", name: "مناعة", icon: "🛡️" },
];

const COMMON_MARKERS = [
  { name: "CK (Creatine Kinase)", category: "muscle_recovery", unit: "U/L", athleteRange: { min: 40, max: 500 }, clinicalRange: { min: 30, max: 200 } },
  { name: "LDH", category: "muscle_recovery", unit: "U/L", athleteRange: { min: 120, max: 300 }, clinicalRange: { min: 120, max: 246 } },
  { name: "Myoglobin", category: "muscle_recovery", unit: "ng/mL", athleteRange: { min: 20, max: 90 }, clinicalRange: { min: 25, max: 72 } },
  { name: "Testosterone", category: "hormonal", unit: "ng/dL", athleteRange: { min: 400, max: 1000 }, clinicalRange: { min: 270, max: 1070 } },
  { name: "Cortisol", category: "hormonal", unit: "µg/dL", athleteRange: { min: 5, max: 20 }, clinicalRange: { min: 6, max: 23 } },
  { name: "T/C Ratio", category: "hormonal", unit: "ratio", athleteRange: { min: 0.3, max: 2.0 }, clinicalRange: { min: 0.2, max: 2.5 } },
  { name: "IGF-1", category: "hormonal", unit: "ng/mL", athleteRange: { min: 150, max: 400 }, clinicalRange: { min: 100, max: 400 } },
  { name: "Hemoglobin", category: "iron_oxygen", unit: "g/dL", athleteRange: { min: 14, max: 17.5 }, clinicalRange: { min: 13.5, max: 17.5 } },
  { name: "Ferritin", category: "iron_oxygen", unit: "ng/mL", athleteRange: { min: 50, max: 200 }, clinicalRange: { min: 20, max: 300 } },
  { name: "Iron", category: "iron_oxygen", unit: "µg/dL", athleteRange: { min: 65, max: 175 }, clinicalRange: { min: 60, max: 170 } },
  { name: "VO2max (estimated)", category: "iron_oxygen", unit: "mL/kg/min", athleteRange: { min: 45, max: 80 }, clinicalRange: { min: 30, max: 60 } },
  { name: "CRP (hs)", category: "inflammation", unit: "mg/L", athleteRange: { min: 0, max: 3 }, clinicalRange: { min: 0, max: 5 } },
  { name: "IL-6", category: "inflammation", unit: "pg/mL", athleteRange: { min: 0, max: 5 }, clinicalRange: { min: 0, max: 7 } },
  { name: "ESR", category: "inflammation", unit: "mm/hr", athleteRange: { min: 0, max: 15 }, clinicalRange: { min: 0, max: 20 } },
  { name: "Glucose (Fasting)", category: "metabolic", unit: "mg/dL", athleteRange: { min: 70, max: 100 }, clinicalRange: { min: 70, max: 100 } },
  { name: "HbA1c", category: "metabolic", unit: "%", athleteRange: { min: 4.0, max: 5.5 }, clinicalRange: { min: 4.0, max: 5.7 } },
  { name: "Vitamin D", category: "bone_joint", unit: "ng/mL", athleteRange: { min: 40, max: 80 }, clinicalRange: { min: 30, max: 100 } },
  { name: "Calcium", category: "bone_joint", unit: "mg/dL", athleteRange: { min: 8.5, max: 10.5 }, clinicalRange: { min: 8.5, max: 10.5 } },
  { name: "Sodium", category: "hydration", unit: "mEq/L", athleteRange: { min: 136, max: 145 }, clinicalRange: { min: 136, max: 145 } },
  { name: "Potassium", category: "hydration", unit: "mEq/L", athleteRange: { min: 3.5, max: 5.0 }, clinicalRange: { min: 3.5, max: 5.0 } },
  { name: "Magnesium", category: "hydration", unit: "mg/dL", athleteRange: { min: 2.0, max: 2.5 }, clinicalRange: { min: 1.7, max: 2.2 } },
  { name: "Creatinine", category: "kidney_liver", unit: "mg/dL", athleteRange: { min: 0.9, max: 1.5 }, clinicalRange: { min: 0.7, max: 1.3 } },
  { name: "BUN", category: "kidney_liver", unit: "mg/dL", athleteRange: { min: 10, max: 25 }, clinicalRange: { min: 7, max: 20 } },
  { name: "ALT", category: "kidney_liver", unit: "U/L", athleteRange: { min: 10, max: 50 }, clinicalRange: { min: 7, max: 56 } },
  { name: "WBC", category: "immune", unit: "×10³/µL", athleteRange: { min: 4.0, max: 10.0 }, clinicalRange: { min: 4.5, max: 11.0 } },
  { name: "Lymphocytes", category: "immune", unit: "%", athleteRange: { min: 20, max: 40 }, clinicalRange: { min: 20, max: 40 } },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Storage
// ═══════════════════════════════════════════════════════════════════════════════

const LAB_STORAGE_KEY = "medisport-lab-reports";

function loadLabReports(): LabReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LAB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLabReports(reports: LabReport[]) {
  localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(reports));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function LabComparison({ sport = "football" }: { sport?: string }) {
  const [reports, setReports] = React.useState<LabReport[]>([]);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [compareMode, setCompareMode] = React.useState(false);
  const [selectedOld, setSelectedOld] = React.useState<string>("");
  const [selectedNew, setSelectedNew] = React.useState<string>("");
  const [aiInsight, setAiInsight] = React.useState<string | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("reports");

  React.useEffect(() => {
    setReports(loadLabReports());
  }, []);

  const handleAddReport = (report: Omit<LabReport, "id">) => {
    const newReport: LabReport = { ...report, id: crypto.randomUUID() };
    const updated = [newReport, ...reports].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setReports(updated);
    saveLabReports(updated);
    setShowAddForm(false);
    toast.success("تم حفظ التقرير");
  };

  const getComparison = (): ComparisonResult[] => {
    const oldReport = reports.find((r) => r.id === selectedOld);
    const newReport = reports.find((r) => r.id === selectedNew);
    if (!oldReport || !newReport) return [];

    const results: ComparisonResult[] = [];
    for (const newMarker of newReport.markers) {
      const oldMarker = oldReport.markers.find((m) => m.name === newMarker.name);
      if (!oldMarker) continue;

      const delta = newMarker.value - oldMarker.value;
      const deltaPercent = oldMarker.value !== 0 ? (delta / oldMarker.value) * 100 : 0;

      // Determine status based on athlete range
      const inRange = newMarker.value >= newMarker.athleteRange.min && newMarker.value <= newMarker.athleteRange.max;
      const wasInRange = oldMarker.value >= oldMarker.athleteRange.min && oldMarker.value <= oldMarker.athleteRange.max;

      let status: ComparisonResult["status"];
      if (inRange && !wasInRange) status = "improved";
      else if (!inRange && wasInRange) status = "declined";
      else if (!inRange && Math.abs(deltaPercent) > 20) status = "critical";
      else if (Math.abs(deltaPercent) < 5) status = "stable";
      else if (inRange) status = "improved";
      else status = "declined";

      results.push({
        marker: newMarker.name,
        oldValue: oldMarker.value,
        newValue: newMarker.value,
        unit: newMarker.unit,
        delta,
        deltaPercent,
        status,
        athleteRange: newMarker.athleteRange,
      });
    }
    return results;
  };

  const handleAIAnalysis = async () => {
    const comparison = getComparison();
    if (comparison.length === 0) return;

    setAnalyzing(true);
    try {
      const oldReport = reports.find((r) => r.id === selectedOld);
      const newReport = reports.find((r) => r.id === selectedNew);

      const res = await fetch("/api/medisport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze-labs",
          data: {
            athleteId: 1,
            sport,
            seasonPhase: newReport?.seasonPhase || "in-season",
            testDate: newReport?.date || new Date().toISOString(),
            markers: newReport?.markers.map((m) => ({
              ...m,
              previousValues: oldReport?.markers
                .filter((om) => om.name === m.name)
                .map((om) => ({ value: om.value, date: oldReport.date })),
            })),
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiInsight(data.results?.summary || data.results?.aiInterpretation || "تحليل مكتمل — راجع التفاصيل أعلاه");
      } else {
        // Fallback
        const critical = comparison.filter((c) => c.status === "critical");
        const improved = comparison.filter((c) => c.status === "improved");
        setAiInsight(
          `تحليل ${comparison.length} مؤشر: ${improved.length} تحسنت، ${critical.length} تحتاج متابعة. ` +
          (critical.length > 0
            ? `⚠️ انتبه لـ: ${critical.map((c) => c.marker).join(", ")}`
            : "جميع المؤشرات في المسار الصحيح ✓")
        );
      }
    } catch {
      setAiInsight("خطأ في الاتصال بالتحليل الذكي — يرجى المحاولة لاحقاً");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="border-emerald-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-emerald-600" />
            مقارنة التحاليل المخبرية
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            تقرير جديد
          </Button>
        </div>
        <CardDescription className="text-xs">
          قارن تحاليلك القديمة والجديدة مع مراجع خاصة بالرياضيين
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Report Form */}
        {showAddForm && (
          <AddLabReportForm
            sport={sport}
            onSubmit={handleAddReport}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Tabs */}
        {reports.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reports" className="text-[11px]">التقارير</TabsTrigger>
              <TabsTrigger value="compare" className="text-[11px]">مقارنة</TabsTrigger>
              <TabsTrigger value="saved" className="text-[11px]">السجل المحفوظ</TabsTrigger>
            </TabsList>

            {/* Reports List Tab */}
            <TabsContent value="reports" className="mt-3 space-y-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-xs font-medium">{report.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(report.date).toLocaleDateString("ar-SA")}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1">
                        {report.markers.length} مؤشر
                      </Badge>
                      {report.seasonPhase && (
                        <Badge variant="secondary" className="text-[9px] px-1">
                          {report.seasonPhase === "pre-season" ? "ما قبل الموسم" :
                           report.seasonPhase === "in-season" ? "أثناء الموسم" :
                           report.seasonPhase === "off-season" ? "خارج الموسم" : "انتقالي"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {report.markers.some(
                      (m) => m.value < m.athleteRange.min || m.value > m.athleteRange.max
                    ) ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Compare Tab */}
            <TabsContent value="compare" className="mt-3 space-y-3">
              {reports.length >= 2 ? (
                <>
                  {/* Report Selectors */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">التقرير القديم</label>
                      <Select value={selectedOld} onValueChange={setSelectedOld}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر..." /></SelectTrigger>
                        <SelectContent>
                          {reports.map((r) => (
                            <SelectItem key={r.id} value={r.id} className="text-xs">
                              {r.title} ({new Date(r.date).toLocaleDateString("ar-SA")})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">التقرير الجديد</label>
                      <Select value={selectedNew} onValueChange={setSelectedNew}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر..." /></SelectTrigger>
                        <SelectContent>
                          {reports.map((r) => (
                            <SelectItem key={r.id} value={r.id} className="text-xs">
                              {r.title} ({new Date(r.date).toLocaleDateString("ar-SA")})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Comparison Results */}
                  {selectedOld && selectedNew && selectedOld !== selectedNew && (
                    <ComparisonResults
                      results={getComparison()}
                      onAnalyze={handleAIAnalysis}
                      analyzing={analyzing}
                      aiInsight={aiInsight}
                    />
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  أضف تقريرين على الأقل لإجراء المقارنة
                </div>
              )}
            </TabsContent>

            {/* DB-backed saved history (Phase 6) — mirrored with standalone */}
            <TabsContent value="saved" className="mt-3">
              <LabResultsHistory />
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {reports.length === 0 && !showAddForm && (
          <div className="text-center py-8">
            <FlaskConical className="h-12 w-12 mx-auto text-emerald-200 mb-3" />
            <p className="text-sm font-medium">لا توجد تقارير تحاليل</p>
            <p className="text-xs text-muted-foreground mt-1">
              أضف تقاريرك المخبرية لمقارنتها وتتبع التغيرات
            </p>
            <Button
              size="sm"
              className="mt-3 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              إضافة تقرير
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Comparison Results
// ═══════════════════════════════════════════════════════════════════════════════

function ComparisonResults({
  results,
  onAnalyze,
  analyzing,
  aiInsight,
}: {
  results: ComparisonResult[];
  onAnalyze: () => void;
  analyzing: boolean;
  aiInsight: string | null;
}) {
  const improved = results.filter((r) => r.status === "improved");
  const declined = results.filter((r) => r.status === "declined");
  const critical = results.filter((r) => r.status === "critical");
  const stable = results.filter((r) => r.status === "stable");

  return (
    <div className="space-y-3">
      {/* Summary Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle2 className="h-3 w-3 mr-1" /> {improved.length} تحسن
        </Badge>
        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
          <Minus className="h-3 w-3 mr-1" /> {stable.length} مستقر
        </Badge>
        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
          <AlertTriangle className="h-3 w-3 mr-1" /> {declined.length} تراجع
        </Badge>
        {critical.length > 0 && (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <XCircle className="h-3 w-3 mr-1" /> {critical.length} حرج
          </Badge>
        )}
      </div>

      {/* Results Table */}
      <div className="rounded-lg border overflow-hidden max-h-[350px] overflow-y-auto">
        <div className="grid grid-cols-5 gap-0 bg-slate-100 px-3 py-2 text-[10px] font-semibold text-muted-foreground sticky top-0">
          <span className="col-span-1">المؤشر</span>
          <span className="text-center">القديم</span>
          <span className="text-center">الجديد</span>
          <span className="text-center">التغيير</span>
          <span className="text-center">الحالة</span>
        </div>
        {results.map((r) => (
          <div key={r.marker} className="grid grid-cols-5 gap-0 border-t px-3 py-2 text-[11px] items-center">
            <span className="font-medium text-[10px] col-span-1 truncate">{r.marker}</span>
            <span className="text-center text-muted-foreground">{r.oldValue}</span>
            <span className="text-center font-semibold">{r.newValue}</span>
            <span className={`text-center flex items-center justify-center gap-0.5 ${
              r.status === "improved" ? "text-green-600" :
              r.status === "critical" ? "text-red-600" :
              r.status === "declined" ? "text-amber-600" : "text-slate-500"
            }`}>
              {r.delta > 0 ? <ArrowUp className="h-3 w-3" /> : r.delta < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {r.deltaPercent.toFixed(0)}%
            </span>
            <span className="text-center">
              <StatusBadge status={r.status} />
            </span>
          </div>
        ))}
      </div>

      {/* Athlete Range Info */}
      {critical.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
          <p className="text-xs font-semibold text-red-800">⚠️ مؤشرات خارج النطاق الرياضي:</p>
          {critical.map((c) => (
            <p key={c.marker} className="text-[11px] text-red-700">
              • {c.marker}: {c.newValue} {c.unit} (النطاق الرياضي: {c.athleteRange.min}-{c.athleteRange.max})
            </p>
          ))}
        </div>
      )}

      {/* AI Analysis */}
      <Button
        onClick={onAnalyze}
        disabled={analyzing}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        size="sm"
      >
        {analyzing ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        تحليل ذكي للمقارنة
      </Button>

      {aiInsight && (
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-900">تحليل الذكاء الطبي</span>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">{aiInsight}</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ComparisonResult["status"] }) {
  const config = {
    improved: { label: "تحسن", class: "bg-green-100 text-green-700 border-green-300" },
    stable: { label: "مستقر", class: "bg-blue-100 text-blue-700 border-blue-300" },
    declined: { label: "تراجع", class: "bg-amber-100 text-amber-700 border-amber-300" },
    critical: { label: "حرج", class: "bg-red-100 text-red-700 border-red-300" },
  };
  const c = config[status];
  return <Badge variant="outline" className={`text-[8px] px-1 py-0 ${c.class}`}>{c.label}</Badge>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Add Lab Report Form
// ═══════════════════════════════════════════════════════════════════════════════

function AddLabReportForm({
  sport,
  onSubmit,
  onCancel,
}: {
  sport: string;
  onSubmit: (report: Omit<LabReport, "id">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [seasonPhase, setSeasonPhase] = React.useState<string>("in-season");
  const [markers, setMarkers] = React.useState<LabMarkerEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState("muscle_recovery");
  const [selectedMarker, setSelectedMarker] = React.useState("");
  const [markerValue, setMarkerValue] = React.useState("");

  const filteredMarkers = COMMON_MARKERS.filter((m) => m.category === selectedCategory);

  const handleAddMarker = () => {
    if (!selectedMarker || !markerValue) {
      toast.error("اختر المؤشر وأدخل القيمة");
      return;
    }
    const template = COMMON_MARKERS.find((m) => m.name === selectedMarker);
    if (!template) return;

    // Check if already added
    if (markers.find((m) => m.name === selectedMarker)) {
      toast.error("هذا المؤشر مضاف بالفعل");
      return;
    }

    setMarkers([
      ...markers,
      {
        category: template.category,
        name: template.name,
        value: parseFloat(markerValue),
        unit: template.unit,
        athleteRange: template.athleteRange,
        clinicalRange: template.clinicalRange,
      },
    ]);
    setMarkerValue("");
    setSelectedMarker("");
  };

  const handleRemoveMarker = (name: string) => {
    setMarkers(markers.filter((m) => m.name !== name));
  };

  const handleSubmit = () => {
    if (!title || markers.length === 0) {
      toast.error("أدخل عنوان التقرير وأضف مؤشراً واحداً على الأقل");
      return;
    }
    onSubmit({
      title,
      date,
      sport,
      seasonPhase: seasonPhase as LabReport["seasonPhase"],
      markers,
    });
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-4 space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Plus className="h-4 w-4 text-emerald-600" />
        إضافة تقرير تحاليل
      </h4>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">عنوان التقرير *</label>
          <Input placeholder="تحاليل شهر يونيو" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-xs" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">التاريخ</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-xs" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">مرحلة الموسم</label>
          <Select value={seasonPhase} onValueChange={setSeasonPhase}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pre-season" className="text-xs">ما قبل الموسم</SelectItem>
              <SelectItem value="in-season" className="text-xs">أثناء الموسم</SelectItem>
              <SelectItem value="off-season" className="text-xs">خارج الموسم</SelectItem>
              <SelectItem value="transition" className="text-xs">انتقالي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add Markers */}
      <div className="rounded-lg border bg-white p-3 space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground">إضافة مؤشرات:</p>
        <div className="grid grid-cols-4 gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MARKER_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMarker} onValueChange={setSelectedMarker}>
            <SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="المؤشر" /></SelectTrigger>
            <SelectContent>
              {filteredMarkers.map((m) => (
                <SelectItem key={m.name} value={m.name} className="text-xs">
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            step="0.01"
            placeholder="القيمة"
            value={markerValue}
            onChange={(e) => setMarkerValue(e.target.value)}
            className="h-8 text-[10px]"
          />
          <Button size="sm" onClick={handleAddMarker} className="h-8 text-[10px] bg-emerald-600 hover:bg-emerald-700">
            أضف
          </Button>
        </div>

        {/* Added Markers */}
        {markers.length > 0 && (
          <div className="space-y-1 mt-2 max-h-[150px] overflow-y-auto">
            {markers.map((m) => {
              const inRange = m.value >= m.athleteRange.min && m.value <= m.athleteRange.max;
              return (
                <div key={m.name} className="flex items-center justify-between rounded border px-2 py-1.5 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground">{m.value} {m.unit}</span>
                    <Badge variant="outline" className={`text-[8px] px-1 ${inRange ? "border-green-300 text-green-700" : "border-red-300 text-red-700"}`}>
                      {inRange ? "طبيعي" : "خارج النطاق"}
                    </Badge>
                  </div>
                  <button onClick={() => handleRemoveMarker(m.name)} className="text-red-400 hover:text-red-600">
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Add Templates */}
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
        <p className="text-[10px] font-medium text-emerald-800 mb-1">قوالب سريعة:</p>
        <div className="flex flex-wrap gap-1">
          {["CBC Panel", "Hormonal Panel", "Iron Panel", "Metabolic Panel"].map((template) => (
            <button
              key={template}
              onClick={() => {
                let templateMarkers: typeof COMMON_MARKERS = [];
                if (template === "CBC Panel") templateMarkers = COMMON_MARKERS.filter(m => ["WBC", "Hemoglobin", "Lymphocytes"].includes(m.name));
                else if (template === "Hormonal Panel") templateMarkers = COMMON_MARKERS.filter(m => m.category === "hormonal");
                else if (template === "Iron Panel") templateMarkers = COMMON_MARKERS.filter(m => m.category === "iron_oxygen");
                else if (template === "Metabolic Panel") templateMarkers = COMMON_MARKERS.filter(m => m.category === "metabolic");

                const newMarkers = templateMarkers
                  .filter(tm => !markers.find(m => m.name === tm.name))
                  .map(tm => ({
                    category: tm.category,
                    name: tm.name,
                    value: 0,
                    unit: tm.unit,
                    athleteRange: tm.athleteRange,
                    clinicalRange: tm.clinicalRange,
                  }));
                setMarkers([...markers, ...newMarkers]);
                toast.info(`تم إضافة ${newMarkers.length} مؤشرات — أدخل القيم`);
              }}
              className="text-[9px] px-2 py-1 rounded bg-white border hover:bg-emerald-100 transition-colors"
            >
              {template}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleSubmit} size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
          حفظ التقرير ({markers.length} مؤشر)
        </Button>
        <Button onClick={onCancel} size="sm" variant="outline" className="flex-1">
          إلغاء
        </Button>
      </div>
    </div>
  );
}
