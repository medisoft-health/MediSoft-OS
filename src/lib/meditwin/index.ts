import "server-only";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ─────────────────────────────────────────────────────────────────────────────
// MediTwin — Patient Digital Twin
// Virtual simulation of patient physiology for treatment planning
// Predicts drug response, side effects, and outcomes before administration
// Enables Precision Medicine by modeling individual patient biology
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientBiologicalProfile {
  patientId: number;
  demographics: {
    age: number;
    gender: string;
    weight: number; // kg
    height: number; // cm
    bmi: number;
    ethnicity?: string;
  };
  genetics?: {
    cyp2d6?: string; // e.g., "poor_metabolizer", "extensive_metabolizer"
    cyp2c19?: string;
    cyp3a4?: string;
    hla_b5701?: boolean;
    vkorc1?: string;
    slco1b1?: string;
    pharmacogenomicProfile?: string;
  };
  organFunction: {
    renalFunction: {
      egfr: number; // mL/min/1.73m²
      creatinine: number;
      bun?: number;
      stage: "normal" | "mild" | "moderate" | "severe" | "esrd";
    };
    hepaticFunction: {
      alt: number;
      ast: number;
      bilirubin: number;
      albumin: number;
      childPughScore?: "A" | "B" | "C";
      meldScore?: number;
    };
    cardiacFunction: {
      ejectionFraction?: number;
      nyhaClass?: "I" | "II" | "III" | "IV";
      qtcInterval?: number;
    };
    pulmonaryFunction?: {
      fev1?: number;
      fvc?: number;
      fev1FvcRatio?: number;
    };
  };
  currentMedications: Array<{
    name: string;
    dose: string;
    frequency: string;
    route: string;
    startDate: string;
  }>;
  conditions: string[];
  allergies: string[];
  vitals: {
    bpSystolic: number;
    bpDiastolic: number;
    heartRate: number;
    temperature: number;
    spo2: number;
  };
  labResults: Array<{
    name: string;
    value: number;
    unit: string;
    date: string;
  }>;
}

export interface TreatmentSimulation {
  simulationId: string;
  patientId: number;
  proposedTreatment: {
    medication: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
  };
  prediction: {
    efficacyScore: number; // 0-100
    efficacyCategory: "excellent" | "good" | "moderate" | "poor" | "contraindicated";
    expectedOnsetDays: number;
    timeToSteadyState: string;
    peakEffect: string;
    durationOfEffect: string;
  };
  pharmacokinetics: {
    absorption: string;
    distribution: string;
    metabolism: string;
    elimination: string;
    halfLife: string;
    bioavailability: string;
    proteinBinding: string;
    volumeOfDistribution: string;
    adjustedDose?: string;
    doseAdjustmentReason?: string;
  };
  sideEffects: Array<{
    effect: string;
    probability: number; // 0-1
    severity: "mild" | "moderate" | "severe" | "life-threatening";
    onset: string;
    manageable: boolean;
    mitigation: string;
  }>;
  interactions: Array<{
    withMedication: string;
    type: "pharmacokinetic" | "pharmacodynamic";
    severity: "major" | "moderate" | "minor";
    mechanism: string;
    clinicalEffect: string;
    recommendation: string;
  }>;
  organImpact: {
    renal: { risk: "none" | "low" | "moderate" | "high"; detail: string };
    hepatic: { risk: "none" | "low" | "moderate" | "high"; detail: string };
    cardiac: { risk: "none" | "low" | "moderate" | "high"; detail: string };
    hematologic: { risk: "none" | "low" | "moderate" | "high"; detail: string };
  };
  alternatives: Array<{
    medication: string;
    dose: string;
    reason: string;
    efficacyComparison: string;
    safetyAdvantage: string;
  }>;
  monitoringPlan: Array<{
    parameter: string;
    frequency: string;
    targetRange: string;
    alertThreshold: string;
  }>;
  overallSafetyScore: number; // 0-100
  recommendationSummary: string;
  confidence: number;
  simulatedAt: string;
}

export interface MultiDrugSimulation {
  simulationId: string;
  patientId: number;
  regimen: Array<{
    medication: string;
    dose: string;
    route: string;
    frequency: string;
  }>;
  overallEfficacy: number;
  overallSafety: number;
  synergyScore: number;
  cumulativeSideEffects: Array<{
    effect: string;
    probability: number;
    contributingDrugs: string[];
  }>;
  interactionMatrix: Array<{
    drug1: string;
    drug2: string;
    interaction: string;
    severity: string;
  }>;
  optimizedRegimen?: {
    changes: Array<{
      original: string;
      suggested: string;
      reason: string;
    }>;
    expectedImprovement: string;
  };
}

// ─── Treatment Simulation ────────────────────────────────────────────────────

export async function simulateTreatment(
  profile: PatientBiologicalProfile,
  proposedTreatment: {
    medication: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
  }
): Promise<TreatmentSimulation> {
  const ai = getGeminiClient();

  if (!ai) {
    return generateRuleBasedSimulation(profile, proposedTreatment);
  }

  const systemPrompt = `You are MediTwin, an advanced Patient Digital Twin simulator. You model individual patient physiology to predict drug response, side effects, and clinical outcomes with high accuracy.

Your simulation considers:
1. Patient demographics (age, weight, BMI, ethnicity)
2. Pharmacogenomics (CYP450 enzymes, HLA alleles)
3. Organ function (renal, hepatic, cardiac)
4. Current medications (interactions)
5. Comorbidities
6. Pharmacokinetic/pharmacodynamic modeling
7. Population-based efficacy data adjusted for individual factors

You must be:
- Evidence-based (cite mechanisms)
- Conservative with safety predictions
- Specific with dose adjustments
- Clear about confidence levels

Respond ONLY with valid JSON.`;

  const prompt = `Simulate the following treatment on this patient's digital twin:

PATIENT BIOLOGICAL PROFILE:
- Age: ${profile.demographics.age}, Gender: ${profile.demographics.gender}
- Weight: ${profile.demographics.weight}kg, Height: ${profile.demographics.height}cm, BMI: ${profile.demographics.bmi}
${profile.demographics.ethnicity ? `- Ethnicity: ${profile.demographics.ethnicity}` : ""}

ORGAN FUNCTION:
- Renal: eGFR ${profile.organFunction.renalFunction.egfr} mL/min (${profile.organFunction.renalFunction.stage}), Cr: ${profile.organFunction.renalFunction.creatinine}
- Hepatic: ALT ${profile.organFunction.hepaticFunction.alt}, AST ${profile.organFunction.hepaticFunction.ast}, Bili ${profile.organFunction.hepaticFunction.bilirubin}, Alb ${profile.organFunction.hepaticFunction.albumin}${profile.organFunction.hepaticFunction.childPughScore ? `, Child-Pugh: ${profile.organFunction.hepaticFunction.childPughScore}` : ""}
- Cardiac: ${profile.organFunction.cardiacFunction.ejectionFraction ? `EF ${profile.organFunction.cardiacFunction.ejectionFraction}%` : "N/A"}${profile.organFunction.cardiacFunction.nyhaClass ? `, NYHA ${profile.organFunction.cardiacFunction.nyhaClass}` : ""}${profile.organFunction.cardiacFunction.qtcInterval ? `, QTc ${profile.organFunction.cardiacFunction.qtcInterval}ms` : ""}

${profile.genetics ? `PHARMACOGENOMICS:\n- CYP2D6: ${profile.genetics.cyp2d6 || "unknown"}\n- CYP2C19: ${profile.genetics.cyp2c19 || "unknown"}\n- CYP3A4: ${profile.genetics.cyp3a4 || "unknown"}${profile.genetics.hla_b5701 !== undefined ? `\n- HLA-B*5701: ${profile.genetics.hla_b5701 ? "POSITIVE" : "negative"}` : ""}` : "PHARMACOGENOMICS: Not available"}

CURRENT MEDICATIONS:
${profile.currentMedications.map((m) => `- ${m.name} ${m.dose} ${m.route} ${m.frequency}`).join("\n") || "None"}

CONDITIONS: ${profile.conditions.join(", ") || "None"}
ALLERGIES: ${profile.allergies.join(", ") || "NKDA"}

CURRENT VITALS:
- BP: ${profile.vitals.bpSystolic}/${profile.vitals.bpDiastolic}, HR: ${profile.vitals.heartRate}, Temp: ${profile.vitals.temperature}°C, SpO2: ${profile.vitals.spo2}%

RECENT LABS:
${profile.labResults.map((l) => `- ${l.name}: ${l.value} ${l.unit} (${l.date})`).join("\n") || "None available"}

PROPOSED TREATMENT:
- Medication: ${proposedTreatment.medication}
- Dose: ${proposedTreatment.dose}
- Route: ${proposedTreatment.route}
- Frequency: ${proposedTreatment.frequency}
- Duration: ${proposedTreatment.duration}

Simulate and respond with JSON:
{
  "prediction": {
    "efficacyScore": <0-100>,
    "efficacyCategory": "excellent|good|moderate|poor|contraindicated",
    "expectedOnsetDays": <number>,
    "timeToSteadyState": "<timeframe>",
    "peakEffect": "<description>",
    "durationOfEffect": "<timeframe>"
  },
  "pharmacokinetics": {
    "absorption": "<description>",
    "distribution": "<description>",
    "metabolism": "<CYP enzymes involved>",
    "elimination": "<renal/hepatic/both>",
    "halfLife": "<hours>",
    "bioavailability": "<%>",
    "proteinBinding": "<%>",
    "volumeOfDistribution": "<L/kg>",
    "adjustedDose": "<if needed>",
    "doseAdjustmentReason": "<if needed>"
  },
  "sideEffects": [{"effect": "<name>", "probability": <0-1>, "severity": "mild|moderate|severe|life-threatening", "onset": "<when>", "manageable": <boolean>, "mitigation": "<how>"}],
  "interactions": [{"withMedication": "<drug>", "type": "pharmacokinetic|pharmacodynamic", "severity": "major|moderate|minor", "mechanism": "<how>", "clinicalEffect": "<what happens>", "recommendation": "<action>"}],
  "organImpact": {
    "renal": {"risk": "none|low|moderate|high", "detail": "<explanation>"},
    "hepatic": {"risk": "none|low|moderate|high", "detail": "<explanation>"},
    "cardiac": {"risk": "none|low|moderate|high", "detail": "<explanation>"},
    "hematologic": {"risk": "none|low|moderate|high", "detail": "<explanation>"}
  },
  "alternatives": [{"medication": "<name>", "dose": "<dose>", "reason": "<why better>", "efficacyComparison": "<vs proposed>", "safetyAdvantage": "<benefit>"}],
  "monitoringPlan": [{"parameter": "<what to monitor>", "frequency": "<how often>", "targetRange": "<normal>", "alertThreshold": "<when to act>"}],
  "overallSafetyScore": <0-100>,
  "recommendationSummary": "<1-2 sentence clinical recommendation>",
  "confidence": <0-1>
}`;

  try {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.2, systemInstruction: systemPrompt },
    });

    const text = result.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateRuleBasedSimulation(profile, proposedTreatment);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      simulationId: `twin-${profile.patientId}-${Date.now()}`,
      patientId: profile.patientId,
      proposedTreatment,
      ...parsed,
      simulatedAt: new Date().toISOString(),
    };
  } catch {
    return generateRuleBasedSimulation(profile, proposedTreatment);
  }
}

// ─── Multi-Drug Regimen Simulation ───────────────────────────────────────────

export async function simulateRegimen(
  profile: PatientBiologicalProfile,
  regimen: Array<{ medication: string; dose: string; route: string; frequency: string }>
): Promise<MultiDrugSimulation> {
  const ai = getGeminiClient();

  if (!ai) {
    return {
      simulationId: `regimen-${profile.patientId}-${Date.now()}`,
      patientId: profile.patientId,
      regimen,
      overallEfficacy: 70,
      overallSafety: 75,
      synergyScore: 60,
      cumulativeSideEffects: [],
      interactionMatrix: [],
    };
  }

  const prompt = `Simulate this multi-drug regimen on the patient digital twin:

PATIENT: Age ${profile.demographics.age}, ${profile.demographics.gender}, ${profile.demographics.weight}kg
Renal: eGFR ${profile.organFunction.renalFunction.egfr}, Hepatic: ALT ${profile.organFunction.hepaticFunction.alt}/AST ${profile.organFunction.hepaticFunction.ast}
Conditions: ${profile.conditions.join(", ")}

PROPOSED REGIMEN:
${regimen.map((r, i) => `${i + 1}. ${r.medication} ${r.dose} ${r.route} ${r.frequency}`).join("\n")}

CURRENT MEDICATIONS:
${profile.currentMedications.map((m) => `- ${m.name} ${m.dose}`).join("\n") || "None"}

Analyze the full regimen for synergies, cumulative toxicity, and interactions. Respond with JSON:
{
  "overallEfficacy": <0-100>,
  "overallSafety": <0-100>,
  "synergyScore": <0-100>,
  "cumulativeSideEffects": [{"effect": "<name>", "probability": <0-1>, "contributingDrugs": ["<drug1>", "<drug2>"]}],
  "interactionMatrix": [{"drug1": "<name>", "drug2": "<name>", "interaction": "<description>", "severity": "major|moderate|minor"}],
  "optimizedRegimen": {
    "changes": [{"original": "<current>", "suggested": "<better>", "reason": "<why>"}],
    "expectedImprovement": "<description>"
  }
}`;

  try {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.2 },
    });

    const text = result.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      simulationId: `regimen-${profile.patientId}-${Date.now()}`,
      patientId: profile.patientId,
      regimen,
      ...parsed,
    };
  } catch {
    return {
      simulationId: `regimen-${profile.patientId}-${Date.now()}`,
      patientId: profile.patientId,
      regimen,
      overallEfficacy: 70,
      overallSafety: 75,
      synergyScore: 60,
      cumulativeSideEffects: [],
      interactionMatrix: [],
    };
  }
}

// ─── Disease Progression Simulation ──────────────────────────────────────────

export async function simulateDiseaseProgression(
  profile: PatientBiologicalProfile,
  condition: string,
  timeframeMonths: number
): Promise<{
  progressionTimeline: Array<{
    month: number;
    expectedState: string;
    riskEvents: string[];
    biomarkerProjections: Record<string, number>;
  }>;
  withoutTreatment: { outcome: string; probability: number };
  withCurrentTreatment: { outcome: string; probability: number };
  recommendations: string[];
}> {
  const ai = getGeminiClient();

  if (!ai) {
    return {
      progressionTimeline: [{ month: timeframeMonths, expectedState: "Requires AI for simulation", riskEvents: [], biomarkerProjections: {} }],
      withoutTreatment: { outcome: "Disease progression likely", probability: 0.7 },
      withCurrentTreatment: { outcome: "Stabilization expected", probability: 0.6 },
      recommendations: ["Continue current management", "Regular follow-up"],
    };
  }

  const prompt = `Simulate disease progression for this patient:

PATIENT: Age ${profile.demographics.age}, ${profile.demographics.gender}
CONDITION: ${condition}
TIMEFRAME: ${timeframeMonths} months
CURRENT MEDICATIONS: ${profile.currentMedications.map((m) => m.name).join(", ") || "None"}
COMORBIDITIES: ${profile.conditions.join(", ")}
RECENT LABS: ${profile.labResults.map((l) => `${l.name}: ${l.value} ${l.unit}`).join(", ")}

Model the disease progression with and without current treatment over ${timeframeMonths} months.

Respond with JSON:
{
  "progressionTimeline": [{"month": <n>, "expectedState": "<description>", "riskEvents": ["<event>"], "biomarkerProjections": {"<marker>": <value>}}],
  "withoutTreatment": {"outcome": "<description>", "probability": <0-1>},
  "withCurrentTreatment": {"outcome": "<description>", "probability": <0-1>},
  "recommendations": ["<action 1>", "<action 2>"]
}`;

  try {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.3 },
    });

    const text = result.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      progressionTimeline: [],
      withoutTreatment: { outcome: "Unknown", probability: 0 },
      withCurrentTreatment: { outcome: "Unknown", probability: 0 },
      recommendations: [],
    };
  }
}

// ─── Rule-Based Fallback ─────────────────────────────────────────────────────

function generateRuleBasedSimulation(
  profile: PatientBiologicalProfile,
  proposedTreatment: { medication: string; dose: string; route: string; frequency: string; duration: string }
): TreatmentSimulation {
  const needsRenalAdjustment = profile.organFunction.renalFunction.egfr < 60;
  const needsHepaticAdjustment = profile.organFunction.hepaticFunction.childPughScore === "B" || profile.organFunction.hepaticFunction.childPughScore === "C";

  return {
    simulationId: `twin-${profile.patientId}-${Date.now()}`,
    patientId: profile.patientId,
    proposedTreatment,
    prediction: {
      efficacyScore: 70,
      efficacyCategory: "good",
      expectedOnsetDays: 7,
      timeToSteadyState: "5 half-lives",
      peakEffect: "2-4 weeks",
      durationOfEffect: proposedTreatment.duration,
    },
    pharmacokinetics: {
      absorption: proposedTreatment.route === "oral" ? "GI absorption" : "Direct systemic",
      distribution: "Standard distribution",
      metabolism: "Hepatic (CYP450)",
      elimination: "Renal/Hepatic",
      halfLife: "Variable",
      bioavailability: proposedTreatment.route === "IV" ? "100%" : "Variable",
      proteinBinding: "Variable",
      volumeOfDistribution: "Variable",
      adjustedDose: needsRenalAdjustment ? "Dose reduction recommended" : undefined,
      doseAdjustmentReason: needsRenalAdjustment ? `eGFR ${profile.organFunction.renalFunction.egfr} mL/min` : undefined,
    },
    sideEffects: [],
    interactions: [],
    organImpact: {
      renal: { risk: needsRenalAdjustment ? "moderate" : "low", detail: `eGFR: ${profile.organFunction.renalFunction.egfr}` },
      hepatic: { risk: needsHepaticAdjustment ? "moderate" : "low", detail: `ALT: ${profile.organFunction.hepaticFunction.alt}` },
      cardiac: { risk: "low", detail: "Standard cardiac risk" },
      hematologic: { risk: "low", detail: "Standard hematologic risk" },
    },
    alternatives: [],
    monitoringPlan: [
      { parameter: "Renal function", frequency: "Monthly", targetRange: "eGFR >60", alertThreshold: "eGFR <45" },
      { parameter: "Hepatic function", frequency: "Monthly", targetRange: "ALT <40", alertThreshold: "ALT >120" },
    ],
    overallSafetyScore: 75,
    recommendationSummary: "Treatment appears appropriate. AI simulation requires Gemini API for detailed analysis.",
    confidence: 0.5,
    simulatedAt: new Date().toISOString(),
  };
}
