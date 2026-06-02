import "server-only";
import { Type, type Schema } from "@google/genai";
import { GEMINI_MODEL, getGeminiClient, isGeminiConfigured, decodeAllStrings } from "@/lib/ai/gemini";
import { getFdaLabelsByIngredients, type OpenFdaLabel } from "@/lib/ai/openfda";
import { isSfdaConfigured, lookupSfdaDrug } from "@/lib/ai/sfda";
import {
  SEVERITY_OPTIONS,
  type Severity,
  type InteractionItem,
} from "@/lib/validations/prescription";

/**
 * PharmaX three-layer drug-safety analyzer.
 *
 *   Layer 1 — RxNorm: drug normalization. Done client-side at search time;
 *             the drugs handed to this analyzer already carry an RxCUI
 *             (when one was found).
 *
 *   Layer 2 — OpenFDA: pull each ingredient's structured product label
 *             and extract interactions, warnings, contraindications,
 *             boxed warning, dosing guidance.
 *
 *   Layer 3 — Gemini: synthesize evidence into a doctor-facing summary.
 *             The model receives a deterministic evidence dump (NOT free
 *             text); the system prompt forbids inventing interactions.
 *
 *   Plus — SFDA cross-reference (currently a stub that reports
 *   "not_connected"). The UI surfaces this transparently.
 *
 * Returns a single typed result that the UI consumes as-is.
 */

// ─────────────────────────────────────────────────────────────────
// Output shape
// ─────────────────────────────────────────────────────────────────
export interface DrugSafetyResult {
  /** Per-drug evidence rolled up from each source. */
  perDrug: Array<{
    drugName: string;
    rxcui: string | null;
    fdaLabelAvailable: boolean;
    boxedWarning: string | null;
    contraindicationsCount: number;
    warningsCount: number;
    sfda:
      | { kind: "ok"; saudiName: string; sfdaCode: string }
      | { kind: "not_found" }
      | { kind: "unavailable"; message: string };
  }>;
  /** Aggregated interactions across all drug pairs / single-drug warnings. */
  interactions: InteractionItem[];
  /** Highest severity present in `interactions`, for the UI banner. */
  highestSeverity: Severity | null;
  /** Optional Gemini-written narrative (3-5 sentences). */
  aiSummary: string | null;
  /** Layer availability flags surfaced for the UI. */
  meta: {
    openFdaUsed: boolean;
    geminiUsed: boolean;
    sfdaConfigured: boolean;
    drugCount: number;
    interactionCount: number;
  };
}

interface AnalyzerInput {
  drugs: Array<{ drugName: string; rxcui?: string | null }>;
  patientContext?: {
    age?: number;
    sex?: string;
    allergies?: string[];
    chronicConditions?: string[];
  };
  locale?: string;
}

// ─────────────────────────────────────────────────────────────────
// Severity ranking
// ─────────────────────────────────────────────────────────────────
const SEVERITY_RANK: Record<Severity, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  critical: 3,
};

function pickHighest(a: Severity | null, b: Severity | null): Severity | null {
  if (!a) return b;
  if (!b) return a;
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

// ─────────────────────────────────────────────────────────────────
// Main entry
// ─────────────────────────────────────────────────────────────────
export async function analyzeDrugSafety(
  input: AnalyzerInput,
): Promise<DrugSafetyResult> {
  const drugs = input.drugs.filter((d) => d.drugName.trim().length > 0);

  // ── Layer 2: OpenFDA labels in parallel ────────────────────────
  const fdaLabels = await getFdaLabelsByIngredients(drugs.map((d) => d.drugName));
  const openFdaUsed = Array.from(fdaLabels.values()).some((v) => v !== null);

  // ── SFDA cross-reference per drug ──────────────────────────────
  const sfdaResults = await Promise.all(
    drugs.map(async (d) => {
      const r = await lookupSfdaDrug({
        name: d.drugName,
        rxcui: d.rxcui ?? undefined,
      });
      return r;
    }),
  );

  // ── Build perDrug summary ──────────────────────────────────────
  const perDrug: DrugSafetyResult["perDrug"] = drugs.map((d, i) => {
    const label = fdaLabels.get(d.drugName.trim()) ?? null;
    const sfda = sfdaResults[i];
    return {
      drugName: d.drugName,
      rxcui: d.rxcui ?? null,
      fdaLabelAvailable: !!label,
      boxedWarning: label?.boxedWarning ?? null,
      contraindicationsCount: label?.contraindications.length ?? 0,
      warningsCount: label?.warnings.length ?? 0,
      sfda: !sfda
        ? { kind: "not_found" }
        : sfda.kind === "ok"
          ? sfda.match
            ? {
                kind: "ok",
                saudiName: sfda.match.saudiName,
                sfdaCode: sfda.match.sfdaCode,
              }
            : { kind: "not_found" }
          : { kind: "unavailable", message: sfda.message },
    };
  });

  // ── Heuristic interactions from FDA evidence ──────────────────
  const interactions: InteractionItem[] = [];

  // For each drug pair, scan the FDA label of one drug for a mention of the other.
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const a = drugs[i].drugName;
      const b = drugs[j].drugName;
      const labelA = fdaLabels.get(a.trim());
      const labelB = fdaLabels.get(b.trim());
      const mention = mentionsCrossDrug(labelA, b) ?? mentionsCrossDrug(labelB, a);
      if (mention) {
        interactions.push({
          severity: mention.severity,
          mechanism: mention.snippet,
          interactingDrug: `${a} + ${b}`,
          evidenceSource: "OpenFDA Drug Label",
          recommendation: "Review the FDA label before co-prescribing.",
        });
      }
    }
  }

  // Single-drug boxed warnings surface as their own interaction entries
  // (severity = critical) so the UI alert panel can group them.
  for (const p of perDrug) {
    if (p.boxedWarning) {
      interactions.push({
        severity: "critical",
        mechanism: truncate(p.boxedWarning, 600),
        interactingDrug: p.drugName,
        evidenceSource: "OpenFDA boxed warning",
        recommendation:
          "FDA boxed warning. Verify indication and counsel the patient explicitly.",
      });
    }
  }

  let highestSeverity: Severity | null = null;
  for (const it of interactions) highestSeverity = pickHighest(highestSeverity, it.severity);

  // ── Layer 3: Gemini synthesis (optional) ──────────────────────
  let aiSummary: string | null = null;
  let geminiUsed = false;
  if (isGeminiConfigured() && drugs.length > 0) {
    try {
      aiSummary = await runGeminiSynthesis({
        drugs: perDrug,
        interactions,
        fdaLabels,
        patientContext: input.patientContext,
        locale: input.locale,
      });
      geminiUsed = true;
    } catch (err) {
      console.warn("[pharmax] Gemini synthesis failed (non-fatal)", err);
    }
  }

  return {
    perDrug,
    interactions,
    highestSeverity,
    aiSummary,
    meta: {
      openFdaUsed,
      geminiUsed,
      sfdaConfigured: isSfdaConfigured(),
      drugCount: drugs.length,
      interactionCount: interactions.length,
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
interface CrossMention {
  severity: Severity;
  snippet: string;
}

const CRITICAL_KEYWORDS = ["contraindicated", "do not use", "life-threatening", "fatal"];
const HIGH_KEYWORDS = [
  "serious",
  "increased risk",
  "avoid",
  "should not be administered",
  "may potentiate",
];
const MODERATE_KEYWORDS = ["may increase", "may decrease", "monitor", "caution"];

function mentionsCrossDrug(
  label: OpenFdaLabel | null | undefined,
  otherDrug: string,
): CrossMention | null {
  if (!label) return null;
  const needle = otherDrug.trim().toLowerCase();
  const haystack = [
    ...label.drugInteractions,
    ...label.warnings,
    ...label.contraindications,
  ];
  for (const section of haystack) {
    const idx = section.toLowerCase().indexOf(needle);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 120);
    const end = Math.min(section.length, idx + needle.length + 220);
    const snippet = section.slice(start, end);
    const lower = snippet.toLowerCase();
    let severity: Severity = "moderate";
    if (CRITICAL_KEYWORDS.some((k) => lower.includes(k))) severity = "critical";
    else if (HIGH_KEYWORDS.some((k) => lower.includes(k))) severity = "high";
    else if (MODERATE_KEYWORDS.some((k) => lower.includes(k))) severity = "moderate";
    else severity = "low";
    return { severity, snippet: snippet.trim() };
  }
  return null;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

// ─────────────────────────────────────────────────────────────────
// Gemini synthesis
// ─────────────────────────────────────────────────────────────────
const ARABIC_LOCALE_INSTRUCTION = `\n\nIMPORTANT: Generate ALL output text in Modern Standard Arabic (العربية الفصحى). Use formal medical Arabic terminology consistent with WHO and SFDA standards. Keep internationally recognized abbreviations (ICD-11, SOAP, LOINC, RxNorm, FHIR) in Latin script. Dates should use the Gregorian calendar.`;

const GEMINI_SYSTEM = `
You are PharmaX, a clinical pharmacology assistant for licensed physicians.

Strict rules:
1. Never invent interactions. Use ONLY the evidence in the EVIDENCE block.
2. If the evidence is silent on a question, say so explicitly. Do NOT speculate.
3. Output ONE paragraph, 3-5 sentences, plain prose suitable for a physician
   to read in 15 seconds. No headers, no bullet lists, no markdown.
4. Cover, in priority order: critical/boxed warnings, drug-drug interactions,
   key contraindications, monitoring suggestions.
5. End with a single sentence on what action you'd take. Do not prescribe.
`.trim();

const GEMINI_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
  },
  required: ["summary"],
};

async function runGeminiSynthesis(input: {
  drugs: DrugSafetyResult["perDrug"];
  interactions: InteractionItem[];
  fdaLabels: Map<string, OpenFdaLabel | null>;
  patientContext?: AnalyzerInput["patientContext"];
  locale?: string;
}): Promise<string | null> {
  const client = getGeminiClient();
  if (!client) return null;

  const lines: string[] = [];
  lines.push("EVIDENCE");
  if (input.patientContext) {
    lines.push("");
    lines.push("Patient:");
    const pc = input.patientContext;
    if (pc.age != null) lines.push(`  age: ${pc.age}`);
    if (pc.sex) lines.push(`  sex: ${pc.sex}`);
    if (pc.allergies?.length) lines.push(`  allergies: ${pc.allergies.join("; ")}`);
    if (pc.chronicConditions?.length)
      lines.push(`  chronic conditions: ${pc.chronicConditions.join("; ")}`);
  }
  lines.push("");
  lines.push("Drugs being co-prescribed:");
  for (const d of input.drugs) {
    lines.push(`  - ${d.drugName}${d.rxcui ? ` (RxCUI ${d.rxcui})` : ""}`);
  }
  if (input.interactions.length > 0) {
    lines.push("");
    lines.push("Detected interactions (from OpenFDA evidence):");
    for (const it of input.interactions.slice(0, 20)) {
      lines.push(
        `  - [${it.severity}] ${it.interactingDrug ?? "—"} :: ${truncate(it.mechanism ?? "", 400)}`,
      );
    }
  }
  for (const d of input.drugs) {
    const label = input.fdaLabels.get(d.drugName.trim());
    if (!label) continue;
    if (label.boxedWarning) {
      lines.push("");
      lines.push(
        `Boxed warning for ${d.drugName}: ${truncate(label.boxedWarning, 500)}`,
      );
    }
    if (label.contraindications.length > 0) {
      lines.push("");
      lines.push(
        `Contraindications for ${d.drugName}: ${truncate(label.contraindications.join(" | "), 600)}`,
      );
    }
  }

  try {
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: lines.join("\n") }] }],
      config: {
        systemInstruction: GEMINI_SYSTEM + (input.locale === "ar" ? ARABIC_LOCALE_INSTRUCTION : ""),
        responseMimeType: "application/json",
        responseSchema: GEMINI_SCHEMA,
        temperature: 0.2,
      },
    });
    const raw = result.text ?? "";
    if (!raw) return null;
    const parsed = decodeAllStrings(JSON.parse(raw) as { summary?: string });
    return typeof parsed.summary === "string" ? parsed.summary.trim() : null;
  } catch (err) {
    console.warn("[pharmax] Gemini call failed", err);
    return null;
  }
}
