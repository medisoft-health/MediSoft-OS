"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Brain,
  ChevronDown,
  FlaskConical,
  Loader2,
  Pill,
  Search,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  fetchSymptomSuggestions,
  fetchDifferentialDiagnosis,
  type SymptomSuggestionClient,
  type DifferentialDiagnosisResult,
  type DiagnosisCandidate,
} from "@/lib/medilab/client";
import { cn } from "@/lib/utils";

interface Props {
  patientId: number;
  labResultId?: string;
}

const PROB_CONFIG = {
  very_likely: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-300", badge: "success" as const },
  likely: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-300", badge: "info" as const },
  possible: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300", badge: "warning" as const },
  unlikely: { color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200", badge: "outline" as const },
};

export function DifferentialDiagnosisPanel({ patientId }: Props) {
  const [phase, setPhase] = React.useState<"input" | "loading" | "results">("input");
  const [selectedSymptoms, setSelectedSymptoms] = React.useState<SymptomSuggestionClient[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<SymptomSuggestionClient[]>([]);
  const [associatedSuggestions, setAssociatedSuggestions] = React.useState<SymptomSuggestionClient[]>([]);
  const [duration, setDuration] = React.useState("");
  const [severity, setSeverity] = React.useState("");
  const [onset, setOnset] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [result, setResult] = React.useState<DifferentialDiagnosisResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search symptoms with debounce
  React.useEffect(() => {
    if (searchQuery.length < 2) { setSuggestions([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const results = await fetchSymptomSuggestions(searchQuery, selectedSymptoms.map((s) => s.id));
      setSuggestions(results.filter((s) => !selectedSymptoms.some((sel) => sel.id === s.id)));
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery, selectedSymptoms]);

  // Update associated suggestions when selection changes
  React.useEffect(() => {
    if (selectedSymptoms.length === 0) { setAssociatedSuggestions([]); return; }
    fetchSymptomSuggestions("", selectedSymptoms.map((s) => s.id)).then((r) => {
      setAssociatedSuggestions(r.filter((s) => !selectedSymptoms.some((sel) => sel.id === s.id)));
    });
  }, [selectedSymptoms]);

  function addSymptom(s: SymptomSuggestionClient) {
    if (selectedSymptoms.some((sel) => sel.id === s.id)) return;
    setSelectedSymptoms((prev) => [...prev, s]);
    setSearchQuery("");
    setSuggestions([]);
  }

  function removeSymptom(id: string) {
    setSelectedSymptoms((prev) => prev.filter((s) => s.id !== id));
  }

  async function analyze() {
    if (selectedSymptoms.length < 2) {
      toast.error("اختر عرضين على الأقل");
      return;
    }
    setPhase("loading");
    setError(null);

    const res = await fetchDifferentialDiagnosis(
      patientId,
      selectedSymptoms.map((s) => s.nameEn),
      {
        duration: duration || undefined,
        severity: (severity as "mild" | "moderate" | "severe") || undefined,
        onset: (onset as "sudden" | "gradual") || undefined,
        additionalNotes: notes || undefined,
      },
    );

    if (res.kind === "ok") {
      setResult(res.data);
      setPhase("results");
    } else {
      setError(res.message);
      setPhase("input");
      toast.error("فشل التحليل", { description: res.message });
    }
  }

  function reset() {
    setPhase("input");
    setResult(null);
    setSelectedSymptoms([]);
    setSearchQuery("");
    setDuration("");
    setSeverity("");
    setOnset("");
    setNotes("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="size-5 text-[color:var(--color-brand-magenta)]" />
          التشخيص التفريقي — Differential Diagnosis
        </CardTitle>
        <CardDescription>
          أدخل الأعراض للحصول على تحليل تشخيصي مدعوم بالذكاء الاصطناعي
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* PHASE 1: Input */}
        {phase === "input" && (
          <div className="space-y-4">
            {/* Symptom search */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن الأعراض... / Search symptoms..."
                  className="ps-9"
                />
              </div>
              {/* Autocomplete dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button key={s.id} onClick={() => addSymptom(s)}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 text-start">
                      <span className="font-medium text-gray-900">{s.nameAr}</span>
                      <span className="text-xs text-gray-500">{s.nameEn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected symptoms */}
            {selectedSymptoms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSymptoms.map((s) => (
                  <Badge key={s.id} variant="secondary" className="gap-1 pe-1 text-sm">
                    {s.nameAr}
                    <button onClick={() => removeSymptom(s.id)} className="rounded-full p-0.5 hover:bg-gray-300">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Suggested symptoms */}
            {associatedSuggestions.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 mb-1 block">أعراض مقترحة:</span>
                <div className="flex flex-wrap gap-1.5">
                  {associatedSuggestions.map((s) => (
                    <button key={s.id} onClick={() => addSymptom(s)}
                      className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                      + {s.nameAr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Options row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue placeholder="المدة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">ساعات</SelectItem>
                  <SelectItem value="days">أيام</SelectItem>
                  <SelectItem value="1_week">أسبوع</SelectItem>
                  <SelectItem value="2_weeks">أسبوعين</SelectItem>
                  <SelectItem value="1_month">شهر</SelectItem>
                  <SelectItem value="months">أشهر</SelectItem>
                  <SelectItem value="chronic">مزمن</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue placeholder="الشدة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">خفيف</SelectItem>
                  <SelectItem value="moderate">متوسط</SelectItem>
                  <SelectItem value="severe">شديد</SelectItem>
                </SelectContent>
              </Select>
              <Select value={onset} onValueChange={setOnset}>
                <SelectTrigger><SelectValue placeholder="البداية" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sudden">مفاجئ</SelectItem>
                  <SelectItem value="gradual">تدريجي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional notes */}
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية (اختياري)..."
              rows={2}
            />

            {/* Analyze button */}
            <Button variant="brand" onClick={analyze} disabled={selectedSymptoms.length < 2} className="w-full gap-2">
              <Brain className="size-4" />
              تحليل ({selectedSymptoms.length} أعراض)
            </Button>
            {selectedSymptoms.length < 2 && (
              <p className="text-center text-xs text-gray-500">اختر عرضين على الأقل لبدء التحليل</p>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          </div>
        )}

        {/* PHASE: Loading */}
        {phase === "loading" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Brain className="size-8 animate-pulse text-[color:var(--color-brand-magenta)]" />
            <Loader2 className="size-5 animate-spin text-gray-400" />
            <p className="text-sm text-gray-600">جاري التحليل التشخيصي...</p>
            <p className="text-xs text-gray-400">قد يستغرق 10-15 ثانية</p>
          </div>
        )}

        {/* PHASE 2: Results */}
        {phase === "results" && result && (
          <div className="space-y-4">
            {/* Critical Alerts */}
            {result.criticalAlerts.length > 0 && (
              <div className="rounded-xl bg-red-600 p-4 text-white">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertTriangle className="size-5" />
                  CRITICAL ALERT
                </div>
                {result.criticalAlerts.map((alert, i) => (
                  <p key={i} className="text-sm">{alert}</p>
                ))}
              </div>
            )}

            {/* Clinical Summary */}
            <div className="rounded-xl border border-[color:var(--color-brand-pink)]/20 bg-[color:var(--color-brand-pink)]/5 p-4" dir="rtl">
              <p className="text-sm leading-relaxed text-gray-800">{result.clinicalSummary}</p>
            </div>

            {/* Diagnosis Cards */}
            {result.diagnoses.map((dx) => (
              <DiagnosisCard key={dx.rank} diagnosis={dx} />
            ))}

            {/* Disclaimer */}
            <p className="text-center text-[11px] text-gray-400 pt-2">{result.disclaimer}</p>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                {"↩️ "} تحليل جديد
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const text = result.diagnoses.map((d) => `#${d.rank} ${d.diagnosis} (${d.probabilityPercent}%)`).join("\n");
                navigator.clipboard.writeText(text);
                toast.success("تم النسخ");
              }} className="gap-1.5">
                {"📋 "} نسخ النتائج
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DiagnosisCard({ diagnosis: dx }: { diagnosis: DiagnosisCandidate }) {
  const [expanded, setExpanded] = React.useState(dx.rank <= 2);
  const config = PROB_CONFIG[dx.probability];

  return (
    <div className={cn("rounded-xl border overflow-hidden", config.border)}>
      <div className={cn("flex items-center justify-between p-3 cursor-pointer", config.bg)} onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <span className={cn("text-lg font-black tabular-nums", config.color)}>#{dx.rank}</span>
          <div>
            <div className="text-sm font-bold text-gray-900">{dx.diagnosisAr}</div>
            <div className="text-xs text-gray-600">{dx.diagnosis} {dx.icdCode && <span className="text-gray-400">({dx.icdCode})</span>}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={config.badge}>{dx.probabilityPercent}%</Badge>
          <ChevronDown className={cn("size-4 text-gray-500 transition-transform", expanded && "rotate-180")} />
        </div>
      </div>

      <div className={cn("overflow-hidden transition-all duration-300", expanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0")}>
        <div className="p-4 space-y-3 bg-white border-t border-gray-100">
          {/* Supporting Evidence */}
          {dx.supportingEvidence.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-emerald-700 mb-1">{"✅ "} أدلة داعمة:</div>
              <ul className="space-y-1">
                {dx.supportingEvidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <Badge variant="outline" className="text-[8px] shrink-0">{e.strength}</Badge>
                    <span>{e.finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Against Evidence */}
          {dx.againstEvidence.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-red-700 mb-1">{"❌ "} أدلة ضد:</div>
              <ul className="space-y-1">
                {dx.againstEvidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <Badge variant="outline" className="text-[8px] shrink-0">{e.strength}</Badge>
                    <span>{e.finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Tests */}
          {dx.recommendedTests.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-blue-700 mb-1"><FlaskConical className="inline size-3 me-1" /> فحوصات مطلوبة:</div>
              <ul className="space-y-1">
                {dx.recommendedTests.map((t, i) => (
                  <li key={i} className="text-xs text-gray-700">
                    <Badge variant={t.urgency === "stat" ? "destructive" : t.urgency === "routine" ? "info" : "outline"} className="text-[8px] me-1">{t.urgency}</Badge>
                    {t.test} — <span className="text-gray-500">{t.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Actions */}
          {dx.recommendedActions.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-purple-700 mb-1"><Stethoscope className="inline size-3 me-1" /> إجراءات موصى بها:</div>
              <ul className="space-y-1">
                {dx.recommendedActions.map((a, i) => (
                  <li key={i} className="text-xs text-gray-700">
                    <Badge variant="outline" className="text-[8px] me-1">{a.urgency}</Badge>
                    {a.action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Clinical Pearl */}
          {dx.clinicalPearl && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
              <div className="text-xs font-semibold text-amber-800 mb-0.5">{"💡 "} Clinical Pearl:</div>
              <p className="text-xs text-amber-700">{dx.clinicalPearl}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
