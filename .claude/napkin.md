# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|----------------|-------------------|
| 2026-02-10 | self | Used `POST` with JSON body for Garmin backfill endpoint | Garmin backfill is `GET` with query params: `?summaryStartTimeInSeconds=X&summaryEndTimeInSeconds=Y` |
| 2026-02-10 | self | Wrote lessons to `memory/MEMORY.md` instead of napkin | Use `.claude/napkin.md` — that's the project convention per CLAUDE.md |
| 2026-02-10 | self | Assumed Garmin 502 was a transient server issue for a year | When an API returns 502 persistently, check HTTP method and request format first — don't assume server-side |

## User Preferences
- Use napkin (`.claude/napkin.md`) for session memory, not the auto-memory folder
- Include a "Graduation Queue" for lessons stable enough to promote to CLAUDE.md

## Patterns That Work
- Garmin backfill: `GET /wellness-api/rest/backfill/sleeps?summaryStartTimeInSeconds=X&summaryEndTimeInSeconds=Y` — returns 202, data arrives async via webhook
- To avoid 409 duplicate backfill: shift the time range (e.g., 29 days instead of 30)
- Supabase Edge Functions receiving external webhooks: must disable "Verify JWT" in dashboard, otherwise requests are silently rejected (zero logs)

## Patterns That Don't Work
- RLS policies using `auth.uid()` when app uses anon key without Supabase Auth — always returns null, queries return 0 rows
- `POST` with JSON body to Garmin backfill endpoint — returns 502

## Domain Notes
- Webhook uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) — inserts work fine
- App uses anon key — needs permissive `SELECT` RLS policies with `USING (true)`
- OAuth callback stores auth code in `oauth_pending` table, app polls for it
- Garmin backfill responses: 202 = accepted, 409 = duplicate range, 429 = rate limit

## Graduation Queue
- **Garmin backfill is GET, not POST** — stable, verified. Candidate for CLAUDE.md Gotchas section.
- **Disable JWT verification on Edge Functions that receive external webhooks** — stable, verified. Candidate for CLAUDE.md Gotchas section.
