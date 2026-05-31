/**
 * Consent Management API — Patient Consent Tracking
 *
 * Endpoints:
 *   GET  — Status, policies, dashboard, patient consents
 *   POST — Create, revoke, check access, seed demo data
 *
 * Actions (POST):
 *   - create: Create a new consent record
 *   - revoke: Revoke an existing consent
 *   - check_access: Determine if access is permitted based on consents
 *   - seed: Seed demo consent data
 *
 * Query params (GET):
 *   - view=dashboard: Get compliance dashboard
 *   - view=policies: Get available consent policies
 *   - patientId=xxx: Get consents for specific patient
 *   - id=xxx: Get specific consent record
 *
 * Compliance: HIPAA, GDPR, Saudi PDPL, CCHI
 *
 * @see https://docs.cloud.google.com/healthcare-api/docs/concepts/consent
 */
import { NextRequest, NextResponse } from "next/server";
import {
  createConsent,
  revokeConsent,
  checkAccess,
  getPatientConsents,
  getConsentById,
  getAllConsents,
  getComplianceDashboard,
  seedDemoConsents,
  CONSENT_POLICIES,
} from "@/lib/google-health/consent-management";

export const runtime = "nodejs";

// ─── GET /api/google-health/consent ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");
  const patientId = searchParams.get("patientId");
  const consentId = searchParams.get("id");
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  // Get specific consent by ID
  if (consentId) {
    const consent = getConsentById(consentId);
    if (!consent) {
      return NextResponse.json({ error: "Consent not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, consent });
  }

  // Get patient's consents
  if (patientId) {
    const consents = getPatientConsents(patientId);
    return NextResponse.json({ success: true, patientId, consents, total: consents.length });
  }

  // Get compliance dashboard
  if (view === "dashboard") {
    const dashboard = getComplianceDashboard();
    return NextResponse.json({ success: true, ...dashboard });
  }

  // Get available policies
  if (view === "policies") {
    return NextResponse.json({
      success: true,
      policies: CONSENT_POLICIES,
      total: CONSENT_POLICIES.length,
    });
  }

  // Default: service status + all consents
  const allConsents = getAllConsents({
    status: status as any,
    category: category as any,
  });

  return NextResponse.json({
    status: "active",
    service: "Consent Management API",
    version: "1.0.0",
    description: "Patient consent collection, tracking, and enforcement for HIPAA/GDPR/Saudi PDPL compliance",
    compliance: {
      hipaa: "Privacy Rule §164.508 — Authorization management",
      gdpr: "Articles 6, 7, 9 — Lawful basis and consent conditions",
      saudiPDPL: "Articles 10-14 — Consent requirements for personal data",
      cchi: "Council of Cooperative Health Insurance — Saudi healthcare regulations",
    },
    capabilities: {
      create: "Record new patient consent with verification",
      revoke: "Revoke existing consent with audit trail",
      check_access: "Determine if data access is permitted based on consent status",
      dashboard: "Compliance monitoring and reporting",
      policies: "Pre-defined consent policy templates",
    },
    policies: CONSENT_POLICIES.map(p => ({ id: p.id, name: p.name, category: p.category, mandatory: p.mandatory })),
    consents: allConsents.slice(0, 50),
    total: allConsents.length,
    consentCategories: [
      "treatment", "research", "data_sharing", "telehealth",
      "ai_ml_usage", "marketing", "cross_border_transfer",
      "genetic_testing", "mental_health", "substance_abuse",
      "hiv_aids", "reproductive_health", "minor_treatment",
      "emergency_override", "organ_donation", "advance_directive",
    ],
    verificationMethods: [
      "written_signature", "electronic_signature", "verbal_recorded",
      "biometric", "guardian_consent", "court_order", "implied",
    ],
    regulatoryFrameworks: ["hipaa", "gdpr", "saudi_pdpl", "cchi"],
  });
}

// ─── POST /api/google-health/consent ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ─── CREATE: New consent record ──────────────────────────────────
    if (action === "create") {
      const { patientId, patientName, policyId, verificationMethod, scopeDetails, guardian, witness, restrictions, language, createdBy } = body;

      if (!patientId) {
        return NextResponse.json({ error: "patientId is required" }, { status: 400 });
      }
      if (!policyId) {
        return NextResponse.json({ error: "policyId is required. Use GET ?view=policies to see available policies." }, { status: 400 });
      }

      const consent = createConsent({
        patientId,
        patientName,
        policyId,
        verificationMethod: verificationMethod || "electronic_signature",
        scopeDetails,
        guardian,
        witness,
        restrictions,
        language,
        createdBy: createdBy || "api",
      });

      return NextResponse.json({ success: true, action: "create", consent });
    }

    // ─── REVOKE: Revoke existing consent ─────────────────────────────
    if (action === "revoke") {
      const { consentId, revokedBy, reason } = body;

      if (!consentId) {
        return NextResponse.json({ error: "consentId is required" }, { status: 400 });
      }
      if (!reason) {
        return NextResponse.json({ error: "reason is required for revocation" }, { status: 400 });
      }

      const consent = revokeConsent(consentId, revokedBy || "patient", reason);
      return NextResponse.json({ success: true, action: "revoke", consent });
    }

    // ─── CHECK_ACCESS: Access determination ──────────────────────────
    if (action === "check_access") {
      const { patientId, purpose, dataElements, requestor } = body;

      if (!patientId) {
        return NextResponse.json({ error: "patientId is required" }, { status: 400 });
      }
      if (!purpose) {
        return NextResponse.json({ error: "purpose is required" }, { status: 400 });
      }

      const determination = checkAccess(
        patientId,
        purpose,
        dataElements || ["all_data"],
        requestor || "unknown",
      );

      return NextResponse.json({ success: true, action: "check_access", ...determination });
    }

    // ─── SEED: Create demo consent data ──────────────────────────────
    if (action === "seed") {
      const consents = seedDemoConsents();
      return NextResponse.json({
        success: true,
        action: "seed",
        message: `Created ${consents.length} demo consent records`,
        consents: consents.map(c => ({ id: c.id, patientName: c.patientName, policy: c.policyName, status: c.status })),
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Use: create, revoke, check_access, seed` },
      { status: 400 },
    );
  } catch (err) {
    console.error("[api/google-health/consent] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Consent management error" },
      { status: 500 },
    );
  }
}
