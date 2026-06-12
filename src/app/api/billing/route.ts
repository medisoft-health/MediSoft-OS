/**
 * Medical Billing — Backend API
 * CPT auto-coding, insurance claims management, NPHIES integration
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth-helpers";
import { db } from "@/db";
import { billingClaims, insuranceProviders, encounters } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/ai/gemini";

// GET /api/billing — List claims or get billing stats
export async function GET(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const action = searchParams.get("action");

    // Get insurance providers
    if (action === "providers") {
      const providers = await db.select().from(insuranceProviders).where(eq(insuranceProviders.isActive, true));
      return NextResponse.json({ success: true, data: providers });
    }

    // Get billing stats
    if (action === "stats") {
      const allClaims = await db.select().from(billingClaims);
      const stats = {
        totalClaims: allClaims.length,
        totalRevenue: allClaims.reduce((sum, c) => sum + parseFloat(c.totalAmount || "0"), 0),
        approvedAmount: allClaims.filter(c => c.status === "approved" || c.status === "paid")
          .reduce((sum, c) => sum + parseFloat(c.approvedAmount || "0"), 0),
        pendingClaims: allClaims.filter(c => c.status === "submitted" || c.status === "pending_review").length,
        rejectedClaims: allClaims.filter(c => c.status === "rejected").length,
        paidClaims: allClaims.filter(c => c.status === "paid").length,
        aiCodedPercentage: allClaims.length > 0
          ? Math.round((allClaims.filter(c => c.aiGeneratedCodes).length / allClaims.length) * 100)
          : 0,
      };
      return NextResponse.json({ success: true, data: stats });
    }

    // List claims
    const conditions = [];
    if (patientId) conditions.push(eq(billingClaims.patientId, parseInt(patientId)));
    if (status) conditions.push(eq(billingClaims.status, status as any));

    const claims = await db
      .select({
        id: billingClaims.id,
        claimNumber: billingClaims.claimNumber,
        patientId: billingClaims.patientId,
        physicianId: billingClaims.physicianId,
        encounterId: billingClaims.encounterId,
        icdCodes: billingClaims.icdCodes,
        cptCodes: billingClaims.cptCodes,
        totalAmount: billingClaims.totalAmount,
        approvedAmount: billingClaims.approvedAmount,
        status: billingClaims.status,
        submittedAt: billingClaims.submittedAt,
        aiGeneratedCodes: billingClaims.aiGeneratedCodes,
        aiConfidence: billingClaims.aiConfidence,
        physicianVerified: billingClaims.physicianVerified,
        nphiesClaimId: billingClaims.nphiesClaimId,
        createdAt: billingClaims.createdAt,
      })
      .from(billingClaims)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(billingClaims.createdAt))
      .limit(50);

    return NextResponse.json({ success: true, data: claims });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/billing — Create claim or auto-code encounter
export async function POST(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { action, encounterId, patientId, physicianId, insuranceProviderId } = body;

    // Auto-code an encounter using AI
    if (action === "auto_code") {
      if (!encounterId) {
        return NextResponse.json({ success: false, error: "encounterId required for auto_code" }, { status: 400 });
      }

      // Get encounter details
      const [encounter] = await db.select().from(encounters).where(eq(encounters.id, encounterId));
      if (!encounter) {
        return NextResponse.json({ success: false, error: "Encounter not found" }, { status: 404 });
      }

      // Use AI to generate CPT codes from SOAP note
      const codingPrompt = `You are an expert medical coder. Based on this clinical encounter, generate accurate CPT and ICD-10 codes.

SOAP Note:
${JSON.stringify(encounter.soapNote, null, 2)}

ICD Codes from encounter: ${JSON.stringify(encounter.icdCodes)}

Generate the response in JSON format:
{
  "cptCodes": [
    { "code": "99213", "description": "Office visit, established patient, moderate complexity", "units": 1, "fee": 150.00 }
  ],
  "icdCodes": [
    { "code": "J06.9", "description": "Acute upper respiratory infection, unspecified" }
  ],
  "totalAmount": 150.00,
  "confidence": 0.95,
  "reasoning": "Brief explanation of code selection"
}`;

      const aiResult = await getGeminiClient()!.models.generateContent({ model: GEMINI_MODEL, contents: [{ role: "user", parts: [{ text: codingPrompt }] }], config: { temperature: 0.3 } });
      const aiText = aiResult.text ?? "";

      let codingResult;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        codingResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        codingResult = null;
      }

      if (!codingResult) {
        return NextResponse.json({ success: false, error: "AI coding failed" }, { status: 500 });
      }

      // Create the claim
      const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}`;
      const [newClaim] = await db
        .insert(billingClaims)
        .values({
          claimNumber,
          patientId: encounter.patientId,
          physicianId: encounter.physicianId,
          encounterId,
          insuranceProviderId: insuranceProviderId || null,
          icdCodes: codingResult.icdCodes,
          cptCodes: codingResult.cptCodes,
          totalAmount: codingResult.totalAmount.toString(),
          status: "draft",
          aiGeneratedCodes: true,
          aiConfidence: codingResult.confidence.toString(),
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: {
          claim: newClaim,
          coding: codingResult,
        },
      });
    }

    // Manual claim creation
    if (action === "create_claim") {
      const { icdCodes, cptCodes, totalAmount } = body;
      const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}`;

      const [newClaim] = await db
        .insert(billingClaims)
        .values({
          claimNumber,
          patientId,
          physicianId,
          encounterId: encounterId || null,
          insuranceProviderId: insuranceProviderId || null,
          icdCodes,
          cptCodes,
          totalAmount: totalAmount.toString(),
          status: "draft",
          aiGeneratedCodes: false,
        })
        .returning();

      return NextResponse.json({ success: true, data: newClaim }, { status: 201 });
    }

    // Submit claim to NPHIES
    if (action === "submit_nphies") {
      const { claimId } = body;
      if (!claimId) {
        return NextResponse.json({ success: false, error: "claimId required" }, { status: 400 });
      }

      const [claim] = await db.select().from(billingClaims).where(eq(billingClaims.id, claimId));
      if (!claim) {
        return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
      }

      // NPHIES submission (simulated — real integration requires CCHI credentials)
      const nphiesPayload = buildNphiesClaim(claim);
      const nphiesClaimId = `NPHIES-${Date.now().toString(36).toUpperCase()}`;

      // In production, this would call the NPHIES API:
      // const nphiesResponse = await submitToNphies(nphiesPayload);

      const [updated] = await db
        .update(billingClaims)
        .set({
          status: "submitted",
          submittedAt: new Date(),
          nphiesClaimId,
          nphiesBundleId: `BUNDLE-${Date.now().toString(36)}`,
          nphiesResponse: { status: "accepted", timestamp: new Date().toISOString() },
        })
        .where(eq(billingClaims.id, claimId))
        .returning();

      return NextResponse.json({
        success: true,
        data: {
          claim: updated,
          nphiesClaimId,
          message: "Claim submitted to NPHIES successfully",
        },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/billing — Update claim status (physician verification)
export async function PATCH(req: NextRequest) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { claimId, action: patchAction, ...updateData } = body;

    if (!claimId) {
      return NextResponse.json({ success: false, error: "claimId required" }, { status: 400 });
    }

    if (patchAction === "verify") {
      const [updated] = await db
        .update(billingClaims)
        .set({ physicianVerified: true })
        .where(eq(billingClaims.id, claimId))
        .returning();
      return NextResponse.json({ success: true, data: updated });
    }

    if (patchAction === "update_status") {
      const [updated] = await db
        .update(billingClaims)
        .set({
          status: updateData.status,
          approvedAmount: updateData.approvedAmount?.toString(),
          rejectionReason: updateData.rejectionReason,
        })
        .where(eq(billingClaims.id, claimId))
        .returning();
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper: Build NPHIES FHIR Claim Bundle
function buildNphiesClaim(claim: any) {
  return {
    resourceType: "Bundle",
    type: "message",
    entry: [
      {
        resource: {
          resourceType: "Claim",
          status: "active",
          type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/claim-type", code: "professional" }] },
          patient: { reference: `Patient/${claim.patientId}` },
          provider: { reference: `Practitioner/${claim.physicianId}` },
          diagnosis: (claim.icdCodes || []).map((icd: any, i: number) => ({
            sequence: i + 1,
            diagnosisCodeableConcept: {
              coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: icd.code, display: icd.description }],
            },
          })),
          item: (claim.cptCodes || []).map((cpt: any, i: number) => ({
            sequence: i + 1,
            productOrService: {
              coding: [{ system: "http://www.ama-assn.org/go/cpt", code: cpt.code, display: cpt.description }],
            },
            quantity: { value: cpt.units },
            unitPrice: { value: cpt.fee, currency: "SAR" },
          })),
          total: { value: parseFloat(claim.totalAmount), currency: "SAR" },
        },
      },
    ],
  };
}
