-- ══════════════════════════════════════════════
-- AgriSaarthi – Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Helper: CUID-like ID generator ───
-- Supabase doesn't have Prisma's cuid(). We use a short random ID.
CREATE OR REPLACE FUNCTION generate_cuid()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(12), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ─── updated_at trigger function ───
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════
-- TABLE: farmers
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS farmers (
  id              TEXT PRIMARY KEY DEFAULT generate_cuid(),
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL UNIQUE,
  state           TEXT NOT NULL,
  district        TEXT NOT NULL,
  language_pref   TEXT NOT NULL DEFAULT 'hi',
  income_bracket  TEXT,
  land_size_acres DOUBLE PRECISION,
  caste_category  TEXT,
  primary_crop    TEXT,
  avatar_url      TEXT,
  ivr_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  ivr_language    TEXT NOT NULL DEFAULT 'hi',
  ivr_number      TEXT,

  -- Notification preferences
  notif_weather    BOOLEAN NOT NULL DEFAULT TRUE,
  notif_mandi      BOOLEAN NOT NULL DEFAULT TRUE,
  notif_irrigation BOOLEAN NOT NULL DEFAULT TRUE,
  notif_disease    BOOLEAN NOT NULL DEFAULT TRUE,
  notif_schemes    BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone);
CREATE INDEX IF NOT EXISTS idx_farmers_district ON farmers(district);
CREATE INDEX IF NOT EXISTS idx_farmers_state ON farmers(state);

CREATE TRIGGER set_farmers_updated_at
  BEFORE UPDATE ON farmers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════
-- TABLE: fields
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fields (
  id           TEXT PRIMARY KEY DEFAULT generate_cuid(),
  farmer_id    TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  area_acres   DOUBLE PRECISION NOT NULL,
  soil_type    TEXT,
  current_crop TEXT,
  sowing_date  TIMESTAMPTZ,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fields_farmer_id ON fields(farmer_id);
CREATE INDEX IF NOT EXISTS idx_fields_current_crop ON fields(current_crop);

CREATE TRIGGER set_fields_updated_at
  BEFORE UPDATE ON fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════
-- TABLE: activities
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS activities (
  id         TEXT PRIMARY KEY DEFAULT generate_cuid(),
  field_id   TEXT NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,  -- fertilizer, pesticide, irrigation, other
  date       TIMESTAMPTZ NOT NULL,
  note       TEXT,
  quantity   TEXT,
  unit       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_field_id ON activities(field_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);

-- ══════════════════════════════════════════════
-- TABLE: irrigation_logs
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS irrigation_logs (
  id           TEXT PRIMARY KEY DEFAULT generate_cuid(),
  field_id     TEXT NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  date         TIMESTAMPTZ NOT NULL,
  water_liters DOUBLE PRECISION NOT NULL,
  source       TEXT NOT NULL DEFAULT 'manual',  -- ai, manual
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_irrigation_logs_field_id ON irrigation_logs(field_id);
CREATE INDEX IF NOT EXISTS idx_irrigation_logs_date ON irrigation_logs(date);

-- ══════════════════════════════════════════════
-- TABLE: disease_detections
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS disease_detections (
  id                TEXT PRIMARY KEY DEFAULT generate_cuid(),
  field_id          TEXT NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  image_url         TEXT NOT NULL,
  disease_name      TEXT,
  confidence        DOUBLE PRECISION,
  treatment_applied TEXT,
  date              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disease_detections_field_id ON disease_detections(field_id);
CREATE INDEX IF NOT EXISTS idx_disease_detections_date ON disease_detections(date);

-- ══════════════════════════════════════════════
-- TABLE: ivr_calls
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ivr_calls (
  id            TEXT PRIMARY KEY DEFAULT generate_cuid(),
  farmer_phone  TEXT NOT NULL,
  query_type    TEXT NOT NULL,  -- disease, weather, mandi, schemes, general
  query_text    TEXT NOT NULL,
  response_text TEXT NOT NULL,
  duration_sec  INTEGER,
  call_sid      TEXT,
  channel       TEXT NOT NULL DEFAULT 'ivr',  -- ivr, web_voice
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ivr_calls_farmer_phone ON ivr_calls(farmer_phone);
CREATE INDEX IF NOT EXISTS idx_ivr_calls_timestamp ON ivr_calls(timestamp);
CREATE INDEX IF NOT EXISTS idx_ivr_calls_query_type ON ivr_calls(query_type);

-- ══════════════════════════════════════════════
-- TABLE: price_alerts
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS price_alerts (
  id             TEXT PRIMARY KEY DEFAULT generate_cuid(),
  farmer_id      TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  crop           TEXT NOT NULL,
  target_price   DOUBLE PRECISION NOT NULL,
  direction      TEXT NOT NULL,  -- above, below
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_farmer_id ON price_alerts(farmer_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(active);
CREATE INDEX IF NOT EXISTS idx_price_alerts_crop ON price_alerts(crop);

-- ══════════════════════════════════════════════
-- RLS (Row Level Security) – Optional but recommended
-- For now, disabled since we use service role key server-side
-- ══════════════════════════════════════════════
-- ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE irrigation_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE disease_detections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ivr_calls ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
