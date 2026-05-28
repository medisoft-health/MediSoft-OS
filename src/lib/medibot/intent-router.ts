import "server-only";

/**
 * MediBot Intent Routing Layer.
 *
 * Classifies user intent and routes to the appropriate AI model:
 *   - clinical questions → MedGemma (when available) or Gemini
 *   - drug interactions → TxGemma (when available) or PharmaX + Gemini
 *   - imaging analysis → MedSigLIP (when available) or Gemini Vision
 *   - general questions → Gemini API (fastest, cheapest)
 *
 * Currently all routes fall back to Gemini since MedGemma/TxGemma/MedSigLIP
 * require Vertex AI GPU endpoints. The routing layer is ready for when those
 * are deployed — just set the endpoint URLs in environment variables.
 */

export type IntentType = "clinical" | "drug-interaction" | "imaging" | "general" | "triage" | "lab-interpretation";

interface ClassifiedIntent {
  type: IntentType;
  confidence: number;
  keywords: string[];
}

// ─────────────────────────────────────────────────────────────────
// Keyword-based intent classifier (fast, no AI needed)
// ─────────────────────────────────────────────────────────────────

const INTENT_PATTERNS: Array<{ type: IntentType; patterns: RegExp[] }> = [
  {
    type: "drug-interaction",
    patterns: [
      /drug.*(interaction|contraindic)/i,
      /interact(ion)?s?\b/i,
      /side.?effect/i,
      /تفاعل.*دوائ/,
      /can.*take.*together/i,
      /safe.*with/i,
      /prescri(be|ption)/i,
      /dosage|dose/i,
    ],
  },
  {
    type: "imaging",
    patterns: [
      /x-?ray|ct\s?scan|mri|ultrasound|radiology|imaging/i,
      /أشعة|صورة.*إشعاعي/,
      /chest\s?film|mammogr/i,
      /dicom|finding.*(scan|image)/i,
    ],
  },
  {
    type: "lab-interpretation",
    patterns: [
      /lab\s?(result|value|test)|blood\s?test|cbc|bmp|cmp|lipid/i,
      /تحليل|تحاليل|مختبر|نتائج/,
      /hemoglobin|hba1c|creatinine|alt|ast|tsh|ldl|hdl|glucose|ferritin/i,
      /what.*mean|interpret|explain.*result/i,
      /normal\s?range|reference\s?range|abnormal/i,
    ],
  },
  {
    type: "triage",
    patterns: [
      /emergency|urgent|er\b|طوارئ/i,
      /should.*go.*hospital|see.*doctor/i,
      /هل.*أروح.*مستشفى|هل.*خطير/,
      /chest\s?pain|can'?t\s?breathe|unconscious|bleeding/i,
      /ألم.*صدر|ضيق.*تنفس|نزيف|إغماء/,
    ],
  },
  {
    type: "clinical",
    patterns: [
      /diagnos(is|e|tic)|differential|ddx/i,
      /تشخيص|علاج|أعراض/,
      /treatment|therapy|management|protocol/i,
      /guideline|evidence|recommendation/i,
      /pathophysiology|etiology|prognosis/i,
      /clinical\s?(question|scenario|case)/i,
    ],
  },
];

export function classifyIntent(message: string): ClassifiedIntent {
  const scores = new Map<IntentType, number>();
  const matchedKeywords: string[] = [];

  for (const { type, patterns } of INTENT_PATTERNS) {
    let score = 0;
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        score += 1;
        matchedKeywords.push(match[0]);
      }
    }
    if (score > 0) scores.set(type, score);
  }

  if (scores.size === 0) {
    return { type: "general", confidence: 0.5, keywords: [] };
  }

  // Pick highest-scoring intent
  let bestType: IntentType = "general";
  let bestScore = 0;
  for (const [type, score] of scores) {
    if (score > bestScore) {
      bestType = type;
      bestScore = score;
    }
  }

  const totalPatterns = INTENT_PATTERNS.find((p) => p.type === bestType)?.patterns.length ?? 1;
  const confidence = Math.min(0.95, 0.5 + (bestScore / totalPatterns) * 0.5);

  return { type: bestType, confidence, keywords: matchedKeywords };
}

// ─────────────────────────────────────────────────────────────────
// Model endpoint configuration
// ─────────────────────────────────────────────────────────────────

export interface ModelEndpoint {
  name: string;
  url: string | null; // null = not deployed yet, use Gemini fallback
  available: boolean;
}

export function getModelEndpoints(): Record<IntentType, ModelEndpoint> {
  return {
    clinical: {
      name: "MedGemma 4B",
      url: process.env.MEDGEMMA_ENDPOINT_URL ?? null,
      available: !!process.env.MEDGEMMA_ENDPOINT_URL,
    },
    "drug-interaction": {
      name: "TxGemma",
      url: process.env.TXGEMMA_ENDPOINT_URL ?? null,
      available: !!process.env.TXGEMMA_ENDPOINT_URL,
    },
    imaging: {
      name: "MedSigLIP",
      url: process.env.MEDSIGLIP_ENDPOINT_URL ?? null,
      available: !!process.env.MEDSIGLIP_ENDPOINT_URL,
    },
    general: {
      name: "Gemini 2.5 Pro",
      url: "gemini", // always available via existing API key
      available: true,
    },
    triage: {
      name: "Gemini 2.5 Pro",
      url: "gemini",
      available: true,
    },
    "lab-interpretation": {
      name: "MedGemma 4B",
      url: process.env.MEDGEMMA_ENDPOINT_URL ?? null,
      available: !!process.env.MEDGEMMA_ENDPOINT_URL,
    },
  };
}

/**
 * Get the optimal model for a given intent.
 * Falls back to Gemini if the specialized model is not deployed.
 */
export function resolveModel(intent: IntentType): { model: string; fallback: boolean } {
  const endpoints = getModelEndpoints();
  const endpoint = endpoints[intent];

  if (endpoint.available && endpoint.url && endpoint.url !== "gemini") {
    return { model: endpoint.name, fallback: false };
  }

  // Fallback to Gemini
  return { model: "Gemini 2.5 Pro", fallback: true };
}
