import "server-only";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ─────────────────────────────────────────────────────────────────────────────
// MediPredict — AI Early Warning System
// Predicts patient deterioration 12-24 hours before clinical manifestation
// Uses Modified Early Warning Score (MEWS) + AI-powered trend analysis
// ─────────────────────────────────────────────────────────────────────────────

export interface VitalSignInput {
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  spo2?: number;
  painScore?: number;
  consciousnessLevel?: "alert" | "voice" | "pain" | "unresponsive";
  urineOutput?: number; // ml/hr
  recordedAt: string;
}

export interface LabInput {
  name: string;
  value: number;
  unit: string;
  referenceRange?: string;
  resultDate: string;
}

export interface PatientContext {
  patientId: number;
  age: number;
  gender: string;
  conditions: string[];
  medications: string[];
  allergies: string[];
  recentVitals: VitalSignInput[];
  recentLabs: LabInput[];
  recentNotes?: string[];
}

export interface RiskFactor {
  factor: string;
  severity: "critical" | "high" | "moderate" | "low";
  description: string;
  evidence: string;
  trendDirection: "worsening" | "stable" | "improving";
}

export interface DeteriorationPrediction {
  overallRiskScore: number; // 0-100
  riskLevel: "critical" | "high" | "moderate" | "low" | "minimal";
  predictedTimeToEvent: string; // e.g., "6-12 hours"
  predictedEvents: Array<{
    event: string;
    probability: number; // 0-1
    timeframe: string;
  }>;
  riskFactors: RiskFactor[];
  mewsScore: number;
  qsofaScore: number;
  newsScore: number;
  recommendations: Array<{
    priority: "immediate" | "urgent" | "routine";
    action: string;
    rationale: string;
  }>;
  alertType: "red" | "amber" | "yellow" | "green";
  requiresICU: boolean;
  requiresRRT: boolean; // Rapid Response Team
  monitoringFrequency: string;
  nextReassessment: string;
  confidence: number;
}

export interface EarlyWarningAlert {
  id: string;
  patientId: number;
  patientName: string;
  prediction: DeteriorationPrediction;
  triggeredAt: string;
  acknowledged: boolean;
  escalatedTo?: string;
}

// ─── MEWS Calculation ────────────────────────────────────────────────────────

function calculateMEWS(vitals: VitalSignInput): number {
  let score = 0;

  // Systolic BP
  if (vitals.bpSystolic) {
    if (vitals.bpSystolic <= 70) score += 3;
    else if (vitals.bpSystolic <= 80) score += 2;
    else if (vitals.bpSystolic <= 100) score += 1;
    else if (vitals.bpSystolic >= 200) score += 2;
  }

  // Heart Rate
  if (vitals.heartRate) {
    if (vitals.heartRate < 40) score += 2;
    else if (vitals.heartRate <= 50) score += 1;
    else if (vitals.heartRate >= 130) score += 3;
    else if (vitals.heartRate >= 110) score += 2;
    else if (vitals.heartRate >= 100) score += 1;
  }

  // Respiratory Rate
  if (vitals.respiratoryRate) {
    if (vitals.respiratoryRate < 9) score += 2;
    else if (vitals.respiratoryRate >= 30) score += 3;
    else if (vitals.respiratoryRate >= 21) score += 2;
    else if (vitals.respiratoryRate >= 15) score += 1;
  }

  // Temperature
  if (vitals.temperature) {
    if (vitals.temperature < 35) score += 2;
    else if (vitals.temperature >= 38.5) score += 2;
    else if (vitals.temperature < 36 || vitals.temperature >= 38) score += 1;
  }

  // Consciousness (AVPU)
  if (vitals.consciousnessLevel) {
    if (vitals.consciousnessLevel === "unresponsive") score += 3;
    else if (vitals.consciousnessLevel === "pain") score += 2;
    else if (vitals.consciousnessLevel === "voice") score += 1;
  }

  return score;
}

// ─── NEWS2 Calculation ───────────────────────────────────────────────────────

function calculateNEWS2(vitals: VitalSignInput): number {
  let score = 0;

  // Respiration rate
  if (vitals.respiratoryRate) {
    if (vitals.respiratoryRate <= 8) score += 3;
    else if (vitals.respiratoryRate <= 11) score += 1;
    else if (vitals.respiratoryRate >= 25) score += 3;
    else if (vitals.respiratoryRate >= 21) score += 2;
  }

  // SpO2 (Scale 1)
  if (vitals.spo2) {
    if (vitals.spo2 <= 91) score += 3;
    else if (vitals.spo2 <= 93) score += 2;
    else if (vitals.spo2 <= 95) score += 1;
  }

  // Systolic BP
  if (vitals.bpSystolic) {
    if (vitals.bpSystolic <= 90) score += 3;
    else if (vitals.bpSystolic <= 100) score += 2;
    else if (vitals.bpSystolic <= 110) score += 1;
    else if (vitals.bpSystolic >= 220) score += 3;
  }

  // Heart rate
  if (vitals.heartRate) {
    if (vitals.heartRate <= 40) score += 3;
    else if (vitals.heartRate <= 50) score += 1;
    else if (vitals.heartRate >= 131) score += 3;
    else if (vitals.heartRate >= 111) score += 2;
    else if (vitals.heartRate >= 91) score += 1;
  }

  // Consciousness
  if (vitals.consciousnessLevel && vitals.consciousnessLevel !== "alert") {
    score += 3;
  }

  // Temperature
  if (vitals.temperature) {
    if (vitals.temperature <= 35) score += 3;
    else if (vitals.temperature <= 36) score += 1;
    else if (vitals.temperature >= 39.1) score += 2;
    else if (vitals.temperature >= 38.1) score += 1;
  }

  return score;
}

// ─── qSOFA Calculation (Sepsis screening) ────────────────────────────────────

function calculateQSOFA(vitals: VitalSignInput): number {
  let score = 0;
  if (vitals.respiratoryRate && vitals.respiratoryRate >= 22) score += 1;
  if (vitals.bpSystolic && vitals.bpSystolic <= 100) score += 1;
  if (vitals.consciousnessLevel && vitals.consciousnessLevel !== "alert") score += 1;
  return score;
}

// ─── Trend Analysis ──────────────────────────────────────────────────────────

function analyzeTrends(vitals: VitalSignInput[]): {
  hrTrend: string;
  bpTrend: string;
  rrTrend: string;
  spo2Trend: string;
  tempTrend: string;
  overallTrajectory: "deteriorating" | "stable" | "improving";
} {
  if (vitals.length < 2) {
    return {
      hrTrend: "insufficient_data",
      bpTrend: "insufficient_data",
      rrTrend: "insufficient_data",
      spo2Trend: "insufficient_data",
      tempTrend: "insufficient_data",
      overallTrajectory: "stable",
    };
  }

  const sorted = [...vitals].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  const recent = sorted.slice(-3);
  const earlier = sorted.slice(0, Math.min(3, sorted.length - 1));

  function getTrend(
    recentVals: (number | undefined)[],
    earlierVals: (number | undefined)[]
  ): string {
    const rv = recentVals.filter((v): v is number => v !== undefined);
    const ev = earlierVals.filter((v): v is number => v !== undefined);
    if (rv.length === 0 || ev.length === 0) return "insufficient_data";
    const recentAvg = rv.reduce((a, b) => a + b, 0) / rv.length;
    const earlierAvg = ev.reduce((a, b) => a + b, 0) / ev.length;
    const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
    if (Math.abs(change) < 5) return "stable";
    return change > 0 ? "increasing" : "decreasing";
  }

  const hrTrend = getTrend(
    recent.map((v) => v.heartRate),
    earlier.map((v) => v.heartRate)
  );
  const bpTrend = getTrend(
    recent.map((v) => v.bpSystolic),
    earlier.map((v) => v.bpSystolic)
  );
  const rrTrend = getTrend(
    recent.map((v) => v.respiratoryRate),
    earlier.map((v) => v.respiratoryRate)
  );
  const spo2Trend = getTrend(
    recent.map((v) => v.spo2),
    earlier.map((v) => v.spo2)
  );
  const tempTrend = getTrend(
    recent.map((v) => v.temperature),
    earlier.map((v) => v.temperature)
  );

  // Determine overall trajectory
  let deterioratingSignals = 0;
  if (hrTrend === "increasing") deterioratingSignals++;
  if (bpTrend === "decreasing") deterioratingSignals++;
  if (rrTrend === "increasing") deterioratingSignals++;
  if (spo2Trend === "decreasing") deterioratingSignals++;
  if (tempTrend === "increasing") deterioratingSignals++;

  const overallTrajectory =
    deterioratingSignals >= 3
      ? "deteriorating"
      : deterioratingSignals >= 1
        ? "stable"
        : "improving";

  return { hrTrend, bpTrend, rrTrend, spo2Trend, tempTrend, overallTrajectory };
}

// ─── AI-Powered Prediction ───────────────────────────────────────────────────

export async function predictDeterioration(
  context: PatientContext
): Promise<DeteriorationPrediction> {
  const latestVitals = context.recentVitals[0];
  const mewsScore = latestVitals ? calculateMEWS(latestVitals) : 0;
  const newsScore = latestVitals ? calculateNEWS2(latestVitals) : 0;
  const qsofaScore = latestVitals ? calculateQSOFA(latestVitals) : 0;
  const trends = analyzeTrends(context.recentVitals);

  const ai = getGeminiClient();
  if (!ai) {
    // Fallback to rule-based scoring only
    return generateRuleBasedPrediction(mewsScore, newsScore, qsofaScore, trends, context);
  }

  const systemPrompt = `You are MediPredict, an advanced AI Early Warning System for clinical deterioration prediction. You analyze patient data including vital signs, lab results, medical history, and trends to predict deterioration events 12-24 hours before they clinically manifest.

Your predictions are based on:
1. Modified Early Warning Score (MEWS)
2. National Early Warning Score 2 (NEWS2)
3. Quick Sequential Organ Failure Assessment (qSOFA)
4. Vital sign trend analysis (trajectory over time)
5. Lab result patterns (lactate, WBC, creatinine, etc.)
6. Patient comorbidities and medication interactions
7. Clinical context and recent interventions

You must respond ONLY with valid JSON matching the specified schema. Be conservative — false negatives are less harmful than false positives in clinical settings, but do not miss critical deterioration patterns.`;

  const prompt = `Analyze this patient for deterioration risk:

PATIENT PROFILE:
- Age: ${context.age}, Gender: ${context.gender}
- Conditions: ${context.conditions.join(", ") || "None documented"}
- Medications: ${context.medications.join(", ") || "None documented"}
- Allergies: ${context.allergies.join(", ") || "NKDA"}

CURRENT SCORES:
- MEWS: ${mewsScore}/14
- NEWS2: ${newsScore}/20
- qSOFA: ${qsofaScore}/3

VITAL SIGNS (most recent first):
${context.recentVitals
  .slice(0, 6)
  .map(
    (v, i) =>
      `[${i === 0 ? "CURRENT" : `${i} readings ago`}] BP: ${v.bpSystolic || "?"}/${v.bpDiastolic || "?"}, HR: ${v.heartRate || "?"}, RR: ${v.respiratoryRate || "?"}, Temp: ${v.temperature || "?"}°C, SpO2: ${v.spo2 || "?"}%, Pain: ${v.painScore ?? "?"}/10 — ${v.recordedAt}`
  )
  .join("\n")}

VITAL TRENDS:
- Heart Rate: ${trends.hrTrend}
- Blood Pressure: ${trends.bpTrend}
- Respiratory Rate: ${trends.rrTrend}
- SpO2: ${trends.spo2Trend}
- Temperature: ${trends.tempTrend}
- Overall Trajectory: ${trends.overallTrajectory}

RECENT LAB RESULTS:
${
  context.recentLabs.length > 0
    ? context.recentLabs
        .map((l) => `- ${l.name}: ${l.value} ${l.unit} (ref: ${l.referenceRange || "N/A"}) — ${l.resultDate}`)
        .join("\n")
    : "No recent labs available"
}

${context.recentNotes?.length ? `RECENT CLINICAL NOTES:\n${context.recentNotes.join("\n")}` : ""}

Respond with JSON:
{
  "overallRiskScore": <0-100>,
  "riskLevel": "critical|high|moderate|low|minimal",
  "predictedTimeToEvent": "<timeframe string>",
  "predictedEvents": [{"event": "<event>", "probability": <0-1>, "timeframe": "<when>"}],
  "riskFactors": [{"factor": "<name>", "severity": "critical|high|moderate|low", "description": "<detail>", "evidence": "<data point>", "trendDirection": "worsening|stable|improving"}],
  "recommendations": [{"priority": "immediate|urgent|routine", "action": "<what to do>", "rationale": "<why>"}],
  "alertType": "red|amber|yellow|green",
  "requiresICU": <boolean>,
  "requiresRRT": <boolean>,
  "monitoringFrequency": "<e.g., every 15 minutes>",
  "nextReassessment": "<timeframe>",
  "confidence": <0-1>
}`;

  try {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
        systemInstruction: systemPrompt,
      },
    });

    const text = result.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateRuleBasedPrediction(mewsScore, newsScore, qsofaScore, trends, context);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      ...parsed,
      mewsScore,
      qsofaScore,
      newsScore,
    };
  } catch {
    return generateRuleBasedPrediction(mewsScore, newsScore, qsofaScore, trends, context);
  }
}

// ─── Rule-Based Fallback ─────────────────────────────────────────────────────

function generateRuleBasedPrediction(
  mews: number,
  news: number,
  qsofa: number,
  trends: ReturnType<typeof analyzeTrends>,
  context: PatientContext
): DeteriorationPrediction {
  // Composite score from all scoring systems
  const compositeScore = Math.min(
    100,
    (mews / 14) * 30 + (news / 20) * 40 + (qsofa / 3) * 30 + (trends.overallTrajectory === "deteriorating" ? 15 : 0)
  );

  const riskLevel: DeteriorationPrediction["riskLevel"] =
    compositeScore >= 75 ? "critical" :
    compositeScore >= 55 ? "high" :
    compositeScore >= 35 ? "moderate" :
    compositeScore >= 15 ? "low" : "minimal";

  const alertType: DeteriorationPrediction["alertType"] =
    riskLevel === "critical" ? "red" :
    riskLevel === "high" ? "amber" :
    riskLevel === "moderate" ? "yellow" : "green";

  return {
    overallRiskScore: Math.round(compositeScore),
    riskLevel,
    predictedTimeToEvent: compositeScore >= 55 ? "6-12 hours" : compositeScore >= 35 ? "12-24 hours" : ">24 hours",
    predictedEvents: qsofa >= 2
      ? [{ event: "Sepsis progression", probability: 0.6, timeframe: "6-12 hours" }]
      : mews >= 5
        ? [{ event: "Clinical deterioration requiring escalation", probability: 0.5, timeframe: "12-24 hours" }]
        : [],
    riskFactors: [],
    mewsScore: mews,
    qsofaScore: qsofa,
    newsScore: news,
    recommendations: compositeScore >= 55
      ? [{ priority: "immediate", action: "Activate Rapid Response Team", rationale: `High composite score (${Math.round(compositeScore)}) with ${trends.overallTrajectory} trajectory` }]
      : [{ priority: "routine", action: "Continue standard monitoring", rationale: "Low risk at present" }],
    alertType,
    requiresICU: compositeScore >= 75,
    requiresRRT: compositeScore >= 55,
    monitoringFrequency: compositeScore >= 55 ? "Every 15 minutes" : compositeScore >= 35 ? "Every 30 minutes" : "Every 4 hours",
    nextReassessment: compositeScore >= 55 ? "15 minutes" : "4 hours",
    confidence: 0.65,
  };
}

// ─── Batch Screening (All Patients) ──────────────────────────────────────────

export async function screenAllPatients(
  patients: PatientContext[]
): Promise<EarlyWarningAlert[]> {
  const alerts: EarlyWarningAlert[] = [];

  for (const patient of patients) {
    const prediction = await predictDeterioration(patient);
    if (prediction.riskLevel !== "minimal" && prediction.riskLevel !== "low") {
      alerts.push({
        id: `alert-${patient.patientId}-${Date.now()}`,
        patientId: patient.patientId,
        patientName: `Patient #${patient.patientId}`,
        prediction,
        triggeredAt: new Date().toISOString(),
        acknowledged: false,
      });
    }
  }

  // Sort by risk score descending
  alerts.sort((a, b) => b.prediction.overallRiskScore - a.prediction.overallRiskScore);
  return alerts;
}

// ─── Sepsis Screening ────────────────────────────────────────────────────────

export async function screenForSepsis(context: PatientContext): Promise<{
  sepsisRisk: "high" | "moderate" | "low";
  qsofaScore: number;
  sofa_estimated: number;
  lactateLevel?: number;
  recommendations: string[];
  hoursSinceLastAssessment: number;
}> {
  const latestVitals = context.recentVitals[0];
  const qsofa = latestVitals ? calculateQSOFA(latestVitals) : 0;

  // Check for elevated lactate in labs
  const lactate = context.recentLabs.find(
    (l) => l.name.toLowerCase().includes("lactate") || l.name.toLowerCase().includes("lactic")
  );

  // Check for elevated WBC
  const wbc = context.recentLabs.find(
    (l) => l.name.toLowerCase().includes("wbc") || l.name.toLowerCase().includes("white blood")
  );

  let sepsisRisk: "high" | "moderate" | "low" = "low";
  const recommendations: string[] = [];

  if (qsofa >= 2) {
    sepsisRisk = "high";
    recommendations.push("Immediate blood cultures before antibiotics");
    recommendations.push("Start empiric broad-spectrum antibiotics within 1 hour");
    recommendations.push("Measure serum lactate");
    recommendations.push("Administer 30ml/kg crystalloid for hypotension");
  } else if (qsofa === 1 || (lactate && lactate.value > 2)) {
    sepsisRisk = "moderate";
    recommendations.push("Repeat qSOFA assessment in 1 hour");
    recommendations.push("Consider blood cultures");
    recommendations.push("Monitor for signs of organ dysfunction");
  } else {
    recommendations.push("Continue routine monitoring");
  }

  return {
    sepsisRisk,
    qsofaScore: qsofa,
    sofa_estimated: qsofa * 2, // Simplified estimation
    lactateLevel: lactate?.value,
    recommendations,
    hoursSinceLastAssessment: 0,
  };
}
