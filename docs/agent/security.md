# Security

## Secrets and configuration

- Do not commit `.env`, API keys, database passwords, or tokens.
- Reference only variable **names** in [`.env.example`](../../.env.example) and documentation.
- When adding new env vars, update `.env.example` and [`AGENTS.md`](../../AGENTS.md) if behavior is agent-relevant.

## User input and automation

- Treat workflow JSON, uploaded files, and any user-controlled strings as untrusted when they influence execution paths (file access, network calls, shell).
- Prefer parameterized queries and validated options for database and HTTP client usage — follow patterns in existing handlers.
- Avoid logging secrets or full payloads that may contain PII in production code paths.

## Dependencies

- Prefer minimal new dependencies; run `npm audit` when changing `package.json` significantly.

## Review

For auth, execution, or plugin loading changes, explicitly note security assumptions in the PR description.
