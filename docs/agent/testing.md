# Testing

## Commands

From repo root:

- **All workspace tests:** `npm test` (runs each workspace’s `test` script if present).
- **Backend only:** `npm run test --workspace=backend` (Jest).
- **Frontend only:** `npm run test --workspace=frontend` (Vitest, `vitest run`).

During frontend development you may prefer watch mode:

```bash
npm run test:watch --workspace=frontend
```

## Conventions

- **Backend:** Jest with `ts-jest`; tests live under `__tests__` or `*.test.ts` per `jest.config.js`.
- **Frontend:** Vitest + Testing Library where applicable.
- Prefer deterministic tests — avoid flaky timing; use Playwright/test harness patterns already present in the tree when adding browser automation tests.

## Before a PR

Run `npm test` at minimum for the packages you changed; when in doubt, run the full root command.
