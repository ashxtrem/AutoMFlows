# Contributing to AutoMFlows

Thank you for contributing. This document complements [`AGENTS.md`](AGENTS.md), which is the primary guide for agents and day-to-day development commands.

## Getting started

1. Fork and clone the repository.
2. Install dependencies: `npm ci` (uses the committed lockfile).
3. Build shared types: `npm run build --workspace=shared`.
4. Run the app: `npm start` — see [`README.md`](README.md) for details.

## Development workflow

- Create a branch from `main` (or the default development branch) with a clear name.
- Keep commits focused; write messages that explain *why*, not only *what*.
- Before opening a PR, run the checks in [`AGENTS.md`](AGENTS.md) (`lint`, `type-check`, `test`, `build` as appropriate).

## Pull requests

- Use the [pull request template](.github/pull_request_template.md).
- Describe user-visible changes and the verification steps you ran.
- Update documentation (`README`, `AGENTS`, or `docs/agent/`) when behavior or env vars change.

## Code review

- Respond to review feedback with additional commits or comments as needed.
- Avoid force-pushing unless coordinated with reviewers.

## Security

- Do not commit secrets. Follow [`docs/agent/security.md`](docs/agent/security.md).
