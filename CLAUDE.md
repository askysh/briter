# CLAUDE.md

This project's agent guidance is consolidated in **[`AGENTS.md`](AGENTS.md)** so it applies to
every agent (Claude Code, Codex, Cursor, Gemini, …). Read it before working in this repo.

Highlights you must not miss:

- **Documentation is part of the change.** If you alter how Briter is installed, configured, or
  operated, update the matching `docs/*.mdx` in the same change. See the mapping table in
  [`AGENTS.md`](AGENTS.md). The code is the source of truth — verify before you write.
- **Mirror `packages/create-briter-app/template/`** when you change top-level source.
- **Verify before done:** `bun test`, `bun run lint`, `bun run build` — run and report.
- **Honor [`CONSTITUTION.md`](CONSTITUTION.md) and `docs/decisions/*`.** Secrets stay in
  `storage/secrets.json`, never in code or logs.
