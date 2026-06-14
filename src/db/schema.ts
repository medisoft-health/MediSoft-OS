/**
 * MediSoft C-OS — Database Schema (Postgres + Drizzle)
 *
 * 7 core tables per the Comprehensive Build Strategy v3.0:
 *   users, patients, encounters, prescriptions, labResults, scans, vitals
 *
 * Plus auth tables (sessions, accounts, verifications) for Better-Auth.
 *
 * Design notes:
 *   - All clinical resources use JSONB columns for HL7 FHIR R4 compatibility.
 *   - PII fields are flagged in comments to drive future masking middleware.
 *   - Soft deletes via `deletedAt` for clinical audit-trail requirements (SDAIA).
 *   - All timestamps stored as `timestamp with time zone` (UTC).
 */

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  numeric,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────
//  ENUMS
// ─────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["physician", "admin"]);

export const sexEnum = pgEnum("sex", ["male", "female", "other", "unknown"]);

export const bloodTypeEnum = pgEnum("blood_type", [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "unknown",
]);

export const encounterStatusEnum = pgEnum("encounter_status", [
  "in_progress",
  "awaiting_review",
  "signed",
  "amended",
  "cancelled",
]);

export const prescriptionStatusEnum = pgEnum("prescription_status", [
  "draft",
  "active",
  "completed",
  "discontinued",
  "cancelled",
]);

export const severityEnum = pgEnum("severity", ["low", "moderate", "high", "critical"]);

export const scanTypeEnum = pgEnum("scan_type", [
  "xray",
  "ct",
  "mri",
  "ultrasound",
  "mammography",
  "pathology",
  "other",
]);

// ─────────────────────────────────────────────────────────────────
//  AUTH (Better-Auth managed)
// ─────────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    name: varchar("name", { length: 200 }).notNull(),
    image: text("image"),

    // MediSoft-specific
    role: userRoleEnum("role").notNull().default("physician"),
    specialty: varchar("specialty", { length: 120 }),
    licenseNumber: varchar("license_number", { length: 80 }),
    saudiId: varchar("saudi_id", { length: 20 }), // National ID / Iqama for IAM integration
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),

    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    index("users_role_idx").on(t.role),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    // Better-Auth generates its own session IDs (32-char random strings,
    // NOT UUIDs). Using `text` so the DB accepts whatever format the
    // auth library produces.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_idx").on(t.token),
    index("sessions_user_idx").on(t.userId),
  ]
);

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: varchar("provider_id", { length: 64 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"), // Better-Auth stores hashed password here for email/password provider
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const twoFactor = pgTable("two_factor", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  verified: boolean("verified").notNull().default(true),
});

// ─────────────────────────────────────────────────────────────────
//  PATIENTS  (FHIR Patient resource compatible)
// ─────────────────────────────────────────────────────────────────
export const patients = pgTable(
  "patients",
  {
    id: serial("id").primaryKey(),
    // Public-facing identifier (MS-000123) is derived from `id`.
    saudiId: varchar("saudi_id", { length: 20 }), // PII — Iqama / National ID
    mrn: varchar("mrn", { length: 40 }), // Medical Record Number (clinic-issued)

    // Demographics
    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    firstNameAr: varchar("first_name_ar", { length: 120 }),
    lastNameAr: varchar("last_name_ar", { length: 120 }),
    dateOfBirth: date("date_of_birth").notNull(),
    sex: sexEnum("sex").notNull(),
    bloodType: bloodTypeEnum("blood_type").default("unknown"),

    // Contact (PII)
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 320 }),
    address: jsonb("address").$type<{
      line1?: string;
      line2?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
    }>(),
    emergencyContact: jsonb("emergency_contact").$type<{
      name?: string;
      relationship?: string;
      phone?: string;
    }>(),

    // Insurance / NPHIES
    insuranceId: varchar("insurance_id", { length: 80 }),
    insuranceProvider: varchar("insurance_provider", { length: 120 }),

    // Clinical
    allergies: jsonb("allergies").$type<
      Array<{ substance: string; reaction?: string; severity?: string }>
    >(),
    chronicConditions: jsonb("chronic_conditions").$type<
      Array<{ description: string; icdCode?: string; onsetDate?: string }>
    >(),
    medicalHistory: text("medical_history"),
    familyHistory: text("family_history"),
    socialHistory: text("social_history"),

    // Extended demographics
    middleName: varchar("middle_name", { length: 120 }),
    middleNameAr: varchar("middle_name_ar", { length: 120 }),
    nationality: varchar("nationality", { length: 80 }),
    maritalStatus: varchar("marital_status", { length: 20 }),
    occupation: varchar("occupation", { length: 120 }),
    occupationAr: varchar("occupation_ar", { length: 120 }),
    preferredLanguage: varchar("preferred_language", { length: 10 }).default("ar"),
    secondaryPhone: varchar("secondary_phone", { length: 32 }),
    // Flat address fields for search
    city: varchar("city", { length: 120 }),
    region: varchar("region", { length: 120 }),
    country: varchar("country", { length: 80 }).default("SA"),
    // Photo
    photoUrl: text("photo_url"),
    photoStorageKey: text("photo_storage_key"),
    // Lifestyle
    smokingStatus: varchar("smoking_status", { length: 20 }),
    alcoholStatus: varchar("alcohol_status", { length: 20 }),
    exerciseFrequency: varchar("exercise_frequency", { length: 20 }),
    dietType: varchar("diet_type", { length: 40 }),
    // Extended clinical
    surgicalHistory: jsonb("surgical_history").$type<
      Array<{ procedure: string; date?: string; hospital?: string; notes?: string }>
    >(),
    currentMedications: jsonb("current_medications").$type<
      Array<{ name: string; dose?: string; frequency?: string; since?: string; prescribedBy?: string }>
    >(),
    immunizations: jsonb("immunizations").$type<
      Array<{ vaccine: string; date?: string; dose?: string; provider?: string }>
    >(),
    // Special needs
    disabilityNotes: text("disability_notes"),
    specialNeeds: text("special_needs"),
    // Profile & Health scores
    profileCompleteness: integer("profile_completeness").default(0),
    healthScore: integer("health_score"),
    healthScoreUpdatedAt: timestamp("health_score_updated_at", { withTimezone: true }),
    // Device integration
    connectedDevices: jsonb("connected_devices").$type<
      Array<{ type: string; name: string; lastSync?: string; deviceId?: string }>
    >(),
    // Patient portal
    portalUserId: uuid("portal_user_id"),
    portalEnabled: boolean("portal_enabled").default(false),
    portalLastLogin: timestamp("portal_last_login", { withTimezone: true }),
    // FHIR raw stash for forward compatibility
    fhirResource: jsonb("fhir_resource"),

    // Audit
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("patients_saudi_id_idx").on(t.saudiId),
    uniqueIndex("patients_mrn_idx").on(t.mrn),
    index("patients_name_idx").on(t.lastName, t.firstName),
    index("patients_phone_idx").on(t.phone),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  ENCOUNTERS  (MediScript output / FHIR Encounter)
// ─────────────────────────────────────────────────────────────────
export type SoapNote = {
  subjective: {
    chiefComplaint?: string;
    historyOfPresentIllness?: string;
    reviewOfSystems?: string;
    pastMedicalHistory?: string;
    medications?: string;
    allergies?: string;
    socialHistory?: string;
    familyHistory?: string;
  };
  objective: {
    vitalSigns?: string;
    physicalExamination?: string;
    diagnosticResults?: string;
  };
  assessment: {
    diagnoses?: Array<{
      description: string;
      icdCode?: string;
      icdDescription?: string;
      verified?: boolean;
    }>;
    differentialDiagnosis?: string;
    clinicalReasoning?: string;
  };
  plan: {
    diagnosticPlan?: string;
    therapeuticPlan?: string;
    patientEducation?: string;
    followUp?: string;
  };
};

export const encounters = pgTable(
  "encounters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    physicianId: uuid("physician_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    encounterDate: timestamp("encounter_date", { withTimezone: true }).notNull().defaultNow(),
    encounterType: varchar("encounter_type", { length: 64 }).default("outpatient"), // outpatient/telemedicine/inpatient/emergency
    status: encounterStatusEnum("status").notNull().default("in_progress"),

    // MediScript audio / transcript artifacts
    audioStorageKey: text("audio_storage_key"),
    rawTranscript: text("raw_transcript"),
    correctedTranscript: text("corrected_transcript"),

    // Structured SOAP note (matches MediScript schema)
    soapNote: jsonb("soap_note").$type<SoapNote>(),

    // ICD-11 codes (validated against WHO API)
    icdCodes: jsonb("icd_codes").$type<
      Array<{ code: string; description: string; verified: boolean }>
    >(),

    // Physician signature
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signedById: uuid("signed_by_id").references(() => users.id),

    // FHIR Composition mirror
    fhirComposition: jsonb("fhir_composition"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("encounters_patient_idx").on(t.patientId, t.encounterDate),
    index("encounters_physician_idx").on(t.physicianId, t.encounterDate),
    index("encounters_status_idx").on(t.status),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  PRESCRIPTIONS  (PharmaX output / FHIR MedicationRequest)
// ─────────────────────────────────────────────────────────────────
export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    physicianId: uuid("physician_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),

    // Drug identity (normalized via RxNorm)
    drugName: varchar("drug_name", { length: 256 }).notNull(),
    brandName: varchar("brand_name", { length: 256 }),
    rxcui: varchar("rxcui", { length: 40 }), // RxNorm Concept Unique Identifier
    atcCode: varchar("atc_code", { length: 10 }), // WHO ATC classification

    // Dosing
    dose: varchar("dose", { length: 80 }).notNull(), // "500 mg"
    frequency: varchar("frequency", { length: 80 }).notNull(), // "BID", "every 8 hours"
    route: varchar("route", { length: 40 }).notNull(), // "oral", "IV"
    duration: varchar("duration", { length: 80 }), // "7 days"
    instructions: text("instructions"),
    quantity: integer("quantity"),
    refills: integer("refills").default(0),

    // Safety analysis (PharmaX three-layer output)
    interactions: jsonb("interactions").$type<
      Array<{
        severity: "low" | "moderate" | "high" | "critical";
        mechanism?: string;
        clinicalEffect?: string;
        recommendation?: string;
        evidenceSource?: string;
        interactingDrug?: string;
      }>
    >(),
    severity: severityEnum("severity"),
    contraindications: jsonb("contraindications"),
    boxedWarnings: text("boxed_warnings"),

    // Billing / NPHIES
    insuranceCoverage: jsonb("insurance_coverage").$type<{
      covered?: boolean;
      tier?: string;
      copayAmount?: number;
      priorAuthRequired?: boolean;
      alternativeRxcui?: string;
    }>(),

    status: prescriptionStatusEnum("status").notNull().default("draft"),
    startDate: date("start_date"),
    endDate: date("end_date"),

    fhirMedicationRequest: jsonb("fhir_medication_request"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("prescriptions_patient_idx").on(t.patientId),
    index("prescriptions_physician_idx").on(t.physicianId),
    index("prescriptions_rxcui_idx").on(t.rxcui),
    index("prescriptions_status_idx").on(t.status),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  LAB RESULTS  (MediLab / FHIR DiagnosticReport + Observation)
// ─────────────────────────────────────────────────────────────────
export type LabResultItem = {
  testName: string;
  loincCode?: string;
  value: number | string;
  unit?: string;
  referenceLow?: number | string;
  referenceHigh?: number | string;
  flag?: "normal" | "low" | "high" | "critical_low" | "critical_high";
  interpretation?: string;
};

export const labResults = pgTable(
  "lab_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    physicianId: uuid("physician_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),

    panelName: varchar("panel_name", { length: 200 }).notNull(), // "CBC", "Comprehensive Metabolic Panel"
    panelLoincCode: varchar("panel_loinc_code", { length: 20 }),
    collectionDate: timestamp("collection_date", { withTimezone: true }),
    resultDate: timestamp("result_date", { withTimezone: true }).notNull().defaultNow(),
    laboratory: varchar("laboratory", { length: 200 }),

    results: jsonb("results").$type<LabResultItem[]>().notNull(),

    // AI-generated narrative (Gemini)
    aiNarrative: text("ai_narrative"),
    aiTrendAnalysis: jsonb("ai_trend_analysis"),

    criticalFlags: jsonb("critical_flags").$type<
      Array<{ testName: string; value: string; severity: "high" | "critical" }>
    >(),

    fhirDiagnosticReport: jsonb("fhir_diagnostic_report"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("lab_results_patient_idx").on(t.patientId, t.resultDate),
    index("lab_results_panel_idx").on(t.panelName),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  SCANS  (MediScan / FHIR ImagingStudy + DiagnosticReport)
// ─────────────────────────────────────────────────────────────────
export const scans = pgTable(
  "scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    physicianId: uuid("physician_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),

    scanType: scanTypeEnum("scan_type").notNull(),
    bodyPart: varchar("body_part", { length: 120 }).notNull(),
    modality: varchar("modality", { length: 20 }), // DICOM modality code: CT, MR, US, CR
    studyInstanceUid: varchar("study_instance_uid", { length: 128 }), // DICOM

    // Storage (S3 / GCP Cloud Storage)
    imageStorageKey: text("image_storage_key").notNull(),
    imageStorageUrl: text("image_storage_url"),
    thumbnailKey: text("thumbnail_key"),
    mimeType: varchar("mime_type", { length: 80 }),
    fileSizeBytes: integer("file_size_bytes"),

    // AI findings (Gemini multimodal)
    findings: jsonb("findings").$type<
      Array<{
        location?: string;
        description: string;
        severity?: "low" | "moderate" | "high" | "critical";
        characteristics?: string;
      }>
    >(),
    aiReport: text("ai_report"),
    aiImpression: text("ai_impression"),
    aiDifferentialDiagnosis: text("ai_differential_diagnosis"),
    aiRecommendations: text("ai_recommendations"),
    technicalQuality: varchar("technical_quality", { length: 40 }), // adequate/limited/non_diagnostic
    radiologistReviewedAt: timestamp("radiologist_reviewed_at", { withTimezone: true }),
    radiologistReportText: text("radiologist_report_text"),

    // Mandatory disclaimer text (non-dismissible in UI)
    disclaimer: text("disclaimer").notNull(),

    fhirImagingStudy: jsonb("fhir_imaging_study"),

    studyDate: timestamp("study_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("scans_patient_idx").on(t.patientId, t.studyDate),
    index("scans_type_idx").on(t.scanType),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  VITALS  (FHIR Observation - vital-signs category)
// ─────────────────────────────────────────────────────────────────
export const vitals = pgTable(
  "vitals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    physicianId: uuid("physician_id").references(() => users.id, { onDelete: "set null" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),

    bloodPressureSystolic: integer("bp_systolic"), // mmHg
    bloodPressureDiastolic: integer("bp_diastolic"), // mmHg
    heartRate: integer("heart_rate"), // bpm
    respiratoryRate: integer("respiratory_rate"), // bpm
    temperature: decimal("temperature", { precision: 4, scale: 1 }), // °C
    spO2: integer("spo2"), // %
    weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
    heightCm: decimal("height_cm", { precision: 5, scale: 2 }),
    bmi: decimal("bmi", { precision: 4, scale: 1 }), // computed

    pain: integer("pain"), // 0-10 scale
    notes: text("notes"),

    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vitals_patient_idx").on(t.patientId, t.recordedAt)]
);

// ─────────────────────────────────────────────────────────────────
//  AUDIT LOG  (SDAIA / NDMO requirement — tamper-evident hash chain)
// ─────────────────────────────────────────────────────────────────
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 64 }).notNull(), // "patient.view", "prescription.create"
    resourceType: varchar("resource_type", { length: 64 }).notNull(),
    resourceId: text("resource_id"),
    patientId: integer("patient_id").references(() => patients.id, { onDelete: "set null" }),
    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),

    // ── SDAIA tamper-evidence (PR-9e) ────────────────────────────
    // Each row's `hash` is SHA-256 of its content + the `previousHash`
    // from the preceding row. This forms a linked chain — any INSERT,
    // UPDATE, or DELETE in the middle of the sequence breaks the chain
    // and is detectable by the verification function.
    //
    // `previousHash` is NULL for the very first row (genesis entry).
    // `hash` is nullable only during the migration window; new rows
    // always have it set by logAudit().
    hash: varchar("hash", { length: 64 }),
    previousHash: varchar("previous_hash", { length: 64 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("audit_actor_idx").on(t.actorId, t.createdAt),
    index("audit_patient_idx").on(t.patientId, t.createdAt),
    index("audit_resource_idx").on(t.resourceType, t.resourceId),
    index("audit_hash_idx").on(t.hash),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  RELATIONS
// ─────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  encounters: many(encounters),
  prescriptions: many(prescriptions),
  labResults: many(labResults),
  scans: many(scans),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const patientsRelations = relations(patients, ({ many, one }) => ({
  encounters: many(encounters),
  prescriptions: many(prescriptions),
  labResults: many(labResults),
  scans: many(scans),
  vitals: many(vitals),
  createdBy: one(users, { fields: [patients.createdById], references: [users.id] }),
}));

export const encountersRelations = relations(encounters, ({ one, many }) => ({
  patient: one(patients, { fields: [encounters.patientId], references: [patients.id] }),
  physician: one(users, {
    fields: [encounters.physicianId],
    references: [users.id],
    relationName: "encounter_physician",
  }),
  signedBy: one(users, {
    fields: [encounters.signedById],
    references: [users.id],
    relationName: "encounter_signer",
  }),
  prescriptions: many(prescriptions),
  labResults: many(labResults),
  scans: many(scans),
  vitals: many(vitals),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  patient: one(patients, { fields: [prescriptions.patientId], references: [patients.id] }),
  physician: one(users, { fields: [prescriptions.physicianId], references: [users.id] }),
  encounter: one(encounters, {
    fields: [prescriptions.encounterId],
    references: [encounters.id],
  }),
}));

export const labResultsRelations = relations(labResults, ({ one }) => ({
  patient: one(patients, { fields: [labResults.patientId], references: [patients.id] }),
  physician: one(users, { fields: [labResults.physicianId], references: [users.id] }),
  encounter: one(encounters, {
    fields: [labResults.encounterId],
    references: [encounters.id],
  }),
}));

export const scansRelations = relations(scans, ({ one }) => ({
  patient: one(patients, { fields: [scans.patientId], references: [patients.id] }),
  physician: one(users, { fields: [scans.physicianId], references: [users.id] }),
  encounter: one(encounters, { fields: [scans.encounterId], references: [encounters.id] }),
}));

export const vitalsRelations = relations(vitals, ({ one }) => ({
  patient: one(patients, { fields: [vitals.patientId], references: [patients.id] }),
  physician: one(users, { fields: [vitals.physicianId], references: [users.id] }),
  encounter: one(encounters, { fields: [vitals.encounterId], references: [encounters.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

// ─────────────────────────────────────────────────────────────────
//  TYPE EXPORTS
// ─────────────────────────────────────────────────────────────────

// Clinical Notifications
export const clinicalNotifications = pgTable(
  "clinical_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    physicianId: uuid("physician_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    patientId: integer("patient_id")
      .references(() => patients.id, { onDelete: "cascade" }),

    type: varchar("type", { length: 64 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),

    actionUrl: text("action_url"),
    actionLabel: text("action_label"),

    read: boolean("read").notNull().default(false),
    dismissed: boolean("dismissed").notNull().default(false),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("notifications_physician_idx").on(t.physicianId),
    index("notifications_read_idx").on(t.physicianId, t.read),
    index("notifications_type_idx").on(t.type),
  ],
);

export type ClinicalNotification = typeof clinicalNotifications.$inferSelect;
export type NewClinicalNotification = typeof clinicalNotifications.$inferInsert;

// MediBot Chat Sessions
export const medibotSessions = pgTable(
  "medibot_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    patientId: integer("patient_id")
      .references(() => patients.id, { onDelete: "set null" }),

    mode: varchar("mode", { length: 20 }).notNull().default("physician"), // "physician" | "patient"
    title: text("title"), // Auto-generated from first message

    messages: jsonb("messages").$type<
      Array<{
        role: "user" | "assistant";
        content: string;
        citations?: Array<{ id: number; title: string; source: string; url?: string }>;
        timestamp: string;
      }>
    >().notNull().default([]),

    metadata: jsonb("metadata").$type<{
      patientName?: string;
      totalMessages?: number;
      lastTopic?: string;
    }>(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("medibot_user_idx").on(t.userId),
    index("medibot_patient_idx").on(t.patientId),
  ],
);

export type MedibotSession = typeof medibotSessions.$inferSelect;
export type NewMedibotSession = typeof medibotSessions.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  OTHER TYPE EXPORTS
// ─────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type Encounter = typeof encounters.$inferSelect;
export type NewEncounter = typeof encounters.$inferInsert;
export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
export type LabResult = typeof labResults.$inferSelect;
export type NewLabResult = typeof labResults.$inferInsert;
export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
export type Vital = typeof vitals.$inferSelect;
export type NewVital = typeof vitals.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;

// ─────────────────────────────────────────────────────────────────
//  APPOINTMENTS (Patient Portal + AI Receptionist)
// ─────────────────────────────────────────────────────────────────
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    physicianId: uuid("physician_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    duration: integer("duration").notNull().default(30),
    appointmentType: varchar("appointment_type", { length: 64 }).notNull().default("consultation"),
    status: appointmentStatusEnum("status").notNull().default("scheduled"),
    reason: text("reason"),
    notes: text("notes"),
    bookedBy: varchar("booked_by", { length: 64 }).default("manual"),
    bookedVia: varchar("booked_via", { length: 64 }).default("web"),
    reminderSent: boolean("reminder_sent").notNull().default(false),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("appointments_patient_idx").on(t.patientId),
    index("appointments_physician_idx").on(t.physicianId),
    index("appointments_scheduled_idx").on(t.scheduledAt),
    index("appointments_status_idx").on(t.status),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  PATIENT MESSAGES (Patient Portal messaging)
// ─────────────────────────────────────────────────────────────────
export const patientMessages = pgTable(
  "patient_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    physicianId: uuid("physician_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    senderType: varchar("sender_type", { length: 20 }).notNull(),
    subject: varchar("subject", { length: 256 }),
    body: text("body").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    attachments: jsonb("attachments").$type<Array<{ name: string; url: string; type: string }>>(),
    parentMessageId: uuid("parent_message_id"),
    channel: varchar("channel", { length: 32 }).default("portal"),
    externalMessageId: varchar("external_message_id", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("messages_patient_idx").on(t.patientId),
    index("messages_physician_idx").on(t.physicianId),
    index("messages_thread_idx").on(t.parentMessageId),
    index("messages_unread_idx").on(t.physicianId, t.isRead),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  INSURANCE PROVIDERS
// ─────────────────────────────────────────────────────────────────
export const insuranceProviders = pgTable(
  "insurance_providers",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    nameAr: varchar("name_ar", { length: 256 }),
    code: varchar("code", { length: 64 }).notNull(),
    type: varchar("type", { length: 64 }).default("insurance"),
    contactEmail: varchar("contact_email", { length: 320 }),
    contactPhone: varchar("contact_phone", { length: 20 }),
    nphiesId: varchar("nphies_id", { length: 64 }),
    isActive: boolean("is_active").notNull().default(true),
    claimSubmissionUrl: text("claim_submission_url"),
    eligibilityCheckUrl: text("eligibility_check_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("insurance_code_idx").on(t.code),
    index("insurance_nphies_idx").on(t.nphiesId),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  BILLING CLAIMS (Medical Billing + NPHIES)
// ─────────────────────────────────────────────────────────────────
export const claimStatusEnum = pgEnum("claim_status", [
  "draft",
  "submitted",
  "pending_review",
  "approved",
  "partially_approved",
  "rejected",
  "appealed",
  "paid",
  "cancelled",
]);

export const billingClaims = pgTable(
  "billing_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    claimNumber: varchar("claim_number", { length: 64 }).notNull(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    physicianId: uuid("physician_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
    insuranceProviderId: integer("insurance_provider_id").references(() => insuranceProviders.id),
    icdCodes: jsonb("icd_codes").$type<Array<{ code: string; description: string }>>(),
    cptCodes: jsonb("cpt_codes").$type<Array<{ code: string; description: string; units: number; fee: number }>>(),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    approvedAmount: decimal("approved_amount", { precision: 10, scale: 2 }),
    patientResponsibility: decimal("patient_responsibility", { precision: 10, scale: 2 }),
    copay: decimal("copay", { precision: 10, scale: 2 }),
    deductible: decimal("deductible", { precision: 10, scale: 2 }),
    status: claimStatusEnum("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    nphiesClaimId: varchar("nphies_claim_id", { length: 128 }),
    nphiesResponse: jsonb("nphies_response").$type<Record<string, unknown>>(),
    nphiesBundleId: varchar("nphies_bundle_id", { length: 128 }),
    aiGeneratedCodes: boolean("ai_generated_codes").default(false),
    aiConfidence: decimal("ai_confidence", { precision: 5, scale: 4 }),
    physicianVerified: boolean("physician_verified").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("claims_number_idx").on(t.claimNumber),
    index("claims_patient_idx").on(t.patientId),
    index("claims_status_idx").on(t.status),
    index("claims_insurance_idx").on(t.insuranceProviderId),
    index("claims_nphies_idx").on(t.nphiesClaimId),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  FOLLOW-UP TASKS (AI Nurse)
// ─────────────────────────────────────────────────────────────────
export const followUpTaskStatusEnum = pgEnum("follow_up_status", [
  "pending",
  "sent",
  "acknowledged",
  "completed",
  "escalated",
  "cancelled",
]);

export const followUpTasks = pgTable(
  "follow_up_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    physicianId: uuid("physician_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
    taskType: varchar("task_type", { length: 64 }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    priority: varchar("priority", { length: 20 }).default("normal"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    channel: varchar("channel", { length: 32 }).default("sms"),
    messageSent: text("message_sent"),
    patientResponse: text("patient_response"),
    status: followUpTaskStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").default(0),
    maxAttempts: integer("max_attempts").default(3),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    aiGenerated: boolean("ai_generated").default(true),
    aiNotes: text("ai_notes"),
    escalationReason: text("escalation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("followup_patient_idx").on(t.patientId),
    index("followup_physician_idx").on(t.physicianId),
    index("followup_status_idx").on(t.status),
    index("followup_scheduled_idx").on(t.scheduledAt),
    index("followup_type_idx").on(t.taskType),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  TRANSLATION SESSIONS (AI Interpreter)
// ─────────────────────────────────────────────────────────────────
export const translationSessions = pgTable(
  "translation_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .references(() => patients.id, { onDelete: "set null" }),
    physicianId: uuid("physician_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
    sourceLanguage: varchar("source_language", { length: 10 }).notNull(),
    targetLanguage: varchar("target_language", { length: 10 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    transcript: jsonb("transcript").$type<Array<{
      timestamp: string;
      speaker: string;
      original: string;
      translated: string;
      language: string;
    }>>(),
    wordCount: integer("word_count").default(0),
    medicalTermsDetected: integer("medical_terms_detected").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("translation_patient_idx").on(t.patientId),
    index("translation_physician_idx").on(t.physicianId),
    index("translation_date_idx").on(t.startedAt),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  COMMUNICATION LOG (AI Receptionist / AI Nurse outbound)
// ─────────────────────────────────────────────────────────────────
export const communicationLog = pgTable(
  "communication_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .references(() => patients.id, { onDelete: "set null" }),
    direction: varchar("direction", { length: 10 }).notNull(),
    channel: varchar("channel", { length: 32 }).notNull(),
    fromNumber: varchar("from_number", { length: 20 }),
    toNumber: varchar("to_number", { length: 20 }),
    subject: varchar("subject", { length: 256 }),
    body: text("body"),
    externalId: varchar("external_id", { length: 128 }),
    status: varchar("status", { length: 32 }).default("sent"),
    statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }),
    handledBy: varchar("handled_by", { length: 64 }).default("system"),
    aiResponse: text("ai_response"),
    intent: varchar("intent", { length: 64 }),
    sentiment: varchar("sentiment", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("comms_patient_idx").on(t.patientId),
    index("comms_channel_idx").on(t.channel),
    index("comms_direction_idx").on(t.direction),
    index("comms_date_idx").on(t.createdAt),
    index("comms_external_idx").on(t.externalId),
  ]
);

// ─────────────────────────────────────────────────────────────────
//  NEW RELATIONS
// ─────────────────────────────────────────────────────────────────
export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  physician: one(users, { fields: [appointments.physicianId], references: [users.id] }),
  encounter: one(encounters, { fields: [appointments.encounterId], references: [encounters.id] }),
}));

export const patientMessagesRelations = relations(patientMessages, ({ one }) => ({
  patient: one(patients, { fields: [patientMessages.patientId], references: [patients.id] }),
  physician: one(users, { fields: [patientMessages.physicianId], references: [users.id] }),
}));

export const billingClaimsRelations = relations(billingClaims, ({ one }) => ({
  patient: one(patients, { fields: [billingClaims.patientId], references: [patients.id] }),
  physician: one(users, { fields: [billingClaims.physicianId], references: [users.id] }),
  encounter: one(encounters, { fields: [billingClaims.encounterId], references: [encounters.id] }),
  insuranceProvider: one(insuranceProviders, { fields: [billingClaims.insuranceProviderId], references: [insuranceProviders.id] }),
}));

export const followUpTasksRelations = relations(followUpTasks, ({ one }) => ({
  patient: one(patients, { fields: [followUpTasks.patientId], references: [patients.id] }),
  physician: one(users, { fields: [followUpTasks.physicianId], references: [users.id] }),
  encounter: one(encounters, { fields: [followUpTasks.encounterId], references: [encounters.id] }),
}));

export const translationSessionsRelations = relations(translationSessions, ({ one }) => ({
  patient: one(patients, { fields: [translationSessions.patientId], references: [patients.id] }),
  physician: one(users, { fields: [translationSessions.physicianId], references: [users.id] }),
  encounter: one(encounters, { fields: [translationSessions.encounterId], references: [encounters.id] }),
}));

export const communicationLogRelations = relations(communicationLog, ({ one }) => ({
  patient: one(patients, { fields: [communicationLog.patientId], references: [patients.id] }),
}));

// ─────────────────────────────────────────────────────────────────
//  NEW TYPE EXPORTS
// ─────────────────────────────────────────────────────────────────
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type PatientMessage = typeof patientMessages.$inferSelect;
export type NewPatientMessage = typeof patientMessages.$inferInsert;
export type InsuranceProvider = typeof insuranceProviders.$inferSelect;
export type NewInsuranceProvider = typeof insuranceProviders.$inferInsert;
export type BillingClaim = typeof billingClaims.$inferSelect;
export type NewBillingClaim = typeof billingClaims.$inferInsert;
export type FollowUpTask = typeof followUpTasks.$inferSelect;
export type NewFollowUpTask = typeof followUpTasks.$inferInsert;
export type TranslationSession = typeof translationSessions.$inferSelect;
export type NewTranslationSession = typeof translationSessions.$inferInsert;
export type CommunicationLogEntry = typeof communicationLog.$inferSelect;
export type NewCommunicationLogEntry = typeof communicationLog.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  PATIENT EVENTS (Timeline)
// ─────────────────────────────────────────────────────────────────
export const patientEventCategoryEnum = pgEnum("patient_event_category", [
  "clinical", "medication", "lab", "imaging", "vitals",
  "nutrition", "exercise", "wellness", "social", "education", "system"
]);

export const patientEvents = pgTable("patient_events", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  recordedById: uuid("recorded_by_id").references(() => users.id),
  category: patientEventCategoryEnum("category").notNull(),
  eventType: varchar("event_type", { length: 80 }).notNull(),
  source: varchar("source", { length: 60 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  titleEn: varchar("title_en", { length: 256 }),
  description: text("description"),
  data: jsonb("data"),
  numericValue: numeric("numeric_value", { precision: 12, scale: 4 }),
  numericUnit: varchar("numeric_unit", { length: 32 }),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id),
  labResultId: uuid("lab_result_id").references(() => labResults.id),
  scanId: uuid("scan_id").references(() => scans.id),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type PatientEvent = typeof patientEvents.$inferSelect;
export type NewPatientEvent = typeof patientEvents.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  PATIENT EMERGENCY CONTACTS (multiple contacts per patient)
// ─────────────────────────────────────────────────────────────────
export const patientEmergencyContacts = pgTable(
  "patient_emergency_contacts",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    nameAr: varchar("name_ar", { length: 200 }),
    relationship: varchar("relationship", { length: 80 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    secondaryPhone: varchar("secondary_phone", { length: 32 }),
    email: varchar("email", { length: 320 }),
    address: text("address"),
    isPrimary: boolean("is_primary").default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("emergency_contacts_patient_idx").on(t.patientId)]
);

export type PatientEmergencyContact = typeof patientEmergencyContacts.$inferSelect;
export type NewPatientEmergencyContact = typeof patientEmergencyContacts.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  PATIENT READINGS (vitals from devices, self-reported measurements)
// ─────────────────────────────────────────────────────────────────
export const patientReadings = pgTable(
  "patient_readings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    recordedById: uuid("recorded_by_id").references(() => users.id, { onDelete: "set null" }),
    // Reading type
    readingType: varchar("reading_type", { length: 40 }).notNull(), // blood_pressure, blood_sugar, heart_rate, spo2, weight, temperature, steps, sleep
    // Values
    valuePrimary: decimal("value_primary", { precision: 10, scale: 2 }),
    valueSecondary: decimal("value_secondary", { precision: 10, scale: 2 }),
    unit: varchar("unit", { length: 20 }).notNull(),
    // Context
    context: varchar("context", { length: 40 }), // fasting, post_meal, resting, exercise, morning, evening
    notes: text("notes"),
    // Source
    source: varchar("source", { length: 40 }).notNull().default("manual"), // manual, apple_health, google_fit, device_bluetooth, patient_portal
    deviceName: varchar("device_name", { length: 120 }),
    deviceId: varchar("device_id", { length: 120 }),
    // Alert flags
    isAbnormal: boolean("is_abnormal").default(false),
    alertSent: boolean("alert_sent").default(false),
    alertSentAt: timestamp("alert_sent_at", { withTimezone: true }),
    // Timestamps
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("readings_patient_idx").on(t.patientId, t.recordedAt),
    index("readings_type_idx").on(t.patientId, t.readingType, t.recordedAt),
  ]
);

export type PatientReading = typeof patientReadings.$inferSelect;
export type NewPatientReading = typeof patientReadings.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  PATIENT DOCUMENTS (uploaded files: labs, scans, prescriptions)
// ─────────────────────────────────────────────────────────────────
export const patientDocuments = pgTable(
  "patient_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    uploadedById: uuid("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    // Document info
    title: varchar("title", { length: 256 }).notNull(),
    titleAr: varchar("title_ar", { length: 256 }),
    documentType: varchar("document_type", { length: 40 }).notNull(), // lab_report, scan_image, prescription, medical_report, insurance_card, id_document, vaccination_card, other
    category: varchar("category", { length: 40 }), // current, historical
    // File storage
    fileName: varchar("file_name", { length: 256 }).notNull(),
    fileUrl: text("file_url").notNull(),
    storageKey: text("storage_key"),
    mimeType: varchar("mime_type", { length: 80 }),
    fileSizeBytes: integer("file_size_bytes"),
    thumbnailUrl: text("thumbnail_url"),
    // AI Analysis
    aiExtractedText: text("ai_extracted_text"),
    aiSummary: text("ai_summary"),
    aiStructuredData: jsonb("ai_structured_data").$type<Record<string, unknown>>(),
    aiAnalyzedAt: timestamp("ai_analyzed_at", { withTimezone: true }),
    // Metadata
    documentDate: date("document_date"),
    issuingFacility: varchar("issuing_facility", { length: 256 }),
    physicianName: varchar("physician_name", { length: 200 }),
    notes: text("notes"),
    tags: jsonb("tags").$type<string[]>(),
    // Source
    source: varchar("source", { length: 40 }).default("upload"),
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("documents_patient_idx").on(t.patientId, t.createdAt),
    index("documents_type_idx").on(t.patientId, t.documentType),
  ]
);

export type PatientDocument = typeof patientDocuments.$inferSelect;
export type NewPatientDocument = typeof patientDocuments.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  PATIENT VOICE RECORDS (intake interviews, self-reports)
// ─────────────────────────────────────────────────────────────────
export const patientVoiceRecords = pgTable(
  "patient_voice_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    recordedById: uuid("recorded_by_id").references(() => users.id, { onDelete: "set null" }),
    // Recording info
    purpose: varchar("purpose", { length: 40 }).notNull(), // intake, follow_up, self_report, symptom_report, history_update
    title: varchar("title", { length: 256 }),
    // Audio storage
    audioUrl: text("audio_url"),
    audioStorageKey: text("audio_storage_key"),
    durationMs: integer("duration_ms"),
    mimeType: varchar("mime_type", { length: 80 }).default("audio/webm"),
    // Transcription
    transcript: text("transcript"),
    transcriptLanguage: varchar("transcript_language", { length: 10 }).default("ar"),
    transcriptionModel: varchar("transcription_model", { length: 40 }),
    transcriptionConfidence: decimal("transcription_confidence", { precision: 4, scale: 3 }),
    // AI Extraction
    aiExtractedData: jsonb("ai_extracted_data").$type<{
      allergies?: Array<{ substance: string; reaction?: string; severity?: string }>;
      conditions?: Array<{ description: string; icdCode?: string; onsetDate?: string }>;
      medications?: Array<{ name: string; dose?: string; frequency?: string }>;
      symptoms?: Array<{ description: string; severity?: string; duration?: string }>;
      surgeries?: Array<{ procedure: string; date?: string }>;
      familyHistory?: string;
      socialHistory?: string;
    }>(),
    aiSummary: text("ai_summary"),
    aiProcessedAt: timestamp("ai_processed_at", { withTimezone: true }),
    // Status
    status: varchar("status", { length: 20 }).default("pending"), // pending, transcribing, processing, completed, failed
    appliedToProfile: boolean("applied_to_profile").default(false),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    // Timestamps
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("voice_records_patient_idx").on(t.patientId, t.recordedAt),
    index("voice_records_status_idx").on(t.status),
  ]
);

export type PatientVoiceRecord = typeof patientVoiceRecords.$inferSelect;
export type NewPatientVoiceRecord = typeof patientVoiceRecords.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  PATIENT ALERTS (smart notifications for patient + physician)
// ─────────────────────────────────────────────────────────────────
export const patientAlerts = pgTable(
  "patient_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    physicianId: uuid("physician_id").references(() => users.id, { onDelete: "set null" }),
    // Alert info
    alertType: varchar("alert_type", { length: 40 }).notNull(), // abnormal_reading, missed_medication, overdue_appointment, critical_lab, risk_change
    severity: varchar("severity", { length: 20 }).notNull().default("info"), // critical, warning, info
    title: text("title").notNull(),
    titleAr: text("title_ar"),
    message: text("message").notNull(),
    messageAr: text("message_ar"),
    // Action
    actionUrl: text("action_url"),
    actionLabel: varchar("action_label", { length: 120 }),
    // Delivery
    notifyPatient: boolean("notify_patient").default(false),
    notifyPhysician: boolean("notify_physician").default(true),
    emailSent: boolean("email_sent").default(false),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    pushSent: boolean("push_sent").default(false),
    pushSentAt: timestamp("push_sent_at", { withTimezone: true }),
    smsSent: boolean("sms_sent").default(false),
    smsSentAt: timestamp("sms_sent_at", { withTimezone: true }),
    // Status
    acknowledged: boolean("acknowledged").default(false),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
    resolved: boolean("resolved").default(false),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    // Context
    readingId: uuid("reading_id").references(() => patientReadings.id),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("alerts_patient_idx").on(t.patientId, t.createdAt),
    index("alerts_physician_idx").on(t.physicianId, t.acknowledged),
    index("alerts_unresolved_idx").on(t.patientId),
  ]
);

export type PatientAlert = typeof patientAlerts.$inferSelect;
export type NewPatientAlert = typeof patientAlerts.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  RELATIONS for new UPP tables
// ─────────────────────────────────────────────────────────────────
export const patientEmergencyContactsRelations = relations(patientEmergencyContacts, ({ one }) => ({
  patient: one(patients, { fields: [patientEmergencyContacts.patientId], references: [patients.id] }),
}));

export const patientReadingsRelations = relations(patientReadings, ({ one }) => ({
  patient: one(patients, { fields: [patientReadings.patientId], references: [patients.id] }),
  recordedBy: one(users, { fields: [patientReadings.recordedById], references: [users.id] }),
}));

export const patientDocumentsRelations = relations(patientDocuments, ({ one }) => ({
  patient: one(patients, { fields: [patientDocuments.patientId], references: [patients.id] }),
  uploadedBy: one(users, { fields: [patientDocuments.uploadedById], references: [users.id] }),
}));

export const patientVoiceRecordsRelations = relations(patientVoiceRecords, ({ one }) => ({
  patient: one(patients, { fields: [patientVoiceRecords.patientId], references: [patients.id] }),
  recordedBy: one(users, { fields: [patientVoiceRecords.recordedById], references: [users.id] }),
}));

export const patientAlertsRelations = relations(patientAlerts, ({ one }) => ({
  patient: one(patients, { fields: [patientAlerts.patientId], references: [patients.id] }),
  physician: one(users, { fields: [patientAlerts.physicianId], references: [users.id] }),
  reading: one(patientReadings, { fields: [patientAlerts.readingId], references: [patientReadings.id] }),
}));

// ═══════════════════════════════════════════════════════════════════
//  MEDICONNECT — Communication & Notification System
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
//  CONVERSATIONS
// ─────────────────────────────────────────────────────────────────
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id").references(() => patients.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 256 }),
    type: varchar("type", { length: 32 }).notNull().default("direct"),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    priority: varchar("priority", { length: 16 }).default("normal"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("conv_patient_idx").on(t.patientId),
    index("conv_type_idx").on(t.type),
    index("conv_status_idx").on(t.status),
    index("conv_last_msg_idx").on(t.lastMessageAt),
  ]
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  CONVERSATION PARTICIPANTS
// ─────────────────────────────────────────────────────────────────
export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    patientId: integer("patient_id").references(() => patients.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).notNull().default("member"),
    unreadCount: integer("unread_count").notNull().default(0),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    muted: boolean("muted").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("cp_conv_idx").on(t.conversationId),
    index("cp_user_idx").on(t.userId),
    index("cp_patient_idx").on(t.patientId),
  ]
);

export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type NewConversationParticipant = typeof conversationParticipants.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  MEDICONNECT MESSAGES
// ─────────────────────────────────────────────────────────────────
export const mediconnectMessages = pgTable(
  "mediconnect_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    senderUserId: uuid("sender_user_id").references(() => users.id),
    senderPatientId: integer("sender_patient_id").references(() => patients.id),
    senderType: varchar("sender_type", { length: 20 }).notNull(),
    contentType: varchar("content_type", { length: 32 }).notNull().default("text"),
    body: text("body"),
    attachments: jsonb("attachments").$type<Array<{ name: string; url: string; type: string; size?: number }>>().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    replyToId: uuid("reply_to_id"),
    isEdited: boolean("is_edited").notNull().default(false),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("mcm_conv_idx").on(t.conversationId, t.createdAt),
    index("mcm_sender_user_idx").on(t.senderUserId),
    index("mcm_sender_patient_idx").on(t.senderPatientId),
    index("mcm_type_idx").on(t.contentType),
  ]
);

export type MediconnectMessage = typeof mediconnectMessages.$inferSelect;
export type NewMediconnectMessage = typeof mediconnectMessages.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  REMOTE PRESCRIPTIONS
// ─────────────────────────────────────────────────────────────────
export const remotePrescriptions = pgTable(
  "remote_prescriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    physicianId: uuid("physician_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    conversationId: uuid("conversation_id").references(() => conversations.id),
    messageId: uuid("message_id"),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    medications: jsonb("medications").$type<Array<{
      name: string;
      dose: string;
      frequency: string;
      duration: string;
      instructions?: string;
      quantity?: number;
    }>>().notNull().default([]),
    diagnosis: varchar("diagnosis", { length: 512 }),
    diagnosisCode: varchar("diagnosis_code", { length: 32 }),
    notes: text("notes"),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    dispensedAt: timestamp("dispensed_at", { withTimezone: true }),
    dispensedBy: varchar("dispensed_by", { length: 256 }),
    pharmacyName: varchar("pharmacy_name", { length: 256 }),
    qrCode: text("qr_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("rp_patient_idx").on(t.patientId),
    index("rp_physician_idx").on(t.physicianId),
    index("rp_status_idx").on(t.status),
    index("rp_conv_idx").on(t.conversationId),
  ]
);

export type RemotePrescription = typeof remotePrescriptions.$inferSelect;
export type NewRemotePrescription = typeof remotePrescriptions.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  PATIENT NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────
export const patientNotifications = pgTable(
  "patient_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(),
    severity: varchar("severity", { length: 16 }).notNull().default("info"),
    title: varchar("title", { length: 256 }).notNull(),
    titleAr: varchar("title_ar", { length: 256 }),
    body: text("body").notNull(),
    bodyAr: text("body_ar"),
    actionUrl: varchar("action_url", { length: 512 }),
    actionLabel: varchar("action_label", { length: 128 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    channelsSent: jsonb("channels_sent").$type<string[]>().default([]),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    isDismissed: boolean("is_dismissed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("pn_patient_idx").on(t.patientId),
    index("pn_type_idx").on(t.type),
    index("pn_unread_idx").on(t.patientId, t.isRead),
    index("pn_created_idx").on(t.createdAt),
  ]
);

export type PatientNotification = typeof patientNotifications.$inferSelect;
export type NewPatientNotification = typeof patientNotifications.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  PUSH SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────────
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    patientId: integer("patient_id").references(() => patients.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    authKey: text("auth_key"),
    p256dhKey: text("p256dh_key"),
    fcmToken: text("fcm_token"),
    deviceType: varchar("device_type", { length: 32 }),
    deviceName: varchar("device_name", { length: 128 }),
    isActive: boolean("is_active").notNull().default(true),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ps_user_idx").on(t.userId),
    index("ps_patient_idx").on(t.patientId),
  ]
);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  PATIENT DEVICE CONNECTIONS
// ─────────────────────────────────────────────────────────────────
export const patientDeviceConnections = pgTable(
  "patient_device_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    deviceType: varchar("device_type", { length: 64 }).notNull(),
    deviceName: varchar("device_name", { length: 256 }),
    deviceModel: varchar("device_model", { length: 256 }),
    connectionStatus: varchar("connection_status", { length: 32 }).notNull().default("pending"),
    oauthToken: text("oauth_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    syncFrequencyMinutes: integer("sync_frequency_minutes").default(60),
    dataTypes: jsonb("data_types").$type<string[]>().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pdc_patient_idx").on(t.patientId),
    index("pdc_type_idx").on(t.deviceType),
    index("pdc_status_idx").on(t.connectionStatus),
  ]
);

export type PatientDeviceConnection = typeof patientDeviceConnections.$inferSelect;
export type NewPatientDeviceConnection = typeof patientDeviceConnections.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  NOTIFICATION PREFERENCES
// ─────────────────────────────────────────────────────────────────
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    patientId: integer("patient_id").references(() => patients.id, { onDelete: "cascade" }),
    channel: varchar("channel", { length: 32 }).notNull(),
    notificationType: varchar("notification_type", { length: 64 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    quietHoursStart: varchar("quiet_hours_start", { length: 8 }),
    quietHoursEnd: varchar("quiet_hours_end", { length: 8 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("np_user_idx").on(t.userId),
    index("np_patient_idx").on(t.patientId),
  ]
);

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  VIDEO CALL SESSIONS (Telemedicine)
// ─────────────────────────────────────────────────────────────────
export const videoCallSessions = pgTable(
  "video_call_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").references(() => conversations.id),
    patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    physicianId: uuid("physician_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 32 }).notNull().default("scheduled"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    roomId: varchar("room_id", { length: 256 }),
    recordingUrl: text("recording_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vcs_patient_idx").on(t.patientId),
    index("vcs_physician_idx").on(t.physicianId),
    index("vcs_status_idx").on(t.status),
    index("vcs_scheduled_idx").on(t.scheduledAt),
  ]
);

export type VideoCallSession = typeof videoCallSessions.$inferSelect;
export type NewVideoCallSession = typeof videoCallSessions.$inferInsert;

// ─────────────────────────────────────────────────────────────────
//  MEDICONNECT RELATIONS
// ─────────────────────────────────────────────────────────────────
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  patient: one(patients, { fields: [conversations.patientId], references: [patients.id] }),
  createdByUser: one(users, { fields: [conversations.createdBy], references: [users.id] }),
  participants: many(conversationParticipants),
  messages: many(mediconnectMessages),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, { fields: [conversationParticipants.conversationId], references: [conversations.id] }),
  user: one(users, { fields: [conversationParticipants.userId], references: [users.id] }),
  patient: one(patients, { fields: [conversationParticipants.patientId], references: [patients.id] }),
}));

export const mediconnectMessagesRelations = relations(mediconnectMessages, ({ one }) => ({
  conversation: one(conversations, { fields: [mediconnectMessages.conversationId], references: [conversations.id] }),
  senderUser: one(users, { fields: [mediconnectMessages.senderUserId], references: [users.id] }),
  senderPatient: one(patients, { fields: [mediconnectMessages.senderPatientId], references: [patients.id] }),
}));

export const remotePrescriptionsRelations = relations(remotePrescriptions, ({ one }) => ({
  patient: one(patients, { fields: [remotePrescriptions.patientId], references: [patients.id] }),
  physician: one(users, { fields: [remotePrescriptions.physicianId], references: [users.id] }),
  conversation: one(conversations, { fields: [remotePrescriptions.conversationId], references: [conversations.id] }),
}));

export const patientNotificationsRelations = relations(patientNotifications, ({ one }) => ({
  patient: one(patients, { fields: [patientNotifications.patientId], references: [patients.id] }),
}));

export const patientDeviceConnectionsRelations = relations(patientDeviceConnections, ({ one }) => ({
  patient: one(patients, { fields: [patientDeviceConnections.patientId], references: [patients.id] }),
}));

export const videoCallSessionsRelations = relations(videoCallSessions, ({ one }) => ({
  patient: one(patients, { fields: [videoCallSessions.patientId], references: [patients.id] }),
  physician: one(users, { fields: [videoCallSessions.physicianId], references: [users.id] }),
  conversation: one(conversations, { fields: [videoCallSessions.conversationId], references: [conversations.id] }),
}));


// ═════════════════════════════════════════════════════════════════
//  MEDISPORT — Standalone Fitness Platform (Phase 4 Persistence)
// ═════════════════════════════════════════════════════════════════
// All MediSport tables are namespaced with `sport_` to keep them
// clearly separated from the clinical schema. User identity is shared
// via the existing `users` table (userId UUID FK).

// --- Sport user profile (role + onboarding data) ---
export const sportProfiles = pgTable(
  "sport_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).notNull().default("trainee"), // 'coach' | 'trainee'
    displayName: varchar("display_name", { length: 200 }),
    sex: varchar("sex", { length: 16 }),
    birthDate: date("birth_date"),
    heightCm: numeric("height_cm", { precision: 5, scale: 1 }),
    weightKg: numeric("weight_kg", { precision: 5, scale: 1 }),
    goal: varchar("goal", { length: 64 }), // fat_loss | muscle_gain | endurance | health
    specialization: varchar("specialization", { length: 64 }), // for coaches
    activityLevel: varchar("activity_level", { length: 32 }),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    // --- Coach verification & scoring (Phase 8) ---
    verificationStatus: varchar("verification_status", { length: 24 })
      .notNull()
      .default("draft"), // draft|submitted|under_review|verified|rejected|needs_more_info
    coachScore: numeric("coach_score", { precision: 5, scale: 2 }),
    coachTier: varchar("coach_tier", { length: 24 }),
    scoreBreakdown: jsonb("score_breakdown"),
    adminScore: integer("admin_score"),
    adminNote: text("admin_note"),
    rejectionReason: text("rejection_reason"),
    highestDegree: varchar("highest_degree", { length: 32 }),
    studyField: varchar("study_field", { length: 80 }),
    university: varchar("university", { length: 160 }),
    graduationYear: integer("graduation_year"),
    yearsExperience: integer("years_experience"),
    specialties: jsonb("specialties"),
    languages: jsonb("languages"),
    city: varchar("city", { length: 80 }),
    country: varchar("country", { length: 80 }),
    cvUrl: text("cv_url"),
    idDocUrl: text("id_doc_url"),
    professionalLinks: jsonb("professional_links"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).notNull().default("0"),
    ratingCount: integer("rating_count").notNull().default(0),
    activeClients: integer("active_clients").notNull().default(0),
    // --- Trainee comprehensive profile fields ---
    fitnessLevel: varchar("fitness_level", { length: 32 }).default("beginner"),
    equipmentAccess: varchar("equipment_access", { length: 32 }).default("full_gym"),
    daysPerWeek: integer("days_per_week").default(4),
    injuries: jsonb("injuries").default([]),
    medicalConditions: jsonb("medical_conditions").default([]),
    medications: jsonb("medications").default([]),
    emergencyContact: jsonb("emergency_contact").default({}),
    phone: varchar("phone", { length: 32 }),
    bodyFatPct: numeric("body_fat_pct", { precision: 5, scale: 1 }),
    muscleMassKg: numeric("muscle_mass_kg", { precision: 5, scale: 1 }),
    preferredTrainingTime: varchar("preferred_training_time", { length: 32 }),
    profileCompletion: integer("profile_completion").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("sport_profiles_user_idx").on(t.userId),
    index("sport_profiles_role_idx").on(t.role),
    index("sport_profiles_verif_idx").on(t.verificationStatus),
    index("sport_profiles_score_idx").on(t.coachScore),
  ]
);

// --- Coach ↔ Trainee relationship ---
export const sportCoachClients = pgTable(
  "sport_coach_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    traineeId: uuid("trainee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 16 }).notNull().default("active"), // active | paused | ended
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sport_coach_client_idx").on(t.coachId, t.traineeId),
    index("sport_client_trainee_idx").on(t.traineeId),
  ]
);

// --- Food log entries ---
export const sportFoodLogs = pgTable(
  "sport_food_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    mealType: varchar("meal_type", { length: 16 }).notNull(), // breakfast | lunch | dinner | snack
    foodId: varchar("food_id", { length: 64 }),
    foodNameAr: varchar("food_name_ar", { length: 200 }),
    foodNameEn: varchar("food_name_en", { length: 200 }),
    grams: numeric("grams", { precision: 7, scale: 1 }).notNull(),
    calories: numeric("calories", { precision: 8, scale: 2 }).notNull().default("0"),
    protein: numeric("protein", { precision: 7, scale: 2 }).notNull().default("0"),
    carbs: numeric("carbs", { precision: 7, scale: 2 }).notNull().default("0"),
    fat: numeric("fat", { precision: 7, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sport_food_user_date_idx").on(t.userId, t.logDate),
  ]
);

// --- Activity (GPS / workout) records ---
export const sportActivities = pgTable(
  "sport_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityType: varchar("activity_type", { length: 32 }).notNull(), // run | walk | cycle | swim | gym
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    durationSec: integer("duration_sec").notNull().default(0),
    distanceMeters: numeric("distance_meters", { precision: 10, scale: 1 }).notNull().default("0"),
    caloriesBurned: numeric("calories_burned", { precision: 8, scale: 1 }).notNull().default("0"),
    avgPace: numeric("avg_pace", { precision: 7, scale: 2 }), // min/km
    avgHeartRate: integer("avg_heart_rate"),
    routeGeojson: jsonb("route_geojson"), // GPS track
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sport_activity_user_idx").on(t.userId, t.startedAt),
  ]
);

// --- Bio-age calculation history ---
export const sportBioAgeRecords = pgTable(
  "sport_bio_age_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chronologicalAge: numeric("chronological_age", { precision: 5, scale: 1 }).notNull(),
    biologicalAge: numeric("biological_age", { precision: 5, scale: 1 }).notNull(),
     ageDelta: numeric("age_delta", { precision: 5, scale: 1 }).notNull(),
    percentile: integer("percentile"),
    classification: varchar("classification", { length: 32 }),
    inputs: jsonb("inputs").notNull(), // 16 raw inputs
    domainScores: jsonb("domain_scores"), // 5 domain breakdown
    recommendations: jsonb("recommendations"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sport_bioage_user_idx").on(t.userId, t.createdAt),
  ]
);

// --- Training programs (built by coaches) ---
export const sportPrograms = pgTable(
  "sport_programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedTraineeId: uuid("assigned_trainee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    nameAr: varchar("name_ar", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 200 }),
    goal: varchar("goal", { length: 64 }),
    durationWeeks: integer("duration_weeks").notNull().default(4),
    daysPerWeek: integer("days_per_week").notNull().default(3),
    structure: jsonb("structure").notNull(), // days[] → exercises[]
    status: varchar("status", { length: 16 }).notNull().default("draft"), // draft | active | archived
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("sport_program_coach_idx").on(t.coachId),
    index("sport_program_trainee_idx").on(t.assignedTraineeId),
  ]
);

// --- Medical Context Bridge consent ---
export const sportMedicalConsents = pgTable(
  "sport_medical_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mrn: varchar("mrn", { length: 64 }), // links to clinical patient record
    linkedPatientId: integer("linked_patient_id").references(() => patients.id, {
      onDelete: "set null",
    }),
    coachId: uuid("coach_id").references(() => users.id, { onDelete: "set null" }),
    shareLabResults: boolean("share_lab_results").notNull().default(false),
    shareVitals: boolean("share_vitals").notNull().default(false),
    shareBodyComposition: boolean("share_body_composition").notNull().default(false),
    shareMedicalHistory: boolean("share_medical_history").notNull().default(false),
    shareClinicalNotes: boolean("share_clinical_notes").notNull().default(false),
    consentGivenAt: timestamp("consent_given_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("sport_consent_user_idx").on(t.userId),
    index("sport_consent_coach_idx").on(t.coachId),
  ]
);

// --- Social challenges ---
export const sportChallenges = pgTable(
  "sport_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    titleAr: varchar("title_ar", { length: 200 }).notNull(),
    titleEn: varchar("title_en", { length: 200 }),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    challengeType: varchar("challenge_type", { length: 32 }).notNull(), // steps | distance | workouts | calories
    targetValue: numeric("target_value", { precision: 12, scale: 1 }).notNull(),
    unit: varchar("unit", { length: 16 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("active"), // active | completed | cancelled
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sport_challenge_status_idx").on(t.status),
  ]
);

// --- Challenge participants ---
export const sportChallengeParticipants = pgTable(
  "sport_challenge_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => sportChallenges.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    progressValue: numeric("progress_value", { precision: 12, scale: 1 }).notNull().default("0"),
    completed: boolean("completed").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sport_challenge_participant_idx").on(t.challengeId, t.userId),
    index("sport_participant_user_idx").on(t.userId),
  ]
);

// --- Social feed posts ---
export const sportPosts = pgTable(
  "sport_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    activityId: uuid("activity_id").references(() => sportActivities.id, {
      onDelete: "set null",
    }),
    challengeId: uuid("challenge_id").references(() => sportChallenges.id, {
      onDelete: "set null",
    }),
    likesCount: integer("likes_count").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sport_post_user_idx").on(t.userId, t.createdAt),
  ]
);

// --- Post likes ---
export const sportPostLikes = pgTable(
  "sport_post_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => sportPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sport_post_like_idx").on(t.postId, t.userId),
  ]
);


// --- Body composition measurements over time (Phase 5) ---
export const sportBodyMeasurements = pgTable(
  "sport_body_measurements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    measuredAt: date("measured_at").notNull().defaultNow(),
    weightKg: numeric("weight_kg", { precision: 5, scale: 1 }),
    bodyFatPct: numeric("body_fat_pct", { precision: 4, scale: 1 }),
    muscleMassKg: numeric("muscle_mass_kg", { precision: 5, scale: 1 }),
    waterPct: numeric("water_pct", { precision: 4, scale: 1 }),
    boneMassKg: numeric("bone_mass_kg", { precision: 4, scale: 1 }),
    visceralFat: numeric("visceral_fat", { precision: 4, scale: 1 }),
    bmrKcal: integer("bmr_kcal"),
    waistCm: numeric("waist_cm", { precision: 5, scale: 1 }),
    hipCm: numeric("hip_cm", { precision: 5, scale: 1 }),
    chestCm: numeric("chest_cm", { precision: 5, scale: 1 }),
    armCm: numeric("arm_cm", { precision: 5, scale: 1 }),
    thighCm: numeric("thigh_cm", { precision: 5, scale: 1 }),
    source: varchar("source", { length: 24 }).notNull().default("manual"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sport_body_user_idx").on(t.userId),
    index("sport_body_user_date_idx").on(t.userId, t.measuredAt),
  ]
);


/**
 * MediSport — athlete lab results (Phase 6).
 * One row per lab report; markers stored as JSONB for flexible biomarker sets,
 * enabling historical comparison of athlete biomarkers over time.
 */
export type SportLabMarker = {
  name: string;
  category: string;
  value: number;
  unit: string;
  athleteMin?: number;
  athleteMax?: number;
};

export const sportLabResults = pgTable(
  "sport_lab_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    reportDate: date("report_date").notNull().defaultNow(),
    seasonPhase: text("season_phase"),
    markers: jsonb("markers").$type<SportLabMarker[]>().notNull().default([]),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sport_lab_user_idx").on(t.userId),
    index("sport_lab_user_date_idx").on(t.userId, t.reportDate),
  ]
);


// MediSport Phase 7 — coach notifications when a linked trainee logs new data
export const sportNotifications = pgTable(
  "sport_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_sport_notifications_user").on(t.userId, t.isRead, t.createdAt)]
);

// --- Coach certifications (Phase 8) ---
export const sportCoachCertifications = pgTable(
  "sport_coach_certifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    issuer: varchar("issuer", { length: 160 }),
    credentialNo: varchar("credential_no", { length: 120 }),
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date"),
    fileUrl: text("file_url"),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sport_cert_coach_idx").on(t.coachId)]
);

// --- Coach reviews by trainees (Phase 8) ---
export const sportCoachReviews = pgTable(
  "sport_coach_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    traineeId: uuid("trainee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    communication: integer("communication"),
    results: integer("results"),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sport_review_unique").on(t.coachId, t.traineeId),
    index("sport_review_coach_idx").on(t.coachId),
  ]
);

// --- Coach↔Trainee connection requests (two-sided consent) (Phase 8) ---
export const sportCoachRequests = pgTable(
  "sport_coach_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    traineeId: uuid("trainee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    initiator: varchar("initiator", { length: 16 }).notNull().default("trainee"), // trainee|coach
    status: varchar("status", { length: 16 }).notNull().default("pending"), // pending|accepted|declined
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("sport_request_unique").on(t.traineeId, t.coachId),
    index("sport_request_coach_idx").on(t.coachId, t.status),
    index("sport_request_trainee_idx").on(t.traineeId, t.status),
  ]
);

// --- Coach score/rating time-series snapshots (Phase 8.1 — analytics) ---
export const sportCoachScoreHistory = pgTable(
  "sport_coach_score_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    total: numeric("total", { precision: 5, scale: 2 }).notNull(),
    tier: varchar("tier", { length: 24 }),
    breakdown: jsonb("breakdown"),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).notNull().default("0"),
    ratingCount: integer("rating_count").notNull().default(0),
    reason: varchar("reason", { length: 32 }).notNull().default("recompute"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sport_score_hist_coach_idx").on(t.coachId, t.createdAt)]
);

// ============================================================
// MediSport Virtual Training Engine (Phase 9)
// ============================================================

// --- Local exercise library cache ---
export const sportExercises = pgTable(
  "sport_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: varchar("external_id", { length: 64 }),
    source: varchar("source", { length: 16 }).notNull().default("exercisedb"),
    name: varchar("name", { length: 256 }).notNull(),
    nameAr: varchar("name_ar", { length: 256 }),
    gifUrl: text("gif_url"),
    videoUrl: text("video_url"),
    targetMuscles: jsonb("target_muscles").notNull().default([]),
    secondaryMuscles: jsonb("secondary_muscles").notNull().default([]),
    bodyParts: jsonb("body_parts").notNull().default([]),
    equipments: jsonb("equipments").notNull().default([]),
    instructions: jsonb("instructions").notNull().default([]),
    difficulty: varchar("difficulty", { length: 16 }),
    forceType: varchar("force_type", { length: 16 }),
    category: varchar("category", { length: 32 }),
    isPremium: boolean("is_premium").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sport_exercises_source_idx").on(t.source),
    index("sport_exercises_name_idx").on(t.name),
  ]
);

// --- Training plans (master plans) ---
export const sportTrainingPlans = pgTable(
  "sport_training_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 256 }).notNull(),
    goal: varchar("goal", { length: 32 }).notNull(),
    durationWeeks: integer("duration_weeks").notNull().default(8),
    daysPerWeek: integer("days_per_week").notNull().default(4),
    equipmentAccess: varchar("equipment_access", { length: 32 }).notNull().default("full_gym"),
    currentWeek: integer("current_week").notNull().default(1),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    medicalAdjustments: jsonb("medical_adjustments").default({}),
    planStructure: jsonb("plan_structure").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sport_plan_user_idx").on(t.userId, t.status)]
);

// --- Daily workouts within a plan ---
export const sportWorkouts = pgTable(
  "sport_workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id").notNull().references(() => sportTrainingPlans.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    dayNumber: integer("day_number").notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    targetMuscles: jsonb("target_muscles").notNull().default([]),
    exercises: jsonb("exercises").notNull().default([]),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    scheduledDate: date("scheduled_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sport_workout_plan_idx").on(t.planId, t.weekNumber, t.dayNumber),
    index("sport_workout_user_idx").on(t.userId, t.status),
  ]
);

// --- Workout sessions (actual logged sessions) ---
export const sportWorkoutSessions = pgTable(
  "sport_workout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id").references(() => sportWorkouts.id, { onDelete: "set null" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    totalVolume: numeric("total_volume", { precision: 10, scale: 2 }).default("0"),
    totalSets: integer("total_sets").default(0),
    caloriesBurned: integer("calories_burned").default(0),
    notes: text("notes"),
    moodRating: integer("mood_rating"),
    status: varchar("status", { length: 16 }).notNull().default("in_progress"),
  },
  (t) => [
    index("sport_session_user_idx").on(t.userId),
    index("sport_session_workout_idx").on(t.workoutId),
  ]
);

// --- Session exercise logs ---
export const sportSessionExercises = pgTable(
  "sport_session_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull().references(() => sportWorkoutSessions.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").references(() => sportExercises.id, { onDelete: "set null" }),
    exerciseName: varchar("exercise_name", { length: 256 }).notNull(),
    exerciseOrder: integer("exercise_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sport_session_ex_session_idx").on(t.sessionId, t.exerciseOrder)]
);

// --- Set logs ---
export const sportSessionSets = pgTable(
  "sport_session_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionExerciseId: uuid("session_exercise_id").notNull().references(() => sportSessionExercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    setType: varchar("set_type", { length: 16 }).notNull().default("working"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    reps: integer("reps"),
    durationSeconds: integer("duration_seconds"),
    distanceMeters: numeric("distance_meters", { precision: 8, scale: 2 }),
    rpe: integer("rpe"),
    restTakenSeconds: integer("rest_taken_seconds"),
    isPr: boolean("is_pr").notNull().default(false),
    completed: boolean("completed").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sport_set_exercise_idx").on(t.sessionExerciseId, t.setNumber)]
);

// --- Personal records ---
export const sportPersonalRecords = pgTable(
  "sport_personal_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").references(() => sportExercises.id, { onDelete: "set null" }),
    exerciseName: varchar("exercise_name", { length: 256 }).notNull(),
    recordType: varchar("record_type", { length: 16 }).notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    previousValue: numeric("previous_value", { precision: 10, scale: 2 }),
    sessionId: uuid("session_id").references(() => sportWorkoutSessions.id, { onDelete: "set null" }),
    achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sport_pr_user_idx").on(t.userId, t.exerciseName, t.recordType)]
);

// --- Progressive overload tracking ---
export const sportExerciseProgress = pgTable(
  "sport_exercise_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").references(() => sportExercises.id, { onDelete: "set null" }),
    exerciseName: varchar("exercise_name", { length: 256 }).notNull(),
    currentWeightKg: numeric("current_weight_kg", { precision: 6, scale: 2 }),
    currentRepMin: integer("current_rep_min").notNull().default(8),
    currentRepMax: integer("current_rep_max").notNull().default(12),
    lastAchievedReps: jsonb("last_achieved_reps").default([]),
    nextWeightKg: numeric("next_weight_kg", { precision: 6, scale: 2 }),
    progressionStatus: varchar("progression_status", { length: 16 }).notNull().default("maintain"),
    consecutiveSuccesses: integer("consecutive_successes").notNull().default(0),
    lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sport_progress_user_exercise_idx").on(t.userId, t.exerciseName)]
);

// ─── Exercise Library (ExerciseDB + MuscleWiki Premium — 2298+ exercises) ───
export const sportExerciseLibrary = pgTable(
  "sport_exercise_library",
  {
    id: serial("id").primaryKey(),
    exerciseId: varchar("exercise_id", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    gifUrl: text("gif_url"),
    bodyParts: jsonb("body_parts").notNull().default([]),
    equipments: jsonb("equipments").notNull().default([]),
    targetMuscles: jsonb("target_muscles").notNull().default([]),
    secondaryMuscles: jsonb("secondary_muscles").notNull().default([]),
    instructions: jsonb("instructions").notNull().default([]),
    source: varchar("source", { length: 20 }).default("exercisedb"),
    difficulty: varchar("difficulty", { length: 20 }),
    forceType: varchar("force_type", { length: 20 }),
    mechanic: varchar("mechanic", { length: 20 }),
    category: varchar("category", { length: 50 }),
    grips: jsonb("grips").default([]),
    videoUrl: text("video_url"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_sport_exercise_lib_name_drizzle").on(t.name),
  ]
);
