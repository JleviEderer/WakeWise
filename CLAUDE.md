Project: <name>
Goal: <2-3 lines on what we're building + core constraint>
Stack: <e.g., TypeScript, Next.js 14 (App Router), Postgres, Prisma, Tailwind>

## Non-negotiable architecture rules
Keep controllers/routes thin; business logic lives in services.
Services call repos; repos are the only DB access layer.
Shared types/contracts are single-source-of-truth in: <path>.
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
Install: <command>
Dev server: <command>
Typecheck: <command>
Lint: <command>
Format: <command>
Run one test: <command>
Run tests for a file: <command>
Run all tests: <command>
Migrations: <command>

## Workflow rules
Prefer small, reviewable diffs.
Run targeted tests while iterating; run full checks before finishing.
Update types/contracts + implementation + tests in the same change.
Avoid broad refactors unless explicitly requested.
Commit messages: <format, e.g., conventional commits: feat|fix|chore(scope): description>

## Testing (TDD-lite)
For business logic and bug fixes: write/adjust a failing test first.
Don't "fix" tests by weakening assertions unless behavior intentionally changed.
If behavior changes, update tests to reflect the new contract explicitly.
Integration tests hit a real test DB — don't mock the data layer.
Unit tests for pure logic and transformations.

## Don'ts
Don't use any — use unknown + type guards if type is genuinely unknown.
Don't add new dependencies without asking first.
Don't catch errors silently — log or propagate.
Don't put business logic in route handlers or UI components.
Don't write barrel files (index.ts re-exports) unless one already exists.
Don't modify generated files (e.g., Prisma client, migrations) by hand.

## Gotchas
Env vars required: <list> — stored in .env.local (not committed).
All dates stored as UTC in DB; convert to user timezone only at display layer.
Migrations: always run <command> after pulling; never edit existing migrations.

<any other project-specific landmines>

Architecture overview (summary)
<3–5 sentences describing the high-level data flow and key design decisions.
This saves Claude from having to read a separate file on every task.>
Pointers (read when relevant)

Full architecture: docs/ARCHITECTURE.md
API contracts: docs/API_CONTRACTS.md
Data model: docs/DATA_MODEL.md
Repo conventions: docs/CONTRIBUTING.md
Decision log: docs/DECISIONS.md