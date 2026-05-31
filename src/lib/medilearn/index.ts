/**
 * MediLearn — Adaptive Medical Education
 * AI-powered personalized medical education with error pattern detection,
 * competency assessment, CME tracking, and adaptive training cases
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ============================================================
// TYPES
// ============================================================

export interface Physician {
  id: string;
  name: string;
  specialty: string;
  level: "intern" | "resident" | "fellow" | "attending" | "consultant";
  yearsExperience: number;
  hospital: string;
  competencyProfile: CompetencyProfile;
  learningHistory: LearningEvent[];
  errorPatterns: ErrorPattern[];
  cmeCredits: CMERecord[];
}

export interface CompetencyProfile {
  overallScore: number; // 0-100
  lastAssessed: string;
  domains: CompetencyDomain[];
  strengths: string[];
  areasForImprovement: string[];
  millerLevel: "knows" | "knows_how" | "shows_how" | "does";
}

export interface CompetencyDomain {
  name: string;
  score: number;
  trend: "improving" | "stable" | "declining";
  subdomains: { name: string; score: number }[];
  lastAssessed: string;
  targetScore: number;
}

export interface LearningEvent {
  id: string;
  date: string;
  type: "case_simulation" | "quiz" | "lecture" | "procedure" | "peer_review" | "self_assessment";
  topic: string;
  score?: number;
  timeSpent: number; // minutes
  feedback?: string;
  competencyDomain: string;
}

export interface ErrorPattern {
  id: string;
  category: string;
  description: string;
  frequency: number;
  severity: "low" | "moderate" | "high" | "critical";
  firstDetected: string;
  lastOccurrence: string;
  trend: "improving" | "stable" | "worsening";
  suggestedIntervention: string;
  relatedCases: string[];
}

export interface CMERecord {
  id: string;
  title: string;
  provider: string;
  credits: number;
  category: "Category 1" | "Category 2" | "MOC";
  completedDate: string;
  expiryDate: string;
  certificate?: string;
  topic: string;
}

export interface TrainingCase {
  id: string;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  specialty: string;
  competencyDomains: string[];
  scenario: CaseScenario;
  questions: CaseQuestion[];
  teachingPoints: string[];
  references: string[];
  estimatedTime: number; // minutes
  adaptedFor?: string; // physician ID
}

export interface CaseScenario {
  presentation: string;
  history: string;
  examination: string;
  investigations: { test: string; result: string }[];
  imaging?: string;
  progression?: string[];
}

export interface CaseQuestion {
  id: string;
  question: string;
  type: "mcq" | "open_ended" | "ordering" | "matching";
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: number; // 1-5
  competencyDomain: string;
}

export interface AssessmentResult {
  physicianId: string;
  caseId: string;
  completedAt: string;
  score: number;
  timeSpent: number;
  answers: { questionId: string; answer: string; correct: boolean; timeSpent: number }[];
  feedback: string;
  competencyUpdates: { domain: string; change: number }[];
  nextRecommendation: string;
}

export interface LearningPlan {
  physicianId: string;
  generatedAt: string;
  validUntil: string;
  goals: LearningGoal[];
  weeklySchedule: WeeklyPlan[];
  estimatedCompletionTime: number; // hours
  priorityAreas: string[];
  milestones: { description: string; targetDate: string; status: "pending" | "in_progress" | "completed" }[];
}

export interface LearningGoal {
  id: string;
  domain: string;
  currentLevel: number;
  targetLevel: number;
  deadline: string;
  activities: string[];
  progress: number; // 0-100
}

export interface WeeklyPlan {
  week: number;
  focus: string;
  activities: { type: string; topic: string; duration: number; resource: string }[];
  assessment?: string;
}

// ============================================================
// COMPETENCY FRAMEWORK (Based on CanMEDS/ACGME)
// ============================================================

export const COMPETENCY_FRAMEWORK = {
  domains: [
    {
      name: "Medical Knowledge",
      description: "Application of biomedical, clinical, and social sciences to patient care",
      subdomains: ["Pathophysiology", "Pharmacology", "Evidence-Based Medicine", "Clinical Guidelines", "Differential Diagnosis"],
      weight: 0.25,
    },
    {
      name: "Patient Care",
      description: "Compassionate, appropriate, and effective treatment of health problems",
      subdomains: ["History Taking", "Physical Examination", "Clinical Reasoning", "Treatment Planning", "Procedural Skills"],
      weight: 0.25,
    },
    {
      name: "Clinical Judgment",
      description: "Decision-making under uncertainty with appropriate risk assessment",
      subdomains: ["Diagnostic Reasoning", "Risk Stratification", "Urgency Assessment", "Resource Utilization", "Prognostication"],
      weight: 0.20,
    },
    {
      name: "Communication",
      description: "Effective information exchange with patients, families, and teams",
      subdomains: ["Patient Education", "Informed Consent", "Breaking Bad News", "Handoff Communication", "Documentation"],
      weight: 0.10,
    },
    {
      name: "Systems-Based Practice",
      description: "Awareness and responsiveness to the larger context of healthcare",
      subdomains: ["Quality Improvement", "Patient Safety", "Cost-Effective Care", "Care Coordination", "Health Informatics"],
      weight: 0.10,
    },
    {
      name: "Professionalism",
      description: "Commitment to professional responsibilities and ethical principles",
      subdomains: ["Ethics", "Cultural Competency", "Self-Regulation", "Accountability", "Continuous Learning"],
      weight: 0.10,
    },
  ],
};

// ============================================================
// TRAINING CASE DATABASE
// ============================================================

const CASE_DATABASE: TrainingCase[] = [
  {
    id: "TC-001",
    title: "Diabetic Ketoacidosis in a Young Adult",
    difficulty: "intermediate",
    specialty: "Internal Medicine",
    competencyDomains: ["Medical Knowledge", "Patient Care", "Clinical Judgment"],
    scenario: {
      presentation: "22-year-old female presents to ED with nausea, vomiting, abdominal pain, and confusion for 2 days. Known Type 1 DM, ran out of insulin 3 days ago.",
      history: "T1DM diagnosed age 12. Last HbA1c 9.2%. No other medical history. Takes insulin glargine 20U + lispro with meals. Non-compliant with monitoring.",
      examination: "GCS 14 (E4V4M6), HR 125, BP 95/60, RR 32 (Kussmaul), Temp 37.8°C, SpO2 97%. Dry mucous membranes, reduced skin turgor, fruity breath. Abdomen diffusely tender.",
      investigations: [
        { test: "Blood glucose", result: "32 mmol/L (576 mg/dL)" },
        { test: "Venous pH", result: "7.12" },
        { test: "Bicarbonate", result: "8 mmol/L" },
        { test: "Anion gap", result: "28" },
        { test: "Ketones (blood)", result: "5.8 mmol/L" },
        { test: "Sodium", result: "128 mmol/L (corrected: 136)" },
        { test: "Potassium", result: "5.8 mmol/L" },
        { test: "Creatinine", result: "1.8 mg/dL" },
        { test: "WBC", result: "18,000 (stress response)" },
      ],
    },
    questions: [
      {
        id: "TC-001-Q1",
        question: "What is the severity classification of this DKA?",
        type: "mcq",
        options: ["Mild DKA", "Moderate DKA", "Severe DKA", "Hyperosmolar Hyperglycemic State"],
        correctAnswer: "Severe DKA",
        explanation: "pH <7.24, bicarbonate <10, altered mental status = Severe DKA per ADA criteria",
        difficulty: 2,
        competencyDomain: "Medical Knowledge",
      },
      {
        id: "TC-001-Q2",
        question: "What is the correct initial fluid resuscitation?",
        type: "mcq",
        options: [
          "0.9% NaCl 1L/hr for first 1-2 hours",
          "0.45% NaCl 500mL/hr",
          "D5W at 250mL/hr",
          "Ringer's Lactate 2L bolus",
        ],
        correctAnswer: "0.9% NaCl 1L/hr for first 1-2 hours",
        explanation: "ADA DKA protocol: Initial NS 15-20 mL/kg/hr (or 1-1.5L) in first hour. Switch to 0.45% if corrected Na normal/high.",
        difficulty: 2,
        competencyDomain: "Patient Care",
      },
      {
        id: "TC-001-Q3",
        question: "When should you start potassium replacement?",
        type: "mcq",
        options: [
          "Immediately — K+ is 5.8",
          "After insulin started and K+ drops below 5.3",
          "Only if K+ drops below 3.5",
          "After 6 hours regardless of level",
        ],
        correctAnswer: "After insulin started and K+ drops below 5.3",
        explanation: "K+ 5.8 is elevated due to acidosis/insulin deficiency. Will drop rapidly with insulin. Hold K+ replacement until <5.3, then add 20-40 mEq/L to fluids. If K+ <3.3, replace BEFORE starting insulin.",
        difficulty: 3,
        competencyDomain: "Clinical Judgment",
      },
      {
        id: "TC-001-Q4",
        question: "What is the insulin infusion rate and when do you add dextrose?",
        type: "open_ended",
        correctAnswer: "Insulin 0.1-0.14 U/kg/hr IV infusion. Add D5 to fluids when glucose reaches 200-250 mg/dL (11-14 mmol/L). Continue insulin until anion gap closes, not just glucose normalization.",
        explanation: "Common error: stopping insulin when glucose normalizes. Must continue until AG closes and pH >7.3. Adding dextrose prevents hypoglycemia while allowing continued insulin for ketosis resolution.",
        difficulty: 3,
        competencyDomain: "Patient Care",
      },
    ],
    teachingPoints: [
      "DKA resolution criteria: pH >7.3, bicarbonate >15, AG <12 — NOT glucose normalization",
      "Cerebral edema risk with rapid correction — especially in young patients",
      "Always check K+ before starting insulin — if <3.3, replace K+ first",
      "Transition to SC insulin: give SC dose 1-2 hours BEFORE stopping IV insulin",
      "Look for precipitating cause: infection, non-compliance, new diagnosis",
    ],
    references: ["ADA Diabetes Care 2025 — DKA Management", "Joint British Diabetes Societies DKA Guidelines"],
    estimatedTime: 25,
  },
  {
    id: "TC-002",
    title: "Acute Coronary Syndrome — STEMI Management",
    difficulty: "intermediate",
    specialty: "Cardiology/Emergency Medicine",
    competencyDomains: ["Clinical Judgment", "Patient Care", "Systems-Based Practice"],
    scenario: {
      presentation: "58-year-old male, crushing chest pain for 45 minutes radiating to left arm, diaphoresis, nausea. Smoker, HTN, DM.",
      history: "HTN x 10 years on amlodipine. T2DM on metformin. Smokes 1 pack/day x 30 years. Father had MI at 52.",
      examination: "Distressed, diaphoretic. HR 95, BP 150/90, RR 22, SpO2 94%. JVP normal. S4 gallop. Lungs: bibasal crackles. No murmurs.",
      investigations: [
        { test: "ECG", result: "ST elevation V1-V4 (2-4mm), reciprocal depression II, III, aVF. Anterior STEMI." },
        { test: "Troponin I (hs)", result: "2,450 ng/L (normal <14)" },
        { test: "CK-MB", result: "85 U/L" },
        { test: "Creatinine", result: "1.1 mg/dL" },
        { test: "Glucose", result: "220 mg/dL" },
        { test: "Hemoglobin", result: "14.2 g/dL" },
        { test: "Platelets", result: "245,000" },
      ],
    },
    questions: [
      {
        id: "TC-002-Q1",
        question: "What is the door-to-balloon time target and what is the culprit vessel?",
        type: "open_ended",
        correctAnswer: "Door-to-balloon <90 minutes (ideally <60). Culprit vessel: LAD (Left Anterior Descending) — based on ST elevation V1-V4 (anterior STEMI).",
        explanation: "Anterior STEMI = LAD territory. Every 30-minute delay in reperfusion increases mortality by 7.5%. Activate cath lab immediately.",
        difficulty: 2,
        competencyDomain: "Clinical Judgment",
      },
      {
        id: "TC-002-Q2",
        question: "What medications should be given immediately (before PCI)?",
        type: "mcq",
        options: [
          "Aspirin 300mg + Ticagrelor 180mg + Heparin + Morphine",
          "Aspirin 300mg + Clopidogrel 300mg + Enoxaparin",
          "Aspirin 300mg + Ticagrelor 180mg + UFH + GTN (if BP allows)",
          "Thrombolysis with Tenecteplase",
        ],
        correctAnswer: "Aspirin 300mg + Ticagrelor 180mg + UFH + GTN (if BP allows)",
        explanation: "DAPT (Aspirin + P2Y12 inhibitor) + anticoagulation before primary PCI. Ticagrelor preferred over clopidogrel (PLATO trial). GTN for pain/preload reduction. Morphine only if needed (may delay P2Y12 absorption).",
        difficulty: 3,
        competencyDomain: "Patient Care",
      },
    ],
    teachingPoints: [
      "Time is muscle — every minute of delay = more myocardial necrosis",
      "Ticagrelor preferred over clopidogrel in ACS (PLATO: 16% RRR in CV death)",
      "Avoid morphine if possible — delays absorption of oral antiplatelets",
      "Killip classification for acute HF in MI: Killip II (bibasal crackles) = 17% mortality",
      "Post-PCI: DAPT x 12 months, high-intensity statin, ACEi, beta-blocker",
    ],
    references: ["ESC STEMI Guidelines 2023", "AHA/ACC STEMI Focused Update 2024"],
    estimatedTime: 20,
  },
  {
    id: "TC-003",
    title: "Sepsis Recognition and Bundle Compliance",
    difficulty: "advanced",
    specialty: "Critical Care/Emergency Medicine",
    competencyDomains: ["Clinical Judgment", "Patient Care", "Systems-Based Practice"],
    scenario: {
      presentation: "72-year-old male, nursing home resident, brought in with fever, confusion, and productive cough x 2 days. Increasing lethargy today.",
      history: "COPD (on home O2 2L), T2DM, CKD Stage 3b (baseline Cr 1.8). Previous pneumonia admission 6 months ago.",
      examination: "GCS 13 (E3V4M6), HR 112, BP 88/52, RR 28, Temp 38.9°C, SpO2 88% on 2L. Confused. Right lower lobe crackles. Mottled extremities.",
      investigations: [
        { test: "Lactate", result: "4.8 mmol/L" },
        { test: "WBC", result: "22,000 (left shift)" },
        { test: "Procalcitonin", result: "8.5 ng/mL" },
        { test: "Creatinine", result: "2.8 mg/dL (baseline 1.8)" },
        { test: "CXR", result: "Right lower lobe consolidation with parapneumonic effusion" },
        { test: "Blood cultures", result: "Pending" },
        { test: "Urine output", result: "20 mL in last 2 hours" },
      ],
    },
    questions: [
      {
        id: "TC-003-Q1",
        question: "Calculate the qSOFA and SOFA scores. Does this patient meet Sepsis-3 criteria?",
        type: "open_ended",
        correctAnswer: "qSOFA: 3/3 (GCS<15, RR≥22, SBP≤100). SOFA: ≥2 increase from baseline (renal, respiratory, neurological, cardiovascular). YES — meets Sepsis-3 criteria (suspected infection + SOFA ≥2). Also meets SEPTIC SHOCK criteria (requiring vasopressors + lactate >2 despite fluid resuscitation).",
        explanation: "Sepsis-3: Suspected infection + acute SOFA increase ≥2. Septic shock: Sepsis + vasopressor requirement + lactate >2 mmol/L despite adequate fluid resuscitation. This patient likely needs vasopressors given MAP <65.",
        difficulty: 3,
        competencyDomain: "Medical Knowledge",
      },
      {
        id: "TC-003-Q2",
        question: "What are the Surviving Sepsis Campaign Hour-1 Bundle elements?",
        type: "ordering",
        options: [
          "Measure lactate",
          "Obtain blood cultures before antibiotics",
          "Administer broad-spectrum antibiotics",
          "Begin 30 mL/kg crystalloid for hypotension or lactate ≥4",
          "Apply vasopressors if hypotensive during/after fluid resuscitation (target MAP ≥65)",
        ],
        correctAnswer: ["Measure lactate", "Obtain blood cultures before antibiotics", "Administer broad-spectrum antibiotics", "Begin 30 mL/kg crystalloid for hypotension or lactate ≥4", "Apply vasopressors if hypotensive during/after fluid resuscitation (target MAP ≥65)"],
        explanation: "All elements should be initiated within 1 hour. Antibiotics within 1 hour of recognition — each hour delay increases mortality 7.6%. Cultures before antibiotics but NEVER delay antibiotics for cultures.",
        difficulty: 3,
        competencyDomain: "Patient Care",
      },
    ],
    teachingPoints: [
      "Hour-1 Bundle: Lactate, Cultures, Antibiotics, Fluids, Vasopressors — ALL within 1 hour",
      "Each hour delay in antibiotics increases mortality 7.6% (Kumar et al.)",
      "Norepinephrine is first-line vasopressor (SSC 2021)",
      "Reassess lactate at 2-4 hours — if >2, guide resuscitation to normalize",
      "Corticosteroids (Hydrocortisone 200mg/day) if vasopressor-refractory shock",
    ],
    references: ["Surviving Sepsis Campaign 2021 Guidelines", "Sepsis-3 Consensus Definitions (JAMA 2016)"],
    estimatedTime: 30,
  },
];

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Get personalized training case based on physician's competency profile
 */
export async function getAdaptiveCase(physician: Physician): Promise<TrainingCase> {
  // Find weakest competency domain
  const weakestDomain = physician.competencyProfile.domains
    .sort((a, b) => a.score - b.score)[0];
  
  // Find cases matching the weak domain and appropriate difficulty
  const difficulty = getDifficultyForLevel(physician.level);
  
  let matchingCases = CASE_DATABASE.filter(c => 
    c.competencyDomains.includes(weakestDomain.name) &&
    c.difficulty === difficulty
  );
  
  if (matchingCases.length === 0) {
    matchingCases = CASE_DATABASE.filter(c => c.difficulty === difficulty);
  }
  
  if (matchingCases.length === 0) {
    matchingCases = CASE_DATABASE;
  }
  
  // Select case not recently completed
  const recentCaseIds = physician.learningHistory.slice(-10).map(e => e.topic);
  const freshCases = matchingCases.filter(c => !recentCaseIds.includes(c.id));
  
  const selectedCase = freshCases.length > 0 
    ? freshCases[Math.floor(Math.random() * freshCases.length)]
    : matchingCases[Math.floor(Math.random() * matchingCases.length)];
  
  return { ...selectedCase, adaptedFor: physician.id };
}

/**
 * Assess physician's response and update competency
 */
export async function assessResponse(params: {
  physician: Physician;
  caseId: string;
  answers: { questionId: string; answer: string }[];
  timeSpent: number;
}): Promise<AssessmentResult> {
  const trainingCase = CASE_DATABASE.find(c => c.id === params.caseId) || CASE_DATABASE[0];
  
  let totalCorrect = 0;
  const answerResults = params.answers.map(a => {
    const question = trainingCase.questions.find(q => q.id === a.questionId);
    if (!question) return { questionId: a.questionId, answer: a.answer, correct: false, timeSpent: 0 };
    
    const correct = Array.isArray(question.correctAnswer)
      ? JSON.stringify(question.correctAnswer) === JSON.stringify(a.answer)
      : a.answer.toLowerCase().includes(question.correctAnswer.toLowerCase().slice(0, 20));
    
    if (correct) totalCorrect++;
    
    return {
      questionId: a.questionId,
      answer: a.answer,
      correct,
      timeSpent: Math.round(params.timeSpent / params.answers.length),
    };
  });
  
  const score = Math.round((totalCorrect / params.answers.length) * 100);
  
  // Generate AI feedback
  const feedback = await generateFeedback(params.physician, trainingCase, answerResults, score);
  
  // Calculate competency updates
  const competencyUpdates = trainingCase.competencyDomains.map(domain => ({
    domain,
    change: score >= 80 ? 2 : score >= 60 ? 0 : -1,
  }));
  
  // Determine next recommendation
  const nextRecommendation = score >= 90
    ? "Excellent! Ready for more advanced cases in this domain."
    : score >= 70
      ? "Good performance. Review teaching points and attempt similar case."
      : "Needs improvement. Review the topic fundamentals before next attempt.";
  
  return {
    physicianId: params.physician.id,
    caseId: params.caseId,
    completedAt: new Date().toISOString(),
    score,
    timeSpent: params.timeSpent,
    answers: answerResults,
    feedback,
    competencyUpdates,
    nextRecommendation,
  };
}

/**
 * Detect error patterns from physician's history
 */
export function detectErrorPatterns(physician: Physician): ErrorPattern[] {
  const patterns: ErrorPattern[] = [];
  
  // Analyze learning history for repeated low scores in same domain
  const domainScores: Record<string, number[]> = {};
  
  for (const event of physician.learningHistory) {
    if (event.score !== undefined) {
      if (!domainScores[event.competencyDomain]) {
        domainScores[event.competencyDomain] = [];
      }
      domainScores[event.competencyDomain].push(event.score);
    }
  }
  
  for (const [domain, scores] of Object.entries(domainScores)) {
    const recentScores = scores.slice(-5);
    const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const lowScoreCount = recentScores.filter(s => s < 70).length;
    
    if (lowScoreCount >= 3 || avgScore < 60) {
      patterns.push({
        id: `EP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category: domain,
        description: `Consistent low performance in ${domain} (avg: ${avgScore.toFixed(0)}%)`,
        frequency: lowScoreCount,
        severity: avgScore < 50 ? "high" : "moderate",
        firstDetected: physician.learningHistory[0]?.date || new Date().toISOString(),
        lastOccurrence: physician.learningHistory[physician.learningHistory.length - 1]?.date || new Date().toISOString(),
        trend: recentScores[recentScores.length - 1] > recentScores[0] ? "improving" : "worsening",
        suggestedIntervention: `Focused remediation in ${domain}: structured review + supervised practice`,
        relatedCases: [],
      });
    }
  }
  
  return patterns;
}

/**
 * Generate personalized learning plan
 */
export async function generateLearningPlan(physician: Physician): Promise<LearningPlan> {
  const weakDomains = physician.competencyProfile.domains
    .filter(d => d.score < d.targetScore)
    .sort((a, b) => a.score - b.score);
  
  const goals: LearningGoal[] = weakDomains.slice(0, 3).map((domain, i) => ({
    id: `LG-${i + 1}`,
    domain: domain.name,
    currentLevel: domain.score,
    targetLevel: domain.targetScore,
    deadline: new Date(Date.now() + (i + 1) * 30 * 86400000).toISOString().split("T")[0],
    activities: getActivitiesForDomain(domain.name),
    progress: 0,
  }));
  
  const weeklySchedule: WeeklyPlan[] = Array.from({ length: 4 }, (_, i) => ({
    week: i + 1,
    focus: weakDomains[i % weakDomains.length]?.name || "General Review",
    activities: [
      { type: "Case Simulation", topic: `${weakDomains[i % weakDomains.length]?.name || "General"} case`, duration: 30, resource: "MediLearn Adaptive Cases" },
      { type: "Literature Review", topic: "Latest guidelines update", duration: 20, resource: "MediEvidence" },
      { type: "Peer Discussion", topic: "Complex case review", duration: 15, resource: "MediCollab" },
    ],
    assessment: i === 3 ? "End-of-month competency reassessment" : undefined,
  }));
  
  return {
    physicianId: physician.id,
    generatedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 90 * 86400000).toISOString(),
    goals,
    weeklySchedule,
    estimatedCompletionTime: goals.length * 10,
    priorityAreas: weakDomains.slice(0, 3).map(d => d.name),
    milestones: [
      { description: "Complete initial assessment", targetDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0], status: "pending" },
      { description: "First competency improvement detected", targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0], status: "pending" },
      { description: "All domains at target level", targetDate: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0], status: "pending" },
    ],
  };
}

/**
 * Get CME tracking summary
 */
export function getCMESummary(physician: Physician): {
  totalCredits: number;
  requiredCredits: number;
  creditsThisYear: number;
  expiringCredits: { title: string; credits: number; expiryDate: string }[];
  categoryBreakdown: Record<string, number>;
  complianceStatus: "compliant" | "at_risk" | "non_compliant";
} {
  const totalCredits = physician.cmeCredits.reduce((sum, c) => sum + c.credits, 0);
  const requiredCredits = physician.level === "consultant" ? 50 : physician.level === "attending" ? 40 : 25;
  
  const thisYear = physician.cmeCredits.filter(c => 
    new Date(c.completedDate).getFullYear() === new Date().getFullYear()
  );
  const creditsThisYear = thisYear.reduce((sum, c) => sum + c.credits, 0);
  
  const expiringCredits = physician.cmeCredits
    .filter(c => new Date(c.expiryDate) < new Date(Date.now() + 90 * 86400000))
    .map(c => ({ title: c.title, credits: c.credits, expiryDate: c.expiryDate }));
  
  const categoryBreakdown: Record<string, number> = {};
  for (const cme of physician.cmeCredits) {
    categoryBreakdown[cme.category] = (categoryBreakdown[cme.category] || 0) + cme.credits;
  }
  
  const complianceStatus = creditsThisYear >= requiredCredits ? "compliant" 
    : creditsThisYear >= requiredCredits * 0.7 ? "at_risk" : "non_compliant";
  
  return { totalCredits, requiredCredits, creditsThisYear, expiringCredits, categoryBreakdown, complianceStatus };
}

/**
 * Get a demo physician profile
 */
export function getDemoPhysician(): Physician {
  return {
    id: "PHY-DEMO-001",
    name: "Dr. Ahmad Hassan",
    specialty: "Internal Medicine",
    level: "resident",
    yearsExperience: 3,
    hospital: "Hamad Medical Corporation",
    competencyProfile: {
      overallScore: 74,
      lastAssessed: "2026-05-25",
      domains: [
        { name: "Medical Knowledge", score: 82, trend: "improving", subdomains: [{ name: "Pharmacology", score: 78 }, { name: "Pathophysiology", score: 85 }], lastAssessed: "2026-05-25", targetScore: 85 },
        { name: "Patient Care", score: 78, trend: "stable", subdomains: [{ name: "History Taking", score: 82 }, { name: "Treatment Planning", score: 74 }], lastAssessed: "2026-05-25", targetScore: 80 },
        { name: "Clinical Judgment", score: 65, trend: "improving", subdomains: [{ name: "Risk Stratification", score: 60 }, { name: "Urgency Assessment", score: 70 }], lastAssessed: "2026-05-25", targetScore: 80 },
        { name: "Communication", score: 80, trend: "stable", subdomains: [{ name: "Documentation", score: 82 }, { name: "Handoff", score: 78 }], lastAssessed: "2026-05-25", targetScore: 80 },
        { name: "Systems-Based Practice", score: 70, trend: "stable", subdomains: [{ name: "Patient Safety", score: 72 }, { name: "Quality Improvement", score: 68 }], lastAssessed: "2026-05-25", targetScore: 75 },
        { name: "Professionalism", score: 88, trend: "stable", subdomains: [{ name: "Ethics", score: 90 }, { name: "Accountability", score: 86 }], lastAssessed: "2026-05-25", targetScore: 85 },
      ],
      strengths: ["Strong medical knowledge foundation", "Excellent professionalism", "Good communication skills"],
      areasForImprovement: ["Clinical judgment under pressure", "Risk stratification", "Treatment planning for complex patients"],
      millerLevel: "shows_how",
    },
    learningHistory: [
      { id: "LE-1", date: "2026-05-20", type: "case_simulation", topic: "DKA Management", score: 75, timeSpent: 25, competencyDomain: "Patient Care" },
      { id: "LE-2", date: "2026-05-22", type: "quiz", topic: "Sepsis Bundle", score: 60, timeSpent: 15, competencyDomain: "Clinical Judgment" },
      { id: "LE-3", date: "2026-05-24", type: "case_simulation", topic: "ACS Management", score: 80, timeSpent: 20, competencyDomain: "Clinical Judgment" },
    ],
    errorPatterns: [],
    cmeCredits: [
      { id: "CME-1", title: "Critical Care Update 2026", provider: "SCCM", credits: 10, category: "Category 1", completedDate: "2026-03-15", expiryDate: "2029-03-15", topic: "Critical Care" },
      { id: "CME-2", title: "Diabetes Management Masterclass", provider: "ADA", credits: 8, category: "Category 1", completedDate: "2026-04-01", expiryDate: "2029-04-01", topic: "Endocrinology" },
    ],
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getDifficultyForLevel(level: string): "beginner" | "intermediate" | "advanced" | "expert" {
  switch (level) {
    case "intern": return "beginner";
    case "resident": return "intermediate";
    case "fellow": return "advanced";
    default: return "expert";
  }
}

function getActivitiesForDomain(domain: string): string[] {
  const activities: Record<string, string[]> = {
    "Medical Knowledge": ["Guideline review", "Case-based learning", "Board review questions", "Journal club"],
    "Patient Care": ["Simulated cases", "Supervised procedures", "Patient encounters", "Skills lab"],
    "Clinical Judgment": ["Complex case discussions", "Rapid decision scenarios", "Mortality & morbidity review", "Decision analysis"],
    "Communication": ["Standardized patient encounters", "Documentation review", "Handoff practice", "Breaking bad news simulation"],
    "Systems-Based Practice": ["QI project participation", "Root cause analysis", "Cost-effectiveness analysis", "Health informatics training"],
    "Professionalism": ["Ethics case discussions", "Cultural competency training", "Self-reflection exercises", "Peer feedback"],
  };
  return activities[domain] || ["Self-directed learning", "Mentored practice", "Assessment"];
}

async function generateFeedback(
  physician: Physician,
  trainingCase: TrainingCase,
  answers: { questionId: string; answer: string; correct: boolean; timeSpent: number }[],
  score: number
): Promise<string> {
  const client = getGeminiClient();
  if (!client) {
    return score >= 80 
      ? `Good performance (${score}%). Review teaching points for areas of uncertainty.`
      : `Score: ${score}%. Focus on: ${trainingCase.teachingPoints[0]}. Review the case explanation and attempt again.`;
  }
  
  try {
    const prompt = `You are a medical education AI. Provide brief, constructive feedback (3-4 sentences) for a ${physician.level} in ${physician.specialty}.

Case: ${trainingCase.title}
Score: ${score}%
Correct answers: ${answers.filter(a => a.correct).length}/${answers.length}
Incorrect: ${answers.filter(a => !a.correct).map(a => a.questionId).join(", ")}

Key teaching points: ${trainingCase.teachingPoints.slice(0, 3).join("; ")}

Provide encouraging but specific feedback focusing on clinical reasoning improvement.`;

    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.4 },
    });
    return result.text ?? `Score: ${score}%. Review teaching points and reattempt.`;
  } catch {
    return `Score: ${score}%. ${score >= 80 ? "Well done!" : "Review the teaching points and try again."}`;
  }
}

export { CASE_DATABASE };
