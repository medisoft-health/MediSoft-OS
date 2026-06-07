import "server-only";
/**
 * Consent Management API — Patient Consent Tracking
 *
 * Implements Google Cloud Healthcare Consent Management API capabilities:
 *   - Patient consent collection and storage
 *   - Consent policy enforcement
 *   - Access determination based on consent status
 *   - Consent revocation and expiration
 *   - Audit trail for consent changes
 *   - Multi-regulation support (HIPAA, GDPR, Saudi PDPL)
 *
 * Data Model (aligned with Google Cloud Healthcare Consent API):
 *   - ConsentStore: Container for consent resources
 *   - UserDataMapping: Links user data to a data owner
 *   - Consent: A patient's consent directive
 *   - ConsentArtifact: Evidence of consent (signed form, recording)
 *
 * Use Cases:
 *   - Treatment consent (procedures, surgeries)
 *   - Research participation consent
 *   - Data sharing consent (with third parties)
 *   - Telehealth consent
 *   - AI/ML data usage consent
 *   - Marketing communications consent
 *   - Cross-border data transfer consent
 *
 * Compliance:
 *   - HIPAA Privacy Rule (§164.508 — Authorization)
 *   - GDPR Articles 6, 7, 9 (Lawful basis, Conditions for consent)
 *   - Saudi PDPL Articles 10-14 (Consent requirements)
 *   - CCHI (Council of Cooperative Health Insurance) requirements
 *
 * @see https://docs.cloud.google.com/healthcare-api/docs/concepts/consent
 */

import * as fs from "fs";
import * as crypto from "crypto";
import { getAccessTokenForScopes, fetchWithRetry } from "./auth";

// ─── Google Cloud Healthcare Consent API Integration ────────────────────────

const USE_CLOUD_CONSENT = process.env.USE_CLOUD_CONSENT_API === "true";
const GCP_PROJECT = process.env.GCP_PROJECT_ID || "";
const GCP_LOCATION = process.env.GCP_LOCATION || "";
const GCP_DATASET = process.env.GCP_DATASET || "";
const CONSENT_STORE_ID = process.env.GCP_CONSENT_STORE || "";

const CONSENT_API_BASE = `https://healthcare.googleapis.com/v1/projects/${GCP_PROJECT}/locations/${GCP_LOCATION}/datasets/${GCP_DATASET}/consentStores/${CONSENT_STORE_ID}`;

async function getConsentApiToken(): Promise<string> {
  if (!GCP_PROJECT || !GCP_LOCATION || !GCP_DATASET || !CONSENT_STORE_ID) {
    throw new Error(
      "Google Healthcare Consent API is not configured. Missing one of: GCP_PROJECT_ID, GCP_LOCATION, GCP_DATASET, GCP_CONSENT_STORE."
    );
  }
  return getAccessTokenForScopes("https://www.googleapis.com/auth/cloud-healthcare");
}

interface FailedSyncItem {
  record: ConsentRecord;
  action: "create" | "revoke";
  attempts: number;
}

const failedSyncQueue: FailedSyncItem[] = [];
let retryIntervalStarted = false;

function enqueueFailedSync(record: ConsentRecord, action: "create" | "revoke") {
  if (failedSyncQueue.some(item => item.record.id === record.id && item.action === action)) {
    return;
  }
  failedSyncQueue.push({ record, action, attempts: 0 });
  
  if (!retryIntervalStarted) {
    retryIntervalStarted = true;
    const interval = setInterval(async () => {
      await processFailedQueue();
    }, 60000);
    if (interval && typeof interval.unref === "function") {
      interval.unref();
    }
  }
}

async function processFailedQueue() {
  if (failedSyncQueue.length === 0) return;
  console.log(`[Consent Sync Recovery] Processing ${failedSyncQueue.length} failed consent syncs...`);
  
  const itemsToProcess = [...failedSyncQueue];
  for (const item of itemsToProcess) {
    item.attempts++;
    try {
      await executeSyncToCloud(item.record, item.action);
      const idx = failedSyncQueue.findIndex(i => i.record.id === item.record.id && i.action === item.action);
      if (idx > -1) failedSyncQueue.splice(idx, 1);
      console.log(`[Consent Sync Recovery] Successfully recovered sync for record ${item.record.id} (${item.action})`);
    } catch (err: any) {
      console.warn(`[Consent Sync Recovery] Recovery attempt ${item.attempts} for ${item.record.id} failed: ${err.message}`);
      if (item.attempts >= 5) {
        const idx = failedSyncQueue.findIndex(i => i.record.id === item.record.id && i.action === item.action);
        if (idx > -1) failedSyncQueue.splice(idx, 1);
        console.error(`[Consent Sync Recovery] Dropping failed sync for record ${item.record.id} after 5 failed recovery attempts`);
      }
    }
  }
}

async function executeSyncToCloud(record: ConsentRecord, action: "create" | "revoke"): Promise<void> {
  const token = await getConsentApiToken();

  if (action === "create") {
    const consentResource = {
      userId: record.patientId,
      policies: [{ resourceAttributes: [{ attributeDefinitionId: "category", values: [record.category] }] }],
      consentArtifact: `projects/${GCP_PROJECT}/locations/${GCP_LOCATION}/datasets/${GCP_DATASET}/consentStores/${CONSENT_STORE_ID}/consentArtifacts/${record.id}`,
      state: "ACTIVE",
      metadata: {
        medisoft_consent_id: record.id,
        policy_id: record.policyId,
        policy_name: record.policyName,
        regulation: record.regulation,
        verification_method: record.verificationMethod,
        created_by: record.createdBy,
      },
      expireTime: record.expirationDate || undefined,
    };

    const consentRes = await fetchWithRetry(`${CONSENT_API_BASE}/consents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(consentResource),
      timeoutMs: 15000,
      maxRetries: 3,
    });

    if (!consentRes.ok) {
      const errorText = await consentRes.text();
      throw new Error(`Cloud Healthcare Consent store returned ${consentRes.status}: ${errorText}`);
    }

    const mappingRes = await fetchWithRetry(`${CONSENT_API_BASE}/userDataMappings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        userId: record.patientId,
        dataId: record.id,
        resourceAttributes: [
          { attributeDefinitionId: "data_category", values: record.dataElements },
        ],
      }),
      timeoutMs: 15000,
      maxRetries: 3,
    });

    if (!mappingRes.ok) {
      const errorText = await mappingRes.text();
      throw new Error(`Cloud Healthcare UserDataMapping creation failed with ${mappingRes.status}: ${errorText}`);
    }
  } else if (action === "revoke") {
    const revokeRes = await fetchWithRetry(`${CONSENT_API_BASE}/consents/${record.id}:revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
      timeoutMs: 15000,
      maxRetries: 3,
    });

    if (!revokeRes.ok) {
      const errorText = await revokeRes.text();
      throw new Error(`Cloud Healthcare Consent revoke returned ${revokeRes.status}: ${errorText}`);
    }
  }
}

/**
 * Sync a consent record to Google Cloud Healthcare Consent API (fire-and-forget).
 * This runs in the background and does not block the synchronous local operations.
 */
function syncToCloudConsent(record: ConsentRecord, action: "create" | "revoke"): void {
  if (!USE_CLOUD_CONSENT) return;

  (async () => {
    try {
      await executeSyncToCloud(record, action);
      console.log(`[Consent] Cloud sync ${action} for ${record.id} succeeded`);
    } catch (err: any) {
      console.warn(`[Consent] Cloud sync ${action} for ${record.id} failed, enqueuing for retry: ${err.message}`);
      enqueueFailedSync(record, action);
    }
  })();
}

/**
 * Check access via Google Cloud Healthcare Consent API (async alternative).
 * Falls back to local check if cloud is unavailable.
 */
export async function checkAccessCloud(
  patientId: string,
  requestedPurpose: string,
  requestedDataElements: string[],
  requestor: string,
): Promise<AccessDetermination> {
  if (!USE_CLOUD_CONSENT) {
    return checkAccess(patientId, requestedPurpose, requestedDataElements, requestor);
  }

  try {
    const token = await getConsentApiToken();
    const res = await fetchWithRetry(`${CONSENT_API_BASE}:checkDataAccess`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        dataId: patientId,
        requestAttributes: {
          purpose: requestedPurpose,
          data_elements: requestedDataElements.join(","),
          requestor,
        },
        consentList: { consents: [] },
        responseView: "FULL",
      }),
      timeoutMs: 15000,
      maxRetries: 3,
    });

    if (!res.ok) {
      console.warn("[Consent] Cloud checkDataAccess failed, using local");
      return checkAccess(patientId, requestedPurpose, requestedDataElements, requestor);
    }

    const data = await res.json();
    const permitted = data.consentDetails && Object.keys(data.consentDetails).length > 0;

    return {
      permitted,
      reason: permitted ? "Cloud Healthcare Consent API approved access" : "No matching consent found in Cloud",
      applicableConsents: [],
      restrictions: [],
      regulatoryBasis: "Google Cloud Healthcare Consent API determination",
      emergencyOverrideAvailable: !permitted,
    };
  } catch {
    return checkAccess(patientId, requestedPurpose, requestedDataElements, requestor);
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConsentStatus = "active" | "revoked" | "expired" | "draft" | "rejected" | "pending_review";

export type ConsentCategory =
  | "treatment" | "research" | "data_sharing" | "telehealth"
  | "ai_ml_usage" | "marketing" | "cross_border_transfer"
  | "genetic_testing" | "mental_health" | "substance_abuse"
  | "hiv_aids" | "reproductive_health" | "minor_treatment"
  | "emergency_override" | "organ_donation" | "advance_directive";

export type ConsentScope =
  | "all_data" | "encounter_specific" | "condition_specific"
  | "date_range" | "provider_specific" | "purpose_specific";

export type VerificationMethod =
  | "written_signature" | "electronic_signature" | "verbal_recorded"
  | "biometric" | "guardian_consent" | "court_order" | "implied";

export type RegulationFramework = "hipaa" | "gdpr" | "saudi_pdpl" | "cchi";

export interface ConsentPolicy {
  /** Policy ID */
  id: string;
  /** Policy name */
  name: string;
  /** Category of consent */
  category: ConsentCategory;
  /** Regulatory framework */
  regulation: RegulationFramework;
  /** Scope of data covered */
  scope: ConsentScope;
  /** Required for treatment? */
  mandatory: boolean;
  /** Default expiration (days from signing) */
  defaultExpirationDays: number;
  /** Minimum age for self-consent */
  minimumAge: number;
  /** Requires witness? */
  requiresWitness: boolean;
  /** Revocable? */
  revocable: boolean;
  /** Description shown to patient */
  patientDescription: string;
  /** Arabic description */
  patientDescriptionAr?: string;
  /** Data elements covered */
  dataElements: string[];
  /** Permitted purposes */
  permittedPurposes: string[];
  /** Permitted recipients */
  permittedRecipients: string[];
}

export interface ConsentRecord {
  /** Unique consent ID */
  id: string;
  /** Patient ID (FHIR Patient reference) */
  patientId: string;
  /** Patient name (for display) */
  patientName?: string;
  /** Policy this consent is based on */
  policyId: string;
  /** Policy name */
  policyName: string;
  /** Category */
  category: ConsentCategory;
  /** Current status */
  status: ConsentStatus;
  /** Scope of consent */
  scope: ConsentScope;
  /** Specific scope details */
  scopeDetails?: {
    encounterId?: string;
    conditionCode?: string;
    dateRange?: { start: string; end: string };
    providerId?: string;
    purpose?: string;
  };
  /** Date consent was given */
  consentDate: string;
  /** Date consent expires */
  expirationDate?: string;
  /** Date consent was revoked (if applicable) */
  revocationDate?: string;
  /** Revocation reason */
  revocationReason?: string;
  /** Verification method */
  verificationMethod: VerificationMethod;
  /** Witness information */
  witness?: {
    name: string;
    role: string;
    date: string;
  };
  /** Guardian information (for minors) */
  guardian?: {
    name: string;
    relationship: string;
    id: string;
  };
  /** Consent artifact (evidence) */
  artifact?: {
    type: "pdf" | "image" | "audio" | "electronic";
    url?: string;
    hash?: string;
    signedAt: string;
  };
  /** Data elements consented to */
  dataElements: string[];
  /** Permitted purposes */
  permittedPurposes: string[];
  /** Permitted recipients */
  permittedRecipients: string[];
  /** Restrictions/conditions */
  restrictions?: string[];
  /** Regulatory framework */
  regulation: RegulationFramework;
  /** Version of the consent form */
  formVersion: string;
  /** Language of consent */
  language: string;
  /** Created by (user ID) */
  createdBy: string;
  /** Last modified */
  lastModified: string;
  /** Audit trail */
  auditTrail: ConsentAuditEntry[];
}

export interface ConsentAuditEntry {
  /** Timestamp */
  timestamp: string;
  /** Action performed */
  action: "created" | "activated" | "revoked" | "expired" | "renewed" | "modified" | "accessed" | "enforced";
  /** Who performed the action */
  actor: string;
  /** Actor role */
  actorRole: string;
  /** Details */
  details: string;
  /** IP address (for GDPR) */
  ipAddress?: string;
}

export interface AccessDetermination {
  /** Whether access is permitted */
  permitted: boolean;
  /** Reason for determination */
  reason: string;
  /** Applicable consent records */
  applicableConsents: Array<{ id: string; status: ConsentStatus; category: ConsentCategory }>;
  /** Restrictions that apply */
  restrictions: string[];
  /** Regulatory basis */
  regulatoryBasis: string;
  /** Emergency override available? */
  emergencyOverrideAvailable: boolean;
}

// ─── Pre-defined Policies ────────────────────────────────────────────────────

export const CONSENT_POLICIES: ConsentPolicy[] = [
  {
    id: "pol-treatment-general",
    name: "General Treatment Consent",
    category: "treatment",
    regulation: "hipaa",
    scope: "all_data",
    mandatory: true,
    defaultExpirationDays: 365,
    minimumAge: 18,
    requiresWitness: false,
    revocable: true,
    patientDescription: "I consent to receive medical treatment and allow my healthcare providers to access my medical records for treatment purposes.",
    patientDescriptionAr: "أوافق على تلقي العلاج الطبي وأسمح لمقدمي الرعاية الصحية بالوصول إلى سجلاتي الطبية لأغراض العلاج.",
    dataElements: ["demographics", "conditions", "medications", "allergies", "vitals", "lab_results", "imaging", "procedures"],
    permittedPurposes: ["treatment", "care_coordination"],
    permittedRecipients: ["treating_physician", "care_team", "referral_provider"],
  },
  {
    id: "pol-research-participation",
    name: "Research Participation Consent",
    category: "research",
    regulation: "hipaa",
    scope: "purpose_specific",
    mandatory: false,
    defaultExpirationDays: 1825, // 5 years
    minimumAge: 18,
    requiresWitness: true,
    revocable: true,
    patientDescription: "I consent to the use of my de-identified health data for medical research purposes. My data will be anonymized before use.",
    patientDescriptionAr: "أوافق على استخدام بياناتي الصحية المجهولة الهوية لأغراض البحث الطبي. سيتم إخفاء هوية بياناتي قبل الاستخدام.",
    dataElements: ["conditions", "medications", "lab_results", "demographics_deidentified"],
    permittedPurposes: ["research", "public_health"],
    permittedRecipients: ["research_institution", "irb_approved_researcher"],
  },
  {
    id: "pol-data-sharing",
    name: "Data Sharing Consent",
    category: "data_sharing",
    regulation: "gdpr",
    scope: "purpose_specific",
    mandatory: false,
    defaultExpirationDays: 365,
    minimumAge: 18,
    requiresWitness: false,
    revocable: true,
    patientDescription: "I consent to sharing my health data with the specified third parties for the stated purposes.",
    patientDescriptionAr: "أوافق على مشاركة بياناتي الصحية مع الأطراف الثالثة المحددة للأغراض المذكورة.",
    dataElements: ["conditions", "medications", "allergies"],
    permittedPurposes: ["insurance_claim", "referral", "second_opinion"],
    permittedRecipients: ["insurance_company", "specialist", "laboratory"],
  },
  {
    id: "pol-telehealth",
    name: "Telehealth Consent",
    category: "telehealth",
    regulation: "hipaa",
    scope: "encounter_specific",
    mandatory: true,
    defaultExpirationDays: 365,
    minimumAge: 18,
    requiresWitness: false,
    revocable: true,
    patientDescription: "I consent to receive healthcare services via telehealth/video consultation and understand the limitations of remote care.",
    patientDescriptionAr: "أوافق على تلقي خدمات الرعاية الصحية عبر الاستشارة عن بُعد وأفهم قيود الرعاية عن بُعد.",
    dataElements: ["demographics", "conditions", "medications", "vitals"],
    permittedPurposes: ["treatment", "telehealth_consultation"],
    permittedRecipients: ["treating_physician"],
  },
  {
    id: "pol-ai-ml-usage",
    name: "AI/ML Data Usage Consent",
    category: "ai_ml_usage",
    regulation: "gdpr",
    scope: "purpose_specific",
    mandatory: false,
    defaultExpirationDays: 730, // 2 years
    minimumAge: 18,
    requiresWitness: false,
    revocable: true,
    patientDescription: "I consent to the use of my de-identified health data for training and improving AI/ML models that assist in medical diagnosis and treatment.",
    patientDescriptionAr: "أوافق على استخدام بياناتي الصحية المجهولة الهوية لتدريب وتحسين نماذج الذكاء الاصطناعي التي تساعد في التشخيص والعلاج الطبي.",
    dataElements: ["conditions", "medications", "lab_results", "imaging_deidentified"],
    permittedPurposes: ["ai_model_training", "quality_improvement"],
    permittedRecipients: ["medisoft_ai_team"],
  },
  {
    id: "pol-cross-border",
    name: "Cross-Border Data Transfer Consent",
    category: "cross_border_transfer",
    regulation: "saudi_pdpl",
    scope: "purpose_specific",
    mandatory: false,
    defaultExpirationDays: 365,
    minimumAge: 18,
    requiresWitness: true,
    revocable: true,
    patientDescription: "I consent to the transfer of my health data outside the Kingdom of Saudi Arabia for the specified purposes, with appropriate safeguards in place.",
    patientDescriptionAr: "أوافق على نقل بياناتي الصحية خارج المملكة العربية السعودية للأغراض المحددة، مع وجود ضمانات مناسبة.",
    dataElements: ["all_data"],
    permittedPurposes: ["specialist_referral", "clinical_trial", "emergency_care"],
    permittedRecipients: ["international_provider", "clinical_trial_sponsor"],
  },
  {
    id: "pol-genetic-testing",
    name: "Genetic Testing Consent",
    category: "genetic_testing",
    regulation: "hipaa",
    scope: "purpose_specific",
    mandatory: true,
    defaultExpirationDays: 0, // No expiration
    minimumAge: 18,
    requiresWitness: true,
    revocable: false,
    patientDescription: "I consent to genetic testing and understand the implications of genetic information, including potential impact on family members and insurance.",
    patientDescriptionAr: "أوافق على إجراء الاختبار الجيني وأفهم تبعات المعلومات الجينية، بما في ذلك التأثير المحتمل على أفراد الأسرة والتأمين.",
    dataElements: ["genetic_data", "family_history", "conditions"],
    permittedPurposes: ["diagnosis", "treatment_planning", "genetic_counseling"],
    permittedRecipients: ["geneticist", "genetic_counselor", "treating_physician"],
  },
  {
    id: "pol-emergency-override",
    name: "Emergency Treatment Override",
    category: "emergency_override",
    regulation: "hipaa",
    scope: "encounter_specific",
    mandatory: false,
    defaultExpirationDays: 1, // Single encounter
    minimumAge: 0,
    requiresWitness: true,
    revocable: false,
    patientDescription: "Emergency treatment authorization when patient is unable to provide consent.",
    patientDescriptionAr: "تفويض العلاج الطارئ عندما يكون المريض غير قادر على تقديم الموافقة.",
    dataElements: ["all_data"],
    permittedPurposes: ["emergency_treatment"],
    permittedRecipients: ["emergency_team", "treating_physician"],
  },
];

// ─── In-Memory Store (Production would use database) ─────────────────────────

const consentStore: Map<string, ConsentRecord> = new Map();

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Create a new consent record.
 */
export function createConsent(
  params: {
    patientId: string;
    patientName?: string;
    policyId: string;
    verificationMethod: VerificationMethod;
    scopeDetails?: ConsentRecord["scopeDetails"];
    guardian?: ConsentRecord["guardian"];
    witness?: ConsentRecord["witness"];
    restrictions?: string[];
    language?: string;
    createdBy: string;
  },
): ConsentRecord {
  const policy = CONSENT_POLICIES.find(p => p.id === params.policyId);
  if (!policy) {
    throw new Error(`Policy not found: ${params.policyId}`);
  }

  const now = new Date();
  const id = `consent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const expirationDate = policy.defaultExpirationDays > 0
    ? new Date(now.getTime() + policy.defaultExpirationDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const record: ConsentRecord = {
    id,
    patientId: params.patientId,
    patientName: params.patientName,
    policyId: params.policyId,
    policyName: policy.name,
    category: policy.category,
    status: "active",
    scope: policy.scope,
    scopeDetails: params.scopeDetails,
    consentDate: now.toISOString(),
    expirationDate,
    verificationMethod: params.verificationMethod,
    witness: params.witness,
    guardian: params.guardian,
    dataElements: policy.dataElements,
    permittedPurposes: policy.permittedPurposes,
    permittedRecipients: policy.permittedRecipients,
    restrictions: params.restrictions,
    regulation: policy.regulation,
    formVersion: "1.0",
    language: params.language || "en",
    createdBy: params.createdBy,
    lastModified: now.toISOString(),
    auditTrail: [{
      timestamp: now.toISOString(),
      action: "created",
      actor: params.createdBy,
      actorRole: "system",
      details: `Consent created under policy: ${policy.name}`,
    }],
  };

  consentStore.set(id, record);

  // Sync to Google Cloud Healthcare Consent API in background
  syncToCloudConsent(record, "create");

  return record;
}

/**
 * Revoke an existing consent.
 */
export function revokeConsent(
  consentId: string,
  revokedBy: string,
  reason: string,
): ConsentRecord {
  const record = consentStore.get(consentId);
  if (!record) {
    throw new Error(`Consent not found: ${consentId}`);
  }

  const policy = CONSENT_POLICIES.find(p => p.id === record.policyId);
  if (policy && !policy.revocable) {
    throw new Error(`Consent policy ${policy.name} is not revocable`);
  }

  record.status = "revoked";
  record.revocationDate = new Date().toISOString();
  record.revocationReason = reason;
  record.lastModified = new Date().toISOString();
  record.auditTrail.push({
    timestamp: new Date().toISOString(),
    action: "revoked",
    actor: revokedBy,
    actorRole: "patient",
    details: `Consent revoked. Reason: ${reason}`,
  });

  consentStore.set(consentId, record);

  // Sync revocation to Google Cloud Healthcare Consent API in background
  syncToCloudConsent(record, "revoke");

  return record;
}

/**
 * Check access determination — can a specific actor access specific data?
 */
export function checkAccess(
  patientId: string,
  requestedPurpose: string,
  requestedDataElements: string[],
  requestor: string,
): AccessDetermination {
  // Find all active consents for this patient
  const patientConsents = Array.from(consentStore.values())
    .filter(c => c.patientId === patientId);

  const activeConsents = patientConsents.filter(c => {
    if (c.status !== "active") return false;
    if (c.expirationDate && new Date(c.expirationDate) < new Date()) {
      c.status = "expired";
      return false;
    }
    return true;
  });

  // Check if any active consent covers the requested purpose and data
  const applicableConsents = activeConsents.filter(c =>
    c.permittedPurposes.includes(requestedPurpose) ||
    c.permittedPurposes.includes("all_purposes"),
  );

  if (applicableConsents.length === 0) {
    // Check for emergency override
    const hasEmergencyOverride = activeConsents.some(c => c.category === "emergency_override");

    return {
      permitted: false,
      reason: `No active consent found for purpose: ${requestedPurpose}`,
      applicableConsents: patientConsents.map(c => ({ id: c.id, status: c.status, category: c.category })),
      restrictions: [],
      regulatoryBasis: "HIPAA §164.508 — Authorization required",
      emergencyOverrideAvailable: !hasEmergencyOverride,
    };
  }

  // Check data element coverage
  const coveredElements = new Set(applicableConsents.flatMap(c => c.dataElements));
  const uncoveredElements = requestedDataElements.filter(e => !coveredElements.has(e) && !coveredElements.has("all_data"));

  if (uncoveredElements.length > 0) {
    return {
      permitted: false,
      reason: `Consent does not cover data elements: ${uncoveredElements.join(", ")}`,
      applicableConsents: applicableConsents.map(c => ({ id: c.id, status: c.status, category: c.category })),
      restrictions: [`Missing consent for: ${uncoveredElements.join(", ")}`],
      regulatoryBasis: "HIPAA §164.508 — Specific authorization required for these data elements",
      emergencyOverrideAvailable: true,
    };
  }

  // Check restrictions
  const allRestrictions = applicableConsents.flatMap(c => c.restrictions || []);

  // Add audit entry
  for (const consent of applicableConsents) {
    consent.auditTrail.push({
      timestamp: new Date().toISOString(),
      action: "accessed",
      actor: requestor,
      actorRole: "provider",
      details: `Access granted for purpose: ${requestedPurpose}, data: ${requestedDataElements.join(", ")}`,
    });
  }

  return {
    permitted: true,
    reason: "Active consent covers requested purpose and data elements",
    applicableConsents: applicableConsents.map(c => ({ id: c.id, status: c.status, category: c.category })),
    restrictions: allRestrictions,
    regulatoryBasis: `Consent-based access per ${applicableConsents[0].regulation.toUpperCase()}`,
    emergencyOverrideAvailable: false,
  };
}

/**
 * Get all consents for a patient.
 */
export function getPatientConsents(patientId: string): ConsentRecord[] {
  return Array.from(consentStore.values())
    .filter(c => c.patientId === patientId)
    .sort((a, b) => new Date(b.consentDate).getTime() - new Date(a.consentDate).getTime());
}

/**
 * Get consent by ID.
 */
export function getConsentById(consentId: string): ConsentRecord | null {
  return consentStore.get(consentId) || null;
}

/**
 * Get all consents (admin view).
 */
export function getAllConsents(filters?: {
  status?: ConsentStatus;
  category?: ConsentCategory;
  regulation?: RegulationFramework;
}): ConsentRecord[] {
  let results = Array.from(consentStore.values());

  if (filters?.status) results = results.filter(c => c.status === filters.status);
  if (filters?.category) results = results.filter(c => c.category === filters.category);
  if (filters?.regulation) results = results.filter(c => c.regulation === filters.regulation);

  return results.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
}

/**
 * Get compliance dashboard stats.
 */
export function getComplianceDashboard(): {
  totalConsents: number;
  byStatus: Record<ConsentStatus, number>;
  byCategory: Record<string, number>;
  byRegulation: Record<string, number>;
  expiringWithin30Days: number;
  recentRevocations: number;
  complianceScore: number;
} {
  const all = Array.from(consentStore.values());
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byRegulation: Record<string, number> = {};

  for (const c of all) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    byRegulation[c.regulation] = (byRegulation[c.regulation] || 0) + 1;
  }

  const expiringWithin30Days = all.filter(c =>
    c.status === "active" && c.expirationDate && new Date(c.expirationDate) <= thirtyDaysFromNow,
  ).length;

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentRevocations = all.filter(c =>
    c.status === "revoked" && c.revocationDate && new Date(c.revocationDate) >= thirtyDaysAgo,
  ).length;

  // Compliance score: percentage of patients with required consents
  const activeCount = all.filter(c => c.status === "active").length;
  const complianceScore = all.length > 0 ? Math.round((activeCount / all.length) * 100) : 100;

  return {
    totalConsents: all.length,
    byStatus: byStatus as any,
    byCategory,
    byRegulation,
    expiringWithin30Days,
    recentRevocations,
    complianceScore,
  };
}

/**
 * Seed demo consent data for testing.
 */
export function seedDemoConsents(): ConsentRecord[] {
  const demoPatients = [
    { id: "patient-1", name: "Ahmed Al-Rashid" },
    { id: "patient-2", name: "Fatima Hassan" },
    { id: "patient-3", name: "Mohammed Al-Qahtani" },
    { id: "patient-4", name: "Sara Al-Dosari" },
  ];

  const results: ConsentRecord[] = [];

  for (const patient of demoPatients) {
    // General treatment consent
    results.push(createConsent({
      patientId: patient.id,
      patientName: patient.name,
      policyId: "pol-treatment-general",
      verificationMethod: "electronic_signature",
      createdBy: "system-seed",
      language: "ar",
    }));

    // Telehealth consent
    results.push(createConsent({
      patientId: patient.id,
      patientName: patient.name,
      policyId: "pol-telehealth",
      verificationMethod: "electronic_signature",
      createdBy: "system-seed",
      language: "ar",
    }));

    // AI/ML usage consent (only some patients)
    if (patient.id !== "patient-3") {
      results.push(createConsent({
        patientId: patient.id,
        patientName: patient.name,
        policyId: "pol-ai-ml-usage",
        verificationMethod: "electronic_signature",
        createdBy: "system-seed",
        language: "ar",
      }));
    }
  }

  // Research consent for one patient
  results.push(createConsent({
    patientId: "patient-1",
    patientName: "Ahmed Al-Rashid",
    policyId: "pol-research-participation",
    verificationMethod: "written_signature",
    witness: { name: "Dr. Khalid", role: "physician", date: new Date().toISOString() },
    createdBy: "system-seed",
    language: "ar",
  }));

  return results;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

// CONSENT_POLICIES already exported at declaration
