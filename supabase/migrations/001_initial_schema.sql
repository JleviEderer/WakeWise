-- WakeWise Database Schema
-- Initial migration for Garmin sleep data integration

-- Users table (links Garmin user to app user)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garmin_user_id TEXT UNIQUE,
  garmin_access_token TEXT,
  garmin_access_token_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sleep sessions from Garmin webhooks
CREATE TABLE sleep_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  garmin_summary_id TEXT UNIQUE,
  calendar_date DATE NOT NULL,
  sleep_start TIMESTAMPTZ,
  sleep_end TIMESTAMPTZ,
  total_duration_seconds INTEGER,
  deep_sleep_seconds INTEGER,
  light_sleep_seconds INTEGER,
  rem_sleep_seconds INTEGER,
  awake_seconds INTEGER,
  average_hr INTEGER,
  lowest_hr INTEGER,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sleep stages detail (optional granular data)
CREATE TABLE sleep_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sleep_sessions(id) ON DELETE CASCADE,
  stage_type TEXT NOT NULL, -- 'deep', 'light', 'rem', 'awake'
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER
);

-- Indexes for common queries
CREATE INDEX idx_sleep_sessions_user_id ON sleep_sessions(user_id);
CREATE INDEX idx_sleep_sessions_calendar_date ON sleep_sessions(calendar_date);
CREATE INDEX idx_sleep_sessions_user_date ON sleep_sessions(user_id, calendar_date DESC);
CREATE INDEX idx_sleep_stages_session_id ON sleep_stages(session_id);
CREATE INDEX idx_users_garmin_user_id ON users(garmin_user_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_stages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own sleep sessions" ON sleep_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own sleep stages" ON sleep_stages
  FOR SELECT USING (
    session_id IN (SELECT id FROM sleep_sessions WHERE user_id = auth.uid())
  );

-- Service role can do anything (for Edge Functions)
CREATE POLICY "Service role full access users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access sleep_sessions" ON sleep_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access sleep_stages" ON sleep_stages
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
