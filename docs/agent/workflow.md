# Workflow (branches and PRs)

## Branching

- Use short, descriptive branch names (e.g. `fix/executor-race`, `feat/mcp-env-docs`).
- Keep changes scoped so PRs stay reviewable.

## Before opening a PR

1. `npm run lint`
2. `npm run type-check`
3. `npm test`
4. `npm run build` (when your change affects types or build graph)

Pre-commit hooks run **lint** and **type-check** automatically; tests and full build are not hooked — run them before push when relevant.

## PR content

- Describe what changed and how to verify.
- Link related issues if any.
- Call out breaking changes or env/config updates.

See [`.github/pull_request_template.md`](../../.github/pull_request_template.md) for the checklist.
