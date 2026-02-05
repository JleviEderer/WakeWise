-- OAuth pending table for database polling approach
-- Stores OAuth authorization codes temporarily while the app polls for them
-- This workaround is needed because Expo Go cannot handle custom URL schemes

CREATE TABLE oauth_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  code TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
);

-- Index for auto-cleanup of expired entries
CREATE INDEX idx_oauth_pending_expires ON oauth_pending(expires_at);

-- Allow anonymous inserts (from Edge Function) and reads (from app)
ALTER TABLE oauth_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous access to oauth_pending"
  ON oauth_pending FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: Create a function to clean up expired entries
-- Can be called periodically via pg_cron or manually
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_pending()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_pending WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
