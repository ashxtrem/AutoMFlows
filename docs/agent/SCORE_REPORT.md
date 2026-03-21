# AutoMFlows — AI readiness score report

**Method:** Manual audit aligned with `ai_readiness` rubric**

**Audit date:** 2026-03-21 (re-score)

## Summary

| Metric | Value |
|--------|--------|
| **Overall (informal)** | **8.4 / 10** — prior strengths plus Cursor rules, audited `.env.example`, and ESLint across all TS workspaces; lint warning count rose with broader scope (see dim 10). |
| **Baseline (pre-improvements)** | ~5.5 / 10 (no `AGENTS.md`, no root `test`, lockfile ignored, no CI). |

## Dimension scores

Ratings: **strong** / **partial** / **weak**. Informal 1–10 in parentheses for trend tracking.

| # | Dimension | Rating | /10 | Evidence |
|---|-----------|--------|-----|----------|
| 1 | Agent instructions (`AGENTS.md`, topic docs) | strong | 9 | [`AGENTS.md`](../../AGENTS.md), [`docs/agent/`](./) |
| 2 | Editor-specific rules (e.g. `.cursor/rules`) | strong | 8 | [`.cursor/rules/automflows.mdc`](../../.cursor/rules/automflows.mdc) (`alwaysApply`, links to `AGENTS.md` / fixtures) |
| 3 | Non-interactive verify (`lint`, `type-check`, `test`, `build`) | strong | 9 | Root [`package.json`](../../package.json), documented in `AGENTS.md` |
| 4 | Type safety (TS strict + ESLint project) | strong | 9 | `tsconfig`, [`frontend/tsconfig.eslint.json`](../../frontend/tsconfig.eslint.json) |
| 5 | Contribution / PR clarity | strong | 9 | [`CONTRIBUTING.md`](../../CONTRIBUTING.md), [PR template](../../.github/pull_request_template.md) |
| 6 | Reproducible dependencies | strong | 9 | [`package-lock.json`](../../package-lock.json) committed; `npm ci` in README |
| 7 | Pre-commit gates | strong | 8 | `lint-staged` + `type-check` (tests not on every commit — intentional) |
| 8 | CI | strong | 9 | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) |
| 9 | Env / secrets documentation | strong | 8 | [`.env.example`](../../.env.example) lists backend / Vite / MCP vars with audit comment; keep aligned when config changes |
| 10 | ESLint signal-to-noise | partial | 6 | ~1494 warnings, 0 errors (`npm run lint`, 2026-03-21); broader package scope adds surface area |
| 11 | Lint coverage of all packages | strong | 9 | Root [`eslint.config.js`](../../eslint.config.js): `backend/src`, `frontend/src`, `shared/src`, `mcp-server/src`; see [`docs/agent/code-style.md`](./code-style.md) |
| 12 | Security disclosure process | weak | 5 | No `SECURITY.md` / reporting template |

## Strengths

- Single place to start ([`AGENTS.md`](../../AGENTS.md)) and repeatable verify line: `npm run lint && npm run type-check && npm test && npm run build`.
- CI mirrors local checks.
- Lockfile gives deterministic installs for agents and CI.
- Editor rules ([`.cursor/rules/automflows.mdc`](../../.cursor/rules/automflows.mdc)) and root ESLint cover every TS workspace (`backend`, `frontend`, `shared`, `mcp-server`).

## Gaps (drive [TASKS.md](./TASKS.md))

1. **ESLint warnings** — reduce over time (especially `no-explicit-any`); optional `--max-warnings` in CI once count is under control.
2. **`.env.example`** — re-audit when adding `process.env` / `import.meta.env` keys.
3. **`SECURITY.md`** — vulnerability reporting for a public OSS repo (optional).
4. **Testing rubric** — coverage gates, `shared`/`mcp-server` tests, E2E documentation (see [TASKS.md](./TASKS.md) P4).

## How to re-score

1. Re-walk this report’s dimensions (and related topic docs under [`docs/agent/`](./)) manually, or  
2. Paste a rubric or checklist into an AI chat with “audit this repo with file citations,” or  
3. Append a row to [`SCORE_LOG.md`](./SCORE_LOG.md) after changes.

## Rubric dimensions (examples)

Use whatever checklist you maintain for AI readiness; common dimensions include **testing**, **security**, **CI/CD**, and **documentation**.
