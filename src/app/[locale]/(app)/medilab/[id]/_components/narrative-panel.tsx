"use client";

import * as React from "react";
import { toast } from "sonner";
import {
 AlertCircle,
 ChevronDown,
 Loader2,
 RefreshCw,
 Sparkles,
 Stethoscope,
 Users as UsersIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateNarrative } from "@/lib/medilab/client";
import type { NarrativeOutput } from "@/lib/medilab/narrative";
import { findBiomarkerByName, pickRange } from "@/lib/medilab/biomarkers";
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

interface Props {
 labResultId: string;
 initial: NarrativeOutput | null;
 defaultAudience?: "physician" | "patient";
 /** Lab results for the interactive patient view. */
 results?: LabResult[];
 /** Patient first name for the welcome banner. */
 patientName?: string;
}

type Status = "normal" | "warning" | "critical";
type Direction = "high" | "low" | "normal";

interface EnrichedHighlight {
 testName: string;
 value: string;
 unit: string;
 refLow: number;
 refHigh: number;
 status: Status;
 direction: Direction;
 note: string;
 icon: string;
}

// ─────────────────────────────────────────────────────────────────
// Test icon map
// ─────────────────────────────────────────────────────────────────
const TEST_ICONS: Array<[string[], string]> = [
 [["hemoglobin", "hgb", "hb"], "🩸"],
 [["rbc", "red blood"], "🔴"],
 [["wbc", "white blood", "leukocyte"], "⚪"],
 [["platelet", "plt"], "🟣"],
 [["hematocrit", "hct"], "🧪"],
 [["ferritin"], "🧲"],
 [["iron", "serum iron"], "⛓️"],
 [["tibc", "transferrin"], "🔗"],
 [["alt", "ast", "ggt", "alp", "alanine", "aspartate"], "🫀"],
 [["bilirubin"], "🟡"],
 [["albumin", "total protein"], "💧"],
 [["creatinine", "bun", "urea"], "🫁"],
 [["egfr"], "🔬"],
 [["glucose", "blood sugar"], "🍬"],
 [["hba1c", "glycated"], "📊"],
 [["ldl"], "❤️"],
 [["hdl"], "💚"],
 [["triglyceride"], "🧈"],
 [["cholesterol"], "❤️"],
 [["vitamin d", "25-hydroxy"], "☀️"],
 [["vitamin b12", "b12"], "💊"],
 [["folate"], "🥬"],
 [["tsh"], "🦋"],
 [["free t4", "t4", "free t3", "t3"], "⚡"],
 [["sodium", "na+"], "🧂"],
 [["potassium", "k+"], "🍌"],
 [["calcium", "ca+"], "🦴"],
 [["magnesium"], "💎"],
 [["troponin"], "❤️‍🔥"],
 [["bnp", "natriuretic"], "💔"],
 [["hepatitis", "hbsag", "hcv"], "🦠"],
 [["hiv"], "🛡️"],
 [["psa", "cea", "afp", "ca-125"], "🎯"],
 [["cortisol"], "😰"],
 [["testosterone"], "🔵"],
 [["estradiol", "estrogen"], "🔴"],
];

function getIcon(testName: string): string {
 const low = testName.toLowerCase();
 for (const [patterns, emoji] of TEST_ICONS) {
 if (patterns.some((p) => low.includes(p))) return emoji;
 }
 return "🧪";
}

// ─────────────────────────────────────────────────────────────────
// Compute status from value + ref range (deterministic)
// ─────────────────────────────────────────────────────────────────
function classify(r: LabResult): { status: Status; direction: Direction; refLow: number; refHigh: number } {
 const val = typeof r.value === "number" ? r.value : parseFloat(String(r.value).replace(/[^\d.\-]/g, ""));

 // Use local biomarker library for stable ref ranges
 let lo = r.referenceLow != null ? Number(r.referenceLow) : NaN;
 let hi = r.referenceHigh != null ? Number(r.referenceHigh) : NaN;
 const knownBio = findBiomarkerByName(r.testName);
 if (knownBio) {
 const localRange = pickRange(knownBio);
 if (localRange) { lo = localRange.low; hi = localRange.high; }
 }

 if (isNaN(val) || isNaN(lo) || isNaN(hi) || hi <= lo) {
 const f = (r.flag ?? "").toLowerCase();
 return {
 status: f.includes("critical") ? "critical" : f.includes("high") || f.includes("low") ? "warning" : "normal",
 direction: f.includes("high") ? "high" : f.includes("low") ? "low" : "normal",
 refLow: lo || 0, refHigh: hi || 0,
 };
 }

 const range = hi - lo;
 const direction: Direction = val > hi ? "high" : val < lo ? "low" : "normal";
 let status: Status;
 if (val >= lo && val <= hi) {
 status = (val < lo + range * 0.1 || val > hi - range * 0.1) ? "warning" : "normal";
 } else {
 const dist = val > hi ? val - hi : lo - val;
 status = (range > 0 ? (dist / range) * 100 : 50) > 25 ? "critical" : "warning";
 }
 return { status, direction, refLow: lo, refHigh: hi };
}

// ─────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1500) {
 const [val, setVal] = React.useState(0);
 React.useEffect(() => {
 if (target === 0) return;
 let start: number | null = null;
 let raf: number;
 const step = (ts: number) => {
 if (!start) start = ts;
 const progress = Math.min((ts - start) / duration, 1);
 setVal(Math.round(progress * target));
 if (progress < 1) raf = requestAnimationFrame(step);
 };
 raf = requestAnimationFrame(step);
 return () => cancelAnimationFrame(raf);
 }, [target, duration]);
 return val;
}

function useInView(ref: React.RefObject<HTMLElement | null>, once = true) {
 const [inView, setInView] = React.useState(false);
 React.useEffect(() => {
 const el = ref.current;
 if (!el) return;
 const obs = new IntersectionObserver(([entry]) => {
 if (entry.isIntersecting) {
 setInView(true);
 if (once) obs.disconnect();
 }
 }, { threshold: 0.2 });
 obs.observe(el);
 return () => obs.disconnect();
 }, [ref, once]);
 return inView;
}

// ─────────────────────────────────────────────────────────────────
// Status palette
// ─────────────────────────────────────────────────────────────────
const COLORS: Record<Status, { fg: string; bg: string; border: string; bar: string; glow: string }> = {
 normal: { fg: "text-emerald-600", bg: "bg-emerald-50", border: "border-s-emerald-500", bar: "bg-emerald-500", glow: "shadow-emerald-500/30" },
 warning: { fg: "text-amber-600", bg: "bg-amber-50", border: "border-s-amber-500", bar: "bg-amber-500", glow: "shadow-amber-500/30" },
 critical: { fg: "text-rose-600", bg: "bg-rose-50", border: "border-s-rose-500", bar: "bg-rose-500", glow: "shadow-rose-500/30" },
};

const DIR_LABELS: Record<Direction, { symbol: string; color: string; ar: string }> = {
 high: { symbol: "↑", color: "text-rose-500", ar: "مرتفع" },
 low: { symbol: "↓", color: "text-blue-500", ar: "منخفض" },
 normal: { symbol: "✓", color: "text-emerald-500", ar: "طبيعي" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function NarrativePanel({
 labResultId,
 initial,
 defaultAudience = "physician",
 results = [],
 patientName = "",
}: Props) {
 const [narrative, setNarrative] = React.useState<NarrativeOutput | null>(initial);
 const [loading, setLoading] = React.useState(false);
 const [error, setError] = React.useState<string | null>(null);
 const [notConfigured, setNotConfigured] = React.useState(false);
 const [audience, setAudience] = React.useState<"physician" | "patient">(defaultAudience);

 async function run() {
 setLoading(true);
 setError(null);
 setNotConfigured(false);
 const result = await generateNarrative(labResultId);
 if (result.kind === "ok") {
 setNarrative(result.data);
 toast.success("Narrative generated");
 } else if (result.kind === "not_configured") {
 setNotConfigured(true);
 } else {
 setError(result.message);
 }
 setLoading(false);
 }

 // Enrich results for patient view
 const enriched = React.useMemo(() => {
 return results.map((r) => {
 const cls = classify(r);
 return {
 testName: r.testName,
 value: String(r.value),
 unit: r.unit ?? "",
 refLow: cls.refLow,
 refHigh: cls.refHigh,
 status: cls.status,
 direction: cls.direction,
 note: narrative?.highlights.find((h) => h.testName.toLowerCase() === r.testName.toLowerCase())?.note ?? "",
 icon: getIcon(r.testName),
 } satisfies EnrichedHighlight;
 });
 }, [results, narrative]);

 const normalCount = enriched.filter((r) => r.status === "normal").length;
 const warningCount = enriched.filter((r) => r.status === "warning").length;
 const criticalCount = enriched.filter((r) => r.status === "critical").length;

 // Separate abnormal highlights from normals
 const abnormals = enriched.filter((r) => r.status !== "normal");
 const normals = enriched.filter((r) => r.status === "normal");

 return (
 <Card>
 <CardHeader>
 <div className="flex flex-wrap items-center justify-between gap-2">
 <CardTitle className="flex items-center gap-2 text-base">
 <Sparkles className="size-4 text-[color:var(--color-brand-magenta)]" />
 MediLab Narrative
 </CardTitle>
 <div className="flex items-center gap-2">
 <div role="tablist" className="inline-flex overflow-hidden rounded-lg border border-[color:var(--color-border)]">
 <button role="tab" aria-selected={audience === "physician"}
 className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
 audience === "physician" ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]" : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]")}
 onClick={() => setAudience("physician")}>
 <Stethoscope className="size-3.5" /> Physician
 </button>
 <button role="tab" aria-selected={audience === "patient"}
 className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
 audience === "patient" ? "bg-[color:var(--color-brand-pink)]/10 text-[color:var(--color-brand-magenta)]" : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]")}
 onClick={() => setAudience("patient")}>
 <UsersIcon className="size-3.5" /> Patient
 </button>
 </div>
 <Button variant="ghost" size="sm" onClick={run} disabled={loading}>
 {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
 {narrative ? "Regenerate" : "Generate"}
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent className="space-y-3">
 {notConfigured && (
 <Alert variant="info"><Sparkles /><AlertTitle>Medical engine not configured</AlertTitle>
 <AlertDescription>Set <code className="rounded bg-[color:var(--color-muted)] px-1 py-0.5">GOOGLE_GEMINI_API_KEY</code> in <code>.env.local</code> to enable AI narratives.</AlertDescription>
 </Alert>
 )}
 {error && (<Alert variant="destructive"><AlertCircle /><AlertTitle>Failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)}
 {!narrative && !loading && !notConfigured && !error && (
 <p className="text-sm text-[color:var(--color-muted-foreground)]">
 Click <strong>Generate</strong> to produce both a physician-style summary and a patient-friendly explanation.
 </p>
 )}
 {loading && (
 <div className="flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)]">
 <Loader2 className="size-4 animate-spin" /> Generating narrative...
 </div>
 )}

 {narrative && audience === "physician" && (
 <>
 <p className="whitespace-pre-wrap text-sm leading-relaxed">{narrative.physicianSummary}</p>
 {narrative.highlights.length > 0 && (
 <div className="pt-1">
 <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">Highlights</div>
 <ul className="mt-2 space-y-2">
 {narrative.highlights.map((h, i) => (
 <li key={i} className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30 p-3">
 <div className="flex items-center justify-between gap-2">
 <div className="text-sm font-semibold">{h.testName}</div>
 <Badge variant={h.severity === "critical" ? "critical" : h.severity === "abnormal" ? "warning" : "info"} className="text-[10px]">{h.severity}</Badge>
 </div>
 <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">{h.note}</div>
 </li>
 ))}
 </ul>
 </div>
 )}
 </>
 )}

 {/* ── PATIENT VIEW: Interactive Infographic ── */}
 {narrative && audience === "patient" && results.length > 0 && (
 <div dir="rtl" lang="ar" className="space-y-5">
 {/* 1. Animated Welcome Banner */}
 <WelcomeBanner
 patientName={patientName}
 total={enriched.length}
 normalCount={normalCount}
 warningCount={warningCount}
 criticalCount={criticalCount}
 summary={narrative.patientSummary}
 />

 {/* 2. Abnormal/Borderline — Interactive Expandable Cards */}
 {abnormals.length > 0 && (
 <div className="space-y-3">
 <h4 className="text-sm font-bold text-gray-800">
 {"⚠️"} {"نتائج تحتاج انتباهك"} ({abnormals.length})
 </h4>
 {abnormals.map((r, i) => (
 <ExpandableResultCard key={`${r.testName}-${i}`} result={r} index={i} />
 ))}
 </div>
 )}

 {/* 3. Normal Results — Compact Grid */}
 {normals.length > 0 && (
 <div>
 <h4 className="mb-3 text-sm font-bold text-gray-800">
 {"✅"} {"نتائج طبيعية"} ({normals.length})
 </h4>
 <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
 {normals.map((r, i) => (
 <CompactNormalCard key={`${r.testName}-${i}`} result={r} index={i} />
 ))}
 </div>
 </div>
 )}

 {/* Disclaimer */}
 <p className="text-center text-[11px] text-gray-400">
 {"⚠️"} هذا التقرير للمساعدة فقط. يرجى استشارة طبيبك.
 </p>
 </div>
 )}

 {/* Fallback: patient view without results data */}
 {narrative && audience === "patient" && results.length === 0 && (
 <>
 <div dir="rtl" lang="ar">
 <p className="whitespace-pre-wrap text-sm leading-relaxed">{narrative.patientSummary}</p>
 </div>
 <p className="text-[11px] italic text-[color:var(--color-muted-foreground)]">
 Generated for educational support. Does not replace clinical advice.
 </p>
 </>
 )}
 </CardContent>
 </Card>
 );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Welcome Banner with animated counters
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function WelcomeBanner({ patientName, total, normalCount, warningCount, criticalCount, summary }: {
 patientName: string; total: number; normalCount: number; warningCount: number; criticalCount: number; summary: string;
}) {
 const animNormal = useCountUp(normalCount, 1200);
 const animWarning = useCountUp(warningCount, 1200);
 const animCritical = useCountUp(criticalCount, 1200);
 const [showSummary, setShowSummary] = React.useState(false);

 React.useEffect(() => {
 const t = setTimeout(() => setShowSummary(true), 1600);
 return () => clearTimeout(t);
 }, []);

 return (
 <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-bl from-emerald-50 via-white to-teal-50 p-5 shadow-sm">
 {/* Greeting */}
 <div className="mb-4 text-lg font-bold text-gray-900">
 {"👋"} مرحباً{patientName ? ` ${patientName}!` : "!"}
 </div>

 <div className="mb-1 text-sm text-gray-500">
 تم فحص <span className="font-bold text-gray-900">{total}</span> مؤشر حيوي
 </div>

 {/* Animated counter boxes */}
 <div className="my-4 flex flex-wrap gap-3">
 {normalCount > 0 && (
 <CounterBox count={animNormal} emoji={"✅"} label={"طبيعي"} bg="bg-emerald-100" fg="text-emerald-700" />
 )}
 {warningCount > 0 && (
 <CounterBox count={animWarning} emoji={"⚠️"} label={"انتبه"} bg="bg-amber-100" fg="text-amber-700" />
 )}
 {criticalCount > 0 && (
 <CounterBox count={animCritical} emoji={"🔴"} label={"تحتاج متابعة"} bg="bg-rose-100" fg="text-rose-700" />
 )}
 </div>

 {/* Summary fades in after counters */}
 <p className={cn(
 "text-sm leading-relaxed text-gray-600 transition-all duration-700",
 showSummary ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
 )}>
 {summary}
 </p>
 </div>
 );
}

function CounterBox({ count, emoji, label, bg, fg }: {
 count: number; emoji: string; label: string; bg: string; fg: string;
}) {
 return (
 <div className={cn("flex flex-col items-center rounded-xl px-4 py-3 min-w-[72px]", bg)}>
 <span className={cn("text-2xl font-black tabular-nums", fg)}>{count}</span>
 <span className="text-lg">{emoji}</span>
 <span className={cn("text-[10px] font-semibold", fg)}>{label}</span>
 </div>
 );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Expandable Result Card (for abnormal/borderline results)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ExpandableResultCard({ result: r, index }: { result: EnrichedHighlight; index: number }) {
 const [expanded, setExpanded] = React.useState(false);
 const cardRef = React.useRef<HTMLDivElement>(null);
 const inView = useInView(cardRef);
 const c = COLORS[r.status];
 const dir = DIR_LABELS[r.direction];

 const numVal = parseFloat(r.value.replace(/[^\d.\-]/g, ""));
 const hasGauge = !isNaN(numVal) && r.refLow > 0 && r.refHigh > r.refLow;

 return (
 <div
 ref={cardRef}
 className={cn(
 "overflow-hidden rounded-xl border border-s-4 border-gray-200 bg-white shadow-sm transition-all duration-500 hover:shadow-md cursor-pointer",
 c.border,
 inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
 )}
 style={{ transitionDelay: `${index * 100}ms` }}
 onClick={() => setExpanded(!expanded)}
 >
 {/* Collapsed header */}
 <div className="p-4">
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-3">
 <span className="text-2xl">{r.icon}</span>
 <div>
 <div className="text-sm font-bold text-gray-900">{r.testName}</div>
 <div className="text-[11px] text-gray-400">{r.unit}</div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className={cn("text-sm font-bold", dir.color)}>
 {dir.symbol} {dir.ar}
 </span>
 <ChevronDown className={cn("size-4 text-gray-400 transition-transform duration-300", expanded && "rotate-180")} />
 </div>
 </div>

 {/* Big value */}
 <div className={cn("mt-3 text-3xl font-black tabular-nums", c.fg)}>{r.value} <span className="text-sm font-normal text-gray-400">{r.unit}</span></div>

 {/* Animated gauge */}
 {hasGauge && <AnimatedGauge value={numVal} refLow={r.refLow} refHigh={r.refHigh} status={r.status} animate={inView} />}

 {/* Ref range text */}
 <div className="mt-1 text-xs text-gray-500">
 النتيجة: <span className="font-semibold">{r.value}</span> | الطبيعي: <span className="font-semibold">{r.refLow} - {r.refHigh}</span>
 </div>
 </div>

 {/* Expandable detail */}
 <div className={cn(
 "overflow-hidden transition-all duration-300 ease-out",
 expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
 )}>
 <div className="border-t border-gray-100 px-4 pb-4 pt-3">
 {r.note ? (
 <>
 <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-gray-700">
 {"💡"} ما معنى هذا؟
 </div>
 <p className="text-xs leading-relaxed text-gray-600">{r.note}</p>
 </>
 ) : (
 <p className="text-xs text-gray-400">اضغط "إنشاء" للحصول على تفسير مفصل.</p>
 )}
 </div>
 </div>

 {/* Expand hint */}
 {!expanded && (
 <div className="border-t border-gray-100 px-4 py-2 text-center text-[10px] text-gray-400">
 {"▼"} اضغط لمعرفة المزيد
 </div>
 )}
 </div>
 );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Animated Gauge Bar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AnimatedGauge({ value, refLow, refHigh, status, animate }: {
 value: number; refLow: number; refHigh: number; status: Status; animate: boolean;
}) {
 const c = COLORS[status];
 const range = refHigh - refLow;
 let position: number;
 if (value < refLow) { position = 15 - Math.min((refLow - value) / range, 1) * 15; }
 else if (value > refHigh) { position = 85 + Math.min((value - refHigh) / range, 1) * 15; }
 else { position = 15 + ((value - refLow) / range) * 70; }
 position = Math.max(2, Math.min(98, position));

 return (
 <div className="mt-3">
 <div className="relative h-3 w-full overflow-hidden rounded-full">
 <div className="absolute inset-0 flex">
 <div className="w-[15%] bg-rose-200" />
 <div className="w-[70%] bg-emerald-200" />
 <div className="w-[15%] bg-rose-200" />
 </div>
 {/* Marker — animated */}
 <div
 className={cn("absolute top-1/2 size-5 -translate-y-1/2 rounded-full border-2 border-white shadow-lg transition-all duration-[800ms] ease-out", c.bar, animate && c.glow)}
 style={{ left: animate ? `${position}%` : "50%", transform: "translate(-50%, -50%)" }}
 />
 </div>
 <div className="mt-0.5 flex justify-between text-[9px] text-gray-400">
 <span>{refLow}</span>
 <span>طبيعي</span>
 <span>{refHigh}</span>
 </div>
 </div>
 );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Compact Normal Result Card
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CompactNormalCard({ result: r, index }: { result: EnrichedHighlight; index: number }) {
 const cardRef = React.useRef<HTMLDivElement>(null);
 const inView = useInView(cardRef);

 return (
 <div
 ref={cardRef}
 className={cn(
 "flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 transition-all duration-400/40 hover:scale-[1.02] hover:shadow-sm",
 inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
 )}
 style={{ transitionDelay: `${Math.min(index * 30, 500)}ms` }}
 >
 <span className="text-lg">{r.icon}</span>
 <div className="min-w-0 flex-1">
 <div className="truncate text-xs font-semibold text-gray-800">{r.testName}</div>
 <div className="text-[10px] text-emerald-600 font-bold tabular-nums">{r.value} {r.unit}</div>
 </div>
 <span className="text-emerald-500 text-sm">{"✓"}</span>
 </div>
 );
}
