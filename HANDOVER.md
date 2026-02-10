# Handover — Feb 10, 2026

## What We Were Working On

Getting Garmin sleep data to flow from Garmin → Supabase webhook → database → app. The pipeline was broken: the app could authenticate with Garmin but couldn't pull historical sleep data.

## What Got Done

Three bugs fixed, all blocking the sleep data pipeline:

### 1. Backfill API: POST → GET (fixed 502)
**Problem:** `garmin.service.ts` was sending a `POST` with a JSON body to the backfill endpoint. Garmin expects a `GET` with query parameters.
**Fix:** Changed to `GET` with `summaryStartTimeInSeconds` and `summaryEndTimeInSeconds` as URL query params.
**File:** `src/services/garmin.service.ts` (lines ~366-373)
**Result:** 502 → 202 Accepted

### 2. Supabase Edge Function JWT verification (fixed silent webhook rejection)
**Problem:** Supabase Edge Functions require JWT verification by default. Garmin sends webhook requests without a Supabase JWT, so they were silently rejected at the gateway — zero logs, zero data.
**Fix:** Disabled "Verify JWT" on the `garmin-webhook` Edge Function via Supabase dashboard.
**Result:** Webhook now receives and processes Garmin's sleep data pushes.

### 3. RLS policies blocking app reads (fixed 0 rows returned)
**Problem:** RLS SELECT policies used `auth.uid()`, but the app uses the Supabase anon key without Supabase Auth. `auth.uid()` is always null → all SELECT queries return 0 rows.
**Fix:** Applied SQL in Supabase dashboard to add anon-role SELECT policies:
```sql
CREATE POLICY "Anon can read users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read sleep sessions" ON sleep_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read sleep stages" ON sleep_stages FOR SELECT TO anon USING (true);
```
**Result:** App can now read sleep data from Supabase.

### End State
Sleep data is flowing end-to-end. The app shows a wake prediction ("estimated sleep around 6:30 am") based on real Garmin data. The `sleep_sessions` table in Supabase is populated.

## What Worked
- Garmin backfill as `GET` with query params → 202 Accepted
- Disabling JWT verification on the webhook Edge Function
- Adding permissive anon SELECT RLS policies
- Using 29-day range to avoid 409 duplicate after initial 30-day backfill was cached (reverted back to 30 after confirming data flow)

## What Didn't Work
- `POST` with JSON body to Garmin backfill → persistent 502 (Cloudflare Bad Gateway)
- RLS policies with `auth.uid()` when using anon key → always null, 0 rows
- Default JWT verification on Edge Functions → silently blocks external webhook callers

## Key Decisions
- **Anon SELECT with `USING (true)`**: Acceptable for a single-user app. If multi-tenancy is added later, tighten these policies with custom claims or Supabase Auth.
- **No Supabase Auth**: The app authenticates with Garmin directly (OAuth 2.0 PKCE). Supabase is used as a data store only, not for user auth.
- **Napkin over memory folder**: Session lessons go in `.claude/napkin.md` (in-repo), not the auto-memory folder.

## Lessons Learned / Gotchas
- Garmin backfill endpoint is `GET`, not `POST`. Parameters go in query string.
- Garmin backfill returns 202 (async) — data arrives via webhook, not in the response.
- 409 means "duplicate backfill for this time range" — shift the range to re-trigger.
- 429 means rate limited (100 req/min) — stop hitting the button.
- Supabase Edge Functions silently reject requests without valid JWT unless you disable verification. Zero logs when this happens — very hard to debug.
- The webhook uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). The app uses the anon key (subject to RLS).

## Next Steps
- **Graduation queue**: Two items in `.claude/napkin.md` are ready to promote to CLAUDE.md Gotchas section (backfill is GET, disable JWT on external webhooks).
- **Handle 409 gracefully in UI**: Currently shows "Request Failed" alert. Should say something like "Data already synced for this period."
- **Auto-retry / exponential backoff**: For transient errors on backfill.
- **Show last sync timestamp in UI**.
- **Webhook data deduplication**: Handle case where Garmin pushes the same data twice.
- **Pre-existing typecheck errors**: `alarm.service.ts` has notification type mismatches (expo-notifications API changes). Not related to sleep data work but should be fixed.
- **User mentioned wanting to move project from OneDrive to C: drive** — not done yet.
- **Migration file created but not applied via CLI**: `supabase/migrations/003_fix_rls_anon_read.sql` exists in the repo but was applied manually via SQL Editor (Supabase CLI wasn't linked). May need to reconcile migration state.

## Important Files Modified/Created

| File | What Changed |
|------|-------------|
| `src/services/garmin.service.ts` | Backfill: POST→GET with query params |
| `src/screens/GarminConnectScreen.tsx` | Temporarily changed to 29-day backfill, reverted to 30 |
| `supabase/migrations/003_fix_rls_anon_read.sql` | New migration — anon SELECT RLS policies (applied manually in dashboard) |
| `.claude/napkin.md` | Created — session lessons and graduation queue |
| `NextSteps.md` | Pre-existing — still relevant for future enhancement ideas |
