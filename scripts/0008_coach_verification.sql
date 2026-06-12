-- MediSport — Phase 8: Coach Verification, Scoring & Discovery
-- Adds coach credentialing fields to sport_profiles and three new tables.
-- Safe/idempotent: uses IF NOT EXISTS guards where possible.

-- =========================================================
-- (A) Expand sport_profiles with coach credential + scoring fields
-- =========================================================
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS verification_status varchar(24) NOT NULL DEFAULT 'draft';
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS coach_score numeric(5,2);
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS coach_tier varchar(24);
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS score_breakdown jsonb;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS admin_score integer;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS highest_degree varchar(32);
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS study_field varchar(80);
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS university varchar(160);
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS graduation_year integer;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS years_experience integer;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS specialties jsonb;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS languages jsonb;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS city varchar(80);
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS country varchar(80);
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS cv_url text;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS id_doc_url text;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS professional_links jsonb;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2) NOT NULL DEFAULT 0;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;
ALTER TABLE sport_profiles ADD COLUMN IF NOT EXISTS active_clients integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS sport_profiles_verif_idx ON sport_profiles (verification_status);
CREATE INDEX IF NOT EXISTS sport_profiles_score_idx ON sport_profiles (coach_score);

-- =========================================================
-- (B) Coach certifications (multiple per coach)
-- =========================================================
CREATE TABLE IF NOT EXISTS sport_coach_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  issuer varchar(160),
  credential_no varchar(120),
  issue_date date,
  expiry_date date,
  file_url text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_cert_coach_idx ON sport_coach_certifications (coach_id);

-- =========================================================
-- (C) Coach reviews by trainees (feeds dynamic performance score)
-- =========================================================
CREATE TABLE IF NOT EXISTS sport_coach_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars integer NOT NULL,
  communication integer,
  results integer,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sport_review_unique UNIQUE (coach_id, trainee_id)
);
CREATE INDEX IF NOT EXISTS sport_review_coach_idx ON sport_coach_reviews (coach_id);

-- =========================================================
-- (D) Coach↔Trainee connection requests (two-sided consent)
-- =========================================================
CREATE TABLE IF NOT EXISTS sport_coach_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  initiator varchar(16) NOT NULL DEFAULT 'trainee', -- 'trainee' | 'coach'
  status varchar(16) NOT NULL DEFAULT 'pending',     -- 'pending' | 'accepted' | 'declined'
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT sport_request_unique UNIQUE (trainee_id, coach_id)
);
CREATE INDEX IF NOT EXISTS sport_request_coach_idx ON sport_coach_requests (coach_id, status);
CREATE INDEX IF NOT EXISTS sport_request_trainee_idx ON sport_coach_requests (trainee_id, status);
