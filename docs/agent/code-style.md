# Code style

## General

- Follow patterns in neighboring files — naming, folder layout, and error handling should match the surrounding module.
- TypeScript: project uses `strict` mode; avoid `any` unless necessary (ESLint warns on explicit `any`).
- ESLint applies to `backend/src`, `frontend/src`, `shared/src`, and `mcp-server/src` per root [`eslint.config.js`](../../eslint.config.js). Node-style packages share the same TypeScript rule severities (many `any`/style issues are **warnings** so CI stays green). The frontend uses [`frontend/tsconfig.eslint.json`](../../frontend/tsconfig.eslint.json) so test files are included in type-aware linting. `frontend/src/test/**` (Vitest setup) is ignored by ESLint. Root `npm run lint` may report many warnings; **errors** must be zero before merge.

## Formatting

- No separate formatter is enforced repo-wide; keep edits consistent with the file’s existing indentation and quote style.

## React (frontend)

- Follow React Hooks rules; the repo enables `eslint-plugin-react-hooks` for frontend files.

## Commits

- Write clear commit messages describing intent; `CONTRIBUTING.md` has optional conventions.
