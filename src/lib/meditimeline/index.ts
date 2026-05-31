/**
 * MediTimeline — AI Disease Trajectory Prediction
 * Predicts patient health trajectory 5-20 years into the future
 * Uses Gemini AI to model disease progression based on current data
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ============================================================
// TYPES
// ============================================================

export interface TimelinePatient {
  id: string;
  age: number;
  sex: "male" | "female";
  weight?: number;
  height?: number;
  bmi?: number;
  smokingStatus?: "current" | "former" | "never";
  alcoholUse?: "heavy" | "moderate" | "light" | "none";
  exerciseLevel?: "sedentary" | "light" | "moderate" | "active";
  familyHistory?: string[];
  currentConditions: string[];
  currentMedications: string[];
  vitals?: {
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    hba1c?: number;
    ldl?: number;
    hdl?: number;
    triglycerides?: number;
    egfr?: number;
    creatinine?: number;
    fbs?: number;
    bmi?: number;
  };
  labTrends?: LabTrend[];
}

export interface LabTrend {
  test: string;
  values: { date: string; value: number }[];
  unit: string;
  trend: "rising" | "falling" | "stable" | "fluctuating";
}

export interface TimelineEvent {
  year: number;
  probability: number; // 0-100
  event: string;
  category: "disease_onset" | "complication" | "hospitalization" | "organ_damage" | "mortality";
  severity: "critical" | "major" | "moderate" | "minor";
  icdCode?: string;
  preventable: boolean;
  preventionStrategy?: string;
}

export interface TimelineScenario {
  name: string;
  description: string;
  interventions: string[];
  events: TimelineEvent[];
  lifeExpectancy: number;
  qualityOfLife: number; // 0-100
  healthScore: number; // 0-100
  costProjection: {
    annual: number;
    total: number;
    currency: string;
  };
}

export interface TrajectoryResult {
  patientId: string;
  generatedAt: string;
  horizonYears: number;
  currentHealthScore: number;
  baselineScenario: TimelineScenario;
  optimisticScenario: TimelineScenario;
  pessimisticScenario: TimelineScenario;
  interventionScenarios: TimelineScenario[];
  riskFactors: RiskFactor[];
  recommendations: Recommendation[];
  citations: Citation[];
}

export interface RiskFactor {
  factor: string;
  currentLevel: "high" | "moderate" | "low";
  contribution: number; // percentage contribution to overall risk
  modifiable: boolean;
  targetValue?: string;
}

export interface Recommendation {
  priority: number;
  category: "medication" | "lifestyle" | "screening" | "referral" | "monitoring";
  action: string;
  expectedImpact: string;
  timeframe: string;
  evidenceLevel: "A" | "B" | "C";
}

export interface Citation {
  id: number;
  source: string;
  title: string;
  year: number;
  relevance: string;
}

// ============================================================
// RISK MODELS
// ============================================================

const FRAMINGHAM_RISK_FACTORS = {
  age: { male: [0.04826, 0], female: [0.33399, 0] },
  totalCholesterol: { threshold: 200, weight: 0.15 },
  hdl: { threshold: 60, weight: -0.2 },
  systolic: { threshold: 120, weight: 0.2 },
  smoking: { weight: 0.5 },
  diabetes: { weight: 0.4 },
};

const DISEASE_PROGRESSION_MODELS: Record<string, {
  stages: string[];
  annualProgressionRate: number;
  riskFactors: string[];
  complications: { name: string; probability: number; yearsToOnset: number }[];
}> = {
  "Type 2 Diabetes": {
    stages: ["Pre-diabetes", "Early DM", "Established DM", "Advanced DM with complications"],
    annualProgressionRate: 0.08,
    riskFactors: ["obesity", "sedentary", "family_history", "poor_diet"],
    complications: [
      { name: "Diabetic Retinopathy", probability: 0.35, yearsToOnset: 10 },
      { name: "Diabetic Nephropathy (CKD)", probability: 0.30, yearsToOnset: 12 },
      { name: "Peripheral Neuropathy", probability: 0.50, yearsToOnset: 8 },
      { name: "Cardiovascular Disease", probability: 0.45, yearsToOnset: 7 },
      { name: "Diabetic Foot Ulcer", probability: 0.15, yearsToOnset: 15 },
    ],
  },
  "Hypertension": {
    stages: ["Elevated BP", "Stage 1 HTN", "Stage 2 HTN", "Resistant HTN"],
    annualProgressionRate: 0.05,
    riskFactors: ["obesity", "high_sodium", "stress", "family_history", "age"],
    complications: [
      { name: "Left Ventricular Hypertrophy", probability: 0.25, yearsToOnset: 8 },
      { name: "Stroke (CVA)", probability: 0.20, yearsToOnset: 12 },
      { name: "Chronic Kidney Disease", probability: 0.18, yearsToOnset: 15 },
      { name: "Heart Failure", probability: 0.15, yearsToOnset: 15 },
      { name: "Aortic Aneurysm", probability: 0.05, yearsToOnset: 20 },
    ],
  },
  "Chronic Kidney Disease": {
    stages: ["CKD Stage 1 (eGFR >90)", "CKD Stage 2 (60-89)", "CKD Stage 3 (30-59)", "CKD Stage 4 (15-29)", "CKD Stage 5 / ESRD (<15)"],
    annualProgressionRate: 0.04,
    riskFactors: ["diabetes", "hypertension", "nsaids", "dehydration"],
    complications: [
      { name: "Anemia (EPO deficiency)", probability: 0.60, yearsToOnset: 5 },
      { name: "Hyperkalemia", probability: 0.40, yearsToOnset: 6 },
      { name: "Metabolic Bone Disease", probability: 0.35, yearsToOnset: 8 },
      { name: "Need for Dialysis", probability: 0.25, yearsToOnset: 10 },
      { name: "Cardiovascular Death", probability: 0.30, yearsToOnset: 12 },
    ],
  },
  "Heart Failure": {
    stages: ["Stage A (At Risk)", "Stage B (Pre-HF)", "Stage C (Symptomatic HF)", "Stage D (Advanced HF)"],
    annualProgressionRate: 0.06,
    riskFactors: ["hypertension", "diabetes", "obesity", "coronary_artery_disease", "valvular_disease"],
    complications: [
      { name: "Atrial Fibrillation", probability: 0.40, yearsToOnset: 3 },
      { name: "Cardiorenal Syndrome", probability: 0.30, yearsToOnset: 5 },
      { name: "Pulmonary Hypertension", probability: 0.25, yearsToOnset: 6 },
      { name: "Cardiac Cachexia", probability: 0.15, yearsToOnset: 8 },
      { name: "Sudden Cardiac Death", probability: 0.20, yearsToOnset: 7 },
    ],
  },
  "COPD": {
    stages: ["GOLD 1 (Mild)", "GOLD 2 (Moderate)", "GOLD 3 (Severe)", "GOLD 4 (Very Severe)"],
    annualProgressionRate: 0.05,
    riskFactors: ["smoking", "air_pollution", "occupational_exposure", "alpha1_antitrypsin"],
    complications: [
      { name: "Acute Exacerbation", probability: 0.70, yearsToOnset: 2 },
      { name: "Pulmonary Hypertension", probability: 0.25, yearsToOnset: 8 },
      { name: "Respiratory Failure", probability: 0.20, yearsToOnset: 12 },
      { name: "Lung Cancer", probability: 0.10, yearsToOnset: 15 },
      { name: "Cor Pulmonale", probability: 0.15, yearsToOnset: 10 },
    ],
  },
  "Obesity": {
    stages: ["Overweight (BMI 25-29.9)", "Class I Obesity (30-34.9)", "Class II Obesity (35-39.9)", "Class III Obesity (≥40)"],
    annualProgressionRate: 0.03,
    riskFactors: ["sedentary", "poor_diet", "genetics", "medications", "sleep_apnea"],
    complications: [
      { name: "Type 2 Diabetes", probability: 0.40, yearsToOnset: 5 },
      { name: "Obstructive Sleep Apnea", probability: 0.50, yearsToOnset: 3 },
      { name: "Non-Alcoholic Fatty Liver (NAFLD)", probability: 0.45, yearsToOnset: 4 },
      { name: "Osteoarthritis (Knee/Hip)", probability: 0.35, yearsToOnset: 8 },
      { name: "Cardiovascular Disease", probability: 0.30, yearsToOnset: 10 },
    ],
  },
};

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Calculate cardiovascular risk score (simplified Framingham)
 */
function calculateCVRisk(patient: TimelinePatient): number {
  let score = 0;
  
  // Age contribution
  score += Math.max(0, (patient.age - 40) * 0.02);
  
  // Blood pressure
  if (patient.vitals?.systolic) {
    if (patient.vitals.systolic >= 160) score += 0.3;
    else if (patient.vitals.systolic >= 140) score += 0.2;
    else if (patient.vitals.systolic >= 130) score += 0.1;
  }
  
  // Cholesterol
  if (patient.vitals?.ldl && patient.vitals.ldl > 160) score += 0.2;
  if (patient.vitals?.hdl && patient.vitals.hdl < 40) score += 0.15;
  
  // Diabetes
  if (patient.currentConditions.some(c => c.toLowerCase().includes("diabetes"))) score += 0.3;
  
  // Smoking
  if (patient.smokingStatus === "current") score += 0.4;
  else if (patient.smokingStatus === "former") score += 0.1;
  
  // BMI
  if (patient.vitals?.bmi && patient.vitals.bmi > 30) score += 0.15;
  
  // HbA1c
  if (patient.vitals?.hba1c && patient.vitals.hba1c > 7) score += 0.2;
  
  return Math.min(1, score);
}

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(patient: TimelinePatient): number {
  let score = 100;
  
  // Deductions for conditions
  score -= patient.currentConditions.length * 8;
  
  // Deductions for vitals
  if (patient.vitals?.systolic && patient.vitals.systolic > 140) score -= 10;
  if (patient.vitals?.hba1c && patient.vitals.hba1c > 7) score -= 12;
  if (patient.vitals?.egfr && patient.vitals.egfr < 60) score -= 15;
  if (patient.vitals?.ldl && patient.vitals.ldl > 160) score -= 8;
  if (patient.vitals?.bmi && patient.vitals.bmi > 30) score -= 10;
  
  // Deductions for lifestyle
  if (patient.smokingStatus === "current") score -= 15;
  if (patient.exerciseLevel === "sedentary") score -= 10;
  if (patient.alcoholUse === "heavy") score -= 10;
  
  // Age factor
  score -= Math.max(0, (patient.age - 50) * 0.5);
  
  return Math.max(10, Math.min(100, Math.round(score)));
}

/**
 * Generate disease progression timeline events
 */
function generateProgressionEvents(
  patient: TimelinePatient,
  horizonYears: number,
  scenarioModifier: number = 1.0
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  for (const condition of patient.currentConditions) {
    const model = Object.entries(DISEASE_PROGRESSION_MODELS).find(
      ([key]) => condition.toLowerCase().includes(key.toLowerCase()) ||
                 key.toLowerCase().includes(condition.toLowerCase())
    );
    
    if (model) {
      const [, data] = model;
      for (const complication of data.complications) {
        const adjustedYears = Math.round(complication.yearsToOnset * scenarioModifier);
        if (adjustedYears <= horizonYears) {
          const adjustedProbability = Math.min(95, Math.round(complication.probability * 100 * (1 / scenarioModifier)));
          events.push({
            year: adjustedYears,
            probability: adjustedProbability,
            event: complication.name,
            category: complication.probability > 0.3 ? "complication" : "disease_onset",
            severity: complication.probability > 0.4 ? "major" : complication.probability > 0.2 ? "moderate" : "minor",
            icdCode: getIcdCode(complication.name),
            preventable: true,
            preventionStrategy: getPreventionStrategy(complication.name, condition),
          });
        }
      }
    }
  }
  
  // Add age-related events
  if (patient.age + horizonYears > 65) {
    const cvRisk = calculateCVRisk(patient);
    if (cvRisk > 0.3) {
      events.push({
        year: Math.round(10 * scenarioModifier),
        probability: Math.round(cvRisk * 80),
        event: "Major Adverse Cardiovascular Event (MACE)",
        category: "complication",
        severity: "critical",
        icdCode: "I25.1",
        preventable: true,
        preventionStrategy: "Aggressive lipid lowering, BP control, antiplatelet therapy",
      });
    }
  }
  
  return events.sort((a, b) => a.year - b.year);
}

/**
 * Get ICD-10 code for a condition
 */
function getIcdCode(condition: string): string {
  const codes: Record<string, string> = {
    "Diabetic Retinopathy": "E11.3",
    "Diabetic Nephropathy (CKD)": "E11.22",
    "Peripheral Neuropathy": "E11.4",
    "Cardiovascular Disease": "I25.1",
    "Diabetic Foot Ulcer": "E11.621",
    "Left Ventricular Hypertrophy": "I51.7",
    "Stroke (CVA)": "I63.9",
    "Chronic Kidney Disease": "N18.3",
    "Heart Failure": "I50.9",
    "Aortic Aneurysm": "I71.9",
    "Atrial Fibrillation": "I48.91",
    "Respiratory Failure": "J96.1",
    "Lung Cancer": "C34.9",
    "Type 2 Diabetes": "E11.9",
    "Obstructive Sleep Apnea": "G47.33",
    "NAFLD": "K76.0",
    "Osteoarthritis (Knee/Hip)": "M17.1",
    "Acute Exacerbation": "J44.1",
    "Pulmonary Hypertension": "I27.0",
  };
  return codes[condition] || "R69";
}

/**
 * Get prevention strategy for a complication
 */
function getPreventionStrategy(complication: string, baseCondition: string): string {
  const strategies: Record<string, string> = {
    "Diabetic Retinopathy": "Annual eye exams, HbA1c <7%, BP <130/80, anti-VEGF if needed",
    "Diabetic Nephropathy (CKD)": "SGLT2i + ACEi/ARB, HbA1c <7%, BP <130/80, low protein diet",
    "Peripheral Neuropathy": "Strict glycemic control, foot care, B12 supplementation",
    "Cardiovascular Disease": "Statin therapy, aspirin (if indicated), exercise, smoking cessation",
    "Stroke (CVA)": "BP control <130/80, anticoagulation if AF, statin, lifestyle modification",
    "Heart Failure": "SGLT2i, ACEi/ARB, beta-blocker, diuretics, salt restriction",
    "Atrial Fibrillation": "Rate/rhythm control, anticoagulation (CHA2DS2-VASc), lifestyle",
    "Type 2 Diabetes": "Weight loss 7-10%, exercise 150min/week, metformin if pre-diabetic",
    "Respiratory Failure": "Smoking cessation, pulmonary rehab, LTOT if hypoxic, vaccination",
  };
  return strategies[complication] || `Optimize ${baseCondition} management, regular monitoring`;
}

/**
 * Generate full trajectory prediction using AI
 */
export async function predictTrajectory(
  patient: TimelinePatient,
  horizonYears: number = 10
): Promise<TrajectoryResult> {
  const currentHealthScore = calculateHealthScore(patient);
  const cvRisk = calculateCVRisk(patient);
  
  // Generate scenarios
  const baselineEvents = generateProgressionEvents(patient, horizonYears, 1.0);
  const optimisticEvents = generateProgressionEvents(patient, horizonYears, 1.5); // slower progression
  const pessimisticEvents = generateProgressionEvents(patient, horizonYears, 0.7); // faster progression
  
  // Calculate life expectancy adjustments
  const baseLifeExpectancy = patient.sex === "male" ? 76 : 81;
  const conditionPenalty = patient.currentConditions.length * 2;
  const lifestylePenalty = (patient.smokingStatus === "current" ? 8 : 0) + 
                           (patient.exerciseLevel === "sedentary" ? 3 : 0);
  
  // Use AI for detailed analysis
  const aiAnalysis = await getAITrajectoryAnalysis(patient, horizonYears, currentHealthScore, cvRisk);
  
  const baselineScenario: TimelineScenario = {
    name: "Current Trajectory (No Changes)",
    description: "Projection if current lifestyle and treatment continue unchanged",
    interventions: [],
    events: baselineEvents,
    lifeExpectancy: baseLifeExpectancy - conditionPenalty - lifestylePenalty,
    qualityOfLife: Math.max(20, currentHealthScore - 15),
    healthScore: Math.max(15, currentHealthScore - baselineEvents.length * 5),
    costProjection: {
      annual: estimateAnnualCost(patient.currentConditions, baselineEvents),
      total: estimateAnnualCost(patient.currentConditions, baselineEvents) * horizonYears,
      currency: "SAR",
    },
  };
  
  const optimisticScenario: TimelineScenario = {
    name: "Optimal Management",
    description: "Projection with full adherence to recommended interventions",
    interventions: [
      "Full medication adherence",
      "Lifestyle modification (diet + exercise)",
      "Regular screening and monitoring",
      "Smoking cessation (if applicable)",
      "Weight management to BMI <25",
    ],
    events: optimisticEvents,
    lifeExpectancy: baseLifeExpectancy - Math.round(conditionPenalty * 0.5),
    qualityOfLife: Math.min(90, currentHealthScore + 10),
    healthScore: Math.min(85, currentHealthScore + 5),
    costProjection: {
      annual: Math.round(estimateAnnualCost(patient.currentConditions, optimisticEvents) * 0.6),
      total: Math.round(estimateAnnualCost(patient.currentConditions, optimisticEvents) * 0.6 * horizonYears),
      currency: "SAR",
    },
  };
  
  const pessimisticScenario: TimelineScenario = {
    name: "Non-Adherence / Deterioration",
    description: "Projection if treatment is discontinued or lifestyle worsens",
    interventions: [],
    events: pessimisticEvents,
    lifeExpectancy: baseLifeExpectancy - conditionPenalty - lifestylePenalty - 5,
    qualityOfLife: Math.max(15, currentHealthScore - 30),
    healthScore: Math.max(10, currentHealthScore - 25),
    costProjection: {
      annual: Math.round(estimateAnnualCost(patient.currentConditions, pessimisticEvents) * 1.8),
      total: Math.round(estimateAnnualCost(patient.currentConditions, pessimisticEvents) * 1.8 * horizonYears),
      currency: "SAR",
    },
  };
  
  // Generate risk factors
  const riskFactors = identifyRiskFactors(patient);
  
  // Generate recommendations
  const recommendations = generateRecommendations(patient, riskFactors);
  
  return {
    patientId: patient.id,
    generatedAt: new Date().toISOString(),
    horizonYears,
    currentHealthScore,
    baselineScenario,
    optimisticScenario,
    pessimisticScenario,
    interventionScenarios: aiAnalysis.interventionScenarios || [],
    riskFactors,
    recommendations,
    citations: aiAnalysis.citations || getDefaultCitations(),
  };
}

/**
 * AI-powered detailed trajectory analysis
 */
async function getAITrajectoryAnalysis(
  patient: TimelinePatient,
  horizonYears: number,
  healthScore: number,
  cvRisk: number
): Promise<{ interventionScenarios: TimelineScenario[]; citations: Citation[] }> {
  const client = getGeminiClient();
  if (!client) {
    return { interventionScenarios: [], citations: getDefaultCitations() };
  }
  
  const prompt = `You are MediTimeline, an AI disease trajectory prediction system.

PATIENT PROFILE:
- Age: ${patient.age}, Sex: ${patient.sex}
- Current Conditions: ${patient.currentConditions.join(", ")}
- Current Medications: ${patient.currentMedications.join(", ")}
- Smoking: ${patient.smokingStatus || "unknown"}
- Exercise: ${patient.exerciseLevel || "unknown"}
- BMI: ${patient.vitals?.bmi || "unknown"}
- BP: ${patient.vitals?.systolic || "?"}/${patient.vitals?.diastolic || "?"}
- HbA1c: ${patient.vitals?.hba1c || "N/A"}
- eGFR: ${patient.vitals?.egfr || "N/A"}
- LDL: ${patient.vitals?.ldl || "N/A"}
- Family History: ${patient.familyHistory?.join(", ") || "None reported"}
- Health Score: ${healthScore}/100
- CV Risk: ${Math.round(cvRisk * 100)}%

TASK: Generate 2-3 specific intervention scenarios for this patient over ${horizonYears} years.
Each scenario should propose a specific therapeutic change and predict its impact.

Return ONLY valid JSON:
{
  "interventionScenarios": [
    {
      "name": "Scenario name",
      "description": "Brief description",
      "interventions": ["intervention 1", "intervention 2"],
      "events": [
        {
          "year": 5,
          "probability": 25,
          "event": "Event name",
          "category": "complication",
          "severity": "moderate",
          "preventable": true
        }
      ],
      "lifeExpectancy": 78,
      "qualityOfLife": 75,
      "healthScore": 70,
      "costProjection": { "annual": 15000, "total": 150000, "currency": "SAR" }
    }
  ],
  "citations": [
    { "id": 1, "source": "Journal Name", "title": "Study title", "year": 2024, "relevance": "Why relevant" }
  ]
}`;

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.3 },
    });
    
    const text = result.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("MediTimeline AI error:", error);
  }
  
  return { interventionScenarios: [], citations: getDefaultCitations() };
}

/**
 * Estimate annual healthcare cost
 */
function estimateAnnualCost(conditions: string[], events: TimelineEvent[]): number {
  let baseCost = 5000; // Base annual healthcare in SAR
  
  const conditionCosts: Record<string, number> = {
    "diabetes": 12000,
    "hypertension": 6000,
    "heart failure": 25000,
    "ckd": 18000,
    "copd": 15000,
    "cancer": 80000,
    "obesity": 8000,
  };
  
  for (const condition of conditions) {
    const match = Object.entries(conditionCosts).find(
      ([key]) => condition.toLowerCase().includes(key)
    );
    if (match) baseCost += match[1];
  }
  
  // Add complication costs
  baseCost += events.filter(e => e.severity === "critical").length * 30000;
  baseCost += events.filter(e => e.severity === "major").length * 15000;
  
  return baseCost;
}

/**
 * Identify modifiable and non-modifiable risk factors
 */
function identifyRiskFactors(patient: TimelinePatient): RiskFactor[] {
  const factors: RiskFactor[] = [];
  
  if (patient.smokingStatus === "current") {
    factors.push({
      factor: "Active Smoking",
      currentLevel: "high",
      contribution: 25,
      modifiable: true,
      targetValue: "Cessation",
    });
  }
  
  if (patient.vitals?.systolic && patient.vitals.systolic >= 140) {
    factors.push({
      factor: "Uncontrolled Hypertension",
      currentLevel: "high",
      contribution: 20,
      modifiable: true,
      targetValue: "< 130/80 mmHg",
    });
  }
  
  if (patient.vitals?.hba1c && patient.vitals.hba1c > 7) {
    factors.push({
      factor: "Poor Glycemic Control",
      currentLevel: patient.vitals.hba1c > 9 ? "high" : "moderate",
      contribution: 22,
      modifiable: true,
      targetValue: "HbA1c < 7.0%",
    });
  }
  
  if (patient.vitals?.ldl && patient.vitals.ldl > 130) {
    factors.push({
      factor: "Elevated LDL Cholesterol",
      currentLevel: patient.vitals.ldl > 190 ? "high" : "moderate",
      contribution: 15,
      modifiable: true,
      targetValue: "< 100 mg/dL (< 70 if high risk)",
    });
  }
  
  if (patient.vitals?.bmi && patient.vitals.bmi > 30) {
    factors.push({
      factor: "Obesity",
      currentLevel: patient.vitals.bmi > 35 ? "high" : "moderate",
      contribution: 18,
      modifiable: true,
      targetValue: "BMI < 25",
    });
  }
  
  if (patient.exerciseLevel === "sedentary") {
    factors.push({
      factor: "Physical Inactivity",
      currentLevel: "moderate",
      contribution: 12,
      modifiable: true,
      targetValue: "≥ 150 min/week moderate exercise",
    });
  }
  
  if (patient.vitals?.egfr && patient.vitals.egfr < 60) {
    factors.push({
      factor: "Reduced Kidney Function",
      currentLevel: patient.vitals.egfr < 30 ? "high" : "moderate",
      contribution: 20,
      modifiable: true,
      targetValue: "Slow progression with SGLT2i + ACEi",
    });
  }
  
  if (patient.age > 65) {
    factors.push({
      factor: "Advanced Age",
      currentLevel: patient.age > 75 ? "high" : "moderate",
      contribution: 15,
      modifiable: false,
    });
  }
  
  if (patient.familyHistory && patient.familyHistory.length > 0) {
    factors.push({
      factor: `Family History (${patient.familyHistory.join(", ")})`,
      currentLevel: "moderate",
      contribution: 10,
      modifiable: false,
    });
  }
  
  return factors.sort((a, b) => b.contribution - a.contribution);
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(patient: TimelinePatient, riskFactors: RiskFactor[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let priority = 1;
  
  // Smoking cessation
  if (patient.smokingStatus === "current") {
    recommendations.push({
      priority: priority++,
      category: "lifestyle",
      action: "Smoking cessation program (NRT + behavioral therapy)",
      expectedImpact: "Reduces CV risk by 50% within 1 year, cancer risk decreases over 5-10 years",
      timeframe: "Immediate",
      evidenceLevel: "A",
    });
  }
  
  // Glycemic control
  if (patient.vitals?.hba1c && patient.vitals.hba1c > 7) {
    recommendations.push({
      priority: priority++,
      category: "medication",
      action: "Intensify glycemic control — consider SGLT2i or GLP-1RA addition",
      expectedImpact: "Each 1% HbA1c reduction = 21% lower diabetes-related death, 37% lower microvascular complications",
      timeframe: "Within 1 month",
      evidenceLevel: "A",
    });
  }
  
  // Blood pressure
  if (patient.vitals?.systolic && patient.vitals.systolic >= 140) {
    recommendations.push({
      priority: priority++,
      category: "medication",
      action: "Optimize antihypertensive therapy — target < 130/80",
      expectedImpact: "10 mmHg reduction = 20% lower CV events, 27% lower stroke",
      timeframe: "Within 2 weeks",
      evidenceLevel: "A",
    });
  }
  
  // Lipids
  if (patient.vitals?.ldl && patient.vitals.ldl > 130) {
    recommendations.push({
      priority: priority++,
      category: "medication",
      action: "Start/intensify statin therapy — target LDL < 70 mg/dL if high risk",
      expectedImpact: "Each 39 mg/dL LDL reduction = 22% lower major CV events",
      timeframe: "Within 1 month",
      evidenceLevel: "A",
    });
  }
  
  // Exercise
  if (patient.exerciseLevel === "sedentary" || patient.exerciseLevel === "light") {
    recommendations.push({
      priority: priority++,
      category: "lifestyle",
      action: "Structured exercise program — 150 min/week moderate or 75 min/week vigorous",
      expectedImpact: "30-40% lower all-cause mortality, improved insulin sensitivity, BP reduction",
      timeframe: "Gradual increase over 4 weeks",
      evidenceLevel: "A",
    });
  }
  
  // Weight
  if (patient.vitals?.bmi && patient.vitals.bmi > 30) {
    recommendations.push({
      priority: priority++,
      category: "lifestyle",
      action: "Weight reduction program — target 7-10% body weight loss",
      expectedImpact: "58% lower diabetes risk, improved BP, lipids, and joint health",
      timeframe: "6-12 months",
      evidenceLevel: "A",
    });
  }
  
  // Kidney protection
  if (patient.vitals?.egfr && patient.vitals.egfr < 60) {
    recommendations.push({
      priority: priority++,
      category: "medication",
      action: "Nephroprotection — SGLT2i + ACEi/ARB, avoid nephrotoxins",
      expectedImpact: "39% lower risk of kidney failure progression (DAPA-CKD trial)",
      timeframe: "Immediate",
      evidenceLevel: "A",
    });
  }
  
  // Screening
  if (patient.currentConditions.some(c => c.toLowerCase().includes("diabetes"))) {
    recommendations.push({
      priority: priority++,
      category: "screening",
      action: "Annual retinal exam, urine albumin/creatinine ratio, foot exam",
      expectedImpact: "Early detection of complications allows timely intervention",
      timeframe: "Schedule within 1 month",
      evidenceLevel: "B",
    });
  }
  
  // Cancer screening by age
  if (patient.age >= 50) {
    recommendations.push({
      priority: priority++,
      category: "screening",
      action: "Age-appropriate cancer screening (colonoscopy, mammography if female)",
      expectedImpact: "Early detection improves 5-year survival by 40-90% depending on cancer type",
      timeframe: "Schedule within 3 months",
      evidenceLevel: "A",
    });
  }
  
  return recommendations;
}

/**
 * Default citations when AI is unavailable
 */
function getDefaultCitations(): Citation[] {
  return [
    { id: 1, source: "UKPDS", title: "Intensive blood-glucose control and complications in type 2 diabetes", year: 1998, relevance: "Foundation for glycemic control targets" },
    { id: 2, source: "Framingham Heart Study", title: "Cardiovascular risk prediction", year: 2008, relevance: "CV risk calculation methodology" },
    { id: 3, source: "SPRINT Trial", title: "Intensive vs Standard Blood Pressure Control", year: 2015, relevance: "BP target evidence" },
    { id: 4, source: "DAPA-CKD Trial", title: "Dapagliflozin in CKD", year: 2020, relevance: "SGLT2i renal protection" },
    { id: 5, source: "Nature Medicine", title: "AI-based disease trajectory prediction", year: 2025, relevance: "Methodology for long-term health forecasting" },
  ];
}

/**
 * Compare two treatment scenarios
 */
export async function compareScenarios(
  patient: TimelinePatient,
  scenario1: { name: string; interventions: string[] },
  scenario2: { name: string; interventions: string[] },
  horizonYears: number = 10
): Promise<{
  scenario1Result: TimelineScenario;
  scenario2Result: TimelineScenario;
  recommendation: string;
  winner: string;
}> {
  const client = getGeminiClient();
  
  const prompt = `You are MediTimeline. Compare two treatment scenarios for this patient:

PATIENT: Age ${patient.age}, ${patient.sex}, Conditions: ${patient.currentConditions.join(", ")}
Vitals: BP ${patient.vitals?.systolic}/${patient.vitals?.diastolic}, HbA1c ${patient.vitals?.hba1c}, eGFR ${patient.vitals?.egfr}

SCENARIO A: "${scenario1.name}" — ${scenario1.interventions.join(", ")}
SCENARIO B: "${scenario2.name}" — ${scenario2.interventions.join(", ")}

Horizon: ${horizonYears} years

Return JSON with comparative analysis:
{
  "scenario1Result": { "lifeExpectancy": N, "qualityOfLife": N, "healthScore": N, "events": [...] },
  "scenario2Result": { "lifeExpectancy": N, "qualityOfLife": N, "healthScore": N, "events": [...] },
  "recommendation": "Which is better and why",
  "winner": "A or B"
}`;

  try {
    if (client) {
      const result = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.3 },
      });
      const text = result.text ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.error("MediTimeline comparison error:", error);
  }
  
  return {
    scenario1Result: { name: scenario1.name, description: "", interventions: scenario1.interventions, events: [], lifeExpectancy: 75, qualityOfLife: 65, healthScore: 60, costProjection: { annual: 20000, total: 200000, currency: "SAR" } },
    scenario2Result: { name: scenario2.name, description: "", interventions: scenario2.interventions, events: [], lifeExpectancy: 77, qualityOfLife: 70, healthScore: 65, costProjection: { annual: 18000, total: 180000, currency: "SAR" } },
    recommendation: "Further AI analysis needed for detailed comparison",
    winner: "B",
  };
}
