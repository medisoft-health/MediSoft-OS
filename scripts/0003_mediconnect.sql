-- ============================================================
-- MediConnect: Communication & Notification System
-- Migration 0003 — June 3, 2026
-- ============================================================

-- 1. Conversations (threads between any parties)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  title VARCHAR(256),
  type VARCHAR(32) NOT NULL DEFAULT 'direct', -- 'direct', 'group', 'prescription', 'lab_result', 'appointment', 'system'
  status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'archived', 'closed'
  priority VARCHAR(16) DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'
  metadata JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conv_patient_idx ON conversations(patient_id);
CREATE INDEX IF NOT EXISTS conv_type_idx ON conversations(type);
CREATE INDEX IF NOT EXISTS conv_status_idx ON conversations(status);
CREATE INDEX IF NOT EXISTS conv_last_msg_idx ON conversations(last_message_at DESC);

-- 2. Conversation Participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'member', -- 'admin', 'member', 'observer'
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cp_conv_idx ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS cp_user_idx ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS cp_patient_idx ON conversation_participants(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS cp_unique_user ON conversation_participants(conversation_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cp_unique_patient ON conversation_participants(conversation_id, patient_id) WHERE patient_id IS NOT NULL;

-- 3. Messages (enhanced from existing patientMessages)
CREATE TABLE IF NOT EXISTS mediconnect_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id),
  sender_patient_id INTEGER REFERENCES patients(id),
  sender_type VARCHAR(20) NOT NULL, -- 'physician', 'patient', 'nurse', 'system', 'ai'
  content_type VARCHAR(32) NOT NULL DEFAULT 'text', -- 'text', 'image', 'file', 'audio', 'prescription', 'lab_result', 'appointment', 'alert', 'video_call'
  body TEXT,
  attachments JSONB DEFAULT '[]', -- [{name, url, type, size}]
  metadata JSONB DEFAULT '{}', -- for prescription/lab/appointment data
  reply_to_id UUID REFERENCES mediconnect_messages(id),
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mcm_conv_idx ON mediconnect_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mcm_sender_user_idx ON mediconnect_messages(sender_user_id);
CREATE INDEX IF NOT EXISTS mcm_sender_patient_idx ON mediconnect_messages(sender_patient_id);
CREATE INDEX IF NOT EXISTS mcm_type_idx ON mediconnect_messages(content_type);

-- 4. Remote Prescriptions
CREATE TABLE IF NOT EXISTS remote_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  physician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES mediconnect_messages(id),
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'viewed', 'dispensed', 'expired', 'cancelled'
  medications JSONB NOT NULL DEFAULT '[]', -- [{name, dose, frequency, duration, instructions, quantity}]
  diagnosis VARCHAR(512),
  diagnosis_code VARCHAR(32), -- ICD-11
  notes TEXT,
  valid_until TIMESTAMPTZ,
  dispensed_at TIMESTAMPTZ,
  dispensed_by VARCHAR(256),
  pharmacy_name VARCHAR(256),
  qr_code TEXT, -- for pharmacy verification
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rp_patient_idx ON remote_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS rp_physician_idx ON remote_prescriptions(physician_id);
CREATE INDEX IF NOT EXISTS rp_status_idx ON remote_prescriptions(status);
CREATE INDEX IF NOT EXISTS rp_conv_idx ON remote_prescriptions(conversation_id);

-- 5. Patient Notifications (for patients, separate from clinicalNotifications which is for physicians)
CREATE TABLE IF NOT EXISTS patient_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL, -- 'prescription', 'lab_result', 'appointment', 'message', 'alert', 'reading_alert', 'reminder', 'system'
  severity VARCHAR(16) NOT NULL DEFAULT 'info', -- 'critical', 'warning', 'info', 'success'
  title VARCHAR(256) NOT NULL,
  title_ar VARCHAR(256),
  body TEXT NOT NULL,
  body_ar TEXT,
  action_url VARCHAR(512),
  action_label VARCHAR(128),
  metadata JSONB DEFAULT '{}',
  channels_sent JSONB DEFAULT '[]', -- ['push', 'email', 'sms', 'whatsapp', 'in_app']
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pn_patient_idx ON patient_notifications(patient_id);
CREATE INDEX IF NOT EXISTS pn_type_idx ON patient_notifications(type);
CREATE INDEX IF NOT EXISTS pn_unread_idx ON patient_notifications(patient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS pn_created_idx ON patient_notifications(created_at DESC);

-- 6. Push Subscription (Web Push / FCM tokens)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  auth_key TEXT,
  p256dh_key TEXT,
  fcm_token TEXT,
  device_type VARCHAR(32), -- 'web', 'android', 'ios'
  device_name VARCHAR(128),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ps_user_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS ps_patient_idx ON push_subscriptions(patient_id);
CREATE INDEX IF NOT EXISTS ps_active_idx ON push_subscriptions(is_active) WHERE is_active = TRUE;

-- 7. Device Connections (Apple Health, Google Health Connect, Bluetooth)
CREATE TABLE IF NOT EXISTS patient_device_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  device_type VARCHAR(64) NOT NULL, -- 'apple_health', 'google_health_connect', 'bluetooth_bp', 'bluetooth_glucose', 'fitbit', 'garmin', 'samsung_health'
  device_name VARCHAR(256),
  device_model VARCHAR(256),
  connection_status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'connected', 'disconnected', 'error'
  oauth_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  sync_frequency_minutes INTEGER DEFAULT 60,
  data_types JSONB DEFAULT '[]', -- ['heart_rate', 'blood_pressure', 'steps', 'sleep', 'glucose', 'spo2', 'weight']
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pdc_patient_idx ON patient_device_connections(patient_id);
CREATE INDEX IF NOT EXISTS pdc_type_idx ON patient_device_connections(device_type);
CREATE INDEX IF NOT EXISTS pdc_status_idx ON patient_device_connections(connection_status);

-- 8. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  channel VARCHAR(32) NOT NULL, -- 'push', 'email', 'sms', 'whatsapp', 'in_app'
  notification_type VARCHAR(64) NOT NULL, -- 'all', 'prescription', 'lab_result', 'appointment', 'message', 'alert', 'reading_alert', 'reminder'
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS np_user_idx ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS np_patient_idx ON notification_preferences(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS np_unique ON notification_preferences(COALESCE(user_id, '00000000-0000-0000-0000-000000000000'), COALESCE(patient_id, 0), channel, notification_type);

-- 9. Video Call Sessions (Telemedicine)
CREATE TABLE IF NOT EXISTS video_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  physician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'ringing', 'active', 'ended', 'missed', 'cancelled'
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  room_id VARCHAR(256), -- WebRTC room ID
  recording_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vcs_patient_idx ON video_call_sessions(patient_id);
CREATE INDEX IF NOT EXISTS vcs_physician_idx ON video_call_sessions(physician_id);
CREATE INDEX IF NOT EXISTS vcs_status_idx ON video_call_sessions(status);
CREATE INDEX IF NOT EXISTS vcs_scheduled_idx ON video_call_sessions(scheduled_at);
