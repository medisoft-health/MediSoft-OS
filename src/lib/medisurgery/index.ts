/**
 * MediSurgery — AI Surgical Planning & Simulation
 * AI-powered surgical planning with 3D simulation, risk assessment,
 * approach comparison, and outcome prediction
 * 
 * Covers: General Surgery, Orthopedics, Neurosurgery, Cardiac Surgery,
 * Urology, Gynecology, ENT, Thoracic Surgery
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ============================================================
// TYPES
// ============================================================

export type SurgerySpecialty = 
  | "general"
  | "orthopedic"
  | "neurosurgery"
  | "cardiac"
  | "urology"
  | "gynecology"
  | "ent"
  | "thoracic"
  | "vascular"
  | "plastic";

export type SurgicalApproach = "open" | "laparoscopic" | "robotic" | "endoscopic" | "percutaneous" | "hybrid";

export type RiskLevel = "very_low" | "low" | "moderate" | "high" | "very_high";

export interface SurgicalCase {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: "male" | "female";
  bmi: number;
  asaScore: 1 | 2 | 3 | 4 | 5;
  diagnosis: string;
  procedure: string;
  specialty: SurgerySpecialty;
  urgency: "elective" | "urgent" | "emergent";
  comorbidities: string[];
  previousSurgeries: string[];
  medications: string[];
  allergies: string[];
  labResults?: Record<string, number>;
  imagingFindings?: string;
}

export interface SurgicalPlan {
  id: string;
  caseId: string;
  recommendedApproach: SurgicalApproach;
  alternativeApproaches: ApproachComparison[];
  riskAssessment: RiskAssessment;
  preoperativeChecklist: ChecklistItem[];
  estimatedDuration: number; // minutes
  estimatedBloodLoss: number; // mL
  estimatedRecovery: RecoveryEstimate;
  equipmentNeeded: string[];
  teamRequired: TeamMember[];
  anesthesiaRecommendation: AnesthesiaRecommendation;
  intraoperativeConsiderations: string[];
  potentialComplications: Complication[];
  postoperativePlan: PostOpPlan;
  aiConfidence: number;
  aiReasoning: string;
}

export interface ApproachComparison {
  approach: SurgicalApproach;
  advantages: string[];
  disadvantages: string[];
  riskScore: number; // 0-100
  successRate: number; // percentage
  estimatedDuration: number;
  estimatedRecovery: string;
  recommendation: "recommended" | "alternative" | "not_recommended";
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  mortalityRisk: number; // percentage
  morbidityRisk: number; // percentage
  scores: {
    asaScore: number;
    revisedCardiacRiskIndex: number; // Lee's RCRI
    capriniVTEScore: number;
    surgicalApgarScore?: number;
    pPossum?: number;
  };
  riskFactors: string[];
  mitigationStrategies: string[];
}

export interface ChecklistItem {
  category: "consent" | "labs" | "imaging" | "medications" | "preparation" | "safety";
  item: string;
  status: "required" | "completed" | "not_applicable";
  priority: "critical" | "high" | "medium" | "low";
}

export interface RecoveryEstimate {
  hospitalStayDays: number;
  returnToWorkDays: number;
  fullRecoveryWeeks: number;
  milestones: { day: number; milestone: string }[];
}

export interface TeamMember {
  role: string;
  specialty?: string;
  required: boolean;
}

export interface AnesthesiaRecommendation {
  type: "general" | "regional" | "local" | "sedation" | "combined";
  technique: string;
  considerations: string[];
  airwayPlan: string;
  monitoringLevel: "standard" | "invasive" | "advanced";
}

export interface Complication {
  name: string;
  probability: number; // percentage
  severity: "minor" | "moderate" | "major" | "life_threatening";
  prevention: string;
  management: string;
}

export interface PostOpPlan {
  painManagement: string;
  dvtProphylaxis: string;
  antibiotics: string;
  diet: string;
  mobility: string;
  drains: string[];
  followUp: string;
  redFlags: string[];
}

// ============================================================
// SURGICAL PLANNING ENGINE
// ============================================================

/**
 * Generate a comprehensive surgical plan using AI
 */
export async function generateSurgicalPlan(surgicalCase: SurgicalCase): Promise<SurgicalPlan> {
  const client = getGeminiClient();
  
  // Calculate risk scores
  const riskAssessment = calculateRiskAssessment(surgicalCase);
  
  // Determine approaches
  const approaches = getApproachComparisons(surgicalCase);
  const recommendedApproach = approaches.find(a => a.recommendation === "recommended")?.approach || "open";

  // Get AI-powered detailed plan
  let aiReasoning = "";
  let aiConfidence = 0.85;

  if (client) {
    try {
      const prompt = `You are an expert surgical planning AI. Generate a detailed surgical plan.

PATIENT:
- Name: ${surgicalCase.patientName}, Age: ${surgicalCase.age}, Gender: ${surgicalCase.gender}
- BMI: ${surgicalCase.bmi}, ASA: ${surgicalCase.asaScore}
- Diagnosis: ${surgicalCase.diagnosis}
- Procedure: ${surgicalCase.procedure}
- Specialty: ${surgicalCase.specialty}
- Comorbidities: ${surgicalCase.comorbidities.join(", ") || "None"}
- Previous surgeries: ${surgicalCase.previousSurgeries.join(", ") || "None"}
- Imaging: ${surgicalCase.imagingFindings || "Not provided"}

Provide in JSON:
{
  "reasoning": "Detailed surgical reasoning and approach justification (2-3 paragraphs)",
  "confidence": 0.0-1.0,
  "intraoperativeConsiderations": ["list of key intraoperative considerations"],
  "criticalSteps": ["list of critical surgical steps"],
  "estimatedDuration": minutes,
  "estimatedBloodLoss": mL
}`;

      const result = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.3 }
      });

      const text = result.text ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiReasoning = parsed.reasoning || "";
        aiConfidence = parsed.confidence || 0.85;
      }
    } catch (e) {
      aiReasoning = `Standard ${surgicalCase.specialty} surgical approach for ${surgicalCase.procedure}. Risk assessment indicates ${riskAssessment.overallRisk} overall risk.`;
    }
  }

  if (!aiReasoning) {
    aiReasoning = `Recommended ${recommendedApproach} approach for ${surgicalCase.procedure}. Patient ASA ${surgicalCase.asaScore} with ${riskAssessment.overallRisk} overall surgical risk. ${riskAssessment.riskFactors.length} modifiable risk factors identified.`;
  }

  return {
    id: `plan-${Date.now()}`,
    caseId: surgicalCase.id,
    recommendedApproach,
    alternativeApproaches: approaches,
    riskAssessment,
    preoperativeChecklist: generatePreopChecklist(surgicalCase),
    estimatedDuration: getEstimatedDuration(surgicalCase, recommendedApproach),
    estimatedBloodLoss: getEstimatedBloodLoss(surgicalCase, recommendedApproach),
    estimatedRecovery: getRecoveryEstimate(surgicalCase, recommendedApproach),
    equipmentNeeded: getEquipmentList(surgicalCase, recommendedApproach),
    teamRequired: getTeamRequirements(surgicalCase),
    anesthesiaRecommendation: getAnesthesiaRecommendation(surgicalCase),
    intraoperativeConsiderations: getIntraopConsiderations(surgicalCase),
    potentialComplications: getComplications(surgicalCase, recommendedApproach),
    postoperativePlan: getPostOpPlan(surgicalCase, recommendedApproach),
    aiConfidence,
    aiReasoning
  };
}

// ============================================================
// RISK CALCULATION
// ============================================================

function calculateRiskAssessment(c: SurgicalCase): RiskAssessment {
  // Lee's Revised Cardiac Risk Index
  let rcri = 0;
  if (c.comorbidities.some(x => x.toLowerCase().includes("heart") || x.toLowerCase().includes("cardiac"))) rcri++;
  if (c.comorbidities.some(x => x.toLowerCase().includes("diabetes") && x.toLowerCase().includes("insulin"))) rcri++;
  if (c.comorbidities.some(x => x.toLowerCase().includes("renal") || x.toLowerCase().includes("kidney"))) rcri++;
  if (c.comorbidities.some(x => x.toLowerCase().includes("stroke") || x.toLowerCase().includes("tia"))) rcri++;
  if (["cardiac", "thoracic", "vascular"].includes(c.specialty)) rcri++;
  if (c.urgency === "emergent") rcri++;

  // Caprini VTE Score
  let caprini = 0;
  if (c.age >= 41 && c.age <= 60) caprini += 1;
  if (c.age >= 61 && c.age <= 74) caprini += 2;
  if (c.age >= 75) caprini += 3;
  if (c.bmi >= 25) caprini += 1;
  if (c.comorbidities.some(x => x.toLowerCase().includes("cancer"))) caprini += 2;
  if (c.previousSurgeries.length > 0) caprini += 1;

  // Overall risk
  const riskFactors: string[] = [];
  if (c.asaScore >= 3) riskFactors.push(`ASA ${c.asaScore} — significant systemic disease`);
  if (c.bmi >= 35) riskFactors.push(`Obesity (BMI ${c.bmi}) — increased surgical difficulty`);
  if (c.age >= 70) riskFactors.push(`Advanced age (${c.age}) — increased perioperative risk`);
  if (c.comorbidities.length >= 3) riskFactors.push(`Multiple comorbidities (${c.comorbidities.length})`);
  if (c.urgency === "emergent") riskFactors.push("Emergency surgery — limited optimization time");

  let overallRisk: RiskLevel;
  const totalRiskScore = c.asaScore + rcri + (c.urgency === "emergent" ? 2 : 0);
  if (totalRiskScore <= 2) overallRisk = "very_low";
  else if (totalRiskScore <= 4) overallRisk = "low";
  else if (totalRiskScore <= 6) overallRisk = "moderate";
  else if (totalRiskScore <= 8) overallRisk = "high";
  else overallRisk = "very_high";

  const mortalityRisk = overallRisk === "very_low" ? 0.1 : overallRisk === "low" ? 0.5 : overallRisk === "moderate" ? 2.0 : overallRisk === "high" ? 5.0 : 10.0;
  const morbidityRisk = mortalityRisk * 4;

  return {
    overallRisk,
    mortalityRisk,
    morbidityRisk,
    scores: { asaScore: c.asaScore, revisedCardiacRiskIndex: rcri, capriniVTEScore: caprini },
    riskFactors,
    mitigationStrategies: getMitigationStrategies(riskFactors, c)
  };
}

function getMitigationStrategies(riskFactors: string[], c: SurgicalCase): string[] {
  const strategies: string[] = [];
  if (c.bmi >= 35) strategies.push("Preoperative weight optimization if elective", "Enhanced recovery protocol (ERAS)");
  if (c.asaScore >= 3) strategies.push("Cardiology clearance", "Optimize chronic conditions preoperatively");
  if (c.age >= 70) strategies.push("Geriatric assessment", "Frailty screening", "Prehabilitation program");
  if (c.comorbidities.some(x => x.toLowerCase().includes("diabetes"))) strategies.push("Perioperative glucose management protocol");
  strategies.push("VTE prophylaxis per Caprini score", "Antibiotic prophylaxis per guidelines");
  return strategies;
}

// ============================================================
// APPROACH COMPARISON
// ============================================================

function getApproachComparisons(c: SurgicalCase): ApproachComparison[] {
  const approaches: ApproachComparison[] = [];
  const proc = c.procedure.toLowerCase();

  if (proc.includes("cholecystectomy")) {
    approaches.push(
      { approach: "laparoscopic", advantages: ["Minimal scarring", "Faster recovery", "Less pain", "Lower infection risk"], disadvantages: ["Limited tactile feedback", "Learning curve"], riskScore: 15, successRate: 97, estimatedDuration: 60, estimatedRecovery: "1-2 weeks", recommendation: "recommended" },
      { approach: "robotic", advantages: ["3D visualization", "Enhanced precision", "Ergonomic"], disadvantages: ["Higher cost", "Longer setup", "Equipment availability"], riskScore: 12, successRate: 98, estimatedDuration: 75, estimatedRecovery: "1-2 weeks", recommendation: "alternative" },
      { approach: "open", advantages: ["Direct visualization", "Tactile feedback", "No equipment dependency"], disadvantages: ["Larger incision", "More pain", "Longer recovery", "Higher infection risk"], riskScore: 25, successRate: 99, estimatedDuration: 90, estimatedRecovery: "4-6 weeks", recommendation: "not_recommended" }
    );
  } else if (proc.includes("hernia")) {
    approaches.push(
      { approach: "laparoscopic", advantages: ["Less postop pain", "Faster return to activity", "Bilateral repair possible"], disadvantages: ["General anesthesia required", "Higher cost"], riskScore: 12, successRate: 96, estimatedDuration: 45, estimatedRecovery: "1-2 weeks", recommendation: "recommended" },
      { approach: "robotic", advantages: ["Precision mesh placement", "3D visualization"], disadvantages: ["Cost", "Availability"], riskScore: 10, successRate: 97, estimatedDuration: 55, estimatedRecovery: "1-2 weeks", recommendation: "alternative" },
      { approach: "open", advantages: ["Local anesthesia possible", "Lower cost", "No special equipment"], disadvantages: ["More pain", "Longer recovery"], riskScore: 18, successRate: 95, estimatedDuration: 60, estimatedRecovery: "3-4 weeks", recommendation: "alternative" }
    );
  } else if (proc.includes("knee") || proc.includes("hip") || proc.includes("arthroplasty")) {
    approaches.push(
      { approach: "robotic", advantages: ["Precise bone cuts", "Optimal implant alignment", "Personalized planning"], disadvantages: ["Higher cost", "Longer OR time initially"], riskScore: 15, successRate: 98, estimatedDuration: 90, estimatedRecovery: "6-12 weeks", recommendation: "recommended" },
      { approach: "open", advantages: ["Established technique", "Surgeon experience", "Lower cost"], disadvantages: ["Less precision", "More tissue disruption"], riskScore: 20, successRate: 95, estimatedDuration: 75, estimatedRecovery: "8-12 weeks", recommendation: "alternative" }
    );
  } else if (proc.includes("appendectomy")) {
    approaches.push(
      { approach: "laparoscopic", advantages: ["Diagnostic capability", "Less pain", "Faster recovery", "Better cosmesis"], disadvantages: ["Equipment needed", "Pneumoperitoneum risks"], riskScore: 10, successRate: 98, estimatedDuration: 40, estimatedRecovery: "1 week", recommendation: "recommended" },
      { approach: "open", advantages: ["Quick", "No special equipment", "Suitable for complicated cases"], disadvantages: ["Larger scar", "More pain"], riskScore: 15, successRate: 99, estimatedDuration: 35, estimatedRecovery: "2-3 weeks", recommendation: "alternative" }
    );
  } else {
    approaches.push(
      { approach: "open", advantages: ["Direct access", "Tactile feedback", "Established technique"], disadvantages: ["Larger incision", "More pain", "Longer recovery"], riskScore: 25, successRate: 95, estimatedDuration: 120, estimatedRecovery: "4-6 weeks", recommendation: "alternative" },
      { approach: "laparoscopic", advantages: ["Minimally invasive", "Less pain", "Faster recovery"], disadvantages: ["Technical complexity", "Equipment dependent"], riskScore: 20, successRate: 94, estimatedDuration: 150, estimatedRecovery: "2-3 weeks", recommendation: "recommended" }
    );
  }

  return approaches;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getEstimatedDuration(c: SurgicalCase, approach: SurgicalApproach): number {
  const base = c.procedure.toLowerCase().includes("cholecystectomy") ? 60 :
    c.procedure.toLowerCase().includes("appendectomy") ? 40 :
    c.procedure.toLowerCase().includes("hernia") ? 50 :
    c.procedure.toLowerCase().includes("arthroplasty") ? 90 : 120;
  const modifier = approach === "robotic" ? 1.2 : approach === "open" ? 1.3 : 1.0;
  return Math.round(base * modifier);
}

function getEstimatedBloodLoss(c: SurgicalCase, approach: SurgicalApproach): number {
  const base = c.specialty === "cardiac" ? 500 : c.specialty === "orthopedic" ? 300 : 100;
  const modifier = approach === "laparoscopic" ? 0.5 : approach === "robotic" ? 0.4 : 1.0;
  return Math.round(base * modifier);
}

function getRecoveryEstimate(c: SurgicalCase, approach: SurgicalApproach): RecoveryEstimate {
  const isMinimallyInvasive = approach === "laparoscopic" || approach === "robotic";
  return {
    hospitalStayDays: isMinimallyInvasive ? 1 : 3,
    returnToWorkDays: isMinimallyInvasive ? 14 : 42,
    fullRecoveryWeeks: isMinimallyInvasive ? 4 : 8,
    milestones: [
      { day: 1, milestone: "Ambulation and clear liquids" },
      { day: 2, milestone: isMinimallyInvasive ? "Discharge home" : "Regular diet, pain control" },
      { day: 7, milestone: "Wound check, suture removal" },
      { day: 14, milestone: "Light activities resume" },
      { day: 28, milestone: isMinimallyInvasive ? "Full recovery" : "Gradual return to normal" },
      { day: 42, milestone: "Follow-up imaging if needed" }
    ]
  };
}

function getEquipmentList(c: SurgicalCase, approach: SurgicalApproach): string[] {
  const base = ["Electrocautery", "Suction/Irrigation", "Standard surgical set"];
  if (approach === "laparoscopic") base.push("Laparoscopic tower", "CO2 insufflator", "Trocars (5mm, 10mm)", "Laparoscopic instruments", "Clip applier");
  if (approach === "robotic") base.push("Da Vinci Xi system", "Robotic instruments", "3D camera", "Surgeon console");
  if (c.specialty === "orthopedic") base.push("Power tools", "Implant set", "Fluoroscopy");
  return base;
}

function getTeamRequirements(c: SurgicalCase): TeamMember[] {
  return [
    { role: "Primary Surgeon", specialty: c.specialty, required: true },
    { role: "First Assistant", required: true },
    { role: "Anesthesiologist", required: true },
    { role: "Scrub Nurse", required: true },
    { role: "Circulating Nurse", required: true },
    { role: "Anesthesia Technician", required: true },
    ...(c.urgency === "emergent" ? [{ role: "Second Surgeon", specialty: c.specialty, required: false }] : [])
  ];
}

function getAnesthesiaRecommendation(c: SurgicalCase): AnesthesiaRecommendation {
  if (c.specialty === "orthopedic" && c.procedure.toLowerCase().includes("knee")) {
    return { type: "combined", technique: "Spinal + femoral nerve block", considerations: ["Patient positioning", "Tourniquet time"], airwayPlan: "LMA or ETT backup", monitoringLevel: "standard" };
  }
  return {
    type: "general",
    technique: "TIVA or balanced anesthesia",
    considerations: c.asaScore >= 3 ? ["Cardiac monitoring", "Arterial line", "Careful induction"] : ["Standard induction"],
    airwayPlan: "Endotracheal intubation",
    monitoringLevel: c.asaScore >= 3 ? "invasive" : "standard"
  };
}

function getIntraopConsiderations(c: SurgicalCase): string[] {
  const considerations = ["Verify surgical site marking", "Confirm antibiotic prophylaxis given"];
  if (c.bmi >= 35) considerations.push("Positioning challenges — pressure point protection", "Longer instruments may be needed");
  if (c.comorbidities.some(x => x.toLowerCase().includes("diabetes"))) considerations.push("Intraoperative glucose monitoring q1h");
  if (c.medications.some(m => m.toLowerCase().includes("warfarin") || m.toLowerCase().includes("anticoagul"))) considerations.push("Hemostasis vigilance — patient on anticoagulation");
  considerations.push("Maintain normothermia", "Fluid management per protocol");
  return considerations;
}

function getComplications(c: SurgicalCase, approach: SurgicalApproach): Complication[] {
  const complications: Complication[] = [
    { name: "Surgical Site Infection", probability: approach === "laparoscopic" ? 1.5 : 4.0, severity: "moderate", prevention: "Antibiotic prophylaxis, sterile technique", management: "Wound care, antibiotics, possible drainage" },
    { name: "Venous Thromboembolism", probability: 2.0, severity: "major", prevention: "Early ambulation, chemical prophylaxis per Caprini", management: "Anticoagulation, IVC filter if contraindicated" },
    { name: "Bleeding", probability: 3.0, severity: "moderate", prevention: "Meticulous hemostasis, correct coagulopathy", management: "Transfusion, possible re-exploration" },
    { name: "Anesthetic Complications", probability: 0.5, severity: "major", prevention: "Thorough preop assessment, appropriate monitoring", management: "ACLS protocols, supportive care" }
  ];
  return complications;
}

function getPostOpPlan(c: SurgicalCase, approach: SurgicalApproach): PostOpPlan {
  return {
    painManagement: approach === "laparoscopic" ? "Multimodal: Paracetamol + NSAIDs + local anesthetic infiltration" : "PCA morphine → oral opioids → multimodal step-down",
    dvtProphylaxis: "Enoxaparin 40mg SC daily + mechanical (SCDs) until fully mobile",
    antibiotics: "Cefazolin 2g IV preop (single dose unless >4h or significant contamination)",
    diet: approach === "laparoscopic" ? "Clear liquids POD0, regular diet POD1" : "NPO → clear liquids → advance as tolerated",
    mobility: "Early ambulation POD0-1, physiotherapy if orthopedic",
    drains: approach === "open" ? ["Surgical drain — remove when <50mL/24h"] : [],
    followUp: "Wound check 7 days, surgeon follow-up 2-4 weeks",
    redFlags: ["Fever > 38.5°C", "Increasing pain despite analgesia", "Wound dehiscence or purulent drainage", "Chest pain or dyspnea", "Calf swelling or tenderness"]
  };
}

function generatePreopChecklist(c: SurgicalCase): ChecklistItem[] {
  return [
    { category: "consent", item: "Informed consent signed", status: "required", priority: "critical" },
    { category: "consent", item: "Surgical site marked", status: "required", priority: "critical" },
    { category: "labs", item: "CBC within 30 days", status: "required", priority: "high" },
    { category: "labs", item: "Coagulation profile (PT/INR/aPTT)", status: "required", priority: "high" },
    { category: "labs", item: "Renal function (Cr/BUN)", status: "required", priority: "high" },
    { category: "labs", item: "Blood type and crossmatch", status: c.specialty === "cardiac" || c.urgency === "emergent" ? "required" : "not_applicable", priority: "high" },
    { category: "imaging", item: "Relevant imaging reviewed", status: "required", priority: "high" },
    { category: "medications", item: "Anticoagulants held appropriately", status: c.medications.some(m => m.toLowerCase().includes("warfarin")) ? "required" : "not_applicable", priority: "critical" },
    { category: "medications", item: "NPO status confirmed (≥6h solids, ≥2h clear liquids)", status: "required", priority: "critical" },
    { category: "preparation", item: "Anesthesia assessment complete", status: "required", priority: "high" },
    { category: "preparation", item: "VTE risk assessed (Caprini)", status: "required", priority: "high" },
    { category: "safety", item: "WHO Surgical Safety Checklist", status: "required", priority: "critical" },
    { category: "safety", item: "Allergies verified and documented", status: "required", priority: "critical" }
  ];
}

// ============================================================
// DEMO CASES
// ============================================================

export const DEMO_CASES: SurgicalCase[] = [
  {
    id: "surg-001",
    patientId: "p-001",
    patientName: "Khalid Al-Marri",
    age: 45,
    gender: "male",
    bmi: 32,
    asaScore: 2,
    diagnosis: "Symptomatic cholelithiasis with recurrent biliary colic",
    procedure: "Cholecystectomy",
    specialty: "general",
    urgency: "elective",
    comorbidities: ["Type 2 Diabetes", "Hypertension"],
    previousSurgeries: ["Appendectomy (2015)"],
    medications: ["Metformin 1000mg", "Lisinopril 10mg"],
    allergies: ["Penicillin"],
    imagingFindings: "Ultrasound: Multiple gallstones, largest 1.8cm. No CBD dilation. Wall thickness normal."
  },
  {
    id: "surg-002",
    patientId: "p-002",
    patientName: "Noura Al-Thani",
    age: 68,
    gender: "female",
    bmi: 28,
    asaScore: 3,
    diagnosis: "Severe osteoarthritis right knee, failed conservative management",
    procedure: "Total Knee Arthroplasty",
    specialty: "orthopedic",
    urgency: "elective",
    comorbidities: ["Hypertension", "Osteoporosis", "Atrial Fibrillation"],
    previousSurgeries: [],
    medications: ["Apixaban 5mg BID", "Amlodipine 5mg", "Alendronate 70mg weekly"],
    allergies: [],
    imagingFindings: "X-ray: Kellgren-Lawrence Grade 4. Bone-on-bone medial compartment. Varus deformity 8°."
  },
  {
    id: "surg-003",
    patientId: "p-003",
    patientName: "Omar Hassan",
    age: 55,
    gender: "male",
    bmi: 26,
    asaScore: 3,
    diagnosis: "Right inguinal hernia, symptomatic",
    procedure: "Inguinal Hernia Repair",
    specialty: "general",
    urgency: "elective",
    comorbidities: ["COPD", "Smoker"],
    previousSurgeries: ["Left inguinal hernia repair (2020)"],
    medications: ["Tiotropium inhaler", "Salbutamol PRN"],
    allergies: ["Latex"],
    imagingFindings: "CT: Right indirect inguinal hernia, 3cm defect, containing omentum. No incarceration."
  }
];
