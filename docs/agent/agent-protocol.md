# Agent workflow protocol

Lightweight sequence for agent work (no external tooling required).

## Sequence

1. **Understand** — Read `AGENTS.md`, the relevant section of `docs/agent/`, and the primary `README` for context. Locate the code you will change.
2. **Prepare** — Ensure `npm ci` (or equivalent) is done and `shared` is built if you touch shared types. Check for existing tests for the area.
3. **Plan** — Note what will change, what will not, and how you will verify (commands from `AGENTS.md`).
4. **Execute** — Make small, verifiable edits; add or update tests when behavior changes.
5. **Verify** — Run `npm run lint`, `npm run type-check`, `npm test`, and `npm run build` as appropriate.
6. **Submit** — PR with description, test plan, and any security or env notes per `docs/agent/security.md` when applicable.

## When uncertain

- State assumptions in the PR if requirements are ambiguous.
- Prefer the simpler approach when two designs are equivalent.
- If a change is large, split into smaller PRs.
