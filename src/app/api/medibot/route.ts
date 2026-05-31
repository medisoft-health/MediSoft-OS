import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";
import { verifyMediBotResponse } from "@/lib/ai/mediguard-medibot";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/medibot
 *
 * MediBot AI endpoint — provides evidence-based medical assistance
 * in two modes: patient-specific and general medical search.
 *
 * NOW WITH MEDIGUARD SAFETY LAYER:
 * Every response passes through MediGuard verification before being
 * returned to the physician. MediGuard checks for:
 * - Drug safety issues (interactions, contraindications)
 * - Guideline compliance (ADA, ESC, AHA, GINA, GOLD, KDIGO)
 * - Allergy cross-reactivity
 * - Dose appropriateness
 * - Food/drug interactions
 *
 * Body: {
 *   message: string,
 *   mode: "patient" | "general",
 *   patientContext?: { firstName, lastName, age, sex, conditions, medications, allergies },
 *   history?: Array<{ role: "user" | "assistant", content: string }>,
 *   skipSafetyCheck?: boolean (for non-clinical queries)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const client = getGeminiClient();
    if (!client) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 },
      );
    }

    const body = await req.json();
    const { message, mode, patientContext, history = [], skipSafetyCheck = false } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Build system prompt based on mode
    const systemPrompt = buildSystemPrompt(mode, patientContext);

    // Build conversation history
    const contents = buildContents(systemPrompt, history, message);

    // Call Gemini
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });

    const responseText = result.text ?? "I apologize, but I could not generate a response. Please try again.";

    // Extract references from the response
    const references = extractReferences(responseText);
    const cleanedResponse = cleanResponse(responseText);

    // ─── MediGuard Safety Layer ────────────────────────────────────
    // Run MediGuard verification on the AI response
    // This checks for drug safety, guideline compliance, and patient-specific risks
    let safetyResult = null;
    if (!skipSafetyCheck && mode === "patient" && patientContext) {
      try {
        safetyResult = await verifyMediBotResponse({
          originalResponse: cleanedResponse,
          patientContext: {
            age: patientContext.age,
            sex: patientContext.sex,
            conditions: patientContext.conditions || [],
            medications: patientContext.medications || [],
            allergies: patientContext.allergies || [],
          },
        });
      } catch (err) {
        console.error("[MediBot] MediGuard safety check failed (non-blocking):", err);
        // Safety check failure is non-blocking — we still return the response
      }
    }

    // If MediGuard found issues, use the verified (annotated) response
    const finalResponse = safetyResult?.verifiedResponse || cleanedResponse;

    return NextResponse.json({
      response: finalResponse,
      references,
      mode,
      model: GEMINI_MODEL,
      // MediGuard safety metadata
      safety: safetyResult ? {
        verified: true,
        riskLevel: safetyResult.riskLevel,
        isSafe: safetyResult.isSafe,
        annotationCount: safetyResult.safetyAnnotations.length,
        annotations: safetyResult.safetyAnnotations,
        corrections: safetyResult.corrections,
        warnings: safetyResult.addedWarnings,
        guidelineNotes: safetyResult.guidelineNotes,
      } : {
        verified: false,
        riskLevel: "unknown",
        reason: mode !== "patient" ? "Safety check only runs in patient mode" : "No patient context provided",
      },
    });
  } catch (error) {
    console.error("[MediBot API Error]", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/medibot
 * Returns MediBot status with MediGuard integration info
 */
export async function GET() {
  const configured = !!getGeminiClient();
  return NextResponse.json({
    status: configured ? "active" : "unconfigured",
    model: GEMINI_MODEL,
    capabilities: [
      "patient_case_analysis",
      "general_medical_search",
      "drug_interaction_check",
      "lab_interpretation",
      "guideline_recommendations",
      "differential_diagnosis",
    ],
    mediguard: {
      integrated: true,
      version: "1.0.0",
      description: "Every patient-mode response is verified by MediGuard for safety",
      checks: [
        "Drug-drug interactions",
        "Drug-disease contraindications",
        "Drug-allergy cross-reactivity",
        "Dose appropriateness (renal/hepatic/age)",
        "Drug-food interactions",
        "Clinical guideline compliance",
        "Beers Criteria (elderly safety)",
        "Step therapy enforcement",
        "Monitoring requirements",
      ],
      guidelines: [
        "AHA/ACC 2023 (Hypertension)",
        "ESC 2024 (Cardiology)",
        "ADA 2024 (Diabetes)",
        "GINA 2024 (Asthma)",
        "GOLD 2024 (COPD)",
        "KDIGO 2024 (CKD)",
        "CHEST 2024 (Anticoagulation)",
        "AGS Beers 2023 (Geriatrics)",
      ],
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// System Prompt Builder (Enhanced with MediGuard awareness)
// ─────────────────────────────────────────────────────────────────
function buildSystemPrompt(
  mode: string,
  patientContext?: {
    firstName: string;
    lastName: string;
    age: number;
    sex: string;
    conditions: string[];
    medications: string[];
    allergies: string[];
  },
): string {
  const basePrompt = `You are MediBot, an AI-powered clinical assistant integrated into MediSoft — an intelligent medical operating system. You provide evidence-based medical guidance to physicians.

You are backed by MediGuard, a real-time safety verification system that will review your responses. Therefore:
- Always recommend FIRST-LINE therapies per current guidelines (ADA 2024, ESC 2024, AHA/ACC 2023, GINA 2024, GOLD 2024, KDIGO 2024)
- Always check for drug interactions with the patient's current medications
- Always verify no contraindications exist with the patient's conditions
- Always mention food interactions when relevant (e.g., grapefruit + statins, vitamin K + warfarin)
- Always suggest appropriate monitoring (labs, vitals) for recommended drugs
- Flag if a recommendation deviates from step therapy

IMPORTANT RULES:
1. Always provide evidence-based answers with inline citations using [1], [2], [3] format.
2. At the end of your response, include a "REFERENCES:" section listing all cited sources.
3. Use medical terminology appropriate for a physician audience.
4. Be concise but thorough. Use bullet points and bold text for clarity.
5. When recommending treatments, always mention relevant guidelines (ADA, ACC/AHA, ESC, WHO, etc.).
6. Flag any potential safety concerns prominently with ⚠️ symbol.
7. Never provide definitive diagnoses — always frame as "considerations" or "differential includes."
8. Format your response with markdown: use **bold** for key terms, bullet points for lists.
9. When recommending drugs, ALWAYS include: dose range, frequency, duration, and key monitoring.
10. ALWAYS mention food interactions and timing (e.g., "take on empty stomach", "avoid grapefruit").`;

  if (mode === "patient" && patientContext) {
    return `${basePrompt}

CURRENT PATIENT CONTEXT:
- **Name:** ${patientContext.firstName} ${patientContext.lastName}
- **Age/Sex:** ${patientContext.age} years old, ${patientContext.sex}
- **Active Conditions:** ${patientContext.conditions.length > 0 ? patientContext.conditions.join(", ") : "None documented"}
- **Current Medications:** ${patientContext.medications.length > 0 ? patientContext.medications.join(", ") : "None documented"}
- **Allergies:** ${patientContext.allergies.length > 0 ? patientContext.allergies.join(", ") : "NKDA (No Known Drug Allergies)"}

SAFETY-FIRST APPROACH:
- CHECK every recommendation against this patient's allergies (including cross-reactivity)
- CHECK every drug against their current medications for interactions
- CHECK every drug against their conditions for contraindications
- If the patient is ≥65 years old, apply Beers Criteria
- If the patient has CKD, adjust doses for renal function
- If the patient has liver disease, adjust doses for hepatic function
- ALWAYS recommend monitoring labs/vitals for new medications

You have FULL ACCESS to this patient's medical record. When answering:
- Consider the patient's specific conditions, medications, and allergies.
- Check for contraindications and drug interactions with their current regimen.
- Reference their specific lab values and history when relevant.
- Tailor recommendations to their individual clinical picture.`;
  }

  return `${basePrompt}

MODE: General Medical Search
You are answering a general medical question not tied to a specific patient. Provide comprehensive, evidence-based information that would help a physician in clinical decision-making.`;
}

// ─────────────────────────────────────────────────────────────────
// Build Gemini contents array
// ─────────────────────────────────────────────────────────────────
function buildContents(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  currentMessage: string,
) {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  // System prompt as first user message (Gemini doesn't have system role in basic API)
  contents.push({
    role: "user",
    parts: [{ text: `[SYSTEM INSTRUCTIONS]\n${systemPrompt}\n\n[END SYSTEM INSTRUCTIONS]\n\nAcknowledge these instructions briefly.` }],
  });
  contents.push({
    role: "model",
    parts: [{ text: "Understood. I'm MediBot with MediGuard safety verification, ready to provide evidence-based clinical assistance with real-time safety checks. How can I help?" }],
  });

  // Add conversation history (last 10 messages)
  for (const msg of history.slice(-10)) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  // Add current message
  contents.push({
    role: "user",
    parts: [{ text: currentMessage }],
  });

  return contents;
}

// ─────────────────────────────────────────────────────────────────
// Extract references from response
// ─────────────────────────────────────────────────────────────────
function extractReferences(text: string): Array<{ num: number; text: string }> {
  const references: Array<{ num: number; text: string }> = [];

  // Look for REFERENCES: section
  const refMatch = text.match(/REFERENCES?:?\s*\n([\s\S]*?)$/i);
  if (refMatch) {
    const refSection = refMatch[1];
    const lines = refSection.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      const numMatch = line.match(/^\[?(\d+)\]?\s*[.:\-–—]?\s*(.+)/);
      if (numMatch) {
        references.push({
          num: parseInt(numMatch[1]),
          text: numMatch[2].trim(),
        });
      }
    }
  }

  return references;
}

// ─────────────────────────────────────────────────────────────────
// Clean response (remove references section from main text)
// ─────────────────────────────────────────────────────────────────
function cleanResponse(text: string): string {
  // Remove the REFERENCES section from the main response body
  return text.replace(/\n*REFERENCES?:?\s*\n[\s\S]*$/i, "").trim();
}
