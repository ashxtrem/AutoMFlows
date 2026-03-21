# Task backlog (post–score improvements)

Prioritized follow-ups from [`SCORE_REPORT.md`](./SCORE_REPORT.md). Check items off as you complete them.

## P1 — High value for agents and maintainers

- [x] **Add `.cursor/rules`** (or equivalent) with AutoMFlows-specific notes: monorepo workspaces, Playwright/postinstall, where workflow JSON lives, link to `AGENTS.md`.
- [x] **Audit `process.env` / `import.meta.env`** usage and update [`.env.example`](../../.env.example) so every supported variable is listed (commented).
- [x] **ESLint coverage:** extend [`eslint.config.js`](../../eslint.config.js) to include `shared/src` and `mcp-server/src` (or document in [`code-style.md`](./code-style.md) why they are excluded and add a scoped script).

## P2 — Quality and noise reduction

- [ ] **Reduce ESLint warnings** in batches (e.g. by folder or rule): start with `no-explicit-any` in `frontend/src/utils` or high-churn modules.
- [ ] **Optional:** add `npm run lint -- --max-warnings <N>` in CI once warnings drop below a threshold (or keep 0 errors only).
- [ ] Run **`npm audit`** (or `npm audit fix` where safe) and document any accepted risks in PR notes.

## P3 — Security and community

- [ ] Add root **`SECURITY.md`** with supported versions and how to report vulnerabilities (even if email/GitHub Security Advisories only).
- [ ] **Optional:** enable **Dependabot** or **Renovate** for `package-lock.json` (`.github/dependabot.yml`).

## P4 — Deeper Foundry-style rubrics (periodic)

- [x] Run through **`testing`** `testing-llm-deep.md` in `foundry_og` (knowledge base only; no Foundry CLI) — gaps filed below.
- [ ] Run through **`security`** rubric after any auth/execution/plugin change.

### Foundry `testing-llm-deep.md` — filed gaps (AutoMFlows)

Rubric source: `foundry_og/src/foundry/scoring/rules/legacy/testing/testing-llm-deep.md`. **Strengths:** many `__tests__` suites (backend Jest + frontend Vitest + RTL), route and Playwright-backed integration tests under `backend/src/__tests__/integration/`, `jest.config.js` / `vitest.config.ts` present, frontend **coverage thresholds** (80%) defined in Vitest config.

- [ ] **P4-T1 — Enforce coverage in CI** — Default `npm test` runs Jest/Vitest without coverage; frontend thresholds in `frontend/vitest.config.ts` only apply when using `test:coverage`. CI (`.github/workflows/ci.yml`) does not run coverage or fail on gates. *Rubric:* “Coverage report in CI artifacts without a threshold is measurement only.”
- [ ] **P4-T2 — Backend Jest coverage gate** — `backend/jest.config.js` sets `coverageReporters` but no `coverageThreshold`; `test:coverage` is opt-in. *Rubric:* prefer `--cov-fail-under` / `coverageThreshold`-style enforcement aligned with product goals (can ratchet over time).
- [ ] **P4-T3 — Tests for `shared/` and `mcp-server`** — Workspaces have no `test` script; monorepo tests skip them silently. *Rubric:* meaningful automated tests appropriate for package type (even small unit tests for exported helpers/types).
- [ ] **P4-T4 — Document or add full-stack E2E** — Playwright is used for engine/handler tests with HTML fixtures, not for “start API + browser UI” product E2E. *Rubric:* e2e may live elsewhere — document in `README` / `docs/agent/testing.md` if intentional, or add a minimal smoke path later.
- [ ] **P4-T5 — Optional frontend depth** — No Storybook interaction tests or visual regression (Percy/Chromatic). *Rubric:* nice-to-have for frontends; skip or backlog explicitly if out of scope.

---

*Last synced with score audit: 2026-03-21*
