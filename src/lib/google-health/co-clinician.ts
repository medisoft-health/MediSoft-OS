import "server-only";

/**
 * AI Co-Clinician (AMIE-inspired) — Pre-visit Patient History System
 *
 * Implements an AI-powered conversational agent that:
 * - Conducts structured pre-visit interviews with patients
 * - Collects comprehensive medical history before the appointment
 * - Generates a pre-visit summary for the physician
 * - Asks follow-up questions based on symptoms and risk factors
 * - Supports multiple languages (Arabic, English)
 *
 * Inspired by Google's AMIE (Articulate Medical Intelligence Explorer).
 * Uses Gemini/MedGemma for natural language understanding and generation.
 *
 * @see https://research.google/blog/amie-a-research-ai-system-for-diagnostic-medical-reasoning/
 */

import { getGeminiClient, GEMINI_MODEL, isGeminiConfigured } from "@/lib/ai/gemini";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PreVisitSession {
  id: string;
  patientId: string;
  appointmentId?: string;
  status: "in_progress" | "completed" | "abandoned";
  language: "en" | "ar";
  startedAt: string;
  completedAt?: string;
  messages: ConversationMessage[];
  collectedData: CollectedHistoryData;
  summary?: PreVisitSummary;
}

export interface ConversationMessage {
  role: "system" | "assistant" | "patient";
  content: string;
  timestamp: string;
  metadata?: {
    category?: string;
    extractedData?: Record<string, unknown>;
  };
}

export interface CollectedHistoryData {
  chiefComplaint?: string;
  symptomDetails?: {
    onset: string;
    duration: string;
    severity: string;
    character: string;
    aggravatingFactors: string[];
    relievingFactors: string[];
    associatedSymptoms: string[];
  };
  pastMedicalHistory?: string[];
  currentMedications?: Array<{
    name: string;
    dose: string;
    frequency: string;
    reason: string;
  }>;
  allergies?: Array<{
    substance: string;
    reaction: string;
    severity: string;
  }>;
  familyHistory?: string[];
  socialHistory?: {
    smoking: string;
    alcohol: string;
    exercise: string;
    occupation: string;
    diet: string;
  };
  reviewOfSystems?: Record<string, string[]>;
  vitalsConcerns?: string[];
}

export interface PreVisitSummary {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pertinentPositives: string[];
  pertinentNegatives: string[];
  riskFactors: string[];
  suggestedDifferentials: string[];
  recommendedExams: string[];
  recommendedTests: string[];
  urgencyLevel: "routine" | "semi-urgent" | "urgent" | "emergency";
  completenessScore: number; // 0-100
  physicianNotes: string;
}

// ─── System Prompts ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT_EN = `You are MediSoft AI Co-Clinician, an empathetic and thorough medical history-taking assistant. You are conducting a pre-visit interview with a patient before their doctor's appointment.

YOUR ROLE:
- Collect comprehensive medical history in a conversational, patient-friendly manner
- Ask one question at a time, building on previous answers
- Use clear, simple language (avoid medical jargon with patients)
- Show empathy and understanding
- Be thorough but efficient — don't repeat questions already answered

INTERVIEW STRUCTURE (follow this order):
1. Chief Complaint — What brings you in today?
2. History of Present Illness — OPQRST (Onset, Provocation, Quality, Region, Severity, Timing)
3. Past Medical History — Previous conditions, surgeries, hospitalizations
4. Medications — Current medications, doses, compliance
5. Allergies — Drug allergies, food allergies, environmental
6. Family History — Relevant family conditions
7. Social History — Smoking, alcohol, exercise, occupation
8. Review of Systems — Brief systematic review based on chief complaint

RULES:
- Ask ONE question at a time
- Acknowledge the patient's response before asking the next question
- If the patient seems distressed, offer reassurance
- If a response suggests urgency, flag it immediately
- After collecting sufficient information, generate a summary
- Always end by asking "Is there anything else you'd like the doctor to know?"

Respond ONLY with your next question or acknowledgment. Do NOT provide diagnoses.`;

const SYSTEM_PROMPT_AR = `أنت مساعد MediSoft الذكي لأخذ التاريخ المرضي. أنت تجري مقابلة مع المريض قبل موعده مع الطبيب.

دورك:
- جمع التاريخ المرضي الشامل بطريقة محادثة ودية
- اسأل سؤال واحد في كل مرة
- استخدم لغة بسيطة وواضحة
- أظهر التعاطف والتفهم
- كن شاملاً لكن فعالاً

ترتيب المقابلة:
1. الشكوى الرئيسية — ما الذي أتى بك اليوم؟
2. تاريخ المرض الحالي — متى بدأ، كيف، أين، شدته
3. التاريخ المرضي السابق — أمراض سابقة، عمليات
4. الأدوية الحالية
5. الحساسية
6. التاريخ العائلي
7. التاريخ الاجتماعي
8. مراجعة الأجهزة

القواعد:
- اسأل سؤال واحد فقط في كل مرة
- اعترف بإجابة المريض قبل السؤال التالي
- لا تقدم تشخيصات
- في النهاية اسأل "هل هناك شيء آخر تريد أن يعرفه الطبيب؟"`;

// ─── Conversation Engine ─────────────────────────────────────────────────────

export async function startPreVisitSession(
  patientId: string,
  language: "en" | "ar" = "en",
  existingHistory?: string,
): Promise<PreVisitSession> {
  const sessionId = `pv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const systemMessage: ConversationMessage = {
    role: "system",
    content: language === "ar" ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_EN,
    timestamp: new Date().toISOString(),
  };

  // Generate initial greeting
  const greeting = await generateResponse(
    [systemMessage],
    language,
    existingHistory,
  );

  const assistantMessage: ConversationMessage = {
    role: "assistant",
    content: greeting,
    timestamp: new Date().toISOString(),
    metadata: { category: "greeting" },
  };

  return {
    id: sessionId,
    patientId,
    status: "in_progress",
    language,
    startedAt: new Date().toISOString(),
    messages: [systemMessage, assistantMessage],
    collectedData: {},
  };
}

export async function processPatientMessage(
  session: PreVisitSession,
  patientMessage: string,
): Promise<{ response: string; session: PreVisitSession; isComplete: boolean }> {
  // Add patient message
  const newPatientMsg: ConversationMessage = {
    role: "patient",
    content: patientMessage,
    timestamp: new Date().toISOString(),
  };

  const updatedMessages = [...session.messages, newPatientMsg];

  // Check if interview is complete
  const patientMsgCount = updatedMessages.filter((m) => m.role === "patient").length;
  const isComplete = patientMsgCount >= 12 || patientMessage.toLowerCase().includes("no, that's all") || patientMessage.includes("لا، هذا كل شيء");

  // Generate AI response
  const response = await generateResponse(
    updatedMessages,
    session.language,
    undefined,
    isComplete,
  );

  const assistantMsg: ConversationMessage = {
    role: "assistant",
    content: response,
    timestamp: new Date().toISOString(),
    metadata: { category: getCategoryFromCount(patientMsgCount) },
  };

  const updatedSession: PreVisitSession = {
    ...session,
    messages: [...updatedMessages, assistantMsg],
    status: isComplete ? "completed" : "in_progress",
    completedAt: isComplete ? new Date().toISOString() : undefined,
  };

  // If complete, generate summary
  if (isComplete) {
    updatedSession.summary = await generatePreVisitSummary(updatedSession);
    updatedSession.collectedData = await extractCollectedData(updatedSession);
  }

  return { response, session: updatedSession, isComplete };
}

// ─── AI Response Generation ──────────────────────────────────────────────────

async function generateResponse(
  messages: ConversationMessage[],
  language: "en" | "ar",
  existingHistory?: string,
  isComplete?: boolean,
): Promise<string> {
  if (!isGeminiConfigured()) {
    return language === "ar"
      ? "مرحباً! أنا مساعد MediSoft. ما الذي أتى بك اليوم؟"
      : "Hello! I'm the MediSoft AI assistant. What brings you in today?";
  }

  const client = getGeminiClient();
  if (!client) {
    return language === "ar"
      ? "مرحباً! كيف يمكنني مساعدتك؟"
      : "Hello! How can I help you today?";
  }

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "patient" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find((m) => m.role === "system")?.content || "";
  const additionalContext = existingHistory
    ? `\n\nPATIENT'S EXISTING MEDICAL HISTORY:\n${existingHistory}\n\nUse this to ask more targeted questions and avoid redundancy.`
    : "";

  const completionInstruction = isComplete
    ? `\n\nThe interview is now complete. Thank the patient and let them know their doctor will review this information before the appointment.`
    : "";

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "Start the interview" }] }],
      config: {
        systemInstruction: systemInstruction + additionalContext + completionInstruction,
        temperature: 0.7,
      },
    });

    return response.text || (language === "ar" ? "هل يمكنك إخباري المزيد؟" : "Could you tell me more?");
  } catch (err) {
    console.error("[co-clinician.generateResponse] Error:", err);
    return language === "ar"
      ? "عذراً، حدث خطأ. هل يمكنك تكرار ذلك؟"
      : "I'm sorry, there was an issue. Could you repeat that?";
  }
}

// ─── Summary Generation ──────────────────────────────────────────────────────

async function generatePreVisitSummary(
  session: PreVisitSession,
): Promise<PreVisitSummary> {
  if (!isGeminiConfigured()) {
    return getDefaultSummary();
  }

  const client = getGeminiClient();
  if (!client) return getDefaultSummary();

  const conversationText = session.messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "assistant" ? "AI" : "Patient"}: ${m.content}`)
    .join("\n");

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: "You are a medical AI assistant. Generate structured clinical summaries from patient interviews.",
        temperature: 0.3,
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Based on this pre-visit interview, generate a structured clinical summary for the physician.

INTERVIEW TRANSCRIPT:
${conversationText}

Generate a JSON response with this exact structure:
{
  "chiefComplaint": "brief chief complaint",
  "historyOfPresentIllness": "detailed HPI paragraph",
  "pertinentPositives": ["positive finding 1", "positive finding 2"],
  "pertinentNegatives": ["negative finding 1", "negative finding 2"],
  "riskFactors": ["risk factor 1", "risk factor 2"],
  "suggestedDifferentials": ["diagnosis 1", "diagnosis 2", "diagnosis 3"],
  "recommendedExams": ["exam 1", "exam 2"],
  "recommendedTests": ["test 1", "test 2"],
  "urgencyLevel": "routine|semi-urgent|urgent|emergency",
  "completenessScore": 0-100,
  "physicianNotes": "key points for the physician to address"
}`,
            },
          ],
        },
      ],
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as PreVisitSummary;
    }
  } catch (err) {
    console.error("[co-clinician.generateSummary] Error:", err);
  }

  return getDefaultSummary();
}

async function extractCollectedData(
  session: PreVisitSession,
): Promise<CollectedHistoryData> {
  if (!isGeminiConfigured()) return {};

  const client = getGeminiClient();
  if (!client) return {};

  const conversationText = session.messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "assistant" ? "AI" : "Patient"}: ${m.content}`)
    .join("\n");

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: "You are a medical data extraction AI. Extract structured medical history data from patient interviews.",
        temperature: 0.2,
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Extract structured medical history data from this interview transcript.

TRANSCRIPT:
${conversationText}

Extract and return as JSON:
{
  "chiefComplaint": "main complaint",
  "symptomDetails": {
    "onset": "when it started",
    "duration": "how long",
    "severity": "1-10 or description",
    "character": "type of symptom",
    "aggravatingFactors": [],
    "relievingFactors": [],
    "associatedSymptoms": []
  },
  "pastMedicalHistory": [],
  "currentMedications": [{"name": "", "dose": "", "frequency": "", "reason": ""}],
  "allergies": [{"substance": "", "reaction": "", "severity": ""}],
  "familyHistory": [],
  "socialHistory": {"smoking": "", "alcohol": "", "exercise": "", "occupation": "", "diet": ""},
  "reviewOfSystems": {},
  "vitalsConcerns": []
}

Only include fields that were actually discussed. Use null for unknown fields.`,
            },
          ],
        },
      ],
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as CollectedHistoryData;
    }
  } catch (err) {
    console.error("[co-clinician.extractData] Error:", err);
  }

  return {};
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryFromCount(count: number): string {
  if (count <= 1) return "chief_complaint";
  if (count <= 3) return "hpi";
  if (count <= 5) return "past_medical_history";
  if (count <= 7) return "medications_allergies";
  if (count <= 9) return "family_social_history";
  return "review_of_systems";
}

function getDefaultSummary(): PreVisitSummary {
  return {
    chiefComplaint: "Not available",
    historyOfPresentIllness: "Pre-visit interview data could not be processed.",
    pertinentPositives: [],
    pertinentNegatives: [],
    riskFactors: [],
    suggestedDifferentials: [],
    recommendedExams: [],
    recommendedTests: [],
    urgencyLevel: "routine",
    completenessScore: 0,
    physicianNotes: "AI summary generation failed. Please conduct manual history.",
  };
}
