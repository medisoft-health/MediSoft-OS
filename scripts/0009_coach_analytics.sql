-- MediSport Phase 8.1 — Coach Analytics
-- Time-series snapshots of a coach's score + rating, captured on every
-- recompute (new review, admin decision, certification change). Powers the
-- coach analytics dashboard (score/rating progression over time).

CREATE TABLE IF NOT EXISTS sport_coach_score_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total        numeric(5,2) NOT NULL,
  tier         varchar(24),
  breakdown    jsonb,
  rating_avg   numeric(3,2) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  reason       varchar(32) NOT NULL DEFAULT 'recompute', -- recompute|review|admin|cert|submit
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sport_score_hist_coach_idx
  ON sport_coach_score_history (coach_id, created_at);
