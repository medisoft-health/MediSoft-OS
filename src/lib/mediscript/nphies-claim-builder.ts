/**
 * NPHIES Claim Builder — Saudi National Platform for Health Insurance Exchange Services
 *
 * Generates FHIR R4 Claim resources compliant with NPHIES Implementation Guide (IG).
 * Supports:
 * - Professional Claims (outpatient)
 * - Institutional Claims (inpatient)
 * - Prior Authorization requests
 * - Eligibility verification requests
 *
 * References:
 * - NPHIES IG: https://portal.nphies.sa/ig
 * - CCHI Coding Standards: Saudi Billing System V3.0
 * - FHIR R4: https://hl7.org/fhir/R4
 *
 * @module nphies-claim-builder
 */

// ─────────────────────────────────────────────────────────────────
//  NPHIES Code Systems
// ─────────────────────────────────────────────────────────────────

export const NPHIES_CODE_SYSTEMS = {
  // Encounter types
  ENCOUNTER_TYPE: "http://nphies.sa/terminology/CodeSystem/encounter-type",
  // Claim types
  CLAIM_TYPE: "http://terminology.hl7.org/CodeSystem/claim-type",
  // Diagnosis types
  DIAGNOSIS_TYPE: "http://nphies.sa/terminology/CodeSystem/diagnosis-type",
  // Service types
  SERVICE_TYPE: "http://nphies.sa/terminology/CodeSystem/service-type",
  // ICD-10-AM
  ICD10_AM: "http://hl7.org/fhir/sid/icd-10-am",
  // SBS Procedures (ACHI-based)
  SBS_PROCEDURES: "http://nphies.sa/terminology/CodeSystem/procedures",
  // SBS Services
  SBS_SERVICES: "http://nphies.sa/terminology/CodeSystem/services",
  // Priority
  PRIORITY: "http://terminology.hl7.org/CodeSystem/processpriority",
  // Relationship
  RELATIONSHIP: "http://terminology.hl7.org/CodeSystem/subscriber-relationship",
  // Outcome
  OUTCOME: "http://hl7.org/fhir/remittance-outcome",
} as const;

export const NPHIES_ENCOUNTER_TYPES = {
  AMB: { code: "AMB", display: "Ambulatory", displayAr: "عيادة خارجية" },
  EMER: { code: "EMER", display: "Emergency", displayAr: "طوارئ" },
  IMP: { code: "IMP", display: "Inpatient", displayAr: "تنويم" },
  SS: { code: "SS", display: "Short Stay", displayAr: "إقامة قصيرة" },
  HH: { code: "HH", display: "Home Health", displayAr: "رعاية منزلية" },
  VR: { code: "VR", display: "Virtual", displayAr: "عن بُعد" },
} as const;

export const NPHIES_CLAIM_TYPES = {
  professional: { code: "professional", display: "Professional" },
  institutional: { code: "institutional", display: "Institutional" },
  oral: { code: "oral", display: "Oral" },
  pharmacy: { code: "pharmacy", display: "Pharmacy" },
  vision: { code: "vision", display: "Vision" },
} as const;

export const NPHIES_DIAGNOSIS_TYPES = {
  principal: { code: "principal", display: "Principal Diagnosis" },
  secondary: { code: "secondary", display: "Secondary Diagnosis" },
  admitting: { code: "admitting", display: "Admitting Diagnosis" },
  discharge: { code: "discharge", display: "Discharge Diagnosis" },
  clinical: { code: "clinical", display: "Clinical Diagnosis" },
} as const;

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────

export interface NphiesPatientInfo {
  id: string;
  nationalId: string; // Saudi ID or Iqama number
  name: string;
  nameAr: string;
  birthDate: string; // YYYY-MM-DD
  gender: "male" | "female";
  insuranceId?: string;
  insurerCode?: string;
  policyNumber?: string;
  subscriberRelationship?: string;
}

export interface NphiesProviderInfo {
  id: string;
  facilityLicense: string; // MOH facility license number
  facilityName: string;
  facilityNameAr: string;
  practitionerLicense: string; // SCFHS license number
  practitionerName: string;
  practitionerSpecialty: string;
}

export interface NphiesDiagnosis {
  code: string; // ICD-10-AM code
  display: string;
  displayAr: string;
  type: keyof typeof NPHIES_DIAGNOSIS_TYPES;
  sequencing: number;
  presentOnAdmission?: boolean;
}

export interface NphiesProcedure {
  code: string; // SBS/ACHI code
  display: string;
  displayAr: string;
  date?: string;
  quantity?: number;
}

export interface NphiesService {
  code: string; // SBS service code
  display: string;
  displayAr: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface NphiesClaimInput {
  patient: NphiesPatientInfo;
  provider: NphiesProviderInfo;
  encounterType: keyof typeof NPHIES_ENCOUNTER_TYPES;
  claimType: keyof typeof NPHIES_CLAIM_TYPES;
  diagnoses: NphiesDiagnosis[];
  procedures: NphiesProcedure[];
  services: NphiesService[];
  encounterDate: string; // YYYY-MM-DD
  encounterStartTime?: string; // HH:mm
  encounterEndTime?: string; // HH:mm
  priority?: "normal" | "stat";
  prescriptionId?: string;
  referralId?: string;
  priorAuthorizationId?: string;
}

export interface NphiesFhirClaim {
  resourceType: "Claim";
  id: string;
  meta: {
    profile: string[];
  };
  status: "active" | "cancelled" | "draft";
  type: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  use: "claim" | "preauthorization" | "predetermination";
  patient: {
    reference: string;
    display: string;
  };
  created: string;
  insurer: {
    reference: string;
    display: string;
  };
  provider: {
    reference: string;
    display: string;
  };
  priority: {
    coding: Array<{
      system: string;
      code: string;
    }>;
  };
  insurance: Array<{
    sequence: number;
    focal: boolean;
    coverage: {
      reference: string;
      display: string;
    };
  }>;
  diagnosis: Array<{
    sequence: number;
    diagnosisCodeableConcept: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    type: Array<{
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    }>;
    onAdmission?: {
      coding: Array<{
        system: string;
        code: string;
      }>;
    };
  }>;
  procedure: Array<{
    sequence: number;
    date?: string;
    procedureCodeableConcept: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
  }>;
  item: Array<{
    sequence: number;
    productOrService: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    quantity?: {
      value: number;
    };
    unitPrice?: {
      value: number;
      currency: string;
    };
    net?: {
      value: number;
      currency: string;
    };
    diagnosisSequence?: number[];
    procedureSequence?: number[];
  }>;
  total?: {
    value: number;
    currency: string;
  };
  supportingInfo?: Array<{
    sequence: number;
    category: {
      coding: Array<{
        system: string;
        code: string;
      }>;
    };
    valueString?: string;
    valueReference?: {
      reference: string;
    };
  }>;
}

export interface NphiesEligibilityRequest {
  resourceType: "CoverageEligibilityRequest";
  id: string;
  status: "active";
  purpose: ("validation" | "benefits" | "discovery")[];
  patient: {
    reference: string;
  };
  created: string;
  insurer: {
    reference: string;
  };
  provider: {
    reference: string;
  };
  insurance: Array<{
    coverage: {
      reference: string;
    };
  }>;
}

// ─────────────────────────────────────────────────────────────────
//  Builder Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Generate a unique claim ID in NPHIES format
 */
function generateClaimId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `CLM-${timestamp}-${random}`.toUpperCase();
}

/**
 * Build a NPHIES-compliant FHIR R4 Claim resource
 */
export function buildNphiesClaim(input: NphiesClaimInput): NphiesFhirClaim {
  const claimId = generateClaimId();
  const now = new Date().toISOString();

  const claim: NphiesFhirClaim = {
    resourceType: "Claim",
    id: claimId,
    meta: {
      profile: [
        "http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/professional-claim|1.0.0",
      ],
    },
    status: "active",
    type: {
      coding: [
        {
          system: NPHIES_CODE_SYSTEMS.CLAIM_TYPE,
          code: input.claimType,
          display: NPHIES_CLAIM_TYPES[input.claimType].display,
        },
      ],
    },
    use: input.priorAuthorizationId ? "claim" : "preauthorization",
    patient: {
      reference: `Patient/${input.patient.id}`,
      display: input.patient.name,
    },
    created: now,
    insurer: {
      reference: `Organization/${input.patient.insurerCode || "unknown"}`,
      display: input.patient.insurerCode || "Insurance Provider",
    },
    provider: {
      reference: `Organization/${input.provider.id}`,
      display: input.provider.facilityName,
    },
    priority: {
      coding: [
        {
          system: NPHIES_CODE_SYSTEMS.PRIORITY,
          code: input.priority || "normal",
        },
      ],
    },
    insurance: [
      {
        sequence: 1,
        focal: true,
        coverage: {
          reference: `Coverage/${input.patient.insuranceId || "self-pay"}`,
          display: input.patient.policyNumber || "Self-Pay",
        },
      },
    ],
    diagnosis: input.diagnoses.map((dx, idx) => ({
      sequence: dx.sequencing || idx + 1,
      diagnosisCodeableConcept: {
        coding: [
          {
            system: NPHIES_CODE_SYSTEMS.ICD10_AM,
            code: dx.code,
            display: dx.display,
          },
        ],
        text: dx.displayAr || dx.display,
      },
      type: [
        {
          coding: [
            {
              system: NPHIES_CODE_SYSTEMS.DIAGNOSIS_TYPE,
              code: NPHIES_DIAGNOSIS_TYPES[dx.type].code,
              display: NPHIES_DIAGNOSIS_TYPES[dx.type].display,
            },
          ],
        },
      ],
      ...(dx.presentOnAdmission !== undefined && {
        onAdmission: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/ex-diagnosis-on-admission",
              code: dx.presentOnAdmission ? "y" : "n",
            },
          ],
        },
      }),
    })),
    procedure: input.procedures.map((proc, idx) => ({
      sequence: idx + 1,
      ...(proc.date && { date: proc.date }),
      procedureCodeableConcept: {
        coding: [
          {
            system: NPHIES_CODE_SYSTEMS.SBS_PROCEDURES,
            code: proc.code,
            display: proc.display,
          },
        ],
        text: proc.displayAr || proc.display,
      },
    })),
    item: input.services.map((svc, idx) => ({
      sequence: idx + 1,
      productOrService: {
        coding: [
          {
            system: NPHIES_CODE_SYSTEMS.SBS_SERVICES,
            code: svc.code,
            display: svc.display,
          },
        ],
        text: svc.displayAr || svc.display,
      },
      quantity: {
        value: svc.quantity,
      },
      ...(svc.unitPrice !== undefined && {
        unitPrice: {
          value: svc.unitPrice,
          currency: "SAR",
        },
      }),
      ...(svc.totalPrice !== undefined && {
        net: {
          value: svc.totalPrice,
          currency: "SAR",
        },
      }),
      // Link to first diagnosis and first procedure
      ...(input.diagnoses.length > 0 && {
        diagnosisSequence: [1],
      }),
      ...(input.procedures.length > 0 && {
        procedureSequence: [1],
      }),
    })),
    supportingInfo: [],
  };

  // Add prior authorization reference if exists
  if (input.priorAuthorizationId) {
    claim.supportingInfo!.push({
      sequence: 1,
      category: {
        coding: [
          {
            system: "http://nphies.sa/terminology/CodeSystem/claim-information-category",
            code: "info",
          },
        ],
      },
      valueReference: {
        reference: `ClaimResponse/${input.priorAuthorizationId}`,
      },
    });
  }

  // Add prescription reference if exists
  if (input.prescriptionId) {
    claim.supportingInfo!.push({
      sequence: (claim.supportingInfo?.length || 0) + 1,
      category: {
        coding: [
          {
            system: "http://nphies.sa/terminology/CodeSystem/claim-information-category",
            code: "info",
          },
        ],
      },
      valueReference: {
        reference: `MedicationRequest/${input.prescriptionId}`,
      },
    });
  }

  // Calculate total
  const total = input.services.reduce((sum, svc) => sum + (svc.totalPrice || 0), 0);
  if (total > 0) {
    claim.total = {
      value: total,
      currency: "SAR",
    };
  }

  return claim;
}

/**
 * Build a NPHIES Eligibility Verification Request
 */
export function buildEligibilityRequest(
  patient: NphiesPatientInfo,
  provider: NphiesProviderInfo,
): NphiesEligibilityRequest {
  return {
    resourceType: "CoverageEligibilityRequest",
    id: `ELIG-${Date.now().toString(36)}`.toUpperCase(),
    status: "active",
    purpose: ["validation", "benefits"],
    patient: {
      reference: `Patient/${patient.id}`,
    },
    created: new Date().toISOString(),
    insurer: {
      reference: `Organization/${patient.insurerCode || "unknown"}`,
    },
    provider: {
      reference: `Organization/${provider.id}`,
    },
    insurance: [
      {
        coverage: {
          reference: `Coverage/${patient.insuranceId || "self-pay"}`,
        },
      },
    ],
  };
}

/**
 * Convert billing intelligence results to NPHIES claim input
 */
export function billingResultToClaimInput(
  billingResult: {
    icd10amCodes: Array<{
      code: string;
      description: string;
      descriptionAr: string;
      isPrimary: boolean;
      sequencing: number;
    }>;
    sbsProcedureCodes: Array<{
      code: string;
      description: string;
      descriptionAr: string;
      units?: number;
    }>;
    sbsServiceCodes?: Array<{
      code: string;
      description: string;
      descriptionAr: string;
    }>;
    nphiesClassification: {
      type: string;
      claimType: string;
    };
  },
  patient: NphiesPatientInfo,
  provider: NphiesProviderInfo,
  encounterDate: string,
): NphiesClaimInput {
  return {
    patient,
    provider,
    encounterType: (billingResult.nphiesClassification.type as keyof typeof NPHIES_ENCOUNTER_TYPES) || "AMB",
    claimType: (billingResult.nphiesClassification.claimType as keyof typeof NPHIES_CLAIM_TYPES) || "professional",
    diagnoses: billingResult.icd10amCodes.map((dx) => ({
      code: dx.code,
      display: dx.description,
      displayAr: dx.descriptionAr,
      type: dx.isPrimary ? "principal" as const : "secondary" as const,
      sequencing: dx.sequencing,
    })),
    procedures: billingResult.sbsProcedureCodes.map((proc) => ({
      code: proc.code,
      display: proc.description,
      displayAr: proc.descriptionAr,
      quantity: proc.units || 1,
    })),
    services: (billingResult.sbsServiceCodes || []).map((svc) => ({
      code: svc.code,
      display: svc.description,
      displayAr: svc.descriptionAr,
      quantity: 1,
    })),
    encounterDate,
  };
}

/**
 * Validate a claim against NPHIES business rules
 */
export function validateNphiesClaim(claim: NphiesFhirClaim): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Must have at least one diagnosis
  if (!claim.diagnosis || claim.diagnosis.length === 0) {
    errors.push("يجب أن تحتوي المطالبة على تشخيص واحد على الأقل — At least one diagnosis is required");
  }

  // Rule 2: Must have exactly one principal diagnosis
  const principalDx = claim.diagnosis?.filter(
    (d) => d.type?.[0]?.coding?.[0]?.code === "principal"
  );
  if (!principalDx || principalDx.length === 0) {
    errors.push("يجب تحديد تشخيص رئيسي واحد — A principal diagnosis must be specified");
  } else if (principalDx.length > 1) {
    errors.push("لا يمكن وجود أكثر من تشخيص رئيسي واحد — Only one principal diagnosis is allowed");
  }

  // Rule 3: Must have at least one service item
  if (!claim.item || claim.item.length === 0) {
    errors.push("يجب أن تحتوي المطالبة على خدمة واحدة على الأقل — At least one service item is required");
  }

  // Rule 4: Patient reference must exist
  if (!claim.patient?.reference) {
    errors.push("مرجع المريض مطلوب — Patient reference is required");
  }

  // Rule 5: Provider reference must exist
  if (!claim.provider?.reference) {
    errors.push("مرجع مقدم الخدمة مطلوب — Provider reference is required");
  }

  // Rule 6: Insurance coverage must exist
  if (!claim.insurance || claim.insurance.length === 0) {
    errors.push("معلومات التأمين مطلوبة — Insurance information is required");
  }

  // Warning: No total calculated
  if (!claim.total || claim.total.value === 0) {
    warnings.push("لم يتم حساب إجمالي المطالبة — Claim total not calculated");
  }

  // Warning: Procedures without dates
  const procsWithoutDates = claim.procedure?.filter((p) => !p.date);
  if (procsWithoutDates && procsWithoutDates.length > 0) {
    warnings.push("بعض الإجراءات بدون تاريخ — Some procedures are missing dates");
  }

  // Rule 7: ICD-10-AM codes must use correct system
  const invalidDxSystems = claim.diagnosis?.filter(
    (d) => d.diagnosisCodeableConcept?.coding?.[0]?.system !== NPHIES_CODE_SYSTEMS.ICD10_AM
  );
  if (invalidDxSystems && invalidDxSystems.length > 0) {
    errors.push("يجب استخدام نظام ICD-10-AM للتشخيصات — ICD-10-AM system must be used for diagnoses");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Export claim as NPHIES Bundle (for batch submission)
 */
export function buildNphiesBundle(claims: NphiesFhirClaim[]): object {
  return {
    resourceType: "Bundle",
    id: `BUNDLE-${Date.now().toString(36)}`.toUpperCase(),
    type: "batch",
    timestamp: new Date().toISOString(),
    entry: claims.map((claim) => ({
      fullUrl: `urn:uuid:${claim.id}`,
      resource: claim,
      request: {
        method: "POST",
        url: "Claim",
      },
    })),
  };
}
