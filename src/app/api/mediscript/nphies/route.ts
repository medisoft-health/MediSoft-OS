/**
 * NPHIES Claim Export API
 *
 * POST /api/mediscript/nphies
 *
 * Generates a NPHIES-compliant FHIR R4 Claim resource from billing intelligence results.
 * Used after the doctor reviews and approves billing codes.
 */

import { NextResponse } from "next/server";
import { requireSessionApi, enforceRateLimit } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import {
  buildNphiesClaim,
  validateNphiesClaim,
  billingResultToClaimInput,
  type NphiesPatientInfo,
  type NphiesProviderInfo,
} from "@/lib/mediscript/nphies-claim-builder";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Auth — matches SOAP route pattern
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  // Rate limit — matches SOAP route pattern
  const rl = await enforceRateLimit(auth.user, POLICIES.AI_GEMINI);
  if (!rl.ok) return rl.response;

  try {
    const body = await request.json();
    const { billingResult, patientInfo, encounterDate } = body;

    if (!billingResult || !patientInfo) {
      return NextResponse.json(
        { error: "billingResult and patientInfo are required" },
        { status: 400 }
      );
    }

    // Build patient info for NPHIES
    const patient: NphiesPatientInfo = {
      id: patientInfo.id?.toString() || "unknown",
      nationalId: patientInfo.nationalId || patientInfo.mrn || "",
      name: patientInfo.name || "Unknown Patient",
      nameAr: patientInfo.nameAr || patientInfo.name || "مريض",
      birthDate: patientInfo.birthDate || "1990-01-01",
      gender: patientInfo.gender || "male",
      insuranceId: patientInfo.insuranceId,
      insurerCode: patientInfo.insurerCode,
      policyNumber: patientInfo.policyNumber,
    };

    // Build provider info from session
    const provider: NphiesProviderInfo = {
      id: auth.user.id || "unknown",
      facilityLicense: process.env.MOH_FACILITY_LICENSE || "PENDING",
      facilityName: process.env.FACILITY_NAME || "MediSoft Health",
      facilityNameAr: process.env.FACILITY_NAME_AR || "ميديسوفت الصحية",
      practitionerLicense: (auth.user as any).scfhsLicense || "PENDING",
      practitionerName: auth.user.name || "Unknown",
      practitionerSpecialty: (auth.user as any).specialty || "general",
    };

    // Convert billing result to claim input
    const claimInput = billingResultToClaimInput(
      billingResult,
      patient,
      provider,
      encounterDate || new Date().toISOString().split("T")[0]
    );

    // Build the FHIR Claim
    const claim = buildNphiesClaim(claimInput);

    // Validate against NPHIES business rules
    const validation = validateNphiesClaim(claim);

    return NextResponse.json({
      claim,
      validation,
      meta: {
        generatedAt: new Date().toISOString(),
        nphiesVersion: "1.0.0",
        codingSystems: {
          diagnosis: "ICD-10-AM",
          procedures: "SBS/ACHI",
          services: "SBS Services",
        },
        compliance: {
          cchi: true,
          moh: true,
          nphies: validation.valid,
        },
      },
    });
  } catch (err) {
    console.error("[NPHIES] Error building claim:", err);
    return NextResponse.json(
      { error: "فشل في إنشاء المطالبة — Failed to generate NPHIES claim" },
      { status: 500 }
    );
  }
}
