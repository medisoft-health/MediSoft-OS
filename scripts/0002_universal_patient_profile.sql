-- ═══════════════════════════════════════════════════════════════════
-- MediSoft — Universal Patient Profile (UPP) Migration
-- Date: 2026-06-03
-- Description: Expands patient schema for comprehensive medical records,
--   adds patient_readings, patient_documents, patient_emergency_contacts tables
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. EXPAND PATIENTS TABLE
-- ─────────────────────────────────────────────────────────────────

-- Photo / Avatar
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_storage_key TEXT;

-- Extended demographics
ALTER TABLE patients ADD COLUMN IF NOT EXISTS middle_name VARCHAR(120);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS middle_name_ar VARCHAR(120);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS nationality VARCHAR(80);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20); -- single, married, divorced, widowed
ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation VARCHAR(120);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation_ar VARCHAR(120);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'ar';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(32);

-- Extended address (structured JSONB already exists, add flat fields for search)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(120);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS region VARCHAR(120);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS country VARCHAR(80) DEFAULT 'SA';

-- Lifestyle / Social
ALTER TABLE patients ADD COLUMN IF NOT EXISTS smoking_status VARCHAR(20); -- never, former, current
ALTER TABLE patients ADD COLUMN IF NOT EXISTS alcohol_status VARCHAR(20); -- never, occasional, regular
ALTER TABLE patients ADD COLUMN IF NOT EXISTS exercise_frequency VARCHAR(20); -- none, occasional, regular, daily
ALTER TABLE patients ADD COLUMN IF NOT EXISTS diet_type VARCHAR(40); -- regular, vegetarian, vegan, keto, diabetic, etc.

-- Surgical history
ALTER TABLE patients ADD COLUMN IF NOT EXISTS surgical_history JSONB; -- [{procedure, date, hospital, notes}]

-- Current medications (separate from prescriptions - what patient reports taking)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS current_medications JSONB; -- [{name, dose, frequency, since, prescribedBy}]

-- Immunizations
ALTER TABLE patients ADD COLUMN IF NOT EXISTS immunizations JSONB; -- [{vaccine, date, dose, provider}]

-- Disability / Special needs
ALTER TABLE patients ADD COLUMN IF NOT EXISTS disability_notes TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS special_needs TEXT;

-- Profile completeness score (0-100)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;

-- Last health score from Medi360
ALTER TABLE patients ADD COLUMN IF NOT EXISTS health_score INTEGER;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS health_score_updated_at TIMESTAMP WITH TIME ZONE;

-- Device integration
ALTER TABLE patients ADD COLUMN IF NOT EXISTS connected_devices JSONB; -- [{type, name, lastSync, deviceId}]

-- Patient portal access
ALTER TABLE patients ADD COLUMN IF NOT EXISTS portal_user_id UUID;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS portal_last_login TIMESTAMP WITH TIME ZONE;

-- ─────────────────────────────────────────────────────────────────
-- 2. PATIENT EMERGENCY CONTACTS (multiple)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_emergency_contacts (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  relationship VARCHAR(80) NOT NULL, -- father, mother, spouse, sibling, child, friend, other
  phone VARCHAR(32) NOT NULL,
  secondary_phone VARCHAR(32),
  email VARCHAR(320),
  address TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_patient ON patient_emergency_contacts(patient_id);

-- ─────────────────────────────────────────────────────────────────
-- 3. PATIENT READINGS (vitals from devices, self-reported)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Reading type
  reading_type VARCHAR(40) NOT NULL, -- blood_pressure, blood_sugar, heart_rate, spo2, weight, temperature, steps, sleep
  
  -- Values
  value_primary DECIMAL(10, 2), -- main value (e.g., systolic, glucose level, HR)
  value_secondary DECIMAL(10, 2), -- secondary value (e.g., diastolic)
  unit VARCHAR(20) NOT NULL, -- mmHg, mg/dL, bpm, %, kg, °C, steps, hours
  
  -- Context
  context VARCHAR(40), -- fasting, post_meal, resting, exercise, morning, evening
  notes TEXT,
  
  -- Source
  source VARCHAR(40) NOT NULL DEFAULT 'manual', -- manual, apple_health, google_fit, device_bluetooth, patient_portal
  device_name VARCHAR(120),
  device_id VARCHAR(120),
  
  -- Alert flags
  is_abnormal BOOLEAN DEFAULT false,
  alert_sent BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_readings_patient ON patient_readings(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_type ON patient_readings(patient_id, reading_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_abnormal ON patient_readings(is_abnormal) WHERE is_abnormal = true;

-- ─────────────────────────────────────────────────────────────────
-- 4. PATIENT DOCUMENTS (uploaded files: labs, scans, prescriptions, reports)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  uploaded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Document info
  title VARCHAR(256) NOT NULL,
  title_ar VARCHAR(256),
  document_type VARCHAR(40) NOT NULL, -- lab_report, scan_image, prescription, medical_report, insurance_card, id_document, vaccination_card, other
  category VARCHAR(40), -- current, historical
  
  -- File storage
  file_name VARCHAR(256) NOT NULL,
  file_url TEXT NOT NULL,
  storage_key TEXT,
  mime_type VARCHAR(80),
  file_size_bytes INTEGER,
  thumbnail_url TEXT,
  
  -- AI Analysis
  ai_extracted_text TEXT, -- OCR / AI extracted content
  ai_summary TEXT, -- AI-generated summary of the document
  ai_structured_data JSONB, -- Structured data extracted by AI (lab values, medications, etc.)
  ai_analyzed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  document_date DATE, -- When the document was originally created (e.g., lab test date)
  issuing_facility VARCHAR(256),
  physician_name VARCHAR(200),
  notes TEXT,
  tags JSONB, -- ["urgent", "follow-up", "chronic"]
  
  -- Source
  source VARCHAR(40) DEFAULT 'upload', -- upload, patient_portal, device_sync, fax, email
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON patient_documents(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_type ON patient_documents(patient_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_date ON patient_documents(patient_id, document_date DESC);

-- ─────────────────────────────────────────────────────────────────
-- 5. PATIENT VOICE RECORDINGS (intake interviews, self-reports)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_voice_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Recording info
  purpose VARCHAR(40) NOT NULL, -- intake, follow_up, self_report, symptom_report, history_update
  title VARCHAR(256),
  
  -- Audio storage
  audio_url TEXT,
  audio_storage_key TEXT,
  duration_ms INTEGER,
  mime_type VARCHAR(80) DEFAULT 'audio/webm',
  
  -- Transcription
  transcript TEXT,
  transcript_language VARCHAR(10) DEFAULT 'ar',
  transcription_model VARCHAR(40), -- gemini-multimodal, gcp-medical-dictation, whisper-fallback
  transcription_confidence DECIMAL(4, 3),
  
  -- AI Extraction (structured data extracted from voice)
  ai_extracted_data JSONB, -- {allergies: [], conditions: [], medications: [], symptoms: [], ...}
  ai_summary TEXT,
  ai_processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, transcribing, processing, completed, failed
  applied_to_profile BOOLEAN DEFAULT false, -- Whether extracted data was applied to patient profile
  applied_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_voice_records_patient ON patient_voice_records(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_records_status ON patient_voice_records(status);

-- ─────────────────────────────────────────────────────────────────
-- 6. PATIENT ALERTS (smart notifications for patient + physician)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  physician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Alert info
  alert_type VARCHAR(40) NOT NULL, -- abnormal_reading, missed_medication, overdue_appointment, critical_lab, risk_change
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- critical, warning, info
  title TEXT NOT NULL,
  title_ar TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  
  -- Action
  action_url TEXT,
  action_label VARCHAR(120),
  
  -- Delivery
  notify_patient BOOLEAN DEFAULT false,
  notify_physician BOOLEAN DEFAULT true,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  push_sent BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMP WITH TIME ZONE,
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES users(id),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Context
  reading_id UUID REFERENCES patient_readings(id),
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_alerts_patient ON patient_alerts(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_physician ON patient_alerts(physician_id, acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON patient_alerts(severity) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON patient_alerts(patient_id) WHERE resolved = false;

-- ─────────────────────────────────────────────────────────────────
-- 7. AUTO-MRN FUNCTION (generates MRN on patient creation)
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_mrn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mrn IS NULL OR NEW.mrn = '' THEN
    NEW.mrn := 'MS-' || LPAD(NEW.id::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS trg_auto_mrn ON patients;
CREATE TRIGGER trg_auto_mrn
  BEFORE INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION generate_mrn();

-- Update existing patients without MRN
UPDATE patients SET mrn = 'MS-' || LPAD(id::TEXT, 6, '0') WHERE mrn IS NULL OR mrn = '';

-- ─────────────────────────────────────────────────────────────────
-- 8. PROFILE COMPLETENESS FUNCTION
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_profile_completeness(p_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  total_fields INTEGER := 20;
  filled_fields INTEGER := 0;
  p RECORD;
BEGIN
  SELECT * INTO p FROM patients WHERE id = p_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  -- Basic demographics (each worth 1 point)
  IF p.first_name IS NOT NULL AND p.first_name != '' THEN filled_fields := filled_fields + 1; END IF;
  IF p.last_name IS NOT NULL AND p.last_name != '' THEN filled_fields := filled_fields + 1; END IF;
  IF p.date_of_birth IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF p.sex IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF p.phone IS NOT NULL AND p.phone != '' THEN filled_fields := filled_fields + 1; END IF;
  IF p.email IS NOT NULL AND p.email != '' THEN filled_fields := filled_fields + 1; END IF;
  IF p.blood_type IS NOT NULL AND p.blood_type != 'unknown' THEN filled_fields := filled_fields + 1; END IF;
  IF p.saudi_id IS NOT NULL AND p.saudi_id != '' THEN filled_fields := filled_fields + 1; END IF;
  IF p.nationality IS NOT NULL AND p.nationality != '' THEN filled_fields := filled_fields + 1; END IF;
  IF p.photo_url IS NOT NULL AND p.photo_url != '' THEN filled_fields := filled_fields + 1; END IF;
  
  -- Address
  IF p.address IS NOT NULL AND p.address::TEXT != '{}' AND p.address::TEXT != 'null' THEN filled_fields := filled_fields + 1; END IF;
  
  -- Emergency contact
  IF p.emergency_contact IS NOT NULL AND p.emergency_contact::TEXT != '{}' AND p.emergency_contact::TEXT != 'null' THEN filled_fields := filled_fields + 1; END IF;
  
  -- Insurance
  IF p.insurance_provider IS NOT NULL AND p.insurance_provider != '' THEN filled_fields := filled_fields + 1; END IF;
  
  -- Clinical
  IF p.allergies IS NOT NULL AND p.allergies::TEXT != '[]' AND p.allergies::TEXT != 'null' THEN filled_fields := filled_fields + 1; END IF;
  IF p.chronic_conditions IS NOT NULL AND p.chronic_conditions::TEXT != '[]' AND p.chronic_conditions::TEXT != 'null' THEN filled_fields := filled_fields + 1; END IF;
  IF p.medical_history IS NOT NULL AND p.medical_history != '' THEN filled_fields := filled_fields + 1; END IF;
  IF p.family_history IS NOT NULL AND p.family_history != '' THEN filled_fields := filled_fields + 1; END IF;
  IF p.social_history IS NOT NULL AND p.social_history != '' THEN filled_fields := filled_fields + 1; END IF;
  IF p.surgical_history IS NOT NULL AND p.surgical_history::TEXT != '[]' AND p.surgical_history::TEXT != 'null' THEN filled_fields := filled_fields + 1; END IF;
  IF p.current_medications IS NOT NULL AND p.current_medications::TEXT != '[]' AND p.current_medications::TEXT != 'null' THEN filled_fields := filled_fields + 1; END IF;
  
  score := (filled_fields * 100) / total_fields;
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- 9. INDEXES FOR SEARCH
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_city ON patients(city);
CREATE INDEX IF NOT EXISTS idx_patients_nationality ON patients(nationality);
CREATE INDEX IF NOT EXISTS idx_patients_portal ON patients(portal_user_id) WHERE portal_user_id IS NOT NULL;

-- Done!
SELECT 'Universal Patient Profile migration completed successfully' AS status;
