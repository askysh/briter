# Agent Guide for Briter

Operational guidance for **any** coding agent working in this repo — Claude Code, Codex,
Cursor, Gemini, or otherwise. Read [`CONSTITUTION.md`](CONSTITUTION.md) (the product
contract) and `docs/decisions/*` (ADRs) before making product-shaping changes.

## Golden rule: documentation is part of the change

**Briter ships user-facing documentation from `docs/*.mdx`, rendered in-app at `/docs`.**
If your change alters how someone *installs, configures, or operates* Briter, you must update
the relevant doc(s) in the **same change** — not "later". A feature without docs is unfinished.

Update docs when you touch any of these:

| You changed… | Update… |
|---|---|
| An environment variable / `storage/config.json` / `storage/secrets.json` field (`lib/config/*`) | `docs/configuration.mdx` |
| The setup wizard, password, TOTP, or adapter onboarding (`app/setup/**`, `app/api/setup/**`) | `docs/setup-wizard.mdx` |
| The git-sync worker, queue, locking, retries (`lib/worker/*`, `lib/queue/*`, `scripts/run-git-sync-worker.mjs`) | `docs/worker.mdx` |
| Scheduling or the archived/draft/published lifecycle (`lib/content/*`, archive route) | `docs/scheduling.mdx` |
| Sections (`lib/sections/*`, `content/sections/`) | `docs/sections.mdx` |
| Upload budget / disk sensing (`lib/uploads/*`) | `docs/storage.mdx` |
| Auth, sessions, CSRF, rate limiting (`lib/auth/*`) | `docs/security.mdx` (and cite the relevant ADR) |
| Adapters / publish targets (`lib/adapters/*`, `lib/publish/*`) | `docs/adapters.mdx` |
| Docker, compose, volumes, ports | `docs/docker.mdx` |
| The editor or CLI scaffolder | `docs/editor.mdx` / `docs/cli.mdx` |

Docs are plain GitHub-flavored Markdown with `title`/`description`/`order`/`category`
frontmatter (see `lib/docs/docs-loader.ts`). **The code is the source of truth** — verify every
documented default, env var, and behavior against the actual code before writing it. Do not
document features that don't exist. If you add a new doc, give it a sensible `category`/`order`
and cross-link it.

## Keep the scaffolder template in sync

`packages/create-briter-app/template/` is a **verbatim mirror** of the top-level app (`lib/`,
`app/`, `components/`, `scripts/`). When you change top-level source, mirror the same change into
the template so `bunx create-briter-app` scaffolds the current, hardened code. The template has
its own `tsconfig.json`, and its `*.test.ts` files run as part of `bun test`.

## Working conventions

- **One branch per change**, conventional commits, one logical change per commit.
- **Verify before claiming done** — run and report, don't assert:
  - `bun test` (unit; includes the template mirror) — must be green.
  - `bun run lint` — must be clean.
  - `bun run build` — must succeed.
- **Secrets never touch code, config, env-in-repo, or logs.** Passwords, TOTP secrets, session
  secrets live in `storage/secrets.json` (chmod 600).
- **Forward-compat:** API routes return clean JSON a future token-authed client could consume.
  Don't deepen cookie-only assumptions; don't add a new auth system (app-roadmap work).
- **New mutating routes** opt into CSRF in one line: `const blocked = await requireAdminMutation(request); if (blocked) return blocked;` (see ADR 002).
- **Stay inside the guardrails.** Briter is not a headless CMS, not API-first, not a multi-user
  tool, not a page builder, not a static site generator. If a task pushes past `CONSTITUTION.md`,
  stop and flag it rather than drift.
