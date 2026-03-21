# Agent and contributor guide

This file is the operating contract for AI coding agents and humans working in this repo. For deeper topics, see [`docs/agent/`](docs/agent/) (read only what matches your task).

## Core rules

- Never commit secrets, API keys, or real `.env` files. Use [`.env.example`](.env.example) for variable names only.
- Match existing code style — read neighboring files before adding new code.
- Prefer small, reviewable changes with a clear way to verify (see commands below).
- Run **lint → type-check → test → build** before opening a PR when your change affects code paths those checks cover.

## Repository layout

| Path | Role |
|------|------|
| `backend/` | Express API, Playwright execution engine, plugins |
| `frontend/` | React + Vite + React Flow editor |
| `shared/` | Shared TypeScript types and utilities (`@automflows/shared`) |
| `mcp-server/` | Model Context Protocol server for IDE/AI integration |
| `plugins/` | Optional plugin sources referenced by the frontend |
| `tests/` | Workflow JSON fixtures and related test resources |
| `scripts/` | Cross-platform start scripts (`npm start`) |

Swagger / API docs (when enabled): backend serves `/api-docs` (see `SWAGGER_ENABLED` in [`.env.example`](.env.example)).

## Install

Reproducible install from the committed lockfile:

```bash
npm ci
```

Build shared (required before backend/frontend consume types from `shared`):

```bash
npm run build --workspace=shared
```

Or from repo root after `npm ci`:

```bash
cd shared && npm run build && cd ..
```

## Verify (non-interactive)

Run from the **repository root**:

| Step | Command |
|------|---------|
| Lint | `npm run lint` |
| Lint with ESLint `--fix` (whole tree) | `npm run lint:fix` |
| Typecheck (all workspaces) | `npm run type-check` (builds `@automflows/shared` first so `dist` types exist) |
| Tests (workspaces that define `test`) | `npm test` |
| Build (all workspaces) | `npm run build` |
| Dependency audit (report) | `npm run audit` |
| Dependency audit (safe fixes) | `npm run audit:fix` |

**Git hooks:** `npm ci` runs `prepare`, which installs [Husky](https://typicode.github.io/husky/). On each commit, `.husky/pre-commit` runs [lint-staged](https://github.com/lint-staged/lint-staged) (ESLint with `--fix` on staged `backend|frontend|shared|mcp-server` `src/**/*.ts(x)` files), then `npm run type-check`.

Workspace-only examples:

- Backend tests: `npm run test --workspace=backend`
- Frontend tests (watch during dev): `npm run test:watch --workspace=frontend`
- Frontend one-shot tests: `npm run test --workspace=frontend`

## Run the app

```bash
npm start
```

See [`README.md`](README.md) for ports, Docker, and LAN options.

## Where to read more

| Topic | Doc |
|-------|-----|
| Repo map and boundaries | [`docs/agent/repo-map.md`](docs/agent/repo-map.md) |
| Tests and tooling | [`docs/agent/testing.md`](docs/agent/testing.md) |
| Security-sensitive changes | [`docs/agent/security.md`](docs/agent/security.md) |
| Branch / PR workflow | [`docs/agent/workflow.md`](docs/agent/workflow.md) |
| Style and structure | [`docs/agent/code-style.md`](docs/agent/code-style.md) |
| Agent workflow sequence | [`docs/agent/agent-protocol.md`](docs/agent/agent-protocol.md) |
| Score audit & backlog | [`docs/agent/SCORE_REPORT.md`](docs/agent/SCORE_REPORT.md), [`docs/agent/TASKS.md`](docs/agent/TASKS.md) |

Human-focused contribution conventions: [`CONTRIBUTING.md`](CONTRIBUTING.md).
