/**
 * De-identification API — FHIR & DICOM Data Anonymization
 *
 * Endpoints:
 *   GET  — Status, profiles, and HIPAA identifiers reference
 *   POST — De-identify FHIR resources or free text
 *
 * Actions:
 *   - deidentify: De-identify a single FHIR resource
 *   - batch: De-identify multiple FHIR resources
 *   - text: De-identify free-text clinical notes (AI-powered)
 *   - verify: Verify a resource is properly de-identified
 *
 * Compliance: HIPAA Safe Harbor, GDPR Article 89, Saudi PDPL
 *
 * @see https://docs.cloud.google.com/healthcare-api/docs/concepts/de-identification
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import {
  deidentifyFHIRResource,
  deidentifyBatch,
  deidentifyFreeText,
  verifyDeidentification,
  SAFE_HARBOR_PROFILE,
  LIMITED_DATASET_PROFILE,
  RESEARCH_EXPORT_PROFILE,
  DEIDENTIFICATION_PROFILES,
  HIPAA_IDENTIFIERS,
} from "@/lib/google-health/deidentification";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── GET /api/google-health/deidentification ─────────────────────────────────
export async function GET() {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    status: "active",
    service: "De-identification API",
    version: "1.0.0",
    description: "FHIR & DICOM data de-identification for research, clinical trials, and compliance",
    compliance: {
      hipaa: "Safe Harbor Method (§164.514(b)(2)) — removes all 18 identifiers",
      gdpr: "Article 89 — pseudonymization for research purposes",
      saudiPDPL: "Personal Data Protection Law — aligned with HIPAA Safe Harbor",
    },
    profiles: DEIDENTIFICATION_PROFILES,
    hipaaIdentifiers: HIPAA_IDENTIFIERS,
    capabilities: {
      deidentify: {
        description: "De-identify a single FHIR resource",
        input: "FHIR resource + profile name",
        output: "De-identified resource with audit trail",
      },
      batch: {
        description: "De-identify multiple FHIR resources",
        input: "Array of FHIR resources + profile + purpose",
        output: "Batch result with compliance report",
      },
      text: {
        description: "AI-powered PHI detection and removal from clinical notes",
        input: "Free text + language",
        output: "De-identified text with PHI locations",
      },
      verify: {
        description: "Verify a resource has been properly de-identified",
        input: "FHIR resource + profile",
        output: "Compliance status and warnings",
      },
    },
    transformActions: [
      { action: "remove", description: "Completely remove the field" },
      { action: "mask", description: "Replace with ***MASKED***" },
      { action: "dateshift", description: "Shift dates by consistent random offset" },
      { action: "generalize", description: "Reduce precision (e.g., address → state only)" },
      { action: "pseudonymize", description: "Replace with consistent pseudonym" },
      { action: "hash", description: "One-way hash (irreversible)" },
      { action: "redact", description: "Replace with [REDACTED]" },
    ],
    useCases: [
      "Research data export (IRB-approved studies)",
      "Clinical trial data preparation",
      "AI/ML training dataset creation",
      "Quality improvement initiatives",
      "Public health reporting",
      "Cross-institutional data sharing",
    ],
  });
}

// ─── POST /api/google-health/deidentification ────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { action } = body;

    // Select profile
    const profileName = body.profile || "safe_harbor";
    const profile = profileName === "limited_dataset"
      ? LIMITED_DATASET_PROFILE
      : profileName === "research_export"
        ? RESEARCH_EXPORT_PROFILE
        : SAFE_HARBOR_PROFILE;

    // ─── DEIDENTIFY: Single resource ─────────────────────────────────
    if (action === "deidentify") {
      const { resource, purpose, operator, irbNumber } = body;

      if (!resource) {
        return NextResponse.json({ error: "resource is required" }, { status: 400 });
      }

      const result = deidentifyFHIRResource(resource, profile, { purpose, operator, irbNumber });
      return NextResponse.json({ success: true, action: "deidentify", ...result });
    }

    // ─── BATCH: Multiple resources ───────────────────────────────────
    if (action === "batch") {
      const { resources, purpose, operator, irbNumber, retentionPeriod } = body;

      if (!resources || !Array.isArray(resources) || resources.length === 0) {
        return NextResponse.json({ error: "resources array is required" }, { status: 400 });
      }

      if (resources.length > 1000) {
        return NextResponse.json({ error: "Maximum 1000 resources per batch" }, { status: 400 });
      }

      const result = deidentifyBatch(resources, profile, { purpose, operator, irbNumber, retentionPeriod });
      return NextResponse.json({ success: true, action: "batch", ...result });
    }

    // ─── TEXT: Free-text de-identification ────────────────────────────
    if (action === "text") {
      const { text, language, retainMedicalTerms } = body;

      if (!text) {
        return NextResponse.json({ error: "text is required" }, { status: 400 });
      }

      const result = await deidentifyFreeText(text, { language, retainMedicalTerms: retainMedicalTerms !== false });
      return NextResponse.json({ success: true, action: "text", ...result });
    }

    // ─── VERIFY: Check de-identification completeness ────────────────
    if (action === "verify") {
      const { resource } = body;

      if (!resource) {
        return NextResponse.json({ error: "resource is required" }, { status: 400 });
      }

      const verification = verifyDeidentification(resource, profile);
      return NextResponse.json({ success: true, action: "verify", ...verification });
    }

    return NextResponse.json({ error: `Unknown action: ${action}. Use: deidentify, batch, text, verify` }, { status: 400 });
  } catch (err) {
    console.error("[api/google-health/deidentification] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "De-identification processing failed" },
      { status: 500 },
    );
  }
}
