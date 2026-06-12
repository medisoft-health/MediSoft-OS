-- MediSport Phase 7: Coach notifications on new trainee data
-- Notifies a coach when one of their linked trainees logs new data
-- (body measurement, lab report, activity, etc.).

CREATE TABLE IF NOT EXISTS sport_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- recipient (the coach)
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- the trainee who triggered it (nullable for system notices)
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,            -- 'body-measurement' | 'lab-result' | 'activity' | 'system'
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,                     -- optional deep link inside the app
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sport_notifications_user
  ON sport_notifications (user_id, is_read, created_at DESC);
