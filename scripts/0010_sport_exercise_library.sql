-- Migration: 0010_sport_exercise_library
-- Description: Create sport_exercise_library table to store ExerciseDB exercises locally
-- Date: 2026-06-14

CREATE TABLE IF NOT EXISTS sport_exercise_library (
  id SERIAL PRIMARY KEY,
  exercise_id VARCHAR(20) NOT NULL UNIQUE,          -- ExerciseDB exerciseId (e.g. "EIeI8Vf")
  name VARCHAR(255) NOT NULL,                        -- English name from API
  gif_url TEXT NOT NULL,                             -- Full GIF URL from ExerciseDB
  body_parts JSONB NOT NULL DEFAULT '[]',            -- Array of body parts (e.g. ["chest"])
  equipments JSONB NOT NULL DEFAULT '[]',            -- Array of equipment (e.g. ["barbell"])
  target_muscles JSONB NOT NULL DEFAULT '[]',        -- Array of target muscles (e.g. ["pectorals"])
  secondary_muscles JSONB NOT NULL DEFAULT '[]',     -- Array of secondary muscles
  instructions JSONB NOT NULL DEFAULT '[]',          -- Array of step-by-step instructions
  -- Metadata
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),      -- When this record was synced from API
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast filtering
CREATE INDEX idx_sport_exercise_lib_name ON sport_exercise_library (name);
CREATE INDEX idx_sport_exercise_lib_body_parts ON sport_exercise_library USING GIN (body_parts);
CREATE INDEX idx_sport_exercise_lib_equipments ON sport_exercise_library USING GIN (equipments);
CREATE INDEX idx_sport_exercise_lib_target_muscles ON sport_exercise_library USING GIN (target_muscles);

-- Comment
COMMENT ON TABLE sport_exercise_library IS 'Local cache of ExerciseDB V1 exercises (1500+) with GIF URLs and metadata';
