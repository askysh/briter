# Constitution of Briter

> This document is the product contract for Briter. Every contributor, every agent session, and every PR is checked against it. If a change conflicts with what Briter is not, it doesn't merge regardless of quality.

## What Briter is

Briter is a self-hosted, standalone blog editor and publisher. You install it, point a domain at it, and write. Your content is files on disk backed by git. You own everything.

Briter is for anyone with a domain who wants to own their blog — writers, indie creators, developers, people leaving WordPress or Substack or Medium. It runs as a single-user instance: one blog, one author, one install.

Briter publishes to its own built-in public reader by default. For users who already have a site (Next.js, Astro, Hugo, or anything else), an adapter pushes content into the external site's repo instead.

Briter is free and open-source software under the MIT license, maintained by a solo developer. Contributions are welcome under clear rules.

## What Briter is not

- **Not a headless CMS or API-first content platform.** Briter is an editor with a built-in reader, not a content backend for arbitrary frontends.
- **Not a team or multi-user tool.** Single user per instance. Collaboration features are not in scope for v1.
- **Not a newsletter, membership, or monetization platform.** Briter is about writing and publishing. Audience business (paywalls, subscriber management, paid tiers) belongs to other tools.
- **Not a plugin ecosystem.** Briter has an integrations registry for analytics and similar services. A full plugin API with third-party code execution is not in scope until real demand proves it necessary.
- **Not a page builder or design tool.** Theming is configuration (pick a theme, override CSS). Drag-and-drop layout editing is out of scope.
- **Not a static site generator.** Briter is a running application (Next.js) that serves pages. It can push content to a static site via adapters, but it is not itself a build-time tool.

## Target user

**Primary:** Someone who wants to blog on their own domain without WordPress's complexity, Substack's lock-in, or Ghost's managed hosting cost. They may or may not be technical. They can follow a setup guide or click a deploy button.

**Secondary:** A developer who wants a writing surface for an existing static site. They use the adapter to push content into their repo and keep their own frontend.

**Not the target:** Teams needing multi-author workflows, enterprises needing CMS APIs, or users who want a hosted service with zero infrastructure decisions.

## Install paths

Briter supports three install paths, in order of priority:

1. **Docker Compose on a VPS.** The primary path. A $5/mo VPS (DigitalOcean, Hetzner, Linode) runs Briter behind a reverse proxy. A guided install script handles the Docker setup.
2. **One-click deploy.** Railway, Render, Fly.io — platform-specific configs in the repo. Click a button, connect a domain, done.
3. **CLI scaffolder.** `bunx create-briter-app my-blog` for developers who want to run locally or customize before deploying.

All three paths end at the same setup wizard in the browser.

**Agent-installable:** Briter publishes a machine-readable install spec (`AGENT_INSTALL.md`) so a coding agent can install it on a fresh server without human intervention. The setup API supports headless configuration.

## Content model

- **Posts** are files — MDX or Markdown — with YAML frontmatter, stored in a content directory on disk.
- **Images** are files stored either on local disk or in an S3-compatible bucket (Cloudflare R2, Backblaze B2, MinIO, AWS S3), configured through the settings UI.
- **State** lives in `storage/config.json` (safe to read) and `storage/secrets.json` (0600 permissions, never logged).
- **No database for content.** Posts and images are files. Git provides version history. The only structured state is runtime configuration.
- **Portability:** A user can stop Briter, take their content directory, and use the files with any other tool. No proprietary format, no export step.

## Architecture principles

1. **Two layouts, two route groups.** `(public)` for the reader, `(admin)` for the editor. Middleware gates admin; public is always open. Reader and writer never collide.
2. **Adapter dictates mode.** `local-mdx` = Briter is the blog. `git-target` = Briter pushes content to an external repo. The setup wizard picks; settings allows change.
3. **Secrets isolation.** Passwords, TOTP secrets, and session secrets live in `storage/secrets.json` and are never in config, env vars, or logs.
4. **Worker shares filesystem with web.** In Docker, both services mount the same `storage/` and `content/` volumes. Queue file paths resolve identically from both sides.
5. **Optional security hardening.** TOTP is available but off by default (single-user spirit). Rate limiting is always on.
6. **Pure JS dependencies where possible.** `bcryptjs` over `bcrypt`, no native compilation required. Docker images stay small.

## Contribution rules

- PRs welcome. One branch per change, tests required, existing tests must pass.
- The constitution guides what gets merged. If a PR adds a feature that falls under "what Briter is not," it doesn't merge.
- Response time is best-effort. Briter is solo-maintained.
- Issue templates exist for bug reports, feature requests, and adapter/theme/integration proposals.
- Code style and test expectations are documented in `CONTRIBUTING.md`.

## Roadmap principles

- **Depth over breadth.** Finish the core loop (write → publish → read) before adding adjacent features.
- **Dogfood before abstraction.** Briter must work on a real blog (akashmishra.com) before it claims to work for anyone. Abstractions are extracted from working code, not designed speculatively.
- **Real users over theoretical users.** Build what the first 10 users actually need, not what a market analysis says they might want.
- **No scope creep via "just one more thing."** Every feature is checked against the constitution. If it doesn't serve the target user's core need (write → publish → own), it waits.

## Decisions log

Significant product decisions are recorded as ADRs (Architecture Decision Records) in `docs/decisions/`. Each ADR states the context, the decision, and the consequences. This prevents re-litigating settled questions across agent sessions.

| Decision | Status | Reference |
|---|---|---|
| Single user per instance (no multi-user in v1) | Settled | Constitution |
| MDX + Markdown as supported formats | Settled | Constitution |
| MIT license | Settled | Constitution |
| bcryptjs over bcrypt (pure JS) | Settled | v1 plan, cross-cutting note 6 |
| External worktree must be local filesystem (no GitHub API in v1) | Settled | v1 plan, risks section |
| No `_featured.json` porting (site-specific, not generic) | Settled | v1 plan, M7 step 6 |
| Theme system uses Briter's own tokens, not personal-site's | Settled | v1 plan, risks section |

---

*This constitution is a living document. It changes when the product direction changes — not when a single feature request is persuasive. Updates require explicit decision and a note in the decisions log.*
