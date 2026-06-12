-- MediSport Phase 6 — Athlete lab results with historical comparison
-- Each row is one lab report (a panel) tied to a user; markers stored as JSONB
-- so any athlete biomarker set can be saved and compared over time.

CREATE TABLE IF NOT EXISTS sport_lab_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  report_date   date NOT NULL DEFAULT CURRENT_DATE,
  season_phase  text,                 -- in-season / pre-season / off-season / recovery
  -- markers: [{ name, category, value, unit, athleteMin, athleteMax }]
  markers       jsonb NOT NULL DEFAULT '[]'::jsonb,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sport_lab_results_user ON sport_lab_results (user_id, report_date);
