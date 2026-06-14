-- Migration 0008: Add trainee-specific fields to sport_profiles for comprehensive profile
-- These fields allow the system to store all trainee data persistently
-- so services don't need to ask for data repeatedly.

ALTER TABLE sport_profiles
  ADD COLUMN IF NOT EXISTS fitness_level VARCHAR(32) DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS equipment_access VARCHAR(32) DEFAULT 'full_gym',
  ADD COLUMN IF NOT EXISTS days_per_week INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS injuries JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS medical_conditions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS medications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS body_fat_pct NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS muscle_mass_kg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS preferred_training_time VARCHAR(32),
  ADD COLUMN IF NOT EXISTS profile_completion INTEGER DEFAULT 0;
