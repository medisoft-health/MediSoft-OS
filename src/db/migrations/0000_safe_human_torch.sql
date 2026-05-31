CREATE TYPE "public"."blood_type" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."encounter_status" AS ENUM('in_progress', 'awaiting_review', 'signed', 'amended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."prescription_status" AS ENUM('draft', 'active', 'completed', 'discontinued', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."scan_type" AS ENUM('xray', 'ct', 'mri', 'ultrasound', 'mammography', 'pathology', 'other');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'moderate', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female', 'other', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('physician', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" varchar(64) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" varchar(64) NOT NULL,
	"resource_type" varchar(64) NOT NULL,
	"resource_id" text,
	"patient_id" integer,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"hash" varchar(64),
	"previous_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"physician_id" uuid NOT NULL,
	"patient_id" integer,
	"type" varchar(64) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"action_url" text,
	"action_label" text,
	"read" boolean DEFAULT false NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" integer NOT NULL,
	"physician_id" uuid NOT NULL,
	"encounter_date" timestamp with time zone DEFAULT now() NOT NULL,
	"encounter_type" varchar(64) DEFAULT 'outpatient',
	"status" "encounter_status" DEFAULT 'in_progress' NOT NULL,
	"audio_storage_key" text,
	"raw_transcript" text,
	"corrected_transcript" text,
	"soap_note" jsonb,
	"icd_codes" jsonb,
	"signed_at" timestamp with time zone,
	"signed_by_id" uuid,
	"fhir_composition" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lab_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" integer NOT NULL,
	"physician_id" uuid NOT NULL,
	"encounter_id" uuid,
	"panel_name" varchar(200) NOT NULL,
	"panel_loinc_code" varchar(20),
	"collection_date" timestamp with time zone,
	"result_date" timestamp with time zone DEFAULT now() NOT NULL,
	"laboratory" varchar(200),
	"results" jsonb NOT NULL,
	"ai_narrative" text,
	"ai_trend_analysis" jsonb,
	"critical_flags" jsonb,
	"fhir_diagnostic_report" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"saudi_id" varchar(20),
	"mrn" varchar(40),
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"first_name_ar" varchar(120),
	"last_name_ar" varchar(120),
	"date_of_birth" date NOT NULL,
	"sex" "sex" NOT NULL,
	"blood_type" "blood_type" DEFAULT 'unknown',
	"phone" varchar(32),
	"email" varchar(320),
	"address" jsonb,
	"emergency_contact" jsonb,
	"insurance_id" varchar(80),
	"insurance_provider" varchar(120),
	"allergies" jsonb,
	"chronic_conditions" jsonb,
	"medical_history" text,
	"family_history" text,
	"social_history" text,
	"fhir_resource" jsonb,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" integer NOT NULL,
	"physician_id" uuid NOT NULL,
	"encounter_id" uuid,
	"drug_name" varchar(256) NOT NULL,
	"brand_name" varchar(256),
	"rxcui" varchar(40),
	"atc_code" varchar(10),
	"dose" varchar(80) NOT NULL,
	"frequency" varchar(80) NOT NULL,
	"route" varchar(40) NOT NULL,
	"duration" varchar(80),
	"instructions" text,
	"quantity" integer,
	"refills" integer DEFAULT 0,
	"interactions" jsonb,
	"severity" "severity",
	"contraindications" jsonb,
	"boxed_warnings" text,
	"insurance_coverage" jsonb,
	"status" "prescription_status" DEFAULT 'draft' NOT NULL,
	"start_date" date,
	"end_date" date,
	"fhir_medication_request" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" integer NOT NULL,
	"physician_id" uuid NOT NULL,
	"encounter_id" uuid,
	"scan_type" "scan_type" NOT NULL,
	"body_part" varchar(120) NOT NULL,
	"modality" varchar(20),
	"study_instance_uid" varchar(128),
	"image_storage_key" text NOT NULL,
	"image_storage_url" text,
	"thumbnail_key" text,
	"mime_type" varchar(80),
	"file_size_bytes" integer,
	"findings" jsonb,
	"ai_report" text,
	"ai_impression" text,
	"ai_differential_diagnosis" text,
	"ai_recommendations" text,
	"technical_quality" varchar(40),
	"radiologist_reviewed_at" timestamp with time zone,
	"radiologist_report_text" text,
	"disclaimer" text NOT NULL,
	"fhir_imaging_study" jsonb,
	"study_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" varchar(200) NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'physician' NOT NULL,
	"specialty" varchar(120),
	"license_number" varchar(80),
	"saudi_id" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vitals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" integer NOT NULL,
	"physician_id" uuid,
	"encounter_id" uuid,
	"bp_systolic" integer,
	"bp_diastolic" integer,
	"heart_rate" integer,
	"respiratory_rate" integer,
	"temperature" numeric(4, 1),
	"spo2" integer,
	"weight_kg" numeric(5, 2),
	"height_cm" numeric(5, 2),
	"bmi" numeric(4, 1),
	"pain" integer,
	"notes" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notifications" ADD CONSTRAINT "clinical_notifications_physician_id_users_id_fk" FOREIGN KEY ("physician_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notifications" ADD CONSTRAINT "clinical_notifications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_physician_id_users_id_fk" FOREIGN KEY ("physician_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_signed_by_id_users_id_fk" FOREIGN KEY ("signed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_physician_id_users_id_fk" FOREIGN KEY ("physician_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_physician_id_users_id_fk" FOREIGN KEY ("physician_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_physician_id_users_id_fk" FOREIGN KEY ("physician_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_physician_id_users_id_fk" FOREIGN KEY ("physician_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_patient_idx" ON "audit_log" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_hash_idx" ON "audit_log" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "notifications_physician_idx" ON "clinical_notifications" USING btree ("physician_id");--> statement-breakpoint
CREATE INDEX "notifications_read_idx" ON "clinical_notifications" USING btree ("physician_id","read");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "clinical_notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "encounters_patient_idx" ON "encounters" USING btree ("patient_id","encounter_date");--> statement-breakpoint
CREATE INDEX "encounters_physician_idx" ON "encounters" USING btree ("physician_id","encounter_date");--> statement-breakpoint
CREATE INDEX "encounters_status_idx" ON "encounters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lab_results_patient_idx" ON "lab_results" USING btree ("patient_id","result_date");--> statement-breakpoint
CREATE INDEX "lab_results_panel_idx" ON "lab_results" USING btree ("panel_name");--> statement-breakpoint
CREATE UNIQUE INDEX "patients_saudi_id_idx" ON "patients" USING btree ("saudi_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patients_mrn_idx" ON "patients" USING btree ("mrn");--> statement-breakpoint
CREATE INDEX "patients_name_idx" ON "patients" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE INDEX "patients_phone_idx" ON "patients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "prescriptions_patient_idx" ON "prescriptions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "prescriptions_physician_idx" ON "prescriptions" USING btree ("physician_id");--> statement-breakpoint
CREATE INDEX "prescriptions_rxcui_idx" ON "prescriptions" USING btree ("rxcui");--> statement-breakpoint
CREATE INDEX "prescriptions_status_idx" ON "prescriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scans_patient_idx" ON "scans" USING btree ("patient_id","study_date");--> statement-breakpoint
CREATE INDEX "scans_type_idx" ON "scans" USING btree ("scan_type");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_idx" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "vitals_patient_idx" ON "vitals" USING btree ("patient_id","recorded_at");