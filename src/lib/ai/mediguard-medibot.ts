/**
 * MediGuard × MediBot Safety Layer
 * ─────────────────────────────────
 * Intercepts MediBot AI responses and validates any medical recommendations
 * against MediGuard's safety checks and clinical guidelines.
 *
 * This ensures that:
 * 1. Any drug recommendations are safe for the patient
 * 2. Dosing suggestions are appropriate
 * 3. Contraindications are flagged
 * 4. Food/drug interactions are mentioned
 * 5. Guidelines compliance is verified
 * 6. Wrong or dangerous advice is blocked/corrected
 */

import { getGeminiClient, GEMINI_MODEL, isGeminiConfigured } from "@/lib/ai/gemini";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MediBotSafetyCheck {
  originalResponse: string;
  patientContext?: {
    age?: number;
    sex?: string;
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
  };
}

export interface SafetyVerificationResult {
  isSafe: boolean;
  riskLevel: "safe" | "caution" | "warning" | "danger";
  verifiedResponse: string; // Original or corrected response
  safetyAnnotations: SafetyAnnotation[];
  corrections: Correction[];
  addedWarnings: string[];
  guidelineNotes: string[];
}

export interface SafetyAnnotation {
  type: "drug_safety" | "dose_check" | "interaction" | "contraindication" | "guideline" | "food_interaction" | "allergy" | "monitoring";
  severity: "info" | "caution" | "warning" | "critical";
  message: string;
  relatedDrug?: string;
  source?: string;
}

export interface Correction {
  original: string;
  corrected: string;
  reason: string;
  severity: "minor" | "major" | "critical";
}

// ─── Known Drug Patterns for Quick Detection ─────────────────────────────────

const DRUG_PATTERNS = [
  // Common drug classes and names for quick detection in text
  /\b(metformin|glipizide|gliclazide|glibenclamide|sitagliptin|empagliflozin|dapagliflozin|semaglutide|liraglutide|insulin)\b/gi,
  /\b(amlodipine|lisinopril|enalapril|ramipril|losartan|valsartan|telmisartan|hydrochlorothiazide|atenolol|bisoprolol|carvedilol)\b/gi,
  /\b(atorvastatin|rosuvastatin|simvastatin|pravastatin|ezetimibe|fenofibrate)\b/gi,
  /\b(warfarin|apixaban|rivaroxaban|dabigatran|enoxaparin|heparin|aspirin|clopidogrel)\b/gi,
  /\b(omeprazole|pantoprazole|esomeprazole|lansoprazole|ranitidine|famotidine)\b/gi,
  /\b(amoxicillin|azithromycin|ciprofloxacin|levofloxacin|metronidazole|doxycycline|trimethoprim)\b/gi,
  /\b(prednisolone|prednisone|dexamethasone|hydrocortisone|methylprednisolone)\b/gi,
  /\b(salbutamol|albuterol|budesonide|fluticasone|montelukast|tiotropium|ipratropium)\b/gi,
  /\b(morphine|tramadol|codeine|fentanyl|oxycodone|paracetamol|ibuprofen|diclofenac|naproxen)\b/gi,
  /\b(sertraline|fluoxetine|escitalopram|venlafaxine|duloxetine|amitriptyline|mirtazapine)\b/gi,
  /\b(gabapentin|pregabalin|carbamazepine|valproate|levetiracetam|phenytoin|lamotrigine)\b/gi,
  /\b(spironolactone|furosemide|bumetanide|indapamide|chlorthalidone)\b/gi,
];

const DOSE_PATTERN = /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|ml|mL|units?|IU)\s*(?:\/day|daily|BID|TID|QID|once|twice|three times|q\d+h|every \d+ hours?)?/gi;

// ─── Critical Safety Rules (Hard-coded, never overridden) ────────────────────

const CRITICAL_RULES: Array<{
  pattern: RegExp;
  condition: (ctx?: MediBotSafetyCheck["patientContext"]) => boolean;
  warning: string;
  severity: "warning" | "critical";
}> = [
  {
    pattern: /\b(metformin)\b/i,
    condition: (ctx) => {
      if (!ctx?.conditions) return false;
      return ctx.conditions.some(c => c.toLowerCase().includes("ckd stage 4") || c.toLowerCase().includes("ckd stage 5") || c.toLowerCase().includes("egfr <30") || c.toLowerCase().includes("dialysis"));
    },
    warning: "⚠️ MEDIGUARD ALERT: Metformin is CONTRAINDICATED with eGFR <30 mL/min (lactic acidosis risk). Consider SGLT2i or DPP-4i instead.",
    severity: "critical",
  },
  {
    pattern: /\b(nsaid|ibuprofen|diclofenac|naproxen|ketorolac|indomethacin)\b/i,
    condition: (ctx) => {
      if (!ctx?.conditions) return false;
      return ctx.conditions.some(c => c.toLowerCase().includes("ckd") || c.toLowerCase().includes("kidney") || c.toLowerCase().includes("heart failure") || c.toLowerCase().includes("hf"));
    },
    warning: "⚠️ MEDIGUARD ALERT: NSAIDs are CONTRAINDICATED in CKD/Heart Failure (worsens renal function, fluid retention). Use paracetamol or consider specialist referral.",
    severity: "critical",
  },
  {
    pattern: /\b(warfarin)\b/i,
    condition: (ctx) => {
      if (!ctx?.medications) return false;
      return ctx.medications.some(m => m.toLowerCase().includes("aspirin") || m.toLowerCase().includes("clopidogrel"));
    },
    warning: "⚠️ MEDIGUARD ALERT: Warfarin + Antiplatelet combination detected. HIGH bleeding risk. Ensure clear indication (e.g., post-PCI with AF) and use lowest effective doses. Monitor INR closely.",
    severity: "warning",
  },
  {
    pattern: /\b(ace inhibitor|acei|lisinopril|enalapril|ramipril)\b/i,
    condition: (ctx) => {
      if (!ctx?.medications) return false;
      return ctx.medications.some(m => m.toLowerCase().includes("losartan") || m.toLowerCase().includes("valsartan") || m.toLowerCase().includes("telmisartan") || m.toLowerCase().includes("irbesartan"));
    },
    warning: "⚠️ MEDIGUARD ALERT: ACE-I + ARB combination is NOT recommended (ONTARGET trial). Increased hyperkalemia risk without benefit. Use one or the other.",
    severity: "critical",
  },
  {
    pattern: /\b(saba|salbutamol|albuterol)\b.*\b(only|alone|monotherapy|without.*ics)\b/i,
    condition: (ctx) => {
      if (!ctx?.conditions) return false;
      return ctx.conditions.some(c => c.toLowerCase().includes("asthma"));
    },
    warning: "⚠️ MEDIGUARD ALERT: SABA-only therapy is NO LONGER recommended for asthma (GINA 2024). All asthma patients should receive ICS-containing therapy. Use ICS-formoterol as needed.",
    severity: "warning",
  },
  {
    pattern: /\b(verapamil|diltiazem)\b/i,
    condition: (ctx) => {
      if (!ctx?.conditions) return false;
      return ctx.conditions.some(c => c.toLowerCase().includes("heart failure") || c.toLowerCase().includes("hfref"));
    },
    warning: "⚠️ MEDIGUARD ALERT: Verapamil/Diltiazem are CONTRAINDICATED in HFrEF (negative inotropic effect worsens heart failure). Use dihydropyridine CCB (amlodipine) if needed.",
    severity: "critical",
  },
  {
    pattern: /\b(glibenclamide|glyburide|chlorpropamide|meperidine)\b/i,
    condition: (ctx) => {
      if (!ctx) return false;
      return (ctx.age ?? 0) >= 65;
    },
    warning: "⚠️ MEDIGUARD ALERT: This medication is listed in AGS Beers Criteria as potentially inappropriate for patients ≥65 years. Consider safer alternatives.",
    severity: "warning",
  },
];

// ─── Main Safety Verification Function ───────────────────────────────────────

export async function verifyMediBotResponse(
  check: MediBotSafetyCheck,
): Promise<SafetyVerificationResult> {
  const { originalResponse, patientContext } = check;

  // Step 1: Quick rule-based safety checks
  const ruleAnnotations = runQuickSafetyRules(originalResponse, patientContext);

  // Step 2: Detect if response contains drug recommendations
  const containsDrugRecommendations = detectDrugContent(originalResponse);

  // Step 3: If drugs detected and patient context available, run AI verification
  let aiAnnotations: SafetyAnnotation[] = [];
  let corrections: Correction[] = [];
  let guidelineNotes: string[] = [];

  if (containsDrugRecommendations && patientContext && isGeminiConfigured()) {
    const aiResult = await runAISafetyVerification(originalResponse, patientContext);
    aiAnnotations = aiResult.annotations;
    corrections = aiResult.corrections;
    guidelineNotes = aiResult.guidelineNotes;
  }

  // Combine all annotations
  const allAnnotations = [...ruleAnnotations, ...aiAnnotations];

  // Determine overall risk level
  const riskLevel = determineRiskLevel(allAnnotations);

  // Build verified response (add warnings if needed)
  const verifiedResponse = buildVerifiedResponse(originalResponse, allAnnotations, corrections);

  // Collect added warnings
  const addedWarnings = allAnnotations
    .filter(a => a.severity === "critical" || a.severity === "warning")
    .map(a => a.message);

  return {
    isSafe: riskLevel === "safe" || riskLevel === "caution",
    riskLevel,
    verifiedResponse,
    safetyAnnotations: allAnnotations,
    corrections,
    addedWarnings,
    guidelineNotes,
  };
}

// ─── Quick Rule-Based Checks ─────────────────────────────────────────────────

function runQuickSafetyRules(
  response: string,
  patientContext?: MediBotSafetyCheck["patientContext"],
): SafetyAnnotation[] {
  const annotations: SafetyAnnotation[] = [];

  for (const rule of CRITICAL_RULES) {
    if (rule.pattern.test(response) && rule.condition(patientContext)) {
      annotations.push({
        type: "drug_safety",
        severity: rule.severity === "critical" ? "critical" : "warning",
        message: rule.warning,
        source: "MediGuard Rule Engine",
      });
    }
  }

  // Check for allergy conflicts
  if (patientContext?.allergies && patientContext.allergies.length > 0) {
    for (const allergy of patientContext.allergies) {
      const allergyLower = allergy.toLowerCase();
      if (allergyLower !== "nkda" && allergyLower !== "none") {
        // Check if the response mentions the allergen
        const allergyRegex = new RegExp(`\\b${escapeRegex(allergyLower)}\\b`, "i");
        if (allergyRegex.test(response)) {
          annotations.push({
            type: "allergy",
            severity: "critical",
            message: `🚨 ALLERGY ALERT: Patient has documented allergy to "${allergy}". This drug/class was mentioned in the recommendation. VERIFY before prescribing.`,
            relatedDrug: allergy,
            source: "MediGuard Allergy Check",
          });
        }

        // Cross-reactivity checks
        const crossReactivity: Record<string, string[]> = {
          "penicillin": ["amoxicillin", "ampicillin", "piperacillin", "cephalosporin"],
          "sulfa": ["sulfamethoxazole", "trimethoprim-sulfamethoxazole", "sulfasalazine", "celecoxib", "thiazide"],
          "aspirin": ["nsaid", "ibuprofen", "naproxen", "diclofenac", "ketorolac"],
          "codeine": ["morphine", "hydrocodone", "oxycodone"],
          "cephalosporin": ["cefazolin", "ceftriaxone", "cefuroxime", "cephalexin"],
        };

        const relatedDrugs = crossReactivity[allergyLower] || [];
        for (const related of relatedDrugs) {
          const relatedRegex = new RegExp(`\\b${escapeRegex(related)}\\b`, "i");
          if (relatedRegex.test(response)) {
            annotations.push({
              type: "allergy",
              severity: "warning",
              message: `⚠️ CROSS-REACTIVITY: Patient is allergic to "${allergy}". "${related}" mentioned in response may have cross-reactivity. Verify before prescribing.`,
              relatedDrug: related,
              source: "MediGuard Cross-Reactivity Database",
            });
          }
        }
      }
    }
  }

  return annotations;
}

// ─── Drug Content Detection ──────────────────────────────────────────────────

function detectDrugContent(response: string): boolean {
  for (const pattern of DRUG_PATTERNS) {
    if (pattern.test(response)) {
      pattern.lastIndex = 0; // Reset regex
      return true;
    }
    pattern.lastIndex = 0;
  }
  return DOSE_PATTERN.test(response);
}

// ─── AI-Powered Safety Verification ─────────────────────────────────────────

async function runAISafetyVerification(
  response: string,
  patientContext: MediBotSafetyCheck["patientContext"],
): Promise<{
  annotations: SafetyAnnotation[];
  corrections: Correction[];
  guidelineNotes: string[];
}> {
  const prompt = `You are MediGuard, an AI clinical safety officer. Your job is to verify the safety and accuracy of medical AI responses.

TASK: Review this MediBot response for a specific patient and identify:
1. Any drug safety issues (interactions, contraindications, wrong doses)
2. Any guideline violations (outdated recommendations, non-first-line choices)
3. Any corrections needed (factual errors, dangerous advice)
4. Relevant guideline notes the physician should know

PATIENT CONTEXT:
- Age: ${patientContext?.age || "Unknown"}
- Sex: ${patientContext?.sex || "Unknown"}
- Conditions: ${patientContext?.conditions?.join(", ") || "None documented"}
- Current Medications: ${patientContext?.medications?.join(", ") || "None documented"}
- Allergies: ${patientContext?.allergies?.join(", ") || "NKDA"}

MEDIBOT RESPONSE TO VERIFY:
"""
${response.substring(0, 3000)}
"""

Respond in JSON:
{
  "annotations": [
    {
      "type": "drug_safety|dose_check|interaction|contraindication|guideline|food_interaction|monitoring",
      "severity": "info|caution|warning|critical",
      "message": "concise safety note",
      "relatedDrug": "drug name if applicable",
      "source": "guideline source"
    }
  ],
  "corrections": [
    {
      "original": "the incorrect statement",
      "corrected": "the correct information",
      "reason": "why it's wrong",
      "severity": "minor|major|critical"
    }
  ],
  "guidelineNotes": [
    "Relevant guideline note for the physician"
  ]
}

RULES:
- Only flag REAL safety issues, not theoretical ones
- Be specific — cite guidelines (ADA 2024, ESC 2024, etc.)
- If the response is safe and accurate, return empty arrays
- Focus on patient-specific risks based on their conditions/medications
- Do NOT flag general educational content as unsafe`;

  try {
    const client = getGeminiClient();
    const result = await client!.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1, responseMimeType: "application/json" },
    });

    const text = result.text ?? "{}";
    const parsed = JSON.parse(text);

    return {
      annotations: (parsed.annotations || []).map((a: Record<string, unknown>) => ({
        type: a.type || "drug_safety",
        severity: a.severity || "info",
        message: a.message || "",
        relatedDrug: a.relatedDrug,
        source: a.source || "MediGuard AI",
      })),
      corrections: (parsed.corrections || []).map((c: Record<string, unknown>) => ({
        original: c.original || "",
        corrected: c.corrected || "",
        reason: c.reason || "",
        severity: c.severity || "minor",
      })),
      guidelineNotes: parsed.guidelineNotes || [],
    };
  } catch (err) {
    console.error("[MediGuard-MediBot] AI verification error:", err);
    return { annotations: [], corrections: [], guidelineNotes: [] };
  }
}

// ─── Risk Level Determination ────────────────────────────────────────────────

function determineRiskLevel(annotations: SafetyAnnotation[]): SafetyVerificationResult["riskLevel"] {
  if (annotations.some(a => a.severity === "critical")) return "danger";
  if (annotations.some(a => a.severity === "warning")) return "warning";
  if (annotations.some(a => a.severity === "caution")) return "caution";
  return "safe";
}

// ─── Build Verified Response ─────────────────────────────────────────────────

function buildVerifiedResponse(
  original: string,
  annotations: SafetyAnnotation[],
  corrections: Correction[],
): string {
  let response = original;

  // Apply critical corrections
  for (const correction of corrections.filter(c => c.severity === "critical" || c.severity === "major")) {
    if (correction.original && correction.corrected) {
      response = response.replace(correction.original, `~~${correction.original}~~ **[CORRECTED]** ${correction.corrected}`);
    }
  }

  // Add safety banner if there are warnings
  const criticalAnnotations = annotations.filter(a => a.severity === "critical" || a.severity === "warning");
  if (criticalAnnotations.length > 0) {
    const safetyBanner = `\n\n---\n🛡️ **MediGuard Safety Review:**\n${criticalAnnotations.map(a => `- ${a.message}`).join("\n")}\n---\n`;
    response = response + safetyBanner;
  }

  return response;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
