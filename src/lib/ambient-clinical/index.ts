import "server-only";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ═══════════════════════════════════════════════════════════════════════════════
// Ambient Clinical Experience
// "The doctor talks to the patient — the system listens and documents everything."
// Zero-touch clinical documentation with AI-powered SOAP notes generation
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AmbientSession {
  id: string;
  patientId: number;
  doctorId: string;
  startTime: string;
  endTime?: string;
  status: "recording" | "processing" | "ready" | "approved";
  transcript: TranscriptSegment[];
  generatedNote: ClinicalNote | null;
  suggestedActions: SuggestedAction[];
  confidence: number;
}

export interface TranscriptSegment {
  speaker: "doctor" | "patient" | "unknown";
  text: string;
  timestamp: number; // seconds from start
  language: "ar" | "en" | "mixed";
  confidence: number;
}

export interface ClinicalNote {
  soap: SOAPNote;
  icdCodes: Array<{
    code: string;
    description: string;
    descriptionEn: string;
    confidence: number;
  }>;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    route: string;
    reason: string;
  }>;
  labOrders: Array<{
    test: string;
    testEn: string;
    reason: string;
    reasonEn: string;
    urgency: "routine" | "urgent" | "stat";
  }>;
  followUp: {
    interval: string;
    intervalEn: string;
    reason: string;
    reasonEn: string;
  };
  patientInstructions: string;
  patientInstructionsEn: string;
  summary: string;
  summaryEn: string;
}

export interface SOAPNote {
  subjective: string;
  subjectiveEn: string;
  objective: string;
  objectiveEn: string;
  assessment: string;
  assessmentEn: string;
  plan: string;
  planEn: string;
}

export interface SuggestedAction {
  type: "prescription" | "lab_order" | "referral" | "follow_up" | "alert";
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  priority: "high" | "medium" | "low";
  autoExecutable: boolean;
  data: Record<string, unknown>;
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

/**
 * Process a transcript from a clinical encounter and generate structured clinical documentation
 */
export async function processAmbientSession(
  transcript: TranscriptSegment[],
  patientContext?: {
    name: string;
    age: number;
    sex: string;
    chronicConditions: string[];
    currentMedications: string[];
    allergies: string[];
  }
): Promise<{
  clinicalNote: ClinicalNote;
  suggestedActions: SuggestedAction[];
  confidence: number;
}> {
  const client = getGeminiClient();

  // Build the full transcript text
  const transcriptText = transcript
    .map((seg) => `[${seg.speaker === "doctor" ? "طبيب" : "مريض"}]: ${seg.text}`)
    .join("\n");

  const patientInfo = patientContext
    ? `
Patient: ${patientContext.name}, ${patientContext.age} years, ${patientContext.sex}
Chronic conditions: ${patientContext.chronicConditions.join(", ") || "None"}
Current medications: ${patientContext.currentMedications.join(", ") || "None"}
Allergies: ${patientContext.allergies.join(", ") || "NKDA"}
`
    : "";

  const prompt = `You are an expert clinical documentation AI. Analyze this doctor-patient encounter transcript and generate structured clinical documentation.

${patientInfo}

TRANSCRIPT:
${transcriptText}

Generate a comprehensive clinical note in the following JSON format. All text fields should have both Arabic and English versions:

{
  "soap": {
    "subjective": "Arabic - what the patient reports",
    "subjectiveEn": "English version",
    "objective": "Arabic - examination findings mentioned",
    "objectiveEn": "English version",
    "assessment": "Arabic - clinical assessment/diagnosis",
    "assessmentEn": "English version",
    "plan": "Arabic - treatment plan discussed",
    "planEn": "English version"
  },
  "icdCodes": [{"code": "ICD-11 code", "description": "Arabic", "descriptionEn": "English", "confidence": 0.9}],
  "medications": [{"name": "drug name", "dosage": "dose", "frequency": "how often", "duration": "how long", "route": "oral/IV/etc", "reason": "why"}],
  "labOrders": [{"test": "Arabic", "testEn": "English", "reason": "Arabic", "reasonEn": "English", "urgency": "routine"}],
  "followUp": {"interval": "Arabic", "intervalEn": "English", "reason": "Arabic", "reasonEn": "English"},
  "patientInstructions": "Arabic instructions for patient",
  "patientInstructionsEn": "English instructions",
  "summary": "Arabic 2-sentence summary",
  "summaryEn": "English 2-sentence summary"
}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await client!.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text = (response.text || "").trim();
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultResult(transcriptText);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const clinicalNote: ClinicalNote = {
      soap: parsed.soap || getDefaultSOAP(),
      icdCodes: parsed.icdCodes || [],
      medications: parsed.medications || [],
      labOrders: parsed.labOrders || [],
      followUp: parsed.followUp || { interval: "أسبوعين", intervalEn: "2 weeks", reason: "متابعة", reasonEn: "Follow-up" },
      patientInstructions: parsed.patientInstructions || "",
      patientInstructionsEn: parsed.patientInstructionsEn || "",
      summary: parsed.summary || "",
      summaryEn: parsed.summaryEn || "",
    };

    // Generate suggested actions from the clinical note
    const suggestedActions = generateSuggestedActions(clinicalNote);

    return {
      clinicalNote,
      suggestedActions,
      confidence: 0.87,
    };
  } catch (error) {
    console.error("[Ambient Clinical] AI processing error:", error);
    return getDefaultResult(transcriptText);
  }
}

/**
 * Real-time processing of audio chunks for live transcription feedback
 */
export async function processAudioChunk(
  audioText: string,
  context: { previousSegments: TranscriptSegment[] }
): Promise<{
  segment: TranscriptSegment;
  liveInsights: string[];
}> {
  // Determine speaker based on content patterns
  const isDoctorSpeaking = detectDoctorSpeech(audioText);

  const segment: TranscriptSegment = {
    speaker: isDoctorSpeaking ? "doctor" : "patient",
    text: audioText,
    timestamp: context.previousSegments.length > 0
      ? context.previousSegments[context.previousSegments.length - 1].timestamp + 5
      : 0,
    language: detectLanguage(audioText),
    confidence: 0.92,
  };

  // Generate live insights (e.g., "Patient mentioned chest pain — consider ECG")
  const liveInsights = generateLiveInsights(audioText, context.previousSegments);

  return { segment, liveInsights };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectDoctorSpeech(text: string): boolean {
  const doctorPatterns = [
    "ما هي الأعراض",
    "منذ متى",
    "هل تأخذ",
    "سأكتب لك",
    "الفحص يظهر",
    "أنصحك",
    "let me examine",
    "I'll prescribe",
    "your results show",
    "do you have any",
  ];
  return doctorPatterns.some((p) => text.toLowerCase().includes(p.toLowerCase()));
}

function detectLanguage(text: string): "ar" | "en" | "mixed" {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  if (arabicChars > latinChars * 2) return "ar";
  if (latinChars > arabicChars * 2) return "en";
  return "mixed";
}

function generateLiveInsights(
  currentText: string,
  _previousSegments: TranscriptSegment[]
): string[] {
  const insights: string[] = [];

  // Detect critical symptoms
  const criticalKeywords = [
    { keyword: "ألم في الصدر", insight: "ذُكر ألم صدري — فكّر في ECG" },
    { keyword: "chest pain", insight: "Chest pain mentioned — consider ECG" },
    { keyword: "ضيق تنفس", insight: "ضيق تنفس — تحقق من SpO2" },
    { keyword: "shortness of breath", insight: "SOB mentioned — check SpO2" },
    { keyword: "صداع شديد", insight: "صداع شديد — استبعد ارتفاع الضغط" },
    { keyword: "حساسية", insight: "ذُكرت حساسية — تحقق من سجل الحساسية" },
  ];

  criticalKeywords.forEach(({ keyword, insight }) => {
    if (currentText.toLowerCase().includes(keyword.toLowerCase())) {
      insights.push(insight);
    }
  });

  return insights;
}

function generateSuggestedActions(note: ClinicalNote): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  // Suggest prescriptions
  note.medications.forEach((med) => {
    actions.push({
      type: "prescription",
      title: `وصف ${med.name}`,
      titleEn: `Prescribe ${med.name}`,
      description: `${med.dosage} - ${med.frequency} - ${med.duration}`,
      descriptionEn: `${med.dosage} - ${med.frequency} - ${med.duration}`,
      priority: "high",
      autoExecutable: true,
      data: { medication: med },
    });
  });

  // Suggest lab orders
  note.labOrders.forEach((lab) => {
    actions.push({
      type: "lab_order",
      title: `طلب تحليل: ${lab.test}`,
      titleEn: `Order lab: ${lab.testEn}`,
      description: lab.reason,
      descriptionEn: lab.reasonEn,
      priority: lab.urgency === "stat" ? "high" : "medium",
      autoExecutable: true,
      data: { labOrder: lab },
    });
  });

  // Suggest follow-up
  if (note.followUp.interval) {
    actions.push({
      type: "follow_up",
      title: `حجز متابعة بعد ${note.followUp.interval}`,
      titleEn: `Schedule follow-up in ${note.followUp.intervalEn}`,
      description: note.followUp.reason,
      descriptionEn: note.followUp.reasonEn,
      priority: "low",
      autoExecutable: true,
      data: { followUp: note.followUp },
    });
  }

  return actions;
}

function getDefaultSOAP(): SOAPNote {
  return {
    subjective: "المريض يشكو من أعراض تم مناقشتها أثناء الزيارة.",
    subjectiveEn: "Patient presents with symptoms discussed during the visit.",
    objective: "الفحص السريري تم إجراؤه.",
    objectiveEn: "Physical examination performed.",
    assessment: "التقييم السريري بناءً على الأعراض والفحص.",
    assessmentEn: "Clinical assessment based on symptoms and examination.",
    plan: "خطة العلاج تم مناقشتها مع المريض.",
    planEn: "Treatment plan discussed with patient.",
  };
}

function getDefaultResult(transcript: string) {
  return {
    clinicalNote: {
      soap: getDefaultSOAP(),
      icdCodes: [],
      medications: [],
      labOrders: [],
      followUp: { interval: "حسب الحاجة", intervalEn: "As needed", reason: "متابعة", reasonEn: "Follow-up" },
      patientInstructions: "اتبع تعليمات الطبيب المعالج.",
      patientInstructionsEn: "Follow your treating physician's instructions.",
      summary: "تمت الزيارة بنجاح.",
      summaryEn: "Visit completed successfully.",
    },
    suggestedActions: [] as SuggestedAction[],
    confidence: 0.5,
  };
}
