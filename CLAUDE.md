## How to use this file
This is your operating contract. Before starting any task:
1. Re-read the relevant sections of this file.
2. If a command is listed below, use it exactly — don't guess alternatives.
3. If you need to deviate from these rules, state why before proceeding.
4. When creating new files, follow the file placement rules exactly.
5. Follow the architecture rules exactly

When creating or updating .claude/napkin.md, always include a "Graduation Queue" section for lessons stable enough to become permanent rules in CLAUDE.md. When graduated, move to CLAUDE.md and delete from napkin.

## Keeping this file current
When you:
- Add a new dependency → update the Stack section
- Create a new env var → add it to the Gotchas section
- Change a command → update Commands section
- Make an architecture decision → update Architecture Overview and log it in docs/DECISIONS.md
- Add a new domain/module → update File Placement with the new paths
Do this in the same commit as the change itself.

Project: WakeWise
Goal: Intelligent wake alarm app that uses Garmin sleep data to predict optimal wake times during light sleep phases. Privacy-first: sleep data stored in user's own Supabase instance.
Stack: TypeScript, React Native (Expo), Supabase (Postgres + Edge Functions), Garmin Health API

## Non-negotiable architecture rules
Keep controllers/routes thin; business logic lives in services.
Services call repos; repos are the only DB access layer.
Shared types/contracts are single-source-of-truth in: src/models/types.ts.
No cross-layer imports that violate: UI → API → Service → Repo.
Don't introduce new patterns without updating docs/DECISIONS.md.

## File placement
API routes: src/routes/<domain>/
Services: src/services/<domain>.service.ts
Repos: src/repos/<domain>.repo.ts
Shared types: src/types/<domain>.ts
Tests: colocated as <filename>.test.ts

## Error handling
Services throw typed errors (e.g., NotFoundError, ValidationError).
Controllers catch and map to HTTP status codes; never leak raw errors.
Use Result<T, E> pattern for operations with expected failure modes.

## Commands (use these — don't guess)
Install: npm install
Dev server: npx expo start
Typecheck: npx tsc --noEmit
Lint: npx eslint .
Format: npx prettier --write .
Run one test: npm test -- <testfile>
Run tests for a file: npm test -- <filename>
Run all tests: npm test
Migrations: supabase db push

## Workflow rules
Prefer small, reviewable diffs.
Run targeted tests while iterating; run full checks before finishing.
Update types/contracts + implementation + tests in the same change.
Avoid broad refactors unless explicitly requested.
Commit messages: conventional commits: feat|fix|chore(scope): description

## Testing (TDD-lite)
For business logic and bug fixes: write/adjust a failing test first.
Don't "fix" tests by weakening assertions unless behavior intentionally changed.
If behavior changes, update tests to reflect the new contract explicitly.
Integration tests hit a real test DB — don't mock the data layer.
Unit tests for pure logic and transformations.

## External APIs & libraries
- Don't implement from memory — use Context7 MCP to fetch current docs first.
- Especially for: Garmin Health API, Supabase, Expo Notifications
- If MCP is unavailable, ask before guessing at method signatures.

## Don'ts
Don't use any — use unknown + type guards if type is genuinely unknown.
Don't add new dependencies without asking first.
Don't catch errors silently — log or propagate.
Don't put business logic in route handlers or UI components.
Don't write barrel files (index.ts re-exports) unless one already exists.
Don't modify generated files (e.g., Prisma client, migrations) by hand.

## Gotchas
Env vars required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, GARMIN_CLIENT_ID, GARMIN_CLIENT_SECRET — stored in .env.local (not committed).
All dates stored as UTC in DB; convert to user timezone only at display layer.
Migrations: always run supabase db push after pulling; never edit existing migrations.

Garmin OAuth uses PKCE flow with Supabase edge function as callback. Webhook must be registered in Garmin Developer Portal.

Architecture overview (summary)
Data flows from Garmin device → Garmin Connect → webhook pushes to Supabase Edge Function → stored in sleep_sessions table → app fetches via Supabase client → WakePredictorService analyzes sleep patterns → predicts optimal wake time within user's wake window → AlarmService schedules the notification.

Pointers (read when relevant)

Full architecture: docs/ARCHITECTURE.md
API contracts: docs/API_CONTRACTS.md
Data model: docs/DATA_MODEL.md
Repo conventions: docs/CONTRIBUTING.md
Decision log: docs/DECISIONS.md
