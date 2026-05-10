---
name: verify
description: Use before committing or when validating changes across the kontekst monorepo. Runs format check, lint, typecheck, and tests across dtos / apps/be / apps/ui.
---

# Verification

Run all verification steps for the kontekst monorepo. Stop immediately on any failure and report the issue with a suggested fix.

## Instructions

Run these sequentially first (each gates the next):

1. `npm run build:dtos` — `dtos` must compile before BE/UI typecheck or tests can resolve `@kontekst/dtos`. Stop if fails.
2. `npm run format:check` — Prettier check at repo root. If it fails, suggest `npm run format`. Stop.
3. `npm run lint` — ESLint at repo root. If it fails, suggest `npm run lint:fix` for autofixable issues. Stop.

Then run these in parallel using subagents (each in its own Bash call inside one message):

1. **Typecheck BE** — `npx tsc --noEmit -p apps/be/tsconfig.json`
2. **Typecheck UI** — `npx tsc --noEmit -p apps/ui/tsconfig.json`
3. **Test BE** — `npm run test --workspace=apps/be`
4. **Test UI** — `npm run test --workspace=apps/ui`

If all pass, print a one-line success summary. On any failure, stop and report which step failed and the relevant error output.

## Notes

- Do not skip `build:dtos` even when `dist/` looks current — schema edits in `dtos/src/` won't propagate otherwise and downstream typecheck will pass against stale types.
- The repo has no top-level typecheck script; use `npx tsc --noEmit -p <path>` per workspace.
- BE tests use Vitest (`vitest run`). UI tests use Vitest + jsdom. Both are non-watching by default via `npm run test`.
