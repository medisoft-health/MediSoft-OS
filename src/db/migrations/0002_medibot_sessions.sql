-- MediBot Chat Sessions table
-- Stores physician/patient AI chat sessions with message history

CREATE TABLE IF NOT EXISTS "medibot_sessions" (
  "id"         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid         NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "patient_id" integer      REFERENCES "patients"("id") ON DELETE SET NULL,

  "mode"       varchar(20)  NOT NULL DEFAULT 'physician',
  "title"      text,

  "messages"   jsonb        NOT NULL DEFAULT '[]'::jsonb,
  "metadata"   jsonb,

  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "medibot_user_idx"    ON "medibot_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "medibot_patient_idx"  ON "medibot_sessions" ("patient_id");
