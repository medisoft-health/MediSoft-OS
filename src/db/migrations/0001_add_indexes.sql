-- ─────────────────────────────────────────────────────────────────
-- MediSoft C-OS — Add missing indexes for FK columns and lookups
-- ─────────────────────────────────────────────────────────────────
-- Run manually by CTO on production database.
-- These indexes improve JOIN performance and query filtering on
-- columns that are frequently used in WHERE/JOIN clauses.
--
-- Safe to run multiple times (IF NOT EXISTS on all statements).
-- ─────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════
-- Priority 1: Foreign Key columns without indexes
-- (Critical for JOIN/CASCADE performance)
-- ══════════════════════════════════════════════════════════════════

-- accounts (auth)
CREATE INDEX IF NOT EXISTS idx_accounts_user_id
  ON accounts (user_id);

-- two_factor (auth)
CREATE INDEX IF NOT EXISTS idx_two_factor_user_id
  ON two_factor (user_id);

-- prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter_id
  ON prescriptions (encounter_id);

-- lab_results
CREATE INDEX IF NOT EXISTS idx_lab_results_physician_id
  ON lab_results (physician_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_encounter_id
  ON lab_results (encounter_id);

-- scans
CREATE INDEX IF NOT EXISTS idx_scans_physician_id
  ON scans (physician_id);
CREATE INDEX IF NOT EXISTS idx_scans_encounter_id
  ON scans (encounter_id);

-- vitals
CREATE INDEX IF NOT EXISTS idx_vitals_physician_id
  ON vitals (physician_id);
CREATE INDEX IF NOT EXISTS idx_vitals_encounter_id
  ON vitals (encounter_id);

-- clinical_notifications
CREATE INDEX IF NOT EXISTS idx_notifications_patient_id
  ON clinical_notifications (patient_id);

-- patients
CREATE INDEX IF NOT EXISTS idx_patients_created_by_id
  ON patients (created_by_id);

-- sessions (auth) — expiry lookups for cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON sessions (expires_at);

-- ══════════════════════════════════════════════════════════════════
-- Priority 2: High-value lookup columns
-- (Frequently used in WHERE clauses, search, and filtering)
-- ══════════════════════════════════════════════════════════════════

-- users — National ID (Saudi IAM integration)
CREATE INDEX IF NOT EXISTS idx_users_saudi_id
  ON users (saudi_id)
  WHERE saudi_id IS NOT NULL;

-- users — active filter
CREATE INDEX IF NOT EXISTS idx_users_is_active
  ON users (is_active);

-- verifications — token/identifier lookup
CREATE INDEX IF NOT EXISTS idx_verifications_identifier
  ON verifications (identifier);

-- patients — email search
CREATE INDEX IF NOT EXISTS idx_patients_email
  ON patients (email)
  WHERE email IS NOT NULL;

-- patients — soft-delete filter (partial index for active patients)
CREATE INDEX IF NOT EXISTS idx_patients_active
  ON patients (id)
  WHERE deleted_at IS NULL;

-- encounters — created_at for time-range queries
CREATE INDEX IF NOT EXISTS idx_encounters_created_at
  ON encounters (created_at);

-- scans — DICOM study UID lookup
CREATE INDEX IF NOT EXISTS idx_scans_study_instance_uid
  ON scans (study_instance_uid)
  WHERE study_instance_uid IS NOT NULL;

-- audit_log — action filtering
CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON audit_log (action);

-- audit_log — created_at for time-range queries
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON audit_log (created_at);

-- clinical_notifications — created_at for time ordering
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON clinical_notifications (created_at);

-- ══════════════════════════════════════════════════════════════════
-- Priority 3: Indexes for newer tables (if they exist)
-- These may not exist yet if the tables haven't been pushed.
-- The IF NOT EXISTS + DO block ensures no errors.
-- ══════════════════════════════════════════════════════════════════

-- appointments
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id
  ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_physician_id
  ON appointments (physician_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at
  ON appointments (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments (status);
CREATE INDEX IF NOT EXISTS idx_appointments_encounter_id
  ON appointments (encounter_id);

-- billing_claims
CREATE INDEX IF NOT EXISTS idx_claims_physician_id
  ON billing_claims (physician_id);
CREATE INDEX IF NOT EXISTS idx_claims_encounter_id
  ON billing_claims (encounter_id);

-- follow_up_tasks
CREATE INDEX IF NOT EXISTS idx_followup_encounter_id
  ON follow_up_tasks (encounter_id);

-- translation_sessions
CREATE INDEX IF NOT EXISTS idx_translation_encounter_id
  ON translation_sessions (encounter_id);
