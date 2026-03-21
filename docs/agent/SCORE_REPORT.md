# AutoMFlows — AI readiness score report

**Method:** Manual audit aligned with Foundry’s `ai_readiness` rubric (`foundry_og/.../scoring/rules/legacy/ai_readiness/ai_readiness-llm-deep.md`). **No Foundry CLI.**

**Audit date:** 2026-03-21

## Summary

| Metric | Value |
|--------|--------|
| **Overall (informal)** | **8.3 / 10** — strong agent contract, verify commands, CI, lockfile; follow-ups below. |
| **Baseline (pre-improvements)** | ~5.5 / 10 (no `AGENTS.md`, no root `test`, lockfile ignored, no CI). |

## Dimension scores

Ratings: **strong** / **partial** / **weak**. Informal 1–10 in parentheses for trend tracking.

| # | Dimension | Rating | /10 | Evidence |
|---|-----------|--------|-----|----------|
| 1 | Agent instructions (`AGENTS.md`, topic docs) | strong | 9 | [`AGENTS.md`](../../AGENTS.md), [`docs/agent/`](./) |
| 2 | Editor-specific rules (e.g. `.cursor/rules`) | weak | 4 | None yet; optional |
| 3 | Non-interactive verify (`lint`, `type-check`, `test`, `build`) | strong | 9 | Root [`package.json`](../../package.json), documented in `AGENTS.md` |
| 4 | Type safety (TS strict + ESLint project) | strong | 9 | `tsconfig`, [`frontend/tsconfig.eslint.json`](../../frontend/tsconfig.eslint.json) |
| 5 | Contribution / PR clarity | strong | 9 | [`CONTRIBUTING.md`](../../CONTRIBUTING.md), [PR template](../../.github/pull_request_template.md) |
| 6 | Reproducible dependencies | strong | 9 | [`package-lock.json`](../../package-lock.json) committed; `npm ci` in README |
| 7 | Pre-commit gates | strong | 8 | `lint` + `type-check` (tests not on every commit — intentional) |
| 8 | CI | strong | 9 | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) |
| 9 | Env / secrets documentation | partial | 7 | [`.env.example`](../../.env.example); needs maintenance as code adds vars |
| 10 | ESLint signal-to-noise | partial | 6 | ~1300+ warnings, 0 errors; agents see noisy output |
| 11 | Lint coverage of all packages | partial | 6 | ESLint targets `backend/src`, `frontend/src` only — not `mcp-server/`, `shared/` |
| 12 | Security disclosure process | weak | 5 | No `SECURITY.md` / reporting template |

## Strengths

- Single place to start ([`AGENTS.md`](../../AGENTS.md)) and repeatable verify line: `npm run lint && npm run type-check && npm test && npm run build`.
- CI mirrors local checks.
- Lockfile gives deterministic installs for agents and CI.

## Gaps (drive [TASKS.md](./TASKS.md))

1. Optional **Cursor** rules for monorepo/Playwright conventions.
2. **ESLint warnings** — reduce over time (especially `no-explicit-any` hotspots).
3. **`.env.example`** — keep aligned with `process.env` usage (audit when touching config).
4. **ESLint** — extend to `shared/` and `mcp-server/` or document why excluded.
5. **`SECURITY.md`** — vulnerability reporting for a public OSS repo (optional).

## How to re-score (no Foundry CLI)

1. Walk the Markdown rubrics in `foundry_og` manually, or  
2. Paste a rubric into an AI chat with “audit this repo with file citations,” or  
3. Append a row to [`SCORE_LOG.md`](./SCORE_LOG.md) after changes.

## References (external)

- `foundry_og/src/foundry/scoring/rules/legacy/ai_readiness/ai_readiness-llm-deep.md`
- Other dimensions: `testing`, `security`, `cicd`, `documentation`, etc.
