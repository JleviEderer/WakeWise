-- Fix RLS: allow anon role to SELECT data
-- The app uses the Supabase anon key (not Supabase Auth),
-- so auth.uid() is always null. These policies allow the app
-- to read data filtered by garmin_user_id in application code.
-- Writes still require service_role (Edge Functions only).

CREATE POLICY "Anon can read users" ON users
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can read sleep sessions" ON sleep_sessions
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can read sleep stages" ON sleep_stages
  FOR SELECT TO anon
  USING (true);
