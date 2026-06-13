-- Migration: MediSport Virtual Training Engine
-- Tables for workout plans, sessions, exercise library cache, and progressive overload

-- 1. Local exercise library cache (synced from ExerciseDB / MuscleWiki)
CREATE TABLE IF NOT EXISTS sport_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(64), -- ExerciseDB exerciseId or MuscleWiki id
  source VARCHAR(16) NOT NULL DEFAULT 'exercisedb', -- exercisedb | musclewiki
  name VARCHAR(256) NOT NULL,
  name_ar VARCHAR(256),
  gif_url TEXT,
  video_url TEXT,
  target_muscles JSONB NOT NULL DEFAULT '[]', -- ["pectorals"]
  secondary_muscles JSONB NOT NULL DEFAULT '[]', -- ["triceps","shoulders"]
  body_parts JSONB NOT NULL DEFAULT '[]', -- ["chest"]
  equipments JSONB NOT NULL DEFAULT '[]', -- ["barbell"]
  instructions JSONB NOT NULL DEFAULT '[]', -- ["Step 1...", "Step 2..."]
  difficulty VARCHAR(16), -- beginner | intermediate | advanced
  force_type VARCHAR(16), -- push | pull | static
  category VARCHAR(32), -- strength | cardio | stretching | plyometrics
  is_premium BOOLEAN NOT NULL DEFAULT false, -- true = MuscleWiki (premium)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_exercises_source_idx ON sport_exercises(source);
CREATE INDEX IF NOT EXISTS sport_exercises_target_idx ON sport_exercises USING gin(target_muscles);
CREATE INDEX IF NOT EXISTS sport_exercises_equipment_idx ON sport_exercises USING gin(equipments);
CREATE INDEX IF NOT EXISTS sport_exercises_name_idx ON sport_exercises(name);

-- 2. Training plans (master plans generated for users)
CREATE TABLE IF NOT EXISTS sport_training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(256) NOT NULL,
  goal VARCHAR(32) NOT NULL, -- weight_loss | muscle_gain | endurance | general_fitness | strength
  duration_weeks INTEGER NOT NULL DEFAULT 8,
  days_per_week INTEGER NOT NULL DEFAULT 4,
  equipment_access VARCHAR(32) NOT NULL DEFAULT 'full_gym', -- full_gym | home_gym | bodyweight
  current_week INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(16) NOT NULL DEFAULT 'active', -- active | completed | paused
  medical_adjustments JSONB DEFAULT '{}', -- {"iron_low": true, "vitd_low": true, ...}
  plan_structure JSONB NOT NULL DEFAULT '{}', -- weekly split structure
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_plan_user_idx ON sport_training_plans(user_id, status);

-- 3. Daily workouts (individual workout days within a plan)
CREATE TABLE IF NOT EXISTS sport_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES sport_training_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  day_number INTEGER NOT NULL, -- 1-7
  title VARCHAR(256) NOT NULL, -- e.g. "صدر + ترايسبس"
  target_muscles JSONB NOT NULL DEFAULT '[]',
  exercises JSONB NOT NULL DEFAULT '[]', -- [{exercise_id, sets, rep_min, rep_max, rest_seconds, order}]
  status VARCHAR(16) NOT NULL DEFAULT 'pending', -- pending | completed | skipped
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_workout_plan_idx ON sport_workouts(plan_id, week_number, day_number);
CREATE INDEX IF NOT EXISTS sport_workout_user_idx ON sport_workouts(user_id, status);
CREATE INDEX IF NOT EXISTS sport_workout_date_idx ON sport_workouts(user_id, scheduled_date);

-- 4. Workout sessions (actual logged sessions when user does a workout)
CREATE TABLE IF NOT EXISTS sport_workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES sport_workouts(id) ON DELETE SET NULL, -- nullable for ad-hoc sessions
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_volume NUMERIC(10,2) DEFAULT 0, -- total kg lifted (weight * reps across all sets)
  total_sets INTEGER DEFAULT 0,
  calories_burned INTEGER DEFAULT 0,
  notes TEXT,
  mood_rating INTEGER, -- 1-5 post-workout mood
  status VARCHAR(16) NOT NULL DEFAULT 'in_progress' -- in_progress | completed | abandoned
);
CREATE INDEX IF NOT EXISTS sport_session_user_idx ON sport_workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS sport_session_workout_idx ON sport_workout_sessions(workout_id);

-- 5. Session exercise logs (individual exercise performance within a session)
CREATE TABLE IF NOT EXISTS sport_session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sport_workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES sport_exercises(id) ON DELETE SET NULL,
  exercise_name VARCHAR(256) NOT NULL, -- denormalized for history
  exercise_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_session_ex_session_idx ON sport_session_exercises(session_id, exercise_order);

-- 6. Set logs (individual sets within an exercise in a session)
CREATE TABLE IF NOT EXISTS sport_session_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id UUID NOT NULL REFERENCES sport_session_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  set_type VARCHAR(16) NOT NULL DEFAULT 'working', -- warmup | working | dropset | failure
  weight_kg NUMERIC(6,2),
  reps INTEGER,
  duration_seconds INTEGER, -- for timed exercises
  distance_meters NUMERIC(8,2), -- for cardio
  rpe INTEGER, -- Rate of Perceived Exertion 1-10
  rest_taken_seconds INTEGER, -- actual rest taken after this set
  is_pr BOOLEAN NOT NULL DEFAULT false, -- personal record flag
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_set_exercise_idx ON sport_session_sets(session_exercise_id, set_number);

-- 7. Personal records tracking
CREATE TABLE IF NOT EXISTS sport_personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES sport_exercises(id) ON DELETE SET NULL,
  exercise_name VARCHAR(256) NOT NULL,
  record_type VARCHAR(16) NOT NULL, -- max_weight | max_reps | max_volume | max_duration
  value NUMERIC(10,2) NOT NULL,
  previous_value NUMERIC(10,2),
  session_id UUID REFERENCES sport_workout_sessions(id) ON DELETE SET NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sport_pr_user_idx ON sport_personal_records(user_id, exercise_name, record_type);

-- 8. Progressive overload tracking (per-exercise progression state)
CREATE TABLE IF NOT EXISTS sport_exercise_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES sport_exercises(id) ON DELETE SET NULL,
  exercise_name VARCHAR(256) NOT NULL,
  current_weight_kg NUMERIC(6,2),
  current_rep_min INTEGER NOT NULL DEFAULT 8,
  current_rep_max INTEGER NOT NULL DEFAULT 12,
  last_achieved_reps JSONB DEFAULT '[]', -- [12, 11, 12] per set
  next_weight_kg NUMERIC(6,2), -- suggested next weight
  progression_status VARCHAR(16) NOT NULL DEFAULT 'maintain', -- increase | maintain | deload
  consecutive_successes INTEGER NOT NULL DEFAULT 0, -- times hit max reps on all sets
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_name)
);
CREATE INDEX IF NOT EXISTS sport_progress_user_idx ON sport_exercise_progress(user_id);
