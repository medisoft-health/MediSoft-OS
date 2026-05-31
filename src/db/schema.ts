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
