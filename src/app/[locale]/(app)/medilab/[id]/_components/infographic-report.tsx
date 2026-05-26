"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Download, Mail, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PatientReportData, DoctorReportData } from "@/lib/medilab/client";
import { findBiomarkerByName, pickRange } from "@/lib/medilab/biomarkers";

// Lazy-load Recharts
const SparklineCanvas = dynamic(() => import("./sparkline-canvas"), {
 ssr: false,
 loading: () => <div className="h-10 w-24 animate-pulse rounded bg-gray-200" />,
});

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface Props {
 patientReport: PatientReportData;
 doctorReport: DoctorReportData;
}

type Status = "normal" | "warning" | "critical";
type Direction = "high" | "low" | "normal";

interface ComputedResult { status: Status; direction: Direction; }
type EnrichedResult = PatientReportData["results"][number] & ComputedResult;

// ─────────────────────────────────────────────────────────────────
// Deterministic status + direction
// ─────────────────────────────────────────────────────────────────
function computeResult(r: {
 value: string; refLow?: number; refHigh?: number; status?: string; direction?: string;
}): ComputedResult {
 const numVal = parseFloat((r.value ?? "").replace(/[^\d.\-]/g, ""));
 const hasNum = !isNaN(numVal);
 const hasRef = r.refLow != null && r.refHigh != null && r.refHigh > r.refLow;

 if (hasNum && hasRef) {
 const lo = r.refLow!, hi = r.refHigh!, range = hi - lo;
 const direction: Direction = numVal > hi ? "high" : numVal < lo ? "low" : "normal";
 let status: Status;
 if (numVal >= lo && numVal <= hi) {
 status = (numVal < lo + range * 0.1 || numVal > hi - range * 0.1) ? "warning" : "normal";
 } else {
 const dist = numVal > hi ? numVal - hi : lo - numVal;
 status = (range > 0 ? (dist / range) * 100 : 50) > 25 ? "critical" : "warning";
 }
 return { status, direction };
 }

 const low = (r.status ?? "").toLowerCase();
 const dir = (r.direction ?? "").toLowerCase();
 return {
 status: low === "normal" || low === "good" ? "normal" : low === "critical" || low === "danger" ? "critical"
 : low.includes("abnormal") || low.includes("high") || low.includes("low") ? "critical" : "warning",
 direction: dir === "high" ? "high" : dir === "low" ? "low" : dir === "normal" ? "normal"
 : low.includes("high") || low.includes("elevated") ? "high"
 : low.includes("low") || low.includes("decreased") ? "low" : "normal",
 };
}

function enrichResults(results: PatientReportData["results"]): EnrichedResult[] {
 return results.map((r) => {
 // BUG 1 FIX: Use LOCAL biomarker library ref ranges for deterministic classification.
 // AI-provided refLow/refHigh vary between runs → inconsistent scores.
 // Our biomarker library has FIXED reference ranges → same input always = same score.
 let stableRefLow = r.refLow;
 let stableRefHigh = r.refHigh;

 const knownBio = findBiomarkerByName(r.name);
 if (knownBio) {
 const localRange = pickRange(knownBio);
 if (localRange) {
 stableRefLow = localRange.low;
 stableRefHigh = localRange.high;
 }
 }

 // Compute status using stable ref ranges
 const computed = computeResult({
 ...r,
 refLow: stableRefLow,
 refHigh: stableRefHigh,
 });

 // Return with BOTH display ref ranges (AI for richer display) and stable status
 return { ...r, ...computed };
 });
}

/**
 * DETERMINISTIC health score — replaces AI-generated score that varied between runs.
 * Formula: normal=1.0, warning=0.5, critical=-0.5 per result, scaled to 0-100.
 */
function calculateHealthScore(enriched: EnrichedResult[]): number {
 if (enriched.length === 0) return 100;
 const total = enriched.length;
 const normalCount = enriched.filter((r) => r.status === "normal").length;
 const warningCount = enriched.filter((r) => r.status === "warning").length;
 const criticalCount = enriched.filter((r) => r.status === "critical").length;

 const raw = ((normalCount * 1.0 + warningCount * 0.5 + criticalCount * -0.5) / total) * 100;
 return Math.max(0, Math.min(100, Math.round(raw)));
}

// ─────────────────────────────────────────────────────────────────
// Medical Test Icons (50+ mappings)
// ─────────────────────────────────────────────────────────────────
const TEST_ICON_MAP: Array<[string[], string]> = [
 // Blood
 [["hemoglobin", "hgb", "hb"], "🩸"],
 [["rbc", "red blood"], "🔴"],
 [["wbc", "white blood", "leukocyte"], "⚪"],
 [["platelet", "plt"], "🟣"],
 [["hematocrit", "hct"], "🧪"],
 [["mcv", "mch", "mchc", "rdw"], "🧬"],
 [["esr", "sed rate"], "⏳"],
 // Liver
 [["alt", "alanine amino"], "🫀"],
 [["ast", "aspartate amino"], "🫀"],
 [["ggt", "gamma"], "🫀"],
 [["alp", "alkaline phos"], "🫀"],
 [["bilirubin"], "🟡"],
 [["albumin"], "💧"],
 [["total protein"], "💧"],
 // Kidney
 [["creatinine"], "🫁"],
 [["bun", "urea"], "🫁"],
 [["egfr"], "🔬"],
 [["uric acid"], "🫁"],
 // Diabetes
 [["glucose", "blood sugar"], "🍬"],
 [["hba1c", "hemoglobin a1c", "glycated"], "📊"],
 [["insulin"], "💉"],
 // Lipids
 [["ldl"], "❤️"],
 [["hdl"], "💚"],
 [["triglyceride"], "🧈"],
 [["cholesterol"], "❤️"],
 // Iron
 [["ferritin"], "🧲"],
 [["serum iron", "iron"], "⛓️"],
 [["tibc"], "🔗"],
 [["transferrin"], "🔗"],
 // Vitamins
 [["vitamin d", "25-hydroxy"], "☀️"],
 [["vitamin b12", "b12"], "💊"],
 [["folate", "folic"], "🥬"],
 // Thyroid
 [["tsh"], "🦋"],
 [["free t4", "t4", "thyroxine"], "⚡"],
 [["free t3", "t3"], "⚡"],
 // Hormones
 [["testosterone"], "🔵"],
 [["estradiol", "estrogen"], "🔴"],
 [["cortisol"], "😰"],
 [["prolactin"], "🍼"],
 [["lh", "luteinizing"], "🧬"],
 [["fsh", "follicle"], "🧬"],
 [["progesterone"], "🟣"],
 // Cardiac
 [["troponin"], "❤️‍🔥"],
 [["ck-mb", "ck mb"], "💓"],
 [["bnp", "natriuretic"], "💔"],
 [["ldh", "lactate dehydro"], "💓"],
 // Infectious
 [["hepatitis", "hbsag", "hcv", "anti-hb", "anti-hc"], "🦠"],
 [["hiv"], "🛡️"],
 [["rpr", "syphilis", "vdrl"], "🔬"],
 // Electrolytes
 [["sodium", "na+"], "🧂"],
 [["potassium", "k+"], "🍌"],
 [["calcium", "ca+"], "🦴"],
 [["magnesium", "mg+"], "💎"],
 [["chloride", "cl-"], "💧"],
 [["phosphate", "phosphorus"], "🦴"],
 [["bicarbonate", "co2"], "💨"],
 // Coagulation
 [["pt ", "prothrombin"], "🩸"],
 [["inr"], "🩸"],
 [["aptt", "ptt"], "🩸"],
 [["fibrinogen"], "🩸"],
 // Tumor markers
 [["psa", "cea", "afp", "ca-125", "ca 19"], "🎯"],
 // Urine
 [["urine", "urinalysis"], "🧫"],
 // Autoimmune
 [["ana", "antinuclear"], "🛡️"],
 [["rf ", "rheumatoid"], "🛡️"],
 [["crp", "c-reactive"], "🔥"],
 [["anti-ccp"], "🛡️"],
 // ABG
 [["pco2", "po2", "arterial ph", "base excess", "o2 sat"], "🫁"],
 // Stool
 [["stool", "fecal", "h. pylori"], "🧫"],
];

function getTestIcon(testName: string): string {
 const low = (testName ?? "").toLowerCase();
 for (const [patterns, emoji] of TEST_ICON_MAP) {
 if (patterns.some((p) => low.includes(p))) return emoji;
 }
 return "🧪"; // default test tube
}

// ─────────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<Status, { fg: string; bg: string; ring: string; bar: string; glow: string; border: string }> = {
 normal: { fg: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-500/30", bar: "bg-emerald-500", glow: "shadow-emerald-500/40", border: "border-s-emerald-500" },
 warning: { fg: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-500/30", bar: "bg-amber-500", glow: "shadow-amber-500/40", border: "border-s-amber-500" },
 critical: { fg: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-500/30", bar: "bg-rose-500", glow: "shadow-rose-500/40", border: "border-s-rose-500" },
};

// ─────────────────────────────────────────────────────────────────
// Body system mapping
// ─────────────────────────────────────────────────────────────────
interface BodySystem { key: string; emoji: string; nameAr: string; nameEn: string; patterns: string[]; }

const BODY_SYSTEMS: BodySystem[] = [
 { key: "heart", emoji: "❤️", nameAr: "القلب", nameEn: "Heart", patterns: ["troponin", "ck-mb", "bnp", "ldh", "cholesterol", "ldl", "hdl", "triglyceride"] },
 { key: "liver", emoji: "🫀", nameAr: "الكبد", nameEn: "Liver", patterns: ["alt", "ast", "alp", "ggt", "bilirubin", "albumin", "total protein", "alanine", "aspartate", "alkaline"] },
 { key: "kidneys", emoji: "🫁", nameAr: "الكلى", nameEn: "Kidneys", patterns: ["creatinine", "bun", "egfr", "urea", "uric acid", "urine"] },
 { key: "blood", emoji: "🩸", nameAr: "الدم", nameEn: "Blood", patterns: ["hemoglobin", "hematocrit", "wbc", "rbc", "platelet", "mcv", "mch", "mchc", "rdw", "esr", "ferritin", "iron", "tibc", "transferrin"] },
 { key: "bones", emoji: "🦴", nameAr: "العظام", nameEn: "Bones", patterns: ["calcium", "phosphate", "vitamin d", "alp"] },
 { key: "pancreas", emoji: "🍎", nameAr: "البنكرياس", nameEn: "Pancreas", patterns: ["glucose", "hba1c", "fasting glucose", "insulin"] },
 { key: "thyroid", emoji: "🦋", nameAr: "الغدة الدرقية", nameEn: "Thyroid", patterns: ["tsh", "free t4", "free t3", "t4", "t3"] },
 { key: "metabolism", emoji: "⚡", nameAr: "الأيض", nameEn: "Metabolism", patterns: ["sodium", "potassium", "chloride", "co2", "bicarbonate", "magnesium"] },
];

function mapResultsToSystems(results: EnrichedResult[]) {
 const out: Array<{ system: BodySystem; results: EnrichedResult[]; score: number; status: Status }> = [];
 for (const sys of BODY_SYSTEMS) {
 const matched = results.filter((r) => sys.patterns.some((p) => (r.name ?? "").toLowerCase().includes(p)));
 if (matched.length === 0) continue;
 const normalCount = matched.filter((r) => r.status === "normal").length;
 const criticalCount = matched.filter((r) => r.status === "critical").length;
 const score = Math.round((normalCount / matched.length) * 100);
 const status: Status = criticalCount > 0 ? "critical" : score >= 70 ? "normal" : "warning";
 out.push({ system: sys, results: matched, score, status });
 }
 out.sort((a, b) => ({ critical: 0, warning: 1, normal: 2 }[a.status] - { critical: 0, warning: 1, normal: 2 }[b.status]));
 return out;
}

// ─────────────────────────────────────────────────────────────────
// Animation hook
// ─────────────────────────────────────────────────────────────────
function useAnimateIn(delay = 100) {
 const [visible, setVisible] = React.useState(false);
 React.useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
 return visible;
}

// ─────────────────────────────────────────────────────────────────
// PDF Generation
// ─────────────────────────────────────────────────────────────────
async function downloadPDF(elementId: string, filename: string) {
 const element = document.getElementById(elementId);
 if (!element) {
 toast.error("Could not find report content for PDF generation");
 return;
 }

 try {
 const html2canvas = (await import("html2canvas")).default;
 const { jsPDF } = await import("jspdf");

 // BUG 2 FIX: html2canvas cannot parse oklch/lab/color() CSS functions.
 // Convert ALL computed colors to RGB before capture, then restore after.
 const allEls = element.querySelectorAll("*");
 const savedStyles = new Map<Element, string>();

 allEls.forEach((el) => {
 const htmlEl = el as HTMLElement;
 savedStyles.set(el, htmlEl.getAttribute("style") || "");

 const cs = getComputedStyle(el);
 // getComputedStyle returns resolved RGB values even for oklch inputs
 htmlEl.style.color = cs.color;
 htmlEl.style.backgroundColor = cs.backgroundColor;
 htmlEl.style.borderColor = cs.borderColor;
 htmlEl.style.borderLeftColor = cs.borderLeftColor;
 htmlEl.style.borderRightColor = cs.borderRightColor;
 htmlEl.style.borderTopColor = cs.borderTopColor;
 htmlEl.style.borderBottomColor = cs.borderBottomColor;
 htmlEl.style.outlineColor = cs.outlineColor;
 });

 // Also set root element background
 const origBg = element.style.backgroundColor;
 element.style.backgroundColor = "#ffffff";

 const canvas = await html2canvas(element, {
 scale: 2,
 useCORS: true,
 logging: false,
 backgroundColor: "#ffffff",
 ignoreElements: (el) => el.classList?.contains("print:hidden") ?? false,
 });

 // Restore all original styles
 element.style.backgroundColor = origBg;
 allEls.forEach((el) => {
 const htmlEl = el as HTMLElement;
 const saved = savedStyles.get(el);
 if (saved) {
 htmlEl.setAttribute("style", saved);
 } else {
 htmlEl.removeAttribute("style");
 }
 });

 const imgData = canvas.toDataURL("image/png");
 const imgWidth = 190;
 const pageHeight = 277;
 const imgHeight = (canvas.height * imgWidth) / canvas.width;

 const pdf = new jsPDF("p", "mm", "a4");
 let heightLeft = imgHeight;
 let position = 10;
 let page = 1;

 const addHeader = () => {
 pdf.setFontSize(8);
 pdf.setTextColor(150);
 pdf.text("MediSoft Clinical Operating System", 200, 7, { align: "right" });
 pdf.text(new Date().toLocaleDateString("en-US"), 10, 7);
 };

 const addFooter = (pageNum: number) => {
 pdf.setFontSize(7);
 pdf.setTextColor(170);
 pdf.text("Generated by MediSoft C-OS | AI-Powered Clinical Report", 105, 293, { align: "center" });
 pdf.text(`Page ${pageNum}`, 200, 293, { align: "right" });
 };

 addHeader();
 pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
 addFooter(page);
 heightLeft -= pageHeight;

 while (heightLeft > 0) {
 pdf.addPage();
 page++;
 addHeader();
 position = 10 - (page - 1) * pageHeight;
 pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
 addFooter(page);
 heightLeft -= pageHeight;
 }

 pdf.save(filename);
 toast.success("PDF downloaded successfully");
 } catch (err) {
 console.error("PDF generation failed:", err);
 toast.error("PDF generation failed", {
 description: err instanceof Error ? err.message : "Unknown error — try using Print instead",
 });
 }
}

// ─────────────────────────────────────────────────────────────────
// Email share
// ─────────────────────────────────────────────────────────────────
function shareEmail(report: PatientReportData, score: number, normalCount: number, warningCount: number, criticalCount: number) {
 const subject = encodeURIComponent(`تقرير صحي - MediSoft (${score}/100)`);
 const body = encodeURIComponent([
 `🏥 تقرير الصحة - MediSoft`,
 `مؤشر الصحة: ${score}/100`,
 "",
 `🟢 ${normalCount} طبيعي | 🟡 ${warningCount} انتبه | 🔴 ${criticalCount} خطر`,
 "",
 report.overallSummary.slice(0, 500),
 "",
 report.whenToSeeDoctor ? `⏰ ${report.whenToSeeDoctor}` : "",
 "",
 "تقرير معد بواسطة MediSoft C-OS",
 ].join("\n"));
 window.open(`mailto:?subject=${subject}&body=${body}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function InfographicReport({ patientReport, doctorReport }: Props) {
 const report = patientReport;
 const enriched = React.useMemo(() => enrichResults(report.results ?? []), [report.results]);

 const normalCount = enriched.filter((r) => r.status === "normal").length;
 const warningCount = enriched.filter((r) => r.status === "warning").length;
 const criticalCount = enriched.filter((r) => r.status === "critical").length;
 const total = enriched.length || 1;

 // BUG 1 FIX: deterministic score — always the same for the same results
 const healthScore = React.useMemo(() => calculateHealthScore(enriched), [enriched]);

 const sortedResults = [...enriched].sort((a, b) =>
 ({ critical: 0, warning: 1, normal: 2 }[a.status] - { critical: 0, warning: 1, normal: 2 }[b.status]),
 );

 const bodySystems = mapResultsToSystems(enriched);
 const insights = buildInsights(doctorReport, report);

 const [pdfLoading, setPdfLoading] = React.useState(false);

 async function handleDownloadPDF() {
 setPdfLoading(true);
 toast.info("جاري إنشاء ملف PDF...");
 try {
 await downloadPDF("infographic-report-content", `MediSoft-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
 } catch (err) {
 console.error("PDF download failed:", err);
 toast.error("فشل تحميل PDF");
 }
 setPdfLoading(false);
 }

 return (
 <div dir="rtl" lang="ar" className="infographic-report space-y-6 print:space-y-4">
 {/* Toolbar: PDF + Print + Share */}
 <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
 <Button
 variant="brand"
 size="sm"
 onClick={handleDownloadPDF}
 disabled={pdfLoading}
 className="gap-1.5"
 >
 <Download className="size-4" />
 <span>{pdfLoading ? "جاري التحميل..." : "تحميل التقرير PDF"}</span>
 </Button>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
 <Printer className="size-4" />
 <span>{"طباعة"}</span>
 </Button>
 <Button variant="outline" size="sm" onClick={() => shareWhatsApp(report, healthScore, normalCount, warningCount, criticalCount)} className="gap-1.5">
 <Share2 className="size-4" />
 <span>{"واتساب"}</span>
 </Button>
 <Button variant="outline" size="sm" onClick={() => shareEmail(report, healthScore, normalCount, warningCount, criticalCount)} className="gap-1.5">
 <Mail className="size-4" />
 <span>{"بريد"}</span>
 </Button>
 </div>
 </div>

 {/* PDF-capturable content wrapper */}
 <div id="infographic-report-content" className="space-y-6">
 {/* 1. Hero Health Score — uses deterministic score, not AI score */}
 <HeroHealthScore score={healthScore} summary={report.overallSummary} normalCount={normalCount} warningCount={warningCount} criticalCount={criticalCount} total={total} />

 {/* 2. Body Systems Overview */}
 {bodySystems.length > 0 && <BodySystemsSection systems={bodySystems} />}

 {/* 3. Quick Summary Bar + Traffic Light Result Cards */}
 <TrafficLightCards results={sortedResults} normalCount={normalCount} warningCount={warningCount} criticalCount={criticalCount} total={total} />

 {/* 5. AI Insights Cards */}
 {insights.length > 0 && <InsightsSection insights={insights} />}

 {/* 6. Action Plan */}
 <ActionPlanSection results={enriched} report={report} />

 {/* 7. Lifestyle Tips */}
 {report.lifestyleAdvice.length > 0 && <LifestyleTipsSection advice={report.lifestyleAdvice} />}

 {/* Disclaimer */}
 <p className="text-center text-[11px] leading-relaxed text-gray-400 print:text-gray-500">
 ⚠️ هذا التقرير مُعدّ بواسطة الذكاء الاصطناعي للمساعدة فقط. يرجى استشارة طبيبك قبل اتخاذ أي قرار طبي.
 </p>
 </div>
 </div>
 );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 1: Hero Health Score
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function HeroHealthScore({ score, summary, normalCount, warningCount, criticalCount, total }: {
 score: number; summary: string; normalCount: number; warningCount: number; criticalCount: number; total: number;
}) {
 const animated = useAnimateIn(50);
 const R = 80, C = 2 * Math.PI * R;
 const progress = animated ? (score / 100) * C : 0;
 const scoreColor = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : score >= 40 ? "#F97316" : "#EF4444";
 const scoreLabel = score >= 80 ? "صحتك بشكل عام: ممتازة"
 : score >= 60 ? "صحتك بشكل عام: جيدة"
 : score >= 40 ? "صحتك بشكل عام: تحتاج انتباه"
 : "صحتك بشكل عام: تحتاج متابعة";

 return (
 <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm print:shadow-none">
 <div className="pointer-events-none absolute -top-20 start-1/2 -translate-x-1/2 size-64 rounded-full opacity-20 blur-3xl print:hidden" style={{ background: scoreColor }} />
 <div className="relative flex flex-col items-center gap-4">
 <div className="relative">
 <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-sm">
 <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" strokeWidth="14" className="text-gray-200" />
 <circle cx="100" cy="100" r={R} fill="none" stroke={scoreColor} strokeWidth="14" strokeLinecap="round"
 strokeDasharray={`${C}`} strokeDashoffset={`${C - progress}`} transform="rotate(-90 100 100)"
 className="transition-all duration-[1500ms] ease-out" style={{ filter: `drop-shadow(0 0 8px ${scoreColor}60)` }} />
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <span className="text-5xl font-black tabular-nums transition-all duration-1000" style={{ color: scoreColor }}>{animated ? score : 0}</span>
 <span className="text-sm text-gray-500">{"من ١٠٠"}</span>
 </div>
 </div>
 <p className="text-lg font-bold text-gray-900">{scoreLabel}</p>
 <div className="flex flex-wrap items-center justify-center gap-2">
 {normalCount > 0 && <Pill status="normal" count={normalCount} label="طبيعي" />}
 {warningCount > 0 && <Pill status="warning" count={warningCount} label="انتبه" />}
 {criticalCount > 0 && <Pill status="critical" count={criticalCount} label="خطر" />}
 </div>
 <div className="flex h-3 w-full max-w-sm overflow-hidden rounded-full bg-gray-100">
 <div className="bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: animated ? `${(normalCount / total) * 100}%` : "0%" }} />
 <div className="bg-amber-500 transition-all duration-1000 ease-out delay-200" style={{ width: animated ? `${(warningCount / total) * 100}%` : "0%" }} />
 <div className="bg-rose-500 transition-all duration-1000 ease-out delay-300" style={{ width: animated ? `${(criticalCount / total) * 100}%` : "0%" }} />
 </div>
 <p className="max-w-lg text-center text-sm leading-relaxed text-gray-800">{summary}</p>
 </div>
 </div>
 );
}

function Pill({ status, count, label }: { status: Status; count: number; label: string }) {
 const c = STATUS_COLORS[status];
 return (
 <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold", c.bg, c.fg)}>
 {({ normal: "🟢", warning: "🟡", critical: "🔴" })[status]} {count} {label}
 </span>
 );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 2: Body Systems
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function BodySystemsSection({ systems }: { systems: ReturnType<typeof mapResultsToSystems> }) {
 const animated = useAnimateIn(400);
 return (
 <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm print:shadow-none">
 <h3 className="mb-4 text-base font-bold text-gray-900">{"🏥 نظرة عامة على أجهزة الجسم"}</h3>
 <div className="space-y-3">
 {systems.map((s, i) => {
 const c = STATUS_COLORS[s.status];
 return (
 <div key={s.system.key} className={cn("flex items-center gap-3 rounded-xl p-3 transition-all duration-500", c.bg)}
 style={{ opacity: animated ? 1 : 0, transform: animated ? "translateX(0)" : "translateX(20px)", transitionDelay: `${i * 100}ms` }}>
 <span className="text-2xl shrink-0">{s.system.emoji}</span>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-1">
 <span className="text-sm font-semibold text-gray-900">{s.system.nameAr}</span>
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold tabular-nums text-gray-800">{s.score}%</span>
 <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", c.bg, c.fg)}>
 {({ normal: "طبيعي", warning: "انتبه", critical: "خطر" })[s.status]}
 </span>
 </div>
 </div>
 <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200/60/60">
 <div className={cn("h-full rounded-full transition-all duration-[800ms] ease-out", c.bar)}
 style={{ width: animated ? `${s.score}%` : "0%", transitionDelay: `${i * 100 + 200}ms` }} />
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 3: Traffic Light Result Cards + Quick Summary Bar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TrafficLightCards({ results, normalCount, warningCount, criticalCount, total }: {
 results: EnrichedResult[]; normalCount: number; warningCount: number; criticalCount: number; total: number;
}) {
 const animated = useAnimateIn(600);
 return (
 <div>
 <h3 className="mb-3 text-base font-bold text-gray-900">{"🧪 نتائج التحاليل"}</h3>

 {/* Quick Summary Bar */}
 <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm font-semibold">
 <span className="text-gray-700">{total} تحليل:</span>
 <span className="text-emerald-600">{normalCount} طبيعي ✅</span>
 <span className="text-amber-600">{warningCount}{" انتبه ⚠️"}</span>
 <span className="text-rose-600">{criticalCount}{" خطر 🚨"}</span>
 </div>

 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
 {results.map((r, i) => (
 <ResultInfoCard key={`${r.name}-${i}`} result={r} index={i} animated={animated} />
 ))}
 </div>
 </div>
 );
}

function ResultInfoCard({ result, index, animated }: { result: EnrichedResult; index: number; animated: boolean }) {
 const { status, direction } = result;
 const c = STATUS_COLORS[status];
 const numVal = parseFloat(result.value?.replace(/[^\d.\-]/g, "") ?? "");
 const hasGauge = !isNaN(numVal);
 const icon = getTestIcon(result.name);

 const dirIndicator: Record<Direction, { symbol: string; color: string }> = {
 high: { symbol: "↑", color: "text-rose-500" },
 low: { symbol: "↓", color: "text-blue-500" },
 normal: { symbol: "✓", color: "text-emerald-500" },
 };
 const dir = dirIndicator[direction];

 return (
 <div
 className={cn(
 "relative overflow-hidden rounded-xl border-s-4 border border-gray-200 bg-white p-4 shadow-sm transition-all print:shadow-none hover:shadow-md",
 c.border,
 )}
 style={{
 opacity: animated ? 1 : 0,
 transform: animated ? "translateY(0)" : "translateY(12px)",
 transitionDuration: "400ms",
 transitionDelay: `${index * 40}ms`,
 }}
 >
 {/* Top: medical icon + direction */}
 <div className="flex items-start justify-between gap-2">
 <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-full ring-4 transition-shadow", c.bg, c.ring, animated && `shadow-lg ${c.glow}`)}>
 <span className="text-2xl">{icon}</span>
 </div>
 <span className={cn("text-xl font-bold", dir.color)}>{dir.symbol}</span>
 </div>

 {/* Test name */}
 <div className="mt-3">
 <div className="text-sm font-bold text-gray-900">{result.nameAr}</div>
 <div className="text-[11px] text-gray-500">{result.name}</div>
 </div>

 {/* Value — BIG, color-coded by direction */}
 <div className={cn("mt-2 text-2xl font-black tabular-nums",
 direction === "high" ? "text-red-600"
 : direction === "low" ? "text-blue-600"
 : "text-emerald-600"
 )}>{result.value}</div>

 {/* Reference range text */}
 {result.refLow != null && result.refHigh != null && (
 <div className="mt-1 text-xs text-gray-700">
 النتيجة: <span className="font-bold">{result.value}</span> | الطبيعي: <span className="font-bold">{result.refLow} - {result.refHigh}</span>
 </div>
 )}

 {/* Range gauge */}
 {hasGauge && <RangeGauge value={numVal} refLow={result.refLow} refHigh={result.refHigh} status={status} />}

 {/* Explanation */}
 <p className="mt-2 text-xs leading-relaxed text-gray-700">{result.explanation}</p>

 {/* Advice */}
 {result.advice && <p className={cn("mt-1.5 text-xs font-semibold", c.fg)}>{"💡 "}{result.advice}</p>}
 </div>
 );
}

function RangeGauge({ value, refLow, refHigh, status }: { value: number; refLow?: number; refHigh?: number; status: Status }) {
 const c = STATUS_COLORS[status];
 let position: number;
 if (refLow != null && refHigh != null && refHigh > refLow) {
 const range = refHigh - refLow;
 if (value < refLow) { position = 15 - Math.min((refLow - value) / range, 1) * 15; }
 else if (value > refHigh) { position = 85 + Math.min((value - refHigh) / range, 1) * 15; }
 else { position = 15 + ((value - refLow) / range) * 70; }
 } else { position = status === "normal" ? 50 : status === "warning" ? 78 : 92; }
 position = Math.max(2, Math.min(98, position));

 return (
 <div className="mt-2">
 <div className="relative h-2.5 w-full overflow-hidden rounded-full">
 <div className="absolute inset-0 flex">
 <div className="w-[15%] bg-rose-300" />
 <div className="w-[70%] bg-emerald-300" />
 <div className="w-[15%] bg-rose-300" />
 </div>
 <div className={cn("absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-all duration-1000", c.bar)}
 style={{ left: `${position}%`, transform: "translate(-50%, -50%)" }} />
 </div>
 </div>
 );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 5: AI Insights
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface Insight { icon: string; title: string; body: string; type: "tip" | "warning" | "medication" | "goal"; }

function buildInsights(doctor: DoctorReportData, patient: PatientReportData): Insight[] {
 const out: Insight[] = [];

 // Use patient-facing Arabic content first. Only fall back to doctor report
 // (English) if no Arabic alternative exists.

 // Red flags: use patient's whenToSeeDoctor (Arabic) if available,
 // otherwise truncate doctor's red flags
 if (patient.whenToSeeDoctor) {
 out.push({ icon: "⚠️", title: "تنبيه", body: patient.whenToSeeDoctor, type: "warning" });
 } else {
 for (const rf of doctor.redFlags.slice(0, 1)) {
 out.push({ icon: "⚠️", title: "تنبيه", body: rf, type: "warning" });
 }
 }

 // Overall summary (Arabic) as the main insight
 if (patient.overallSummary) {
 out.push({
 icon: "💡",
 title: "نصيحة",
 body: patient.overallSummary.length > 250
 ? patient.overallSummary.slice(0, 250) + "..."
 : patient.overallSummary,
 type: "tip",
 });
 }

 // Specialist recommendation (Arabic)
 if (patient.specialistRecommendation) {
 out.push({ icon: "🎯", title: "هدف", body: patient.specialistRecommendation, type: "goal" });
 }

 // Lifestyle advice as medication insight (Arabic)
 if (patient.lifestyleAdvice.length > 0) {
 const firstAdvice = patient.lifestyleAdvice[0];
 out.push({
 icon: "💊",
 title: "نمط الحياة",
 body: firstAdvice.advice,
 type: "medication",
 });
 }

 return out.slice(0, 4);
}

function InsightsSection({ insights }: { insights: Insight[] }) {
 const animated = useAnimateIn(900);
 const typeStyles: Record<Insight["type"], string> = {
 tip: "border-s-4 border-s-blue-500 border-blue-200 bg-blue-50",
 warning: "border-s-4 border-s-amber-500 border-amber-200 bg-amber-50",
 medication: "border-s-4 border-s-purple-500 border-purple-200 bg-purple-50",
    goal: "border-s-4 border-s-emerald-500 border-emerald-200 bg-emerald-50",
 };
 const titleColor: Record<Insight["type"], string> = {
 tip: "text-blue-900",
 warning: "text-amber-900",
 medication: "text-purple-900",
 goal: "text-emerald-900",
 };
 const bodyColor: Record<Insight["type"], string> = {
 tip: "text-blue-800",
 warning: "text-amber-800",
 medication: "text-purple-800",
 goal: "text-emerald-800",
 };
 return (
 <div>
 <h3 className="mb-4 text-base font-bold text-gray-900">{"🧠 رؤى الذكاء الاصطناعي"}</h3>
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
 {insights.map((ins, i) => (
 <div key={i} className={cn("rounded-xl border p-4 shadow-sm transition-all print:shadow-none", typeStyles[ins.type])}
 style={{ opacity: animated ? 1 : 0, transform: animated ? "translateY(0)" : "translateY(10px)", transitionDuration: "400ms", transitionDelay: `${i * 80}ms` }}>
 <div className="flex items-center gap-2 mb-2">
 <span className="text-xl">{ins.icon}</span>
 <span className={cn("text-sm font-bold", titleColor[ins.type])}>{ins.title}</span>
 </div>
 <p className={cn("text-xs leading-relaxed", bodyColor[ins.type])}>{ins.body}</p>
 </div>
 ))}
 </div>
 </div>
 );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 6: Action Plan
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ActionPlanSection({ results, report }: { results: EnrichedResult[]; report: PatientReportData }) {
 const animated = useAnimateIn(1100);
 const normalItems = results.filter((r) => r.status === "normal");
 const warningItems = results.filter((r) => r.status === "warning");
 const criticalItems = results.filter((r) => r.status === "critical");

 // Group normal results: show first 8 names, then "... و X تحليل آخر"
 const MAX_NORMAL_SHOWN = 8;
 const normalShown = normalItems.slice(0, MAX_NORMAL_SHOWN);
 const normalRemaining = normalItems.length - normalShown.length;

 return (
 <div>
 <h3 className="mb-4 text-base font-bold text-gray-900">{"📋 خطة العمل"}</h3>
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" style={{ opacity: animated ? 1 : 0, transform: animated ? "translateY(0)" : "translateY(10px)", transitionDuration: "500ms" }}>

 {/* Green: No action needed */}
 <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
 <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-700">{"🟢 لا تحتاج إجراء"}</div>
 {normalItems.length === 0 ? <p className="text-xs text-gray-400">-</p> : (
 <div>
 <p className="mb-2 text-xs font-semibold text-emerald-700">
 {normalItems.length} تحليل طبيعي
 </p>
 <ul className="space-y-0.5">
 {normalShown.map((r, i) => (
 <li key={i} className="text-xs text-emerald-800">
 {"✅ "}{r.nameAr || r.name}
 </li>
 ))}
 </ul>
 {normalRemaining > 0 && (
 <p className="mt-1 text-[10px] text-emerald-600">
 ... و {normalRemaining} تحليل آخر طبيعي
 </p>
 )}
 </div>
 )}
 </div>

 {/* Yellow: Monitor */}
 <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
 <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-700">{"🟡 راقب وتابع"}</div>
 {warningItems.length === 0 ? (
 <p className="text-xs text-gray-600">لا توجد نتائج حدّية — ممتاز!</p>
 ) : (
 <ul className="space-y-1.5">{warningItems.map((r, i) => (
 <li key={i} className="text-xs text-amber-800">
 {"🟡 "}{r.nameAr || r.name} <span className="font-bold">{r.value}</span>
 {r.advice && <span className="block text-[10px] text-amber-700">{r.advice}</span>}
 </li>
 ))}</ul>
 )}
 </div>

 {/* Red: See doctor */}
 <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
 <div className="mb-2 flex items-center gap-2 text-sm font-bold text-rose-700">{"🔴 راجع طبيبك"}</div>
 {criticalItems.length === 0 ? (
 <p className="text-xs text-gray-600">لا توجد نتائج خطيرة — ممتاز!</p>
 ) : (
 <ul className="space-y-1.5">{criticalItems.map((r, i) => (
 <li key={i} className="text-xs text-rose-800">
 {"🔴 "}{r.nameAr || r.name} <span className="font-bold">{r.value}</span> — ناقش مع طبيبك
 {r.advice && <span className="block text-[10px] text-rose-700">{r.advice}</span>}
 </li>
 ))}</ul>
 )}
 {report.whenToSeeDoctor && (
 <p className="mt-2 border-t border-rose-200 pt-2 text-[10px] text-rose-700">
 {"⏰ "}{report.whenToSeeDoctor}
 </p>
 )}
 {!report.whenToSeeDoctor && criticalItems.length > 0 && (
 <p className="mt-2 border-t border-rose-200 pt-2 text-[10px] text-rose-700">
 {"⏰ "}ناقش النتائج مع طبيبك في أقرب زيارة
 </p>
 )}
 </div>
 </div>
 </div>
 );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 7: Lifestyle Tips
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const LIFESTYLE_ICONS: Record<string, string> = {
 diet: "🥗", nutrition: "🥗", food: "🥗", hydration: "💧", water: "💧",
 exercise: "🏃", fitness: "🏃", sleep: "😴", rest: "😴",
 stress: "🧘", mental: "🧘", medication: "💊", supplement: "💊",
};

function pickLifestyleIcon(cat: string, icon: string): string {
 if (icon && /\p{Emoji}/u.test(icon)) return icon;
 const low = (cat ?? "").toLowerCase();
 for (const [key, emoji] of Object.entries(LIFESTYLE_ICONS)) { if (low.includes(key)) return emoji; }
 return "💡";
}

function LifestyleTipsSection({ advice }: { advice: PatientReportData["lifestyleAdvice"] }) {
 const animated = useAnimateIn(1300);
 return (
 <div>
 <h3 className="mb-4 text-base font-bold text-gray-900">{"🌱 نصائح لنمط حياة أفضل"}</h3>
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
 {advice.map((a, i) => (
 <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-all print:shadow-none"
 style={{ opacity: animated ? 1 : 0, transform: animated ? "translateY(0)" : "translateY(8px)", transitionDuration: "300ms", transitionDelay: `${i * 60}ms` }}>
 <span className="text-3xl">{pickLifestyleIcon(a.category, a.icon)}</span>
 <p className="text-xs leading-relaxed text-gray-800">{a.advice}</p>
 </div>
 ))}
 </div>
 </div>
 );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WhatsApp share
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function shareWhatsApp(report: PatientReportData, score: number, normalCount: number, warningCount: number, criticalCount: number) {
 const lines: string[] = [
 `🏥 *تقرير الصحة - MediSoft*`, "",
 `📊 *مؤشر الصحة: ${score}/100*`, "",
 ];
 if (normalCount > 0) lines.push(`🟢 ${normalCount} نتائج طبيعية`);
 if (warningCount > 0) lines.push(`🟡 ${warningCount} تحتاج انتباه`);
 if (criticalCount > 0) lines.push(`🔴 ${criticalCount} تحتاج مراجعة طبيب`);
 lines.push("", report.overallSummary.slice(0, 300), "");
 const criticals = report.results.filter((r) => computeResult(r).status === "critical");
 if (criticals.length > 0) {
 lines.push(`*🔴 نتائج تحتاج مراجعة:*`);
 for (const r of criticals) lines.push(` - ${r.nameAr}: ${r.value}`);
 lines.push("");
 }
 if (report.whenToSeeDoctor) { lines.push(`⏰ ${report.whenToSeeDoctor}`, ""); }
 lines.push(`_تقرير معد بواسطة MediSoft C-OS_`);
 window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
}
