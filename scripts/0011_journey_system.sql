-- Migration 0011: My Health Journey System
-- Tables for: daily check-ins, journey timeline, streaks, achievements, XP/levels, weekly reports, emergency alerts

-- 1. Daily Check-ins (30-second mood/energy/readiness tracking)
CREATE TABLE IF NOT EXISTS sport_daily_checkins (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood VARCHAR(20) NOT NULL, -- 'energetic', 'normal', 'tired', 'injured'
  sleep_quality INTEGER NOT NULL CHECK (sleep_quality BETWEEN 1 AND 10),
  readiness VARCHAR(20) NOT NULL, -- 'yes', 'no', 'half'
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  soreness_areas JSONB DEFAULT '[]', -- ['shoulders', 'legs', 'back']
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, check_date)
);

-- 2. Journey Timeline Events (milestones, achievements, activities)
CREATE TABLE IF NOT EXISTS sport_journey_events (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL, -- 'milestone', 'workout', 'measurement', 'lab', 'food', 'achievement', 'checkin', 'note', 'medical_rx'
  event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon VARCHAR(50), -- emoji or icon name
  color VARCHAR(20), -- hex color for timeline dot
  metadata JSONB DEFAULT '{}', -- flexible payload (e.g., weight_lost, exercise_name, lab_marker)
  is_milestone BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_journey_events_user_date ON sport_journey_events(user_id, event_date DESC);
CREATE INDEX idx_journey_events_type ON sport_journey_events(user_id, event_type);

-- 3. Streaks (consecutive day tracking)
CREATE TABLE IF NOT EXISTS sport_streaks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_type VARCHAR(30) NOT NULL, -- 'workout', 'checkin', 'food_log', 'overall'
  current_count INTEGER DEFAULT 0,
  longest_count INTEGER DEFAULT 0,
  last_active_date DATE,
  started_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

-- 4. Achievements / Badges
CREATE TABLE IF NOT EXISTS sport_achievements (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE, -- 'iron_will', 'lab_rat', 'clean_eater', etc.
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL, -- emoji
  category VARCHAR(30) NOT NULL, -- 'consistency', 'nutrition', 'training', 'medical', 'social'
  xp_reward INTEGER DEFAULT 0,
  requirement_type VARCHAR(30) NOT NULL, -- 'streak', 'count', 'threshold', 'event'
  requirement_value INTEGER DEFAULT 1,
  requirement_meta JSONB DEFAULT '{}', -- extra conditions
  tier VARCHAR(20) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'diamond'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Achievements (earned badges)
CREATE TABLE IF NOT EXISTS sport_user_achievements (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES sport_achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, achievement_id)
);

-- 6. XP & Levels
CREATE TABLE IF NOT EXISTS sport_user_xp (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  level_title VARCHAR(30) DEFAULT 'rookie', -- 'rookie', 'warrior', 'champion', 'legend'
  xp_history JSONB DEFAULT '[]', -- [{date, amount, reason}]
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 7. Weekly Reports (auto-generated summaries)
CREATE TABLE IF NOT EXISTS sport_weekly_reports (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  workouts_count INTEGER DEFAULT 0,
  avg_calories_daily INTEGER DEFAULT 0,
  avg_sleep_quality NUMERIC(3,1) DEFAULT 0,
  total_volume_kg NUMERIC(10,1) DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  compliance_pct INTEGER DEFAULT 0, -- 0-100
  highlights JSONB DEFAULT '[]', -- [{type, text_ar, text_en}]
  recommendations JSONB DEFAULT '[]', -- [{text_ar, text_en, priority}]
  comparison JSONB DEFAULT '{}', -- {vs_last_week: {workouts: +1, calories: -200}}
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- 8. Emergency Alerts
CREATE TABLE IF NOT EXISTS sport_emergency_alerts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(30) NOT NULL, -- 'high_bp', 'high_glucose', 'chest_pain', 'critical_lab'
  severity VARCHAR(20) NOT NULL, -- 'warning', 'critical', 'emergency'
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  message_en TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}', -- the data that triggered the alert
  action_taken VARCHAR(30) DEFAULT 'none', -- 'none', 'acknowledged', 'contacted_doctor'
  training_blocked BOOLEAN DEFAULT TRUE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Journey Goals (user's health objectives)
CREATE TABLE IF NOT EXISTS sport_journey_goals (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type VARCHAR(30) NOT NULL, -- 'lose_weight', 'gain_muscle', 'improve_endurance', 'flexibility', 'health_markers'
  target_value NUMERIC(10,2), -- e.g., target weight in kg
  current_value NUMERIC(10,2),
  start_value NUMERIC(10,2),
  unit VARCHAR(20), -- 'kg', '%', 'minutes', 'level'
  target_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'achieved', 'paused', 'abandoned'
  progress_pct INTEGER DEFAULT 0,
  estimated_completion DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Quick Notes (fast journal entries from Quick Actions)
CREATE TABLE IF NOT EXISTS sport_quick_notes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_type VARCHAR(30) DEFAULT 'general', -- 'general', 'supplement_question', 'medication_question', 'pain_report', 'mood'
  content TEXT NOT NULL,
  response_ar TEXT, -- AI/coach response
  response_en TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Medical Sport Prescription (generated from lab analysis)
CREATE TABLE IF NOT EXISTS sport_medical_prescriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab_result_id INTEGER REFERENCES sport_lab_results(id),
  prescription_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'superseded'
  conditions JSONB DEFAULT '[]', -- [{marker, value, status, recommendation_ar, recommendation_en}]
  exercise_modifications JSONB DEFAULT '[]', -- [{type, description_ar, description_en, duration_days}]
  nutrition_recommendations JSONB DEFAULT '[]', -- [{item, reason_ar, reason_en}]
  supplements_suggested JSONB DEFAULT '[]', -- [{name, dosage, reason_ar, reason_en}]
  restrictions JSONB DEFAULT '[]', -- [{activity, reason_ar, reason_en, until_date}]
  max_intensity_pct INTEGER DEFAULT 100,
  max_days_per_week INTEGER DEFAULT 6,
  cardio_minutes_per_week INTEGER,
  notes_ar TEXT,
  notes_en TEXT,
  generated_by VARCHAR(30) DEFAULT 'medical_intelligence', -- 'medical_intelligence', 'coach', 'doctor'
  expires_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed achievements
INSERT INTO sport_achievements (code, title_ar, title_en, description_ar, description_en, icon, category, xp_reward, requirement_type, requirement_value, tier) VALUES
-- Consistency
('first_checkin', 'أول تسجيل', 'First Check-in', 'سجّل أول check-in يومي', 'Complete your first daily check-in', '🌅', 'consistency', 50, 'count', 1, 'bronze'),
('week_warrior', 'محارب الأسبوع', 'Week Warrior', '7 أيام متتالية من التسجيل', '7 consecutive days of check-ins', '🔥', 'consistency', 200, 'streak', 7, 'bronze'),
('iron_will', 'إرادة حديدية', 'Iron Will', '30 يوم متتالي بدون تفويت', '30 consecutive days without skipping', '💪', 'consistency', 500, 'streak', 30, 'gold'),
('unstoppable', 'لا يُوقف', 'Unstoppable', '90 يوم متتالي — أنت أسطورة', '90 consecutive days — you are a legend', '⚡', 'consistency', 1500, 'streak', 90, 'diamond'),
-- Training
('first_workout', 'أول تمرين', 'First Workout', 'أكمل أول جلسة تدريب', 'Complete your first training session', '🏋️', 'training', 100, 'count', 1, 'bronze'),
('fifty_sessions', '50 جلسة', '50 Sessions', 'أكمل 50 جلسة تدريب', 'Complete 50 training sessions', '🎯', 'training', 800, 'count', 50, 'silver'),
('hundred_sessions', 'نادي المئة', 'Century Club', 'أكمل 100 جلسة تدريب', 'Complete 100 training sessions', '🏆', 'training', 2000, 'count', 100, 'gold'),
('pr_breaker', 'كاسر الأرقام', 'PR Breaker', 'حطّم رقمك الشخصي 10 مرات', 'Break your personal record 10 times', '📈', 'training', 600, 'count', 10, 'silver'),
-- Nutrition
('clean_eater', 'أكل نظيف', 'Clean Eater', 'سجّل أكلك 7 أيام متتالية', 'Log your food for 7 consecutive days', '🥗', 'nutrition', 300, 'streak', 7, 'bronze'),
('nutrition_master', 'خبير التغذية', 'Nutrition Master', 'سجّل أكلك 30 يوم متتالي', 'Log your food for 30 consecutive days', '🍎', 'nutrition', 800, 'streak', 30, 'gold'),
-- Medical
('lab_rat', 'صديق المختبر', 'Lab Rat', 'ارفع 3 تقارير طبية', 'Upload 3 lab reports', '🔬', 'medical', 400, 'count', 3, 'silver'),
('health_conscious', 'واعي صحياً', 'Health Conscious', 'ارفع 6 تقارير طبية', 'Upload 6 lab reports', '🏥', 'medical', 1000, 'count', 6, 'gold'),
('body_tracker', 'متتبع الجسم', 'Body Tracker', 'سجّل قياسات الجسم 5 مرات', 'Record body measurements 5 times', '📏', 'medical', 300, 'count', 5, 'bronze'),
-- Social
('community_member', 'عضو المجتمع', 'Community Member', 'انشر أول بوست', 'Create your first post', '👥', 'social', 100, 'count', 1, 'bronze'),
('motivator', 'المحفّز', 'Motivator', 'احصل على 10 إعجابات', 'Get 10 likes on your posts', '❤️', 'social', 300, 'count', 10, 'silver'),
('challenger', 'المتحدي', 'Challenger', 'شارك في 3 تحديات', 'Join 3 challenges', '🎖️', 'social', 400, 'count', 3, 'silver')
ON CONFLICT (code) DO NOTHING;
