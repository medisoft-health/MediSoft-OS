"use client";

import type { NarrativeOutput } from "@/lib/medilab/narrative";

/**
 * MediLab client helpers — narrative + trend fetches from the browser.
 */

export type NarrativeClientResult =
  | { kind: "ok"; data: NarrativeOutput }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

export async function generateNarrative(
  labResultId: string,
): Promise<NarrativeClientResult> {
  let res: Response;
  try {
    res = await fetch("/api/medilab/narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labResultId }),
    });
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }

  let payload: NarrativeOutput & { error?: string; reason?: string } = {
    physicianSummary: "",
    patientSummary: "",
    highlights: [],
  };
  try {
    payload = await res.json();
  } catch {
    return { kind: "error", message: `Unexpected ${res.status} response` };
  }

  if (res.status === 503 && payload.reason === "not_configured") {
    return {
      kind: "not_configured",
      message:
        payload.error ??
        "Gemini not configured. Set GOOGLE_GEMINI_API_KEY to enable AI narratives.",
    };
  }
  if (!res.ok) {
    return {
      kind: "error",
      message: payload.error ?? `Narrative failed (HTTP ${res.status}).`,
    };
  }
  return { kind: "ok", data: payload };
}

export interface TrendPoint {
  resultDate: string;
  value: number;
  unit: string | null;
  flag: string | null;
}

export async function fetchBiomarkerTrend(
  patientId: number,
  testName: string,
): Promise<TrendPoint[]> {
  try {
    const res = await fetch(
      `/api/medilab/trend?patientId=${patientId}&testName=${encodeURIComponent(testName)}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { points?: TrendPoint[] };
    return data.points ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// Clinical Intelligence Engine
// ─────────────────────────────────────────────────────────────────
export interface TrendData {
  testName: string;
  current: number;
  previous: number | null;
  percentChange: number | null;
  direction: "improving" | "worsening" | "stable" | "new";
  summary: string;
  history: Array<{ date: string; value: number; flag?: string }>;
  unit: string;
}

export interface IntelligenceData {
  trendAnalysis: Array<{
    testName: string;
    trajectory: string;
    detail: string;
    clinicalSignificance?: string;
  }>;
  crossModuleInsights: Array<{
    insight: string;
    modules: string;
    urgency?: string;
  }>;
  medicationImpact: Array<{
    drug: string;
    labEffect: string;
    recommendation?: string;
  }>;
  clinicalTrajectory: {
    overallStatus: string;
    detail: string;
    riskLevel?: string;
  };
  recommendations: Array<{
    action: string;
    urgency: string;
    rationale?: string;
  }>;
  physicianSummary: string;
  patientSummary: string;
  trends: TrendData[];
}

export type IntelligenceClientResult =
  | { kind: "ok"; data: IntelligenceData }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

export async function generateIntelligence(
  labResultId: string,
): Promise<IntelligenceClientResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000); // 3 minutes

  let res: Response;
  try {
    res = await fetch("/api/medilab/intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labResultId }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      return { kind: "error", message: "Intelligence generation timed out. Try again — the system will use an optimized prompt." };
    }
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }
  clearTimeout(timeout);

  let payload: IntelligenceData & { error?: string; reason?: string } = {
    trendAnalysis: [],
    crossModuleInsights: [],
    medicationImpact: [],
    clinicalTrajectory: { overallStatus: "", detail: "" },
    recommendations: [],
    physicianSummary: "",
    patientSummary: "",
    trends: [],
  };
  try {
    payload = await res.json();
  } catch {
    return { kind: "error", message: `Unexpected ${res.status} response` };
  }

  if (res.status === 503 && payload.reason === "not_configured") {
    return { kind: "not_configured", message: payload.error ?? "Not configured." };
  }
  if (!res.ok) {
    return { kind: "error", message: payload.error ?? `Failed (${res.status}).` };
  }
  return { kind: "ok", data: payload };
}

// ─────────────────────────────────────────────────────────────────
// File upload + AI extraction
// ─────────────────────────────────────────────────────────────────
export interface ExtractedResult {
  testName: string;
  value: string;
  unit: string;
  referenceLow: string;
  referenceHigh: string;
  flag: string;
  interpretation?: string;
}

export interface ExtractionClientOutput {
  panelName: string;
  panelCategory: string;
  laboratory: string;
  collectionDate: string;
  results: ExtractedResult[];
}

export type ExtractionClientResult =
  | { kind: "ok"; data: ExtractionClientOutput }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

/**
 * Upload a lab report file (PDF, image, Excel, CSV) and get structured
 * results extracted by Gemini.
 */
export async function extractLabFromFile(
  file: File,
): Promise<ExtractionClientResult> {
  const form = new FormData();
  form.append("file", file);

  // 180-second timeout — PDF text extraction + Gemini can take time
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000);

  let res: Response;
  try {
    res = await fetch("/api/medilab/extract", {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError") {
      return {
        kind: "error",
        message: "Extraction timed out (3 min). Try a smaller file or enter results manually.",
      };
    }
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }
  clearTimeout(timeoutId);

  let body: ExtractionClientOutput & { error?: string; reason?: string } = {
    panelName: "",
    panelCategory: "",
    laboratory: "",
    collectionDate: "",
    results: [],
  };
  try {
    body = await res.json();
  } catch {
    return { kind: "error", message: `Unexpected ${res.status} response` };
  }

  if (res.status === 503 && body.reason === "not_configured") {
    return {
      kind: "not_configured",
      message: body.error ?? "Gemini not configured.",
    };
  }
  if (!res.ok) {
    return {
      kind: "error",
      message: body.error ?? `Extraction failed (HTTP ${res.status}).`,
    };
  }
  return { kind: "ok", data: body };
}

// ─────────────────────────────────────────────────────────────────
// AI Medical Narrative Report
// ─────────────────────────────────────────────────────────────────
export interface DoctorReportData {
  overview: {
    totalTests: number;
    normalCount: number;
    abnormalCount: number;
    urgencyLevel: string;
  };
  abnormalFindings: Array<{
    test: string;
    value: string;
    unit?: string;
    reference?: string;
    status: string;
    severity?: string;
    clinicalSignificance: string;
  }>;
  clinicalCorrelations: string;
  differentialDiagnosis: Array<{
    condition: string;
    probability: number;
    matchingCriteria: string;
  }>;
  recommendedTests: Array<{
    test: string;
    reason: string;
    urgency: string;
  }>;
  redFlags: string[];
  guidelinesReference: string;
}

export interface PatientReportData {
  healthScore: number;
  overallSummary: string;
  results: Array<{
    name: string;
    nameAr: string;
    value: string;
    /** Low end of reference range (numeric). */
    refLow?: number;
    /** High end of reference range (numeric). */
    refHigh?: number;
    /** "normal" | "warning" | "critical" — AI hint, may be overridden by local calculation. */
    status: string;
    /** "high" | "low" | "normal" — AI hint, may be overridden by local calculation. */
    direction: string;
    explanation: string;
    advice?: string;
  }>;
  lifestyleAdvice: Array<{
    icon: string;
    advice: string;
    category: string;
  }>;
  whenToSeeDoctor: string;
  specialistRecommendation?: string;
}

export interface NarrativeReportData {
  doctorReport: DoctorReportData;
  patientReport: PatientReportData;
}

export type NarrativeReportClientResult =
  | { kind: "ok"; data: NarrativeReportData }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

export async function generateNarrativeReport(
  labResultId: string,
): Promise<NarrativeReportClientResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000); // 3 minutes

  let res: Response;
  try {
    res = await fetch("/api/medilab/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labResultId }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      return { kind: "error", message: "Report generation timed out. Try again — the system will use an optimized prompt." };
    }
    return { kind: "error", message: err instanceof Error ? err.message : "Network error" };
  }
  clearTimeout(timeout);

  let payload: NarrativeReportData & { error?: string; reason?: string } = {
    doctorReport: { overview: { totalTests: 0, normalCount: 0, abnormalCount: 0, urgencyLevel: "" }, abnormalFindings: [], clinicalCorrelations: "", differentialDiagnosis: [], recommendedTests: [], redFlags: [], guidelinesReference: "" },
    patientReport: { healthScore: 0, overallSummary: "", results: [], lifestyleAdvice: [], whenToSeeDoctor: "" },
  };
  try {
    payload = await res.json();
  } catch {
    return { kind: "error", message: `Unexpected ${res.status} response` };
  }

  if (res.status === 503 && payload.reason === "not_configured") {
    return { kind: "not_configured", message: payload.error ?? "Not configured." };
  }
  if (!res.ok) {
    return { kind: "error", message: payload.error ?? `Failed (${res.status}).` };
  }
  return { kind: "ok", data: payload };
}

// ─────────────────────────────────────────────────────────────────
// Lab Comparison
// ─────────────────────────────────────────────────────────────────

export interface PatientLabSummary {
  id: string;
  panelName: string;
  resultDate: string | null;
  collectionDate: string | null;
  laboratory: string | null;
}

export interface ComparisonRow {
  testName: string;
  current: { value: string; unit: string; flag: string } | null;
  previous: { value: string; unit: string; flag: string } | null;
  percentChange: number | null;
  direction: "improved" | "worsened" | "stable" | "new";
  referenceLow: number | null;
  referenceHigh: number | null;
}

export interface ComparisonData {
  comparison: ComparisonRow[];
  currentDate: string | null;
  previousDate: string | null;
  currentPanel: string;
  previousPanel: string;
  aiCommentary?: string;
}

export async function fetchPatientLabs(patientId: number): Promise<PatientLabSummary[]> {
  try {
    const res = await fetch(`/api/medilab/patient-labs?patientId=${patientId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.labs ?? [];
  } catch {
    return [];
  }
}

export type ComparisonResult =
  | { kind: "ok"; data: ComparisonData }
  | { kind: "error"; message: string };

export async function fetchComparison(
  labResultId1: string,
  labResultId2: string,
  generateAI = false,
): Promise<ComparisonResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let res: Response;
  try {
    res = await fetch("/api/medilab/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labResultId1, labResultId2, generateAI }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      return { kind: "error", message: "Comparison timed out." };
    }
    return { kind: "error", message: err instanceof Error ? err.message : "Network error" };
  }
  clearTimeout(timeout);

  let body: ComparisonData & { error?: string };
  try { body = await res.json(); } catch {
    return { kind: "error", message: `Unexpected ${res.status} response` };
  }
  if (!res.ok) return { kind: "error", message: body.error ?? `Failed (${res.status}).` };
  return { kind: "ok", data: body };
}

// ─────────────────────────────────────────────────────────────────
// Drug-Lab Interaction Alerts
// ─────────────────────────────────────────────────────────────────

export interface DrugLabAlert {
  id: string;
  severity: "critical" | "high" | "moderate" | "low";
  drugName: string;
  drugDose: string;
  drugStartDate: string | null;
  affectedTest: string;
  currentValue: number | string;
  unit: string;
  expectedEffect: string;
  mechanism: string;
  recommendation: string;
  confidence: "definite" | "probable" | "possible";
  source: "knowledge_base" | "ai_analysis";
}

export interface DrugLabAlertResult {
  alerts: DrugLabAlert[];
  totalActiveDrugs: number;
  analyzedTests: number;
  aiEnhanced: boolean;
}

export async function fetchDrugLabAlerts(labResultId: string): Promise<DrugLabAlertResult | null> {
  try {
    const res = await fetch("/api/medilab/drug-lab-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labResultId }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// Predictive Risk Assessment
// ─────────────────────────────────────────────────────────────────

export interface RiskCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  score: number;
  level: "low" | "moderate" | "high" | "very_high";
  trend: "improving" | "stable" | "worsening" | "insufficient_data";
  contributingFactors: Array<{
    factor: string;
    points: number;
    category: "lab" | "demographic" | "medication" | "history";
  }>;
  preventiveActions: Array<{
    action: string;
    priority: "immediate" | "short_term" | "long_term";
    category: "lifestyle" | "medication" | "monitoring" | "referral";
  }>;
  nextTestDate: string | null;
  nextTestReason: string | null;
}

export interface RiskAssessmentResult {
  patientId: number;
  assessmentDate: string;
  risks: RiskCategory[];
  overallHealthScore: number;
  topConcern: string | null;
  aiInsight: string | null;
}

export async function fetchRiskAssessment(
  patientId: number,
  includeAI = false,
): Promise<RiskAssessmentResult | null> {
  try {
    const res = await fetch("/api/medilab/risk-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, includeAI }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// Differential Diagnosis
// ─────────────────────────────────────────────────────────────────

export interface DiagnosisCandidate {
  rank: number;
  diagnosis: string;
  diagnosisAr: string;
  icdCode: string | null;
  probability: "very_likely" | "likely" | "possible" | "unlikely";
  probabilityPercent: number;
  supportingEvidence: Array<{ type: string; finding: string; strength: "strong" | "moderate" | "weak" }>;
  againstEvidence: Array<{ type: string; finding: string; strength: "strong" | "moderate" | "weak" }>;
  recommendedTests: Array<{ test: string; reason: string; urgency: "stat" | "routine" | "follow_up" }>;
  recommendedActions: Array<{ action: string; category: string; urgency: "immediate" | "within_week" | "within_month" }>;
  clinicalPearl: string | null;
}

export interface DifferentialDiagnosisResult {
  sessionId: string;
  patientId: number;
  inputSymptoms: string[];
  timestamp: string;
  diagnoses: DiagnosisCandidate[];
  criticalAlerts: string[];
  clinicalSummary: string;
  disclaimer: string;
}

export interface SymptomSuggestionClient {
  id: string;
  nameEn: string;
  nameAr: string;
  category: string;
  commonAssociations: string[];
}

export async function fetchSymptomSuggestions(
  query: string,
  selectedIds: string[] = [],
): Promise<SymptomSuggestionClient[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedIds.length > 0) params.set("selected", selectedIds.join(","));
    const res = await fetch(`/api/medilab/symptoms?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.symptoms ?? [];
  } catch {
    return [];
  }
}

export type DDxClientResult =
  | { kind: "ok"; data: DifferentialDiagnosisResult }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

export async function fetchDifferentialDiagnosis(
  patientId: number,
  symptoms: string[],
  options?: { duration?: string; severity?: string; onset?: string; additionalNotes?: string },
): Promise<DDxClientResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let res: Response;
  try {
    res = await fetch("/api/medilab/differential-diagnosis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, symptoms, ...options }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") return { kind: "error", message: "Analysis timed out. Try with fewer symptoms." };
    return { kind: "error", message: err instanceof Error ? err.message : "Network error" };
  }
  clearTimeout(timeout);

  let body: DifferentialDiagnosisResult & { error?: string; reason?: string };
  try { body = await res.json(); } catch {
    return { kind: "error", message: `Unexpected ${res.status} response` };
  }
  if (res.status === 503 && body.reason === "not_configured") return { kind: "not_configured", message: body.error ?? "Not configured." };
  if (!res.ok) return { kind: "error", message: body.error ?? `Failed (${res.status}).` };
  return { kind: "ok", data: body };
}

// ─────────────────────────────────────────────────────────────────
// Patient Timeline + Dashboard
// ─────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  type: "lab" | "encounter" | "prescription" | "scan" | "vital" | "milestone";
  date: string;
  title: string;
  titleEn: string;
  subtitle: string | null;
  icon: string;
  color: string;
  metadata: Record<string, unknown>;
  detailUrl: string | null;
}

export interface TimelineResult {
  events: TimelineEvent[];
  totalEvents: number;
  hasMore: boolean;
}

export interface DashboardData {
  patient: { id: number; firstName: string; lastName: string; age: number; sex: string };
  overallHealthScore: number;
  risks: Array<{ id: string; name: string; nameEn: string; score: number; level: string }>;
  stats: {
    lastLabDate: string | null;
    lastLabPanel: string | null;
    lastLabAbnormal: number;
    activeMeds: number;
    drugAlertCount: number;
    lastVitalDate: string | null;
    lastBP: string | null;
    lastEncounterDate: string | null;
  };
  keyTrends: Array<{ testName: string; values: Array<{ date: string; value: number }>; direction: string }>;
  alerts: Array<{ severity: string; message: string }>;
}

export async function fetchPatientTimeline(
  patientId: number,
  params?: { limit?: number; offset?: number; types?: string[] },
): Promise<TimelineResult | null> {
  try {
    const sp = new URLSearchParams();
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.offset) sp.set("offset", String(params.offset));
    if (params?.types?.length) sp.set("types", params.types.join(","));
    const res = await fetch(`/api/patients/${patientId}/timeline?${sp}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function fetchPatientDashboard(patientId: number): Promise<DashboardData | null> {
  try {
    const res = await fetch(`/api/patients/${patientId}/dashboard`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}
