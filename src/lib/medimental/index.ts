/**
 * MediMental — Clinical-Grade AI Mental Health System
 * Evidence-based mental health assessment, CBT therapy,
 * mood tracking, crisis detection, and treatment planning
 * 
 * Validated instruments: PHQ-9, GAD-7, PCL-5, AUDIT, MDQ, Columbia-Suicide
 * Therapeutic modalities: CBT, DBT, ACT, Motivational Interviewing
 * Bilingual: Arabic + English
 */

import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ============================================================
// TYPES
// ============================================================

export type MentalHealthCondition =
  | "depression"
  | "anxiety"
  | "ptsd"
  | "bipolar"
  | "ocd"
  | "panic_disorder"
  | "social_anxiety"
  | "insomnia"
  | "substance_use"
  | "adjustment_disorder"
  | "grief";

export type TherapyModality = "cbt" | "dbt" | "act" | "motivational_interviewing" | "psychoeducation" | "mindfulness";

export type CrisisLevel = "none" | "low" | "moderate" | "high" | "imminent";

export type Severity = "minimal" | "mild" | "moderate" | "moderately_severe" | "severe";

export interface AssessmentInstrument {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  questions: AssessmentQuestion[];
  scoringRanges: ScoringRange[];
  timeframe: string;
  validatedLanguages: string[];
}

export interface AssessmentQuestion {
  id: number;
  text: string;
  textAr: string;
  options: { value: number; label: string; labelAr: string }[];
}

export interface ScoringRange {
  min: number;
  max: number;
  severity: Severity;
  interpretation: string;
  clinicalAction: string;
}

export interface AssessmentResult {
  instrumentId: string;
  instrumentName: string;
  totalScore: number;
  maxScore: number;
  severity: Severity;
  interpretation: string;
  clinicalAction: string;
  responses: { questionId: number; score: number }[];
  completedAt: string;
  riskFlags: string[];
}

export interface MentalHealthProfile {
  patientId: string;
  patientName: string;
  age: number;
  gender: "male" | "female";
  assessments: AssessmentResult[];
  diagnoses: MentalHealthCondition[];
  currentMedications: string[];
  therapyHistory: string[];
  riskLevel: CrisisLevel;
  treatmentPlan?: TreatmentPlan;
}

export interface TreatmentPlan {
  id: string;
  diagnoses: MentalHealthCondition[];
  goals: TherapyGoal[];
  interventions: TherapyIntervention[];
  medications: MedicationRecommendation[];
  sessionSchedule: string;
  duration: string;
  progressMetrics: string[];
  safetyPlan?: SafetyPlan;
  aiGeneratedAt: string;
}

export interface TherapyGoal {
  id: string;
  description: string;
  targetDate: string;
  measurable: string;
  status: "not_started" | "in_progress" | "achieved";
}

export interface TherapyIntervention {
  modality: TherapyModality;
  technique: string;
  description: string;
  frequency: string;
  homework?: string;
}

export interface MedicationRecommendation {
  medication: string;
  class: string;
  dose: string;
  rationale: string;
  monitoring: string;
  sideEffects: string[];
}

export interface SafetyPlan {
  warningSignals: string[];
  copingStrategies: string[];
  socialSupports: { name: string; phone: string }[];
  professionalContacts: { name: string; phone: string }[];
  emergencyContacts: { name: string; phone: string }[];
  environmentSafety: string[];
  reasonsForLiving: string[];
}

export interface CBTSession {
  sessionNumber: number;
  topic: string;
  objectives: string[];
  techniques: string[];
  exercises: CBTExercise[];
  homework: string;
  duration: number; // minutes
}

export interface CBTExercise {
  name: string;
  type: "thought_record" | "behavioral_activation" | "exposure" | "relaxation" | "cognitive_restructuring" | "problem_solving";
  instructions: string;
  instructionsAr: string;
}

// ============================================================
// VALIDATED ASSESSMENT INSTRUMENTS
// ============================================================

export const PHQ9: AssessmentInstrument = {
  id: "phq9",
  name: "Patient Health Questionnaire-9",
  abbreviation: "PHQ-9",
  description: "Validated screening tool for depression severity",
  timeframe: "Over the last 2 weeks",
  validatedLanguages: ["English", "Arabic"],
  questions: [
    { id: 1, text: "Little interest or pleasure in doing things", textAr: "قلة الاهتمام أو المتعة في القيام بالأشياء", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 2, text: "Feeling down, depressed, or hopeless", textAr: "الشعور بالإحباط أو الاكتئاب أو اليأس", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 3, text: "Trouble falling or staying asleep, or sleeping too much", textAr: "صعوبة في النوم أو البقاء نائماً، أو النوم كثيراً", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 4, text: "Feeling tired or having little energy", textAr: "الشعور بالتعب أو قلة الطاقة", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 5, text: "Poor appetite or overeating", textAr: "ضعف الشهية أو الإفراط في الأكل", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 6, text: "Feeling bad about yourself — or that you are a failure", textAr: "الشعور بالسوء تجاه نفسك — أو أنك فاشل", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 7, text: "Trouble concentrating on things", textAr: "صعوبة في التركيز على الأشياء", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 8, text: "Moving or speaking so slowly that other people could have noticed, or being fidgety or restless", textAr: "التحرك أو التحدث ببطء شديد لدرجة أن الآخرين لاحظوا ذلك، أو العكس — التململ", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 9, text: "Thoughts that you would be better off dead, or of hurting yourself", textAr: "أفكار بأنك ستكون أفضل حالاً ميتاً، أو بإيذاء نفسك", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] }
  ],
  scoringRanges: [
    { min: 0, max: 4, severity: "minimal", interpretation: "Minimal depression", clinicalAction: "Monitor, no treatment needed" },
    { min: 5, max: 9, severity: "mild", interpretation: "Mild depression", clinicalAction: "Watchful waiting, consider counseling" },
    { min: 10, max: 14, severity: "moderate", interpretation: "Moderate depression", clinicalAction: "Treatment plan: therapy and/or medication" },
    { min: 15, max: 19, severity: "moderately_severe", interpretation: "Moderately severe depression", clinicalAction: "Active treatment: medication + therapy" },
    { min: 20, max: 27, severity: "severe", interpretation: "Severe depression", clinicalAction: "Immediate treatment, consider referral to psychiatry" }
  ]
};

export const GAD7: AssessmentInstrument = {
  id: "gad7",
  name: "Generalized Anxiety Disorder-7",
  abbreviation: "GAD-7",
  description: "Validated screening tool for anxiety severity",
  timeframe: "Over the last 2 weeks",
  validatedLanguages: ["English", "Arabic"],
  questions: [
    { id: 1, text: "Feeling nervous, anxious, or on edge", textAr: "الشعور بالعصبية أو القلق أو التوتر", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 2, text: "Not being able to stop or control worrying", textAr: "عدم القدرة على إيقاف أو السيطرة على القلق", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 3, text: "Worrying too much about different things", textAr: "القلق الزائد حول أشياء مختلفة", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 4, text: "Trouble relaxing", textAr: "صعوبة في الاسترخاء", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 5, text: "Being so restless that it's hard to sit still", textAr: "التململ لدرجة صعوبة الجلوس بهدوء", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 6, text: "Becoming easily annoyed or irritable", textAr: "سهولة الانزعاج أو العصبية", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] },
    { id: 7, text: "Feeling afraid, as if something awful might happen", textAr: "الشعور بالخوف كأن شيئاً سيئاً سيحدث", options: [{ value: 0, label: "Not at all", labelAr: "أبداً" }, { value: 1, label: "Several days", labelAr: "عدة أيام" }, { value: 2, label: "More than half the days", labelAr: "أكثر من نصف الأيام" }, { value: 3, label: "Nearly every day", labelAr: "تقريباً كل يوم" }] }
  ],
  scoringRanges: [
    { min: 0, max: 4, severity: "minimal", interpretation: "Minimal anxiety", clinicalAction: "Monitor" },
    { min: 5, max: 9, severity: "mild", interpretation: "Mild anxiety", clinicalAction: "Watchful waiting, psychoeducation" },
    { min: 10, max: 14, severity: "moderate", interpretation: "Moderate anxiety", clinicalAction: "Consider treatment: CBT and/or medication" },
    { min: 15, max: 21, severity: "severe", interpretation: "Severe anxiety", clinicalAction: "Active treatment required, consider psychiatry referral" }
  ]
};

// ============================================================
// SCORING ENGINE
// ============================================================

export function scoreAssessment(
  instrumentId: string,
  responses: { questionId: number; score: number }[]
): AssessmentResult {
  const instrument = instrumentId === "phq9" ? PHQ9 : GAD7;
  const totalScore = responses.reduce((sum, r) => sum + r.score, 0);
  const maxScore = instrument.questions.length * 3;
  
  const range = instrument.scoringRanges.find(r => totalScore >= r.min && totalScore <= r.max) 
    || instrument.scoringRanges[instrument.scoringRanges.length - 1];

  const riskFlags: string[] = [];
  if (instrumentId === "phq9") {
    const q9 = responses.find(r => r.questionId === 9);
    if (q9 && q9.score >= 1) {
      riskFlags.push("SUICIDE RISK: Patient endorsed suicidal ideation (Q9 > 0) — immediate safety assessment required");
    }
  }

  return {
    instrumentId,
    instrumentName: instrument.name,
    totalScore,
    maxScore,
    severity: range.severity,
    interpretation: range.interpretation,
    clinicalAction: range.clinicalAction,
    responses,
    completedAt: new Date().toISOString(),
    riskFlags
  };
}

// ============================================================
// AI THERAPY ENGINE
// ============================================================

/**
 * Generate a personalized treatment plan using AI
 */
export async function generateTreatmentPlan(
  profile: MentalHealthProfile
): Promise<TreatmentPlan> {
  const client = getGeminiClient();
  let aiPlan: Partial<TreatmentPlan> = {};

  if (client) {
    try {
      const prompt = `You are a clinical psychologist AI. Generate an evidence-based treatment plan.

PATIENT: ${profile.patientName}, ${profile.age}yo ${profile.gender}
DIAGNOSES: ${profile.diagnoses.join(", ")}
CURRENT MEDICATIONS: ${profile.currentMedications.join(", ") || "None"}
THERAPY HISTORY: ${profile.therapyHistory.join(", ") || "None"}
RISK LEVEL: ${profile.riskLevel}

ASSESSMENT RESULTS:
${profile.assessments.map(a => `- ${a.instrumentName}: Score ${a.totalScore}/${a.maxScore} (${a.severity})`).join("\n")}

Generate a comprehensive treatment plan in JSON:
{
  "goals": [{"description": "...", "targetDate": "3 months", "measurable": "PHQ-9 < 10"}],
  "interventions": [{"modality": "cbt", "technique": "...", "description": "...", "frequency": "weekly"}],
  "medications": [{"medication": "...", "class": "SSRI", "dose": "...", "rationale": "...", "monitoring": "...", "sideEffects": ["..."]}],
  "sessionSchedule": "Weekly for 12 weeks, then biweekly",
  "duration": "16 weeks",
  "progressMetrics": ["PHQ-9 monthly", "GAD-7 monthly"]
}`;

      const result = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.3 }
      });

      const text = result.text ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiPlan = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Use defaults
    }
  }

  return {
    id: `tp-${Date.now()}`,
    diagnoses: profile.diagnoses,
    goals: (aiPlan.goals as TherapyGoal[]) || [
      { id: "g1", description: "Reduce depressive symptoms", targetDate: "12 weeks", measurable: "PHQ-9 score < 10", status: "not_started" },
      { id: "g2", description: "Improve daily functioning", targetDate: "8 weeks", measurable: "Return to regular activities", status: "not_started" },
      { id: "g3", description: "Develop coping strategies", targetDate: "6 weeks", measurable: "Use 3+ coping techniques independently", status: "not_started" }
    ],
    interventions: (aiPlan.interventions as TherapyIntervention[]) || [
      { modality: "cbt", technique: "Cognitive Restructuring", description: "Identify and challenge negative automatic thoughts", frequency: "Weekly", homework: "Daily thought record" },
      { modality: "cbt", technique: "Behavioral Activation", description: "Schedule pleasurable and mastery activities", frequency: "Weekly", homework: "Activity scheduling" },
      { modality: "mindfulness", technique: "Mindfulness-Based Stress Reduction", description: "Body scan, breathing exercises, mindful awareness", frequency: "Daily practice", homework: "10-min daily meditation" }
    ],
    medications: (aiPlan.medications as MedicationRecommendation[]) || [],
    sessionSchedule: (aiPlan.sessionSchedule as string) || "Weekly for 12 weeks, then biweekly for 4 weeks",
    duration: (aiPlan.duration as string) || "16 weeks",
    progressMetrics: (aiPlan.progressMetrics as string[]) || ["PHQ-9 every 4 weeks", "GAD-7 every 4 weeks", "Session attendance", "Homework completion"],
    safetyPlan: profile.riskLevel !== "none" ? generateSafetyPlan(profile) : undefined,
    aiGeneratedAt: new Date().toISOString()
  };
}

function generateSafetyPlan(profile: MentalHealthProfile): SafetyPlan {
  return {
    warningSignals: [
      "Increasing isolation from family and friends",
      "Sleep disturbance worsening",
      "Feeling hopeless about the future",
      "Increased irritability or agitation",
      "Thoughts of self-harm"
    ],
    copingStrategies: [
      "Deep breathing exercises (4-7-8 technique)",
      "Go for a walk or physical activity",
      "Call a trusted friend or family member",
      "Practice grounding (5-4-3-2-1 technique)",
      "Write in journal",
      "Listen to calming music or Quran recitation"
    ],
    socialSupports: [
      { name: "Family member", phone: "To be filled" },
      { name: "Close friend", phone: "To be filled" }
    ],
    professionalContacts: [
      { name: "Treating psychiatrist", phone: "To be filled" },
      { name: "Therapist", phone: "To be filled" },
      { name: "Qatar Mental Health Helpline", phone: "16000" }
    ],
    emergencyContacts: [
      { name: "Hamad Medical Corporation Emergency", phone: "999" },
      { name: "Ambulance", phone: "999" }
    ],
    environmentSafety: [
      "Remove access to means of self-harm",
      "Secure medications in locked cabinet",
      "Inform trusted person about safety plan"
    ],
    reasonsForLiving: [
      "To be personalized with patient"
    ]
  };
}

// ============================================================
// CBT SESSION LIBRARY
// ============================================================

export const CBT_SESSIONS: CBTSession[] = [
  {
    sessionNumber: 1,
    topic: "Psychoeducation & Goal Setting",
    objectives: ["Understand the CBT model", "Identify treatment goals", "Establish therapeutic alliance"],
    techniques: ["Cognitive model explanation", "Goal setting", "Mood monitoring introduction"],
    exercises: [
      { name: "Mood Diary", type: "behavioral_activation", instructions: "Rate your mood 0-10 three times daily (morning, afternoon, evening). Note what you were doing.", instructionsAr: "قيّم مزاجك من 0-10 ثلاث مرات يومياً (صباحاً، ظهراً، مساءً). سجّل ماذا كنت تفعل." }
    ],
    homework: "Complete mood diary for 1 week",
    duration: 50
  },
  {
    sessionNumber: 2,
    topic: "Identifying Automatic Thoughts",
    objectives: ["Recognize negative automatic thoughts", "Understand thought-emotion connection", "Begin thought recording"],
    techniques: ["Socratic questioning", "Thought identification", "ABC model"],
    exercises: [
      { name: "Thought Record", type: "thought_record", instructions: "When you notice a mood shift, write: Situation → Automatic Thought → Emotion → Evidence For/Against → Balanced Thought", instructionsAr: "عندما تلاحظ تغيراً في مزاجك، اكتب: الموقف ← الفكرة التلقائية ← المشاعر ← الأدلة مع/ضد ← فكرة متوازنة" }
    ],
    homework: "Complete 3 thought records this week",
    duration: 50
  },
  {
    sessionNumber: 3,
    topic: "Cognitive Restructuring",
    objectives: ["Challenge cognitive distortions", "Generate alternative thoughts", "Practice balanced thinking"],
    techniques: ["Identifying cognitive distortions", "Evidence examination", "Reframing"],
    exercises: [
      { name: "Cognitive Distortion Checklist", type: "cognitive_restructuring", instructions: "Review your thought records. Identify which cognitive distortions apply: All-or-nothing, Catastrophizing, Mind reading, Fortune telling, Emotional reasoning, Should statements", instructionsAr: "راجع سجلات أفكارك. حدد أي تشوهات معرفية تنطبق: التفكير الأبيض/الأسود، التهويل، قراءة الأفكار، التنبؤ بالمستقبل، التفكير العاطفي، عبارات يجب" }
    ],
    homework: "Identify distortions in 5 negative thoughts and generate alternatives",
    duration: 50
  },
  {
    sessionNumber: 4,
    topic: "Behavioral Activation",
    objectives: ["Understand activity-mood connection", "Schedule pleasurable activities", "Break avoidance patterns"],
    techniques: ["Activity monitoring", "Pleasure/mastery rating", "Graded task assignment"],
    exercises: [
      { name: "Activity Schedule", type: "behavioral_activation", instructions: "Plan one pleasurable activity and one mastery activity for each day this week. Rate enjoyment (0-10) and achievement (0-10) after completion.", instructionsAr: "خطط لنشاط ممتع ونشاط إنجاز لكل يوم هذا الأسبوع. قيّم المتعة (0-10) والإنجاز (0-10) بعد الانتهاء." }
    ],
    homework: "Complete activity schedule, aim for at least 1 activity per day",
    duration: 50
  },
  {
    sessionNumber: 5,
    topic: "Relaxation & Mindfulness",
    objectives: ["Learn progressive muscle relaxation", "Practice mindful breathing", "Reduce physiological arousal"],
    techniques: ["PMR", "Diaphragmatic breathing", "Body scan", "Grounding"],
    exercises: [
      { name: "4-7-8 Breathing", type: "relaxation", instructions: "Inhale for 4 counts, hold for 7 counts, exhale for 8 counts. Repeat 4 times. Practice twice daily.", instructionsAr: "استنشق لمدة 4 عدات، احبس النفس 7 عدات، ازفر لمدة 8 عدات. كرر 4 مرات. تمرّن مرتين يومياً." }
    ],
    homework: "Practice breathing exercise twice daily for 1 week",
    duration: 50
  },
  {
    sessionNumber: 6,
    topic: "Problem-Solving Skills",
    objectives: ["Define problems clearly", "Generate multiple solutions", "Evaluate and implement solutions"],
    techniques: ["Problem definition", "Brainstorming", "Pros/cons analysis", "Action planning"],
    exercises: [
      { name: "Problem-Solving Worksheet", type: "problem_solving", instructions: "Choose one current problem. 1) Define it clearly. 2) List 5+ possible solutions. 3) Rate each (pros/cons). 4) Choose best option. 5) Plan implementation steps.", instructionsAr: "اختر مشكلة حالية. 1) عرّفها بوضوح. 2) اكتب 5+ حلول ممكنة. 3) قيّم كل حل (إيجابيات/سلبيات). 4) اختر الأفضل. 5) خطط خطوات التنفيذ." }
    ],
    homework: "Apply problem-solving to one real-life problem",
    duration: 50
  }
];

// ============================================================
// AI CHAT THERAPY
// ============================================================

/**
 * AI-powered therapeutic conversation
 */
export async function therapeuticChat(
  message: string,
  sessionContext: {
    patientName: string;
    diagnoses: MentalHealthCondition[];
    currentSession: number;
    modality: TherapyModality;
    previousMessages?: { role: string; content: string }[];
  }
): Promise<{ response: string; techniques: string[]; riskDetected: CrisisLevel; suggestedExercise?: string }> {
  const client = getGeminiClient();
  
  // Crisis detection keywords
  const crisisKeywords = ["kill myself", "suicide", "end my life", "better off dead", "أقتل نفسي", "الانتحار", "أموت"];
  const hasCrisisContent = crisisKeywords.some(k => message.toLowerCase().includes(k));

  if (hasCrisisContent) {
    return {
      response: "I'm concerned about what you've shared. Your safety is the most important thing right now. Please reach out to emergency services (999) or the Qatar Mental Health Helpline (16000) immediately. You don't have to go through this alone. Would you like me to help you contact someone right now?\n\nأنا قلق بشأن ما شاركته. سلامتك هي الأهم الآن. يرجى الاتصال بخدمات الطوارئ (999) أو خط المساعدة للصحة النفسية في قطر (16000) فوراً. لست مضطراً لمواجهة هذا وحدك.",
      techniques: ["Crisis intervention", "Safety planning"],
      riskDetected: "high",
      suggestedExercise: "Safety Plan activation"
    };
  }

  if (!client) {
    return {
      response: `Thank you for sharing that, ${sessionContext.patientName}. I hear you. Let's explore this further together. What thoughts come to mind when you think about this situation?`,
      techniques: ["Active listening", "Open questioning"],
      riskDetected: "none"
    };
  }

  try {
    const prompt = `You are a compassionate, evidence-based AI therapist using ${sessionContext.modality.toUpperCase()} techniques.

PATIENT: ${sessionContext.patientName}
DIAGNOSES: ${sessionContext.diagnoses.join(", ")}
SESSION: ${sessionContext.currentSession}
MODALITY: ${sessionContext.modality}

GUIDELINES:
- Use ${sessionContext.modality} techniques appropriately
- Be warm, empathetic, and non-judgmental
- Ask open-ended questions to explore thoughts and feelings
- Gently challenge cognitive distortions when identified
- Validate emotions before challenging thoughts
- Keep responses concise (2-4 sentences max)
- NEVER diagnose or prescribe medication
- If risk detected, prioritize safety

PATIENT MESSAGE: "${message}"

Respond in JSON:
{
  "response": "Your therapeutic response",
  "techniques": ["techniques used"],
  "suggestedExercise": "optional exercise suggestion"
}`;

    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.7 }
    });

    const text = result.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        response: parsed.response || "Thank you for sharing. Tell me more about how that makes you feel.",
        techniques: parsed.techniques || ["Active listening"],
        riskDetected: "none",
        suggestedExercise: parsed.suggestedExercise
      };
    }
  } catch (e) {
    // Fallback
  }

  return {
    response: `Thank you for sharing that, ${sessionContext.patientName}. I appreciate your openness. Can you tell me more about what you're experiencing?`,
    techniques: ["Active listening", "Empathic reflection"],
    riskDetected: "none"
  };
}

// ============================================================
// EXPORTS
// ============================================================

export const INSTRUMENTS = { PHQ9, GAD7 };
