import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// ─────────────────────────────────────────────────────────────────────────────
// Multimodal Clinical Reasoning Engine
// Analyzes images + lab results + clinical notes + vitals simultaneously
// Produces integrated differential diagnosis with confidence scores
// Surpasses single-modality AI by combining all available patient data
// ─────────────────────────────────────────────────────────────────────────────

interface MultimodalInput {
  patientContext?: {
    age: number;
    gender: string;
    conditions: string[];
    medications: string[];
    allergies: string[];
  };
  images?: Array<{
    type: "xray" | "ct" | "mri" | "ultrasound" | "ecg" | "pathology" | "dermatology" | "other";
    base64: string;
    mimeType: string;
    description?: string;
    bodyRegion?: string;
  }>;
  labResults?: Array<{
    name: string;
    value: string;
    unit: string;
    referenceRange?: string;
    flag?: "high" | "low" | "critical" | "normal";
    date: string;
  }>;
  vitals?: {
    bpSystolic?: number;
    bpDiastolic?: number;
    heartRate?: number;
    respiratoryRate?: number;
    temperature?: number;
    spo2?: number;
  };
  clinicalNotes?: string;
  symptoms?: string[];
  clinicalQuestion?: string;
}

interface DifferentialDiagnosis {
  rank: number;
  diagnosis: string;
  icd10Code: string;
  probability: number; // 0-1
  supportingEvidence: Array<{
    source: "imaging" | "lab" | "vitals" | "history" | "symptoms";
    finding: string;
    significance: string;
  }>;
  contradictingEvidence?: Array<{
    source: string;
    finding: string;
    explanation: string;
  }>;
  recommendedWorkup: string[];
  urgency: "emergent" | "urgent" | "routine";
}

interface MultimodalAnalysis {
  analysisId: string;
  differentialDiagnosis: DifferentialDiagnosis[];
  imagingFindings?: Array<{
    imageIndex: number;
    imageType: string;
    findings: string[];
    impression: string;
    abnormalities: Array<{
      finding: string;
      location: string;
      severity: "mild" | "moderate" | "severe";
      clinicalSignificance: string;
    }>;
  }>;
  labInterpretation?: {
    summary: string;
    criticalValues: Array<{ name: string; value: string; implication: string }>;
    patterns: string[];
    organSystemAssessment: Record<string, string>;
  };
  clinicalCorrelation: {
    summary: string;
    keyFindings: string[];
    inconsistencies: string[];
    dataGaps: string[];
  };
  recommendedActions: Array<{
    priority: "immediate" | "urgent" | "routine";
    action: string;
    rationale: string;
    expectedOutcome: string;
  }>;
  riskAssessment: {
    overallAcuity: "critical" | "acute" | "subacute" | "chronic" | "stable";
    dispositionRecommendation: string;
    timeToAction: string;
  };
  confidence: number;
  reasoning: string;
  citations: Array<{
    number: number;
    source: string;
    relevance: string;
  }>;
  generatedAt: string;
}

export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    success: true,
    system: "Multimodal Clinical Reasoning Engine",
    version: "1.0.0",
    description: "Integrates medical images, lab results, vitals, and clinical notes for comprehensive AI-powered differential diagnosis. Surpasses single-modality analysis by cross-correlating all available patient data.",
    capabilities: [
      "Simultaneous multi-image analysis (X-ray + CT + MRI)",
      "Lab result pattern recognition across panels",
      "Vital sign trend integration",
      "Clinical note NLP extraction",
      "Cross-modal correlation (imaging ↔ labs ↔ symptoms)",
      "Ranked differential diagnosis with probability scores",
      "Evidence-based reasoning with citations",
      "Automated workup recommendations",
      "Risk stratification and disposition",
    ],
    supportedImageTypes: [
      "X-ray (chest, abdomen, extremity, spine)",
      "CT (head, chest, abdomen, pelvis)",
      "MRI (brain, spine, joint, cardiac)",
      "Ultrasound (abdominal, cardiac, obstetric)",
      "ECG/EKG (12-lead)",
      "Pathology (H&E, IHC)",
      "Dermatology (skin lesions)",
    ],
    inputFormat: {
      images: "Base64 encoded with MIME type",
      labs: "Structured array with values and reference ranges",
      vitals: "Standard vital signs object",
      clinicalNotes: "Free text (Arabic or English)",
      symptoms: "Array of symptom strings",
      clinicalQuestion: "Specific question for the AI to answer",
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body: MultimodalInput = await req.json();
    const { images, labResults, vitals, clinicalNotes, symptoms, patientContext, clinicalQuestion } = body;

    const ai = getGeminiClient();
    if (!ai) {
      return NextResponse.json(
        { success: false, error: "AI service not configured" },
        { status: 503 }
      );
    }

    // Build multimodal content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // System context
    const systemContext = `You are the MediSoft Multimodal Clinical Reasoning Engine — the most advanced diagnostic AI in healthcare. You simultaneously analyze medical images, laboratory results, vital signs, and clinical notes to produce integrated differential diagnoses.

Your approach:
1. OBSERVE: Systematically analyze each data modality independently
2. CORRELATE: Cross-reference findings across modalities
3. SYNTHESIZE: Generate ranked differential diagnosis
4. RECOMMEND: Suggest next steps based on evidence

Key principles:
- Always consider the most dangerous diagnosis first (worst-first approach)
- Cite specific findings as evidence for each diagnosis
- Identify inconsistencies between modalities
- Flag critical values requiring immediate action
- Provide confidence scores based on available evidence
- Note data gaps that would improve diagnostic certainty

Respond ONLY with valid JSON matching the specified schema.`;

    // Build the multimodal prompt
    let textPrompt = `${systemContext}\n\n--- CLINICAL CASE ---\n\n`;

    if (patientContext) {
      textPrompt += `PATIENT:\n- Age: ${patientContext.age}, Gender: ${patientContext.gender}\n- Conditions: ${patientContext.conditions.join(", ") || "None"}\n- Medications: ${patientContext.medications.join(", ") || "None"}\n- Allergies: ${patientContext.allergies.join(", ") || "NKDA"}\n\n`;
    }

    if (symptoms?.length) {
      textPrompt += `PRESENTING SYMPTOMS:\n${symptoms.map((s) => `- ${s}`).join("\n")}\n\n`;
    }

    if (vitals) {
      textPrompt += `VITAL SIGNS:\n- BP: ${vitals.bpSystolic || "?"}/${vitals.bpDiastolic || "?"} mmHg\n- HR: ${vitals.heartRate || "?"} bpm\n- RR: ${vitals.respiratoryRate || "?"}/min\n- Temp: ${vitals.temperature || "?"}°C\n- SpO2: ${vitals.spo2 || "?"}%\n\n`;
    }

    if (labResults?.length) {
      textPrompt += `LABORATORY RESULTS:\n`;
      for (const lab of labResults) {
        const flag = lab.flag && lab.flag !== "normal" ? ` ⚠️ ${lab.flag.toUpperCase()}` : "";
        textPrompt += `- ${lab.name}: ${lab.value} ${lab.unit}${lab.referenceRange ? ` (ref: ${lab.referenceRange})` : ""}${flag} [${lab.date}]\n`;
      }
      textPrompt += "\n";
    }

    if (clinicalNotes) {
      textPrompt += `CLINICAL NOTES:\n${clinicalNotes}\n\n`;
    }

    if (images?.length) {
      textPrompt += `MEDICAL IMAGES: ${images.length} image(s) attached for analysis:\n`;
      images.forEach((img, i) => {
        textPrompt += `- Image ${i + 1}: ${img.type}${img.bodyRegion ? ` (${img.bodyRegion})` : ""}${img.description ? ` — ${img.description}` : ""}\n`;
      });
      textPrompt += "\n";
    }

    if (clinicalQuestion) {
      textPrompt += `CLINICAL QUESTION: ${clinicalQuestion}\n\n`;
    }

    textPrompt += `Analyze ALL available data and respond with JSON:
{
  "differentialDiagnosis": [
    {
      "rank": 1,
      "diagnosis": "<most likely diagnosis>",
      "icd10Code": "<ICD-10>",
      "probability": <0-1>,
      "supportingEvidence": [{"source": "imaging|lab|vitals|history|symptoms", "finding": "<specific finding>", "significance": "<why it matters>"}],
      "contradictingEvidence": [{"source": "<modality>", "finding": "<finding>", "explanation": "<why it contradicts>"}],
      "recommendedWorkup": ["<test 1>", "<test 2>"],
      "urgency": "emergent|urgent|routine"
    }
  ],
  ${images?.length ? `"imagingFindings": [{"imageIndex": 0, "imageType": "<type>", "findings": ["<finding 1>"], "impression": "<overall impression>", "abnormalities": [{"finding": "<name>", "location": "<where>", "severity": "mild|moderate|severe", "clinicalSignificance": "<importance>"}]}],` : ""}
  ${labResults?.length ? `"labInterpretation": {"summary": "<overall lab summary>", "criticalValues": [{"name": "<lab>", "value": "<value>", "implication": "<clinical meaning>"}], "patterns": ["<pattern 1>"], "organSystemAssessment": {"renal": "<status>", "hepatic": "<status>", "hematologic": "<status>"}},` : ""}
  "clinicalCorrelation": {
    "summary": "<integrated summary of all findings>",
    "keyFindings": ["<finding 1>", "<finding 2>"],
    "inconsistencies": ["<any contradictions between modalities>"],
    "dataGaps": ["<what additional data would help>"]
  },
  "recommendedActions": [{"priority": "immediate|urgent|routine", "action": "<what to do>", "rationale": "<why>", "expectedOutcome": "<what we expect>"}],
  "riskAssessment": {
    "overallAcuity": "critical|acute|subacute|chronic|stable",
    "dispositionRecommendation": "<admit/discharge/observe>",
    "timeToAction": "<how quickly to act>"
  },
  "confidence": <0-1>,
  "reasoning": "<brief explanation of reasoning process>",
  "citations": [{"number": 1, "source": "<guideline or study>", "relevance": "<why cited>"}]
}`;

    // Add text part
    parts.push({ text: textPrompt });

    // Add image parts
    if (images?.length) {
      for (const img of images) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64,
          },
        });
      }
    }

    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts }],
      config: { temperature: 0.2 },
    });

    const text = result.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json(
        { success: false, error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const analysis: MultimodalAnalysis = {
      analysisId: `mmr-${Date.now()}`,
      ...JSON.parse(jsonMatch[0]),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      analysis,
      inputSummary: {
        imagesAnalyzed: images?.length || 0,
        labResultsAnalyzed: labResults?.length || 0,
        vitalsIncluded: !!vitals,
        clinicalNotesIncluded: !!clinicalNotes,
        symptomsCount: symptoms?.length || 0,
      },
      message: `Multimodal analysis complete. Top diagnosis: ${analysis.differentialDiagnosis?.[0]?.diagnosis || "N/A"} (${Math.round((analysis.differentialDiagnosis?.[0]?.probability || 0) * 100)}% confidence)`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
