-- MediSport Phase 5 — Body composition tracking over time
-- Stores serial body-composition measurements per athlete for trend
-- analysis and old-vs-new comparison.

CREATE TABLE IF NOT EXISTS sport_body_measurements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measured_at   date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg         numeric(5,1),
  body_fat_pct      numeric(4,1),
  muscle_mass_kg    numeric(5,1),
  water_pct         numeric(4,1),
  bone_mass_kg      numeric(4,1),
  visceral_fat      numeric(4,1),
  bmr_kcal          integer,
  -- circumferences (cm)
  waist_cm          numeric(5,1),
  hip_cm            numeric(5,1),
  chest_cm          numeric(5,1),
  arm_cm            numeric(5,1),
  thigh_cm          numeric(5,1),
  source        varchar(24) NOT NULL DEFAULT 'manual', -- manual | scale | clinic
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sport_body_user_idx ON sport_body_measurements (user_id);
CREATE INDEX IF NOT EXISTS sport_body_user_date_idx ON sport_body_measurements (user_id, measured_at);
