-- ============================================================
-- MediSport: Standalone Fitness Platform — Phase 4 Persistence
-- Migration 0004 — June 12, 2026
-- 10 tables, all namespaced `sport_`, identity shared via users(id) UUID
-- ============================================================

-- 1. Sport profiles (role + onboarding) -----------------------
CREATE TABLE IF NOT EXISTS sport_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL DEFAULT 'trainee',
  display_name VARCHAR(200),
  sex VARCHAR(16),
  birth_date DATE,
  height_cm NUMERIC(5,1),
  weight_kg NUMERIC(5,1),
  goal VARCHAR(64),
  specialization VARCHAR(64),
  activity_level VARCHAR(32),
  bio TEXT,
  avatar_url TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sport_profiles_user_idx ON sport_profiles(user_id);
CREATE INDEX IF NOT EXISTS sport_profiles_role_idx ON sport_profiles(role);

-- 2. Coach ↔ Trainee relationship -----------------------------
CREATE TABLE IF NOT EXISTS sport_coach_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sport_coach_client_idx ON sport_coach_clients(coach_id, trainee_id);
CREATE INDEX IF NOT EXISTS sport_client_trainee_idx ON sport_coach_clients(trainee_id);

-- 3. Food logs ------------------------------------------------
CREATE TABLE IF NOT EXISTS sport_food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  meal_type VARCHAR(16) NOT NULL,
  food_id VARCHAR(64),
  food_name_ar VARCHAR(200),
  food_name_en VARCHAR(200),
  grams NUMERIC(7,1) NOT NULL,
  calories NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein NUMERIC(7,2) NOT NULL DEFAULT 0,
  carbs NUMERIC(7,2) NOT NULL DEFAULT 0,
  fat NUMERIC(7,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_food_user_date_idx ON sport_food_logs(user_id, log_date);

-- 4. Activities (GPS / workout) -------------------------------
CREATE TABLE IF NOT EXISTS sport_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(32) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  distance_meters NUMERIC(10,1) NOT NULL DEFAULT 0,
  calories_burned NUMERIC(8,1) NOT NULL DEFAULT 0,
  avg_pace NUMERIC(7,2),
  avg_heart_rate INTEGER,
  route_geojson JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_activity_user_idx ON sport_activities(user_id, started_at);

-- 5. Bio-age records ------------------------------------------
CREATE TABLE IF NOT EXISTS sport_bio_age_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chronological_age NUMERIC(5,1) NOT NULL,
  biological_age NUMERIC(5,1) NOT NULL,
  age_delta NUMERIC(5,1) NOT NULL,
  percentile INTEGER,
  classification VARCHAR(32),
  inputs JSONB NOT NULL,
  domain_scores JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_bioage_user_idx ON sport_bio_age_records(user_id, created_at);

-- 6. Training programs ----------------------------------------
CREATE TABLE IF NOT EXISTS sport_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_trainee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name_ar VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  goal VARCHAR(64),
  duration_weeks INTEGER NOT NULL DEFAULT 4,
  days_per_week INTEGER NOT NULL DEFAULT 3,
  structure JSONB NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_program_coach_idx ON sport_programs(coach_id);
CREATE INDEX IF NOT EXISTS sport_program_trainee_idx ON sport_programs(assigned_trainee_id);

-- 7. Medical context consents ---------------------------------
CREATE TABLE IF NOT EXISTS sport_medical_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mrn VARCHAR(64),
  linked_patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
  share_lab_results BOOLEAN NOT NULL DEFAULT FALSE,
  share_vitals BOOLEAN NOT NULL DEFAULT FALSE,
  share_body_composition BOOLEAN NOT NULL DEFAULT FALSE,
  share_medical_history BOOLEAN NOT NULL DEFAULT FALSE,
  share_clinical_notes BOOLEAN NOT NULL DEFAULT FALSE,
  consent_given_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sport_consent_user_idx ON sport_medical_consents(user_id);
CREATE INDEX IF NOT EXISTS sport_consent_coach_idx ON sport_medical_consents(coach_id);

-- 8. Challenges -----------------------------------------------
CREATE TABLE IF NOT EXISTS sport_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_ar VARCHAR(200) NOT NULL,
  title_en VARCHAR(200),
  description_ar TEXT,
  description_en TEXT,
  challenge_type VARCHAR(32) NOT NULL,
  target_value NUMERIC(12,1) NOT NULL,
  unit VARCHAR(16) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_challenge_status_idx ON sport_challenges(status);

-- 9. Challenge participants -----------------------------------
CREATE TABLE IF NOT EXISTS sport_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES sport_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress_value NUMERIC(12,1) NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sport_challenge_participant_idx ON sport_challenge_participants(challenge_id, user_id);
CREATE INDEX IF NOT EXISTS sport_participant_user_idx ON sport_challenge_participants(user_id);

-- 10. Social posts --------------------------------------------
CREATE TABLE IF NOT EXISTS sport_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  activity_id UUID REFERENCES sport_activities(id) ON DELETE SET NULL,
  challenge_id UUID REFERENCES sport_challenges(id) ON DELETE SET NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_post_user_idx ON sport_posts(user_id, created_at);

-- 11. Post likes ----------------------------------------------
CREATE TABLE IF NOT EXISTS sport_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES sport_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sport_post_like_idx ON sport_post_likes(post_id, user_id);
