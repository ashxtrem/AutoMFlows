# Repository map

Use this file to orient quickly; it is not an exhaustive listing.

## Monorepo

- **Root** — npm workspaces, ESLint config (`eslint.config.js`), shared `tsconfig.json` base.
- **`backend/`** — Node/Express server (`src/server.ts`, `src/app.ts`), workflow executor under `src/engine/`, node handlers under `src/nodes/`, Playwright integration, SQLite and other storage utilities as applicable.
- **`frontend/`** — Vite app, React Flow canvas, Zustand stores, node UI under `src/nodes/` and `src/components/`.
- **`shared/`** — Published as `@automflows/shared`; build outputs to `dist/`. Backend and frontend depend on it via workspace protocol.
- **`mcp-server/`** — MCP bridge; reads config from env (see root `.env.example`).

## Plugins

- **`plugins/`** — Custom node plugins; frontend resolves `@plugins/*` for development.

## Tests and fixtures

- **`backend/src/**/__tests__/`** — Jest unit and integration tests.
- **`frontend/src/**/__tests__/`** and `**/*.test.ts(x)`** — Vitest.
- **`tests/workflows/`** — Sample workflow JSON for demos and integration scenarios.

## Generated / local-only

- **`node_modules/`**, **`dist/`**, **`build/`** — Do not commit.
- **`backend/output/`**, **`output/`** — Runtime reports and artifacts; typically gitignored.
